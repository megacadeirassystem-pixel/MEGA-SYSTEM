"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/mega/status-chip";
import { ClickableRow } from "@/components/mega/clickable-row";
import { formatBRL, formatDate } from "@/lib/utils";
import { statusTituloChip } from "@/lib/financeiro-helpers";
import { criarContaReceber, darBaixaContaReceber, cancelarContaReceber } from "@/lib/actions/financeiro";

export type ContaReceberView = {
  id: string;
  descricao: string;
  clienteNome: string;
  planoContas: string | null;
  valor: number;
  valorPago: number;
  vencimento: string;
  status: "ABERTO" | "PARCIAL" | "PAGO" | "VENCIDO" | "CANCELADO";
};

export type Opcao = { id: string; nome: string };

export function ContasReceberTabela({ contas, planosContas, contasBancarias }: { contas: ContaReceberView[]; planosContas: Opcao[]; contasBancarias: Opcao[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NovaContaReceberDialog planosContas={planosContas} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhuma conta a receber cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {contas.map((c) => {
              const chip = statusTituloChip(c.status, c.vencimento);
              const saldo = c.valor - c.valorPago;
              return (
                <ClickableRow key={c.id} href={`/financeiro/receber/${c.id}`}>
                  <TableCell className="font-semibold">{c.descricao}</TableCell>
                  <TableCell>{c.clienteNome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.planoContas ?? "—"}</TableCell>
                  <TableCell className="font-mono">{formatDate(new Date(c.vencimento))}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(c.valor)}</TableCell>
                  <TableCell>
                    {chip ? <StatusChip status={chip.status} label={chip.label} /> : <span className="text-xs text-muted-foreground">Cancelado</span>}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {c.status !== "PAGO" && c.status !== "CANCELADO" && (
                      <div className="flex items-center gap-1.5">
                        <DarBaixaReceber contaId={c.id} saldoRestante={saldo} contasBancarias={contasBancarias} />
                        <form action={cancelarContaReceber}>
                          <input type="hidden" name="contaId" value={c.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                            Cancelar
                          </Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </ClickableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DarBaixaReceber({ contaId, saldoRestante, contasBancarias }: { contaId: string; saldoRestante: number; contasBancarias: Opcao[] }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await darBaixaContaReceber(formData);
      setOpen(false);
      toast.success("Recebimento registrado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível dar baixa.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Dar baixa</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="contaId" value={contaId} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Valor recebido
              <Input name="valor" type="number" step="0.01" min="0.01" max={saldoRestante} defaultValue={saldoRestante.toFixed(2)} className="font-mono" required />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Data do recebimento
              <Input name="dataBaixa" type="date" defaultValue={hojeISO()} required />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Conta de destino
            <select name="contaBancariaId" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              <option value="">—</option>
              {contasBancarias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button type="submit">Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovaContaReceberDialog({ planosContas }: { planosContas: Opcao[] }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await criarContaReceber(formData);
      setOpen(false);
      toast.success("Conta a receber lançada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível lançar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus /> Nova conta a receber
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta a receber</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Descrição
            <Input name="descricao" required placeholder="Ex.: Pedido MC-0850" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Cliente
            <Input name="clienteNome" required placeholder="Hotel Transamérica" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Valor (R$)
              <Input name="valor" type="number" step="0.01" min="0.01" required className="font-mono" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Vencimento
              <Input name="vencimento" type="date" required />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Categoria
            <select name="planoContasId" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              <option value="">—</option>
              {planosContas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button type="submit">Lançar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
