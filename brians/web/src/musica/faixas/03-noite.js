// Noite: substitui "PVZ_Soundtrack-Nighttime_at_the_Backyard" (Celas, 1ª e
// 2ª parte). Da ficha: Lá menor (o mesmo da Jardim, a mesma família), ~110 BPM,
// 83% no médio, estéreo estreito, melodia ondulante, seções com baixo e blocos
// de acordes sustentados. Música nova: harpa ondulando em colcheias, flauta
// noturna com vibrato, celesta piscando no agudo; no meio, blocos de cordas
// graves sustentados.
import { kit, frase, acorde } from '../kit.js';

const HARMONIA = [
  'Am', 'Am', 'Dm', 'Dm', 'E', 'E', 'Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E', 'Am', 'E',   // A
  'Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E7', 'E7',                                              // B (blocos)
  'Am', 'Am', 'Dm', 'Dm', 'E', 'E', 'Am', 'E',                                                // A'
];
const M1 = [[0, 0.5, 'E4'], [0.5, 0.5, 'A4'], [1, 0.5, 'C5'], [1.5, 0.5, 'E5'], [2, 2, 'D5'], [4, 0.5, 'C5'], [4.5, 0.5, 'B4'], [5, 1, 'A4'], [6, 2, 'F4'],
  [8, 0.5, 'G#4'], [8.5, 0.5, 'B4'], [9, 0.5, 'D5'], [9.5, 0.5, 'F5'], [10, 2, 'E5'], [12, 4, 'A4']];
const M2 = [[0, 0.5, 'C5'], [0.5, 0.5, 'D5'], [1, 1, 'E5'], [2, 1, 'A5'], [3, 1, 'G5'], [4, 2, 'F5'], [6, 1, 'E5'], [7, 1, 'D5'],
  [8, 0.5, 'B4'], [8.5, 0.5, 'C5'], [9, 1, 'D5'], [10, 1, 'E5'], [11, 1, 'G#4'], [12, 4, 'A4']];

export default {
  id: 'noite',
  tempo: { bpm: 110, batidas: 4, swing: 0.5 },
  compassos: 32,
  volumeDb: -22.9,
  mesa: { reverb: { segundos: 2.4, brilho: 0.4 }, eco: { tempo: (60 / 110) * 0.75, retorno: 0.3, corte: 2200 }, semente: 3 },

  compor({ mesa, tempo }) {
    const harpa = mesa.canal({ pan: -0.2, reverb: 0.35 });
    const flauta = mesa.canal({ pan: 0.15, reverb: 0.45, eco: 0.2 });
    const celesta = mesa.canal({ pan: 0.35, reverb: 0.5, eco: 0.4 });
    const grave = mesa.canal({ pan: 0, reverb: 0.25 });
    const cordas = [mesa.canal({ pan: -0.3, reverb: 0.5 }), mesa.canal({ pan: 0.3, reverb: 0.5 })];

    HARMONIA.forEach((cifra, c) => {
      const tons = acorde(cifra, 4);
      const bloco = c >= 16 && c < 24;
      // baixo longo (mínimas), suave
      kit.baixo(mesa, grave, tempo.t(c, 0), tons[0] - 24, tempo.d(bloco ? 3.8 : 1.8), 0.06);
      if (!bloco) kit.baixo(mesa, grave, tempo.t(c, 2), tons[0] - 24 + (c % 2 ? 7 : 0), tempo.d(1.8), 0.04);
      if (bloco) {
        // blocos de cordas graves, rearticulados a cada 2 tempos
        for (const b of [0, 2]) [...acorde(cifra, 3), tons[0]].forEach((n, v) => kit.cordas(mesa, cordas[v % 2], tempo.t(c, b), n + 12, tempo.d(1.9), 0.03, v % 2 ? 5 : -5));
        return;
      }
      // harpa ondulando: sobe e desce pelo acorde
      const onda = [tons[0] - 12, tons[1] - 12, tons[2] - 12, tons[0], tons[1], tons[0], tons[2] - 12, tons[1] - 12];
      onda.forEach((n, i) => kit.pincado(mesa, harpa, tempo.t(c, i / 2), n + 12, tempo.d(0.5), (i % 4 === 0 ? 0.07 : 0.05) * (c >= 24 ? 0.6 : 1)));
      // celesta piscando de vez em quando
      if (c % 4 === 3) kit.celesta(mesa, celesta, tempo.t(c, 2.5), tons[2] + 12, 0, 0.05);
    });
    for (const [c, f] of [[0, M1], [4, M2], [8, M1], [12, M2], [24, M1], [28, M2]]) frase(kit.flauta, mesa, flauta, tempo, c, f, c >= 24 ? 0.08 : 0.13, c === 8 ? -12 : 0);
  },
};
