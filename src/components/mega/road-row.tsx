import Link from "next/link";
import { flowItems } from "@/lib/nav";
import { orders, type Status } from "@/lib/mock-data";

const severityRank: Record<Status, number> = { ok: 0, warn: 1, crit: 2 };
const severityColor: Record<Status, string> = { ok: "var(--muted-foreground)", warn: "var(--warn)", crit: "var(--crit)" };

export function RoadRow() {
  const byStation = new Map<number, typeof orders>();
  orders.forEach((o) => {
    const list = byStation.get(o.station) ?? [];
    list.push(o);
    byStation.set(o.station, list);
  });

  return (
    <div className="relative flex gap-2.5">
      <div className="absolute inset-x-[18px] top-[30px] h-0.5 bg-border" />
      {flowItems.map((item, i) => {
        const list = byStation.get(i) ?? [];
        const worst = list.reduce<Status>((w, o) => (severityRank[o.status] > severityRank[w] ? o.status : w), "ok");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group relative z-10 flex-1 rounded-[9px] border bg-card p-3 pb-3.5 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-foreground/20"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <Icon className="size-3.5 text-muted-foreground" />
              {list.length > 0 && (
                <span className="size-1.5 rounded-full" style={{ background: severityColor[worst], boxShadow: worst !== "ok" ? `0 0 0 3px color-mix(in oklab, ${severityColor[worst]} 16%, transparent)` : undefined }} />
              )}
            </div>
            <div className={`font-mono text-[22px] font-bold tracking-tight ${list.length ? "text-foreground" : "text-muted-foreground"}`}>
              {list.length || "—"}
            </div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-muted-foreground">{item.label}</div>

            {list.length > 0 && (
              <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 w-[220px] -translate-x-1/2 rounded-[9px] border bg-popover p-1.5 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                {list.map((o, idx) => (
                  <div key={o.code} className={`flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 ${idx > 0 ? "border-t" : ""}`}>
                    <div className="flex items-center justify-between text-[11.5px] font-semibold">
                      <span>{o.cliente}</span>
                      <span className="font-mono text-[11px] font-medium text-muted-foreground">{o.code}</span>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">{o.valor}</div>
                  </div>
                ))}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
