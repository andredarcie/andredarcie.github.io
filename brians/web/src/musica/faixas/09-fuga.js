// Fuga: substitui o BGS "4-16 - Switch BGM" (evento comum "Sistema de Fuga",
// a contagem da fuga). Da original: ~161 BPM, uma figura de um compasso
// (~1,5 s) que nunca para (nota grave de apoio, nota presa, corrida subindo),
// crescendo de volume e de densidade ao longo do loop, timbre de chip no
// médio. Música nova: a mesma ideia de escada sem respiro; a cada 4 compassos
// a figura sobe meio tom; um grave pulsa como coração em todo tempo; o
// tique-taque vira semicolcheia no fim; o último compasso é um alarme
// repetido, e o loop recomeça embaixo: urgência de "vai explodir".
import { kit } from '../kit.js';
import { m } from '../partitura.js';

// figura de um compasso (Dó menor), em semitons a partir da nota base:
// [batida, duração em batidas, intervalo]
// âncora grave, nota presa uma quinta acima e a corrida lá em cima (saltos grandes)
const FIGURA = [[0, 0.5, 0], [0.5, 1.5, 7], [2, 0.5, 20], [2.5, 0.5, 19], [3, 0.5, 23], [3.5, 0.5, 24]];
const FIGURA_DENSA = [[0, 0.5, 0], [0.5, 1, 7], [1.5, 0.5, 19], [2, 0.25, 20], [2.25, 0.25, 19], [2.5, 0.25, 20], [2.75, 0.25, 23],
  [3, 0.25, 24], [3.25, 0.25, 23], [3.5, 0.25, 24], [3.75, 0.25, 27]];

export default {
  id: 'fuga',
  tempo: { bpm: 161.5, batidas: 4, swing: 0.5 },
  compassos: 12,
  volumeDb: -25.5,
  mesa: { reverb: { segundos: 0.8, brilho: 0.5 }, semente: 9 },

  compor({ mesa, tempo }) {
    const chip = [mesa.canal({ pan: -0.85, reverb: 0.12 }), mesa.canal({ pan: 0.85, reverb: 0.12 })];
    const relogio = mesa.canal({ pan: 0.7, reverb: 0.05 });
    const coracao = mesa.canal({ pan: 0, reverb: 0.05 });
    for (let c = 0; c < 12; c++) {
      const base = m('C3') + Math.floor(c / 4);          // sobe meio tom a cada 4 compassos
      const forca = 0.6 + 0.4 * (c / 11);               // crescendo ao longo do loop
      const alarme = c === 11;
      // escada (duas vozes de chip levemente desafinadas, uma de cada lado)
      if (alarme) {
        for (let i = 0; i < 16; i++) {
          const n = base + 24 + (i % 2 ? 1 : 0);        // alarme: duas notas coladas, em semicolcheias
          chip.forEach((canal, l) => kit.chip(mesa, canal, tempo.t(c, i / 4) + l * 0.004, n + (l ? -12 : 0), tempo.d(0.2), 0.06 * forca));
        }
      } else {
        for (const [b, d, iv] of c >= 8 ? FIGURA_DENSA : FIGURA) {
          chip.forEach((canal, l) => kit.chip(mesa, canal, tempo.t(c, b) + l * 0.004, base + iv, tempo.d(d) * 0.9, (b === 0 ? 0.075 : 0.06) * forca));
        }
      }
      // martelo: uma nota média repetida em colcheias o compasso inteiro (sirene, sem respiro)
      if (!alarme) for (let i = 0; i < 8; i++) kit.chip(mesa, chip[(i + 1) % 2], tempo.t(c, i / 2), base + 19, tempo.d(0.3), (i % 2 ? 0.03 : 0.04) * forca);
      // coração: grave em todo tempo, mais forte no primeiro
      for (let bt = 0; bt < 4; bt++) {
        kit.bumbo(mesa, coracao, tempo.t(c, bt), (bt === 0 ? 0.06 : 0.035) * forca);
        kit.baixo(mesa, coracao, tempo.t(c, bt), base - 12, tempo.d(0.3), 0.03 * forca);
      }
      // tique-taque: colcheias, semicolcheias nos últimos 4 compassos
      const passos = c >= 8 ? 16 : 8;
      for (let i = 0; i < passos; i++) kit.madeira(mesa, relogio, tempo.t(c, (i * 4) / passos), (i % (passos / 4) === 0 ? 0.06 : 0.035) * forca, i % 2 ? 1500 : 1100);
    }
  },
};
