import * as THREE from 'three';

// Opacidade de quem está na frente de um bicho, e quanto do caminho até ela anda a
// cada quadro (a transição leva uns poucos quadros, sem piscar).
const FADED_OPACITY = .26;
const FADE_STEP = .2;
// Um pouco de folga na caixa do bicho, para o efeito começar antes de ele sumir.
const TARGET_PADDING = 1.5;

// Transparência de quem tapa: árvore, cacto, pedra ou cabana que está entre a câmera
// e um bicho fica translúcida enquanto ele estiver atrás, e volta aos poucos quando
// ele sai. A conta é feita no espaço da câmera, onde "na frente" é só profundidade e
// "tapar" é sobreposição de caixas na tela — a câmera é ortográfica, então a caixa
// de cada coisa na tela é exata o bastante.
//
// Quem desenha bichos fornece `targets()`; quem desenha o que pode tapar fornece
// `occluders()`. Cada um devolve itens { x, y, z (cena), radius, height } — o
// oclusor com `object` (o Object3D a esmaecer).
export class OcclusionFader {
  #rig;
  #targets;
  #occluderSources;
  #fades = new Map();
  #toCamera = new THREE.Matrix4();
  #point = new THREE.Vector3();

  constructor(cameraRig, { targets, occluders }) {
    this.#rig = cameraRig;
    this.#targets = targets;
    this.#occluderSources = occluders;
  }

  update() {
    const camera = this.#rig.camera;
    this.#toCamera.copy(camera.matrixWorld).invert();
    const targets = this.#targets.targets().map(item => this.#box(item, TARGET_PADDING));
    const live = new Set();
    for (const source of this.#occluderSources) {
      for (const occluder of source.occluders()) {
        live.add(occluder.object);
        const box = this.#box(occluder, 0);
        // Tapa se está mais perto da câmera que o bicho e as caixas se cruzam na tela.
        const hiding = targets.some(target => box.depth > target.depth + 1 &&
          box.left < target.right && box.right > target.left &&
          box.bottom < target.top && box.top > target.bottom);
        const current = this.#fades.get(occluder.object) ?? 1;
        const wanted = hiding ? FADED_OPACITY : 1;
        let next = current + (wanted - current) * FADE_STEP;
        if (Math.abs(next - wanted) < .01) next = wanted;
        if (next !== current || hiding) this.#apply(occluder.object, next);
        this.#fades.set(occluder.object, next);
      }
    }
    // Quem saiu da cena (árvore cortada virou toco, cabana refeita) sai da conta.
    for (const object of this.#fades.keys()) if (!live.has(object)) this.#fades.delete(object);
  }

  // Caixa na tela (unidades da câmera) e profundidade (maior = mais perto).
  #box({ x, y = 0, z, radius, height }, padding) {
    const base = this.#point.set(x, y, z).applyMatrix4(this.#toCamera);
    const baseX = base.x, baseY = base.y, depth = base.z;
    const top = this.#point.set(x, y + height, z).applyMatrix4(this.#toCamera);
    // O pé ocupa um losango no chão: na tela, meia-largura ~ raio e meia-altura
    // ~ raio × seno da elevação.
    const flat = radius * .58;
    return {
      left: baseX - radius - padding,
      right: baseX + radius + padding,
      bottom: Math.min(baseY, top.y) - flat - padding,
      top: Math.max(baseY, top.y) + flat + padding,
      depth
    };
  }

  // Troca o material de cada peça por uma cópia transparente (criada uma vez por
  // peça), porque os materiais das plantas são compartilhados entre muitas — mexer
  // no original apagaria a mata inteira. Opaco de novo, volta o original.
  #apply(object, opacity) {
    object.traverse(node => {
      if (!node.isMesh || node.userData.skipFade) return;
      const data = node.userData;
      if (opacity >= 1) {
        if (data.solidMaterial) node.material = data.solidMaterial;
        return;
      }
      if (!data.solidMaterial || (node.material !== data.fadedMaterial && node.material !== data.solidMaterial)) {
        data.solidMaterial = node.material;
        data.fadedMaterial = Array.isArray(node.material)
          ? node.material.map(OcclusionFader.#fadeCopy)
          : OcclusionFader.#fadeCopy(node.material);
      }
      for (const material of [data.fadedMaterial].flat()) material.opacity = opacity;
      node.material = data.fadedMaterial;
    });
  }

  static #fadeCopy(material) {
    const copy = material.clone();
    copy.transparent = true;
    // Translúcido não escreve profundidade: o bicho atrás aparece por inteiro.
    copy.depthWrite = false;
    return copy;
  }
}
