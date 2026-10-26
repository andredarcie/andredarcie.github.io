import { CHARACTER_HEIGHT } from '../../config/organisms.js';
import { ICON_PATHS } from '../../ui/Icons.js';

const FOOD_ICON = new Path2D(ICON_PATHS.food);
const WOOD_ICON = new Path2D(ICON_PATHS.wood);
const RIFLE_ICON = new Path2D(ICON_PATHS.rifles);

// Comprimento do risco da bala desenhada, em unidades do mundo.
const BULLET_LENGTH = 9;
// Fração inicial da vida do tiro em que o risco até o alvo aparece.
const TRACER_SHARE = .07;
// A flecha desenhada: comprimento no mundo e a altura máxima do arco do voo.
const ARROW_LENGTH = 10;
const ARROW_ARC = 18;

// Em pixels de tela: as balas das trincheiras no ar; a fumaça branca da pólvora
// negra na boca de cada arma que dispara (fuzil, bacamarte, canhão) com o risco
// rápido até o alvo; o estouro da carga de bacamarte e o da granada do Krupp; e o
// "+6 comida +4 madeira" (com os ícones do jogo) que sobe de onde o soldado caiu.
export class EffectsLayer {
  #state;
  #theme;

  constructor(state, theme) {
    this.#state = state;
    this.#theme = theme;
  }

  draw({ ctx, project }) {
    const state = this.#state;
    ctx.save();
    for (const spark of state.sparks) this.#burst(ctx, project, spark);
    for (const shot of state.shots) this.#shot(ctx, project, shot);
    for (const p of state.projectiles) this.#bullet(ctx, project, p);
    for (const floater of state.floaters) this.#floater(ctx, project, floater);
    ctx.restore();
  }

  #bullet(ctx, project, p) {
    if (p.arrow) {
      // A flecha da cerca: o arco do voo vem da torre (p.lift), e ela aponta para onde vai.
      const head = { x: p.x, y: p.y, z: p.z + p.lift };
      const before = { x: p.px, y: p.py, z: p.pz + p.plift };
      this.#arrow(ctx, project, before, head);
      return;
    }
    const dx = p.x - p.px, dy = p.y - p.py, dz = p.z - p.pz;
    const length = Math.hypot(dx, dy, dz) || 1;
    const k = BULLET_LENGTH / length;
    const tip = project(p.x, p.y, p.z);
    const tail = project(p.x - dx * k, p.y - dy * k, p.z - dz * k);
    const trail = ctx.createLinearGradient(tail.x, tail.y, tip.x, tip.y);
    trail.addColorStop(0, 'rgba(60, 50, 40, 0)');
    trail.addColorStop(1, 'rgba(40, 32, 24, .85)');
    ctx.strokeStyle = trail;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }

  // Disparo: o clarão e a nuvem de fumaça que sobe e se desfaz devagar (pólvora negra
  // fazia muita fumaça); no começo, o risco até onde o tiro foi.
  #shot(ctx, project, shot) {
    const t = shot.time / shot.life;
    if (shot.arrow) {
      // A flecha do arco: sem fumaça nem clarão, voando em arco até onde cai.
      const at = k => {
        const lift = Math.sin(Math.PI * k) * Math.min(ARROW_ARC, Math.hypot(shot.tx - shot.x, shot.ty - shot.y) * .14);
        return { x: shot.x + (shot.tx - shot.x) * k, y: shot.y + (shot.ty - shot.y) * k, z: shot.z + (shot.tz - shot.z) * k + lift };
      };
      this.#arrow(ctx, project, at(Math.max(0, t - .06)), at(t));
      return;
    }
    const muzzle = project(shot.x, shot.y, shot.z + t * 8);
    const scale = shot.cannon ? 2.4 : 1;
    if (!shot.puffOnly && t < TRACER_SHARE) {
      const from = project(shot.x, shot.y, shot.z), to = project(shot.tx, shot.ty, shot.tz);
      ctx.globalAlpha = 1 - t / TRACER_SHARE;
      ctx.strokeStyle = shot.cannon ? '#3a3026' : 'rgba(255, 236, 190, .9)';
      ctx.lineWidth = shot.cannon ? 2.4 : 1.2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    if (t < .08) {
      ctx.globalAlpha = 1 - t / .08;
      ctx.fillStyle = '#ffd77a';
      ctx.beginPath();
      ctx.arc(muzzle.x, muzzle.y, 2.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = (1 - t) * .6;
    ctx.fillStyle = '#e9e6dc';
    for (let i = 0; i < 3; i++) {
      const r = (2 + t * 7 + i * 1.3) * scale;
      ctx.beginPath();
      ctx.arc(muzzle.x + (i - 1) * r * .5, muzzle.y - i * r * .3, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Uma flecha de `from` para `to` (no mundo): a haste de taquara, a ponta e as penas
  // da empenagem, com ARROW_LENGTH de comprimento ao longo do rumo.
  #arrow(ctx, project, from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const length = Math.hypot(dx, dy, dz) || 1;
    const k = ARROW_LENGTH / length;
    const tip = project(to.x, to.y, to.z);
    const tail = project(to.x - dx * k, to.y - dy * k, to.z - dz * k);
    const ux = tip.x - tail.x, uy = tip.y - tail.y;
    const u = Math.hypot(ux, uy) || 1;
    const nx = -uy / u, ny = ux / u;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40, 28, 18, .9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(236, 228, 210, .9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(tail.x + ux / u * 3, tail.y + uy / u * 3);
      ctx.lineTo(tail.x + nx * side * 2, tail.y + ny * side * 2);
    }
    ctx.stroke();
  }

  // Estouro no chão: a carga de bacamarte levanta poeira; a granada do Krupp, clarão
  // e uma nuvem de terra; o tição na palha, fagulha e fumaça escura subindo.
  #burst(ctx, project, spark) {
    const t = spark.time / spark.life;
    if (spark.kind === 'fire') {
      const base = project(spark.x, spark.y, 6);
      ctx.globalAlpha = (1 - t) * .9;
      ctx.fillStyle = '#ffb040';
      for (let i = 0; i < 4; i++) {
        const r = 2.4 * (1 - t) + i * .4;
        ctx.beginPath();
        ctx.arc(base.x + Math.sin(i * 2.1 + t * 9) * 5, base.y - t * 14 - i * 3, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = (1 - t) * .5;
      ctx.fillStyle = '#3a3430';
      const smoke = project(spark.x, spark.y, 10 + t * 26);
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, 4 + t * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    const blast = spark.kind === 'blast';
    const center = project(spark.x, spark.y, 2);
    const edge = project(spark.x + spark.radius * (.3 + t * .7), spark.y, 2);
    const radius = Math.max(2, Math.hypot(edge.x - center.x, edge.y - center.y));
    if (blast && t < .25) {
      ctx.globalAlpha = 1 - t / .25;
      ctx.fillStyle = '#ffcf6a';
      ctx.beginPath();
      ctx.arc(center.x, center.y - radius * .3, radius * .7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = (1 - t) * (blast ? .8 : .6);
    ctx.fillStyle = blast ? 'rgba(120, 92, 64, .8)' : 'rgba(170, 150, 120, .7)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y - t * radius * .4, radius, radius * .6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  #floater(ctx, project, floater) {
    const t = floater.time / floater.life;
    const point = project(floater.x, floater.y, CHARACTER_HEIGHT + 4 + t * 14);
    ctx.globalAlpha = t < .7 ? 1 : 1 - (t - .7) / .3;
    ctx.font = `700 11px ${this.#theme.bodyFont}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const parts = [];
    if (floater.food) parts.push([`+${floater.food}`, FOOD_ICON]);
    if (floater.wood) parts.push([`+${floater.wood}`, WOOD_ICON]);
    if (floater.rifles) parts.push([`+${floater.rifles}`, RIFLE_ICON]);
    const widths = parts.map(([text]) => ctx.measureText(text).width + 14);
    let x = point.x - (widths.reduce((sum, w) => sum + w, 0) + 4 * (parts.length - 1)) / 2;
    parts.forEach(([text, glyph], i) => {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10, 14, 18, .85)';
      ctx.strokeText(text, x, point.y);
      ctx.fillStyle = '#ffd36b';
      ctx.fillText(text, x, point.y);
      const w = ctx.measureText(text).width;
      ctx.save();
      ctx.translate(x + w + 1, point.y - 6);
      ctx.scale(.5, .5);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(10, 14, 18, .85)';
      ctx.stroke(glyph);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#ffd36b';
      ctx.stroke(glyph);
      ctx.restore();
      x += widths[i] + 4;
    });
    ctx.globalAlpha = 1;
  }
}
