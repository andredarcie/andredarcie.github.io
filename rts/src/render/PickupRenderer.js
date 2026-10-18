import * as THREE from 'three';
import { weaponModel } from './WeaponModels.js';
import { hillHeight } from '../world/Hills.js';

// O fuzil caído sai a pouco mais da metade do modelo: inteiro, ele tomava conta do
// chão; a um terço, sumia dentro do anel.
const SCALE = .55;
// Altura em que o fuzil caído flutua, e quanto ele sobe e desce.
const HOVER = 2.6;
const BOB = .3;
// O fuzil (15 de comprido) tem a origem no punho, com o cano para -y: deitado, o
// meio dele fica a esta distância do punho.
const RIFLE_MIDDLE = 2.5;
// Contorno verde em volta do fuzil, em unidades do modelo (encolhido pelo SCALE): o
// verde é a cor do que dá para pegar, como o anel no chão; o amarelo fica para a base.
const OUTLINE = .55;
const OUTLINE_COLOR = 0x5cff7a;
// O anel verde no chão em volta do fuzil, em unidades do mundo, e quanto a onda abre
// além dele. Fica na cena 3D, embaixo do fuzil: na sobreposição 2D ele tapava a arma.
const RING = 5.2;
const WAVE = 3;
const GROUND_LIFT = .12;

// Os fuzis caídos dos soldados abatidos (state.pickups): o Mannlicher de verdade
// (WeaponModels), deitado no ar um pouco acima do chão, subindo e descendo devagar
// e girando, para chamar o olho e dizer "dá para pegar", com contorno verde para
// destacar do chão. Embaixo, um anel verde deitado no chão pulsa devagar; o fuzil
// passa por cima dele. Verde é a cor dos itens coletáveis; o amarelo é da base e dos
// soldados dela. Mais de um fuzil no mesmo lugar (oficial, canhão, comboio) aparece
// como um feixe de dois ou três.
export class PickupRenderer {
  #layer;
  #space;
  #views = new Map();

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(pickups, { elapsed = 0, animate = true } = {}) {
    const seen = new Set();
    for (const pickup of pickups) {
      seen.add(pickup);
      let view = this.#views.get(pickup);
      if (!view) {
        view = this.#build(pickup);
        this.#layer.add(view);
        this.#views.set(pickup, view);
      }
      const { phase, rifles, wave } = view.userData;
      const place = this.#space.toScene(pickup.x, pickup.y);
      view.position.set(place.x, hillHeight(pickup.x, pickup.y), place.z);
      const bob = animate ? Math.sin(elapsed * 2.2 + phase) * BOB : 0;
      rifles.position.y = HOVER + bob;
      rifles.rotation.y = animate ? elapsed * .9 + phase : phase;
      // Onda abrindo para fora e sumindo: chama o olho sem piscar.
      const pulse = animate ? (elapsed * .9 + pickup.x * .01) % 1 : .5;
      wave.scale.setScalar(RING + pulse * WAVE);
      wave.material.opacity = (1 - pulse) * .7;
    }
    for (const [pickup, view] of this.#views) {
      if (seen.has(pickup)) continue;
      this.#layer.remove(view);
      view.userData.wave.material.dispose();
      this.#views.delete(pickup);
    }
  }

  #build(pickup) {
    const view = new THREE.Group();
    const group = new THREE.Group();
    group.scale.setScalar(SCALE);
    const copies = Math.min(3, pickup.count);
    for (let i = 0; i < copies; i++) {
      const rifle = weaponModel('rifle').group;
      // Deitado: o cano vira para o lado (y → x) e o fuzil fica centrado no giro.
      rifle.rotation.set(0, i * .5, Math.PI / 2);
      rifle.position.set(-RIFLE_MIDDLE, i * .7, (i - (copies - 1) / 2) * 1.1);
      PickupRenderer.#outline(rifle);
      group.add(rifle);
    }
    const wave = PickupRenderer.#ringMesh(.94, 1, 0x5cff7a, .7);
    wave.material = wave.material.clone();
    view.add(
      PickupRenderer.#ringMesh(0, RING, 0x5cff7a, .16),
      PickupRenderer.#ringMesh(RING - .25, RING + .3, 0x061e0c, .6),
      PickupRenderer.#ringMesh(RING - .12, RING + .17, 0x5cff7a, 1),
      wave,
      group
    );
    view.userData = { phase: Math.random() * Math.PI * 2, rifles: group, wave };
    return view;
  }

  // Um anel (ou disco, com inner 0) deitado rente ao chão. Transparente e sem
  // gravar profundidade: não briga com o chão, e o fuzil por cima o cobre.
  static #rings = new Map();
  static #ringMesh(inner, outer, color, opacity) {
    const key = `${inner}:${outer}:${color}:${opacity}`;
    let shared = PickupRenderer.#rings.get(key);
    if (!shared) {
      const geometry = inner > 0 ? new THREE.RingGeometry(inner, outer, 48) : new THREE.CircleGeometry(outer, 48);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
      shared = { geometry, material };
      PickupRenderer.#rings.set(key, shared);
    }
    const mesh = new THREE.Mesh(shared.geometry, shared.material);
    mesh.position.y = GROUND_LIFT;
    return mesh;
  }

  // Casca invertida: cada peça ganha uma cópia inflada pela normal, só com as faces
  // de trás, em verde liso — sobra uma borda em volta da silhueta.
  static #outlineMaterial = null;
  static #outline(rifle) {
    PickupRenderer.#outlineMaterial ??= PickupRenderer.#makeOutlineMaterial();
    const meshes = [];
    rifle.traverse(node => { if (node.isMesh) meshes.push(node); });
    for (const mesh of meshes) {
      const hull = new THREE.Mesh(mesh.geometry, PickupRenderer.#outlineMaterial);
      hull.castShadow = false;
      mesh.add(hull);
    }
  }

  static #makeOutlineMaterial() {
    const material = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
 transformed += normalize(normal) * ${OUTLINE.toFixed(3)};`
      );
    };
    return material;
  }
}
