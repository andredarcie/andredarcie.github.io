import { DAY_LENGTH } from './Astronomy.js';
import { NIGHT_SIGHT, MOON_SIGHT } from '../config/organisms.js';

// O relógio do céu da simulação: acumula o tempo do céu (que corre mais rápido à
// noite), guarda o céu atual e a claridade que os olhos dos bichos recebem.
export class SkyClock {
  #astronomy;

  constructor(astronomy) {
    this.#astronomy = astronomy;
    this.time = 0;
    this.current = astronomy.at(0);
    this.sight = 1;
  }

  get rate() {
    return this.#astronomy.rate(this.current);
  }

  // Avança o céu e devolve quantos dias passaram neste passo: é nesta moeda que se
  // envelhece e que o toco rebrota.
  advance(dt) {
    const days = dt * this.rate / DAY_LENGTH;
    this.time += dt * this.rate;
    this.current = this.#astronomy.at(this.time);
    const { daylight, moonlight } = this.current;
    this.sight = Math.min(1, NIGHT_SIGHT + (1 - NIGHT_SIGHT) * daylight + MOON_SIGHT * moonlight);
    return days;
  }
}
