import { WORLD } from '../config/world.js';

// Lado de uma casa da grade de obra, em unidades do mundo.
const CELL = 8;
// Pixels de imagem por casa: a grade é pintada uma vez numa imagem e esticada
// sobre o chão; com 10 px a linha da grade fica fina mesmo de perto.
const CELL_PIXELS = 10;
// Tempo de cálculo por quadro (ms). Conferir o chão casa por casa contra tudo que
// ocupa espaço custa caro no celular, então a grade se completa em alguns quadros
// em vez de travar um.
const BUDGET = 6;

const OPEN = 1, BLOCKED = 2;

// A grade do modo de obra: o mundo em casas quadradas, cada uma verde (dá para
// assentar a obra com o centro ali) ou vermelha (não dá). O jogo está parado
// enquanto se posiciona, então a grade é calculada uma vez por tipo de obra e
// vale até a obra ser marcada ou cancelada.
export class BuildGrid {
  #commands;
  #kind = null;
  #cols = Math.floor(WORLD.width / CELL);
  #rows = Math.floor(WORLD.height / CELL);
  #cells = new Uint8Array(this.#cols * this.#rows);
  #next = 0;
  #image = null;
  #paint = null;

  constructor(commands) {
    this.#commands = commands;
  }

  get cellSize() {
    return CELL;
  }

  // Liga a grade para um tipo de obra (ou desliga, com null) e adianta o cálculo.
  sync(kind) {
    if (kind !== this.#kind) {
      this.#kind = kind;
      this.#cells.fill(0);
      this.#next = 0;
      if (kind) this.#startImage();
    }
    if (kind) this.#advance();
  }

  // Centro da casa onde cai o ponto: a obra sempre assenta no meio de uma casa.
  snap(x, y) {
    const col = Math.floor(x / CELL), row = Math.floor(y / CELL);
    if (col < 0 || row < 0 || col >= this.#cols || row >= this.#rows) return null;
    return { x: (col + .5) * CELL, y: (row + .5) * CELL, col, row };
  }

  // A casa está verde? Se ainda não foi calculada, calcula na hora.
  isOpen(cell) {
    if (!cell || !this.#kind) return false;
    const index = cell.row * this.#cols + cell.col;
    if (!this.#cells[index]) this.#check(index);
    return this.#cells[index] === OPEN;
  }

  // Desenha a grade deitada no chão (o contexto já está na matriz do chão).
  draw(ctx) {
    if (!this.#kind || !this.#image) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.#image, 0, 0, this.#cols * CELL, this.#rows * CELL);
    ctx.restore();
  }

  #startImage() {
    if (!this.#image) {
      this.#image = document.createElement('canvas');
      this.#image.width = this.#cols * CELL_PIXELS;
      this.#image.height = this.#rows * CELL_PIXELS;
      this.#paint = this.#image.getContext('2d');
    }
    this.#paint.clearRect(0, 0, this.#image.width, this.#image.height);
  }

  #advance() {
    const started = performance.now();
    const total = this.#cells.length;
    while (this.#next < total && performance.now() - started < BUDGET) {
      // Confere de linha em linha para não olhar o relógio a cada casa.
      const end = Math.min(total, this.#next + this.#cols);
      for (let index = this.#next; index < end; index++) {
        if (!this.#cells[index]) this.#check(index);
      }
      this.#next = end;
    }
  }

  #check(index) {
    const col = index % this.#cols, row = Math.floor(index / this.#cols);
    const open = this.#commands.canPlace(this.#kind, (col + .5) * CELL, (row + .5) * CELL);
    this.#cells[index] = open ? OPEN : BLOCKED;
    this.#paintCell(col, row, open);
  }

  // Verde e vermelho fortes, por cima de um cenário que fica cinza no modo de obra:
  // a cor só existe onde importa. A borda escura de cada casa desenha a grade.
  #paintCell(col, row, open) {
    const paint = this.#paint;
    const x = col * CELL_PIXELS, y = row * CELL_PIXELS;
    paint.fillStyle = open ? 'rgba(70, 225, 105, .5)' : 'rgba(225, 55, 45, .2)';
    paint.fillRect(x, y, CELL_PIXELS, CELL_PIXELS);
    paint.fillStyle = open ? 'rgba(20, 80, 30, .6)' : 'rgba(90, 20, 15, .3)';
    paint.fillRect(x, y, CELL_PIXELS, 1);
    paint.fillRect(x, y, 1, CELL_PIXELS);
  }
}
