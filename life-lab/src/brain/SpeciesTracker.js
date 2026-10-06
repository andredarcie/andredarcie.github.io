import {
  COMPAT_THRESHOLD, SPECIATION_INTERVAL, CULL_MIN_SPECIES,
  SPECIES_GRACE_DAYS, STAGNATION_DAYS, STAGNATION_EPSILON
} from '../config/brain.js';
import { MAX_POPULATION } from '../config/reproduction.js';
import { Fitness } from './Fitness.js';

// Especiação do NEAT: de tempos em tempos a população é reagrupada pela distância de
// compatibilidade das redes. Cada espécie guarda um representante entre uma rodada
// e outra, então o número dela continua o mesmo enquanto a linhagem existir.
// Junto, a conta da divisão de aptidão: a média de aptidão de cada espécie, a cota
// dela no teto da população e a mediana que separa a metade que pode reproduzir.
// E as duas proteções do NEAT: espécie nova tem carência, e espécie que parou de
// melhorar (estagnada) perde a cota.
export class SpeciesTracker {
  #state;
  #neat;
  #timer = 0;
  #nextId = 1;
  // Dias desde o começo, contados pelo relógio do céu (o mesmo da idade dos bichos).
  #day = 0;
  // [{ id, rep, born, best, improvedAt }] — o genoma de rede que representa cada
  // espécie viva, o dia em que ela surgiu e o recorde de aptidão dela.
  #species = [];

  constructor(state, neat) {
    this.#state = state;
    this.#neat = neat;
  }

  update({ dt, days }) {
    this.#day += days;
    this.#timer -= dt;
    if (this.#timer > 0) return;
    this.#timer = SPECIATION_INTERVAL;
    this.regroup();
  }

  regroup() {
    const day = this.#day;
    const groups = this.#species.map(species => ({ ...species, members: [] }));
    for (const o of this.#state.organisms) {
      let home = groups.find(group =>
        this.#neat.distance(o.mind.genome, group.rep) <= COMPAT_THRESHOLD);
      if (!home) {
        home = { id: this.#nextId++, rep: o.mind.genome, born: day, best: 0, improvedAt: day, members: [] };
        groups.push(home);
      }
      home.members.push(o);
      o.mind.species = home.id;
    }
    const alive = groups.filter(group => group.members.length);
    const summaries = alive.map(group => {
      const ranked = group.members.map(o => ({ o, fitness: Fitness.of(o) })).sort((a, b) => a.fitness - b.fitness);
      const scores = ranked.map(entry => entry.fitness);
      const mean = scores.reduce((total, f) => total + f, 0) / scores.length;
      const best = scores[scores.length - 1];
      if (best > group.best + STAGNATION_EPSILON) {
        group.best = best;
        group.improvedAt = day;
      }
      const size = group.members.length;
      return {
        id: group.id, size, meanFitness: mean, bestFitness: best, median: scores[Math.floor(scores.length / 2)],
        keepers: group.members.filter(o => o.torch || (o.band && o.band === this.#state.flame?.holder?.band)).length,
        // Campeão só conta em espécie grande, como no elitismo do NEAT.
        champion: size >= CULL_MIN_SPECIES ? ranked[ranked.length - 1].o.id : null,
        age: day - group.born,
        fresh: day - group.born < SPECIES_GRACE_DAYS,
        stagnant: day - group.improvedAt >= STAGNATION_DAYS,
        stalledFor: day - group.improvedAt
      };
    });
    this.#species = alive.map(group => ({
      id: group.id, born: group.born, best: group.best, improvedAt: group.improvedAt,
      rep: group.members[Math.floor(Math.random() * group.members.length)].mind.genome
    }));
    // A espécie mais apta nunca estagna (no artigo, as duas melhores são poupadas;
    // aqui, com poucas espécies, uma basta para a população não ficar sem cota).
    const leader = summaries.reduce((top, species) => !top || species.meanFitness > top.meanFitness ? species : top, null);
    if (leader) leader.stagnant = false;
    // Estagnada não entra na divisão das vagas: aptidão ajustada zero.
    const share = species => species.stagnant ? 0 : species.meanFitness;
    const total = summaries.reduce((sum, species) => sum + share(species), 0);
    for (const species of summaries) {
      species.quota = total > 0 ? MAX_POPULATION * share(species) / total : MAX_POPULATION / summaries.length;
    }
    this.#state.species = summaries.sort((a, b) => b.size - a.size);
  }
}
