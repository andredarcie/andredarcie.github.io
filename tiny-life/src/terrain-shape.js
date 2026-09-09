import { SHAPE_N } from './config.js';
import { TAU } from './math.js';

/**
 * A geometria do terreiro: onde acaba a terra e começa a grama.
 *
 * A borda é uma superelipse com uma ondulação por cima (soma de senos). Nada de
 * retângulo nem de círculo perfeito: os dois entregam na hora que aquilo é
 * desenho. Como a forma é estrelada em relação ao centro, dá pra decidir se um
 * ponto está dentro comparando o raio — sem varrer polígono.
 *
 * Esta classe não sabe desenhar nem o que é uma formiga: só responde geometria.
 */
export class TerrainShape {
  constructor() {
    this.cx = 0;
    this.cy = 0;
    this.rx = 1;
    this.ry = 1;
    this.phase = [0, 0, 0, 0];
    this.cell = 6;
    this.cols = 0;
    this.rows = 0;
    this.mask = null;   // > 0 é terra; cresce conforme se afasta da grama
    this.area = 0;      // px² pisáveis
  }

  /**
   * Redefine a forma e recalcula a máscara.
   * @param {{cx:number, cy:number, rx:number, ry:number,
   *          cell:number, cols:number, rows:number}} spec
   */
  build(spec) {
    Object.assign(this, spec);
    for (let i = 0; i < this.phase.length; i++) this.phase[i] = Math.random() * TAU;
    this.#bakeMask();
  }

  /** Ondulação da borda: periódica por construção, então nunca dá emenda. */
  wobble(th) {
    const p = this.phase;
    return 0.030 * Math.sin(3 * th + p[0])
         + 0.022 * Math.sin(5 * th + p[1])
         + 0.014 * Math.sin(8 * th + p[2])
         + 0.009 * Math.sin(13 * th + p[3]);
  }

  /** Raio da borda naquela direção. */
  radiusAt(th) {
    const c = Math.abs(Math.cos(th) / this.rx);
    const s = Math.abs(Math.sin(th) / this.ry);
    return (1 + this.wobble(th)) / Math.pow(Math.pow(c, SHAPE_N) + Math.pow(s, SHAPE_N), 1 / SHAPE_N);
  }

  /** Contorno fechado, pronto pra recorte ou traçado. */
  path() {
    const path = new Path2D();
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const th = (i / steps) * TAU;
      const r = this.radiusAt(th);
      const x = this.cx + Math.cos(th) * r;
      const y = this.cy + Math.sin(th) * r;
      if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
    path.closePath();
    return path;
  }

  /** Consulta rápida pela máscara: positivo é terra, negativo é grama. */
  valueAt(x, y) {
    const cx = (x / this.cell) | 0;
    const cy = (y / this.cell) | 0;
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return this.mask[cy * this.cols + cx];
  }

  isDirt(x, y) {
    return this.valueAt(x, y) > 0;
  }

  /**
   * Puxa um ponto para dentro do terreiro na direção de um alvo. Usado quando o
   * toque cai no mato: a comida não pode nascer onde ninguém alcança.
   */
  pullInside(x, y, toX, toY, margin = 0.06) {
    for (let i = 0; i < 80 && this.valueAt(x, y) < margin; i++) {
      x += (toX - x) * 0.06;
      y += (toY - y) * 0.06;
    }
    return [x, y];
  }

  // A máscara mora na mesma grade dos feromônios, então a consulta em runtime é
  // uma divisão inteira em vez de atan2 + pow por formiga por quadro.
  #bakeMask() {
    const { cols, rows, cell } = this;
    this.mask = new Float32Array(cols * rows);
    let inside = 0;
    for (let y = 0; y < rows; y++) {
      const py = y * cell + cell / 2 - this.cy;
      for (let x = 0; x < cols; x++) {
        const px = x * cell + cell / 2 - this.cx;
        const d = Math.sqrt(px * px + py * py);
        const v = 1 - d / this.radiusAt(Math.atan2(py, px));
        this.mask[y * cols + x] = v;
        if (v > 0) inside++;
      }
    }
    this.area = inside * cell * cell;
  }
}
