// Sala das grades (12:00–13:13): a voz de alguém trancado do outro lado.
export default {
  nome: 'celas', w: 17, h: 13,
  tom: 70, amb: 0.45, tomPersonagem: 30,
  lanterna: { r: 200, i: 0.5 },
  legenda: { '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos', G: 'grade_alta' },
  chao: [
    '######.....######',
    '######.....######',
    '######.....######',
    '#####WWWWWWW#####',
    '###WWWWWWWWWWW###',
    '##..WWWWWWWWW..##',
    '##.............##',
    '##.............##',
    '##.............##',
    '#####.......#####',
    '#####.......#####',
    '#################',
    '#################',
  ],
  objs: [['G', 6, 3], ['G', 7, 3], ['G', 8, 3], ['G', 9, 3], ['G', 10, 3]],
  passagem: [[6, 2, 0], [7, 2, 0], [8, 2, 0], [9, 2, 0], [10, 2, 0]],
};
