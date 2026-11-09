"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Circle, ClipboardList, DraftingCompass, Factory, PackageCheck, Play, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";

type StageKey = "SERRALHERIA" | "PINTURA" | "USINAGEM" | "TAPECARIA" | "COSTURA" | "MONTAGEM";
type CheckItem = { label: string; done: boolean };
type Stage = { key: StageKey; name: string; description: string; checks: CheckItem[]; planned: number; completed: number; };
type Order = { code: string; pedido: string; client: string; product: string; quantity: number; priority: string; stages: Stage[] };

const stageSeed: Omit<Stage, "planned" | "completed">[] = [
  { key: "SERRALHERIA", name: "Serralheria", description: "Corte, preparação e solda das estruturas metálicas.", checks: [{ label: "Separar tubos e perfis", done: false }, { label: "Cortar conforme plano de corte", done: false }, { label: "Soldar estruturas", done: false }, { label: "Conferir esquadro e medidas", done: false }, { label: "Liberar lote para pintura", done: false }] },
  { key: "PINTURA", name: "Pintura", description: "Preparação de superfície e acabamento da estrutura.", checks: [{ label: "Receber e conferir estruturas", done: false }, { label: "Preparar superfície", done: false }, { label: "Aplicar pintura", done: false }, { label: "Inspecionar acabamento", done: false }, { label: "Liberar peças", done: false }] },
  { key: "USINAGEM", name: "Usinagem", description: "Plano de corte das chapas e produção de componentes CNC.", checks: [{ label: "Conferir plano e rendimento das chapas", done: false }, { label: "Separar chapas e materiais", done: false }, { label: "Executar usinagem CNC no módulo do Felipe", done: false }, { label: "Conferir peças usinadas", done: false }, { label: "Apontar quantidade produzida", done: false }] },
  { key: "TAPECARIA", name: "Tapeçaria", description: "Preparação e montagem dos conjuntos estofados.", checks: [{ label: "Separar espumas e componentes", done: false }, { label: "Preparar conjuntos", done: false }, { label: "Conferir medidas e padrão", done: false }, { label: "Liberar para costura/montagem", done: false }] },
  { key: "COSTURA", name: "Costura", description: "Confecção e inspeção dos revestimentos.", checks: [{ label: "Separar tecidos e insumos", done: false }, { label: "Cortar revestimentos", done: false }, { label: "Costurar capas", done: false }, { label: "Inspecionar costuras", done: false }] },
  { key: "MONTAGEM", name: "Montagem", description: "Montagem final, inspeção e liberação do produto acabado.", checks: [{ label: "Conferir todos os componentes", done: false }, { label: "Montar produto", done: false }, { label: "Realizar inspeção final", done: false }, { label: "Embalar e identificar", done: false }, { label: "Liberar produto acabado para o Dashboard", done: false }] },
];

function makeStages(qty: number): Stage[] {
  return stageSeed.map((s) => ({ ...s, checks: s.checks.map((c) => ({ ...c })), planned: qty, completed: 0 }));
}
const initialOrders: Order[] = [
  { code: "OF-0412", pedido: "MC-0847", client: "Universidade Mackenzie", product: "Cadeira Universitária", quantity: 47, priority: "Alta", stages: makeStages(47) },
  { code: "OF-0411", pedido: "MC-0845", client: "Hotel Blue Tree", product: "Longarina", quantity: 32, priority: "Normal", stages: makeStages(32) },
  { code: "OF-0409", pedido: "MC-0843", client: "Memorial América Latina", product: "Cadeira Auditório", quantity: 28, priority: "Atenção", stages: makeStages(28) },
];

export default function ProducaoPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<StageKey>("SERRALHERIA");
  const [filter, setFilter] = useState("TODAS");
  const [demoNotice, setDemoNotice] = useState(true);
  const selected = orders.find((o) => o.code === selectedId) ?? null;
  const totals = useMemo(() => ({ total: orders.length, running: orders.filter((o) => o.stages.some((s) => s.completed > 0)).length, released: orders.filter((o) => o.stages.every((s) => s.checks.every((c) => c.done))).length }), [orders]);
  const visible = orders.filter((o) => filter === "TODAS" || (filter === "EM PRODUÇÃO" ? o.stages.some((s) => s.completed > 0) : o.stages.every((s) => s.checks.every((c) => c.done))));

  function updateOrder(code: string, fn: (order: Order) => Order) { setOrders((prev) => prev.map((o) => o.code === code ? fn(o) : o)); }
  function toggleCheck(stageKey: StageKey, index: number) {
    if (!selected) return;
    updateOrder(selected.code, (o) => ({ ...o, stages: o.stages.map((s) => s.key !== stageKey ? s : { ...s, checks: s.checks.map((c, i) => i === index ? { ...c, done: !c.done } : c) }) }));
  }
  function updateQuantity(stageKey: StageKey, value: number) {
    if (!selected || !Number.isFinite(value)) return;
    const safe = Math.max(0, Math.min(selected.quantity, Math.floor(value)));
    updateOrder(selected.code, (o) => ({ ...o, stages: o.stages.map((s) => s.key === stageKey ? { ...s, completed: safe } : s) }));
  }
  function startStage(stageKey: StageKey) {
    if (!selected) return;
    updateOrder(selected.code, (o) => ({ ...o, stages: o.stages.map((s) => s.key === stageKey ? { ...s, checks: s.checks.map((c, i) => i === 0 ? { ...c, done: true } : c) } : s) }));
  }
  const currentStage = selected?.stages.find((s) => s.key === activeStage);

  if (selected && currentStage) {
    const stageIndex = selected.stages.findIndex((s) => s.key === activeStage);
    const doneChecks = currentStage.checks.filter((c) => c.done).length;
    const allStagesDone = selected.stages.every((s) => s.checks.every((c) => c.done));
    return <div className="space-y-6">
      <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar às ordens</button>
      <PageHeader eyebrow="ROTEIRO DE FABRICAÇÃO" title={selected.code} description={selected.product + " · " + selected.client} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Pedido vinculado" value={selected.pedido} />
        <Metric label="Quantidade planejada" value={String(selected.quantity) + " peças"} />
        <Metric label="Etapas concluídas" value={selected.stages.filter((s) => s.checks.every((c) => c.done)).length + " / 6"} />
      </div>
      {allStagesDone && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300"><PackageCheck className="mr-2 inline size-5" /> Roteiro concluído. Produto pronto para liberação ao Dashboard (demonstração local).</div>}
      <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
        <nav className="space-y-2">
          {selected.stages.map((s, i) => { const done = s.checks.every((c) => c.done); const active = s.key === activeStage; return <button key={s.key} onClick={() => setActiveStage(s.key)} className={"flex w-full items-center gap-3 rounded-xl border p-3 text-left transition " + (active ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50")}>
            <span className={"flex size-8 shrink-0 items-center justify-center rounded-full " + (done ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>{done ? <Check className="size-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{s.name}</span><span className="text-xs text-muted-foreground">{s.checks.filter((c) => c.done).length}/{s.checks.length} tarefas</span></span><ChevronRight className="size-4 text-muted-foreground" />
          </button>; })}
        </nav>
        <section className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-widest text-muted-foreground">ETAPA {stageIndex + 1} DE 6</p><h2 className="mt-1 text-xl font-bold">{currentStage.name}</h2><p className="mt-1 text-sm text-muted-foreground">{currentStage.description}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{doneChecks === currentStage.checks.length ? "Concluída" : doneChecks ? "Em andamento" : "Pendente"}</span></div>
          {currentStage.key === "USINAGEM" && <Link href="/producao/usinagem" className="mt-4 flex items-center justify-between rounded-lg border border-dashed p-3 text-sm hover:bg-muted/50"><span className="flex items-center gap-2"><DraftingCompass className="size-4" /> Abrir módulo independente de Usinagem CNC</span><ArrowRight className="size-4" /></Link>}
          <div className="mt-5 space-y-3">{currentStage.checks.map((c, i) => <label key={c.label} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/40"><input type="checkbox" checked={c.done} onChange={() => toggleCheck(currentStage.key, i)} className="size-4 accent-primary" /><span className={"text-sm " + (c.done ? "text-muted-foreground line-through" : "font-medium")}>{c.label}</span></label>)}</div>
          <div className="mt-6 grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-2"><label className="text-sm"><span className="mb-1 block text-muted-foreground">Quantidade planejada</span><input readOnly value={currentStage.planned} className="h-10 w-full rounded-md border bg-background px-3 font-mono" /></label><label className="text-sm"><span className="mb-1 block text-muted-foreground">Quantidade concluída</span><input type="number" min="0" max={selected.quantity} value={currentStage.completed} onChange={(e) => updateQuantity(currentStage.key, Number(e.target.value))} className="h-10 w-full rounded-md border bg-background px-3 font-mono" /></label></div>
          <div className="mt-5 flex flex-wrap justify-between gap-2"><button onClick={() => startStage(currentStage.key)} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted"><Play className="size-4" /> Iniciar etapa</button><button disabled={stageIndex === 0} onClick={() => setActiveStage(selected.stages[stageIndex - 1].key)} className="h-10 rounded-md border px-4 text-sm disabled:opacity-40">Anterior</button><button disabled={stageIndex === 5} onClick={() => setActiveStage(selected.stages[stageIndex + 1].key)} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-40">Próxima etapa <ArrowRight className="size-4" /></button></div>
        </section>
      </div>
    </div>;
  }

  return <div className="space-y-6">
    <PageHeader title="Produção" description="Acompanhamento das ordens e roteiro completo por setor." action={<span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Factory className="size-4" /> 6 etapas produtivas</span>} />
    {demoNotice && <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"><span><strong>Modo demonstração:</strong> ordens e apontamentos fictícios. As alterações ficam apenas nesta sessão e não movimentam o estoque.</span><button onClick={() => setDemoNotice(false)} aria-label="Fechar aviso" className="text-muted-foreground">×</button></div>}
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Ordens no roteiro" value={String(totals.total)} /><Metric label="Com apontamentos" value={String(totals.running)} /><Metric label="Roteiros concluídos" value={String(totals.released)} /></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Ordens de fabricação</h2><p className="text-sm text-muted-foreground">Selecione uma ordem para abrir seu roteiro.</p></div><div className="flex gap-1 rounded-lg border p-1">{["TODAS", "EM PRODUÇÃO", "CONCLUÍDAS"].map((f) => <button key={f} onClick={() => setFilter(f)} className={"rounded-md px-3 py-1.5 text-xs font-semibold " + (filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{f}</button>)}</div></div>
    <div className="overflow-hidden rounded-xl border bg-card"><div className="grid grid-cols-[1fr_1fr_90px_120px] gap-3 border-b bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><span>Ordem / Pedido</span><span>Produto / Cliente</span><span>Peças</span><span>Progresso</span></div>
      {visible.map((o) => { const completed = o.stages.filter((s) => s.checks.every((c) => c.done)).length; const pct = Math.round(completed / 6 * 100); return <button key={o.code} onClick={() => { setSelectedId(o.code); setActiveStage("SERRALHERIA"); }} className="grid w-full grid-cols-[1fr_1fr_90px_120px] items-center gap-3 border-b px-4 py-4 text-left last:border-0 hover:bg-muted/40"><span><strong className="block font-mono text-sm">{o.code}</strong><span className="text-xs text-muted-foreground">{o.pedido}</span></span><span className="min-w-0"><strong className="block truncate text-sm">{o.product}</strong><span className="block truncate text-xs text-muted-foreground">{o.client}</span></span><span className="font-mono text-sm">{o.quantity}</span><span><span className="block text-xs font-semibold">{pct}%</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: pct + "%" }} /></span></span></button>; })}
      {visible.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma ordem neste filtro.</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><ClipboardList className="size-4" /> Apontamentos demonstrativos, sem integração de estoque.</span><button onClick={() => setOrders(initialOrders)} className="inline-flex items-center gap-1 hover:text-foreground"><RotateCcw className="size-3" /> Restaurar demonstração</button></div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p></div>;
}
