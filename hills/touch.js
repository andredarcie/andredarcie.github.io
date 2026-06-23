// touch.js — Controles de toque para mobile (FPS estilo horror PSX).
// Dois analógicos virtuais (mover/olhar) + botão de lanterna.
// Módulo ES vanilla: cria a própria DOM e injeta o próprio CSS.

// Detecta dispositivo de toque (cobre iOS/Android e Windows touch).
export function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window ||
      (navigator.maxTouchPoints || 0) > 0 ||
      (navigator.msMaxTouchPoints || 0) > 0)
  );
}

// CSS minimalista e translúcido, injetado uma única vez.
const CSS = `
.tc-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none; /* só os filhos com pointer-events:auto interceptam */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.tc-stick {
  position: fixed;
  bottom: 6vmin;
  width: 34vmin;
  height: 34vmin;
  border-radius: 50%;
  border: 0.4vmin solid rgba(255, 255, 255, 0.35);
  background: rgba(200, 200, 200, 0.06);
  pointer-events: auto;
  touch-action: none;
  opacity: 0.55;
}
.tc-stick.tc-left  { left: 5vmin; }
.tc-stick.tc-right { right: 5vmin; }
.tc-thumb {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14vmin;
  height: 14vmin;
  margin-left: -7vmin;
  margin-top: -7vmin;
  border-radius: 50%;
  border: 0.4vmin solid rgba(255, 255, 255, 0.55);
  background: rgba(230, 230, 230, 0.12);
  transition: transform 0.08s ease-out; /* volta suave ao soltar */
}
.tc-stick.tc-active .tc-thumb { transition: none; } /* segue o dedo sem lag */
.tc-flash {
  position: fixed;
  top: 5vmin;
  right: 5vmin;
  width: 16vmin;
  height: 16vmin;
  border-radius: 50%;
  border: 0.4vmin solid rgba(255, 255, 255, 0.4);
  background: rgba(220, 220, 220, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 6vmin;
  line-height: 16vmin;
  text-align: center;
  pointer-events: auto;
  touch-action: none;
  opacity: 0.55;
}
.tc-flash:active { background: rgba(255, 255, 255, 0.25); }
.tc-fire {
  position: fixed;
  bottom: 26vmin;
  right: 6vmin;
  width: 22vmin;
  height: 22vmin;
  border-radius: 50%;
  border: 0.5vmin solid rgba(255, 120, 80, 0.55);
  background: rgba(220, 70, 40, 0.16);
  color: rgba(255, 200, 180, 0.85);
  font-size: 4.4vmin;
  line-height: 22vmin;
  text-align: center;
  letter-spacing: 0.1em;
  pointer-events: auto;
  touch-action: none;
  opacity: 0.7;
}
.tc-fire:active { background: rgba(255, 90, 50, 0.4); }
`;

function injectCSS() {
  if (document.getElementById('tc-style')) return;
  const style = document.createElement('style');
  style.id = 'tc-style';
  style.textContent = CSS;
  document.head.appendChild(style);
}

export class TouchControls {
  constructor() {
    injectCSS();

    // Vetores lidos pelo jogo a cada frame.
    this._move = { x: 0, y: 0 };
    this._look = { x: 0, y: 0 };
    this._flash = false; // flag de lanterna a ser consumida
    this._firing = false; // gatilho segurado (auto-fire enquanto pressionado)

    // Rastreio de toques ativos por pointerId.
    // Cada entrada: { side:'left'|'right', cx, cy, radius }
    this._pointers = new Map();

    // Raiz (cobre a tela, mas só os controles interceptam toque).
    this._root = document.createElement('div');
    this._root.className = 'tc-root';
    this._root.style.display = 'none';

    // Sticks (base + thumb).
    this._leftStick = this._makeStick('tc-left');
    this._rightStick = this._makeStick('tc-right');

    // Botão de lanterna.
    this._flashBtn = document.createElement('div');
    this._flashBtn.className = 'tc-flash';
    this._flashBtn.textContent = '🔦';
    this._flashBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._flash = true;
    });

    // Botão de tiro (segurar = auto a cada pump).
    this._fireBtn = document.createElement('div');
    this._fireBtn.className = 'tc-fire';
    this._fireBtn.textContent = 'FIRE';
    this._fireBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._firing = true;
      try { this._fireBtn.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    });
    const stopFire = (e) => { e.preventDefault(); this._firing = false; };
    this._fireBtn.addEventListener('pointerup', stopFire);
    this._fireBtn.addEventListener('pointercancel', stopFire);
    this._fireBtn.addEventListener('lostpointercapture', () => { this._firing = false; });

    this._root.append(this._leftStick.el, this._rightStick.el, this._flashBtn, this._fireBtn);
    document.body.appendChild(this._root);

    // Listeners globais: move/up podem cair fora da base original.
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    window.addEventListener('pointermove', this._onMove, { passive: false });
    window.addEventListener('pointerup', this._onUp, { passive: false });
    window.addEventListener('pointercancel', this._onUp, { passive: false });
  }

  // Cria a base de um analógico com seu thumb.
  _makeStick(sideClass) {
    const el = document.createElement('div');
    el.className = 'tc-stick ' + sideClass;
    const thumb = document.createElement('div');
    thumb.className = 'tc-thumb';
    el.appendChild(thumb);

    const side = sideClass === 'tc-left' ? 'left' : 'right';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = rect.width / 2;
      this._pointers.set(e.pointerId, { side, cx, cy, radius });
      el.classList.add('tc-active');
      this._update(e.pointerId, e.clientX, e.clientY);
    });

    return { el, thumb };
  }

  // pointermove global: atualiza só os pointers que rastreamos.
  _onMove(e) {
    if (!this._pointers.has(e.pointerId)) return;
    e.preventDefault();
    this._update(e.pointerId, e.clientX, e.clientY);
  }

  // pointerup/cancel global: solta o stick e zera o vetor.
  _onUp(e) {
    const p = this._pointers.get(e.pointerId);
    if (!p) return;
    this._pointers.delete(e.pointerId);

    if (p.side === 'left') {
      this._move = { x: 0, y: 0 };
      this._leftStick.el.classList.remove('tc-active');
      this._leftStick.thumb.style.transform = 'translate(0,0)';
    } else {
      this._look = { x: 0, y: 0 };
      this._rightStick.el.classList.remove('tc-active');
      this._rightStick.thumb.style.transform = 'translate(0,0)';
    }
  }

  // Calcula deslocamento normalizado, faz clamp ao raio e move o thumb.
  _update(pointerId, x, y) {
    const p = this._pointers.get(pointerId);
    if (!p) return;

    let dx = x - p.cx;
    let dy = y - p.cy;
    const dist = Math.hypot(dx, dy) || 1;

    // Limita o thumb ao raio da base (clamp visual).
    const clamped = Math.min(dist, p.radius);
    const tx = (dx / dist) * clamped;
    const ty = (dy / dist) * clamped;

    // Vetor normalizado em [-1,1] (y pra cima = -1, igual ao eixo de tela).
    const nx = tx / p.radius;
    const ny = ty / p.radius;

    if (p.side === 'left') {
      this._move = { x: nx, y: ny };
      this._leftStick.thumb.style.transform = `translate(${tx}px, ${ty}px)`;
    } else {
      // lookVec NÃO acumula: é só o deslocamento atual.
      this._look = { x: nx, y: ny };
      this._rightStick.thumb.style.transform = `translate(${tx}px, ${ty}px)`;
    }
  }

  show() {
    this._root.style.display = 'block';
  }

  hide() {
    this._root.style.display = 'none';
  }

  // Analógico esquerdo: movimento. y pra cima = -1.
  get moveVec() {
    return { x: this._move.x, y: this._move.y };
  }

  // Analógico direito: câmera. Só o deslocamento atual normalizado.
  get lookVec() {
    return { x: this._look.x, y: this._look.y };
  }

  // true quando o stick esquerdo está quase no máximo (correndo).
  get running() {
    return Math.hypot(this._move.x, this._move.y) > 0.85;
  }

  // true enquanto o botão de tiro está pressionado (auto-fire).
  get firing() {
    return this._firing;
  }

  // Retorna true UMA vez após tocar na lanterna; depois volta a false.
  consumeFlash() {
    if (this._flash) {
      this._flash = false;
      return true;
    }
    return false;
  }
}
