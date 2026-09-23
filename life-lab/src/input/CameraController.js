import { PAN_KEYS, PAN_SPEED, DRAG_THRESHOLD } from '../config/ui.js';

// Passeio da câmera: setas/WASD (com inércia, como nos jogos de estratégia),
// arrastar com mouse ou dedo, e roda do mouse para o zoom. A câmera anda em tempo
// real, não em tempo de simulação: o slider acelera os bichos, não quem olha.
export class CameraController {
  #camera;
  #canvas;
  #canPan;
  #held = new Set();
  #velocityX = 0;
  #velocityY = 0;
  #drag = null;
  #suppressClick = false;

  // `canPan`: devolve false quando a tecla deve ir para outro lugar (diálogo aberto,
  // campo de texto em foco).
  constructor({ window: win, canvas, cameraRig, canPan }) {
    this.#camera = cameraRig;
    this.#canvas = canvas;
    this.#canPan = canPan;
    this.#bindKeyboard(win);
    this.#bindPointer(canvas);
  }

  // O toque que terminou um arrasto não pode virar clique (criar bicho sem querer).
  consumeClickSuppression() {
    const suppressed = this.#suppressClick;
    this.#suppressClick = false;
    return suppressed;
  }

  update(dt) {
    let targetX = 0, targetY = 0;
    for (const code of this.#held) {
      targetX += PAN_KEYS[code][0];
      targetY += PAN_KEYS[code][1];
    }
    // Diagonal não pode andar mais rápido que reta.
    const magnitude = Math.hypot(targetX, targetY);
    if (magnitude > 1) {
      targetX /= magnitude;
      targetY /= magnitude;
    }
    // Um empurrão de inércia na partida e na parada, como nos jogos do gênero.
    const ease = Math.min(1, dt * 11);
    this.#velocityX += (targetX * PAN_SPEED - this.#velocityX) * ease;
    this.#velocityY += (targetY * PAN_SPEED - this.#velocityY) * ease;
    if (Math.abs(this.#velocityX) < .5 && Math.abs(this.#velocityY) < .5) {
      this.#velocityX = 0;
      this.#velocityY = 0;
      return;
    }
    this.#camera.panByScreen(this.#velocityX * dt, this.#velocityY * dt);
  }

  #bindKeyboard(win) {
    win.addEventListener('keydown', event => {
      if (!PAN_KEYS[event.code] || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!this.#canPan()) return;
      this.#held.add(event.code);
      event.preventDefault();
    });
    win.addEventListener('keyup', event => this.#held.delete(event.code));
    // Trocar de aba com a tecla apertada deixaria a câmera andando sozinha para sempre.
    win.addEventListener('blur', () => this.#held.clear());
  }

  // Arrastar passeia pelo mundo. Agora que o enquadramento inicial não mostra o mundo
  // inteiro, no celular é o único jeito de passear.
  #bindPointer(canvas) {
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.#drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    });
    canvas.addEventListener('pointermove', event => {
      const drag = this.#drag;
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!drag.moved) {
        drag.moved = true;
        canvas.setPointerCapture(event.pointerId);
      }
      // O mundo acompanha o dedo, então a câmera anda no sentido contrário.
      this.#camera.panByScreen(-dx, -dy);
      drag.x = event.clientX;
      drag.y = event.clientY;
    });
    const endDrag = event => {
      if (!this.#drag || event.pointerId !== this.#drag.id) return;
      this.#suppressClick = this.#drag.moved;
      this.#drag = null;
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.#camera.zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1);
    }, { passive: false });
  }
}
