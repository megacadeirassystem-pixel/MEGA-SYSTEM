import { prisma } from "@/lib/prisma";

/**
 * Confirma um pedido ganho em uma transação: gera ordens, reserva material,
 * sugere compras e cria o título financeiro. O status do pedido impede
 * reprocessamento acidental; falhas fazem rollback de toda a cascata.
 */
export async function processarCascataPedido(pedidoId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.pedidos WHERE id = ${pedidoId} FOR UPDATE`;

    const pedido = await tx.pedido.findUniqueOrThrow({
      where: { id: pedidoId },
      include: { itens: { include: { produto: { include: { bom: { include: { item: true } } } } } } },
    });

    if (pedido.status !== "ORCAMENTO") {
      return { jaProcessado: true, ordensCriadas: 0, pedidosCompraCriados: 0, itensSemFornecedor: [] as string[], produtosSemBOM: [] as string[], itensAComprar: 0 };
    }
    if (pedido.itens.length === 0) throw new Error("O pedido precisa ter ao menos um produto para ser confirmado.");

    for (const [index, item] of pedido.itens.entries()) {
      await tx.ordemProducao.create({
        data: {
          codigo: `OF-${pedido.codigo}-${String(index + 1).padStart(2, "0")}`,
          pedidoId: pedido.id, produtoId: item.produtoId, quantidade: item.quantidade, status: "PLANEJADA",
        },
      });
    }

    const necessidade = new Map<string, { necessario: number; fornecedorId: string | null; sku: string }>();
    const produtosSemBOM: string[] = [];
    for (const linha of pedido.itens) {
      if (!linha.produto.bom.length) produtosSemBOM.push(linha.produto.sku);
      for (const componente of linha.produto.bom) {
        const atual = necessidade.get(componente.itemId) ?? {
          necessario: 0, fornecedorId: componente.item.fornecedorPrincipalId, sku: componente.item.sku,
        };
        atual.necessario += Number(componente.quantidadePorUnidade) * Number(componente.fatorPerda) * linha.quantidade;
        necessidade.set(componente.itemId, atual);
      }
    }

    const faltantes: Array<{ itemId: string; quantidade: number; fornecedorId: string | null; sku: string }> = [];
    for (const [itemId, n] of necessidade) {
      await tx.$queryRaw`SELECT "itemId" FROM public.estoque_itens WHERE "itemId" = ${itemId} FOR UPDATE`;
      const estoque = await tx.estoqueItem.findUnique({ where: { itemId } });
      const disponivel = Math.max(0, Number(estoque?.saldoAtual ?? 0) - Number(estoque?.reservado ?? 0));
      const reservar = Math.min(disponivel, n.necessario);
      const falta = Math.max(0, n.necessario - reservar);

      if (reservar > 0 && estoque) {
        await tx.estoqueItem.update({ where: { itemId }, data: { reservado: { increment: reservar } } });
        await tx.movimentoEstoque.create({
          data: { itemId, tipo: "RESERVA", quantidade: reservar, pedidoId: pedido.id, observacao: `Reserva automática — pedido ${pedido.codigo}` },
        });
      }
      if (falta > 0) faltantes.push({ itemId, quantidade: falta, fornecedorId: n.fornecedorId, sku: n.sku });
    }

    const porFornecedor = new Map<string, Array<{ itemId: string; quantidade: number }>>();
    const itensSemFornecedor: string[] = [];
    for (const falta of faltantes) {
      if (!falta.fornecedorId) { itensSemFornecedor.push(falta.sku); continue; }
      const itens = porFornecedor.get(falta.fornecedorId) ?? [];
      itens.push({ itemId: falta.itemId, quantidade: falta.quantidade });
      porFornecedor.set(falta.fornecedorId, itens);
    }

    let pedidosCompraCriados = 0;
    for (const [fornecedorId, itens] of porFornecedor) {
      pedidosCompraCriados += 1;
      await tx.pedidoCompra.create({
        data: {
          codigo: `PC-${pedido.codigo}-${String(pedidosCompraCriados).padStart(2, "0")}`,
          fornecedorId, status: "SUGERIDO", origemPedidoId: pedido.id,
          itens: { create: itens.map((item) => ({ itemId: item.itemId, quantidade: item.quantidade, precoUnitario: 0 })) },
        },
      });
    }

    const valor = pedido.valorTotal != null ? Number(pedido.valorTotal) : pedido.itens.reduce((sum, item) => sum + item.quantidade * Number(item.valorUnitario ?? 0), 0);
    if (valor > 0) {
      const titulo = await tx.contaReceber.findFirst({ where: { pedidoId: pedido.id } });
      if (!titulo) {
        await tx.contaReceber.create({
          data: {
            descricao: `Pedido ${pedido.codigo} — ${pedido.cliente}`, clienteNome: pedido.cliente,
            pedidoId: pedido.id, valor,
            vencimento: pedido.dataEntrega ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "ABERTO",
          },
        });
      }
    }

    await tx.pedido.update({
      where: { id: pedido.id },
      data: { status: faltantes.length > 0 ? "AGUARDANDO_MATERIAL" : "CONFIRMADO" },
    });

    return {
      jaProcessado: false, ordensCriadas: pedido.itens.length, pedidosCompraCriados,
      itensSemFornecedor, produtosSemBOM, itensAComprar: faltantes.length,
    };
  });
}
