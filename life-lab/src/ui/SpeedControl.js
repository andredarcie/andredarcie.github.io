import { Format } from './Format.js';

// O slider de velocidade da simulação, com o valor escrito ao lado.
export class SpeedControl {
  #simulation;
  #range;
  #output;

  constructor(root, simulation) {
    this.#simulation = simulation;
    this.#range = root.querySelector('#speed-range');
    this.#output = root.querySelector('#speed-value');
    this.#range.addEventListener('input', () => this.set(this.#range.valueAsNumber));
    this.set(this.#range.valueAsNumber);
  }

  set(value) {
    const speed = this.#simulation.setSpeed(value);
    const formatted = Format.speed(speed);
    this.#range.value = String(speed);
    this.#output.textContent = formatted;
    this.#range.setAttribute('aria-valuetext', speed === 1
      ? '1 vez' : `${formatted.replace('×', '')} vezes`);
  }
}
