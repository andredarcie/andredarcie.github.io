// Sala 14 (3:48–5:20): a chave do armário no banco, a voz, o esconderijo e o monstro.
export default {
  nome: 'sala14', w: 17, h: 14,
  tom: 70, amb: 0.75, tomPersonagem: 35,
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    c: 'cama_ferro', C: 'cortina_escura', P: 'prateleira', t: 'tabuas', k: 'cadeira', e: 'banco_e', d: 'banco_d',
    x: 'cruz_quebrada', b: 'balde', D: 'porta_painel', r: 'rabisco', s: 'rabisco2',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '#######W#########',
    '####WWWWWWW######',
    '####WWW.WWW######',
    '####.......######',
    '####.......######',
    '####.......######',
    '####.......######',
    '####.......######',
    '####.......######',
    '#################',
    '#################',
  ],
  objs: [
    ['C', 4, 4], ['C', 5, 4], ['C', 6, 4], ['D', 7, 3], ['P', 10, 5],
    ['t', 4, 6], ['k', 9, 6], ['c', 4, 9], ['e', 5, 9], ['d', 6, 9], ['x', 10, 9], ['b', 9, 11],
    ['r', 5, 6], ['s', 6, 6], ['r', 10, 10], ['s', 4, 11], ['r', 5, 11], ['s', 10, 11],
  ],
};
