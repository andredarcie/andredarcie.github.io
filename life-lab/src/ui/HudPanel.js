import { Format } from './Format.js';

// O painel de estado no canto: população, plantas, poças, hora do dia e o selo de
// "ao vivo" que vira o período do dia (ou "chovendo").
export class HudPanel {
  #state;
  #sky;
  #aside;
  #live;
  #count;
  #grass;
  #ponds;
  #clock;
  #clockLabel;
  #clockStat;

  constructor(root, state, skyClock) {
    this.#state = state;
    this.#sky = skyClock;
    this.#aside = root.querySelector('aside');
    this.#live = root.querySelector('.live');
    this.#count = root.querySelector('#count');
    this.#grass = root.querySelector('#grass-count');
    this.#ponds = root.querySelector('#pond-count');
    this.#clock = root.querySelector('#clock');
    this.#clockLabel = root.querySelector('#clock-label');
    this.#clockStat = root.querySelector('#clock-stat');
  }

  render() {
    const state = this.#state;
    const sky = this.#sky.current;
    this.#aside.classList.toggle('raining', Boolean(state.rain));
    this.#aside.classList.toggle('night', sky.daylight < .35);
    this.#live.textContent = state.rain ? 'chovendo' : sky.period;
    this.#count.textContent = state.organisms.length;
    this.#grass.textContent = state.grass.length;
    this.#ponds.textContent = state.ponds.length;
    this.#clock.textContent = Format.hourOfDay(sky.hour);
    this.#clockLabel.textContent = `dia ${sky.day}`;
    this.#clockStat.title = `${sky.season} · lua ${Math.round(sky.illumination * 100)}% iluminada`;
  }
}
