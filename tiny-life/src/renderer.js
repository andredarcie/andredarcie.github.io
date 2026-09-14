import { NEST_R, ANT_SIZE } from './config.js';
import { TAU } from './math.js';
import { HOME_STAIN, FOOD_STAIN, STAIN_ALPHA, ANT, QUEEN, BROOD, LOAD } from './palette.js';

/**
 * Desenha o mundo em canvas 2D, de cima. Só lê — nenhuma decisão de simulação
 * passa por aqui.
 *
 * A ordem é: terreno assado (uma cópia), mancha de feromônio por cima, comida,
 * ninho, cria, rainha e formigas.
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.showTrails = true;

    // Canvas auxiliar na resolução da grade: a mancha é pintada aqui e esticada
    // com suavização, o que dá a borda macia de graça.
    this.stain = document.createElement('canvas');
    this.stainCtx = this.stain.getContext('2d');
    this.image = null;
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /** Ajusta o buffer da mancha à grade de feromônio do mundo. */
  syncTo(world) {
    this.stain.width = world.cols;
    this.stain.height = world.rows;
    this.image = this.stainCtx.createImageData(world.cols, world.rows);
  }

  draw(world) {
    const ctx = this.ctx;
    ctx.drawImage(world.ground.canvas, 0, 0, world.width, world.height);

    if (this.showTrails) this.#drawStain(world);
    this.#drawFood(ctx, world);
    this.#drawNest(ctx, world);
    this.#drawBrood(ctx, world.colony);
    this.#drawQueen(ctx, world.colony.queen);
    this.#drawAnts(ctx, world);
  }

  // Em chão claro a trilha não brilha: ela escurece a terra onde passou muita
  // formiga. A cor sai da mistura das duas trilhas, a opacidade da soma.
  #drawStain(world) {
    const data = this.image.data;
    const home = world.home.data;
    const food = world.food.data;
    const mask = world.terrain.mask;
    const n = world.cols * world.rows;

    for (let i = 0, p = 0; i < n; i++, p += 4) {
      if (mask[i] <= 0) { data[p + 3] = 0; continue; }   // mancha não sobe na grama
      let h = home[i]; if (h > 1) h = 1;
      let f = food[i]; if (f > 1) f = 1;
      h = h > 0 ? Math.sqrt(h) : 0;   // curva perceptual: rastro fraco ainda aparece
      f = f > 0 ? Math.sqrt(f) : 0;
      const t = h + f;
      if (t <= 0) { data[p + 3] = 0; continue; }
      const wh = h / t, wf = f / t;
      data[p] = HOME_STAIN[0] * wh + FOOD_STAIN[0] * wf;
      data[p + 1] = HOME_STAIN[1] * wh + FOOD_STAIN[1] * wf;
      data[p + 2] = HOME_STAIN[2] * wh + FOOD_STAIN[2] * wf;
      data[p + 3] = (t > 1 ? 1 : t) * STAIN_ALPHA;
    }

    this.stainCtx.putImageData(this.image, 0, 0);
    this.ctx.drawImage(this.stain, 0, 0, world.cols, world.rows, 0, 0, world.width, world.height);
  }

  #drawFood(ctx, world) {
    for (const src of world.foods) {
      const vis = src.visibleGrains;
      for (let i = 0; i < vis; i++) {
        const g = src.grains[i];
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.ellipse(src.x + g.dx, src.y + g.dy, g.r, g.r * g.squash, g.rot, 0, TAU);
        ctx.fill();
      }
    }
  }

  // A terra cavada em volta já está assada no solo; aqui vai só o vão escuro.
  #drawNest(ctx, world) {
    const { x, y } = world.nest;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, NEST_R);
    grd.addColorStop(0, 'rgba(18, 13, 9, 0.95)');
    grd.addColorStop(0.5, 'rgba(34, 24, 16, 0.78)');
    grd.addColorStop(1, 'rgba(60, 45, 30, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, NEST_R, 0, TAU);
    ctx.fill();
  }

  // A pilha de cria, por estágio: ovo pequeno e claro, pupa maior e mais tostada.
  #drawBrood(ctx, colony) {
    for (const item of colony.brood) {
      ctx.fillStyle = BROOD[item.stage];
      const r = item.radius;
      ctx.beginPath();
      ctx.ellipse(item.x, item.y, r, r * 0.72, item.rot, 0, TAU);
      ctx.fill();
    }
  }

  // A rainha em dois lobos (gáster e cabeça): do tamanho dela, dois pontos
  // dizem "formiga" muito melhor do que uma bolinha só. As medidas acompanham
  // ANT_SIZE pra ela nunca ficar menor que uma operária graúda.
  #drawQueen(ctx, queen) {
    const c = Math.cos(queen.course), s = Math.sin(queen.course);
    const q = ANT_SIZE / 1.4;
    ctx.fillStyle = QUEEN;
    ctx.beginPath();
    ctx.ellipse(queen.x - c * 1.1 * q, queen.y - s * 1.1 * q, 1.9 * q, 1.35 * q, queen.course, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(queen.x + c * 1.3 * q, queen.y + s * 1.3 * q, 1.15 * q, 0.9 * q, queen.course, 0, TAU);
    ctx.fill();
  }

  #drawAnts(ctx, world) {
    const ants = world.colony.ants;

    // O tamanho vem do gene: operária miúda e operária graúda no mesmo ninho.
    ctx.fillStyle = ANT;
    for (const a of ants) {
      const s = a.size;
      ctx.fillRect(a.x - s / 2, a.y - s / 2, s, s);
    }

    // Quem carrega aparece pelo grão claro na frente da cabeça. O grão e a
    // distância acompanham o corpo, senão a carga de uma graúda fica dentro dela.
    ctx.fillStyle = LOAD;
    for (const a of ants) {
      if (!a.carrying) continue;
      const g = a.size * 0.72;
      const d = a.size * 1.05;
      ctx.fillRect(a.x + Math.cos(a.head) * d - g / 2, a.y + Math.sin(a.head) * d - g / 2, g, g);
    }
  }
}
