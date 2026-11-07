import { PageHeader } from "@/components/mega/page-header";
import { StubPage } from "@/components/mega/stub-page";

export default function RHPage() {
  return (
    <div>
      <PageHeader eyebrow="Retaguarda" title="RH" description="Equipe da fábrica, do comercial e da administração." />
      <StubPage fields={["colaboradores", "ponto & escala", "comissões"]}>
        Cadastro de colaboradores, ponto e escala da produção, e comissão de vendedores — ligada diretamente aos pedidos fechados em Comercial.
      </StubPage>
    </div>
  );
}
