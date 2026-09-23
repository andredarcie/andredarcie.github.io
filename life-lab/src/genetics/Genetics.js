import {
  GENE_SPECS, GENE_LOCI, FOUNDER_ALLELE_SPREAD, ALLELE_MUTATION_RATE, PIGMENT_MUTATION_RATE,
  PIGMENT_COUNT, PIGMENT_NAMES
} from '../config/genetics.js';

// Herança diploide e poligênica: como nasce o genoma de um fundador, como se forma
// um gameta, como dois gametas viram um filhote e como o genoma vira corpo.
export class Genetics {
  #vision;

  constructor(visionPhysiology) {
    this.#vision = visionPhysiology;
  }

  createFounderGenome(seedPigment) {
    const genome = {};
    for (const [key, spec] of Object.entries(GENE_SPECS)) {
      // Cada loco guarda [alelo paterno, alelo materno]; nos fundadores os dois são sorteados.
      genome[key] = Array.from({ length: GENE_LOCI },
        () => [Genetics.#randomFounderAllele(spec), Genetics.#randomFounderAllele(spec)]);
    }
    // Fundadores nascem homozigotos na cor, como a geração P de um cruzamento clássico:
    // a heterozigose (e os portadores) só aparece a partir dos primeiros filhotes.
    genome.pigment = [seedPigment, seedPigment];
    return genome;
  }

  // Meiose: cada loco sorteia uma das duas cópias do indivíduo, de forma independente
  // (é a recombinação livre), e só então pode sofrer mutação. O gameta é haploide.
  createGamete(genome) {
    const gamete = {};
    for (const [key, spec] of Object.entries(GENE_SPECS)) {
      gamete[key] = genome[key].map(locus => {
        const inherited = locus[Math.random() < .5 ? 0 : 1];
        if (Math.random() >= ALLELE_MUTATION_RATE) return inherited;
        const mutated = inherited + (Math.random() * 2 - 1) * spec.mutation;
        return Math.max(spec.min, Math.min(spec.max, mutated));
      });
    }
    gamete.pigment = Math.random() < PIGMENT_MUTATION_RATE
      ? Math.floor(Math.random() * PIGMENT_COUNT)
      : genome.pigment[Math.random() < .5 ? 0 : 1];
    return gamete;
  }

  createZygote(paternal, maternal) {
    const genome = {};
    for (const key of Object.keys(GENE_SPECS)) {
      genome[key] = paternal[key].map((allele, locus) => [allele, maternal[key][locus]]);
    }
    genome.pigment = [paternal.pigment, maternal.pigment];
    return genome;
  }

  // Série alélica de cor, no estilo do sistema ABO: o alelo de menor índice domina os
  // demais, então o recessivo fica escondido no portador e pode reaparecer num neto.
  dominantPigment(pair) {
    return Math.min(pair[0], pair[1]);
  }

  // Média dos alelos que vieram de cada lado — o que a ficha genética mostra como
  // "pai · mãe". A soma dos dois dividida por dois é o próprio traço expresso.
  haplotypeAverages(genome, key) {
    let paternal = 0, maternal = 0;
    for (const locus of genome[key]) {
      paternal += locus[0];
      maternal += locus[1];
    }
    return [paternal / GENE_LOCI, maternal / GENE_LOCI];
  }

  // Efeito aditivo: o traço visível é a média de todos os alelos do gene. Por isso o
  // fenótipo é contínuo e quase normal mesmo com alelos herdados de forma discreta.
  express(genome) {
    const genes = {};
    for (const key of Object.keys(GENE_SPECS)) {
      const [paternal, maternal] = this.haplotypeAverages(genome, key);
      genes[key] = (paternal + maternal) / 2;
    }
    // Restrição de desenvolvimento, não genética: o alelo de abertura continua no
    // genoma, mas um olho de alcance grande não consegue expressar o cone inteiro.
    genes.visionAngle = Math.min(genes.visionAngle,
      this.#vision.maximumAngleForRange(genes.visionRange));
    genes.pigment = this.dominantPigment(genome.pigment);
    return genes;
  }

  // Resumo do genoma para o estado textual: o que veio de cada lado, por gene.
  summarize(genome) {
    const round = value => Math.round(value * 100) / 100;
    const summary = {};
    for (const key of Object.keys(GENE_SPECS)) {
      const [paternal, maternal] = this.haplotypeAverages(genome, key);
      summary[key] = { paternal: round(paternal), maternal: round(maternal) };
    }
    summary.pigment = {
      paternal: PIGMENT_NAMES[genome.pigment[0]],
      maternal: PIGMENT_NAMES[genome.pigment[1]]
    };
    return summary;
  }

  static #randomFounderAllele(spec) {
    const reach = Math.min(spec.base - spec.min, spec.max - spec.base) * FOUNDER_ALLELE_SPREAD;
    return spec.base + (Math.random() * 2 - 1) * reach;
  }
}
