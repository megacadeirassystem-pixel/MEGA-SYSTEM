import type { Status } from "@/lib/mock-data";

type StatusTitulo = "ABERTO" | "PARCIAL" | "PAGO" | "VENCIDO" | "CANCELADO";

/** "Vencido" nunca é escrito no banco (evitaria precisar de um cron só pra isso), é sempre
 * calculado contra a data de hoje — zera a hora pra não contar como vencido algo que ainda
 * vence HOJE, só mais tarde. Única fonte de verdade: tanto o chip de cada linha quanto o KPI
 * "Títulos vencidos" usam esta mesma função, pra nunca discordar um do outro. */
export function estaVencido(vencimentoISO: string): boolean {
  return new Date(vencimentoISO) < new Date(new Date().toDateString());
}

export function statusTituloChip(status: StatusTitulo, vencimentoISO: string): { status: Status; label: string } | null {
  if (status === "PAGO") return { status: "ok", label: "Pago" };
  if (status === "CANCELADO") return null;

  if (estaVencido(vencimentoISO)) return { status: "crit", label: "Vencido" };
  if (status === "PARCIAL") return { status: "warn", label: "Parcial" };
  return { status: "warn", label: "Em aberto" };
}

export const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Transferência", "Cartão", "Dinheiro", "Cheque"];
