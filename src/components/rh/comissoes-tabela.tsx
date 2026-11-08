"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/mega/status-chip";
import { ConfirmDeleteButton } from "@/components/mega/confirm-delete-button";
import { formatBRL } from "@/lib/utils";
import { lancarComissao, marcarComissaoPaga, excluirComissao } from "@/lib/actions/rh";

export type ComissaoView = {
  id: string;
  colaboradorNome: string;
  mesReferencia: string;
  valorVendido: number;
  percentual: number;
  valorComissao: number;
  pago: boolean;
};

type Opcao = { id: string; nome: string };

function mesLabel(iso: string) {
  const d = new Date(iso);
  const s = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ComissoesTabela({ comissoes, vendedores }: { comissoes: ComissaoView[]; vendedores: Opcao[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NovaComissaoDialog vendedores={vendedores} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Valor vendido</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhuma comissão lançada ainda.
                </TableCell>
              </TableRow>
            )}
            {comissoes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold">{c.colaboradorNome}</TableCell>
                <TableCell className="font-mono">{mesLabel(c.mesReferencia)}</TableCell>
                <TableCell className="text-right font-mono">{formatBRL(c.valorVendido)}</TableCell>
                <TableCell className="text-right font-mono">{c.percentual}%</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatBRL(c.valorComissao)}</TableCell>
                <TableCell>
                  {c.pago ? <StatusChip status="ok" label="Pago" /> : <StatusChip status="warn" label="A pagar" />}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {!c.pago && <MarcarPagoButton id={c.id} />}
                    <ConfirmDeleteButton
                      action={excluirComissao}
                      id={c.id}
                      title={`Excluir comissão de ${c.colaboradorNome}`}
                      description="Essa comissão some do histórico pra sempre."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MarcarPagoButton({ id }: { id: string }) {
  async function marcar() {
    const fd = new FormData();
    fd.set("id", id);
    try {
      await marcarComissaoPaga(fd);
      toast.success("Comissão marcada como paga.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível marcar como paga.");
    }
  }
  return (
    <Button size="sm" variant="outline" onClick={marcar}>
      Marcar paga
    </Button>
  );
}

function NovaComissaoDialog({ vendedores }: { vendedores: Opcao[] }) {
  const [open, setOpen] = useState(false);
  const [valorVendido, setValorVendido] = useState("");
  const [percentual, setPercentual] = useState("4");
  const calculado = (Number(valorVendido) || 0) * (Number(percentual) || 0) / 100;

  async function action(formData: FormData) {
    try {
      await lancarComissao(formData);
      setOpen(false);
      setValorVendido("");
      toast.success("Comissão lançada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível lançar a comissão.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus /> Nova comissão
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova comissão</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Vendedor
            <select name="colaboradorId" required className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Mês de referência
            <Input name="mesReferencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Valor vendido (R$)
              <Input
                name="valorVendido"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="font-mono"
                value={valorVendido}
                onChange={(e) => setValorVendido(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Percentual (%)
              <Input
                name="percentual"
                type="number"
                step="0.1"
                min="0.1"
                required
                className="font-mono"
                value={percentual}
                onChange={(e) => setPercentual(e.target.value)}
              />
            </label>
          </div>
          <div className="text-xs text-muted-foreground">
            Comissão calculada: <strong className="font-mono text-foreground">{formatBRL(calculado)}</strong>
          </div>
          <DialogFooter>
            <Button type="submit">Lançar comissão</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
