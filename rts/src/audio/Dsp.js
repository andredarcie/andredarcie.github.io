// Ferramentas de síntese que escrevem direto em Float32Array, sem Web Audio: os
// sons são calculados amostra por amostra uma vez só e guardados prontos. Assim dá
// para usar o que um grafo de nós não oferece (ressonadores modais, corda de
// Karplus-Strong, filtro varrendo por amostra) e o jogo só toca buffers.
// Nada aqui toca no DOM, então roda igual no Node.

const TAU = Math.PI * 2;

// Gerador determinístico (mulberry32): cada variação de som nasce de uma semente.
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rand, min, max) => min + (max - min) * rand();
export const samples = (sr, seconds) => Math.max(1, Math.round(sr * seconds));

export function white(n, rand) {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
  return out;
}

// Rosa pelo filtro de Paul Kellet: energia igual por oitava, soa mais natural
// que o branco para vento, chuva e folha.
export function pink(n, rand) {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rand() * 2 - 1;
    b0 = .99886 * b0 + w * .0555179;
    b1 = .99332 * b1 + w * .0750759;
    b2 = .969 * b2 + w * .153852;
    b3 = .8665 * b3 + w * .3104856;
    b4 = .55 * b4 + w * .5329522;
    b5 = -.7616 * b5 - w * .016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11;
    b6 = w * .115926;
  }
  return out;
}

// Marrom (passeio aleatório com vazamento): estrondo, trovão, rolar de terra.
export function brown(n, rand) {
  const out = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = (last + .02 * (rand() * 2 - 1)) / 1.02;
    out[i] = last * 3.5;
  }
  return out;
}

// Biquad do livro de receitas do RBJ, com troca de frequência a qualquer momento.
export class Biquad {
  #sr; #type; #b0 = 1; #b1 = 0; #b2 = 0; #a1 = 0; #a2 = 0;
  #x1 = 0; #x2 = 0; #y1 = 0; #y2 = 0;

  constructor(type, sr, frequency, q = Math.SQRT1_2, gainDb = 0) {
    this.#type = type;
    this.#sr = sr;
    this.set(frequency, q, gainDb);
  }

  set(frequency, q = Math.SQRT1_2, gainDb = 0) {
    const f = Math.min(Math.max(frequency, 10), this.#sr * .49);
    const w = TAU * f / this.#sr;
    const cos = Math.cos(w), alpha = Math.sin(w) / (2 * Math.max(q, .05));
    const A = 10 ** (gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (this.#type) {
      case 'highpass': b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
      case 'bandpass': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha; break;
      case 'peak': b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A; break;
      default: b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    }
    this.#b0 = b0 / a0; this.#b1 = b1 / a0; this.#b2 = b2 / a0; this.#a1 = a1 / a0; this.#a2 = a2 / a0;
  }

  tick(x) {
    const y = this.#b0 * x + this.#b1 * this.#x1 + this.#b2 * this.#x2 - this.#a1 * this.#y1 - this.#a2 * this.#y2;
    this.#x2 = this.#x1; this.#x1 = x;
    this.#y2 = this.#y1; this.#y1 = y;
    return y;
  }
}

// Filtro fixo, no lugar.
export function filter(data, type, sr, frequency, q, gainDb) {
  const f = new Biquad(type, sr, frequency, q, gainDb);
  for (let i = 0; i < data.length; i++) data[i] = f.tick(data[i]);
  return data;
}

// Filtro com a frequência seguindo uma curva no tempo: `frequencyAt(segundos)`.
// Recalcula a cada 16 amostras, fino o bastante para varredura sem degrau.
export function sweep(data, type, sr, frequencyAt, q) {
  const f = new Biquad(type, sr, frequencyAt(0), q);
  for (let i = 0; i < data.length; i++) {
    if ((i & 15) === 0) f.set(frequencyAt(i / sr), q);
    data[i] = f.tick(data[i]);
  }
  return data;
}

// Envelope por função do tempo, no lugar.
export function shape(data, sr, gainAt) {
  for (let i = 0; i < data.length; i++) data[i] *= gainAt(i / sr);
  return data;
}

// Subida curta e queda exponencial: o formato de quase todo golpe.
export const hit = (attack, decay) => t => t < attack ? t / attack : Math.exp(-(t - attack) / decay);

export function mix(target, source, at = 0, gain = 1) {
  const start = Math.max(0, Math.round(at));
  const end = Math.min(target.length, start + source.length);
  for (let i = start; i < end; i++) target[i] += source[i - start] * gain;
  return target;
}

// Banco de modos: senoides amortecidas, cada uma {f, a, d} (frequência, amplitude,
// tempo até cair a 1/e). É o que faz madeira, metal e sino soarem como objeto, e
// não como apito. `beat` desdobra cada modo em par levemente desafinado, que é o
// batimento lento de sino de verdade.
export function modes(target, sr, at, list, { gain = 1, attack = .0006, rand = Math.random, beat = 0 } = {}) {
  const start = Math.max(0, Math.round(at * sr));
  for (const mode of list) {
    if (mode.f >= sr * .45) continue;
    const pairs = beat ? [[mode.f - beat * .5, .5], [mode.f + beat * .5, .5]] : [[mode.f, 1]];
    const end = Math.min(target.length, start + Math.ceil(mode.d * 7 * sr));
    for (const [frequency, share] of pairs) {
      // Fasor girando com o decaimento embutido: uma multiplicação complexa por
      // amostra em vez de Math.sin, o que torna sino de oito segundos barato.
      const step = TAU * frequency / sr;
      const fall = Math.exp(-1 / (mode.d * sr));
      const cos = Math.cos(step) * fall, sin = Math.sin(step) * fall;
      const rise = Math.max(1, attack * sr);
      const phase = rand() * TAU, level = mode.a * share * gain;
      let re = Math.cos(phase) * level, im = Math.sin(phase) * level;
      for (let i = start, k = 0; i < end; i++, k++) {
        target[i] += im * (k < rise ? k / rise : 1);
        const next = re * cos - im * sin;
        im = re * sin + im * cos;
        re = next;
      }
    }
  }
  return target;
}

// Corda dedilhada (Karplus-Strong estendido): ruído filtrado no atraso realimentado,
// com afinação fracionária por all-pass. `bright` é a força da palheta, `damp` o
// quanto a corda perde agudo por volta (abafado ↔ aberto).
export function pluck(sr, frequency, seconds, rand, { bright = .55, damp = .5, decay = 1 } = {}) {
  const n = samples(sr, seconds);
  const out = new Float32Array(n);
  // Filtro da volta: média ponderada entre amostra atual e anterior. s = 0 não
  // filtra (corda aberta), s = .5 é o passa-baixa clássico (abafada). Ele atrasa
  // `s` amostras, e o all-pass completa a fração para a nota sair afinada.
  const s = .05 + damp * .45;
  const period = sr / frequency;
  let delay = Math.floor(period - s);
  let frac = period - s - delay;
  if (frac < .1) { delay -= 1; frac += 1; }
  const allpass = (1 - frac) / (1 + frac);
  const line = new Float32Array(Math.max(2, delay));
  // Excitação: ruído passado num passa-baixa de um polo; palhetada forte = mais agudo.
  let lp = 0;
  const pick = .15 + bright * .8;
  for (let i = 0; i < line.length; i++) {
    lp += pick * ((rand() * 2 - 1) - lp);
    line[i] = lp;
  }
  // Perda por volta ajustada para a nota durar `decay` segundos até -60 dB.
  const loopsPerSecond = frequency;
  const loss = Math.pow(.001, 1 / Math.max(1, decay * loopsPerSecond));
  let index = 0, previous = 0, apIn = 0, apOut = 0;
  for (let i = 0; i < n; i++) {
    const current = line[index];
    const averaged = ((1 - s) * current + s * previous) * loss;
    previous = current;
    const tuned = allpass * averaged + apIn - allpass * apOut;
    apIn = averaged;
    apOut = tuned;
    line[index] = tuned;
    out[i] = current;
    index = index + 1 >= line.length ? 0 : index + 1;
  }
  return out;
}

// Saturação suave: dá corpo e segura pico sem estalar.
export function saturate(data, drive = 1.5) {
  const norm = 1 / Math.tanh(drive);
  for (let i = 0; i < data.length; i++) data[i] = Math.tanh(data[i] * drive) * norm;
  return data;
}

// Cortes de borda em cosseno, para nenhum buffer começar ou acabar em degrau.
export function fade(data, sr, fadeIn = .001, fadeOut = .02) {
  const a = Math.min(data.length, samples(sr, fadeIn));
  const b = Math.min(data.length, samples(sr, fadeOut));
  for (let i = 0; i < a; i++) data[i] *= .5 - .5 * Math.cos(Math.PI * i / a);
  for (let i = 0; i < b; i++) data[data.length - 1 - i] *= .5 - .5 * Math.cos(Math.PI * i / b);
  return data;
}

// Eco de encosta: cópia atrasada, abafada e mais baixa do próprio som.
export function echo(data, sr, delaySeconds, gain, cutoff = 1800) {
  const copy = filter(Float32Array.from(data), 'lowpass', sr, cutoff, .6);
  return mix(data, copy, delaySeconds * sr, gain);
}

export function peak(...channels) {
  let max = 0;
  for (const c of channels) for (let i = 0; i < c.length; i++) max = Math.max(max, Math.abs(c[i]));
  return max;
}

export function normalize(target, ...channels) {
  const max = peak(...channels);
  if (max > 0) for (const c of channels) for (let i = 0; i < c.length; i++) c[i] *= target / max;
}

// Estéreo de um mono: o lado direito é o mesmo som com um atraso de fração de
// milissegundo e filtragem diferente, abrindo a imagem sem soar como dois sons.
export function widen(mono, sr, amount = .35) {
  const l = Float32Array.from(mono);
  const r = Float32Array.from(mono);
  const shift = Math.round(sr * .0007);
  const side = new Float32Array(mono.length);
  for (let i = shift; i < mono.length; i++) side[i] = mono[i - shift];
  filter(side, 'highpass', sr, 500, .7);
  for (let i = 0; i < mono.length; i++) { l[i] += side[i] * amount; r[i] -= side[i] * amount; }
  return { l, r };
}

// Resposta ao impulso de campo aberto: reflexões esparsas de chão, parede de taipa
// e encosta nos primeiros 90 ms, depois cauda difusa que escurece com o tempo,
// como o ar e o mato engolem o agudo. Canais com ruído próprio = estéreo largo.
export function outdoorImpulse(sr, seconds = 1.8, seed = 7) {
  const rand = random(seed);
  const n = samples(sr, seconds);
  const channels = [];
  for (let c = 0; c < 2; c++) {
    const data = new Float32Array(n);
    for (let k = 0; k < 9; k++) {
      const at = Math.round(sr * between(rand, .008, .09));
      data[at] += (rand() < .5 ? -1 : 1) * between(rand, .25, .6) * (1 - at / (sr * .12));
    }
    const tail = white(n, rand);
    const lowpass = new Biquad('lowpass', sr, 9000, .5);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if ((i & 31) === 0) lowpass.set(9000 * Math.exp(-t * 2.6) + 500, .5);
      const onset = Math.min(1, t / .025);
      data[i] += lowpass.tick(tail[i]) * onset * Math.exp(-t * 3.4) * .5;
    }
    fade(data, sr, 0, .2);
    channels.push(data);
  }
  normalize(.8, ...channels);
  return { l: channels[0], r: channels[1] };
}
