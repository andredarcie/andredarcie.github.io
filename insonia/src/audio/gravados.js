// Efeitos com som gravado de verdade (amostras CC0 em assets/sfx; origem de cada uma em
// assets/sfx/CREDITOS.md). Cada função devolve false se as amostras ainda não carregaram,
// e aí o efeitos.js toca a versão sintetizada.
import { contexto, saida, tocarAmostra, temAmostra, carregarAmostras, rajada } from './motor.js';

const GRUPOS = {
  passo_madeira: 10, passo_pedra: 5, passo_tapete: 5, metal_chapa: 3, arrasto: 4,
  porta_abre: 2, porta_fecha: 3, rangido: 2, trancada: 1, destranca: 1,
  metal_golpe: 5, metal_medio: 5, metal_queda: 3, pancada: 5, trovao: 1,
  pedra_queda: 4, lamina: 1, soco: 5, grito: 5,
};
export const NOMES = Object.entries(GRUPOS).flatMap(([g, n]) => Array.from({ length: n }, (_, i) => `${g}_${i + 1}`));
export function carregarGravados() { if (contexto()) return carregarAmostras(NOMES); return null; }

const R = (a, b) => a + Math.random() * (b - a);
const ultimo = {};
// sorteia uma variação sem repetir a anterior (passos iguais em seguida soam "de máquina")
function sorteia(g) {
  const n = GRUPOS[g]; let i;
  do { i = 1 + Math.floor(Math.random() * n); } while (n > 1 && i === ultimo[g]);
  ultimo[g] = i;
  return `${g}_${i}`;
}
const pronto = (g) => temAmostra(`${g}_1`);
// EQ: passa-alta + realce de médio (o "toc") + agudo (salto/areia). Devolve a entrada da cadeia.
function eq(out, { hp = 0, f = 0, ganho = 0, agudo = 0 } = {}) {
  const c = contexto(); let ini = out;
  if (agudo) { const h = c.createBiquadFilter(); h.type = 'highshelf'; h.frequency.value = 3000; h.gain.value = agudo; h.connect(ini); ini = h; }
  if (f) { const m = c.createBiquadFilter(); m.type = 'peaking'; m.frequency.value = f; m.Q.value = 1; m.gain.value = ganho; m.connect(ini); ini = m; }
  if (hp) { const a = c.createBiquadFilter(); a.type = 'highpass'; a.frequency.value = hp; a.Q.value = 0.7; a.connect(ini); ini = a; }
  return ini;
}
const EQ_PASSO = { passo_madeira: { hp: 80, agudo: 2 }, passo_pedra: { hp: 85, f: 900, ganho: 3, agudo: 4 }, passo_tapete: { hp: 80 } };

function toca(g, t, out, { rate = 1, vol = 1, varia = 0.03, ...op } = {}) {
  return tocarAmostra(sorteia(g), t, out, { rate: rate * (1 + (Math.random() * 2 - 1) * varia), vol: vol * R(0.9, 1.1), ...op });
}

export const gravado = {
  // passo: madeira (tacos), pedra (banheiro, salas de pedra), ladrilho (hospital), metal (duto), tapete
  passo(sup, t, op = {}) {
    const g = sup === 'tapete' ? 'passo_tapete' : sup === 'madeira' ? 'passo_madeira' : 'passo_pedra';
    if (!pronto(g)) return false;
    const out = eq(saida({ bus: op.bus ?? 'fx', rev: 0.12, vol: op.vol ?? 0.55, pan: op.pan ?? 0, dist: op.dist ?? 0 }), EQ_PASSO[g]);
    const k = 0.38;                                            // amostras vêm niveladas em -18 dBFS
    if (op.pesado) {
      // o monstro: passo mais grave e lento, e o pé arrastando logo depois
      toca(g, t, out, { rate: 0.72, vol: k * 1.3, varia: 0.04 });
      if (pronto('arrasto')) toca('arrasto', t + R(0.1, 0.16), out, { rate: R(0.55, 0.68), vol: k * 0.3, ini: R(0, 0.3), dur: R(0.35, 0.5), fade: 0.15 });
      return true;
    }
    toca(g, t, out, { rate: sup === 'ladrilho' ? 1.07 : 1, vol: k });
    if (sup === 'metal' && pronto('metal_chapa')) toca('metal_chapa', t, out, { rate: R(1.2, 1.4), vol: k * 0.3 }); // chapa do duto
    return true;
  },
  porta(t, op = {}) {
    if (!pronto('porta_abre') || !pronto('porta_fecha')) return false;
    const out = saida({ rev: 0.3, vol: 0.65, ...op });
    toca('porta_abre', t, out, { vol: 0.9 });
    if (pronto('rangido') && Math.random() < 0.5) toca('rangido', t + 0.12, out, { vol: 0.45, rate: R(0.85, 1) });
    toca('porta_fecha', t + 0.85, out, { vol: 0.75 });
    return true;
  },
  trancada(t, op = {}) {
    if (!pronto('trancada')) return false;
    toca('trancada', t, saida({ rev: 0.25, vol: 0.42, ...op }), { varia: 0.04 });
    return true;
  },
  destrancar(t, op = {}) {
    if (!pronto('destranca')) return false;
    toca('destranca', t, saida({ rev: 0.25, vol: 0.7, ...op }), { varia: 0.02 });
    return true;
  },
  // grade sendo forçada ou atingida
  metal(t, op = {}) {
    if (!pronto('metal_golpe') || !pronto('metal_medio')) return false;
    const out = saida({ rev: 0.35, vol: 0.4, ...op });
    toca('metal_golpe', t, out, { vol: 0.8 });
    toca('metal_medio', t + R(0.015, 0.04), out, { vol: 0.5 });
    return true;
  },
  // a grade cede e cai
  quebrar(t, op = {}) {
    if (!pronto('metal_golpe') || !pronto('metal_queda')) return false;
    const out = saida({ rev: 0.4, vol: 0.42, ...op });
    toca('metal_golpe', t, out, { vol: 0.9, rate: 0.9 });
    toca('metal_queda', t + 0.28, out, { vol: 0.9 });
    if (pronto('pedra_queda')) toca('pedra_queda', t + 0.45, out, { vol: 0.25 });   // poeira e reboco
    return true;
  },
  // pancadas pesadas na porta: a madeira e a maçaneta chacoalhando no batente
  batida(t, op = {}) {
    if (!pronto('pancada')) return false;
    const out = saida({ rev: 0.38, vol: 0.5, ...op });
    toca('pancada', t, out, { vol: 1, rate: R(0.85, 0.95) });
    if (pronto('trancada')) toca('trancada', t + 0.01, out, { vol: 0.3, ini: 0.1, dur: 0.3, fade: 0.12 });
    return true;
  },
  // grito abafado vindo de longe, atrás das paredes
  grito(t, op = {}) {
    if (!pronto('grito')) return false;
    toca('grito', t, saida({ rev: 0.9, vol: 0.4, dist: 0.62, pan: op.pan ?? R(-0.3, 0.3) }), { varia: 0.02 });
    return true;
  },
  trovao(t, op = {}) {
    if (!pronto('trovao')) return false;
    const out = saida({ rev: 0.25, vol: 0.55, pan: op.pan ?? R(-0.4, 0.4) });
    toca('trovao', t + R(0.05, 0.5), out, { rate: R(0.85, 1.05), varia: 0 });
    return true;
  },
  // a sala gira: pedra raspando em pedra, depois trava com um baque e cai reboco
  girar(t, op = {}) {
    if (!pronto('arrasto') || !pronto('pancada')) return false;
    const out = saida({ rev: 0.45, vol: 0.42, ...op });
    toca('arrasto', t, out, { rate: 0.55, vol: 1, fade: 0.3 });
    toca('arrasto', t + 0.45, out, { rate: 0.5, vol: 0.8, fade: 0.4 });
    rajada(t, 1.6, out, { tipo: 'marrom', filtro: 'lowpass', f: 150, vol: 0.35, a: 0.3 });   // o peso da sala
    toca('pancada', t + 1.6, out, { rate: 0.7, vol: 1 });
    if (pronto('pedra_queda')) toca('pedra_queda', t + 1.7, out, { vol: 0.45 });
    return true;
  },
  armadilha(t, op = {}) {
    if (!pronto('lamina') || !pronto('metal_golpe')) return false;
    const out = saida({ rev: 0.3, vol: 0.42, ...op });
    toca('lamina', t, out, { vol: 1, rate: 1.1 });
    toca('metal_golpe', t + 0.12, out, { vol: 0.9 });
    if (pronto('soco')) toca('soco', t + 0.14, out, { vol: 0.7 });
    return true;
  },
};
