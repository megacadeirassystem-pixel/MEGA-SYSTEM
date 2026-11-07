"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createItem(formData: FormData) {
  const sku = String(formData.get("sku") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "COMPONENTE_COMPRADO") as "MATERIA_PRIMA" | "COMPONENTE_COMPRADO";
  const unidadeMedida = String(formData.get("unidadeMedida") ?? "un").trim();
  const estoqueMinimo = Number(formData.get("estoqueMinimo") ?? 0);
  const estoqueAlvo = Number(formData.get("estoqueAlvo") ?? 0);
  const leadTimeDias = Number(formData.get("leadTimeDias") ?? 0);
  const fornecedorPrincipalId = String(formData.get("fornecedorPrincipalId") ?? "") || undefined;
  const saldoInicial = Number(formData.get("saldoInicial") ?? 0);

  if (!sku || !nome) throw new Error("SKU e nome são obrigatórios.");

  const item = await prisma.item.create({
    data: {
      sku,
      nome,
      tipo,
      unidadeMedida,
      estoqueMinimo,
      estoqueAlvo,
      leadTimeDias,
      fornecedorPrincipalId,
      estoque: { create: { saldoAtual: saldoInicial } },
    },
  });

  revalidatePath("/estoque");
  redirect(`/estoque/item/${item.id}`);
}

export async function addBomItem(produtoId: string, formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const quantidadePorUnidade = Number(formData.get("quantidadePorUnidade") ?? 0);
  const fatorPerda = Number(formData.get("fatorPerda") ?? 1);

  if (!itemId || quantidadePorUnidade <= 0) throw new Error("Escolha um item e uma quantidade válida.");

  await prisma.bomItem.create({
    data: { produtoId, itemId, quantidadePorUnidade, fatorPerda },
  });

  revalidatePath(`/estoque/produto/${produtoId}`);
}

export async function removeBomItem(produtoId: string, bomItemId: string) {
  await prisma.bomItem.delete({ where: { id: bomItemId } });
  revalidatePath(`/estoque/produto/${produtoId}`);
}
