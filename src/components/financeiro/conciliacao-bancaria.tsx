"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/mega/status-chip";
import { formatBRL, formatDate } from "@/lib/utils";
import {
  importarExtratoOfx,
  conciliarLancamentoOfx,
  criarLancamentoConciliacaoOfx,
  arquivarItemConciliacaoOfx,
  type ItemConciliacaoComSugestoes,
} from "@/lib/actions/financeiro";

type Opcao = { id: string; nome: string };

/** Importa o extrato OFX exportado do internet banking (formato padrão de praticamente todo
 * banco) e sugere o título em aberto que bate com cada transação, pra conciliar com um clique. */
export function ConciliacaoBancaria({
  contasBancarias,
  fornecedores,
  planosContasDespesa,
  planosContasReceita,
}: {
  contasBancarias: Opcao[];
  fornecedores: Opcao[];
  planosContasDespesa: Opcao[];
  planosContasReceita: Opcao[];
}) {
  const [pending, startTransition] = useTransition();
  const [conciliacaoId, setConciliacaoId] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemConciliacaoComSugestoes[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [contaBancariaId, setContaBancariaId] = useState(contasBancarias[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  function importar() {
    const arquivo = fileRef.current?.files?.[0];
    if (!arquivo) {
      setErro("Selecione o arquivo OFX.");
      return;
    }
    if (!contaBancariaId) {
      setErro("Selecione a conta bancária.");
      return;
    }
    setErro(null);
    const formData = new FormData();
    formData.set("arquivo", arquivo);
    formData.set("contaBancariaId", contaBancariaId);
    startTransition(async () => {
      try {
        const resultado = await importarExtratoOfx(formData);
        setConciliacaoId(resultado.conciliacaoId);
        setItens(resultado.itens);
        if (fileRef.current) fileRef.current.value = "";
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível importar o extrato.");
      }
    });
  }

  function atualizarItemLocal(fitId: string, patch: Partial<ItemConciliacaoComSugestoes>) {
    setItens((atual) => atual.map((i) => (i.fitId === fitId ? { ...i, ...patch } : i)));
  }

  function conciliar(item: ItemConciliacaoComSugestoes, sugestaoId: string, tipo: "PAGAR" | "RECEBER") {
    if (!conciliacaoId) return;
    const formData = new FormData();
    formData.set("conciliacaoId", conciliacaoId);
    formData.set("fitId", item.fitId);
    formData.set("tipo", tipo);
    formData.set("contaId", sugestaoId);
    formData.set("valor", String(item.valor));
    formData.set("data", item.data);
    startTransition(async () => {
      try {
        await conciliarLancamentoOfx(formData);
        atualizarItemLocal(item.fitId, { status: "conciliado", [tipo === "PAGAR" ? "contaPagarId" : "contaReceberId"]: sugestaoId });
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível conciliar.");
      }
    });
  }

  function arquivar(item: ItemConciliacaoComSugestoes) {
    if (!conciliacaoId) return;
    const formData = new FormData();
    formData.set("conciliacaoId", conciliacaoId);
    formData.set("fitId", item.fitId);
    startTransition(async () => {
      try {
        await arquivarItemConciliacaoOfx(formData);
        atualizarItemLocal(item.fitId, { status: "arquivado" });
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível arquivar.");
      }
    });
  }

  function criarNovo(item: ItemConciliacaoComSugestoes, campos: { descricao: string; planoContasId: string; fornecedorId: string; clienteNome: string }) {
    if (!conciliacaoId) return;
    const tipo = item.valor < 0 ? "PAGAR" : "RECEBER";
    const formData = new FormData();
    formData.set("conciliacaoId", conciliacaoId);
    formData.set("fitId", item.fitId);
    formData.set("tipo", tipo);
    formData.set("descricao", campos.descricao);
    formData.set("valor", String(item.valor));
    formData.set("data", item.data);
    if (campos.planoContasId) formData.set("planoContasId", campos.planoContasId);
    if (tipo === "PAGAR" && campos.fornecedorId) formData.set("fornecedorId", campos.fornecedorId);
    if (tipo === "RECEBER") formData.set("clienteNome", campos.clienteNome);
    startTransition(async () => {
      try {
        await criarLancamentoConciliacaoOfx(formData);
        atualizarItemLocal(item.fitId, { status: "criado" });
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível criar o lançamento.");
      }
    });
  }

  const pendentes = itens.filter((i) => i.status === "pendente");
  const resolvidos = itens.filter((i) => i.status !== "pendente");

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-[12.5px] text-muted-foreground">
          Exporte o extrato em <strong>.OFX</strong> pelo internet banking (funciona com praticamente qualquer banco) e suba aqui — o sistema
          sugere o título em aberto que bate com cada movimentação, pra conciliar com um clique.
        </p>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Conta bancária
            <select
              value={contaBancariaId}
              onChange={(e) => setContaBancariaId(e.target.value)}
              className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {contasBancarias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            Arquivo OFX
            <input ref={fileRef} type="file" accept=".ofx,.qfx" className="text-xs" />
          </label>
          <Button type="button" onClick={importar} disabled={pending}>
            <Upload className="size-3.5" />
            Importar extrato
          </Button>
        </div>
        {erro && <p className="mt-2 text-xs text-[var(--crit)]">{erro}</p>}
      </div>

      {itens.length > 0 && (
        <>
          {pendentes.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-semibold">Pendentes ({pendentes.length})</p>
              {pendentes.map((item) => (
                <ItemExtrato
                  key={item.fitId}
                  item={item}
                  fornecedores={fornecedores}
                  planosContasDespesa={planosContasDespesa}
                  planosContasReceita={planosContasReceita}
                  pending={pending}
                  onConciliar={conciliar}
                  onArquivar={arquivar}
                  onCriar={criarNovo}
                />
              ))}
            </div>
          )}

          {resolvidos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-muted-foreground">Já decididos ({resolvidos.length})</p>
              <div className="flex flex-col gap-1">
                {resolvidos.map((item) => (
                  <div key={item.fitId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs text-muted-foreground">
                    <span>
                      {formatDate(new Date(item.data))} — {item.descricao || "(sem descrição)"} — {formatBRL(Math.abs(item.valor))}
                    </span>
                    <span className="font-medium text-foreground">
                      {item.status === "conciliado" ? "Conciliado" : item.status === "criado" ? "Lançamento criado" : "Arquivado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ItemExtrato({
  item,
  fornecedores,
  planosContasDespesa,
  planosContasReceita,
  pending,
  onConciliar,
  onArquivar,
  onCriar,
}: {
  item: ItemConciliacaoComSugestoes;
  fornecedores: Opcao[];
  planosContasDespesa: Opcao[];
  planosContasReceita: Opcao[];
  pending: boolean;
  onConciliar: (item: ItemConciliacaoComSugestoes, sugestaoId: string, tipo: "PAGAR" | "RECEBER") => void;
  onArquivar: (item: ItemConciliacaoComSugestoes) => void;
  onCriar: (item: ItemConciliacaoComSugestoes, campos: { descricao: string; planoContasId: string; fornecedorId: string; clienteNome: string }) => void;
}) {
  const [criarAberto, setCriarAberto] = useState(false);
  const [descricao, setDescricao] = useState(item.descricao);
  const [planoContasId, setPlanoContasId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const tipo: "PAGAR" | "RECEBER" = item.valor < 0 ? "PAGAR" : "RECEBER";

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-semibold">{item.descricao || "(sem descrição)"}</p>
          <p className="text-[11px] text-muted-foreground">{formatDate(new Date(item.data))}</p>
        </div>
        <StatusChip status={tipo === "PAGAR" ? "crit" : "ok"} label={`${tipo === "PAGAR" ? "Saída" : "Entrada"} — ${formatBRL(Math.abs(item.valor))}`} />
      </div>

      {item.sugestoes.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {item.sugestoes.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--good)]/30 bg-[var(--good-dim)] px-3 py-1.5">
              <span className="text-[12.5px]">
                {s.label} <span className="text-[11px] text-muted-foreground">— vence {formatDate(new Date(s.vencimento))}</span>
              </span>
              <Button type="button" size="sm" disabled={pending} onClick={() => onConciliar(item, s.id, s.tipo)}>
                Conciliar
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {!criarAberto ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setCriarAberto(true)}>
              Criar novo lançamento
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => onArquivar(item)}>
              Arquivar
            </Button>
          </>
        ) : (
          <div className="flex w-full flex-wrap items-end gap-2 rounded-lg bg-[var(--overlay)] p-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-[10.5px] font-medium">Descrição</label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-medium">Categoria</label>
              <select
                value={planoContasId}
                onChange={(e) => setPlanoContasId(e.target.value)}
                className="h-8 w-40 rounded-lg border border-input bg-transparent px-2 text-xs"
              >
                <option value="">—</option>
                {(tipo === "PAGAR" ? planosContasDespesa : planosContasReceita).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            {tipo === "PAGAR" ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium">Fornecedor</label>
                <select
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                  className="h-8 w-40 rounded-lg border border-input bg-transparent px-2 text-xs"
                >
                  <option value="">—</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-medium">Cliente *</label>
                <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="h-8 w-40" />
              </div>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={() => setCriarAberto(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || (tipo === "RECEBER" && !clienteNome.trim())}
              onClick={() => onCriar(item, { descricao, planoContasId, fornecedorId, clienteNome })}
            >
              Salvar lançamento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
