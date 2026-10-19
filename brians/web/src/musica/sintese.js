// Síntese das músicas geradas (PLANO-MUSICA.md), amostra a amostra em JS:
// tabelas de onda, filtros biquad, envelopes, glide e vibrato, ruído, um eco
// com realimentação e um reverb algorítmico (Freeverb). Bem mais rápido que um
// grafo de milhares de nós do WebAudio, e determinístico (ruído com semente).
// As faixas chamam nota/sino/ruido/bumbo durante compor(): isso só anota o
// evento; o render (render.js) sintetiza em pedaços, sem travar o jogo.
// Cada nota é gerada num buffer próprio e mixada de uma vez; notas iguais
// (mesma altura, timbre, envelope e duração) são geradas uma vez só (cache).

export const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// gerador pseudoaleatório com semente (mulberry32)
export function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- tabelas de onda
const TAM = 2048;
const tabelas = new Map();
const RECEITAS = {
  sine: (n) => (n === 1 ? 1 : 0),
  triangle: (n) => (n % 2 ? ((n - 1) / 2 % 2 ? -1 : 1) / (n * n) : 0),
  square: (n) => (n % 2 ? 1 / n : 0),
  sawtooth: (n) => 1 / n,
};

// tabela limitada em banda: só harmônicos abaixo de Nyquist para a frequência
function tabela(receita, freq, sr) {
  const max = Math.max(1, Math.min(64, Math.floor(sr / 2 / freq)));
  const nh = Array.isArray(receita) ? Math.min(receita.length, max) : max;
  const chave = `${Array.isArray(receita) ? receita.join(',') : receita}|${nh}`;
  let t = tabelas.get(chave);
  if (!t) {
    t = new Float32Array(TAM + 1);
    let pico = 0;
    for (let n = 1; n <= nh; n++) {
      const a = Array.isArray(receita) ? receita[n - 1] : RECEITAS[receita](n);
      if (!a) continue;
      for (let i = 0; i <= TAM; i++) t[i] += a * Math.sin((2 * Math.PI * n * i) / TAM);
    }
    for (let i = 0; i <= TAM; i++) pico = Math.max(pico, Math.abs(t[i]));
    for (let i = 0; i <= TAM; i++) t[i] /= pico || 1;
    tabelas.set(chave, t);
  }
  return t;
}
const SENO = tabela('sine', 1, 2);

// ---------------------------------------------------------------- biquad (RBJ)
function coeficientes(tipo, f, q, sr) {
  const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
  let b0, b1, b2;
  if (tipo === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (tipo === 'highpass') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - al) / a0];
}

// ---------------------------------------------------------------- mesa
// Canais = ganhos (volume, pan, envios de reverb e eco). Depois das notas:
// eco → reverb → saída estéreo.
export class Mesa {
  constructor(sr, amostras, { reverb = { segundos: 2, brilho: 0.5 }, eco = null, semente = 1 } = {}) {
    this.sr = sr; this.n = amostras;
    this.sorte = aleatorio(semente);
    this.esq = new Float32Array(amostras); this.dir = new Float32Array(amostras);
    this.envReverb = new Float32Array(amostras);
    this.envEco = eco ? new Float32Array(amostras) : null;
    this.cfgReverb = reverb; this.cfgEco = eco;
    this.eventos = [];
    this.cache = new Map();
  }

  canal({ volume = 1, pan = 0, reverb = 0.2, eco = 0 } = {}) {
    const a = ((pan + 1) * Math.PI) / 4;
    return { e: volume * Math.cos(a) * Math.SQRT2, d: volume * Math.sin(a) * Math.SQRT2, rev: volume * reverb, eco: this.envEco ? volume * eco : 0 };
  }

  // mixa um som mono (buf, desde a amostra 0) a partir de `inicio`
  mixar(canal, buf, inicio) {
    const fim = Math.min(this.n, inicio + buf.length), { esq, dir, envReverb, envEco } = this;
    const { e, d, rev, eco } = canal;
    for (let i = inicio, k = 0; i < fim; i++, k++) { const v = buf[k]; esq[i] += v * e; dir[i] += v * d; }
    if (rev) for (let i = inicio, k = 0; i < fim; i++, k++) envReverb[i] += buf[k] * rev;
    if (eco) for (let i = inicio, k = 0; i < fim; i++, k++) envEco[i] += buf[k] * eco;
  }

  // eco (linha de atraso com realimentação e passa-baixa) e reverb, em pedaços
  *efeitos() {
    const { sr, n, esq, dir, envReverb, envEco } = this;
    if (envEco) {
      const atraso = Math.round(this.cfgEco.tempo * sr), volta = this.cfgEco.retorno;
      const k = 1 - Math.exp((-2 * Math.PI * (this.cfgEco.corte ?? 2500)) / sr);
      const linha = new Float32Array(atraso);
      let lp = 0, j = 0;
      for (let i = 0; i < n; i++) {
        lp += k * (linha[j] - lp);
        linha[j] = envEco[i] + lp * volta;
        if (++j === atraso) j = 0;
        // o eco vai para os dois lados e alimenta o reverb
        esq[i] += lp * 0.9; dir[i] += lp * 0.9;
        envReverb[i] += lp * 0.4;
      }
      yield;
    }
    yield* freeverb(this);
  }
}

// Freeverb (Jezar): 8 pentes com amortecimento em paralelo + 4 passa-tudo em
// série, por lado. Cada filtro roda sozinho sobre o buffer inteiro (laços
// curtos e rápidos no JIT).
function* freeverb(mesa) {
  const { sr, n, cfgReverb } = mesa;
  const esc = sr / 44100;
  const PENTES = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], TUDO = [556, 441, 341, 225], ABRE = 23;
  const sala = Math.min(0.97, 0.7 + 0.27 * Math.min(1, cfgReverb.segundos / 4));
  const amort = 0.2 + 0.6 * (1 - cfgReverb.brilho), seco = 1 - amort;
  const entrada = new Float32Array(n);
  for (let i = 0; i < n; i++) entrada[i] = mesa.envReverb[i] * 0.03;
  const soma = new Float32Array(n);
  for (const [lado, extra] of [[mesa.esq, 0], [mesa.dir, ABRE]]) {
    soma.fill(0);
    for (const p of PENTES) {
      const tam = Math.round((p + extra) * esc), b = new Float32Array(tam);
      let j = 0, f = 0;
      for (let i = 0; i < n; i++) {
        const y = b[j];
        f = y * seco + f * amort;
        b[j] = entrada[i] + f * sala;
        if (++j === tam) j = 0;
        soma[i] += y;
      }
      yield;
    }
    for (const p of TUDO) {
      const tam = Math.round((p + extra) * esc), b = new Float32Array(tam);
      let j = 0;
      for (let i = 0; i < n; i++) {
        const y = b[j], s = soma[i];
        b[j] = s + y * 0.5;
        if (++j === tam) j = 0;
        soma[i] = y - s;
      }
    }
    for (let i = 0; i < n; i++) lado[i] += soma[i];
    yield;
  }
}

// ---------------------------------------------------------------- envelope
// igual ao do WebAudio: ataque linear, queda e soltura exponenciais
function envelopeEm(t, dur, a, d, s, r, nivelSoltura) {
  if (t < a) return t / a;
  if (t < dur) return s + (1 - s) * Math.exp(-(t - a) / Math.max(0.001, d / 3));
  return nivelSoltura * Math.exp(-(t - dur) / Math.max(0.001, r / 4));
}

// ---------------------------------------------------------------- vozes (anotadas)
export function nota(mesa, canal, opcoes) { mesa.eventos.push([gerarNota, canal, opcoes, true]); }
export function sino(mesa, canal, opcoes) { mesa.eventos.push([gerarSino, canal, opcoes, true]); }
export function ruido(mesa, canal, opcoes) { mesa.eventos.push([gerarRuido, canal, opcoes, false]); }
export function bumbo(mesa, canal, opcoes) { mesa.eventos.push([gerarBumbo, canal, opcoes, true]); }
// ruído marrom contínuo (vento, ronco): filtro que abre e fecha devagar
// entre `de` e `ate` Hz e tremor irregular no volume
export function vento(mesa, canal, opcoes) { mesa.eventos.push([gerarVento, canal, opcoes, false]); }

function gerarVento(mesa, { dur, vol = 0.3, de = 120, ate = 350, periodo = 5, tremor = 0.4 }) {
  const { sr } = mesa;
  const buf = new Float32Array(Math.ceil(dur * sr));
  let marrom = 0, lp = 0, hp = 0, alvo = 1, nivel = 1;
  const kHp = 1 - Math.exp((-2 * Math.PI * 35) / sr);   // corta o que fica abaixo de ~35 Hz (ninguém ouve)
  for (let j = 0; j < buf.length; j++) {
    const tl = j / sr;
    marrom = (marrom + (mesa.sorte() * 2 - 1) * 0.05) * 0.996;   // ruído marrom (integrado, com vazamento)
    const fc = de + (ate - de) * (0.5 + 0.5 * Math.sin((2 * Math.PI * tl) / periodo) * Math.sin((2 * Math.PI * tl) / (periodo * 2.7)));
    lp += (1 - Math.exp((-2 * Math.PI * fc) / sr)) * (marrom - lp);
    if ((j & 1023) === 0) alvo = 1 - tremor * mesa.sorte();      // tremor irregular
    nivel += (alvo - nivel) * 0.0006;
    const borda = Math.min(1, tl / 0.05, (dur - tl) / 0.05);       // sem clique nas pontas
    hp += kHp * (lp - hp);
    buf[j] = (lp - hp) * nivel * vol * borda;
  }
  return buf;
}

// sintetiza (ou reaproveita do cache) e mixa no canal
export function tocarEvento(mesa, [gerar, canal, opcoes, cacheavel]) {
  const { t, ...resto } = opcoes;
  let buf;
  if (cacheavel) {
    const chave = `${gerar.name}|${JSON.stringify(resto)}`;
    buf = mesa.cache.get(chave);
    if (!buf) { buf = gerar(mesa, resto); mesa.cache.set(chave, buf); }
  } else buf = gerar(mesa, resto);
  mesa.mixar(canal, buf, Math.round(t * mesa.sr));
}

function gerarNota(mesa, { dur, midi, vol = 0.3, tipo = 'triangle', harmonicos = null, env = {},
  filtro = null, glide = 0, vibrato = null, desafina = 0 }) {
  const { sr } = mesa;
  const a = env.a ?? 0.005, d = env.d ?? 0.1, s = env.s ?? 0.7, r = env.r ?? 0.1;
  const buf = new Float32Array(Math.ceil((dur + r * 1.5) * sr));
  const f0 = hz(midi) * 2 ** (desafina / 1200);
  const tab = tabela(harmonicos ?? tipo, f0 * (glide > 0 ? 2 ** (glide / 12) : 1), sr);
  const nivelSoltura = envelopeEm(dur, dur + 1, a, d, s, r, 0);
  // envelope incremental (sem exp por amostra): queda e soltura multiplicativas
  const kq = Math.exp(-1 / (Math.max(0.001, d / 3) * sr)), ks = Math.exp(-1 / (Math.max(0.001, r / 4) * sr));
  const amostrasA = a * sr, amostrasDur = dur * sr;
  let gq = 1, gs = nivelSoltura;
  let fase = 0, passo = 0, z1 = 0, z2 = 0, cf = null;
  for (let k = 0; k < buf.length; k++) {
    const tl = k / sr;
    if ((k & 31) === 0) {
      // altura (glide linear em cents + vibrato) e filtro, atualizados a cada 32 amostras
      let cents = glide ? (Math.min(tl, dur) / dur) * glide * 100 : 0;
      if (vibrato) cents += vibrato.cents * Math.min(1, tl / (vibrato.atraso ?? 0.2)) * Math.sin(2 * Math.PI * vibrato.freq * tl);
      passo = (f0 * 2 ** (cents / 1200) * TAM) / sr;
      if (filtro) {
        const de = filtro.de ?? filtro.freq;
        const fc = filtro.para ? filtro.para + (de - filtro.para) * Math.exp(-tl / (filtro.tempo ?? 0.08)) : de;
        if (!cf || filtro.para) cf = coeficientes(filtro.tipo ?? 'lowpass', fc, filtro.q ?? 0.7, sr);
      }
    }
    const p = fase | 0;
    let v = tab[p] + (tab[p + 1] - tab[p]) * (fase - p);
    fase += passo;
    if (fase >= TAM) fase -= TAM;
    if (cf) {
      const y = cf[0] * v + z1;
      z1 = cf[1] * v - cf[3] * y + z2;
      z2 = cf[2] * v - cf[4] * y;
      v = y;
    }
    let e;
    if (k < amostrasA) e = k / amostrasA;
    else if (k < amostrasDur) { e = s + (1 - s) * gq; gq *= kq; } else { e = gs; gs *= ks; }
    buf[k] = v * e * vol;
  }
  return buf;
}

function gerarSino(mesa, { midi, vol = 0.2, parciais, desafina = 0 }) {
  const { sr } = mesa;
  const f0 = hz(midi) * 2 ** (desafina / 1200);
  const maior = Math.max(...parciais.map((p) => p[2]));
  const buf = new Float32Array(Math.ceil(maior * 1.6 * sr));
  for (const [razao, amp, queda] of parciais) {
    const f = f0 * razao;
    if (f >= sr / 2) continue;
    const fim = Math.min(buf.length, Math.ceil(queda * 1.6 * sr));
    const passo = (f * TAM) / sr, k = Math.exp(-1 / ((queda / 4) * sr));
    let fase = 0, env = vol * amp;
    for (let j = 0; j < fim; j++) {
      buf[j] += SENO[fase | 0] * env * (j < 64 ? j / 64 : 1);
      env *= k;
      fase += passo;
      if (fase >= TAM) fase -= TAM;
    }
  }
  return buf;
}

function gerarRuido(mesa, { dur = 0.05, vol = 0.2, tipo = 'highpass', freq = 6000, q = 0.8, a = 0.001 }) {
  const { sr } = mesa;
  const buf = new Float32Array(Math.ceil((dur * 2 + 0.02) * sr));
  const cf = coeficientes(tipo, freq, q, sr);
  let z1 = 0, z2 = 0;
  for (let j = 0; j < buf.length; j++) {
    const tl = j / sr;
    const x = mesa.sorte() * 2 - 1;
    const y = cf[0] * x + z1;
    z1 = cf[1] * x - cf[3] * y + z2;
    z2 = cf[2] * x - cf[4] * y;
    buf[j] = y * (tl < a ? tl / a : Math.exp(-(tl - a) / (dur / 3))) * vol;
  }
  return buf;
}

function gerarBumbo(mesa, { vol = 0.5, de = 120, para = 45, dur = 0.25 }) {
  const { sr } = mesa;
  const buf = new Float32Array(Math.ceil(dur * 1.5 * sr));
  let fase = 0;
  for (let j = 0; j < buf.length; j++) {
    const tl = j / sr;
    const f = para + (de - para) * Math.exp(-tl / (dur * 0.2));
    buf[j] = SENO[fase | 0] * (tl < 0.003 ? tl / 0.003 : Math.exp(-(tl - 0.003) / (dur / 4))) * vol;
    fase += (f * TAM) / sr;
    if (fase >= TAM) fase -= TAM;
  }
  return buf;
}
