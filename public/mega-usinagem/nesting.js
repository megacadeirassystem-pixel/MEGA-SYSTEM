'use strict';

function initMegaNesting(machine, snapshotEntities, pointPath, findTool, activeToolId, prepareCuts, stockThickness) {
  const $ = id => document.getElementById(id);
  const svg = $('nestingDrawing');
  const insertForm = $('nestingInsertForm');
  const picker = $('nestingImport');
  const fill = $('nestingFill');
  const maxBatch = 500;
  const submit = insertForm.querySelector('button[type="submit"]');
  const sheetPicker = $('nestingSheet');
  const sheets = [[]];
  const tapFiles = initNestingTap(machine, () => ({ stock, sheetIndex: activeSheet, items: sheets[activeSheet], sheetCount: sheets.length, selectedName: drawing?.name }), feedback, stockThickness);
  const sharedBridges = [];
  const production = initMegaProductionConfirmation(() => ({ stock, sheetIndex: activeSheet, items: sheets[activeSheet], tap: tapFiles.metadata }), feedback, () => setMode(null));
  function canChangePlan() {
    if (!production.locked()) return true;
    feedback('O plano está fechado para produção. Reabra o módulo para montar um novo plano.', true);
    return false;
  }
  const EPS = 1e-7;
  let records = new Map();
  let stock = null;
  let activeSheet = 0;
  let drawing = null;
  let drag = null;
  let libraryRequest = 0;
  let view, pan, mode;
  let orderIndex = 0;
  let cutView = false;
  const simulation = initNestingSimulation(svg, machine, svgElement);

  const fmt = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  $('stockX').max = machine.tableX;
  $('stockY').max = machine.tableY;
  $('stockX').value = machine.tableX;
  $('stockY').value = Math.min(2750, machine.tableY);
  $('nestingTableLimit').textContent = `Limite da mesa: X ${fmt(machine.tableX)} × Y ${fmt(machine.tableY)} mm.`;

  function feedback(message, error = false) {
    const status = $('nestingStatus');
    status.textContent = message;
    status.style.color = error ? '#b42318' : '';
  }

  function svgElement(tag, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  const edgeMargin = diameter => 2 * diameter;

  function fits(item, size) {
    const { x, y, width, height, diameter } = item;
    const margin = edgeMargin(diameter);
    return x >= margin - EPS && y >= margin - EPS &&
      x + width + margin <= size.x + EPS && y + height + margin <= size.y + EPS;
  }

  function conflicts(a, b) {
    const gap = Math.max(a.diameter, b.diameter);
    return a.x + a.width + gap > b.x + EPS && b.x + b.width + gap > a.x + EPS &&
      a.y + a.height + gap > b.y + EPS && b.y + b.height + gap > a.y + EPS;
  }

  function unsafe(a, b) {
    return conflicts(a, b) || nestingBridgeConflict(a, b) || nestingBridgeConflict(b, a);
  }

  function updatePosition(element, item) {
    const origin = nestingPoint(item, 0, 0);
    element.setAttribute('transform', 'matrix(' + [...item.matrix, ...origin].join(' ') + ')');
  }

  function setView(next) {
    view = next;
    svg.setAttribute('viewBox', next.join(' '));
  }

  function fitView() {
    const pad = Math.max(stock.x, stock.y) * .04;
    setView([-pad, -stock.y - pad, stock.x + 2 * pad, stock.y + 2 * pad]);
  }

  function setMode(next) {
    mode = next;
    orderIndex = 0;
    $('nestingStart').setAttribute('aria-pressed', String(next === 'start'));
    $('nestingOrder').setAttribute('aria-pressed', String(next === 'order'));
    $('nestingBridge').setAttribute('aria-pressed', String(next === 'bridge'));
    $('nestingBridge').textContent = next === 'bridge' ? 'Concluir pontes' : 'Marcar ponte entre peças';
  }

  function showSheet() {
    sheetPicker.replaceChildren(...sheets.map((items, index) =>
      new Option(`Chapa ${index + 1} de ${sheets.length} · ${items.length} desenho(s)`, String(index))));
    sheetPicker.value = String(activeSheet);
    tapFiles.refresh();
    if (!view) fitView();
    svg.replaceChildren(svgElement('rect', {
      class: 'nesting-stock', x: 0, y: -stock.y, width: stock.x, height: stock.y,
    }));
    const list = $('nestingItems');
    list.replaceChildren();
    const items = sheets[activeSheet];
    $('nestingUndoBridge').disabled = !sharedBridges.some(bridge => items.includes(bridge.entries[0].item));
    for (const item of items) {
      const group = svgElement('g', { class: 'nesting-item' });
      group.append(svgElement('path', { d: item.path }));
      updatePosition(group, item);
      group.onclick = event => {
        if (mode === 'start') {
          const point = localPoint(event);
          if (!point) return;
          const [ox, oy] = nestingPoint(item, 0, 0);
          const [a,b,c,d] = item.matrix;
          const x = point.x - ox, y = point.y - oy;
          const start = selectNestingCutStart(item, [a*x + b*y, -(c*x + d*y)], stock);
          if (!start) return feedback('Escolha uma peça com corte externo válido dentro da chapa.', true);
          item.cutStart = start;
          setMode(null);
          showSheet();
          feedback('Início do corte externo definido.');
        } else if (mode === 'order') {
          const index = items.indexOf(item);
          if (index < orderIndex) return;
          items.splice(index, 1);
          items.splice(orderIndex++, 0, item);
          if (orderIndex === items.length) setMode(null);
          showSheet();
          feedback('Ordem atualizada dentro de cada tipo de operação.');
        }
      };
      group.onpointerdown = event => {
        if (event.button !== 0 || drag || mode || !canChangePlan()) return;
        if (item.sharedBridgeCount) {
          return feedback('Desfaça as pontes entre peças antes de mover este desenho.', true);
        }
        const point = localPoint(event);
        if (!point) return;
        svg.setPointerCapture(event.pointerId);
        drag = { id: event.pointerId, item, group, point, x: item.x, y: item.y };
      };
      svg.append(group);
    }
    const drawings = new Map();
    for (const item of items) {
      if (!drawings.has(item.drawingKey)) drawings.set(item.drawingKey, []);
      drawings.get(item.drawingKey).push(item);
    }
    for (const copies of drawings.values()) {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = copies[0].name;
      const quantity = document.createElement('input');
      quantity.type = 'number';
      quantity.min = '0';
      quantity.max = String(copies.length + maxBatch);
      quantity.step = '1';
      quantity.value = copies.length;
      quantity.setAttribute('aria-label', 'Quantidade de ' + copies[0].name + ' nesta chapa');
      quantity.onchange = () => {
        const desired = quantity.valueAsNumber;
        quantity.value = copies.length;
        if (!canChangePlan()) return;
        changeSheetQuantity(copies, desired);
      };
      row.append(label, quantity);
      list.append(row);
    }
    const placed = sheets.flat();
    const boundsArea = placed.reduce((area, item) => area + item.width * item.height, 0);
    const summary = $('nestingSummary');
    summary.replaceChildren();
    for (const [label, value] of [
      ['Chapas necessárias', placed.length ? sheets.length : 0],
      ['Ocupação pelas dimensões externas', fmt(boundsArea / (stock.x * stock.y * sheets.length) * 100) + '%'],
      ['Desenhos posicionados', placed.length],
    ]) {
      const cell = document.createElement('div');
      const strong = document.createElement('strong');
      cell.textContent = label;
      strong.textContent = value;
      cell.append(strong);
      summary.append(cell);
    }
    simulation.draw(items, $('nestingShowPaths').checked, cutView, stock);
    production.refresh();
  }

  sheetPicker.onchange = () => {
    setMode(null);
    activeSheet = Number(sheetPicker.value);
    showSheet();
  };

  async function loadLibrary() {
    const request = ++libraryRequest;
    drawing = null;
    $('nestingToolInfo').textContent = '';
    picker.replaceChildren(new Option('Carregando desenhos…', ''));
    picker.disabled = submit.disabled = fill.disabled = true;
    try {
      const saved = await MegaStore.listImports();
      if (request !== libraryRequest) return;
      records = new Map(saved.map(record => [String(record.id), record]));
      picker.replaceChildren(new Option(saved.length ? 'Escolha um desenho…' : 'Nenhum desenho salvo', ''));
      for (const record of saved) picker.add(new Option(record.name || record.sourceFile, String(record.id)));
      picker.disabled = !saved.length;
    } catch (error) {
      if (request !== libraryRequest) return;
      picker.replaceChildren(new Option('Biblioteca indisponível', ''));
      feedback(`Não foi possível listar os desenhos salvos. ${error.message}`, true);
    }
  }

  function showNesting(show) {
    $('machiningPage').hidden = show;
    $('nestingPage').hidden = !show;
    $('localPageTitle').textContent = show ? 'Nesting' : 'Usinagem';
    (show ? (stock ? $('backToMachining') : $('stockX')) : $('openNesting')).focus();
    if (show) { loadLibrary(); production.refresh(); }
    else simulation.stop();
  }
  $('openNesting').onclick = () => showNesting(true);
  $('backToMachining').onclick = () => showNesting(false);

  $('stockForm').onsubmit = event => {
    event.preventDefault();
    if (!canChangePlan()) return;
    const next = { x: $('stockX').valueAsNumber, y: $('stockY').valueAsNumber };
    if (!Number.isFinite(next.x) || !Number.isFinite(next.y) ||
        next.x < .01 || next.y < .01 || next.x > machine.tableX || next.y > machine.tableY) {
      feedback('Informe dimensões positivas dentro dos limites da mesa.', true);
      return;
    }
    if (sheets.some(items => items.some(item => !fits(item, next)))) {
      feedback('Alguns desenhos perderiam a margem da fresa. Reposicione ou retire esses desenhos antes de reduzir as dimensões.', true);
      return;
    }
    stock = next;
    svg.removeAttribute('hidden');
    insertForm.hidden = $('nestingSheetControl').hidden = false;
    $('nestingToolbar').hidden = $('nestingSummary').hidden = $('nestingSimulation').hidden = false;
    fitView();
    $('nestingHint').textContent = `X ${fmt(stock.x)} × Y ${fmt(stock.y)} mm. Arraste pelo contorno para reposicionar. Use a rolagem para zoom e o botão central para mover a vista.`;
    showSheet();
    feedback('Dimensões da madeira aplicadas.');
  };

  picker.onchange = () => {
    drawing = null;
    tapFiles.refresh();
    submit.disabled = fill.disabled = true;
    const info = $('nestingToolInfo');
    info.textContent = '';
    const record = records.get(picker.value);
    if (!record) return;
    try {
      const paths = snapshotEntities(record).filter(entity => !entity.deleted && entity.points.length > 1);
      if (!paths.length) throw Error('Este desenho salvo não contém linhas para inserir.');
      const externalCuts = paths.filter(entity => entity.op === 'macho');
      const toolPaths = externalCuts.length ? externalCuts : paths.filter(entity => entity.op);
      const activeTool = findTool(activeToolId());
      const diameters = toolPaths.length
        ? toolPaths.map(entity => (entity.toolSnapshot || findTool(entity.toolId) || activeTool)?.diameter)
        : [activeTool?.diameter];
      if (diameters.some(diameter => !Number.isFinite(diameter) || diameter <= 0)) {
        throw Error('Selecione uma fresa válida na tela de Usinagem.');
      }
      const diameter = Math.max(...diameters);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const entity of paths) for (const [x, y] of entity.points) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      const cuts = prepareCuts(record, paths);
      const bridgeCount = paths.reduce((sum, entity) => sum + (entity.bridges?.length || 0), 0);
      if (bridgeCount > cuts.paths.reduce((sum, path) => sum + path.bridgeCount, 0)) {
        throw Error('Corrija os caminhos com pontes na Usinagem antes de inserir este desenho.');
      }
      drawing = {
        name: record.name || record.sourceFile, path: paths.map(pointPath).join(' '),
        minX, minY, maxX, maxY, diameter, cuts,
        drawingKey: JSON.stringify([record.id, record.savedAt]), baseCuts: cuts,
        productionRef: { importId: record.id, savedAt: record.savedAt, sourceFile: record.sourceFile, name: record.name },
      };
      info.textContent = `Fresa de referência Ø${fmt(diameter)} mm. Margem da borda de ${fmt(edgeMargin(diameter))} mm.`;
      tapFiles.refresh();
      submit.disabled = fill.disabled = false;
    } catch (error) {
      info.textContent = error.message;
    }
  };

  function initialPosition(item, items, extraGap = 0) {
    const margin = edgeMargin(item.diameter);
    const ys = new Set([margin]);
    for (const other of items) {
      const gap = Math.max(item.diameter, other.diameter) + extraGap;
      ys.add(Math.max(margin, other.y + other.height + gap));
    }
    for (const y of [...ys].sort((a, b) => a - b)) {
      if (y + item.height + margin > stock.y + EPS) break;
      let x = margin;
      // On this row each neighboring drawing blocks an interval of candidate X positions.
      const blocked = [];
      for (const other of items) {
        const gap = Math.max(item.diameter, other.diameter) + extraGap;
        if (y + item.height + gap <= other.y + EPS || other.y + other.height + gap <= y + EPS) continue;
        blocked.push([other.x - item.width - gap, other.x + other.width + gap]);
      }
      blocked.sort(([leftA], [leftB]) => leftA - leftB);
      for (const [left, right] of blocked) {
        if (x <= left + EPS) break;
        x = Math.max(x, right);
      }
      const candidate = { ...item, x, y };
      if (fits(candidate, stock) && !items.some(other => unsafe(candidate, other))) return { x, y };
    }
    if (!extraGap && items.some(other => other.bridges.length || item.bridges.length)) {
      return initialPosition(item, items, Math.max(item.diameter, ...items.map(other => other.diameter)));
    }
    return null;
  }

  function planCopies(orientations, quantity, strategy, currentSheetOnly = false) {
    const plan = (currentSheetOnly ? [sheets[activeSheet]] : sheets).map(items => items.slice());
    const lastAllowedSheet = currentSheetOnly ? 0 : Infinity;
    let lastSheet = 0;
    for (let copy = 0; copy < quantity; copy++) {
      let placement = null;
      const preferred = strategy === 'alternar' ? copy % 2 : strategy === 'girar' ? 1 : 0;
      const order = preferred ? orientations.slice().reverse() : orientations;
      for (; lastSheet <= plan.length && lastSheet <= lastAllowedSheet; lastSheet++) {
        const items = plan[lastSheet] || [];
        for (const shape of order) {
          const position = initialPosition(shape, items);
          if (!position) continue;
          const candidate = { ...shape, ...position };
          if (!placement || candidate.y + candidate.height < placement.y + placement.height - EPS) {
            placement = candidate;
          }
          if (strategy !== 'compactar') break;
        }
        if (placement) break;
      }
      if (!placement) break;
      if (!plan[lastSheet]) plan.push([]);
      plan[lastSheet].push(placement);
    }
    return { plan, lastSheet };
  }

  insertForm.onsubmit = event => {
    event.preventDefault();
    if (!canChangePlan()) return;
    const quantity = $('nestingQuantity').valueAsNumber;
    if (!stock || !drawing || !Number.isInteger(quantity) || quantity < 1 || quantity > maxBatch) return;
    const orientations = availableOrientations(drawing).filter(shape => initialPosition(shape, []));
    if (!orientations.length) {
      feedback('O desenho não cabe na chapa com a margem exigida pela fresa.', true);
      return;
    }

    const previousSheetCount = sheets.length;
    const strategies = orientations.length === 1
      ? ['original'] : ['original', 'girar', 'alternar', 'compactar'];
    let best = null;
    for (const strategy of strategies) {
      const result = planCopies(orientations, quantity, strategy);
      if (!best || result.plan.length < best.plan.length) best = result;
    }
    sheets.splice(0, sheets.length, ...best.plan);
    activeSheet = best.lastSheet;
    showSheet();
    const extra = sheets.length - previousSheetCount;
    feedback(quantity + ' cópia(s) inserida(s).' + (extra ? ' ' + extra + ' chapa(s) adicional(is) criada(s).' : ''));
  };

  fill.onclick = () => {
    if (!canChangePlan()) return;
    if (!stock || !drawing) return;
    const current = sheets[activeSheet];
    const orientations = availableOrientations(drawing).filter(shape => initialPosition(shape, []));
    if (!orientations.length) {
      feedback('O desenho não cabe na chapa com a margem exigida pela fresa.', true);
      return;
    }

    let best = current;
    for (const [index, first] of orientations.entries()) {
      const ordered = [first, ...orientations.filter((_, other) => other !== index)];
      const { plan: [candidate] } = planCopies(ordered, maxBatch, 'original', true);
      if (candidate.length > best.length) best = candidate;
      if (best.length - current.length === maxBatch) break;
    }
    if (best.length - current.length < maxBatch) {
      const { plan: [candidate] } = planCopies(orientations, maxBatch, 'compactar', true);
      if (candidate.length > best.length) best = candidate;
    }

    const added = best.length - current.length;
    if (!added) {
      feedback('Não foi encontrado espaço para outra cópia nesta chapa.');
      return;
    }
    sheets[activeSheet] = best;
    setMode(null);
    showSheet();
    feedback(added === maxBatch
      ? '500 cópias adicionadas. Use Preencher chapa novamente para ocupar o espaço restante.'
      : 'Chapa preenchida com ' + added + ' cópia(s) adicional(is).');
  };

  function changeSheetQuantity(copies, desired) {
    const delta = desired - copies.length;
    if (!Number.isInteger(desired) || desired < 0 || delta > maxBatch) {
      return feedback('Informe uma quantidade inteira válida para esta chapa.', true);
    }
    if (!delta) return;
    const current = sheets[activeSheet];
    if (delta < 0) {
      const removable = copies.filter(item => !item.sharedBridgeCount).reverse().slice(0, -delta);
      if (removable.length < -delta) {
        return feedback('Desfaça as pontes entre peças antes de reduzir para essa quantidade.', true);
      }
      const removed = new Set(removable);
      sheets[activeSheet] = current.filter(item => !removed.has(item));
      if (!sheets[activeSheet].length && sheets.length > 1) {
        sheets.splice(activeSheet, 1);
        tapFiles.removeSheet(activeSheet);
        activeSheet = Math.min(activeSheet, sheets.length - 1);
      }
    } else {
      const original = copies[0];
      const drawing = { ...original, cuts: original.baseCuts, cutStart: null, sharedBridgeCount: 0 };
      const variants = availableOrientations(drawing).filter(shape => initialPosition(shape, []));
      const orders = variants.map((shape, index) => [shape, ...variants.filter((_, other) => index !== other)]);
      const candidates = [
        () => planCopies(variants, delta, 'compactar', true),
        ...orders.map(order => () => planCopies(order, delta, 'original', true)),
      ];
      let next;
      for (const plan of candidates) {
        const [items] = plan().plan;
        if (items.length === current.length + delta) { next = items; break; }
      }
      if (!next) return feedback('Não há espaço para essa quantidade na chapa exibida.', true);
      sheets[activeSheet] = next;
    }
    setMode(null);
    showSheet();
    feedback('Quantidade atualizada para ' + desired + ' na chapa.');
  }

  function availableOrientations(item) {
    return [false, true].flatMap(mirror => [0,90,180,270].map(angle => orientNestingItem(item, angle, mirror)));
  }

  function makeSharedBridge(bridge, width) {
    const edits = bridge.sides.map(side => interruptSharedNestingCut(side, bridge.half, width));
    const entries = bridge.sides.map(({ item }) => ({ item, before: { ...item } }));
    const marks = edits.flatMap(({ protectedShape }) => protectedShape.bridges.map(segment => ({
      from: [segment.from[0] + protectedShape.x, segment.from[1] - protectedShape.y],
      to: [segment.to[0] + protectedShape.x, segment.to[1] - protectedShape.y],
    })));
    return { edits, entries, marks };
  }

  function bridgeEditsAreSafe(items, edits) {
    return edits.every(({ result, protectedShape }) =>
      !items.some(other => nestingBridgeConflict(protectedShape, other)) &&
      !items.some(other => other !== result && unsafe(result, other)));
  }

  function applyBridgeEdits({ edits, entries }) {
    for (const [index, { item }] of entries.entries()) {
      const { result } = edits[index];
      const count = item.sharedBridgeCount || 0;
      Object.assign(item, result, { sharedBridgeCount: count + 1 });
    }
  }

  function removeSharedBridge(target) {
    const items = sheets[activeSheet];
    const history = sharedBridges.filter(bridge => items.includes(bridge.entries[0].item));
    const drafts = new Map();
    for (const bridge of history) for (const { item, before } of bridge.entries) {
      if (!drafts.has(item)) drafts.set(item, { ...before, sharedBridgeCount: 0, cutStart: item.cutStart });
    }

    const remaining = [];
    for (const bridge of history) {
      if (bridge === target) continue;
      const pair = bridge.entries.map(({ item }) => drafts.get(item));
      const found = findSharedNestingBridge(pair, bridge.point, bridge.width, bridge.tolerance, bridge.centerOnly);
      if (!found) return feedback('Não foi possível preservar as outras pontes. Nenhuma ponte foi removida.', true);
      const changes = makeSharedBridge(found, bridge.width);
      const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < .02;
      const sameMarks = bridge.marks.length === changes.marks.length && bridge.marks.every(mark =>
        changes.marks.some(next => (close(mark.from, next.from) && close(mark.to, next.to)) ||
          (close(mark.from, next.to) && close(mark.to, next.from))));
      if (!sameMarks) return feedback('Não foi possível preservar a posição das outras pontes.', true);
      applyBridgeEdits(changes);
      const originalByDraft = new Map([...drafts].map(([item, draft]) => [draft, item]));
      const entries = changes.entries.map(({ item, before }) => ({ item: originalByDraft.get(item), before }));
      remaining.push({ original: bridge, entries, edits: changes.edits, marks: changes.marks });
    }

    const nextItems = items.map(item => drafts.get(item) || item);
    if ([...drafts.values()].some(draft => nextItems.some(other => draft !== other && unsafe(draft, other))) ||
        remaining.some(bridge => bridge.edits.some(({ protectedShape }) =>
          nextItems.some(other => nestingBridgeConflict(protectedShape, other))))) {
      return feedback('Um corte restaurado atingiria uma ponte restante. Nenhuma ponte foi removida.', true);
    }

    for (const [item, draft] of drafts) {
      if (!draft.cuts.paths.includes(draft.cutStart?.path)) draft.cutStart = null;
      Object.assign(item, draft);
    }
    for (const bridge of remaining) Object.assign(bridge.original, { entries: bridge.entries, marks: bridge.marks });
    sharedBridges.splice(sharedBridges.indexOf(target), 1);
    showSheet();
    feedback('Ponte removida. O corte foi restaurado nesse ponto.');
  }

  function addSharedBridge(items, bridge, point, width, tolerance, centerOnly = false) {
    const changes = makeSharedBridge(bridge, width);
    const replacements = new Map(changes.entries.map(({ item }, index) => [item, changes.edits[index].result]));
    if (!bridgeEditsAreSafe(items.map(item => replacements.get(item) || item), changes.edits)) return false;
    applyBridgeEdits(changes);
    sharedBridges.push({ entries: changes.entries, marks: changes.marks, point, width, tolerance, centerOnly });
    return true;
  }

  $('nestingAutoBridges').onclick = () => {
    if (!canChangePlan()) return;
    const width = $('nestingBridgeWidth').valueAsNumber;
    if (!Number.isFinite(width) || width < .01) return feedback('Informe uma largura de ponte válida.', true);
    const items = sheets[activeSheet];
    const centers = automaticNestingBridgeCenters(items, width);
    let added = 0;
    for (const { pair, point, tolerance } of centers) {
      const bridge = findSharedNestingBridge(pair, point, width, tolerance, true);
      if (bridge && addSharedBridge(items, bridge, point, width, tolerance, true)) added++;
    }
    setMode('bridge');
    showSheet();
    feedback((added ? added + ' ponte(s) criada(s) no centro das emendas.' : 'Nenhuma ponte nova coube no centro das emendas.') +
      ' Clique para adicionar ou use Ctrl + clique para remover.');
  };

  $('nestingBridge').onclick = () => {
    if (!canChangePlan()) return;
    setMode(mode === 'bridge' ? null : 'bridge');
    feedback(mode ? 'Clique entre os cortes para marcar. Ctrl + clique no dourado remove a ponte.' : 'Marcação de pontes concluída.');
  };

  svg.addEventListener('click', event => {
    if (mode !== 'bridge') return;
    const point = localPoint(event);
    const offset = localPoint({ clientX: event.clientX + (event.ctrlKey ? 7 : 12), clientY: event.clientY });
    if (!point || !offset) return;
    const items = sheets[activeSheet];
    const tolerance = Math.hypot(offset.x - point.x, offset.y - point.y);
    if (event.ctrlKey) {
      let target, nearest = tolerance;
      const cursor = [point.x, point.y];
      for (const bridge of sharedBridges) {
        if (!items.includes(bridge.entries[0].item)) continue;
        for (const mark of bridge.marks) {
          const measure = MegaBridges.measure([mark.from, mark.to]);
          const distance = MegaBridges.nearest(measure, cursor).distance;
          if (distance < nearest) {
            target = bridge;
            nearest = distance;
          }
        }
      }
      if (target) removeSharedBridge(target);
      else feedback('Clique sobre a marca dourada da ponte que deseja remover.', true);
      return;
    }
    const width = $('nestingBridgeWidth').valueAsNumber;
    if (!Number.isFinite(width) || width < .01) return feedback('Informe uma largura de ponte válida.', true);
    const bridge = findSharedNestingBridge(items, point, width, tolerance);
    if (!bridge) return feedback('Não encontrei dois cortes externos retos e próximos, com fresa do mesmo diâmetro e espaço para essa largura de ponte.', true);
    if (!addSharedBridge(items, bridge, point, width, tolerance)) {
      return feedback('Outro trecho de corte atingiria a ponte. Escolha outro ponto.', true);
    }
    showSheet();
    feedback('Ponte criada. Continue marcando ou clique em Concluir pontes.');
  });

  $('nestingUndoBridge').onclick = () => {
    if (!canChangePlan()) return;
    const items = sheets[activeSheet];
    const last = sharedBridges.findLast(bridge => items.includes(bridge.entries[0].item));
    if (last) removeSharedBridge(last);
  };

  $('nestingFit').onclick = fitView;
  $('nestingStart').onclick = () => {
    if (!canChangePlan()) return;
    setMode(mode === 'start' ? null : 'start');
    feedback(mode ? 'Clique perto do ponto de entrada do corte externo.' : 'Seleção de início encerrada.');
  };
  $('nestingOrder').onclick = () => {
    if (!canChangePlan()) return;
    setMode(mode === 'order' ? null : 'order');
    feedback(mode ? 'Clique nas peças na ordem de corte.' : 'Ordenação encerrada.');
  };
  $('nestingShowPaths').onchange = showSheet;
  $('nestingCutView').onclick = () => {
    cutView = !cutView;
    $('nestingCutView').setAttribute('aria-pressed', String(cutView));
    $('nestingCutView').textContent = cutView ? 'Voltar ao plano de corte' : 'Visualizar chapa cortada';
    showSheet();
  };
  $('nestingAuto').onclick = () => {
    if (!canChangePlan()) return;
    if (sharedBridges.length) return feedback('Desfaça as pontes entre peças antes de reorganizar as chapas.', true);
    const items = sheets.flat().sort((a, b) => b.width * b.height - a.width * a.height);
    if (!items.length) return;
    const variants = items.map(availableOrientations);
    let best = sheets;
    for (const preferRotated of [false, true]) {
      const plan = [];
      for (const orientations of variants) {
        const options = preferRotated ? orientations.slice().reverse() : orientations;
        let placed = false;
        for (let index = 0; index <= plan.length && !placed; index++) {
          const sheet = plan[index] || [];
          for (const option of options) {
            const position = initialPosition(option, sheet);
            if (!position) continue;
            if (!plan[index]) plan.push(sheet);
            sheet.push({ ...option, ...position });
            placed = true;
            break;
          }
        }
      }
      if (plan.length <= best.length) best = plan;
    }
    if (best !== sheets) sheets.splice(0, sheets.length, ...best);
    activeSheet = 0;
    setMode(null);
    showSheet();
    feedback('Distribuição automática concluída.');
  };

  svg.addEventListener('wheel', event => {
    if (!view) return;
    event.preventDefault();
    if (drag || pan) return;
    const point = localPoint(event);
    if (!point) return;
    const [x, y, w, h] = view;
    const factor = Math.max(.25, Math.min(4, Math.exp(event.deltaY * .001)));
    if (w * factor < stock.x / 100 || w * factor > stock.x * 12) return;
    setView([point.x + (x - point.x) * factor, point.y + (y - point.y) * factor, w * factor, h * factor]);
  }, { passive: false });

  svg.onpointerdown = event => {
    if (event.button !== 1 || drag || !view) return;
    const point = localPoint(event);
    if (!point) return;
    event.preventDefault();
    svg.setPointerCapture(event.pointerId);
    pan = { id: event.pointerId, point };
  };

  function localPoint(event) {
    const matrix = svg.getScreenCTM();
    return matrix && new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }

  svg.onpointermove = event => {
    if (pan?.id === event.pointerId) {
      const point = localPoint(event);
      if (!point) return;
      const [x, y, w, h] = view;
      setView([x + pan.point.x - point.x, y + pan.point.y - point.y, w, h]);
      return;
    }
    if (drag?.id !== event.pointerId) return;
    const point = localPoint(event);
    if (!point) return;
    const { item, group } = drag;
    const { diameter, width, height } = item;
    const margin = edgeMargin(diameter);
    const x = Math.max(margin, Math.min(stock.x - width - margin, drag.x + point.x - drag.point.x));
    const y = Math.max(margin, Math.min(stock.y - height - margin, drag.y - point.y + drag.point.y));
    const next = { ...item, x, y };
    if (sheets[activeSheet].some(other => other !== item && unsafe(next, other))) return;
    Object.assign(item, { x, y });
    updatePosition(group, item);
  };

  svg.onpointerup = svg.onpointercancel = svg.onlostpointercapture = event => {
    if (pan?.id === event.pointerId) pan = null;
    if (drag?.id !== event.pointerId) return;
    drag = null;
    showSheet();
    feedback('Posição atualizada.');
  };

  showNesting(true);
}
