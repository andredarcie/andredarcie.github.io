// Salão (9:34–9:51). Reconstruído dos quadros 9:38, 9:41 e 9:48 do trailer (os que caem na
// grade de tiles). Coordenadas "P" = as do panorama; o mapa usa P + (5, 3).
const W = 37, H = 16, OX = 5, OY = 3;
const g = Array.from({ length: H }, () => Array(W).fill('#'));
const set = (px, py, c) => { const x = px + OX, y = py + OY; if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
const ret = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };

// sala da esquerda e o nicho
ret(-2, 4, 8, 5, 'W'); ret(-2, 6, 8, 8, '.');
ret(-3, 4, -3, 5, 'W'); ret(-3, 6, -3, 7, '.');
// área do tapete e o corredor das goteiras subindo
ret(9, 3, 14, 4, 'W'); ret(11, -2, 12, 4, '.');
ret(9, 5, 14, 10, '.'); ret(10, 6, 13, 9, 'T'); ret(9, 7, 14, 8, 'T');
// área da direita (chegada pela escada da sala das lâmpadas)
ret(15, 3, 15, 6, 'W'); ret(16, 5, 30, 6, 'W'); ret(15, 7, 30, 9, '.'); ret(28, 10, 28, 11, '.');
// sala de cima (vista por trás das grades)
ret(17, -2, 29, 0, 'W'); ret(17, 1, 29, 3, '.'); ret(21, 4, 25, 4, '.');

const P = (c, x, y) => [c, x + OX, y + OY];

export default {
  nome: 'salao', w: W, h: H,
  tom: 80, amb: 0.85, tomPersonagem: 30,
  legenda: {
    '#': 'borda_madeira', W: 'parede_tabua', '.': 'piso_tacos', T: 'tapete',
    D: 'porta_painel', w: 'teia', r: 'raizes', g: 'goteira', e: 'escada_madeira', G: 'grades1', p: 'pedrinhas',
    s: 'estante', k: 'rachadura', K: 'cadeira', q: 'banquinho2', b: 'banco', a: 'placa_aviso', x: 'rabisco', y: 'rabisco2', c: 'comoda2',
  },
  chao: g.map((l) => l.join('')),
  objs: [
    P('r', -3, 4), P('w', -2, 4), P('r', 1, 4), P('D', 3, 4), P('r', 7, 4),
    P('x', 2, 6), P('y', 3, 6), P('p', 6, 8),
    P('w', 9, 3), P('a', 14, 3), P('c', 15, 4),
    P('g', 11, 2), P('g', 12, 2), P('g', 11, 4), P('g', 12, 4),
    P('x', 11, 10), P('y', 12, 10), P('x', 13, 10), P('y', 14, 10),
    P('r', 28, 5), P('p', 27, 7), P('p', 23, 9), P('b', 19, 9),
    P('s', 21, -1), P('s', 24, -1), P('K', 22, 1), P('q', 18, 2), P('q', 27, 2), P('q', 28, 2), P('c', 29, 0),
    P('G', 21, 5), P('G', 22, 5), P('G', 23, 5), P('G', 24, 5), P('G', 25, 5),
  ],
};
