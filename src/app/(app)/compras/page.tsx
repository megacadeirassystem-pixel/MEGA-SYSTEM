import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { comprasAbertas } from "@/lib/mock-data";

export default function ComprasPage() {
  return (
    <div>
      <PageHeader
        title="Compras"
        description="Matéria-prima necessária pra fabricar os pedidos ganhos."
        action={
          <Button>
            <Plus /> Novo pedido
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Para</TableHead>
              <TableHead className="text-right">Qtde.</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comprasAbertas.map((c) => (
              <TableRow key={c.material}>
                <TableCell className="font-semibold">{c.material}</TableCell>
                <TableCell>{c.para}</TableCell>
                <TableCell className="text-right font-mono">{c.qtd}</TableCell>
                <TableCell>{c.fornecedor}</TableCell>
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
