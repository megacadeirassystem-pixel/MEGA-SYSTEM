import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processarCascataPedido } from "@/lib/pedido-cascade";

const etapas = ["LEAD", "VISITA", "ORCAMENTO", "NEGOCIACAO", "GANHO", "PERDIDO"] as const;

export async function GET() {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { itens: { include: { produto: { select: { nome: true, linha: true } } } } },
      orderBy: { criadoEm: "desc" },
    });
    const oportunidades = pedidos.map((p) => ({
      id: p.id, codigo: p.codigo, nome: p.cliente, seg: p.segmento ?? "",
      valor: p.valorTotal != null ? Number(p.valorTotal) : p.itens.reduce((sum, it) => sum + it.quantidade * Number(it.valorUnitario ?? 0), 0),
      vendedor: p.vendedor ?? "", linha_produto: p.itens[0]?.produto.linha ?? "",
      itens: p.itens.length, telefone: p.telefone ?? p.telefoneContato ?? null,
      observacao: p.observacao ?? p.observacoes ?? null, etapa: p.etapaFunil, status: p.status,
    }));
    return NextResponse.json({ oportunidades });
  } catch (error) {
    console.error("[GET /api/comercial/pedidos] falha:", error);
    return NextResponse.json({ error: "Falha ao consultar pedidos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: { id?: string; etapa?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  if (!body.id || !etapas.includes(body.etapa as (typeof etapas)[number])) {
    return NextResponse.json({ error: "Pedido ou etapa inválida." }, { status: 400 });
  }

  try {
    const atual = await prisma.pedido.findUnique({ where: { id: body.id }, include: { itens: true } });
    if (!atual) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

    const etapa = body.etapa as (typeof etapas)[number];
    if (etapa === "GANHO" && atual.itens.length === 0) {
      return NextResponse.json({ error: "Adicione ao menos um produto ao pedido antes de marcá-lo como ganho." }, { status: 409 });
    }

    const atualizado = await prisma.pedido.update({
      where: { id: atual.id }, data: { etapaFunil: etapa },
    });

    let cascata: Awaited<ReturnType<typeof processarCascataPedido>> | null = null;
    if (etapa === "GANHO") {
      try {
        cascata = await processarCascataPedido(atualizado.id);
      } catch (error) {
        await prisma.pedido.update({ where: { id: atualizado.id }, data: { etapaFunil: atual.etapaFunil } });
        console.error("[PATCH /api/comercial/pedidos] cascata falhou:", error);
        return NextResponse.json({ error: "Não foi possível confirmar o pedido e iniciar a operação. Nenhuma etapa operacional foi gravada; tente novamente." }, { status: 500 });
      }
    }

    const pedido = await prisma.pedido.findUniqueOrThrow({
      where: { id: atualizado.id },
      include: { itens: { include: { produto: { select: { nome: true, linha: true } } } } },
    });
    const valor = pedido.valorTotal != null ? Number(pedido.valorTotal) : pedido.itens.reduce((sum, it) => sum + it.quantidade * Number(it.valorUnitario ?? 0), 0);

    return NextResponse.json({
      oportunidade: {
        id: pedido.id, codigo: pedido.codigo, nome: pedido.cliente, seg: pedido.segmento ?? "",
        valor, vendedor: pedido.vendedor ?? "", linha_produto: pedido.itens[0]?.produto.linha ?? "",
        itens: pedido.itens.length, telefone: pedido.telefone ?? pedido.telefoneContato ?? null,
        observacao: pedido.observacao ?? pedido.observacoes ?? null, etapa: pedido.etapaFunil, status: pedido.status,
      },
      cascata,
    });
  } catch (error) {
    console.error("[PATCH /api/comercial/pedidos] falha:", error);
    return NextResponse.json({ error: "Não foi possível atualizar a etapa." }, { status: 500 });
  }
}
