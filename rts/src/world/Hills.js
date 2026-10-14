import { HILLS } from '../config/rts.js';

// Os morros em volta de Belo Monte (o da Favela, onde a 4ª expedição assentou a
// artilharia, e o Alto do Mário): um platô de topo achatado, com encosta suave e a
// borda ondulada, para não parecer um disco. Quem está em cima atira mais longe.

// Fração do raio em que a encosta termina e começa o topo.
const SHOULDER = .5;

function wobble(angle, seed) {
  return 1 + Math.sin(angle * 3 + seed) * .09 + Math.sin(angle * 5 + seed * 1.7) * .05;
}

// Altura do relevo num ponto do mundo (0 fora dos morros).
export function hillHeight(x, y) {
  let height = 0;
  for (const [index, hill] of HILLS.entries()) {
    const dx = x - hill.x, dy = y - hill.y;
    if (Math.abs(dx) > hill.radius * 1.2 || Math.abs(dy) > hill.radius * 1.2) continue;
    const reach = hill.radius * wobble(Math.atan2(dy, dx), index * 2.3);
    const d = Math.hypot(dx, dy) / reach;
    if (d >= 1) continue;
    const t = Math.min(1, (1 - d) / (1 - SHOULDER));
    height = Math.max(height, hill.height * t * t * (3 - 2 * t));
  }
  return height;
}

// No alto de algum morro (não na encosta): é aí que vale a vantagem do tiro.
export function hillAt(x, y) {
  for (const [index, hill] of HILLS.entries()) {
    const dx = x - hill.x, dy = y - hill.y;
    const reach = hill.radius * wobble(Math.atan2(dy, dx), index * 2.3);
    if (Math.hypot(dx, dy) < reach * .72) return hill;
  }
  return null;
}
