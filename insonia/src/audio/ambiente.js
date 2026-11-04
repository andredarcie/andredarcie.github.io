// Ambiente sonoro, inspirado no clima de jogos de terror em primeira pessoa como Amnesia:
// silêncio pesado, ar de porão, um zumbido grave de pavor, vento nos corredores e, de vez
// em quando, algo longe (madeira rangendo, gota, baque, corrente, cano gemendo, passos).
// Cada mapa tem um perfil. Os eventos são sorteados com antecedência no relógio do áudio
// (agendarAte), o que funciona igual em tempo real e na renderização offline da revisão.
import { contexto, M, sala, saida, percussivo, asr, modos, rajada, rangido, fonteRuido } from './motor.js';
import { passo } from './efeitos.js';

const R = (a, b) => a + Math.random() * (b - a);
const lado = () => (Math.random() < 0.5 ? -1 : 1) * R(0.25, 0.95);

// ---------------- perfis por mapa ----------------
// ar: tom de sala | pavor: zumbido grave {f, nivel} | vento | chuva | zumbido: lâmpada fluorescente
// fogo: chama do lampião (estalinhos) | ev: eventos distantes por minuto | tensao: base do medo
export const PERFIS = {
  titulo:         { sala: 'grande',   ar: 0.5, pavor: { f: 49, nivel: 0.6 },  vento: 0.5, ev: { gemido: 0.8, baque: 0.8, rangido: 1.2, gota: 2 } },
  cela:           { sala: 'pequena',  ar: 0.7, pavor: { f: 55, nivel: 0.42 }, fogo: 1, ev: { gota: 4, rangido: 2, baque: 0.6, gemido: 0.35, corrente: 0.5, poeira: 0.8 } },
  duto:           { sala: 'duto',     ar: 0.6, pavor: { f: 52, nivel: 0.4 },  vento: 0.9, ev: { cano: 2, metal: 1.5, gota: 2, poeira: 1 } },
  quarto2:        { sala: 'pequena',  ar: 0.7, pavor: { f: 55, nivel: 0.4 },  fogo: 1, ev: { rangido: 2.5, gota: 2, baque: 0.6, passos: 0.3, poeira: 0.8 } },
  corredor:       { sala: 'corredor', ar: 0.8, pavor: { f: 51, nivel: 0.5 },  vento: 0.6, fogo: 0.6, ev: { rangido: 2.5, baque: 1, gemido: 0.5, metal: 0.6, gota: 1.5, passos: 0.4 } },
  quarto_caixa:   { sala: 'pequena',  ar: 0.6, pavor: { f: 55, nivel: 0.35 }, ev: { rangido: 2, gota: 1.5, poeira: 1 } },
  sala14:         { sala: 'media',    ar: 0.6, pavor: { f: 46, nivel: 0.5 },  ev: { rangido: 2, baque: 0.8, gemido: 0.5 } },
  quarto_menino:  { sala: 'abafada',  ar: 0.4, chuva: 1, ev: { rangido: 1 } },
  hospital:       { sala: 'ladrilho', ar: 0.5, zumbido: 1, ev: {} },
  banheiro:       { sala: 'ladrilho', ar: 0.6, pavor: { f: 58, nivel: 0.4 },  ev: { gota: 9, cano: 2.5, rangido: 0.8, metal: 0.5 } },
  sala_lampadas:  { sala: 'media',    ar: 0.6, pavor: { f: 49, nivel: 0.45 }, fogo: 2, ev: { gota: 2, baque: 0.6, rangido: 1 } },
  salao:          { sala: 'grande',   ar: 0.8, pavor: { f: 44, nivel: 0.55 }, vento: 0.7, ev: { baque: 1.2, gemido: 0.6, rangido: 2, gota: 3, corrente: 0.8, poeira: 1 } },
  pilares:        { sala: 'grande',   ar: 0.8, pavor: { f: 46, nivel: 0.55 }, vento: 0.9, ev: { baque: 1, gemido: 0.7, rangido: 2, gota: 2, poeira: 1.2, passos: 0.4 } },
  celas:          { sala: 'corredor', ar: 0.7, pavor: { f: 49, nivel: 0.55 }, ev: { corrente: 2.5, gota: 3, gemido: 0.8, rangido: 1.5, metal: 1 } },
  armadilhas:     { sala: 'media',    ar: 0.7, pavor: { f: 46, nivel: 0.6 },  ev: { metal: 1.5, corrente: 1.2, gota: 2, poeira: 1.5, baque: 0.6 } },
  quarto_rachadura: { sala: 'pequena', ar: 0.6, pavor: { f: 52, nivel: 0.45 }, fogo: 1, ev: { rangido: 2, poeira: 2, gota: 1.5 } },
  sala_enigma:    { sala: 'media',    ar: 0.5, pavor: { f: 41, nivel: 0.6 },  ev: { gota: 2, gemido: 0.4, baque: 0.5 } },
  descanso:       { sala: 'media',    ar: 0.5, pavor: { f: 46, nivel: 0.4 },  ev: { rangido: 1.5, gota: 1.5 } },
  giratoria:      { sala: 'media',    ar: 0.6, pavor: { f: 41, nivel: 0.6 },  ev: { metal: 1, baque: 0.8, poeira: 1.5, gemido: 0.5 } },
  quarto_urso:    { sala: 'pequena',  ar: 0.6, pavor: { f: 44, nivel: 0.55 }, fogo: 1, ev: { rangido: 2, gota: 1, gemido: 0.4 } },
  corredor_final: { sala: 'corredor', ar: 0.8, pavor: { f: 39, nivel: 0.8 },  vento: 0.8, tensao: 0.3, ev: { baque: 1.5, gemido: 1.2, rangido: 2, passos: 0.8, gota: 1 } },
};
// passo do herói conforme o piso
export function superficie(tile, mapa) {
  if (mapa === 'duto') return 'metal';
  if (!tile) return 'madeira';
  if (/pedra|escamas/.test(tile)) return 'pedra';
  if (/azulejo/.test(tile)) return 'ladrilho';
  if (/tapete/.test(tile)) return 'tapete';
  return 'madeira';
}

// ---------------- eventos distantes ----------------
const EVENTOS = {
  gota(t) {
    const c = contexto();
    const out = saida({ bus: 'dist', rev: 0.75, vol: R(0.25, 0.5), pan: lado(), dist: R(0.1, 0.5) });
    const f = R(900, 1900);
    const o = c.createOscillator();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * R(1.5, 2.2), t + R(0.015, 0.035));
    const g = c.createGain(); percussivo(g.gain, t, 0.35, 0.001, R(0.02, 0.045));
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4);
    rajada(t, 0.006, out, { f: 4500, q: 1, vol: 0.05, tau: 0.002 });
    // às vezes, mais uma logo em seguida
    if (Math.random() < 0.35) { const t2 = t + R(0.25, 0.9); const o2 = c.createOscillator(); o2.frequency.setValueAtTime(f * 0.93, t2); o2.frequency.exponentialRampToValueAtTime(f * 1.8, t2 + 0.025); const g2 = c.createGain(); percussivo(g2.gain, t2, 0.22, 0.001, 0.03); o2.connect(g2); g2.connect(out); o2.start(t2); o2.stop(t2 + 0.3); }
  },
  rangido(t) {
    // viga/assoalho rangendo longe: atrito mais lento e corpo de madeira largo (Q baixo)
    const out = saida({ bus: 'dist', rev: 0.7, vol: R(0.6, 1), pan: lado(), dist: R(0.35, 0.6) });
    rangido(t, out, { dur: R(0.8, 2), r0: R(10, 18), r1: R(24, 48), forma: 'arco', jitter: 0.45, freqs: [R(190, 260), R(420, 540), R(850, 1050)], q: R(5, 8), vol: 9, decai: 0.003 });
  },
  gemido(t) {
    const c = contexto();
    const out = saida({ bus: 'dist', rev: 1, vol: R(0.13, 0.22), pan: lado(), dist: R(0.6, 0.8) });
    const dur = R(2.2, 3.6), f0 = R(68, 92);
    const env = c.createGain(); asr(env.gain, t, 0.6, 0.7, dur, 1.2); env.connect(out);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * R(1.08, 1.2), t + dur * 0.4);
    o.frequency.linearRampToValueAtTime(f0 * R(0.8, 0.9), t + dur);
    const tre = fonteRuido('marrom', t, dur); const tg = c.createGain(); tg.gain.value = 4; tre.connect(tg); tg.connect(o.frequency);
    for (const [f, q, a] of [[320, 5, 1], [700, 6, 0.5], [1100, 7, 0.2]]) {           // formantes de "o"
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = a * 2.5; o.connect(bp); bp.connect(g); g.connect(env);
    }
    rajada(t, dur, env, { tipo: 'rosa', f: 500, q: 0.8, vol: 0.4, a: 0.6 });
    o.start(t); o.stop(t + dur + 0.1);
  },
  baque(t) {
    const c = contexto();
    const out = saida({ bus: 'dist', rev: 1, vol: R(0.45, 0.75), pan: lado() * 0.6, dist: R(0.55, 0.75) });
    rajada(t, 0.3, out, { tipo: 'marrom', filtro: 'lowpass', f: 190, vol: 0.7, tau: 0.12 });
    modos(t, [[R(100, 120), 0.35, 0.09], [R(170, 200), 0.25, 0.07], [R(280, 320), 0.15, 0.05]], out);   // o "toc" da estrutura
    const o = c.createOscillator(); o.frequency.setValueAtTime(52, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    const g = c.createGain(); percussivo(g.gain, t, 0.6, 0.006, 0.2); o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5);
    if (Math.random() < 0.4) EVENTOS.poeira(t + R(0.2, 0.5), 0.6);
  },
  metal(t) {
    const out = saida({ bus: 'dist', rev: 0.9, vol: R(0.3, 0.5), pan: lado(), dist: R(0.5, 0.7) });
    const b = R(240, 560);
    modos(t, [[b, 0.3, 0.9], [b * 2.756, 0.18, 0.5], [b * 5.404, 0.08, 0.25]], out);
    rajada(t, 0.01, out, { f: 2500, vol: 0.3, tau: 0.003 });
    if (Math.random() < 0.5) rangido(t + R(0.3, 0.8), out, { dur: R(0.6, 1.2), r0: 25, r1: 60, forma: 'arco', freqs: [R(1100, 1500), R(2300, 2800)], q: 30, vol: 0.9 });
  },
  corrente(t) {
    const out = saida({ bus: 'dist', rev: 0.75, vol: R(0.7, 1), pan: lado(), dist: R(0.4, 0.6) });
    let tt = t;
    const n = Math.floor(R(5, 11));
    for (let k = 0; k < n; k++) {
      const a = R(0.4, 1) * (1 - k / (n + 2));
      modos(tt, [[R(2000, 3200), 0.12 * a, 0.03], [R(4000, 5200), 0.05 * a, 0.015]], out);
      rajada(tt, 0.004, out, { f: 5000, vol: 0.1 * a, tau: 0.0015 });
      tt += R(0.03, 0.1);
    }
  },
  poeira(t, k = 1) {
    const out = saida({ bus: 'dist', rev: 0.5, vol: 1.3 * k, pan: lado(), dist: R(0.2, 0.45) });
    const dur = R(0.6, 1.5), n = Math.floor(R(20, 45));
    for (let i = 0; i < n; i++) rajada(t + Math.pow(Math.random(), 1.5) * dur, 0.004, out, { f: R(2500, 5000), q: 1, vol: R(0.02, 0.07), tau: 0.0015 });
    for (let i = 0; i < 3; i++) modos(t + R(0.1, dur), [[R(1500, 2600), 0.05, 0.01]], out);
  },
  cano(t) {
    const c = contexto();
    const out = saida({ bus: 'dist', rev: 0.75, vol: R(0.3, 0.45), pan: lado(), dist: R(0.35, 0.55) });
    const dur = R(2, 4), f = R(62, 110);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const lfo = c.createOscillator(); lfo.frequency.value = R(0.2, 0.45);
    const lg = c.createGain(); lg.gain.value = f * 0.05; lfo.connect(lg); lg.connect(o.frequency);
    const env = c.createGain(); asr(env.gain, t, 0.5, 0.8, dur, 1); env.connect(out);
    for (const [m, q, a] of [[2, 4, 1], [5, 6, 0.5], [9, 8, 0.2]]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * m; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = a * 2; o.connect(bp); bp.connect(g); g.connect(env);
    }
    o.start(t); o.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
    modos(t + dur * R(0.6, 0.9), [[R(380, 520), 0.12, 0.25], [R(1050, 1400), 0.05, 0.12]], out);  // estalo do cano dilatando
  },
  passos(t) {
    const pan = lado() * 0.8, dist = R(0.65, 0.8);
    const n = Math.floor(R(3, 7)), dt = R(0.55, 0.75);
    for (let k = 0; k < n; k++) passo('madeira', { t: t + k * dt * R(0.95, 1.05), pesado: true, pan, dist, vol: 0.7, bus: 'dist' });
  },
};

// estalinhos da chama do lampião (curtos, agudos baixinhos)
function estalo(t) {
  const out = saida({ bus: 'amb', rev: 0.15, vol: R(0.3, 0.6), pan: R(-0.3, 0.3) });
  const n = Math.random() < 0.3 ? 2 : 1;
  for (let k = 0; k < n; k++) rajada(t + k * R(0.01, 0.04), 0.004, out, { f: R(1500, 4000), q: 1.2, vol: R(0.04, 0.1), tau: 0.0015 });
}

// coração (aparece com a tensão)
function coracao(t, k) {
  const c = contexto();
  // sentido mais que ouvido: grave baixo + um "tum" abafado nos médios (que o celular toca)
  const out = saida({ bus: 'amb', rev: 0.08, vol: 0.08 + 0.1 * k });
  for (const [dt, a] of [[0, 1], [0.26, 0.65]]) {
    const tt = t + dt;
    for (const [f, m] of [[52, 0.75], [104, 0.6]]) {
      const o = c.createOscillator(); o.frequency.setValueAtTime(f * 1.15, tt); o.frequency.exponentialRampToValueAtTime(f, tt + 0.05);
      const g = c.createGain(); percussivo(g.gain, tt, 0.55 * a * m, 0.008, 0.055); o.connect(g); g.connect(out); o.start(tt); o.stop(tt + 0.5);
    }
    modos(tt, [[150, 0.42 * a, 0.03], [240, 0.22 * a, 0.02]], out, { varia: 0.01 });
    rajada(tt, 0.06, out, { tipo: 'marrom', filtro: 'lowpass', f: 220, vol: 0.4 * a, tau: 0.03 });
  }
}

// ---------------- camadas contínuas ----------------
function camadaAr(t, nivel) {
  const c = contexto();
  const s = c.createGain(); s.gain.value = 0;
  // ronco de porão entre 55 e 380 Hz (sem o subgrave que só pesa e o celular nem toca)
  const b = fonteRuido('marrom', t); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 55;
  const gb = c.createGain(); gb.gain.value = 0.55; b.connect(hp); hp.connect(lp); lp.connect(gb); gb.connect(s);
  const fontes = [b];
  for (const p of [-0.6, 0.6]) {                    // ar em estéreo
    const r = fonteRuido('rosa', t); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0.07; const pn = c.createStereoPanner ? c.createStereoPanner() : null;
    r.connect(bp); bp.connect(g); if (pn) { pn.pan.value = p; g.connect(pn); pn.connect(s); } else g.connect(s);
    fontes.push(r);
  }
  s.connect(M.amb);
  return { s, nivel: 0.07 * nivel, fontes };
}
function camadaPavor(t, { f, nivel }) {
  const c = contexto();
  const s = c.createGain(); s.gain.value = 0;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 1.2;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.037; const lg = c.createGain(); lg.gain.value = 110;
  lfo.connect(lg); lg.connect(lp.frequency);
  // saturação leve: cria harmônicos que um alto-falante pequeno consegue tocar
  const sat = c.createWaveShaper(); const curva = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curva[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  sat.curve = curva;
  const resp = c.createGain(); resp.gain.value = 0.75;                      // respiração lenta
  const rl = c.createOscillator(); rl.frequency.value = 0.071; const rg = c.createGain(); rg.gain.value = 0.25;
  rl.connect(rg); rg.connect(resp.gain);
  const fontes = [lfo, rl];
  for (const [mult, tipo, a] of [[1, 'sawtooth', 0.4], [1.0045, 'sawtooth', 0.4], [2.12, 'triangle', 0.22], [3.02, 'sine', 0.1]]) {
    const o = c.createOscillator(); o.type = tipo; o.frequency.value = f * mult;
    const g = c.createGain(); g.gain.value = a; o.connect(g); g.connect(lp); o.start(t); fontes.push(o);
  }
  // tira a fundamental depois da saturação: o pavor fica nos harmônicos (o ouvido "completa"
  // o grave que falta), audível em fone e celular sem virar estrondo
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95; hp.Q.value = 0.7;
  lp.connect(sat); sat.connect(hp); hp.connect(resp); resp.connect(s);
  const envio = c.createGain(); envio.gain.value = 0.3; s.connect(envio); envio.connect(M.rev);
  s.connect(M.amb);
  lfo.start(t); rl.start(t);
  return { s, nivel: 0.055 * nivel, fontes, filtro: lp };
}
function camadaVento(t, nivel) {
  const c = contexto();
  const s = c.createGain(); s.gain.value = 0;
  const r = fonteRuido('rosa', t);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 4;
  const rajadas = c.createGain(); rajadas.gain.value = 0.5;
  const pn = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
  r.connect(bp); bp.connect(rajadas); rajadas.connect(pn); pn.connect(s);
  const r2 = fonteRuido('rosa', t);                                        // assobio fino
  const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1100; bp2.Q.value = 22;
  const g2 = c.createGain(); g2.gain.value = 0.35; r2.connect(bp2); bp2.connect(g2); g2.connect(pn);
  const envio = c.createGain(); envio.gain.value = 0.5; s.connect(envio); envio.connect(M.rev);
  s.connect(M.amb);
  return { s, nivel: 0.33 * nivel, fontes: [r, r2], bp, bp2, rajadas, pn, g2 };
}
// chuva batendo na janela: gotas sintetizadas num laço de 4 s + o chiado de fundo
let bufChuva = null;
function camadaChuva(t, nivel) {
  const c = contexto();
  if (!bufChuva || bufChuva.sampleRate !== c.sampleRate) {
    const sr = c.sampleRate, n = sr * 4;
    bufChuva = c.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = bufChuva.getChannelData(ch);
      for (let k = 0; k < 2600; k++) {
        const i0 = Math.floor(Math.random() * n), f = R(1800, 6000), a = Math.pow(Math.random(), 2.5) * 0.5;
        const tau = R(0.0015, 0.006) * sr, w = (2 * Math.PI * f) / sr;
        for (let j = 0; j < tau * 5; j++) d[(i0 + j) % n] += a * Math.exp(-j / tau) * Math.sin(w * j);
      }
    }
  }
  const s = c.createGain(); s.gain.value = 0;
  const src = c.createBufferSource(); src.buffer = bufChuva; src.loop = true; src.start(t, Math.random() * 3);
  // do lado de dentro: o vidro abafa os agudos e sobra o "chuá" grave da chuva grossa
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
  const g = c.createGain(); g.gain.value = 0.8; src.connect(lp); lp.connect(g); g.connect(s);
  const ch = fonteRuido('rosa', t); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.4;
  const gc = c.createGain(); gc.gain.value = 0.5; ch.connect(bp); bp.connect(gc); gc.connect(s);
  s.connect(M.amb);
  return { s, nivel: 0.2 * nivel, fontes: [src, ch] };
}
// lâmpada fluorescente do hospital: zumbido de 120 Hz (rede de 60 Hz) com chiado elétrico
function camadaZumbido(t, nivel) {
  const c = contexto();
  const s = c.createGain(); s.gain.value = 0;
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120;
  for (const [f, q, a] of [[240, 3, 0.5], [360, 4, 0.3], [1200, 5, 0.06]]) {
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = c.createGain(); g.gain.value = a; o.connect(bp); bp.connect(g); g.connect(s);
  }
  const r = fonteRuido('branco', t); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 2;
  const am = c.createGain(); am.gain.value = 0; const q = c.createOscillator(); q.type = 'square'; q.frequency.value = 120;
  const qg = c.createGain(); qg.gain.value = 0.012; q.connect(qg); qg.connect(am.gain);
  r.connect(bp); bp.connect(am); am.connect(s);
  o.start(t); q.start(t);
  s.connect(M.amb);
  return { s, nivel: 0.032 * nivel, fontes: [o, q, r] };
}
function camadaFogo(t, nivel) {
  const c = contexto();
  const s = c.createGain(); s.gain.value = 0;
  const r = fonteRuido('rosa', t); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.5;
  r.connect(bp); bp.connect(s); s.connect(M.amb);
  return { s, nivel: 0.012 * nivel, fontes: [r] };
}

// ---------------- o ambiente ----------------
class Ambiente {
  constructor() { this.nome = null; this.perfil = null; this.camadas = []; this.ate = 0; this.tens = 0; this.tensAlvo = 0; this.proxCoracao = 0; }

  // troca de perfil: as camadas velhas somem em ~2 s enquanto as novas entram
  trocar(nome, t) {
    const c = contexto(); if (!c) return;
    const P = PERFIS[nome] || PERFIS.corredor;
    if (this.nome === nome) return;
    this.nome = nome; this.perfil = P;
    t = t ?? c.currentTime;
    sala(P.sala);
    for (const cam of this.camadas) {
      cam.s.gain.cancelScheduledValues(t);
      cam.s.gain.setTargetAtTime(0, t, 0.6);
      for (const f of cam.fontes) { try { f.stop(t + 4); } catch { /* */ } }
      setTimeout(() => { try { cam.s.disconnect(); } catch { /* */ } }, 6000);
    }
    this.camadas = [];
    const novas = [];
    if (P.ar) novas.push(camadaAr(t, P.ar));
    if (P.pavor) { this.pavor = camadaPavor(t, P.pavor); novas.push(this.pavor); } else this.pavor = null;
    if (P.vento) { this.vento = camadaVento(t, P.vento); novas.push(this.vento); } else this.vento = null;
    if (P.chuva) novas.push(camadaChuva(t, P.chuva));
    if (P.zumbido) novas.push(camadaZumbido(t, P.zumbido));
    if (P.fogo) novas.push(camadaFogo(t, P.fogo));
    for (const cam of novas) cam.s.gain.setTargetAtTime(cam.nivel, t + 0.2, 1.2);
    this.camadas = novas;
    this.tensAlvo = P.tensao || 0;
    this.ate = t + 0.5;   // primeiros eventos depois de meio segundo
  }

  tensao(v, t) { this.tensAlvo = Math.max(v, this.perfil?.tensao || 0); this.aplicarTensao(t ?? contexto().currentTime); }
  aplicarTensao(t) {
    this.tens += (this.tensAlvo - this.tens) * 0.35;
    if (Math.abs(this.tens - this.tensAlvo) < 0.02) this.tens = this.tensAlvo;
    if (this.pavor) {
      this.pavor.s.gain.setTargetAtTime(this.pavor.nivel * (1 + this.tens * 1.4), t, 0.8);
      this.pavor.filtro.frequency.setTargetAtTime(260 + this.tens * 260, t, 1);
    }
  }

  // sorteia o que acontece até tFim (no relógio do áudio)
  agendarAte(tFim) {
    const P = this.perfil; if (!P) return;
    const passo = 0.25;
    let t = this.ate;
    for (; t < tFim; t += passo) {
      const medo = 1 + this.tens * 1.5;
      for (const [ev, porMin] of Object.entries(P.ev || {})) {
        const k = ev === 'gemido' || ev === 'baque' || ev === 'passos' ? medo : 1;
        if (Math.random() < (porMin * k * passo) / 60) EVENTOS[ev](t + Math.random() * passo);
      }
      if (P.fogo && Math.random() < 0.9 * P.fogo * passo) estalo(t + Math.random() * passo);
      if (this.vento && Math.random() < passo / 3) {            // rajadas de vento mudando devagar
        this.vento.bp.frequency.setTargetAtTime(R(260, 850), t, R(0.8, 2));
        this.vento.rajadas.gain.setTargetAtTime(R(0.15, 1), t, R(0.6, 1.8));
        this.vento.bp2.frequency.setTargetAtTime(R(850, 1450), t, 2);
        this.vento.g2.gain.setTargetAtTime(Math.random() < 0.3 ? R(0.2, 0.5) : 0.02, t, 1.5);
        if (this.vento.pn.pan) this.vento.pn.pan.setTargetAtTime(R(-0.7, 0.7), t, 2.5);
      }
      if (this.tens > 0.25 && t >= this.proxCoracao) {
        coracao(t, this.tens);
        this.proxCoracao = t + 60 / (58 + 52 * this.tens);
      }
    }
    this.ate = t;
    this.aplicarTensao(tFim);
  }
}

export const ambiente = new Ambiente();
export const eventosDistantes = EVENTOS;
