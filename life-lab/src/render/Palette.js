// Paleta medida pixel a pixel da referência (mini.png), não escolhida a olho.
// Os nomes dizem o papel; os valores são os que dominam a imagem.
export const PALETTE = Object.freeze({
  sky: 0xd6f3de,
  grassDark: 0x8ab25c,
  grassShade: 0x7d9150,
  tile: 0xc8c6aa,
  // Três tons por bioma, todos tirados do histograma da referência. É a variação
  // interna que tira o aspecto de faixa chapada; o do meio é o tom base.
  desertGround: [0xd0c090, 0xd8c898, 0xc0b080],
  taigaGround: [0x98b060, 0xa0b860, 0x708848],
  savannaGround: [0xb8c870, 0xc0c870, 0xa8c060],
  clearing: 0xd0c088,
  needle: 0x486030,
  dryGrass: 0xc0c870,
  rock: 0x8f9384,
  cactus: 0x608040,
  trunk: 0x6f5a3c,
  leafDark: 0x6d8a45,
  leafMid: 0x83995d,
  leafLight: 0xadc365,
  water: 0x7fb2c4,
  waterShine: 0xbfe6ef,
  // Laterais do tabuleiro: terra escura logo abaixo da grama, argila no meio e rocha
  // no fundo, como o corte de um barranco.
  soilTop: 0x7c5c3c,
  soilDeep: 0x94704a,
  bedrock: 0x716a60,
  bedrockDark: 0x57514a,
  hair: 0x4a3a2a
});
