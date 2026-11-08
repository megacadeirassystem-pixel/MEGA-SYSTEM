"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function criarColaborador(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim();
  const setor = String(formData.get("setor") ?? "FABRICA") as "FABRICA" | "COMERCIAL" | "LOGISTICA" | "ADMINISTRACAO";
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const salario = formData.get("salario") ? Number(formData.get("salario")) : null;
  const dataAdmissao = new Date(String(formData.get("dataAdmissao")));
  if (!nome || !cargo || isNaN(dataAdmissao.getTime())) throw new Error("Preencha nome, cargo e data de admissão.");

  await prisma.colaborador.create({
    data: { nome, cargo, setor, telefone, salario, dataAdmissao, status: "EXPERIENCIA" },
  });
  revalidatePath("/rh");
}

export async function atualizarStatusColaborador(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "ATIVO" | "EXPERIENCIA" | "AFASTADO" | "DESLIGADO";

  await prisma.colaborador.update({
    where: { id },
    data: { status, dataDesligamento: status === "DESLIGADO" ? new Date() : null },
  });
  revalidatePath("/rh");
}

export async function lancarComissao(formData: FormData) {
  const colaboradorId = String(formData.get("colaboradorId"));
  const mes = String(formData.get("mesReferencia")); // "2026-11"
  const valorVendido = Number(formData.get("valorVendido") ?? 0);
  const percentual = Number(formData.get("percentual") ?? 0);
  if (!colaboradorId || !valorVendido || valorVendido <= 0 || !percentual) {
    throw new Error("Preencha vendedor, valor vendido e percentual.");
  }

  const [ano, mesNum] = mes.split("-").map(Number);
  const mesReferencia = new Date(Date.UTC(ano, mesNum - 1, 1));
  const valorComissao = valorVendido * (percentual / 100);

  await prisma.comissao.upsert({
    where: { colaboradorId_mesReferencia: { colaboradorId, mesReferencia } },
    update: { valorVendido, percentual, valorComissao },
    create: { colaboradorId, mesReferencia, valorVendido, percentual, valorComissao },
  });
  revalidatePath("/rh");
}

export async function marcarComissaoPaga(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.comissao.update({
    where: { id },
    data: { pago: true, dataPagamento: new Date() },
  });
  revalidatePath("/rh");
}

export async function lancarPonto(formData: FormData) {
  const colaboradorId = String(formData.get("colaboradorId"));
  const mes = String(formData.get("mesReferencia"));
  const diasTrabalhados = Number(formData.get("diasTrabalhados") ?? 0);
  const faltas = Number(formData.get("faltas") ?? 0);
  const horasExtras = Number(formData.get("horasExtras") ?? 0);
  const observacao = String(formData.get("observacao") ?? "").trim() || null;
  if (!colaboradorId || !diasTrabalhados) throw new Error("Preencha colaborador e dias trabalhados.");

  const [ano, mesNum] = mes.split("-").map(Number);
  const mesReferencia = new Date(Date.UTC(ano, mesNum - 1, 1));

  await prisma.registroPonto.upsert({
    where: { colaboradorId_mesReferencia: { colaboradorId, mesReferencia } },
    update: { diasTrabalhados, faltas, horasExtras, observacao },
    create: { colaboradorId, mesReferencia, diasTrabalhados, faltas, horasExtras, observacao },
  });
  revalidatePath("/rh");
}
