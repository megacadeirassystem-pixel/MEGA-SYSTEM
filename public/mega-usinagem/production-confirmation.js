'use strict';

function initMegaProductionConfirmation(getPlan, report, stopModes) {
  const button = document.getElementById('nestingConfirmProduction');
  const enabled = new URLSearchParams(location.search).get('integrado') === '1';
  const key = 'mega.usinagem.producao.pendente.v2';
  const confirmed = new Set();
  let sending = false;
  let frozen = false;
  let pendingSheet = null;

  function pending() {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  }

  function refresh() {
    if (!enabled) return;
    button.hidden = false;
    try {
      const payload = pending();
      const { sheetIndex, items } = getPlan();
      button.disabled = sending || (!payload && (!items.length || confirmed.has(sheetIndex)));
      button.textContent = sending ? 'Gravando…' : payload ? 'Reenviar confirmação pendente' :
        confirmed.has(sheetIndex) ? 'Chapa confirmada' : 'OK · Confirmar chapa produzida';
    } catch {
      button.disabled = true;
      report('O navegador não permite guardar a confirmação de produção.', true);
    }
  }

  button.onclick = async () => {
    if (!enabled || sending) return;
    try {
      let payload = pending();
      if (!payload) {
        const { stock, sheetIndex, items, tap } = getPlan();
        if (!stock || !items.length || confirmed.has(sheetIndex)) return;
        const drawings = new Map();
        for (const item of items) {
          const piecesPerCopy = item.cuts.paths.filter(path => path.operation === 'macho').length;
          if (!item.productionRef?.sourceFile || !item.productionRef.name || !piecesPerCopy ||
              item.cuts.unclosed || item.cuts.errors.length ||
              item.cuts.paths.some(path => !nestingCutFits(item, path, stock))) {
            return report('Todos os desenhos da chapa precisam de arquivo de origem e corte externo válido.', true);
          }
          const ref = item.productionRef;
          const id = JSON.stringify([ref.importId, ref.savedAt, ref.sourceFile, ref.name, piecesPerCopy]);
          if (!drawings.has(id)) drawings.set(id, { ...ref, piecesPerCopy, copies: 0 });
          drawings.get(id).copies++;
        }
        const summary = [...drawings.values()].map(row => row.name + ' · ' + (row.copies * row.piecesPerCopy) + ' peça(s)');
        if (!confirm('Confirmar que a chapa foi cortada por completo e que todas as peças abaixo foram produzidas?\n\n' +
          summary.join('\n'))) return;
        payload = {
          cycleId: crypto.randomUUID(),
          sheetNumber: sheetIndex + 1,
          stock,
          tap: tap(),
          drawings: [...drawings.values()],
        };
        localStorage.setItem(key, JSON.stringify(payload));
        pendingSheet = sheetIndex;
        frozen = true;
        stopModes();
      }
      sending = true;
      refresh();
      const response = await fetch('/api/usinagem/ciclos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Confirmação não registrada.');
      if (pendingSheet !== null) confirmed.add(pendingSheet);
      localStorage.removeItem(key);
      pendingSheet = null;
      report('Chapa confirmada. Entrada das peças e baixa da chapa registradas.');
    } catch (error) {
      report('Confirmação pendente. ' + error.message, true);
    } finally {
      sending = false;
      refresh();
    }
  };

  return { refresh, locked: () => frozen };
}
