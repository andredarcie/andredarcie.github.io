// Mapas da parte final (14:23 em diante).

// Sala de descanso de pedra ("Algum tempo depois...", 14:26–15:17).
export const descanso = {
  nome: 'descanso', w: 17, h: 13,
  tom: 85, amb: 0.7, tomPersonagem: 25,
  legenda: {
    '#': 'borda_clara', W: 'pedra_parede', '.': 'piso_escamas', B: 'biombo', g: 'grade_parede',
    p: 'coluna', a: 'placa_aviso', r: 'rabisco', s: 'rabisco2', c: 'cano_rodape', v: 'cano_registro',
  },
  // medido no quadro 14:28 do trailer
  chao: [
    '#################',
    '#################',
    '#################',
    '#####WWWWWWWW####',
    '####WWWWWWWWWW###',
    '###WW.........###',
    '###W..........###',
    '###...........W##',
    '####..........W##',
    '####...........##',
    '####..........###',
    '#####........####',
    '#################',
  ],
  objs: [
    ['g', 7, 3], ['B', 9, 4], ['a', 11, 4], ['p', 13, 5], ['B', 6, 9],
    ['v', 5, 11], ['c', 6, 11], ['v', 7, 11], ['c', 8, 11], ['v', 9, 11], ['c', 10, 11], ['v', 11, 11],
    ['r', 5, 5], ['s', 6, 5], ['r', 12, 5], ['s', 4, 6], ['r', 5, 6], ['s', 12, 6], ['r', 8, 7], ['s', 13, 7],
    ['r', 9, 8], ['s', 12, 10], ['r', 13, 10], ['s', 12, 11],
  ],
};

// Sala que gira (15:24–15:37): uma alavanca no chão vira a sala para esquerda ou direita.
export const giratoria = {
  nome: 'giratoria', w: 17, h: 13,
  tom: 70, amb: 0.3, tomPersonagem: 30,
  lanterna: { r: 180, i: 0.55 },
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos', a: 'placa_aviso', r: 'rabisco', s: 'rabisco2',
  },
  chao: [
    '#################',
    '#################',
    '#################',
    '#####WWWWWWWW####',
    '####WWWWWWWWW####',
    '####.........####',
    '###..........####',
    '###..........####',
    '####.........####',
    '####.........####',
    '#####........####',
    '#################',
    '#################',
  ],
  objs: [['a', 9, 2], ['r', 4, 8], ['s', 5, 8], ['r', 5, 9]],
};

// Quarto do urso de pelúcia (15:38–16:42).
export const quarto_urso = {
  nome: 'quarto_urso', w: 17, h: 13,
  tom: 60, amb: 0.85, tomPersonagem: 30,
  luzes: [{ id: 'lampada', x: 272, y: 110, r: 170, i: 0.25, halo: { r: 74, a: 0.78 } }],
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    R: 'raizes', e: 'estante_quebrada', w: 'teia', A: 'porta_arco', r: 'rabisco', x: 'caixote', E: 'banco_e', D: 'banco_d',
  },
  // conferido com a captura 17 de 2014 (degrau no canto de cima à direita, canto de baixo cortado)
  chao: [
    '#################',
    '#################',
    '#################',
    '####WWWWWWW######',
    '###WWWWWWWWWWW###',
    '###WWWWWWWWWWWW##',
    '###...........W##',
    '###............##',
    '###............##',
    '###.........#####',
    '####.......######',
    '#################',
    '#################',
  ],
  objs: [['R', 3, 4], ['e', 5, 4], ['w', 9, 4], ['r', 10, 5], ['A', 12, 4], ['x', 4, 10], ['E', 7, 10], ['D', 8, 10]],
};

// Corredor do fim (16:44–17:20). Um corredor só, de 55 linhas, montado costurando os trechos
// iluminados do trailer (a luz apaga de tempos em tempos enquanto ele anda).
const CF = (() => {
  const W = 17, H = 56;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const linha = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) g[y][x] = c; };
  linha(3, 7, 9, 'W'); linha(4, 7, 9, 'W');
  for (let y = 5; y <= 52; y++) linha(y, 7, 9, '.');
  for (const [a, b] of [[8, 12], [21, 25], [31, 35], [43, 47]]) {
    g[a][6] = 'W'; g[a][10] = 'W';
    for (let y = a + 1; y <= b; y++) { g[y][6] = '.'; g[y][10] = '.'; }
  }
  g[53][8] = '.';
  return g.map((l) => l.join(''));
})();

export const corredor_final = {
  nome: 'corredor_final', w: 17, h: 56,
  tom: 70, amb: 0.35, tomPersonagem: 30,
  lanterna: { r: 190, i: 0.55 },
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos',
    A: 'porta_arco', e: 'estante_quebrada', k: 'cadeira_caida', p: 'pedras', t: 'entulho', m: 'banqueta',
    j: 'vaso_quebrado', Z: 'raizes', x: 'cruz_quebrada', E: 'banco_e', D: 'banco_d', a: 'placa_aviso', L: 'cano_L', R: 'cano_L2',
    r: 'rabisco', s: 'rabisco2',
  },
  chao: CF,
  objs: [
    ['Z', 7, 3], ['A', 8, 3], ['e', 9, 4], ['k', 7, 5], ['r', 7, 6], ['s', 7, 7],
    ['r', 9, 9], ['s', 9, 10], ['r', 9, 11], ['s', 10, 11], ['r', 10, 12], ['j', 6, 10],
    ['p', 9, 13], ['L', 7, 16], ['t', 8, 19], ['r', 7, 18], ['s', 7, 19], ['r', 7, 20],
    ['m', 9, 21], ['r', 9, 22], ['s', 9, 23], ['r', 9, 24], ['s', 10, 24], ['r', 10, 25],
    ['e', 7, 26], ['R', 7, 28], ['r', 7, 29], ['s', 7, 30],
    ['j', 7, 32], ['r', 6, 33], ['s', 6, 34], ['r', 7, 35], ['s', 7, 36], ['x', 9, 36], ['R', 7, 37],
    ['E', 7, 40], ['D', 8, 40], ['k', 8, 42], ['a', 10, 45], ['r', 9, 46], ['s', 10, 46], ['p', 9, 47],
    ['r', 9, 48], ['s', 9, 49], ['m', 7, 51],
  ],
};
