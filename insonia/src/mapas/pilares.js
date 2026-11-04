// Corredor escuro dos pilares (9:52–10:21 e 13:17–13:34). Luzes soltas piscam nas paredes.
const pilares = [6, 11, 17, 24, 31, 38, 43];
const linha4 = Array.from({ length: 52 }, (_, x) => (pilares.includes(x) ? 'W' : '#')).join('');

export default {
  nome: 'pilares', w: 52, h: 13,
  tom: 60, amb: 0.22, tomPersonagem: 25,
  lanterna: { r: 250, i: 0.75 },
  luzes: [
    { id: 'f1', x: 15 * 32 + 16, y: 5 * 32 + 16, r: 120, i: 0.3, halo: { r: 54, a: 0.7 } },
    { id: 'f2', x: 34 * 32 + 16, y: 5 * 32 + 16, r: 120, i: 0.3, halo: { r: 54, a: 0.7 } },
    { id: 'f3', x: 8 * 32 + 16, y: 5 * 32 + 16, r: 120, i: 0.3, halo: { r: 54, a: 0.7 }, on: false },
    { id: 'f4', x: 27 * 32 + 16, y: 5 * 32 + 16, r: 120, i: 0.3, halo: { r: 54, a: 0.7 }, on: false },
    { id: 'f5', x: 45 * 32 + 16, y: 5 * 32 + 16, r: 120, i: 0.3, halo: { r: 54, a: 0.7 }, on: false },
  ],
  legenda: {
    '#': 'borda_madeira', W: 'parede_preta', '.': 'piso_tacos',
    c: 'coluna', r: 'raizes', p: 'pedra_grande', a: 'placa_aviso', x: 'rabisco', y: 'rabisco2',
  },
  chao: [
    '#'.repeat(52), '#'.repeat(52), '#'.repeat(52), '#'.repeat(52),
    linha4,
    '###' + 'W'.repeat(47) + '##',
    '###' + 'W'.repeat(47) + '##',
    '###' + '.'.repeat(47) + '##',
    '###' + '.'.repeat(47) + '##',
    '###' + '.'.repeat(47) + '##',
    '#'.repeat(52), '#'.repeat(52), '#'.repeat(52),
  ],
  objs: [
    ...pilares.map((x) => ['c', x, 5]),
    ['r', 4, 5], ['r', 21, 5], ['r', 40, 5], ['a', 35, 5],
    ['x', 8, 7], ['y', 9, 7], ['x', 10, 7], ['y', 15, 7], ['x', 45, 7], ['y', 46, 7],
    ['p', 10, 9], ['x', 14, 9], ['y', 27, 9], ['x', 28, 9], ['p', 34, 9], ['y', 36, 9], ['x', 37, 9],
  ],
};
