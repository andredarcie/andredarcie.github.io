// Caverna: substitui "Super Mario World - Underground" (Caverna, Lugar
// secreto). Da ficha da original: 117,5 BPM com swing (contratempo a 0,64),
// Lá menor com Sib/Sol#/Dó# de cor, 78% de energia nos graves, nada acima de
// 2 kHz, voz aguda grave (Sol#3–Sol4), repetição de 4 compassos, estéreo largo.
// Música nova: um riff de baixo próprio, cromático e sincopado, de 4
// compassos (Fm, Fm/Db, Bbm, C7); frases pinçadas graves com eco de caverna; na
// segunda metade, acordes curtos no contratempo. 24 compassos em loop.
import { nota, ruido } from '../sintese.js';
import { ms } from '../partitura.js';

// riff: 8 colcheias por compasso ('.' = pausa). Fá menor com o cromatismo
// Si–Dó–Dó#/Réb em volta do Dó (o mundo de notas que a transcrição mostrou)
const RIFF = [
  ms('F2 . . C3 B2 . C3 Eb3'),
  ms('F2 . . C3 Db3 . C3 Ab2'),
  ms('Bb1 . . F2 E2 . F2 Ab2'),
  ms('C2 . . G2 Gb2 . G2 B2'),
];
const RIFF_B = [
  ms('Db2 . . Ab2 G2 . Ab2 C3'),
  ms('Db2 . . Ab2 F2 . Ab2 Db3'),
  ms('Bb1 . . F2 E2 . Db3 C3'),
  ms('C2 . . G2 E2 . Bb2 B2'),
];

// frases: [batida a partir do início, duração em batidas, nota]
const FRASES = {
  um: [[1, 1, 'C4'], [2.5, 0.5, 'Bb3'], [3, 0.5, 'Ab3'], [3.5, 1, 'F3'], [5, 0.5, 'Eb3'], [5.5, 1.5, 'F3']],
  dois: [[0.5, 0.5, 'Ab3'], [1, 0.5, 'Bb3'], [1.5, 0.5, 'B3'], [2, 0.5, 'C4'], [2.5, 1, 'Eb4'], [3.5, 1, 'C4'], [5, 0.5, 'Bb3'], [5.5, 0.5, 'Ab3'], [6, 2, 'F3']],
  tres: [[1, 0.5, 'F4'], [1.5, 0.5, 'Eb4'], [2, 0.5, 'C4'], [2.5, 0.5, 'Eb4'], [3, 2, 'F4'], [5.5, 0.5, 'Eb4'], [6, 0.5, 'C4'], [6.5, 1.5, 'Bb3']],
  quatro: [[0.5, 0.5, 'C4'], [1, 0.5, 'Eb4'], [1.5, 0.5, 'E4'], [2, 1, 'F4'], [3.5, 0.5, 'Eb4'], [4, 0.5, 'C4'], [4.5, 0.5, 'Ab3'], [5, 2.5, 'F3']],
};
const ROTEIRO = [[4, 'um'], [8, 'dois'], [12, 'tres'], [16, 'quatro'], [20, 'dois']];
const ACORDES = [ms('Ab3 C4 F4'), ms('Ab3 Db4 F4'), ms('Bb3 Db4 F4'), ms('Bb3 C4 E4')];

export default {
  id: 'caverna',
  tempo: { bpm: 117.5, batidas: 4, swing: 0.64 },
  compassos: 24,
  volumeDb: -23.9,
  mesa: { reverb: { segundos: 1.8, brilho: 0.3 }, eco: { tempo: (60 / 117.5) * 0.75, retorno: 0.42, corte: 1600 }, semente: 4 },

  compor({ mesa, tempo }) {
    const baixo = [mesa.canal({ volume: 1, pan: -0.75, reverb: 0.12 }), mesa.canal({ volume: 1, pan: 0.75, reverb: 0.12 })];
    const melodia = mesa.canal({ volume: 1, pan: -0.7, reverb: 0.3, eco: 0.55 });
    const acordes = mesa.canal({ volume: 1, pan: 0.7, reverb: 0.3, eco: 0.25 });
    const toque = mesa.canal({ volume: 1, pan: 0.2, reverb: 0.25 });

    for (let c = 0; c < 24; c++) {
      const riff = (c >= 12 && c < 20 ? RIFF_B : RIFF)[c % 4];
      riff.forEach((midi, i) => {
        if (midi === null) return;
        // ligado: a nota dura até a próxima (a pausa vira sustentação)
        let fimI = i + 1;
        while (fimI < 8 && riff[fimI] === null) fimI++;
        const t = tempo.t(c, i / 2), dur = tempo.t(c, fimI / 2) - t - 0.02;
        // esquerda: dente de serra filtrado; direita: 12 ms depois, mais redondo (estéreo largo)
        nota(mesa, baixo[0], { t, dur, midi, vol: 0.2, harmonicos: [1, 0.5, 0.3, 0.15, 0.08], desafina: -6,
          env: { a: 0.02, d: 0.3, s: 0.6, r: 0.08 }, filtro: { tipo: 'lowpass', de: 900, para: 420, tempo: 0.08, q: 1.2 } });
        nota(mesa, baixo[1], { t: t + 0.012, dur, midi, vol: 0.22, harmonicos: [1, 0.2, 0.25, 0.05, 0.1], desafina: 6,
          env: { a: 0.025, d: 0.3, s: 0.65, r: 0.08 }, filtro: { tipo: 'lowpass', freq: 700, q: 0.7 } });
      });
      // preenchimento: acorde suave sustentado no médio, um por compasso
      ACORDES[c % 4].forEach((midi, v) => {
        nota(mesa, v % 2 ? baixo[1] : baixo[0], { t: tempo.t(c, 0), dur: tempo.d(3.9), midi, vol: 0.035, tipo: 'triangle', desafina: v % 2 ? 5 : -5,
          env: { a: 0.25, d: 0.6, s: 0.7, r: 0.3 }, filtro: { tipo: 'lowpass', freq: 1200, q: 0.5 } });
      });
      // toque seco e grave nos tempos 2 e 4 (madeira)
      for (const b of [1, 3]) ruido(mesa, toque, { t: tempo.t(c, b), dur: 0.03, vol: 0.025, tipo: 'bandpass', freq: 900, q: 5 });
      // segunda metade: acordes curtos no contratempo de 2 e de 4
      if (c >= 12) {
        for (const b of [1.5, 3.5]) {
          for (const midi of ACORDES[c % 4]) {
            nota(mesa, acordes, { t: tempo.t(c, b), dur: tempo.d(0.2), midi, vol: 0.022, harmonicos: [1, 0, 0.33, 0, 0.2, 0, 0.14],
              env: { a: 0.002, d: 0.08, s: 0.2, r: 0.05 }, filtro: { tipo: 'lowpass', freq: 1500, q: 0.6 } });
          }
        }
      }
    }
    // frases pinçadas com eco
    for (const [inicio, nome] of ROTEIRO) {
      for (const [b, durB, n] of FRASES[nome]) {
        nota(mesa, melodia, { t: tempo.t(inicio, b), dur: tempo.d(durB) * 0.9, midi: ms([n])[0], vol: 0.08, harmonicos: [1, 0.35, 0.18, 0.1, 0.05],
          env: { a: 0.003, d: 0.35, s: 0.25, r: 0.25 }, filtro: { tipo: 'lowpass', de: 2200, para: 700, tempo: 0.12, q: 1 } });
      }
    }
  },
};
