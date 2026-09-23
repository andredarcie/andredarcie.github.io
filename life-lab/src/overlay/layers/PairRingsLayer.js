// Anel tracejado girando em volta do casal no cortejo e arcos na cópula. Desenhado
// deitado no chão (a sobreposição aplica a matriz do chão antes).
export class PairRingsLayer {
  #state;
  #theme;

  constructor(state, theme) {
    this.#state = state;
    this.#theme = theme;
  }

  draw({ ctx }) {
    const paint = this.#theme.paint;
    for (const pair of this.#state.pairs) {
      const x = (pair.male.x + pair.female.x) / 2;
      const y = (pair.male.y + pair.female.y) / 2;
      if (pair.phase === 'courtship') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(pair.orbit * .22);
        ctx.strokeStyle = paint.accent2;
        ctx.lineWidth = 1.35;
        ctx.globalAlpha = .56;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, 19, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = paint.accent;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * 19, 0, 2.15, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (pair.phase === 'mating') {
        ctx.save();
        ctx.strokeStyle = paint.life;
        ctx.lineWidth = 1.15;
        ctx.globalAlpha = .35;
        ctx.beginPath();
        ctx.arc(x, y, 18, -.7, .7);
        ctx.arc(x, y, 18, Math.PI - .7, Math.PI + .7);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
