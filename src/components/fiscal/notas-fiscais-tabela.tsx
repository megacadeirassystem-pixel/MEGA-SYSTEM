"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/mega/status-chip";
import { ClickableRow } from "@/components/mega/clickable-row";
import { formatBRL, formatDate } from "@/lib/utils";
import { emitirNfe, cancelarNfe } from "@/lib/actions/fiscal";
import { chip, JANELA_HORAS, type StatusNotaFiscal } from "@/lib/fiscal-status";

export type NotaFiscalView = {
  id: string;
  numero: number;
  serie: string;
  chaveAcesso: string;
  referenciaPedido: string | null;
  clienteNome: string;
  valor: number;
  status: StatusNotaFiscal;
  dataEmissao: string;
  dataCancelamento: string | null;
  motivoCancelamento: string | null;
};

export function NotasFiscaisTabela({ notas }: { notas: NotaFiscalView[] }) {
  const [agora] = useState(() => Date.now());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <EmitirNfeDialog />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NF-e</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {notas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhuma NF-e emitida ainda.
                </TableCell>
              </TableRow>
            )}
            {notas.map((n) => {
              const c = chip(n.status);
              const horasDesdeEmissao = (agora - new Date(n.dataEmissao).getTime()) / 36e5;
              const podeCancel = n.status === "AUTORIZADA" && horasDesdeEmissao <= JANELA_HORAS;
              return (
                <ClickableRow key={n.id} href={`/fiscal/nota/${n.id}`}>
                  <TableCell className="font-mono">
                    {String(n.numero).padStart(6, "0").replace(/^(\d{3})(\d{3})$/, "$1.$2")}
                    <div className="font-mono text-[10px] text-muted-foreground" title={n.chaveAcesso}>
                      série {n.serie}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">{n.referenciaPedido ?? "—"}</TableCell>
                  <TableCell>{n.clienteNome}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(n.valor)}</TableCell>
                  <TableCell className="font-mono">{formatDate(new Date(n.dataEmissao))}</TableCell>
                  <TableCell>
                    {c ? (
                      <StatusChip status={c.status} label={c.label} />
                    ) : (
                      <span className="text-xs text-muted-foreground" title={n.motivoCancelamento ?? undefined}>
                        Cancelada
                      </span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>{podeCancel && <CancelarNfeDialog id={n.id} numero={n.numero} />}</TableCell>
                </ClickableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EmitirNfeDialog() {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await emitirNfe(formData);
      setOpen(false);
      toast.success("NF-e emitida e autorizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível emitir a NF-e.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>Emitir NF-e</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir NF-e</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Cliente
            <Input name="clienteNome" required placeholder="Igreja Batista Central" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Pedido (referência)
              <Input name="referenciaPedido" placeholder="MC-0850" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Valor (R$)
              <Input name="valor" type="number" step="0.01" min="0.01" required className="font-mono" />
            </label>
          </div>
          <DialogFooter>
            <Button type="submit">Emitir e autorizar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelarNfeDialog({ id, numero }: { id: string; numero: number }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await cancelarNfe(formData);
      setOpen(false);
      toast.success("NF-e cancelada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancelar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar NF-e {numero}</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Motivo do cancelamento
            <Input name="motivo" required placeholder="Pedido cancelado pelo cliente" />
          </label>
          <DialogFooter>
            <Button type="submit" variant="destructive">
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
