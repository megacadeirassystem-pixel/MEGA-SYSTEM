"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseOfx } from "@/lib/ofx-parser";

function optionalId(formData: FormData, name: string) {
  const v = String(formData.get(name) ?? "").trim();
  return v || undefined;
}

// ========================================================================
// Cadastro rápido (conta bancária, plano de contas)
// ========================================================================

export async function criarContaBancaria(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome da conta.");
  const banco = optionalId(formData, "banco") ?? null;
  const saldoInicial = Number(formData.get("saldoInicial") ?? 0);

  await prisma.contaBancaria.create({ data: { nome, banco, saldoInicial } });
  revalidatePath("/financeiro");
}

export async function criarPlanoContas(formData: FormData) {
  const codigo = String(formData.get("codigo") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "DESPESA") as "RECEITA" | "DESPESA";
  if (!codigo || !nome) throw new Error("Informe código e nome da categoria.");

  await prisma.planoContas.create({ data: { codigo, nome, tipo } });
  revalidatePath("/financeiro");
}

// ========================================================================
// Contas a pagar
// ========================================================================

export async function criarContaPagar(formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const vencimento = new Date(String(formData.get("vencimento")));
  if (!descricao || !valor || valor <= 0 || isNaN(vencimento.getTime())) {
    throw new Error("Preencha descrição, valor e vencimento.");
  }

  await prisma.contaPagar.create({
    data: {
      descricao,
      valor,
      vencimento,
      fornecedorId: optionalId(formData, "fornecedorId"),
      planoContasId: optionalId(formData, "planoContasId"),
      contaBancariaId: optionalId(formData, "contaBancariaId"),
      formaPagamento: optionalId(formData, "formaPagamento"),
    },
  });
  revalidatePath("/financeiro");
}

/** Dar baixa — o valor pago nem sempre bate com o valor do título (desconto negociado, juros/
 * multa por atraso): desconto conta como quitação (valorPago + desconto fecha o título); juros e
 * multa são custo extra além do valor da nota, só ficam registrados. */
export async function darBaixaContaPagar(formData: FormData) {
  const contaId = String(formData.get("contaId"));
  const valor = Number(formData.get("valor") ?? 0);
  const dataBaixa = new Date(String(formData.get("dataBaixa")));
  const juros = Number(formData.get("juros") ?? 0);
  const multa = Number(formData.get("multa") ?? 0);
  const desconto = Number(formData.get("desconto") ?? 0);
  if (!valor || valor <= 0) throw new Error("Informe o valor pago.");

  const conta = await prisma.contaPagar.findUniqueOrThrow({ where: { id: contaId } });
  if (conta.status === "PAGO" || conta.status === "CANCELADO") throw new Error("Este título já está encerrado.");

  const novoValorPago = Number(conta.valorPago) + valor;
  const novoDesconto = Number(conta.desconto) + desconto;
  if (novoValorPago + novoDesconto > Number(conta.valor) + 0.01) {
    throw new Error("Valor pago + desconto não pode passar do valor do título.");
  }
  const quitado = novoValorPago + novoDesconto >= Number(conta.valor) - 0.01;

  await prisma.contaPagar.update({
    where: { id: contaId },
    data: {
      valorPago: novoValorPago,
      juros: Number(conta.juros) + juros,
      multa: Number(conta.multa) + multa,
      desconto: novoDesconto,
      dataBaixa,
      formaPagamento: optionalId(formData, "formaPagamento") ?? conta.formaPagamento,
      contaBancariaId: optionalId(formData, "contaBancariaId") ?? conta.contaBancariaId,
      status: quitado ? "PAGO" : "PARCIAL",
    },
  });
  revalidatePath("/financeiro");
}

export async function cancelarContaPagar(formData: FormData) {
  const contaId = String(formData.get("contaId"));
  const conta = await prisma.contaPagar.findUniqueOrThrow({ where: { id: contaId } });
  if (conta.status === "PAGO" || conta.status === "CANCELADO") throw new Error("Este título já está encerrado.");
  await prisma.contaPagar.update({ where: { id: contaId }, data: { status: "CANCELADO" } });
  revalidatePath("/financeiro");
}

export async function atualizarContaPagar(formData: FormData) {
  const id = String(formData.get("id"));
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const vencimento = new Date(String(formData.get("vencimento")));
  if (!descricao || !valor || valor <= 0 || isNaN(vencimento.getTime())) {
    throw new Error("Preencha descrição, valor e vencimento.");
  }

  const atual = await prisma.contaPagar.findUniqueOrThrow({ where: { id } });
  if (valor < Number(atual.valorPago) + Number(atual.desconto)) {
    throw new Error("O valor não pode ficar menor do que o que já foi pago/descontado neste título.");
  }

  await prisma.contaPagar.update({
    where: { id },
    data: {
      descricao,
      valor,
      vencimento,
      fornecedorId: optionalId(formData, "fornecedorId") ?? null,
      planoContasId: optionalId(formData, "planoContasId") ?? null,
    },
  });
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/pagar/${id}`);
}

/** Só deixa excluir título que ainda não teve nenhuma baixa — apagar um registro que já tem
 * dinheiro de verdade movimentado perderia rastro; o caminho pra isso é Cancelar. */
export async function excluirContaPagar(formData: FormData) {
  const id = String(formData.get("id"));
  const conta = await prisma.contaPagar.findUniqueOrThrow({ where: { id } });
  if (Number(conta.valorPago) > 0) {
    throw new Error("Este título já teve baixa registrada — use Cancelar em vez de excluir.");
  }
  await prisma.contaPagar.delete({ where: { id } });
  revalidatePath("/financeiro");
}

// ========================================================================
// Contas a receber
// ========================================================================

export async function criarContaReceber(formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const vencimento = new Date(String(formData.get("vencimento")));
  if (!descricao || !clienteNome || !valor || valor <= 0 || isNaN(vencimento.getTime())) {
    throw new Error("Preencha descrição, cliente, valor e vencimento.");
  }

  await prisma.contaReceber.create({
    data: {
      descricao,
      clienteNome,
      valor,
      vencimento,
      planoContasId: optionalId(formData, "planoContasId"),
    },
  });
  revalidatePath("/financeiro");
}

export async function darBaixaContaReceber(formData: FormData) {
  const contaId = String(formData.get("contaId"));
  const valor = Number(formData.get("valor") ?? 0);
  const dataBaixa = new Date(String(formData.get("dataBaixa")));
  if (!valor || valor <= 0) throw new Error("Informe o valor recebido.");

  const conta = await prisma.contaReceber.findUniqueOrThrow({ where: { id: contaId } });
  if (conta.status === "PAGO" || conta.status === "CANCELADO") throw new Error("Este título já está encerrado.");

  const novoValorPago = Number(conta.valorPago) + valor;
  if (novoValorPago > Number(conta.valor) + 0.01) {
    throw new Error("Valor recebido não pode passar do valor do título.");
  }
  const quitado = novoValorPago >= Number(conta.valor) - 0.01;

  await prisma.contaReceber.update({
    where: { id: contaId },
    data: {
      valorPago: novoValorPago,
      dataBaixa,
      contaBancariaId: optionalId(formData, "contaBancariaId") ?? conta.contaBancariaId,
      status: quitado ? "PAGO" : "PARCIAL",
    },
  });
  revalidatePath("/financeiro");
}

export async function cancelarContaReceber(formData: FormData) {
  const contaId = String(formData.get("contaId"));
  const conta = await prisma.contaReceber.findUniqueOrThrow({ where: { id: contaId } });
  if (conta.status === "PAGO" || conta.status === "CANCELADO") throw new Error("Este título já está encerrado.");
  await prisma.contaReceber.update({ where: { id: contaId }, data: { status: "CANCELADO" } });
  revalidatePath("/financeiro");
}

export async function atualizarContaReceber(formData: FormData) {
  const id = String(formData.get("id"));
  const descricao = String(formData.get("descricao") ?? "").trim();
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const vencimento = new Date(String(formData.get("vencimento")));
  if (!descricao || !clienteNome || !valor || valor <= 0 || isNaN(vencimento.getTime())) {
    throw new Error("Preencha descrição, cliente, valor e vencimento.");
  }

  const atual = await prisma.contaReceber.findUniqueOrThrow({ where: { id } });
  if (valor < Number(atual.valorPago)) {
    throw new Error("O valor não pode ficar menor do que o que já foi recebido neste título.");
  }

  await prisma.contaReceber.update({
    where: { id },
    data: { descricao, clienteNome, valor, vencimento, planoContasId: optionalId(formData, "planoContasId") ?? null },
  });
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/receber/${id}`);
}

export async function excluirContaReceber(formData: FormData) {
  const id = String(formData.get("id"));
  const conta = await prisma.contaReceber.findUniqueOrThrow({ where: { id } });
  if (Number(conta.valorPago) > 0) {
    throw new Error("Este título já teve baixa registrada — use Cancelar em vez de excluir.");
  }
  await prisma.contaReceber.delete({ where: { id } });
  revalidatePath("/financeiro");
}

// ========================================================================
// Conciliação bancária (extrato OFX) — pedido explícito: importar extrato, o sistema sugere o
// título em aberto que bate com cada transação (mesmo valor ±0,01, vencimento numa janela de
// 10 dias), concilia com um clique. Sem sugestão: cria um título novo já pago, ou arquiva (ex.:
// transferência entre contas da própria empresa).
// ========================================================================

export interface ItemConciliacaoOfx {
  fitId: string;
  data: string;
  valor: number;
  descricao: string;
  status: "pendente" | "conciliado" | "arquivado" | "criado";
  contaPagarId?: string;
  contaReceberId?: string;
}

export interface SugestaoConciliacao {
  id: string;
  label: string;
  valor: number;
  vencimento: string;
  tipo: "PAGAR" | "RECEBER";
}

export interface ItemConciliacaoComSugestoes extends ItemConciliacaoOfx {
  sugestoes: SugestaoConciliacao[];
}

export interface ResultadoImportarOfx {
  conciliacaoId: string;
  itens: ItemConciliacaoComSugestoes[];
}

async function atualizarItemConciliacao(conciliacaoId: string, fitId: string, patch: Partial<ItemConciliacaoOfx>) {
  const registro = await prisma.conciliacaoBancaria.findUniqueOrThrow({ where: { id: conciliacaoId } });
  const itens = (registro.itens as unknown as ItemConciliacaoOfx[]).map((item) => (item.fitId === fitId ? { ...item, ...patch } : item));
  await prisma.conciliacaoBancaria.update({ where: { id: conciliacaoId }, data: { itens: JSON.parse(JSON.stringify(itens)) } });
}

const JANELA_DIAS = 10;

export async function importarExtratoOfx(formData: FormData): Promise<ResultadoImportarOfx> {
  const contaBancariaId = String(formData.get("contaBancariaId") ?? "");
  const arquivo = formData.get("arquivo");
  if (!contaBancariaId) throw new Error("Selecione a conta bancária.");
  if (!(arquivo instanceof File) || arquivo.size === 0) throw new Error("Selecione o arquivo OFX.");

  const texto = await arquivo.text();
  const transacoes = parseOfx(texto);
  if (transacoes.length === 0) throw new Error("Nenhuma transação encontrada — confira se é um arquivo OFX válido.");

  const anteriores = await prisma.conciliacaoBancaria.findMany({ where: { contaBancariaId }, select: { itens: true } });
  const fitIdsDecididos = new Set<string>();
  for (const c of anteriores) {
    for (const item of c.itens as unknown as ItemConciliacaoOfx[]) {
      if (item.status !== "pendente") fitIdsDecididos.add(item.fitId);
    }
  }
  const novas = transacoes.filter((t) => !fitIdsDecididos.has(t.fitId));
  if (novas.length === 0) {
    throw new Error("Todas as transações desse arquivo já foram conciliadas, criadas ou arquivadas antes.");
  }

  const itens: ItemConciliacaoOfx[] = novas.map((t) => ({
    fitId: t.fitId,
    data: t.data.toISOString(),
    valor: t.valor,
    descricao: t.descricao,
    status: "pendente",
  }));

  const registro = await prisma.conciliacaoBancaria.create({
    data: { contaBancariaId, itens: JSON.parse(JSON.stringify(itens)) },
  });

  const itensComSugestoes: ItemConciliacaoComSugestoes[] = [];
  for (const t of novas) {
    const de = new Date(t.data.getTime() - JANELA_DIAS * 24 * 60 * 60 * 1000);
    const ate = new Date(t.data.getTime() + JANELA_DIAS * 24 * 60 * 60 * 1000);
    const valorAbs = Math.abs(t.valor);
    let sugestoes: SugestaoConciliacao[] = [];

    if (t.valor < 0) {
      const candidatos = await prisma.contaPagar.findMany({
        where: { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { gte: de, lte: ate }, valor: { gte: valorAbs - 0.01, lte: valorAbs + 0.01 } },
        include: { fornecedor: true },
        take: 5,
      });
      sugestoes = candidatos.map((c) => ({
        id: c.id,
        label: c.fornecedor?.nome ?? c.descricao,
        valor: Number(c.valor),
        vencimento: c.vencimento.toISOString(),
        tipo: "PAGAR" as const,
      }));
    } else {
      const candidatos = await prisma.contaReceber.findMany({
        where: { status: { in: ["ABERTO", "PARCIAL"] }, vencimento: { gte: de, lte: ate }, valor: { gte: valorAbs - 0.01, lte: valorAbs + 0.01 } },
        take: 5,
      });
      sugestoes = candidatos.map((c) => ({
        id: c.id,
        label: c.clienteNome,
        valor: Number(c.valor),
        vencimento: c.vencimento.toISOString(),
        tipo: "RECEBER" as const,
      }));
    }

    itensComSugestoes.push({ fitId: t.fitId, data: t.data.toISOString(), valor: t.valor, descricao: t.descricao, status: "pendente", sugestoes });
  }

  return { conciliacaoId: registro.id, itens: itensComSugestoes };
}

/** Concilia uma transação do extrato contra um título já existente — mesma regra de baixa, só
 * que com a data vinda do banco em vez de digitada à mão. */
export async function conciliarLancamentoOfx(formData: FormData) {
  const conciliacaoId = String(formData.get("conciliacaoId"));
  const fitId = String(formData.get("fitId"));
  const tipo = String(formData.get("tipo")) as "PAGAR" | "RECEBER";
  const contaId = String(formData.get("contaId"));
  const valorTransacao = Math.abs(Number(formData.get("valor")));
  const dataTransacao = new Date(String(formData.get("data")));

  if (tipo === "PAGAR") {
    const conta = await prisma.contaPagar.findUniqueOrThrow({ where: { id: contaId } });
    if (conta.status === "PAGO" || conta.status === "CANCELADO") throw new Error("Este título já está encerrado.");
    const novoValorPago = Number(conta.valorPago) + valorTransacao;
    if (novoValorPago + Number(conta.desconto) > Number(conta.valor) + 0.01) {
      throw new Error("Valor da transação é maior que o saldo deste título — confira a sugestão.");
    }
    await prisma.contaPagar.update({
      where: { id: contaId },
      data: { valorPago: novoValorPago, dataBaixa: dataTransacao, status: novoValorPago >= Number(conta.valor) - 0.01 ? "PAGO" : "PARCIAL" },
    });
    await atualizarItemConciliacao(conciliacaoId, fitId, { status: "conciliado", contaPagarId: contaId });
  } else {
    const conta = await prisma.contaReceber.findUniqueOrThrow({ where: { id: contaId } });
    if (conta.status === "PAGO" || conta.status === "CANCELADO") throw new Error("Este título já está encerrado.");
    const novoValorPago = Number(conta.valorPago) + valorTransacao;
    if (novoValorPago > Number(conta.valor) + 0.01) {
      throw new Error("Valor da transação é maior que o saldo deste título — confira a sugestão.");
    }
    await prisma.contaReceber.update({
      where: { id: contaId },
      data: { valorPago: novoValorPago, dataBaixa: dataTransacao, status: novoValorPago >= Number(conta.valor) - 0.01 ? "PAGO" : "PARCIAL" },
    });
    await atualizarItemConciliacao(conciliacaoId, fitId, { status: "conciliado", contaReceberId: contaId });
  }
  revalidatePath("/financeiro");
}

/** Transação do banco sem título correspondente (ex.: IOF, tarifa) — cria o título já como PAGO,
 * com a data do extrato como data de baixa (a saída/entrada já aconteceu de verdade no banco). */
export async function criarLancamentoConciliacaoOfx(formData: FormData) {
  const conciliacaoId = String(formData.get("conciliacaoId"));
  const fitId = String(formData.get("fitId"));
  const tipo = String(formData.get("tipo")) as "PAGAR" | "RECEBER";
  const descricao = String(formData.get("descricao") ?? "").trim() || "Lançamento da conciliação bancária";
  const valor = Math.abs(Number(formData.get("valor")));
  const dataTransacao = new Date(String(formData.get("data")));
  const planoContasId = optionalId(formData, "planoContasId");
  if (!valor) throw new Error("Valor inválido.");

  let novoId: string;
  if (tipo === "PAGAR") {
    const conta = await prisma.contaPagar.create({
      data: {
        descricao,
        valor,
        valorPago: valor,
        vencimento: dataTransacao,
        dataBaixa: dataTransacao,
        status: "PAGO",
        fornecedorId: optionalId(formData, "fornecedorId"),
        planoContasId,
      },
    });
    novoId = conta.id;
    await atualizarItemConciliacao(conciliacaoId, fitId, { status: "criado", contaPagarId: novoId });
  } else {
    const clienteNome = String(formData.get("clienteNome") ?? "").trim();
    if (!clienteNome) throw new Error("Informe o cliente.");
    const conta = await prisma.contaReceber.create({
      data: { descricao, clienteNome, valor, valorPago: valor, vencimento: dataTransacao, dataBaixa: dataTransacao, status: "PAGO", planoContasId },
    });
    novoId = conta.id;
    await atualizarItemConciliacao(conciliacaoId, fitId, { status: "criado", contaReceberId: novoId });
  }
  revalidatePath("/financeiro");
}

/** Ignora a transação — não é um lançamento que precisa entrar no sistema (ex.: transferência
 * entre contas da própria empresa). Fica registrada como decidida pra não voltar a aparecer. */
export async function arquivarItemConciliacaoOfx(formData: FormData) {
  const conciliacaoId = String(formData.get("conciliacaoId"));
  const fitId = String(formData.get("fitId"));
  await atualizarItemConciliacao(conciliacaoId, fitId, { status: "arquivado" });
  revalidatePath("/financeiro");
}
