import { pseudoRandom } from '../../core/math.js';
import { WORLD } from '../../config/world.js';

const CLOUD_COUNT = 2;
// As nuvens andam por uma faixa maior que o mundo, para entrarem e saírem do
// tabuleiro pela borda em vez de surgirem do nada.
const MARGIN = 190;
// Deriva do vento, em unidades do mundo por segundo de simulação.
const DRIFT_X = 9;
const DRIFT_Y = 3.5;

// Sombra de nuvem passando pelo chão: manchas grandes e bem suaves que atravessam o
// mundo com o vento. Mais fortes com o tempo fechado, nenhuma de noite.
export class CloudShadowsLayer {
  #state;
  #skyClock;
  #weather;
  #motion;
  #clouds = Array.from({ length: CLOUD_COUNT }, (_, i) => ({
    x: pseudoRandom(i * 11 + 3),
    y: pseudoRandom(i * 11 + 4),
    radius: 51 + pseudoRandom(i * 11 + 5) * 67,
    stretch: 1.3 + pseudoRandom(i * 11 + 6) * .6,
    speed: .75 + pseudoRandom(i * 11 + 7) * .5
  }));

  constructor(state, skyClock, weather, motionPreference) {
    this.#state = state;
    this.#skyClock = skyClock;
    this.#weather = weather;
    this.#motion = motionPreference;
  }

  draw({ ctx }) {
    const daylight = this.#skyClock.current.daylight;
    const alpha = (.07 + .1 * this.#weather.strength()) * daylight;
    if (alpha < .005) return;
    const time = this.#motion.reduced ? 0 : this.#state.elapsed;
    const spanX = WORLD.width + MARGIN * 2, spanY = WORLD.height + MARGIN * 2;
    ctx.save();
    // Sombra só cai no tabuleiro: em volta é céu, não tem chão para escurecer.
    ctx.beginPath();
    ctx.rect(0, 0, WORLD.width, WORLD.height);
    ctx.clip();
    for (const cloud of this.#clouds) {
      const x = CloudShadowsLayer.#wrap(cloud.x * spanX + time * DRIFT_X * cloud.speed, spanX) - MARGIN;
      const y = CloudShadowsLayer.#wrap(cloud.y * spanY + time * DRIFT_Y * cloud.speed, spanY) - MARGIN;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(cloud.stretch, 1);
      const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, cloud.radius);
      shade.addColorStop(0, `rgba(20, 28, 40, ${alpha})`);
      shade.addColorStop(.55, `rgba(20, 28, 40, ${alpha * .7})`);
      shade.addColorStop(1, 'rgba(20, 28, 40, 0)');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(0, 0, cloud.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  static #wrap(value, span) {
    return ((value % span) + span) % span;
  }
}
