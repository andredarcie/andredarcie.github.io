// Janela de mensagem no estilo do VX Ace (faixa escura "Dim"), agora na resolução real da tela:
// texto letra a letra em tamanho legível (TELA.f), quebra de linha automática pela largura,
// códigos \c[n], \. e \|, escolhas dentro da mensagem e entrada de números (setas ou teclado).
import { entrada, TELA } from './base.js';
import { CORES, faixaDim, texto, pedacos, setaPausa, fonteTexto } from './janela.js';
import { som } from './som.js';

// O texto vira uma lista de letras já com a cor resolvida, pausas e quebras de linha.
// Os "\n" do roteiro original eram quebras para a janela de 544 px: viram espaço, exceto antes de
// aspas (o aviso escrito numa porta, a frase de um bilhete), que continuam numa linha própria.
function tokens(s) {
  const out = [];
  let cor = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') {
      const n = s[i + 1];
      if (n === 'c' && s[i + 2] === '[') { const f = s.indexOf(']', i); cor = +s.slice(i + 3, f); i = f; continue; }
      if (n === '.') { out.push({ espera: 15 }); i++; continue; }
      if (n === '|') { out.push({ espera: 60 }); i++; continue; }
    }
    if (c === '\n') {
      let j = i + 1;
      while (s[j] === '\\' && s[j + 1] === 'c') j = s.indexOf(']', j) + 1;
      if (s[j] === '"' || s[j] === '“') out.push({ nl: true });
      else if (out.length && out[out.length - 1].ch !== ' ') out.push({ ch: ' ', cor });
      continue;
    }
    if (c === ' ' && out.length && out[out.length - 1].ch === ' ') continue;
    out.push({ ch: c, cor });
  }
  return out;
}

const textoDe = (tok) => tok.map((k) => (k.nl ? '\n' : k.ch || '')).join('');

// ritmo da máquina de escrever (quadros de 1/60 s)
const LETRAS_POR_QUADRO = 0.5;
const PAUSA = { ',': 6, ';': 8, ':': 8, '.': 16, '!': 16, '?': 16, '…': 16 };

export class Mensagem {
  constructor() {
    this.ativo = null; // {tipo, tok, k, pronto, ...}
    this.t = 0;
  }
  get aberta() { return !!this.ativo; }

  novo(tipo, s, op, extra) {
    const tok = tokens(s);
    return { tipo, tok, k: 0, espera: 0, pronto: false, pos: op.pos || 'meio', texto: textoDe(tok), ...extra };
  }

  mostrar(s, op = {}) {
    return new Promise((ok) => { this.ativo = this.novo('msg', s, op, { fim: ok }); });
  }

  escolha(pergunta, opcoes, op = {}) {
    return new Promise((ok) => {
      this.ativo = this.novo('escolha', pergunta, { pos: op.pos || 'baixo' },
        { opcoes, sel: op.inicial || 0, cancelar: op.cancelar ?? opcoes.length - 1, fim: ok });
    });
  }

  numero(pergunta, digitos, inicial = 0, op = {}) {
    return new Promise((ok) => {
      const s = String(inicial).padStart(digitos, '0').slice(-digitos);
      this.ativo = this.novo('numero', pergunta, op, { dig: s.split('').map(Number), idx: 0, fim: ok });
    });
  }

  // ---- lógica por quadro ----
  atualizar() {
    const m = this.ativo;
    if (!m) return;
    this.t++;
    if (!m.pronto) {
      if (entrada.disparou('ok') || entrada.disparou('cancelar')) { this.completar(m); return; }
      if (m.espera > 0) { m.espera--; return; }
      this.avancar(m);
      return;
    }
    if (m.tipo === 'msg') {
      if (entrada.disparou('ok') || entrada.disparou('cancelar')) { this.ativo = null; m.fim(); }
    } else if (m.tipo === 'escolha') {
      if (entrada.repetiu('baixo')) { m.sel = (m.sel + 1) % m.opcoes.length; som.cursor(); }
      if (entrada.repetiu('cima')) { m.sel = (m.sel + m.opcoes.length - 1) % m.opcoes.length; som.cursor(); }
      if (entrada.disparou('ok')) { som.ok(); this.ativo = null; m.fim(m.sel); }
      else if (entrada.disparou('cancelar') && m.cancelar >= 0) { som.cancelar(); this.ativo = null; m.fim(m.cancelar); }
    } else if (m.tipo === 'numero') {
      // dá para digitar os números no teclado: cada dígito entra na casa atual e o cursor anda
      for (const ch of entrada.letras) {
        if (ch >= '0' && ch <= '9') { m.dig[m.idx] = +ch; m.idx = Math.min(m.dig.length - 1, m.idx + 1); som.cursor(); }
      }
      if (entrada.repetiu('direita')) { m.idx = (m.idx + 1) % m.dig.length; som.cursor(); }
      if (entrada.repetiu('esquerda')) { m.idx = (m.idx + m.dig.length - 1) % m.dig.length; som.cursor(); }
      if (entrada.repetiu('cima')) { m.dig[m.idx] = (m.dig[m.idx] + 1) % 10; som.cursor(); }
      if (entrada.repetiu('baixo')) { m.dig[m.idx] = (m.dig[m.idx] + 9) % 10; som.cursor(); }
      if (entrada.disparou('ok')) { som.ok(); this.ativo = null; m.fim(+m.dig.join('')); }
    }
  }

  // Máquina de escrever no ritmo de fala: ~30 letras por segundo (o VX Ace fazia 60, rápido demais
  // para se perceber), com uma pausa curta depois de vírgula e maior no fim de cada frase.
  // OK ou Esc durante a digitação mostram o texto inteiro de uma vez (ver atualizar).
  avancar(m) {
    m.acc = (m.acc || 0) + LETRAS_POR_QUADRO;
    while (m.acc >= 1 && m.k < m.tok.length) {
      const k = m.tok[m.k++];
      if (k.espera) { m.espera = k.espera; m.acc = 0; return; }
      if (!k.ch || k.ch === ' ') continue;          // espaço não gasta tempo
      m.acc -= 1;
      const prox = m.tok[m.k];
      const fimDePalavra = prox && (prox.ch === ' ' || prox.nl);
      if (fimDePalavra && PAUSA[k.ch]) { m.espera = PAUSA[k.ch]; m.acc = 0; return; }
    }
    if (m.k >= m.tok.length) m.pronto = true;
  }

  completar(m) {
    m.k = m.tok.length; m.espera = 0; m.pronto = true;
  }

  // ---- layout: posição de cada letra (linha, coluna), refeito quando a tela muda ----
  layout(m, g) {
    const f = TELA.f, chave = `${TELA.w}x${TELA.h}x${f}x${TELA.mx}`;
    if (m.lay && m.lay.chave === chave) return m.lay;
    g.font = fonteTexto(f);
    const cw = g.measureText('M').width;
    const margem = Math.max(16, TELA.w * 0.04, TELA.mx);
    const cols = Math.max(16, Math.floor(Math.min(TELA.w - 2 * margem, cw * 56) / cw));
    const pos = new Array(m.tok.length);
    let lin = 0, col = 0;
    for (let i = 0; i < m.tok.length; i++) {
      const k = m.tok[i];
      if (k.nl) { lin++; col = 0; continue; }
      if (!k.ch) continue;
      if (k.ch === ' ') { if (col > 0) { pos[i] = { lin, col }; col++; } continue; }
      if (i === 0 || !m.tok[i - 1].ch || m.tok[i - 1].ch === ' ') {          // começo de palavra
        let n = 0; for (let j = i; j < m.tok.length && m.tok[j].ch && m.tok[j].ch !== ' '; j++) n++;
        if (col > 0 && col + n > cols) { lin++; col = 0; }
      }
      if (col >= cols) { lin++; col = 0; }
      pos[i] = { lin, col }; col++;
    }
    m.lay = { chave, pos, linhas: lin + 1, cw, lh: Math.round(f * 1.5), cols, colW: cols * cw };
    return m.lay;
  }

  // ---- desenho (espaço em px CSS da tela) ----
  desenhar(g) {
    const m = this.ativo;
    if (!m) return;
    const L = this.layout(m, g);
    const f = TELA.f, W = TELA.w, H = TELA.h, pad = Math.round(f * 0.9);
    const extra = m.tipo === 'escolha' ? m.opcoes.length + 0.3 : m.tipo === 'numero' ? 1.5 : 0;
    const h = Math.round(pad * 2 + (L.linhas + extra) * L.lh);
    // 'meio' começa onde a janela do meio do VX Ace começava (y 148 de 416) e cresce para baixo:
    // o texto fica logo acima de quem está no centro da tela, como no jogo original
    const y = m.pos === 'alto' ? Math.round(H * 0.04)
      : m.pos === 'baixo' ? Math.round(H - h - H * 0.04)
      : Math.round(Math.min(H * (148 / 416), H - h - H * 0.04));
    faixaDim(g, y, h, 1, W, Math.max(10, Math.round(f * 0.7)));
    const x0 = Math.round((W - L.colW) / 2), y0 = y + pad;
    const fonte = fonteTexto(f);
    // letras já reveladas, agrupadas em trechos da mesma linha e cor
    let run = null;
    const solta = () => { if (run) { texto(g, run.s, x0 + run.col * L.cw, y0 + run.lin * L.lh + (L.lh - f) / 2, CORES[run.cor] || CORES[0], fonte); run = null; } };
    for (let i = 0; i < m.k; i++) {
      const p = L.pos[i], k = m.tok[i];
      if (!p || !k.ch) continue;
      if (run && run.lin === p.lin && run.cor === k.cor && run.col + run.s.length === p.col) run.s += k.ch;
      else { solta(); run = { lin: p.lin, col: p.col, cor: k.cor, s: k.ch }; }
    }
    solta();
    if (m.tipo === 'escolha' && m.pronto) {
      m.opcoes.forEach((o, i) => {
        const yy = y0 + (L.linhas + 0.3 + i) * L.lh;
        if (i === m.sel) {
          const a = 0.75 + 0.25 * Math.sin(this.t / 10);
          g.fillStyle = `rgba(255,255,255,${0.09 * a})`; g.fillRect(x0 - L.cw * 0.6, yy, Math.min(L.colW, L.cw * 24) + L.cw * 1.2, L.lh);
          g.strokeStyle = `rgba(170,170,170,${0.8 * a})`; g.lineWidth = 1; g.strokeRect(x0 - L.cw * 0.6 + 0.5, yy + 0.5, Math.min(L.colW, L.cw * 24) + L.cw * 1.2 - 1, L.lh - 1);
        }
        let x = x0 + L.cw * 1.5;
        for (const p of pedacos(o)) { texto(g, p.t, x, yy + (L.lh - f) / 2, CORES[p.cor] || CORES[0], fonte); x += p.t.length * L.cw; }
      });
    }
    if (m.tipo === 'numero' && m.pronto) {
      const yy = y0 + L.linhas * L.lh + L.lh * 0.25, passo = L.cw * 2;
      m.dig.forEach((d, i) => {
        const x = x0 + L.cw * 1.5 + i * passo;
        if (i === m.idx) {
          g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(x - L.cw * 0.5, yy - 2, L.cw * 2, L.lh + 4);
          g.strokeStyle = 'rgba(180,180,180,0.9)'; g.lineWidth = 1; g.strokeRect(x - L.cw * 0.5 + 0.5, yy - 1.5, L.cw * 2 - 1, L.lh + 3);
        }
        texto(g, String(d), x + L.cw * 0.5, yy + (L.lh - f) / 2, CORES[0], fonte, 'center');
      });
    }
    if (m.tipo === 'msg' && m.pronto) setaPausa(g, W / 2, y + h - pad * 0.75, this.t, Math.max(3, f * 0.28));
  }
}
