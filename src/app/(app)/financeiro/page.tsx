import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { contasReceber, contasPagar, dreResumo } from "@/lib/mock-data";

const kpis = [
  { label: "A RECEBER (MÊS)", value: "R$ 128,4K" },
  { label: "A PAGAR (MÊS)", value: "R$ 71,2K" },
  { label: "SALDO PROJETADO", value: "R$ 57,2K", accent: "var(--good)" },
  { label: "INADIMPLÊNCIA", value: "3,1%" },
];

export default function FinanceiroPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="Financeiro"
        description="Contas a pagar e receber, fluxo de caixa e DRE — puxando valor de Comercial e Compras automaticamente."
        action={
          <Button>
            <Plus /> Novo lançamento
          </Button>
        }
      />

      <KpiStrip items={kpis} />

      <div className="grid gap-4.5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3.5">
            <h3 className="text-[13px] font-semibold">Contas a receber</h3>
            <span className="text-[11px] text-muted-foreground">{contasReceber.length} itens</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido / Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasReceber.map((c) => (
                <TableRow key={c.ref}>
                  <TableCell className="font-semibold">{c.ref}</TableCell>
                  <TableCell className="font-mono">{c.vencimento}</TableCell>
                  <TableCell className="text-right font-mono">{c.valor}</TableCell>
                  <TableCell>
                    <StatusChip status={c.status} label={c.statusLabel} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3.5">
            <h3 className="text-[13px] font-semibold">Contas a pagar</h3>
            <span className="text-[11px] text-muted-foreground">{contasPagar.length} itens</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasPagar.map((c) => (
                <TableRow key={c.fornecedor}>
                  <TableCell className="font-semibold">{c.fornecedor}</TableCell>
                  <TableCell className="text-right font-mono">{c.valor}</TableCell>
                  <TableCell>
                    <StatusChip status={c.status} label={c.statusLabel} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6 mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">DRE — RESUMO DO MÊS</div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Linha</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dreResumo.map((d) => (
              <TableRow key={d.linha}>
                <TableCell className={d.destaque ? "font-semibold" : "text-muted-foreground"}>{d.linha}</TableCell>
                <TableCell
                  className="text-right font-mono"
                  style={d.linha === "Margem líquida" ? { color: "var(--good)" } : undefined}
                >
                  {d.valor}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
