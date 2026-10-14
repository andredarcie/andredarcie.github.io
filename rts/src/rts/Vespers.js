import { VESPERS } from '../config/rts.js';

// Claridade em que a tarde vira reza: o sol já baixo, antes do escuro.
const DUSK = .55;

// "Ao cair da tarde, a voz do sino apelidava os fiéis para a oração. Cessavam os
// trabalhos." (Os Sertões, O Homem). Quando o dia passa da tarde para o escuro, o
// sino toca: por um tempo a pregação de Antônio Conselheiro alcança mais longe e
// anima mais (UnitSystem.#preach lê `state.vespers`).
export class Vespers {
  #state;
  #sky;
  #events;
  #wasDay = null;

  constructor({ state, skyClock, events }) {
    this.#state = state;
    this.#sky = skyClock;
    this.#events = events;
  }

  update() {
    const state = this.#state;
    if (state.winner) return;
    const day = this.#sky.current.daylight > DUSK;
    if (this.#wasDay && !day && this.#sky.current.sun.altitude < 20) {
      const preacher = state.organisms.find(u => u.type === 'conselheiro' && u.life > 0);
      if (preacher) {
        state.vespers = VESPERS.time;
        this.#events.emit('vespers', { x: preacher.x, y: preacher.y });
      }
    }
    this.#wasDay = day;
  }
}
