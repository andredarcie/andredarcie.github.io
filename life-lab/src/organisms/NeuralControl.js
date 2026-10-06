import { NEED_RESOURCE_THRESHOLD } from '../config/organisms.js';
import {
  THINK_INTERVAL, APPETITE_SPAN, PRIORITY_SPAN, TURN_EXPLORE, TURN_STROLL_RATE,
  HASTE_EXPLORE, HASTE_STROLL, BOND_MAX
} from '../config/brain.js';

const OUTPUT = Object.freeze({ appetite: 0, priority: 1, turn: 2, haste: 3, bond: 4, greed: 5, courage: 6 });

// A ponte entre os sentidos e a rede neural de cada bicho: monta as entradas com o
// que ele vê e sente, roda a rede de tempos em tempos e traduz as saídas em
// decisões que os comportamentos leem (apetite, prioridade, rumo, pressa, apego,
// cobiça pela Chama Primordial e coragem na briga).
export class NeuralControl {
  #state;
  #perception;
  #sky;

  constructor({ state, perception, skyClock }) {
    this.#state = state;
    this.#perception = perception;
    this.#sky = skyClock;
  }

  think(o, dt) {
    const mind = o.mind;
    mind.timer -= dt;
    if (mind.timer > 0) return;
    mind.timer = THINK_INTERVAL;
    mind.inputs = this.#sense(o);
    mind.outputs = mind.net.activate(mind.inputs);
  }

  // Abaixo deste nível de fome ou sede o bicho sai atrás do recurso.
  needThreshold(o) {
    return NEED_RESOURCE_THRESHOLD + APPETITE_SPAN * this.#out(o, 'appetite');
  }

  // Com as duas necessidades apertadas, a rede pesa qual vem primeiro.
  prefersFood(o) {
    return o.hunger <= o.thirst + PRIORITY_SPAN * this.#out(o, 'priority');
  }

  // Desvio de rumo ao explorar (ângulo fixo) e ao passear (giro por segundo).
  exploreTurn(o) {
    return TURN_EXPLORE * this.#out(o, 'turn');
  }

  strollTurn(o) {
    return TURN_STROLL_RATE * this.#out(o, 'turn');
  }

  exploreHaste(o) {
    return NeuralControl.#span(HASTE_EXPLORE, this.#out(o, 'haste'));
  }

  strollHaste(o) {
    return NeuralControl.#span(HASTE_STROLL, this.#out(o, 'haste'));
  }

  bond(o) {
    return BOND_MAX * (this.#out(o, 'bond') + 1) / 2;
  }

  greed(o) {
    return this.#out(o, 'greed');
  }

  courage(o) {
    return this.#out(o, 'courage');
  }

  #out(o, key) {
    return o.mind.outputs[OUTPUT[key]] ?? 0;
  }

  // O que entra na rede: corpo, luz, e o que o olho vê agora — comida, água e o
  // vizinho mais perto, cada um com proximidade (0 longe/ausente, 1 colado) e
  // lado (-1 esquerda, 1 direita, relativo para onde ele olha).
  #sense(o) {
    const range = Math.max(1, this.#perception.sightRange(o));
    const food = this.#seen(o, this.#perception.nearest(o, this.#state.grass), range);
    const water = this.#seen(o, this.#perception.nearest(o, this.#state.ponds), range);
    const mate = this.#seen(o, this.#nearestNeighbor(o, range), range);
    const flame = this.#state.flame;
    const flameSeen = flame && !o.torch && this.#perception.inVision(o, flame)
      ? this.#seen(o, flame, range) : { near: 0, side: 0 };
    // 1 se quem carrega a chama vista é de outro povo; 0 no chão, com a própria
    // tribo ou fora de vista.
    const holder = flame?.holder;
    const rival = flameSeen.near > 0 && holder && holder !== o &&
      !(o.band && o.band === holder.band) && !o.tribe.includes(holder.id) ? 1 : 0;
    return [
      o.hunger / 100, o.thirst / 100, o.energy / 100, o.life / 100, this.#sky.sight,
      food.near, food.side, water.near, water.side, mate.near, mate.side,
      Math.min(1.2, o.age / o.genes.longevity),
      flameSeen.near, flameSeen.side, rival
    ];
  }

  #seen(o, item, range) {
    if (!item) return { near: 0, side: 0 };
    const distance = Math.max(0, Math.hypot(item.x - o.x, item.y - o.y) - (item.r || 0));
    const bearing = Math.atan2(item.y - o.y, item.x - o.x);
    const angle = Math.atan2(Math.sin(bearing - o.heading), Math.cos(bearing - o.heading));
    return { near: Math.max(0, 1 - distance / range), side: angle / Math.PI };
  }

  #nearestNeighbor(o, range) {
    let best = null, closest = range;
    for (const other of this.#state.organisms) {
      if (other === o) continue;
      const distance = Math.hypot(other.x - o.x, other.y - o.y);
      if (distance >= closest || !this.#perception.inVision(o, other, other.size)) continue;
      best = other;
      closest = distance;
    }
    return best;
  }

  static #span([low, high], value) {
    return low + (high - low) * (value + 1) / 2;
  }
}
