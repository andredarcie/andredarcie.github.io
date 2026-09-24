import { pseudoRandom } from '../core/math.js';
import { WORLD, SCENERY_DENSITY, SCENERY_KINDS, SCENERY_SAMPLES, FOOTPRINT } from '../config/world.js';
import { CHOP_HITS } from '../config/settlement.js';
import { Tree } from '../entities/Tree.js';

// Decide o que nasce onde: pedra, cacto e arbusto viram enfeite; árvore vira recurso
// da simulação. A cena não sorteia nada — recebe a lista pronta e só decide como cada
// coisa é de blocos.
export class SceneryPlanner {
  #state;
  #biomes;
  #occupancy;

  constructor(state, biomes, occupancy) {
    this.#state = state;
    this.#biomes = biomes;
    this.#occupancy = occupancy;
  }

  // Planta as árvores e os enfeites no estado (um de cada vez, cada um conferindo o
  // lugar contra os que já nasceram) e devolve os enfeites para a cena.
  plan() {
    const items = this.#state.scenery;
    const margin = 34;
    const clearing = Math.min(WORLD.width, WORLD.height) * .27;
    for (let i = 0; i < SCENERY_SAMPLES; i++) {
      const seed = i * 13 + 7;
      const x = margin + pseudoRandom(seed) * (WORLD.width - margin * 2);
      const y = margin + pseudoRandom(seed + 1) * (WORLD.height - margin * 2);
      // A clareira do meio fica aberta: é onde os bichos se juntam e onde os nomes e
      // balões precisam de espaço livre para serem lidos.
      if (Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) < clearing) continue;
      const biome = this.#biomes.biomeAt(x, y);
      if (pseudoRandom(seed + 2) > SCENERY_DENSITY[biome]) continue;
      const kind = SceneryPlanner.#kindFor(biome, pseudoRandom(seed + 3));
      // Nem dentro de lago, nem em cima de outra planta ou pedra. A chuva abre lagos
      // novos depois, mas eles também conferem o lugar (PondSystem).
      if (!this.#occupancy.isFree(x, y, FOOTPRINT[kind] ?? 5)) continue;
      // Árvore dentro do mundo é recurso da simulação, não enfeite: vai para a
      // lista de árvores, que a cena desenha e anima à parte.
      if (kind === 'conifer' || kind === 'broadleaf') {
        this.#state.trees.push(new Tree({
          id: this.#state.trees.length + 1, x, y, kind, seed, health: CHOP_HITS
        }));
        continue;
      }
      items.push({ x, y, seed, kind });
    }
    return items;
  }

  static #kindFor(biome, roll) {
    return (SCENERY_KINDS[biome].find(([, limit]) => roll <= limit) || SCENERY_KINDS[biome][0])[0];
  }
}
