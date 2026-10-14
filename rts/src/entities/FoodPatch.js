import { BUSH_STOCK } from '../config/rts.js';

// Moita de frutinhas: comida colhida em viagens até acabar o estoque.
export class FoodPatch {
  constructor({ x, y, lean, size }) {
    this.x = x;
    this.y = y;
    this.lean = lean;
    this.size = size;
    this.stock = BUSH_STOCK;
  }
}
