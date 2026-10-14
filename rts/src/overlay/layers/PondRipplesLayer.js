import { pseudoRandom } from '../../core/math.js';

// Anéis por poça ao mesmo tempo; cada um nasce, abre e some, e renasce noutro ponto.
const RIPPLES_PER_POND = 5;
const RIPPLE_LIFE = 1.1;

// Pingo de chuva na água: anéis finos que abrem e desbotam na superfície das poças.
// Desenhado deitado no chão, então os anéis saem já em perspectiva.
export class PondRipplesLayer {
  #state;
  #weather;
  #theme;
  #motion;

  constructor(state, weather, theme, motionPreference) {
    this.#state = state;
    this.#weather = weather;
    this.#theme = theme;
    this.#motion = motionPreference;
  }

  draw({ ctx, elapsed }) {
    if (!this.#state.rain || this.#motion.reduced) return;
    const strength = this.#weather.strength();
    ctx.save();
    ctx.strokeStyle = this.#theme.paint.water;
    ctx.lineWidth = .6;
    this.#state.ponds.forEach((pond, index) => {
      if (pond.r < 3) return;
      for (let i = 0; i < RIPPLES_PER_POND; i++) {
        const clock = elapsed / RIPPLE_LIFE + i / RIPPLES_PER_POND + index * .31;
        const cycle = Math.floor(clock);
        const age = clock - cycle;
        // Cada ciclo sorteia um novo ponto dentro da água, longe da margem.
        const seed = index * 97 + i * 13 + cycle * 7;
        const angle = pseudoRandom(seed) * Math.PI * 2;
        const distance = Math.sqrt(pseudoRandom(seed + 1)) * pond.r * .75;
        const x = pond.x + Math.cos(angle) * distance;
        const y = pond.y + Math.sin(angle) * distance;
        ctx.globalAlpha = (1 - age) * .55 * strength;
        ctx.beginPath();
        ctx.arc(x, y, .6 + age * 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
  }
}
