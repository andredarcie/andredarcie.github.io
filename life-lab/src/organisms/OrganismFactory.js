import { WORLD } from '../config/world.js';
import { LIFE_SIZE, SEARCH_GRID_SIZE, FOUNDER_PAIRS } from '../config/organisms.js';
import { GENE_SPECS, PIGMENT_COUNT } from '../config/genetics.js';
import { BIRTH_ANIMATION_DURATION } from '../config/reproduction.js';
import { Organism } from '../entities/Organism.js';

// Nascimento de bicho: fundador (genoma sorteado) ou filhote (genoma pronto da
// fecundação). É daqui que sai o nome, a cor do corpo e o relógio interno de cada um.
export class OrganismFactory {
  #genetics;
  #names;
  #pigmentColors;
  #nextId = 1;

  constructor(genetics, nameGenerator, pigmentColors) {
    this.#genetics = genetics;
    this.#names = nameGenerator;
    this.#pigmentColors = pigmentColors;
  }

  create({
    x = Math.random() * WORLD.width,
    y = Math.random() * WORLD.height,
    sex = Math.random() < .5 ? 'male' : 'female',
    age = 0,
    genome = null,
    lineage = null,
    generation = 0
  } = {}) {
    const id = this.#nextId++, heading = Math.random() * Math.PI * 2;
    const inherited = genome ?? this.#genetics.createFounderGenome((id - 1) % PIGMENT_COUNT);
    const genes = this.#genetics.express(inherited);
    return new Organism({
      id, name: this.#names.next(sex), genome: inherited, genes, lineage, generation,
      x, y, heading,
      walkTimer: .6 + Math.random() * 1.8, gait: Math.random() * 6,
      wanderPhase: Math.random() * Math.PI * 2,
      sex, age, stage: age < genes.maturity ? 'infant' : age >= genes.longevity ? 'elder' : 'adult',
      size: age < genes.maturity ? LIFE_SIZE * (.55 + .45 * age / genes.maturity) : LIFE_SIZE,
      color: this.#pigmentColors[genes.pigment],
      energy: 80 + Math.random() * 20,
      bedLight: .12 + Math.random() * .22, wakeLight: .22 + Math.random() * .3,
      birthAnimation: genome ? BIRTH_ANIMATION_DURATION : 0,
      search: {
        need: null, waypoint: null, scanTimer: 0, turn: Math.random() < .5 ? -1 : 1,
        checked: {
          food: Array(SEARCH_GRID_SIZE ** 2).fill(-1),
          water: Array(SEARCH_GRID_SIZE ** 2).fill(-1)
        }
      }
    });
  }

  // Cor do corpo que um genoma vai mostrar (o pigmento expresso).
  colorOf(genome) {
    return this.#pigmentColors[this.#genetics.express(genome).pigment];
  }

  // Casais de adultos jovens, cada casal perto um do outro.
  createFounders() {
    const founders = [];
    for (let i = 0; i < FOUNDER_PAIRS; i++) {
      const x = WORLD.width * (.18 + Math.random() * .64);
      const y = WORLD.height * (.18 + Math.random() * .64);
      const angle = Math.random() * Math.PI * 2;
      const offsetX = Math.cos(angle) * 34, offsetY = Math.sin(angle) * 34;
      founders.push(this.create({
        x: x - offsetX,
        y: y - offsetY,
        sex: 'male',
        age: GENE_SPECS.maturity.max + Math.random() * .8
      }));
      founders.push(this.create({
        x: x + offsetX,
        y: y + offsetY,
        sex: 'female',
        age: GENE_SPECS.maturity.max + Math.random() * .8
      }));
    }
    return founders;
  }
}
