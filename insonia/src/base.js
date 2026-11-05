// Constantes e utilidades do motor. Tiles de 32 px, como no RPG Maker VX Ace.
// A área do mundo (LARG x ALT, em pixels do jogo) se adapta à tela: no mínimo 544x416 (17x13 tiles,
// a tela do jogo original) e o resto da tela mostra mais mapa em vez de faixas pretas.
export const T = 32;
export const BASE_L = 544;
export const BASE_A = 416;
export let LARG = BASE_L;
export let ALT = BASE_A;
// Tela real: w,h em px CSS; dpr do aparelho; zoom = px do aparelho por px do jogo; f = tamanho do texto (px CSS);
// mx = faixa de cada lado que os textos e menus evitam (os controles de toque com o celular deitado).
export const MIN_L_EM_PE = 352;   // 11 tiles
export const TELA = { w: BASE_L, h: BASE_A, dpr: 1, zoom: 1, f: 18, mx: 0 };
export function definirTela(wCss, hCss, dpr, mx = 0) {
  TELA.w = Math.max(160, wCss); TELA.h = Math.max(120, hCss); TELA.dpr = dpr;
  TELA.mx = Math.min(mx, TELA.w * 0.25);
  const wd = Math.round(TELA.w * dpr), hd = Math.round(TELA.h * dpr);
  // celular em pé: 17 tiles de largura deixavam tudo minúsculo; em pé o mundo mostra no mínimo
  // 11 tiles (a câmera segue o herói nas salas mais largas que isso)
  const minL = TELA.h > TELA.w ? MIN_L_EM_PE : BASE_L;
  TELA.zoom = Math.min(wd / minL, hd / BASE_A);
  LARG = Math.ceil(wd / TELA.zoom);
  ALT = Math.ceil(hd / TELA.zoom);
  // texto legível: 18 px no celular (antes saía com ~12 px na tela em pé), até 28 px no computador
  // (até 44 px nas telas grandes: com o teto antigo de 28, Full HD e ultrawide ficavam com o texto pequeno)
  TELA.f = Math.max(18, Math.min(44, Math.round(Math.min(TELA.w, TELA.h * 1.3) / 30)));
}

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Entrada ----------
// Teclas do VX Ace: setas, Enter/Espaço/Z = ação, Esc/X = cancelar; "i" abre o inventário.
const MAPA_TECLAS = {
  ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita',
  KeyW: 'cima', KeyS: 'baixo', KeyA: 'esquerda', KeyD: 'direita',
  Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', KeyZ: 'ok',
  Escape: 'cancelar', KeyX: 'cancelar', Backspace: 'cancelar',
  KeyI: 'inventario',
  ShiftLeft: 'correr', ShiftRight: 'correr',
  KeyM: 'mudo',
};

class Entrada {
  constructor() {
    this.seguro = new Set();
    this.apertou = new Set();
    this.repete = new Map();
    this.ultimaDir = null;
    this.letras = [];          // caracteres digitados neste quadro (senha da caixa, código)
    this.ultimaTecla = null;   // e.code da última tecla (Enter confirma o que foi digitado)
    addEventListener('keydown', (e) => {
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) this.letras.push(e.key);
      this.ultimaTecla = e.code;
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
    this.letras.length = 0;
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
