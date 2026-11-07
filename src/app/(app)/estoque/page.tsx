import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { statusEstoque } from "@/lib/estoque-status";

async function EstoqueGeralTable() {
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
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {itens.map((item) => {
          const saldo = Number(item.estoque?.saldoAtual ?? 0);
          const reservado = Number(item.estoque?.reservado ?? 0);
          const minimo = Number(item.estoqueMinimo);
          const disponivel = saldo - reservado;
          const { status, label } = statusEstoque(disponivel, minimo);

          return (
            <Link key={item.id} href={`/estoque/item/${item.id}`} className="contents">
              <TableRow className="cursor-pointer">
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
                  <StatusChip status={status} label={label} />
                </TableCell>
                <TableCell>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            </Link>
          );
        })}
      </TableBody>
    </Table>
  );
}

async function EstoquePorProdutoTable() {
  const produtos = await prisma.produto.findMany({
    include: { bom: true },
    orderBy: { nome: "asc" },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Produto</TableHead>
          <TableHead>Linha</TableHead>
          <TableHead className="text-right">Itens na receita</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {produtos.map((p) => (
          <Link key={p.id} href={`/estoque/produto/${p.id}`} className="contents">
            <TableRow className="cursor-pointer">
              <TableCell className="font-semibold">{p.nome}</TableCell>
              <TableCell className="text-muted-foreground">{p.linha}</TableCell>
              <TableCell className="text-right font-mono">{p.bom.length}</TableCell>
              <TableCell>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </TableCell>
            </TableRow>
          </Link>
        ))}
        {produtos.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
              Nenhum produto com BOM cadastrada ainda.
            </TableCell>
          </TableRow>
        )}
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
        description="Saldo geral por item, ou navegue por cadeira pra ver só o que ela usa — tudo direto do banco."
        action={
          <Link href="/estoque/itens/novo" className={buttonVariants()}>
            <Plus /> Novo item
          </Link>
        }
      />

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="produto">Por cadeira</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Suspense fallback={<TableSkeleton />}>
              <EstoqueGeralTable />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="produto">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Suspense fallback={<TableSkeleton />}>
              <EstoquePorProdutoTable />
            </Suspense>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
