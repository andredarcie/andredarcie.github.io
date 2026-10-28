// Lugares no mapa para as missões, em unidades do mundo (o mapa tem 820 × 820 e a
// vila fica no meio). `near` dá um ponto ao lado de uma estrada da era aberta: a
// `distance` do meio, andando pela estrada para fora, e `side` para o lado dela.
// Estrada que não existe nesta era (os dados das outras eras também são lidos)
// devolve o meio do mapa: esses pontos nunca são usados.
import { ROADS, CENTER } from '../rts.js';

export function near(roadId, distance, side = 0) {
  const road = ROADS.find(item => item.id === roadId);
  if (!road) return { x: CENTER.x, y: CENTER.y };
  const { x: dx, y: dy } = road.dir;
  return { x: Math.round(CENTER.x - dx * distance - dy * side), y: Math.round(CENTER.y - dy * distance + dx * side) };
}

// Um ponto a `distance` do meio, no ângulo `degrees` (0 = leste, 90 = sul).
export function around(degrees, distance) {
  const angle = degrees * Math.PI / 180;
  return { x: Math.round(CENTER.x + Math.cos(angle) * distance), y: Math.round(CENTER.y + Math.sin(angle) * distance) };
}

export const MIDDLE = Object.freeze({ x: CENTER.x, y: CENTER.y });
