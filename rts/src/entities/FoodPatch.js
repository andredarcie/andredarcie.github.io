import { BUSH_STOCK } from '../config/rts.js';

// Roça de mandioca (com milho na beira): comida colhida em viagens, um pé por
// viagem, até acabar o estoque.
export class FoodPatch {
  constructor({ x, y, lean, size }) {
    this.x = x;
    this.y = y;
    this.lean = lean;
    this.size = size;
    this.stock = BUSH_STOCK;
  }
}
