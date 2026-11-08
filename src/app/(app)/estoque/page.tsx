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
    <>
      <div className="space-y-3 md:hidden">
        {itens.map((item) => {
          const saldo = Number(item.estoque?.saldoAtual ?? 0);
          const reservado = Number(item.estoque?.reservado ?? 0);
          const minimo = Number(item.estoqueMinimo);
          const disponivel = saldo - reservado;
          const { status, label } = statusEstoque(disponivel, minimo);

          return (
            <Link key={item.id} href={`/estoque/item/${item.id}`} className="block rounded-xl border bg-card p-4 transition-colors active:bg-accent">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.nome}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{item.sku}</div>
                </div>
                <StatusChip status={status} label={label} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
                <div>
                  <div className="text-[10px] text-muted-foreground">Saldo</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">{saldo} <span className="text-[10px] font-normal text-muted-foreground">{item.unidadeMedida}</span></div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Reservado</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">{reservado}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Disponível</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">{disponivel}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="truncate">{item.tipo === "MATERIA_PRIMA" ? "Matéria-prima" : "Componente comprado"}</span>
                <span className="shrink-0">Mínimo: {minimo}</span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="hidden md:block">
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
      </div>
    </>
  );
}

async function EstoquePorProdutoTable() {
  const produtos = await prisma.produto.findMany({
    include: { bom: true },
    orderBy: { nome: "asc" },
  });

  return (
    <>
      <div className="space-y-3 md:hidden">
        {produtos.map((produto) => (
          <Link key={produto.id} href={`/estoque/produto/${produto.id}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors active:bg-accent">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{produto.nome}</div>
              <div className="mt-1 text-xs text-muted-foreground">{produto.linha}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-semibold tabular-nums">{produto.bom.length}</div>
              <div className="text-[10px] text-muted-foreground">componentes</div>
            </div>
          </Link>
        ))}
        {produtos.length === 0 && (
          <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum produto com BOM cadastrada ainda.
          </div>
        )}
      </div>
      <div className="hidden md:block">
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
      </div>
    </>
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
          <Link href="/estoque/itens/novo" className={buttonVariants({ className: "w-full sm:w-auto" })}>
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
