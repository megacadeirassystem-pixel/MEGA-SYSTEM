"use client";

import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

// Configurável — fica vazio até o Felipe definir o endpoint real do sistema de corte.
const USINAGEM_URL = process.env.NEXT_PUBLIC_USINAGEM_URL ?? "";

export function UsinagemHandoffCard() {
  function handleClick() {
    if (USINAGEM_URL) {
      window.open(USINAGEM_URL, "_blank");
    } else {
      toast.warning("URL do sistema de Usinagem ainda não configurada.");
    }
  }

  return (
    <div className="mb-5 flex items-center gap-4 rounded-xl border border-dashed bg-[var(--signal-dim)] p-4.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground">
        <ArrowUpRight className="size-4.5 text-background" />
      </span>
      <div className="flex-1">
        <h3 className="text-sm font-bold">Usinagem — sistema externo (Felipe)</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Nesting, aproveitamento de chapa e fila do router CNC rodam num app próprio. Este botão entrega a ordem e recebe o resultado de volta.
        </p>
      </div>
      <button
        onClick={handleClick}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-xs font-semibold text-background"
      >
        <ArrowUpRight className="size-3.5" /> Abrir Usinagem
      </button>
    </div>
  );
}
