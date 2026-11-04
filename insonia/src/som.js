// Som do jogo: fachada usada pelo resto do código.
// O trailer de 2014 não tem áudio; tudo aqui é sintetizado (src/audio/):
//   motor.js    contexto, cadeia mestre (compressor + limitador), reverberação por sala, ruídos
//   efeitos.js  efeitos por modelo físico (portas, metal, passos por piso, trovão, susto...)
//   ambiente.js ambiente por mapa (ar, pavor, vento, chuva, eventos distantes, coração)
import { ac, contexto, M } from './audio/motor.js';
import * as fx from './audio/efeitos.js';
import { ambiente as amb, superficie } from './audio/ambiente.js';

let pendente = null, intens = 1, silenciado = false, timer = null;

// a cada 250 ms: aplica a troca de mapa pendente e sorteia o ambiente do próximo 1,2 s
function tick() {
  const c = contexto(); if (!c) return;
  if (pendente) {
    amb.trocar(pendente); pendente = null;
    if (!silenciado) M.amb.gain.setTargetAtTime(intens, c.currentTime, 0.8);
  }
  if (c.state === 'running') amb.agendarAte(c.currentTime + 1.2);
}
function ligar() { if (!timer) timer = setInterval(tick, 250); }

export const som = {
  // o navegador só libera o áudio depois de um gesto (tecla/toque)
  destravar() { if (ac()) { ligar(); tick(); } },
  // app em segundo plano (celular): silencia tudo; volta ao reabrir
  pausar(p) { const c = contexto(); if (!c) return; if (p) c.suspend?.(); else c.resume?.(); },
  pronto() { const c = contexto(); return !!c && c.state === 'running'; },

  // ambiente
  mapa(id) { pendente = id; silenciado = false; ligar(); tick(); },
  tensao(v) { if (contexto()) amb.tensao(v); },
  silencio(seg = 3) {
    silenciado = true;
    const c = contexto(); if (!c) return;
    M.amb.gain.cancelScheduledValues(c.currentTime);
    M.amb.gain.setTargetAtTime(0, c.currentTime, seg / 4);
  },
  ambiente(i = 1) {
    intens = i;
    const c = contexto(); if (!c || silenciado) return;
    M.amb.gain.setTargetAtTime(intens, c.currentTime, 0.8);
  },
  superficie,

  // interface
  cursor: () => fx.cursor(),
  ok: () => fx.ok(),
  cancelar: () => fx.cancelar(),
  erro: () => fx.erro(),
  item: () => fx.item(),
  // mundo
  porta: () => fx.porta(),
  trancada: () => fx.trancada(),
  destrancar: () => fx.destrancar(),
  metal: () => fx.metal(),
  quebrar: () => fx.quebrar(),
  grito: () => fx.grito(),
  passo: (sup = 'pedra', op = {}) => fx.passo(sup, op),
  batida: () => fx.batida(),
  trovao: () => fx.trovao(),
  susto: () => fx.susto(),
  girar: () => fx.girar(),
  armadilha: () => fx.armadilha(),
  apagao: () => fx.apagao(),
};
