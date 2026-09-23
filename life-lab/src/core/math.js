// Funções matemáticas puras, sem estado, usadas em todo o projeto.

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function easeInOut(t) {
  return t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// Ruído determinístico: as árvores precisam cair sempre no mesmo lugar, senão a
// ilha se reembaralha a cada redimensionamento da janela.
export function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
