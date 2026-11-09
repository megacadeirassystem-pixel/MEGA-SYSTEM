ALTER TYPE "TipoMovimento" ADD VALUE 'ENTRADA_PRODUCAO';

BEGIN;
CREATE TABLE "ciclos_usinagem" (
  "id" TEXT PRIMARY KEY,
  "operadorId" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "plano" JSONB NOT NULL,
  "confirmadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ciclos_usinagem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ciclos_usinagem" FROM anon, authenticated;

ALTER TABLE "movimentos_estoque" ADD COLUMN "cicloUsinagemId" TEXT;
ALTER TABLE "movimentos_estoque" ADD CONSTRAINT "movimentos_estoque_cicloUsinagemId_fkey"
  FOREIGN KEY ("cicloUsinagemId") REFERENCES "ciclos_usinagem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "movimentos_estoque_cicloUsinagemId_idx" ON "movimentos_estoque" ("cicloUsinagemId");
COMMIT;
