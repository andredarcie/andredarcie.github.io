import { DECAY_DAYS } from '../../config/death.js';

// Moscas sobre o corpo apodrecendo: pontinhos escuros em órbitas tortas.
export class FliesLayer {
  #state;
  #theme;
  #motion;

  constructor(state, theme, motionPreference) {
    this.#state = state;
    this.#theme = theme;
    this.#motion = motionPreference;
  }

  draw({ ctx, project, elapsed }) {
    if (this.#motion.reduced) return;
    ctx.save();
    ctx.fillStyle = this.#theme.paint.ink;
    for (const corpse of this.#state.corpses) {
      const rot = corpse.age / DECAY_DAYS;
      if (rot < .08 || rot > .95) continue;
      const center = project(corpse.x, corpse.y, 7);
      const count = rot < .7 ? 5 : 3;
      ctx.globalAlpha = .75 * Math.min(1, (rot - .08) * 8, (.95 - rot) * 8);
      for (let i = 0; i < count; i++) {
        const phase = elapsed * (2.2 + i * .37) + corpse.seed + i * 1.9;
        const x = center.x + Math.cos(phase) * (7 + i * 1.6) + Math.sin(phase * 2.7) * 2;
        const y = center.y - 4 + Math.sin(phase * 1.3) * 4 - i;
        ctx.fillRect(x - .9, y - .9, 1.8, 1.8);
      }
    }
    ctx.restore();
  }
}
