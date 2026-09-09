/* Utilidades numéricas. Sem estado, sem dependências: qualquer módulo pode usar
   sem criar acoplamento. */

export const TAU = Math.PI * 2;

export const rand = (a, b) => a + Math.random() * (b - a);

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const pick = (list) => list[(Math.random() * list.length) | 0];

export const coin = (chance = 0.5) => Math.random() < chance;

/** Traz uma diferença de ângulo para o intervalo [-PI, PI]. */
export function angDiff(d) {
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}
