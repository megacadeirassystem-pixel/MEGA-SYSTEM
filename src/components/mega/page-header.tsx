export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5.5 flex items-end justify-between gap-5">
      <div>
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[var(--brand)]" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-[56ch] text-[12.5px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
