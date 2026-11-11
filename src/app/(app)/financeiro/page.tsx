import { connection } from "next/server";
import { PageHeader } from "@/components/mega/page-header";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContasPagarTabela, type ContaPagarView } from "@/components/financeiro/contas-pagar-tabela";
import { ContasReceberTabela, type ContaReceberView } from "@/components/financeiro/contas-receber-tabela";
import { ConciliacaoBancaria } from "@/components/financeiro/conciliacao-bancaria";
import { FluxoCaixaChart, type FluxoCaixaPonto } from "@/components/financeiro/fluxo-caixa-chart";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { estaVencido } from "@/lib/financeiro-helpers";

// Tela inteira depende de dados ao vivo (vencido, fluxo de caixa, DRE do mês) — não há shell
// estático que valha a pena prerenderizar, então vira uma rota bloqueante normal.
export const instant = false;

const MESES_PASSADO = 3;
const MESES_FUTURO = 2;

function inicioMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}
function mesLabel(data: Date) {
  const s = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function mesmoMes(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default async function FinanceiroPage() {
  await connection();
  const hoje = new Date();

  const [contasPagarRaw, contasReceberRaw, contasBancarias, fornecedores, planosContas] = await Promise.all([
    prisma.contaPagar.findMany({ include: { fornecedor: true, planoContas: true }, orderBy: { vencimento: "asc" } }),
    prisma.contaReceber.findMany({ include: { planoContas: true }, orderBy: { vencimento: "asc" } }),
    prisma.contaBancaria.findMany({ orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
    prisma.planoContas.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const contasPagar: ContaPagarView[] = contasPagarRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    fornecedor: c.fornecedor?.nome ?? null,
    planoContas: c.planoContas?.nome ?? null,
    valor: Number(c.valor),
    valorPago: Number(c.valorPago),
    desconto: Number(c.desconto),
    vencimento: c.vencimento.toISOString(),
    status: c.status,
  }));

  const contasReceber: ContaReceberView[] = contasReceberRaw.map((c) => ({
    id: c.id,
    descricao: c.descricao,
    clienteNome: c.clienteNome,
    planoContas: c.planoContas?.nome ?? null,
    valor: Number(c.valor),
    valorPago: Number(c.valorPago),
    vencimento: c.vencimento.toISOString(),
    status: c.status,
  }));

  const abertosPagar = contasPagarRaw.filter((c) => c.status === "ABERTO" || c.status === "PARCIAL");
  const abertosReceber = contasReceberRaw.filter((c) => c.status === "ABERTO" || c.status === "PARCIAL");

  const totalAReceber = abertosReceber.reduce((s, c) => s + (Number(c.valor) - Number(c.valorPago)), 0);
  const totalAPagar = abertosPagar.reduce((s, c) => s + (Number(c.valor) - Number(c.valorPago)), 0);
  const saldoProjetado = totalAReceber - totalAPagar;
  const vencidos = [...abertosPagar, ...abertosReceber].filter((c) => estaVencido(c.vencimento.toISOString())).length;

  const kpis = [
    { label: "A RECEBER EM ABERTO", value: formatBRL(totalAReceber) },
    { label: "A PAGAR EM ABERTO", value: formatBRL(totalAPagar) },
    { label: "SALDO PROJETADO", value: formatBRL(saldoProjetado), accent: saldoProjetado >= 0 ? "var(--good)" : "var(--crit)" },
    { label: "TÍTULOS VENCIDOS", value: String(vencidos), accent: vencidos > 0 ? "var(--crit)" : undefined },
  ];

  // Fluxo de caixa: cada mês soma o que já foi de fato baixado (realizado, pela data da baixa)
  // MAIS o que ainda está em aberto vencendo naquele mês (projetado). Somar os dois sempre — em
  // vez de só "passado = realizado, futuro = projetado" — evita um buraco real: uma conta aberta
  // que vence ainda este mês não some do gráfico só porque o mês corrente também olha pra trás.
  // Não há dupla contagem: um título só está baixado OU aberto, nunca os dois ao mesmo tempo.
  const fluxoCaixa: FluxoCaixaPonto[] = [];
  let saldoAcumulado = 0;
  for (let i = -MESES_PASSADO; i <= MESES_FUTURO; i++) {
    const refMes = inicioMes(new Date(hoje.getFullYear(), hoje.getMonth() + i, 1));

    const recebido =
      contasReceberRaw.filter((c) => c.dataBaixa && mesmoMes(c.dataBaixa, refMes)).reduce((s, c) => s + Number(c.valorPago), 0) +
      abertosReceber.filter((c) => mesmoMes(c.vencimento, refMes)).reduce((s, c) => s + (Number(c.valor) - Number(c.valorPago)), 0);

    const pago =
      contasPagarRaw.filter((c) => c.dataBaixa && mesmoMes(c.dataBaixa, refMes)).reduce((s, c) => s + Number(c.valorPago) + Number(c.juros) + Number(c.multa), 0) +
      abertosPagar.filter((c) => mesmoMes(c.vencimento, refMes)).reduce((s, c) => s + (Number(c.valor) - Number(c.valorPago)), 0);

    saldoAcumulado += recebido - pago;
    fluxoCaixa.push({ mes: mesLabel(refMes), recebido, pago, saldo: saldoAcumulado });
  }

  // DRE do mês corrente — só o que já foi efetivamente realizado (baixado), não o que está em aberto.
  const receitaRealizada = contasReceberRaw.filter((c) => c.dataBaixa && mesmoMes(c.dataBaixa, hoje)).reduce((s, c) => s + Number(c.valorPago), 0);
  const despesaRealizada = contasPagarRaw
    .filter((c) => c.dataBaixa && mesmoMes(c.dataBaixa, hoje))
    .reduce((s, c) => s + Number(c.valorPago) + Number(c.juros) + Number(c.multa), 0);
  const margem = receitaRealizada - despesaRealizada;

  const opcoesContasBancarias = contasBancarias.map((c) => ({ id: c.id, nome: c.nome }));
  const opcoesFornecedores = fornecedores.map((f) => ({ id: f.id, nome: f.nome }));
  const opcoesPlanoContas = planosContas.map((p) => ({ id: p.id, nome: p.nome }));
  const opcoesPlanoDespesa = planosContas.filter((p) => p.tipo === "DESPESA").map((p) => ({ id: p.id, nome: p.nome }));
  const opcoesPlanoReceita = planosContas.filter((p) => p.tipo === "RECEITA").map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="Financeiro"
        description="Contas a pagar e receber, conciliação bancária e DRE — direto do banco, sem planilha."
      />

      <KpiStrip items={kpis} />

      <Tabs defaultValue="visao-geral">
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a pagar</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação bancária</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="flex flex-col gap-5">
          <div className="rounded-xl border bg-card p-4.5">
            <div className="mb-3.5 flex items-baseline justify-between">
              <h3 className="text-[13.5px] font-semibold">Fluxo de caixa — realizado e projetado</h3>
              <span className="text-[11px] text-muted-foreground">últimos {MESES_PASSADO} meses + próximos {MESES_FUTURO}</span>
            </div>
            <FluxoCaixaChart dados={fluxoCaixa} />
          </div>

          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">DRE — RESUMO DO MÊS (REALIZADO)</div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold">Receita realizada</TableCell>
                    <TableCell className="text-right font-mono">{formatBRL(receitaRealizada)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Despesas realizadas (inclui juros/multa pagos)</TableCell>
                    <TableCell className="text-right font-mono">− {formatBRL(despesaRealizada)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Margem do mês</TableCell>
                    <TableCell className="text-right font-mono" style={{ color: margem >= 0 ? "var(--good)" : "var(--crit)" }}>
                      {formatBRL(margem)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="receber">
          <ContasReceberTabela contas={contasReceber} planosContas={opcoesPlanoContas} contasBancarias={opcoesContasBancarias} />
        </TabsContent>

        <TabsContent value="pagar">
          <ContasPagarTabela contas={contasPagar} fornecedores={opcoesFornecedores} planosContas={opcoesPlanoContas} contasBancarias={opcoesContasBancarias} />
        </TabsContent>

        <TabsContent value="conciliacao">
          <ConciliacaoBancaria
            contasBancarias={opcoesContasBancarias}
            fornecedores={opcoesFornecedores}
            planosContasDespesa={opcoesPlanoDespesa}
            planosContasReceita={opcoesPlanoReceita}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
