import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);
const validText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= max;
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const dimension = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0.01 && value <= max;

export class ErroUsinagem extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const skusUsinagem = new Set([
  "USI-ASS-BEL", "USI-ASS-GOL", "USI-ASS-JER", "USI-ASS-PLU",
  "USI-ENC-BEL", "USI-ENC-GOL", "USI-ENC-JER", "USI-ENC-PLU",
]);

function skuDoNome(name: string, tapName = "") {
  const tokens = new Set((name + " " + tapName).toUpperCase().match(/(?<![A-Z0-9-])USI-[A-Z0-9-]+/g) || []);
  const [sku] = tokens;
  if (tokens.size !== 1 || !skusUsinagem.has(sku)) {
    throw new ErroUsinagem("Informe um único SKU válido no nome do desenho ou do TAP. Para misturar SKUs na chapa, use o SKU em cada desenho e um nome de TAP sem SKU. Desenho: " + name, 422);
  }
  return sku;
}

export function lerPlano(value: unknown) {
  if (!object(value) || !validText(value.cycleId, 36) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.cycleId) ||
      !integer(value.sheetNumber, 1, 10000) || !object(value.stock) ||
      !dimension(value.stock.x, 1850) || !dimension(value.stock.y, 2780) ||
      !Array.isArray(value.drawings) || value.drawings.length < 1 || value.drawings.length > 500) {
    throw new ErroUsinagem("Plano de chapa inválido.", 400);
  }
  const rawTap = value.tap;
  let tap: { fileName: string; pieces: number; seconds: number; step?: number } | undefined;
  if (rawTap !== undefined) {
    if (!object(rawTap) || !validText(rawTap.fileName, 124) || !/\.tap$/i.test(rawTap.fileName) ||
        !integer(rawTap.pieces, 1, 999999999) || (rawTap.step !== undefined && !dimension(rawTap.step, 1000)) ||
        typeof rawTap.seconds !== "number" || !Number.isFinite(rawTap.seconds) || rawTap.seconds <= 0) {
      throw new ErroUsinagem("Dados do TAP inválidos.", 400);
    }
    tap = { fileName: rawTap.fileName, pieces: rawTap.pieces, seconds: rawTap.seconds, ...(typeof rawTap.step === "number" ? { step: rawTap.step } : {}) };
  }
  const seen = new Set<string>();
  const drawings = value.drawings.map((row: unknown) => {
    if (!object(row) || !validText(row.importId, 160) || !validText(row.savedAt, 40) ||
        !Number.isFinite(Date.parse(row.savedAt)) || !validText(row.sourceFile, 255) ||
        !validText(row.name, 255) || !integer(row.piecesPerCopy, 1, 10000) ||
        !integer(row.copies, 1, 10000)) {
      throw new ErroUsinagem("Desenho ou quantidade inválida.", 400);
    }
    const savedAt = new Date(row.savedAt).toISOString();
    const key = JSON.stringify([row.importId, savedAt, row.sourceFile]);
    if (seen.has(key)) throw new ErroUsinagem("Desenho duplicado no plano.", 400);
    seen.add(key);
    return {
      importId: row.importId, savedAt, sourceFile: row.sourceFile, name: row.name,
      sku: skuDoNome(row.name, tap?.fileName), piecesPerCopy: row.piecesPerCopy, copies: row.copies,
    };
  }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (drawings.reduce((sum, row) => sum + row.copies, 0) > 10000) {
    throw new ErroUsinagem("Quantidade de cópias acima do limite por chapa.", 400);
  }
  if (tap && drawings.reduce((sum, row) => sum + row.copies * row.piecesPerCopy, 0) !== tap.pieces) {
    throw new ErroUsinagem("A quantidade do TAP difere da quantidade da chapa.", 422);
  }
  return { cycleId: value.cycleId.toLowerCase(), sheetNumber: value.sheetNumber,
    stock: { x: value.stock.x, y: value.stock.y }, drawings, ...(tap ? { tap } : {}) };
}

type Plano = ReturnType<typeof lerPlano>;

function mapearMovimentos(plano: Plano) {
  let config: unknown;
  try { config = JSON.parse(process.env.USINAGEM_MAPEAMENTO || "null"); }
  catch { throw new ErroUsinagem("O mapeamento de estoque da usinagem está inválido.", 503); }
  if (!object(config) || !validText(config.chapaSku, 100)) {
    throw new ErroUsinagem("Configure os SKUs da usinagem antes de confirmar.", 503);
  }

  const outputs = new Map<string, number>();
  for (const row of plano.drawings) {
    if (row.sku === config.chapaSku) {
      throw new ErroUsinagem("O SKU da chapa deve ser diferente do SKU produzido.", 503);
    }
    const quantity = (outputs.get(row.sku) ?? 0) + row.copies * row.piecesPerCopy;
    if (quantity > 999999999) throw new ErroUsinagem("Quantidade produzida acima do limite de estoque.", 422);
    outputs.set(row.sku, quantity);
  }
  return { chapaSku: config.chapaSku, outputs };
}

export async function confirmarCiclo(plano: Plano, operadorId: string) {
  const hash = createHash("sha256").update(JSON.stringify(plano)).digest("hex");
  const id = plano.cycleId;
  async function previous() {
    const ciclo = await prisma.cicloUsinagem.findUnique({ where: { id } });
    if (!ciclo) return null;
    if (ciclo.hash !== hash) throw new ErroUsinagem("Este ciclo já foi registrado com outro plano.", 409);
    return { id, repetido: true };
  }
  const recorded = await previous();
  if (recorded) return recorded;
  const { chapaSku, outputs } = mapearMovimentos(plano);

  try {
    await prisma.$transaction(async tx => {
      await tx.cicloUsinagem.create({ data: { id, operadorId, hash, plano } });
      const skus = [chapaSku, ...outputs.keys()];
      const catalog = await tx.item.findMany({ where: { sku: { in: skus }, ativo: true } });
      const bySku = new Map(catalog.map(item => [item.sku, item]));
      const sheet = bySku.get(chapaSku);
      if (!sheet || sheet.tipo !== "MATERIA_PRIMA") {
        throw new ErroUsinagem("O SKU da chapa precisa estar ativo e cadastrado como matéria-prima.", 422);
      }
      for (const sku of outputs.keys()) {
        if (bySku.get(sku)?.unidadeMedida.toLowerCase().trim() !== "un") {
          throw new ErroUsinagem("O componente " + sku + " precisa estar ativo e cadastrado em un.", 422);
        }
      }
      const unit = sheet.unidadeMedida.toLowerCase().trim();
      let consumption: Prisma.Decimal;
      if (unit === "un") consumption = new Prisma.Decimal(1);
      else if (unit === "m2" || unit === "m²") {
        consumption = new Prisma.Decimal(plano.stock.x).times(plano.stock.y).div(1000000).toDecimalPlaces(3);
      } else throw new ErroUsinagem("A unidade da chapa precisa ser un ou m².", 422);
      if (consumption.lte(0)) throw new ErroUsinagem("Consumo da chapa abaixo da precisão do estoque.", 422);

      const updated = await tx.$executeRaw`
        UPDATE "estoque_itens"
        SET "saldoAtual" = "saldoAtual" - ${consumption}, "atualizadoEm" = NOW()
        WHERE "itemId" = ${sheet.id} AND "saldoAtual" - "reservado" >= ${consumption}
      `;
      if (updated !== 1) throw new ErroUsinagem("Saldo disponível insuficiente para a chapa.", 409);
      await tx.movimentoEstoque.create({
        data: { cicloUsinagemId: id, itemId: sheet.id, tipo: "SAIDA_PRODUCAO", quantidade: consumption },
      });
      for (const [sku, quantity] of [...outputs].sort(([a], [b]) => a.localeCompare(b))) {
        const itemId = bySku.get(sku)!.id;
        await tx.estoqueItem.upsert({
          where: { itemId },
          create: { itemId, saldoAtual: quantity },
          update: { saldoAtual: { increment: quantity } },
        });
        await tx.movimentoEstoque.create({
          data: { cicloUsinagemId: id, itemId, tipo: "ENTRADA_PRODUCAO", quantidade: quantity },
        });
      }
    });
    return { id, repetido: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const replay = await previous();
      if (replay) return replay;
    }
    throw error;
  }
}
