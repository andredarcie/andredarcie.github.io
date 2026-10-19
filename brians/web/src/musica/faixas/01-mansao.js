// Mansão: substitui "4-14 - Haunted House BGM" (título a pitch 50, Floresta,
// Segunda Parte, Corredor). Da ficha da original: ~93 BPM, centro em Ré com
// Dó/Fá/Sib de cor, 53% de graves, estéreo largo, decaimento longo e um ciclo
// calmo (~10 compassos) → respiro → explosão de órgão (~4 compassos).
// Música nova: caixinha de música em semicolcheias com eco, acordes fantasmas
// de trítono que escorregam um semitom (descida cromática), e um órgão de
// tubos com pedal (Ré menor, napolitana de Mib, diminuto). Dois ciclos de 16
// compassos, o segundo variado. A pitch 50 (título) tudo cai uma oitava e
// fica arrastado: a caixinha vai para o médio e o órgão vira um rugido.
import { nota, sino } from '../sintese.js';
import { ms } from '../partitura.js';

const CAIXINHA = [[1, 1, 0.9], [2, 0.45, 0.4], [3.01, 0.3, 0.25], [4.95, 0.25, 0.15], [6.2, 0.2, 0.1], [8.1, 0.18, 0.07], [11.3, 0.12, 0.05]];
const ORGAO = [1, 0.8, 0.6, 0.55, 0.15, 0.4, 0, 0.35, 0, 0.2, 0, 0.18, 0, 0, 0, 0.12];

// células da caixinha (8 semicolcheias, repetidas no compasso)
const CELULAS = {
  Dm: ms('A5 D6 F5 D6 E5 D6 F5 A5'),
  Bb: ms('F5 D6 Bb5 D6 E5 D6 Bb5 F5'),
  Gm6: ms('G5 Bb5 E5 Bb5 D5 Bb5 E5 G5'),
  A7b9: ms('A5 C#6 E5 Bb5 G5 C#6 E5 A5'),
  Cdim: ms('G5 C6 Eb5 C6 F#5 C6 Eb5 G5'),
  Eb: ms('G5 Eb6 Bb5 Eb6 D5 Eb6 Bb5 G5'),
};

// ciclo: harmonias da parte calma (2 compassos cada), acordes fantasmas e o órgão
const CICLOS = [
  {
    calma: ['Dm', 'Bb', 'Gm6', 'A7b9', 'Dm'],
    fantasmas: ['C4 F#4 C5', 'B3 F4 B4', 'C4 F#4 C5', 'Bb3 E4 Bb4'],
    orgao: [ // [compasso relativo, batida, duração em batidas, pedal, acorde]
      [0, 0, 2, 'D2', 'D4 F4 A4 D5'], [0, 2, 1, 'Bb1', 'D4 F4 Bb4 D5'], [0, 3, 1, 'G1', 'D4 G4 Bb4 D5'],
      [1, 0, 4, 'A1', 'C#4 E4 A4 C#5'],
      [2, 0, 2, 'D2', 'D4 F4 A4 D5'], [2, 2, 1, 'Eb2', 'Eb4 G4 Bb4 Eb5'], [2, 3, 1, 'C#2', 'C#4 E4 G4 Bb4'],
      [3, 0, 3.5, 'D2', 'D4 F#4 A4 D5'],
    ],
  },
  {
    calma: ['Dm', 'Cdim', 'Eb', 'A7b9', 'Dm'],
    fantasmas: ['D4 G#4 D5', 'C#4 G4 C#5', 'D4 G#4 D5', 'C4 F#4 C5'],
    orgao: [
      [0, 0, 2, 'G1', 'D4 G4 Bb4 D5'], [0, 2, 1, 'Eb2', 'Eb4 G4 Bb4 Eb5'], [0, 3, 1, 'C2', 'C4 Eb4 G4 C5'],
      [1, 0, 4, 'D2', 'D4 F#4 A4 D5'],
      [2, 0, 2, 'G1', 'D4 G4 Bb4 D5'], [2, 2, 1, 'Ab1', 'C4 Eb4 Ab4 C5'], [2, 3, 1, 'F#1', 'C4 Eb4 F#4 A4'],
      [3, 0, 3.5, 'A1', 'C#4 E4 G4 A4'],
    ],
  },
];

export default {
  id: 'mansao',
  tempo: { bpm: 93, batidas: 4, swing: 0.5 },
  compassos: 32,
  volumeDb: -31.5,
  mesa: { reverb: { segundos: 3.4, brilho: 0.45 }, eco: { tempo: (60 / 93) * 0.75, retorno: 0.38, corte: 2600 }, semente: 14 },

  compor({ mesa, tempo, loop }) {
    const caixinhaE = mesa.canal({ volume: 1, pan: -0.8, reverb: 0.15, eco: 0.15 });
    const caixinhaD = mesa.canal({ volume: 1, pan: 0.8, reverb: 0.15, eco: 0.15 });
    // estéreo largo: o que é grave ou sustentado toca dos dois lados, levemente desafinado
    const lados = (reverb) => [mesa.canal({ volume: 1, pan: -0.85, reverb }), mesa.canal({ volume: 1, pan: 0.85, reverb })];
    const fantasma = lados(0.6), orgao = lados(0.55), pedal = lados(0.3), zumbido = lados(0.1);

    // zumbido grave por baixo de tudo (Ré e Lá), atravessa a emenda do loop
    for (const [n, v] of [['D2', 0.008]]) {
      zumbido.forEach((c, l) => nota(mesa, c, { t: 0, dur: loop, midi: ms([n])[0], vol: v, tipo: 'sine', desafina: l ? 4 : -4,
        env: { a: 0.08, d: 0.1, s: 1, r: 0.08 }, vibrato: { freq: 0.3 + l * 0.07, cents: 6 } }));
    }

    CICLOS.forEach((ciclo, k) => {
      const base = k * 16;
      // caixinha de música: compassos 0–9, semicolcheias, duas vozes alternadas
      for (let c = 0; c < 10; c++) {
        const celula = CELULAS[ciclo.calma[Math.floor(c / 2)]];
        for (let i = 0; i < 16; i++) {
          // o fim da parte calma vai rareando
          if (c === 9 && i >= 8 && i % 2 === 1) continue;
          if (c === 9 && i >= 12) continue;
          const t = tempo.t(base + c, i / 4);
          const forte = i % 4 === 0 ? 1 : i % 2 === 0 ? 0.85 : 0.6;   // tempo, colcheia, semicolcheia
          sino(mesa, i % 2 ? caixinhaD : caixinhaE, { t, midi: celula[i % 8], vol: 0.14 * forte, parciais: CAIXINHA, desafina: (i % 3) - 1 });
        }
      }
      // suspiros fantasmas: compassos 1, 3, 5, 7; deslizam um semitom em ~6 batidas e
      // somem antes do próximo (pausa entre um e outro)
      ciclo.fantasmas.forEach((acorde, j) => {
        const t = tempo.t(base + 1 + j * 2, 0.5), dur = tempo.d(5.5);
        ms(acorde).forEach((midi, v) => {
          [-6, 7].forEach((desafina, l) => {
            nota(mesa, fantasma[(v + l) % 2], { t, dur, midi, vol: 0.11 * [1.3, 1, 0.75][v], harmonicos: [1, 0.4, 0.35, 0.2, 0.15, 0.1], desafina, glide: -1,
              env: { a: 0.3, d: 0.6, s: 0.75, r: 0.6 }, vibrato: { freq: 4.6 + l * 0.4, cents: 9, atraso: 0.8 },
              filtro: { tipo: 'lowpass', freq: 4500, q: 0.5 } });
          });
        });
      });
      // compasso 10: respiro (só o zumbido e as caudas); 11–14: órgão
      for (const [c, b, durB, ped, acorde] of ciclo.orgao) {
        const t = tempo.t(base + 11 + c, b), dur = tempo.d(durB) * 0.94;
        const vib = { freq: 5.8, cents: 7, atraso: 0.25 };
        // o acorde é martelado em colcheias (a primeira mais forte), a última nota sustenta
        const golpes = Math.max(1, Math.round(durB * 2));
        for (let g = 0; g < golpes; g++) {
          const tg = tempo.t(base + 11 + c, b + g / 2), ultimo = g === golpes - 1;
          const dg = ultimo ? Math.max(tempo.d(0.45), t + dur - tg) : tempo.d(0.42);
          ms(acorde).forEach((midi, v) => {
            nota(mesa, orgao[v % 2], { t: tg, dur: dg, midi, vol: (g === 0 ? 0.2 : 0.15), harmonicos: ORGAO, desafina: v % 2 ? 3 : -3,
              env: { a: 0.02, d: 0.2, s: 0.8, r: ultimo ? 0.45 : 0.08 }, vibrato: vib, filtro: { tipo: 'lowpass', freq: 8000, q: 0.4 } });
          });
        }
        const p = ms([ped])[0];
        pedal.forEach((canal, l) => {
          nota(mesa, canal, { t, dur, midi: p + 12, vol: 0.32, harmonicos: [1, 0.6, 0.35, 0.2], desafina: l ? 5 : -5, env: { a: 0.05, d: 0.3, s: 0.9, r: 0.5 } });
          nota(mesa, canal, { t, dur, midi: p, vol: 0.26, tipo: 'sine', desafina: l ? 3 : -3, env: { a: 0.06, d: 0.3, s: 0.9, r: 0.5 } });
        });
      }
    });
  },
};
