// Quarto da rachadura (13:43–13:51): a parede quebrada leva à sala do enigma.
export default {
  nome: 'quarto_rachadura', w: 17, h: 13,
  tom: 75, amb: 0.75, tomPersonagem: 30,
  luzes: [{ id: 'lampada', x: 304, y: 142, r: 170, i: 0.25, halo: { r: 74, a: 0.78 } }],
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    c: 'cama_ferro', k: 'rachadura', v: 'vaso_quebrado', p: 'pedras', j: 'jarro', l: 'lixeira', r: 'rabisco', s: 'rabisco2',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '#################',
    '#####WWWWWW######',
    '#####WWWWWW######',
    '#####......######',
    '#####......######',
    '#####......######',
    '#####......######',
    '#######.#########',
    '#################',
    '#################',
  ],
  objs: [
    ['k', 5, 5], ['c', 6, 6], ['j', 9, 6], ['v', 10, 6], ['j', 10, 7],
    ['r', 5, 8], ['s', 10, 8], ['l', 5, 9], ['r', 6, 9], ['s', 9, 9], ['r', 10, 9],
  ],
};
