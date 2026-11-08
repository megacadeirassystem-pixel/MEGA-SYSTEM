import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusChip } from "@/components/mega/status-chip";
import { ConfirmDeleteButton } from "@/components/mega/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { DarBaixaReceber } from "@/components/financeiro/contas-receber-tabela";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/utils";
import { statusTituloChip } from "@/lib/financeiro-helpers";
import { atualizarContaReceber, cancelarContaReceber, excluirContaReceber } from "@/lib/actions/financeiro";

export const instant = false;

export default async function ContaReceberDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const [conta, planosContas, contasBancarias] = await Promise.all([
    prisma.contaReceber.findUnique({ where: { id }, include: { planoContas: true, contaBancaria: true, pedido: true } }),
    prisma.planoContas.findMany({ where: { tipo: "RECEITA" }, orderBy: { nome: "asc" } }),
    prisma.contaBancaria.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (!conta) notFound();

  const opcoesContasBancarias = contasBancarias.map((c) => ({ id: c.id, nome: c.nome }));

  const valor = Number(conta.valor);
  const valorPago = Number(conta.valorPago);
  const saldo = valor - valorPago;
  const chip = statusTituloChip(conta.status, conta.vencimento.toISOString());
  const podeExcluir = valorPago === 0;
  const aberto = conta.status === "ABERTO" || conta.status === "PARCIAL";

  return (
    <div>
      <Link href="/financeiro" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Financeiro
      </Link>

      <div className="mb-5 flex items-start justify-between gap-5">
        <div>
          <div className="font-mono text-[11px] text-muted-foreground">Conta a receber{conta.pedido ? ` · ${conta.pedido.codigo}` : ""}</div>
          <h1 className="text-xl font-bold tracking-tight">{conta.descricao}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">{conta.clienteNome}</p>
        </div>
        <div className="flex items-center gap-2">
          {chip ? <StatusChip status={chip.status} label={chip.label} /> : <span className="text-xs text-muted-foreground">Cancelado</span>}
          {podeExcluir && (
            <ConfirmDeleteButton
              action={excluirContaReceber}
              id={conta.id}
              redirectTo="/financeiro"
              title={`Excluir "${conta.descricao}"`}
              description="Essa conta a receber some pra sempre — sem nenhuma baixa registrada, dá pra excluir direto."
            />
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Valor", formatBRL(valor)],
          ["Recebido", formatBRL(valorPago)],
          ["Saldo", formatBRL(saldo)],
          ["Vencimento", formatDate(conta.vencimento)],
        ].map(([label, value]) => (
          <div key={label} className="bg-card p-4">
            <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 font-mono text-[15px] font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={atualizarContaReceber} className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Editar</h3>
          <input type="hidden" name="id" value={conta.id} />
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Descrição
              <input name="descricao" defaultValue={conta.descricao} required className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Cliente
              <input name="clienteNome" defaultValue={conta.clienteNome} required className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Valor (R$)
                <input
                  name="valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={valor}
                  required
                  className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Vencimento
                <input
                  name="vencimento"
                  type="date"
                  defaultValue={conta.vencimento.toISOString().slice(0, 10)}
                  required
                  className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Categoria
              <select name="planoContasId" defaultValue={conta.planoContasId ?? ""} className="rounded-md border bg-background px-2.5 py-1.5 text-sm">
                <option value="">—</option>
                {planosContas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" className="mt-1 self-start">
              Salvar alterações
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3.5 text-sm font-semibold">Recebimento</h3>
            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><dt className="text-muted-foreground">Conta bancária</dt><dd>{conta.contaBancaria?.nome ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Data do recebimento</dt><dd className="font-mono">{conta.dataBaixa ? formatDate(conta.dataBaixa) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Lançado em</dt><dd className="font-mono">{formatDate(conta.criadoEm)}</dd></div>
            </dl>
            {aberto && (
              <div className="mt-4 flex items-center gap-2 border-t pt-4">
                <DarBaixaReceber contaId={conta.id} saldoRestante={saldo} contasBancarias={opcoesContasBancarias} />
                <form action={cancelarContaReceber}>
                  <input type="hidden" name="contaId" value={conta.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                    Cancelar título
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
