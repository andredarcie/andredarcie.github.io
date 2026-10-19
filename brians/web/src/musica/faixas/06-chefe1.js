// Chefe, fase 1: substitui "4-20 - Koopa Junior BGM". Da ficha: Dó menor,
// ~124 BPM, denso (quase 5 notas por batida na voz aguda), brilhante (9% acima
// de 2 kHz), repetição curta. Música nova: baixo pulsando em colcheias com
// salto de oitava, arpejo de chip em semicolcheias, um motivo de metal próprio
// (o mesmo que volta, em Sol menor, na fase 2) e bateria de luta.
import { kit, frase, acorde } from '../kit.js';

const HARMONIA = ['Cm', 'Cm', 'Ab', 'Ab', 'Fm', 'Fm', 'G', 'G', 'Cm', 'Cm', 'Ab', 'Bb', 'Fm', 'G', 'Cm', 'G'];
export const MOTIVO_CHEFE = [[0, 1, 'G4'], [1, 0.5, 'C5'], [1.5, 0.5, 'Eb5'], [2, 1, 'D5'], [3, 1, 'C5'], [4, 2, 'Ab4'], [6, 1, 'G4'], [7, 1, 'F4'],
  [8, 0.5, 'G4'], [8.5, 0.5, 'Ab4'], [9, 1, 'B4'], [10, 2, 'D5'], [12, 3, 'C5']];

export default {
  id: 'chefe1',
  tempo: { bpm: 124.5, batidas: 4, swing: 0.5 },
  compassos: 16,
  volumeDb: -24.2,
  mesa: { reverb: { segundos: 1.2, brilho: 0.6 }, semente: 6 },

  compor({ mesa, tempo }) {
    const baixo = mesa.canal({ pan: 0, reverb: 0.05 });
    const arpejo = [mesa.canal({ pan: -0.45, reverb: 0.15 }), mesa.canal({ pan: 0.45, reverb: 0.15 })];
    const metal = mesa.canal({ pan: 0.1, reverb: 0.3 });
    const bateria = mesa.canal({ pan: 0, reverb: 0.12 });

    HARMONIA.forEach((cifra, c) => {
      const tons = acorde(cifra, 5);
      for (let i = 0; i < 8; i++) kit.baixo(mesa, baixo, tempo.t(c, i / 2), tons[0] - 36 + (i % 2 ? 12 : 0), tempo.d(0.4), 0.05);
      for (let i = 0; i < 16; i++) kit.chip(mesa, arpejo[i % 2], tempo.t(c, i / 4), tons[i % 3] + (i % 6 >= 3 ? 0 : -12), tempo.d(0.22), 0.05);
      kit.bumbo(mesa, bateria, tempo.t(c, 0), 0.15);
      kit.bumbo(mesa, bateria, tempo.t(c, 2), 0.12);
      kit.caixa(mesa, bateria, tempo.t(c, 1), 0.1);
      kit.caixa(mesa, bateria, tempo.t(c, 3), 0.1);
      for (let i = 0; i < 8; i++) kit.chimbal(mesa, bateria, tempo.t(c, i / 2), 0.035);
    });
    frase(kit.metal, mesa, metal, tempo, 4, MOTIVO_CHEFE, 0.13);
    frase(kit.metal, mesa, metal, tempo, 12, MOTIVO_CHEFE, 0.13);
  },
};
