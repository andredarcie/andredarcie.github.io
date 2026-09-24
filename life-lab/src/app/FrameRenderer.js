import { LIFE_SIZE, WALK_SPEED } from '../config/organisms.js';
import {
  BIRTH_ANIMATION_DURATION, LABOR_DURATION, LABOR_LIE_DOWN, LABOR_CROWN, LABOR_OUT
} from '../config/reproduction.js';
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
    const overcast = this.#weather.strength();
    // Brisa sempre, vento forte com tempo fechado; parado se o usuário pediu menos
    // movimento.
    const wind = animate ? .35 + .65 * overcast : 0;
    view.sky.update(sky, { overcast, time: animate ? elapsed : 0 });
    view.campfires.sync(state.campfires, { elapsed, animate, daylight: sky.daylight });
    view.trees.sync(state.trees, { elapsed, animate, wind });
    view.logs.sync(state.logs);
    view.huts.sync(state.huts, HUT_LOGS, { elapsed, animate, daylight: sky.daylight });
    view.food.sync(state.grass, { elapsed, wind });
    view.grass.sync({ ponds: state.ponds, huts: state.huts, elapsed, wind });
    view.terrain.syncPonds(state.ponds);
    view.ponds.sync(state.ponds, {
      elapsed, raining: Boolean(state.rain), animate, sky: view.sky.horizonColor
    });
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
      chopSwing: CHOP_SWING,
      ponds: state.ponds,
      laborDuration: LABOR_DURATION,
      laborLieDown: LABOR_LIE_DOWN,
      laborCrown: LABOR_CROWN,
      laborOut: LABOR_OUT
    });
    // Depois de tudo posicionado: quem tapa um bicho fica translúcido.
    view.occlusion.update();
    view.render();
    const eventRect = this.#eventCamera.render();
    this.#overlay.draw(eventRect);
    for (const panel of this.#panels) panel.render();
  }
}
