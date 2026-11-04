// Quarto onde ele cai saindo do duto (2:32–2:38).
export default {
  nome: 'quarto2', w: 17, h: 13,
  tom: 60, amb: 0.85, tomPersonagem: 30,
  luzes: [
    { id: 'lampada', x: 208, y: 107, r: 170, i: 0.25, halo: { r: 74, a: 0.78 } },
  ],
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    c: 'cama_ferro', d: 'comoda', p: 'coluna', h: 'canos_h', g: 'boca_duto', B: 'biombo', r: 'rabisco', s: 'rabisco2',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '####WWWWWWWW#####',
    '####WWWWWWWW#####',
    '####........#####',
    '####........#####',
    '####........#####',
    '####........#####',
    '####........#####',
    '#######.#########',
    '#################',
    '#################',
  ],
  objs: [
    ['h', 10, 3], ['p', 4, 4], ['d', 7, 4], ['g', 9, 4], ['c', 6, 5], ['B', 9, 6],
    ['s', 11, 8], ['r', 10, 9], ['r', 11, 9],
  ],
};
