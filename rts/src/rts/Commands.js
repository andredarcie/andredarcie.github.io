import { WORLD } from '../config/world.js';
import { BUILDING_TYPES, UNIT_TYPES, FORMATION_SPACING, TRAIN_QUEUE_MAX, TOWER_UPGRADES, TRADE, CRAFT, TEXT } from '../config/rts.js';
import { Building } from '../entities/Building.js';
import { onRoad, facingRoad } from '../world/Roads.js';
import { TeamLedger } from './TeamLedger.js';
import { leaveShelter } from './Shelter.js';

// As ordens do jogo: andar, atacar, colher, construir (ou consertar), treinar,
// erguer obra e melhorar torre. Quem chama recebe { ok, reason } quando a ordem pode
// ser recusada, para avisar o jogador.
export class Commands {
  #state;
  #ledger;
  #occupancy;
  #events;
  #biomes;

  constructor({ state, ledger, occupancy, events, biomes = null }) {
    this.#state = state;
    this.#ledger = ledger;
    this.#occupancy = occupancy;
    this.#events = events;
    this.#biomes = biomes;
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
    this.#events.emit('command', { kind: attack ? 'attack' : 'move' });
  }

  attack(units, target) {
    for (const u of units) {
      this.#reset(u);
      u.order = { type: 'attack', target };
    }
    this.#events.emit('command', { kind: 'attack' });
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
    if (workers.length) this.#events.emit('command', { kind: 'gather' });
  }

  build(units, building) {
    for (const u of units) {
      if (u.type !== 'worker') continue;
      const previous = u.order?.type === 'gather' ? u.order : u.order?.resume ?? null;
      this.#reset(u);
      u.order = { type: 'build', building, resume: previous };
    }
    this.#events.emit('command', { kind: 'build' });
  }

  // O sino: sem ninguém chamado, os trabalhadores largam o que faziam e correm para a
  // casa do meio; com gente lá dentro (ou a caminho), todos voltam ao que faziam.
  // Devolve true se chamou, false se soltou, null sem casa do meio de pé.
  ringBell(teamId = 'player') {
    const hall = this.#ledger.hall();
    if (!hall?.built) return null;
    const workers = this.#state.organisms.filter(u => u.team === teamId && u.type === 'worker' && u.life > 0);
    const called = workers.filter(u => u.inHut || u.order?.type === 'shelter');
    if (called.length) {
      for (const u of called) {
        if (u.inHut) leaveShelter(u);
        else {
          u.order = u.resume ?? null;
          u.resume = null;
        }
      }
      this.#events.emit('bell', { x: hall.x, y: hall.y, on: false });
      return false;
    }
    for (const u of workers) {
      this.#reset(u);
      u.resume = u.order?.type === 'gather' || u.order?.type === 'build' ? u.order : null;
      u.order = { type: 'shelter', building: hall };
    }
    this.#events.emit('bell', { x: hall.x, y: hall.y, on: true });
    return true;
  }

  stop(units) {
    for (const u of units) {
      this.#reset(u);
      u.order = null;
      u.post = { x: u.x, y: u.y };
    }
    this.#events.emit('command', { kind: 'stop' });
  }

  train(building, type) {
    const teamId = building.team;
    const stats = UNIT_TYPES[type];
    if (!building.built) return { ok: false, reason: 'Ainda não está pronto' };
    if (!building.stats.trains.includes(type)) return { ok: false, reason: 'Não se treina isso aqui' };
    if (building.queue.length >= TRAIN_QUEUE_MAX) return { ok: false, reason: 'A fila está cheia' };
    if (this.#ledger.population(teamId) >= this.#ledger.popCap(teamId)) {
      return { ok: false, reason: TEXT.noHousing };
    }
    const missing = this.#ledger.shortage(teamId, stats.cost);
    if (missing) return { ok: false, reason: TeamLedger.lack(missing) };
    this.#ledger.spend(teamId, stats.cost);
    building.queue.push({ type, time: 0 });
    this.#events.emit('command', { kind: 'train' });
    return { ok: true };
  }

  // Cancela o último da fila e devolve o que custou.
  cancelTrain(building) {
    const item = building.queue.pop();
    if (item) this.#ledger.refund(building.team, UNIT_TYPES[item.type].cost);
  }

  // Nada se constrói em cima da estrada, mas dá para cavar colado na beira dela: a
  // conta é contra o leito pintado (onRoad), não contra os círculos reservados, que
  // somados ao raio da obra empurravam a trincheira para longe da estrada.
  canPlace(kind, x, y) {
    const stats = BUILDING_TYPES[kind];
    const margin = stats.radius + 6;
    if (x < margin || y < margin || x > WORLD.width - margin || y > WORLD.height - margin) return false;
    if (onRoad(x, y, stats.radius * .7)) return false;
    // No litoral, nem no mar nem dentro do rio.
    if (this.#biomes && !this.#biomes.buildable(x, y, stats.radius)) return false;
    return this.#occupancy.isFree(x, y, stats.radius + 4, { ignore: ['reserved'] });
  }

  // Próximo nível de uma melhoria da torre: { cost } ou null se já está no máximo.
  nextUpgrade(tower, track) {
    const costs = TOWER_UPGRADES[track].costs;
    const level = tower.levels[track];
    return level < costs.length ? { cost: costs[level], level: level + 1 } : null;
  }

  upgradeTower(tower, track) {
    if (!tower.built) return { ok: false, reason: 'Ainda não está pronto' };
    const next = this.nextUpgrade(tower, track);
    if (!next) return { ok: false, reason: 'Já está no nível máximo' };
    const missing = this.#ledger.shortage(tower.team, next.cost);
    if (missing) return { ok: false, reason: TeamLedger.lack(missing) };
    this.#ledger.spend(tower.team, next.cost);
    tower.levels[track] = next.level;
    this.#events.emit('upgraded', { building: tower, track });
    return { ok: true };
  }

  // Construção única (a Igreja Nova) que já existe, em obra ou pronta.
  alreadyBuilt(kind) {
    return Boolean(BUILDING_TYPES[kind].unique) && this.#state.buildings.some(b => b.kind === kind);
  }

  // Troca do Vilanova: `give` de um recurso por `get` do outro.
  trade(teamId, from) {
    const to = from === 'food' ? 'wood' : 'food';
    if (!this.#state.organisms.some(u => u.team === teamId && u.stats.trader && u.life > 0)) {
      return { ok: false, reason: 'Só com Antônio Vilanova no arraial' };
    }
    const cost = { [from]: TRADE.give };
    const missing = this.#ledger.shortage(teamId, cost);
    if (missing) return { ok: false, reason: TeamLedger.lack(missing) };
    this.#ledger.spend(teamId, cost);
    this.#ledger.deposit(teamId, to, TRADE.get);
    this.#events.emit('command', { kind: 'trade' });
    return { ok: true };
  }

  // Flechas feitas no fogo do conselho (CRAFT): paga a madeira, recebe as flechas na hora.
  craft(building) {
    if (!CRAFT || building.kind !== CRAFT.at) return { ok: false, reason: '' };
    if (!building.built) return { ok: false, reason: 'Ainda não está pronto' };
    const missing = this.#ledger.shortage(building.team, CRAFT.give);
    if (missing) return { ok: false, reason: TeamLedger.lack(missing) };
    this.#ledger.spend(building.team, CRAFT.give);
    for (const [resource, amount] of Object.entries(CRAFT.get)) this.#ledger.deposit(building.team, resource, amount);
    this.#state.floaters.push({ x: building.x, y: building.y, ...CRAFT.get, time: 0, life: 1.6 });
    this.#events.emit('command', { kind: 'train' });
    return { ok: true };
  }

  // Paga e marca a obra no chão. Quem constrói é quem chamou (build) depois.
  place(teamId, kind, x, y) {
    const stats = BUILDING_TYPES[kind];
    if (this.alreadyBuilt(kind)) return { ok: false, reason: `${stats.label}: só pode haver uma` };
    if (!this.canPlace(kind, x, y)) return { ok: false, reason: 'Não dá para construir aí' };
    const missing = this.#ledger.shortage(teamId, stats.cost);
    if (missing) return { ok: false, reason: TeamLedger.lack(missing) };
    this.#ledger.spend(teamId, stats.cost);
    const building = this.spawnBuilding(teamId, kind, x, y, false);
    return { ok: true, building };
  }

  spawnBuilding(teamId, kind, x, y, built, angle = Math.atan2(WORLD.height / 2 - y, WORLD.width / 2 - x)) {
    const state = this.#state;
    // Porta virada para o meio do mapa: é por onde a turma sai.
    const building = new Building({
      id: state.newId(), team: teamId, kind, stats: BUILDING_TYPES[kind], x, y, angle,
      outfit: state.teams[teamId].outfit, built
    });
    // A trincheira nasce com os atiradores olhando a estrada de onde vem a tropa.
    if (building.isTower) building.aim = facingRoad(x, y);
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
