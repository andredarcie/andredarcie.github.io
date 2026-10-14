import { DUST_COLOR } from '../../config/ui.js';

// Poeira da queda: nuvens baixas ao longo do tronco caído, que crescem e somem.
// Desenhada deitada no chão.
export class FallDustLayer {
  #state;

  constructor(state) {
    this.#state = state;
  }

  draw({ ctx }) {
    for (const dust of this.#state.fallDust) {
      const progress = dust.time / 1.6;
      ctx.save();
      ctx.fillStyle = DUST_COLOR;
      for (let i = 0; i < 6; i++) {
        const along = 6 + i * 5;
        const x = dust.x + Math.cos(dust.dir) * along;
        const y = dust.y + Math.sin(dust.dir) * along;
        ctx.globalAlpha = (1 - progress) * .32;
        ctx.beginPath();
        ctx.arc(x, y, 5 + progress * (10 + i * 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
