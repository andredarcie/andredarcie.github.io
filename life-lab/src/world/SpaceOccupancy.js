import { FOOTPRINT, FOOTPRINT_GAP, POND_CLEARANCE } from '../config/world.js';
import { hutSize } from '../settlement/HutDimensions.js';

// Quem ocupa que pedaço do chão. Cada coisa do mundo vira um círculo (centro e raio);
// quem vai nascer pergunta se o lugar está livre, e assim nada nasce dentro de outra
// coisa — árvore em árvore, capim no lago, lago em cima de cabana.
// Não guarda nada: lê o estado na hora, então está sempre em dia.
export class SpaceOccupancy {
  #state;

  constructor(state) {
    this.#state = state;
  }

  // O lugar (x, y) com raio `radius` não encosta em nada? `ignore`: tipos que não
  // contam para quem pergunta ('pond', 'tree', 'scenery', 'hut', 'campfire', 'food').
  isFree(x, y, radius, { gap = FOOTPRINT_GAP, ignore = [] } = {}) {
    for (const spot of this.#spots(ignore)) {
      if (Math.hypot(spot.x - x, spot.y - y) < radius + spot.radius + gap) return false;
    }
    return true;
  }

  // Gerador: não monta lista nenhuma, e para no primeiro que encosta.
  *#spots(ignore) {
    const state = this.#state;
    // Lago ocupa também a margem de lama em volta.
    if (!ignore.includes('pond')) {
      for (const pond of state.ponds) {
        yield { x: pond.x, y: pond.y, radius: pond.fullRadius + POND_CLEARANCE };
      }
    }
    // Toco também ocupa: ele rebrota ali mesmo.
    if (!ignore.includes('tree')) {
      for (const tree of state.trees) yield { x: tree.x, y: tree.y, radius: FOOTPRINT[tree.kind] ?? 8 };
    }
    if (!ignore.includes('scenery')) {
      for (const item of state.scenery) yield { x: item.x, y: item.y, radius: FOOTPRINT[item.kind] ?? 5 };
    }
    if (!ignore.includes('hut')) {
      for (const hut of state.huts) {
        const size = hutSize(hut.capacity);
        yield { x: hut.x, y: hut.y, radius: Math.max(size.width, size.depth) * .62 };
      }
    }
    if (!ignore.includes('campfire')) {
      for (const fire of state.campfires) yield { x: fire.x, y: fire.y, radius: FOOTPRINT.campfire };
    }
    if (!ignore.includes('food')) {
      for (const patch of state.grass) yield { x: patch.x, y: patch.y, radius: FOOTPRINT.food };
    }
  }
}
