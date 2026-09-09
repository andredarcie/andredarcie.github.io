import { TRAIL_CAP } from './config.js';

/**
 * Um campo escalar de feromônio numa grade de baixa resolução: as formigas
 * depositam, ele evapora e se espalha sozinho.
 *
 * A classe cuida de UM campo. A simulação usa duas instâncias (ida e comida)
 * com constantes de evaporação diferentes — adicionar um terceiro cheiro não
 * pede mudança nenhuma aqui.
 */
export class PheromoneField {
  /**
   * @param {number} cols  colunas da grade
   * @param {number} rows  linhas da grade
   * @param {number} cell  px por célula
   * @param {number} tau   segundos da constante de evaporação
   */
  constructor(cols, rows, cell, tau) {
    this.cols = cols;
    this.rows = rows;
    this.cell = cell;
    this.tau = tau;
    this.data = new Float32Array(cols * rows);
    this._blur = new Float32Array(cols * rows);
  }

  clear() {
    this.data.fill(0);
  }

  /** Valor no ponto, ou -1 fora da grade (serve de empurrão pra dentro). */
  sample(x, y) {
    const cx = (x / this.cell) | 0;
    const cy = (y / this.cell) | 0;
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return this.data[cy * this.cols + cx];
  }

  deposit(x, y, amount) {
    const cx = (x / this.cell) | 0;
    const cy = (y / this.cell) | 0;
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    const i = cy * this.cols + cx;
    const v = this.data[i] + amount;
    this.data[i] = v > TRAIL_CAP ? TRAIL_CAP : v;
  }

  /**
   * Evapora e difunde. Borrão separável 1-2-1 com a evaporação embutida na
   * primeira passada, escrevendo de volta no próprio campo.
   */
  step(dt) {
    const { cols, rows, data, _blur: t } = this;
    const decay = Math.exp(-dt / this.tau);

    for (let y = 0; y < rows; y++) {
      const o = y * cols;
      let prev = data[o];
      for (let x = 0; x < cols; x++) {
        const i = o + x;
        const c = data[i];
        const next = x + 1 < cols ? data[i + 1] : c;
        t[i] = (prev * 0.25 + c * 0.5 + next * 0.25) * decay;
        prev = c;
      }
    }

    for (let x = 0; x < cols; x++) {
      let prev = t[x];
      for (let y = 0; y < rows; y++) {
        const i = y * cols + x;
        const c = t[i];
        const next = y + 1 < rows ? t[i + cols] : c;
        const v = prev * 0.25 + c * 0.5 + next * 0.25;
        data[i] = v < 0.0008 ? 0 : v;
        prev = c;
      }
    }
  }
}
