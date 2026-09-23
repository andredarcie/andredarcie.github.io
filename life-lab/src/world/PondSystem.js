import { WORLD } from '../config/world.js';
import { POND_COUNT } from '../config/environment.js';
import { Pond } from '../entities/Pond.js';

// As poças: onde nascem, quanto guardam e o que acontece quando alguém bebe.
export class PondSystem {
  #state;
  #biomes;

  constructor(state, biomes) {
    this.#state = state;
    this.#biomes = biomes;
  }

  create(existingPonds) {
    const radius = 22 + Math.random() * 14;
    const capacity = 130 + Math.random() * 40;
    const margin = radius + 6;
    let x, y;
    for (let attempt = 0; attempt < 25; attempt++) {
      x = margin + Math.random() * Math.max(0, WORLD.width - margin * 2);
      y = margin + Math.random() * Math.max(0, WORLD.height - margin * 2);
      const separated = existingPonds.every(p => Math.hypot(x - p.x, y - p.y) > radius + p.fullRadius + 12);
      if (separated && Math.random() <= this.#biomes.habitatWeight(this.#biomes.biomeAt(x, y), 'water')) break;
    }
    return new Pond({ x, y, radius, capacity });
  }

  restore() {
    const next = [];
    for (let i = 0; i < POND_COUNT; i++) next.push(this.create(next));
    this.#state.ponds = next;
    for (const pond of this.#state.ponds) pond.level();
  }

  totalCapacity() {
    return this.#state.ponds.reduce((total, pond) => total + pond.capacity, 0);
  }

  totalWater() {
    return this.#state.ponds.reduce((total, pond) => total + pond.water, 0);
  }

  // Um gole: tira água da poça e, se ela secar, a poça some do mundo. Devolve quanto
  // foi bebido de fato e se a poça acabou.
  drink(pond, wanted) {
    const amount = Math.min(pond.water, wanted);
    pond.water -= amount;
    pond.level();
    const dried = pond.water <= 1;
    if (dried) this.#state.ponds = this.#state.ponds.filter(p => p !== pond);
    return { amount, dried };
  }

  // Poça nova nasce como um fio de água, não em zero: a regra de secar apaga a poça
  // abaixo de 1, e o primeiro bicho que bebesse dela mataria a recém-nascida.
  spring() {
    const born = this.create(this.#state.ponds);
    born.water = born.capacity * .04;
    born.level();
    this.#state.ponds.push(born);
  }
}
