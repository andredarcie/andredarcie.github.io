// Final: substitui "PVZ_Soundtrack-The_Roof" (Fine). Da ficha: Lá menor,
// ~120 BPM, 95% no médio e quase nada de grave, arpejos rápidos, estéreo
// estreito. Música nova de despedida: a harpa toca em semicolcheias o desenho
// da caixinha de música da mansão (a nota de cima alternando), agora em Lá
// menor; a flauta canta por cima; cordas suaves; sem baixo e sem bateria.
import { kit, frase, acorde } from '../kit.js';

const HARMONIA = ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E', 'F', 'G', 'Em', 'Am', 'Dm', 'E', 'Am', 'Am',
  'F', 'G', 'C', 'Am', 'Dm', 'G', 'C', 'E', 'F', 'G', 'Em', 'Am', 'Dm', 'E', 'Am', 'E'];
const CANTO = [
  [0, 3, 'E5'], [3, 1, 'C5'], [4, 2, 'A4'], [6, 2, 'C5'], [8, 3, 'G5'], [11, 1, 'E5'], [12, 4, 'D5'],
  [16, 3, 'C5'], [19, 1, 'A4'], [20, 2, 'F4'], [22, 2, 'A4'], [24, 4, 'B4'], [28, 4, 'G#4'],
];
const CANTO2 = [
  [0, 2, 'A4'], [2, 2, 'C5'], [4, 2, 'B4'], [6, 2, 'D5'], [8, 3, 'E5'], [11, 1, 'G5'], [12, 4, 'E5'],
  [16, 2, 'F5'], [18, 2, 'E5'], [20, 2, 'D5'], [22, 2, 'B4'], [24, 4, 'A4'], [28, 4, 'E5'],
];

export default {
  id: 'final',
  tempo: { bpm: 120, batidas: 4, swing: 0.5 },
  compassos: 32,
  volumeDb: -21.3,
  mesa: { reverb: { segundos: 2.6, brilho: 0.5 }, eco: { tempo: 0.375, retorno: 0.25, corte: 2400 }, semente: 8 },

  compor({ mesa, tempo }) {
    const harpa = [mesa.canal({ pan: -0.25, reverb: 0.35, eco: 0.15 }), mesa.canal({ pan: 0.25, reverb: 0.35, eco: 0.15 })];
    const flauta = mesa.canal({ pan: 0.1, reverb: 0.45, eco: 0.2 });
    const cordas = [mesa.canal({ pan: -0.3, reverb: 0.5 }), mesa.canal({ pan: 0.3, reverb: 0.5 })];

    HARMONIA.forEach((cifra, c) => {
      const [r, t3, q] = acorde(cifra, 4);
      // o desenho da caixinha: quinta, oitava, terça, oitava, segunda, oitava, terça, quinta
      const celula = [q, r + 12, t3, r + 12, r + 2, r + 12, t3, q];
      for (let i = 0; i < 8; i++) kit.pincado(mesa, harpa[i % 2], tempo.t(c, i / 2), celula[i], tempo.d(0.45), (i % 2 ? 0.035 : 0.05) * (c >= 16 && c < 24 ? 0.55 : 1));
      acorde(cifra, 3).forEach((n, v) => kit.cordas(mesa, cordas[v % 2], tempo.t(c, 0), n + 12, tempo.d(3.8), 0.03, v % 2 ? 5 : -5));
    });
    frase(kit.flauta, mesa, flauta, tempo, 0, CANTO, 0.13);
    frase(kit.flauta, mesa, flauta, tempo, 8, CANTO2, 0.13);
    frase(kit.flauta, mesa, flauta, tempo, 16, CANTO, 0.08, -12);
    frase(kit.flauta, mesa, flauta, tempo, 24, CANTO2, 0.13);
  },
};
