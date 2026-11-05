// Efeitos sonoros por modelo físico (nada gravado):
// - impactos de metal e madeira por síntese modal (senoides amortecidas nas frequências da peça);
// - dobradiça e madeira rangendo por atrito "gruda-escorrega" (rangido do motor);
// - trovão, pedra arrastando, poeira e chuva por ruído esculpido no tempo.
// Toda função aceita { t } para tocar num instante exato (usado na revisão offline).
import { ac, contexto, saida, percussivo, asr, modos, rajada, rangido, fonteRuido } from './motor.js';
import { gravado as G } from './gravados.js';

const R = (a, b) => a + Math.random() * (b - a);
const V = (x, p = 0.06) => x * (1 + (Math.random() * 2 - 1) * p);

function inicio(op) {
  if (op && op.t != null) return op.t;
  const c = ac(); if (!c || c.state !== 'running') return null;
  return c.currentTime + 0.012;
}

// ---------------- peças reutilizadas ----------------
function trinco(t, out, k = 1) {
  modos(t, [[2300, 0.15 * k, 0.012], [3650, 0.08 * k, 0.009], [5100, 0.035 * k, 0.006]], out);
  rajada(t, 0.008, out, { f: 3800, q: 0.7, vol: 0.16 * k, a: 0.0035, tau: 0.0025 });
}
function baqueMadeira(t, out, k = 1) {
  modos(t, [[V(92), 0.32 * k, 0.09], [V(155), 0.4 * k, 0.07], [V(238), 0.35 * k, 0.05], [V(410), 0.2 * k, 0.03], [V(690), 0.08 * k, 0.02]], out);
  rajada(t, 0.09, out, { tipo: 'marrom', filtro: 'lowpass', f: 520, q: 0.5, vol: 0.5 * k, tau: 0.03 });
}
// barra de metal livre nas duas pontas (grade, cano): parciais 1 : 2,76 : 5,40 : 8,93
function barra(t, out, f, k = 1, sustenta = 1) {
  modos(t, [[f, 0.32 * k, 0.32 * sustenta], [f * 2.756, 0.2 * k, 0.18 * sustenta], [f * 5.404, 0.1 * k, 0.09 * sustenta], [f * 8.933, 0.05 * k, 0.05 * sustenta]], out);
  rajada(t, 0.01, out, { f: 3000, q: 0.6, vol: 0.32 * k, a: 0.003, tau: 0.003 });
}

// ---------------- interface (baixinho, seco, "de madeira") ----------------
export function cursor(op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ bus: 'ui', rev: 0.04, vol: 0.22 });
  rajada(t, 0.01, out, { f: 3300, q: 1.4, vol: 0.22, tau: 0.003 });
  modos(t, [[1750, 0.045, 0.01]], out);
}
export function ok(op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ bus: 'ui', rev: 0.12, vol: 0.22 });
  modos(t, [[620, 0.16, 0.035], [1480, 0.06, 0.02], [2650, 0.025, 0.01]], out);
  rajada(t, 0.008, out, { f: 2600, q: 1, vol: 0.16, tau: 0.003 });
}
export function cancelar(op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ bus: 'ui', rev: 0.1, vol: 0.22 });
  modos(t, [[430, 0.17, 0.04], [1010, 0.05, 0.02]], out);
  rajada(t, 0.008, out, { f: 1800, q: 1, vol: 0.14, tau: 0.003 });
}
export function erro(op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ bus: 'ui', rev: 0.15, vol: 0.2 });
  modos(t, [[150, 0.3, 0.08], [205, 0.16, 0.06], [470, 0.05, 0.03]], out);
  rajada(t, 0.06, out, { tipo: 'marrom', filtro: 'lowpass', f: 320, vol: 0.35, tau: 0.04 });
}
// item: um sino pequeno e escuro, longe
export function item(op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ bus: 'ui', rev: 0.55, vol: 0.11 });
  const f = 392;
  const P = [[0.5, 0.22, 1.5], [1, 0.42, 1.2], [1.183, 0.16, 0.85], [1.506, 0.2, 0.75], [2, 0.14, 0.55], [2.514, 0.08, 0.4], [2.662, 0.06, 0.32], [3.011, 0.04, 0.25]];
  modos(t, P.map(([r, a, tau]) => [f * r, a, tau]), out, { varia: 0.004 });
  modos(t + 0.003, [[f * 1.003, 0.12, 1.1]], out, { varia: 0 }); // batimento lento
}

// ---------------- portas e fechaduras ----------------
export function porta(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.porta(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.32, vol: 0.4, ...op });
  trinco(t, out);
  rangido(t + 0.06, out, { dur: R(0.5, 0.75), r0: R(14, 22), r1: R(42, 65), forma: 'arco', freqs: [R(470, 560), R(950, 1100), R(1700, 1950)], q: 16, vol: 1.1 });
  rajada(t + 0.1, 0.5, out, { tipo: 'rosa', f: 520, q: 0.6, f2: 240, vol: 0.06 });   // ar da porta abrindo
  baqueMadeira(t + 0.8, out, 0.85);                                                   // fecha atrás
  trinco(t + 0.82, out, 0.6);
}
export function trancada(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.trancada(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.28, vol: 0.4, ...op });
  let tt = t;
  for (let i = 0; i < 3; i++) {
    trinco(tt, out, 0.85 - i * 0.12);
    modos(tt + 0.012, [[V(140), 0.32, 0.04], [V(300), 0.18, 0.03], [V(530), 0.08, 0.02]], out);
    rajada(tt + 0.01, 0.03, out, { tipo: 'marrom', filtro: 'lowpass', f: 650, vol: 0.28, tau: 0.014 });
    tt += R(0.1, 0.14);
  }
}
export function destrancar(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.destrancar(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.25, vol: 0.33, ...op });
  rajada(t, 0.14, out, { f: 3200, q: 3, vol: 0.1, a: 0.03 });                       // a chave entrando
  modos(t + 0.15, [[1900, 0.1, 0.02], [3100, 0.06, 0.014]], out);                    // encaixa
  rajada(t + 0.22, 0.1, out, { f: 1400, q: 2, f2: 900, vol: 0.09, a: 0.02 });        // gira
  modos(t + 0.33, [[185, 0.42, 0.06], [430, 0.28, 0.05], [960, 0.16, 0.035], [1720, 0.08, 0.025]], out); // ferrolho
  trinco(t + 0.33, out, 0.8);
}

// ---------------- grade, cano, pancadas ----------------
// grade enferrujada sendo forçada ou atingida
export function metal(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.metal(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.38, vol: 0.45, ...op });
  barra(t, out, R(300, 370), 1, 1);
  for (let k = 1; k < 5; k++) { const f = R(600, 1100); modos(t + k * R(0.03, 0.07), [[f, 0.07, 0.06], [f * 2.756, 0.04, 0.03]], out); }
  rangido(t + 0.02, out, { dur: 0.28, r0: 55, r1: 120, forma: 'desce', freqs: [1300, 2400], q: 22, vol: 0.9 });
}
// a grade cede e cai
export function quebrar(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.quebrar(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.45, vol: 0.55, ...op });
  rangido(t, out, { dur: 0.35, r0: 30, r1: 95, forma: 'sobe', freqs: [900, 1800, 2900], q: 26, vol: 1.1 });
  rajada(t + 0.35, 0.02, out, { f: 2300, q: 0.6, vol: 0.42, a: 0.003, tau: 0.006 });           // estalo
  modos(t + 0.35, [[R(250, 320), 0.38, 0.25], [R(700, 800), 0.22, 0.12], [R(1500, 1700), 0.1, 0.06]], out);
  let tt = t + 0.55, g = 0.55;
  for (let k = 0; k < 7; k++) {                                                        // pedaços quicando
    const f = R(500, 1400);
    modos(tt, [[f, 0.24 * g, 0.05], [f * 2.7, 0.11 * g, 0.03]], out);
    rajada(tt, 0.01, out, { f: 3000, vol: 0.22 * g, tau: 0.003 });
    tt += R(0.06, 0.16) * (1 - k * 0.08); g *= 0.8;
  }
  rajada(t + 0.5, 1.0, out, { tipo: 'rosa', f: 3500, q: 0.6, vol: 0.04, a: 0.1 });    // poeira
}
// pancada pesada numa porta de madeira (alguém tentando entrar)
export function batida(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.batida(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.4, vol: 0.55, ...op });
  baqueMadeira(t, out, 1.25);
  rajada(t, 0.14, out, { tipo: 'marrom', filtro: 'lowpass', f: 230, vol: 0.9, tau: 0.05 });
  modos(t + 0.01, [[R(520, 600), 0.1, 0.03]], out);
  for (let k = 0; k < 4; k++) modos(t + 0.015 + k * R(0.018, 0.03), [[R(1800, 2600), 0.045, 0.01]], out); // batente chacoalha
}

// ---------------- passos ----------------
// sup: madeira | pedra | ladrilho | metal | tapete. pesado: passo arrastado (o monstro).
export function passo(sup = 'madeira', op = {}) {
  const t0 = inicio(op); if (t0 == null) return;
  if (G.passo(sup, t0, op)) return;
  const out = saida({ bus: op.bus ?? 'fx', rev: 0.16, vol: op.vol ?? 0.55, pan: op.pan ?? R(-0.05, 0.05), dist: op.dist ?? 0 });
  const k = op.pesado ? 1.4 : 1;
  const t = t0 + R(0, 0.012);
  // calcanhar
  rajada(t, 0.05, out, { tipo: 'marrom', filtro: 'lowpass', f: V((op.pesado ? 200 : 350) * (sup === 'tapete' ? 0.5 : 1)), q: 0.7, vol: 0.38 * k, tau: 0.022 });
  if (sup === 'madeira') {
    modos(t, [[V(170), 0.15 * k, 0.03], [V(390), 0.14 * k, 0.022], [V(820), 0.07 * k, 0.012], [V(1500), 0.03 * k, 0.008]], out);
    rajada(t + 0.03, 0.03, out, { f: 1800, q: 0.8, vol: 0.09, tau: 0.01 });
    if (Math.random() < 0.12) rangido(t + 0.04, out, { dur: R(0.12, 0.22), r0: 40, r1: 90, freqs: [R(700, 900), R(1400, 1700)], q: 12, vol: 0.5 });
  } else if (sup === 'pedra') {
    rajada(t, 0.012, out, { f: 2600, q: 0.9, vol: 0.22, a: 0.0025, tau: 0.004 });
    modos(t, [[V(260), 0.07 * k, 0.015], [V(600), 0.045 * k, 0.01]], out);
    rajada(t + 0.02, 0.08, out, { f: 3800, q: 0.7, vol: 0.06, a: 0.01 });             // areia
  } else if (sup === 'ladrilho') {
    rajada(t, 0.01, out, { filtro: 'bandpass', f: 2400, q: 0.8, vol: 0.5, a: 0.0025, tau: 0.005 });
    modos(t, [[V(320), 0.06, 0.015], [V(700), 0.04, 0.01], [V(1850), 0.14, 0.014], [V(2450), 0.08, 0.01], [V(3050), 0.06, 0.008]], out);
  } else if (sup === 'metal') {
    modos(t, [[V(310), 0.11 * k, 0.09], [V(860), 0.07 * k, 0.06], [V(1690), 0.035 * k, 0.04]], out);
    rajada(t, 0.01, out, { f: 2200, vol: 0.07, tau: 0.004 });
  }
  // ponta do pé
  rajada(t + R(0.045, 0.065), 0.03, out, { tipo: 'marrom', filtro: 'lowpass', f: 480, vol: 0.14 * k, tau: 0.012 });
  if (op.pesado) rajada(t + 0.07, 0.28, out, { tipo: 'rosa', f: 600, q: 0.7, vol: 0.06, a: 0.05 }); // arrasta
}

// ---------------- grito longe, atrás das paredes ----------------
export function grito(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.grito(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const c = contexto();
  const out = saida({ rev: 0.9, vol: 0.27, dist: 0.5, pan: op.pan ?? R(-0.3, 0.3) });
  const dur = 1.6;
  const env = c.createGain(); asr(env.gain, t, 0.5, 0.1, dur, 0.55); env.connect(out);
  const o = c.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(330, t); o.frequency.linearRampToValueAtTime(540, t + 0.22);
  o.frequency.linearRampToValueAtTime(490, t + 0.9); o.frequency.exponentialRampToValueAtTime(250, t + dur);
  const vib = c.createOscillator(); vib.frequency.value = 5.6;
  const vg = c.createGain(); vg.gain.value = 11; vib.connect(vg); vg.connect(o.frequency);
  const tre = fonteRuido('marrom', t, dur); const tg = c.createGain(); tg.gain.value = 18; tre.connect(tg); tg.connect(o.frequency);
  for (const [f, q, a] of [[820, 7, 1], [1220, 8, 0.6], [2750, 10, 0.25]]) {          // formantes de "a"
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = c.createGain(); g.gain.value = a * 3;
    o.connect(bp); bp.connect(g); g.connect(env);
  }
  rajada(t, dur, env, { tipo: 'rosa', f: 1300, q: 1, vol: 0.5, a: 0.1 });             // fôlego
  o.start(t); o.stop(t + dur + 0.1); vib.start(t); vib.stop(t + dur + 0.1);
}

// ---------------- natureza e estrutura ----------------
export function trovao(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.trovao(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.3, vol: 0.5, pan: op.pan ?? R(-0.4, 0.4) });
  const t0 = t + R(0.05, 0.5);
  rajada(t0, 0.3, out, { filtro: 'lowpass', f: 2400, f2: 450, q: 0.3, vol: 0.32, tau: 0.09 }); // estalo (pela janela)
  const dur = R(3.5, 5.5);
  rajada(t0 + 0.05, dur, out, { tipo: 'marrom', filtro: 'lowpass', f: 280, f2: 90, q: 0.5, vol: 0.85, a: 0.25 });
  for (let k = 0; k < 5; k++) rajada(t0 + R(0.2, dur * 0.7), R(0.6, 1.4), out, { tipo: 'marrom', filtro: 'lowpass', f: R(150, 300), vol: R(0.35, 0.7), a: R(0.1, 0.3) });
}
// susto: grave que despenca + metal friccionado (arco num prato) + cluster grave dissonante
export function susto(op = {}) {
  const t = inicio(op); if (t == null) return;
  const c = contexto();
  const out = saida({ rev: 0.65, vol: 0.8 });
  const o = c.createOscillator(); o.frequency.setValueAtTime(64, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.6);
  const og = c.createGain(); percussivo(og.gain, t, 0.85, 0.012, 0.5); o.connect(og); og.connect(out); o.start(t); o.stop(t + 3);
  rajada(t, 1.4, out, { tipo: 'marrom', filtro: 'lowpass', f: 320, f2: 80, vol: 0.6, a: 0.012 });
  const src = fonteRuido('rosa', t, 3.4);
  const env = c.createGain(); asr(env.gain, t, 1, 0.35, 3.2, 1.6); env.connect(out);
  for (const [f, a] of [[R(480, 520), 1], [R(1150, 1230), 0.8], [R(1820, 1900), 0.6], [R(2600, 2750), 0.45], [R(3450, 3600), 0.3]]) {
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 80;
    const g = c.createGain(); g.gain.value = a * 9;
    src.connect(bp); bp.connect(g); g.connect(env);
  }
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
  const cg = c.createGain(); asr(cg.gain, t, 0.05, 0.02, 1.9, 1.2); lp.connect(cg); cg.connect(out);
  for (const f of [87.3, 92.5, 98]) { const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.connect(lp); s.start(t); s.stop(t + 2); }
}
// a sala gira: pedra arrastando, catraca do mecanismo e a trava no fim
export function girar(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.girar(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const c = contexto();
  const out = saida({ rev: 0.45, vol: 0.5 });
  const dur = 1.6;
  const pedra = fonteRuido('marrom', t, dur + 0.5);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 0.8;
  const g = c.createGain(); asr(g.gain, t, 2.4, 0.25, dur, 0.35);
  const am = c.createGain(); am.gain.value = 0.6;
  const grao = fonteRuido('branco', t, dur + 0.5); const gl = c.createBiquadFilter(); gl.type = 'lowpass'; gl.frequency.value = 28;
  const gk = c.createGain(); gk.gain.value = 3; grao.connect(gl); gl.connect(gk); gk.connect(am.gain);
  pedra.connect(bp); bp.connect(g); g.connect(am); am.connect(out);
  rajada(t, dur, out, { tipo: 'marrom', filtro: 'lowpass', f: 150, vol: 0.4, a: 0.3 });
  let tt = t + 0.1;
  while (tt < t + dur - 0.1) { modos(tt, [[R(900, 1100), 0.06, 0.012], [R(2300, 2600), 0.03, 0.008]], out); tt += 0.06 + 0.05 * Math.abs(Math.sin((tt - t) * 2)); }
  modos(t + dur, [[70, 0.55, 0.12], [130, 0.32, 0.08], [260, 0.14, 0.05]], out);
  rajada(t + dur, 0.2, out, { tipo: 'marrom', filtro: 'lowpass', f: 300, vol: 0.8, tau: 0.06 });
  rajada(t + dur + 0.05, 1.2, out, { tipo: 'rosa', f: 3000, q: 0.5, vol: 0.035, a: 0.2 });
}
export function armadilha(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.armadilha(t, op)) return;                 // gravação real; senão, o sintetizado abaixo
  const out = saida({ rev: 0.32, vol: 0.5 });
  trinco(t, out, 1);                                                                  // gatilho
  rajada(t + 0.04, 0.14, out, { f: 3500, q: 1.2, f2: 900, vol: 0.35, a: 0.01 });     // lâmina cortando o ar
  barra(t + 0.16, out, R(380, 450), 1.1, 0.7);                                        // batida de metal
  rajada(t + 0.17, 0.1, out, { tipo: 'marrom', filtro: 'lowpass', f: 210, vol: 0.8, tau: 0.04 }); // no corpo
}
// a luz do corredor final apaga: um sopro grave que afunda
export function apagao(op = {}) {
  const t = inicio(op); if (t == null) return;
  const c = contexto();
  const out = saida({ rev: 0.6, vol: 0.4 });
  rajada(t, 0.9, out, { tipo: 'marrom', filtro: 'lowpass', f: 520, f2: 70, vol: 0.6, a: 0.02 });
  rajada(t, 0.7, out, { tipo: 'rosa', f: 1400, f2: 250, q: 0.8, vol: 0.3, a: 0.04 });
  const o = c.createOscillator(); o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.8);
  const g = c.createGain(); percussivo(g.gain, t, 0.45, 0.01, 0.25); o.connect(g); g.connect(out); o.start(t); o.stop(t + 2);
}

// ---------------- música (fim do capítulo 1) ----------------
// Nota de piano: corda por síntese modal (parciais quase harmônicos, um pouco esticados como numa
// corda real, os agudos morrem antes) e o martelo como um sopro grave e curto. Macia de propósito.
export function piano(f, op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ rev: 0.45, vol: op.vol ?? 0.16 });   // ~-22 LUFS: um pouco acima dos passos
  const k = 1.0004;                       // inarmonicidade leve
  modos(t, [[f, 0.26, 0.9], [f * 2 * k, 0.11, 0.55], [f * 3 * k * k, 0.05, 0.34], [f * 4 * k ** 3, 0.022, 0.22], [f * 0.5, 0.03, 0.5]], out, { varia: 0.001 });
  modos(t + 0.002, [[f * 1.0015, 0.08, 1.1]], out, { varia: 0 });   // segunda corda do mesmo tom: batimento lento
  rajada(t, 0.03, out, { tipo: 'rosa', filtro: 'lowpass', f: 900, vol: 0.05, a: 0.002, tau: 0.01 });
}
// Nota de caixinha de música: dente de metal, uma oitava acima, com os parciais inarmônicos da
// lâmina (2,76 e 5,40) bem baixos, e o clique do pino. Mais curta e mais baixa que o piano.
export function caixinha(f, op = {}) {
  const t = inicio(op); if (t == null) return;
  const out = saida({ rev: 0.4, vol: op.vol ?? 0.21, dist: 0.15 });   // ~-24 LUFS
  const g = f * 2;
  modos(t, [[g, 0.2, 0.55], [g * 2.756, 0.035, 0.12], [g * 5.404, 0.01, 0.05]], out, { varia: 0.002 });
  rajada(t, 0.006, out, { f: 2400, q: 1.2, vol: 0.05, tau: 0.002 });
}
// Grito de criança, longe: a gravação do grito feminino (CC0) mais aguda; sem ela, o sintetizado.
export function gritoCrianca(op = {}) {
  const t = inicio(op); if (t == null) return;
  if (G.gritoCrianca(t, op)) return;
  grito(op);
}
