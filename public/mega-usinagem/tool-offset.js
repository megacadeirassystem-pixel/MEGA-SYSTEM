'use strict';

// The DXF contour is the finished edge. This returns the cutter CENTER path.
const MegaOffsets = (() => {
  const SCALE = 100000;

  function offset(points, operation, diameter) {
    if (!['macho', 'femea'].includes(operation)) throw Error('Operação inválida para compensação.');
    if (!Number.isFinite(diameter) || diameter <= 0) throw Error('Diâmetro da ferramenta inválido.');
    if (!Array.isArray(points) || points.length < 3 || points.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) throw Error('Contorno fechado inválido para compensação.');
    const path = points.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }));
    if (ClipperLib.Clipper.Area(path) < 0) path.reverse();
    if (Math.abs(ClipperLib.Clipper.Area(path)) < SCALE * SCALE * 1e-8) throw Error('Contorno sem área para compensação.');
    const output = new ClipperLib.Paths();
    const clipper = new ClipperLib.ClipperOffset(2, .01 * SCALE);
    clipper.AddPath(path, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
    clipper.Execute(output, (operation === 'macho' ? 1 : -1) * diameter / 2 * SCALE);
    if (output.length !== 1 || output[0].length < 3) throw Error(operation === 'femea'
      ? `A fresa Ø${diameter} mm não cabe neste furo/contorno interno.`
      : 'Não foi possível compensar o contorno externo.');
    return output[0].map(point => [point.X / SCALE, point.Y / SCALE]);
  }

  return { offset };
})();

if (typeof module !== 'undefined') module.exports = MegaOffsets;
