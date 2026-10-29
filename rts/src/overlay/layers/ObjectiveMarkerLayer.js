import { CHARACTER_HEIGHT } from '../../config/organisms.js';

// Onde o objetivo da vez está (MissionDirector.markers): um anel tracejado dourado no
// chão onde se deve chegar, um anel vermelho e uma seta por cima de quem se deve
// derrubar, e — se nada disso está na tela — uma seta na borda apontando para lá.
// Some durante as cenas e no modo de obra.
const GOLD = '#ffd36b';
const RED = '#ff6a55';
const INK = 'rgba(20, 14, 8, .75)';
// Pontos do círculo projetado no chão (o anel sai elíptico, como o chão na tela).
const RING_STEPS = 36;
// Distância da seta da borda até a beirada da tela; em cima e embaixo ela foge da
// barra de cima e do painel de baixo.
const EDGE = { side: 30, top: 74, bottom: 128 };

export class ObjectiveMarkerLayer {
  #mission;
  #motion;

  constructor(mission, motion) {
    this.#mission = mission;
    this.#motion = motion;
  }

  draw({ ctx, width, height, elapsed, project }) {
    if (document.body.classList.contains('cutscene-on') || document.body.classList.contains('build-mode')) return;
    const marks = this.#mission.markers();
    if (!marks.length) return;
    const pulse = this.#motion.animate ? (Math.sin(elapsed * 4) + 1) / 2 : 1;
    const inside = point => point.x > 0 && point.y > 0 && point.x < width && point.y < height;
    let shown = false, nearest = null, nearestDistance = Infinity;
    ctx.save();
    for (const mark of marks) {
      const center = project(mark.x, mark.y, 0);
      if (inside(center)) shown = true;
      else {
        const distance = Math.hypot(center.x - width / 2, center.y - height / 2);
        if (distance < nearestDistance) { nearest = center; nearestDistance = distance; }
      }
      if (mark.kind === 'target') this.#target(ctx, project, mark, pulse, elapsed);
      else this.#ring(ctx, project, mark, pulse, elapsed, mark.kind === 'goal' ? GOLD : RED);
    }
    if (!shown && nearest) this.#edgeArrow(ctx, nearest, width, height, pulse, marks[0].kind === 'goal' ? GOLD : RED);
    ctx.restore();
  }

  // O lugar aonde chegar: anel tracejado girando devagar e uma seta descendo no meio.
  #ring(ctx, project, mark, pulse, elapsed, color) {
    ctx.beginPath();
    for (let i = 0; i <= RING_STEPS; i++) {
      const angle = i / RING_STEPS * Math.PI * 2;
      const p = project(mark.x + Math.cos(angle) * mark.radius, mark.y + Math.sin(angle) * mark.radius, 0);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.fillStyle = color === GOLD ? 'rgba(255, 211, 107, .08)' : 'rgba(255, 106, 85, .06)';
    ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = this.#motion.animate ? -elapsed * 12 : 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = .55 + .45 * pulse;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (color === GOLD) {
      const top = project(mark.x, mark.y, 18 + 6 * pulse);
      this.#chevron(ctx, top.x, top.y, 9, color);
    }
  }

  // Quem derrubar: um anel no pé e a seta por cima da cabeça (ou do telhado).
  #target(ctx, project, mark, pulse, elapsed) {
    const radius = mark.radius + 3;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const angle = i / 20 * Math.PI * 2;
      const p = project(mark.x + Math.cos(angle) * radius, mark.y + Math.sin(angle) * radius, 0);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = RED;
    ctx.globalAlpha = .5 + .5 * pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const lift = mark.radius > 12 ? 40 : CHARACTER_HEIGHT + 10;
    const top = project(mark.x, mark.y, lift + 3 * pulse);
    this.#chevron(ctx, top.x, top.y, 6, RED);
  }

  // Seta de ponta para baixo, contornada para aparecer em cima de qualquer chão.
  #chevron(ctx, x, y, size, color) {
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x - size, y - size * .4);
    ctx.lineTo(x - size * .35, y - size * .4);
    ctx.lineTo(x - size * .35, y - size * 1.3);
    ctx.lineTo(x + size * .35, y - size * 1.3);
    ctx.lineTo(x + size * .35, y - size * .4);
    ctx.lineTo(x + size, y - size * .4);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }

  // Fora da tela: um triângulo na borda, na direção do objetivo.
  #edgeArrow(ctx, point, width, height, pulse, color) {
    const cx = width / 2, cy = height / 2;
    const angle = Math.atan2(point.y - cy, point.x - cx);
    const left = EDGE.side, right = width - EDGE.side, top = EDGE.top, bottom = height - EDGE.bottom;
    if (right <= left || bottom <= top) return;
    // Até onde a reta do meio da tela vai antes de bater na moldura.
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const tx = dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity;
    const ty = dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity;
    const t = Math.min(tx, ty);
    const x = cx + dx * t, y = cy + dy * t;
    const size = 11 + 3 * pulse;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * .7, -size * .75);
    ctx.lineTo(-size * .35, 0);
    ctx.lineTo(-size * .7, size * .75);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
