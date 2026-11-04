// Janela de mensagem do VX Ace com fundo "Dim": texto letra a letra, códigos \c[n], \. e \|,
// escolhas dentro da própria mensagem e entrada de números.
import { entrada } from './base.js';
import { FONTE, ALTURA_LINHA, CORES, faixaDim, texto, largura, pedacos, cursor, setaPausa } from './janela.js';
import { som } from './som.js';

const POS_Y = { alto: 0, meio: 148, baixo: 296 };
const TX = 17;          // x do texto (medido no vídeo)
const TOPO_TEXTO = 15;  // y do topo do texto dentro da janela

function tokens(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') {
      const n = s[i + 1];
      if (n === 'c' && s[i + 2] === '[') { const f = s.indexOf(']', i); out.push({ cor: +s.slice(i + 3, f) }); i = f; continue; }
      if (n === '.') { out.push({ espera: 15 }); i++; continue; }
      if (n === '|') { out.push({ espera: 60 }); i++; continue; }
    }
    if (c === '\n') { out.push({ nl: true }); continue; }
    out.push({ ch: c });
  }
  return out;
}

export class Mensagem {
  constructor() {
    this.ativo = null; // {tipo, linhas:[[{t,cor}]], ...}
    this.t = 0;
  }
  get aberta() { return !!this.ativo; }

  mostrar(s, op = {}) {
    return new Promise((ok) => {
      this.ativo = { tipo: 'msg', tok: tokens(s), i: 0, linhas: [[]], cor: op.cor || 0, y: POS_Y[op.pos || 'meio'], espera: 0, fim: ok, pronto: false };
    });
  }

  escolha(pergunta, opcoes, op = {}) {
    return new Promise((ok) => {
      const m = { tipo: 'escolha', tok: tokens(pergunta), i: 0, linhas: [[]], cor: 0, y: POS_Y[op.pos || 'baixo'], espera: 0, pronto: false, opcoes, sel: op.inicial || 0, cancelar: op.cancelar ?? opcoes.length - 1, fim: ok };
      this.ativo = m;
    });
  }

  numero(pergunta, digitos, inicial = 0, op = {}) {
    return new Promise((ok) => {
      const s = String(inicial).padStart(digitos, '0').slice(-digitos);
      this.ativo = { tipo: 'numero', tok: tokens(pergunta), i: 0, linhas: [[]], cor: 0, y: POS_Y[op.pos || 'meio'], espera: 0, pronto: false, dig: s.split('').map(Number), idx: 0, fim: ok };
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
      if (entrada.repetiu('direita')) { m.idx = (m.idx + 1) % m.dig.length; som.cursor(); }
      if (entrada.repetiu('esquerda')) { m.idx = (m.idx + m.dig.length - 1) % m.dig.length; som.cursor(); }
      if (entrada.repetiu('cima')) { m.dig[m.idx] = (m.dig[m.idx] + 1) % 10; som.cursor(); }
      if (entrada.repetiu('baixo')) { m.dig[m.idx] = (m.dig[m.idx] + 9) % 10; som.cursor(); }
      if (entrada.disparou('ok')) { som.ok(); this.ativo = null; m.fim(+m.dig.join('')); }
    }
  }

  avancar(m) {
    // uma letra por quadro, como o VX Ace
    while (m.i < m.tok.length) {
      const k = m.tok[m.i++];
      if (k.cor !== undefined) { m.cor = k.cor; continue; }
      if (k.espera) { m.espera = k.espera; return; }
      if (k.nl) { m.linhas.push([]); continue; }
      const linha = m.linhas[m.linhas.length - 1];
      const ult = linha[linha.length - 1];
      if (ult && ult.cor === m.cor) ult.t += k.ch; else linha.push({ t: k.ch, cor: m.cor });
      return;
    }
    m.pronto = true;
  }

  completar(m) {
    while (m.i < m.tok.length) { m.espera = 0; this.avancar(m); }
    m.pronto = true;
  }

  // ---- desenho ----
  desenhar(g) {
    const m = this.ativo;
    if (!m) return;
    faixaDim(g, m.y, 120);
    let y = m.y + TOPO_TEXTO;
    for (const linha of m.linhas) {
      let x = TX;
      for (const p of linha) { texto(g, p.t, x, y, CORES[p.cor] || CORES[0], FONTE); x += largura(g, p.t, FONTE); }
      y += ALTURA_LINHA;
    }
    if (m.tipo === 'escolha' && m.pronto) {
      m.opcoes.forEach((o, i) => {
        const yy = m.y + TOPO_TEXTO + (m.linhas.length + i) * ALTURA_LINHA;
        if (i === m.sel) cursor(g, TX - 2, yy - 4, 544 - TX - 16, ALTURA_LINHA, this.t);
        let x = TX + 21;
        for (const p of pedacos(o)) { texto(g, p.t, x, yy, CORES[p.cor] || CORES[0]); x += largura(g, p.t); }
      });
    }
    if (m.tipo === 'numero' && m.pronto) {
      const yy = m.y + TOPO_TEXTO + m.linhas.length * ALTURA_LINHA;
      const passo = 16;
      m.dig.forEach((d, i) => {
        const x = 43 + i * passo;
        if (i === m.idx) cursor(g, x - 2, yy - 4, passo, ALTURA_LINHA + 1, this.t);
        texto(g, String(d), x, yy);
      });
    }
    if (m.tipo === 'msg' && m.pronto) setaPausa(g, 272, m.y + 120 - 10, this.t);
  }
}
