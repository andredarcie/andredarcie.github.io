// Input do RGSS2. Botões numéricos como no VX: DOWN 2, LEFT 4, RIGHT 6, UP 8,
// A 11, B 12, C 13, X 14, Y 15, Z 16, L 17, R 18, SHIFT 21, CTRL 22, ALT 23, F5–F9 25–29.
// Teclas padrão do VX (F1 do Game.exe): A = Shift; B = Esc, Num0, X;
// C = Espaço, Enter, Z; X = A; Y = S; Z = D; L = Q, PageUp; R = W, PageDown.

const TECLAS = {
  ArrowDown: [2], ArrowLeft: [4], ArrowRight: [6], ArrowUp: [8],
  Numpad2: [2], Numpad4: [4], Numpad6: [6], Numpad8: [8],
  ShiftLeft: [11, 21], ShiftRight: [11, 21],
  Escape: [12], Numpad0: [12], KeyX: [12],
  Space: [13], Enter: [13], NumpadEnter: [13], KeyZ: [13],
  KeyA: [14], KeyS: [15], KeyD: [16],
  KeyQ: [17], PageUp: [17], KeyW: [18], PageDown: [18],
  ControlLeft: [22], ControlRight: [22], AltLeft: [23], AltRight: [23],
  F5: [25], F6: [26], F7: [27], F8: [28], F9: [29],
};

// Repetição do RGSS2: dispara no primeiro quadro, espera 24 e repete a cada 6.
const ESPERA_REPETICAO = 24, INTERVALO_REPETICAO = 6;

export class Entrada {
  constructor() {
    this.teclas = new Set();   // códigos físicos pressionados
    this.toque = new Set();    // botões RGSS vindos do controle virtual
    this.pulsos = new Set();   // apertos já soltos que o jogo ainda não viu (toque rápido < 1 quadro)
    this.tempo = new Int32Array(32);
    this.ordemDirecao = [];    // direções na ordem em que foram apertadas
    this.bloqueada = false;    // modal de fases aberto: o teclado é dele
    window.addEventListener('keydown', (e) => {
      if (this.bloqueada || !TECLAS[e.code]) return;
      e.preventDefault();
      this.teclas.add(e.code);
      for (const b of TECLAS[e.code]) this.pulsos.add(b);
    });
    window.addEventListener('keyup', (e) => {
      if (!TECLAS[e.code]) return;
      e.preventDefault();
      this.teclas.delete(e.code);
    });
    window.addEventListener('blur', () => { this.teclas.clear(); this.toque.clear(); });
  }

  bloquear(sim) {
    this.bloqueada = sim;
    this.teclas.clear();
    this.toque.clear();
    this.pulsos.clear();
  }

  // Lê o estado do quadro. Devolve "press,trigger,repeat,dir4,dir8" (máscaras de bits).
  atualizar() {
    let press = 0;
    for (const t of this.teclas) for (const b of TECLAS[t]) press |= 1 << b;
    for (const b of this.toque) press |= 1 << b;
    for (const b of this.pulsos) press |= 1 << b;
    this.pulsos.clear();
    // Replay: grava esta máscara ou troca pela gravada (src/rastro.js)
    if (this.filtro) press = this.filtro(press >>> 0);
    let trigger = 0, repeat = 0;
    for (let b = 0; b < 32; b++) {
      if (press & (1 << b)) {
        const t = ++this.tempo[b];
        if (t === 1) trigger |= 1 << b;
        if (t === 1 || (t >= ESPERA_REPETICAO && (t - ESPERA_REPETICAO) % INTERVALO_REPETICAO === 0)) repeat |= 1 << b;
      } else this.tempo[b] = 0;
    }
    // dir4: a direção pressionada mais recentemente
    for (const d of [2, 4, 6, 8]) {
      const presa = (press & (1 << d)) !== 0, idx = this.ordemDirecao.indexOf(d);
      if (presa && idx < 0) this.ordemDirecao.push(d);
      if (!presa && idx >= 0) this.ordemDirecao.splice(idx, 1);
    }
    const dir4 = this.ordemDirecao.length ? this.ordemDirecao[this.ordemDirecao.length - 1] : 0;
    // dir8: combinação; opostos se anulam
    let dx = 0, dy = 0;
    if (press & (1 << 4)) dx -= 1;
    if (press & (1 << 6)) dx += 1;
    if (press & (1 << 8)) dy -= 1;
    if (press & (1 << 2)) dy += 1;
    const dir8 = dx === 0 && dy === 0 ? 0 : [[7, 8, 9], [4, 0, 6], [1, 2, 3]][dy + 1][dx + 1];
    return `${press >>> 0},${trigger >>> 0},${repeat >>> 0},${dir4},${dir8}`;
  }

  // Controle virtual para celular: elementos com data-botao="13" etc.
  ligarControleVirtual(raiz) {
    const ativos = new Map(); // pointerId → botões
    const soltar = (id) => {
      for (const b of ativos.get(id) ?? []) this.toque.delete(b);
      ativos.delete(id);
    };
    const pegar = (e) => {
      const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-botao]');
      soltar(e.pointerId);
      if (!alvo || !raiz.contains(alvo)) return;
      const botoes = alvo.dataset.botao.split(',').map(Number);
      ativos.set(e.pointerId, botoes);
      for (const b of botoes) { this.toque.add(b); this.pulsos.add(b); }
    };
    raiz.addEventListener('pointerdown', (e) => { e.preventDefault(); raiz.setPointerCapture?.(e.pointerId); pegar(e); });
    raiz.addEventListener('pointermove', (e) => { if (ativos.has(e.pointerId)) pegar(e); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) raiz.addEventListener(ev, (e) => soltar(e.pointerId));
  }
}
