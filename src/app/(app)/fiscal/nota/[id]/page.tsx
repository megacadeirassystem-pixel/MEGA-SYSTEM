import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusChip } from "@/components/mega/status-chip";
import { ConfirmDeleteButton } from "@/components/mega/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { CancelarNfeDialog } from "@/components/fiscal/notas-fiscais-tabela";
import { chip, JANELA_HORAS } from "@/lib/fiscal-status";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/utils";
import { atualizarNotaFiscal, excluirNotaFiscal } from "@/lib/actions/fiscal";

export const instant = false;

export default async function NotaFiscalDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const nota = await prisma.notaFiscal.findUnique({ where: { id } });
  if (!nota) notFound();

  const c = chip(nota.status);
  const agora = new Date();
  const horasDesdeEmissao = (agora.getTime() - nota.dataEmissao.getTime()) / 36e5;
  const podeCancelar = nota.status === "AUTORIZADA" && horasDesdeEmissao <= JANELA_HORAS;
  const numeroFormatado = String(nota.numero).padStart(6, "0").replace(/^(\d{3})(\d{3})$/, "$1.$2");

  return (
    <div>
      <Link href="/fiscal" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Fiscal
      </Link>

      <div className="mb-5 flex items-start justify-between gap-5">
        <div>
          <div className="font-mono text-[11px] text-muted-foreground">NF-e {numeroFormatado} · série {nota.serie}</div>
          <h1 className="text-xl font-bold tracking-tight">{nota.clienteNome}</h1>
          {nota.referenciaPedido && <p className="mt-1 text-[12.5px] text-muted-foreground">Pedido {nota.referenciaPedido}</p>}
        </div>
        <div className="flex items-center gap-2">
          {c ? <StatusChip status={c.status} label={c.label} /> : <span className="text-xs text-muted-foreground">Cancelada</span>}
          <ConfirmDeleteButton
            action={excluirNotaFiscal}
            id={nota.id}
            redirectTo="/fiscal"
            title={`Excluir NF-e ${numeroFormatado}`}
            description="Isso apaga o registro interno de controle — não é o mesmo que cancelar uma nota autorizada perante o fisco."
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Valor", formatBRL(Number(nota.valor))],
          ["Emissão", formatDate(nota.dataEmissao)],
          ["Cancelamento", nota.dataCancelamento ? formatDate(nota.dataCancelamento) : "—"],
          ["Janela p/ cancelar", podeCancelar ? `${Math.ceil(JANELA_HORAS - horasDesdeEmissao)}h restantes` : "Expirada"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card p-4">
            <div className="text-[10.5px] font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 font-mono text-[15px] font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form action={atualizarNotaFiscal} className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Editar dados descritivos</h3>
          <input type="hidden" name="id" value={nota.id} />
          <div className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Cliente
              <input name="clienteNome" defaultValue={nota.clienteNome} required className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Pedido (referência)
              <input name="referenciaPedido" defaultValue={nota.referenciaPedido ?? ""} className="rounded-md border bg-background px-2.5 py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Valor (R$)
              <input
                name="valor"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={Number(nota.valor)}
                required
                className="rounded-md border bg-background px-2.5 py-1.5 font-mono text-sm"
              />
            </label>
            <Button type="submit" className="mt-1 self-start">
              Salvar alterações
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Número, série e chave de acesso são a identidade do documento — não mudam depois de emitido.</p>
        </form>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3.5 text-sm font-semibold">Dados fiscais</h3>
            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Chave de acesso</dt>
                <dd className="break-all text-right font-mono text-[11px]">{nota.chaveAcesso}</dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Série</dt><dd className="font-mono">{nota.serie}</dd></div>
              {nota.motivoCancelamento && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Motivo do cancelamento</dt>
                  <dd className="text-right">{nota.motivoCancelamento}</dd>
                </div>
              )}
            </dl>
            {podeCancelar && (
              <div className="mt-4 border-t pt-4">
                <CancelarNfeDialog id={nota.id} numero={nota.numero} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
