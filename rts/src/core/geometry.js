// Geometria plana pura, sem nada de three.js nem de DOM.

// Polígono convexo ([{x, y}], em ordem) encosta num retângulo ({left, top, right,
// bottom})? Teorema do eixo separador: se existe um eixo — os dois do retângulo ou a
// normal de alguma aresta do polígono — em que as projeções não se cruzam, eles
// estão separados; se nenhum separa, se tocam.
export function polygonOverlapsRect(polygon, rect) {
  const corners = [
    { x: rect.left, y: rect.top }, { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom }, { x: rect.left, y: rect.bottom }
  ];
  const axes = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    axes.push({ x: a.y - b.y, y: b.x - a.x });
  }
  return axes.every(axis => {
    const [minA, maxA] = project(polygon, axis);
    const [minB, maxB] = project(corners, axis);
    return maxA > minB && maxB > minA;
  });
}

function project(points, axis) {
  let min = Infinity, max = -Infinity;
  for (const point of points) {
    const value = point.x * axis.x + point.y * axis.y;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}
