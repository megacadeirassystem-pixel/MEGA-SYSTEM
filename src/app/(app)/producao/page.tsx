import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { UsinagemHandoffCard } from "@/components/mega/usinagem-handoff-card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ordensProducao } from "@/lib/mock-data";

export default function ProducaoPage() {
  return (
    <div>
      <PageHeader
        title="Produção"
        description="Ordens de fabricação, lotes e o handoff pra usinagem."
        action={
          <Button>
            <Plus /> Nova ordem
          </Button>
        }
      />

      <UsinagemHandoffCard />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Peças</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordensProducao.map((o) => (
              <TableRow key={o.ordem}>
                <TableCell className="font-mono">{o.ordem}</TableCell>
                <TableCell>{o.pedido}</TableCell>
                <TableCell>{o.pecas}</TableCell>
                <TableCell>{o.etapa}</TableCell>
                <TableCell>
                  <StatusChip status={o.status} label={o.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
