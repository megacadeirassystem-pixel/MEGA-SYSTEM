"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function criarPedido(formData: FormData) {
  const cliente = String(formData.get("cliente") ?? "").trim();
  const segmento = String(formData.get("segmento") ?? "") || undefined;
  const vendedor = String(formData.get("vendedor") ?? "") || undefined;
  const telefone = String(formData.get("telefone") ?? "").trim() || undefined;
  const observacao = String(formData.get("observacao") ?? "").trim() || undefined;

  const produtoIds = formData.getAll("produtoId") as string[];
  const quantidades = formData.getAll("quantidade") as string[];

  const itens = produtoIds
    .map((produtoId, i) => ({ produtoId, quantidade: Number(quantidades[i] ?? 0) }))
    .filter((item) => item.produtoId && item.quantidade > 0);

  if (!cliente) throw new Error("Informe o cliente.");
  if (itens.length === 0) throw new Error("Adicione ao menos um item com quantidade válida.");

  const total = await prisma.pedido.count();
  const codigo = `MC-${String(1000 + total + 1).slice(1)}`;

  await prisma.pedido.create({
    data: {
      codigo,
      cliente,
      segmento,
      vendedor,
      telefone,
      observacao,
      etapaFunil: "LEAD",
      itens: { create: itens },
    },
  });

  revalidatePath("/comercial");
}

export async function moverEtapa(pedidoId: string, etapaFunil: "LEAD" | "VISITA" | "ORCAMENTO" | "NEGOCIACAO" | "GANHO" | "PERDIDO") {
  await prisma.pedido.update({ where: { id: pedidoId }, data: { etapaFunil } });
  revalidatePath("/comercial");
}
