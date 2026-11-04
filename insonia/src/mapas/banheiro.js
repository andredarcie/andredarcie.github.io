// Banheiro (8:55–9:19): quatro cabines com 1, 2, 6 e 4 riscados nas paredes; o espelho.
// Medido no quadro 9:01 do trailer e conferido com a captura 10 de 2014.
export default {
  nome: 'banheiro', w: 17, h: 13,
  tom: 85, amb: 0.75, tomPersonagem: 30,
  legenda: {
    '#': 'borda_clara', W: 'parede_banheiro', '.': 'piso_pedra',
    v: 'vaso', p: 'pia', e: 'espelho', a: 'armario_escuro', V: 'canos_v', r: 'cano_registro',
    1: 'num1', 2: 'num2', 6: 'num6', 4: 'num4',
  },
  chao: [
    '#################',
    '#################',
    '##WW#WW#WW#WW####',
    '##WW#WW#WW#WW####',
    '##..#..#..#..####',
    '##..W..W..W..WWW#',
    '##..W..W..W..WWW#',
    '##..............#',
    '##..............#',
    '##..............#',
    '#######.#####...#',
    '#################',
    '#################',
  ],
  objs: [
    ['a', 2, 2], ['1', 3, 2], ['v', 3, 3], ['a', 5, 2], ['2', 6, 2], ['v', 6, 3], ['6', 8, 2], ['v', 9, 3],
    ['a', 11, 2], ['4', 12, 2], ['v', 12, 3], ['V', 4, 5],
    ['a', 14, 5], ['e', 15, 5], ['p', 15, 6], ['r', 2, 9],
  ],
};
