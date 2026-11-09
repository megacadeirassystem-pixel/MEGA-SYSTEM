function nestingPoint(item, x, y) {
  const [a, b, c, d] = item.matrix;
  return [a*x + c*y + item.x - item.left, b*x + d*y - item.y - item.bottom];
}

function orientNestingItem(item, angle, mirrored) {
  const matrix = [[1,0,0,1],[0,-1,1,0],[-1,0,0,-1],[0,1,-1,0]][angle / 90].slice();
  if (mirrored) { matrix[0] *= -1; matrix[1] *= -1; }
  const [a,b,c,d] = matrix;
  const x0 = a*item.minX - c*item.maxY, x1 = a*item.maxX - c*item.minY;
  const y0 = b*item.minX - d*item.maxY, y1 = b*item.maxX - d*item.minY;
  const shape = {...item, matrix, angle, mirrored, left:Math.min(x0,x1), bottom:Math.max(y0,y1),
    width:Math.abs(x1-x0), height:Math.abs(y1-y0), cutters:[], bridges:[]};
  for (const path of item.cuts.paths) {
    const add = (run, segments, closed) => {
      const points = run.map(([x,y]) => [a*x-c*y-shape.left, b*x-d*y-shape.bottom]);
      if (closed) points.push(points[0]);
      for (let i=1; i<points.length; i++) {
        segments.push({from:points[i-1], to:points[i], radius:path.diameter/2});
      }
    };
    for (const run of path.cut) add(run, shape.cutters, path.closed);
    for (const run of path.protectedRuns || []) add(run, shape.bridges, false);
  }
  return shape;
}

function nestingSegmentsTooClose(a, b, c, d, limit) {
  for (const axis of [0,1]) {
    if (Math.max(a[axis],b[axis])+limit <= Math.min(c[axis],d[axis]) ||
        Math.max(c[axis],d[axis])+limit <= Math.min(a[axis],b[axis])) return false;
  }
  const side = (p,q,r) => (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  if (side(a,b,c)*side(a,b,d)<0 && side(c,d,a)*side(c,d,b)<0) return true;
  const distance = (p,q,r) => {
    const x=r[0]-q[0], y=r[1]-q[1];
    const t=Math.max(0,Math.min(1,((p[0]-q[0])*x+(p[1]-q[1])*y)/(x*x+y*y || 1)));
    return Math.hypot(p[0]-q[0]-t*x,p[1]-q[1]-t*y);
  };
  return Math.min(distance(a,c,d),distance(b,c,d),distance(c,a,b),distance(d,a,b)) < limit;
}

function nestingBridgeConflict(item, neighbor) {
  const x = neighbor.x-item.x, y = item.y-neighbor.y;
  for (const bridge of item.bridges) for (const cut of neighbor.cutters) {
    const limit = bridge.radius + cut.radius - 1e-7;
    if (nestingSegmentsTooClose(bridge.from, bridge.to, [cut.from[0]+x,cut.from[1]+y],
      [cut.to[0]+x,cut.to[1]+y], limit)) return true;
  }
  return false;
}

function straightNestingSpans(measure) {
  const spans = [];
  for (const edge of measure.edges) {
    const previous = spans.at(-1);
    if (previous) {
      const dx = previous.b[0] - previous.a[0], dy = previous.b[1] - previous.a[1];
      const length = Math.hypot(dx, dy);
      const nextX = edge.b[0] - edge.a[0], nextY = edge.b[1] - edge.a[1];
      const deviation = Math.abs((edge.b[0] - previous.a[0]) * dy - (edge.b[1] - previous.a[1]) * dx) / length;
      if (dx * nextX + dy * nextY > 0 && deviation <= .02 &&
          Math.abs(dx * nextY - dy * nextX) / (length * edge.size) <= .001) {
        previous.b = edge.b;
        previous.end = edge.end;
        continue;
      }
    }
    spans.push({ ...edge });
  }
  return spans;
}

function sharedNestingBridgeCandidates(items, point, width, tolerance, centerOnly = false) {
  const segments = [];
  for (const item of items) for (const path of item.cuts.paths) {
    if (path.operation !== 'macho' || !Number.isFinite(path.diameter) || path.diameter <= 0) continue;
    for (const [index, run] of path.cut.entries()) {
      const measure = MegaBridges.measure(run, path.closed);
      for (const edge of straightNestingSpans(measure)) {
        const from = nestingPoint(item, edge.a[0], -edge.a[1]);
        const to = nestingPoint(item, edge.b[0], -edge.b[1]);
        const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const direction = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
        const x = point ? point.x - from[0] : 0, y = point ? point.y - from[1] : 0;
        if (Math.abs(x * direction[1] - y * direction[0]) > tolerance) continue;
        const along = x * direction[0] + y * direction[1];
        if (along < -tolerance || along > length + tolerance) continue;
        segments.push({ item, path, index, measure, edge, from, to, direction, along, length });
      }
    }
  }

  const candidates = [];
  const epsilon = 0.0001;
  for (const [index, a] of segments.entries()) for (const b of segments.slice(index + 1)) {
    if (a.item === b.item || Math.abs(a.path.diameter - b.path.diameter) > epsilon) continue;
    const project = ([x, y]) => (x - a.from[0]) * a.direction[0] + (y - a.from[1]) * a.direction[1];
    const offAxis = ([x, y]) => (x - a.from[0]) * a.direction[1] - (y - a.from[1]) * a.direction[0];
    const offsetFrom = offAxis(b.from), offsetTo = offAxis(b.to);
    const axisGap = Math.max(Math.abs(offsetFrom), Math.abs(offsetTo));
    if (axisGap > a.path.diameter + epsilon || Math.abs(offsetFrom - offsetTo) > .02) continue;

    // Leave room for the cutter at both ends and for the protected bridge envelope.
    const half = width / 2 + a.path.diameter + .02;
    const bStart = project(b.from), bEnd = project(b.to);
    const min = Math.max(0, Math.min(bStart, bEnd)) + half + epsilon;
    const max = Math.min(a.length, Math.max(bStart, bEnd)) - half - epsilon;
    if (min > max) continue;
    if (centerOnly && (a.along < min - epsilon || a.along > max + epsilon)) continue;
    const center = point ? Math.max(min, Math.min(max, a.along)) : (min + max) / 2;
    const x = a.from[0] + center * a.direction[0], y = a.from[1] + center * a.direction[1];
    const t = (center - bStart) / (bEnd - bStart);
    const bx = b.from[0] + (b.to[0] - b.from[0]) * t;
    const by = b.from[1] + (b.to[1] - b.from[1]) * t;
    const distance = point ? Math.min(Math.hypot(x - point.x, y - point.y), Math.hypot(bx - point.x, by - point.y)) : 0;
    const score = distance + axisGap * .1;
    if (distance > tolerance) continue;
    const aCenter = a.edge.start + (a.edge.end - a.edge.start) * center / a.length;
    const bCenter = b.edge.start + (b.edge.end - b.edge.start) * t;
    candidates.push({ score, half, center: { x, y }, sides: [{ ...a, at: aCenter }, { ...b, at: bCenter }] });
  }
  return candidates;
}

function findSharedNestingBridge(items, point, width, tolerance, centerOnly = false) {
  return sharedNestingBridgeCandidates(items, point, width, tolerance, centerOnly)
    .reduce((best, candidate) => !best || candidate.score < best.score ? candidate : best, null);
}

function automaticNestingBridgeCenters(items, width) {
  const centers = [];
  for (const [index, a] of items.entries()) for (const b of items.slice(index + 1)) {
    const gap = 2 * Math.max(a.diameter, b.diameter) + .02;
    if (Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width) > gap ||
        Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height) > gap) continue;
    const pair = [a, b];
    const base = pair.map(item => ({ ...item, cuts: item.baseCuts }));
    const tolerance = Math.max(a.diameter, b.diameter) + .02;
    for (const candidate of sharedNestingBridgeCandidates(base, null, width, Infinity)) {
      centers.push({ pair, point: candidate.center, tolerance });
    }
  }
  return centers;
}

function interruptSharedNestingCut(side, half, width) {
  const { item, path, index, measure, at } = side;
  const head = MegaBridges.extract(measure, 0, at - half);
  const tail = MegaBridges.extract(measure, at + half, measure.length);
  const runs = path.closed ? [[...tail, ...head.slice(1)]] : [head, tail];
  const bridge = MegaBridges.extract(measure, at - width / 2, at + width / 2);
  const nextPath = {
    ...path,
    closed: false,
    cut: path.cut.flatMap((run, runIndex) => runIndex === index ? runs : [run]),
    protectedRuns: [...(path.protectedRuns || []), bridge],
    sharedProtectedRuns: [...(path.sharedProtectedRuns || []), bridge],
  };
  const cuts = { ...item.cuts, paths: item.cuts.paths.map(candidate => candidate === path ? nextPath : candidate) };
  const result = orientNestingItem({ ...item, cuts, cutStart: item.cutStart?.path === path ? null : item.cutStart },
    item.angle, item.mirrored);
  const protectedShape = orientNestingItem({
    ...item, cuts: { paths: [{ ...path, closed: false, cut: [], protectedRuns: [bridge] }] },
  }, item.angle, item.mirrored);
  return { result, protectedShape };
}
