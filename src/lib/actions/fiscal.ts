"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

const JANELA_CANCELAMENTO_HORAS = 24;

/** Chave de acesso simulada (44 dígitos, formato real de NF-e) — não é emitida pela SEFAZ,
 * é só pra este sistema controlar numeração/histórico internamente. Emissão de verdade exige
 * certificado digital A1/A3 e um provedor (Focus NFe, NFe.io etc.) contratado. */
function gerarChaveAcessoSimulada(numero: number): string {
  const uf = "35"; // SP
  const hoje = new Date();
  const aamm = `${String(hoje.getFullYear()).slice(2)}${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const cnpj = "51177555000144"; // CNPJ da Nova Mega
  const modelo = "55";
  const serie = "001";
  const nNf = String(numero).padStart(9, "0");
  const tpEmis = "1";
  const cNf = String(randomInt(0, 99999999)).padStart(8, "0");
  const base = `${uf}${aamm}${cnpj}${modelo}${serie}${nNf}${tpEmis}${cNf}`;
  let soma = 0;
  let peso = 2;
  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return `${base}${dv}`;
}

export async function emitirNfe(formData: FormData) {
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const referenciaPedido = String(formData.get("referenciaPedido") ?? "").trim() || null;
  const valor = Number(formData.get("valor") ?? 0);
  if (!clienteNome || !valor || valor <= 0) throw new Error("Preencha cliente e valor.");

  const ultima = await prisma.notaFiscal.findFirst({ orderBy: { numero: "desc" } });
  const proximoNumero = (ultima?.numero ?? 188) + 1;

  await prisma.notaFiscal.create({
    data: {
      numero: proximoNumero,
      chaveAcesso: gerarChaveAcessoSimulada(proximoNumero),
      clienteNome,
      referenciaPedido,
      valor,
      status: "AUTORIZADA",
    },
  });
  revalidatePath("/fiscal");
}

/** Legislação real de NF-e só permite cancelamento espontâneo dentro de uma janela curta depois
 * da emissão (24h é o parâmetro mais comum entre UFs) — depois disso precisa de carta de
 * correção ou nota complementar, que é outro fluxo. Aplicamos a mesma regra aqui. */
export async function cancelarNfe(formData: FormData) {
  const id = String(formData.get("id"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Informe o motivo do cancelamento.");

  const nota = await prisma.notaFiscal.findUniqueOrThrow({ where: { id } });
  if (nota.status !== "AUTORIZADA") throw new Error("Esta nota não está autorizada — não há o que cancelar.");

  const horasDesdeEmissao = (Date.now() - nota.dataEmissao.getTime()) / 36e5;
  if (horasDesdeEmissao > JANELA_CANCELAMENTO_HORAS) {
    throw new Error(`Prazo de cancelamento (${JANELA_CANCELAMENTO_HORAS}h) expirado — precisa de carta de correção ou nota complementar.`);
  }

  await prisma.notaFiscal.update({
    where: { id },
    data: { status: "CANCELADA", dataCancelamento: new Date(), motivoCancelamento: motivo },
  });
  revalidatePath("/fiscal");
}
