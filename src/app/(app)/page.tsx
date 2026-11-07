import Link from "next/link";
import { AlertTriangle, Clock, Info, TrendingUp } from "lucide-react";
import { RoadRow } from "@/components/mega/road-row";
import { RevenueChart } from "@/components/mega/revenue-chart";
import { Sparkline } from "@/components/mega/sparkline";
import { operationalIntel } from "@/lib/mock-data";

const kpis = [
  { label: "PEDIDOS ABERTOS", value: "23", points: [14, 12, 15, 9, 11, 6, 8] },
  { label: "EM PRODUÇÃO", value: "6", points: [10, 11, 8, 12, 7, 9, 5] },
  { label: "ESTOQUE CRÍTICO", value: "2", accent: "var(--crit)", points: [16, 15, 16, 12, 13, 9, 6] },
  { label: "ENTREGAS PENDENTES", value: "4", points: [8, 10, 7, 9, 6, 10, 9] },
];

export default function CommandCenterPage() {
  return (
    <div>
      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] text-muted-foreground">
        <Info className="size-3" />
        Dados de demonstração — pronto para integração real
      </div>

      <div className="mb-6 flex flex-wrap items-start gap-7">
        <div>
          <div className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">RECEITA DO MÊS</div>
          <div className="bg-gradient-to-r from-foreground to-[var(--signal)] bg-clip-text font-sans text-[46px] leading-none font-bold tracking-tight text-transparent">
            R$ 96,2K
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--good)]">
            <TrendingUp className="size-3.5" />
            +18% <span className="font-medium text-muted-foreground">vs. outubro</span>
          </div>
        </div>

        <div className="flex min-w-[280px] flex-1 overflow-hidden rounded-xl border bg-card">
          {kpis.map((k) => (
            <div key={k.label} className="flex-1 border-r px-4 py-3.5 last:border-r-0">
              <div className="text-[10.5px] font-medium text-muted-foreground">{k.label}</div>
              <div className="mt-1 font-sans text-[19px] font-semibold tracking-tight" style={k.accent ? { color: k.accent } : undefined}>
                {k.value}
              </div>
              <Sparkline points={k.points} accent={k.accent} />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Onde estão os pedidos</h3>
          <span className="text-[11px] text-muted-foreground">clique pra abrir · passe o mouse pra ver o que está parado</span>
        </div>
        <RoadRow />
      </div>

      <div className="grid gap-4.5 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-xl border bg-card p-4.5">
          <div className="mb-3.5 flex items-baseline justify-between">
            <h3 className="text-[13.5px] font-semibold">Receita — últimos 8 meses</h3>
            <span className="font-mono text-[15px] font-semibold">R$ 96,2K</span>
          </div>
          <RevenueChart />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3.5">
            <h3 className="text-[13px] font-semibold">Inteligência operacional</h3>
            <span className="text-[11px] text-muted-foreground">{operationalIntel.length} itens</span>
          </div>
          <ul>
            {operationalIntel.map((item) => (
              <li key={item.title} className="border-b last:border-b-0">
                <Link href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background: item.severity === "crit" ? "var(--crit-dim)" : "var(--warn-dim)",
                      color: item.severity === "crit" ? "var(--crit)" : "var(--warn)",
                    }}
                  >
                    {item.severity === "crit" ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{item.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
