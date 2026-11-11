import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processarCascataPedido } from "@/lib/pedido-cascade";

export async function GET() {
  // The product catalog exposes only active product identification and base
  // pricing. It is read-only and must not depend on a Supabase session cookie:
  // the application session is handled separately from Supabase Auth.
  try {
    // Read directly from the mapped PostgreSQL table. This avoids a stale or
    // mismatched generated Prisma model returning an empty catalog even though
    // the production table contains active chairs.
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      sku: string;
      nome: string;
      linha: string;
      precoBase: unknown;
    }>>`
      SELECT id, sku, nome, linha, "precoBase"
      FROM public.produtos
      WHERE ativo = TRUE
      ORDER BY linha ASC, nome ASC
    `;

    const produtos = rows.map((produto) => ({
      ...produto,
      precoBase: Number(produto.precoBase),
    }));

    return NextResponse.json({ produtos, total: produtos.length });
  } catch (error) {
    console.error("[GET /api/pedidos] catalog query failed:", error);
    const detail = error instanceof Error ? error.message : "Erro desconhecido";
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
    return NextResponse.json(
      { error: "Falha ao consultar produtos no banco de dados.", detail, code },
      { status: 500 }
    );
  }
}

type ItemInput = { produtoId: string; quantidade: number; valorUnitario: number; observacao?: string };
type Body = {
  cliente: string; tipoPedido: string; origem: string; vendedor?: string;
  telefoneContato?: string; emailContato?: string; enderecoEntrega?: string;
  dataEntrega?: string; condicaoPagamento?: string; frete?: number; desconto?: number;
  observacoes?: string; itens: ItemInput[];
};

export async function POST(request: Request) {
  // Sem login de usuário implementado no app ainda — este endpoint é de uso
  // interno (ERP atrás de VPN/rede da empresa), não público.
  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body.cliente?.trim() || !Array.isArray(body.itens) || body.itens.length === 0)
    return NextResponse.json({ error: "Informe o cliente e ao menos um produto." }, { status: 400 });
  if (body.itens.length > 100 || body.itens.some(i => !i.produtoId || !Number.isInteger(i.quantidade) || i.quantidade < 1 || !Number.isFinite(i.valorUnitario) || i.valorUnitario < 0))
    return NextResponse.json({ error: "Há itens com quantidade ou preço inválido." }, { status: 400 });

  const ids = [...new Set(body.itens.map(i => i.produtoId))];
  const produtos = await prisma.produto.findMany({ where: { id: { in: ids }, ativo: true },
    include: { bom: { include: { item: { include: { estoque: true } } } } } });
  if (produtos.length !== ids.length) return NextResponse.json({ error: "Um ou mais produtos não existem ou estão inativos." }, { status: 400 });

  const byId = new Map(produtos.map(p => [p.id, p]));
  const needs = new Map<string, { sku: string; nome: string; unidade: string; necessario: number; disponivel: number; temBOM: boolean }>();
  const linhasSemBOM: string[] = [];
  for (const linha of body.itens) {
    const produto = byId.get(linha.produtoId)!;
    if (!produto.bom.length) linhasSemBOM.push(produto.nome);
    for (const b of produto.bom) {
      const key = b.item.id;
      const current = needs.get(key) ?? { sku: b.item.sku, nome: b.item.nome, unidade: b.item.unidadeMedida, necessario: 0,
        disponivel: Number(b.item.estoque?.saldoAtual ?? 0) - Number(b.item.estoque?.reservado ?? 0), temBOM: true };
      current.necessario += Number(b.quantidadePorUnidade) * Number(b.fatorPerda) * linha.quantidade;
      needs.set(key, current);
    }
  }
  const necessidades = [...needs.values()].map(n => ({ ...n, disponivel: Math.max(0,n.disponivel), falta: Math.max(0,n.necessario-n.disponivel) }));
  const subtotal = body.itens.reduce((sum,i) => sum + i.quantidade*i.valorUnitario,0);
  const total = Math.max(0, subtotal + Math.max(0,Number(body.frete||0)) - Math.max(0,Number(body.desconto||0)));
  const count = await prisma.pedido.count();
  const codigo = `MC-${String(count + 1).padStart(5,"0")}`;

  const pedido = await prisma.pedido.create({ data: {
    codigo, cliente: body.cliente.trim(), status: "ORCAMENTO", tipoPedido: body.tipoPedido || "VENDA",
    origem: body.origem || "WHATSAPP", vendedor: body.vendedor || null,
    telefoneContato: body.telefoneContato || null, emailContato: body.emailContato || null,
    enderecoEntrega: body.enderecoEntrega || null, dataEntrega: body.dataEntrega ? new Date(body.dataEntrega) : null,
    condicaoPagamento: body.condicaoPagamento || null, frete: Number(body.frete||0), desconto: Number(body.desconto||0),
    valorTotal: total, observacoes: body.observacoes || null,
    itens: { create: body.itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, valorUnitario: i.valorUnitario, observacao: i.observacao || null })) },
  }, include: { itens: { include: { produto: { select: { sku: true, nome: true } } } } } });

  let cascata: Awaited<ReturnType<typeof processarCascataPedido>> | null = null;
  try {
    cascata = await processarCascataPedido(pedido.id);
  } catch (error) {
    console.error("[POST /api/pedidos] cascata (produção/compras/financeiro) falhou:", error);
  }

  return NextResponse.json({ pedido, cascata, analise: { subtotal, total, necessidades, linhasSemBOM,
    analiseCompleta: linhasSemBOM.length === 0 } }, { status: 201 });
}
