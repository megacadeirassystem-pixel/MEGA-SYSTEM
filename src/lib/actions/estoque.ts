"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateItem(itemId: string, formData: FormData) {
  const estoqueMinimo = formData.get("estoqueMinimo");
  const estoqueAlvo = formData.get("estoqueAlvo");
  const leadTimeDias = formData.get("leadTimeDias");
  const observacoes = formData.get("observacoes");

  await prisma.item.update({
    where: { id: itemId },
    data: {
      estoqueMinimo: estoqueMinimo ? Number(estoqueMinimo) : undefined,
      estoqueAlvo: estoqueAlvo ? Number(estoqueAlvo) : undefined,
      leadTimeDias: leadTimeDias ? Number(leadTimeDias) : undefined,
      observacoes: typeof observacoes === "string" ? observacoes : undefined,
    },
  });

  revalidatePath(`/estoque/item/${itemId}`);
  revalidatePath("/estoque");
}
