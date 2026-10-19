// Kit de instrumentos das faixas geradas: atalhos sobre nota/sino/ruido/bumbo
// (sintese.js) com timbres prontos. Todos: (mesa, canal, t, midi, dur, vol).
import { nota, sino, ruido, bumbo } from './sintese.js';
import { m } from './partitura.js';

export const kit = {
  // barra de madeira (marimba): parciais 1, ~3,9 e ~9,2, queda curta
  marimba: (mesa, canal, t, midi, _dur, vol = 0.12) => sino(mesa, canal, { t, midi, vol, parciais: [[1, 1, 0.55], [3.93, 0.28, 0.12], [9.2, 0.07, 0.04]] }),
  // celesta / sino pequeno
  celesta: (mesa, canal, t, midi, _dur, vol = 0.08) => sino(mesa, canal, { t, midi, vol, parciais: [[1, 1, 1.1], [2, 0.3, 0.55], [3, 0.14, 0.35], [4.2, 0.08, 0.18]] }),
  // corda pinçada (harpa, violão): queda e filtro que fecha
  pincado: (mesa, canal, t, midi, dur, vol = 0.12) => nota(mesa, canal, { t, dur, midi, vol, harmonicos: [1, 0.5, 0.33, 0.25, 0.2, 0.15, 0.1],
    env: { a: 0.002, d: 0.3, s: 0.15, r: 0.15 }, filtro: { tipo: 'lowpass', de: 3500, para: 700, tempo: 0.1, q: 0.8 } }),
  // flauta / ocarina: quase senoidal, vibrato que entra devagar
  flauta: (mesa, canal, t, midi, dur, vol = 0.12) => nota(mesa, canal, { t, dur, midi, vol, harmonicos: [1, 0.12, 0.1, 0.03],
    env: { a: 0.03, d: 0.2, s: 0.8, r: 0.15 }, vibrato: { freq: 5.2, cents: 14, atraso: 0.35 } }),
  // baixo redondo, curto
  baixo: (mesa, canal, t, midi, dur, vol = 0.22) => nota(mesa, canal, { t, dur, midi, vol, harmonicos: [1, 0.45, 0.18, 0.08],
    env: { a: 0.005, d: 0.25, s: 0.5, r: 0.08 }, filtro: { tipo: 'lowpass', freq: 700, q: 0.7 } }),
  // cordas (pad): dente de serra filtrado, ataque lento
  cordas: (mesa, canal, t, midi, dur, vol = 0.05, desafina = 0) => nota(mesa, canal, { t, dur, midi, vol, tipo: 'sawtooth', desafina,
    env: { a: 0.35, d: 0.5, s: 0.8, r: 0.7 }, filtro: { tipo: 'lowpass', freq: 1400, q: 0.5 }, vibrato: { freq: 4.8, cents: 6, atraso: 0.6 } }),
  // chip: onda quadrada curta (videogame)
  chip: (mesa, canal, t, midi, dur, vol = 0.06) => nota(mesa, canal, { t, dur, midi, vol, tipo: 'square',
    env: { a: 0.002, d: 0.08, s: 0.6, r: 0.04 } }),
  // metal (sopro de chefe): serra com filtro que abre
  metal: (mesa, canal, t, midi, dur, vol = 0.08) => nota(mesa, canal, { t, dur, midi, vol, tipo: 'sawtooth',
    env: { a: 0.02, d: 0.25, s: 0.7, r: 0.12 }, filtro: { tipo: 'lowpass', de: 900, para: 2600, tempo: 0.15, q: 1.2 }, vibrato: { freq: 5.5, cents: 10, atraso: 0.3 } }),
  bumbo: (mesa, canal, t, vol = 0.45) => bumbo(mesa, canal, { t, vol, de: 110, para: 42, dur: 0.28 }),
  caixa: (mesa, canal, t, vol = 0.12) => {
    ruido(mesa, canal, { t, dur: 0.12, vol, tipo: 'bandpass', freq: 1900, q: 0.7 });
    nota(mesa, canal, { t, dur: 0.04, midi: 54, vol: vol * 0.8, tipo: 'sine', env: { a: 0.001, d: 0.05, s: 0, r: 0.04 } });
  },
  chimbal: (mesa, canal, t, vol = 0.03) => ruido(mesa, canal, { t, dur: 0.035, vol, tipo: 'highpass', freq: 7000, q: 0.7 }),
  madeira: (mesa, canal, t, vol = 0.06, freq = 1100) => ruido(mesa, canal, { t, dur: 0.03, vol, tipo: 'bandpass', freq, q: 6 }),
};

// frase: [[batida desde o compasso inicial, duração em batidas, 'nota'], …]
export function frase(instrumento, mesa, canal, tempo, compasso, notas, vol, transpor = 0) {
  for (const [b, d, n] of notas) {
    instrumento(mesa, canal, tempo.t(compasso, b), m(n) + transpor, tempo.d(d) * 0.92, vol);
  }
}

// acordes por cifra simples ('Am', 'F', 'E7', 'Dm', 'G#', 'Bbm'…) → MIDI na oitava pedida
const RAIZ = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function acorde(cifra, oitava = 4) {
  const r = /^([A-G])([#b]?)(m|dim|aug)?(7|maj7)?$/.exec(cifra);
  if (!r) throw new Error(`cifra inválida: ${cifra}`);
  const raiz = 12 * (oitava + 1) + RAIZ[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
  const terca = r[3] === 'm' || r[3] === 'dim' ? 3 : 4, quinta = r[3] === 'dim' ? 6 : r[3] === 'aug' ? 8 : 7;
  const notas = [raiz, raiz + terca, raiz + quinta];
  if (r[4] === '7') notas.push(raiz + (r[3] === 'dim' ? 9 : 10));
  if (r[4] === 'maj7') notas.push(raiz + 11);
  return notas;
}
