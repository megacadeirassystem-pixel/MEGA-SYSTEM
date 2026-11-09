import { PageHeader } from "@/components/mega/page-header";

export default function UsinagemPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="PRODUÇÃO" title="Usinagem CNC" description="Nesting, biblioteca de TAPs e confirmação de chapas produzidas." />
      <iframe
        title="Módulo de Usinagem CNC"
        src="/mega-usinagem/index.html"
        className="h-[calc(100vh-12rem)] min-h-[720px] w-full rounded-xl border bg-background"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
