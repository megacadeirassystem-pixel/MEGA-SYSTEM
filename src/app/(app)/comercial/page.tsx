"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatBRL } from "@/lib/mock-data";

type Etapa = "LEAD" | "VISITA" | "ORCAMENTO" | "NEGOCIACAO" | "GANHO" | "PERDIDO";
type Deal = {
  id: string; codigo: string; nome: string; seg: string; valor: number;
  vendedor: string; linha_produto: string; itens: number;
  telefone: string | null; observacao: string | null; etapa: Etapa;
};
const etapas: { key: Etapa; label: string }[] = [
  { key: "LEAD", label: "Lead" },
  { key: "VISITA", label: "Visita / medição" },
  { key: "ORCAMENTO", label: "Orçamento" },
  { key: "NEGOCIACAO", label: "Negociação" },
  { key: "GANHO", label: "Ganho" },
  { key: "PERDIDO", label: "Perdido" },
];

export default function ComercialPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/comercial/pedidos", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao carregar.");
      setDeals(data.oportunidades);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  async function mover(deal: Deal, delta: number) {
    const index = etapas.findIndex((x) => x.key === deal.etapa);
    const next = etapas[index + delta];
    if (!next) return;
    try {
      const response = await fetch("/api/comercial/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deal.id, etapa: next.key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar.");
      setDeals((current) => current.map((x) => (x.id === deal.id ? data.oportunidade : x)));
      toast.success("Etapa atualizada: " + next.label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao mover.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Comercial"
        description="Lead → visita/medição → orçamento → negociação → ganho."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void carregar()}>
              <RefreshCw className="mr-2 size-3.5" />Atualizar
            </Button>
            <Link href="/comercial/pedidos/novo" className={buttonVariants()}>
              <Plus className="size-4" />Novo pedido
            </Link>
          </div>
        }
      />
      <div className="mb-4 text-xs text-muted-foreground">
        {loading ? "Carregando…" : deals.length + " pedidos no funil"}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {etapas.map((etapa) => {
          const items = deals.filter((d) => d.etapa === etapa.key);
          const total = items.reduce((s, d) => s + Number(d.valor), 0);
          return (
            <section key={etapa.key} className="min-w-0 rounded-xl border bg-card">
              <header className="border-b px-3 py-3">
                <h3 className="text-xs font-semibold">{etapa.label}</h3>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {items.length} · {formatBRL(total)}
                </p>
              </header>
              <div className="flex min-h-32 flex-col gap-2 p-2">
                {items.map((deal) => {
                  const index = etapas.findIndex((x) => x.key === deal.etapa);
                  return (
                    <article key={deal.id} className="rounded-md border bg-popover p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs">{deal.nome}</strong>
                        <span className="font-mono text-[9px] text-muted-foreground">{deal.codigo}</span>
                      </div>
                      <span className="block text-[10px] text-muted-foreground">
                        {deal.seg}
                        {deal.itens > 0 ? ` · ${deal.itens} item${deal.itens > 1 ? "s" : ""}` : " · sem cadeiras ainda"}
                      </span>
                      <span className="mt-1 block font-mono text-xs font-semibold">{formatBRL(Number(deal.valor))}</span>
                      {deal.vendedor && <span className="mt-1 block text-[10px] text-muted-foreground">{deal.vendedor}</span>}
                      <div className="mt-2 flex justify-between gap-1">
                        <Button size="sm" variant="outline" disabled={index === 0} onClick={() => void mover(deal, -1)} aria-label="Etapa anterior">
                          <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={index === etapas.length - 1} onClick={() => void mover(deal, 1)} aria-label="Próxima etapa">
                          <ArrowRight className="size-3.5" />Avançar
                        </Button>
                      </div>
                    </article>
                  );
                })}
                {!items.length && (
                  <p className="px-1 py-3 text-center text-[10px] text-muted-foreground">
                    {loading ? " " : "Nenhum pedido"}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
