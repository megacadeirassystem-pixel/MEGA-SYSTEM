"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/lib/utils";

export type FluxoCaixaPonto = { mes: string; recebido: number; pago: number; saldo: number };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-[11px] shadow-lg">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <b className="font-mono">{formatBRL(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

export function FluxoCaixaChart({ dados }: { dados: FluxoCaixaPonto[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="mes"
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
            tick={{ fontSize: 10.5, fill: "var(--muted-foreground)", fontFamily: "var(--font-geist-mono)" }}
          />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--overlay)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="recebido" name="Recebimentos" fill="var(--good)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="pago" name="Pagamentos" fill="var(--crit)" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Line type="monotone" dataKey="saldo" name="Saldo" stroke="var(--signal)" strokeWidth={2} dot={{ r: 3, fill: "var(--signal)" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
