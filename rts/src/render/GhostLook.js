import * as THREE from 'three';

// Quanto da obra fantasma aparece: o bastante para ler a forma, pouco para não
// passar por construção de verdade.
const GHOST_OPACITY = .45;
// Casa vermelha da grade: a obra fantasma puxa para o vermelho também.
const BLOCKED = new THREE.Color(0xff5a48);

// A obra fantasma do modo de obra: o mesmo modelo da construção pronta, com cada
// material trocado por uma cópia transparente (sem escrever profundidade, para não
// recortar o que está atrás) e sem sombra projetada. As cópias são da fantasma, e
// quem a descarta descarta junto (`userData.ghost` marca as peças).
export function ghostify(group, open) {
  const fade = material => {
    const copy = material.clone();
    copy.transparent = true;
    copy.opacity = (material.transparent ? material.opacity : 1) * GHOST_OPACITY;
    copy.depthWrite = false;
    if (!open && copy.color) copy.color.lerp(BLOCKED, .55);
    return copy;
  };
  group.traverse(node => {
    if (!node.isMesh) return;
    node.material = Array.isArray(node.material) ? node.material.map(fade) : fade(node.material);
    node.castShadow = false;
    node.userData.ghost = true;
  });
}

// Solta os materiais copiados por ghostify.
export function disposeGhost(group) {
  group.traverse(node => {
    if (!node.isMesh || !node.userData.ghost) return;
    for (const material of [node.material].flat()) material.dispose();
  });
}

// Fator de transparência da fantasma, para quem acerta a opacidade a cada quadro
// (as chamas da fogueira).
export const ghostFade = building => building.preview ? GHOST_OPACITY : 1;
