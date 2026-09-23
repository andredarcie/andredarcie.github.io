import { WORLD } from '../config/world.js';
import {
  WALK_SPEED, RUN_SPEED, BRAKING, DRINK_RATE, NEED_RESOURCE_THRESHOLD, GRAZE_HUNGER, GRAZE_RANGE,
  SEARCH_GRID_SIZE, SEARCH_SCAN_DURATION, SEARCH_SCAN_SPEED, SEARCH_ARRIVAL_RADIUS
} from '../config/organisms.js';

// Comer e beber: decidir o que falta, enxergar o recurso, ir até ele, consumir, e —
// quando nada está à vista — explorar a ilha zona por zona atrás dele.
export class Foraging {
  #state;
  #perception;
  #grass;
  #ponds;

  constructor({ state, perception, grassField, ponds }) {
    this.#state = state;
    this.#perception = perception;
    this.#grass = grassField;
    this.#ponds = ponds;
  }

  clearSearch(o) {
    o.search.need = null;
    o.search.waypoint = null;
    o.search.scanTimer = 0;
  }

  // Mordida ou gole em andamento. Devolve true enquanto o bicho está ocupado nisso.
  consume(o, dt) {
    if (o.eating <= 0 && o.drinking <= 0) return false;
    if (o.eating > 0) {
      o.eating -= dt;
      if (o.eating <= 0) o.hunger = Math.min(100, o.hunger + 42 * o.genes.efficiency);
    } else {
      const pond = o.drinkingPond;
      if (!pond || !this.#state.ponds.includes(pond) || pond.water <= 0) {
        o.drinking = 0;
        o.drinkingPond = null;
      } else {
        const wanted = Math.min(DRINK_RATE * dt, (100 - o.thirst) / (1.2 * o.genes.efficiency));
        const { amount, dried } = this.#ponds.drink(pond, wanted);
        o.thirst = Math.min(100, o.thirst + amount * 1.2 * o.genes.efficiency);
        o.drinking = Math.max(0, o.drinking - dt);
        if (dried) o.drinking = 0;
        if (o.drinking === 0) o.drinkingPond = null;
      }
    }
    o.halt();
    return true;
  }

  // O que falta agora. `drowsy`: com sono, a fome e a sede moderadas deixam de ser
  // sentidas como urgência — quem não está apertado vai para a cama em vez de sair
  // atrás de comida no escuro.
  decideNeed(o, drowsy) {
    let need = o.hungriest < NEED_RESOURCE_THRESHOLD
      ? (o.hunger <= o.thirst ? 'food' : 'water') : null;
    if (drowsy) need = null;
    // Comer de passagem: sem fome de verdade ainda, mas com a barriga já não
    // cheia, o bicho que dá com uma moita logo ali belisca, em vez de só procurar
    // comida quando aperta. Não sai atrás dela: só vale a moita que está perto.
    if (!need && !drowsy && o.hunger < GRAZE_HUNGER) {
      const grazing = o.need === 'food' && o.target && this.#state.grass.includes(o.target);
      if (grazing || this.#grassWithin(o, GRAZE_RANGE)) need = 'food';
    }
    return need;
  }

  // Troca de necessidade apaga o alvo antigo; com necessidade e sem alvo, procura um
  // recurso à vista.
  updateTarget(o, need) {
    if (need !== o.need) {
      o.need = need;
      o.target = null;
      this.clearSearch(o);
    }
    const pool = need === 'food' ? this.#state.grass : this.#state.ponds;
    if (o.target && !pool.includes(o.target)) o.target = null;
    if (need && !o.target) {
      o.target = this.#perception.nearest(o, pool);
      if (o.target) {
        this.clearSearch(o);
        o.say(need === 'food' ? 'vi comida' : 'vi água', 1.4);
      }
    }
  }

  // Indo até o alvo. Devolve `null` quando chegou e começou a comer ou beber (o tique
  // acabou), ou o movimento até ele.
  pursueTarget(o, need) {
    const target = o.target;
    const distance = Math.hypot(target.x - o.x, target.y - o.y);
    const arrival = need === 'food' ? 12 : target.r + 5;
    if (distance <= arrival) {
      if (need === 'food') {
        this.#grass.eat(target);
        o.eating = 1.15; o.message = 'nham nham';
      } else {
        o.drinking = 1.15; o.drinkingPond = target; o.message = 'glu glu';
      }
      o.thought = 1.15; o.target = null;
      o.halt();
      return null;
    }
    o.restTimer = 0;
    return {
      direction: Math.atan2(target.y - o.y, target.x - o.x),
      desiredSpeed: Math.min(RUN_SPEED * o.pace, Math.sqrt(2 * BRAKING * (distance - arrival)))
    };
  }

  // Nada à vista: vai de zona em zona, preferindo as que ele não olha faz tempo, e
  // em cada uma para e gira para varrer os arredores.
  explore(o, need, dt) {
    const search = o.search;
    if (search.need !== need) {
      search.need = need;
      search.waypoint = null;
      search.scanTimer = 0;
      o.say(need === 'food' ? 'vou buscar comida' : 'vou buscar água', 1.15);
    }

    const waypointInvalid = search.waypoint && (
      search.waypoint.x < 0 || search.waypoint.x > WORLD.width ||
      search.waypoint.y < 0 || search.waypoint.y > WORLD.height
    );
    if (!search.waypoint || waypointInvalid) this.#chooseWaypoint(o, need);

    const dx = search.waypoint.x - o.x;
    const dy = search.waypoint.y - o.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= SEARCH_ARRIVAL_RADIUS) {
      o.halt();
      search.scanTimer += dt;
      o.heading += search.turn * SEARCH_SCAN_SPEED * dt;
      o.wanderHeading = o.heading;
      if (search.scanTimer >= SEARCH_SCAN_DURATION) {
        search.checked[need][search.waypoint.zone] = this.#state.elapsed;
        this.#chooseWaypoint(o, need);
      }
      return { direction: o.heading, desiredSpeed: 0 };
    }

    search.scanTimer = 0;
    const directHeading = Math.atan2(dy, dx);
    const weave = Math.sin(this.#state.elapsed * 1.9 + o.wanderPhase) * .16;
    return {
      direction: directHeading + weave,
      desiredSpeed: WALK_SPEED * o.pace * 1.05
    };
  }

  #grassWithin(o, range) {
    const bite = this.#perception.nearest(o, this.#state.grass);
    return Boolean(bite) && Math.hypot(bite.x - o.x, bite.y - o.y) <= range;
  }

  #zoneAt(x, y) {
    const width = Math.max(1, WORLD.width);
    const height = Math.max(1, WORLD.height);
    const column = Math.max(0, Math.min(SEARCH_GRID_SIZE - 1,
      Math.floor(x / width * SEARCH_GRID_SIZE)));
    const row = Math.max(0, Math.min(SEARCH_GRID_SIZE - 1,
      Math.floor(y / height * SEARCH_GRID_SIZE)));
    return row * SEARCH_GRID_SIZE + column;
  }

  #chooseWaypoint(o, need) {
    const search = o.search;
    const currentZone = this.#zoneAt(o.x, o.y);
    const currentColumn = currentZone % SEARCH_GRID_SIZE;
    const currentRow = Math.floor(currentZone / SEARCH_GRID_SIZE);
    let chosenZone = currentZone, bestScore = -Infinity;
    for (let zone = 0; zone < SEARCH_GRID_SIZE ** 2; zone++) {
      const column = zone % SEARCH_GRID_SIZE;
      const row = Math.floor(zone / SEARCH_GRID_SIZE);
      const gridDistance = Math.hypot(column - currentColumn, row - currentRow);
      const lastChecked = search.checked[need][zone];
      const staleness = lastChecked < 0 ? 40 : Math.min(40, this.#state.elapsed - lastChecked);
      const score = staleness + gridDistance * 4 + Math.random() * 3 -
        (zone === currentZone ? 10 : 0);
      if (score > bestScore) { bestScore = score; chosenZone = zone; }
    }

    const width = Math.max(1, WORLD.width);
    const height = Math.max(1, WORLD.height);
    const zoneWidth = width / SEARCH_GRID_SIZE;
    const zoneHeight = height / SEARCH_GRID_SIZE;
    const column = chosenZone % SEARCH_GRID_SIZE;
    const row = Math.floor(chosenZone / SEARCH_GRID_SIZE);
    const marginX = Math.min(24, width * .2);
    const marginY = Math.min(24, height * .2);
    const rawX = (column + .18 + Math.random() * .64) * zoneWidth;
    const rawY = (row + .18 + Math.random() * .64) * zoneHeight;
    search.waypoint = {
      x: Math.max(marginX, Math.min(width - marginX, rawX)),
      y: Math.max(marginY, Math.min(height - marginY, rawY)),
      zone: chosenZone
    };
    search.scanTimer = 0;
    search.turn = Math.random() < .5 ? -1 : 1;
  }
}
