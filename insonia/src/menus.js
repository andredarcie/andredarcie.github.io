// Menus: inventário (Usar / Analisar / Descartar), teclado de nome (Scene_Name do VX Ace,
// tabela traduzida) e o aviso "Novo item" quando um item entra. Os menus são desenhados na
// "caixa de desenho" (544x416 escalada na tela) com o texto no tamanho legível da tela.
import { entrada, TELA, BASE_L } from './base.js';
import { img, tela } from './recursos.js';
import { janela, cursor, texto, largura, quebrar, fonteTexto, pxCaixa, CORES, textoDica } from './janela.js';
import { ITENS } from './itens.js';
import { som } from './som.js';

export function icone(g, idx, x, y, tam = 24) {
  if (idx === 'cano') {
    // o pedaço de cano do jogo: um traço fino e claro na diagonal
    const k = tam / 24;
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 4 * k;
    g.beginPath(); g.moveTo(x + 3 * k, y + 3 * k); g.lineTo(x + 21 * k, y + 21 * k); g.stroke();
    g.strokeStyle = '#a8a8a8'; g.lineWidth = 2 * k;
    g.beginPath(); g.moveTo(x + 3 * k, y + 3 * k); g.lineTo(x + 21 * k, y + 21 * k); g.stroke();
    g.restore();
    return;
  }
  const s = img('pics/iconset');
  const liso = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  g.drawImage(s, (idx % 16) * 24, Math.floor(idx / 16) * 24, 24, 24, x, y, tam, tam);
  g.imageSmoothingEnabled = liso;
}

// Fundo dos menus: a tela borrada e escurecida (como o SceneManager.background_bitmap). Fica
// pequena de propósito: desenhada esticada, sai desfocada.
export function fundoBorrado(origem) {
  const p = tela(Math.max(2, Math.round(origem.width / 8)), Math.max(2, Math.round(origem.height / 8)));
  const gp = p.getContext('2d');
  gp.imageSmoothingEnabled = true;
  gp.drawImage(origem, 0, 0, p.width, p.height);
  gp.fillStyle = 'rgba(16,16,16,0.55)';
  gp.fillRect(0, 0, p.width, p.height);
  return p;
}

// ---------------- Inventário ----------------
// Medidas tiradas do trailer (espaço 544x416).
const INV = { x: 136, y: 84, w: 274, h: 248, cel: 40, cx: 149, cy: 99 };
const CMD = { x: 214, y: 152, w: 120, h: 106 };
const COMANDOS = ['Usar', 'Analisar', 'Descartar'];

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

  // em pé (celular), o quadro que se ajusta à tela é só a coluna do inventário
  regiao() { return TELA.h > TELA.w ? [INV.x - 14, 0, INV.w + 28, INV.y + INV.h + 40] : null; }

  // (desenhado dentro da caixa de desenho; o fundo borrado o jogo já pôs na tela inteira)
  desenhar(g) {
    if (!this.ativo) return;
    const L = this.lista();
    const estreito = TELA.h > TELA.w;
    const hx = estreito ? INV.x - 12 : 0, hw = estreito ? INV.w + 24 : BASE_L;
    const fs = pxCaixa(1), fonte = fonteTexto(fs), lh = Math.round(fs * 1.35);
    // ajuda (topo): nome e descrição do item, quebrando a linha se precisar
    const it = L[this.sel];
    const ajuda = it ? `${ITENS[it.id].nome}: ${ITENS[it.id].desc}` : 'Nenhum item.';
    const linhas = quebrar(g, ajuda, hw - 42, fonte);
    const hAj = Math.round(linhas.length * lh + 26);
    janela(g, hx, 0, hw, hAj);
    linhas.forEach((l, i) => texto(g, l, hx + 21, 13 + i * lh, CORES[0], fonte));
    // itens
    const dy = Math.max(0, hAj + 22 - INV.y);
    janela(g, INV.x, INV.y + dy, INV.w, INV.h);
    const fn = fonteTexto(pxCaixa(0.6));
    L.forEach((e, i) => {
      const cx = INV.cx + (i % 6) * INV.cel, cy = INV.cy + dy + Math.floor(i / 6) * 42;
      if (i === this.sel) cursor(g, cx, cy, 39, 37, this.modo === 'lista' ? this.t : 0);
      icone(g, ITENS[e.id].icone, cx + 8, cy + 2);
      if (e.n > 1) texto(g, String(e.n), cx + 33, cy + 22, CORES[0], fn, 'right');
    });
    if (this.modo === 'cmd') {
      // a janela de comandos se ajusta ao texto (antes "Descartar" saía cortado)
      const lhc = Math.round(fs * 1.5);
      const w = Math.max(...COMANDOS.map((c) => largura(g, c, fonte))) + 44;
      const h = COMANDOS.length * lhc + 28;
      const x = Math.round(INV.x + (INV.w - w) / 2), y = Math.round(INV.y + dy + 56);
      janela(g, x, y, w, h);
      COMANDOS.forEach((c, i) => {
        const yy = y + 14 + i * lhc;
        if (i === this.cmd) cursor(g, x + 10, yy, w - 20, lhc, this.t);
        texto(g, c, x + 22, yy + (lhc - fs) / 2, CORES[0], fonte);
      });
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
  // (desenhado no espaço da tela, em px CSS)
  desenhar(g) {
    const a = this.atual; if (!a) return;
    const op = a.t < 8 ? a.t / 8 : 1;
    const f = TELA.f, fonte = fonteTexto(f), ic = a.ic != null ? Math.round(f * 1.4) : 0;
    const w = Math.min(TELA.w - 2 * Math.max(8, TELA.mx), largura(g, a.s, fonte) + (ic ? ic + f * 0.6 : 0) + f * 2.4);
    const h = Math.round(f * 2.9), x = Math.round((TELA.w - w) / 2), y = Math.round(TELA.h * 0.2);
    janela(g, x, y, w, h, op);
    g.save(); g.globalAlpha = op;
    let tx = x + f * 1.2;
    if (ic) { icone(g, a.ic, tx, y + (h - ic) / 2, ic); tx += ic + f * 0.6; }
    texto(g, a.s, tx, y + (h - f) / 2, CORES[0], fonte);
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
      this.fundo = fundo; this.ativo = true; this.max = max; this.nome = ''; this.idx = 0; this.pag = 0; this.t = 0; this.digitou = false;
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
    // no computador dá para digitar a palavra direto (e Enter confirma)
    const letras = entrada.letras.filter((ch) => /^[\p{L}\p{N}.,!?-]$/u.test(ch));
    if (letras.length) {
      for (const ch of letras) {
        if (this.nome.length < this.max) { this.nome += ch; this.digitou = true; som.cursor(); }
        else som.erro();
      }
      if (this.nome.length === this.max) this.idx = 89;
      return;   // W, A, S, D, Z, X e I também são letras: não mexem na grade neste quadro
    }
    if (entrada.disparou('ok') && this.digitou && entrada.ultimaTecla === 'Enter') { som.ok(); this.fim(this.nome); return; }
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
  // (desenhado dentro da caixa de desenho; o fundo borrado o jogo já pôs na tela inteira)
  // em pé (celular), o quadro que se ajusta à tela é só o das letras
  regiao() { return TELA.h > TELA.w ? [NE.x - 6, NE.y - 6, NE.w + 12, NI.y + NI.h + 26 - NE.y] : null; }

  desenhar(g) {
    if (!this.ativo) return;
    const fs = Math.min(pxCaixa(1), 24), fonte = fonteTexto(fs);
    janela(g, NE.x, NE.y, NE.w, NE.h);
    // 12 casas de ~22,7 px a partir de x=180 (medido no trailer)
    const cw = 250 / 11;
    for (let i = 0; i < this.max; i++) {
      const x = Math.round(180 + i * cw), y = 70;
      if (i < this.nome.length) texto(g, this.nome[i], x + 12, y + 12 - fs / 2, CORES[0], fonte, 'center');
      else texto(g, '_', x + 12, y + 12 - fs / 2, CORES[0], fonte, 'center');
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
      texto(g, c, x, y + 12 - fs / 2, CORES[0], c === 'OK' ? fonteTexto(fs * 0.8) : fonte, 'center');
    });
    if (T[this.idx] === undefined) this.idx = 0;
    if (!document.body.classList.contains('toque')) {
      textoDica(g, 'Dica: você pode digitar no teclado.', BASE_L / 2, NI.y + NI.h + 6, '#9a9a9a');
    }
  }
}
