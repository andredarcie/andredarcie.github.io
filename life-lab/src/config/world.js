// Mundo: tamanho, biomas e o que cresce em cada um.

// O mundo é um quadrado fixo. Já foi 900 × 900; depois 636 × 636 (metade da área),
// 509 × 509 e agora 407 × 407 (cada um com lado 20% menor, 64% da área). O que é
// contado (árvores, capim, detalhe do chão) acompanha a área, então a densidade fica
// a mesma.
export const WORLD = Object.freeze({ width: 407, height: 407 });

export const BIOMES = Object.freeze([
  { id: 'desert', label: 'Deserto', earthShare: 19, worldShare: 1 / 3 },
  { id: 'taiga', label: 'Taiga', earthShare: 11.5, worldShare: 1 / 3 },
  { id: 'savanna', label: 'Savana', earthShare: 10.5, worldShare: 1 / 3 }
]);
export const DESERT_END = BIOMES[0].worldShare;
export const TAIGA_END = BIOMES[0].worldShare + BIOMES[1].worldShare;

// 2048 para o chão continuar nítido de perto (zoom e telas de alta densidade).
export const GROUND_TEXTURE_SIZE = 2048;
// O mundo é um tabuleiro flutuando no céu: esta é a grossura do bloco de terra
// embaixo do chão, com as laterais retas mostrando o corte.
export const BOARD_THICKNESS = 46;
// Quantos pontos sorteados para enfeite e árvore dentro do mundo. Nem todo ponto
// vira planta (clareira, poça, densidade do bioma).
export const SCENERY_SAMPLES = 94;
// Traços de detalhe rasteiro pintados no chão.
export const GROUND_DETAIL_STROKES = 270;

// Quanto de chão cada coisa ocupa (raio, em unidades), para nada nascer dentro de
// outra: árvore dentro de árvore, capim ou pedra dentro de lago, lago em cima de
// cabana. Um pouco menor que a copa, porque copa pode encostar em copa.
export const FOOTPRINT = Object.freeze({
  conifer: 8, broadleaf: 10, cactus: 5, rock: 6, shrub: 6,
  food: 6, campfire: 9
});
// Folga mínima entre duas coisas vizinhas, além dos raios.
export const FOOTPRINT_GAP = 2;
// Margem de lama em volta de um lago, que também conta como chão dele: nada nasce
// ali, e lago novo não nasce com a margem em cima de nada.
export const POND_CLEARANCE = 8;

// Vegetação por bioma. A densidade não copia o habitatWeight de propósito: a taiga é
// a mais fechada em árvore e a savana a mais aberta, ainda que seja a savana que
// produz mais capim. Mato alto não é pasto.
export const SCENERY_DENSITY = Object.freeze({ desert: .3, taiga: .8, savanna: .6 });
export const SCENERY_KINDS = Object.freeze({
  desert: [['cactus', .42], ['rock', .84], ['shrub', 1]],
  taiga: [['conifer', .74], ['shrub', .9], ['rock', 1]],
  savanna: [['broadleaf', .6], ['shrub', .92], ['rock', 1]]
});

// Passo máximo da simulação: o tempo de cada quadro é fatiado nisso.
export const MAX_SIMULATION_STEP = .025;
// Ritmo base do jogo: o "1×" do slider já roda a simulação no dobro do tempo real.
// O slider multiplica em cima disto.
export const BASE_SIMULATION_SPEED = 2;
