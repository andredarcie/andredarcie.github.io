import { FITNESS_OFFSPRING, FITNESS_BITE, FITNESS_FLAME_SECONDS, FITNESS_MIN_DAYS } from '../config/brain.js';

// Aptidão do NEAT tirada da vida de verdade, sem prova artificial: filhos criados,
// comida conseguida e tempo da tribo com a Chama Primordial, por dia vivido. A taxa
// (e não o total) deixa o jovem comparável ao velho, que teve mais tempo para somar.
export class Fitness {
  static of(o) {
    const record = o.record;
    const score = record.offspring * FITNESS_OFFSPRING + record.bites * FITNESS_BITE +
      record.flameTime / FITNESS_FLAME_SECONDS;
    return score / Math.max(FITNESS_MIN_DAYS, record.days);
  }
}
