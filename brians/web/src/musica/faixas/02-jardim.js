// Jardim: substitui "PVZ_Soundtrack-Daytime_in_a_Front_Yard" (Primeira
// Parte, cena do Hall; Os namorados a pitch 65). Da ficha: Lá menor, ~115 BPM,
// quase reto, 74% no médio, estéreo estreito, arpejo em zigue-zague contínuo e
// seções de notas longas. Música nova: baixo "um-pa" (fundamental e quinta),
// marimba em zigue-zague, flauta saltitante; no meio, uma seção de notas longas
// sobre cordas. A pitch 65 vira uma valsa lenta e triste.
import { kit, frase, acorde } from '../kit.js';
import { m } from '../partitura.js';

const HARMONIA = [
  'Am', 'Am', 'Dm', 'E', 'Am', 'C', 'Dm', 'E', 'F', 'G', 'Am', 'Am', 'Dm', 'E', 'Am', 'E',   // A
  'F', 'F', 'C', 'C', 'Dm', 'Dm', 'E', 'E',                                                   // B (notas longas)
  'Am', 'Am', 'Dm', 'E', 'Am', 'C', 'Dm', 'E',                                                // A'
];
const F1 = [[0, 1, 'A4'], [1, 0.5, 'C5'], [1.5, 0.5, 'B4'], [2, 1, 'A4'], [3, 1, 'E4'], [4, 1.5, 'F4'], [5.5, 0.5, 'A4'], [6, 2, 'D5'],
  [8, 1, 'B4'], [9, 1, 'G#4'], [10, 1, 'E4'], [11, 1, 'B4'], [12, 3, 'A4']];
const F2 = [[0, 0.5, 'E5'], [0.5, 0.5, 'D5'], [1, 1, 'C5'], [2, 1, 'A4'], [3, 1, 'C5'], [4, 1, 'G4'], [5, 1, 'E4'], [6, 1, 'G4'], [7, 1, 'C5'],
  [8, 1, 'A4'], [9, 0.5, 'F4'], [9.5, 0.5, 'A4'], [10, 2, 'D5'], [12, 1, 'E5'], [13, 1, 'D5'], [14, 1, 'B4'], [15, 1, 'G#4']];
const F3 = [[0, 1, 'A4'], [1, 1, 'C5'], [2, 1, 'F5'], [3, 1, 'E5'], [4, 1, 'D5'], [5, 1, 'B4'], [6, 2, 'G4'],
  [8, 1, 'E5'], [9, 1, 'C5'], [10, 1, 'A4'], [11, 1, 'E5'], [12, 2, 'A5'], [14, 2, 'E5']];
const F4 = [[0, 1, 'F5'], [1, 1, 'D5'], [2, 1, 'A4'], [3, 1, 'D5'], [4, 2, 'B4'], [6, 2, 'G#4'], [8, 3, 'A4'],
  [12, 1, 'E4'], [13, 1, 'G#4'], [14, 1, 'B4'], [15, 1, 'D5']];
const LONGAS = [[0, 4, 'A4'], [4, 4, 'C5'], [8, 4, 'G4'], [12, 4, 'E4'], [16, 4, 'F4'], [20, 4, 'A4'], [24, 4, 'G#4'], [28, 4, 'B4']];

export default {
  id: 'jardim',
  tempo: { bpm: 115, batidas: 4, swing: 0.52 },
  compassos: 32,
  volumeDb: -21.3,
  mesa: { reverb: { segundos: 1.4, brilho: 0.55 }, semente: 2 },

  compor({ mesa, tempo }) {
    const baixo = mesa.canal({ pan: 0, reverb: 0.1 });
    const marimba = mesa.canal({ pan: -0.25, reverb: 0.2 });
    const flauta = mesa.canal({ pan: 0.15, reverb: 0.3 });
    const cordas = [mesa.canal({ pan: -0.3, reverb: 0.4 }), mesa.canal({ pan: 0.3, reverb: 0.4 })];
    const perc = mesa.canal({ pan: 0.2, reverb: 0.15 });

    HARMONIA.forEach((cifra, c) => {
      const [r, t3, q] = acorde(cifra, 4);
      const longa = c >= 16 && c < 24;
      if (longa) {
        kit.baixo(mesa, baixo, tempo.t(c, 0), r - 24, tempo.d(3.6), 0.13);
        acorde(cifra, 3).forEach((n, v) => kit.cordas(mesa, cordas[v % 2], tempo.t(c, 0), n + 12, tempo.d(3.8), 0.025, v % 2 ? 6 : -6));
        kit.chimbal(mesa, perc, tempo.t(c, 2), 0.015);
        return;
      }
      // baixo um-pa: fundamental nos tempos 1 e 3, quinta nos 2 e 4
      for (let b = 0; b < 4; b++) kit.baixo(mesa, baixo, tempo.t(c, b), (b % 2 ? q : r) - 24, tempo.d(0.4), b % 2 ? 0.12 : 0.17);
      // marimba em zigue-zague (colcheias)
      const tons = [r, t3, q, r + 12];
      [0, 1, 2, 1, 3, 1, 2, 1].forEach((k, i) => kit.marimba(mesa, marimba, tempo.t(c, i / 2), tons[k], 0, (i % 2 ? 0.045 : 0.065) * (c < 4 ? 0.6 : 1)));
      // percussão leve
      if (c >= 8) kit.madeira(mesa, perc, tempo.t(c, 3), 0.025);
    });
    // melodia
    for (const [c, f] of [[0, F1], [4, F2], [8, F3], [12, F4], [24, F1], [28, F2]]) frase(kit.flauta, mesa, flauta, tempo, c, f, 0.14);
    frase(kit.flauta, mesa, flauta, tempo, 16, LONGAS, 0.07);
  },
};
