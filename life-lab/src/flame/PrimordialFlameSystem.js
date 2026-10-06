import { WORLD } from '../config/world.js';
import { FLAME_LIGHT_RADIUS, FLAME_LIGHT, FLAME_WARM_RADIUS } from '../config/flame.js';
import { PrimordialFlame } from '../entities/PrimordialFlame.js';

// A Chama Primordial no mundo: onde nasce, quem a carrega, quando cai da mão (morte
// ou golpe) e quanto ela ilumina e aquece em volta.
export class PrimordialFlameSystem {
  #state;
  #events;
  #occupancy;

  constructor({ state, events, occupancy }) {
    this.#state = state;
    this.#events = events;
    this.#occupancy = occupancy;
  }

  get flame() {
    return this.#state.flame;
  }

  // Nasce no chão, perto do meio da ilha, num lugar livre: todo povo tem a mesma
  // chance de chegar primeiro.
  place() {
    let x = WORLD.width / 2, y = WORLD.height / 2;
    for (let attempt = 0; attempt < 40; attempt++) {
      const cx = WORLD.width * (.35 + Math.random() * .3);
      const cy = WORLD.height * (.35 + Math.random() * .3);
      if (!this.#occupancy.isFree(cx, cy, 8, { ignore: ['food'] })) continue;
      x = cx; y = cy;
      break;
    }
    this.#state.flame = new PrimordialFlame({ x, y });
  }

  // Quem carrega agora; null se está no chão.
  get holder() {
    return this.#state.flame?.holder ?? null;
  }

  // Uniforme da tribo que guarda a chama (só conta quem está num bando).
  keeperOutfit() {
    const holder = this.holder;
    return holder?.band && holder.outfit ? holder.outfit : null;
  }

  // Mesmo lado da chama: o próprio portador ou alguém da tribo dele.
  sameSide(o, holder = this.holder) {
    if (!holder) return false;
    return o === holder || (Boolean(o.band) && o.band === holder.band) || o.tribe.includes(holder.id);
  }

  take(o) {
    const flame = this.#state.flame;
    const from = flame.holder;
    if (from) from.torch = false;
    flame.holder = o;
    flame.transfers++;
    flame.heldSince = this.#state.elapsed;
    flame.x = o.x;
    flame.y = o.y;
    o.torch = true;
    o.say('a chama é minha!', 2);
    this.#events.emit('flameTaken', { taker: o, from });
  }

  // Cai da mão um pouco à frente de quem carregava.
  drop() {
    const flame = this.#state.flame;
    const holder = flame?.holder;
    if (!holder) return;
    holder.torch = false;
    flame.holder = null;
    const angle = holder.heading + (Math.random() - .5) * 2;
    flame.x = Math.max(12, Math.min(WORLD.width - 12, holder.x + Math.cos(angle) * 14));
    flame.y = Math.max(12, Math.min(WORLD.height - 12, holder.y + Math.sin(angle) * 14));
  }

  update({ dt }) {
    const flame = this.#state.flame;
    if (!flame?.holder) return;
    // Morreu (o corpo já saiu da lista dos vivos): a chama fica no chão ao lado.
    if (!this.#state.organisms.includes(flame.holder)) {
      this.drop();
      return;
    }
    flame.x = flame.holder.x;
    flame.y = flame.holder.y;
    // Tempo com a chama vale aptidão para o portador e toda a tribo dele.
    const keepers = flame.holder.band ? flame.holder.band.members : [flame.holder];
    for (const o of keepers) o.record.flameTime += dt;
  }

  // Claridade e calor em volta da chama, na escala das fogueiras.
  lightAt(o) {
    const flame = this.#state.flame;
    if (!flame) return 0;
    const distance = Math.hypot(flame.x - o.x, flame.y - o.y);
    return distance >= FLAME_LIGHT_RADIUS ? 0 : FLAME_LIGHT * (1 - (distance / FLAME_LIGHT_RADIUS) ** 2);
  }

  warmthAt(o) {
    const flame = this.#state.flame;
    if (!flame) return 0;
    const distance = Math.hypot(flame.x - o.x, flame.y - o.y);
    return distance >= FLAME_WARM_RADIUS ? 0 : 1 - distance / FLAME_WARM_RADIUS * .5;
  }
}
