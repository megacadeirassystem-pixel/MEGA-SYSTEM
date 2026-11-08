import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { createItem } from "@/lib/actions/cadastro";

async function NovoItemForm() {
  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });

  return (
    <form action={createItem} className="w-full max-w-xl rounded-xl border bg-card p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium">
          SKU
          <input name="sku" required placeholder="CP-TECIDO-AZUL" className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base font-mono sm:text-sm" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-xs font-medium sm:col-span-1">
          Unidade de medida
          <input name="unidadeMedida" required defaultValue="un" placeholder="un, m, m2, kg…" className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base sm:text-sm" />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium">
          Nome
          <input name="nome" required placeholder="Tecido técnico azul marinho" className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-xs font-medium sm:col-span-1">
          Tipo
          <select name="tipo" defaultValue="COMPONENTE_COMPRADO" className="rounded-md border bg-background px-2.5 py-1.5 text-sm">
            <option value="MATERIA_PRIMA">Matéria-prima (processada internamente)</option>
            <option value="COMPONENTE_COMPRADO">Componente comprado pronto</option>
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-xs font-medium sm:col-span-1">
          Fornecedor principal
          <select name="fornecedorPrincipalId" className="rounded-md border bg-background px-2.5 py-1.5 text-sm">
            <option value="">— sem fornecedor definido —</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium">
          Ponto de reposição (mínimo)
          <input name="estoqueMinimo" type="number" step="0.001" defaultValue={0} className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Estoque alvo
          <input name="estoqueAlvo" type="number" step="0.001" defaultValue={0} className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Lead time (dias)
          <input name="leadTimeDias" type="number" defaultValue={0} className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Saldo inicial em estoque
          <input name="saldoInicial" type="number" step="0.001" defaultValue={0} className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm" />
        </label>
      </div>
      <Button type="submit" className="mt-5 min-h-11 w-full sm:w-auto">
        Criar item
      </Button>
    </form>
  );
}

export default function NovoItemPage() {
  return (
    <div>
      <Link href="/estoque" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Estoque
      </Link>
      <h1 className="mb-5 text-xl font-bold tracking-tight">Novo item</h1>
      <Suspense fallback={<div className="h-96 max-w-xl animate-pulse rounded-xl bg-muted" />}>
        <NovoItemForm />
      </Suspense>
    </div>
  );
}
