import { WORLD } from '../config/world.js';
import { BUILDING_TYPES, UNIT_TYPES, FORMATION_SPACING, TRAIN_QUEUE_MAX } from '../config/rts.js';
import { Building } from '../entities/Building.js';

// As ordens do jogo, iguais para o jogador e para a IA: andar, atacar, colher,
// construir, treinar e erguer obra. Quem chama recebe { ok, reason } quando a ordem
// pode ser recusada, para avisar o jogador.
export class Commands {
  #state;
  #ledger;
  #occupancy;
  #events;

  constructor({ state, ledger, occupancy, events }) {
    this.#state = state;
    this.#ledger = ledger;
    this.#occupancy = occupancy;
    this.#events = events;
  }

  // Grupo anda em formação: cada um ganha um lugar numa espiral em volta do alvo,
  // senão todos disputariam o mesmo ponto e ficariam se empurrando.
  move(units, x, y, attack = false) {
    const slots = Commands.#formation(units.length, x, y);
    // Quem está mais perto do alvo pega o lugar do meio.
    const ordered = [...units].sort((a, b) =>
      Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    ordered.forEach((u, i) => {
      this.#reset(u);
      u.order = { type: attack ? 'attackMove' : 'move', x: slots[i].x, y: slots[i].y };
    });
  }

  attack(units, target) {
    for (const u of units) {
      this.#reset(u);
      u.order = { type: 'attack', target };
    }
  }

  // Só trabalhador colhe; soldado mandado para uma árvore ou moita só anda até lá.
  gather(units, resource) {
    const workers = units.filter(u => u.type === 'worker');
    const others = units.filter(u => u.type !== 'worker');
    for (const u of workers) {
      this.#reset(u);
      u.order = Commands.#gatherOrder(resource);
    }
    if (others.length) this.move(others, resource.x, resource.y);
  }

  build(units, building) {
    for (const u of units) {
      if (u.type !== 'worker') continue;
      const previous = u.order?.type === 'gather' ? u.order : u.order?.resume ?? null;
      this.#reset(u);
      u.order = { type: 'build', building, resume: previous };
    }
  }

  stop(units) {
    for (const u of units) {
      this.#reset(u);
      u.order = null;
      u.post = { x: u.x, y: u.y };
    }
  }

  train(building, type) {
    const teamId = building.team;
    const stats = UNIT_TYPES[type];
    if (!building.built) return { ok: false, reason: 'Not finished yet' };
    if (!building.stats.trains.includes(type)) return { ok: false, reason: 'Cannot train here' };
    if (building.queue.length >= TRAIN_QUEUE_MAX) return { ok: false, reason: 'Queue is full' };
    if (this.#ledger.population(teamId) >= this.#ledger.popCap(teamId)) {
      return { ok: false, reason: 'Population limit — build a House' };
    }
    const missing = this.#ledger.shortage(teamId, stats.cost);
    if (missing) return { ok: false, reason: `Not enough ${missing}` };
    this.#ledger.spend(teamId, stats.cost);
    building.queue.push({ type, time: 0 });
    return { ok: true };
  }

  // Cancela o último da fila e devolve o que custou.
  cancelTrain(building) {
    const item = building.queue.pop();
    if (item) this.#ledger.refund(building.team, UNIT_TYPES[item.type].cost);
  }

  canPlace(kind, x, y) {
    const stats = BUILDING_TYPES[kind];
    const margin = stats.radius + 6;
    if (x < margin || y < margin || x > WORLD.width - margin || y > WORLD.height - margin) return false;
    return this.#occupancy.isFree(x, y, stats.radius + 4, { ignore: ['reserved'] });
  }

  // Paga e marca a obra no chão. Quem constrói é quem chamou (build) depois.
  place(teamId, kind, x, y) {
    const stats = BUILDING_TYPES[kind];
    if (!this.canPlace(kind, x, y)) return { ok: false, reason: 'Can’t build there' };
    const missing = this.#ledger.shortage(teamId, stats.cost);
    if (missing) return { ok: false, reason: `Not enough ${missing}` };
    this.#ledger.spend(teamId, stats.cost);
    const building = this.spawnBuilding(teamId, kind, x, y, false);
    return { ok: true, building };
  }

  spawnBuilding(teamId, kind, x, y, built) {
    const state = this.#state;
    // Porta virada para o meio do mapa: é por onde a turma sai.
    const angle = Math.atan2(WORLD.height / 2 - y, WORLD.width / 2 - x);
    const building = new Building({
      id: state.newId(), team: teamId, kind, stats: BUILDING_TYPES[kind], x, y, angle,
      outfit: state.teams[teamId].outfit, built
    });
    state.buildings.push(building);
    this.#events.emit('placed', { building });
    return building;
  }

  // Ponto de encontro: quem sai da fila vai para lá; se for árvore ou moita, o
  // trabalhador já sai colhendo.
  setRally(building, target) {
    building.rally = target;
  }

  static #gatherOrder(resource) {
    return resource.kind
      ? { type: 'gather', resource: 'wood', tree: resource, x: resource.x, y: resource.y }
      : { type: 'gather', resource: 'food', patch: resource, x: resource.x, y: resource.y };
  }

  // Ordem nova: larga o golpe, a colheita e a briga. A carga fica no ombro: quem
  // volta a colher entrega na próxima ida até a sede.
  #reset(u) {
    u.engage = null;
    u.foe = null;
    u.chop = null;
    u.eating = 0;
  }

  static #formation(count, x, y) {
    const slots = [{ x, y }];
    let ring = 1;
    while (slots.length < count) {
      const around = Math.max(6, Math.round(ring * 6.3));
      for (let i = 0; i < around && slots.length < count; i++) {
        const angle = i / around * Math.PI * 2 + ring * .5;
        slots.push({
          x: Math.max(10, Math.min(WORLD.width - 10, x + Math.cos(angle) * ring * FORMATION_SPACING)),
          y: Math.max(10, Math.min(WORLD.height - 10, y + Math.sin(angle) * ring * FORMATION_SPACING))
        });
      }
      ring++;
    }
    return slots;
  }
}
