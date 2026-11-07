import { Suspense } from "react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

async function EstoqueTable() {
  const itens = await prisma.item.findMany({
    include: { estoque: true, fornecedorPrincipal: true },
    orderBy: { nome: "asc" },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Saldo</TableHead>
          <TableHead className="text-right">Reservado</TableHead>
          <TableHead className="text-right">Disponível</TableHead>
          <TableHead className="text-right">Mínimo</TableHead>
          <TableHead>Fornecedor</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.map((item) => {
          const saldo = Number(item.estoque?.saldoAtual ?? 0);
          const reservado = Number(item.estoque?.reservado ?? 0);
          const minimo = Number(item.estoqueMinimo);
          const disponivel = saldo - reservado;
          const status = disponivel <= minimo ? "crit" : disponivel <= minimo * 1.3 ? "warn" : "ok";
          const statusLabel = disponivel <= minimo ? "Repor" : disponivel <= minimo * 1.3 ? "Atenção" : "OK";

          return (
            <TableRow key={item.id}>
              <TableCell className="font-semibold">
                {item.nome}
                <div className="font-mono text-[10.5px] font-normal text-muted-foreground">{item.sku}</div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.tipo === "MATERIA_PRIMA" ? "Matéria-prima" : "Componente comprado"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {saldo} {item.unidadeMedida}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{reservado}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{disponivel}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">{minimo}</TableCell>
              <TableCell>{item.fornecedorPrincipal?.nome ?? "—"}</TableCell>
              <TableCell>
                <StatusChip status={status} label={statusLabel} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export default function EstoquePage() {
  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Saldo por item de matéria-prima e componente — direto do banco, não é mais exemplo fixo."
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Suspense fallback={<TableSkeleton />}>
          <EstoqueTable />
        </Suspense>
      </div>
    </div>
  );
}
