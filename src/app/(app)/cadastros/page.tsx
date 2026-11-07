import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { catalogIndividuais, catalogLongarinas, catalogUniversitarias, clientes } from "@/lib/mock-data";

function CatalogTable({ rows, unit }: { rows: { produto: string; obs: string; valor: string }[]; unit: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Observação</TableHead>
            <TableHead className="text-right">{unit}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.produto}>
              <TableCell className="font-semibold">{r.produto}</TableCell>
              <TableCell className="text-muted-foreground">{r.obs}</TableCell>
              <TableCell className="text-right font-mono">{r.valor}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function CadastrosPage() {
  return (
    <div>
      <PageHeader
        title="Cadastros"
        description="Clientes institucionais, fornecedores e o catálogo de produto — a base que alimenta todos os outros módulos."
        action={
          <Button>
            <Plus /> Novo cadastro
          </Button>
        }
      />

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Catálogo de produtos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="flex flex-col gap-5">
          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">INDIVIDUAIS — LINHA JERUSALÉM</div>
            <CatalogTable rows={catalogIndividuais} unit="Valor / un" />
          </div>
          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">LONGARINAS</div>
            <CatalogTable rows={catalogLongarinas} unit="Valor / lugar" />
          </div>
          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">UNIVERSITÁRIAS</div>
            <CatalogTable rows={catalogUniversitarias} unit="Valor" />
          </div>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead>Vendedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.nome}>
                    <TableCell className="font-semibold">{c.nome}</TableCell>
                    <TableCell>{c.segmento}</TableCell>
                    <TableCell>{c.cidade}</TableCell>
                    <TableCell>{c.vendedor}</TableCell>
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
