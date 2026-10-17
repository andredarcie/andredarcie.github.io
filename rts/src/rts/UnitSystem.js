import { WORLD } from '../config/world.js';
import { WALK_SPEED, BRAKING } from '../config/organisms.js';
import { CHOP_SWING, CHOP_IMPACT, CHOP_REACH } from '../config/settlement.js';
import { HURT_FLASH } from '../config/flame.js';
import { WOUND_MAX, BLEED_SECONDS, BLEED_MAX } from '../config/combat.js';
import { CORPSE_DAYS } from '../config/death.js';
import {
  FOOD_PER_TRIP, FOOD_GATHER_TIME, WOOD_PER_LOG, RESOURCE_SEARCH_RANGE, LOG_PICKUP_RANGE,
  GUARD_LEASH, WORKER_RETALIATE, WOUND_HIT_CHANCE, UNIT_TYPES, ROAD_WIDTH, CENTER, PLAZA_RADIUS,
  THICKET, TOCAIA, THIRST, NIGHT, DEBANDADA, CONVOY, TRADE, HILL_REACH, BLESSING_FADE, RIFLE_PICKUP_REACH
} from '../config/rts.js';
import { Corpse } from '../entities/Corpse.js';
import { Log } from '../entities/Log.js';
import { marchPath, roadPath } from '../world/Roads.js';
import { hillAt } from '../world/Hills.js';

// Passo da corrida de cada unidade: anda um pouco mais rápido que o bicho da
// simulação, que passeava.
const MARCH = WALK_SPEED * 1.25;
// Intervalo entre as varreduras de inimigo por perto de cada soldado.
const SCAN_INTERVAL = .3;
// O pente do fuzil de ferrolho: balas por pente e o tempo a mais da recarga dele.
const CLIP_ROUNDS = 5;
const CLIP_RELOAD = 1.6;
// Distância mínima entre duas unidades paradas.
const PERSONAL_SPACE = 9;
// Desvio de construção: folga além do raio, até onde se olha à frente e quanto
// tempo o lado escolhido vale depois que o caminho abre.
const DETOUR_MARGIN = 6;
const DETOUR_LOOKAHEAD = 60;
const DETOUR_MEMORY = .6;
// Golpe a até esta distância de uma construção conta como ataque à base.
const HOME_RADIUS = 260;

// O comportamento das unidades a cada passo: cumprir a ordem (andar, atacar, colher,
// construir, marchar pela estrada), perceber inimigo por perto, brigar no ritmo da
// arma, queimar, treinar quem está na fila, e cuidar de quem morre e do que é
// destruído. Soldado sem ordem vai atrás da construção mais perto do arraial. Quem
// tem arma de fogo para à distância e atira; o canhão mira as casas; Antônio
// Conselheiro não briga: reza pelos feridos que chegam perto dele.
//
// E o que vem de "Os Sertões": a caatinga atrasa a tropa e esconde o jagunço (que,
// parado nela, fica de tocaia); a tropa longe d'água vai ficando com sede; de noite
// ela erra mais; do alto do morro o tiro vai mais longe; oficial morto põe os
// soldados em debandada, largando os fuzis; o comboio de Monte Santo chega com
// escolta e volta.
export class UnitSystem {
  #state;
  #locomotion;
  #grassField;
  #forest;
  #blood;
  #events;
  #ledger;
  #factory;
  #biomes;
  #sky;

  constructor({ state, locomotion, grassField, forest, blood, events, ledger, factory, biomes, skyClock }) {
    this.#state = state;
    this.#locomotion = locomotion;
    this.#grassField = grassField;
    this.#forest = forest;
    this.#blood = blood;
    this.#events = events;
    this.#ledger = ledger;
    this.#factory = factory;
    this.#biomes = biomes;
    this.#sky = skyClock;
  }

  // ---- O meio: caatinga, noite, sede, morro ----

  #inThicket(x, y) {
    return this.#biomes.biomeAt(x, y) === 'thicket';
  }

  get night() {
    return this.#sky.current.daylight < NIGHT.dark;
  }

  // Força que a sede tira do soldado (1 = nenhuma).
  #thirst(u) {
    if (u.team !== 'enemy') return 1;
    const dry = Math.max(0, Math.min(1, (u.thirst - THIRST.grace) / THIRST.span));
    return 1 - dry * THIRST.maxLoss;
  }

  // Passo: a tropa atolada na caatinga, cansada de noite, com sede; o jagunço não.
  #paceFactor(u) {
    if (u.team !== 'enemy') return 1;
    let factor = this.#thirst(u);
    if (this.#inThicket(u.x, u.y)) factor *= THICKET.slow;
    if (this.night) factor *= NIGHT.pace;
    if (u.flee > 0) factor *= 1.3;
    return factor;
  }

  // Alcance do golpe ou do tiro; do alto do morro, o tiro vai mais longe.
  #reach(u) {
    return u.stats.reach * (u.stats.ranged && hillAt(u.x, u.y) ? HILL_REACH : 1);
  }

  // Chance do tiro acertar: o jagunço na caatinga é difícil de ver; de noite a tropa
  // atira mal; do morro, melhor.
  #accuracy(u, target) {
    let chance = u.stats.accuracy;
    if (u.team === 'enemy') {
      if (target.team === 'player' && this.#inThicket(target.x, target.y)) chance *= THICKET.cover;
      if (this.night) chance *= NIGHT.accuracy;
    }
    if (hillAt(u.x, u.y)) chance += .1;
    return Math.min(.97, chance);
  }

  // Quanto cada golpe rende: o ânimo da pregação, a sede, o fuzil perdido na fuga.
  #might(u) {
    return u.power * (u.boost ?? 1) * this.#thirst(u) * (u.disarmed ? .5 : 1);
  }

  traderAlive(team = 'player') {
    return this.#state.organisms.some(u => u.team === team && u.stats.trader && u.life > 0);
  }

  #deposit(resource, amount) {
    this.#ledger.deposit('player', resource, amount * (this.traderAlive() ? TRADE.bonus : 1));
  }

  update({ dt, days }) {
    const state = this.#state;
    if (state.winner) {
      for (const u of state.organisms) this.#coolDown(u, dt);
    } else {
      this.#preach(dt);
      this.#bless(dt);
      for (const u of state.organisms) this.#tick(u, dt);
      this.#collectRifles();
      for (const b of state.buildings) {
        this.#trainTick(b, dt);
        this.#herdTick(b, dt);
      }
    }
    for (const shot of state.shots) shot.time += dt;
    state.shots = state.shots.filter(shot => shot.time < shot.life);
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
    for (const floater of state.floaters) floater.time += dt;
    state.floaters = state.floaters.filter(floater => floater.time < floater.life);
  }

  // ---- Comando e cura dos chefes ----

  // Quem está ao alcance do comando de João Abade ou das mãos de Manuel Quadrado
  // fica `inspired`: `boost` é o maior ânimo que lhe chega e a cura soma.
  #preach(dt) {
    const holders = this.#state.organisms.filter(u => u.stats.aura && u.life > 0);
    for (const u of this.#state.organisms) {
      u.inspired = false;
      u.boost = 1;
      let heal = 0;
      for (const holder of holders) {
        if (holder === u || holder.team !== u.team) continue;
        const aura = holder.stats.aura;
        if (Math.hypot(u.x - holder.x, u.y - holder.y) > aura.radius) continue;
        u.boost = Math.max(u.boost, aura.damage);
        heal += aura.heal;
      }
      if (u.boost > 1 || heal > 0) u.inspired = true;
      if (heal > 0) u.life = Math.min(u.maxLife, u.life + heal * dt);
    }
  }

  // A oração de Antônio Conselheiro: cada ferido do lado dele, bem perto, sara até a
  // vida encher, com a luz divina por cima (`blessed`, desenhada pela
  // BlessingLayer). Enquanto há por quem rezar ele ergue o bordão (`praying`, lido
  // pela pose) virado para o mais machucado. Quem está inteiro não recebe nada, e
  // sem ferido por perto ele fica como qualquer um.
  #bless(dt) {
    const state = this.#state;
    for (const u of state.organisms) u.blessed = Math.max(0, u.blessed - dt);
    for (const holy of state.organisms) {
      const blessing = holy.stats.blessing;
      if (!blessing || holy.life <= 0) continue;
      let worst = null;
      for (const u of state.organisms) {
        if (u === holy || u.team !== holy.team || u.life <= 0 || u.life >= u.maxLife) continue;
        if (Math.hypot(u.x - holy.x, u.y - holy.y) > blessing.radius) continue;
        u.life = Math.min(u.maxLife, u.life + blessing.heal * dt);
        u.blessed = BLESSING_FADE;
        if (!worst || u.life / u.maxLife < worst.life / worst.maxLife) worst = u;
      }
      // Começou a rezar agora: a sineta toca (AudioManager).
      if (worst && holy.praying <= 0) this.#events.emit('blessing', { x: holy.x, y: holy.y });
      holy.praying = worst ? BLESSING_FADE : Math.max(0, holy.praying - dt);
      if (worst && holy.speed < 1) holy.heading = Math.atan2(worst.y - holy.y, worst.x - holy.x);
    }
  }

  // Curral: as cabras dão comida sozinhas.
  #herdTick(b, dt) {
    const herd = b.stats.herd;
    if (!herd || !b.built || b.team !== 'player') return;
    b.herdTimer = (b.herdTimer ?? 0) + dt;
    if (b.herdTimer < herd.every) return;
    b.herdTimer -= herd.every;
    this.#deposit('food', herd.food);
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
    const invader = u.team === 'enemy';
    if (invader) this.#drink(u, dt);
    else this.#settle(u, dt);
    if (invader && u.flee > 0) {
      this.#flee(u, dt);
      return;
    }
    this.#lookAround(u, dt);

    const order = u.order;
    // Invasor batendo numa construção larga a parede para brigar com quem chegou perto.
    if (order?.type === 'attack' && !(invader && u.engage)) {
      if (!this.#alive(order.target)) {
        u.order = null;
        u.post = { x: u.x, y: u.y };
      } else {
        this.#fight(u, order.target, dt);
        return;
      }
    }
    if (u.engage) {
      // Soldado de guarda não se afasta demais do posto; trabalhador revida só um
      // tempo; invasor não persegue para longe da estrada.
      const loose = order?.type === 'attackMove' || u.type === 'worker' || invader;
      const anchor = loose ? null : u.post;
      const tooFar = invader && Math.hypot(u.engage.x - u.x, u.engage.y - u.y) > u.stats.sight * 1.8;
      if ((anchor && Math.hypot(u.x - anchor.x, u.y - anchor.y) > GUARD_LEASH) ||
        (u.type === 'worker' && u.retaliate <= 0) || tooFar) {
        u.engage = null;
      } else {
        this.#fight(u, u.engage, dt);
        return;
      }
    }
    u.foe = null;
    // Fuzil apanhado do chão: antes de qualquer ordem, leva na mão até a igreja. A
    // ordem fica guardada e segue sozinha depois da entrega.
    if (u.loot > 0) {
      this.#deliverLoot(u, dt);
      return;
    }
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
      case 'raid':
        this.#raid(u, order, dt);
        return;
      case 'convoy':
        this.#convoy(u, order, dt);
        return;
      case 'escort':
        this.#escort(u, order, dt);
        return;
      default:
        if (invader) this.#hunt(u, dt);
        else this.#idle(u, dt);
    }
  }

  #coolDownTimers(u, dt) {
    if (u.burn > 0) {
      u.burn = Math.max(0, u.burn - dt);
      u.life -= u.burnDps * dt;
      if (u.life <= 0) u.slainBy = 'Fogo';
    }
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
    if (u.type === 'worker' || u.stats.passive) return;
    if (u.team === 'enemy') {
      // Na estrada ele pega gente e construção; batendo numa parede, só gente que
      // chegou bem perto o tira dela. Canhão mira construção; a Matadeira, igreja.
      if (u.stats.churchHunter) u.engage = this.#churchTarget(u, this.#reach(u));
      else if (u.stats.siege) u.engage = this.#nearestBuilding(u, this.#reach(u));
      else if (type === 'attack') u.engage = this.#nearestEnemy(u, Math.max(u.stats.reach, 12) * 2.5, null, true);
      else u.engage = this.#nearestEnemy(u, u.stats.sight, null);
      return;
    }
    if (type && type !== 'attackMove') return;
    // O filho de Macambira vai atrás de canhão antes de qualquer outra coisa.
    if (u.stats.antiCannon) {
      const gun = this.#state.organisms.find(o => o.team !== u.team && o.stats.cannon && o.life > 0 &&
        Math.hypot(o.x - u.x, o.y - u.y) < u.stats.sight * 2.5);
      if (gun) {
        u.engage = gun;
        return;
      }
    }
    // De tocaia, espera o inimigo chegar perto (ou no alcance do tiro) para atacar.
    const range = u.hidden ? (u.stats.ranged ? this.#reach(u) : 45) : u.stats.sight;
    // De guarda, só o que está ao alcance da coleira: senão ele larga e pega de novo.
    u.engage = this.#nearestEnemy(u, range, type ? null : u.post);
  }

  #nearestEnemy(u, range, post, unitsOnly = false) {
    let best = null, bestDistance = range;
    const leashed = target => post && Math.hypot(target.x - post.x, target.y - post.y) > GUARD_LEASH;
    for (const other of this.#state.organisms) {
      if (other.team === u.team || other.life <= 0 || leashed(other)) continue;
      const dx = other.x - u.x, dy = other.y - u.y;
      if (dx > range || dx < -range || dy > range || dy < -range) continue;
      const distance = Math.hypot(dx, dy);
      // Jagunço de tocaia só é visto quando já está em cima.
      if (other.hidden && distance > TOCAIA.reveal) continue;
      if (distance < bestDistance) { best = other; bestDistance = distance; }
    }
    if (best || unitsOnly) return best;
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

  // Invasor na estrada: vai de ponto em ponto do caminho até a praça; lá, parte
  // para cima da construção mais perto.
  #raid(u, order, dt) {
    u.chop = null;
    u.eating = 0;
    const point = order.path[order.step];
    if (!point) {
      u.order = null;
      this.#hunt(u, dt);
      return;
    }
    const close = Math.hypot(point.x - u.x, point.y - u.y) < 16;
    if (this.#steer(u, point.x, point.y, 4, dt) || close) order.step++;
  }

  // A Matadeira bombardeava as igrejas: a nova primeiro, depois a velha; sem igreja
  // ao alcance, a construção mais perto.
  #churchTarget(u, range) {
    for (const kind of ['igrejanova', 'hall']) {
      const church = this.#state.buildings.find(b => b.kind === kind && b.team !== u.team && b.life > 0);
      if (church && Math.hypot(church.x - u.x, church.y - u.y) - church.radius < range) return church;
    }
    return this.#nearestBuilding(u, range);
  }

  // Construção inimiga mais perto, contando o tamanho dela, até `range`.
  #nearestBuilding(u, range = Infinity) {
    let best = null, bestDistance = range;
    for (const b of this.#state.buildings) {
      if (b.team === u.team || b.life <= 0) continue;
      const distance = Math.hypot(b.x - u.x, b.y - u.y) - b.radius;
      if (distance < bestDistance) { best = b; bestDistance = distance; }
    }
    return best;
  }

  // Soldado sem ordem: a construção do arraial mais perto (a Matadeira, a igreja);
  // sem nenhuma, quem estiver vivo.
  #hunt(u, dt) {
    let best = u.stats.churchHunter ? this.#churchTarget(u, Infinity) : this.#nearestBuilding(u);
    if (!best) best = this.#nearestEnemy(u, Infinity, null, true);
    if (best) {
      u.order = { type: 'attack', target: best };
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
    // Ponto dentro de construção é inalcançável (a parede devolve a unidade para a
    // beira): o destino passa a ser a beira, do lado de quem chega. O centro exato
    // fica de fora: é a própria construção como alvo (atacar, erguer, entregar),
    // e esses já chegam com `arrival` contando o raio.
    for (const b of this.#state.buildings) {
      const limit = b.radius + 2;
      const gap = Math.hypot(x - b.x, y - b.y);
      if (gap >= limit || gap < .5) continue;
      const side = Math.atan2(y - b.y, x - b.x);
      x = b.x + Math.cos(side) * limit;
      y = b.y + Math.sin(side) * limit;
      arrival = Math.max(arrival, 4);
    }
    const distance = Math.hypot(x - u.x, y - u.y);
    if (distance <= arrival + .5) {
      this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
      return true;
    }
    const top = MARCH * u.pace * this.#paceFactor(u) * (u.carrying ? .85 : 1);
    this.#locomotion.move(u, dt, {
      direction: this.#detour(u, x, y, distance, dt),
      desiredSpeed: Math.min(top, Math.sqrt(2 * BRAKING * Math.max(0, distance - arrival)) + 6)
    });
    return false;
  }

  // Rumo até (x, y) contornando construção. Sem isto a unidade mirava reto no
  // destino, batia na parede, era posta de volta na beira e seguia "correndo"
  // contra ela para sempre. A que estiver na frente e mais perto é contornada
  // pela tangente da borda, sempre pelo mesmo lado enquanto houver bloqueio:
  // assim um grupo de casas coladas é rodeado como um muro só, sem ziguezague.
  #detour(u, x, y, distance, dt) {
    const straight = Math.atan2(y - u.y, x - u.x);
    let blocker = null, nearest = Infinity;
    for (const b of this.#state.buildings) {
      const clearance = b.radius + DETOUR_MARGIN;
      // O próprio destino (obra, sede, alvo de ataque) não é obstáculo.
      if (Math.hypot(x - b.x, y - b.y) < clearance + 4) continue;
      const dx = b.x - u.x, dy = b.y - u.y;
      const gap = Math.hypot(dx, dy) - clearance;
      if (gap > DETOUR_LOOKAHEAD || gap > distance || gap >= nearest) continue;
      // Na frente: o centro dela fica a menos de `clearance` da reta até o destino.
      const along = dx * Math.cos(straight) + dy * Math.sin(straight);
      const across = -dx * Math.sin(straight) + dy * Math.cos(straight);
      if (along <= 0 || Math.abs(across) >= clearance) continue;
      blocker = b;
      nearest = gap;
    }
    u.detourTimer = Math.max(0, (u.detourTimer ?? 0) - dt);
    if (!blocker) {
      if (!u.detourTimer) u.detourSide = 0;
      return straight;
    }
    const dx = blocker.x - u.x, dy = blocker.y - u.y;
    const centre = Math.atan2(dy, dx);
    if (!u.detourSide) {
      // Lado mais curto: aquele para onde o destino já pende em relação ao centro.
      u.detourSide = Math.sin(straight - centre) >= 0 ? 1 : -1;
    }
    u.detourTimer = DETOUR_MEMORY;
    const clearance = blocker.radius + DETOUR_MARGIN;
    const reach = Math.hypot(dx, dy);
    // Longe: mira na tangente. Encostado: anda rente à parede, um pouco para fora.
    const spread = reach > clearance ? Math.asin(clearance / reach) : Math.PI / 2 + .25;
    return centre + u.detourSide * spread;
  }

  // ---- Briga ----

  #fight(u, target, dt) {
    u.chop = null;
    u.eating = 0;
    const isBuilding = target.queue !== undefined;
    if (u.stats.passive) {
      u.order = null;
      u.engage = null;
      return;
    }
    const reach = this.#reach(u) + (isBuilding ? target.radius : 0);
    const distance = Math.hypot(target.x - u.x, target.y - u.y);
    // Quem atira mira (e mostra a arma na mira) também numa parede.
    u.foe = isBuilding && !u.stats.ranged ? null : target;
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
    // Fuzil de ferrolho: o pente (de Mannlicher) tem 5 balas; depois do quinto tiro a
    // recarga é a do pente, mais demorada.
    u.reloadMag = u.stats.ranged && u.weapon === 'rifle' && (u.shots + 1) % CLIP_ROUNDS === 0;
    if (u.reloadMag) u.strikeTimer += CLIP_RELOAD;
    u.strikeSpan = u.strikeTimer;
  }

  #landSwing(u) {
    if (u.strike <= 0 || u.strikeLanded || !u.strikeTarget) return;
    if (1 - u.strike / u.strikeSwing < .58) return;
    u.strikeLanded = true;
    const target = u.strikeTarget;
    u.strikeTarget = null;
    if (!this.#alive(target)) return;
    const isBuilding = target.queue !== undefined;
    const reach = this.#reach(u) * (u.stats.ranged ? 1.15 : 1.4) + (isBuilding ? target.radius : 0);
    if (Math.hypot(target.x - u.x, target.y - u.y) > reach) return;
    // Primeiro golpe de quem estava de tocaia: vale dobrado (o de Pajeú, triplo).
    u.ambush = u.hidden ? (u.stats.ambusher ? TOCAIA.ambusher : TOCAIA.firstHit) : 1;
    u.hidden = false;
    u.still = 0;
    if (u.stats.ranged) {
      // Tiro: fumaça na boca da arma e o risco até o alvo; nem todo tiro acerta.
      u.shots++;
      const hit = isBuilding || Math.random() < this.#accuracy(u, target);
      this.#state.shots.push({
        x: u.x + Math.cos(u.heading) * (u.stats.cannon ? 14 : 9), y: u.y + Math.sin(u.heading) * (u.stats.cannon ? 14 : 9),
        z: u.stats.cannon ? 5 : 11 * u.size / 10,
        tx: target.x + (hit ? 0 : (Math.random() - .5) * 18), ty: target.y + (hit ? 0 : (Math.random() - .5) * 18),
        tz: isBuilding ? 10 : 8, cannon: Boolean(u.stats.cannon), time: 0, life: u.stats.cannon ? 1.6 : 1.1
      });
      const gun = u.stats.cannon ? (u.stats.churchHunter ? 'matadeira' : 'cannon') : u.weapon;
      this.#events.emit('strike', { weapon: gun, cannon: Boolean(u.stats.cannon), x: u.x, y: u.y, tx: target.x, ty: target.y });
      if (u.stats.cannon) {
        this.#state.sparks.push({ x: target.x, y: target.y, time: 0, life: .7, radius: 22, kind: 'blast' });
      }
      if (!hit) {
        u.ambush = 1;
        return;
      }
    }
    else this.#events.emit('strike', { weapon: u.weapon, cannon: false, x: u.x, y: u.y });
    if (isBuilding) this.#hitBuilding(u, target);
    else this.#hitUnit(u, target);
  }

  #hitUnit(u, foe) {
    // A alavanca do filho de Macambira arrebenta canhão.
    const antiCannon = u.stats.antiCannon && foe.stats.cannon ? u.stats.antiCannon : 1;
    const damage = u.stats.damage * this.#might(u) * (u.ambush ?? 1) * antiCannon * (.85 + Math.random() * .3);
    u.ambush = 1;
    const direction = Math.atan2(foe.y - u.y, foe.x - u.x);
    const weapon = u.stats.ranged ? 'bullet' : u.weapon;
    if (!this.wound(foe, damage, direction, { by: u.stats.label, weapon })) return;
    this.#answer(foe, u);
    if (foe.type === 'worker') this.#alert(foe.team, foe.x, foe.y);
  }

  // Dano em alguém, de golpe ou de flecha: vida, ferida, sangue e o tranco. Devolve
  // true se a vítima continua de pé.
  wound(foe, damage, direction, { by, weapon }) {
    foe.life -= damage;
    foe.hurt = HURT_FLASH;
    foe.woundedBy = by;
    if (Math.random() < WOUND_HIT_CHANCE) foe.wounds = Math.min(WOUND_MAX, foe.wounds + 1);
    const bleed = weapon === 'axe' || weapon === 'saber' || weapon === 'machete' ? 1.2
      : weapon === 'spear' || weapon === 'bayonet' || weapon === 'bullet' ? .8 : .4;
    foe.bleed = Math.min(BLEED_MAX * .5, foe.bleed + bleed * BLEED_SECONDS * damage / 30);
    // O tranco empurra a vítima para trás.
    const knock = weapon === 'axe' ? 6 : weapon === 'bullet' ? 1.5 : 3;
    foe.x = Math.max(foe.size, Math.min(WORLD.width - foe.size, foe.x + Math.cos(direction) * knock));
    foe.y = Math.max(foe.size, Math.min(WORLD.height - foe.size, foe.y + Math.sin(direction) * knock));
    // Tiro sangra pouco por fora; golpe de lâmina, mais.
    this.#blood.splash(foe, direction, damage * (weapon === 'bullet' ? .2 : .45));
    if (foe.life > 0) return true;
    foe.slainBy = by;
    if (weapon === 'axe' && Math.random() < .35) {
      foe.beheaded = true;
      this.#blood.splash(foe, direction, 30, 13);
    }
    return false;
  }

  #hitBuilding(u, building) {
    const damage = u.stats.damage * this.#might(u) * u.stats.vsBuilding * (.85 + Math.random() * .3);
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
    if (victim.stats.passive) {
      this.#rallyDefenders(victim.team, striker, victim.x, victim.y);
      return;
    }
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
      if (ally.team !== teamId || ally.type === 'worker' || ally.stats.passive || ally.engage) continue;
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
        u.say('sem árvore por perto', 1.5);
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
      this.#events.emit('chop', { x: tree.x, y: tree.y });
      if (tree.health <= 0) {
        // Cai para longe de quem deu o último golpe.
        tree.fall = { angle: .04, speed: 0, dir: u.heading, phase: 'falling', timer: 0, landed: false };
        this.#events.emit('treeFall', { x: tree.x, y: tree.y });
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
        u.say('sem roça por perto', 1.5);
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
    this.#events.emit('gather', { x: patch.x, y: patch.y });
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
      if (u.thought <= 0) u.say('sem lugar para guardar!', 2);
      return;
    }
    if (!this.#steer(u, home.x, home.y, home.radius + 5, dt)) return;
    if (u.carrying) {
      u.carrying = false;
      this.#deposit('wood', WOOD_PER_LOG);
      this.#events.emit('deliver', { x: u.x, y: u.y, resource: 'wood' });
    }
    if (u.carryFood) {
      this.#deposit('food', u.carryFood);
      u.carryFood = 0;
      this.#events.emit('deliver', { x: u.x, y: u.y, resource: 'food' });
    }
  }

  // ---- Fuzis tomados ----

  // Fuzil não se fabrica no sertão: cada soldado abatido deixa o dele no chão (e o
  // oficial, o canhão e o comboio, as armas que levavam a mais). Fica ali, à vista,
  // até alguém do arraial passar por cima.
  #dropRifles(x, y, count) {
    if (count <= 0) return;
    this.#state.pickups.push({ x: x + (Math.random() - .5) * 4, y: y + (Math.random() - .5) * 4, count });
  }

  // Quem do arraial passar perto de um fuzil caído o apanha — sertanejo, jagunço,
  // chefe, qualquer um — e junta com os que já leva.
  #collectRifles() {
    const state = this.#state;
    if (!state.pickups.length) return;
    state.pickups = state.pickups.filter(pickup => {
      const taker = state.organisms.find(u => u.team === 'player' && u.life > 0 && !u.gone &&
        Math.abs(u.x - pickup.x) < RIFLE_PICKUP_REACH && Math.hypot(u.x - pickup.x, u.y - pickup.y) < RIFLE_PICKUP_REACH);
      if (!taker) return true;
      taker.loot += pickup.count;
      this.#events.emit('riflePickup', { x: pickup.x, y: pickup.y, count: pickup.count, first: !state.flags.riflePickup });
      state.flags.riflePickup = true;
      return false;
    });
  }

  // Com fuzil na mão, o caminho é a igreja: lá ele entra na conta do arraial.
  #deliverLoot(u, dt) {
    u.chop = null;
    u.eating = 0;
    const church = this.#ledger.hall() ?? this.#ledger.nearestDropOff(u.team, u.x, u.y);
    if (!church || !this.#steer(u, church.x, church.y, church.radius + 5, dt)) return;
    this.#ledger.deposit('player', 'rifles', u.loot);
    this.#state.floaters.push({ x: u.x, y: u.y, rifles: u.loot, time: 0, life: 1.6 });
    this.#events.emit('deliver', { x: u.x, y: u.y, resource: 'rifles', count: u.loot });
    u.loot = 0;
  }

  // ---- Construção ----

  #build(u, order, dt) {
    u.eating = 0;
    const site = order.building;
    // Pronta e machucada: o mesmo trabalho vira conserto.
    const repairing = site.built && site.life < site.maxLife - .5;
    if (!this.#alive(site) || (site.built && !repairing)) {
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
    const before = u.chop.timer;
    u.chop.timer = (u.chop.timer + dt) % CHOP_SWING;
    // A batida do maço cai no mesmo instante da animação.
    if (before < CHOP_IMPACT && u.chop.timer >= CHOP_IMPACT) this.#events.emit('hammer', { x: site.x, y: site.y });
    if (repairing) {
      site.life = Math.min(site.maxLife, site.life + site.maxLife * dt / (site.stats.build * 1.5));
      return;
    }
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

  // ---- Tocaia, sede e debandada ----

  // Jagunço parado na caatinga (Pajeú, em qualquer lugar) entra em tocaia depois de
  // uns segundos; andar ou receber ordem o tira dela.
  #settle(u, dt) {
    if (u.type === 'worker' || u.stats.passive) return;
    const fighting = u.engage || u.strike > 0;
    if (u.order || (u.speed > 2 && !fighting)) {
      u.still = 0;
      if (!fighting) u.hidden = false;
      return;
    }
    if (u.hidden || fighting) return;
    if (!u.stats.ambusher && !this.#inThicket(u.x, u.y)) {
      u.still = 0;
      return;
    }
    u.still = (u.still ?? 0) + dt;
    if (u.still >= TOCAIA.settle) u.hidden = true;
  }

  // Sede: o relógio corre desde a última água; perto de uma cacimba ele bebe.
  #drink(u, dt) {
    u.thirst = (u.thirst ?? 0) + dt;
    for (const pond of this.#state.ponds) {
      if (Math.hypot(u.x - pond.x, u.y - pond.y) < pond.fullRadius + THIRST.drinkReach) {
        u.thirst = 0;
        return;
      }
    }
    if (u.thirst > THIRST.grace + THIRST.span * .5 && !this.#state.flags.thirst) {
      this.#state.flags.thirst = true;
      this.#events.emit('thirst', { x: u.x, y: u.y });
    }
  }

  // Oficial morto: quem está perto debanda, e muitos largam o fuzil no caminho.
  #rout(officer) {
    let fled = 0, rifles = 0;
    for (const u of this.#state.organisms) {
      if (u.team !== officer.team || u === officer || u.life <= 0 || u.stats.commander || u.stats.cannon || u.stats.convoy) continue;
      if (Math.hypot(u.x - officer.x, u.y - officer.y) > DEBANDADA.radius) continue;
      u.flee = DEBANDADA.time;
      u.engage = null;
      fled++;
      if (!u.disarmed && Math.random() < DEBANDADA.rifleChance) {
        u.disarmed = true;
        rifles++;
        this.#dropRifles(u.x, u.y, 1);
      }
    }
    this.#events.emit('debandada', { x: officer.x, y: officer.y, fled, rifles });
  }

  // Fugindo: corre para longe da praça; quem chega à beira do mapa deserta.
  #flee(u, dt) {
    u.flee -= dt;
    u.foe = null;
    const away = Math.atan2(u.y - CENTER.y, u.x - CENTER.x);
    this.#steer(u, u.x + Math.cos(away) * 60, u.y + Math.sin(away) * 60, 0, dt);
    if (u.x < 14 || u.y < 14 || u.x > WORLD.width - 14 || u.y > WORLD.height - 14) {
      u.gone = true;
      this.#events.emit('deserted', { unit: u });
    }
  }

  // ---- O comboio de Monte Santo ----

  // O carro de bois vai pela trilha até o ponto de descarga, espera e volta; se
  // chega de novo à beira do mapa, escapou.
  #convoy(u, order, dt) {
    u.foe = null;
    const point = order.path[order.step];
    if (!point) {
      if (!order.back) {
        order.wait += dt;
        this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
        if (order.wait >= CONVOY.unload) {
          order.back = true;
          order.path = [...order.path].reverse();
          order.step = 0;
        }
        return;
      }
      u.gone = true;
      for (const escort of this.#state.organisms) if (escort.order?.target === u) escort.gone = true;
      this.#events.emit('convoyEscaped', { road: order.road });
      return;
    }
    if (this.#steer(u, point.x, point.y, 4, dt) || Math.hypot(point.x - u.x, point.y - u.y) < 12) order.step++;
  }

  // Escolta: anda colada ao comboio e briga com quem chegar; sem comboio, vai para
  // cima do arraial.
  #escort(u, order, dt) {
    const convoy = order.target;
    if (!this.#alive(convoy)) {
      u.order = null;
      return;
    }
    const side = order.side ?? 1;
    const x = convoy.x - Math.sin(convoy.heading) * 12 * side, y = convoy.y + Math.cos(convoy.heading) * 12 * side;
    if (Math.hypot(x - u.x, y - u.y) > 6) this.#steer(u, x, y, 3, dt);
    else {
      u.heading = convoy.heading;
      this.#locomotion.move(u, dt, { direction: u.heading, desiredSpeed: 0 });
    }
  }

  spawnConvoy(road, scale) {
    const trail = marchPath(road);
    const stop = trail.slice(0, Math.max(2, Math.round(trail.length * CONVOY.reach)));
    const first = stop[0];
    const cart = this.#factory.create('enemy', 'convoy', first.x, first.y, Math.atan2(first.dy, first.dx), scale);
    cart.order = { type: 'convoy', path: stop.filter((p, i) => i % 2 === 0 || i === stop.length - 1), step: 1, wait: 0, back: false, road };
    this.#state.organisms.push(cart);
    for (let i = 0; i < CONVOY.escort; i++) {
      const escort = this.#factory.create('enemy', 'private', first.x - first.dx * 10, first.y - first.dy * 10,
        Math.atan2(first.dy, first.dx), scale);
      escort.order = { type: 'escort', target: cart, side: i % 2 ? 1 : -1 };
      this.#state.organisms.push(escort);
    }
    return cart;
  }

  // ---- Quem chega ----

  // Cerco: soldado que entra pela caatinga, fora das estradas, direto para a praça.
  spawnFromEdge(type, entry, scale) {
    const dx = CENTER.x - entry.x, dy = CENTER.y - entry.y;
    const length = Math.hypot(dx, dy);
    const unit = this.#factory.create('enemy', type, entry.x, entry.y, Math.atan2(dy, dx), scale);
    const to = (share, bend) => ({
      x: entry.x + dx * share - dy / length * bend, y: entry.y + dy * share + dx / length * bend
    });
    const stop = 1 - (PLAZA_RADIUS + 10) / length;
    unit.order = { type: 'raid', path: [to(stop * .5, (Math.random() - .5) * 60), to(stop, 0)], step: 0 };
    this.#state.organisms.push(unit);
    return unit;
  }

  // Romeiros (e os chefes) chegando pela estrada: andam até perto da igreja.
  spawnPilgrim(type, road) {
    const trail = roadPath(road);
    const first = trail[0];
    const side = (Math.random() - .5) * 10;
    const unit = this.#factory.create('player', type, first.x + first.dx * 8 - first.dy * side,
      first.y + first.dy * 8 + first.dx * side, Math.atan2(first.dy, first.dx));
    const angle = Math.random() * Math.PI * 2;
    const x = CENTER.x + Math.cos(angle) * (PLAZA_RADIUS - 10), y = CENTER.y + Math.sin(angle) * (PLAZA_RADIUS - 10);
    unit.order = { type: 'move', x, y };
    unit.post = { x, y };
    this.#state.organisms.push(unit);
    return unit;
  }

  // Soldado que entra pela boca da estrada e segue as curvas da trilha, com um
  // desvio lateral próprio para a coluna não andar em fila indiana.
  spawnRaider(type, road, scale) {
    const side = (Math.random() - .5) * (ROAD_WIDTH - 10);
    const trail = marchPath(road);
    const at = point => ({ x: point.x - point.dy * side, y: point.y + point.dx * side });
    const first = trail[0];
    const start = at({ ...first, x: first.x + first.dx * 6, y: first.y + first.dy * 6 });
    const unit = this.#factory.create('enemy', type, start.x, start.y, Math.atan2(first.dy, first.dx), scale);
    // Um ponto a cada três da trilha basta para a marcha acompanhar as curvas.
    const path = trail.filter((point, i) => i > 0 && (i % 3 === 0 || i === trail.length - 1)).map(at);
    unit.order = { type: 'raid', path, step: 0 };
    this.#state.organisms.push(unit);
    return unit;
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
    // Quem saiu do mapa (desertor, comboio que voltou) some sem deixar corpo.
    if (state.organisms.some(u => u.gone)) {
      state.organisms = state.organisms.filter(u => !u.gone);
      anyDead = true;
    }
    for (const u of state.organisms) {
      if (u.life > 0) continue;
      anyDead = true;
      if (u.carrying) this.#forest.dropLog(u.x, u.y, u.heading);
      state.corpses.push(new Corpse(u));
      // Soldado derrubado paga a recompensa, que sobe de onde ele caiu, e o fuzil dele
      // (se não o largou na debandada) fica no chão para alguém do arraial buscar.
      const bounty = u.stats.bounty;
      if (bounty && u.team === 'enemy') {
        this.#deposit('food', bounty.food);
        this.#deposit('wood', bounty.wood);
        state.floaters.push({ x: u.x, y: u.y, food: bounty.food, wood: bounty.wood, time: 0, life: 1.6 });
        this.#dropRifles(u.x, u.y, (u.disarmed ? 0 : 1) + (bounty.rifles ?? 0));
      }
      // Quem morre com fuzil apanhado na mão o deixa cair de novo ali.
      if (u.loot > 0) this.#dropRifles(u.x, u.y, u.loot);
      if (u.stats.commander && u.team === 'enemy') this.#rout(u);
      if (u.stats.convoy) this.#events.emit('convoyTaken', { x: u.x, y: u.y });
      this.#events.emit('death', { organism: u });
    }
    if (!anyDead) return;
    state.organisms = state.organisms.filter(u => u.life > 0);
    for (const u of state.organisms) {
      if (u.engage && u.engage.life <= 0) u.engage = null;
      if (u.foe && u.foe.life <= 0) u.foe = null;
    }
  }

  // Construção destruída: desaba em poeira, deixa umas toras e some. Caiu o Town
  // Hall, a vila perdeu.
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
    if (!state.winner && fallen.some(b => b.kind === 'hall')) {
      state.winner = 'enemy';
      this.#events.emit('gameOver', { winner: state.winner });
    }
  }
}
