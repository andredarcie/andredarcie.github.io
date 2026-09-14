import { EGG, LARVA, PUPA, ADULT, BROOD_STAGES } from './config.js';
import { rand, TAU } from './math.js';

/**
 * Uma cria na pilha: ovo -> larva -> pupa -> operária.
 *
 * Cada estágio é só um cronômetro. A posição é sorteada uma vez e não muda: a
 * pilha de cria fica parada ao lado da entrada, como formiga de verdade faz pra
 * esquentar a ninhada no sol.
 */
export class BroodItem {
  constructor(x, y, spread, genome) {
    const th = Math.random() * TAU;
    const r = Math.sqrt(Math.random()) * spread;
    this.x = x + Math.cos(th) * r;
    this.y = y + Math.sin(th) * r;
    this.rot = Math.random() * Math.PI;
    this.genome = genome;   // já vem definido do ovo: a cria não muda de gene
    this.stage = EGG;
    this.timer = rand(BROOD_STAGES[EGG] * 0.8, BROOD_STAGES[EGG] * 1.2);
  }

  get hatched() {
    return this.stage === ADULT;
  }

  update(dt) {
    if (this.hatched) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.stage++;
    if (this.stage < ADULT) {
      const base = BROOD_STAGES[this.stage];
      this.timer = rand(base * 0.8, base * 1.2);
    }
  }

  /** Raio de desenho: a cria vai engordando até virar pupa. */
  get radius() {
    if (this.stage === EGG) return 1.1;
    if (this.stage === LARVA) return 1.6;
    return 2.2;   // pupa
  }
}
