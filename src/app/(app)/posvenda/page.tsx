import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const chamados = [{ chamado: "PV-0091", cliente: "Hotel Transamérica", status: "warn" as const, label: "Em atendimento" }];

export default function PosVendaPage() {
  return (
    <div>
      <PageHeader title="Pós-venda" description="Garantia, assistência técnica e relacionamento." />
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chamado</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chamados.map((c) => (
              <TableRow key={c.chamado}>
                <TableCell className="font-mono">{c.chamado}</TableCell>
                <TableCell>{c.cliente}</TableCell>
                <TableCell>
                  <StatusChip status={c.status} label={c.label} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
