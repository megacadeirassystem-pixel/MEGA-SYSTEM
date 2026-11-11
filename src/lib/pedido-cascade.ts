import { prisma } from "@/lib/prisma";

const ETAPAS = ["SERRALHERIA", "PINTURA", "USINAGEM", "TAPECARIA", "COSTURA", "MONTAGEM"] as const;

/**
 * Processa a parte tecnicamente planejável do pedido em uma transação.
 * Reexecuções completam registros ausentes sem duplicar reservas, ordens ou títulos.
 * Produtos sem BOM são reportados individualmente; não bloqueiam os demais itens.
 */
export async function processarCascataPedido(pedidoId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.pedidos WHERE id = ${pedidoId} FOR UPDATE`;
    const pedido = await tx.pedido.findUniqueOrThrow({
      where: { id: pedidoId },
      include: { itens: { include: { produto: { include: { bom: { include: { item: true } } } } } } },
    });

    if (pedido.etapaFunil !== "GANHO") throw new Error("Somente pedidos ganhos podem iniciar a cascata.");
    if (!pedido.itens.length) throw new Error("O pedido precisa ter ao menos um produto.");

    const linhasPlanejaveis = pedido.itens.filter((linha) => linha.produto.bom.length > 0);
    const produtosSemBOM = [...new Set(
      pedido.itens.filter((linha) => linha.produto.bom.length === 0).map((linha) => linha.produto.sku),
    )];

    let ordensCriadas = 0;
    let etapasCriadas = 0;

    // Ordens e etapas são geradas somente para SKUs cuja ficha técnica está cadastrada.
    for (const linha of linhasPlanejaveis) {
      const codigo = `OF-${pedido.codigo}-${linha.id.slice(-6).toUpperCase()}`;
      let ordem = await tx.ordemProducao.findUnique({ where: { codigo } });
      if (!ordem) {
        ordem = await tx.ordemProducao.create({
          data: {
            codigo, pedidoId: pedido.id, produtoId: linha.produtoId,
            quantidade: linha.quantidade, status: "PLANEJADA",
          },
        });
        ordensCriadas++;
      }

      const existentes = await tx.$queryRaw<Array<{ etapa: string }>>`
        SELECT etapa FROM public.ordem_producao_etapas WHERE ordem_producao_id = ${ordem.id}
      `;
      for (const etapa of ETAPAS.filter((e) => !existentes.some((x) => x.etapa === e))) {
        await tx.$executeRaw`
          INSERT INTO public.ordem_producao_etapas
            (ordem_producao_id, etapa, status, quantidade_planejada, quantidade_concluida, checklist)
          VALUES (${ordem.id}, ${etapa}, 'PENDENTE', ${linha.quantidade}, 0, '[]'::jsonb)
        `;
        etapasCriadas++;
      }
    }

    // Explosão consolidada da BOM por componente.
    const necessidade = new Map<string, { necessario: number; fornecedorId: string | null; sku: string }>();
    for (const linha of linhasPlanejaveis) {
      for (const bom of linha.produto.bom) {
        const atual = necessidade.get(bom.itemId) ?? {
          necessario: 0, fornecedorId: bom.item.fornecedorPrincipalId, sku: bom.item.sku,
        };
        atual.necessario += Number(bom.quantidadePorUnidade) * Number(bom.fatorPerda) * linha.quantidade;
        necessidade.set(bom.itemId, atual);
      }
    }

    const faltantes: Array<{ itemId: string; quantidade: number; fornecedorId: string | null; sku: string }> = [];
    for (const [itemId, n] of necessidade) {
      // Serializa concorrência por item. O saldo reservado já inclui as reservas deste pedido;
      // portanto, ao calcular disponibilidade, devolvemos temporariamente a própria reserva.
      await tx.$queryRaw`SELECT "itemId" FROM public.estoque_itens WHERE "itemId" = ${itemId} FOR UPDATE`;
      const estoque = await tx.estoqueItem.findUnique({ where: { itemId } });
      const reservaPropria = await tx.movimentoEstoque.aggregate({
        where: { pedidoId: pedido.id, itemId, tipo: "RESERVA" },
        _sum: { quantidade: true },
      });
      const jaReservado = Number(reservaPropria._sum.quantidade ?? 0);
      const saldo = Number(estoque?.saldoAtual ?? 0);
      const reservadoTotal = Number(estoque?.reservado ?? 0);
      const disponivelParaEstePedido = Math.max(0, saldo - Math.max(0, reservadoTotal - jaReservado));
      const faltaReservar = Math.max(0, n.necessario - jaReservado);
      const reservarAgora = Math.min(disponivelParaEstePedido, faltaReservar);
      const faltaComprar = Math.max(0, faltaReservar - reservarAgora);

      if (reservarAgora > 0 && estoque) {
        await tx.estoqueItem.update({
          where: { itemId }, data: { reservado: { increment: reservarAgora } },
        });
        await tx.movimentoEstoque.create({
          data: {
            itemId, tipo: "RESERVA", quantidade: reservarAgora, pedidoId: pedido.id,
            observacao: `Reserva automática — pedido ${pedido.codigo}`,
          },
        });
      }
      if (faltaComprar > 0) {
        faltantes.push({
          itemId, quantidade: faltaComprar, fornecedorId: n.fornecedorId, sku: n.sku,
        });
      }
    }

    // Compras sugeridas agrupadas por fornecedor. Se a sugestão ainda não foi aprovada,
    // atualiza a quantidade do item em vez de ignorar uma nova necessidade.
    const porFornecedor = new Map<string, typeof faltantes>();
    const itensSemFornecedor: string[] = [];
    for (const falta of faltantes) {
      if (!falta.fornecedorId) {
        itensSemFornecedor.push(falta.sku);
        continue;
      }
      const grupo = porFornecedor.get(falta.fornecedorId) ?? [];
      grupo.push(falta);
      porFornecedor.set(falta.fornecedorId, grupo);
    }

    let pedidosCompraCriados = 0;
    let itensCompraAtualizados = 0;
    for (const [fornecedorId, itens] of porFornecedor) {
      const existente = await tx.pedidoCompra.findFirst({
        where: { origemPedidoId: pedido.id, fornecedorId, status: "SUGERIDO" },
        include: { itens: true },
      });

      if (existente) {
        for (const item of itens) {
          const itemExistente = existente.itens.find((x) => x.itemId === item.itemId);
          if (itemExistente) {
            await tx.pedidoCompraItem.update({
              where: { id: itemExistente.id }, data: { quantidade: item.quantidade },
            });
          } else {
            await tx.pedidoCompraItem.create({
              data: {
                pedidoCompraId: existente.id, itemId: item.itemId,
                quantidade: item.quantidade, precoUnitario: 0,
              },
            });
          }
          itensCompraAtualizados++;
        }
        continue;
      }

      const sequencia = porFornecedor.size;
      const codigo = `PC-${pedido.codigo}-${String(pedidosCompraCriados + 1).padStart(2, "0")}`;
      // Evita colisão caso já exista uma compra aprovada/cancelada para o mesmo fornecedor.
      const codigoLivre = await tx.pedidoCompra.findUnique({ where: { codigo } });
      const codigoFinal = codigoLivre
        ? `PC-${pedido.codigo}-${fornecedorId.slice(-6).toUpperCase()}`
        : codigo;
      await tx.pedidoCompra.create({
        data: {
          codigo: codigoFinal, fornecedorId, status: "SUGERIDO", origemPedidoId: pedido.id,
          itens: {
            create: itens.map((item) => ({
              itemId: item.itemId, quantidade: item.quantidade, precoUnitario: 0,
            })),
          },
        },
      });
      pedidosCompraCriados++;
    }

    // Idempotência financeira: um título inicial por pedido. Parcelamento depende da condição
    // comercial estruturada; não inventamos parcelas a partir de texto livre.
    const valor = pedido.valorTotal != null
      ? Number(pedido.valorTotal)
      : pedido.itens.reduce((s, linha) => s + linha.quantidade * Number(linha.valorUnitario ?? 0), 0);
    if (valor > 0 && !(await tx.contaReceber.findFirst({ where: { pedidoId: pedido.id } }))) {
      await tx.contaReceber.create({
        data: {
          descricao: `Pedido ${pedido.codigo} — ${pedido.cliente}`,
          clienteNome: pedido.cliente, pedidoId: pedido.id, valor,
          vencimento: pedido.dataEntrega ?? new Date(Date.now() + 30 * 86400000),
          status: "ABERTO",
        },
      });
    }

    const bloqueado = produtosSemBOM.length > 0 || faltantes.length > 0 || itensSemFornecedor.length > 0;
    await tx.pedido.update({
      where: { id: pedido.id },
      data: { status: bloqueado ? "AGUARDANDO_MATERIAL" : "CONFIRMADO" },
    });

    return {
      jaProcessado: ordensCriadas === 0 && etapasCriadas === 0 &&
        pedidosCompraCriados === 0 && itensCompraAtualizados === 0,
      bloqueadoPorBOM: produtosSemBOM.length > 0,
      produtosSemBOM,
      ordensCriadas, etapasCriadas, pedidosCompraCriados, itensCompraAtualizados,
      itensSemFornecedor, itensAComprar: faltantes.length,
      observacao: "Estoque de produto acabado, baixa CNC, parcelas e autorização fiscal dependem de estruturas/integrações ainda não existentes no schema atual.",
    };
  });
}
