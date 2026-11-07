"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
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
import { comprasAbertas as initialCompras, pedidosAbertos, fornecedores, type Status } from "@/lib/mock-data";

const destinos = ["Estoque", ...pedidosAbertos.map((p) => p.codigo)];

export default function ComprasPage() {
  const [compras, setCompras] = useState(initialCompras);
  const [open, setOpen] = useState(false);
  const [material, setMaterial] = useState("");
  const [para, setPara] = useState(destinos[0]);
  const [qtd, setQtd] = useState("");
  const [fornecedor, setFornecedor] = useState(fornecedores[0]);

  function criarPedido() {
    if (!material.trim()) {
      toast.error("Preencha o material.");
      return;
    }
    setCompras((prev) => [
      {
        material: material.trim(),
        para,
        qtd: qtd.trim() || "—",
        fornecedor,
        status: "warn" as Status,
        statusLabel: "Cotando",
      },
      ...prev,
    ]);
    setOpen(false);
    setMaterial("");
    setQtd("");
    toast.success("Pedido de compra criado — status Cotando.");
  }

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Matéria-prima necessária pra fabricar os pedidos ganhos."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Novo pedido
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo pedido de compra</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Material
                  <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Chapa MDF cru 15mm" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Para
                    <select
                      value={para}
                      onChange={(e) => setPara(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {destinos.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Quantidade
                    <Input value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="3 chapas" />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Fornecedor
                  <select
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {fornecedores.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <DialogFooter>
                <Button onClick={criarPedido}>Criar pedido</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Para</TableHead>
              <TableHead className="text-right">Qtde.</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compras.map((c) => (
              <TableRow key={`${c.material}-${c.para}`}>
                <TableCell className="font-semibold">{c.material}</TableCell>
                <TableCell>{c.para}</TableCell>
                <TableCell className="text-right font-mono">{c.qtd}</TableCell>
                <TableCell>{c.fornecedor}</TableCell>
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
