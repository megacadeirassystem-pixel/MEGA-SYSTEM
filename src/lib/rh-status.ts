import type { Status } from "@/lib/mock-data";

export type SetorColaborador = "FABRICA" | "COMERCIAL" | "LOGISTICA" | "ADMINISTRACAO";
export type StatusColaborador = "ATIVO" | "EXPERIENCIA" | "AFASTADO" | "DESLIGADO";

export const setorLabel: Record<SetorColaborador, string> = {
  FABRICA: "Fábrica",
  COMERCIAL: "Comercial",
  LOGISTICA: "Logística",
  ADMINISTRACAO: "Administração",
};

export function chip(status: StatusColaborador): { status: Status; label: string } | null {
  if (status === "ATIVO") return { status: "ok", label: "Ativo" };
  if (status === "EXPERIENCIA") return { status: "warn", label: "Experiência" };
  if (status === "AFASTADO") return { status: "warn", label: "Afastado" };
  return null; // DESLIGADO — texto neutro
}
