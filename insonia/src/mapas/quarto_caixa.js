// Quarto da caixa com os dois códigos (2:48–3:22). A porta em arco leva ao corredor.
export default {
  nome: 'quarto_caixa', w: 17, h: 13,
  tom: 60, amb: 0.8, tomPersonagem: 30,
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    c: 'cama_ferro', A: 'porta_arco', a: 'placa_aviso', e: 'estante_quebrada', p: 'papeis_chao',
    j: 'jarro', C: 'cortina_rasgada', r: 'rabisco', s: 'rabisco2',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '#################',
    '#####WWWWWWW#####',
    '#####WWWWWWW#####',
    '#####.......#####',
    '#####.......#####',
    '#####.......#####',
    '#####.......#####',
    '#################',
    '#################',
    '#################',
  ],
  objs: [
    ['A', 7, 4], ['a', 9, 4], ['C', 11, 4], ['e', 5, 5], ['c', 10, 6],
    ['p', 6, 7], ['j', 6, 9],
    ['r', 8, 6], ['s', 9, 6], ['r', 5, 8], ['s', 5, 9], ['r', 11, 8], ['s', 10, 9], ['r', 11, 9],
  ],
};
