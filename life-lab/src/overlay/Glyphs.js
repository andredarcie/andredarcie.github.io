// Desenhos pequenos usados por mais de uma camada da sobreposição.
export class Glyphs {
  #theme;
  #motion;

  constructor(theme, motionPreference) {
    this.#theme = theme;
    this.#motion = motionPreference;
  }

  // Três "z" subindo e sumindo em fila, do menor para o maior.
  sleepMarks(ctx, head, phase, elapsed) {
    const reduced = this.#motion.reduced;
    ctx.save();
    ctx.fillStyle = this.#theme.paint.sleep;
    ctx.strokeStyle = this.#theme.paint.panelStrong;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) {
      const cycle = reduced ? i / 3 : (elapsed * .45 + i / 3 + phase) % 1;
      const size = 7 + cycle * 6;
      ctx.globalAlpha = reduced ? .85 : Math.sin(cycle * Math.PI) * .95;
      ctx.font = `800 ${size}px ${this.#theme.displayFont}`;
      const x = head.x + 6 + cycle * 10;
      const y = head.y - 18 - cycle * 22;
      ctx.strokeText('z', x, y);
      ctx.fillText('z', x, y);
    }
    ctx.restore();
  }

  heart(ctx, { x, y, scale = 1, alpha = 1 }) {
    const paint = this.#theme.paint;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = paint.shadow;
    ctx.globalAlpha = alpha * .24;
    ctx.save();
    ctx.translate(2, 2);
    Glyphs.#heartPath(ctx);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = paint.life;
    ctx.globalAlpha = alpha * .92;
    Glyphs.#heartPath(ctx);
    ctx.fill();
    ctx.restore();
  }

  static #heartPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-11, -1, -6, -8, 0, -3);
    ctx.bezierCurveTo(6, -8, 11, -1, 0, 6);
  }
}
