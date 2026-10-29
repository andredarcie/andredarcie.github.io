import { TEAMS, MAX_POPULATION, TEXT } from '../config/rts.js';

// O caixa e o censo: comida, madeira, população e teto da vila. Os invasores não
// têm economia, só existem na conta para a cor e a armadura.
export class TeamLedger {
  #state;

  constructor(state) {
    this.#state = state;
  }

  reset({ food, wood, rifles = 0 }) {
    this.#state.teams = {
      player: { ...TEAMS.player, food, wood, rifles },
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

  // A casa do meio do jogador (o inimigo também pode ter uma: a aldeia tupiniquim).
  hall() {
    return this.#state.buildings.find(b => b.kind === 'hall' && b.team === 'player') ?? null;
  }

  // Quem existe mais quem está na fila de treino: a vaga é reservada ao pagar.
  population(teamId) {
    let count = 0;
    for (const u of this.#state.organisms) if (u.team === teamId) count++;
    for (const b of this.#state.buildings) if (b.team === teamId) count += b.queue.length;
    return count;
  }

  popCap(teamId) {
    // `extraCap`: a tropa que a missão já traz além das casas (main.js), para o
    // contador não abrir no vermelho.
    let cap = teamId === 'player' ? this.extraCap ?? 0 : 0;
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

  // O aviso de falta, em português (o terceiro recurso é o da missão: fuzis ou flechas).
  static lack(missing) {
    return TEXT.lack[missing] ?? '';
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
