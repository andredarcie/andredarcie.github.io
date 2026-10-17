import * as THREE from 'three';
import { weaponModel } from './WeaponModels.js';
import { hillHeight } from '../world/Hills.js';

// O fuzil caído sai a um terço do tamanho do modelo: inteiro, ele tomava conta do chão.
const SCALE = 1 / 3;
// Altura em que o fuzil caído flutua, e quanto ele sobe e desce.
const HOVER = 1.8;
const BOB = .3;
// O fuzil (15 de comprido) tem a origem no punho, com o cano para -y: deitado, o
// meio dele fica a esta distância do punho.
const RIFLE_MIDDLE = 2.5;

// Os fuzis caídos dos soldados abatidos (state.pickups): o Mannlicher de verdade
// (WeaponModels), deitado no ar um pouco acima do chão, subindo e descendo devagar
// e girando, para chamar o olho e dizer "dá para pegar". O anel no chão em volta
// vem da sobreposição (PickupLayer). Mais de um fuzil no mesmo lugar (oficial,
// canhão, comboio) aparece como um feixe de dois ou três.
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
      const phase = view.userData.phase;
      const place = this.#space.toScene(pickup.x, pickup.y);
      const bob = animate ? Math.sin(elapsed * 2.2 + phase) * BOB : 0;
      view.position.set(place.x, hillHeight(pickup.x, pickup.y) + HOVER + bob, place.z);
      view.rotation.y = animate ? elapsed * .9 + phase : phase;
    }
    for (const [pickup, view] of this.#views) {
      if (seen.has(pickup)) continue;
      this.#layer.remove(view);
      this.#views.delete(pickup);
    }
  }

  #build(pickup) {
    const group = new THREE.Group();
    group.scale.setScalar(SCALE);
    group.userData.phase = Math.random() * Math.PI * 2;
    const copies = Math.min(3, pickup.count);
    for (let i = 0; i < copies; i++) {
      const rifle = weaponModel('rifle').group;
      // Deitado: o cano vira para o lado (y → x) e o fuzil fica centrado no giro.
      rifle.rotation.set(0, i * .5, Math.PI / 2);
      rifle.position.set(-RIFLE_MIDDLE, i * .7, (i - (copies - 1) / 2) * 1.1);
      group.add(rifle);
    }
    return group;
  }
}
