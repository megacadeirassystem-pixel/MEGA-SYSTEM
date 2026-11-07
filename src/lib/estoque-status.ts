import type { Status } from "@/lib/mock-data";

export function statusEstoque(disponivel: number, minimo: number): { status: Status; label: string } {
  if (disponivel <= minimo) return { status: "crit", label: "Repor" };
  if (disponivel <= minimo * 1.3) return { status: "warn", label: "Atenção" };
  return { status: "ok", label: "OK" };
}
