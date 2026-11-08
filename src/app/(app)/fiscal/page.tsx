import { connection } from "next/server";
import { PageHeader } from "@/components/mega/page-header";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { NotasFiscaisTabela, type NotaFiscalView } from "@/components/fiscal/notas-fiscais-tabela";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";

export const instant = false;

export default async function FiscalPage() {
  await connection();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const notasRaw = await prisma.notaFiscal.findMany({ orderBy: { numero: "desc" } });

  const notas: NotaFiscalView[] = notasRaw.map((n) => ({
    id: n.id,
    numero: n.numero,
    serie: n.serie,
    chaveAcesso: n.chaveAcesso,
    referenciaPedido: n.referenciaPedido,
    clienteNome: n.clienteNome,
    valor: Number(n.valor),
    status: n.status,
    dataEmissao: n.dataEmissao.toISOString(),
    dataCancelamento: n.dataCancelamento?.toISOString() ?? null,
    motivoCancelamento: n.motivoCancelamento,
  }));

  const emitidasNoMes = notasRaw.filter((n) => n.dataEmissao >= inicioMes).length;
  const pendentes = notasRaw.filter((n) => n.status === "PENDENTE").length;
  const canceladas = notasRaw.filter((n) => n.status === "CANCELADA").length;
  const valorTotal = notasRaw.filter((n) => n.status === "AUTORIZADA").reduce((s, n) => s + Number(n.valor), 0);

  const kpis = [
    { label: "EMITIDAS (MÊS)", value: String(emitidasNoMes) },
    { label: "PENDENTES", value: String(pendentes), accent: pendentes > 0 ? "var(--warn)" : undefined },
    { label: "CANCELADAS", value: String(canceladas) },
    { label: "VALOR AUTORIZADO", value: formatBRL(valorTotal) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="Fiscal"
        description="Emissão e guarda de NF-e — numeração sequencial e cancelamento dentro da janela de 24h, direto do banco."
      />
      <KpiStrip items={kpis} />
      <NotasFiscaisTabela notas={notas} />
    </div>
  );
}
