// Os Quartos: substitui "3-06-world-map-6-iced-land-", que o jogo só toca a
// pitch 50. Da ficha (a pitch 100): mono, ~150 BPM, Sol com Sol# forte
// (cromático), pulso grave em todo tempo (44% abaixo de 60 Hz), um motivo
// agudo de duas notas que se repete a cada 4 compassos. Composta pensando no
// resultado a pitch 50: uma caixinha de chip lenta e etérea sobre um pulso.
import { kit } from '../kit.js';
import { ms } from '../partitura.js';

// motivo: duas notas alternando, descendo um degrau por compasso (4 compassos)
const MOTIVO = [['G5', 'G#5'], ['F5', 'G5'], ['Eb5', 'F5'], ['D5', 'Eb5']];
const SUSTENTO = ms('G4 G4 Ab4 F#4');
const VARIACAO = [['G5', 'B5'], ['G#5', 'C6'], ['G5', 'D6'], ['F#5', 'D5']];

export default {
  id: 'quartos',
  tempo: { bpm: 150, batidas: 4, swing: 0.5 },
  compassos: 16,
  mono: true,
  volumeDb: -14,
  mesa: { reverb: { segundos: 1.2, brilho: 0.5 }, semente: 5 },

  compor({ mesa, tempo }) {
    const c0 = mesa.canal({ pan: 0, reverb: 0.15 });
    for (let c = 0; c < 16; c++) {
      const k = c % 4, [a, b] = (c >= 8 && c < 12 ? VARIACAO : MOTIVO)[k];
      // pulso grave em todo tempo (bumbo + triângulo)
      for (let bt = 0; bt < 4; bt++) {
        kit.bumbo(mesa, c0, tempo.t(c, bt), bt === 0 ? 0.32 : 0.24);
        kit.baixo(mesa, c0, tempo.t(c, bt), ms(['G2'])[0] + (k === 2 ? 1 : k === 3 ? -1 : 0), tempo.d(0.35), 0.08);
      }
      // motivo agudo em colcheias
      for (let i = 0; i < 8; i++) kit.chip(mesa, c0, tempo.t(c, i / 2), ms([i % 2 ? b : a])[0], tempo.d(0.4), 0.09);
      // nota sustentada no médio
      kit.chip(mesa, c0, tempo.t(c, 0), SUSTENTO[k] + 12, tempo.d(3.8), 0.03);
    }
  },
};
