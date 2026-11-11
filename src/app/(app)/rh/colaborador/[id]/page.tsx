import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusChip } from "@/components/mega/status-chip";
import { ConfirmDeleteButton } from "@/components/mega/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { StatusSelect } from "@/components/rh/colaboradores-tabela";
import { chip, setorLabel } from "@/lib/rh-status";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/utils";
import { atualizarColaborador, excluirColaborador } from "@/lib/actions/rh";

export const instant = false;

function mesLabel(d: Date) {
  const s = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function ColaboradorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const colaborador = await prisma.colaborador.findUnique({
    where: { id },
    include: {
      comissoes: { orderBy: { mesReferencia: "desc" } },
      pontos: { orderBy: { mesReferencia: "desc" } },
    },
  });
  if (!colaborador) notFound();

  const ch = chip(colaborador.status);
  const semHistorico = colaborador.comissoes.length === 0 && colaborador.pontos.length === 0;

  return (
    <div>
      <Link href="/rh" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> RH
      </Link>

      <div className="mb-5 flex items-start justify-between gap-5">
        <div>
          <div className="font-mono text-[11px] text-muted-foreground">{setorLabel[colaborador.setor]}</div>
          <h1 className="text-xl font-bold tracking-tight">{colaborador.nome}</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">{colaborador.cargo}</p>
        </div>
        <div className="flex items-center gap-2">
          {ch ? <StatusChip status={ch.status} label={ch.label} /> : <span className="text-xs text-muted-foreground">Desligado</span>}
          <StatusSelect id={colaborador.id} status={colaborador.status} />
          <ConfirmDeleteButton
            action={excluirColaborador}
            id={colaborador.id}
            redirectTo="/rh"
            title={`Excluir "${colaborador.nome}"`}
            description={
              semHistorico
                ? "Esse cadastro some pra sempre."
                : `Também apaga ${colaborador.comissoes.length} comissão(ões) e ${colaborador.pontos.length} registro(s) de ponto ligados a ele. Pra desligamento de verdade, use o status "Desligar" em vez de excluir.`
            }
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Admissão", formatDate(colaborador.dataAdmissao)],
          ["Desligamento", colaborador.dataDesligamento ? formatDate(colaborador.dataDesligamento) : "—"],
          ["Telefone", colaborador.telefone ?? "—"],
          ["Salário", colaborador.salario ? formatBRL(Number(colaborador.salario)) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card p-4">
            <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 font-mono text-[15px] font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={atualizarColaborador} className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Editar</h3>
          <input type="hidden" name="id" value={colaborador.id} />
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Nome
              <input name="nome" defaultValue={colaborador.nome} required className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Cargo
                <input name="cargo" defaultValue={colaborador.cargo} required className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Setor
                <select name="setor" defaultValue={colaborador.setor} className="rounded-md border bg-background px-2.5 py-1.5 text-sm">
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
                <input name="telefone" defaultValue={colaborador.telefone ?? ""} className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Data de admissão
                <input
                  name="dataAdmissao"
                  type="date"
                  defaultValue={colaborador.dataAdmissao.toISOString().slice(0, 10)}
                  required
                  className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Salário (R$)
              <input
                name="salario"
                type="number"
                step="0.01"
                min="0"
                defaultValue={colaborador.salario ? Number(colaborador.salario) : ""}
                className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm"
              />
            </label>
            <Button type="submit" className="mt-1 self-start">
              Salvar alterações
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Comissões</h3>
            </div>
            <ul>
              {colaborador.comissoes.map((c) => (
                <li key={c.id} className="flex items-center justify-between border-b px-4 py-2.5 text-xs last:border-b-0">
                  <span>{mesLabel(c.mesReferencia)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono">{formatBRL(Number(c.valorComissao))}</span>
                    {c.pago ? <StatusChip status="ok" label="Pago" /> : <StatusChip status="warn" label="A pagar" />}
                  </span>
                </li>
              ))}
              {colaborador.comissoes.length === 0 && <li className="px-4 py-3 text-xs text-muted-foreground">Nenhuma comissão lançada ainda.</li>}
            </ul>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Ponto</h3>
            </div>
            <ul>
              {colaborador.pontos.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b px-4 py-2.5 text-xs last:border-b-0">
                  <span>{mesLabel(p.mesReferencia)}</span>
                  <span className="font-mono text-muted-foreground">
                    {p.diasTrabalhados}d · {p.faltas} falta(s) · {Number(p.horasExtras)}h extra
                  </span>
                </li>
              ))}
              {colaborador.pontos.length === 0 && <li className="px-4 py-3 text-xs text-muted-foreground">Nenhum resumo de ponto lançado ainda.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
