// Constantes e utilidades do motor (resolução do RPG Maker VX Ace: 544x416, tiles de 32).
export const LARG = 544;
export const ALT = 416;
export const T = 32;

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Entrada ----------
// Teclas do VX Ace: setas, Enter/Espaço/Z = ação, Esc/X = cancelar; "i" abre o inventário.
const MAPA_TECLAS = {
  ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita',
  KeyW: 'cima', KeyS: 'baixo', KeyA: 'esquerda', KeyD: 'direita',
  Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', KeyZ: 'ok',
  Escape: 'cancelar', KeyX: 'cancelar', Backspace: 'cancelar',
  KeyI: 'inventario',
};

class Entrada {
  constructor() {
    this.seguro = new Set();
    this.apertou = new Set();
    this.repete = new Map();
    this.ultimaDir = null;
    addEventListener('keydown', (e) => {
      const k = MAPA_TECLAS[e.code];
      if (!k) return;
      e.preventDefault();
      if (!this.seguro.has(k)) { this.apertou.add(k); this.repete.set(k, 0); }
      this.seguro.add(k);
      if (['cima', 'baixo', 'esquerda', 'direita'].includes(k)) this.ultimaDir = k;
    });
    addEventListener('keyup', (e) => {
      const k = MAPA_TECLAS[e.code];
      if (!k) return;
      this.seguro.delete(k);
    });
    addEventListener('blur', () => this.seguro.clear());
  }
  // Toque: botões virtuais chamam isto.
  pressionar(k) { if (!this.seguro.has(k)) { this.apertou.add(k); this.repete.set(k, 0); } this.seguro.add(k); if (['cima', 'baixo', 'esquerda', 'direita'].includes(k)) this.ultimaDir = k; }
  soltar(k) { this.seguro.delete(k); }
  // Chamado uma vez por quadro, depois da lógica.
  fimDoQuadro() {
    this.apertou.clear();
    for (const [k, n] of this.repete) this.repete.set(k, n + 1);
  }
  disparou(k) { return this.apertou.has(k); }
  segurando(k) { return this.seguro.has(k); }
  // Como Input.repeat? do RGSS: no primeiro quadro, depois de 24, e então a cada 6.
  repetiu(k) {
    if (this.apertou.has(k)) return true;
    if (!this.seguro.has(k)) return false;
    const n = this.repete.get(k) || 0;
    return n >= 24 && (n - 24) % 6 === 0;
  }
  // Direção (4 direções) com prioridade para a última tecla pressionada.
  dir4() {
    const d = ['cima', 'baixo', 'esquerda', 'direita'].filter((k) => this.seguro.has(k));
    if (!d.length) return null;
    if (this.ultimaDir && d.includes(this.ultimaDir)) return this.ultimaDir;
    return d[0];
  }
}
export const entrada = new Entrada();

// ---------- Laço a 60 quadros por segundo ----------
// Toda espera do roteiro conta quadros (como o Wait do RPG Maker).
const esperando = new Set();
export function quadros(n) {
  return new Promise((r) => { if (n <= 0) r(); else esperando.add({ n, r }); });
}
export function tickEsperas() {
  for (const w of [...esperando]) { if (--w.n <= 0) { esperando.delete(w); w.r(); } }
}

// ---------- Gravação de vídeo (?gravar): o relógio anda quadro a quadro pelo gravador ----------
// Assim o vídeo sai igual em qualquer máquina: nada depende do tempo real.
export const gravacao = { ativa: new URLSearchParams(location.search).has('gravar'), quadro: 0 };
export const agoraMs = () => (gravacao.ativa ? gravacao.quadro * (1000 / 60) : performance.now());

export function rodarLaco(atualizar, desenhar) {
  if (gravacao.ativa) {
    window.__passo = (n = 1, desenha = true) => {
      for (let i = 0; i < n; i++) { atualizar(); gravacao.quadro++; }
      if (desenha) desenhar();
      return gravacao.quadro;
    };
    return;
  }
  let ultimo = performance.now(), acc = 0;
  const passo = 1000 / 60;
  function f(agora) {
    acc += Math.min(250, agora - ultimo); ultimo = agora;
    let n = 0;
    while (acc >= passo && n < 5) { atualizar(); acc -= passo; n++; }
    // telas de 90/120 Hz: o jogo anda a 60 por segundo; só redesenha quando algo mudou
    if (n) desenhar();
    requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
}

export const DIRS = {
  baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0], cima: [0, -1],
};
// Linha da folha de personagem por direção (padrão RPG Maker: baixo, esquerda, direita, cima).
export const LINHA_DIR = { baixo: 0, esquerda: 1, direita: 2, cima: 3 };
export const OPOSTA = { baixo: 'cima', cima: 'baixo', esquerda: 'direita', direita: 'esquerda' };

export function aleatorio(semente = 1) {
  let s = semente >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
