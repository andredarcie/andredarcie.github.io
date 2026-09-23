import { pseudoRandom } from '../../core/math.js';

// Lascas de madeira saltando do corte: saem para os lados do golpe, sobem um tico
// e caem com gravidade. Em pixels de tela, ancoradas na altura do corte.
export class WoodChipsLayer {
  #state;
  #motion;

  constructor(state, motionPreference) {
    this.#state = state;
    this.#motion = motionPreference;
  }

  draw({ ctx, project }) {
    if (this.#motion.reduced) return;
    ctx.save();
    for (const chip of this.#state.woodChips) {
      const origin = project(chip.x, chip.y, 4);
      const t = chip.time;
      ctx.globalAlpha = Math.max(0, 1 - t / .7);
      for (let i = 0; i < 6; i++) {
        const spread = (pseudoRandom(chip.seed + i) - .5) * 2.4;
        const speed = 40 + pseudoRandom(chip.seed + i + 10) * 50;
        const angle = -Math.PI / 2 + spread;
        const x = origin.x + Math.cos(angle) * speed * t;
        const y = origin.y + Math.sin(angle) * speed * t + 160 * t * t;
        ctx.fillStyle = i % 2 ? '#c8a070' : '#e2c595';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 14 + i);
        ctx.fillRect(-1.6, -.9, 3.2, 1.8);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
