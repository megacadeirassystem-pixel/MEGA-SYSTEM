import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusChip } from "@/components/mega/status-chip";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { statusEstoque } from "@/lib/estoque-status";
import { updateItem } from "@/lib/actions/estoque";

async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      estoque: true,
      fornecedorPrincipal: true,
      bomEntradas: { include: { produto: true } },
      movimentos: { orderBy: { criadoEm: "desc" }, take: 10 },
    },
  });

  if (!item) notFound();

  const saldo = Number(item.estoque?.saldoAtual ?? 0);
  const reservado = Number(item.estoque?.reservado ?? 0);
  const minimo = Number(item.estoqueMinimo);
  const alvo = Number(item.estoqueAlvo);
  const disponivel = saldo - reservado;
  const { status, label } = statusEstoque(disponivel, minimo);

  const updateItemWithId = updateItem.bind(null, item.id);

  return (
    <div>
      <Link href="/estoque" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Estoque
      </Link>

      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-5">
        <div>
          <div className="font-mono text-[11px] text-muted-foreground">{item.sku}</div>
          <h1 className="text-xl font-bold tracking-tight">{item.nome}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {item.tipo === "MATERIA_PRIMA" ? "Matéria-prima" : "Componente comprado"} · unidade: {item.unidadeMedida}
          </p>
        </div>
        <StatusChip status={status} label={label} />
      </div>

      {/* números */}
      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Saldo físico", `${saldo} ${item.unidadeMedida}`],
          ["Reservado", `${reservado} ${item.unidadeMedida}`],
          ["Disponível", `${disponivel} ${item.unidadeMedida}`],
          ["Fornecedor", item.fornecedorPrincipal?.nome ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 bg-card p-3 sm:p-4">
            <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 break-words font-mono text-sm font-semibold sm:text-[15px]">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* editar */}
        <form action={updateItemWithId} className="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold">Parâmetros de ressuprimento</h3>
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Ponto de reposição (mínimo)
              <input
                name="estoqueMinimo"
                type="number"
                step="0.001"
                defaultValue={minimo}
                className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base font-mono sm:text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Estoque alvo (até onde repor)
              <input
                name="estoqueAlvo"
                type="number"
                step="0.001"
                defaultValue={alvo}
                className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Lead time do fornecedor (dias)
              <input
                name="leadTimeDias"
                type="number"
                defaultValue={item.leadTimeDias}
                className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Observações
              <textarea
                name="observacoes"
                defaultValue={item.observacoes ?? ""}
                rows={4}
                placeholder="Notas internas — variação de fornecedor, tolerância de corte, histórico de problema…"
                className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base sm:text-sm"
              />
            </label>
            <Button type="submit" className="mt-1 min-h-11 w-full sm:w-auto">
              Salvar alterações
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-5">
          {/* usado em */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Usado em</h3>
              <p className="text-[11px] text-muted-foreground">Cadeiras que consomem este item, via BOM</p>
            </div>
            <ul>
              {item.bomEntradas.map((b) => (
                <li key={b.id} className="border-b px-4 py-2.5 text-xs last:border-b-0">
                  <Link href={`/estoque/produto/${b.produtoId}`} className="font-semibold hover:text-[var(--signal)]">
                    {b.produto.nome}
                  </Link>
                  <span className="ml-2 font-mono text-muted-foreground">
                    {Number(b.quantidadePorUnidade)} {item.unidadeMedida}/un
                  </span>
                </li>
              ))}
              {item.bomEntradas.length === 0 && (
                <li className="px-4 py-3 text-xs text-muted-foreground">Nenhuma BOM usa este item ainda.</li>
              )}
            </ul>
          </div>

          {/* movimentos */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Movimentos recentes</h3>
            </div>
            <ul>
              {item.movimentos.map((m) => (
                <li key={m.id} className="flex items-center justify-between border-b px-4 py-2.5 text-xs last:border-b-0">
                  <span>{m.tipo.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="font-mono text-muted-foreground">
                    {m.criadoEm.toLocaleDateString("pt-BR")} · {Number(m.quantidade)} {item.unidadeMedida}
                  </span>
                </li>
              ))}
              {item.movimentos.length === 0 && (
                <li className="px-4 py-3 text-xs text-muted-foreground">Nenhum movimento registrado ainda.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ItemDetail params={params} />
    </Suspense>
  );
}
