import { WORLD } from '../config/world.js';
import { TUPI } from '../config/mission.js';

// O mar da missão dos tupinambás: a costa é uma enseada, com a praia no fundo dela
// (no sul do mapa, abaixo da aldeia) e as pontas de pedra nos cantos. Abaixo da
// linha da costa é mar: ninguém anda nele, só as canoas. Em Canudos não há mar, e
// tudo aqui responde "terra".

// A linha d'água no meio da enseada e o quanto ela sobe nas pontas.
const BAY = 682;
const HEADLAND = 58;
// Largura da faixa de areia acima da linha d'água.
export const BEACH = 46;

// Onde a água começa na coluna x (y cresce para o sul).
export function coastY(x) {
  if (!TUPI) return Infinity;
  const t = (x - WORLD.width / 2) / (WORLD.width / 2);
  return BAY - HEADLAND * t * t + Math.sin(x * .021 + 1.3) * 5 + Math.sin(x * .053) * 2.5;
}

// O ponto está na água, com `pad` de folga para cima da linha d'água?
export function inSea(x, y, pad = 0) {
  return TUPI && y > coastY(x) - pad;
}

// O ponto está na areia (entre a mata e a água)?
export function onBeach(x, y) {
  return TUPI && y > coastY(x) - BEACH && y <= coastY(x);
}
