// Raio do anel em volta do fuzil caído, em unidades do mundo, e quanto a onda abre
// além dele, na medida do fuzil caído (PickupRenderer, a um terço do modelo).
const RING = 3.7;
const WAVE = 3;

// No chão (desenhado deitado, em unidades do mundo): o anel dourado em volta de cada
// fuzil caído (state.pickups), pulsando devagar — "aqui tem coisa para pegar". O
// fuzil em si flutua em 3D por cima (PickupRenderer).
export class PickupLayer {
  #state;
  #motion;

  constructor(state, motion) {
    this.#state = state;
    this.#motion = motion;
  }

  draw({ ctx, elapsed }) {
    const pickups = this.#state.pickups;
    if (!pickups.length) return;
    const animate = this.#motion.animate;
    ctx.save();
    for (const pickup of pickups) {
      const pulse = animate ? (elapsed * .9 + pickup.x * .01) % 1 : .5;
      // Miolo claro e o aro firme.
      ctx.fillStyle = 'rgba(255, 214, 110, .14)';
      ctx.strokeStyle = 'rgba(20, 14, 8, .55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, RING, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffd36b';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Onda abrindo para fora e sumindo: chama o olho sem piscar.
      ctx.strokeStyle = `rgba(255, 211, 107, ${(1 - pulse) * .7})`;
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, RING + pulse * WAVE, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
