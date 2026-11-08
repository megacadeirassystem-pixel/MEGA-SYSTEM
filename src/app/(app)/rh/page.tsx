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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { colaboradores as initialColaboradores, comissoes, type Status } from "@/lib/mock-data";

const kpis = [
  { label: "COLABORADORES", value: "34" },
  { label: "FÁBRICA", value: "21" },
  { label: "COMERCIAL", value: "7" },
  { label: "ADMISSÕES (MÊS)", value: "2" },
];

const setores = ["Fábrica", "Comercial", "Logística", "Administração"];

function hojeFormatado() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function RHPage() {
  const [colaboradores, setColaboradores] = useState(initialColaboradores);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [setor, setSetor] = useState(setores[0]);

  function criarColaborador() {
    if (!nome.trim() || !cargo.trim()) {
      toast.error("Preencha nome e cargo.");
      return;
    }
    setColaboradores((prev) => [
      {
        nome: nome.trim(),
        cargo: cargo.trim(),
        setor,
        admissao: hojeFormatado(),
        status: "warn" as Status,
        statusLabel: "Experiência",
      },
      ...prev,
    ]);
    setOpen(false);
    setNome("");
    setCargo("");
    toast.success(`"${nome.trim()}" cadastrado — em experiência.`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="RH"
        description="Equipe da fábrica, comercial e administração — ponto, escala e comissão."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Novo colaborador
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo colaborador</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Nome
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Elaine Ferraz" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Cargo
                  <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Costureira" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Setor
                  <select
                    value={setor}
                    onChange={(e) => setSetor(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {setores.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <DialogFooter>
                <Button onClick={criarColaborador}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <KpiStrip items={kpis} />

      <Tabs defaultValue="colaboradores">
        <TabsList>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradores.map((c) => (
                  <TableRow key={c.nome}>
                    <TableCell className="font-semibold">{c.nome}</TableCell>
                    <TableCell>{c.cargo}</TableCell>
                    <TableCell className="text-muted-foreground">{c.setor}</TableCell>
                    <TableCell className="font-mono">{c.admissao}</TableCell>
                    <TableCell>
                      <StatusChip status={c.status} label={c.statusLabel} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="comissoes">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Pedidos fechados</TableHead>
                  <TableHead className="text-right">Valor vendido</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">A receber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map((c) => (
                  <TableRow key={c.vendedor}>
                    <TableCell className="font-semibold">{c.vendedor}</TableCell>
                    <TableCell className="text-right font-mono">{c.pedidos}</TableCell>
                    <TableCell className="text-right font-mono">{c.valorVendido}</TableCell>
                    <TableCell className="text-right font-mono">{c.comissao}</TableCell>
                    <TableCell className="text-right font-mono">{c.aReceber}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
