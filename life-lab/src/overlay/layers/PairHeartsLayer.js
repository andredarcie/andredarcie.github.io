import { CHARACTER_HEIGHT } from '../../config/organisms.js';

// Coração pulsando sobre o casal no cortejo e na cópula. Encara a câmera, por isso
// fica em pixels de tela e não deitado no chão como o anel.
export class PairHeartsLayer {
  #state;
  #motion;
  #glyphs;

  constructor(state, motionPreference, glyphs) {
    this.#state = state;
    this.#motion = motionPreference;
    this.#glyphs = glyphs;
  }

  draw({ ctx, project, elapsed }) {
    for (const pair of this.#state.pairs) {
      if (pair.phase !== 'courtship' && pair.phase !== 'mating') continue;
      const x = (pair.male.x + pair.female.x) / 2;
      const y = (pair.male.y + pair.female.y) / 2;
      const anchor = project(x, y, CHARACTER_HEIGHT + 8);
      const pulse = this.#motion.reduced ? 0 : Math.sin(elapsed * (pair.phase === 'mating' ? 9 : 6)) * .08;
      this.#glyphs.heart(ctx, {
        x: anchor.x,
        y: anchor.y,
        scale: (pair.phase === 'mating' ? 1 : .62) + pulse,
        alpha: pair.phase === 'mating' ? 1 : .76
      });
    }
  }
}
