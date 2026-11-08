import type { Status } from "@/lib/mock-data";

export type StatusNotaFiscal = "AUTORIZADA" | "CANCELADA" | "PENDENTE";

export const JANELA_HORAS = 24;

export function chip(status: StatusNotaFiscal): { status: Status; label: string } | null {
  if (status === "AUTORIZADA") return { status: "ok", label: "Autorizada" };
  if (status === "PENDENTE") return { status: "warn", label: "Pendente" };
  return null; // CANCELADA — texto neutro, não chip
}
