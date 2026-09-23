import { GENE_SPECS, SELECTION_SIGMA } from '../config/genetics.js';

// Leitura das amostras: quanto cada gene andou desde o início e se isso passa da
// margem que a deriva sozinha explicaria. É o que separa "está sendo selecionado" de
// "a média balançou porque a população é pequena".
export class GeneReadings {
  #stats;

  constructor(geneStatistics) {
    this.#stats = geneStatistics;
  }

  change(value, key) {
    return (value / this.#stats.baseline[key] - 1) * 100;
  }

  // Quanto a média de um gene passearia sozinha, sem seleção nenhuma, só porque a
  // população é finita: a deriva acumula desvio σ·√(gerações / vivos). Mudanças
  // abaixo disso são acaso; acima, alguma coisa está empurrando o gene.
  // A contagem de vivos entra no lugar do tamanho efetivo, que é sempre menor porque
  // alguns bichos deixam muito mais filhotes que outros — então esta margem é o piso,
  // não o valor exato, e é por isso que o corte exige o dobro dela.
  driftMargin(key, sample) {
    const spread = sample.spreads?.[key];
    if (!spread || !sample.count || !sample.generation) return null;
    const deviation = spread.deviation * Math.sqrt(sample.generation / sample.count);
    return deviation / this.#stats.baseline[key] * 100;
  }

  read(key, sample) {
    const value = sample.values[key];
    if (value === null) return null;
    const change = this.change(value, key);
    const margin = this.driftMargin(key, sample);
    const threshold = margin === null ? null : margin * SELECTION_SIGMA;
    return { value, change, threshold, selected: threshold !== null && Math.abs(change) > threshold };
  }

  // Quanto da dispersão inicial de cada gene ainda existe na população, na média.
  // Com herança por média isso despencava; com genoma diploide deve ficar perto de 100%.
  diversity(sample) {
    const baselines = this.#stats.spreadBaseline;
    if (!baselines) return '—';
    const retained = [];
    for (const key of Object.keys(GENE_SPECS)) {
      const baseline = baselines[key];
      if (baseline > 0 && sample.spreads?.[key]) retained.push(sample.spreads[key].deviation / baseline);
    }
    if (!retained.length) return '—';
    return `${Math.round(retained.reduce((total, share) => total + share, 0) / retained.length * 100)}%`;
  }
}
