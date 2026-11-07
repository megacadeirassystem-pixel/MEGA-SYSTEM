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
import {
  entregas as initialEntregas,
  instalacoesAgendadas,
  pedidosAbertos,
  destinoPorPedido,
  veiculos,
  motoristas,
  type Status,
} from "@/lib/mock-data";

const kpis = [
  { label: "ENTREGAS HOJE", value: "3" },
  { label: "EM ROTA", value: "2" },
  { label: "INSTALAÇÃO AGENDADA", value: "4" },
  { label: "ATRASADAS", value: "1", accent: "var(--crit)" },
];

export default function LogisticaPage() {
  const [entregas, setEntregas] = useState(initialEntregas);
  const [open, setOpen] = useState(false);
  const [pedido, setPedido] = useState(pedidosAbertos[0].codigo);
  const [veiculo, setVeiculo] = useState(veiculos[0]);
  const [motorista, setMotorista] = useState(motoristas[0]);
  const [data, setData] = useState("");

  const destino = destinoPorPedido[pedido] ?? pedidosAbertos.find((p) => p.codigo === pedido)?.cliente ?? "—";

  function criarRota() {
    const dataFormatada = data ? data.split("-").reverse().slice(0, 2).join("/") : "—";
    setEntregas((prev) => [
      {
        pedido,
        destino,
        veiculo,
        motorista,
        data: dataFormatada,
        status: "warn" as Status,
        statusLabel: "Roteirizando",
      },
      ...prev,
    ]);
    setOpen(false);
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
                  Destino <span className="font-normal text-muted-foreground">(definido pelo pedido)</span>
                  <Input value={destino} disabled className="text-muted-foreground" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Veículo
                    <select
                      value={veiculo}
                      onChange={(e) => setVeiculo(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {veiculos.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Motorista
                    <select
                      value={motorista}
                      onChange={(e) => setMotorista(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {motoristas.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Data
                  <Input value={data} onChange={(e) => setData(e.target.value)} type="date" className="font-mono" />
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
