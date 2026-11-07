"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { UsinagemHandoffCard } from "@/components/mega/usinagem-handoff-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ordensProducao as initialOrdens, type Status } from "@/lib/mock-data";

const etapas = ["Usinagem", "Montagem", "Acabamento", "Aguardando chapa"];

export default function ProducaoPage() {
  const [ordens, setOrdens] = useState(initialOrdens);
  const [open, setOpen] = useState(false);
  const [pedido, setPedido] = useState("");
  const [pecas, setPecas] = useState("");
  const [etapa, setEtapa] = useState(etapas[0]);

  function criarOrdem() {
    if (!pedido.trim() || !pecas.trim()) {
      toast.error("Preencha pedido e peças.");
      return;
    }
    const proximoNumero = 413 + ordens.length;
    const bloqueada = etapa === "Aguardando chapa";
    setOrdens((prev) => [
      {
        ordem: `OF-${proximoNumero}`,
        pedido: pedido.trim(),
        pecas: pecas.trim(),
        etapa,
        status: (bloqueada ? "crit" : "warn") as Status,
        statusLabel: bloqueada ? "Bloqueado" : "Em andamento",
      },
      ...prev,
    ]);
    setOpen(false);
    setPedido("");
    setPecas("");
    toast.success(`Ordem OF-${proximoNumero} criada.`);
  }

  return (
    <div>
      <PageHeader
        title="Produção"
        description="Ordens de fabricação, lotes e o handoff pra usinagem."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Nova ordem
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova ordem de fabricação</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Pedido
                  <Input value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="MC-0847" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Peças
                  <Input value={pecas} onChange={(e) => setPecas(e.target.value)} placeholder="47 · Universitária" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Etapa
                  <select
                    value={etapa}
                    onChange={(e) => setEtapa(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {etapas.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <DialogFooter>
                <Button onClick={criarOrdem}>Criar ordem</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <UsinagemHandoffCard />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Peças</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordens.map((o) => (
              <TableRow key={o.ordem}>
                <TableCell className="font-mono">{o.ordem}</TableCell>
                <TableCell>{o.pedido}</TableCell>
                <TableCell>{o.pecas}</TableCell>
                <TableCell>{o.etapa}</TableCell>
                <TableCell>
                  <StatusChip status={o.status} label={o.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
