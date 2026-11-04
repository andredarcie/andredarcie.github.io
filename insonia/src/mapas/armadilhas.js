// Sala das armadilhas (10:22–11:59): "Sala sem saída". Medida no quadro 10:31 do trailer.
// Armadilhas escondidas mandam o herói de volta à entrada; a chave de bronze fica no alto.
export default {
  nome: 'armadilhas', w: 17, h: 13,
  tom: 70, amb: 0.5, tomPersonagem: 30,
  lanterna: { r: 210, i: 0.55 },
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    q: 'quadro_pequeno', e: 'estante_quebrada', l: 'lampiao', o: 'ossos', p: 'pedras', v: 'vaso_quebrado',
    k: 'cadeira_caida', x: 'cruz_quebrada', b: 'balde', r: 'rabisco', s: 'rabisco2', R: 'raizes',
    g: 'grade_parede', m: 'mesa_redonda', t: 'entulho', K: 'rachadura',
  },
  chao: [
    '#################',
    '#WWWWWWWWWWWWWW##',
    '#WWWWWWWWWWWWWW##',
    '#..............##',
    '#..............##',
    '#...............#',
    '#...............#',
    '#...............#',
    '#..............##',
    '#..............##',
    '#..............##',
    '#..............##',
    '#################',
  ],
  objs: [
    ['q', 2, 2], ['e', 3, 2], ['R', 5, 1], ['g', 8, 1], ['K', 10, 2], ['q', 12, 2],
    ['r', 5, 3], ['k', 6, 3], ['s', 7, 3], ['p', 10, 3], ['r', 11, 3], ['r', 10, 4], ['s', 14, 4], ['x', 14, 5],
    ['s', 7, 6], ['o', 8, 6], ['v', 10, 6], ['t', 3, 7], ['m', 8, 7], ['r', 7, 8], ['b', 8, 8],
    ['p', 14, 10], ['x', 3, 11], ['r', 4, 11], ['o', 6, 11], ['s', 10, 11], ['x', 12, 11], ['r', 14, 11],
  ],
};
