import { TEAMS, MAX_POPULATION } from '../config/rts.js';

// O caixa e o censo: comida, madeira, população e teto da vila. Os invasores não
// têm economia, só existem na conta para a cor e a armadura.
export class TeamLedger {
  #state;

  constructor(state) {
    this.#state = state;
  }

  reset({ food, wood }) {
    this.#state.teams = {
      player: { ...TEAMS.player, food, wood, rifles: 0 },
      enemy: { ...TEAMS.enemy, food: 0, wood: 0, rifles: 0 }
    };
  }

  team(id) {
    return this.#state.teams[id];
  }

  units(teamId) {
    return this.#state.organisms.filter(u => u.team === teamId);
  }

  buildings(teamId) {
    return this.#state.buildings.filter(b => b.team === teamId);
  }

  hall() {
    return this.#state.buildings.find(b => b.kind === 'hall') ?? null;
  }

  // Quem existe mais quem está na fila de treino: a vaga é reservada ao pagar.
  population(teamId) {
    let count = 0;
    for (const u of this.#state.organisms) if (u.team === teamId) count++;
    for (const b of this.#state.buildings) if (b.team === teamId) count += b.queue.length;
    return count;
  }

  popCap(teamId) {
    let cap = 0;
    for (const b of this.#state.buildings) if (b.team === teamId && b.built) cap += b.stats.pop;
    return Math.min(MAX_POPULATION, cap);
  }

  canAfford(teamId, cost) {
    return this.shortage(teamId, cost) === null;
  }

  // Falta de quê, para o aviso: 'food', 'wood', 'rifles' (os fuzis tomados da tropa)
  // ou null.
  shortage(teamId, cost) {
    const team = this.team(teamId);
    for (const resource of ['food', 'wood', 'rifles']) {
      if ((team[resource] ?? 0) < (cost[resource] || 0)) return resource;
    }
    return null;
  }

  spend(teamId, cost) {
    if (!this.canAfford(teamId, cost)) return false;
    const team = this.team(teamId);
    for (const resource of ['food', 'wood', 'rifles']) team[resource] -= cost[resource] || 0;
    return true;
  }

  refund(teamId, cost) {
    const team = this.team(teamId);
    for (const resource of ['food', 'wood', 'rifles']) team[resource] += cost[resource] || 0;
  }

  // O aviso de falta, em português.
  static lack(missing) {
    return { food: 'Falta comida', wood: 'Falta madeira', rifles: 'Faltam fuzis tomados da tropa' }[missing] ?? '';
  }

  deposit(teamId, resource, amount) {
    this.team(teamId)[resource] += Math.round(amount);
  }

  nearestDropOff(teamId, x, y) {
    let best = null, bestDistance = Infinity;
    for (const b of this.#state.buildings) {
      if (b.team !== teamId || !b.built || !b.stats.dropOff) continue;
      const distance = Math.hypot(b.x - x, b.y - y) - b.radius;
      if (distance < bestDistance) { best = b; bestDistance = distance; }
    }
    return best;
  }
}
