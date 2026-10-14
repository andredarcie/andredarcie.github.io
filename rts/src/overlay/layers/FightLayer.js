import { CHARACTER_HEIGHT, LIFE_SIZE } from '../../config/organisms.js';
import { HURT_FLASH } from '../../config/flame.js';

// Briga à vista: estrela de impacto na cabeça de quem acabou de apanhar. Encara a
// câmera, então fica em pixels de tela.
export class FightLayer {
  #state;
  #theme;

  constructor(state, theme) {
    this.#state = state;
    this.#theme = theme;
  }

  draw({ ctx, project }) {
    const paint = this.#theme.paint;
    for (const o of this.#state.organisms) {
      if (o.hurt <= 0 || o.inHut) continue;
      const head = project(o.x, o.y, CHARACTER_HEIGHT * .8 * (o.size / LIFE_SIZE));
      const t = o.hurt / HURT_FLASH;
      const radius = 4 + (1 - t) * 7;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(head.x, head.y);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? radius * .45 : radius;
        const angle = i / 16 * Math.PI * 2;
        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fillStyle = paint.life;
      ctx.strokeStyle = paint.panelStrong;
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}
