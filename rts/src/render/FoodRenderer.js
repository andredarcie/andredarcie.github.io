import { hillHeight } from '../world/Hills.js';
import { BUSH_STOCK } from '../config/rts.js';
import { ROCA_PLANTS } from './PropFactory.js';

// As roças de comida, uma por item de comida da simulação: mandioca com milho na
// beira, verdes no meio da caatinga cinza (PropFactory.roca). Cada viagem de
// colheita leva um pé de mandioca, e ele some da roça.
export class FoodRenderer {
  #layer;
  #views = new Map();
  #props;
  #space;

  constructor(layer, propFactory, space) {
    this.#layer = layer;
    this.#props = propFactory;
    this.#space = space;
  }

  sync(patches) {
    const seen = new Set();
    for (const patch of patches) {
      seen.add(patch);
      let view = this.#views.get(patch);
      if (!view) {
        view = this.#props.roca(Math.round((patch.x + patch.y) * 7));
        view.scale.setScalar(.6 + patch.size / 20);
        view.userData.shown = -1;
        this.#layer.add(view);
        this.#views.set(patch, view);
      }
      // Pés que ainda restam: o estoque inteiro são todos os pés; cada viagem leva um.
      const left = Math.max(0, Math.min(ROCA_PLANTS, Math.ceil(patch.stock / BUSH_STOCK * ROCA_PLANTS)));
      if (view.userData.shown !== left) {
        view.userData.shown = left;
        view.children[0].geometry.setDrawRange(0, view.userData.ends[left]);
      }
      const place = this.#space.toScene(patch.x, patch.y);
      view.position.set(place.x, hillHeight(patch.x, patch.y), place.z);
      view.rotation.y = patch.lean;
    }
    for (const [patch, view] of this.#views) {
      if (seen.has(patch)) continue;
      this.#layer.remove(view);
      this.#views.delete(patch);
    }
  }
}
