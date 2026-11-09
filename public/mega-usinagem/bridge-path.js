'use strict';

// Each bridge is a length along an external contour. Its entire width remains uncut.
const MegaBridges = (() => {
  const EPS = 1e-7;
  const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  function measure(points, closed = false) {
    if (!Array.isArray(points) || points.length < 2) throw Error('Contorno inválido para pontes.');
    const edges = [];
    let length = 0;
    const count = points.length - (closed ? 0 : 1);
    for (let i = 0; i < count; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const size = distance(a, b);
      if (size <= EPS) continue;
      edges.push({ a, b, start: length, end: length + size, size });
      length += size;
    }
    if (length <= EPS) throw Error('Contorno sem comprimento para pontes.');
    return { edges, length, closed };
  }

  function nearest(contour, point) {
    let best = null;
    for (const edge of contour.edges) {
      const dx = edge.b[0] - edge.a[0], dy = edge.b[1] - edge.a[1];
      const u = Math.max(0, Math.min(1, ((point[0] - edge.a[0]) * dx + (point[1] - edge.a[1]) * dy) / (edge.size ** 2)));
      const hit = [edge.a[0] + dx * u, edge.a[1] + dy * u];
      const gap = distance(hit, point);
      if (!best || gap < best.distance) best = { at: edge.start + edge.size * u, point: hit, distance: gap };
    }
    if (best && contour.closed && best.at >= contour.length - EPS) best.at = 0;
    return best;
  }

  function pointAt(contour, at) {
    const s = Math.max(0, Math.min(contour.length, at));
    const edge = contour.edges.find(e => s <= e.end + EPS) || contour.edges.at(-1);
    const u = Math.max(0, Math.min(1, (s - edge.start) / edge.size));
    return [edge.a[0] + (edge.b[0] - edge.a[0]) * u, edge.a[1] + (edge.b[1] - edge.a[1]) * u];
  }

  function extract(contour, from, to) {
    if (to - from <= EPS) return [];
    const result = [pointAt(contour, from)];
    for (const edge of contour.edges) if (edge.end > from + EPS && edge.end < to - EPS) result.push(edge.b);
    result.push(pointAt(contour, to));
    return result;
  }

  function intervals(contour, bridge) {
    const width = Number(bridge.width), at = Number(bridge.at);
    if (!(Number.isFinite(width) && width > 0 && width < contour.length - EPS && Number.isFinite(at))) throw Error('Largura ou posição inválida da ponte.');
    if (!contour.closed && (at - width / 2 < -EPS || at + width / 2 > contour.length + EPS)) throw Error('A ponte ultrapassa a extremidade do contorno.');
    const center = contour.closed ? ((at % contour.length) + contour.length) % contour.length : at;
    let start = center - width / 2, end = center + width / 2;
    if (!contour.closed) return [[Math.max(0, start), Math.min(contour.length, end)]];
    if (start < 0) return [[0, end], [contour.length + start, contour.length]];
    if (end > contour.length) return [[0, end - contour.length], [start, contour.length]];
    return [[start, end]];
  }

  function validate(contour, existing, candidate) {
    const proposed = intervals(contour, candidate);
    for (const bridge of existing) for (const [a, b] of intervals(contour, bridge)) for (const [c, d] of proposed) {
      if (Math.min(b, d) - Math.max(a, c) > -EPS) throw Error('A ponte encosta ou se sobrepõe a outra ponte.');
    }
    return candidate;
  }

  function split(points, closed, bridges = []) {
    const contour = measure(points, closed);
    const all = bridges.flatMap(bridge => intervals(contour, bridge)).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [start, end] of all) {
      const previous = merged.at(-1);
      if (previous && start <= previous[1] + EPS) previous[1] = Math.max(previous[1], end);
      else merged.push([start, end]);
    }
    const cut = [], intact = [];
    let cursor = 0;
    for (const [start, end] of merged) {
      if (start > cursor + EPS) cut.push(extract(contour, cursor, start));
      intact.push(extract(contour, start, end));
      cursor = end;
    }
    if (cursor < contour.length - EPS) cut.push(extract(contour, cursor, contour.length));
    return { cut, intact, length: contour.length, bridgeLength: merged.reduce((sum, [a, b]) => sum + b - a, 0) };
  }

  return { measure, nearest, pointAt, intervals, validate, split, extract };
})();

if (typeof module !== 'undefined') module.exports = MegaBridges;
