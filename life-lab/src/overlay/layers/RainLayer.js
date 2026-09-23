// Chuva: véu azulado sobre a tela e riscos caindo inclinados.
export class RainLayer {
  #state;
  #weather;
  #theme;
  #motion;
  #drops = Array.from({ length: 340 }, () => ({
    x: Math.random(), y: Math.random(), speed: 130 + Math.random() * 90,
    length: 7 + Math.random() * 7
  }));

  constructor(state, weather, theme, motionPreference) {
    this.#state = state;
    this.#weather = weather;
    this.#theme = theme;
    this.#motion = motionPreference;
  }

  draw({ ctx, width: w, height: h }) {
    const rain = this.#state.rain;
    if (!rain) return;
    const paint = this.#theme.paint;
    const strength = this.#weather.strength();
    const motionTime = this.#motion.reduced ? 0 : rain.time;
    const count = Math.min(this.#drops.length, Math.max(55, Math.round(w * h / 6500)));
    ctx.save();
    ctx.fillStyle = paint.water;
    ctx.globalAlpha = .045 * strength;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = paint.water;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.globalAlpha = .34 * strength;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const drop = this.#drops[i];
      const x = (drop.x * (w + 30) + motionTime * drop.speed * .22) % (w + 30) - 15;
      const y = (drop.y * (h + 30) + motionTime * drop.speed) % (h + 30) - 15;
      ctx.moveTo(x, y);
      ctx.lineTo(x - drop.length * .22, y - drop.length);
    }
    ctx.stroke();
    ctx.restore();
  }
}
