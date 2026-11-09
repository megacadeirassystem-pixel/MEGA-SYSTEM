import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeConfirmarUsinagem } from "@/lib/usinagem-acesso";

async function entrar(form: FormData) {
  "use server";
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/producao/usinagem?login=erro");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  redirect(error ? "/producao/usinagem?login=erro" : "/producao/usinagem");
}

type Props = { searchParams: Promise<{ login?: string }> };

export default function UsinagemPage(props: Props) {
  return <Suspense fallback={<p>Carregando Usinagem…</p>}><ModuloUsinagem {...props} /></Suspense>;
}

async function ModuloUsinagem({ searchParams }: Props) {
  const loginDisponivel = Boolean(process.env.USINAGEM_OPERADORES?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const user = loginDisponivel ? (await (await createClient()).auth.getUser()).data.user : null;
  const integrada = Boolean(user && podeConfirmarUsinagem(user.id));
  const { login } = await searchParams;

  return (
    <div>
      {loginDisponivel && !user && (
        <form action={entrar} className="mb-3 flex flex-wrap items-center gap-2">
          <input aria-label="E-mail do operador" name="email" type="email" placeholder="E-mail do operador" autoComplete="username" className="rounded-md border px-3 py-2" required />
          <input aria-label="Senha" name="password" type="password" placeholder="Senha" autoComplete="current-password" className="rounded-md border px-3 py-2" required />
          <button className="rounded-md border px-3 py-2" type="submit">Entrar para confirmar produção</button>
          {login === "erro" && <p role="alert">Não foi possível entrar com essas credenciais.</p>}
        </form>
      )}
      <iframe
        title="Mega Usinagem"
        src={integrada ? "/mega-usinagem/index.html?integrado=1" : "/mega-usinagem/index.html"}
        className="h-[calc(100vh-8rem)] min-h-[540px] w-full rounded-xl border"
      />
    </div>
  );
}
