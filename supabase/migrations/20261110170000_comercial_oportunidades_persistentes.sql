CREATE TABLE IF NOT EXISTS public.oportunidades_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  segmento text NOT NULL DEFAULT '',
  vendedor text NOT NULL DEFAULT '',
  linha_produto text NOT NULL DEFAULT '',
  valor_estimado numeric(14,2) NOT NULL DEFAULT 0 CHECK (valor_estimado >= 0),
  telefone text,
  observacao text,
  etapa text NOT NULL DEFAULT 'LEAD' CHECK (etapa IN ('LEAD','VISITA','ORCAMENTO','NEGOCIACAO','GANHO','PERDIDO')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oportunidades_comerciais_etapa_idx ON public.oportunidades_comerciais(etapa, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS oportunidades_comerciais_criado_por_idx ON public.oportunidades_comerciais(criado_por);
ALTER TABLE public.oportunidades_comerciais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oportunidades_comerciais_authenticated_access ON public.oportunidades_comerciais;
CREATE POLICY oportunidades_comerciais_authenticated_access ON public.oportunidades_comerciais
 FOR ALL TO authenticated USING (true) WITH CHECK (true);
