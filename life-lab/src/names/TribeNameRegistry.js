import { ShuffledQueue } from '../core/ShuffledQueue.js';
import { TRIBE_COLLECTIVES, TRIBE_IDEAS } from './tribeNameParts.js';

// Nome de tribo vive junto com a cor do uniforme: é a cor que identifica a tribo
// (bandeira, fogueira, cabana), e ela só muda quando nasce uma tribo nova.
export class TribeNameRegistry {
  #queue;
  #names = new Map();

  constructor() {
    const combos = [];
    for (const collective of TRIBE_COLLECTIVES) {
      for (const idea of TRIBE_IDEAS) combos.push(`${collective} ${idea}`);
    }
    this.#queue = new ShuffledQueue(combos);
  }

  // Nome da tribo que veste esta cor (sorteia um se a cor ainda não tinha nome).
  nameOf(outfit) {
    if (!outfit) return null;
    if (!this.#names.has(outfit)) this.#names.set(outfit, this.#queue.next());
    return this.#names.get(outfit);
  }

  // Tribo nova: nome novo, mesmo que a cor já tenha sido de uma tribo que acabou.
  christen(outfit) {
    this.#names.set(outfit, this.#queue.next());
    return this.#names.get(outfit);
  }
}
