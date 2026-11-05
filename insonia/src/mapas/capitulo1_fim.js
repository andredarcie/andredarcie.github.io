// As salas do fim do jogo, que não estão no trailer: só nas capturas de 2014.
// Depois da porta do corredor final: sala do piano (captura 14), onde a história se resolve, e a
// sala da guilhotina (captura 21), que só aparece na cena do fim. (A captura 20, dos canos, virou
// o enigma de girar canos da porta do salão; a 15 é o teclado do piano.)
//
// 1 para 1: o visual de cada sala é a própria captura (fundo_* em tiles.js, gerado por
// tools/salas_finais.py), alinhada à grade do mapa. O chão por baixo só define a passagem,
// medida tile a tile na captura com a grade de 32 px por cima ('#' = não passa).
// A captura já vem no tom do jogo (tom 0); por cima vai a mesma penumbra das outras salas
// (luz ambiente baixa + a lanterna em volta do herói), para o fim não ficar claro.

// Sala do piano (captura 14): parede com a cruz e as plantas secas (linhas 4–5), piano de cauda
// em (8..10,7) com o teclado virado para baixo, o tapete em cruz na frente dele (passa-se por cima;
// (9,8) é o lugar de frente para o teclado), porta clara na parede da esquerda (4,6)-(4,7), caixa
// em (6,6), a caixinha de música em (5,10), banco em (11..13,10), saída ▷ em (15,8).
export const sala_piano = {
  nome: 'sala_piano', w: 17, h: 13,
  tom: 0, amb: 0.4, tomPersonagem: 20,
  lanterna: { r: 200, i: 0.6 },
  legenda: { '#': 'vazio', '.': 'piso_pedra', T: 'tapete', F: 'fundo_piano' },
  limites: [3, 3, 16, 11],   // a sala inteira da captura (paredes com a cruz e as plantas)
  chao: [
    '#################',
    '#################',
    '#################',
    '#################',
    '#################',
    '#################',
    '#####.#.........#',
    '#####...###.....#',
    '####...TTT......#',
    '####..TTTTT.....#',
    '######.TTT.###.##',
    '#################',
    '#################',
  ],
  objs: [['F', 0, 0]],
};

// Sala da guilhotina (captura 21): tijolo nas linhas 2–3 com os mictórios, cano rente à parede
// da esquerda (coluna 2), guilhotina em (6..7,4..6), macas atrás de cortinas em (8..11,4) e
// (4..5,8..9). Só existe dentro da cena do fim (cena: true, não salva aqui).
export const guilhotina = {
  nome: 'guilhotina', w: 17, h: 13, cena: true,
  tom: 0, amb: 0.3, tomPersonagem: 20,
  lanterna: { r: 210, i: 0.6 },
  legenda: { '#': 'vazio', '.': 'piso_pedra', F: 'fundo_guilhotina' },
  limites: [1, 1, 16, 11],
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
