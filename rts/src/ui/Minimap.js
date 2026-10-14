import { WORLD } from '../config/world.js';

// Quantas vezes por segundo o mapinha se redesenha.
const REDRAW_RATE = 6;

// Mapinha no canto: o tabuleiro visto de cima no mesmo giro da câmera (losango),
// com árvores, moitas, lagos, construções e unidades dos dois times, e o contorno do
// que a tela mostra agora. Tocar ou arrastar nele leva a câmera para lá.
export class Minimap {
  #canvas;
  #ctx;
  #state;
  #view;
  #hud;
  #timer = 0;
  #size = { width: 1, height: 1 };

  constructor({ canvas, state, view, hud }) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#state = state;
    this.#view = view;
    this.#hud = hud;
    const jump = event => {
      const bounds = canvas.getBoundingClientRect();
      const world = this.#toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
      this.#hud.focus(Math.max(0, Math.min(WORLD.width, world.x)), Math.max(0, Math.min(WORLD.height, world.y)));
    };
    canvas.addEventListener('pointerdown', event => {
      canvas.setPointerCapture(event.pointerId);
      jump(event);
    });
    canvas.addEventListener('pointermove', event => {
      if (event.buttons || event.pointerType === 'touch') jump(event);
    });
  }

  resize() {
    const bounds = this.#canvas.getBoundingClientRect();
    const ratio = Math.min(2, devicePixelRatio || 1);
    this.#size = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
    this.#canvas.width = Math.round(this.#size.width * ratio);
    this.#canvas.height = Math.round(this.#size.height * ratio);
    this.#ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.#timer = 0;
  }

  update(realDt) {
    this.#timer -= realDt;
    if (this.#timer > 0) return;
    this.#timer = 1 / REDRAW_RATE;
    this.#draw();
  }

  // Mundo → mapinha: o giro isométrico da câmera (x vai para a direita e para baixo,
  // y para a esquerda e para baixo), achatado pela metade como o losango da tela.
  #toMap(x, y) {
    const { width, height } = this.#size;
    const scale = Math.min(width / (WORLD.width + WORLD.height), height * 2 / (WORLD.width + WORLD.height)) * .96;
    return {
      x: width / 2 + (x - y) * scale,
      y: height / 2 + (x + y - WORLD.width) * scale * .5
    };
  }

  #toWorld(mx, my) {
    const { width, height } = this.#size;
    const scale = Math.min(width / (WORLD.width + WORLD.height), height * 2 / (WORLD.width + WORLD.height)) * .96;
    const a = (mx - width / 2) / scale;
    const b = (my - height / 2) / (scale * .5) + WORLD.width;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }

  #draw() {
    const ctx = this.#ctx;
    const state = this.#state;
    const { width, height } = this.#size;
    ctx.clearRect(0, 0, width, height);
    const corners = [[0, 0], [WORLD.width, 0], [WORLD.width, WORLD.height], [0, WORLD.height]]
      .map(([x, y]) => this.#toMap(x, y));
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = '#7fa35a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 30, 20, .7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const dot = (x, y, radius, color) => {
      const p = this.#toMap(x, y);
      ctx.fillStyle = color;
      ctx.fillRect(p.x - radius, p.y - radius * .6, radius * 2, radius * 1.2);
    };
    ctx.globalAlpha = .9;
    for (const pond of state.ponds) {
      const p = this.#toMap(pond.x, pond.y);
      const r = Math.max(1.5, pond.r * this.#scale());
      ctx.fillStyle = '#4f9fd0';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.4, r * .7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const tree of state.trees) if (!tree.stump) dot(tree.x, tree.y, 1.2, '#2f5a2c');
    for (const patch of state.grass) dot(patch.x, patch.y, 1, '#d34a6a');
    for (const log of state.logs) dot(log.x, log.y, 1, '#8a5a2b');
    for (const b of state.buildings) {
      const team = state.teams[b.team];
      dot(b.x, b.y, b.isHut ? 3.6 : 3, b.built ? team.ring : '#d8d0b8');
      const p = this.#toMap(b.x, b.y);
      ctx.strokeStyle = '#111';
      ctx.strokeRect(p.x - 3.6, p.y - 2.2, 7.2, 4.4);
    }
    for (const u of state.organisms) dot(u.x, u.y, 1.5, state.teams[u.team].ring);
    ctx.globalAlpha = 1;
    this.#drawView(ctx);
  }

  #scale() {
    const { width, height } = this.#size;
    return Math.min(width / (WORLD.width + WORLD.height), height * 2 / (WORLD.width + WORLD.height)) * .96;
  }

  // O que a tela mostra: os quatro cantos do canvas projetados no chão.
  #drawView(ctx) {
    const canvas = this.#view.canvas;
    const bounds = canvas.getBoundingClientRect();
    const points = [
      [bounds.left, bounds.top], [bounds.right, bounds.top],
      [bounds.right, bounds.bottom], [bounds.left, bounds.bottom]
    ].map(([x, y]) => this.#view.pickGround(x, y)).filter(Boolean);
    if (points.length < 4) return;
    ctx.save();
    ctx.beginPath();
    points.forEach((point, i) => {
      const p = this.#toMap(point.x, point.y);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
}
