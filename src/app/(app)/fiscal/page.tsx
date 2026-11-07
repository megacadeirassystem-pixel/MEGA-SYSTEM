import { PageHeader } from "@/components/mega/page-header";
import { StubPage } from "@/components/mega/stub-page";

export default function FiscalPage() {
  return (
    <div>
      <PageHeader eyebrow="Retaguarda" title="Fiscal" description="Emissão e guarda de documentos fiscais dos pedidos fechados." />
      <StubPage fields={["NF-e", "XML", "DANFE", "obrigações acessórias"]}>
        Emissão de NF-e disparada quando um pedido sai de Estoque para Logística, com guarda de XML e DANFE por pedido.
      </StubPage>
    </div>
  );
}
