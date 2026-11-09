'use strict';

function createNestingTap(items, stock, machine, thickness) {
  if (!stock || !items.length) throw Error('Insira os desenhos na chapa antes de gerar o TAP.');
  if (items.some(item => !item.cuts.paths.length || item.cuts.unclosed || item.cuts.errors.length)) {
    throw Error('Corrija os caminhos incompletos da chapa antes de gerar o TAP.');
  }
  const paths = items.flatMap(item => item.cuts.paths);
  const tools = new Set(paths.map(path => path.tool?.id + '|' + path.diameter));
  if (tools.size !== 1 || paths.some(path => !path.tool?.id)) throw Error('O TAP da chapa exige uma única fresa configurada.');
  if (paths.some(path => !Number.isFinite(path.rpm) || path.rpm < 1 || !Number.isFinite(path.tool.height) || path.depth > path.tool.height)) {
    throw Error('Revise a rotação e a altura útil da fresa antes de gerar o TAP.');
  }
  const fixed = value => value.toFixed(3);
  const xy = ([x, y]) => 'X' + fixed(x) + 'Y' + fixed(y);
  const lines = ['T1M6', 'G17', 'G21', 'G90', 'G0Z' + fixed(machine.safeZ)];
  let position = [0, 0], rpm = null, seconds = 0;
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  let pieces = 0;
  for (const operation of ['femea', 'macho']) for (const item of items) {
    const ordered = item.cuts.paths.filter(path => path.operation === operation);
    const startIndex = ordered.indexOf(item.cutStart?.path);
    if (startIndex > 0) ordered.unshift(...ordered.splice(startIndex, 1));
    for (const path of ordered) {
      if (!nestingCutFits(item, path, stock) || path.depth < .001 || path.depth > thickness) {
        throw Error('Há um caminho fora da chapa ou com profundidade inválida.');
      }
      if (operation === 'macho') pieces++;
      const runs = nestingOrderedRuns(path, item.cutStart).filter(run => run.length > 1)
        .map(run => run.map(([x, y]) => {
          const [sheetX, sheetY] = nestingPoint(item, x, -y);
          return [sheetX, -sheetY];
        }));
      if (!runs.length) throw Error('Um caminho não contém trechos válidos para corte.');
      const speed = Math.round(path.rpm);
      if (rpm !== speed) {
        lines.push('S' + speed + 'M3');
        rpm = speed;
      }
      for (const run of runs) {
        lines.push('G0' + xy(run[0]), 'G1Z-' + fixed(path.depth) + 'F' + (path.z * 60).toFixed(1));
        seconds += distance(position, run[0]) / machine.rapid + path.depth / path.z;
        position = run[0];
        for (const point of run.slice(1)) {
          if (lines.length >= 500000) throw Error('O TAP excedeu o limite de 500 mil linhas.');
          lines.push('G1' + xy(point) + 'F' + (path.xy * 60).toFixed(1));
          seconds += distance(position, point) / path.xy;
          position = point;
        }
        lines.push('G0Z' + fixed(machine.safeZ));
      }
    }
  }
  if (!pieces) throw Error('Configure o corte externo das peças antes de gerar o TAP.');
  seconds += distance(position, [0, 0]) / machine.rapid;
  lines.push('M5', 'G0X0.000Y0.000', 'M30');
  return { content: lines.join('\r\n') + '\r\n', pieces, seconds: Math.round(seconds * 1000) / 1000 };
}

function initNestingTap(machine, getPlan, feedback, stockThickness) {
  const $ = id => document.getElementById(id);
  const name = $('nestingTapName');
  const historyKey = 'nestingTapHistory';
  const settings = [];
  const history = MegaStore.readSetting(historyKey, []);
  let visibleSheet = 0;
  let records = Array.isArray(history) ? history : [];

  function baseName({ items, sheetIndex, sheetCount, selectedName }) {
    const names = [...new Set(items.map(item => item.name))];
    const title = names.length > 1 ? 'CHAPA MISTA' : names[0] || selectedName || '';
    if (!title) return '';
    const safe = title.trim().replace(/\.tap$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 104);
    return sheetCount > 1 || names.length > 1 ? safe + ' - CHAPA ' + (sheetIndex + 1) : safe;
  }

  function currentFile() {
    const plan = getPlan();
    const fileName = baseName(plan);
    if (!fileName) throw Error('Insira um desenho salvo para nomear o TAP.');
    const tap = createNestingTap(plan.items, plan.stock, machine, stockThickness());
    return { ...tap, fileName: fileName + '.tap', sheetNumber: plan.sheetIndex + 1 };
  }

  let saving = false;

  function refresh() {
    const plan = getPlan();
    visibleSheet = plan.sheetIndex;
    const saved = settings[visibleSheet];
    name.value = baseName(plan);
    $('nestingDownloadTap').disabled = !plan.items.length;
    $('nestingSaveTap').disabled = saving || !plan.items.length;
    $('nestingTapInfo').textContent = saved?.fileName === name.value + '.tap' ? saved.summary : '';
  }

  function summarize(tap) {
    const total = Math.round(tap.seconds);
    const time = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
      .map(value => String(value).padStart(2, '0')).join(':');
    return tap.pieces + ' peça(s) · tempo total estimado ' + time;
  }

  function downloadFile(tap) {
    const url = URL.createObjectURL(new Blob([tap.content], { type: 'text/plain;charset=us-ascii' }));
    const download = document.createElement('a');
    download.href = url;
    download.download = tap.fileName;
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  $('nestingSaveTap').onclick = async () => {
    if (saving) return;
    try {
      const tap = currentFile();
      const index = visibleSheet;
      const items = getPlan().items;
      let record = { ...tap, savedAt: new Date().toISOString() };
      saving = true;
      $('nestingSaveTap').disabled = true;
      try {
        record = await MegaStore.saveTap(record);
      } catch (error) {
        if (error.code !== 'TAP_NAME_EXISTS') throw error;
        if (!confirm('Já existe o arquivo "' + tap.fileName + '". Deseja substituí-lo?')) {
          feedback('O TAP salvo foi mantido.');
          return;
        }
        record = await MegaStore.saveTap(record, true);
      }
      if (visibleSheet === index && getPlan().items === items) {
        settings[index] = { ...record, summary: 'TAP salvo. ' + summarize(tap) };
      }
      feedback('TAP salvo. Abra TAPs salvos para consultá-lo ou baixar depois.');
    } catch (error) {
      feedback(error.message, true);
    } finally {
      saving = false;
      refresh();
    }
  };

  $('nestingDownloadTap').onclick = () => {
    try {
      const tap = currentFile();
      const { content, ...metadata } = tap;
      const next = [...records, { ...metadata, exportedAt: new Date().toISOString() }];
      MegaStore.writeSetting(historyKey, next);
      records = next;
      downloadFile(tap);
      const previous = settings[visibleSheet];
      const id = previous?.fileName === tap.fileName && previous.content === content ? previous.id : undefined;
      settings[visibleSheet] = { fileName: tap.fileName, content, id, summary: summarize(tap) };
      refresh();
      feedback('TAP gerado. Quantidade e tempo registrados.');
    } catch (error) {
      feedback(error.message, true);
    }
  };

  async function showSavedTaps() {
    const dialog = $('nestingSavedTaps');
    const list = $('nestingSavedTapList');
    const details = $('nestingSavedTapDetails');
    details.hidden = true;
    $('nestingSavedTapContent').value = '';
    $('nestingSavedTapDownload').onclick = null;
    list.textContent = 'Carregando TAPs…';
    if (!dialog.open) dialog.showModal();
    try {
      const taps = await MegaStore.listTaps();
      if (!dialog.open) return;
      list.textContent = taps.length ? '' : 'Nenhum TAP salvo neste navegador.';
      for (const tap of taps) {
        const row = document.createElement('div');
        row.className = 'saved-row';
        const label = document.createElement('span');
        label.textContent = tap.fileName + ' · ' + new Date(tap.savedAt).toLocaleString('pt-BR');
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Abrir';
        open.onclick = () => {
          $('nestingSavedTapSummary').textContent = tap.fileName + ' · ' + summarize(tap);
          $('nestingSavedTapContent').value = tap.content;
          $('nestingSavedTapDownload').onclick = () => downloadFile(tap);
          details.hidden = false;
        };
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Apagar';
        remove.setAttribute('aria-label', 'Apagar ' + tap.fileName);
        remove.onclick = async () => {
          if (!confirm('Apagar o arquivo "' + tap.fileName + '" dos TAPs salvos?')) return;
          remove.disabled = true;
          try {
            await MegaStore.deleteTap(tap.id);
            if (dialog.open) await showSavedTaps();
            feedback('TAP apagado.');
          } catch (error) {
            list.textContent = error.message;
          } finally {
            remove.disabled = false;
          }
        };
        const actions = document.createElement('div');
        actions.className = 'toolbar';
        actions.append(open, remove);
        row.append(label, actions);
        list.append(row);
      }
    } catch (error) {
      list.textContent = error.message;
    }
  }
  $('nestingOpenTaps').onclick = showSavedTaps;

  return {
    refresh,
    removeSheet(index) { settings.splice(index, 1); },
    metadata() {
      const tap = currentFile();
      if (settings[visibleSheet]?.content !== tap.content || settings[visibleSheet]?.fileName !== tap.fileName) throw Error('Salve ou baixe o TAP atualizado antes de confirmar a chapa.');
      return { fileName: tap.fileName, pieces: tap.pieces, seconds: tap.seconds };
    },
  };
}
