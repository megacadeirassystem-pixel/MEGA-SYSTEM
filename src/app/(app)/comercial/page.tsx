"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/mega/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { pipeline as initialPipeline, segmentos, vendedores, linhasProduto, formatBRL, type Deal } from "@/lib/mock-data";

export default function ComercialPage() {
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [seg, setSeg] = useState(segmentos[0]);
  const [vendedor, setVendedor] = useState(vendedores[0]);
  const [linha, setLinha] = useState(linhasProduto[0]);
  const [valor, setValor] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");

  function criarOportunidade() {
    const valorNum = Number(valor);
    if (!nome.trim() || !valorNum || valorNum <= 0) {
      toast.error("Preencha nome e um valor válido.");
      return;
    }
    const novoDeal: Deal = { nome: nome.trim(), seg, valor: valorNum, vendedor, linha, telefone: telefone.trim(), observacao: observacao.trim() };
    setPipeline((prev) => prev.map((lane, i) => (i === 0 ? { ...lane, deals: [novoDeal, ...lane.deals] } : lane)));
    setOpen(false);
    setNome("");
    setValor("");
    setTelefone("");
    setObservacao("");
    toast.success(`"${novoDeal.nome}" entrou no funil em Lead.`);
  }

  return (
    <div>
      <PageHeader
        title="Comercial"
        description="Lead → visita/medição → orçamento → negociação → ganho."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonVariants()}>
              <Plus /> Nova oportunidade
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova oportunidade</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Cliente / instituição
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Hotel Transamérica" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Segmento
                    <select
                      value={seg}
                      onChange={(e) => setSeg(e.target.value)}
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
                    Linha de interesse
                    <select
                      value={linha}
                      onChange={(e) => setLinha(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {linhasProduto.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Vendedor responsável
                    <select
                      value={vendedor}
                      onChange={(e) => setVendedor(e.target.value)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    >
                      {vendedores.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium">
                    Valor estimado (R$)
                    <Input
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      type="number"
                      placeholder="42800"
                      className="font-mono"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Telefone / contato
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-0000" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Observação
                  <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Contexto da negociação, prazo, concorrência…" />
                </label>
              </div>
              <DialogFooter>
                <Button onClick={criarOportunidade}>Adicionar ao funil</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex justify-end"><Link href="/comercial/pedidos/novo" className={buttonVariants()}><Plus className="size-4" /> Novo pedido</Link></div>

      <div className="flex overflow-hidden rounded-xl border bg-card">
        {pipeline.map((lane, i) => {
          const total = lane.deals.reduce((sum, d) => sum + d.valor, 0);
          return (
            <div key={lane.etapa} className={`min-w-0 flex-1 ${i > 0 ? "border-l" : ""}`}>
              <div className="border-b px-3.5 py-2.5">
                <h4 className="text-xs font-semibold">{lane.etapa}</h4>
                <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{formatBRL(total)}</div>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {lane.deals.map((d) => (
                  <div key={d.nome} className="rounded-md border bg-popover p-2.5">
                    <strong className="block text-[11.5px] font-semibold">{d.nome}</strong>
                    <span className="text-[10px] text-muted-foreground">
                      {d.seg}
                      {d.linha ? ` · ${d.linha}` : ""}
                    </span>
                    <span className="mt-1 block font-mono text-[11.5px] font-semibold">{formatBRL(d.valor)}</span>
                    {d.vendedor && <span className="mt-1 block text-[10px] text-muted-foreground">{d.vendedor}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
