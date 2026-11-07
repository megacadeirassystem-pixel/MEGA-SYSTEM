import { PageHeader } from "@/components/mega/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const linhas = [
  { linha: "Jerusalém", modelo: "Jerusalém Ouro", estoque: 86, disponivel: 56 },
  { linha: "Universitária", modelo: "ISO c/ Prancheta", estoque: 140, disponivel: 89 },
];

export default function EstoquePage() {
  return (
    <div>
      <PageHeader title="Estoque" description="Matéria-prima e produto acabado prontos pra expedir." />
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Linha</TableHead>
              <TableHead>Modelo principal</TableHead>
              <TableHead className="text-right">Em estoque</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.modelo}>
                <TableCell className="font-semibold">{l.linha}</TableCell>
                <TableCell>{l.modelo}</TableCell>
                <TableCell className="text-right font-mono">{l.estoque}</TableCell>
                <TableCell className="text-right font-mono">{l.disponivel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
