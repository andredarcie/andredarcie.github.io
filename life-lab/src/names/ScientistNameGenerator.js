import { ShuffledQueue } from '../core/ShuffledQueue.js';
import { MALE_SCIENTISTS, FEMALE_SCIENTISTS } from './scientistNames.js';

// Nome de bicho: cada sexo tem a própria fila de cientistas, sorteada sem repetir.
export class ScientistNameGenerator {
  #queues = {
    male: new ShuffledQueue(MALE_SCIENTISTS),
    female: new ShuffledQueue(FEMALE_SCIENTISTS)
  };

  next(sex) {
    return this.#queues[sex === 'female' ? 'female' : 'male'].next();
  }
}
