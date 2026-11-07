import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { StatusChip } from "@/components/mega/status-chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { statusEstoque } from "@/lib/estoque-status";

async function ProdutoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: {
      bom: {
        include: { item: { include: { estoque: true, fornecedorPrincipal: true } } },
      },
    },
  });

  if (!produto) notFound();

  // quantas unidades do produto dá pra montar com o estoque disponível de hoje,
  // limitado pelo item mais escasso da receita.
  const unidadesPossiveis = produto.bom.reduce((min, b) => {
    const saldo = Number(b.item.estoque?.saldoAtual ?? 0);
    const reservado = Number(b.item.estoque?.reservado ?? 0);
    const disponivel = saldo - reservado;
    const necessarioPorUnidade = Number(b.quantidadePorUnidade) * Number(b.fatorPerda);
    const dá = necessarioPorUnidade > 0 ? Math.floor(disponivel / necessarioPorUnidade) : Infinity;
    return Math.min(min, dá);
  }, Infinity);

  return (
    <div>
      <Link href="/estoque" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Estoque
      </Link>

      <div className="mb-5 flex items-end justify-between gap-5">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">{produto.linha.toUpperCase()}</div>
          <h1 className="text-xl font-bold tracking-tight">{produto.nome}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {produto.bom.length} itens na receita · SKU {produto.sku}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] font-medium text-muted-foreground">DÁ PRA MONTAR HOJE</div>
          <div className="font-mono text-2xl font-bold">
            {unidadesPossiveis === Infinity ? "—" : unidadesPossiveis} un
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Por unidade</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produto.bom.map((b) => {
              const saldo = Number(b.item.estoque?.saldoAtual ?? 0);
              const reservado = Number(b.item.estoque?.reservado ?? 0);
              const minimo = Number(b.item.estoqueMinimo);
              const disponivel = saldo - reservado;
              const { status, label } = statusEstoque(disponivel, minimo);

              return (
                <Link key={b.id} href={`/estoque/item/${b.itemId}`} className="contents">
                  <TableRow className="cursor-pointer">
                    <TableCell className="font-semibold">
                      {b.item.nome}
                      <div className="font-mono text-[10.5px] font-normal text-muted-foreground">{b.item.sku}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {Number(b.quantidadePorUnidade)} {b.item.unidadeMedida}
                      {Number(b.fatorPerda) > 1 && (
                        <span className="ml-1 text-[10px]">(+{((Number(b.fatorPerda) - 1) * 100).toFixed(0)}% perda)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {disponivel} {b.item.unidadeMedida}
                    </TableCell>
                    <TableCell>{b.item.fornecedorPrincipal?.nome ?? "—"}</TableCell>
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
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export default function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ProdutoDetail params={params} />
    </Suspense>
  );
}
