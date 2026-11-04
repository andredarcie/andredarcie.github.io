// Flashback: o quarto do menino numa noite de tempestade (5:23–7:02).
export default {
  nome: 'quarto_menino', w: 17, h: 13, cena: true, // só existe dentro da cena: não salva aqui
  tom: 95, amb: 0.28, tomPersonagem: 70,
  legenda: {
    '#': 'borda_clara', W: 'parede_ripas', '.': 'piso_escuro',
    J: 'janela_cortina', L: 'cortina_longa', p: 'poltrona', c: 'cama_menino', d: 'comoda2', a: 'armario',
    v: 'vaso_planta', m: 'mesa_redonda', b: 'banquinho', q: 'banquinho2', B: 'banco', x: 'caixote',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '####WWWWWWWWWWW##',
    '###WWWWWWWWWWWWW#',
    '###W...........W#',
    '###.............#',
    '###.............#',
    '###.............#',
    '###.............#',
    '####...........##',
    '############.####',
    '#################',
  ],
  objs: [
    ['J', 5, 3], ['J', 7, 3], ['L', 9, 3], ['L', 11, 3], ['J', 13, 3],
    ['v', 4, 4], ['p', 8, 4], ['d', 14, 4], ['c', 12, 5], ['a', 15, 6],
    ['q', 5, 6], ['b', 4, 7], ['m', 5, 7], ['b', 6, 7], ['q', 5, 8], ['B', 7, 10], ['x', 4, 10],
  ],
};
