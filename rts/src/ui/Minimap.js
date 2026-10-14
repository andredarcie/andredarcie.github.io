import { WORLD } from '../config/world.js';
import { ROADS, HILLS } from '../config/rts.js';
import { roadPath } from '../world/Roads.js';

// Quantas vezes por segundo o mapinha se redesenha.
const REDRAW_RATE = 6;

// Mapinha no canto: o tabuleiro visto de cima no mesmo giro da câmera (losango),
// com as estradas, árvores, moitas, lagos, construções, a vila e os invasores, e o contorno do
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
    ctx.fillStyle = '#b8905c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 30, 20, .7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Os morros, mais claros, com o contorno de pedra.
    for (const hill of HILLS) {
      const p = this.#toMap(hill.x, hill.y);
      const r = hill.radius * this.#scale();
      ctx.fillStyle = 'rgba(214, 196, 160, .8)';
      ctx.strokeStyle = 'rgba(120, 100, 70, .6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.4, r * .7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // As estradas: a da próxima onda (ou da onda em curso) em vermelho.
    const wave = state.wave;
    const hot = new Set(!wave ? [] : wave.phase === 'calm' ? wave.next.roads : wave.queue.map(item => item.road));
    ctx.lineCap = 'round';
    for (const road of ROADS) {
      ctx.strokeStyle = hot.has(road) ? 'rgba(255, 90, 70, .9)' : 'rgba(205, 180, 130, .7)';
      ctx.lineWidth = hot.has(road) ? 2.4 : 1.6;
      ctx.beginPath();
      roadPath(road).forEach((point, i) => {
        const p = this.#toMap(point.x, point.y);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();
    }

    const dot = (x, y, radius, color) => {
      const p = this.#toMap(x, y);
      ctx.fillStyle = color;
      ctx.fillRect(p.x - radius, p.y - radius * .6, radius * 2, radius * 1.2);
    };
    ctx.globalAlpha = .9;
    for (const pond of state.ponds) {
      const p = this.#toMap(pond.x, pond.y);
      const r = Math.max(1.5, pond.r * this.#scale());
      ctx.fillStyle = '#8aa59a';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.4, r * .7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const tree of state.trees) if (!tree.stump) dot(tree.x, tree.y, 1.2, '#6a6a4c');
    for (const patch of state.grass) dot(patch.x, patch.y, 1, '#4f7a2c');
    for (const log of state.logs) dot(log.x, log.y, 1, '#8a5a2b');
    for (const b of state.buildings) {
      const team = state.teams[b.team];
      dot(b.x, b.y, b.isHut ? 3.6 : 3, b.built ? team.ring : '#d8d0b8');
      const p = this.#toMap(b.x, b.y);
      ctx.strokeStyle = '#111';
      ctx.strokeRect(p.x - 3.6, p.y - 2.2, 7.2, 4.4);
    }
    for (const u of state.organisms) {
      // O comboio e a Matadeira se destacam: são alvo que vale a pena caçar.
      if (u.stats.convoy || u.type === 'matadeira') dot(u.x, u.y, 3, '#ffb84a');
      else dot(u.x, u.y, 1.5, state.teams[u.team].ring);
    }
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
