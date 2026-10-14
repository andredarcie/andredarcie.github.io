import { FRAME_ERROR_LIMIT } from '../config/ui.js';

// O laço de quadros. Uma exceção dentro dele mataria o requestAnimationFrame e a
// página congelaria inteira, sem dizer por quê; como o laço é ponto único de falha,
// ele avisa na tela e segue, até desistir depois de muitos erros seguidos.
export class GameLoop {
  #onFrame;
  #last = performance.now();
  #errors = 0;

  // `onFrame(dt)`: o trabalho de um quadro, com dt em segundos reais.
  constructor(onFrame) {
    this.#onFrame = onFrame;
  }

  start() {
    requestAnimationFrame(now => this.#tick(now));
  }

  #tick(now) {
    const dt = Math.min(.05, (now - this.#last) / 1000);
    this.#last = now;
    try {
      this.#onFrame(dt);
      this.#errors = 0;
    } catch (error) {
      this.#errors++;
      this.#report(error);
      if (this.#errors > FRAME_ERROR_LIMIT) return;
    }
    requestAnimationFrame(next => this.#tick(next));
  }

  #report(error) {
    console.error('[canudos] erro no quadro:', error);
    let banner = document.querySelector('#frame-error');
    if (!banner) {
      banner = document.createElement('p');
      banner.id = 'frame-error';
      banner.className = 'webgl-missing';
      document.body.append(banner);
    }
    banner.textContent = this.#errors > FRAME_ERROR_LIMIT
      ? `O jogo parou depois de erros seguidos: ${error.message}. Veja o console.`
      : `Erro ao desenhar o quadro: ${error.message}. Veja o console.`;
  }
}
