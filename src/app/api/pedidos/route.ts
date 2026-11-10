import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user ? { supabase, user: data.user } : null;
}

export async function GET() {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    // Use the same Prisma connection and product model used by POST when
    // validating and saving order items. This keeps catalog reads and writes
    // on exactly the same database.
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      orderBy: [{ linha: "asc" }, { nome: "asc" }],
      include: {
        bom: {
          include: {
            item: { include: { estoque: true } },
          },
        },
      },
    });

    return NextResponse.json({
      produtos: produtos.map((produto) => ({
        ...produto,
        precoBase: Number(produto.precoBase),
        bom: produto.bom.map((b) => ({
          ...b,
          quantidadePorUnidade: Number(b.quantidadePorUnidade),
          fatorPerda: Number(b.fatorPerda),
          item: {
            ...b.item,
            estoque: b.item.estoque
              ? {
                  ...b.item.estoque,
                  saldoAtual: Number(b.item.estoque.saldoAtual),
                  reservado: Number(b.item.estoque.reservado),
                }
              : null,
          },
        })),
      })),
      total: produtos.length,
    });
  } catch (error) {
    console.error("[GET /api/pedidos] catalog query failed:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o catálogo de produtos." },
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
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const user = auth.user;

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
    origem: body.origem || "WHATSAPP", vendedor: body.vendedor || user.email || null,
    telefoneContato: body.telefoneContato || null, emailContato: body.emailContato || null,
    enderecoEntrega: body.enderecoEntrega || null, dataEntrega: body.dataEntrega ? new Date(body.dataEntrega) : null,
    condicaoPagamento: body.condicaoPagamento || null, frete: Number(body.frete||0), desconto: Number(body.desconto||0),
    valorTotal: total, observacoes: body.observacoes || null,
    itens: { create: body.itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, valorUnitario: i.valorUnitario, observacao: i.observacao || null })) },
  }, include: { itens: { include: { produto: { select: { sku: true, nome: true } } } } } });

  return NextResponse.json({ pedido, analise: { subtotal, total, necessidades, linhasSemBOM,
    analiseCompleta: linhasSemBOM.length === 0 } }, { status: 201 });
}
