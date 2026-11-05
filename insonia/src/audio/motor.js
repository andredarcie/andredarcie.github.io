// Motor de áudio: contexto, cadeia mestre, reverberação da sala e ruídos prontos.
// Tudo é sintetizado aqui; nada é gravado. A cadeia mestre é:
//   ambiente / efeitos / interface ─┐
//                                   ├─► passa-alta 30 Hz ─► compressor ─► limitador ─► volume ─► saída
//   reverberação (convolução) ──────┘
// O passa-alta tira o grave inaudível que só come margem (e faz alto-falante de celular distorcer).

let ctx = null;
let offline = false;
export const M = {};          // nós da cadeia mestre
let cacheRuido = {}, cacheIR = {};

export function contexto() { return ctx; }

// Cria (ou retoma) o contexto de áudio. Só funciona depois de um gesto do jogador.
export function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C({ latencyHint: 'interactive' }); } catch { ctx = new C(); }
    montar();
  }
  if (!offline && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Para renderizar fora do tempo real (revisão do áudio): usa um OfflineAudioContext.
export function usarContexto(c) {
  ctx = c; offline = true; cacheRuido = {}; cacheIR = {};
  for (const k of Object.keys(M)) delete M[k];
  montar();
}

export const agora = () => ctx.currentTime;
// Limpeza de nós com setTimeout (tempo real) só no jogo: na renderização offline ela dispararia
// antes/durante o render e cortaria camadas inteiras.
export function limparDepois(fn, ms) { if (!offline) setTimeout(fn, ms); }
export const pronto = () => !!ctx && (offline || ctx.state === 'running');

function montar() {
  const c = ctx;
  M.hp = c.createBiquadFilter(); M.hp.type = 'highpass'; M.hp.frequency.value = 30; M.hp.Q.value = 0.6;
  M.comp = c.createDynamicsCompressor();
  // só os efeitos mais fortes chegam no compressor; o ambiente fica abaixo dele (não "respira")
  M.comp.threshold.value = -16; M.comp.knee.value = 10; M.comp.ratio.value = 3;
  M.comp.attack.value = 0.01; M.comp.release.value = 0.3;
  M.lim = c.createDynamicsCompressor();
  M.lim.threshold.value = -3; M.lim.knee.value = 0; M.lim.ratio.value = 20;
  M.lim.attack.value = 0.002; M.lim.release.value = 0.12;
  M.volume = c.createGain(); M.volume.gain.value = 0.95;
  M.hp.connect(M.comp); M.comp.connect(M.lim); M.lim.connect(M.volume); M.volume.connect(c.destination);
  // barramentos
  for (const b of ['amb', 'fx', 'ui']) { M[b] = c.createGain(); M[b].connect(M.hp); }
  M.amb.gain.value = 0;   // o ambiente sobe devagar quando começa
  // eventos distantes (gota, rangido, baque...) ficam ~10 dB abaixo, dentro do ambiente
  M.dist = c.createGain(); M.dist.gain.value = 0.3; M.dist.connect(M.amb);
  // envio de reverberação
  M.rev = c.createGain();
  M.revSaida = c.createGain(); M.revSaida.connect(M.hp);
  M.conv = null; M.salaAtual = null;
  sala('media');
}

// ---------------- ruídos (um buffer de 4 s por cor, tocado de um ponto aleatório) ----------------
export function ruido(tipo = 'branco') {
  if (cacheRuido[tipo]) return cacheRuido[tipo];
  const sr = ctx.sampleRate, n = sr * 4;
  const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  if (tipo === 'branco') {
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } else if (tipo === 'rosa') {
    // filtro de Paul Kellet
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    }
  } else { // marrom
    let u = 0;
    for (let i = 0; i < n; i++) { u = (u + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = u; }
  }
  // normaliza e emenda o fim no começo (laço sem estalo)
  let pico = 0; for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(d[i]));
  const k = 0.9 / (pico || 1), x = Math.floor(sr * 0.05);
  for (let i = 0; i < n; i++) d[i] *= k;
  for (let i = 0; i < x; i++) { const a = i / x; d[n - x + i] = d[n - x + i] * (1 - a) + d[i] * a; }
  cacheRuido[tipo] = b;
  return b;
}

export function fonteRuido(tipo, t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = ruido(tipo); s.loop = true;
  s.start(t, Math.random() * 3.5);
  if (dur != null) s.stop(t + dur + 0.05);
  return s;
}

// ---------------- reverberação ----------------
// Resposta ao impulso sintética: reflexões iniciais + cauda de ruído que escurece com o tempo.
const SALAS = {
  pequena:  { rt: 0.75, brilho: 0.45, pre: 0.006, wet: 0.9 },
  media:    { rt: 1.4,  brilho: 0.42, pre: 0.012, wet: 0.9 },
  corredor: { rt: 2.1,  brilho: 0.38, pre: 0.02,  wet: 0.95 },
  grande:   { rt: 3.6,  brilho: 0.34, pre: 0.035, wet: 1 },
  ladrilho: { rt: 1.7,  brilho: 0.8,  pre: 0.008, wet: 0.9 },
  duto:     { rt: 0.55, brilho: 0.9,  pre: 0.003, wet: 0.8 },
  abafada:  { rt: 0.5,  brilho: 0.28, pre: 0.005, wet: 0.7 },
};

function respostaImpulso(P) {
  const sr = ctx.sampleRate, n = Math.ceil(sr * (P.rt + P.pre + 0.05));
  const b = ctx.createBuffer(2, n, sr);
  const p0 = Math.floor(P.pre * sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = p0; i < n; i++) {
      const t = (i - p0) / sr;
      const env = Math.exp((-6.9 * t) / P.rt);          // -60 dB em rt segundos
      const coef = Math.min(0.95, 0.04 + P.brilho * Math.exp((-2.5 * t) / P.rt));
      lp += coef * (Math.random() * 2 - 1 - lp);
      d[i] = lp * env;
    }
    // reflexões iniciais (diferentes em cada lado: dá largura)
    for (let k = 0; k < 9; k++) {
      const tt = P.pre + 0.004 + Math.random() * Math.min(0.09, P.rt * 0.08);
      const i = Math.floor(tt * sr);
      if (i < n) d[i] += (Math.random() < 0.5 ? -1 : 1) * 0.5 * Math.exp(-k * 0.35);
    }
    // entrada suave (sem estalo no começo da cauda)
    for (let i = p0; i < Math.min(n, p0 + 64); i++) d[i] *= (i - p0) / 64;
    // passa-alta (2 polos, ~160 Hz) na resposta: a cauda escura acumulava grave e fazia
    // baque e porta virarem estrondo; a sala fica nos médios, onde a gente ouve o espaço
    for (let passe = 0; passe < 2; passe++) {
      const rc = 1 / (2 * Math.PI * 160), a = rc / (rc + 1 / sr);
      let xa = 0, ya = 0;
      for (let i = 0; i < n; i++) { const x = d[i]; ya = a * (ya + x - xa); xa = x; d[i] = ya; }
    }
  }
  // normaliza a energia: o nível do molhado fica igual em toda sala
  let e = 0; for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) e += d[i] * d[i]; }
  const k = 0.35 / Math.sqrt(e / 2 || 1) * Math.sqrt(P.rt);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] *= k; }
  return b;
}

// Troca a acústica (no escuro da transição de mapa). As duas reverberações se cruzam em ~0,4 s.
export function sala(tipo) {
  if (!ctx || !SALAS[tipo] || M.salaAtual === tipo) return;
  M.salaAtual = tipo;
  const P = SALAS[tipo], t = ctx.currentTime;
  const conv = ctx.createConvolver();
  conv.normalize = false;
  conv.buffer = cacheIR[tipo] || (cacheIR[tipo] = respostaImpulso(P));
  const g = ctx.createGain(); g.gain.value = 0;
  M.rev.connect(conv); conv.connect(g); g.connect(M.revSaida);
  g.gain.setTargetAtTime(P.wet, t, 0.12);
  const velho = M.conv;
  if (velho) {
    velho.g.gain.setTargetAtTime(0, t, 0.12);
    limparDepois(() => { try { M.rev.disconnect(velho.conv); velho.conv.disconnect(); velho.g.disconnect(); } catch { /* */ } }, 5000);
  }
  M.conv = { conv, g };
}

// ---------------- amostras gravadas (CC0, em assets/sfx) ----------------
// Decodificadas uma vez; o AudioBuffer serve para qualquer contexto (inclusive o offline da revisão).
const amostras = {};
let pedidoAmostras = null;
const BASE_SFX = new URL('../../assets/sfx/', import.meta.url);
export function carregarAmostras(nomes) {
  if (pedidoAmostras || !ctx) return pedidoAmostras;
  const c = ctx;
  const decodifica = (ab) => new Promise((ok, erro) => { const p = c.decodeAudioData(ab, ok, erro); if (p && p.then) p.then(ok, erro); });
  pedidoAmostras = Promise.all(nomes.map(async (n) => {
    try {
      const r = await fetch(new URL(n + '.mp3', BASE_SFX));
      if (r.ok) amostras[n] = await decodifica(await r.arrayBuffer());
    } catch { /* fica no som sintetizado */ }
  }));
  return pedidoAmostras;
}
export const temAmostra = (n) => !!amostras[n];
// Toca uma amostra; dur corta com fade (para usar só um pedaço, como o arrastar do pé).
export function tocarAmostra(nome, t, out, { rate = 1, vol = 1, ini = 0, dur = null, fade = 0.08 } = {}) {
  const b = amostras[nome]; if (!b || !ctx) return false;
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol;
  if (dur) { g.gain.setValueAtTime(vol, t + Math.max(0, dur - fade)); g.gain.linearRampToValueAtTime(0, t + dur); }
  s.connect(g); g.connect(out);
  if (dur) s.start(t, ini, dur + 0.02); else s.start(t, ini);
  return true;
}

// ---------------- roteamento ----------------
// Cria a entrada de um som: volume → pan → barramento, com envio para a reverberação.
// dist (0 perto … 1 longe) abafa os agudos e põe mais sala no som.
export function saida({ bus = 'fx', pan = 0, rev = 0.25, vol = 1, dist = 0 } = {}) {
  const g = ctx.createGain(); g.gain.value = vol;
  let ult = g;
  if (dist > 0) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = 9000 * Math.pow(0.08, dist); f.Q.value = 0.5;
    ult.connect(f); ult = f;
  }
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    ult.connect(p); ult = p;
  }
  const seco = ctx.createGain(); seco.gain.value = 1 - dist * 0.6;
  ult.connect(seco); seco.connect(M[bus]);
  const envio = rev + dist * 0.5;
  if (envio > 0) { const s = ctx.createGain(); s.gain.value = envio; ult.connect(s); s.connect(M.rev); }
  return g;
}

// ---------------- primitivas ----------------
// Envelope percussivo: sobe em `a` e decai com constante de tempo `tau` (decaimento natural).
export function percussivo(param, t, pico, a, tau) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(pico, t + a);
  param.setTargetAtTime(0, t + a, tau);
}

// Envelope com ataque, sustentação e soltura lineares (para camadas e notas longas).
export function asr(param, t, pico, a, dur, r) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(pico, t + a);
  param.setValueAtTime(pico, t + Math.max(a, dur - r));
  param.linearRampToValueAtTime(0, t + dur);
}

// Síntese modal: senoides amortecidas (barras de metal, madeira, sinos). lista = [[freq, amp, tau], ...]
export function modos(t, lista, out, { ganho = 1, varia = 0.02 } = {}) {
  let fim = t;
  for (const [f, amp, tau] of lista) {
    const o = ctx.createOscillator();
    o.frequency.value = f * (1 + (Math.random() * 2 - 1) * varia);
    const g = ctx.createGain();
    percussivo(g.gain, t, amp * ganho, 0.0015, tau);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + tau * 7 + 0.05);
    fim = Math.max(fim, t + tau * 7);
  }
  return fim;
}

// Rajada de ruído filtrado (transientes, raspões, sopros).
export function rajada(t, dur, out, { tipo = 'branco', filtro = 'bandpass', f = 1000, q = 0.8, f2 = null, vol = 0.5, a = 0.002, tau = null } = {}) {
  const s = fonteRuido(tipo, t, dur + 0.3);
  const fl = ctx.createBiquadFilter(); fl.type = filtro; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  if (tau) percussivo(g.gain, t, vol, a, tau);
  else asr(g.gain, t, vol, a, dur, Math.min(dur * 0.6, 0.2));
  s.connect(fl); fl.connect(g); g.connect(out);
}

// Atrito "gruda-escorrega" (dobradiça, madeira, metal rangendo): trem de pulsos com taxa variável
// passando por ressonâncias. É o que dá o rangido realista em vez de um apito.
export function rangido(t, out, { dur = 0.8, r0 = 18, r1 = 45, forma = 'sobe', jitter = 0.35, freqs = [420, 860, 1500], q = 14, vol = 0.4, decai = 0.0012 } = {}) {
  const sr = ctx.sampleRate, n = Math.ceil(sr * dur);
  const b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
  const kmax = Math.floor(sr * decai * 6);
  let fase = 0, deriva = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    deriva += (Math.random() * 2 - 1) * 0.002; deriva *= 0.999;
    const base = forma === 'sobe' ? r0 + (r1 - r0) * u : forma === 'desce' ? r1 + (r0 - r1) * u : r0 + (r1 - r0) * Math.sin(Math.PI * u);
    fase += (base * (1 + deriva * 8) * (1 + (Math.random() - 0.5) * jitter)) / sr;
    if (fase >= 1) {
      fase -= 1;
      const amp = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6) * (0.6 + Math.random() * 0.4);
      for (let k = 0; k < kmax && i + k < n; k++) d[i + k] += amp * Math.exp(-k / (sr * decai)) * (k % 2 ? -0.6 : 1);
    }
  }
  const s = ctx.createBufferSource(); s.buffer = b;
  const g = ctx.createGain(); g.gain.value = vol;
  for (const [i, f] of freqs.entries()) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (1 + (Math.random() - 0.5) * 0.06); bp.Q.value = q;
    const gg = ctx.createGain(); gg.gain.value = 1 / (1 + i * 0.6);
    s.connect(bp); bp.connect(gg); gg.connect(g);
  }
  g.connect(out);
  s.start(t);
  return t + dur;
}
