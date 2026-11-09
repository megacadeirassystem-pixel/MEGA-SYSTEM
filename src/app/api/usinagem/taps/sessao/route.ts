import { createClient } from "@/lib/supabase/server";

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return fail("Envie os dados em JSON.", 415);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 4096) return fail("Dados de acesso inválidos.", 400);
  let payload;
  try { payload = JSON.parse(raw); }
  catch { return fail("Dados de acesso inválidos.", 400); }
  if (!payload || typeof payload.email !== "string" || typeof payload.password !== "string" ||
      !payload.email.trim() || !payload.password) return fail("Informe e-mail e senha.", 400);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim(), password: payload.password,
  });
  if (error) return error.status === 429
    ? fail("Muitas tentativas. Tente novamente em instantes.", 429)
    : fail("E-mail ou senha inválidos.", 401);
  if (data.user?.app_metadata.mega_tap_access !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return fail("Sua conta não tem acesso à biblioteca de TAPs.", 403);
  }
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return fail("Não foi possível encerrar a sessão.", 500);
  return new Response(null, { status: 204 });
}
