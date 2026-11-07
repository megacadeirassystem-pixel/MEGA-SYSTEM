import type { Status } from "@/lib/mock-data";

const styles: Record<Status, { color: string; bg: string }> = {
  ok: { color: "var(--good)", bg: "var(--good-dim)" },
  warn: { color: "var(--warn)", bg: "var(--warn-dim)" },
  crit: { color: "var(--crit)", bg: "var(--crit-dim)" },
};

export function StatusChip({ status, label }: { status: Status; label: string }) {
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      <span className="size-1.5 rounded-full" style={{ background: s.color }} />
      {label}
    </span>
  );
}
