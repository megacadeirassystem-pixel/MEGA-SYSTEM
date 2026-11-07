import { Plus } from "lucide-react";
import { PageHeader } from "@/components/mega/page-header";
import { Button } from "@/components/ui/button";
import { pipeline } from "@/lib/mock-data";

export default function ComercialPage() {
  return (
    <div>
      <PageHeader
        title="Comercial"
        description="Lead → visita/medição → orçamento → negociação → ganho."
        action={
          <Button>
            <Plus /> Nova oportunidade
          </Button>
        }
      />

      <div className="flex overflow-hidden rounded-xl border bg-card">
        {pipeline.map((lane, i) => (
          <div key={lane.etapa} className={`min-w-0 flex-1 ${i > 0 ? "border-l" : ""}`}>
            <div className="border-b px-3.5 py-2.5">
              <h4 className="text-xs font-semibold">{lane.etapa}</h4>
              <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">{lane.total}</div>
            </div>
            <div className="flex flex-col gap-1.5 p-2">
              {lane.deals.map((d) => (
                <div key={d.nome} className="rounded-md border bg-popover p-2.5">
                  <strong className="block text-[11.5px] font-semibold">{d.nome}</strong>
                  <span className="text-[10px] text-muted-foreground">{d.seg}</span>
                  <span className="mt-1 block font-mono text-[11.5px] font-semibold">{d.valor}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
