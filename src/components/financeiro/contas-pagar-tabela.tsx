"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/mega/status-chip";
import { formatBRL, formatDate } from "@/lib/utils";
import { statusTituloChip, FORMAS_PAGAMENTO } from "@/lib/financeiro-helpers";
import { criarContaPagar, darBaixaContaPagar, cancelarContaPagar } from "@/lib/actions/financeiro";

export type ContaPagarView = {
  id: string;
  descricao: string;
  fornecedor: string | null;
  planoContas: string | null;
  valor: number;
  valorPago: number;
  vencimento: string;
  status: "ABERTO" | "PARCIAL" | "PAGO" | "VENCIDO" | "CANCELADO";
};

type Opcao = { id: string; nome: string };

export function ContasPagarTabela({
  contas,
  fornecedores,
  planosContas,
  contasBancarias,
}: {
  contas: ContaPagarView[];
  fornecedores: Opcao[];
  planosContas: Opcao[];
  contasBancarias: Opcao[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NovaContaPagarDialog fornecedores={fornecedores} planosContas={planosContas} contasBancarias={contasBancarias} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Fornecedor</TableHead>
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
                  Nenhuma conta a pagar cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {contas.map((c) => {
              const chip = statusTituloChip(c.status, c.vencimento);
              const saldo = c.valor - c.valorPago;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{c.fornecedor ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.planoContas ?? "—"}</TableCell>
                  <TableCell className="font-mono">{formatDate(new Date(c.vencimento))}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(c.valor)}</TableCell>
                  <TableCell>
                    {chip ? <StatusChip status={chip.status} label={chip.label} /> : <span className="text-xs text-muted-foreground">Cancelado</span>}
                  </TableCell>
                  <TableCell>
                    {c.status !== "PAGO" && c.status !== "CANCELADO" && (
                      <div className="flex items-center gap-1.5">
                        <DarBaixaPagar contaId={c.id} saldoRestante={saldo} contasBancarias={contasBancarias} />
                        <form action={cancelarContaPagar}>
                          <input type="hidden" name="contaId" value={c.id} />
                          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                            Cancelar
                          </Button>
                        </form>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function DarBaixaPagar({ contaId, saldoRestante, contasBancarias }: { contaId: string; saldoRestante: number; contasBancarias: Opcao[] }) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(saldoRestante);
  const [juros, setJuros] = useState(0);
  const [multa, setMulta] = useState(0);
  const [desconto, setDesconto] = useState(0);

  async function action(formData: FormData) {
    try {
      await darBaixaContaPagar(formData);
      setOpen(false);
      toast.success("Baixa registrada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível dar baixa.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>Dar baixa</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar baixa</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="contaId" value={contaId} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Valor pago
              <Input name="valor" type="number" step="0.01" min="0.01" max={saldoRestante} value={valor} onChange={(e) => setValor(Number(e.target.value) || 0)} className="font-mono" required />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Data do pagamento
              <Input name="dataBaixa" type="date" defaultValue={hojeISO()} required />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Forma de pagamento
              <select name="formaPagamento" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="">—</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Conta
              <select name="contaBancariaId" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="">—</option>
                {contasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Juros
              <Input name="juros" type="number" step="0.01" min="0" placeholder="0,00" value={juros || ""} onChange={(e) => setJuros(Number(e.target.value) || 0)} className="font-mono" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Multa
              <Input name="multa" type="number" step="0.01" min="0" placeholder="0,00" value={multa || ""} onChange={(e) => setMulta(Number(e.target.value) || 0)} className="font-mono" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Desconto
              <Input name="desconto" type="number" step="0.01" min="0" placeholder="0,00" value={desconto || ""} onChange={(e) => setDesconto(Number(e.target.value) || 0)} className="font-mono" />
            </label>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            Total pago: <strong className="font-mono text-foreground">{formatBRL(valor + juros + multa - desconto)}</strong>
          </div>
          <DialogFooter>
            <Button type="submit">Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovaContaPagarDialog({ fornecedores, planosContas, contasBancarias }: { fornecedores: Opcao[]; planosContas: Opcao[]; contasBancarias: Opcao[] }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await criarContaPagar(formData);
      setOpen(false);
      toast.success("Despesa lançada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível lançar a despesa.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus /> Nova despesa
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Descrição
            <Input name="descricao" required placeholder="Ex.: Energia elétrica — fábrica" />
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
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Fornecedor
              <select name="fornecedorId" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="">—</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Forma de pagamento prevista
              <select name="formaPagamento" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="">—</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Conta de pagamento
              <select name="contaBancariaId" defaultValue="" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="">—</option>
                {contasBancarias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button type="submit">Lançar despesa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
