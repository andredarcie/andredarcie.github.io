import { HUT_LOGS } from '../../config/settlement.js';
import { hutSize } from '../../settlement/HutDimensions.js';

// Obra em andamento mostra quantas toras já tem; cabana pronta ganha uma plaquinha
// com quantos estão dentro, e os "z" saem pelo telhado quando alguém dorme lá.
export class HutMarksLayer {
  #state;
  #theme;
  #glyphs;

  constructor(state, theme, glyphs) {
    this.#state = state;
    this.#theme = theme;
    this.#glyphs = glyphs;
  }

  draw({ ctx, project, elapsed }) {
    const paint = this.#theme.paint;
    for (const hut of this.#state.huts) {
      if (!hut.built) {
        const anchor = project(hut.x, hut.y, 18);
        ctx.save();
        ctx.font = `600 10px ${this.#theme.bodyFont}`;
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = paint.panelStrong;
        const label = `cabana ${hut.logs}/${HUT_LOGS}`;
        ctx.strokeText(label, anchor.x, anchor.y);
        ctx.fillStyle = paint.ink2;
        ctx.fillText(label, anchor.x, anchor.y);
        ctx.restore();
        continue;
      }
      // Plaquinha acima da cumeeira: quantos estão dentro, com a cor da tribo dona.
      const roofTop = 30 + hutSize(hut.capacity).depth * .12;
      const anchor = project(hut.x, hut.y, roofTop);
      this.#drawCounter(ctx, anchor, hut);
      if (hut.inside > 0) this.#glyphs.sleepMarks(ctx, { x: anchor.x + 14, y: anchor.y - 4 }, hut.seed, elapsed);
    }
  }

  #drawCounter(ctx, anchor, hut) {
    const paint = this.#theme.paint;
    const label = hut.inside === 1 ? '1 dentro' : `${hut.inside} dentro`;
    ctx.save();
    ctx.font = `700 10px ${this.#theme.bodyFont}`;
    const textWidth = ctx.measureText(label).width;
    const tribeColor = typeof hut.owner === 'string' && hut.owner.startsWith('#') ? hut.owner : null;
    const width = textWidth + (tribeColor ? 22 : 14), height = 17;
    const x = anchor.x - width / 2, y = anchor.y - height - 4;
    ctx.fillStyle = paint.shadow;
    ctx.globalAlpha = .9;
    ctx.beginPath();
    ctx.roundRect(x + 1.5, y + 1.5, width, height, 4);
    ctx.fill();
    ctx.globalAlpha = hut.inside > 0 ? 1 : .8;
    ctx.fillStyle = paint.panelStrong;
    ctx.strokeStyle = paint.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 4);
    ctx.fill();
    ctx.stroke();
    let textX = x + 7;
    if (tribeColor) {
      // Bolinha na cor da bandeira: dá para ligar a plaquinha à tribo de longe.
      ctx.fillStyle = tribeColor;
      ctx.beginPath();
      ctx.arc(x + 8.5, y + height / 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      textX = x + 15;
    }
    ctx.fillStyle = paint.ink;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, textX, y + height / 2 + .5);
    // Setinha apontando para a cabana.
    ctx.fillStyle = paint.panelStrong;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 4, y + height - .5);
    ctx.lineTo(anchor.x + 4, y + height - .5);
    ctx.lineTo(anchor.x, y + height + 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(anchor.x - 4, y + height);
    ctx.lineTo(anchor.x, y + height + 4);
    ctx.lineTo(anchor.x + 4, y + height);
    ctx.stroke();
    ctx.restore();
  }
}
