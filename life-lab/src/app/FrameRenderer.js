import { LIFE_SIZE, WALK_SPEED } from '../config/organisms.js';
import { BIRTH_ANIMATION_DURATION } from '../config/reproduction.js';
import { DEATH_FALL, DECAY_DAYS, CORPSE_DAYS } from '../config/death.js';
import { CHOP_SWING, HUT_LOGS } from '../config/settlement.js';

// Um quadro na tela: passa o estado do mundo para a cena 3D, desenha, põe a lupa de
// acontecimentos por cima, depois a sobreposição 2D e por fim os painéis.
export class FrameRenderer {
  #state;
  #sky;
  #weather;
  #perception;
  #motion;
  #view;
  #eventCamera;
  #overlay;
  #panels;

  constructor({ state, skyClock, weather, perception, motionPreference, view, eventCamera, overlay, panels }) {
    this.#state = state;
    this.#sky = skyClock;
    this.#weather = weather;
    this.#perception = perception;
    this.#motion = motionPreference;
    this.#view = view;
    this.#eventCamera = eventCamera;
    this.#overlay = overlay;
    this.#panels = panels;
  }

  render() {
    const state = this.#state;
    const view = this.#view;
    const sky = this.#sky.current;
    const animate = this.#motion.animate;
    const elapsed = state.elapsed;
    view.sky.update(sky, { overcast: this.#weather.strength() });
    view.campfires.sync(state.campfires, { elapsed, animate, daylight: sky.daylight });
    view.trees.sync(state.trees, { elapsed, animate });
    view.logs.sync(state.logs);
    view.huts.sync(state.huts, HUT_LOGS, { elapsed, animate, daylight: sky.daylight });
    view.food.sync(state.grass);
    view.ponds.sync(state.ponds, { elapsed, raining: Boolean(state.rain), animate });
    view.corpses.sync(state.corpses, {
      fall: DEATH_FALL, decay: DECAY_DAYS, total: CORPSE_DAYS, lifeSize: LIFE_SIZE
    });
    view.organisms.sync(state.organisms, {
      animate,
      elapsed,
      walkSpeed: WALK_SPEED,
      birthDuration: BIRTH_ANIMATION_DURATION,
      lifeSize: LIFE_SIZE,
      sight: o => this.#perception.sightRange(o) / o.genes.visionRange,
      chopSwing: CHOP_SWING
    });
    view.render();
    const eventRect = this.#eventCamera.render();
    this.#overlay.draw(eventRect);
    for (const panel of this.#panels) panel.render();
  }
}
