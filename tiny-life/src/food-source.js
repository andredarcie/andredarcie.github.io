import { rand, pick, TAU } from './math.js';
import { SEEDS } from './palette.js';

/**
 * Um monte de comida: um punhado de grãos sorteados uma vez, que vai rareando
 * conforme as formigas levam.
 *
 * Os grãos são posições fixas de propósito — se fossem sorteados a cada quadro,
 * o monte piscaria.
 */
export class FoodSource {
  constructor(x, y, amount) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.max = amount;

    const spread = 3 + Math.sqrt(amount) * 0.55;
    this.grains = [];
    const n = Math.min(48, Math.round(amount / 6));
    for (let i = 0; i < n; i++) {
      const th = Math.random() * TAU;
      const r = Math.sqrt(Math.random()) * spread;
      this.grains.push({
        dx: Math.cos(th) * r,
        dy: Math.sin(th) * r,
        r: rand(0.9, 2.1),
        squash: rand(0.55, 1),
        rot: Math.random() * Math.PI,
        color: pick(SEEDS)
      });
    }
  }

  /** Raio de alcance: a formiga pega pela beirada do monte. */
  get radius() {
    return 4 + Math.sqrt(this.amount) * 0.62;
  }

  get empty() {
    return this.amount <= 0;
  }

  /** Quantos grãos ainda aparecem, para o monte encolher junto com o estoque. */
  get visibleGrains() {
    return Math.min(this.grains.length, Math.ceil(this.amount / 6));
  }

  contains(x, y) {
    const r = this.radius;
    const dx = x - this.x, dy = y - this.y;
    return dx * dx + dy * dy < r * r;
  }

  take() {
    this.amount -= 1;
  }
}
