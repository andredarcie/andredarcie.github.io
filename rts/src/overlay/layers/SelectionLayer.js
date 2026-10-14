import { BUILDING_TYPES, TOWER, VESPERS } from '../../config/rts.js';
import { TowerSystem } from '../../rts/TowerSystem.js';

const PING_COLORS = Object.freeze({
  move: '#7dff9a', attack: '#ff5a48', gather: '#ffe066', build: '#ffd08a', rally: '#9ad0ff'
});

// No chão (desenhado deitado, em unidades do mundo): o alcance da pregação do
// Conselheiro, anel embaixo de quem está
// selecionado, contorno da construção escolhida e o ponto de encontro dela, o
// alcance da torre escolhida, a obra fantasma que o jogador está posicionando (com o
// alcance, se for torre) e a marca da última ordem.
export class SelectionLayer {
  #state;
  #selection;
  #commands;

  constructor(state, selection, commands) {
    this.#state = state;
    this.#selection = selection;
    this.#commands = commands;
  }

  draw({ ctx, elapsed }) {
    const state = this.#state;
    const s = this.#selection;
    ctx.save();
    // O alcance da pregação do Conselheiro (dourado), do comando de João Abade
    // (vermelho-terra) e das mãos de Manuel Quadrado (verde), sempre à vista, de leve.
    // Na reza do fim da tarde o círculo do Conselheiro cresce e pulsa como o sino.
    for (const u of state.organisms) {
      if (!u.stats.aura || u.team !== 'player') continue;
      const tone = u.type === 'conselheiro' ? '255, 211, 107' : u.stats.aura.heal > u.stats.aura.damage ? '150, 220, 140' : '230, 140, 90';
      const praying = u.type === 'conselheiro' && state.vespers > 0;
      const radius = u.stats.aura.radius * (praying ? VESPERS.radius : 1);
      ctx.fillStyle = `rgba(${tone}, ${praying ? .1 : .05})`;
      ctx.strokeStyle = `rgba(${tone}, ${praying ? .7 : .4})`;
      ctx.lineWidth = praying ? 1.8 : 1.2;
      ctx.setLineDash([3, 6]);
      ctx.lineDashOffset = elapsed * 3;
      ctx.beginPath();
      ctx.arc(u.x, u.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      if (praying) {
        // Ondas do sino saindo do Conselheiro.
        for (let k = 0; k < 3; k++) {
          const t = (elapsed * .5 + k / 3) % 1;
          ctx.strokeStyle = `rgba(${tone}, ${(1 - t) * .5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(u.x, u.y, 12 + t * radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    // Jagunço de tocaia: um anel verde tracejado bem fechado no pé.
    for (const u of state.organisms) {
      if (!u.hidden || u.team !== 'player') continue;
      ctx.strokeStyle = 'rgba(140, 200, 120, .8)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(u.x, u.y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 1.6;
    for (const u of s.units) this.#ring(ctx, u.x, u.y, 8.5 * u.size / 10, state.teams[u.team].ring);
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

  #ring(ctx, x, y, radius, color, dashed = false) {
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
    ctx.beginPath();
    ctx.moveTo(b.doorX, b.doorY);
    ctx.lineTo(b.rally.x, b.rally.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9ad0ff';
    ctx.beginPath();
    ctx.arc(b.rally.x, b.rally.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  #ghost(ctx, kind, point) {
    const ok = this.#commands.canPlace(kind, point.x, point.y);
    const radius = BUILDING_TYPES[kind].radius;
    if (kind === 'tower') this.#range(ctx, point.x, point.y, TOWER.range[0], 0);
    ctx.fillStyle = ok ? 'rgba(120, 255, 150, .28)' : 'rgba(255, 80, 70, .3)';
    ctx.strokeStyle = ok ? '#7dff9a' : '#ff5a48';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Alcance da torre: círculo tracejado andando devagar, com o miolo bem de leve.
  #range(ctx, x, y, radius, elapsed) {
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
    ctx.arc(ping.x, ping.y, 4 + t * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
