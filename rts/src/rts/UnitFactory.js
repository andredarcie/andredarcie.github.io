import { UNIT_TYPES } from '../config/rts.js';
import { Unit } from '../entities/Unit.js';

// Cria as unidades: o uniforme é a cor do time e a pele é sorteada entre os
// pigmentos dos bichos, para cada um ter cara própria.
export class UnitFactory {
  #state;
  #pigments;

  constructor(state, pigments) {
    this.#state = state;
    this.#pigments = pigments;
  }

  create(teamId, type, x, y, heading = Math.random() * Math.PI * 2) {
    const team = this.#state.teams[teamId];
    return new Unit({
      id: this.#state.newId(),
      team: teamId,
      type,
      stats: UNIT_TYPES[type],
      x, y, heading,
      sex: Math.random() < .5 ? 'male' : 'female',
      color: this.#pigments[Math.floor(Math.random() * this.#pigments.length)],
      outfit: team.outfit
    });
  }
}
