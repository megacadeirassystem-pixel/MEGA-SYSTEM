"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  catalogIndividuais as initialIndividuais,
  catalogLongarinas as initialLongarinas,
  catalogUniversitarias as initialUniversitarias,
  clientes as initialClientes,
  segmentos,
} from "@/lib/mock-data";

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

const grupos = ["Individuais — linha Jerusalém", "Longarinas", "Universitárias"] as const;

export default function CadastrosPage() {
  const [individuais, setIndividuais] = useState(initialIndividuais);
  const [longarinas, setLongarinas] = useState(initialLongarinas);
  const [universitarias, setUniversitarias] = useState(initialUniversitarias);
  const [clientes, setClientes] = useState(initialClientes);
  const [tab, setTab] = useState("produtos");

  const [open, setOpen] = useState(false);
  const [tipoCadastro, setTipoCadastro] = useState<"produto" | "cliente">("produto");

  const [grupo, setGrupo] = useState<(typeof grupos)[number]>(grupos[0]);
  const [produtoNome, setProdutoNome] = useState("");
  const [produtoObs, setProdutoObs] = useState("");
  const [produtoValor, setProdutoValor] = useState("");

  const [clienteNome, setClienteNome] = useState("");
  const [clienteSeg, setClienteSeg] = useState(segmentos[0]);
  const [clienteCidade, setClienteCidade] = useState("");
  const [clienteVendedor, setClienteVendedor] = useState("");

  function criarCadastro() {
    if (tipoCadastro === "produto") {
      if (!produtoNome.trim() || !produtoValor.trim()) {
        toast.error("Preencha produto e valor.");
        return;
      }
      const novo = { produto: produtoNome.trim(), obs: produtoObs.trim(), valor: produtoValor.trim() };
      if (grupo === grupos[0]) setIndividuais((prev) => [novo, ...prev]);
      else if (grupo === grupos[1]) setLongarinas((prev) => [novo, ...prev]);
      else setUniversitarias((prev) => [novo, ...prev]);
      setProdutoNome("");
      setProdutoObs("");
      setProdutoValor("");
      setTab("produtos");
      toast.success(`"${novo.produto}" adicionado ao catálogo.`);
    } else {
      if (!clienteNome.trim() || !clienteCidade.trim()) {
        toast.error("Preencha cliente e cidade.");
        return;
      }
      const novo = { nome: clienteNome.trim(), segmento: clienteSeg, cidade: clienteCidade.trim(), vendedor: clienteVendedor.trim() || "—" };
      setClientes((prev) => [novo, ...prev]);
      setClienteNome("");
      setClienteCidade("");
      setClienteVendedor("");
      setTab("clientes");
      toast.success(`"${novo.nome}" cadastrado.`);
    }
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Cadastros"
        description="Clientes institucionais, fornecedores e o catálogo de produto — a base que alimenta todos os outros módulos."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Novo cadastro
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo cadastro</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Tipo
                  <select
                    value={tipoCadastro}
                    onChange={(e) => setTipoCadastro(e.target.value as "produto" | "cliente")}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="produto">Produto</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </label>

                {tipoCadastro === "produto" ? (
                  <>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Grupo
                      <select
                        value={grupo}
                        onChange={(e) => setGrupo(e.target.value as (typeof grupos)[number])}
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      >
                        {grupos.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Produto
                      <Input value={produtoNome} onChange={(e) => setProdutoNome(e.target.value)} placeholder="Jerusalém Ouro" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Observação
                      <Input value={produtoObs} onChange={(e) => setProdutoObs(e.target.value)} placeholder="Empilhável, engate lateral" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Valor
                      <Input value={produtoValor} onChange={(e) => setProdutoValor(e.target.value)} placeholder="R$ 279,99" />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Cliente / instituição
                      <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Universidade Mackenzie" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Segmento
                      <select
                        value={clienteSeg}
                        onChange={(e) => setClienteSeg(e.target.value)}
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      >
                        {segmentos.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Cidade / UF
                      <Input value={clienteCidade} onChange={(e) => setClienteCidade(e.target.value)} placeholder="São Paulo / SP" />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium">
                      Vendedor
                      <Input value={clienteVendedor} onChange={(e) => setClienteVendedor(e.target.value)} placeholder="Carla Souza" />
                    </label>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button onClick={criarCadastro}>Criar cadastro</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="produtos">Catálogo de produtos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="flex flex-col gap-5">
          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">INDIVIDUAIS — LINHA JERUSALÉM</div>
            <CatalogTable rows={individuais} unit="Valor / un" />
          </div>
          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">LONGARINAS</div>
            <CatalogTable rows={longarinas} unit="Valor / lugar" />
          </div>
          <div>
            <div className="mb-2.5 text-[11px] font-bold tracking-wide text-muted-foreground">UNIVERSITÁRIAS</div>
            <CatalogTable rows={universitarias} unit="Valor" />
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
