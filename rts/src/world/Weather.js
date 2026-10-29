import {
  POND_COUNT, RAIN_FILL_TIME, RAIN_POND_INTERVAL, RAIN_DURATION, RAIN_MEAN_INTERVAL
} from '../config/environment.js';
import { MAP } from '../config/maps.js';

// Chuva: cai de tempos em tempos, enche as poças aos poucos e faz nascer poças novas
// no lugar das que secaram.
export class Weather {
  #state;
  #ponds;
  #events;

  constructor(state, ponds, events) {
    this.#state = state;
    this.#ponds = ponds;
    this.#events = events;
  }

  get raining() {
    return Boolean(this.#state.rain);
  }

  // 0 a 1: sobe no começo da chuva e desce no fim, para nada entrar ou sair num tranco.
  strength() {
    const rain = this.#state.rain;
    return rain ? Math.max(0, Math.min(1, rain.time / .6, (RAIN_DURATION - rain.time) / .8)) : 0;
  }

  update({ dt }) {
    const state = this.#state;
    if (state.rain) {
      state.rain.time += dt;
      // Cada poça sobe um tanto por segundo, em vez de reaparecer cheia. Como o raio
      // sai do volume, ela cresce na tela no mesmo ritmo em que enche.
      for (const pond of state.ponds) {
        if (pond.water >= pond.capacity) continue;
        pond.water = Math.min(pond.capacity, pond.water + pond.capacity / RAIN_FILL_TIME * dt);
        pond.level();
      }
      // Poça que secou não volta do nada: uma nova se forma vazia e cresce junto.
      if (state.ponds.length < POND_COUNT && state.rain.time >= state.rain.nextPond) {
        this.#ponds.spring();
        state.rain.nextPond = state.rain.time + RAIN_POND_INTERVAL;
      }
      if (state.rain.time >= RAIN_DURATION) state.rain = null;
      return;
    }
    // No RTS ninguém bebe: a chuva vem de vez em quando, só de enfeite (nunca na seca).
    if (!MAP?.dry && Math.random() < dt / RAIN_MEAN_INTERVAL) {
      state.rain = { time: 0, nextPond: .5 };
      state.rainEvents++;
      this.#events.emit('rainStart');
    }
  }
}
