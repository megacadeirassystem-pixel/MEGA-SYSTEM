import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { entregas, instalacoesAgendadas } from "@/lib/mock-data";

const kpis = [
  { label: "ENTREGAS HOJE", value: "3" },
  { label: "EM ROTA", value: "2" },
  { label: "INSTALAÇÃO AGENDADA", value: "4" },
  { label: "ATRASADAS", value: "1", accent: "var(--crit)" },
];

export default function LogisticaPage() {
  return (
    <div>
      <PageHeader
        title="Logística"
        description="Roteiro de entrega e instalação — do pedido pronto até a assinatura do cliente."
        action={
          <Button>
            <Plus /> Nova rota
          </Button>
        }
      />

      <KpiStrip items={kpis} />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entregas.map((e) => (
              <TableRow key={e.pedido}>
                <TableCell className="font-mono">{e.pedido}</TableCell>
                <TableCell>{e.destino}</TableCell>
                <TableCell>{e.veiculo}</TableCell>
                <TableCell>{e.motorista}</TableCell>
                <TableCell className="font-mono">{e.data}</TableCell>
                <TableCell>
                  <StatusChip status={e.status} label={e.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">INSTALAÇÕES AGENDADAS</div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instalacoesAgendadas.map((i) => (
              <TableRow key={i.pedido}>
                <TableCell className="font-mono">{i.pedido}</TableCell>
                <TableCell>{i.cliente}</TableCell>
                <TableCell>{i.tecnico}</TableCell>
                <TableCell className="font-mono">{i.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
