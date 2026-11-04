// Sala do enigma (13:54–13:59): a inscrição na parede e o tabuleiro de formas.
export default {
  nome: 'sala_enigma', w: 17, h: 13,
  tom: 85, amb: 0.55, tomPersonagem: 25,
  luzes: [{ id: 'lampada', x: 240, y: 110, r: 160, i: 0.4, halo: { r: 62, a: 0.8 } }],
  legenda: {
    '#': 'borda_clara', W: 'pedra_parede', '.': 'piso_escamas', b: 'bau', R: 'raiz_parede',
  },
  // medido no quadro 13:55 do trailer
  chao: [
    '#################',
    '#################',
    '#################',
    '#####WWWWW#######',
    '####WWWWWWW######',
    '####.......######',
    '####.......######',
    '####.......######',
    '#####.....#######',
    '#################',
    '#################',
    '#################',
    '#################',
  ],
  objs: [['R', 4, 4], ['b', 7, 5]],
};
