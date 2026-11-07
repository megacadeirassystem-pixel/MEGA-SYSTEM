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
import { entregas as initialEntregas, instalacoesAgendadas, type Status } from "@/lib/mock-data";

const kpis = [
  { label: "ENTREGAS HOJE", value: "3" },
  { label: "EM ROTA", value: "2" },
  { label: "INSTALAÇÃO AGENDADA", value: "4" },
  { label: "ATRASADAS", value: "1", accent: "var(--crit)" },
];

export default function LogisticaPage() {
  const [entregas, setEntregas] = useState(initialEntregas);
  const [open, setOpen] = useState(false);
  const [pedido, setPedido] = useState("");
  const [destino, setDestino] = useState("");
  const [veiculo, setVeiculo] = useState("");
  const [motorista, setMotorista] = useState("");
  const [data, setData] = useState("");

  function criarRota() {
    if (!pedido.trim() || !destino.trim()) {
      toast.error("Preencha pedido e destino.");
      return;
    }
    setEntregas((prev) => [
      {
        pedido: pedido.trim(),
        destino: destino.trim(),
        veiculo: veiculo.trim() || "—",
        motorista: motorista.trim() || "—",
        data: data.trim() || "—",
        status: "warn" as Status,
        statusLabel: "Roteirizando",
      },
      ...prev,
    ]);
    setOpen(false);
    setPedido("");
    setDestino("");
    setVeiculo("");
    setMotorista("");
    setData("");
    toast.success("Rota criada — status Roteirizando.");
  }

  return (
    <div>
      <PageHeader
        title="Logística"
        description="Roteiro de entrega e instalação — do pedido pronto até a assinatura do cliente."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Nova rota
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova rota de entrega</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Pedido
                  <Input value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="MC-0846" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Destino
                  <Input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Igreja Batista Central — Mogi das Cruzes/SP" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Veículo
                    <Input value={veiculo} onChange={(e) => setVeiculo(e.target.value)} placeholder="VUC 01" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Motorista
                    <Input value={motorista} onChange={(e) => setMotorista(e.target.value)} placeholder="Devair Nunes" />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Data
                  <Input value={data} onChange={(e) => setData(e.target.value)} placeholder="12/11" className="font-mono" />
                </label>
              </div>
              <DialogFooter>
                <Button onClick={criarRota}>Criar rota</Button>
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
              <TableHead>Pedido</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entregas.map((e) => (
              <TableRow key={`${e.pedido}-${e.data}`}>
                <TableCell className="font-mono">{e.pedido}</TableCell>
                <TableCell>{e.destino}</TableCell>
                <TableCell>{e.veiculo}</TableCell>
                <TableCell>{e.motorista}</TableCell>
                <TableCell className="font-mono">{e.data}</TableCell>
                <TableCell>
                  <StatusChip status={e.status} label={e.statusLabel} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">INSTALAÇÕES AGENDADAS</div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Técnico</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instalacoesAgendadas.map((i) => (
              <TableRow key={i.pedido}>
                <TableCell className="font-mono">{i.pedido}</TableCell>
                <TableCell>{i.cliente}</TableCell>
                <TableCell>{i.tecnico}</TableCell>
                <TableCell className="font-mono">{i.data}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
