import { WORLD, POND_CLEARANCE } from '../config/world.js';
import { POND_COUNT } from '../config/environment.js';
import { Pond } from '../entities/Pond.js';

// Tentativas de achar chão livre para um lago antes de desistir desta vez.
const PLACEMENT_ATTEMPTS = 60;

// As poças: onde nascem, quanto guardam e o que acontece quando alguém bebe.
export class PondSystem {
  #state;
  #biomes;
  #occupancy;

  constructor(state, biomes, occupancy) {
    this.#state = state;
    this.#biomes = biomes;
    this.#occupancy = occupancy;
  }

  // Um lago num lugar livre: nem em cima de árvore, toco, pedra, capim, cabana ou
  // fogueira, nem colado em outro lago — contando a margem de lama. Mundo cheio
  // demais devolve null, e a chuva tenta de novo mais tarde.
  create() {
    const radius = 22 + Math.random() * 14;
    const capacity = 130 + Math.random() * 40;
    const margin = radius + POND_CLEARANCE;
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
      const x = margin + Math.random() * Math.max(0, WORLD.width - margin * 2);
      const y = margin + Math.random() * Math.max(0, WORLD.height - margin * 2);
      if (!this.#occupancy.isFree(x, y, radius + POND_CLEARANCE)) continue;
      // Bioma seco recusa mais vezes; nas últimas tentativas qualquer lugar livre serve.
      const picky = attempt < PLACEMENT_ATTEMPTS * .7;
      if (picky && Math.random() > this.#biomes.habitatWeight(this.#biomes.biomeAt(x, y), 'water')) continue;
      return new Pond({ x, y, radius, capacity });
    }
    return null;
  }

  // Um de cada vez, para cada lago novo já contar os anteriores.
  restore() {
    this.#state.ponds = [];
    for (let i = 0; i < POND_COUNT; i++) {
      const pond = this.create();
      if (!pond) continue;
      pond.level();
      this.#state.ponds.push(pond);
    }
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
    const born = this.create();
    if (!born) return;
    born.water = born.capacity * .04;
    born.level();
    this.#state.ponds.push(born);
  }
}
