"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
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
import { segmentos, vendedores, formatBRL } from "@/lib/mock-data";
import { criarPedido } from "@/lib/actions/comercial";

type Produto = { id: string; nome: string; linha: string; precoBase: number };

export function NovaOportunidadeDialog({ produtos }: { produtos: Produto[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [linhas, setLinhas] = useState<{ key: number; produtoId: string; quantidade: string }[]>([
    { key: 0, produtoId: produtos[0]?.id ?? "", quantidade: "1" },
  ]);
  const nextKey = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);

  const total = linhas.reduce((sum, l) => {
    const produto = produtos.find((p) => p.id === l.produtoId);
    return sum + (produto ? produto.precoBase * (Number(l.quantidade) || 0) : 0);
  }, 0);

  function addLinha() {
    setLinhas((prev) => [...prev, { key: nextKey.current++, produtoId: produtos[0]?.id ?? "", quantidade: "1" }]);
  }
  function removeLinha(key: number) {
    setLinhas((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }
  function updateLinha(key: number, patch: Partial<{ produtoId: string; quantidade: string }>) {
    setLinhas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await criarPedido(formData);
        toast.success("Oportunidade adicionada ao funil em Lead.");
        setOpen(false);
        setLinhas([{ key: 0, produtoId: produtos[0]?.id ?? "", quantidade: "1" }]);
        formRef.current?.reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Não foi possível criar a oportunidade.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants()}>
        <Plus /> Nova oportunidade
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Cliente / instituição
            <Input name="cliente" required placeholder="Hotel Transamérica" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Segmento
              <select name="segmento" defaultValue={segmentos[0]} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                {segmentos.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Vendedor responsável
              <select name="vendedor" defaultValue={vendedores[0]} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                {vendedores.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-1 flex flex-col gap-2 rounded-lg border p-2.5">
            <span className="text-xs font-medium">Cadeiras do pedido</span>
            {linhas.map((l) => (
              <div key={l.key} className="flex items-center gap-2">
                <select
                  name="produtoId"
                  value={l.produtoId}
                  onChange={(e) => updateLinha(l.key, { produtoId: e.target.value })}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-xs"
                >
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {formatBRL(p.precoBase)}
                    </option>
                  ))}
                </select>
                <input
                  name="quantidade"
                  type="number"
                  min={1}
                  value={l.quantidade}
                  onChange={(e) => updateLinha(l.key, { quantidade: e.target.value })}
                  className="h-8 w-16 rounded-lg border border-input bg-transparent px-2 text-center font-mono text-xs"
                />
                <button type="button" onClick={() => removeLinha(l.key)} className="text-muted-foreground hover:text-[var(--crit)]" title="Remover item">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addLinha} className="flex items-center gap-1.5 self-start text-[11.5px] font-medium text-[var(--signal)] hover:underline">
              <Plus className="size-3" /> Adicionar cadeira
            </button>
            <div className="mt-1 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">Valor estimado do pedido</span>
              <span className="font-mono font-semibold">{formatBRL(total)}</span>
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Telefone / contato
            <Input name="telefone" placeholder="(11) 99999-0000" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Observação
            <Textarea name="observacao" placeholder="Contexto da negociação, prazo, concorrência…" />
          </label>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adicionando…" : "Adicionar ao funil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
