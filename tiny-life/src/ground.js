import { NEST_R } from './config.js';
import { rand, pick, coin, TAU } from './math.js';
import {
  SOIL, SOIL_LIGHT, SOIL_DARK,
  GRASS_BED, GRASS_TONE, BLADES, GRASS_SHADOW,
  GRIT, NEST_SPOIL
} from './palette.js';

const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/**
 * O retrato do terreno: terra batida com textura, cercada de grama.
 *
 * Custa caro e não muda, então é assado uma vez num canvas próprio; a cada
 * quadro o renderizador só copia. Depende de uma TerrainShape apenas por onde a
 * borda passa — não conhece formiga, feromônio nem laço de jogo.
 */
export class Ground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.bakeMs = 0;
  }

  /**
   * @param {import('./terrain-shape.js').TerrainShape} shape
   * @param {{x:number, y:number}} nest
   */
  bake(shape, nest, width, height) {
    const t0 = performance.now();
    this.canvas.width = width;
    this.canvas.height = height;
    const g = this.ctx;
    const wind = Math.random() * TAU;

    this.#soil(g, shape, width, height);
    this.#nestSpoil(g, nest);

    const outline = shape.path();
    this.#grassShadow(g, outline);

    // A grama só existe fora do terreiro: recorte par-ímpar = tela menos forma.
    g.save();
    const outside = new Path2D();
    outside.rect(0, 0, width, height);
    outside.addPath(outline);
    g.clip(outside, 'evenodd');
    this.#grassBed(g, width, height);
    this.#blades(g, shape, wind, width, height);
    g.restore();

    // E as pontas passam por cima da linha, senão a borda fica com cara de
    // recorte.
    this.#fringe(g, shape);

    this.bakeMs = Math.round(performance.now() - t0);
  }

  #soil(g, shape, width, height) {
    g.fillStyle = SOIL;
    g.fillRect(0, 0, width, height);

    // Manchas largas de areia seca e de terra úmida: é o que tira a cara de cor
    // chapada.
    const blobs = Math.round((width * height) / 9000);
    for (let i = 0; i < blobs; i++) {
      const x = Math.random() * width, y = Math.random() * height;
      const r = rand(28, 190);
      const tone = coin() ? SOIL_LIGHT : SOIL_DARK;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, rgba(tone, 0.3));
      grd.addColorStop(1, rgba(tone, 0));
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    g.fillStyle = g.createPattern(this.#grainTile(), 'repeat');
    g.fillRect(0, 0, width, height);

    // Cascalho e gravetinho seco, só onde é terra.
    const grit = Math.round(shape.area / 1300);
    for (let i = 0; i < grit; i++) {
      const x = Math.random() * width, y = Math.random() * height;
      if (shape.valueAt(x, y) < 0.01) continue;
      g.fillStyle = pick(GRIT);
      const r = rand(0.5, 2);
      g.beginPath();
      g.ellipse(x, y, r, r * rand(0.55, 1), Math.random() * Math.PI, 0, TAU);
      g.fill();
    }
  }

  // Granulado de areia. Um azulejo de ruído puro não deixa ver a emenda quando
  // repetido, e sai muito mais barato que sortear pixel a pixel a tela inteira.
  #grainTile() {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 128;
    const tc = tile.getContext('2d');
    const im = tc.createImageData(128, 128);
    const d = im.data;
    for (let i = 0, q = 0; i < 128 * 128; i++, q += 4) {
      const tone = coin() ? SOIL_LIGHT : SOIL_DARK;
      d[q] = tone[0]; d[q + 1] = tone[1]; d[q + 2] = tone[2];
      d[q + 3] = 24 + Math.random() * 50;
    }
    tc.putImageData(im, 0, 0);
    return tile;
  }

  // Terra fofa que a colônia cavou, empilhada em volta da entrada.
  #nestSpoil(g, nest) {
    const rim = NEST_R + 15;
    for (let i = 0; i < 260; i++) {
      const th = Math.random() * TAU;
      const d = NEST_R * 0.7 + Math.sqrt(Math.random()) * rim * 0.8;
      g.fillStyle = coin(0.65) ? NEST_SPOIL[0] : NEST_SPOIL[1];
      g.beginPath();
      g.arc(nest.x + Math.cos(th) * d, nest.y + Math.sin(th) * d, rand(0.5, 1.7), 0, TAU);
      g.fill();
    }
  }

  // Sombra do capim caindo na terra. Várias passadas concêntricas fingem o
  // degradê, que é mais confiável entre navegadores do que ctx.filter.
  #grassShadow(g, outline) {
    g.save();
    g.clip(outline);
    for (let i = 0; i < 7; i++) {
      g.strokeStyle = rgba(GRASS_SHADOW, (0.035 + i * 0.017).toFixed(3));
      g.lineWidth = 27 - i * 3.5;
      g.stroke(outline);
    }
    g.restore();
  }

  #grassBed(g, width, height) {
    g.fillStyle = GRASS_BED;
    g.fillRect(0, 0, width, height);

    const blobs = Math.round((width * height) / 16000);
    for (let i = 0; i < blobs; i++) {
      const x = Math.random() * width, y = Math.random() * height;
      const r = rand(40, 220);
      const tone = pick(GRASS_TONE);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, rgba(tone, 0.34));
      grd.addColorStop(1, rgba(tone, 0));
      g.fillStyle = grd;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  /**
   * Grama vista de cima: lâminas curtas e curvas, em ângulos parecidos (o
   * vento) mas nunca iguais. Agrupadas por cor pra sair em 6 traçados em vez de
   * dezenas de milhares — e com densidade contida, porque cada lâmina é uma
   * curva traçada debaixo de um recorte complexo.
   */
  #blades(g, shape, wind, width, height) {
    const paths = BLADES.map(() => new Path2D());
    const want = Math.min(16000, Math.round((width * height - shape.area) / 46));
    let placed = 0, tries = 0;

    while (placed < want && tries < want * 6) {
      tries++;
      const x = Math.random() * width, y = Math.random() * height;
      if (shape.valueAt(x, y) > 0.004) continue;   // aqui é terra, não planta
      placed++;
      this.#blade(pick(paths), x, y, wind + rand(-1.15, 1.15), rand(6, 19), rand(-3.5, 3.5));
    }
    this.#strokeBlades(g, paths);
  }

  #fringe(g, shape) {
    const paths = BLADES.map(() => new Path2D());
    const n = Math.round((shape.rx + shape.ry) * 0.9);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * TAU;
      const r = shape.radiusAt(th) * rand(0.985, 1.02);
      const x = shape.cx + Math.cos(th) * r;
      const y = shape.cy + Math.sin(th) * r;
      const inward = Math.atan2(shape.cy - y, shape.cx - x) + rand(-0.8, 0.8);
      this.#blade(pick(paths), x, y, inward, rand(4, 13), rand(-2.5, 2.5));
    }
    this.#strokeBlades(g, paths);
  }

  #blade(path, x, y, ang, len, curve) {
    const hx = Math.cos(ang), hy = Math.sin(ang);
    const px = -hy, py = hx;
    path.moveTo(x, y);
    path.quadraticCurveTo(
      x + hx * len * 0.55 + px * curve,
      y + hy * len * 0.55 + py * curve,
      x + hx * len + px * curve * 1.7,
      y + hy * len + py * curve * 1.7
    );
  }

  #strokeBlades(g, paths) {
    g.lineCap = 'round';
    for (let i = 0; i < paths.length; i++) {
      g.strokeStyle = BLADES[i];
      g.lineWidth = 1.1 + (i % 3) * 0.4;
      g.stroke(paths[i]);
    }
  }
}
