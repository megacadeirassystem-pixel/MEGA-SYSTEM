import type { Status } from "@/lib/mock-data";

type StatusTitulo = "ABERTO" | "PARCIAL" | "PAGO" | "VENCIDO" | "CANCELADO";

/** Deriva o rótulo exibido a partir do status gravado + vencimento — "vencido" nunca é escrito
 * no banco (evitaria precisar de um cron só pra isso), é sempre calculado contra a data de hoje. */
export function statusTituloChip(status: StatusTitulo, vencimentoISO: string): { status: Status; label: string } | null {
  if (status === "PAGO") return { status: "ok", label: "Pago" };
  if (status === "CANCELADO") return null;

  const vencido = new Date(vencimentoISO) < new Date(new Date().toDateString());
  if (vencido) return { status: "crit", label: "Vencido" };
  if (status === "PARCIAL") return { status: "warn", label: "Parcial" };
  return { status: "warn", label: "Em aberto" };
}

export const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Transferência", "Cartão", "Dinheiro", "Cheque"];
