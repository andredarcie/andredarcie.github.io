// Poça de água. O raio é consequência do volume, nunca o contrário: guardar os dois
// separados era o que deixava a poça encher de um salto quando a chuva repunha tudo.
export class Pond {
  constructor({ x, y, radius, capacity }) {
    this.x = x;
    this.y = y;
    this.r = radius;
    this.fullRadius = radius;
    this.water = capacity;
    this.capacity = capacity;
  }

  level() {
    this.r = this.fullRadius * Math.sqrt(Math.max(0, this.water) / this.capacity);
  }
}
