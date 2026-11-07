// OFX 1.x é SGML, não XML: as tags de transação não fecham (<TRNAMT>-860.42 sem </TRNAMT>),
// então não dá pra usar um parser de XML — extrai cada bloco <STMTTRN>...</STMTTRN> e lê os
// campos com regex. Formato padrão exportado pelo internet banking de praticamente todo banco.

export interface TransacaoOfx {
  /** Id único da transação dado pelo banco — usado pra não conciliar a mesma linha duas vezes. */
  fitId: string;
  data: Date;
  /** Positivo = dinheiro entrando (conta a receber); negativo = saindo (conta a pagar). */
  valor: number;
  descricao: string;
}

function extrairTag(bloco: string, tag: string): string | null {
  const m = bloco.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  return m ? m[1].trim() : null;
}

/** "20260923120000[-3:BRT]" ou "20260923" -> Date (assume horário de Brasília se não vier fuso). */
function parseDataOfx(raw: string): Date | null {
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, ano, mes, dia] = m;
  return new Date(`${ano}-${mes}-${dia}T12:00:00-03:00`);
}

export function parseOfx(conteudo: string): TransacaoOfx[] {
  const blocos = conteudo.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const transacoes: TransacaoOfx[] = [];

  for (const bloco of blocos) {
    const fitId = extrairTag(bloco, "FITID");
    const dtPosted = extrairTag(bloco, "DTPOSTED");
    const trnAmt = extrairTag(bloco, "TRNAMT");
    const memo = extrairTag(bloco, "MEMO") ?? extrairTag(bloco, "NAME") ?? "";
    if (!fitId || !dtPosted || !trnAmt) continue;

    const data = parseDataOfx(dtPosted);
    const valor = Number(trnAmt);
    if (!data || !Number.isFinite(valor) || valor === 0) continue;

    transacoes.push({ fitId, data, valor, descricao: memo });
  }

  return transacoes;
}
