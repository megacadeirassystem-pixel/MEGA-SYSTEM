"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notasFiscais as initialNotas, pedidosAbertos, type Status } from "@/lib/mock-data";

const kpis = [
  { label: "EMITIDAS (MÊS)", value: "19" },
  { label: "PENDENTES", value: "2", accent: "var(--warn)" },
  { label: "CANCELADAS", value: "0" },
  { label: "VALOR TOTAL", value: "R$ 184,9K" },
];

function hojeFormatado() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FiscalPage() {
  const [notas, setNotas] = useState(initialNotas);
  const [open, setOpen] = useState(false);
  const [pedido, setPedido] = useState(pedidosAbertos[0].codigo);
  const [valor, setValor] = useState("");

  function emitirNfe() {
    const valorNum = Number(valor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Informe o valor da nota.");
      return;
    }
    const cliente = pedidosAbertos.find((p) => p.codigo === pedido)?.cliente ?? "—";
    const proximoNumero = 190 + notas.filter((n) => n.numero !== "—").length;
    setNotas((prev) => [
      {
        numero: String(proximoNumero).padStart(6, "0").replace(/^(\d{3})(\d{3})$/, "$1.$2"),
        pedido,
        cliente,
        valor: valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
        emissao: hojeFormatado(),
        status: "ok" as Status,
        statusLabel: "Autorizada",
      },
      ...prev,
    ]);
    setOpen(false);
    setValor("");
    toast.success("NF-e emitida e autorizada.");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="Fiscal"
        description="Emissão e guarda de documentos fiscais — disparada quando o pedido sai de Estoque pra Logística."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Emitir NF-e
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Emitir NF-e</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Pedido
                  <select
                    value={pedido}
                    onChange={(e) => setPedido(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {pedidosAbertos.map((p) => (
                      <option key={p.codigo} value={p.codigo}>
                        {p.codigo} — {p.cliente}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Valor da nota (R$)
                  <input
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    type="number"
                    placeholder="18400"
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 font-mono text-sm"
                  />
                </label>
              </div>
              <DialogFooter>
                <Button onClick={emitirNfe}>Emitir e autorizar</Button>
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
              <TableHead>NF-e</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notas.map((n, i) => (
              <TableRow key={`${n.pedido}-${n.numero}-${i}`}>
                <TableCell className="font-mono">{n.numero}</TableCell>
                <TableCell className="font-mono">{n.pedido}</TableCell>
                <TableCell>{n.cliente}</TableCell>
                <TableCell className="text-right font-mono">{n.valor}</TableCell>
                <TableCell className="font-mono">{n.emissao}</TableCell>
                <TableCell>
                  <StatusChip status={n.status} label={n.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
