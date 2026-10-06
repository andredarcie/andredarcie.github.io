import { GENE_HISTORY_LIMIT } from '../config/genetics.js';
import { BRAIN_OUTPUT_COUNT } from '../config/brain.js';
import { Fitness } from '../brain/Fitness.js';

// Retrato das redes neurais junto com o dos genes (mesma amostragem): a média de
// cada decisão da população, o tamanho médio das redes, a aptidão e as espécies.
export class BrainStatistics {
  #state;

  constructor(state, events) {
    this.#state = state;
    this.history = [];
    events.on('genesSampled', () => this.capture());
  }

  get latest() {
    return this.history[this.history.length - 1];
  }

  capture() {
    const organisms = this.#state.organisms;
    const count = organisms.length;
    const outputs = Array(BRAIN_OUTPUT_COUNT).fill(0);
    let thinking = 0, hidden = 0, links = 0, fitness = 0, best = 0;
    for (const o of organisms) {
      hidden += o.mind.genome.hidden.length;
      links += o.mind.genome.conns.filter(c => c.enabled).length;
      const score = Fitness.of(o);
      fitness += score;
      best = Math.max(best, score);
      // Quem ainda não pensou (recém-nascido) não entra na média das decisões.
      if (!o.mind.outputs.length) continue;
      thinking++;
      o.mind.outputs.forEach((value, i) => { outputs[i] += value; });
    }
    this.history.push({
      time: this.#state.elapsed,
      outputs: thinking ? outputs.map(total => total / thinking) : null,
      hidden: count ? hidden / count : 0,
      links: count ? links / count : 0,
      fitness: count ? fitness / count : 0,
      bestFitness: best,
      species: this.#state.species.map(species => ({ ...species }))
    });
    if (this.history.length > GENE_HISTORY_LIMIT) this.history.shift();
  }
}
