import { prisma } from "@/lib/prisma";

/**
 * Roda depois que um Pedido é criado: gera ordem de produção por item,
 * reserva o estoque disponível, sugere compra do que falta (por fornecedor)
 * e lança a conta a receber no Financeiro. Best-effort — se algo aqui falhar,
 * o pedido em si já foi salvo; o erro só fica registrado no log.
 */
export async function processarCascataPedido(pedidoId: string) {
  const pedido = await prisma.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    include: {
      itens: {
        include: {
          produto: {
            include: { bom: { include: { item: { include: { estoque: true } } } } },
          },
        },
      },
    },
  });

  // 1) Produção — uma ordem por linha de item do pedido
  const totalOF = await prisma.ordemProducao.count();
  await Promise.all(
    pedido.itens.map((item, i) =>
      prisma.ordemProducao.create({
        data: {
          codigo: `OF-${String(totalOF + i + 1).padStart(5, "0")}`,
          pedidoId: pedido.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          status: "PLANEJADA",
        },
      }),
    ),
  );

  // 2) Explode a BOM de todo o pedido e reserva o que já tem em estoque
  const necessidade = new Map<
    string,
    { necessario: number; fornecedorId: string | null; sku: string; saldoAtual: number; reservadoAtual: number }
  >();
  for (const pi of pedido.itens) {
    for (const b of pi.produto.bom) {
      const atual = necessidade.get(b.itemId) ?? {
        necessario: 0,
        fornecedorId: b.item.fornecedorPrincipalId,
        sku: b.item.sku,
        saldoAtual: Number(b.item.estoque?.saldoAtual ?? 0),
        reservadoAtual: Number(b.item.estoque?.reservado ?? 0),
      };
      atual.necessario += Number(b.quantidadePorUnidade) * Number(b.fatorPerda) * pi.quantidade;
      necessidade.set(b.itemId, atual);
    }
  }

  const faltantes: { itemId: string; quantidade: number }[] = [];

  for (const [itemId, n] of necessidade) {
    const disponivel = Math.max(0, n.saldoAtual - n.reservadoAtual);
    const reservar = Math.min(disponivel, n.necessario);
    const falta = n.necessario - reservar;

    if (reservar > 0) {
      await prisma.estoqueItem.update({ where: { itemId }, data: { reservado: { increment: reservar } } });
      await prisma.movimentoEstoque.create({
        data: {
          itemId,
          tipo: "RESERVA",
          quantidade: reservar,
          pedidoId: pedido.id,
          observacao: `Reserva automática — pedido ${pedido.codigo}`,
        },
      });
    }
    if (falta > 0) faltantes.push({ itemId, quantidade: falta });
  }

  // 3) Compras — um pedido de compra por fornecedor, só pro que faltou e tem fornecedor cadastrado
  const porFornecedor = new Map<string, { itemId: string; quantidade: number }[]>();
  const semFornecedor: string[] = [];
  for (const f of faltantes) {
    const n = necessidade.get(f.itemId)!;
    if (!n.fornecedorId) {
      semFornecedor.push(n.sku);
      continue;
    }
    const lista = porFornecedor.get(n.fornecedorId) ?? [];
    lista.push(f);
    porFornecedor.set(n.fornecedorId, lista);
  }

  const totalPC = await prisma.pedidoCompra.count();
  let i = 0;
  for (const [fornecedorId, itens] of porFornecedor) {
    i += 1;
    await prisma.pedidoCompra.create({
      data: {
        codigo: `PC-${String(totalPC + i).padStart(5, "0")}`,
        fornecedorId,
        status: "SUGERIDO",
        origemPedidoId: pedido.id,
        itens: { create: itens.map((it) => ({ itemId: it.itemId, quantidade: it.quantidade, precoUnitario: 0 })) },
      },
    });
  }

  // 4) Financeiro — conta a receber do valor total do pedido
  const valor =
    pedido.valorTotal != null
      ? Number(pedido.valorTotal)
      : pedido.itens.reduce((sum, it) => sum + it.quantidade * Number(it.valorUnitario ?? 0), 0);
  if (valor > 0) {
    await prisma.contaReceber.create({
      data: {
        descricao: `Pedido ${pedido.codigo} — ${pedido.cliente}`,
        clienteNome: pedido.cliente,
        pedidoId: pedido.id,
        valor,
        vencimento: pedido.dataEntrega ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "ABERTO",
      },
    });
  }

  return { ordensCriadas: pedido.itens.length, pedidosCompraCriados: porFornecedor.size, itensSemFornecedor: semFornecedor };
}
