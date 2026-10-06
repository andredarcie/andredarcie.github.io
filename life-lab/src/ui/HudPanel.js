import { Format } from './Format.js';

// O painel de estado no canto: população, plantas, poças, espécies de rede neural,
// a geração mais avançada, hora do dia e o selo de
// "ao vivo" que vira o período do dia (ou "chovendo").
export class HudPanel {
  #state;
  #sky;
  #aside;
  #live;
  #count;
  #grass;
  #ponds;
  #species;
  #generation;
  #flame;
  #flameKey = '';
  #tribeNames;
  #clock;
  #clockLabel;
  #clockStat;

  constructor(root, state, skyClock, tribeNames) {
    this.#state = state;
    this.#tribeNames = tribeNames;
    this.#flame = root.querySelector('#flame-status');
    this.#sky = skyClock;
    this.#aside = root.querySelector('aside');
    this.#live = root.querySelector('.live');
    this.#count = root.querySelector('#count');
    this.#grass = root.querySelector('#grass-count');
    this.#ponds = root.querySelector('#pond-count');
    this.#species = root.querySelector('#species-count');
    this.#generation = root.querySelector('#generation-max');
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
    this.#species.textContent = state.species.length;
    this.#generation.textContent = Math.floor(state.organisms.reduce((top, o) => Math.max(top, o.generation), 0));
    this.#renderFlame();
    this.#clock.textContent = Format.hourOfDay(sky.hour);
    this.#clockLabel.textContent = `dia ${sky.day}`;
    this.#clockStat.title = `${sky.season} · lua ${Math.round(sky.illumination * 100)}% iluminada`;
  }

  // Com quem está a Chama Primordial: tribo e portador, ou no chão sem dono.
  #renderFlame() {
    const holder = this.#state.flame?.holder;
    const tribe = holder?.band && holder.outfit ? this.#tribeNames.nameOf(holder.outfit) : '';
    const text = !holder ? 'no chão, sem dono'
      : tribe ? `${tribe} · nas mãos de ${holder.name}` : `nas mãos de ${holder.name}, sem tribo`;
    if (text === this.#flameKey) return;
    this.#flameKey = text;
    this.#flame.textContent = text;
  }
}
