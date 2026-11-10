import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
const etapas = ["LEAD", "VISITA", "ORCAMENTO", "NEGOCIACAO", "GANHO", "PERDIDO"] as const;
async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return !error && data.user ? { supabase, user: data.user } : null;
}
function serialize(row: any) {
  return { id: row.id, nome: row.nome, seg: row.segmento, valor: Number(row.valor_estimado), vendedor: row.vendedor, linha_produto: row.linha_produto, telefone: row.telefone, observacao: row.observacao, etapa: row.etapa };
}
export async function GET() {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data, error } = await auth.supabase.from("oportunidades_comerciais").select("*").order("atualizado_em", { ascending: false });
  if (error) return NextResponse.json({ error: "Erro ao consultar oportunidades.", detail: error.message }, { status: 500 });
  return NextResponse.json({ oportunidades: (data || []).map(serialize) });
}
export async function POST(request: Request) {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const valor = Number(body.valor_estimado);
  if (!nome || !Number.isFinite(valor) || valor <= 0) return NextResponse.json({ error: "Informe cliente e valor estimado válido." }, { status: 400 });
  const { data, error } = await auth.supabase.from("oportunidades_comerciais").insert({
    nome, segmento: String(body.segmento || ""), vendedor: String(body.vendedor || ""),
    linha_produto: String(body.linha_produto || ""), valor_estimado: valor,
    telefone: String(body.telefone || "").trim() || null,
    observacao: String(body.observacao || "").trim() || null, criado_por: auth.user.id,
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Não foi possível salvar a oportunidade.", detail: error.message }, { status: 500 });
  return NextResponse.json({ oportunidade: serialize(data) }, { status: 201 });
}
export async function PATCH(request: Request) {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  let body: { id?: string; etapa?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body.id || !etapas.includes(body.etapa as typeof etapas[number])) return NextResponse.json({ error: "Oportunidade ou etapa inválida." }, { status: 400 });
  const { data, error } = await auth.supabase.from("oportunidades_comerciais").update({ etapa: body.etapa, atualizado_em: new Date().toISOString() }).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: "Não foi possível atualizar a etapa.", detail: error.message }, { status: 500 });
  return NextResponse.json({ oportunidade: serialize(data) });
}
