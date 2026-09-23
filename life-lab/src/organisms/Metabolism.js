import {
  LIFE_SIZE, WALK_SPEED, RUN_SPEED, ELDER_DECLINE_PER_DAY, BASE_HUNGER_DRAIN, BASE_THIRST_DRAIN,
  MOVEMENT_HUNGER_COST, MOVEMENT_THIRST_COST, ENERGY_WALK_COST, ENERGY_MOVE_COST, ENERGY_SEX_RATE,
  ENERGY_RECOVERY, SLEEP_HUNGER_RATE, SLEEP_THIRST_RATE
} from '../config/organisms.js';
import { RAIN_HYDRATION_RATE } from '../config/environment.js';
import {
  CAMPFIRE_REST_BONUS, CAMPFIRE_METABOLISM_CUT, HUT_REST_BONUS, HUT_METABOLISM_CUT, CARRY_ENERGY
} from '../config/settlement.js';

// O corpo passando o tempo: envelhece, cresce, gasta fome e sede, gasta ou recupera
// energia e perde vida quando algo falta ou quando a velhice chega.
export class Metabolism {
  #state;
  #vision;
  #campfires;

  constructor({ state, visionPhysiology, campfires }) {
    this.#state = state;
    this.#vision = visionPhysiology;
    this.#campfires = campfires;
  }

  tick(o, dt, days) {
    o.age += days;
    o.stage = o.age >= o.genes.longevity ? 'elder' : o.age >= o.genes.maturity ? 'adult' : 'infant';
    o.size = o.stage === 'infant' ? LIFE_SIZE * (.55 + .45 * o.age / o.genes.maturity) : LIFE_SIZE;
    o.mateCooldown = Math.max(0, o.mateCooldown - dt);
    o.birthAnimation = Math.max(0, o.birthAnimation - dt);
    if (o.stage === 'elder') o.life -= days * ELDER_DECLINE_PER_DAY;
    const movementLoad = (o.speed / RUN_SPEED) ** 2;
    const visionEnergy = this.#vision.energyMultiplier(o.genes);
    // Dormindo, o olho fechado também não cobra o custo da visão; perto do fogo o
    // corpo não gasta para se aquecer, e o metabolismo cai mais um pouco.
    // Dentro da cabana o abrigo vale mais que o fogo.
    const shelterCut = o.inHut ? HUT_METABOLISM_CUT : this.#campfires.warmthAt(o) * CAMPFIRE_METABOLISM_CUT;
    const hungerFactor = o.asleep ? SLEEP_HUNGER_RATE * (1 - shelterCut) : visionEnergy;
    const thirstFactor = o.asleep ? SLEEP_THIRST_RATE * (1 - shelterCut) : visionEnergy;
    const hungerDrain = BASE_HUNGER_DRAIN * o.genes.metabolism *
      hungerFactor * (1 + movementLoad * MOVEMENT_HUNGER_COST);
    const thirstDrain = BASE_THIRST_DRAIN * o.genes.metabolism *
      thirstFactor * (1 + movementLoad * MOVEMENT_THIRST_COST);
    o.hunger = Math.max(0, o.hunger - dt * hungerDrain);
    o.thirst = Math.max(0, o.thirst - dt * thirstDrain);
    const restBonus = !o.asleep ? 0
      : o.inHut ? HUT_REST_BONUS : this.#campfires.warmthAt(o) * CAMPFIRE_REST_BONUS;
    o.energy = o.asleep
      ? Math.min(100, o.energy + dt * ENERGY_RECOVERY * (1 + restBonus))
      : Math.max(0, o.energy - dt * ENERGY_WALK_COST * (o.speed / WALK_SPEED) *
        (1 + movementLoad * ENERGY_MOVE_COST) * (o.carrying ? CARRY_ENERGY : 1));
    if (o.pair && o.pair.phase !== 'approach') {
      o.energy = Math.max(0, o.energy - dt * ENERGY_SEX_RATE);
    }
    if (this.#state.rain) o.thirst = Math.min(100, o.thirst + dt * RAIN_HYDRATION_RATE);
    o.thought = Math.max(0, o.thought - dt);
    if (o.hunger === 0 || o.thirst === 0) o.life -= dt * 5;
  }
}
