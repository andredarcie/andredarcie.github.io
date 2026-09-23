import { MAX_SIMULATION_STEP, BASE_SIMULATION_SPEED } from '../config/world.js';

// O passo do mundo: avança o céu, dá um tique de vida a cada bicho e depois roda as
// fases do mundo, na ordem em que foram registradas. Toda fase responde a
// update({ dt, days }), então uma fase nova entra sem mexer aqui. O tempo real de
// cada quadro é multiplicado pela velocidade e fatiado em passos pequenos, para a
// física não pular.
export class Simulation {
  #state;
  #sky;
  #brain;
  #phases;
  #speed = 1;

  constructor({ state, skyClock, brain, phases }) {
    this.#state = state;
    this.#sky = skyClock;
    this.#brain = brain;
    this.#phases = phases;
  }

  get speed() {
    return this.#speed;
  }

  setSpeed(value) {
    this.#speed = Math.max(.25, Math.min(4, Number(value) || 1));
    return this.#speed;
  }

  advance(realSeconds) {
    const duration = Math.max(0, realSeconds * BASE_SIMULATION_SPEED * this.#speed);
    if (duration === 0) return;
    const steps = Math.max(1, Math.ceil(duration / MAX_SIMULATION_STEP));
    const dt = duration / steps;
    for (let i = 0; i < steps; i++) this.step(dt);
  }

  step(dt) {
    const state = this.#state;
    state.elapsed += dt;
    const days = this.#sky.advance(dt);
    const activity = .5 + .5 * this.#sky.current.daylight;
    for (const o of state.organisms) this.#brain.tick(o, dt, { days, activity });
    const tick = { dt, days };
    for (const phase of this.#phases) phase.update(tick);
  }
}
