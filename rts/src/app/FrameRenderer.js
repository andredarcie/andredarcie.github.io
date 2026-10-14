import { LIFE_SIZE, WALK_SPEED } from '../config/organisms.js';
import { BIRTH_ANIMATION_DURATION } from '../config/reproduction.js';
import { DEATH_FALL, DECAY_DAYS, CORPSE_DAYS } from '../config/death.js';
import { CHOP_SWING } from '../config/settlement.js';

// Um quadro na tela: passa o estado do mundo para a cena 3D, desenha, depois a
// sobreposição 2D por cima.
export class FrameRenderer {
  #state;
  #sky;
  #weather;
  #motion;
  #view;
  #overlay;

  constructor({ state, skyClock, weather, motionPreference, view, overlay }) {
    this.#state = state;
    this.#sky = skyClock;
    this.#weather = weather;
    this.#motion = motionPreference;
    this.#view = view;
    this.#overlay = overlay;
  }

  render() {
    const state = this.#state;
    const view = this.#view;
    const sky = this.#sky.current;
    const animate = this.#motion.animate;
    const elapsed = state.elapsed;
    const overcast = this.#weather.strength();
    // Brisa sempre, vento forte com tempo fechado; parado se o usuário pediu menos
    // movimento.
    const wind = animate ? .35 + .65 * overcast : 0;
    const huts = state.huts;
    view.sky.update(sky, { overcast, time: animate ? elapsed : 0 });
    view.campfires.sync(state.campfires, { elapsed, animate, daylight: sky.daylight });
    view.trees.sync(state.trees, { elapsed, animate, wind });
    view.logs.sync(state.logs);
    view.huts.sync(huts, { daylight: sky.daylight });
    view.towers.sync(state.towers, { elapsed, animate });
    view.food.sync(state.grass);
    view.grass.sync({ ponds: state.ponds, huts, elapsed, wind });
    view.terrain.syncPonds(state.ponds);
    view.ponds.sync(state.ponds, {
      elapsed, raining: Boolean(state.rain), animate, sky: view.sky.horizonColor
    });
    view.blood.sync(state.bloodStains, state.bloodDrops, { ponds: state.ponds, animate });
    view.corpses.sync(state.corpses, {
      fall: DEATH_FALL, decay: DECAY_DAYS, total: CORPSE_DAYS, lifeSize: LIFE_SIZE
    });
    view.organisms.sync(state.organisms, {
      animate,
      elapsed,
      walkSpeed: WALK_SPEED,
      birthDuration: BIRTH_ANIMATION_DURATION,
      lifeSize: LIFE_SIZE,
      sight: 1,
      chopSwing: CHOP_SWING,
      ponds: state.ponds
    });
    // Depois de tudo posicionado: quem tapa uma unidade fica translúcido.
    view.occlusion.update();
    view.render();
    this.#overlay.draw();
  }
}
