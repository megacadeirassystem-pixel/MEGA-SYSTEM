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
import { comprasAbertas as initialCompras, type Status } from "@/lib/mock-data";

export default function ComprasPage() {
  const [compras, setCompras] = useState(initialCompras);
  const [open, setOpen] = useState(false);
  const [material, setMaterial] = useState("");
  const [para, setPara] = useState("");
  const [qtd, setQtd] = useState("");
  const [fornecedor, setFornecedor] = useState("");

  function criarPedido() {
    if (!material.trim() || !fornecedor.trim()) {
      toast.error("Preencha material e fornecedor.");
      return;
    }
    setCompras((prev) => [
      {
        material: material.trim(),
        para: para.trim() || "Estoque",
        qtd: qtd.trim() || "—",
        fornecedor: fornecedor.trim(),
        status: "warn" as Status,
        statusLabel: "Cotando",
      },
      ...prev,
    ]);
    setOpen(false);
    setMaterial("");
    setPara("");
    setQtd("");
    setFornecedor("");
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
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Para (pedido ou &quot;Estoque&quot;)
                  <Input value={para} onChange={(e) => setPara(e.target.value)} placeholder="MC-0847" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Quantidade
                  <Input value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="3 chapas" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Fornecedor
                  <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Madeireira Jundiapeba" />
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
