// Presença: sons que reagem ao jogador, para o lugar parecer habitado por alguém que não aparece.
// Tudo com as gravações reais (CC0) do jogo, tocadas longe, de lado e abafadas; nada sintetizado
// além da caixinha de música. Cada coisa acontece no máximo uma vez por visita à sala e só depois
// que o monstro apareceu (flags.monstro): antes disso o lugar é só silêncio e abandono.
//
//  1. Batida atrás da porta: pouco depois de entrar numa sala, alguém bate na porta por onde ele
//     veio, e às vezes tenta a maçaneta.
//  2. Passos atrás: em alguns corredores, cada passo dele tem um eco um pouco atrasado vindo de
//     trás. Quando ele para, às vezes ainda vem mais um passo — e depois nada.
//  3. Parado demais: se ele fica muito tempo sem andar, algo é arrastado do outro lado da parede.
//  4. A caixinha sozinha: voltando à sala do piano depois de ouvi-la, ela toca o começo da música
//     sozinha, bem baixo, e para no meio.
//  5. O assoalho: no corredor final, de vez em quando a madeira range perto, onde não tem ninguém.
import { som } from './som.js';

const R = (a, b) => a + Math.random() * (b - a);
const lado = () => (Math.random() < 0.5 ? -1 : 1) * R(0.35, 0.7);

// onde os passos atrás podem aparecer (chance por visita) — corredor final sempre
const PASSOS_ATRAS = { corredor_final: 1, corredor: 0.35, pilares: 0.5, salao: 0.3, celas: 0.4 };
const MAX_ECOS = 14;
const SEM_BATIDA = new Set(['quarto_menino', 'hospital', 'guilhotina', 'sala_enigma']);
// a caixinha: as 4 primeiras notas da melodia (sol ré mi sol), mais lentas, e corta
const CAIXINHA_COMECO = [392.0, 293.66, 329.63, 392.0];

export function presenca(j) {
  if (!j.mapa) return;
  const h = j.heroi;
  let P = j._presenca;
  // troca de sala: começa uma visita nova
  if (!P || P.mapa !== j.mapaId) {
    P = j._presenca = { mapa: j.mapaId, t0: j.t, fila: [], ecos: 0, x: h.x, y: h.y, parado: j.t, arrastou: false, andando: false,
      passos: Math.random() < (PASSOS_ATRAS[j.mapaId] || 0), batida: false, rangidos: 0 };
    aoEntrar(j, P);
  }
  // resolvido o piano, é o fim do jogo: o que estava agendado não toca mais (o teclado pausa o
  // jogo, e o que estava na fila sairia bem em cima do desfecho)
  if (j.flags.piano) { P.fila.length = 0; return; }
  // fila de sons agendados (em quadros)
  for (let i = P.fila.length - 1; i >= 0; i--) if (j.t >= P.fila[i].em) { const f = P.fila[i].fn; P.fila.splice(i, 1); f(); }
  // (depois do piano é o fim do jogo: nada de susto solto por cima das cenas)
  if (!j.flags.monstro || j.def.cena || j.flags.piano) return;
  const quieto = !j.rodando && !j.msg.aberta && !j.overlay;
  // movimento do herói: um passo novo começou quando o tile mudou
  const mudou = h.x !== P.x || h.y !== P.y;
  if (mudou) {
    P.x = h.x; P.y = h.y; P.parado = j.t; P.andando = true;
    if (P.passos && quieto && P.ecos < MAX_ECOS) {
      P.ecos++;
      const sup = som.superficie(j.mapa.specChao(h.x, h.y)?.nome, j.mapaId), pan = P.pan ?? (P.pan = lado());
      depois(P, j, Math.round(R(13, 19)), () => som.passoLonge(sup, { pan, dist: 0.5, vol: 0.3 }));
    }
  } else if (P.andando && !h.movendo && j.t - P.parado > 8) {
    // parou: às vezes, ainda mais um passo atrás dele
    P.andando = false;
    if (P.passos && quieto && P.ecos > 2 && P.ecos < MAX_ECOS && Math.random() < 0.35) {
      P.ecos = MAX_ECOS;   // e depois disso, mais nada nesta visita
      const sup = som.superficie(j.mapa.specChao(h.x, h.y)?.nome, j.mapaId), pan = P.pan ?? lado();
      depois(P, j, Math.round(R(30, 45)), () => som.passoLonge(sup, { pan, dist: 0.45, vol: 0.34 }));
    }
  }
  // parado demais: algo arrastado do outro lado da parede (uma vez por visita)
  if (quieto && !P.arrastou && j.t - P.parado > 60 * 11) {
    P.arrastou = true;
    som.arrastoLonge({ pan: lado(), dist: 0.65, vol: 0.28 });
  }
  // o assoalho do corredor final rangendo perto
  if (j.mapaId === 'corredor_final' && quieto && P.rangidos < 2 && Math.random() < 1 / (60 * 14)) {
    P.rangidos++;
    som.rangidoPerto({ pan: lado() * 0.5, dist: 0.3, vol: 0.22 });
  }
}

function depois(P, j, quadros, fn) { P.fila.push({ em: j.t + quadros, fn }); }

function aoEntrar(j, P) {
  if (!j.flags.monstro || j.def.cena || j.flags.piano) return;
  // 1. batida na porta por onde ele veio (nem toda vez; nunca nas cenas)
  if (!SEM_BATIDA.has(j.mapaId) && Math.random() < 0.22) {
    const pan = lado() * 0.6;
    const em = Math.round(R(60 * 3, 60 * 6));
    depois(P, j, em, () => { som.batidaLonge({ pan, dist: 0.4, vol: 0.38 }); });
    depois(P, j, em + Math.round(R(26, 40)), () => { som.batidaLonge({ pan, dist: 0.4, vol: 0.32 }); });
    if (Math.random() < 0.5) depois(P, j, em + Math.round(R(110, 150)), () => som.macanetaLonge({ pan, dist: 0.35, vol: 0.3 }));
  }
  // 4. a caixinha sozinha, ao voltar para a sala do piano
  if (j.mapaId === 'sala_piano' && j.flags.caixinha && !j.flags.piano && !j.flags.caixinhaSozinha) {
    j.flags.caixinhaSozinha = true;
    CAIXINHA_COMECO.forEach((f, i) => depois(P, j, 60 * 4 + i * 48, () => som.caixinha(f, { vol: 0.1, dist: 0.45, pan: -0.45 })));
  }
}
