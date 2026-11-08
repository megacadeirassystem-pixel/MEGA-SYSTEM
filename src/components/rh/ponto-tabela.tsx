"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDeleteButton } from "@/components/mega/confirm-delete-button";
import { lancarPonto, excluirRegistroPonto } from "@/lib/actions/rh";

export type RegistroPontoView = {
  id: string;
  colaboradorNome: string;
  mesReferencia: string;
  diasTrabalhados: number;
  faltas: number;
  horasExtras: number;
  observacao: string | null;
};

type Opcao = { id: string; nome: string };

function mesLabel(iso: string) {
  const d = new Date(iso);
  const s = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PontoTabela({ registros, colaboradores }: { registros: RegistroPontoView[]; colaboradores: Opcao[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <NovoRegistroDialog colaboradores={colaboradores} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Dias trabalhados</TableHead>
              <TableHead className="text-right">Faltas</TableHead>
              <TableHead className="text-right">Horas extras</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhum resumo de ponto lançado ainda.
                </TableCell>
              </TableRow>
            )}
            {registros.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold">{r.colaboradorNome}</TableCell>
                <TableCell className="font-mono">{mesLabel(r.mesReferencia)}</TableCell>
                <TableCell className="text-right font-mono">{r.diasTrabalhados}</TableCell>
                <TableCell className="text-right font-mono" style={r.faltas > 0 ? { color: "var(--crit)" } : undefined}>
                  {r.faltas}
                </TableCell>
                <TableCell className="text-right font-mono">{r.horasExtras}h</TableCell>
                <TableCell className="text-muted-foreground">{r.observacao ?? "—"}</TableCell>
                <TableCell>
                  <ConfirmDeleteButton
                    action={excluirRegistroPonto}
                    id={r.id}
                    title={`Excluir ponto de ${r.colaboradorNome}`}
                    description={`Resumo de ${mesLabel(r.mesReferencia)} some pra sempre.`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NovoRegistroDialog({ colaboradores }: { colaboradores: Opcao[] }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    try {
      await lancarPonto(formData);
      setOpen(false);
      toast.success("Resumo de ponto lançado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível lançar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus /> Lançar ponto do mês
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resumo de ponto do mês</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Colaborador
            <select name="colaboradorId" required className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Mês de referência
            <Input name="mesReferencia" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Dias trabalhados
              <Input name="diasTrabalhados" type="number" min="0" max="31" required className="font-mono" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Faltas
              <Input name="faltas" type="number" min="0" defaultValue={0} className="font-mono" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Horas extras
              <Input name="horasExtras" type="number" step="0.5" min="0" defaultValue={0} className="font-mono" />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Observação
            <Input name="observacao" placeholder="Atestado médico dia 14, etc." />
          </label>
          <DialogFooter>
            <Button type="submit">Lançar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
