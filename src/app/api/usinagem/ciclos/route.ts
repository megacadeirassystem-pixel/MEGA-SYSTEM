import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { podeConfirmarUsinagem } from "@/lib/usinagem-acesso";
import { confirmarCiclo, ErroUsinagem, lerPlano } from "@/lib/usinagem-producao";

export async function POST(request: Request) {
  const error = (message: string, status: number) => Response.json({ error: message }, { status });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return error("Origem de confirmação inválida.", 403);
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return error("Envie a confirmação em JSON.", 415);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return error("Entre no MEGA SYSTEM para confirmar a chapa.", 401);
    if (!podeConfirmarUsinagem(user.id)) return error("Operador sem permissão de confirmação.", 403);

    const text = await request.text();
    if (Buffer.byteLength(text) > 262144) return error("Plano acima do tamanho aceito.", 413);
    let body: unknown;
    try { body = JSON.parse(text); }
    catch { return error("JSON inválido.", 400); }
    const result = await confirmarCiclo(lerPlano(body), user.id);
    revalidatePath("/estoque");
    revalidatePath("/estoque/item/[id]", "page");
    return Response.json(result, { status: result.repetido ? 200 : 201 });
  } catch (cause) {
    if (cause instanceof ErroUsinagem) return error(cause.message, cause.status);
    console.error("Falha na confirmação de usinagem", cause instanceof Error ? cause.name : "Erro");
    return error("Não foi possível confirmar a chapa. Reenvie a mesma confirmação.", 500);
  }
}
