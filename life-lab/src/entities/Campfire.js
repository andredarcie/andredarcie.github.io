// Fogueira de uma tribo, identificada pela cor do uniforme.
export class Campfire {
  constructor({ x, y, outfit, capacity, radius, turn, seed }) {
    this.x = x;
    this.y = y;
    this.outfit = outfit;
    this.capacity = capacity;
    this.radius = radius;
    this.turn = turn;
    this.seats = new Map();
    this.flame = 0;
    this.dying = false;
    this.seed = seed;
  }
}
