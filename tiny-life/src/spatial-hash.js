/**
 * Grade uniforme para achar vizinhos próximos sem comparar todos com todos.
 *
 * Não sabe o que está indexando: qualquer coisa com x e y serve. As listas são
 * encadeadas em arrays de inteiros, então um quadro não aloca nada depois que a
 * população estabiliza.
 */
export class SpatialHash {
  constructor(cellSize) {
    this.cell = cellSize;
    this.cols = 0;
    this.rows = 0;
    this.head = new Int32Array(0);
    this.next = new Int32Array(0);
    this.items = [];
  }

  resize(width, height) {
    this.cols = Math.ceil(width / this.cell);
    this.rows = Math.ceil(height / this.cell);
    this.head = new Int32Array(this.cols * this.rows);
  }

  build(items) {
    this.items = items;
    const n = items.length;
    if (this.next.length < n) this.next = new Int32Array(n + 64);
    this.head.fill(-1);

    for (let i = 0; i < n; i++) {
      const it = items[i];
      let cx = (it.x / this.cell) | 0;
      let cy = (it.y / this.cell) | 0;
      if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
      if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
      const b = cy * this.cols + cx;
      this.next[i] = this.head[b];
      this.head[b] = i;
    }
  }

  /**
   * Chama fn(a, b) para cada par dentro do raio, uma vez por par.
   * Só compara dentro da mesma célula: perder um encontro exatamente em cima da
   * divisa não muda nada, e evita varrer as oito vizinhas.
   */
  forEachPair(radius, fn) {
    const r2 = radius * radius;
    const { head, next, items } = this;
    for (let b = 0; b < head.length; b++) {
      for (let i = head[b]; i !== -1; i = next[i]) {
        const a = items[i];
        for (let j = next[i]; j !== -1; j = next[j]) {
          const o = items[j];
          const dx = a.x - o.x, dy = a.y - o.y;
          if (dx * dx + dy * dy <= r2) fn(a, o);
        }
      }
    }
  }
}
