import { pseudoRandom } from '../../core/math.js';

const FIREFLY_COUNT = 8;

// Vaga-lumes de noite em volta das árvores: pontinhos amarelo-esverdeados que vagam
// devagar e acendem e apagam cada um no seu ritmo. A chuva espanta a maioria.
export class FirefliesLayer {
  #state;
  #skyClock;
  #weather;
  #motion;
  #flies = Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
    pick: pseudoRandom(i * 13 + 1),
    angle: pseudoRandom(i * 13 + 2) * Math.PI * 2,
    reach: 8 + pseudoRandom(i * 13 + 3) * 22,
    height: 3 + pseudoRandom(i * 13 + 4) * 12,
    rhythm: .6 + pseudoRandom(i * 13 + 5) * .8,
    phase: pseudoRandom(i * 13 + 6) * 10
  }));

  constructor(state, skyClock, weather, motionPreference) {
    this.#state = state;
    this.#skyClock = skyClock;
    this.#weather = weather;
    this.#motion = motionPreference;
  }

  draw({ ctx, project, elapsed, width, height }) {
    if (this.#motion.reduced) return;
    const night = 1 - this.#skyClock.current.daylight;
    if (night < .35) return;
    const trees = this.#state.trees.filter(tree => !tree.stump && !tree.fall && tree.growth > .6);
    if (!trees.length) return;
    const visible = Math.round(FIREFLY_COUNT * (1 - .8 * this.#weather.strength()));
    const fade = Math.min(1, (night - .35) / .3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < visible; i++) {
      const fly = this.#flies[i];
      const tree = trees[Math.floor(fly.pick * trees.length)];
      // Voo preguiçoso: dois senos fora de fase desenham uma órbita torta.
      const t = elapsed * .35 * fly.rhythm + fly.phase;
      const x = tree.x + Math.cos(fly.angle + t) * fly.reach + Math.sin(t * 2.3) * 4;
      const y = tree.y + Math.sin(fly.angle + t * .8) * fly.reach;
      const point = project(x, y, fly.height + Math.sin(t * 1.7) * 2);
      if (point.x < -10 || point.y < -10 || point.x > width + 10 || point.y > height + 10) continue;
      // Pisca: aceso só em parte do ciclo, acendendo e apagando macio.
      const blink = Math.max(0, Math.sin(elapsed * 1.6 * fly.rhythm + fly.phase * 3));
      const glow = blink * blink * fade;
      if (glow < .02) continue;
      const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 6);
      halo.addColorStop(0, `rgba(226, 255, 140, ${.9 * glow})`);
      halo.addColorStop(.35, `rgba(190, 240, 90, ${.35 * glow})`);
      halo.addColorStop(1, 'rgba(160, 220, 60, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(point.x - 6, point.y - 6, 12, 12);
    }
    ctx.restore();
  }
}
