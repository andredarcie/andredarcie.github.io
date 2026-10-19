// Ronco: substitui o BGS "Darkness" (ambiente de um dos Corredores, junto com
// a música da mansão). Da original: mono, ronco de ruído largo e irregular
// (como vento ou tremor) de ~20 até 300–400 Hz, com um pouco de textura até
// ~800 Hz, volume quase constante. Som novo: duas camadas de ruído marrom com
// filtros que abrem e fecham devagar (uma grave, uma mais aberta para ser
// ouvida em alto-falante pequeno) e um toque de grave pulsante por baixo.
import { nota, vento } from '../sintese.js';

export default {
  id: 'ronco',
  tempo: { bpm: 60, batidas: 4, swing: 0.5 },
  compassos: 3,           // 12 s
  mono: true,
  volumeDb: -10,
  mesa: { reverb: { segundos: 1.2, brilho: 0.25 }, semente: 10 },

  compor({ mesa, loop }) {
    const c0 = mesa.canal({ pan: 0, reverb: 0.2 });
    // corpo: ruído marrom grave, filtro entre 90 e 260 Hz
    vento(mesa, c0, { t: 0, dur: loop + 0.1, vol: 1.2, de: 90, ate: 260, periodo: 4.2, tremor: 0.45 });
    // ar: mais aberto e mais baixo, para aparecer no celular/notebook
    vento(mesa, c0, { t: 0, dur: loop + 0.1, vol: 0.7, de: 250, ate: 700, periodo: 6.3, tremor: 0.6 });
    // grave pulsante por baixo (dois senos que batem ~5 vezes por segundo), discreto
    const env = { a: 0.05, d: 0.1, s: 1, r: 0.05 };
    nota(mesa, c0, { t: 0, dur: loop, midi: 28, vol: 0.12, tipo: 'sine', env });
    nota(mesa, c0, { t: 0, dur: loop, midi: 28, desafina: 191, vol: 0.1, tipo: 'sine', env });
  },
};
