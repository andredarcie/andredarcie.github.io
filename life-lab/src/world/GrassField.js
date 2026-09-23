import { WORLD } from '../config/world.js';
import {
  GRASS_MIN_COUNT, GRASS_MAX_COUNT, GRASS_AREA_PER_PATCH, GRASS_REGROW_MIN, GRASS_REGROW_SPREAD
} from '../config/environment.js';
import { FoodPatch } from '../entities/FoodPatch.js';

// O capim da ilha: brota espalhado, filtrado pelo bioma, e renasce em outro lugar
// alguns segundos depois de cada moita comida.
export class GrassField {
  #state;
  #biomes;

  constructor(state, biomes) {
    this.#state = state;
    this.#biomes = biomes;
  }

  seed() {
    const count = Math.max(GRASS_MIN_COUNT, Math.min(GRASS_MAX_COUNT,
      Math.round(WORLD.width * WORLD.height / GRASS_AREA_PER_PATCH)));
    for (let i = 0; i < count; i++) this.#state.grass.push(this.createPatch());
  }

  createPatch() {
    let x, y;
    for (let attempt = 0; attempt < 32; attempt++) {
      x = 26 + Math.random() * Math.max(0, WORLD.width - 52);
      y = 26 + Math.random() * Math.max(0, WORLD.height - 52);
      if (Math.random() <= this.#biomes.habitatWeight(this.#biomes.biomeAt(x, y), 'food')) break;
    }
    return new FoodPatch({
      x, y,
      lean: (Math.random() - .5) * 2,
      size: 5 + Math.random() * 3
    });
  }

  // Mordida: a moita some e entra na fila de rebrota.
  eat(patch) {
    this.#state.grass = this.#state.grass.filter(g => g !== patch);
    this.#state.grassRegrow.push(GRASS_REGROW_MIN + Math.random() * GRASS_REGROW_SPREAD);
  }

  update({ dt }) {
    const regrow = this.#state.grassRegrow;
    for (let i = regrow.length - 1; i >= 0; i--) {
      regrow[i] -= dt;
      if (regrow[i] <= 0) {
        this.#state.grass.push(this.createPatch());
        regrow.splice(i, 1);
      }
    }
  }
}
