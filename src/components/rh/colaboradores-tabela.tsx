"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/mega/status-chip";
import { formatDate } from "@/lib/utils";
import { criarColaborador, atualizarStatusColaborador } from "@/lib/actions/rh";

export type ColaboradorView = {
  id: string;
  nome: string;
  cargo: string;
  setor: "FABRICA" | "COMERCIAL" | "LOGISTICA" | "ADMINISTRACAO";
  dataAdmissao: string;
  status: "ATIVO" | "EXPERIENCIA" | "AFASTADO" | "DESLIGADO";
};

const setorLabel: Record<ColaboradorView["setor"], string> = {
  FABRICA: "Fábrica",
  COMERCIAL: "Comercial",
  LOGISTICA: "Logística",
  ADMINISTRACAO: "Administração",
};

function chip(status: ColaboradorView["status"]) {
  if (status === "ATIVO") return { status: "ok" as const, label: "Ativo" };
  if (status === "EXPERIENCIA") return { status: "warn" as const, label: "Experiência" };
  if (status === "AFASTADO") return { status: "warn" as const, label: "Afastado" };
  return null; // DESLIGADO — texto neutro
}

export function ColaboradoresTabela({ colaboradores }: { colaboradores: ColaboradorView[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NovoColaboradorDialog />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {colaboradores.map((c) => {
              const ch = chip(c.status);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.nome}</TableCell>
                  <TableCell>{c.cargo}</TableCell>
                  <TableCell className="text-muted-foreground">{setorLabel[c.setor]}</TableCell>
                  <TableCell className="font-mono">{formatDate(new Date(c.dataAdmissao))}</TableCell>
                  <TableCell>{ch ? <StatusChip status={ch.status} label={ch.label} /> : <span className="text-xs text-muted-foreground">Desligado</span>}</TableCell>
                  <TableCell>{c.status !== "DESLIGADO" && <StatusSelect id={c.id} status={c.status} />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusSelect({ id, status }: { id: string; status: ColaboradorView["status"] }) {
  async function mudar(novoStatus: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", novoStatus);
    try {
      await atualizarStatusColaborador(fd);
      toast.success("Status atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar.");
    }
  }

  return (
    <select
      defaultValue={status}
      onChange={(e) => mudar(e.target.value)}
      className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs"
    >
      <option value="EXPERIENCIA">Experiência</option>
      <option value="ATIVO">Ativo</option>
      <option value="AFASTADO">Afastado</option>
      <option value="DESLIGADO">Desligar</option>
    </select>
  );
}

function NovoColaboradorDialog() {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await criarColaborador(formData);
      setOpen(false);
      toast.success("Colaborador cadastrado — em experiência.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus /> Novo colaborador
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo colaborador</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Nome
            <Input name="nome" required placeholder="Elaine Ferraz" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Cargo
              <Input name="cargo" required placeholder="Costureira" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Setor
              <select name="setor" defaultValue="FABRICA" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                <option value="FABRICA">Fábrica</option>
                <option value="COMERCIAL">Comercial</option>
                <option value="LOGISTICA">Logística</option>
                <option value="ADMINISTRACAO">Administração</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Telefone
              <Input name="telefone" placeholder="(11) 99999-0000" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Data de admissão
              <Input name="dataAdmissao" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Salário (R$) — opcional
            <Input name="salario" type="number" step="0.01" min="0" className="font-mono" />
          </label>
          <DialogFooter>
            <Button type="submit">Cadastrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
