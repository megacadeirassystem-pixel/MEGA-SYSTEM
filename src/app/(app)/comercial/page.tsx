import { Suspense } from "react";
import { PageHeader } from "@/components/mega/page-header";
import { NovaOportunidadeDialog } from "@/components/mega/nova-oportunidade-dialog";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/mock-data";

const ETAPAS = ["LEAD", "VISITA", "ORCAMENTO", "NEGOCIACAO", "GANHO"] as const;
const ETAPA_LABEL: Record<(typeof ETAPAS)[number], string> = {
  LEAD: "Lead",
  VISITA: "Visita / medição",
  ORCAMENTO: "Orçamento",
  NEGOCIACAO: "Negociação",
  GANHO: "Ganho",
};

async function ComercialBoard() {
  const [pedidos, produtos] = await Promise.all([
    prisma.pedido.findMany({
      where: { etapaFunil: { in: [...ETAPAS] } },
      include: { itens: { include: { produto: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const produtosForDialog = produtos.map((p) => ({ id: p.id, nome: p.nome, linha: p.linha, precoBase: Number(p.precoBase) }));

  return (
    <>
      <PageHeader
        title="Comercial"
        description="Lead → visita/medição → orçamento → negociação → ganho."
        action={<NovaOportunidadeDialog produtos={produtosForDialog} />}
      />

      <div className="flex overflow-hidden rounded-xl border bg-card">
        {ETAPAS.map((etapa, i) => {
          const deals = pedidos.filter((p) => p.etapaFunil === etapa);
          const total = deals.reduce(
            (sum, p) => sum + p.itens.reduce((s, it) => s + Number(it.produto.precoBase) * it.quantidade, 0),
            0,
          );
          return (
            <div key={etapa} className={`min-w-0 flex-1 ${i > 0 ? "border-l" : ""}`}>
              <div className="border-b px-3.5 py-2.5">
                <h4 className="text-xs font-semibold">{ETAPA_LABEL[etapa]}</h4>
                <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{formatBRL(total)}</div>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {deals.map((p) => {
                  const valor = p.itens.reduce((s, it) => s + Number(it.produto.precoBase) * it.quantidade, 0);
                  return (
                    <div key={p.id} className="rounded-md border bg-popover p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-[11.5px] font-semibold">{p.cliente}</strong>
                        <span className="font-mono text-[9.5px] text-muted-foreground">{p.codigo}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {p.segmento}
                        {p.itens.length > 0 ? ` · ${p.itens.length} item${p.itens.length > 1 ? "s" : ""}` : ""}
                      </span>
                      <span className="mt-1 block font-mono text-[11.5px] font-semibold">{formatBRL(valor)}</span>
                      {p.vendedor && <span className="mt-1 block text-[10px] text-muted-foreground">{p.vendedor}</span>}
                    </div>
                  );
                })}
                {deals.length === 0 && <div className="px-1 py-3 text-center text-[10.5px] text-muted-foreground">Nada aqui</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function BoardSkeleton() {
  return <div className="h-80 animate-pulse rounded-xl bg-muted" />;
}

export default function ComercialPage() {
  return (
    <div>
      <Suspense fallback={<BoardSkeleton />}>
        <ComercialBoard />
      </Suspense>
    </div>
  );
}
