import { WORLD } from '../config/world.js';
import { WALK_SPEED, BRAKING } from '../config/organisms.js';
import { CHOP_SWING, CHOP_IMPACT, CHOP_REACH } from '../config/settlement.js';
import { HURT_FLASH } from '../config/flame.js';
import { WOUND_MAX, BLEED_SECONDS, BLEED_MAX } from '../config/combat.js';
import { CORPSE_DAYS } from '../config/death.js';
import {
  FOOD_PER_TRIP, FOOD_GATHER_TIME, WOOD_PER_LOG, RESOURCE_SEARCH_RANGE, LOG_PICKUP_RANGE,
  GUARD_LEASH, WORKER_RETALIATE, WOUND_HIT_CHANCE, UNIT_TYPES
} from '../config/rts.js';
import { Corpse } from '../entities/Corpse.js';
import { Log } from '../entities/Log.js';

// Passo da corrida de cada unidade: anda um pouco mais rápido que o bicho da
// simulação, que passeava.
const MARCH = WALK_SPEED * 1.25;
// Intervalo entre as varreduras de inimigo por perto de cada soldado.
const SCAN_INTERVAL = .3;
// Distância mínima entre duas unidades paradas.
const PERSONAL_SPACE = 9;
// Golpe a até esta distância de uma construção conta como ataque à base.
const HOME_RADIUS = 260;

// O comportamento das unidades a cada passo: cumprir a ordem (andar, atacar, colher,
// construir), perceber inimigo por perto, brigar no ritmo da arma, treinar quem
// está na fila, e cuidar de quem morre e do que é destruído.
export class UnitSystem {
  #state;
  #locomotion;
  #grassField;
  #forest;
  #blood;
  #events;
  #ledger;
  #factory;

  constructor({ state, locomotion, grassField, forest, blood, events, ledger, factory }) {
    this.#state = state;
    this.#locomotion = locomotion;
    this.#grassField = grassField;
    this.#forest = forest;
    this.#blood = blood;
    this.#events = events;
    this.#ledger = ledger;
    this.#factory = factory;
  }

  update({ dt, days }) {
    const state = this.#state;
    if (state.winner) {
      for (const u of state.organisms) this.#coolDown(u, dt);
    } else {
      for (const u of state.organisms) this.#tick(u, dt);
      for (const b of state.buildings) this.#trainTick(b, dt);
    }
    this.#separate(dt);
    this.#keepOutOfBuildings();
    this.#buryDead();
    this.#demolish();
    for (const b of state.buildings) b.hurt = Math.max(0, b.hurt - dt);
    for (const corpse of state.corpses) {
      corpse.time += dt;
      corpse.age += days;
    }
    state.corpses = state.corpses.filter(corpse => corpse.age < CORPSE_DAYS);
    for (const ping of state.pings) ping.time += dt;
    state.pings = state.pings.filter(ping => ping.time < ping.life);
  }

  // ---- Um passo de uma unidade ----

  #coolDown(u, dt) {
    u.hurt = Math.max(0, u.hurt - dt);
    u.strike = Math.max(0, u.strike - dt);
    u.thought = Math.max(0, u.thought - dt);
    u.chop = null;
    u.eating = 0;
    this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
  }

  #tick(u, dt) {
    this.#coolDownTimers(u, dt);
    this.#landSwing(u);
    // No meio do golpe o corpo está no movimento da arma: ninguém sai do lugar.
    if (u.strike > 0) {
      u.halt();
      return;
    }
    if (u.engage && !this.#alive(u.engage)) u.engage = null;
    this.#lookAround(u, dt);

    const order = u.order;
    if (order?.type === 'attack') {
      if (!this.#alive(order.target)) {
        u.order = null;
        u.post = { x: u.x, y: u.y };
      } else {
        this.#fight(u, order.target, dt);
        return;
      }
    }
    if (u.engage) {
      // Soldado de guarda não se afasta demais do posto; trabalhador revida só um tempo.
      const anchor = order?.type === 'attackMove' || u.type === 'worker' ? null : u.post;
      if ((anchor && Math.hypot(u.x - anchor.x, u.y - anchor.y) > GUARD_LEASH) ||
        (u.type === 'worker' && u.retaliate <= 0)) {
        u.engage = null;
      } else {
        this.#fight(u, u.engage, dt);
        return;
      }
    }
    u.foe = null;
    switch (order?.type) {
      case 'move':
      case 'attackMove':
        this.#march(u, order, dt);
        return;
      case 'gather':
        if (order.resource === 'wood') this.#gatherWood(u, order, dt);
        else this.#gatherFood(u, order, dt);
        return;
      case 'build':
        this.#build(u, order, dt);
        return;
      default:
        this.#idle(u, dt);
    }
  }

  #coolDownTimers(u, dt) {
    u.hurt = Math.max(0, u.hurt - dt);
    u.strike = Math.max(0, u.strike - dt);
    u.strikeTimer = Math.max(0, u.strikeTimer - dt);
    u.thought = Math.max(0, u.thought - dt);
    u.retaliate = Math.max(0, u.retaliate - dt);
    u.scan = (u.scan ?? Math.random() * SCAN_INTERVAL) - dt;
  }

  // Soldado parado ou em marcha de ataque procura o inimigo mais perto que enxerga;
  // trabalhador só revida quem acabou de bater nele.
  #lookAround(u, dt) {
    if (u.engage || u.scan > 0) return;
    u.scan = SCAN_INTERVAL;
    const type = u.order?.type;
    if (u.type === 'worker') return;
    if (type && type !== 'attackMove') return;
    // De guarda, só o que está ao alcance da coleira: senão ele larga e pega de novo.
    u.engage = this.#nearestEnemy(u, u.stats.sight, type ? null : u.post);
  }

  #nearestEnemy(u, range, post) {
    let best = null, bestDistance = range;
    const leashed = target => post && Math.hypot(target.x - post.x, target.y - post.y) > GUARD_LEASH;
    for (const other of this.#state.organisms) {
      if (other.team === u.team || other.life <= 0 || leashed(other)) continue;
      const dx = other.x - u.x, dy = other.y - u.y;
      if (dx > range || dx < -range || dy > range || dy < -range) continue;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) { best = other; bestDistance = distance; }
    }
    if (best) return best;
    // Sem gente à vista, a construção inimiga mais perto (contando o tamanho dela).
    bestDistance = range * .85;
    for (const b of this.#state.buildings) {
      if (b.team === u.team || b.life <= 0 || leashed(b)) continue;
      const distance = Math.hypot(b.x - u.x, b.y - u.y) - b.radius;
      if (distance < bestDistance) { best = b; bestDistance = distance; }
    }
    return best;
  }

  #idle(u, dt) {
    u.chop = null;
    u.eating = 0;
    // Voltou de uma perseguição: anda de volta ao posto.
    const post = u.post;
    const away = Math.hypot(post.x - u.x, post.y - u.y);
    if (away > 12) {
      this.#steer(u, post.x, post.y, 4, dt);
      return;
    }
    this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
  }

  #march(u, order, dt) {
    u.chop = null;
    u.eating = 0;
    // Chegou, ou está quase lá e travado (vizinho parado no lugar, parede no caminho).
    const close = Math.hypot(order.x - u.x, order.y - u.y) < 28;
    u.stuck = close && u.speed < 6 ? (u.stuck ?? 0) + dt : 0;
    if (this.#steer(u, order.x, order.y, 3, dt) || u.stuck > .8) {
      u.order = null;
      u.stuck = 0;
      u.post = { x: u.x, y: u.y };
    }
  }

  // Vai até o ponto e freia para parar a `arrival` dele. Devolve true ao chegar.
  #steer(u, x, y, arrival, dt) {
    const distance = Math.hypot(x - u.x, y - u.y);
    if (distance <= arrival + .5) {
      this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
      return true;
    }
    const top = MARCH * u.pace * (u.carrying ? .85 : 1);
    this.#locomotion.move(u, dt, {
      direction: Math.atan2(y - u.y, x - u.x),
      desiredSpeed: Math.min(top, Math.sqrt(2 * BRAKING * Math.max(0, distance - arrival)) + 6)
    });
    return false;
  }

  // ---- Briga ----

  #fight(u, target, dt) {
    u.chop = null;
    u.eating = 0;
    const isBuilding = target.queue !== undefined;
    const reach = u.stats.reach + (isBuilding ? target.radius : 0);
    const distance = Math.hypot(target.x - u.x, target.y - u.y);
    u.foe = isBuilding ? null : target;
    if (distance > reach) {
      this.#steer(u, target.x, target.y, reach - 2, dt);
      return;
    }
    u.halt();
    u.heading = Math.atan2(target.y - u.y, target.x - u.x);
    if (u.strikeTimer > 0) return;
    // Começa o golpe; o acerto vem no instante do impacto (#landSwing).
    u.strike = u.stats.swing;
    u.strikeSwing = u.stats.swing;
    u.strikeKind = u.weapon;
    u.strikeTarget = target;
    u.strikeLanded = false;
    u.strikeTimer = u.stats.interval;
  }

  #landSwing(u) {
    if (u.strike <= 0 || u.strikeLanded || !u.strikeTarget) return;
    if (1 - u.strike / u.strikeSwing < .58) return;
    u.strikeLanded = true;
    const target = u.strikeTarget;
    u.strikeTarget = null;
    if (!this.#alive(target)) return;
    const isBuilding = target.queue !== undefined;
    const reach = u.stats.reach * 1.4 + (isBuilding ? target.radius : 0);
    if (Math.hypot(target.x - u.x, target.y - u.y) > reach) return;
    if (isBuilding) this.#hitBuilding(u, target);
    else this.#hitUnit(u, target);
  }

  #hitUnit(u, foe) {
    const damage = u.stats.damage * (.85 + Math.random() * .3);
    const direction = Math.atan2(foe.y - u.y, foe.x - u.x);
    foe.life -= damage;
    foe.hurt = HURT_FLASH;
    foe.woundedBy = u.stats.label;
    if (Math.random() < WOUND_HIT_CHANCE) foe.wounds = Math.min(WOUND_MAX, foe.wounds + 1);
    const bleed = u.weapon === 'axe' ? 1.2 : u.weapon === 'spear' ? .8 : .4;
    foe.bleed = Math.min(BLEED_MAX * .5, foe.bleed + bleed * BLEED_SECONDS * damage / 30);
    // O tranco empurra a vítima para trás.
    const knock = u.weapon === 'axe' ? 6 : 3;
    foe.x = Math.max(foe.size, Math.min(WORLD.width - foe.size, foe.x + Math.cos(direction) * knock));
    foe.y = Math.max(foe.size, Math.min(WORLD.height - foe.size, foe.y + Math.sin(direction) * knock));
    this.#blood.splash(foe, direction, damage * .6);
    if (foe.life <= 0) {
      foe.slainBy = u.stats.label;
      if (u.weapon === 'axe' && Math.random() < .35) {
        foe.beheaded = true;
        this.#blood.splash(foe, direction, 30, 13);
      }
      return;
    }
    this.#answer(foe, u);
    this.#alert(foe.team, foe.x, foe.y);
  }

  #hitBuilding(u, building) {
    const damage = u.stats.damage * u.stats.vsBuilding * (.85 + Math.random() * .3);
    building.life -= damage;
    building.hurt = .3;
    this.#state.woodChips.push({
      x: building.x - Math.cos(u.heading) * building.radius * .6,
      y: building.y - Math.sin(u.heading) * building.radius * .6,
      dir: u.heading, time: 0, seed: Math.random() * 100
    });
    // Quem guarda a construção vem defender.
    this.#rallyDefenders(building.team, u, building.x, building.y);
    this.#alert(building.team, building.x, building.y);
  }

  // Quem apanha revida: soldado parado sempre, trabalhador só se estava à toa ou
  // colhendo perto; e os soldados parados por perto vêm ajudar.
  #answer(victim, striker) {
    if (!victim.engage && victim.order?.type !== 'move' && victim.order?.type !== 'attack') {
      if (victim.type !== 'worker' || !victim.order || victim.order.type === 'gather') {
        victim.engage = striker;
        victim.retaliate = WORKER_RETALIATE;
        if (victim.type === 'worker') {
          victim.chop = null;
          victim.eating = 0;
        }
      }
    }
    this.#rallyDefenders(victim.team, striker, victim.x, victim.y);
  }

  #rallyDefenders(teamId, striker, x, y) {
    for (const ally of this.#state.organisms) {
      if (ally.team !== teamId || ally.type === 'worker' || ally.engage) continue;
      if (ally.order && ally.order.type !== 'attackMove') continue;
      if (Math.hypot(ally.x - x, ally.y - y) > ally.stats.sight * 1.3) continue;
      ally.engage = striker;
    }
  }

  // "Base sob ataque" só quando o golpe é perto de alguma construção do time: quem
  // está atacando a base do outro não precisa ser avisado de que apanha lá.
  #alert(teamId, x, y) {
    const nearHome = this.#state.buildings.some(b =>
      b.team === teamId && Math.hypot(b.x - x, b.y - y) < HOME_RADIUS);
    if (nearHome) this.#events.emit('underAttack', { team: teamId, x, y });
  }

  #alive(target) {
    if (!target || target.life <= 0) return false;
    return target.queue !== undefined
      ? this.#state.buildings.includes(target)
      : this.#state.organisms.includes(target);
  }

  // ---- Madeira ----

  #gatherWood(u, order, dt) {
    u.eating = 0;
    if (u.carryFood) { this.#deliver(u, dt); return; }
    if (u.carrying) { u.chop = null; this.#deliver(u, dt); return; }
    if (u.chop) { this.#chopTick(u, order, dt); return; }
    // Tora no chão por perto vai para o ombro antes de cortar outra árvore.
    const log = this.#nearestLog(u);
    if (log) {
      if (this.#steer(u, log.x, log.y, 5, dt)) {
        this.#forest.takeLog(log);
        u.carrying = true;
      }
      return;
    }
    let tree = order.tree;
    // A árvore está caindo: espera as toras aparecerem.
    if (tree && tree.fall && this.#state.trees.includes(tree)) {
      this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
      return;
    }
    if (!tree || !this.#choppable(tree)) {
      tree = this.#nearestTree(order.x ?? u.x, order.y ?? u.y, u);
      order.tree = tree;
      if (!tree) {
        u.order = null;
        u.post = { x: u.x, y: u.y };
        u.say('no trees nearby', 1.5);
        return;
      }
      order.x = tree.x;
      order.y = tree.y;
    }
    if (this.#steer(u, tree.x, tree.y, CHOP_REACH - 1, dt)) {
      u.chop = { tree, timer: Math.random() * .3 };
      u.heading = Math.atan2(tree.y - u.y, tree.x - u.x);
    }
  }

  #chopTick(u, order, dt) {
    const tree = u.chop.tree;
    if (!this.#state.trees.includes(tree) || tree.stump || tree.fall) {
      u.chop = null;
      return;
    }
    u.halt();
    u.heading = Math.atan2(tree.y - u.y, tree.x - u.x);
    const before = u.chop.timer;
    u.chop.timer += dt;
    if (before < CHOP_IMPACT && u.chop.timer >= CHOP_IMPACT) {
      tree.health--;
      tree.shake = 1;
      this.#state.woodChips.push({ x: tree.x, y: tree.y, dir: u.heading, time: 0, seed: Math.random() * 100 });
      if (tree.health <= 0) {
        // Cai para longe de quem deu o último golpe.
        tree.fall = { angle: .04, speed: 0, dir: u.heading, phase: 'falling', timer: 0, landed: false };
        for (const other of this.#state.organisms) if (other.chop?.tree === tree) other.chop = null;
        order.tree = tree;
        return;
      }
    }
    if (u.chop.timer >= CHOP_SWING) u.chop.timer -= CHOP_SWING;
  }

  #choppable(tree) {
    return this.#state.trees.includes(tree) && !tree.stump && !tree.fall && tree.growth >= 1;
  }

  #nearestTree(x, y, u) {
    let best = null, bestScore = Infinity;
    for (const tree of this.#state.trees) {
      if (!this.#choppable(tree)) continue;
      const fromOrder = Math.hypot(tree.x - x, tree.y - y);
      if (fromOrder > RESOURCE_SEARCH_RANGE) continue;
      const score = fromOrder + Math.hypot(tree.x - u.x, tree.y - u.y) * .5;
      if (score < bestScore) { best = tree; bestScore = score; }
    }
    return best;
  }

  #nearestLog(u) {
    let best = null, bestDistance = LOG_PICKUP_RANGE;
    for (const log of this.#state.logs) {
      const distance = Math.hypot(log.x - u.x, log.y - u.y);
      if (distance < bestDistance) { best = log; bestDistance = distance; }
    }
    return best;
  }

  // ---- Comida ----

  #gatherFood(u, order, dt) {
    u.chop = null;
    if (u.carrying || u.carryFood) { u.eating = 0; this.#deliver(u, dt); return; }
    let patch = order.patch;
    if (!patch || !this.#state.grass.includes(patch)) {
      patch = this.#nearestPatch(order.x ?? u.x, order.y ?? u.y, u);
      order.patch = patch;
      if (!patch) {
        u.eating = 0;
        u.order = null;
        u.post = { x: u.x, y: u.y };
        u.say('no food nearby', 1.5);
        return;
      }
      order.x = patch.x;
      order.y = patch.y;
    }
    if (!this.#steer(u, patch.x, patch.y, 8, dt)) {
      u.eating = 0;
      return;
    }
    u.heading = Math.atan2(patch.y - u.y, patch.x - u.x);
    u.eating += dt;
    if (u.eating < FOOD_GATHER_TIME) return;
    u.eating = 0;
    patch.stock -= FOOD_PER_TRIP;
    u.carryFood = FOOD_PER_TRIP;
    if (patch.stock <= 0) this.#grassField.eat(patch);
  }

  #nearestPatch(x, y, u) {
    let best = null, bestScore = Infinity;
    for (const patch of this.#state.grass) {
      const fromOrder = Math.hypot(patch.x - x, patch.y - y);
      if (fromOrder > RESOURCE_SEARCH_RANGE) continue;
      const score = fromOrder + Math.hypot(patch.x - u.x, patch.y - u.y) * .5;
      if (score < bestScore) { best = patch; bestScore = score; }
    }
    return best;
  }

  // Leva a carga até a sede mais perto e volta ao trabalho.
  #deliver(u, dt) {
    const home = this.#ledger.nearestDropOff(u.team, u.x, u.y);
    if (!home) {
      this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
      if (u.thought <= 0) u.say('no lodge!', 2);
      return;
    }
    if (!this.#steer(u, home.x, home.y, home.radius + 5, dt)) return;
    if (u.carrying) {
      u.carrying = false;
      this.#ledger.deposit(u.team, 'wood', WOOD_PER_LOG);
    }
    if (u.carryFood) {
      this.#ledger.deposit(u.team, 'food', u.carryFood);
      u.carryFood = 0;
    }
  }

  // ---- Construção ----

  #build(u, order, dt) {
    u.eating = 0;
    const site = order.building;
    if (!this.#alive(site) || site.built) {
      u.chop = null;
      u.order = order.resume ?? null;
      u.post = { x: u.x, y: u.y };
      return;
    }
    if (!u.chop) {
      if (!this.#steer(u, site.x, site.y, site.radius + 5, dt)) return;
      u.chop = { tree: null, timer: Math.random() * .4 };
    }
    u.halt();
    u.heading = Math.atan2(site.y - u.y, site.x - u.x);
    u.chop.timer = (u.chop.timer + dt) % CHOP_SWING;
    if (site.advance(dt / site.stats.build)) {
      this.#events.emit('built', { building: site });
      for (const other of this.#state.organisms) {
        if (other.order?.type === 'build' && other.order.building === site) other.chop = null;
      }
    }
  }

  // ---- Treino ----

  #trainTick(b, dt) {
    if (!b.built || !b.queue.length) return;
    const item = b.queue[0];
    const stats = UNIT_TYPES[item.type];
    item.time = Math.min(stats.time, item.time + dt);
    if (item.time < stats.time) return;
    b.queue.shift();
    const angle = b.angle + (Math.random() - .5) * 1.2;
    const unit = this.#factory.create(b.team, item.type, b.doorX + Math.cos(angle) * 4,
      b.doorY + Math.sin(angle) * 4, b.angle);
    unit.birthAnimation = 0;
    this.#state.organisms.push(unit);
    this.#sendToRally(unit, b);
    this.#events.emit('trained', { unit, building: b });
  }

  // Ponto de encontro com recurso: o trabalhador já sai colhendo. Sem ponto, a
  // unidade dá uns passos para fora da porta e fica ali.
  #sendToRally(unit, b) {
    const rally = b.rally;
    const resource = rally?.resource;
    if (resource && unit.type === 'worker') {
      const alive = resource.kind ? this.#choppable(resource) : this.#state.grass.includes(resource);
      if (alive) {
        unit.order = resource.kind
          ? { type: 'gather', resource: 'wood', tree: resource, x: resource.x, y: resource.y }
          : { type: 'gather', resource: 'food', patch: resource, x: resource.x, y: resource.y };
        return;
      }
    }
    const point = rally ?? {
      x: b.doorX + Math.cos(b.angle) * 22 + (Math.random() - .5) * 26,
      y: b.doorY + Math.sin(b.angle) * 22 + (Math.random() - .5) * 26
    };
    unit.order = { type: unit.type === 'worker' ? 'move' : 'attackMove', x: point.x, y: point.y };
  }

  // ---- Corpo a corpo no espaço ----

  // Unidades paradas não ficam uma dentro da outra.
  #separate(dt) {
    const units = this.#state.organisms;
    const push = Math.min(1, dt * 8);
    for (let i = 0; i < units.length; i++) {
      const a = units[i];
      for (let j = i + 1; j < units.length; j++) {
        const b = units[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx > PERSONAL_SPACE || dx < -PERSONAL_SPACE || dy > PERSONAL_SPACE || dy < -PERSONAL_SPACE) continue;
        const distance = Math.hypot(dx, dy) || .01;
        if (distance >= PERSONAL_SPACE) continue;
        const shove = (PERSONAL_SPACE - distance) / 2 * push;
        const nx = dx / distance, ny = dy / distance;
        a.x -= nx * shove; a.y -= ny * shove;
        b.x += nx * shove; b.y += ny * shove;
      }
    }
  }

  // Ninguém atravessa parede: quem entrou no círculo de uma construção é posto na beira.
  #keepOutOfBuildings() {
    for (const u of this.#state.organisms) {
      for (const b of this.#state.buildings) {
        const limit = b.radius + 2;
        const dx = u.x - b.x, dy = u.y - b.y;
        if (dx > limit || dx < -limit || dy > limit || dy < -limit) continue;
        const distance = Math.hypot(dx, dy) || .01;
        if (distance >= limit) continue;
        u.x = b.x + dx / distance * limit;
        u.y = b.y + dy / distance * limit;
      }
      u.x = Math.max(u.size, Math.min(WORLD.width - u.size, u.x));
      u.y = Math.max(u.size, Math.min(WORLD.height - u.size, u.y));
    }
  }

  // ---- Fim ----

  #buryDead() {
    const state = this.#state;
    let anyDead = false;
    for (const u of state.organisms) {
      if (u.life > 0) continue;
      anyDead = true;
      if (u.carrying) this.#forest.dropLog(u.x, u.y, u.heading);
      state.corpses.push(new Corpse(u));
      this.#events.emit('death', { organism: u });
    }
    if (!anyDead) return;
    state.organisms = state.organisms.filter(u => u.life > 0);
    for (const u of state.organisms) {
      if (u.engage && u.engage.life <= 0) u.engage = null;
      if (u.foe && u.foe.life <= 0) u.foe = null;
    }
  }

  // Construção destruída: desaba em poeira, deixa umas toras e some. Time sem
  // nenhuma construção perdeu.
  #demolish() {
    const state = this.#state;
    const fallen = state.buildings.filter(b => b.life <= 0);
    if (!fallen.length) return;
    for (const b of fallen) {
      for (let i = 0; i < 6; i++) {
        state.fallDust.push({ x: b.x, y: b.y, dir: i / 6 * Math.PI * 2, time: 0 });
      }
      const logs = b.built ? 2 : 1;
      for (let i = 0; i < logs; i++) {
        const angle = Math.random() * Math.PI * 2;
        state.logs.push(new Log({
          x: b.x + Math.cos(angle) * (b.radius + 6), y: b.y + Math.sin(angle) * (b.radius + 6),
          angle: Math.random() * Math.PI, seed: Math.random() * 100
        }));
      }
      this.#events.emit('destroyed', { building: b });
    }
    state.buildings = state.buildings.filter(b => b.life > 0);
    for (const teamId of ['player', 'enemy']) {
      if (state.winner) break;
      if (!state.buildings.some(b => b.team === teamId)) {
        state.winner = this.#ledger.other(teamId);
        this.#events.emit('gameOver', { winner: state.winner });
      }
    }
  }
}
