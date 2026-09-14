import { GENE_RANGE, MUTATION } from './config.js';
import { rand, clamp, coin } from './math.js';

export const GENES = ['pace', 'vigor', 'nose', 'roam', 'mark', 'zeal', 'build'];

const express = (range, t) => range[0] + (range[1] - range[0]) * t;

/**
 * O genoma de uma formiga: sete alelos em 0..1 e a patrilinha de onde veio.
 *
 * O gene é abstrato de propósito — quem traduz 0..1 no número que a formiga
 * usa são os getters de expressão. Assim mexer na faixa de um traço (config) não
 * encosta na herança, e mexer na herança não encosta no comportamento.
 */
export class Genome {
  constructor(alleles, lineage = -1) {
    this.alleles = alleles;
    this.lineage = lineage;   // de qual macho da espermateca veio o pai
  }

  /**
   * Fundador. A média de dois sorteios em vez de um: extremo fica raro e o
   * meio-termo comum, que é como um traço poligênico se distribui de verdade.
   */
  static random(lineage = -1) {
    const alleles = {};
    for (const gene of GENES) alleles[gene] = (Math.random() + Math.random()) / 2;
    return new Genome(alleles, lineage);
  }

  /**
   * Segregação mendeliana, um locus por gene: a filha leva o alelo da mãe ou o
   * do pai, sorteado, mais mutação.
   *
   * Tirar a média dos dois seria mais simples e estaria errado — em duas
   * gerações tudo convergiria pro meio e as patrilinhas deixariam de existir.
   */
  static cross(mother, father) {
    const alleles = {};
    for (const gene of GENES) {
      const inherited = coin() ? mother.alleles[gene] : father.alleles[gene];
      alleles[gene] = clamp(inherited + rand(-MUTATION, MUTATION), 0, 1);
    }
    return new Genome(alleles, father.lineage);
  }

  // --- expressão -----------------------------------------------------------
  // O fenótipo é lido uma vez, no nascimento. Daí em diante a formiga usa o
  // número, não o gene.

  get pace() { return express(GENE_RANGE.pace, this.alleles.pace); }
  get span() { return express(GENE_RANGE.vigor, this.alleles.vigor); }
  get senseDist() { return express(GENE_RANGE.nose, this.alleles.nose); }
  get roam() { return express(GENE_RANGE.roam, this.alleles.roam); }
  get mark() { return express(GENE_RANGE.mark, this.alleles.mark); }
  get zeal() { return express(GENE_RANGE.zeal, this.alleles.zeal); }
  get build() { return express(GENE_RANGE.build, this.alleles.build); }

  /** Pleiotropia: o mesmo gene do faro também decide o quanto ela corrige o rumo. */
  get trailGain() { return 0.7 + this.alleles.nose * 0.7; }
}
