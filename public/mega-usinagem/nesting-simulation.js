'use strict';

function nestingCutFits(item, path, stock) {
  const radius = path.diameter / 2;
  return [path.depth, path.xy, path.z, path.diameter].every(value => Number.isFinite(value) && value > 0) &&
    path.cut.every(run => run.every(([x, y]) => {
      const [sheetX, sheetY] = nestingPoint(item, x, -y);
      return sheetX >= radius - 1e-6 && sheetX <= stock.x - radius + 1e-6 &&
        -sheetY >= radius - 1e-6 && -sheetY <= stock.y - radius + 1e-6;
    }));
}

function selectNestingCutStart(item, target, stock) {
  let best = null;
  for (const path of item.cuts.paths) {
    if (path.operation !== 'macho' || !nestingCutFits(item, path, stock)) continue;
    for (const [index, run] of path.cut.entries()) {
      if (run.length < 2) continue;
      const measure = MegaBridges.measure(run, path.closed);
      const nearest = MegaBridges.nearest(measure, target);
      if (nearest && (!best || nearest.distance < best.distance)) {
        best = { path, index, at: nearest.at, distance: nearest.distance };
      }
    }
  }
  return best;
}

function nestingOrderedRuns(path, start) {
  const chosen = start?.path === path;
  if (path.closed) {
    const points = path.cut[0];
    if (!chosen || !start.at) return [[...points, points[0]]];
    const measure = MegaBridges.measure(points, true);
    const tail = MegaBridges.extract(measure, start.at, measure.length);
    const head = MegaBridges.extract(measure, 0, start.at);
    return [[...tail, ...head.slice(1)]];
  }
  if (!chosen) return path.cut;
  const run = path.cut[start.index];
  const measure = MegaBridges.measure(run);
  const tail = MegaBridges.extract(measure, start.at, measure.length);
  const head = MegaBridges.extract(measure, 0, start.at).reverse();
  return [tail, head, ...path.cut.filter((_, index) => index !== start.index)].filter(points => points.length > 1);
}


function initNestingSimulation(svg, machine, svgElement) {
  const $ = id => document.getElementById(id);
  const progress = $('nestingProgress');
  const play = $('nestingPlay');
  const labels = { femea: 'Fêmea / furos', macho: 'Corte externo', rapid: 'Deslocamento XY' };
  const colors = { femea: '#a04bb7', macho: '#d44942' };
  const secondsText = seconds => {
    const whole = Math.round(seconds);
    return [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60]
      .map(value => String(value).padStart(2, '0')).join(':');
  };
  let marker, overlay, moves = [], changes = [], total = 0, elapsed = 0, frame = 0;
  let previousFrame = null, confirmedChange = -1, issues = '';

  function pointOnSheet(item, [x, y]) {
    return nestingPoint(item, x, -y);
  }


  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = null;
  }

  function update() {
    progress.value = total ? Math.round(elapsed / total * 1000) : 0;
    const move = moves.find(move => move.end > elapsed) || moves.at(-1);
    if (move) {
      const t = Math.max(0, Math.min(1, (elapsed - move.start) / (move.end - move.start)));
      marker.setAttribute('cx', move.from[0] + (move.to[0] - move.from[0]) * t);
      marker.setAttribute('cy', move.from[1] + (move.to[1] - move.from[1]) * t);
    }
    const change = changes[confirmedChange + 1];
    const waiting = change && elapsed >= change.at;
    play.textContent = waiting ? 'Confirmar ferramenta e continuar' :
      elapsed > 0 && elapsed < total ? 'Continuar simulação' : 'Iniciar simulação';
    const status = $('nestingSimStatus');
    if (!total) {
      status.textContent = issues || 'Configure os caminhos de usinagem dos desenhos para simular.';
    } else {
      const step = waiting ? 'Confirme a ferramenta ' + change.name + ' para continuar.' :
        elapsed >= total ? 'Simulação concluída.' : labels[move.kind];
      status.textContent = secondsText(elapsed) + ' / ' + secondsText(total) + ' · ' + step + (issues ? ' ' + issues : '');
    }
  }

  function tick(now) {
    const delta = previousFrame === null ? 0 : (now - previousFrame) / 1000;
    previousFrame = now;
    elapsed = Math.min(total, elapsed + delta * Number($('nestingSpeed').value));
    const change = changes[confirmedChange + 1];
    if (change && elapsed >= change.at) {
      elapsed = change.at;
      stop();
    } else if (elapsed >= total) {
      stop();
    } else {
      frame = requestAnimationFrame(tick);
    }
    update();
  }

  play.onclick = () => {
    if (frame || !total) return;
    if (elapsed >= total) {
      elapsed = 0;
      confirmedChange = -1;
    }
    const next = changes[confirmedChange + 1];
    if (next && elapsed >= next.at) confirmedChange++;
    frame = requestAnimationFrame(tick);
    update();
  };
  $('nestingPause').onclick = stop;
  $('nestingReset').onclick = () => { stop(); elapsed = 0; confirmedChange = -1; update(); };
  progress.oninput = () => {
    stop();
    elapsed = total * Number(progress.value) / 1000;
    confirmedChange = changes.findLastIndex(change => change.at < elapsed);
    update();
  };

  function draw(items, showPaths, cutView, stock) {
    stop();
    moves = [];
    changes = [];
    elapsed = total = 0;
    confirmedChange = -1;
    overlay = svgElement('g', { 'pointer-events': 'none' });
    svg.append(overlay);
    const times = { femea: 0, macho: 0, rapid: 0 };
    let current = [0, 0], currentTool = null;
    let incomplete = items.filter(item => !item.cuts.paths.length || item.cuts.unclosed || item.cuts.errors.length).length;
    function move(to, duration, kind) {
      if (duration > 0) {
        moves.push({ from: current, to, start: total, end: total + duration, kind });
        total += duration;
        times[kind] += duration;
      }
      current = to;
    }
    const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const starts = [];
    for (const operation of ['femea', 'macho']) for (const item of items) {
      const paths = item.cuts.paths.filter(path => path.operation === operation);
      const start = item.cutStart;
      const index = paths.indexOf(start?.path);
      if (index > 0) paths.unshift(...paths.splice(index, 1));
      for (const path of paths) {
        if (!nestingCutFits(item, path, stock)) {
          incomplete++;
          continue;
        }
        const runs = nestingOrderedRuns(path, start).map(run => run.map(point => pointOnSheet(item, point)));
        if (path === start?.path && runs[0]?.length) starts.push(runs[0][0]);
        const visibleBridges = showPaths || cutView ? path.protectedRuns : path.sharedProtectedRuns;
        for (const run of visibleBridges || []) {
          overlay.append(svgElement('polyline', {
            points: run.map(point => pointOnSheet(item, point).join(',')).join(' '),
            fill: 'none', stroke: '#cc9000', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke',
          }));
        }
        const tool = path.tool.id + '|' + path.diameter;
        if (tool !== currentTool) {
          changes.push({ at: total, name: path.tool.name });
          currentTool = tool;
        }
        for (const run of runs) {
          if (run.length < 2) continue;
          move(run[0], distance(current, run[0]) / machine.rapid, 'rapid');
          move(run[0], path.depth / path.z, operation);
          for (const point of run.slice(1)) move(point, distance(current, point) / path.xy, operation);
          if (showPaths || cutView) overlay.append(svgElement('polyline', {
            points: run.map(point => point.join(',')).join(' '), fill: 'none',
            stroke: cutView ? '#fff' : colors[operation], 'stroke-width': path.diameter, 'stroke-opacity': cutView ? 1 : .25,
            'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          }));
        }
      }
    }
    move([0, 0], distance(current, [0, 0]) / machine.rapid, 'rapid');
    marker = svgElement('circle', { r: Math.min(stock.x, stock.y) * .008, fill: '#f1b91c', stroke: '#18212d', 'vector-effect': 'non-scaling-stroke' });
    if (total) overlay.append(marker);
    for (const [x, y] of starts) {
      for (const [stroke, width] of [['#fff', 13], ['#f28c28', 9]]) {
        overlay.append(svgElement('path', {
          d: 'M ' + x + ' ' + y + ' h 0',
          fill: 'none', stroke, 'stroke-width': width, 'stroke-linecap': 'round',
          'vector-effect': 'non-scaling-stroke',
        }));
      }
    }
    $('nestingTimes').replaceChildren();
    for (const [label, value] of [...Object.entries(times).map(([key, value]) => [labels[key], value]), ['Total estimado', total]]) {
      const cell = document.createElement('div');
      cell.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = secondsText(value);
      cell.append(strong);
      $('nestingTimes').append(cell);
    }
    issues = incomplete ? 'Estimativa parcial. Há desenhos sem caminho válido ou cortes fora da chapa.' : '';
    play.disabled = progress.disabled = !total;
    update();
  }

  return { draw, stop };
}
