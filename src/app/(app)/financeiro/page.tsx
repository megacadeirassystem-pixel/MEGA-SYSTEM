import { PageHeader } from "@/components/mega/page-header";
import { StubPage } from "@/components/mega/stub-page";

export default function FinanceiroPage() {
  return (
    <div>
      <PageHeader eyebrow="Retaguarda" title="Financeiro" description="Acompanha todas as estações, mas não faz parte do fluxo físico do pedido." />
      <StubPage fields={["contas a pagar", "contas a receber", "fluxo de caixa", "DRE"]}>
        Contas a pagar e a receber, fluxo de caixa e DRE entram aqui — puxando valor de Comercial (venda) e Compras (custo) automaticamente.
      </StubPage>
    </div>
  );
}
