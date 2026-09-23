import { GENE_SPECS, GENE_SAMPLE_INTERVAL, GENE_HISTORY_LIMIT, PIGMENT_COUNT } from '../config/genetics.js';

// Retrato da população de tempos em tempos: média e dispersão de cada gene, geração
// média e quanto de cada cor aparece e está guardado no pool. A primeira amostra vira
// a referência contra a qual a evolução é medida.
export class GeneStatistics {
  #state;
  #events;
  #nextSample = GENE_SAMPLE_INTERVAL;

  constructor(state, events) {
    this.#state = state;
    this.#events = events;
    this.history = [];
    this.baseline = null;
    this.spreadBaseline = null;
    this.pigmentBaseline = null;
  }

  get latest() {
    return this.history[this.history.length - 1];
  }

  update() {
    this.sampleIfDue();
  }

  sampleIfDue() {
    if (this.#state.elapsed < this.#nextSample) return;
    this.capture();
    this.#nextSample = this.#state.elapsed + GENE_SAMPLE_INTERVAL;
  }

  capture() {
    const organisms = this.#state.organisms;
    const count = organisms.length;
    const values = {};
    const pigmentCounts = Array(PIGMENT_COUNT).fill(0);
    const pigmentAlleleCounts = Array(PIGMENT_COUNT).fill(0);
    let generationTotal = 0;
    for (const key of Object.keys(GENE_SPECS)) values[key] = 0;
    for (const o of organisms) {
      for (const key of Object.keys(GENE_SPECS)) values[key] += o.genes[key];
      generationTotal += o.generation;
      pigmentCounts[o.genes.pigment]++;
      // As duas cópias contam: é no pool de alelos que o gene recessivo sobrevive
      // enquanto fica escondido, sem aparecer na contagem do que se vê na arena.
      pigmentAlleleCounts[o.genome.pigment[0]]++;
      pigmentAlleleCounts[o.genome.pigment[1]]++;
    }
    for (const key of Object.keys(GENE_SPECS)) values[key] = count ? values[key] / count : null;
    const generation = count ? generationTotal / count : null;
    const pigments = pigmentCounts.map((_, i) => ({
      expressed: count ? pigmentCounts[i] / count * 100 : 0,
      allele: count ? pigmentAlleleCounts[i] / (count * 2) * 100 : 0
    }));
    // Dispersão da população: é ela que o modelo antigo destruía a cada geração,
    // então é o número que mostra se ainda há variação para a seleção usar.
    const spreads = {};
    for (const key of Object.keys(GENE_SPECS)) {
      if (!count) { spreads[key] = null; continue; }
      let min = Infinity, max = -Infinity, squares = 0;
      for (const o of organisms) {
        const value = o.genes[key];
        min = Math.min(min, value);
        max = Math.max(max, value);
        squares += (value - values[key]) ** 2;
      }
      // Desvio amostral (n − 1): os 12 fundadores são uma amostra pequena e o
      // divisor por n subestimaria a dispersão inicial, inflando a comparação.
      spreads[key] = { min, max, deviation: Math.sqrt(squares / Math.max(1, count - 1)) };
    }
    if (!this.baseline && count) this.baseline = { ...values };
    if (!this.pigmentBaseline && count) this.pigmentBaseline = pigments.map(pigment => ({ ...pigment }));
    if (!this.spreadBaseline && count > 1) {
      this.spreadBaseline = {};
      for (const key of Object.keys(GENE_SPECS)) this.spreadBaseline[key] = spreads[key].deviation;
    }
    this.history.push({ time: this.#state.elapsed, count, generation, values, spreads, pigments });
    if (this.history.length > GENE_HISTORY_LIMIT) this.history.shift();
    this.#events.emit('genesSampled', this.latest);
  }
}
