import { pseudoRandom } from '../core/math.js';
import { WORLD, BORDER_FOREST_DEPTH, SCENERY_DENSITY, SCENERY_KINDS } from '../config/world.js';
import { CHOP_HITS } from '../config/settlement.js';
import { Tree } from '../entities/Tree.js';

// Decide o que nasce onde: pedra, cacto e arbusto viram enfeite; árvore dentro do
// mundo vira recurso da simulação; a mata em volta marca onde o mundo acaba. A cena
// não sorteia nada — recebe a lista pronta e só decide como cada coisa é de blocos.
export class SceneryPlanner {
  #state;
  #biomes;

  constructor(state, biomes) {
    this.#state = state;
    this.#biomes = biomes;
  }

  // Planta as árvores no estado e devolve os enfeites para a cena.
  plan() {
    const items = [];
    const margin = 34;
    const clearing = Math.min(WORLD.width, WORLD.height) * .27;
    for (let i = 0; i < 460; i++) {
      const seed = i * 13 + 7;
      const x = margin + pseudoRandom(seed) * (WORLD.width - margin * 2);
      const y = margin + pseudoRandom(seed + 1) * (WORLD.height - margin * 2);
      // A clareira do meio fica aberta: é onde os bichos se juntam e onde os nomes e
      // balões precisam de espaço livre para serem lidos.
      if (Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) < clearing) continue;
      // Desvia das poças que existem agora. A chuva reposiciona poças depois, e aí
      // uma árvore pode acabar dentro de uma: é só visual, não atrapalha beber.
      if (this.#state.ponds.some(pond => Math.hypot(x - pond.x, y - pond.y) < pond.fullRadius + 14)) continue;
      const biome = this.#biomes.biomeAt(x, y);
      if (pseudoRandom(seed + 2) > SCENERY_DENSITY[biome]) continue;
      const kind = SceneryPlanner.#kindFor(biome, pseudoRandom(seed + 3));
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
    // Mata em volta da área dos bichos: mais fechada que o normal do bioma, é ela
    // que marca na paisagem onde o mundo acaba, agora que não há mais borda de ilha.
    for (let i = 0; i < 480; i++) {
      const seed = i * 17 + 50003;
      const x = -BORDER_FOREST_DEPTH + pseudoRandom(seed) * (WORLD.width + BORDER_FOREST_DEPTH * 2);
      const y = -BORDER_FOREST_DEPTH + pseudoRandom(seed + 1) * (WORLD.height + BORDER_FOREST_DEPTH * 2);
      if (x > 0 && x < WORLD.width && y > 0 && y < WORLD.height) continue;
      const biome = this.#biomes.biomeAt(x, y);
      if (pseudoRandom(seed + 2) > Math.min(1, SCENERY_DENSITY[biome] * 1.4)) continue;
      items.push({ x, y, seed, kind: SceneryPlanner.#kindFor(biome, pseudoRandom(seed + 3)), decor: true });
    }
    return items;
  }

  static #kindFor(biome, roll) {
    return (SCENERY_KINDS[biome].find(([, limit]) => roll <= limit) || SCENERY_KINDS[biome][0])[0];
  }
}
