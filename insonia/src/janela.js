// Desenho de janelas e texto no estilo do jogo de 2014: fonte Courier, janelas grafite
// com moldura clara e cantos rebitados.
export const FONTE = '17px "Courier New", Courier, monospace';
export const FONTE_NARRACAO = '23px "Palatino Linotype", "Book Antiqua", Palatino, serif';
export const ALTURA_LINHA = 24;
export const PADDING = 12;

export const CORES = {
  0: '#e6e6e6', // normal
  1: '#7fb2ff',
  2: '#d77a6c', // vermelho das outras vozes / avisos (\c[2])
  7: '#8a8a8a', // desativado
  8: '#8a8a8a',
};

// Textura da moldura (pedra cinza áspera, como a windowskin do jogo de 2014).
let ruido = null;
function texturaMoldura(g) {
  if (!ruido) {
    ruido = document.createElement('canvas');
    ruido.width = ruido.height = 64;
    const c = ruido.getContext('2d');
    const d = c.createImageData(64, 64);
    let s = 7;
    for (let i = 0; i < d.data.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const v = 44 + (s % 30);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    c.putImageData(d, 0, 0);
  }
  return g.createPattern(ruido, 'repeat');
}

function retArred(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

export function janela(g, x, y, w, h, opac = 1) {
  g.save();
  g.globalAlpha = opac;
  // sombra externa
  g.fillStyle = 'rgba(4,4,4,0.85)';
  retArred(g, x, y, w, h, 6); g.fill();
  // moldura áspera (faixa de ~4 px)
  g.fillStyle = texturaMoldura(g);
  retArred(g, x + 1, y + 1, w - 2, h - 2, 5); g.fill();
  // fundo
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#1d1d1d');
  gr.addColorStop(1, '#131313');
  g.fillStyle = gr;
  retArred(g, x + 5, y + 5, w - 10, h - 10, 2); g.fill();
  // fio escuro por dentro da moldura e brilho no alto
  g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1;
  retArred(g, x + 4.5, y + 4.5, w - 9, h - 9, 2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.beginPath(); g.moveTo(x + 6, y + 1.5); g.lineTo(x + w - 6, y + 1.5); g.stroke();
  g.restore();
}

// Cursor de seleção: fio cinza com o miolo um pouco mais claro.
export function cursor(g, x, y, w, h, t = 0) {
  g.save();
  g.globalAlpha = 0.8 + 0.2 * Math.sin(t / 12);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.strokeStyle = 'rgba(150,150,150,0.9)';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.restore();
}

// Fundo "Dim" do VX Ace: faixa preta (alpha 160) com 12px de degradê em cima e embaixo.
export function faixaDim(g, y, h, opac = 1) {
  const c1 = `rgba(0,0,0,${(160 / 255) * opac})`, c0 = 'rgba(0,0,0,0)';
  let gr = g.createLinearGradient(0, y, 0, y + 12);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(0, y, 544, 12);
  g.fillStyle = c1; g.fillRect(0, y + 12, 544, h - 24);
  gr = g.createLinearGradient(0, y + h - 12, 0, y + h);
  gr.addColorStop(0, c1); gr.addColorStop(1, c0);
  g.fillStyle = gr; g.fillRect(0, y + h - 12, 544, 12);
}

// Texto com sombra (como o RGSS desenha: contorno/sombra escura deslocada 1px).
export function texto(g, s, x, y, cor = CORES[0], fonte = FONTE, alinha = 'left') {
  g.font = fonte;
  g.textBaseline = 'top';
  g.textAlign = alinha;
  g.fillStyle = 'rgba(0,0,0,0.75)';
  g.fillText(s, x + 1, y + 1);
  g.fillStyle = cor;
  g.fillText(s, x, y);
  g.textAlign = 'left';
}

export function largura(g, s, fonte = FONTE) {
  g.font = fonte;
  return g.measureText(s).width;
}

// Divide "\c[2]Não\c[0]" em pedaços {t, cor}.
export function pedacos(s, corBase = 0) {
  const out = [];
  let cor = corBase, buf = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === 'c' && s[i + 2] === '[') {
      const f = s.indexOf(']', i);
      if (buf) { out.push({ t: buf, cor }); buf = ''; }
      cor = +s.slice(i + 3, f);
      i = f; continue;
    }
    buf += s[i];
  }
  if (buf) out.push({ t: buf, cor });
  return out;
}

export function textoColorido(g, s, x, y, corBase = 0) {
  let cx = x;
  for (const p of pedacos(s, corBase)) {
    texto(g, p.t, cx, y, CORES[p.cor] || CORES[0]);
    cx += largura(g, p.t);
  }
}

// Seta de pausa da mensagem (pisca embaixo, no centro).
export function setaPausa(g, x, y, t) {
  const a = 0.45 + 0.35 * Math.sin(t / 8);
  g.fillStyle = `rgba(190,190,190,${a})`;
  g.fillRect(x - 1, y, 3, 1);
  g.fillRect(x, y + 1, 1, 2);
}
