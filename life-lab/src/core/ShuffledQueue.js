const NUMERALS = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

// Sorteio sem repetir: uma fila embaralhada consumida até o fim. Esgotada, é
// reembaralhada, e a volta seguinte ganha numeral ("Curie II").
export class ShuffledQueue {
  #source;
  #order = [];
  #index = 0;
  #round = 0;

  constructor(items) {
    this.#source = [...new Set(items)];
  }

  get size() {
    return this.#source.length;
  }

  next() {
    if (this.#index >= this.#order.length) {
      this.#order = ShuffledQueue.#shuffled(this.#source);
      this.#index = 0;
      this.#round++;
    }
    const item = this.#order[this.#index++];
    return item + (NUMERALS[this.#round - 1] ?? ` ${this.#round}`);
  }

  static #shuffled(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
