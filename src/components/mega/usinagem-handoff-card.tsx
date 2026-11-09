import Link from "next/link";
import { ArrowRight, DraftingCompass } from "lucide-react";

export function UsinagemHandoffCard() {
  return (
    <div className="mb-5 flex items-center gap-4 rounded-xl border border-dashed bg-[var(--signal-dim)] p-4.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground">
        <DraftingCompass className="size-4.5 text-background" />
      </span>
      <div className="flex-1">
        <h3 className="text-sm font-bold">Usinagem</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Abra o Nesting para preparar as chapas e os arquivos TAP.
        </p>
      </div>
      <Link
        href="/producao/usinagem"
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-85"
      >
        Acessar Usinagem
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
