'use strict';

(() => {
  const $ = id => document.getElementById(id);
  const colors = { none: '#687787', macho: '#d44942', femea: '#a04bb7' };
  const names = { none: 'Sem operação', macho: 'Macho', femea: 'Fêmea' };
  const svgNS = 'http://www.w3.org/2000/svg';
  const fmt = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
  let entities = [];
  let selection = new Set();
  let deleted = [];
  let fitBox = null;
  let view = null;
  let pan = null;
  const machineDefaults = { tableY: 2780, tableX: 1850, safeZ: 30, rapid: 200, rpm: 18000, xy: 100, z: 10 };
  const fixedMachine = { tableY: 2780, tableX: 1850, safeZ: 30, rapid: 200 };
  const machineFrom = value => ({ ...machineDefaults, ...value, ...fixedMachine });
  const machineSettings = MegaStore.readSetting('machine', {});
  let machine = machineFrom(machineSettings);
  let stockThickness = Number.isFinite(machineSettings.stockThickness) && machineSettings.stockThickness > 0
    ? machineSettings.stockThickness : 60;
  let tools = MegaStore.readSetting('tools', [{ id: 'tool-6mm', name: 'Fresa Ø6 mm', diameter: 6, height: 100 }]);
  if (!Array.isArray(tools) || !tools.length) tools = [{ id: 'tool-6mm', name: 'Fresa Ø6 mm', diameter: 6, height: 100 }];
  let editingTool = null;
  let pieceConfigs = {};
  let rawDxf = '';
  let sourceFile = '';
  let savedImportId = null;
  let editingPath = null;
  let savingImport = false;

  function setSavedImport(id) {
    savedImportId = id;
    $('updateSavedImport').disabled = !rawDxf;
    $('updateSavedImport').textContent = id ? 'Salvar edição' : 'Salvar importação';
    importSaveFeedback('');
  }

  function importSaveFeedback(message, error = false) {
    const feedback = $('importSaveFeedback');
    feedback.textContent = message;
    feedback.style.color = error ? '#b42318' : '#367045';
  }

  const status = (message, error = false) => {
    $('status').textContent = message;
    $('status').style.color = error ? '#b42318' : '#5d6778';
    const feedback = document.querySelector('.setup-dialog[open] .dialog-feedback');
    if (feedback) { feedback.textContent = message; feedback.style.color = error ? '#b42318' : '#367045'; }
  };
  const number = value => Number(String(value).replace(',', '.'));
  const uniqueId = () => globalThis.crypto?.randomUUID?.() || `I${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const shortDate = iso => new Date(iso).toLocaleString('pt-BR');
  function renderMachine() {
    for (const [id, key] of [['defaultRpm','rpm'],['defaultXY','xy'],['defaultZ','z']]) $(id).value = machine[key];
    $('defaultStockThickness').value = stockThickness;
    for (const id of ['depth', 'pathEditDepth']) $(id).max = stockThickness;
    $('depthHelp').textContent = 'Espessura configurada na Router Mega: ' + fmt(stockThickness) + ' mm.';
    $('machineSummary').textContent = `Mesa: Y ${fmt(machine.tableY)} × X ${fmt(machine.tableX)} mm`;
  }
  function renderTools() {
    const list = $('toolList'); list.replaceChildren();
    for (const tool of tools) {
      const row = document.createElement('div'); row.className = 'tool-row';
      const info = document.createElement('span'); info.textContent = `${tool.name} · Ø${fmt(tool.diameter)} mm · altura ${fmt(tool.height)} mm`;
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Editar';
      edit.onclick = () => { editingTool = tool.id; $('toolName').value = tool.name; $('toolDiameter').value = tool.diameter; $('toolHeight').value = tool.height; $('saveTool').textContent = 'Salvar ferramenta'; $('cancelToolEdit').hidden = false; };
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Excluir'; remove.disabled = tools.length === 1;
      remove.onclick = () => {
        if (entities.some(entity => !entity.deleted && entity.op && entity.toolId === tool.id)) return status('Esta ferramenta está associada a um caminho. Troque a ferramenta antes de excluí-la.', true);
        try { const candidate = tools.filter(item => item.id !== tool.id); MegaStore.writeSetting('tools', candidate); tools = candidate; renderTools(); renderPieces(); render(); status('Ferramenta excluída.'); }
        catch (error) { status(error.message, true); }
      };
      row.append(info, edit, remove); list.append(row);
    }
    renderActiveTools();
  }
  function renderActiveTools() {
    const picker = $('activeTool');
    const previous = picker.value;
    picker.replaceChildren();
    for (const tool of tools) { const option = document.createElement('option'); option.value = tool.id; option.textContent = `${tool.name} · Ø${fmt(tool.diameter)} mm`; picker.append(option); }
    picker.value = tools.some(tool => tool.id === previous) ? previous : tools[0].id;
    showActiveTool();
  }
  function showActiveTool() {
    const tool = tools.find(item => item.id === $('activeTool').value);
    $('activeToolHelp').textContent = tool ? `Fresa ativa: ${tool.name}, Ø${fmt(tool.diameter)} mm. A faixa colorida indica o material removido pelo caminho.` : 'Cadastre e selecione uma ferramenta.';
  }
  function toolForEntity(entity) {
    return entity.toolSnapshot || tools.find(tool => tool.id === entity.toolId) || tools[0];
  }
  const pointKey = point => `${Math.round(point[0] * 1000)},${Math.round(point[1] * 1000)}`;
  function contourMembers(contour, operation = 'macho', source = entities) {
    const keys = new Set(contour.points.map(pointKey));
    return source.filter(entity => !entity.deleted && entity.op === operation && entity.points.every(point => keys.has(pointKey(point))));
  }
  function pieceContours() {
    const macho = entities.filter(e => !e.deleted && e.op === 'macho');
    return ControlCorteDxf.join(macho).loops.filter(loop => loop.points.length >= 3);
  }
  function createdPaths() {
    const groups = new Map(), paths = [], used = new Set();
    for (const entity of entities) if (!entity.deleted && entity.op) {
      const tool = toolForEntity(entity);
      const key = `${entity.op}|${entity.depth}|${tool.id}|${tool.diameter}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entity);
    }
    for (const group of groups.values()) {
      const ids = new Set(group.map(entity => entity.id));
      const joined = ControlCorteDxf.join(group);
      for (const contour of [...joined.loops, ...joined.leftovers]) {
        const members = contourMembers(contour, group[0].op).filter(entity => ids.has(entity.id) && !used.has(entity.id));
        if (!members.length) continue;
        for (const member of members) used.add(member.id);
        paths.push({ id: contour.id, members, closed: contour.closed, operation: group[0].op, depth: group[0].depth, tool: toolForEntity(members[0]) });
      }
      for (const entity of group) if (!used.has(entity.id)) {
        used.add(entity.id);
        paths.push({ id: entity.id, members: [entity], closed: entity.closed, operation: entity.op, depth: entity.depth, tool: toolForEntity(entity) });
      }
    }
    return paths.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  }
  function pathConfig(path, index) {
    const existing = pieceConfigs[path.id] || path.members.map(entity => pieceConfigs[entity.id]).find(Boolean);
    const config = existing || { name: `Caminho ${index + 1}`, toolId: path.tool.id, toolSnapshot: { ...path.tool }, rpm: machine.rpm, xy: machine.xy, z: machine.z };
    pieceConfigs[path.id] = config;
    return config;
  }
  function renderPieces() {
    const list = $('pathsList'); list.replaceChildren();
    const paths = createdPaths();
    $('pathsCard').hidden = paths.length === 0;
    for (const [index, path] of paths.entries()) {
      const config = pathConfig(path, index);
      const row = document.createElement('div'); row.className = 'path-row';
      const info = document.createElement('div'); info.className = 'path-info';
      const title = document.createElement('strong'); title.textContent = config.name || `Caminho ${index + 1}`;
      const details = document.createElement('span'); details.textContent = `${path.operation === 'macho' ? 'Macho · corte externo' : 'Fêmea · furo'} · ${path.closed ? 'contorno fechado' : 'contorno aberto'} · ${path.members.map(entity => entity.id).join(', ')}`;
      const settings = document.createElement('span'); settings.textContent = `${config.toolSnapshot?.name || path.tool.name} · Ø${fmt(config.toolSnapshot?.diameter || path.tool.diameter)} mm · Z ${fmt(path.depth)} mm · ${fmt(config.rpm)} rpm · XY ${fmt(config.xy)} / Z ${fmt(config.z)} mm/seg${path.members.some(entity => entity.bridges.length) ? ` · ${path.members.reduce((sum, entity) => sum + entity.bridges.length, 0)} ponte(s)` : ''}`;
      info.append(title, details, settings);
      const actions = document.createElement('div'); actions.className = 'path-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Editar'; edit.onclick = () => editCreatedPath(path, config);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Excluir caminho'; remove.onclick = () => deleteCreatedPath(path);
      actions.append(edit, remove); row.append(info, actions); list.append(row);
    }
  }
  function editCreatedPath(path, config) {
    editingPath = { id: path.id, memberIds: path.members.map(entity => entity.id) };
    $('pathEditName').value = config.name || '';
    $('pathEditOperation').value = path.operation;
    const picker = $('pathEditTool'); picker.replaceChildren();
    for (const tool of tools) { const option = document.createElement('option'); option.value = tool.id; option.textContent = `${tool.name} · Ø${fmt(tool.diameter)} mm`; picker.append(option); }
    if (!tools.some(tool => tool.id === config.toolId) && config.toolSnapshot) { const option = document.createElement('option'); option.value = config.toolId; option.textContent = `${config.toolSnapshot.name} · salva no caminho`; picker.append(option); }
    picker.value = config.toolId || path.tool.id;
    $('pathEditDepth').value = path.depth;
    $('pathEditRpm').value = config.rpm;
    $('pathEditXY').value = config.xy;
    $('pathEditZ').value = config.z;
    $('pathDialog').querySelector('.dialog-feedback').textContent = '';
    $('pathDialog').showModal();
  }
  function deleteCreatedPath(path) {
    if (!confirm(`Excluir o caminho ${pieceConfigs[path.id]?.name || path.id}? O desenho DXF será mantido.`)) return;
    for (const entity of path.members) { entity.op = null; entity.depth = null; entity.bridges = []; entity.toolId = null; entity.toolSnapshot = null; }
    delete pieceConfigs[path.id];
    for (const entity of path.members) delete pieceConfigs[entity.id];
    selection.clear(); render(); renderPieces(); status('Caminho de ferramenta excluído; linhas do DXF preservadas.');
  }
  function snapshot(currentEntities = entities, currentConfigs = pieceConfigs) {
    return {
      version: 1, id: savedImportId || uniqueId(), name: $('importName').value.trim() || sourceFile.replace(/\.dxf$/i, ''), sourceFile,
      rawDxf, thickness: String(stockThickness), machine: { ...machine },
      entities: currentEntities.map(e => ({ id: e.id, op: e.op, depth: e.depth, bridges: e.bridges.map(bridge => ({ ...bridge })), deleted: e.deleted, toolId: e.toolId || null, toolSnapshot: e.toolSnapshot || null })),
      pieceConfigs: structuredClone(currentConfigs), savedAt: new Date().toISOString()
    };
  }
  async function renderSavedImports() {
    const list = $('savedImports'); list.replaceChildren();
    try {
      const records = await MegaStore.listImports();
      if (!records.length) { const p = document.createElement('p'); p.className = 'setup-note'; p.textContent = 'Nenhuma importação salva neste navegador.'; list.append(p); return; }
      for (const record of records) {
        const row = document.createElement('div'); row.className = 'saved-row';
        const info = document.createElement('span'); info.textContent = `${record.name} · ${shortDate(record.savedAt)}`;
        const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Abrir para editar'; open.onclick = async () => { try { await openSnapshot(await MegaStore.getImport(record.id)); $('importsDialog').close(); status(`Importação ${record.name} aberta.`); } catch (error) { status(error.message, true); } };
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Excluir'; remove.onclick = async () => { if (!confirm(`Excluir a importação salva "${record.name}"?`)) return; try { await MegaStore.deleteImport(record.id); if (savedImportId === record.id) setSavedImport(null); await renderSavedImports(); status('Importação salva excluída.'); } catch (error) { status(error.message, true); } };
        row.append(info, open, remove); list.append(row);
      }
    } catch (error) { status(`Não foi possível listar importações: ${error.message}`, true); }
  }
  function snapshotEntities(record) {
    if (!record || record.version !== 1 || typeof record.rawDxf !== 'string') throw Error('Cópia de importação inválida.');
    const parsed = ControlCorteDxf.inspect(record.rawDxf);
    const annotations = new Map((record.entities || []).map(item => [item.id, item]));
    return parsed.entities.map(e => ({ ...e, op: null, depth: null, bridges: [], deleted: false, ...structuredClone(annotations.get(e.id)) }));
  }
  function openSnapshot(record) {
    entities = snapshotEntities(record);
    rawDxf = record.rawDxf; sourceFile = record.sourceFile || record.name; setSavedImport(record.id || null);
    pieceConfigs = structuredClone(record.pieceConfigs || {}); machine = machineFrom(record.machine || {});
    for (const contour of pieceContours()) {
      const config = pieceConfigs[contour.id];
      if (config?.toolSnapshot) for (const member of contourMembers(contour)) if (!member.toolSnapshot) { member.toolId = config.toolId; member.toolSnapshot = { ...config.toolSnapshot }; }
    }
    $('fileName').value = sourceFile; $('importName').value = record.name || sourceFile;
    $('operation').value = ''; $('depth').value = '';
    renderActiveTools();
    selection = new Set(); deleted = [];
    $('workspace').hidden = false; $('saveImport').disabled = false; $('downloadBackup').disabled = false;
    renderMachine(); fit(); render(); renderPieces();
  }
  const pathFromPoints = (points, closed = false) =>
    points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${-y}`).join(' ') + (closed ? ' Z' : '');
  const pointPath = entity => pathFromPoints(entity.points, entity.closed);
  function boxForEntities() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const entity of entities) if (!entity.deleted) for (const [x, y] of entity.points) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, -y); maxY = Math.max(maxY, -y);
    }
    if (!Number.isFinite(minX)) return null;
    const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    const pad = Math.max(3, ...tools.map(tool => tool.diameter * 1.5), Math.max(w, h) * .04);
    return { x: minX - pad, y: minY - pad, w: w + 2 * pad, h: h + 2 * pad };
  }
  function setView(box) {
    view = { ...box };
    $('drawing').setAttribute('viewBox', [view.x, view.y, view.w, view.h].join(' '));
  }
  function fit() {
    fitBox = boxForEntities();
    if (fitBox) setView(fitBox);
  }
  function updateSummary() {
    const counts = { none: 0, macho: 0, femea: 0 };
    for (const entity of entities) if (!entity.deleted) counts[entity.op || 'none']++;
    $('summary').replaceChildren();
    for (const key of Object.keys(counts)) {
      const row = document.createElement('div');
      const label = document.createElement('span');
      const value = document.createElement('strong');
      label.textContent = names[key];
      value.textContent = fmt(counts[key]);
      row.append(label, value);
      $('summary').append(row);
    }
    $('entityCount').value = fmt(entities.filter(e => !e.deleted).length);
    $('undoButton').disabled = deleted.length === 0;
    const firstSelected = entities.find(entity => selection.has(entity.id) && !entity.deleted);
    $('selectionInfo').textContent = selection.size
      ? `${selection.size} linha(s) selecionada(s).${selection.size === 1 && firstSelected?.op ? ` ${names[firstSelected.op]} · ${toolForEntity(firstSelected).name}.` : ''}`
      : 'Selecione uma ou mais linhas no desenho.';
  }
  function compensatedPaths(source = entities) {
    const groups = new Map(), paths = [], errors = [];
    let unclosed = 0;
    for (const entity of source) if (!entity.deleted && entity.op) {
      const tool = toolForEntity(entity);
      const key = `${entity.op}|${entity.depth}|${tool.id}|${tool.diameter}`;
      if (!groups.has(key)) groups.set(key, { operation: entity.op, depth: entity.depth, tool, entities: [] });
      groups.get(key).entities.push(entity);
    }
    for (const group of groups.values()) {
      const joined = ControlCorteDxf.join(group.entities);
      unclosed += joined.leftovers.length;
      const groupIds = new Set(group.entities.map(entity => entity.id));
      for (const loop of joined.loops) {
        try {
          const axis = MegaOffsets.offset(loop.points, group.operation, group.tool.diameter);
          const axisMeasure = MegaBridges.measure(axis, true);
          const bridges = [];
          if (group.operation === 'macho') for (const member of contourMembers(loop, group.operation, source).filter(entity => groupIds.has(entity.id))) {
            const nominal = MegaBridges.measure(member.points, member.closed);
            for (const bridge of member.bridges) {
              const point = MegaBridges.pointAt(nominal, bridge.at);
              const at = MegaBridges.nearest(axisMeasure, point).at;
              // The cutter radius consumes material at each end of the interrupted axis.
              const candidate = { at, width: bridge.width + group.tool.diameter };
              MegaBridges.validate(axisMeasure, bridges, candidate);
              bridges.push(candidate);
            }
          }
          const diameter = group.tool.diameter;
          const protectedRuns = bridges.flatMap(bridge =>
            MegaBridges.intervals(axisMeasure, { ...bridge, width: bridge.width - diameter })
              .map(([start, end]) => MegaBridges.extract(axisMeasure, start, end)));
          paths.push({ id: loop.id, operation: group.operation, depth: group.depth, tool: group.tool, diameter,
            cut: bridges.length ? MegaBridges.split(axis, true, bridges).cut : [axis],
            closed: !bridges.length, protectedRuns, bridgeCount: bridges.length });
        } catch (error) { errors.push(`${group.operation === 'macho' ? 'Macho' : 'Fêmea'}: ${error.message}`); }
      }
    }
    return { paths, errors, unclosed };
  }
  function render() {
    const svg = $('drawing');
    svg.replaceChildren();
    const compensated = compensatedPaths();
    for (const toolpath of compensated.paths) for (const points of toolpath.cut) {
      const d = pathFromPoints(points, toolpath.closed);
      const shadow = document.createElementNS(svgNS, 'path');
      shadow.setAttribute('d', d);
      shadow.setAttribute('fill', 'none');
      shadow.setAttribute('stroke', colors[toolpath.operation]);
      shadow.setAttribute('stroke-width', String(toolpath.diameter));
      shadow.setAttribute('stroke-opacity', '.25');
      shadow.setAttribute('stroke-linecap', 'round');
      shadow.setAttribute('stroke-linejoin', 'round');
      shadow.setAttribute('pointer-events', 'none');
      svg.append(shadow);
    }
    const pieces = [`${compensated.paths.length} caminho(s) compensado(s): Macho por fora, Fêmea por dentro.`];
    if (compensated.unclosed) pieces.push(`${compensated.unclosed} contorno(s) aberto(s); feche o desenho para compensar.`);
    if (compensated.errors.length) pieces.push(compensated.errors.join(' '));
    $('toolpathInfo').textContent = pieces.join(' ');
    $('toolpathInfo').style.color = compensated.errors.length ? '#b42318' : '#64748b';
    for (const entity of entities) {
      if (entity.deleted) continue;
      const group = document.createElementNS(svgNS, 'g');
      const hit = document.createElementNS(svgNS, 'path');
      const path = pointPath(entity);
      const visible = document.createElementNS(svgNS, 'path');
      visible.setAttribute('d', path);
      visible.setAttribute('fill', 'none');
      visible.setAttribute('stroke', selection.has(entity.id) ? '#e59000' : '#687787');
      visible.setAttribute('stroke-width', selection.has(entity.id) ? '2.2' : '1');
      visible.setAttribute('vector-effect', 'non-scaling-stroke');
      visible.setAttribute('pointer-events', 'none');
      group.append(visible);
      hit.setAttribute('d', path);
      hit.setAttribute('fill', 'none');
      hit.setAttribute('stroke', 'transparent');
      hit.setAttribute('stroke-width', '13');
      hit.setAttribute('vector-effect', 'non-scaling-stroke');
      hit.setAttribute('pointer-events', 'stroke');
      hit.style.cursor = 'pointer';
      hit.addEventListener('click', event => {
        event.stopPropagation();
        if (event.ctrlKey || event.metaKey) {
          if (selection.has(entity.id)) selection.delete(entity.id);
          else selection.add(entity.id);
        } else {
          selection = new Set([entity.id]);
        }
        if (selection.size === 1 && entity.toolId && tools.some(tool => tool.id === entity.toolId)) { $('activeTool').value = entity.toolId; showActiveTool(); }
        render();
      });
      group.append(hit);
      if (entity.op === 'macho') for (const bridge of entity.bridges) {
        const contour = MegaBridges.measure(entity.points, entity.closed);
        for (const [from, to] of MegaBridges.intervals(contour, bridge)) {
          const bridgePath = pathFromPoints(MegaBridges.extract(contour, from, to));
          const gold = document.createElementNS(svgNS, 'path');
          gold.setAttribute('d', bridgePath);
          gold.setAttribute('fill', 'none');
          gold.setAttribute('stroke', '#e5a100');
          gold.setAttribute('stroke-width', '5');
          gold.setAttribute('vector-effect', 'non-scaling-stroke');
          gold.setAttribute('pointer-events', 'none');
          group.append(gold);
        }
      }
      svg.append(group);
    }
    updateSummary();
  }
  function selectedEntities() {
    return entities.filter(e => !e.deleted && selection.has(e.id));
  }
  function suggestDepth(operation) {
    return operation ? stockThickness.toFixed(2) : '';
  }
  function clearSelection() {
    selection.clear();
    render();
  }
  function removeSelection() {
    const targets = selectedEntities();
    if (!targets.length) return;
    deleted.push(targets.map(e => e.id));
    for (const entity of targets) entity.deleted = true;
    selection.clear();
    render();
    renderPieces();
    status(`${targets.length} entidade(s) excluída(s). Use Desfazer exclusão para restaurar.`);
  }

  $('importButton').onclick = () => $('dxfFile').click();
  $('dxfFile').onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = ControlCorteDxf.inspect(content);
      entities = parsed.entities.map(e => ({ ...e, op: null, depth: null, bridges: [], deleted: false }));
      rawDxf = content; sourceFile = file.name; setSavedImport(null); pieceConfigs = {};
      selection = new Set();
      deleted = [];
      $('fileName').value = file.name;
      $('importName').value = file.name.replace(/\.dxf$/i, '');
      $('operation').value = '';
      $('depth').value = '';
      $('saveImport').disabled = false; $('downloadBackup').disabled = false;
      $('workspace').hidden = false;
      fit();
      render();
      renderPieces();
      const ignored = Object.entries(parsed.ignored || {}).map(([type, count]) => `${count} ${type}`).join(', ');
      status(`${file.name}: ${fmt(entities.length)} entidades importadas. ${parsed.units}${ignored ? ` Ignoradas: ${ignored}.` : ''}`);
    } catch (error) {
      status(`Não foi possível importar o DXF: ${error.message}`, true);
    }
    event.target.value = '';
  };
  $('fitButton').onclick = fit;
  $('undoButton').onclick = () => {
    const ids = new Set(deleted.pop() || []);
    if (!ids.size) return;
    for (const entity of entities) if (ids.has(entity.id)) entity.deleted = false;
    fit();
    render();
    renderPieces();
    status(`${ids.size} entidade(s) restaurada(s).`);
  };
  $('operation').onchange = () => {
    $('depth').value = suggestDepth($('operation').value);
  };
  $('activeTool').onchange = showActiveTool;
  $('applyButton').onclick = () => {
    const selected = selectedEntities();
    const operation = $('operation').value;
    const depth = number($('depth').value);
    const activeTool = tools.find(tool => tool.id === $('activeTool').value);
    if (!selected.length) return status('Selecione pelo menos uma linha.', true);
    if (!['macho', 'femea'].includes(operation)) return status('Escolha Macho ou Fêmea.', true);
    if (!(depth > 0 && depth <= stockThickness)) return status('A profundidade Z deve ser maior que zero e até a espessura da chapa.', true);
    if (!activeTool) return status('Escolha uma ferramenta ativa para este caminho.', true);
    for (const entity of selected) {
      entity.op = operation;
      entity.depth = depth;
      entity.toolId = activeTool.id;
      entity.toolSnapshot = { ...activeTool };
      if (operation !== 'macho') entity.bridges = [];
    }
    if (operation === 'macho') for (const contour of pieceContours()) {
      const members = contourMembers(contour);
      if (!members.some(entity => selected.includes(entity))) continue;
      for (const member of members) { member.toolId = activeTool.id; member.toolSnapshot = { ...activeTool }; }
      if (pieceConfigs[contour.id]) { pieceConfigs[contour.id].toolId = activeTool.id; pieceConfigs[contour.id].toolSnapshot = { ...activeTool }; }
    }
    render();
    renderPieces();
    status(`${selected.length} linha(s) definida(s) como ${names[operation]}, ${activeTool.name} Ø${fmt(activeTool.diameter)} mm, Z ${fmt(depth)} mm.`);
  };
  $('clearButton').onclick = () => {
    const selected = selectedEntities();
    if (!selected.length) return status('Selecione pelo menos uma linha.', true);
    for (const entity of selected) { entity.op = null; entity.depth = null; entity.bridges = []; entity.toolId = null; entity.toolSnapshot = null; }
    render();
    renderPieces();
    status(`Caminho de ferramenta removido de ${selected.length} linha(s).`);
  };
  function dragBounds(svg, start, end) {
    const inverse = svg.getScreenCTM()?.inverse();
    if (!inverse) return null;
    const a = new DOMPoint(start.x, start.y).matrixTransform(inverse);
    const b = new DOMPoint(end.clientX, end.clientY).matrixTransform(inverse);
    return {
      left: Math.min(a.x, b.x), right: Math.max(a.x, b.x),
      top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y),
    };
  }

  function crossesBox(a, b, box) {
    let enter = 0, exit = 1;
    for (const [start, end, min, max] of [
      [a[0], b[0], box.left, box.right],
      [-a[1], -b[1], box.top, box.bottom],
    ]) {
      const delta = end - start;
      if (delta === 0) {
        if (start < min || start > max) return false;
        continue;
      }
      const t0 = (min - start) / delta;
      const t1 = (max - start) / delta;
      enter = Math.max(enter, Math.min(t0, t1));
      exit = Math.min(exit, Math.max(t0, t1));
      if (enter > exit) return false;
    }
    return true;
  }

  const drawing = $('drawing');
  let drag = null;
  let suppressDragClick = false;
  drawing.addEventListener('click', event => {
    if (!suppressDragClick) return;
    suppressDragClick = false;
    event.stopImmediatePropagation();
  }, true);
  drawing.onclick = event => {
    if (event.target === drawing && !event.ctrlKey && !event.metaKey) clearSelection();
  };
  $('drawing').onwheel = event => {
    if (!view) return;
    event.preventDefault();
    const rect = $('drawing').getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;
    const factor = Math.exp(event.deltaY * .001);
    const w = view.w * factor, h = view.h * factor;
    if (w < .001 || h < .001 || w > 1e7 || h > 1e7) return;
    setView({ x: view.x + u * (view.w - w), y: view.y + v * (view.h - h), w, h });
  };
  drawing.onpointerdown = event => {
    if (!view || !event.isPrimary) return;
    if (event.button === 0) {
      suppressDragClick = false;
      if (!pan) {
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, box: null };
      }
    } else if (event.button === 1 && !drag) {
      event.preventDefault();
      pan = { id: event.pointerId, x: event.clientX, y: event.clientY };
      drawing.setPointerCapture(event.pointerId);
    }
  };
  drawing.onpointermove = event => {
    if (!view) return;
    if (pan?.id === event.pointerId) {
      const rect = drawing.getBoundingClientRect();
      const dx = (event.clientX - pan.x) / rect.width * view.w;
      const dy = (event.clientY - pan.y) / rect.height * view.h;
      setView({ ...view, x: view.x - dx, y: view.y - dy });
      pan.x = event.clientX;
      pan.y = event.clientY;
      return;
    }
    if (drag?.id !== event.pointerId || !(event.buttons & 1)) return;
    if (!drag.box && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
    const bounds = dragBounds(drawing, drag, event);
    if (!bounds) return;
    if (!drag.box) {
      drawing.setPointerCapture(event.pointerId);
      drag.box = document.createElementNS(svgNS, 'rect');
      drag.box.setAttribute('fill', '#e5900026');
      drag.box.setAttribute('stroke', '#b36d00');
      drag.box.setAttribute('vector-effect', 'non-scaling-stroke');
      drag.box.setAttribute('pointer-events', 'none');
      drawing.append(drag.box);
    }
    for (const [key, size] of Object.entries({
      x: bounds.left, y: bounds.top,
      width: bounds.right - bounds.left, height: bounds.bottom - bounds.top,
    })) drag.box.setAttribute(key, size);
  };
  function endDrag(event) {
    if (pan?.id === event.pointerId) pan = null;
    if (drag?.id !== event.pointerId) return;
    const completed = drag;
    drag = null;
    completed.box?.remove();
    if (!completed.box || event.type !== 'pointerup') return;
    suppressDragClick = true;
    const bounds = dragBounds(drawing, completed, event);
    if (!bounds) return;
    if (!event.ctrlKey && !event.metaKey) selection.clear();
    for (const entity of entities) {
      if (entity.deleted) continue;
      const { points } = entity;
      if (points.some((point, index) => index > 0 && crossesBox(points[index - 1], point, bounds)) ||
          (entity.closed && points.length > 1 && crossesBox(points.at(-1), points[0], bounds))) {
        selection.add(entity.id);
      }
    }
    const [selected] = selectedEntities();
    if (selection.size === 1 && selected?.toolId && tools.some(tool => tool.id === selected.toolId)) {
      $('activeTool').value = selected.toolId;
      showActiveTool();
    }
    render();
  }
  drawing.onpointerup = drawing.onpointercancel = drawing.onlostpointercapture = endDrag;
  drawing.onpointerleave = event => {
    if (drag?.id === event.pointerId && !drag.box) drag = null;
  };
  $('drawing').oncontextmenu = event => event.preventDefault();
  document.addEventListener('keydown', event => {
    if (!nestingPage.hidden || document.querySelector('.setup-dialog[open]')) return;
    if (!['Delete', 'Backspace'].includes(event.key) || !selection.size) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    event.preventDefault();
    removeSelection();
  });
  for (const [buttonId, dialogId] of [['openMachineDialog', 'machineDialog'], ['openToolsDialog', 'toolsDialog'], ['openImportsDialog', 'importsDialog']]) {
    $(buttonId).onclick = () => {
      if (dialogId === 'machineDialog') renderMachine();
      if (dialogId === 'toolsDialog') renderTools();
      if (dialogId === 'importsDialog') renderSavedImports();
      const dialog = $(dialogId);
      dialog.querySelector('.dialog-feedback').textContent = '';
      dialog.showModal();
    };
  }
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.onclick = () => button.closest('dialog').close());
  document.querySelectorAll('.setup-dialog').forEach(dialog => dialog.onclick = event => { if (event.target === dialog && !dialog.querySelector('[data-close-dialog]')?.disabled) dialog.close(); });
  const pathDialog = $('pathDialog');
  const savePathEdit = $('savePathEdit');
  pathDialog.addEventListener('cancel', event => {
    if (savePathEdit.disabled) event.preventDefault();
  });
  savePathEdit.onclick = async () => {
    if (!editingPath || savingImport) return;
    const name = $('pathEditName').value.trim() || `Caminho ${editingPath.id}`;
    const operation = $('pathEditOperation').value;
    const depth = number($('pathEditDepth').value);
    const rpm = number($('pathEditRpm').value), xy = number($('pathEditXY').value), z = number($('pathEditZ').value);
    const previous = pieceConfigs[editingPath.id] || {};
    const toolId = $('pathEditTool').value;
    const tool = tools.find(item => item.id === toolId) || (previous.toolId === toolId ? previous.toolSnapshot : null);
    if (!['macho', 'femea'].includes(operation) || !(depth > 0 && depth <= stockThickness) || !(rpm > 0 && xy > 0 && z > 0) || !tool) return status('Revise operação, ferramenta, profundidade até a espessura e valores positivos de rotação e avanço.', true);
    const members = entities.filter(entity => editingPath.memberIds.includes(entity.id) && !entity.deleted);
    if (!members.length) return status('Este caminho não está mais disponível.', true);
    const toolSnapshot = { ...tool };
    const nextEntities = entities.map(entity => members.includes(entity)
      ? { ...entity, op: operation, depth, toolId: tool.id, toolSnapshot, bridges: operation === 'macho' ? entity.bridges : [] }
      : entity);
    const nextConfigs = {
      ...pieceConfigs,
      [editingPath.id]: { ...previous, name, toolId: tool.id, toolSnapshot, rpm, xy, z },
    };
    const saveToLibrary = Boolean(savedImportId);
    if (saveToLibrary) {
      const close = pathDialog.querySelector('[data-close-dialog]');
      savingImport = savePathEdit.disabled = close.disabled = true;
      try {
        await MegaStore.saveImport(snapshot(nextEntities, nextConfigs));
      } catch (error) {
        return status(error.message, true);
      } finally {
        savingImport = savePathEdit.disabled = close.disabled = false;
      }
    }
    entities = nextEntities;
    pieceConfigs = nextConfigs;
    editingPath = null;
    pathDialog.close();
    render();
    renderPieces();
    if (saveToLibrary) importSaveFeedback('Edição salva.');
    status(saveToLibrary ? 'Edição gravada na importação salva.' : 'Edição aplicada ao caminho.');
  };
  $('saveMachine').onclick = () => {
    const thickness = $('defaultStockThickness').valueAsNumber;
    if (!Number.isFinite(thickness) || thickness < .01) return status('Informe uma espessura de pelo menos 0,01 mm.', true);
    const candidate = { ...fixedMachine, rpm: number($('defaultRpm').value), xy: number($('defaultXY').value), z: number($('defaultZ').value) };
    if (!(candidate.rpm > 0 && candidate.xy > 0 && candidate.z > 0)) return status('Revise as configurações: rotação e avanços devem ser maiores que zero.', true);
    try { MegaStore.writeSetting('machine', { ...candidate, stockThickness: thickness }); machine = candidate; stockThickness = thickness; renderMachine(); status('Configurações da Router Mega salvas. Novas peças usarão os novos valores padrão.'); }
    catch (error) { status(error.message, true); }
  };
  $('saveTool').onclick = () => {
    const name = $('toolName').value.trim(); const diameter = number($('toolDiameter').value); const height = number($('toolHeight').value);
    if (!name || !(diameter > 0) || !(height > 0)) return status('Informe nome, diâmetro e altura útil maiores que zero.', true);
    const entry = { id: editingTool || uniqueId(), name, diameter, height };
    const candidate = editingTool ? tools.map(tool => tool.id === editingTool ? entry : tool) : [...tools, entry];
    try { MegaStore.writeSetting('tools', candidate); tools = candidate; if (editingTool) { for (const config of Object.values(pieceConfigs)) if (config.toolId === editingTool) config.toolSnapshot = { ...entry }; for (const entity of entities) if (entity.toolId === editingTool) entity.toolSnapshot = { ...entry }; } editingTool = null; $('toolName').value = ''; $('toolDiameter').value = ''; $('toolHeight').value = ''; $('saveTool').textContent = 'Adicionar ferramenta'; $('cancelToolEdit').hidden = true; renderTools(); $('activeTool').value = entry.id; showActiveTool(); renderPieces(); if (entities.length) render(); status('Ferramenta salva e ativada.'); }
    catch (error) { status(error.message, true); }
  };
  $('cancelToolEdit').onclick = () => { editingTool = null; $('toolName').value = ''; $('toolDiameter').value = ''; $('toolHeight').value = ''; $('saveTool').textContent = 'Adicionar ferramenta'; $('cancelToolEdit').hidden = true; };
  $('saveImport').onclick = $('updateSavedImport').onclick = async () => {
    if (savingImport) return;
    if (!rawDxf) return status('Importe um DXF antes de salvar.', true);
    const name = $('importName').value.trim();
    if (!name) {
      const message = 'Informe o nome em Importações salvas.';
      importSaveFeedback(message, true);
      return status(message, true);
    }
    importSaveFeedback('Salvando…');
    const record = snapshot();
    const currentEntities = entities;
    const currentImportId = savedImportId;
    savingImport = true;
    try {
      await MegaStore.saveImport(record);
      if (entities === currentEntities && savedImportId === currentImportId) {
        setSavedImport(record.id);
        importSaveFeedback(currentImportId ? 'Edição salva.' : 'Importação salva.');
      }
      await renderSavedImports();
      status('Importação "' + name + '" salva com ferramentas, pontes e parâmetros por caminho.');
    } catch (error) {
      if (entities === currentEntities && savedImportId === currentImportId) importSaveFeedback(error.message, true);
      status(error.message, true);
    } finally {
      savingImport = false;
    }
  };
  $('downloadBackup').onclick = () => {
    if (!rawDxf) return;
    const record = snapshot();
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${record.name.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'importacao'}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    status('Cópia JSON baixada.');
  };
  $('loadBackup').onclick = () => $('backupFile').click();
  $('backupFile').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const record = JSON.parse(await file.text()); record.id = uniqueId(); openSnapshot(record); setSavedImport(null); $('importsDialog').close(); status(`Cópia "${record.name}" aberta. Clique em Importações salvas para incluí-la na biblioteca.`); }
    catch (error) { status(`Não foi possível abrir a cópia: ${error.message}`, true); }
    event.target.value = '';
  };
  initMegaNesting(fixedMachine, snapshotEntities, pointPath, id => tools.find(tool => tool.id === id), () => $('activeTool').value,
    (record, source) => {
      const result = compensatedPaths(source);
      const defaults = machineFrom(record.machine || {});
      return { ...result, paths: result.paths.map(path => {
        const config = record.pieceConfigs?.[path.id];
        return { ...path, xy: config?.xy ?? defaults.xy, z: config?.z ?? defaults.z, rpm: config?.rpm ?? defaults.rpm };
      }) };
    }, () => stockThickness);
  renderMachine(); renderTools(); renderSavedImports();
})();
