import { CHARACTER_HEIGHT, LIFE_SIZE } from '../../config/organisms.js';
import { UNIT_TYPES, PREACHER_TYPE } from '../../config/rts.js';
import { hutSize } from '../../settlement/HutDimensions.js';

// Em pixels de tela, por cima de cada coisa: barra de vida de quem está ferido ou
// selecionado, o recado curto da unidade ("no trees
// nearby"), e nas construções a vida, o andamento da obra e o do treino.
export class UnitMarksLayer {
  #state;
  #selection;
  #theme;

  constructor(state, selection, theme) {
    this.#state = state;
    this.#selection = selection;
    this.#theme = theme;
  }

  draw({ ctx, project }) {
    const selected = new Set(this.#selection.units);
    const feet = project(0, 0, 0), top = project(0, 0, CHARACTER_HEIGHT);
    // Altura do boneco na tela: decide o tamanho das barras e se o recado cabe.
    const figure = feet.y - top.y;
    const barWidth = Math.max(10, Math.min(26, figure * 1.3));
    for (const b of this.#state.buildings) this.#building(ctx, project, b);
    for (const u of this.#state.organisms) {
      const isSelected = selected.has(u) || this.#selection.enemy === u;
      const head = project(u.x, u.y, (CHARACTER_HEIGHT + 3) * u.size / LIFE_SIZE);
      if (isSelected || u.life < u.maxLife - .5) {
        this.#bar(ctx, head.x - barWidth / 2, head.y - 4, barWidth, 3, u.life / u.maxLife,
          this.#state.teams[u.team].ring);
      }
      if (u.thought > 0 && u.team === 'player' && figure > 9) this.#note(ctx, head, u.message);
      // Os chefes e o Conselheiro levam o nome por cima, para serem achados na roda.
      else if ((u.stats.hero || u.type === PREACHER_TYPE) && figure > 7) this.#label(ctx, u.stats.label, head.x, head.y - 7, '#ffd36b');
    }
  }

  #building(ctx, project, b) {
    const isSelected = this.#selection.building === b || this.#selection.enemy === b;
    const height = b.isHut ? 34 + hutSize(b.capacity).depth * .12 : b.isTower ? 44 + b.levels.range * 5 : 16;
    const anchor = project(b.x, b.y, height);
    const width = b.isHut ? 46 : b.isTower ? 30 : 34;
    let y = anchor.y;
    if (!b.built) {
      this.#bar(ctx, anchor.x - width / 2, y, width, 5, b.progress, '#ffd08a');
      this.#label(ctx, `${Math.floor(b.progress * 100)}%`, anchor.x, y - 3);
      y += 7;
    }
    if (isSelected || b.life < b.maxLife - .5 || b.hurt > 0) {
      this.#bar(ctx, anchor.x - width / 2, y, width, 4, b.life / b.maxLife, this.#state.teams[b.team].ring);
      y += 6;
    }
    if (b.built && b.queue.length) {
      const item = b.queue[0];
      this.#bar(ctx, anchor.x - width / 2, y, width, 3, item.time / UNIT_TYPES[item.type].time, '#f4f1e6');
    }
  }

  #bar(ctx, x, y, width, height, fraction, color) {
    const value = Math.max(0, Math.min(1, fraction));
    ctx.fillStyle = 'rgba(10, 14, 18, .75)';
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);
    ctx.fillStyle = value < .35 && color !== '#ffd08a' && color !== '#f4f1e6' ? '#ff4b3a' : color;
    ctx.fillRect(x, y, width * value, height);
  }

  #label(ctx, text, x, y, color = '#fff') {
    ctx.save();
    ctx.font = `700 10px ${this.#theme.bodyFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10, 14, 18, .8)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  #note(ctx, head, message) {
    if (!message) return;
    this.#label(ctx, message, head.x, head.y - 8);
  }

}
