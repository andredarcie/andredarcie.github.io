import { WORLD } from '../config/world.js';
import {
  CAMPFIRE_MIN_TRIBE, MAX_CAMPFIRES, CAMPFIRE_START_LIGHT, CAMPFIRE_END_LIGHT,
  CAMPFIRE_WARM_RADIUS, CAMPFIRE_LIGHT_RADIUS
} from '../config/settlement.js';
import { Campfire } from '../entities/Campfire.js';

// Fogueiras de tribo: quando acendem, onde cada um senta, quanto esquentam e quanto
// iluminam, e como pegam, apagam na chuva e morrem em brasa de manhã.
export class CampfireSystem {
  #state;
  #sky;
  #weather;

  constructor(state, skyClock, weather) {
    this.#state = state;
    this.#sky = skyClock;
    this.#weather = weather;
  }

  hasAny() {
    return this.#state.campfires.length > 0;
  }

  // Calor que chega ao bicho: cheio colado no fogo, metade na borda do alcance.
  warmthAt(o) {
    let warmth = 0;
    for (const fire of this.#state.campfires) {
      const distance = Math.hypot(fire.x - o.x, fire.y - o.y);
      if (distance >= CAMPFIRE_WARM_RADIUS) continue;
      warmth = Math.max(warmth, fire.flame * (1 - distance / CAMPFIRE_WARM_RADIUS * .5));
    }
    return warmth;
  }

  // Claridade do fogo no ponto do bicho, na mesma escala da visão (1 = dia).
  lightAt(o) {
    let light = 0;
    for (const fire of this.#state.campfires) {
      const distance = Math.hypot(fire.x - o.x, fire.y - o.y);
      if (distance >= CAMPFIRE_LIGHT_RADIUS) continue;
      light = Math.max(light, fire.flame * .9 * (1 - (distance / CAMPFIRE_LIGHT_RADIUS) ** 2));
    }
    return light;
  }

  fireFor(o) {
    if (!o.band || !o.outfit) return null;
    return this.#state.campfires.find(fire => fire.outfit === o.outfit && !fire.dying) || null;
  }

  // Lugar fixo de cada um na roda. Os lugares são distribuídos pelo tamanho da tribo
  // quando o fogo foi aceso, espaçados o bastante para ninguém ser empurrado pelo
  // vizinho (o desvio entre bichos age abaixo de 28); quem chega além da conta abre
  // uma segunda roda, mais larga, nos vãos da primeira.
  seatFor(fire, o) {
    if (!fire.seats.has(o.id)) fire.seats.set(o.id, fire.seats.size);
    const index = fire.seats.get(o.id);
    const ring = Math.floor(index / fire.capacity), slot = index % fire.capacity;
    const angle = (slot + ring * .5) * Math.PI * 2 / fire.capacity + fire.turn;
    const radius = fire.radius + ring * 30;
    return {
      x: Math.max(20, Math.min(WORLD.width - 20, fire.x + Math.cos(angle) * radius)),
      y: Math.max(20, Math.min(WORLD.height - 20, fire.y + Math.sin(angle) * radius))
    };
  }

  update({ dt }) {
    const state = this.#state;
    const sky = this.#sky.current;
    // Só se acende fogo no fim do dia (ou já de noite, para tribo que se formou tarde);
    // sem isso o crepúsculo da manhã acenderia outra fogueira logo antes de clarear.
    const evening = sky.hour >= 12 || sky.daylight < .1;
    if (evening && sky.daylight < CAMPFIRE_START_LIGHT) {
      for (const band of new Set(state.organisms.map(o => o.band).filter(Boolean))) {
        if (state.campfires.length >= MAX_CAMPFIRES) break;
        const outfit = band.members[0].outfit;
        if (!outfit || band.members.length < CAMPFIRE_MIN_TRIBE) continue;
        if (state.campfires.some(fire => fire.outfit === outfit && !fire.dying)) continue;
        const spot = this.#spotNear(band.x, band.y);
        const capacity = band.members.length + 1;
        state.campfires.push(new Campfire({
          x: spot.x, y: spot.y, outfit, capacity,
          radius: Math.max(22, capacity * 30 / (Math.PI * 2)),
          turn: Math.random() * Math.PI * 2,
          seed: Math.random() * 100
        }));
        const herald = band.members.find(o => !o.asleep);
        if (herald) herald.say('fogueira!', 1.8);
      }
    }
    const raining = this.#weather.strength() > .4;
    for (const fire of state.campfires) {
      if (sky.daylight > CAMPFIRE_END_LIGHT) fire.dying = true;
      if (!state.organisms.some(o => o.outfit === fire.outfit)) fire.dying = true;
      // Pega devagar, apaga depressa na chuva, e de manhã vai morrendo em brasa.
      // Depois da chuva a tribo reacende o mesmo fogo.
      const target = fire.dying || raining ? 0 : 1;
      const rate = target > fire.flame ? .7 : raining ? 1.4 : .3;
      fire.flame += (target - fire.flame) * Math.min(1, dt * rate);
    }
    state.campfires = state.campfires.filter(fire => !(fire.dying && fire.flame < .02));
  }

  // Chão firme para o fogo: o centro do bando, ou o ponto mais perto dele que não
  // esteja dentro nem na beira de uma poça, e longe da borda da ilha.
  #spotNear(x, y) {
    const margin = 70;
    const clampX = value => Math.max(margin, Math.min(WORLD.width - margin, value));
    const clampY = value => Math.max(margin, Math.min(WORLD.height - margin, value));
    for (let attempt = 0; attempt < 16; attempt++) {
      const angle = attempt * 2.4, reach = attempt * 14;
      const cx = clampX(x + Math.cos(angle) * reach), cy = clampY(y + Math.sin(angle) * reach);
      if (this.#state.ponds.every(pond => Math.hypot(pond.x - cx, pond.y - cy) > pond.fullRadius + 40)) {
        return { x: cx, y: cy };
      }
    }
    return { x: clampX(x), y: clampY(y) };
  }
}
