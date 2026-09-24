import { PALETTE } from './Palette.js';
import { PropFactory } from './PropFactory.js';
import { createContactShadow } from './ContactShadow.js';

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

  sync(patches, { elapsed = 0, wind = 0 } = {}) {
    const seen = new Set();
    for (const patch of patches) {
      seen.add(patch);
      let view = this.#views.get(patch);
      if (!view) {
        const tone = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.grassDark][
          Math.floor(Math.abs(patch.lean) * 3) % 3];
        view = this.#props.bush(tone);
        view.add(createContactShadow(PropFactory.footprint('shrub')));
        view.scale.setScalar(.8 + patch.size / 16);
        this.#layer.add(view);
        this.#views.set(patch, view);
      }
      const place = this.#space.toScene(patch.x, patch.y);
      view.position.set(place.x, 0, place.z);
      view.rotation.y = patch.lean;
      // Capim é leve: dobra mais e mais rápido que a copa das árvores.
      const phase = patch.lean * 5 + patch.x * .013;
      view.rotation.z = Math.sin(elapsed * 2.1 + phase) * wind * .06;
      view.rotation.x = Math.sin(elapsed * 1.7 + phase * 1.3) * wind * .04;
    }
    for (const [patch, view] of this.#views) {
      if (seen.has(patch)) continue;
      this.#layer.remove(view);
      this.#views.delete(patch);
    }
  }
}
