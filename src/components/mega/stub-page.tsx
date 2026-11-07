export function StubPage({ fields, children }: { fields: string[]; children: React.ReactNode }) {
  return (
    <div className="max-w-[56ch] rounded-xl border bg-card p-7">
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <span className="size-1.5 rounded-full bg-[var(--brand)]" />
        Em desenho
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">{children}</p>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {fields.map((f) => (
          <span key={f} className="rounded-md border px-2 py-0.5 font-mono text-[10.5px] text-muted-foreground">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
