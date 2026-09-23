import { BIRTH_ANIMATION_DURATION } from '../../config/reproduction.js';

// Onda e confete de nascimento, deitados no chão onde o filhote nasceu.
export class BirthEffectsLayer {
  #state;
  #theme;
  #motion;

  constructor(state, theme, motionPreference) {
    this.#state = state;
    this.#theme = theme;
    this.#motion = motionPreference;
  }

  draw({ ctx }) {
    const paint = this.#theme.paint;
    const reduced = this.#motion.reduced;
    for (const effect of this.#state.birthEffects) {
      const progress = Math.max(0, Math.min(1, effect.time / BIRTH_ANIMATION_DURATION));
      const eased = 1 - Math.pow(1 - progress, 3);
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.strokeStyle = paint.life;
      ctx.lineWidth = 1.8 - progress * .8;
      ctx.globalAlpha = reduced ? .45 : (1 - progress) * .72;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + eased * 19, 0, Math.PI * 2);
      ctx.stroke();
      if (!reduced) {
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = (1 - progress) * .48;
        ctx.beginPath();
        ctx.arc(0, 0, 4 + eased * 28, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4 + .25;
          const distance = 8 + eased * (15 + i % 2 * 5);
          ctx.fillStyle = i % 2 ? paint.accent : effect.color;
          ctx.globalAlpha = (1 - progress) * .82;
          ctx.beginPath();
          ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance,
            2.2 - progress * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
}
