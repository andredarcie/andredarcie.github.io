// A forma de um lago, que o chão (a bacia) e a água (a superfície) precisam concordar.
//
// A bacia é uma tigela: fundo em parábola, profundidade proporcional ao raio cheio.
// A borda não é um círculo perfeito — ondula pelo ângulo, com a semente da posição
// do lago —, e a mesma ondulação vale para a margem da água.

// Profundidade no centro, em frações do raio cheio.
export const POND_DEPTH_RATIO = .34;

export function pondSeed(pond) {
  return (pond.x * .731 + pond.y * 1.379) % 10;
}

// Quanto o raio da borda estica ou encolhe naquele ângulo (em volta de 1).
export function rimWobble(angle, seed) {
  return 1 + Math.sin(angle * 3 + seed) * .1 + Math.sin(angle * 5 + seed * 2.3) * .055;
}

// Altura do fundo (≤ 0) a uma distância `normalized` do centro, medida em raios cheios
// já com a ondulação da borda (1 é a borda).
export function bedHeight(normalized, fullRadius) {
  if (normalized >= 1) return 0;
  return -fullRadius * POND_DEPTH_RATIO * (1 - normalized * normalized);
}

// Altura do chão num ponto do mundo, com as tigelas de todos os lagos: é onde os pés
// de quem anda por ali pisam.
export function groundHeight(x, y, ponds) {
  let height = 0;
  for (const pond of ponds) {
    const dx = x - pond.x, dy = y - pond.y;
    const limit = pond.fullRadius * 1.2;
    if (Math.abs(dx) > limit || Math.abs(dy) > limit) continue;
    const normalized = Math.hypot(dx, dy) / (pond.fullRadius * rimWobble(Math.atan2(dy, dx), pondSeed(pond)));
    height = Math.min(height, bedHeight(normalized, pond.fullRadius));
  }
  return height;
}

// Onde fica a superfície da água: a altura do fundo no ponto em que a água encosta
// na margem. O raio molhado (pond.r) é o que a simulação dá pelo volume.
export function waterLevel(wetRadius, fullRadius) {
  return bedHeight(Math.min(1, wetRadius / Math.max(1e-6, fullRadius)), fullRadius);
}
