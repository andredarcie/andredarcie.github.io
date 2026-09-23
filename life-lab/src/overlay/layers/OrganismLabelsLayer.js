import { LIFE_SIZE, CHARACTER_HEIGHT } from '../../config/organisms.js';

// O que continua sendo interface em cima de cada bicho, em pixels de tela e
// ancorado na cabeça: "z" do sono, lágrimas, balão de pensamento e o nome.
export class OrganismLabelsLayer {
  #state;
  #theme;
  #motion;
  #glyphs;

  constructor(state, theme, motionPreference, glyphs) {
    this.#state = state;
    this.#theme = theme;
    this.#motion = motionPreference;
    this.#glyphs = glyphs;
  }

  draw(frame) {
    for (const o of this.#state.organisms) this.#drawOrganism(frame, o);
  }

  #drawOrganism({ ctx, project, elapsed, width }, o) {
    // Dentro da cabana não aparece: nem corpo, nem nome; os "z" saem do telhado.
    if (o.inHut) return;
    // Deitado, a cabeça fica rente ao chão; o nome desce junto.
    const lift = o.asleep ? 7 : CHARACTER_HEIGHT;
    const head = project(o.x, o.y, lift * (o.size / LIFE_SIZE));
    if (o.asleep) this.#glyphs.sleepMarks(ctx, head, o.wanderPhase, elapsed);
    if (o.crying) this.#drawTears(ctx, head, o, elapsed);
    if (o.thought > 0 && !o.asleep) this.#drawBubble(ctx, head, o, width);
    this.#drawName(ctx, head, o);
  }

  #drawBubble(ctx, head, o, edge) {
    const paint = this.#theme.paint;
    ctx.save();
    ctx.globalAlpha = Math.min(1, o.thought * 3);
    ctx.font = `600 10px ${this.#theme.bodyFont}`;
    const bubbleWidth = Math.max(50, Math.ceil(ctx.measureText(o.message).width) + 16);
    const bubbleX = Math.max(4, Math.min(edge - bubbleWidth - 4, head.x + 11));
    const bubbleY = Math.max(4, head.y - 48);
    ctx.fillStyle = paint.shadow;
    ctx.beginPath();
    ctx.roundRect(bubbleX + 2, bubbleY + 2, bubbleWidth, 20, 4);
    ctx.fill();
    ctx.fillStyle = paint.panelStrong;
    ctx.strokeStyle = paint.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, 20, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = paint.ink;
    ctx.fillText(o.message, bubbleX + 8, bubbleY + 13.5);
    ctx.beginPath();
    ctx.arc(Math.max(6, Math.min(edge - 6, head.x + 9)), bubbleY + 24, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Nome em cima da cabeça, com contorno claro para ler sobre grama, areia ou noite.
  #drawName(ctx, head, o) {
    const paint = this.#theme.paint;
    ctx.save();
    ctx.font = `600 10px ${this.#theme.bodyFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = paint.panelStrong;
    ctx.globalAlpha = .92;
    ctx.strokeText(o.name, head.x, head.y - 4);
    ctx.fillStyle = paint.ink;
    ctx.globalAlpha = 1;
    ctx.fillText(o.name, head.x, head.y - 4);
    ctx.restore();
  }

  // Lágrimas: gotas saem dos dois lados do rosto e caem com gravidade, em ciclo.
  #drawTears(ctx, head, o, elapsed) {
    ctx.save();
    ctx.fillStyle = this.#theme.paint.water;
    for (let i = 0; i < 4; i++) {
      const cycle = this.#motion.reduced ? .4 : (elapsed * 1.6 + i / 4 + o.wanderPhase) % 1;
      const side = i % 2 ? 1 : -1;
      const x = head.x + side * (3 + cycle * 2.5);
      const y = head.y + 9 + cycle * cycle * 16;
      ctx.globalAlpha = Math.sin(cycle * Math.PI) * .9;
      ctx.beginPath();
      ctx.moveTo(x, y - 2.6);
      ctx.quadraticCurveTo(x + 1.6, y + .4, x, y + 1.4);
      ctx.quadraticCurveTo(x - 1.6, y + .4, x, y - 2.6);
      ctx.fill();
    }
    ctx.restore();
  }
}
