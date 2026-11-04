// Tilemap no formato do VX Ace: autotiles de piso (A2 e topo de parede do A4), parede (A4),
// tiles simples (A5) e objetos (B–E), sombra automática e passagem.
import { T } from './base.js';
import { img, tela } from './recursos.js';
import { TILES } from './tiles.js';

const H = T / 2;

// Quartos (em meio-tile) dentro do bloco 64x96 de um autotile de piso.
function quartosPiso(viz) {
  // viz(dx, dy) -> true se o vizinho é do mesmo tipo
  const L = viz(-1, 0), R = viz(1, 0), U = viz(0, -1), D = viz(0, 1);
  const UL = viz(-1, -1), UR = viz(1, -1), DL = viz(-1, 1), DR = viz(1, 1);
  const q = (h, v, d, iso, hor, ver, inn, cheio) => (!h && !v ? iso : h && !v ? hor : !h && v ? ver : !d ? inn : cheio);
  return [
    q(L, U, UL, [0, 2], [2, 2], [0, 4], [2, 0], [2, 4]),
    q(R, U, UR, [3, 2], [1, 2], [3, 4], [3, 0], [1, 4]),
    q(L, D, DL, [0, 5], [2, 5], [0, 3], [2, 1], [2, 3]),
    q(R, D, DR, [3, 5], [1, 5], [3, 3], [3, 1], [1, 3]),
  ];
}

// Quartos dentro do bloco 64x64 de parede (lado) do A4.
function quartosParede(viz) {
  const L = viz(-1, 0), R = viz(1, 0), U = viz(0, -1), D = viz(0, 1);
  return [
    [L ? 2 : 0, U ? 2 : 0],
    [R ? 1 : 3, U ? 2 : 0],
    [L ? 2 : 0, D ? 1 : 3],
    [R ? 1 : 3, D ? 1 : 3],
  ];
}

const ORDEM_QUARTOS = [[0, 0], [1, 0], [0, 1], [1, 1]];

// Folha com brilho multiplicado (variante mais escura do mesmo desenho, como a madeira escura
// que o jogo usava no piso e nas paredes).
const cacheMult = new Map();
function folhaDe(nome, mult) {
  if (!mult || mult === 1) return img('tiles/' + nome);
  const k = nome + '*' + mult;
  let c = cacheMult.get(k);
  if (!c) {
    const s = img('tiles/' + nome);
    c = tela(s.width, s.height);
    const g = c.getContext('2d');
    g.drawImage(s, 0, 0);
    const d = g.getImageData(0, 0, s.width, s.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { p[i] *= mult; p[i + 1] *= mult; p[i + 2] *= mult; }
    g.putImageData(d, 0, 0);
    cacheMult.set(k, c);
  }
  return c;
}

export function origemBloco(spec) {
  // Retorna [x, y] em px do canto do bloco na folha.
  if (spec.a2) return [spec.bx * 64, spec.by * 96];
  if (spec.top) return [spec.bx * 64, spec.by * 160];
  if (spec.wall) return [spec.bx * 64, spec.by * 160 + 96];
  return [0, 0];
}

export class Mapa {
  constructor(def) {
    this.def = def;
    this.w = def.w; this.h = def.h;
    this.nome = def.nome;
    const chao = def.chao;
    this.chao = [];
    for (let y = 0; y < this.h; y++) {
      const linha = chao[y] || '';
      for (let x = 0; x < this.w; x++) this.chao.push(linha[x] || ' ');
    }
    this.passa = new Uint8Array(this.w * this.h);
    this.construir();
  }

  specChao(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const c = this.chao[y * this.w + x];
    const nome = this.def.legenda[c];
    return nome ? { nome, ...TILES[nome] } : null;
  }

  ehParede(x, y) {
    const s = this.specChao(x, y);
    return !s || s.top || s.wall || s.vazio;
  }

  construir() {
    const W = this.w * T, Hh = this.h * T;
    this.baixo = tela(W, Hh);
    this.cima = tela(W, Hh);
    const g = this.baixo.getContext('2d');
    const gc = this.cima.getContext('2d');
    // 1) chão (camada A)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const s = this.specChao(x, y);
        const i = y * this.w + x;
        if (!s || s.vazio) { this.passa[i] = 0; continue; }
        const viz = (dx, dy) => {
          const n = this.specChao(x + dx, y + dy);
          if (!n) return !!(s.top); // fora do mapa conta como igual para topos de parede
          return n.nome === s.nome || (s.mesmo && s.mesmo.includes(n.nome)) || (n.mesmo && n.mesmo.includes(s.nome));
        };
        const folha = folhaDe(s.a2 || s.top || s.wall || s.a5, s.mult);
        if (s.a2 || s.top) {
          const [ox, oy] = origemBloco(s);
          quartosPiso(viz).forEach(([qx, qy], k) => {
            const [cx, cy] = ORDEM_QUARTOS[k];
            g.drawImage(folha, ox + qx * H, oy + qy * H, H, H, x * T + cx * H, y * T + cy * H, H, H);
          });
        } else if (s.wall) {
          const [ox, oy] = origemBloco(s);
          quartosParede(viz).forEach(([qx, qy], k) => {
            const [cx, cy] = ORDEM_QUARTOS[k];
            g.drawImage(folha, ox + qx * H, oy + qy * H, H, H, x * T + cx * H, y * T + cy * H, H, H);
          });
        } else if (s.a5) {
          g.drawImage(folha, s.x * T, s.y * T, T, T, x * T, y * T, T, T);
        }
        this.passa[i] = s.top || s.wall ? 0 : 1;
        if (s.passa === false) this.passa[i] = 0;
        // sombra automática do VX Ace: metade esquerda do piso encostado numa parede
        if (!s.top && !s.wall && !s.semSombra && this.ehParedeSombra(x - 1, y) && this.ehParedeSombra(x - 1, y - 1)) {
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.fillRect(x * T, y * T, H, T);
        }
      }
    }
    // 2) objetos (camadas B–E), na ordem das camadas
    for (const camada of this.def.obj || []) {
      for (let y = 0; y < camada.length; y++) {
        const linha = camada[y];
        for (let x = 0; x < linha.length; x++) {
          const c = linha[x];
          if (c === ' ' || c === '.') continue;
          const nome = this.def.legenda[c];
          if (!nome) continue;
          this.colocar(TILES[nome], x, y, g, gc);
        }
      }
    }
    // 2b) objetos listados como [letra, x, y]
    for (const [c, x, y] of this.def.objs || []) {
      const nome = this.def.legenda[c];
      if (nome) this.colocar(TILES[nome], x, y, g, gc);
    }
    // 3) ajustes de passagem do mapa
    for (const [x, y, v] of this.def.passagem || []) this.passa[y * this.w + x] = v;
  }

  ehParedeSombra(x, y) {
    const s = this.specChao(x, y);
    return !!(s && (s.top || s.wall));
  }

  colocar(s, x, y, g, gc) {
    if (!s) return;
    const folha = folhaDe(s.b, s.mult);
    const w = s.w || 1, h = s.h || 1;
    const acima = s.acima || 0; // linhas de cima desenhadas sobre os personagens (estrela)
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const destino = j < acima ? gc : g;
        destino.drawImage(folha, (s.x + i) * T, (s.y + j) * T, T, T, (x + i) * T, (y + j) * T, T, T);
        const k = (y + j) * this.w + (x + i);
        if (k < 0 || k >= this.passa.length) continue;
        const solido = s.solido === undefined ? true : s.solido;
        if (solido === true || (Array.isArray(solido) && solido[j])) {
          if (j >= acima || s.acimaSolido) this.passa[k] = 0;
        }
      }
    }
  }

  podePassar(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.passa[y * this.w + x] === 1;
  }
}
