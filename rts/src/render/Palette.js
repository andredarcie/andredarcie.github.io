// Paleta do sertão baiano em seca, como em Canudos (1896–1897): chão de terra ocre e
// avermelhada, o areal claro do leito do Vaza-Barris, a caatinga cinzenta e sem
// folha (catingueira, favela), o verde-oliva do umbuzeiro e o verde-azulado do
// mandacaru. Os nomes dizem o papel; os tons foram puxados da caatinga na seca, e não
// do verde da referência antiga.
export const PALETTE = Object.freeze({
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
