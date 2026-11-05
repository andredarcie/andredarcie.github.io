// Personagens e objetos de evento, com o movimento e a animação do VX Ace.
import { T, DIRS, LINHA_DIR, quadros, agoraMs } from './base.js';
import { img, tela } from './recursos.js';

// Cópias "tonalizadas" das folhas (tom do mapa: subtrai brilho, como o Tint Screen negativo).
const cacheTom = new Map();
export function tonalizada(nome, tom) {
  if (!tom) return img(nome);
  const k = nome + '|' + tom;
  let c = cacheTom.get(k);
  if (c) return c;
  const src = img(nome);
  c = tela(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  aplicarTom(g, c.width, c.height, tom);
  cacheTom.set(k, c);
  return c;
}

export function aplicarTom(g, w, h, tom) {
  if (!tom) return;
  const d = g.getImageData(0, 0, w, h);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    p[i] = Math.max(0, p[i] - tom);
    p[i + 1] = Math.max(0, p[i + 1] - tom);
    p[i + 2] = Math.max(0, p[i + 2] - tom);
  }
  g.putImageData(d, 0, 0);
}

const VEL_PX = { 1: 0.25, 2: 0.5, 3: 1, 4: 2, 5: 4, 6: 8 };

export class Personagem {
  constructor(x, y, grafico = null, dir = 'baixo') {
    this.x = x; this.y = y;
    this.rx = x * T; this.ry = y * T;
    this.dir = dir;
    this.grafico = grafico;
    this.padrao = 1;
    this.contaAnim = 0;
    this.vel = 4;
    this.visivel = true;
    this.atravessa = false;
    this.opac = 1;
    this.fixoDir = false;
    this.animaParado = false;
    this.semAnimar = false;
    this.prioridade = 1; // 0 abaixo do herói, 1 mesmo nível, 2 acima
    this.dy = 0; // ajuste vertical extra em px
    this.dx = 0;
  }

  get movendo() { return this.rx !== this.x * T || this.ry !== this.y * T; }

  virar(d) { if (!this.fixoDir) this.dir = d; }

  frente() { const [dx, dy] = DIRS[this.dir]; return [this.x + dx, this.y + dy]; }

  // Começa um passo se o destino estiver livre. Retorna true se andou.
  passo(d, jogo, forcar = false) {
    this.virar(d);
    const [dx, dy] = DIRS[d];
    const nx = this.x + dx, ny = this.y + dy;
    if (!forcar && !this.atravessa && !jogo.livre(nx, ny, this)) return false;
    this.x = nx; this.y = ny;
    return true;
  }

  // Movimento de roteiro: anda e espera chegar.
  async andar(d, jogo, n = 1) {
    for (let i = 0; i < n; i++) {
      if (!this.passo(d, jogo, true)) break;
      while (this.movendo) await quadros(1);
    }
  }

  atualizar() {
    const v = VEL_PX[this.vel] || 2;
    const tx = this.x * T, ty = this.y * T;
    const andando = this.movendo;
    if (this.rx < tx) this.rx = Math.min(tx, this.rx + v); else if (this.rx > tx) this.rx = Math.max(tx, this.rx - v);
    if (this.ry < ty) this.ry = Math.min(ty, this.ry + v); else if (this.ry > ty) this.ry = Math.max(ty, this.ry - v);
    if (this.semAnimar) return;
    if (andando || this.animaParado) {
      this.contaAnim += 1.5;
      if (this.contaAnim > 18 - this.vel * 2) { this.padrao = (this.padrao + 1) % 4; this.contaAnim = 0; }
      this.parado = 0;
    } else {
      // volta ao quadro parado depois de um instante (como o RGSS)
      if (this.padrao !== 1 && ++this.parado > 2) { this.padrao = 1; this.contaAnim = 0; }
    }
  }

  desenhar(g, cx, cy, tom) {
    const gr = this.grafico;
    if (!gr || !this.visivel || this.opac <= 0) return;
    const sx = Math.round(this.rx - cx + T / 2 + this.dx);
    const by = Math.round(this.ry - cy + T + this.dy);
    g.save();
    g.globalAlpha = this.opac;
    if (gr.desenho) { gr.desenho(g, sx, by, this); g.restore(); return; }
    if (gr.tile) {
      const fo = tonalizada('tiles/' + gr.tile, tom);
      g.drawImage(fo, gr.x * T, gr.y * T, T, T, sx - T / 2, by - T, T, T);
      g.restore(); return;
    }
    const fo = tonalizada(gr.folha, tom);
    let fw, fh, bx, byy;
    if (gr.tipo === 'mack') { fw = 32; fh = 48; bx = (gr.idx % 4) * 96; byy = Math.floor(gr.idx / 4) * 192; }
    else if (gr.tipo === 'alto') { fw = 32; fh = 64; bx = (gr.idx % 4) * 96; byy = Math.floor(gr.idx / 4) * 256; }
    else if (gr.tipo === 'unico48') { fw = 32; fh = 48; bx = 0; byy = 0; }
    else { fw = 32; fh = 32; bx = (gr.idx % 4) * 96; byy = Math.floor(gr.idx / 4) * 128; }
    // objetos animados parados (lampião): ciclo 0-1-2-1 como o "animação parada" do RPG Maker
    const quadro = gr.quadro !== undefined ? gr.quadro
      : gr.anima ? [0, 1, 2, 1][Math.floor(agoraMs() / 160) % 4]
      : (this.padrao < 3 ? this.padrao : 1);
    const linha = gr.linha !== undefined ? gr.linha : LINHA_DIR[this.dir];
    const desloc = gr.objeto ? 0 : 4; // shift_y do VX Ace
    g.drawImage(fo, bx + quadro * fw, byy + linha * fh, fw, fh, sx - fw / 2, by - fh - desloc, fw, fh);
    g.restore();
  }
}
