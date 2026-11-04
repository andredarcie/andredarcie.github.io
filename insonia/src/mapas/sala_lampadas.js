// Sala das lâmpadas (9:23–9:33): a escada trancada com código (1264, dos números do banheiro).
export default {
  nome: 'sala_lampadas', w: 17, h: 13,
  tom: 50, amb: 0.7, tomPersonagem: 20,
  luzes: [
    { id: 'l1', x: 176, y: 110, r: 150, i: 0.45, halo: { r: 66, a: 0.75 } },
    { id: 'l2', x: 304, y: 110, r: 150, i: 0.45, halo: { r: 66, a: 0.75 } },
    { id: 'n1', x: 208, y: 266, r: 120, i: 0.45, halo: { r: 62, a: 0.8, sy: 1 } },
    { id: 'n2', x: 304, y: 266, r: 120, i: 0.45, halo: { r: 62, a: 0.8, sy: 1 } },
  ],
  legenda: {
    // parede de tijolinho (captura 11 de 2014)
    '#': 'borda_clara', P: 'pedra_parede', '.': 'piso_pedra', E: 'escada_escura', n: 'nicho',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '#####PPPPPP######',
    '#####PPPPPPP#####',
    '#####......P#####',
    '#####.......#####',
    '#####......######',
    '#####......######',
    '#####......######',
    '#####......######',
    '#################',
    '#################',
  ],
  objs: [['E', 7, 3], ['n', 6, 7], ['n', 9, 7]],
};
