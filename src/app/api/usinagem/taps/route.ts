import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const metadata = Prisma.sql`id, file_name, pieces, seconds, sheet_number, sku, revision, saved_at`;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const fail = (error: string, status: number) => Response.json({ error }, { status });
const privateHeaders = { "Cache-Control": "private, no-store" };

type Tap = {
  id: string; file_name: string; pieces: number; seconds: number;
  sheet_number: number; sku: string | null; revision: string; saved_at: Date;
};

function databaseFailure(error: unknown) {
  console.error("Biblioteca TAP", error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "erro");
  return fail("Não foi possível acessar a biblioteca compartilhada.", 503);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  try {
    if (id !== null) {
      if (!uuid.test(id)) return fail("Arquivo inválido.", 400);
      const [tap] = await prisma.$queryRaw<(Tap & { content: string })[]>`
        SELECT ${metadata}, content FROM public.usinagem_taps WHERE id = ${id}::uuid`;
      if (!tap) return fail("TAP não encontrado.", 404);
      return Response.json(tap, { headers: privateHeaders });
    }
    const page = Number(searchParams.get("page") ?? 0);
    if (!Number.isSafeInteger(page) || page < 0 || page > 10000) return fail("Página inválida.", 400);
    const taps = await prisma.$queryRaw<(Tap & { editable: boolean })[]>`
      SELECT ${metadata}, true AS editable FROM public.usinagem_taps
      ORDER BY saved_at DESC, id LIMIT 51 OFFSET ${page * 50}`;
    return Response.json({ taps: taps.slice(0, 50), hasMore: taps.length > 50 }, { headers: privateHeaders });
  } catch (error) {
    return databaseFailure(error);
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return fail("Envie o TAP em JSON.", 415);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 4200000) return fail("TAP acima do tamanho aceito pela biblioteca.", 413);
  let payload;
  try { payload = JSON.parse(raw); }
  catch { return fail("JSON inválido.", 400); }
  if (!payload || typeof payload !== "object") return fail("TAP inválido.", 400);
  const { fileName, content, pieces, seconds, sheetNumber, sku, replace } = payload;
  if (typeof fileName !== "string" || !/^.{1,156}\.tap$/i.test(fileName.trim()) ||
      /[<>:"/\\|?*\x00-\x1f]/.test(fileName) ||
      typeof content !== "string" || !content || content.includes("\x00") ||
      Buffer.byteLength(content) > 4000000 ||
      !Number.isInteger(pieces) || pieces < 1 || pieces > 500000 ||
      !Number.isFinite(seconds) || seconds < 0 || seconds > 31536000 ||
      !Number.isInteger(sheetNumber) || sheetNumber < 1 || sheetNumber > 500000 ||
      (sku != null && (typeof sku !== "string" || !/^USI-(ASS|ENC)-(BEL|GOL|JER|PLU)$/.test(sku)))) {
    return fail("Arquivo ou dados de produção inválidos.", 400);
  }

  const name = fileName.trim().normalize("NFC");
  try {
    if (replace !== undefined) {
      if (!replace || typeof replace.id !== "string" || typeof replace.revision !== "string" ||
          !uuid.test(replace.id) || !uuid.test(replace.revision)) return fail("Substituição inválida.", 400);
      const [tap] = await prisma.$queryRaw<Tap[]>`
        UPDATE public.usinagem_taps
        SET file_name = ${name}, content = ${content}, pieces = ${pieces}, seconds = ${seconds},
            sheet_number = ${sheetNumber}, sku = ${sku ?? null}, revision = gen_random_uuid(), saved_at = now()
        WHERE id = ${replace.id}::uuid AND revision = ${replace.revision}::uuid
          AND name_key = lower(normalize(btrim(${name}), NFC))
        RETURNING ${metadata}`;
      if (!tap) return fail("O TAP mudou ou foi apagado. Atualize a lista.", 409);
      return Response.json(tap);
    }

    const [tap] = await prisma.$queryRaw<Tap[]>`
      INSERT INTO public.usinagem_taps (owner_id, file_name, content, pieces, seconds, sheet_number, sku)
      VALUES (gen_random_uuid(), ${name}, ${content}, ${pieces}, ${seconds}, ${sheetNumber}, ${sku ?? null})
      ON CONFLICT (name_key) DO NOTHING RETURNING ${metadata}`;
    if (tap) return Response.json(tap, { status: 201 });

    const [existing] = await prisma.$queryRaw<{ id: string; revision: string }[]>`
      SELECT id, revision FROM public.usinagem_taps
      WHERE name_key = lower(normalize(btrim(${name}), NFC))`;
    return Response.json({
      error: "Já existe um TAP com esse nome.",
      code: "TAP_NAME_EXISTS",
      replace: existing ?? null,
    }, { status: 409 });
  } catch (error) {
    return databaseFailure(error);
  }
}

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Origem inválida.", 403);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const revision = searchParams.get("revision");
  if (!id || !revision || !uuid.test(id) || !uuid.test(revision)) return fail("Arquivo inválido.", 400);
  try {
    const deleted = await prisma.$executeRaw`
      DELETE FROM public.usinagem_taps
      WHERE id = ${id}::uuid AND revision = ${revision}::uuid`;
    if (!deleted) return fail("O TAP mudou ou foi apagado. Atualize a lista.", 409);
    return new Response(null, { status: 204 });
  } catch (error) {
    return databaseFailure(error);
  }
}
