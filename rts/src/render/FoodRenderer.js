import { hillHeight } from '../world/Hills.js';
// As roças de comida, uma por item de comida da simulação: canteiros de mandioca e
// feijão, verdes no meio da caatinga cinza (PropFactory.roca).
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
        this.#layer.add(view);
        this.#views.set(patch, view);
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
