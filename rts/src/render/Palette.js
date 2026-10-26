// Paleta do sertão baiano em seca, como em Canudos (1896–1897): chão de terra ocre e
// avermelhada, o areal claro do leito do Vaza-Barris, a caatinga cinzenta e sem
// folha (catingueira, favela), o verde-oliva do umbuzeiro e o verde-azulado do
// mandacaru. Os nomes dizem o papel; os tons foram puxados da caatinga na seca, e não
// do verde da referência antiga.
import { TUPI } from '../config/mission.js';

const SERTAO = Object.freeze({
  // Céu de sol a pino, quase branco perto do horizonte.
  sky: 0xe9efe6,
  grassDark: 0xa99a5c,
  grassShade: 0x8f8250,
  tile: 0xb3a58a,
  // Três tons por bioma; o do meio é o tom base. Leito do rio: areia clara. Caatinga
  // fechada: chão de folha seca, pardo-acinzentado. Caatinga aberta: terra ocre
  // avermelhada, a cor que mais aparece nas fotografias e relatos da campanha.
  riverbedGround: [0xd9c9a3, 0xe2d3ad, 0xc8b68e],
  thicketGround: [0xb29b74, 0xbca67e, 0x9f8965],
  scrubGround: [0xc4955f, 0xcd9f68, 0xb08350],
  // A praça de terra batida do arraial e as estradas, um pouco mais vermelhas.
  clearing: 0xcfae7c,
  road: 0xb8865a,
  roadRut: 0x8a6240,
  litter: 0x7a6a50,
  dryGrass: 0xc9b57a,
  rock: 0xaca394,
  rockLight: 0xc6bdac,
  rockWarm: 0xb09a80,
  // Plantas: casca cinza da caatinga, copa oliva sem viço, o umbuzeiro mais verde,
  // o mandacaru verde-azulado e a macambira de folha dura.
  trunk: 0x8a8378,
  trunkDark: 0x6a6258,
  // Casca da catingueira e da favela: cinza-clara, quase branca no sol.
  bark: 0x9c968a,
  barkLight: 0xbdb7a8,
  barkDark: 0x5e5246,
  leafDark: 0x6f7a4a,
  leafMid: 0x8a9160,
  leafLight: 0xa3a477,
  // Folha secando: o amarelo-palha que a caatinga toma antes de perder tudo.
  leafDry: 0xb8a65e,
  umbuLeaf: 0x667a44,
  umbuLeafDark: 0x52663a,
  umbuLeafLight: 0x7c8c52,
  umbuFruit: 0xc8c25a,
  mandacaru: 0x5b8466,
  mandacaruRib: 0x456a52,
  mandacaruTip: 0x7da084,
  flower: 0xf2efe2,
  // Roça ("as raras roças de milho ou mandioca", Os Sertões): a terra das covas,
  // revolvida e mais escura que o chão em volta; a mandioca de haste cinza-parda,
  // pecíolo avermelhado e folha verde-escura; o milho já amarelando na seca, com o
  // pendão cor de palha e a espiga na palha verde-clara.
  tilled: 0x9c6a42,
  tilledDark: 0x7f5636,
  cassavaStem: 0x8b7a66,
  cassavaNode: 0x6f6152,
  cassavaPetiole: 0x9b4a3c,
  cassavaLeaf: 0x4d6b32,
  cassavaLeafLight: 0x627f3d,
  cornStalk: 0x9aa25a,
  cornLeaf: 0x8e9c4e,
  cornLeafDry: 0xc4b26e,
  cornTassel: 0xd9c27c,
  cornHusk: 0xb7b56c,
  cornSilk: 0x8a5a32,
  // Favela: casca cinza-parda lisa e a folha recortada cinza-esverdeada, de pelo.
  favelaBark: 0x8f877a,
  favelaLeaf: 0x7f8f6c,
  favelaLeafLight: 0x9aa684,
  // Quixabeira: copa fechada verde-escura, de folha miúda.
  quixabaLeaf: 0x4f6638,
  quixabaLeafDark: 0x3d522c,
  // Juazeiro: o verde intenso que não cai na seca, e a flor "cor de ouro".
  juazeiroLeaf: 0x5e8c36,
  juazeiroLeafLight: 0x77a444,
  juazeiroLeafDark: 0x46702a,
  juazeiroFlower: 0xe2c23e,
  // Canudo-de-pito: vara verde-acinzentada pintalgada de branco, espiga clara.
  canudoStem: 0x98a284,
  canudoLeaf: 0x6f8a4e,
  canudoFlower: 0xe8e2ec,
  // Cabeça-de-frade: corpo verde de gomos e o capuz vermelho no alto.
  melocactus: 0x4e7b5c,
  cephalium: 0xb8443a,
  // Palmatória: raquete verde-acinzentada e a flor vermelho-alaranjada.
  palmatoria: 0x6e8e5c,
  cactusFlower: 0xd9502e,
  // Talcoxisto: placas cinza-esverdeadas, de brilho sedoso.
  schist: 0x9b9c8a,
  schistLight: 0xb9baa6,
  schistDark: 0x7b7c6c,
  xiquexique: 0x7a9a6c,
  macambira: 0x7f8f55,
  macambiraRed: 0xa8553a,
  // Água barrenta das cacimbas e poças do rio intermitente.
  water: 0x8aa59a,
  waterShine: 0xc9ddd2,
  // Laterais do tabuleiro: terra vermelha logo abaixo, argila no meio e o granito
  // do embasamento do sertão no fundo.
  soilTop: 0x8a5a36,
  soilDeep: 0xa86f44,
  bedrock: 0x7d7166,
  bedrockDark: 0x5e554b,
  hair: 0x2e2620,
  // Construção: taipa (barro sobre varas), cal da igreja, telha de barro e madeira.
  taipa: 0xa8774c,
  taipaDark: 0x86603e,
  whitewash: 0xebe4d3,
  roofTile: 0x9c4e2e,
  roofMud: 0x8c6a48,
  stick: 0x6b5236
});

// O litoral da missão dos tupinambás: a mata atlântica úmida e verde-escura, a
// capoeira das roças mais clara, a areia branca da praia, o rio de água corrente
// verde-escura e o mar da enseada, raso e claro perto da areia, fundo para fora.
// O chão de terra é o vermelho do litoral; a pedra, o granito dos costões. Mais as
// plantas: a pindoba, o pau-brasil, o jequitibá, a embaúba, a pitangueira, a
// samambaia, o gravatá, a taquara e a moita da restinga.
const LITORAL = Object.freeze({
  ...SERTAO,
  sky: 0xe4eef0,
  grassDark: 0x5f8a3e,
  grassShade: 0x4a7232,
  tile: 0x9a8a72,
  riverbedGround: [0x4f7d78, 0x5a8a82, 0x46706c],
  thicketGround: [0x4f6a34, 0x5a7539, 0x445d2d],
  scrubGround: [0x7d9a4a, 0x89a653, 0x6f8b41],
  beachGround: [0xe6dcc0, 0xede4cb, 0xd8ccac],
  seaGround: [0x3f7f8c, 0x4c8e98, 0x356f7d],
  seaDeep: 0x2a5a6e,
  foam: 0xf3f1e8,
  clearing: 0xa77d52,
  road: 0x8f6a44,
  roadRut: 0x6e5034,
  litter: 0x3e4f26,
  dryGrass: 0x9cb35a,
  rock: 0x8f8e88,
  rockLight: 0xaeada6,
  rockWarm: 0x9a9184,
  bark: 0x7a6a58,
  barkLight: 0xa49884,
  barkDark: 0x4e3e30,
  leafDark: 0x2f5a2a,
  leafMid: 0x3d6e32,
  leafLight: 0x58884a,
  leafDry: 0x8a8a4a,
  tilled: 0x7a4a2e,
  tilledDark: 0x5e3a24,
  water: 0x5a8a82,
  waterShine: 0xbcd8cf,
  soilTop: 0x8a4a2e,
  soilDeep: 0xa25a36,
  bedrock: 0x6e6a64,
  bedrockDark: 0x55524c,
  hair: 0x17130f,
  // Plantas da mata.
  palmTrunk: 0x8a7e6a,
  palmLeaf: 0x4f7a34,
  palmLeafDark: 0x3c6228,
  palmLeafDry: 0x9a8a50,
  palmFruit: 0xd88a2a,
  brazilBark: 0x3e2c22,
  brazilHeart: 0xa8322a,
  brazilLeaf: 0x3a6a2e,
  brazilFlower: 0xe8c43a,
  jequitibaBark: 0x7e7262,
  jequitibaLeaf: 0x335f2c,
  jequitibaLeafLight: 0x4a7a38,
  embaubaBark: 0xcfcbbf,
  embaubaLeaf: 0x8aa58a,
  embaubaLeafUnder: 0xc9d4c6,
  pitangaLeaf: 0x44702e,
  pitangaFruit: 0xc8301e,
  fern: 0x4f8a3a,
  fernDark: 0x3a6e2c,
  bromelia: 0x6a8a3e,
  bromeliaRed: 0xc2402a,
  taquara: 0x8aa04a,
  taquaraNode: 0x6a7a36,
  taquaraLeaf: 0x5e8a3a,
  restinga: 0x5a7a3a,
  restingaLight: 0x7a9a4a
});

export const PALETTE = TUPI ? LITORAL : SERTAO;
