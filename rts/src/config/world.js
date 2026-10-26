// Mundo: tamanho, biomas e o que cresce em cada um.
import { TUPI } from './mission.js';

// O mundo é um quadrado fixo. Já foi 900 × 900; depois 636 × 636 (metade da área),
// 509 × 509 e 407 × 407. Agora 820 × 820 (~4× a área do de 407), para caber 100
// bichos de uma vez. O que é contado (árvores, capim, poças, detalhe do chão)
// acompanha a área, então a densidade fica a mesma.
export const WORLD = Object.freeze({ width: 820, height: 820 });

// Os biomas: o leito seco do Vaza-Barris contornando o arraial pelo leste e pelo sul,
// a caatinga aberta e pelada em volta da vila e a fechada para fora, nas estradas.
// Onde fica cada um: BiomeMap.
// Na missão dos tupinambás os mesmos papéis viram o rio de água corrente, a mata
// atlântica fechada e a capoeira das roças em volta da aldeia, mais a areia da praia
// e o mar.
export const BIOMES = Object.freeze(TUPI ? [
  { id: 'riverbed', label: 'Rio' },
  { id: 'thicket', label: 'Mata' },
  { id: 'scrub', label: 'Capoeira e roças' },
  { id: 'beach', label: 'Praia e restinga' },
  { id: 'sea', label: 'Mar' }
] : [
  { id: 'riverbed', label: 'Leito do Vaza-Barris' },
  { id: 'thicket', label: 'Caatinga fechada' },
  { id: 'scrub', label: 'Caatinga aberta' }
]);

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
  umbuzeiro: 15, catingueira: 7, favela: 8, quixabeira: 8, juazeiro: 12,
  mandacaru: 5, xiquexique: 4, rock: 5, lasca: 5, macambira: 3, garrancho: 3,
  canudo: 3, cabecafrade: 2.5, palmatoria: 4,
  pindoba: 6, ibirapitanga: 9, jequitiba: 15, embauba: 7, pitangueira: 7,
  samambaia: 4, bromelia: 3, taquara: 5, restinga: 5, costao: 9,
  food: 6, campfire: 9
});
// Árvores (dão madeira, viram recurso da simulação); o resto é enfeite.
export const TREE_KINDS = Object.freeze(TUPI
  ? ['pindoba', 'ibirapitanga', 'jequitiba', 'embauba', 'pitangueira']
  : ['umbuzeiro', 'catingueira', 'favela', 'quixabeira', 'juazeiro']);
// Folga mínima entre duas coisas vizinhas, além dos raios.
export const FOOTPRINT_GAP = 2;
// Margem de lama em volta de um lago, que também conta como chão dele: nada nasce
// ali, e lago novo não nasce com a margem em cima de nada.
export const POND_CLEARANCE = 8;

// Vegetação por bioma, a da caatinga na seca, pelas plantas que Os Sertões nomeia.
// Na beira do rio, os canudos-de-pito ("vicejantes em grande cópia à beira do rio",
// os que deram nome ao arraial), quixabeiras, juazeiros e algum umbuzeiro; na
// caatinga fechada, catingueira ("sessenta por cento das caatingas"), favela e o
// garrancho de jurema emaranhados com mandacaru, macambira e palmatória; na aberta,
// em volta da vila, o chão quase nu de "acervos de bromélias" e "cactos esguios e
// solitários": mandacaru, cabeça-de-frade, palmatória, xique-xique e pouca árvore.
//
// Na mata atlântica do litoral (missão dos tupinambás): a pindoba, a palmeira de
// cuja folha se cobriam as casas; a ibirapitanga, o pau-brasil, "pau vermelho" em
// tupi; o jequitibá, árvore grande da mata; a embaúba, que toma a clareira; no chão,
// samambaia, gravatá (bromélia) e taquara, de que se faziam as flechas; na
// restinga, pitangueira e moita baixa; e o costão de pedra nas pontas da enseada.
// Nada que veio depois de 1500 (coqueiro, bananeira).
const TUPI_DENSITY = Object.freeze({ riverbed: 0, thicket: .95, scrub: .5, beach: .45, sea: 0 });
const TUPI_KINDS = Object.freeze({
  riverbed: [['taquara', 1]],
  thicket: [['jequitiba', .14], ['pindoba', .3], ['ibirapitanga', .42], ['embauba', .5], ['samambaia', .66],
    ['bromelia', .78], ['taquara', .9], ['rock', 1]],
  scrub: [['samambaia', .2], ['taquara', .36], ['embauba', .48], ['pindoba', .6], ['bromelia', .72],
    ['pitangueira', .82], ['restinga', .92], ['rock', 1]],
  beach: [['restinga', .38], ['bromelia', .6], ['pitangueira', .78], ['pindoba', .86], ['rock', 1]],
  sea: [['rock', 1]]
});
export const SCENERY_DENSITY = TUPI ? TUPI_DENSITY : Object.freeze({ riverbed: .5, thicket: .9, scrub: .55 });
export const SCENERY_KINDS = TUPI ? TUPI_KINDS : Object.freeze({
  riverbed: [['rock', .12], ['canudo', .44], ['xiquexique', .52], ['quixabeira', .62], ['juazeiro', .7],
    ['umbuzeiro', .77], ['garrancho', .9], ['macambira', 1]],
  thicket: [['catingueira', .3], ['favela', .42], ['garrancho', .58], ['macambira', .68], ['mandacaru', .76],
    ['umbuzeiro', .82], ['juazeiro', .86], ['palmatoria', .93], ['rock', 1]],
  scrub: [['garrancho', .2], ['mandacaru', .36], ['cabecafrade', .5], ['palmatoria', .62], ['macambira', .74],
    ['xiquexique', .82], ['catingueira', .88], ['favela', .93], ['rock', 1]]
});
// Perto do arraial (BiomeMap.openness) a pedra é a de lá: "lascas de talcoxisto".
// O matacão redondo de granito fica para longe, como no caminho de Monte Santo.
export const SCHIST_RADIUS = 330;

// Passo máximo da simulação: o tempo de cada quadro é fatiado nisso.
export const MAX_SIMULATION_STEP = .025;
// Ritmo base do jogo: o "1×" do slider roda a simulação a 0,84× do tempo real. Já foi
// 2× e depois 1,2×, mas tudo acontecia rápido demais (gente correndo, ondas
// emendando). O slider multiplica em cima disto.
export const BASE_SIMULATION_SPEED = .84;
