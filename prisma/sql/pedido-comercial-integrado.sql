-- MEGA SYSTEM: commercial order details
ALTER TABLE "pedidos"
  ADD COLUMN IF NOT EXISTS "tipoPedido" TEXT,
  ADD COLUMN IF NOT EXISTS "origem" TEXT,
  ADD COLUMN IF NOT EXISTS "vendedor" TEXT,
  ADD COLUMN IF NOT EXISTS "telefoneContato" TEXT,
  ADD COLUMN IF NOT EXISTS "emailContato" TEXT,
  ADD COLUMN IF NOT EXISTS "enderecoEntrega" TEXT,
  ADD COLUMN IF NOT EXISTS "dataEntrega" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "condicaoPagamento" TEXT,
  ADD COLUMN IF NOT EXISTS "frete" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "desconto" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "valorTotal" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
ALTER TABLE "pedido_itens"
  ADD COLUMN IF NOT EXISTS "valorUnitario" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "observacao" TEXT;
CREATE INDEX IF NOT EXISTS "pedidos_status_dataEntrega_idx" ON "pedidos" ("status","dataEntrega");