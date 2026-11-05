// As salas do fim do capítulo 1, que não estão no trailer: só nas capturas de 2014.
// Depois da porta do corredor final: sala do piano (captura 14) → sala dos canos (captura 20,
// com o painel de alavancas da captura 15) → sala da guilhotina (captura 21), onde o capítulo acaba.
//
// 1 para 1: o visual de cada sala é a própria captura (fundo_* em tiles.js, gerado por
// tools/salas_finais.py), alinhada à grade do mapa. O chão por baixo só define a passagem,
// medida tile a tile na captura com a grade de 32 px por cima ('#' = não passa).
// Sem tom nem luz: a captura já tem a luz do jogo original.

// Sala do piano (captura 14): parede com a cruz e as plantas secas (linhas 4–5), piano de cauda
// em (8..10,7) na beira do fosso em cruz, porta clara na parede da esquerda (4,6)-(4,7), caixa
// em (6,6), caixote em (5,10), banco em (11..13,10), saída ▷ em (15,8).
export const sala_piano = {
  nome: 'sala_piano', w: 17, h: 13,
  tom: 0, amb: 1, tomPersonagem: 20,
  legenda: { '#': 'vazio', '.': 'piso_pedra', F: 'fundo_piano' },
  chao: [
    '#################',
    '#################',
    '#################',
    '#################',
    '#################',
    '#################',
    '#####.#.........#',
    '#####...###.....#',
    '####...###......#',
    '####..#####.....#',
    '##########.###.##',   // (6,10) fica entre o caixote e o fosso: sem acesso
    '#################',
    '#################',
  ],
  objs: [['F', 0, 0]],
};

// Sala dos canos (captura 20): paredes de tábua em volta, canos claros no chão (passa-se por cima
// deles: as fileiras de canos cortam a sala inteira), portas escuras no alto (11,2) e embaixo
// (5,10); o painel é a caixa destacada junto da parede, em (9,3).
export const canos = {
  nome: 'canos', w: 17, h: 13,
  tom: 0, amb: 1, tomPersonagem: 20,
  legenda: { '#': 'vazio', '.': 'piso_tacos', F: 'fundo_canos' },
  chao: [
    '#################',
    '#################',
    '#################',
    '####.....#...####',
    '####.........####',
    '####.........####',
    '####.........####',
    '####.........####',
    '####.........####',
    '####.........####',
    '#################',
    '#################',
    '#################',
  ],
  objs: [['F', 0, 0]],
};

// Sala da guilhotina (captura 21): tijolo nas linhas 2–3 com os mictórios, cano rente à parede
// da esquerda (coluna 2), guilhotina em (6..7,4..6), macas atrás de cortinas em (8..11,4) e
// (4..5,8..9), entrada pelo recuo da direita (15,9)-(15,10).
export const guilhotina = {
  nome: 'guilhotina', w: 17, h: 13,
  tom: 0, amb: 1, tomPersonagem: 20,
  legenda: { '#': 'vazio', '.': 'piso_pedra', F: 'fundo_guilhotina' },
  chao: [
    '#################',
    '#################',
    '#################',
    '#################',
    '###...######...##',
    '###...##.......##',
    '###...##.......##',
    '###............##',
    '###.##.........##',
    '###.##..........#',
    '###.............#',
    '#################',
    '#################',
  ],
  objs: [['F', 0, 0]],
};
