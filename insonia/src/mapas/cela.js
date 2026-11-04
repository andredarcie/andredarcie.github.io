// Cela onde ele acorda (0:00–2:05 do trailer). Tela inteira 17x13; o quarto ocupa x 6–11, y 3–9.
export default {
  nome: 'cela', w: 17, h: 13,
  tom: 60, amb: 0.85, tomPersonagem: 30,
  luzes: [
    { id: 'lampada', x: 272, y: 107, r: 170, i: 0.25, halo: { r: 74, a: 0.78 } },
  ],
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    c: 'cama_ferro', m: 'mesa_rasgada', p: 'coluna', v: 'respiro', r: 'rabisco',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '######WWWWWW#####',
    '######WWWWWW#####',
    '######......#####',
    '######......#####',
    '######......#####',
    '######......#####',
    '######......#####',
    '#########.#######',
    '#################',
    '#################',
  ],
  obj: [[
    '',
    '',
    '',
    '',
    '          vp',
    '       cm',
    '',
    '',
    '           r',
    '          rr',
  ]],
};
