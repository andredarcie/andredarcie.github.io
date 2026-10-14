import { WORLD } from '../config/world.js';
import { BUILDING_TYPES, UNIT_TYPES, AI_LEVELS } from '../config/rts.js';

// O povo vermelho. Pensa em intervalos curtos e segue uma receita simples de RTS:
// mantém os trabalhadores colhendo (mais comida que madeira, conforme a falta),
// treina trabalhador até a meta, ergue casa antes de travar na população, levanta o
// acampamento de guerra, junta exército e ataca em ondas que crescem. Se a base é
// atacada, todo soldado volta para defender.
export class AiPlayer {
  #state;
  #ledger;
  #commands;
  #team = 'enemy';
  #level = AI_LEVELS.normal;
  #thinkTimer = 0;
  #wave = 0;
  #nextAttack = 0;
  #threat = null;
  #threatTimer = 0;

  constructor({ state, ledger, commands, events }) {
    this.#state = state;
    this.#ledger = ledger;
    this.#commands = commands;
    events.on('underAttack', ({ team, x, y }) => {
      if (team !== this.#team) return;
      this.#threat = { x, y };
      this.#threatTimer = 12;
    });
  }

  setLevel(id) {
    this.#level = AI_LEVELS[id] ?? AI_LEVELS.normal;
    this.#wave = 0;
    this.#nextAttack = this.#level.firstAttack;
    this.#thinkTimer = 0;
    this.#threat = null;
  }

  update({ dt }) {
    if (this.#state.winner) return;
    this.#threatTimer -= dt;
    if (this.#threatTimer <= 0) this.#threat = null;
    this.#thinkTimer -= dt;
    if (this.#thinkTimer > 0) return;
    this.#thinkTimer = this.#level.think;
    const home = this.#home();
    if (!home) return;
    this.#economy(home);
    this.#construction(home);
    this.#military(home);
  }

  #home() {
    const buildings = this.#ledger.buildings(this.#team);
    return buildings.find(b => b.kind === 'lodge') ?? buildings[0] ?? null;
  }

  // ---- Economia ----

  #economy(home) {
    const team = this.#ledger.team(this.#team);
    const workers = this.#ledger.units(this.#team).filter(u => u.type === 'worker');
    const lodge = this.#ledger.buildings(this.#team).find(b => b.kind === 'lodge' && b.built);
    // Trabalhador primeiro, até a meta; guarda comida para o exército depois disso.
    if (lodge && workers.length + lodge.queue.length < this.#level.workers && lodge.queue.length < 2) {
      this.#commands.train(lodge, 'worker');
    }
    // Comida vira a prioridade quando tem pouca; madeira quando falta para obra.
    const woodShare = team.wood < 80 ? .55 : team.food < 80 ? .3 : .42;
    let woodWorkers = workers.filter(u => u.order?.type === 'gather' && u.order.resource === 'wood').length;
    for (const worker of workers) {
      if (worker.order) continue;
      const wantWood = woodWorkers < workers.length * woodShare;
      const resource = wantWood ? this.#nearestTree(home) : this.#nearestBush(home);
      const fallback = wantWood ? this.#nearestBush(home) : this.#nearestTree(home);
      const target = resource ?? fallback;
      if (!target) continue;
      this.#commands.gather([worker], target);
      if (target.kind) woodWorkers++;
    }
  }

  #nearestTree(home) {
    let best = null, bestDistance = Infinity;
    for (const tree of this.#state.trees) {
      if (tree.stump || tree.fall || tree.growth < 1) continue;
      const distance = Math.hypot(tree.x - home.x, tree.y - home.y);
      if (distance < bestDistance) { best = tree; bestDistance = distance; }
    }
    return best;
  }

  #nearestBush(home) {
    let best = null, bestDistance = Infinity;
    for (const patch of this.#state.grass) {
      const distance = Math.hypot(patch.x - home.x, patch.y - home.y);
      if (distance < bestDistance) { best = patch; bestDistance = distance; }
    }
    return best;
  }

  // ---- Obras ----

  #construction(home) {
    const buildings = this.#ledger.buildings(this.#team);
    const pending = buildings.filter(b => !b.built);
    // Obra parada (o construtor morreu ou foi colher): chama alguém de volta.
    for (const site of pending) {
      const builders = this.#state.organisms.filter(u => u.order?.type === 'build' && u.order.building === site);
      if (!builders.length) this.#assignBuilders(site, 2);
    }
    if (pending.length) return;
    const pop = this.#ledger.population(this.#team);
    const cap = this.#ledger.popCap(this.#team);
    const hasCamp = buildings.some(b => b.kind === 'camp');
    const workers = this.#ledger.units(this.#team).filter(u => u.type === 'worker').length;
    if (cap < 40 && cap - pop <= 2) this.#raise('house', home, 2);
    else if (!hasCamp && workers >= 6) this.#raise('camp', home, 3);
    else if (hasCamp && buildings.filter(b => b.kind === 'camp').length < 2 && workers >= this.#level.workers &&
      this.#ledger.team(this.#team).wood > 260) this.#raise('camp', home, 2);
  }

  #raise(kind, home, builders) {
    if (!this.#ledger.canAfford(this.#team, BUILDING_TYPES[kind].cost)) return;
    const spot = this.#findSpot(kind, home);
    if (!spot) return;
    const result = this.#commands.place(this.#team, kind, spot.x, spot.y);
    if (result.ok) this.#assignBuilders(result.building, builders);
  }

  // Um lugar livre em anéis em volta da sede, puxado para o lado de dentro do mapa.
  #findSpot(kind, home) {
    const toCenter = Math.atan2(WORLD.height / 2 - home.y, WORLD.width / 2 - home.x);
    for (let ring = 1; ring <= 6; ring++) {
      const distance = 30 + ring * 22;
      for (let i = 0; i < 12; i++) {
        const angle = toCenter + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * .5 + ring * .2;
        const x = home.x + Math.cos(angle) * distance;
        const y = home.y + Math.sin(angle) * distance;
        if (this.#commands.canPlace(kind, x, y)) return { x, y };
      }
    }
    return null;
  }

  #assignBuilders(site, count) {
    const workers = this.#ledger.units(this.#team)
      .filter(u => u.type === 'worker' && u.order?.type !== 'build')
      .sort((a, b) => Math.hypot(a.x - site.x, a.y - site.y) - Math.hypot(b.x - site.x, b.y - site.y))
      .slice(0, count);
    if (workers.length) this.#commands.build(workers, site);
  }

  // ---- Exército ----

  #military(home) {
    const camps = this.#ledger.buildings(this.#team).filter(b => b.kind === 'camp' && b.built);
    const team = this.#ledger.team(this.#team);
    const workers = this.#ledger.units(this.#team).filter(u => u.type === 'worker').length;
    // Guarda comida para o próximo trabalhador enquanto não chegou na meta.
    const reserve = workers < this.#level.workers ? UNIT_TYPES.worker.cost.food : 0;
    for (const camp of camps) {
      if (camp.queue.length >= 2) continue;
      const type = this.#pickUnit();
      const cost = UNIT_TYPES[type].cost;
      if (team.food - reserve < cost.food || team.wood < cost.wood) continue;
      this.#commands.train(camp, type);
    }
    const army = this.#ledger.units(this.#team).filter(u => u.type !== 'worker');
    if (this.#threat) {
      // Defesa: quem não está brigando corre para o ponto atacado.
      const idle = army.filter(u => !u.engage && u.order?.type !== 'attack');
      if (idle.length) this.#commands.move(idle, this.#threat.x, this.#threat.y, true);
      return;
    }
    const elapsed = this.#state.elapsed;
    const waveSize = this.#level.wave + this.#wave * this.#level.waveGrowth;
    const ready = army.filter(u => !u.attacking);
    if (elapsed >= this.#nextAttack && ready.length >= waveSize) {
      const target = this.#attackTarget(home);
      if (target) {
        this.#commands.move(ready, target.x, target.y, true);
        for (const u of ready) u.attacking = true;
        this.#wave++;
        this.#nextAttack = elapsed + 90;
      }
      return;
    }
    // Quem chegou ao destino do ataque e ficou sem nada para fazer segue para a
    // próxima construção do inimigo.
    for (const u of army) {
      if (!u.attacking || u.order || u.engage) continue;
      const target = this.#attackTarget(u);
      if (target) this.#commands.move([u], target.x, target.y, true);
    }
    // Quem está em casa se junta perto da fogueira, de frente para o inimigo.
    const gather = camps[0] ?? home;
    const idle = army.filter(u => !u.attacking && !u.order && !u.engage &&
      Math.hypot(u.x - gather.x, u.y - gather.y) > 90);
    if (idle.length) {
      const toCenter = Math.atan2(WORLD.height / 2 - gather.y, WORLD.width / 2 - gather.x);
      this.#commands.move(idle, gather.x + Math.cos(toCenter) * 50, gather.y + Math.sin(toCenter) * 50);
    }
  }

  #pickUnit() {
    const roll = Math.random();
    if (this.#wave >= 1 && roll < .22) return 'brute';
    if (roll < .55) return 'warrior';
    return 'spearman';
  }

  // A construção do jogador mais perto de quem vai atacar (ou da base, se ninguém).
  #attackTarget(from) {
    let best = null, bestDistance = Infinity;
    for (const b of this.#ledger.buildings('player')) {
      const distance = Math.hypot(b.x - from.x, b.y - from.y);
      if (distance < bestDistance) { best = b; bestDistance = distance; }
    }
    return best;
  }
}
