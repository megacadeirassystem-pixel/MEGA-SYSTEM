import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const entregas = [{ pedido: "MC-0846", destino: "Igreja Batista Central", status: "warn" as const, label: "Roteirizando" }];

export default function LogisticaPage() {
  return (
    <div>
      <PageHeader title="Logística" description="Roteiro de entrega e instalação." />
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entregas.map((e) => (
              <TableRow key={e.pedido}>
                <TableCell className="font-mono">{e.pedido}</TableCell>
                <TableCell>{e.destino}</TableCell>
                <TableCell>
                  <StatusChip status={e.status} label={e.label} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
