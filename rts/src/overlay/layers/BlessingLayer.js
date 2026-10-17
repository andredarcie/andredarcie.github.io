import { CHARACTER_HEIGHT, LIFE_SIZE } from '../../config/organisms.js';
import { BLESSING_FADE } from '../../config/rts.js';

// Pontinhos de luz subindo de cada pessoa abençoada.
const MOTES = 6;

// Em pixels de tela: a luz divina sobre quem Antônio Conselheiro está curando. Um
// facho dourado desce do céu sobre a pessoa, o corpo brilha por dentro e pontinhos
// de luz sobem dela. Tudo some devagar quando a vida enche (`blessed` vai a zero).
// Somado com 'lighter', para clarear o que está embaixo em vez de pintar por cima.
export class BlessingLayer {
  #state;
  #motion;

  constructor(state, motion) {
    this.#state = state;
    this.#motion = motion;
  }

  draw({ ctx, project, elapsed }) {
    const animate = this.#motion.animate;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const u of this.#state.organisms) {
      if (!(u.blessed > 0) || u.life <= 0) continue;
      const strength = Math.min(1, u.blessed / BLESSING_FADE);
      const scale = u.size / LIFE_SIZE;
      const feet = project(u.x, u.y, 0);
      const chest = project(u.x, u.y, CHARACTER_HEIGHT * .55 * scale);
      const head = project(u.x, u.y, CHARACTER_HEIGHT * scale);
      const tall = Math.max(6, feet.y - head.y);
      // Respira de leve, para a luz parecer viva e não um adesivo.
      const breath = animate ? .85 + .15 * Math.sin(elapsed * 3 + u.id) : 1;
      this.#beam(ctx, feet, head, tall, strength * breath);
      this.#glow(ctx, chest, tall, strength * breath);
      if (animate) this.#motes(ctx, u, feet, chest, tall, strength, elapsed);
    }
    ctx.restore();
  }

  // Facho de cima: estreito no alto, abrindo até o chão, mais forte embaixo.
  #beam(ctx, feet, head, tall, strength) {
    const top = head.y - tall * 2.4;
    const gradient = ctx.createLinearGradient(0, top, 0, feet.y);
    gradient.addColorStop(0, 'rgba(255, 232, 160, 0)');
    gradient.addColorStop(.55, `rgba(255, 226, 145, ${.16 * strength})`);
    gradient.addColorStop(1, `rgba(255, 218, 130, ${.3 * strength})`);
    const half = tall * .42;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(head.x - half * .45, top);
    ctx.lineTo(head.x + half * .45, top);
    ctx.lineTo(feet.x + half, feet.y);
    ctx.lineTo(feet.x - half, feet.y);
    ctx.closePath();
    ctx.fill();
  }

  // Brilho em volta do corpo, mais claro no peito.
  #glow(ctx, chest, tall, strength) {
    const radius = tall * .95;
    const gradient = ctx.createRadialGradient(chest.x, chest.y, 0, chest.x, chest.y, radius);
    gradient.addColorStop(0, `rgba(255, 244, 190, ${.55 * strength})`);
    gradient.addColorStop(.45, `rgba(255, 220, 130, ${.22 * strength})`);
    gradient.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(chest.x - radius, chest.y - radius, radius * 2, radius * 2);
  }

  // Pontinhos de luz subindo do pé até acima da cabeça e apagando no caminho.
  #motes(ctx, u, feet, chest, tall, strength, elapsed) {
    const size = Math.max(1, tall * .05);
    for (let i = 0; i < MOTES; i++) {
      const t = (elapsed * .55 + i / MOTES + u.id * .137) % 1;
      const x = chest.x + Math.sin(i * 2.3 + u.id + elapsed * 1.6) * tall * .32;
      const y = feet.y - t * tall * 1.5;
      ctx.fillStyle = `rgba(255, 238, 170, ${strength * (1 - t) * .9})`;
      ctx.beginPath();
      ctx.arc(x, y, size * (1 - t * .5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
