import { TEAMS, MAX_POPULATION } from '../config/rts.js';

// O caixa e o censo de cada time: comida, madeira, população e teto.
export class TeamLedger {
  #state;

  constructor(state) {
    this.#state = state;
  }

  reset({ food, wood, aiBonus }) {
    this.#state.teams = {
      player: { ...TEAMS.player, food, wood, bonus: 1 },
      enemy: { ...TEAMS.enemy, food, wood, bonus: aiBonus }
    };
  }

  team(id) {
    return this.#state.teams[id];
  }

  other(id) {
    return id === 'player' ? 'enemy' : 'player';
  }

  units(teamId) {
    return this.#state.organisms.filter(u => u.team === teamId);
  }

  buildings(teamId) {
    return this.#state.buildings.filter(b => b.team === teamId);
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
    const team = this.team(teamId);
    return team.food >= (cost.food || 0) && team.wood >= (cost.wood || 0);
  }

  // Falta de quê, para o aviso: 'food', 'wood' ou null.
  shortage(teamId, cost) {
    const team = this.team(teamId);
    if (team.food < (cost.food || 0)) return 'food';
    if (team.wood < (cost.wood || 0)) return 'wood';
    return null;
  }

  spend(teamId, cost) {
    if (!this.canAfford(teamId, cost)) return false;
    const team = this.team(teamId);
    team.food -= cost.food || 0;
    team.wood -= cost.wood || 0;
    return true;
  }

  refund(teamId, cost) {
    const team = this.team(teamId);
    team.food += cost.food || 0;
    team.wood += cost.wood || 0;
  }

  // Entrega da viagem; a IA difícil rende mais por viagem, a fácil menos.
  deposit(teamId, resource, amount) {
    const team = this.team(teamId);
    team[resource] += Math.round(amount * team.bonus);
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
