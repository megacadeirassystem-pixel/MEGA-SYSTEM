import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const metadata = "id, owner_id, file_name, pieces, seconds, sheet_number, sku, revision, saved_at";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const fail = (error: string, status: number, code?: string) =>
  Response.json({ error, code }, { status });

function databaseFailure(error: { code: string }) {
  if (error.code === "23505") return fail("Já existe um TAP com esse nome.", 409, "TAP_NAME_EXISTS");
  if (error.code === "42P01" || error.code === "PGRST205") {
    return fail("A biblioteca compartilhada ainda não foi configurada.", 503);
  }
  console.error("Biblioteca TAP", error.code);
  return fail("Não foi possível acessar a biblioteca compartilhada.", 500);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Entre no MEGA SYSTEM para consultar os TAPs.", 401);
  if (user.app_metadata.mega_tap_access !== true) return fail("Sua conta não tem acesso à biblioteca de TAPs.", 403);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id !== null) {
    if (!uuid.test(id)) return fail("Arquivo inválido.", 400);
    const { data, error } = await supabase.from("usinagem_taps")
      .select(`${metadata}, content`).eq("id", id).maybeSingle();
    if (error) return databaseFailure(error);
    if (!data) return fail("TAP não encontrado.", 404);
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  }
  const page = Number(searchParams.get("page") ?? 0);
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return fail("Página inválida.", 400);
  const { data, error } = await supabase.from("usinagem_taps")
    .select(metadata).order("saved_at", { ascending: false }).order("id").range(page * 50, page * 50 + 50);
  if (error) return databaseFailure(error);
  return Response.json({
    taps: data.slice(0, 50).map(tap => ({ ...tap, editable: tap.owner_id === user.id })),
    hasMore: data.length > 50,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return fail("Envie o TAP em JSON.", 415);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Entre no MEGA SYSTEM para salvar o TAP.", 401);
  if (user.app_metadata.mega_tap_access !== true) return fail("Sua conta não tem acesso à biblioteca de TAPs.", 403);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 4200000) return fail("TAP acima do tamanho aceito pela biblioteca.", 413);
  let payload;
  try { payload = JSON.parse(raw); }
  catch { return fail("JSON inválido.", 400); }
  if (!payload || typeof payload !== "object") return fail("TAP inválido.", 400);
  const { fileName, content, pieces, seconds, sheetNumber, sku, replace } = payload;
  if (typeof fileName !== "string" || !/^.{1,156}\.tap$/i.test(fileName.trim()) ||
      /[<>:"/\\|?*\x00-\x1f]/.test(fileName) ||
      typeof content !== "string" || !content || content.includes("\x00") ||
      Buffer.byteLength(content) > 4000000 ||
      !Number.isInteger(pieces) || pieces < 1 || pieces > 500000 ||
      !Number.isFinite(seconds) || seconds < 0 || seconds > 31536000 ||
      !Number.isInteger(sheetNumber) || sheetNumber < 1 || sheetNumber > 500000 ||
      (sku != null && (typeof sku !== "string" || !/^USI-(ASS|ENC)-(BEL|GOL|JER|PLU)$/.test(sku)))) {
    return fail("Arquivo ou dados de produção inválidos.", 400);
  }

  const name = fileName.trim().normalize("NFC");
  const row = { file_name: name, content, pieces, seconds, sheet_number: sheetNumber, sku: sku ?? null };
  if (replace !== undefined) {
    if (!replace || typeof replace.id !== "string" || typeof replace.revision !== "string" ||
        !uuid.test(replace.id) || !uuid.test(replace.revision)) return fail("Substituição inválida.", 400);
    const { data, error } = await supabase.from("usinagem_taps")
      .update({ ...row, revision: randomUUID(), saved_at: new Date().toISOString() })
      .eq("id", replace.id).eq("revision", replace.revision).eq("owner_id", user.id)
      .eq("name_key", name.toLowerCase()).select(metadata).maybeSingle();
    if (error) return databaseFailure(error);
    if (!data) return fail("O TAP mudou ou pertence a outro usuário. Atualize a lista.", 409);
    return Response.json(data);
  }

  const { data, error } = await supabase.from("usinagem_taps").insert(row).select(metadata).single();
  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await supabase.from("usinagem_taps")
      .select("id, revision, owner_id").eq("name_key", name.toLowerCase()).maybeSingle();
    if (lookupError) return databaseFailure(lookupError);
    return Response.json({
      error: existing?.owner_id === user.id ? "Já existe um TAP com esse nome." : "O nome já está em uso na biblioteca.",
      code: "TAP_NAME_EXISTS",
      replace: existing?.owner_id === user.id ? { id: existing.id, revision: existing.revision } : null,
    }, { status: 409 });
  }
  if (error) return databaseFailure(error);
  return Response.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const revision = searchParams.get("revision");
  if (!id || !revision || !uuid.test(id) || !uuid.test(revision)) return fail("Arquivo inválido.", 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Entre no MEGA SYSTEM para apagar o TAP.", 401);
  if (user.app_metadata.mega_tap_access !== true) return fail("Sua conta não tem acesso à biblioteca de TAPs.", 403);
  const { data, error } = await supabase.from("usinagem_taps").delete()
    .eq("id", id).eq("revision", revision).eq("owner_id", user.id).select("id").maybeSingle();
  if (error) return databaseFailure(error);
  if (!data) return fail("O TAP mudou ou pertence a outro usuário. Atualize a lista.", 409);
  return new Response(null, { status: 204 });
}
