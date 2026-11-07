"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
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
import { chamados as initialChamados, type Status } from "@/lib/mock-data";

const kpis = [
  { label: "CHAMADOS ABERTOS", value: "5" },
  { label: "SLA MÉDIO", value: "1,8 dia" },
  { label: "GARANTIAS ATIVAS", value: "214" },
  { label: "SATISFAÇÃO", value: "4,7/5", accent: "var(--good)" },
];

const tipos = ["Garantia", "Assistência técnica", "Reclamação"];

export default function PosVendaPage() {
  const [chamados, setChamados] = useState(initialChamados);
  const [open, setOpen] = useState(false);
  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [tipo, setTipo] = useState(tipos[0]);

  function criarChamado() {
    if (!cliente.trim() || !produto.trim()) {
      toast.error("Preencha cliente e produto.");
      return;
    }
    const proximoNumero = 92 + chamados.length;
    setChamados((prev) => [
      {
        chamado: `PV-${String(proximoNumero).padStart(4, "0")}`,
        cliente: cliente.trim(),
        produto: produto.trim(),
        tipo,
        abertoHa: "agora",
        status: "warn" as Status,
        statusLabel: "Em atendimento",
      },
      ...prev,
    ]);
    setOpen(false);
    setCliente("");
    setProduto("");
    toast.success(`Chamado PV-${String(proximoNumero).padStart(4, "0")} aberto.`);
  }

  return (
    <div>
      <PageHeader
        title="Pós-venda"
        description="Garantia, assistência técnica e relacionamento com quem já comprou."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Novo chamado
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo chamado</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Cliente
                  <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Hotel Transamérica" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Produto
                  <Input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Jerusalém Ouro" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Tipo
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {tipos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <DialogFooter>
                <Button onClick={criarChamado}>Abrir chamado</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <KpiStrip items={kpis} />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chamado</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Aberto há</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chamados.map((c) => (
              <TableRow key={c.chamado}>
                <TableCell className="font-mono">{c.chamado}</TableCell>
                <TableCell className="font-semibold">{c.cliente}</TableCell>
                <TableCell>{c.produto}</TableCell>
                <TableCell>{c.tipo}</TableCell>
                <TableCell>{c.abertoHa}</TableCell>
                <TableCell>
                  <StatusChip status={c.status} label={c.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
