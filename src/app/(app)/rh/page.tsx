import { connection } from "next/server";
import { PageHeader } from "@/components/mega/page-header";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColaboradoresTabela, type ColaboradorView } from "@/components/rh/colaboradores-tabela";
import { ComissoesTabela, type ComissaoView } from "@/components/rh/comissoes-tabela";
import { PontoTabela, type RegistroPontoView } from "@/components/rh/ponto-tabela";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function RHPage() {
  await connection();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [colaboradoresRaw, comissoesRaw, pontosRaw] = await Promise.all([
    prisma.colaborador.findMany({ orderBy: { nome: "asc" } }),
    prisma.comissao.findMany({ include: { colaborador: true }, orderBy: { mesReferencia: "desc" } }),
    prisma.registroPonto.findMany({ include: { colaborador: true }, orderBy: { mesReferencia: "desc" } }),
  ]);

  const colaboradores: ColaboradorView[] = colaboradoresRaw.map((c) => ({
    id: c.id,
    nome: c.nome,
    cargo: c.cargo,
    setor: c.setor,
    dataAdmissao: c.dataAdmissao.toISOString(),
    status: c.status,
  }));

  const comissoes: ComissaoView[] = comissoesRaw.map((c) => ({
    id: c.id,
    colaboradorNome: c.colaborador.nome,
    mesReferencia: c.mesReferencia.toISOString(),
    valorVendido: Number(c.valorVendido),
    percentual: Number(c.percentual),
    valorComissao: Number(c.valorComissao),
    pago: c.pago,
  }));

  const pontos: RegistroPontoView[] = pontosRaw.map((p) => ({
    id: p.id,
    colaboradorNome: p.colaborador.nome,
    mesReferencia: p.mesReferencia.toISOString(),
    diasTrabalhados: p.diasTrabalhados,
    faltas: p.faltas,
    horasExtras: Number(p.horasExtras),
    observacao: p.observacao,
  }));

  const ativosOuExperiencia = colaboradoresRaw.filter((c) => c.status !== "DESLIGADO");
  const totalColaboradores = ativosOuExperiencia.length;
  const totalFabrica = ativosOuExperiencia.filter((c) => c.setor === "FABRICA").length;
  const totalComercial = ativosOuExperiencia.filter((c) => c.setor === "COMERCIAL").length;
  const admissoesNoMes = colaboradoresRaw.filter((c) => c.dataAdmissao >= inicioMes).length;

  const kpis = [
    { label: "COLABORADORES", value: String(totalColaboradores) },
    { label: "FÁBRICA", value: String(totalFabrica) },
    { label: "COMERCIAL", value: String(totalComercial) },
    { label: "ADMISSÕES (MÊS)", value: String(admissoesNoMes) },
  ];

  const opcoesColaboradores = colaboradoresRaw.filter((c) => c.status !== "DESLIGADO").map((c) => ({ id: c.id, nome: c.nome }));
  const opcoesVendedores = colaboradoresRaw.filter((c) => c.setor === "COMERCIAL" && c.status !== "DESLIGADO").map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="RH"
        description="Colaboradores, comissão de vendedores e resumo de ponto — direto do banco."
      />
      <KpiStrip items={kpis} />

      <Tabs defaultValue="colaboradores">
        <TabsList>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="ponto">Ponto</TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores">
          <ColaboradoresTabela colaboradores={colaboradores} />
        </TabsContent>

        <TabsContent value="comissoes">
          <ComissoesTabela comissoes={comissoes} vendedores={opcoesVendedores} />
        </TabsContent>

        <TabsContent value="ponto">
          <PontoTabela registros={pontos} colaboradores={opcoesColaboradores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
