// Genoma, herança e acompanhamento da evolução.
import { VISION, VISION_ANGLE, INFANT_AGE, ELDER_AGE } from './organisms.js';

export const GENE_SPECS = Object.freeze({
  visionRange: { base: VISION, min: 75, max: 135, mutation: 10 },
  visionAngle: { base: VISION_ANGLE, min: 90, max: 155, mutation: 8 },
  speed: { base: 1, min: .78, max: 1.22, mutation: .08 },
  metabolism: { base: 1, min: .8, max: 1.2, mutation: .07 },
  efficiency: { base: 1, min: .82, max: 1.18, mutation: .07 },
  // Em dias; mesmas proporções de faixa e mutação de quando eram segundos.
  maturity: { base: INFANT_AGE, min: .83, max: 1.22, mutation: .09 },
  longevity: { base: ELDER_AGE, min: 4.2, max: 5.9, mutation: .33 },
  fertility: { base: 1, min: .8, max: 1.22, mutation: .07 }
});
// Cada gene quantitativo é poligênico e diploide: GENE_LOCI locos, dois alelos por
// loco (um do pai, um da mãe). O alelo é um número que viaja intacto entre gerações,
// como um alelo de verdade; o traço visível é a média dos 2 × GENE_LOCI alelos.
// É isso que preserva a variação: a média dos pais NÃO é o que o filhote herda.
export const GENE_LOCI = 3;
// 1 = o pool alélico dos fundadores ocupa toda a faixa legal do gene. A população
// nasce parecendo uniforme (a média de seis alelos concentra o fenótipo) mas guarda
// alelos extremos escondidos, que a seleção pode revelar depois.
export const FOUNDER_ALLELE_SPREAD = 1;
export const ALLELE_MUTATION_RATE = .04;
export const PIGMENT_MUTATION_RATE = .04;
// A série de cores do corpo, na ordem de dominância (o menor índice domina).
export const PIGMENT_NAMES = Object.freeze(['coral', 'ciano', 'amarelo', 'lilás']);
export const PIGMENT_COUNT = PIGMENT_NAMES.length;

export const GENE_SAMPLE_INTERVAL = 1;
export const GENE_HISTORY_LIMIT = 600;
// Só os genes quantitativos entram no gráfico de linhas. As cores são proporções
// (0 a 100%) e, dividindo o mesmo eixo automático, esmagavam as linhas dos genes:
// elas têm seção própria mais abaixo, em barras empilhadas.
export const GENE_TRAITS = Object.freeze([
  { key: 'visionRange', label: 'Alcance da visão' },
  { key: 'visionAngle', label: 'Abertura da visão' },
  { key: 'speed', label: 'Velocidade' },
  { key: 'metabolism', label: 'Metabolismo' },
  { key: 'efficiency', label: 'Aproveitamento' },
  { key: 'maturity', label: 'Idade adulta' },
  { key: 'longevity', label: 'Velhice' },
  { key: 'fertility', label: 'Fertilidade' }
]);
// Acima de quantos desvios de deriva uma mudança deixa de ser acaso e passa a
// ser lida como seleção. Dois desvios ≈ 95% de confiança.
export const SELECTION_SIGMA = 2;
