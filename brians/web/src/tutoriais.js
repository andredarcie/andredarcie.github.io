// Tutoriais refeitos (ligados por src/ajustes.js): no lugar das
// imagens Ajuda_1…5, um cartão desenhado por código no estilo da introdução
// (preto, moldura branca, caveiras nos cantos), com ícones animados feitos
// com os gráficos do próprio jogo (Brian, potes, poção, tocha, balão).
// O evento original continua mandando no tempo: Mostrar Imagem (Ajuda_N)
// prepara o cartão, Mover Imagem para y=0 o faz entrar, a Espera seguinte é
// a leitura (Enter pula) e Mover Imagem para y=80 o faz sair.
// Teclado ou toque (src/dispositivo.js): o texto, os ícones e o selo mostram
// Enter/Shift/setas ou os botões A/Correr/direcional da tela; no toque o
// cartão fica no topo, longe dos botões.
import * as rb from 'rb';
import { modoToque, botoes } from './dispositivo.js';

const W = 500, H = 116;
const X0 = (544 - W) >> 1, Y0 = 416 - H - 18, Y0_TOQUE = 40;   // no toque: abaixo da HUD (corações, tempo)
const Z = 9000;
const PAINEL = { x: 12, y: 12, w: 170, h: 92 };
const TEXTO_X = 198, TEXTO_W = W - TEXTO_X - 18;

const CORES = {
  fundo: [10, 8, 18, 232], painel: [26, 22, 40, 255], borda: [236, 232, 246, 255],
  titulo: [150, 196, 255, 255], texto: [240, 238, 248, 255], tecla: [214, 210, 228, 255],
  teclaLuz: [246, 244, 252, 255], teclaLado: [70, 62, 96, 255], teclaTinta: [30, 26, 44, 255],
  contorno: [0, 0, 0, 255],
};
const cor = (c) => Color.new(c[0], c[1], c[2], c[3]);

const TUTORIAIS = {
  1: { titulo: 'Andar', icone: 'setas',
    teclado: 'Use as setas do teclado para andar pela mansão.',
    toque: 'Use o direcional na tela para andar pela mansão.' },
  2: { titulo: 'Interagir', icone: 'enter',
    teclado: 'Aperte Enter para examinar e interagir com o que estiver à sua frente.',
    toque: 'Toque em A para examinar e interagir com o que estiver à sua frente.' },
  3: { titulo: 'Correr', icone: 'shift',
    teclado: 'Segure Shift enquanto anda para correr.',
    toque: 'Segure o botão Correr enquanto anda.' },
  4: { titulo: 'Potes', icone: 'pote',
    teclado: 'Quebre os potes com o Enter. Dentro deles você pode encontrar itens que vão ajudar.',
    toque: 'Quebre os potes com o botão A. Dentro deles você pode encontrar itens que vão ajudar.' },
  5: { titulo: 'Tochas azuis', icone: 'tocha',
    teclado: 'Use as poções azuis para acender as tochas. Cada tocha acesa salva o seu progresso.',
    toque: 'Use as poções azuis para acender as tochas. Cada tocha acesa salva o seu progresso.' },
};

// ---------------------------------------------------------------- easing
const limitar = (v) => Math.max(0, Math.min(1, v));
const saiComVolta = (t) => { const c = 1.70158, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const entraComVolta = (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; };
const pulo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : saiComVolta(t));

// ---------------------------------------------------------------- gráficos do jogo
let folhas = null;
export async function prepararTutoriais() {
  const carregar = (n) => Bitmap.new(n);
  const [heroi, balao, tileD, itens, chama] = await Promise.all([
    carregar('Graphics/Characters/RetroPeople1'), carregar('Graphics/System/Balloon'),
    carregar('Graphics/System/TileD'), carregar('Graphics/Characters/Itens'), carregar('Graphics/Characters/!Flame'),
  ]);
  folhas = { heroi, balao, tileD, itens, chama };
}

// ---------------------------------------------------------------- desenho
function retangulo(b, x, y, w, h, c) { b.fill_rect(x, y, w, h, cor(c)); }

// caveira de pixel (7×7), como as dos cantos da introdução
const CAVEIRA = ['.#####.', '#######', '#..#..#', '#######', '.##.##.', '.#####.', '.#.#.#.'];
function caveira(b, x, y, escala = 2) {
  CAVEIRA.forEach((linha, j) => [...linha].forEach((ch, i) => {
    if (ch === '#') retangulo(b, x + i * escala, y + j * escala, escala, escala, CORES.borda);
  }));
}

function triangulo(b, cx, cy, dir, c, tam = 5) {
  for (let i = 0; i < tam; i++) {
    const n = i * 2 + 1;
    if (dir === 8) retangulo(b, cx - i, cy - 3 + i, n, 1, c);
    if (dir === 2) retangulo(b, cx - i, cy + 3 - i, n, 1, c);
    if (dir === 4) retangulo(b, cx - 3 + i, cy - i, 1, n, c);
    if (dir === 6) retangulo(b, cx + 3 - i, cy - i, 1, n, c);
  }
}

function seta(b, cx, cy, dir, c) {
  triangulo(b, cx, cy, dir, c);
  if (dir === 8) retangulo(b, cx - 1, cy + 2, 3, 5, c);
  if (dir === 2) retangulo(b, cx - 1, cy - 6, 3, 5, c);
  if (dir === 4) retangulo(b, cx + 2, cy - 1, 5, 3, c);
  if (dir === 6) retangulo(b, cx - 6, cy - 1, 5, 3, c);
}

// tecla com volume: lado escuro embaixo; apertada, a face desce
function tecla(b, w, h, apertada, conteudo) {
  b.clear();
  const desce = apertada ? 3 : 0;
  retangulo(b, 0, 4, w, h - 4, CORES.contorno);
  retangulo(b, 1, 5, w - 2, h - 6, CORES.teclaLado);
  retangulo(b, 0, desce, w, h - 4, CORES.contorno);
  retangulo(b, 1, desce + 1, w - 2, h - 6, apertada ? [188, 184, 206, 255] : CORES.tecla);
  retangulo(b, 2, desce + 1, w - 4, 2, CORES.teclaLuz);
  conteudo(b, w >> 1, desce + ((h - 4) >> 1), CORES.teclaTinta);
}

function textoTecla(rotulo, tam = 14) {
  return (b, cx, cy, tinta = CORES.teclaTinta) => {
    b.font.size = tam; b.font.bold = true; b.font.shadow = false;
    b.font.color.set(...tinta);
    b.draw_text(0, cy - 10, b.width, 20, rotulo, 1);
  };
}

// forma de cantos arredondados (raio r; r = h/2 dá círculo ou pílula)
function arredondado(b, x, y, w, h, r, c) {
  for (let j = 0; j < h; j++) {
    const dy = Math.max(0, r - j - 0.5, j + 0.5 - (h - r));
    const recuo = dy > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0;
    retangulo(b, x + recuo, y + j, w - 2 * recuo, 1, c);
  }
}

// botão do controle de toque (como os da tela do celular): escuro, borda
// clara, rótulo claro; apertado, desce e acende
const TOQUE = { borda: [215, 210, 235, 255], fundo: [64, 58, 90, 255], aceso: [150, 140, 190, 255], tinta: [246, 244, 252, 255] };
function botaoToque(b, w, h, r, apertado, conteudo) {
  b.clear();
  const desce = apertado ? 2 : 0, rr = Math.min(r, (h - 3) / 2);
  arredondado(b, 0, 3, w, h - 3, rr, [0, 0, 0, 150]);
  arredondado(b, 0, desce, w, h - 3, rr, TOQUE.borda);
  arredondado(b, 2, desce + 2, w - 4, h - 7, Math.max(0, rr - 2), apertado ? TOQUE.aceso : TOQUE.fundo);
  conteudo(b, w >> 1, desce + ((h - 3) >> 1), TOQUE.tinta);
}

function quebrarLinhas(b, texto, largura) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (atual && b.text_size(teste).width > largura) { linhas.push(atual); atual = palavra; } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// ---------------------------------------------------------------- elementos
// Cada elemento é um sprite preso ao cartão: dx/dy relativos ao canto do
// cartão, opacidade própria (0–1) multiplicada pela do cartão.
class Elemento {
  constructor(bitmap, dx, dy, { z = 1, centro = false, zoom = 1 } = {}) {
    this.s = Sprite.new();
    this.s.bitmap = bitmap;
    this.s.z = Z + z;
    this.dx = dx; this.dy = dy; this.ox = 0; this.oy = 0; this.alfa = 1; this.zoom = zoom; this.escala = 1;
    if (centro) { this.s.ox = bitmap.width >> 1; this.s.oy = bitmap.height >> 1; }
  }
  quadro(x, y, alfa) {
    this.s.x = x + this.dx + this.ox;
    this.s.y = y + this.dy + this.oy;
    this.s.zoom_x = this.s.zoom_y = this.zoom * this.escala;
    this.s.opacity = Math.round(255 * alfa * limitar(this.alfa));
  }
  celula(x, y, w, h) { this.s.src_rect.set(x, y, w, h); this.s.ox = w >> 1; this.s.oy = h >> 1; }
  dispose(doBitmap = true) { if (doBitmap) this.s.bitmap.dispose(); this.s.dispose(); }
}

// partículas: quadradinhos coloridos com gravidade
class Particulas {
  constructor() { this.lista = []; this.bitmaps = new Map(); }
  bitmapDe(c) {
    const k = c.join(',');
    if (!this.bitmaps.has(k)) { const b = Bitmap.new(3, 3); retangulo(b, 0, 0, 3, 3, c); this.bitmaps.set(k, b); }
    return this.bitmaps.get(k);
  }
  soltar(dx, dy, c, { vx = 0, vy = 0, g = 0.15, vida = 30, abrir = 1.5 } = {}) {
    const e = new Elemento(this.bitmapDe(c), dx, dy, { z: 6 });
    e.vx = vx + (Math.random() - 0.5) * abrir; e.vy = vy + (Math.random() - 0.5) * abrir;
    e.g = g; e.vida = e.total = vida;
    this.lista.push(e);
  }
  quadro(x, y, alfa) {
    this.lista = this.lista.filter((e) => {
      e.vida -= 1;
      if (e.vida <= 0) { e.dispose(false); return false; }
      e.vy += e.g; e.dx += e.vx; e.dy += e.vy;
      e.alfa = e.vida / e.total;
      e.quadro(x, y, alfa);
      return true;
    });
  }
  dispose() { for (const e of this.lista) e.dispose(false); for (const b of this.bitmaps.values()) b.dispose(); }
}

// ---------------------------------------------------------------- cartão
class Cartao {
  constructor(n) {
    const def = TUTORIAIS[n];
    this.toque = modoToque();
    this.t = 0; this.saida = -1; this.elementos = []; this.particulas = new Particulas();

    const fundo = Bitmap.new(W, H);
    retangulo(fundo, 6, 6, W - 12, H - 12, CORES.fundo);
    retangulo(fundo, 7, 7, W - 14, 2, CORES.borda);
    retangulo(fundo, 7, H - 9, W - 14, 2, CORES.borda);
    retangulo(fundo, 7, 7, 2, H - 14, CORES.borda);
    retangulo(fundo, W - 9, 7, 2, H - 14, CORES.borda);
    retangulo(fundo, PAINEL.x, PAINEL.y, PAINEL.w, PAINEL.h, CORES.painel);
    for (const [x, y] of [[0, 0], [W - 14, 0], [0, H - 14], [W - 14, H - 14]]) caveira(fundo, x, y);
    this.fundo = this.add(new Elemento(fundo, 0, 0, { z: 0 }));

    const titulo = Bitmap.new(TEXTO_W, 26);
    titulo.font.size = 21; titulo.font.bold = true;
    titulo.font.color.set(...CORES.titulo);
    titulo.draw_text(0, 0, TEXTO_W, 26, def.titulo, 0);
    this.titulo = this.add(new Elemento(titulo, TEXTO_X, 14, { z: 2 }));

    this.corpo = Bitmap.new(TEXTO_W, 66);
    this.corpo.font.size = 17;
    this.linhas = quebrarLinhas(this.corpo, this.toque ? def.toque : def.teclado, TEXTO_W);
    this.letras = 0; this.totalLetras = this.linhas.join('').length;
    this.add(new Elemento(this.corpo, TEXTO_X, 42, { z: 2 }));

    // selo "Enter ▸" (ou "A ▸" no toque) sobre a borda de baixo
    const rotulo = botoes().acao;
    const medida = Bitmap.new(1, 1);
    medida.font.size = 14; medida.font.bold = true;
    const ls = medida.text_size(rotulo).width + 34;
    medida.dispose();
    const selo = Bitmap.new(ls, 22);
    retangulo(selo, 0, 0, ls, 22, CORES.borda);
    retangulo(selo, 2, 2, ls - 4, 18, CORES.fundo);
    selo.font.size = 14; selo.font.bold = true; selo.font.color.set(...CORES.texto);
    selo.draw_text(8, 1, ls - 30, 20, rotulo, 0);
    triangulo(selo, ls - 14, 11, 6, CORES.titulo, 5);
    this.selo = this.add(new Elemento(selo, W - 26 - ls, H - 19, { z: 3 }));

    // barra do tempo de leitura, dentro da borda de cima
    const barra = Bitmap.new(W - 40, 2);
    retangulo(barra, 0, 0, W - 40, 2, CORES.titulo);
    this.barra = this.add(new Elemento(barra, 20, 11, { z: 3 }));
    this.barra.alfa = 0;

    this.icone = ICONES[def.icone](this);
    Audio.se_play('Audio/SE/Book', 70, 115);
  }

  add(e) { this.elementos.push(e); return e; }

  sair() { if (this.saida < 0) this.saida = 0; }
  terminou() { return this.saida >= 18; }

  quadro(leitura) {
    this.t += 1;
    let desloc, alfa;
    if (this.saida >= 0) {
      this.saida += 1;
      const u = limitar(this.saida / 18);
      desloc = entraComVolta(u) * 90; alfa = 1 - u;
    } else {
      const u = limitar(this.t / 22);
      desloc = (1 - saiComVolta(u)) * 70; alfa = limitar(this.t / 10);
    }
    // no toque o cartão fica no topo e entra/sai por cima
    const x = X0, y = this.toque ? Y0_TOQUE - Math.round(desloc) : Y0 + Math.round(desloc);

    // título cai com quique; texto vem letra a letra
    const ut = limitar((this.t - 8) / 14);
    this.titulo.alfa = ut * 1.5; this.titulo.oy = Math.round((1 - pulo(ut)) * -10);
    if (this.t >= 12 && this.letras < this.totalLetras) {
      this.letras = Math.min(this.totalLetras, this.letras + 2);
      this.redesenharCorpo();
    }
    // selo pisca devagar; barra mostra quanto falta da leitura
    this.selo.alfa = this.t < 30 ? 0 : 0.65 + 0.35 * Math.sin(this.t / 9);
    this.selo.oy = this.t < 30 ? 0 : Math.round(Math.sin(this.t / 9) * 1.5);
    if (leitura) { this.barra.alfa = 1; this.barra.escala = 1; this.barra.s.zoom_x = leitura; }

    this.icone.quadro(this.t);
    for (const e of this.elementos) e.quadro(x, y, alfa);
    if (leitura) this.barra.s.zoom_x = leitura; // depois do quadro(), que zera o zoom
    this.particulas.quadro(x, y, alfa);
  }

  redesenharCorpo() {
    const b = this.corpo;
    b.clear();
    b.font.color.set(...CORES.texto);
    let resta = this.letras;
    this.linhas.forEach((linha, i) => {
      if (resta <= 0) return;
      b.draw_text(0, i * 21, TEXTO_W, 22, linha.slice(0, resta), 0);
      resta -= linha.length;
    });
  }

  pular() {
    this.letras = this.totalLetras; this.redesenharCorpo();
    this.selo.escala = 1.25;
    Audio.se_play('Audio/SE/Cursor', 80, 100);
  }

  dispose() {
    for (const e of this.elementos) e.dispose(!e.compartilhado);
    this.particulas.dispose();
  }
}

// ---------------------------------------------------------------- ícones
// Cada ícone monta seus elementos no painel e anima a cada quadro.
const PX = PAINEL.x, PY = PAINEL.y, PCY = PAINEL.y + (PAINEL.h >> 1);

function surgir(e, t, inicio, base = 1) {
  const u = limitar((t - inicio) / 14);
  e.escala = Math.max(0, pulo(u)) * base; e.alfa = u * 3;
}

function personagem(c, dx, dy, zoom = 1.5) {
  const e = c.add(new Elemento(folhas.heroi, dx, dy, { z: 4, zoom }));
  e.compartilhado = true;
  e.passo = (dir, quadro) => {
    const linha = { 2: 0, 4: 1, 6: 2, 8: 3 }[dir];
    e.celula([0, 32, 64, 32][quadro % 4], linha * 32, 32, 32);
  };
  e.passo(2, 1);
  return e;
}

function folha(c, bitmap, dx, dy, celula, zoom = 1.5, z = 4) {
  const e = c.add(new Elemento(bitmap, dx, dy, { z, zoom }));
  e.compartilhado = true;
  e.celula(...celula);
  return e;
}

// tecla do teclado, ou (com raio) botão do controle de toque
function teclaElemento(c, dx, dy, w, h, conteudo, raio = null) {
  const b = Bitmap.new(w, h + 4);
  const e = c.add(new Elemento(b, dx + (w >> 1), dy + ((h + 4) >> 1), { z: 4, centro: true }));
  e.apertada = null;
  e.apertar = (sim) => {
    if (e.apertada === sim) return;
    e.apertada = sim;
    if (raio === null) tecla(b, w, h + 4, sim, conteudo); else botaoToque(b, w, h + 4, raio, sim, conteudo);
  };
  e.apertar(false);
  return e;
}

const ICONES = {
  // as quatro setas acendem uma de cada vez e o Brian anda para aquele lado
  setas(c) {
    const k = 26, ox = PX + 14, oy = PY + 16, raioSeta = c.toque ? 6 : null;
    const teclas = {
      8: teclaElemento(c, ox + k + 2, oy, k, k, (b, cx, cy, tinta) => seta(b, cx, cy, 8, tinta), raioSeta),
      4: teclaElemento(c, ox, oy + k + 6, k, k, (b, cx, cy, tinta) => seta(b, cx, cy, 4, tinta), raioSeta),
      2: teclaElemento(c, ox + k + 2, oy + k + 6, k, k, (b, cx, cy, tinta) => seta(b, cx, cy, 2, tinta), raioSeta),
      6: teclaElemento(c, ox + 2 * (k + 2), oy + k + 6, k, k, (b, cx, cy, tinta) => seta(b, cx, cy, 6, tinta), raioSeta),
    };
    const heroi = personagem(c, PX + 138, PCY);
    const ordem = [4, 2, 6, 8];
    return {
      quadro(t) {
        Object.values(teclas).forEach((e, i) => surgir(e, t, 16 + i * 3));
        surgir(heroi, t, 22, 1);
        const fase = Math.max(0, t - 40), dir = ordem[Math.floor(fase / 50) % 4], u = fase % 50;
        for (const [d, e] of Object.entries(teclas)) e.apertar(t >= 40 && Number(d) === dir && u < 38);
        const andando = t >= 40 && u < 38;
        heroi.passo(dir, andando ? Math.floor(u / 7) : 1);
        const passo = andando ? Math.sin((u / 38) * Math.PI) * 8 : 0;
        heroi.ox = dir === 4 ? -passo : dir === 6 ? passo : 0;
        heroi.oy = dir === 8 ? -passo : dir === 2 ? passo : 0;
        if (andando && u % 9 === 0) c.particulas.soltar(PX + 138 - heroi.ox * 0.2, PCY + 20, [120, 110, 140, 255], { vy: -0.4, g: 0, vida: 18, abrir: 0.8 });
      },
    };
  },

  // o Enter afunda e um "!" salta sobre o Brian
  enter(c) {
    const e = c.toque
      ? teclaElemento(c, PX + 30, PCY - 22, 42, 42, textoTecla('A', 20), 21)
      : teclaElemento(c, PX + 14, PCY - 20, 72, 36, (b, cx, cy) => {
        textoTecla('Enter', 14)(b, cx, cy - 4);
        retangulo(b, cx + 18, cy + 4, 2, 7, CORES.teclaTinta);
        retangulo(b, cx - 14, cy + 9, 34, 2, CORES.teclaTinta);
        triangulo(b, cx - 16, cy + 10, 4, CORES.teclaTinta, 4);
      });
    const heroi = personagem(c, PX + 136, PCY + 8);
    heroi.passo(4, 1);
    const balao = folha(c, folhas.balao, PX + 136, PCY - 26, [0, 0, 32, 32], 1, 5);
    return {
      quadro(t) {
        surgir(e, t, 16); surgir(heroi, t, 20, 1);
        const u = Math.max(0, t - 40) % 80;
        e.apertar(t >= 40 && u < 10);
        const b = t >= 40 ? Math.floor((u - 4) / 4) : -1;
        balao.alfa = b >= 0 && b < 12 ? 1 : 0;
        balao.celula(Math.min(Math.max(b, 0), 7) * 32, 0, 32, 32);
        balao.oy = b >= 0 && b < 3 ? -(3 - b) * 2 : 0;
        heroi.oy = t >= 40 && u >= 4 && u < 10 ? -3 : 0;
      },
    };
  },

  // Shift preso e o Brian correndo, com poeira e traços de velocidade
  shift(c) {
    const e = c.toque
      ? teclaElemento(c, PX + 8, PCY - 18, 84, 32, textoTecla('Correr', 14), 16)
      : teclaElemento(c, PX + 10, PCY - 18, 80, 32, (b, cx, cy) => {
        textoTecla('Shift', 14)(b, cx + 6, cy);
        triangulo(b, 14, cy, 8, CORES.teclaTinta, 5);
        retangulo(b, 12, cy + 2, 5, 4, CORES.teclaTinta);
      });
    const heroi = personagem(c, PX + 136, PCY);
    return {
      quadro(t) {
        surgir(e, t, 16); surgir(heroi, t, 20, 1);
        const correndo = t >= 36;
        e.apertar(correndo);
        heroi.passo(6, correndo ? Math.floor(t / 4) : 1);
        heroi.oy = correndo ? -Math.abs(Math.sin(t / 4)) * 3 : 0;
        if (correndo && t % 5 === 0) c.particulas.soltar(PX + 124, PCY + 18, [150, 140, 170, 255], { vx: -1.6, vy: -0.3, g: 0, vida: 16, abrir: 0.6 });
        if (correndo && t % 7 === 0) c.particulas.soltar(PX + 116, PCY - 10 + (t % 21), [236, 232, 246, 255], { vx: -4, g: 0, vida: 8, abrir: 0 });
      },
    };
  },

  // o pote treme, a tecla afunda, ele quebra e solta uma poção
  pote(c) {
    const pote = folha(c, folhas.tileD, PX + 52, PCY + 4, [352, 160, 32, 32], 2);
    const cacos = folha(c, folhas.tileD, PX + 52, PCY + 4, [384, 160, 32, 32], 2, 3);
    const pocao = folha(c, folhas.itens, PX + 52, PCY, [32, 0, 32, 32], 1.5, 5);
    const e = c.toque
      ? teclaElemento(c, PX + 116, PCY - 18, 34, 34, textoTecla('A', 17), 17)
      : teclaElemento(c, PX + 108, PCY - 16, 50, 28, textoTecla('Enter', 12));
    return {
      quadro(t) {
        surgir(e, t, 20);
        const u = Math.max(0, t - 30) % 110;
        e.apertar(t >= 30 && u >= 30 && u < 38);
        const inteiro = t < 30 || u < 34 || u >= 96;
        pote.alfa = inteiro ? 1 : 0;
        if (t < 30) surgir(pote, t, 14, 1); else pote.escala = u >= 96 ? pulo((u - 96) / 10) : 1;
        pote.s.angle = t >= 30 && u >= 14 && u < 34 ? Math.sin(u * 1.4) * 9 : 0;
        cacos.alfa = inteiro ? 0 : 1 - Math.max(0, (u - 80) / 16);
        if (t >= 30 && u === 34) {
          for (let i = 0; i < 14; i++) c.particulas.soltar(PX + 52, PCY + 4, [150, 100, 50, 255], { vy: -2.5, abrir: 3.5, vida: 26 });
          Audio.se_play('Audio/SE/Crash', 45, 140);
        }
        const p = t >= 30 && u >= 36 && u < 92 ? (u - 36) / 56 : -1;
        pocao.alfa = p < 0 ? 0 : p < 0.75 ? 1 : (1 - p) * 4;
        pocao.oy = p < 0 ? 0 : -Math.round(pulo(Math.min(1, p * 2.5)) * 30);
        if (p >= 0 && u % 6 === 0) c.particulas.soltar(PX + 52 + (Math.random() - 0.5) * 16, PCY - 30, [150, 196, 255, 255], { vy: -0.5, g: 0, vida: 20, abrir: 0.5 });
      },
    };
  },

  // a poção voa até a tocha apagada, que acende azul e mostra "salvo!"
  tocha(c) {
    const pocao = folha(c, folhas.itens, PX + 34, PCY, [32, 0, 32, 32], 1.5, 5);
    const tocha = folha(c, folhas.chama, PX + 128, PCY + 10, [32, 32, 32, 32], 1.6);
    const salvo = Bitmap.new(70, 20);
    salvo.font.size = 15; salvo.font.bold = true; salvo.font.color.set(...CORES.titulo);
    salvo.draw_text(0, 0, 70, 20, 'salvo!', 1);
    const rotulo = c.add(new Elemento(salvo, PX + 128, PCY - 22, { z: 6, centro: true }));
    return {
      quadro(t) {
        surgir(tocha, t, 18, 1);
        const u = Math.max(0, t - 36) % 130;
        const acesa = t >= 36 && u >= 40 && u < 120;
        // poção: espera, voa em arco até a tocha e some nela
        if (t < 36 || u < 22) { surgir(pocao, t < 36 ? t : u + 16, 16, 1); pocao.dx = PX + 34; pocao.oy = Math.round(Math.sin(t / 8) * 2); } else if (u < 40) {
          const v = (u - 22) / 18;
          pocao.dx = PX + 34 + (94 * v); pocao.oy = -Math.round(Math.sin(v * Math.PI) * 34); pocao.escala = 1 - v * 0.6; pocao.alfa = 1;
        } else pocao.alfa = 0;
        if (t >= 36 && u === 40) {
          tocha.s.color.set(255, 255, 255, 220);
          for (let i = 0; i < 16; i++) c.particulas.soltar(PX + 128, PCY + 4, [120, 190, 255, 255], { vy: -2, abrir: 3, g: 0.05, vida: 30 });
          Audio.se_play('Audio/SE/Fire1', 50, 130);
        }
        if (acesa) {
          tocha.celula([0, 32, 64, 32][Math.floor(t / 6) % 4], 32, 32, 32);
          tocha.s.tone.set(0, 0, 0, 0);
          const brilho = tocha.s.color.alpha;
          if (brilho > 0) tocha.s.color.set(255, 255, 255, Math.max(0, brilho - 18));
          if (u % 8 === 0) c.particulas.soltar(PX + 128 + (Math.random() - 0.5) * 12, PCY - 4, [150, 196, 255, 255], { vy: -0.8, g: 0, vida: 22, abrir: 0.4 });
        } else {
          tocha.celula(32, 32, 32, 32);
          tocha.s.tone.set(-90, -90, -70, 255);
          tocha.s.color.set(0, 0, 0, 0);
        }
        const r = acesa ? (u - 40) / 40 : -1;
        rotulo.alfa = r < 0 ? 0 : r < 0.7 ? 1 : (1 - r) / 0.3;
        rotulo.escala = r < 0 ? 0 : pulo(Math.min(1, r * 4));
        rotulo.oy = r < 0 ? 0 : -Math.round(r * 10);
      },
    };
  },
};

// ---------------------------------------------------------------- estado
// mostrar(n) → entrar() → ler(interp) → [pular] → sair() → some sozinho
let cartao = null, pendente = 0, leitura = null, pulado = false;

export const tutorial = {
  // Mostrar Imagem Ajuda_N: o cartão só nasce quando a imagem "entra"
  mostrar(n) { this.descartar(); pendente = TUTORIAIS[n] ? n : 0; return pendente > 0; },
  entrar() { if (pendente) { cartao = new Cartao(pendente); pendente = 0; pulado = false; } },
  ler(interp) { if (cartao && cartao.saida < 0 && !leitura) leitura = { interp, total: Math.max(1, interp._wait_count) }; },
  sair() { leitura = null; cartao?.sair(); },
  // o cartão está na tela (aí as cutscenes 2× param, para dar tempo de ler)
  ativo() { return cartao !== null && cartao.saida < 0; },
  pulado() { return pulado && cartao !== null; },
  // um tutorial a caminho, na tela ou saindo (a cutscene não é pulável aí)
  depurar() { return { cartao: cartao && { t: cartao.t, saida: cartao.saida }, pendente, pulado, leitura: !!leitura }; },
  emUso() { return cartao !== null || pendente > 0; },
  descartar() { cartao?.dispose(); cartao = null; leitura = null; pendente = 0; },

  quadro() {
    if (!cartao) return;
    if (!rb.is_a($scene, Scene_Map)) { this.descartar(); return; }
    if (cartao.saida < 0 && cartao.t > 12 && !pulado && Input.trigger_p(Input.C)) {
      pulado = true;
      cartao.pular();
      // a espera em curso (entrada ou leitura) acaba já
      $game_map.interpreter._wait_count = 0;
    }
    const resta = leitura ? limitar(leitura.interp._wait_count / leitura.total) : 0;
    cartao.quadro(leitura ? resta : 0);
    if (cartao.terminou()) { cartao.dispose(); cartao = null; }
  },
};
