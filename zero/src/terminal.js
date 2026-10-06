import * as THREE from 'three';

/* ===================== tela do terminal: preta, letras azuis ===================== */
// uma só textura, compartilhada por todos os monitores (nunca é descartada na troca de cena)
const W = 640, H = 400;
const termCanvas = document.createElement('canvas');
termCanvas.width = W; termCanvas.height = H;
const termCtx = termCanvas.getContext('2d');
export const termTex = new THREE.CanvasTexture(termCanvas);
termTex.magFilter = THREE.LinearFilter;
export const termMat = new THREE.MeshBasicMaterial({ map: termTex });
if (document.fonts && document.fonts.load) document.fonts.load('26px VT323');

const TFONT = '42px VT323, monospace', TLINE = 48;

function wrapInto(c, text, maxW, out) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { out.push(line); line = w; }
    else line = t;
  }
  out.push(line);
}
function clearScreen() {
  const c = termCtx;
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#3aa2ea';
  c.font = TFONT;
  c.textBaseline = 'top';
}

export function drawIdle() {
  clearScreen();
  termCtx.fillText('█', 20, 20);
  termTex.needsUpdate = true;
}

// term: { lines, idx, chars, waiting, blink } — a sessão ativa, mantida em main.js
export function drawTerm(term) {
  const c = termCtx, maxW = W - 40;
  clearScreen();
  const rows = [];
  for (let i = 0; i <= term.idx; i++) {
    const full = term.lines[i];
    wrapInto(c, '> ' + (i < term.idx ? full : full.slice(0, Math.floor(term.chars))), maxW, rows);
  }
  const maxRows = Math.floor((H - 64) / TLINE);
  const vis = rows.slice(-maxRows);
  vis.forEach((r, i) => c.fillText(r, 20, 20 + i * TLINE));
  if (!term.waiting || term.blink) {
    const lw = c.measureText(vis[vis.length - 1] || '').width;
    c.fillText('█', 20 + lw + 5, 20 + (vis.length - 1) * TLINE);
  }
  if (term.waiting && term.blink) c.fillText('E', W - 56, H - 52);
  termTex.needsUpdate = true;
}
