import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const etapas = ["LEAD", "VISITA", "ORCAMENTO", "NEGOCIACAO", "GANHO", "PERDIDO"] as const;

// Lista o funil comercial a partir dos pedidos reais (não existe mais uma
// tabela separada de "oportunidades" — todo cliente no funil é um Pedido,
// com ou sem itens ainda escolhidos).
export async function GET() {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: { itens: { include: { produto: { select: { nome: true, linha: true } } } } },
      orderBy: { criadoEm: "desc" },
    });

    const deals = pedidos.map((p) => {
      const valor =
        p.valorTotal != null
          ? Number(p.valorTotal)
          : p.itens.reduce((sum, it) => sum + it.quantidade * Number(it.valorUnitario ?? 0), 0);
      return {
        id: p.id,
        codigo: p.codigo,
        nome: p.cliente,
        seg: p.segmento ?? "",
        valor,
        vendedor: p.vendedor ?? "",
        linha_produto: p.itens[0]?.produto.linha ?? "",
        itens: p.itens.length,
        telefone: p.telefone ?? p.telefoneContato ?? null,
        observacao: p.observacao ?? p.observacoes ?? null,
        etapa: p.etapaFunil,
      };
    });

    return NextResponse.json({ oportunidades: deals });
  } catch (error) {
    console.error("[GET /api/comercial/pedidos] falha:", error);
    return NextResponse.json({ error: "Falha ao consultar pedidos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: { id?: string; etapa?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body.id || !etapas.includes(body.etapa as (typeof etapas)[number]))
    return NextResponse.json({ error: "Pedido ou etapa inválida." }, { status: 400 });

  try {
    const pedido = await prisma.pedido.update({
      where: { id: body.id },
      data: { etapaFunil: body.etapa as (typeof etapas)[number] },
      include: { itens: { include: { produto: { select: { nome: true, linha: true } } } } },
    });
    const valor =
      pedido.valorTotal != null
        ? Number(pedido.valorTotal)
        : pedido.itens.reduce((sum, it) => sum + it.quantidade * Number(it.valorUnitario ?? 0), 0);
    return NextResponse.json({
      oportunidade: {
        id: pedido.id,
        codigo: pedido.codigo,
        nome: pedido.cliente,
        seg: pedido.segmento ?? "",
        valor,
        vendedor: pedido.vendedor ?? "",
        linha_produto: pedido.itens[0]?.produto.linha ?? "",
        itens: pedido.itens.length,
        telefone: pedido.telefone ?? pedido.telefoneContato ?? null,
        observacao: pedido.observacao ?? pedido.observacoes ?? null,
        etapa: pedido.etapaFunil,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/comercial/pedidos] falha:", error);
    return NextResponse.json({ error: "Não foi possível atualizar a etapa." }, { status: 500 });
  }
}
