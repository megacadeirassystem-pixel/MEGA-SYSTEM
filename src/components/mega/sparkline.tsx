export function Sparkline({ points, accent = "var(--signal)" }: { points: number[]; accent?: string }) {
  const w = 64;
  const h = 20;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - 2 - ((p - min) / range) * (h - 4);
    return [x, y] as const;
  });
  const path = coords.map((c) => c.join(",")).join(" ");
  const lastTwo = coords.slice(-2).map((c) => c.join(",")).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1.5">
      <polyline points={path} fill="none" stroke="var(--muted-foreground)" strokeWidth={1.6} />
      <polyline points={lastTwo} fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}
