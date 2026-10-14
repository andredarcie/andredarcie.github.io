// Mundo: tamanho, biomas e o que cresce em cada um.

// O mundo é um quadrado fixo. Já foi 900 × 900; depois 636 × 636 (metade da área),
// 509 × 509 e 407 × 407. Agora 820 × 820 (~4× a área do de 407), para caber 100
// bichos de uma vez. O que é contado (árvores, capim, poças, detalhe do chão)
// acompanha a área, então a densidade fica a mesma.
export const WORLD = Object.freeze({ width: 820, height: 820 });

export const BIOMES = Object.freeze([
  { id: 'riverbed', label: 'Leito do Vaza-Barris', earthShare: 19, worldShare: .2 },
  { id: 'thicket', label: 'Caatinga fechada', earthShare: 11.5, worldShare: .42 },
  { id: 'scrub', label: 'Caatinga aberta', earthShare: 10.5, worldShare: .38 }
]);
export const RIVER_END = BIOMES[0].worldShare;
export const THICKET_END = BIOMES[0].worldShare + BIOMES[1].worldShare;

// 2048 para o chão continuar nítido de perto (zoom e telas de alta densidade).
export const GROUND_TEXTURE_SIZE = 2048;
// O mundo é um tabuleiro flutuando no céu: esta é a grossura do bloco de terra
// embaixo do chão, com as laterais retas mostrando o corte.
export const BOARD_THICKNESS = 46;
// Quantos pontos sorteados para enfeite e árvore dentro do mundo. Nem todo ponto
// vira planta (clareira, poça, densidade do bioma).
export const SCENERY_SAMPLES = 760;
// Traços de detalhe rasteiro pintados no chão.
export const GROUND_DETAIL_STROKES = 2600;

// Quanto de chão cada coisa ocupa (raio, em unidades), para nada nascer dentro de
// outra: árvore dentro de árvore, capim ou pedra dentro de lago, lago em cima de
// cabana. Um pouco menor que a copa, porque copa pode encostar em copa.
export const FOOTPRINT = Object.freeze({
  umbuzeiro: 11, catingueira: 6, mandacaru: 4, xiquexique: 4, rock: 5, macambira: 3, garrancho: 3,
  food: 6, campfire: 9
});
// Folga mínima entre duas coisas vizinhas, além dos raios.
export const FOOTPRINT_GAP = 2;
// Margem de lama em volta de um lago, que também conta como chão dele: nada nasce
// ali, e lago novo não nasce com a margem em cima de nada.
export const POND_CLEARANCE = 8;

// Vegetação por bioma, a da caatinga na seca. No areal do rio, pedra e lajedo,
// xique-xique e um ou outro umbuzeiro; na caatinga fechada, catingueira e garrancho
// emaranhados com mandacaru e macambira; na aberta, chão de pedra com mandacaru,
// xique-xique e garrancho. Catingueira e umbuzeiro são árvores (dão madeira); o
// resto é enfeite.
export const SCENERY_DENSITY = Object.freeze({ riverbed: .35, thicket: .9, scrub: .65 });
export const SCENERY_KINDS = Object.freeze({
  riverbed: [['rock', .3], ['xiquexique', .52], ['garrancho', .7], ['umbuzeiro', .82], ['macambira', 1]],
  thicket: [['catingueira', .34], ['garrancho', .62], ['macambira', .76], ['mandacaru', .86], ['umbuzeiro', .92], ['rock', 1]],
  scrub: [['garrancho', .3], ['mandacaru', .46], ['catingueira', .62], ['xiquexique', .78], ['rock', .9], ['macambira', 1]]
});

// Passo máximo da simulação: o tempo de cada quadro é fatiado nisso.
export const MAX_SIMULATION_STEP = .025;
// Ritmo base do jogo: o "1×" do slider já roda a simulação no dobro do tempo real.
// O slider multiplica em cima disto.
export const BASE_SIMULATION_SPEED = 2;
