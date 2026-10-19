// Chefe, fase 2: substitui "PVZ_Soundtrack-Daytime_at_a_Back_Yard" (toca a
// pitch 95). Da ficha: Sol menor, ~106 BPM, melodia em destaque no médio (Ré4–
// Fá5), acompanhamento pinçado em zigue-zague, 89% no médio, estéreo estreito.
// Música nova: o motivo da fase 1, agora em Sol menor na flauta, sobre harpa
// em zigue-zague, baixo em semínimas e bateria leve: a luta subiu um degrau.
import { kit, frase, acorde } from '../kit.js';
import { MOTIVO_CHEFE } from './06-chefe1.js';

const HARMONIA = ['Gm', 'Gm', 'Cm', 'Cm', 'D', 'D', 'Gm', 'Gm', 'Eb', 'Eb', 'Cm', 'Cm', 'D', 'D', 'Gm', 'D',
  'Gm', 'Bb', 'Cm', 'D', 'Eb', 'Cm', 'D', 'D'];
const RESPOSTA = [[0, 1, 'Bb4'], [1, 1, 'A4'], [2, 1, 'G4'], [3, 1, 'D5'], [4, 2, 'C5'], [6, 2, 'Bb4'],
  [8, 1, 'A4'], [9, 1, 'F#4'], [10, 1, 'A4'], [11, 1, 'C5'], [12, 3, 'D5']];

export default {
  id: 'chefe2',
  tempo: { bpm: 106.5, batidas: 4, swing: 0.5 },
  compassos: 24,
  volumeDb: -17.5,
  mesa: { reverb: { segundos: 1.5, brilho: 0.5 }, semente: 7 },

  compor({ mesa, tempo }) {
    const baixo = mesa.canal({ pan: 0, reverb: 0.08 });
    const harpa = mesa.canal({ pan: -0.2, reverb: 0.25 });
    const flauta = mesa.canal({ pan: 0.15, reverb: 0.3 });
    const bateria = mesa.canal({ pan: 0, reverb: 0.1 });

    HARMONIA.forEach((cifra, c) => {
      const [r, t3, q] = acorde(cifra, 4);
      for (let b = 0; b < 4; b++) kit.baixo(mesa, baixo, tempo.t(c, b), r - 24 + (b === 2 ? 7 : 0), tempo.d(0.7), 0.05);
      [r, q, t3 + 12, q, r + 12, q, t3 + 12, q].forEach((n, i) => kit.pincado(mesa, harpa, tempo.t(c, i / 2), n, tempo.d(0.45), 0.045 * (c >= 16 ? 0.6 : 1)));
      kit.bumbo(mesa, bateria, tempo.t(c, 0), 0.1);
      if (c < 16) kit.madeira(mesa, bateria, tempo.t(c, 3), 0.025, 1400);
    });
    // o motivo da fase 1 (Dó menor) transposto para Sol menor: +7 semitons
    for (const c of [0, 8, 16]) frase(kit.flauta, mesa, flauta, tempo, c, MOTIVO_CHEFE, 0.14, 7);
    for (const c of [4, 12, 20]) frase(kit.flauta, mesa, flauta, tempo, c, RESPOSTA, c >= 16 ? 0.09 : 0.13);
  },
};
