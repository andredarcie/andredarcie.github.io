// Efeitos sonoros gerados por código, no lugar dos dois maiores arquivos de
// som do jogo (PLANO-MUSICA.md): mesmo nome no catálogo, então os eventos não
// mudam. Determinísticos (ruído com semente).
//   tiro       ← Audio/SE/magnum_fire.wav (357 KB): estalo em todo o espectro,
//                estrondo grave (30–80 Hz) e cauda de ~2 s que cai ~27 dB/s e
//                vai escurecendo (centroide de 1600 para 300 Hz).
//   teleporte  ← Audio/SE/Teleport.ogg (70 KB): ruído que cresce até ~1 s,
//                um "vush" agudo entre 0,8 e 1,2 s, e uma cauda longa com
//                filtro em pente varrendo (flanger) e um zumbido de ~70 Hz.
import { aleatorio } from './sintese.js';

// passa-baixa de um polo com corte variável (fc em Hz por amostra)
const coef = (fc, sr) => 1 - Math.exp((-2 * Math.PI * fc) / sr);

function normalizar(canais, pico) {
  let m = 0;
  for (const c of canais) for (const v of c) m = Math.max(m, Math.abs(v));
  const g = pico / (m || 1);
  for (const c of canais) for (let i = 0; i < c.length; i++) c[i] *= g;
}

function buffer(canais, sr) {
  const b = new AudioBuffer({ numberOfChannels: canais.length, length: canais[0].length, sampleRate: sr });
  canais.forEach((c, i) => b.getChannelData(i).set(c));
  return b;
}

export function tiro() {
  const sr = 32000, n = Math.round(2.1 * sr);
  const canais = [new Float32Array(n), new Float32Array(n)];
  canais.forEach((saida, lado) => {
    const sorte = aleatorio(31 + lado);
    let lp = 0, lp2 = 0, marrom = 0, hpAnt = 0, hp = 0, fase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const branco = sorte() * 2 - 1;
      // corpo: ruído com passa-baixa que fecha (escurece); patamar de ~0,15 s
      // e queda de ~30 dB/s, sumindo antes dos 2,1 s
      const fc = 3800 * Math.exp(-t / 0.5) + 420;
      lp += coef(fc, sr) * (branco - lp);
      lp2 += coef(fc * 1.3, sr) * (lp - lp2);
      const queda = t < 0.12 ? 1 : Math.exp(-3.3 * (t - 0.12));
      const fim = Math.min(1, (2.08 - t) / 0.25);
      const corpo = lp2 * queda * fim * 4;
      // estalo: os primeiros milissegundos, brilhantes (passa-alta)
      hp = 0.6 * (hp + branco - hpAnt); hpAnt = branco;
      const estalo = t < 0.012 ? hp * (1 - t / 0.012) * 0.45 : 0;
      // estrondo: seno que cai de 70 para 35 Hz
      const f = 35 + 35 * Math.exp(-t / 0.12);
      fase += (2 * Math.PI * f) / sr;
      const estrondo = Math.sin(fase) * Math.exp(-t / 0.22) * 0.3 * Math.min(1, t / 0.002);
      // ronco grave que demora a sumir
      marrom = (marrom + branco * 0.02) * 0.999;
      const ronco = marrom * Math.exp(-t / 0.3) * 0.8;
      saida[i] = corpo + estalo + estrondo + ronco;
    }
  });
  // o original é saturado (pico acima de 0 dBFS): soa cheio desde o primeiro
  // instante. Saturação suave (tanh) dá o mesmo peso
  normalizar(canais, 1);
  const k = 3.2, t = Math.tanh(k);
  for (const c of canais) for (let i = 0; i < c.length; i++) c[i] = Math.tanh(k * c[i]) / t;
  normalizar(canais, 0.95);
  return buffer(canais, sr);
}

export function teleporte() {
  const sr = 22050, n = Math.round(6 * sr);
  const saida = new Float32Array(n);
  const sorte = aleatorio(77);
  const linha = new Float32Array(Math.ceil(0.012 * sr));
  let lp = 0, lpVush = 0, hpAnt = 0, hp = 0, j = 0, fase = 0;
  // volume (dB) por tempo: sobe até ~1 s e cai até sumir aos 6 s
  const pontos = [[0, -48], [0.15, -24], [0.6, -17], [1.0, -10], [1.3, -11], [1.8, -17], [2.3, -25], [2.9, -33], [3.5, -40], [4.2, -50], [4.8, -60], [5.4, -75], [6, -100]];
  const volume = (t) => {
    let k = 1;
    while (k < pontos.length - 1 && pontos[k][0] < t) k++;
    const [t0, d0] = pontos[k - 1], [t1, d1] = pontos[k];
    return 10 ** ((d0 + (d1 - d0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))) / 20);
  };
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const branco = sorte() * 2 - 1;
    // brilho: claro no começo, escuro no meio, abre de leve no fim
    const fc = 900 * Math.exp(-t / 0.35) + 160 + 120 * Math.max(0, t - 4.8);
    lp += coef(fc, sr) * (branco - lp);
    // flanger: pente com atraso que varre devagar (as listras diagonais)
    const atraso = Math.round((0.0015 + 0.0085 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.32 * t))) * sr);
    const lido = linha[(j - atraso + linha.length) % linha.length];
    const pente = lp + 0.82 * lido;
    linha[j] = pente; j = (j + 1) % linha.length;
    // "vush" agudo entre 0,8 e 1,2 s
    hp = 0.92 * (hp + branco - hpAnt); hpAnt = branco;
    lpVush += coef(3200, sr) * (hp - lpVush);
    const v = Math.max(0, 1 - Math.abs(t - 1.0) / 0.2);
    const vush = lpVush * v * v * 0.55;
    // zumbido grave de ~70 Hz acompanhando
    fase += (2 * Math.PI * 70) / sr;
    const zumbido = Math.sin(fase) * 0.12;
    saida[i] = (pente * 0.6 + vush + zumbido) * volume(t);
  }
  normalizar([saida], 0.97);
  return buffer([saida], sr);
}
