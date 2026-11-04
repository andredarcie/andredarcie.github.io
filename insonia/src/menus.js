// Menus: inventário (Usar / Analizar / Descartar), teclado de nome (Scene_Name do VX Ace,
// tabela traduzida) e o aviso "X Adicionado." quando um item entra.
import { entrada, LARG, ALT } from './base.js';
import { img, tela } from './recursos.js';
import { janela, cursor, texto, largura, FONTE, ALTURA_LINHA } from './janela.js';
import { ITENS } from './itens.js';
import { som } from './som.js';

export function icone(g, idx, x, y) {
  if (idx === 'cano') {
    // o pedaço de cano do jogo: um traço fino e claro na diagonal
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 21, y + 21); g.stroke();
    g.strokeStyle = '#a8a8a8'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + 21, y + 21); g.stroke();
    g.restore();
    return;
  }
  const s = img('pics/iconset');
  g.drawImage(s, (idx % 16) * 24, Math.floor(idx / 16) * 24, 24, 24, x, y, 24, 24);
}

// Fundo dos menus: a tela do mapa borrada e escurecida (como o SceneManager.background_bitmap).
export function fundoBorrado(origem) {
  const p = tela(LARG / 4, ALT / 4);
  const gp = p.getContext('2d');
  gp.imageSmoothingEnabled = true;
  gp.drawImage(origem, 0, 0, p.width, p.height);
  const c = tela(LARG, ALT);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(p, 0, 0, LARG, ALT);
  g.fillStyle = 'rgba(16,16,16,0.55)';
  g.fillRect(0, 0, LARG, ALT);
  return c;
}

// ---------------- Inventário ----------------
// Medidas tiradas do trailer (espaço 544x416).
const INV = { x: 136, y: 84, w: 274, h: 248, cel: 40, cx: 149, cy: 99 };
const CMD = { x: 214, y: 152, w: 120, h: 106 };
const COMANDOS = ['Usar', 'Analizar', 'Descartar'];

export class Inventario {
  constructor(jogo) { this.jogo = jogo; this.ativo = false; }

  abrir(fundo) {
    return new Promise((ok) => {
      this.fundo = fundo; this.ativo = true; this.sel = 0; this.modo = 'lista'; this.cmd = 0; this.t = 0;
      this.fim = (r) => { this.ativo = false; ok(r); };
    });
  }

  lista() { return this.jogo.itens.filter((i) => i.n > 0); }

  atualizar() {
    if (!this.ativo) return;
    this.t++;
    const L = this.lista();
    if (this.modo === 'lista') {
      if (!L.length) { if (entrada.disparou('cancelar') || entrada.disparou('inventario') || entrada.disparou('ok')) { som.cancelar(); this.fim(null); } return; }
      const por = 6;
      if (entrada.repetiu('direita')) { this.sel = Math.min(L.length - 1, this.sel + 1); som.cursor(); }
      if (entrada.repetiu('esquerda')) { this.sel = Math.max(0, this.sel - 1); som.cursor(); }
      if (entrada.repetiu('baixo') && this.sel + por < L.length) { this.sel += por; som.cursor(); }
      if (entrada.repetiu('cima') && this.sel - por >= 0) { this.sel -= por; som.cursor(); }
      if (entrada.disparou('ok')) { som.ok(); this.modo = 'cmd'; this.cmd = 0; }
      else if (entrada.disparou('cancelar') || entrada.disparou('inventario')) { som.cancelar(); this.fim(null); }
    } else {
      if (entrada.repetiu('baixo')) { this.cmd = (this.cmd + 1) % 3; som.cursor(); }
      if (entrada.repetiu('cima')) { this.cmd = (this.cmd + 2) % 3; som.cursor(); }
      if (entrada.disparou('cancelar')) { som.cancelar(); this.modo = 'lista'; }
      else if (entrada.disparou('ok')) {
        som.ok();
        const it = L[this.sel];
        this.fim({ acao: ['usar', 'analisar', 'descartar'][this.cmd], item: it.id });
      }
    }
  }

  desenhar(g) {
    if (!this.ativo) return;
    g.drawImage(this.fundo, 0, 0);
    const L = this.lista();
    // ajuda (topo)
    janela(g, 0, 0, LARG, 52);
    const it = L[this.sel];
    if (it) texto(g, `${ITENS[it.id].nome} - ${ITENS[it.id].desc}`, 21, 19);
    // itens
    janela(g, INV.x, INV.y, INV.w, INV.h);
    L.forEach((e, i) => {
      const cx = INV.cx + (i % 6) * INV.cel, cy = INV.cy + Math.floor(i / 6) * 42;
      if (i === this.sel) cursor(g, cx, cy, 39, 37, this.modo === 'lista' ? this.t : 0);
      icone(g, ITENS[e.id].icone, cx + 8, cy + 3);
      g.font = '10px "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillStyle = '#000'; g.fillText(String(e.n), cx + 21, cy + 27);
      g.fillStyle = '#e0e0e0'; g.fillText(String(e.n), cx + 20, cy + 26);
      g.textAlign = 'left';
    });
    if (this.modo === 'cmd') {
      janela(g, CMD.x, CMD.y, CMD.w, CMD.h);
      g.save();
      g.beginPath(); g.rect(CMD.x + 8, CMD.y, 93, CMD.h); g.clip(); // "Descartar" sai cortado, como no jogo
      COMANDOS.forEach((c, i) => {
        const y = CMD.y + 20 + i * ALTURA_LINHA;
        if (i === this.cmd) cursor(g, CMD.x + 13, y, 88, ALTURA_LINHA, this.t);
        texto(g, c, CMD.x + 18, y + 4);
      });
      g.restore();
    }
  }
}

// ---------------- Aviso de item ----------------
export class Aviso {
  constructor() { this.atual = null; }
  mostrar(s, ic) { this.atual = { s, ic, t: 0 }; som.item(); return new Promise((r) => { this.atual.fim = r; }); }
  atualizar() {
    const a = this.atual; if (!a) return;
    a.t++;
    if (a.t > 90 || (a.t > 20 && (entrada.disparou('ok') || entrada.disparou('cancelar')))) { this.atual = null; a.fim(); }
  }
  desenhar(g) {
    const a = this.atual; if (!a) return;
    const op = a.t < 8 ? a.t / 8 : 1;
    janela(g, 0, 84, LARG, 56, op);
    g.save(); g.globalAlpha = op;
    const w = largura(g, a.s) + (a.ic != null ? 28 : 0);
    let x = (LARG - w) / 2;
    if (a.ic != null) { icone(g, a.ic, x, 100); x += 28; }
    texto(g, a.s, x, 104);
    g.restore();
  }
}

// ---------------- Teclado de nome ----------------
const PAG1 = [
  'A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e',
  'F', 'G', 'H', 'I', 'J', 'f', 'g', 'h', 'i', 'j',
  'K', 'L', 'M', 'N', 'O', 'k', 'l', 'm', 'n', 'o',
  'P', 'Q', 'R', 'S', 'T', 'p', 'q', 'r', 's', 't',
  'U', 'V', 'W', 'X', 'Y', 'u', 'v', 'w', 'x', 'y',
  'Z', '', '', '', '', 'z', '', '', '', '',
  '1', '2', '3', '4', '5', '', '', '', '', '',
  '6', '7', '8', '9', '0', '', '', '', '', '',
  '', '', '', '', '', '', '', '', 'Á', 'OK',
];
const PAG2 = [
  'Á', 'É', 'Í', 'Ó', 'Ú', 'á', 'é', 'í', 'ó', 'ú',
  'À', 'Â', 'Ê', 'Ô', 'Ã', 'à', 'â', 'ê', 'ô', 'ã',
  'Õ', 'Ç', 'Ü', '', '', 'õ', 'ç', 'ü', '', '',
  '.', ',', '!', '?', '-', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', 'A', 'OK',
];
const NE = { x: 92, y: 20, w: 360, h: 120 };
const NI = { x: 92, y: 148, w: 360, h: 244 };

export class TecladoNome {
  constructor() { this.ativo = false; }
  abrir(fundo, max = 12) {
    return new Promise((ok) => {
      this.fundo = fundo; this.ativo = true; this.max = max; this.nome = ''; this.idx = 0; this.pag = 0; this.t = 0;
      this.fim = (s) => { this.ativo = false; ok(s); };
    });
  }
  tabela() { return this.pag ? PAG2 : PAG1; }
  atualizar() {
    if (!this.ativo) return;
    this.t++;
    const T = this.tabela();
    const mv = (d) => {
      let i = this.idx;
      for (let n = 0; n < 90; n++) {
        if (d === 'direita') i = (i % 10 === 9) ? i - 9 : i + 1;
        if (d === 'esquerda') i = (i % 10 === 0) ? i + 9 : i - 1;
        if (d === 'baixo') i = (i + 10) % 90;
        if (d === 'cima') i = (i + 80) % 90;
        if (T[i]) break;
      }
      this.idx = i; som.cursor();
    };
    for (const d of ['direita', 'esquerda', 'baixo', 'cima']) if (entrada.repetiu(d)) mv(d);
    if (entrada.disparou('ok')) {
      const c = T[this.idx];
      if (c === 'OK') { som.ok(); this.fim(this.nome); }
      else if (this.idx === 88) { som.ok(); this.pag = 1 - this.pag; }
      else if (c && this.nome.length < this.max) { som.ok(); this.nome += c; if (this.nome.length === this.max) this.idx = 89; }
      else som.erro();
    } else if (entrada.disparou('cancelar')) {
      if (this.nome.length) { som.cancelar(); this.nome = this.nome.slice(0, -1); } else som.erro();
    }
  }
  desenhar(g) {
    if (!this.ativo) return;
    g.drawImage(this.fundo, 0, 0);
    janela(g, NE.x, NE.y, NE.w, NE.h);
    // 12 casas de ~22,7 px a partir de x=180 (medido no trailer)
    const cw = 250 / 11;
    for (let i = 0; i < this.max; i++) {
      const x = Math.round(180 + i * cw), y = 70;
      if (i < this.nome.length) texto(g, this.nome[i], x + 12, y + 3, undefined, undefined, 'center');
      else texto(g, '_', x + 12, y + 4, undefined, undefined, 'center');
      if (i === this.nome.length) cursor(g, x, y, 24, 25, this.t);
    }
    janela(g, NI.x, NI.y, NI.w, NI.h);
    const T = this.tabela();
    T.forEach((c, i) => {
      if (!c) return;
      const col = i % 10, lin = Math.floor(i / 10);
      const x = 120 + col * 32 + (col >= 5 ? 16 : 0);
      const y = 164 + lin * 24;
      if (i === this.idx) cursor(g, x - 16, y, 32, 24, this.t);
      texto(g, c, x, y + 4, undefined, undefined, 'center');
    });
    if (T[this.idx] === undefined) this.idx = 0;
  }
}
