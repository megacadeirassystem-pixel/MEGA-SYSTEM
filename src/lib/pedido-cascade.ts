import { prisma } from "@/lib/prisma";

const ETAPAS = ["SERRALHERIA", "PINTURA", "USINAGEM", "TAPECARIA", "COSTURA", "MONTAGEM"] as const;

/** Cascata transacional e idempotente: reexecuções completam etapas ausentes sem duplicar ordens/títulos. */
export async function processarCascataPedido(pedidoId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.pedidos WHERE id = ${pedidoId} FOR UPDATE`;
    const pedido = await tx.pedido.findUniqueOrThrow({
      where: { id: pedidoId },
      include: { itens: { include: { produto: { include: { bom: { include: { item: true } } } } } } },
    });
    if (pedido.etapaFunil !== "GANHO") throw new Error("Somente pedidos ganhos podem iniciar a cascata.");
    if (pedido.status === "CANCELADO") throw new Error("Pedido cancelado não pode iniciar a cascata.");
    if (!pedido.itens.length) throw new Error("O pedido precisa ter ao menos um produto.");

    // Bloqueio seguro: sem BOM não existe base técnica para planejar produção,
    // reservar componentes ou gerar compras. O pedido permanece ganho, aguardando cadastro.
    const produtosSemBOM = pedido.itens
      .filter((linha) => linha.produto.bom.length === 0)
      .map((linha) => linha.produto.sku);
    if (produtosSemBOM.length > 0) {
      if (pedido.status !== "CANCELADO" && pedido.status !== "AGUARDANDO_MATERIAL") {
        await tx.pedido.update({ where: { id: pedido.id }, data: { status: "AGUARDANDO_MATERIAL" } });
      }
      return {
        jaProcessado: false,
        bloqueadoPorBOM: true,
        motivo: "Cadastre a ficha técnica (BOM) dos produtos antes de gerar ordens, reservas ou compras.",
        ordensCriadas: 0,
        etapasCriadas: 0,
        pedidosCompraCriados: 0,
        itensSemFornecedor: [],
        produtosSemBOM,
        itensAComprar: 0,
      };
    }

    let ordensCriadas = 0;
    let etapasCriadas = 0;
    for (const [index, item] of pedido.itens.entries()) {
      const codigo = `OF-${pedido.codigo}-${String(index + 1).padStart(2, "0")}`;
      let ordem = await tx.ordemProducao.findUnique({ where: { codigo } });
      if (!ordem) {
        ordem = await tx.ordemProducao.create({ data: {
          codigo, pedidoId: pedido.id, produtoId: item.produtoId, quantidade: item.quantidade, status: "PLANEJADA",
        } });
        ordensCriadas++;
      }
      const existentes = await tx.$queryRaw<Array<{ etapa: string }>>`
        SELECT etapa FROM public.ordem_producao_etapas WHERE ordem_producao_id = ${ordem.id}
      `;
      for (const etapa of ETAPAS.filter((e) => !existentes.some((x) => x.etapa === e))) {
        await tx.$executeRaw`
          INSERT INTO public.ordem_producao_etapas
          (ordem_producao_id, etapa, status, quantidade_planejada, quantidade_concluida, checklist)
          VALUES (${ordem.id}, ${etapa}, 'PENDENTE', ${item.quantidade}, 0, '[]'::jsonb)
        `;
        etapasCriadas++;
      }
    }

    const necessidade = new Map<string, { necessario: number; fornecedorId: string | null; sku: string }>();
    const produtosSemBOM: string[] = [];
    for (const linha of pedido.itens) {
      if (!linha.produto.bom.length) produtosSemBOM.push(linha.produto.sku);
      for (const b of linha.produto.bom) {
        const atual = necessidade.get(b.itemId) ?? { necessario: 0, fornecedorId: b.item.fornecedorPrincipalId, sku: b.item.sku };
        atual.necessario += Number(b.quantidadePorUnidade) * Number(b.fatorPerda) * linha.quantidade;
        necessidade.set(b.itemId, atual);
      }
    }

    const faltantes: Array<{ itemId: string; quantidade: number; fornecedorId: string | null; sku: string }> = [];
    for (const [itemId, n] of necessidade) {
      await tx.$queryRaw`SELECT "itemId" FROM public.estoque_itens WHERE "itemId" = ${itemId} FOR UPDATE`;
      const estoque = await tx.estoqueItem.findUnique({ where: { itemId } });
      const reserva = await tx.movimentoEstoque.aggregate({
        where: { pedidoId: pedido.id, itemId, tipo: "RESERVA" }, _sum: { quantidade: true },
      });
      const jaReservado = Number(reserva._sum.quantidade ?? 0);
      const disponivel = Math.max(0, Number(estoque?.saldoAtual ?? 0) - Number(estoque?.reservado ?? 0));
      const restante = Math.max(0, n.necessario - jaReservado);
      const reservar = Math.min(disponivel, restante);
      const falta = Math.max(0, restante - reservar);
      if (reservar > 0 && estoque) {
        await tx.estoqueItem.update({ where: { itemId }, data: { reservado: { increment: reservar } } });
        await tx.movimentoEstoque.create({ data: {
          itemId, tipo: "RESERVA", quantidade: reservar, pedidoId: pedido.id,
          observacao: `Reserva automática — pedido ${pedido.codigo}`,
        } });
      }
      if (falta > 0) faltantes.push({ itemId, quantidade: falta, fornecedorId: n.fornecedorId, sku: n.sku });
    }

    const porFornecedor = new Map<string, typeof faltantes>();
    const itensSemFornecedor: string[] = [];
    for (const f of faltantes) {
      if (!f.fornecedorId) { itensSemFornecedor.push(f.sku); continue; }
      const arr = porFornecedor.get(f.fornecedorId) ?? [];
      arr.push(f);
      porFornecedor.set(f.fornecedorId, arr);
    }
    let pedidosCompraCriados = 0;
    for (const [fornecedorId, itens] of porFornecedor) {
      const codigo = `PC-${pedido.codigo}-${String(pedidosCompraCriados + 1).padStart(2, "0")}`;
      if (await tx.pedidoCompra.findUnique({ where: { codigo } })) continue;
      await tx.pedidoCompra.create({ data: {
        codigo, fornecedorId, status: "SUGERIDO", origemPedidoId: pedido.id,
        itens: { create: itens.map((i) => ({ itemId: i.itemId, quantidade: i.quantidade, precoUnitario: 0 })) },
      } });
      pedidosCompraCriados++;
    }

    const valor = pedido.valorTotal != null ? Number(pedido.valorTotal) : pedido.itens.reduce((s, i) => s + i.quantidade * Number(i.valorUnitario ?? 0), 0);
    if (valor > 0 && !(await tx.contaReceber.findFirst({ where: { pedidoId: pedido.id } }))) {
      await tx.contaReceber.create({ data: {
        descricao: `Pedido ${pedido.codigo} — ${pedido.cliente}`, clienteNome: pedido.cliente,
        pedidoId: pedido.id, valor,
        vencimento: pedido.dataEntrega ?? new Date(Date.now() + 30 * 86400000), status: "ABERTO",
      } });
    }
    if (pedido.status === "ORCAMENTO") {
      await tx.pedido.update({ where: { id: pedido.id }, data: {
        status: faltantes.length > 0 || produtosSemBOM.length > 0 ? "AGUARDANDO_MATERIAL" : "CONFIRMADO",
      } });
    }
    return {
      jaProcessado: ordensCriadas === 0 && etapasCriadas === 0 && pedidosCompraCriados === 0,
      ordensCriadas, etapasCriadas, pedidosCompraCriados, itensSemFornecedor, produtosSemBOM, itensAComprar: faltantes.length,
    };
  });
}
