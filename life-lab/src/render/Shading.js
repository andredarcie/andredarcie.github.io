import * as THREE from 'three';

// Oclusão de ambiente fingida, direto na geometria: cada vértice ganha uma cor que
// escurece perto da base e clareia no topo. Multiplicada pela cor do material, dá a
// cada bloco o degradê que a luz rebatida faz de verdade — o pé de um tronco, a
// barriga de uma copa e o chão de uma pedra ficam mais escuros —, sem custo por
// quadro. Só serve com material de `vertexColors: true`.
export function addVerticalShade(geometry, bottom = .68, top = 1.06) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const height = Math.max(1e-6, max.y - min.y);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) - min.y) / height;
    // Curva suave: o escuro fica concentrado bem no pé, como sombra de contato.
    const shade = bottom + (top - bottom) * Math.sqrt(t);
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function shadedBox(width, height, depth, bottom, top) {
  return addVerticalShade(new THREE.BoxGeometry(width, height, depth), bottom, top);
}
