import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { StatusChip } from "@/components/mega/status-chip";
import { KpiStrip } from "@/components/mega/kpi-strip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { colaboradores, comissoes } from "@/lib/mock-data";

const kpis = [
  { label: "COLABORADORES", value: "34" },
  { label: "FÁBRICA", value: "21" },
  { label: "COMERCIAL", value: "7" },
  { label: "ADMISSÕES (MÊS)", value: "2" },
];

export default function RHPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Retaguarda"
        title="RH"
        description="Equipe da fábrica, comercial e administração — ponto, escala e comissão."
        action={
          <Button>
            <Plus /> Novo colaborador
          </Button>
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
