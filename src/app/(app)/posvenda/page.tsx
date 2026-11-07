import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chamados } from "@/lib/mock-data";

const kpis = [
  { label: "CHAMADOS ABERTOS", value: "5" },
  { label: "SLA MÉDIO", value: "1,8 dia" },
  { label: "GARANTIAS ATIVAS", value: "214" },
  { label: "SATISFAÇÃO", value: "4,7/5", accent: "var(--good)" },
];

export default function PosVendaPage() {
  return (
    <div>
      <PageHeader
        title="Pós-venda"
        description="Garantia, assistência técnica e relacionamento com quem já comprou."
        action={
          <Button>
            <Plus /> Novo chamado
          </Button>
        }
      />

      <KpiStrip items={kpis} />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chamado</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Aberto há</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chamados.map((c) => (
              <TableRow key={c.chamado}>
                <TableCell className="font-mono">{c.chamado}</TableCell>
                <TableCell className="font-semibold">{c.cliente}</TableCell>
                <TableCell>{c.produto}</TableCell>
                <TableCell>{c.tipo}</TableCell>
                <TableCell>{c.abertoHa}</TableCell>
                <TableCell>
                  <StatusChip status={c.status} label={c.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
