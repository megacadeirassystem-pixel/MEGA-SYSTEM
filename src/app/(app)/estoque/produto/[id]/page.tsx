import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Plus, X } from "lucide-react";
import { StatusChip } from "@/components/mega/status-chip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { statusEstoque } from "@/lib/estoque-status";
import { addBomItem, removeBomItem } from "@/lib/actions/cadastro";

async function ProdutoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: {
      bom: {
        include: { item: { include: { estoque: true, fornecedorPrincipal: true } } },
        orderBy: { item: { nome: "asc" } },
      },
    },
  });

  if (!produto) notFound();

  const itensJaNaReceita = new Set(produto.bom.map((b) => b.itemId));
  const itensDisponiveis = await prisma.item.findMany({
    where: { id: { notIn: [...itensJaNaReceita] } },
    orderBy: { nome: "asc" },
  });

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

  const addBomItemWithId = addBomItem.bind(null, produto.id);
  const removeBomItemWithId = removeBomItem.bind(null, produto.id);

  return (
    <div>
      <Link href="/estoque" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Estoque
      </Link>

      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-5">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">{produto.linha.toUpperCase()}</div>
          <h1 className="text-xl font-bold tracking-tight">{produto.nome}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {produto.bom.length} itens na receita · SKU {produto.sku}
          </p>
        </div>
        {produto.bom.length > 0 && (
          <div className="text-right">
            <div className="text-[10.5px] font-medium text-muted-foreground">DÁ PRA MONTAR HOJE</div>
            <div className="font-mono text-2xl font-bold">
              {unidadesPossiveis === Infinity ? "—" : unidadesPossiveis} un
            </div>
          </div>
        )}
      </div>

      {produto.bom.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Por unidade</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
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
                  <TableRow key={b.id}>
                    <TableCell className="font-semibold">
                      <Link href={`/estoque/item/${b.itemId}`} className="hover:text-[var(--signal)]">
                        {b.item.nome}
                      </Link>
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
                      <div className="flex items-center gap-2">
                        <Link href={`/estoque/item/${b.itemId}`}>
                          <ChevronRight className="size-3.5 text-muted-foreground" />
                        </Link>
                        <form action={removeBomItemWithId.bind(null, b.id)}>
                          <button type="submit" title="Remover da receita" className="text-muted-foreground hover:text-[var(--crit)]">
                            <X className="size-3.5" />
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {produto.bom.length === 0 && (
        <div className="mb-5 rounded-xl border border-dashed bg-card p-6 text-[12.5px] text-muted-foreground">
          Essa cadeira ainda não tem receita cadastrada. Adicione os itens que ela consome logo abaixo.
        </div>
      )}

      {/* adicionar item na receita */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-3.5 text-sm font-semibold">Adicionar item na receita</h3>
        {itensDisponiveis.length > 0 ? (
          <form action={addBomItemWithId} className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-xs font-medium">
              Item
              <select name="itemId" required className="rounded-md border bg-background px-2.5 py-1.5 text-sm">
                {itensDisponiveis.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.nome} ({it.sku})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-36 flex-col gap-1.5 text-xs font-medium">
              Quantidade / unidade
              <input name="quantidadePorUnidade" type="number" step="0.0001" required placeholder="1.2" className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm" />
            </label>
            <label className="flex w-36 flex-col gap-1.5 text-xs font-medium">
              Fator de perda
              <input name="fatorPerda" type="number" step="0.01" defaultValue={1} className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm" />
            </label>
            <Button type="submit">
              <Plus /> Adicionar
            </Button>
          </form>
        ) : (
          <p className="text-[12.5px] text-muted-foreground">Todos os itens cadastrados já estão nessa receita.</p>
        )}
        <Link href="/estoque/itens/novo" className="mt-3.5 inline-block text-[11.5px] font-medium text-[var(--signal)] hover:underline">
          O item que preciso ainda não existe — cadastrar item novo
        </Link>
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
