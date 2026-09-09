import { MIN_ANTS, EGG, LARVA, PUPA, EGG_COST } from './config.js';

const SPARK_SAMPLES = 180;   // ~90 s de história a uma amostra por meio segundo

/**
 * Lê o mundo e devolve um retrato do que está acontecendo — números contados,
 * taxa suavizada, histórico e uma frase de estado.
 *
 * Fica entre a simulação e o painel de propósito: o mundo não sabe que alguém
 * está olhando, e o HUD não sabe o que é uma pupa. Trocar o painel inteiro não
 * encosta aqui, e trocar a regra de "o que é estar bem" não encosta no DOM.
 */
export class Telemetry {
  constructor() {
    this.history = [];       // população recente, para o gráfico
    this.peak = 1;
    this.rate = 0;           // grãos por minuto, suavizado
    this.prevDelivered = 0;
    this.sparkT = 0;
  }

  reset() {
    this.history.length = 0;
    this.peak = 1;
    this.rate = 0;
    this.prevDelivered = 0;
  }

  /**
   * @param {number} dt segundos desde a última amostra (não desde o último quadro)
   */
  sample(world, dt) {
    const colony = world.colony;
    const workers = colony.ants.length;

    let hauling = 0;
    for (const ant of colony.ants) if (ant.carrying) hauling++;

    let eggs = 0, larvae = 0, pupae = 0;
    for (const item of colony.brood) {
      if (item.stage === EGG) eggs++;
      else if (item.stage === LARVA) larvae++;
      else if (item.stage === PUPA) pupae++;
    }

    // Taxa de coleta: média exponencial, senão o número tremeria demais pra ser
    // lido.
    const delta = colony.delivered - this.prevDelivered;
    this.prevDelivered = colony.delivered;
    if (dt > 0) this.rate += ((delta / dt) * 60 - this.rate) * 0.18;

    this.sparkT -= dt;
    if (this.sparkT <= 0) {
      this.sparkT = 0.5;
      this.history.push(workers);
      if (this.history.length > SPARK_SAMPLES) this.history.shift();
      this.peak = Math.max(1, ...this.history);
    }

    const brood = colony.brood.length;
    const full = workers + brood >= colony.popCap;

    return {
      workers,
      hauling,
      foraging: workers - hauling,
      brood,
      eggs,
      larvae,
      pupae,
      gathered: colony.delivered,
      stored: colony.store,
      rate: Math.max(0, Math.round(this.rate)),
      piles: world.foods.length,
      history: this.history,
      peak: this.peak,
      status: this.#status(workers, hauling, world.foods.length, colony.store, full)
    };
  }

  // Uma frase só, do estado mais informativo para o mais banal. É a diferença
  // entre ver números e entender o que a colônia está passando.
  #status(workers, hauling, piles, stored, full) {
    if (workers < MIN_ANTS) return 'rebuilding the colony';
    if (piles === 0) return 'no food in sight';
    if (full) return 'nest at capacity';
    const ratio = hauling / workers;
    if (ratio > 0.22) return 'supply line running';
    if (ratio > 0.06) return 'trail forming';
    if (stored >= EGG_COST) return 'queen laying';
    return 'scouting for food';
  }
}
