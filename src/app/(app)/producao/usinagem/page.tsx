import Link from "next/link";
import { ArrowLeft, DraftingCompass } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { Button } from "@/components/ui/button";

export default function UsinagemPage() {
  return (
    <div>
      <PageHeader
        eyebrow="PRODUÇÃO"
        title="Usinagem"
        description="Espaço reservado para desenvolvimento."
      />

      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border bg-card px-6 py-12 text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-xl bg-[var(--signal-dim)] text-[var(--signal)]">
          <DraftingCompass className="size-7" />
        </div>

        <h2 className="text-xl font-bold tracking-tight">
          Aqui o Felipe vai projetar e construir.
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Este espaço será desenvolvido pelo Felipe. Em breve, teremos aqui a ferramenta independente de usinagem.
        </p>

        <div className="mt-8 rounded-lg border border-dashed px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
          ESPAÇO RESERVADO PARA DESENVOLVIMENTO
        </div>

        <Button asChild variant="outline" className="mt-8">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" />
            Voltar para o Mega System
          </Link>
        </Button>
      </section>
    </div>
  );
}
