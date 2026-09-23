import { PALETTE } from './Palette.js';

// As moitas de capim, uma por item de comida da simulação.
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
        const tone = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.grassDark][
          Math.floor(Math.abs(patch.lean) * 3) % 3];
        view = this.#props.bush(tone);
        view.scale.setScalar(.8 + patch.size / 16);
        this.#layer.add(view);
        this.#views.set(patch, view);
      }
      const place = this.#space.toScene(patch.x, patch.y);
      view.position.set(place.x, 0, place.z);
      view.rotation.y = patch.lean;
    }
    for (const [patch, view] of this.#views) {
      if (seen.has(patch)) continue;
      this.#layer.remove(view);
      this.#views.delete(patch);
    }
  }
}
