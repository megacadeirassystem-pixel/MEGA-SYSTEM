export function KpiStrip({ items }: { items: { label: string; value: string; accent?: string }[] }) {
  return (
    <div className="mb-5 flex overflow-hidden rounded-xl border bg-card">
      {items.map((k) => (
        <div key={k.label} className="flex-1 border-r px-4 py-3.5 last:border-r-0">
          <div className="text-[10.5px] font-medium text-muted-foreground">{k.label}</div>
          <div className="mt-1 font-sans text-[19px] font-semibold tracking-tight" style={k.accent ? { color: k.accent } : undefined}>
            {k.value}
          </div>
        </div>
      ))}
    </div>
  );
}
