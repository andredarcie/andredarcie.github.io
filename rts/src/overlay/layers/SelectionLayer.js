import { BUILDING_TYPES, TOWER } from '../../config/rts.js';
import { TowerSystem } from '../../rts/TowerSystem.js';
import { hillHeight } from '../../world/Hills.js';

const PING_COLORS = Object.freeze({
  move: '#7dff9a', attack: '#ff5a48', gather: '#ffe066', build: '#ffd08a', rally: '#9ad0ff'
});

// No chão (desenhado deitado, em unidades do mundo): o alcance do comando de João
// Abade e das mãos de Manuel Quadrado, anel embaixo de quem está
// selecionado, contorno da construção escolhida e o ponto de encontro dela, o
// alcance da torre escolhida, a obra fantasma que o jogador está posicionando (com o
// alcance, se for torre) e a marca da última ordem. No modo de obra, por baixo de
// tudo, a grade verde e vermelha de onde a obra pode assentar.
export class SelectionLayer {
  #state;
  #selection;
  #grid;
  #project = null;

  constructor(state, selection, grid) {
    this.#state = state;
    this.#selection = selection;
    this.#grid = grid;
  }

  draw({ ctx, elapsed, project }) {
    const state = this.#state;
    const s = this.#selection;
    this.#project = project;
    ctx.save();
    this.#grid.sync(s.placing);
    if (s.placing) this.#grid.draw(ctx);
    // O alcance do comando de João Abade (vermelho-terra) e das mãos de Manuel
    // Quadrado (verde), sempre à vista, de leve.
    for (const u of state.organisms) {
      if (!u.stats.aura || u.team !== 'player') continue;
      const tone = u.stats.aura.heal > u.stats.aura.damage ? '150, 220, 140' : '230, 140, 90';
      ctx.fillStyle = `rgba(${tone}, .05)`;
      ctx.strokeStyle = `rgba(${tone}, .4)`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 6]);
      ctx.lineDashOffset = elapsed * 3;
      ctx.beginPath();
      const at = this.#at(u.x, u.y);
      ctx.arc(at.x, at.y, u.stats.aura.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Jagunço de tocaia: um anel verde tracejado bem fechado no pé.
    for (const u of state.organisms) {
      if (!u.hidden || u.team !== 'player') continue;
      ctx.strokeStyle = 'rgba(140, 200, 120, .8)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      const at = this.#at(u.x, u.y);
      ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 1.6;
    for (const u of s.units) if (!u.inHut) this.#ring(ctx, u.x, u.y, 8.5 * u.size / 10, state.teams[u.team].ring);
    if (s.enemy) {
      const radius = s.enemy.queue ? s.enemy.radius + 5 : 9;
      this.#ring(ctx, s.enemy.x, s.enemy.y, radius, state.teams[s.enemy.team].ring, true);
    }
    const b = s.building;
    if (b) {
      this.#ring(ctx, b.x, b.y, b.radius + 5, state.teams[b.team].ring, true);
      if (b.rally && b.team === 'player') this.#rally(ctx, b, elapsed);
      if (b.shoots) this.#range(ctx, b.x, b.y, TowerSystem.stats(b).range, elapsed);
    }
    if (s.placing && s.hover) this.#ghost(ctx, s.placing, s.hover);
    for (const ping of state.pings) this.#ping(ctx, ping);
    ctx.restore();
  }

  // Esta camada é desenhada no chão plano, mas o relevo levanta quem está no morro
  // (CameraRig.project soma hillHeight): o ponto desliza no plano até ficar, na tela,
  // exatamente embaixo do pé. Resolve o deslocamento de tela pela inversa do mapa
  // chão → tela ali perto (diferenças de um passo).
  #at(x, y) {
    const project = this.#project;
    if (!project || hillHeight(x, y) <= 0) return { x, y };
    const flat = (px, py) => project(px, py, -hillHeight(px, py));
    const base = flat(x, y), up = project(x, y, 0);
    const ax = flat(x + 1, y), ay = flat(x, y + 1);
    const j11 = ax.x - base.x, j21 = ax.y - base.y, j12 = ay.x - base.x, j22 = ay.y - base.y;
    const det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-9) return { x, y };
    const sx = up.x - base.x, sy = up.y - base.y;
    return { x: x + (j22 * sx - j12 * sy) / det, y: y + (j11 * sy - j21 * sx) / det };
  }

  #ring(ctx, x, y, radius, color, dashed = false) {
    ({ x, y } = this.#at(x, y));
    ctx.strokeStyle = 'rgba(0, 0, 0, .55)';
    ctx.lineWidth = 3;
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  #rally(ctx, b, elapsed) {
    ctx.strokeStyle = 'rgba(255, 255, 255, .7)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -elapsed * 8;
    const door = this.#at(b.doorX, b.doorY), rally = this.#at(b.rally.x, b.rally.y);
    ctx.beginPath();
    ctx.moveTo(door.x, door.y);
    ctx.lineTo(rally.x, rally.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9ad0ff';
    ctx.beginPath();
    ctx.arc(rally.x, rally.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // A obra fantasma assenta no centro da casa sob o cursor, verde ou vermelha como
  // a própria casa.
  #ghost(ctx, kind, hover) {
    const point = this.#grid.snap(hover.x, hover.y);
    if (!point) return;
    const ok = this.#grid.isOpen(point);
    const radius = BUILDING_TYPES[kind].radius;
    if (kind === 'tower') this.#range(ctx, point.x, point.y, TOWER.range[0], 0);
    ctx.fillStyle = ok ? 'rgba(120, 255, 150, .28)' : 'rgba(255, 80, 70, .3)';
    ctx.strokeStyle = ok ? '#7dff9a' : '#ff5a48';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const at = this.#at(point.x, point.y);
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Alcance da torre: círculo tracejado andando devagar, com o miolo bem de leve.
  #range(ctx, x, y, radius, elapsed) {
    ({ x, y } = this.#at(x, y));
    ctx.fillStyle = 'rgba(95, 180, 255, .07)';
    ctx.strokeStyle = 'rgba(160, 215, 255, .75)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -elapsed * 6;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  #ping(ctx, ping) {
    const t = ping.time / ping.life;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = PING_COLORS[ping.kind] ?? '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const at = this.#at(ping.x, ping.y);
    ctx.arc(at.x, at.y, 4 + t * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
