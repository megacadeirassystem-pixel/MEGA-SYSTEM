import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notasFiscais } from "@/lib/mock-data";

const kpis = [
  { label: "EMITIDAS (MÊS)", value: "19" },
  { label: "PENDENTES", value: "2", accent: "var(--warn)" },
  { label: "CANCELADAS", value: "0" },
  { label: "VALOR TOTAL", value: "R$ 184,9K" },
];

export default function FiscalPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="Fiscal"
        description="Emissão e guarda de documentos fiscais — disparada quando o pedido sai de Estoque pra Logística."
        action={
          <Button>
            <Plus /> Emitir NF-e
          </Button>
        }
      />

      <KpiStrip items={kpis} />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NF-e</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notasFiscais.map((n) => (
              <TableRow key={`${n.pedido}-${n.numero}`}>
                <TableCell className="font-mono">{n.numero}</TableCell>
                <TableCell className="font-mono">{n.pedido}</TableCell>
                <TableCell>{n.cliente}</TableCell>
                <TableCell className="text-right font-mono">{n.valor}</TableCell>
                <TableCell className="font-mono">{n.emissao}</TableCell>
                <TableCell>
                  <StatusChip status={n.status} label={n.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
