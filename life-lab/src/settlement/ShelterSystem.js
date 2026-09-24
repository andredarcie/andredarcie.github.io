import { WORLD } from '../config/world.js';
import { HUT_MIN_CAPACITY, MAX_HUTS, HUT_SEEK_RANGE } from '../config/settlement.js';
import { Hut } from '../entities/Hut.js';
import { hutSize } from './HutDimensions.js';

// Chão que a cabana ocupa ao nascer: o tamanho base (4 vagas).
const HUT_FOOTPRINT = Math.max(hutSize(HUT_MIN_CAPACITY).width, hutSize(HUT_MIN_CAPACITY).depth) * .62;

// Cabanas: de quem é cada uma, onde uma obra nova assenta, quem tem vaga para dormir
// e como a cabana cresce junto com a tribo dona.
export class ShelterSystem {
  #state;
  #sky;
  #occupancy;
  #nextHutId = 1;

  constructor(state, skyClock, occupancy) {
    this.#state = state;
    this.#sky = skyClock;
    this.#occupancy = occupancy;
  }

  // A "casa" de um bicho é a tribo inteira; sem tribo, ele mesmo.
  keyOf(o) {
    return o.band && o.outfit ? o.outfit : `solo-${o.id}`;
  }

  groupSize(o) {
    return o.band ? o.band.members.length : 1;
  }

  membersOf(key) {
    let count = 0;
    for (const o of this.#state.organisms) if (o.life > 0 && this.keyOf(o) === key) count++;
    return count;
  }

  ownerAlive(key) {
    return this.#state.organisms.some(o => o.life > 0 && this.keyOf(o) === key);
  }

  releaseBed(o) {
    if (o.hut) o.hut.beds.delete(o.id);
    o.hut = null;
  }

  // Obra da própria turma; se não houver, adota uma obra largada por um grupo que
  // não existe mais; se não houver (e `create`), abre uma nova perto do bando.
  buildSite(o, create) {
    const state = this.#state;
    const key = this.keyOf(o);
    let site = state.huts.find(hut => !hut.built && hut.owner === key);
    if (site || !create) return site || null;
    site = state.huts.find(hut => !hut.built && Math.hypot(hut.x - o.x, hut.y - o.y) < 400 &&
      !this.ownerAlive(hut.owner));
    if (site) { site.owner = key; return site; }
    if (state.huts.length >= MAX_HUTS) return null;
    const centerX = o.band ? o.band.x : o.x, centerY = o.band ? o.band.y : o.y;
    const spot = this.#spotNear(centerX, centerY);
    if (!spot) return null;
    site = new Hut({
      id: this.#nextHutId++, x: spot.x, y: spot.y, owner: key,
      // Porta virada para o centro do bando, que é de onde a turma vem.
      angle: Math.atan2(centerY - spot.y, centerX - spot.x) || Math.random() * Math.PI * 2,
      seed: Math.random() * 100,
      capacity: Math.max(HUT_MIN_CAPACITY, this.groupSize(o))
    });
    state.huts.push(site);
    return site;
  }

  // Uma cabana por tribo basta, porque ela cresce com a tribo. Sem a própria, uma
  // cabana pronta largada por um grupo que não existe mais (morreu, ou a tribo se
  // juntou a outra e trocou de uniforme) vira da turma que estiver por perto.
  needsShelter(o) {
    const key = this.keyOf(o);
    const huts = this.#state.huts;
    if (huts.some(hut => hut.built && hut.owner === key)) return false;
    const orphan = huts.find(hut => hut.built && Math.hypot(hut.x - o.x, hut.y - o.y) < 400 &&
      !this.ownerAlive(hut.owner));
    if (orphan) {
      orphan.owner = key;
      return false;
    }
    return true;
  }

  // Vaga numa cabana pronta: a da própria tribo sempre tem lugar; na dos outros, só
  // se sobrar depois de reservar a tribo dona inteira.
  claimHut(o) {
    const huts = this.#state.huts;
    if (o.hut && huts.includes(o.hut) && o.hut.built) return o.hut;
    o.hut = null;
    const key = this.keyOf(o);
    let best = null, bestScore = Infinity;
    for (const hut of huts) {
      if (!hut.built) continue;
      const own = hut.owner === key;
      if (!own && (hut.guestBeds || 0) >= hut.capacity - (hut.members || 0)) continue;
      const distance = Math.hypot(hut.x - o.x, hut.y - o.y);
      if (distance > HUT_SEEK_RANGE) continue;
      const score = distance - (own ? 1000 : 0);
      if (score < bestScore) { best = hut; bestScore = score; }
    }
    if (best) {
      best.beds.add(o.id);
      if (best.owner !== key) best.guestBeds = (best.guestBeds || 0) + 1;
      o.hut = best;
    }
    return best;
  }

  update() {
    const state = this.#state;
    const living = new Map(state.organisms.map(o => [o.id, o]));
    for (const hut of state.huts) {
      for (const id of hut.beds) if (!living.has(id)) hut.beds.delete(id);
      // A cabana acompanha a tribo: cresce quando nasce ou entra gente, para todos
      // caberem sempre. Grupo que sumiu deixa a cabana do tamanho que estava.
      hut.members = this.membersOf(hut.owner);
      const capacity = Math.max(HUT_MIN_CAPACITY, hut.members || hut.capacity);
      if (capacity !== hut.capacity) {
        hut.capacity = capacity;
        hut.placeDoor();
      }
      // Vagas de visita: só o que sobra depois de reservar lugar para toda a tribo.
      hut.guestBeds = 0;
      for (const id of hut.beds) if (this.keyOf(living.get(id)) !== hut.owner) hut.guestBeds++;
      hut.inside = 0;
    }
    for (const o of state.organisms) if (o.inHut && o.hut) o.hut.inside++;
    // De dia ninguém segura vaga: quem reservou e acabou não dormindo devolve.
    if (this.#sky.current.daylight > .6) {
      for (const o of state.organisms) if (o.hut && !o.asleep) this.releaseBed(o);
    }
  }

  // Terreno para a cabana: perto do bando, longe de poça, de outra cabana, do fogo e
  // da borda do mundo, e em chão livre — nada de árvore, toco (rebrotaria dentro da
  // cabana), pedra, cacto, arbusto ou moita de capim embaixo.
  #spotNear(x, y) {
    const state = this.#state;
    const margin = 45;
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const reach = attempt < 1 ? 0 : 20 + Math.random() * (40 + attempt * 4);
      const cx = Math.max(margin, Math.min(WORLD.width - margin, x + Math.cos(angle) * reach));
      const cy = Math.max(margin, Math.min(WORLD.height - margin, y + Math.sin(angle) * reach));
      if (state.ponds.some(pond => Math.hypot(pond.x - cx, pond.y - cy) < pond.fullRadius + 26)) continue;
      // Folga para a cabana vizinha poder crescer com a tribo dela.
      if (state.huts.some(hut => Math.hypot(hut.x - cx, hut.y - cy) < 80)) continue;
      if (state.campfires.some(fire => Math.hypot(fire.x - cx, fire.y - cy) < 52)) continue;
      if (!this.#occupancy.isFree(cx, cy, HUT_FOOTPRINT, { ignore: ['hut', 'campfire'] })) continue;
      return { x: cx, y: cy };
    }
    return null;
  }
}
