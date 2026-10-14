import { pointAlong } from '../../world/Roads.js';

// Segundos finais da calmaria em que o aviso das estradas pisca mais forte.
const URGENT = 20;

// No chão, na boca de cada estrada por onde a próxima onda vai entrar: setas
// vermelhas apontando para dentro, pulsando. Na calmaria ficam fracas e vão
// esquentando conforme o relógio acaba; com a onda em andamento, marcam as estradas
// que ainda estão soltando gente.
export class RoadWarningLayer {
  #state;
  #motion;

  constructor(state, motion) {
    this.#state = state;
    this.#motion = motion;
  }

  draw({ ctx, elapsed }) {
    const wave = this.#state.wave;
    if (!wave || this.#state.winner) return;
    let roads, strength;
    if (wave.phase === 'calm') {
      roads = wave.next.roads;
      strength = .35 + .65 * Math.max(0, 1 - wave.timer / URGENT);
    } else {
      roads = [...new Set(wave.queue.map(item => item.road).filter(Boolean))];
      strength = 1;
    }
    if (!roads.length) return;
    const pulse = this.#motion.animate ? .6 + .4 * Math.sin(elapsed * 5) : 1;
    ctx.save();
    for (const road of roads) {
      for (let i = 0; i < 3; i++) {
        // As setas seguem a curva da trilha.
        const spot = pointAlong(road, 14 + i * 13);
        const dir = { x: spot.dx, y: spot.dy };
        const nx = -dir.y, ny = dir.x;
        const x = spot.x, y = spot.y;
        // Cada seta acende um pouco depois da anterior: a fila parece andar para dentro.
        const wave3 = this.#motion.animate ? (Math.sin(elapsed * 6 - i * 1.1) + 1) / 2 : 1;
        ctx.globalAlpha = strength * (.35 + .65 * wave3) * pulse;
        ctx.fillStyle = '#ff4b3a';
        ctx.strokeStyle = 'rgba(40, 6, 4, .7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + dir.x * 6, y + dir.y * 6);
        ctx.lineTo(x - dir.x * 4 + nx * 9, y - dir.y * 4 + ny * 9);
        ctx.lineTo(x + dir.x * .5, y + dir.y * .5);
        ctx.lineTo(x - dir.x * 4 - nx * 9, y - dir.y * 4 - ny * 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
