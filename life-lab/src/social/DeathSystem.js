import { CORPSE_DAYS } from '../config/death.js';
import { Corpse } from '../entities/Corpse.js';

// Quem morreu sai da lista dos vivos e vira corpo: larga a tora, sai da cabana,
// libera a vaga, chama a tribo para o luto e avisa o mundo. O corpo envelhece até
// virar esqueleto e sumir.
export class DeathSystem {
  #state;
  #events;
  #mourning;
  #woodcutting;
  #shelter;
  #forest;

  constructor({ state, events, mourning, woodcutting, shelter, forest }) {
    this.#state = state;
    this.#events = events;
    this.#mourning = mourning;
    this.#woodcutting = woodcutting;
    this.#shelter = shelter;
    this.#forest = forest;
  }

  static causeOf(o) {
    if (o.hunger <= 0 && o.thirst <= 0) return 'de fome e sede';
    if (o.hunger <= 0) return 'de fome';
    if (o.thirst <= 0) return 'de sede';
    if (o.stage === 'elder') return 'de velhice';
    return '';
  }

  update({ dt, days }) {
    const state = this.#state;
    for (const o of state.organisms) {
      if (o.life > 0) continue;
      // Morreu com tora no ombro: a tora fica no chão. Morreu na cabana: o corpo
      // aparece na porta, não escondido lá dentro.
      if (o.carrying) this.#forest.dropLog(o.x, o.y, o.heading);
      if (o.inHut && o.hut) { o.x = o.hut.doorX; o.y = o.hut.doorY; }
      this.#events.emit('death', { organism: o, cause: DeathSystem.causeOf(o) });
      this.#woodcutting.stopChop(o);
      this.#shelter.releaseBed(o);
      const corpse = new Corpse(o);
      state.corpses.push(corpse);
      this.#mourning.callMourners(o, corpse);
    }
    state.organisms = state.organisms.filter(o => o.life > 0);
    for (const corpse of state.corpses) {
      corpse.time += dt;
      corpse.age += days;
    }
    state.corpses = state.corpses.filter(corpse => corpse.age < CORPSE_DAYS);
  }
}
