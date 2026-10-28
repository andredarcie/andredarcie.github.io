import { ROADS, DIFFICULTY, EDGE_ENTRIES, IGARA, CENTER, UNIT_TYPES } from '../config/rts.js';
import { CURRENT } from '../config/campaign.js';

// Segundos entre o último objetivo cumprido e a vitória: dá tempo de ver o que
// aconteceu (a tropa fugindo, a última casa caindo) antes da cena de fim.
const VICTORY_DELAY = 3;
const pick = list => list[Math.floor(Math.random() * list.length)];

// A missão aberta (config/campaign.js) correndo: põe os inimigos no mapa (as
// construções antes do cenário, os guardas na hora de começar), solta os ataques
// programados e os comboios, confere os objetivos e as condições de derrota e
// declara o fim. É uma fase da simulação, como a das ondas.
//
// Eventos que solta: 'objectiveNew' e 'objectiveDone' ({ objective }), 'missionToast'
// ({ text, at }), 'missionFocus' ({ x, y }), 'raid' ({ text, at }), 'convoy'
// ({ road }), 'victory' e 'gameOver' ({ winner, reason }).
export class MissionDirector {
  #state;
  #units;
  #ledger;
  #events;
  #factory;
  #commands;
  #mission = CURRENT;
  #difficulty = DIFFICULTY.normal;
  #objectives;
  #clock = 0;
  #begun = false;
  #since = new Map();
  #raids = [];
  #convoyNext = Infinity;
  #convoysTaken = 0;
  // Inimigos com marca que saíram do mapa (mortos ou desertores), por marca.
  #removed = new Map();
  // Marcas que já estiveram vivas (para "morreu" só valer depois de existir).
  #seen = new Set();
  #build;
  #train;
  #victoryAt = null;

  constructor({ state, units, ledger, events, factory, commands }) {
    this.#state = state;
    this.#units = units;
    this.#ledger = ledger;
    this.#events = events;
    this.#factory = factory;
    this.#commands = commands;
    this.#objectives = this.#mission.objectives.map((o, i) => ({ ...o, id: o.id ?? `o${i}`, done: false }));
    this.#build = this.#mission.build ? new Set(this.#mission.build) : null;
    this.#train = this.#mission.train ? new Set(this.#mission.train) : null;
    events.on('convoyTaken', () => { this.#convoysTaken++; });
    const removed = unit => {
      if (unit.team === 'enemy' && unit.tag) this.#removed.set(unit.tag, (this.#removed.get(unit.tag) ?? 0) + 1);
    };
    events.on('death', ({ organism }) => removed(organism));
    events.on('deserted', ({ unit }) => removed(unit));
    events.on('destroyed', ({ building }) => {
      if (building.team === 'player' && building.kind === 'hall' && this.#mission.lose?.hall) this.#defeat('hall');
    });
  }

  get mission() {
    return this.#mission;
  }

  get begun() {
    return this.#begun;
  }

  setDifficulty(id) {
    this.#difficulty = DIFFICULTY[id] ?? DIFFICULTY.normal;
  }

  allowsBuild(kind) {
    return !this.#build || this.#build.has(kind);
  }

  allowsTrain(type) {
    return !this.#train || this.#train.has(type);
  }

  // As construções inimigas, antes de plantar o cenário (a mata não nasce em cima).
  placeBuildings() {
    for (const spot of this.#mission.enemy?.buildings ?? []) {
      const building = this.#commands.spawnBuilding('enemy', spot.kind, spot.x, spot.y, true);
      building.tag = spot.tag ?? null;
    }
  }

  // Os guardas, na hora de começar (já com a dificuldade escolhida): cada um fica no
  // posto e só briga com quem chega perto (UnitSystem, `guard`).
  placeGuards() {
    const scale = { hpScale: this.#difficulty.hp, power: 1 };
    for (const group of this.#mission.enemy?.guards ?? []) {
      for (let i = 0; i < group.count; i++) {
        const angle = Math.random() * Math.PI * 2, reach = Math.sqrt(Math.random()) * (group.spread ?? 30);
        const x = group.x + Math.cos(angle) * reach, y = group.y + Math.sin(angle) * reach;
        const unit = this.#factory.create('enemy', group.type, x, y, Math.atan2(CENTER.y - y, CENTER.x - x), scale);
        unit.guard = true;
        unit.post = { x, y };
        unit.tag = group.tag ?? null;
        this.#state.organisms.push(unit);
      }
    }
  }

  // Começa a partida: relógio, ataques sem condição, comboios e o primeiro objetivo.
  begin() {
    this.#begun = true;
    this.#clock = 0;
    for (const def of this.#mission.raids ?? []) {
      if (!def.after) this.#raids.push({ def, next: def.at ?? 60, count: 0 });
    }
    if (this.#mission.convoys) this.#convoyNext = this.#mission.convoys.first ?? 60;
    const first = this.#active()[0];
    if (first) this.#events.emit('objectiveNew', { objective: first });
  }

  update({ dt }) {
    if (!this.#begun || this.#state.winner) return;
    this.#clock += dt;
    if (this.#victoryAt !== null) {
      if (this.#clock >= this.#victoryAt) this.#win();
      return;
    }
    this.#tickRaids();
    this.#tickConvoys();
    this.#check();
    this.#checkLose();
  }

  // Para o painel: os objetivos à vista (no modo em etapas, os já feitos e o da vez),
  // com o andamento e a dica do que está valendo.
  objectives() {
    const active = new Set(this.#active());
    const shown = this.#mission.sequential ? this.#objectives.filter(o => o.done || active.has(o)) : this.#objectives;
    return shown.map(o => ({
      text: o.text, hint: o.hint ?? '', done: o.done, current: active.has(o),
      progress: o.done ? '' : this.#evaluate(o).progress
    }));
  }

  // ---- Objetivos ----

  #active() {
    const open = this.#objectives.filter(o => !o.done);
    return this.#mission.sequential ? open.slice(0, 1) : open;
  }

  #check() {
    for (const o of this.#active()) {
      if (!this.#since.has(o.id)) this.#since.set(o.id, this.#clock);
      if (!this.#evaluate(o).done) continue;
      o.done = true;
      this.#run(o.then ?? []);
      for (const def of this.#mission.raids ?? []) {
        if (def.after === o.id) this.#raids.push({ def, next: this.#clock + (def.at ?? 0), count: 0 });
      }
      this.#events.emit('objectiveDone', { objective: o });
      const next = this.#mission.sequential ? this.#active()[0] : null;
      if (next) this.#events.emit('objectiveNew', { objective: next });
    }
    if (this.#objectives.every(o => o.done || o.optional)) this.#victoryAt = this.#clock + VICTORY_DELAY;
  }

  // { done, progress } de um objetivo, agora.
  #evaluate(o) {
    const state = this.#state;
    switch (o.type) {
      case 'gather': {
        const have = Math.floor(this.#ledger.team('player')[o.resource] ?? 0);
        return { done: have >= o.amount, progress: `${Math.min(have, o.amount)}/${o.amount}` };
      }
      case 'build': {
        const have = state.buildings.filter(b => b.team === 'player' && b.kind === o.kind && b.built).length;
        return { done: have >= o.count, progress: `${Math.min(have, o.count)}/${o.count}` };
      }
      case 'units': {
        const have = state.organisms.filter(u => u.team === 'player' && u.life > 0 && MissionDirector.#matches(u, o)).length;
        return { done: have >= o.count, progress: `${Math.min(have, o.count)}/${o.count}` };
      }
      case 'destroy': {
        const left = state.buildings.filter(b => b.team === 'enemy' && b.tag === o.tag && b.life > 0).length;
        if (o.total === undefined) o.total = left;
        return { done: o.total > 0 && left === 0, progress: `${o.total - left}/${o.total}` };
      }
      case 'kill': {
        const removed = this.#removed.get(o.tag) ?? 0;
        if (o.count) return { done: removed >= o.count, progress: `${Math.min(removed, o.count)}/${o.count}` };
        const alive = state.organisms.filter(u => u.team === 'enemy' && u.tag === o.tag && u.life > 0).length;
        if (alive > 0) o.seen = true;
        return { done: Boolean(o.seen) && alive === 0, progress: alive ? `faltam ${alive}` : '' };
      }
      case 'waves': {
        const cleared = state.wave?.cleared ?? 0;
        return { done: cleared >= o.count, progress: `${Math.min(cleared, o.count)}/${o.count}` };
      }
      case 'survive': {
        const left = Math.max(0, o.seconds - (this.#clock - (this.#since.get(o.id) ?? this.#clock)));
        return { done: left <= 0, progress: MissionDirector.#clockText(left) };
      }
      case 'reach': {
        const there = state.organisms.filter(u => u.team === 'player' && u.life > 0 && MissionDirector.#matches(u, o) &&
          Math.hypot(u.x - o.x, u.y - o.y) <= o.radius);
        const must = !o.must || there.some(u => u.type === o.must);
        return { done: there.length >= o.count && must, progress: `${Math.min(there.length, o.count)}/${o.count}` };
      }
      case 'convoys':
        return { done: this.#convoysTaken >= o.count, progress: `${Math.min(this.#convoysTaken, o.count)}/${o.count}` };
      default:
        return { done: false, progress: '' };
    }
  }

  // Quem conta para um objetivo: por marca, por tipo ou 'army' (quem luta).
  static #matches(u, o) {
    if (o.tag) return u.tag === o.tag;
    if (o.unit === 'army') return u.type !== 'worker' && !u.stats.passive;
    if (o.unit) return u.type === o.unit;
    return !u.stats.passive;
  }

  static #clockText(seconds) {
    const s = Math.ceil(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---- Ações dos objetivos ----

  #run(actions) {
    for (const action of actions) {
      if (action.spawnEnemy) {
        for (const group of action.spawnEnemy) {
          this.#spawnGroup(Array(group.count).fill(group.type), group.from ?? { x: group.x, y: group.y }, this.#scale(0), group.tag);
        }
      }
      if (action.spawnPlayer) {
        for (const group of action.spawnPlayer) {
          for (let i = 0; i < group.count; i++) {
            const x = group.x + (Math.random() - .5) * 30, y = group.y + (Math.random() - .5) * 30;
            const unit = this.#factory.create('player', group.type, x, y, Math.atan2(CENTER.y - y, CENTER.x - x));
            unit.post = { x, y };
            unit.tag = group.tag ?? null;
            this.#state.organisms.push(unit);
          }
        }
      }
      if (action.flee) {
        for (const u of this.#state.organisms) {
          if (u.team !== 'enemy') continue;
          u.guard = false;
          u.engage = null;
          u.order = null;
          u.flee = 999;
        }
      }
      const at = action.focus ? this.#where(action.focus) : null;
      if (action.toast) this.#events.emit('missionToast', { text: action.toast, at });
      if (at) this.#events.emit('missionFocus', at);
    }
  }

  // Um lugar: { x, y }, ou o id de uma estrada (um ponto no meio dela).
  #where(place) {
    if (place && typeof place === 'object') return { x: place.x, y: place.y };
    const road = ROADS.find(item => item.id === place);
    if (!road) return null;
    return { x: CENTER.x - road.dir.x * 300, y: CENTER.y - road.dir.y * 300 };
  }

  // ---- Ataques e comboios ----

  #scale(k) {
    return { hpScale: this.#difficulty.hp * (1 + k * .06), power: 1 + k * .03 };
  }

  #tickRaids() {
    for (const raid of this.#raids) {
      if (this.#clock < raid.next || raid.count >= (raid.def.times ?? Infinity)) continue;
      this.#launch(raid.def, raid.count);
      raid.count++;
      raid.next = raid.def.every ? this.#clock + raid.def.every : Infinity;
    }
  }

  // Um ataque: cada tipo na quantidade da dificuldade, crescendo a cada vez (`grow`);
  // chefe e canhão vêm sempre na conta certa.
  #launch(def, k) {
    const grow = 1 + (def.grow ?? 0) * k;
    const types = [];
    for (const [type, count] of def.roster) {
      const fixed = type === 'officer' || type === 'matadeira' || UNIT_TYPES[type]?.cannon;
      const n = fixed ? count : Math.max(1, Math.round(count * this.#difficulty.count * grow));
      for (let i = 0; i < n; i++) types.push(type);
    }
    const from = def.from === 'roads' ? pick(ROADS.filter(road => !road.sea || IGARA)).id : def.from;
    this.#spawnGroup(types, from, this.#scale(k), def.tag);
    if (def.text) this.#events.emit('raid', { text: def.text, at: from === 'edges' ? null : this.#where(from) });
  }

  // Põe um grupo inimigo no mapa: num ponto (vai atrás da construção mais perto),
  // pela mata ('edges'), por uma estrada ou, no litoral, de canoa pelo mar.
  #spawnGroup(types, from, scale, tag = null) {
    const spawned = [];
    if (from && typeof from === 'object') {
      for (const type of types) {
        const x = from.x + (Math.random() - .5) * 40, y = from.y + (Math.random() - .5) * 40;
        const unit = this.#factory.create('enemy', type, x, y, Math.atan2(CENTER.y - y, CENTER.x - x), scale);
        this.#state.organisms.push(unit);
        spawned.push(unit);
      }
    } else if (from === 'edges') {
      const entry = pick(EDGE_ENTRIES);
      for (const type of types) spawned.push(this.#units.spawnFromEdge(type, entry, scale));
    } else {
      const road = ROADS.find(item => item.id === from);
      if (!road) return;
      if (road.sea) {
        if (!IGARA) return;
        for (let i = 0; i < types.length; i += IGARA.crew) {
          this.#units.spawnBoat(road, types.slice(i, i + IGARA.crew).map(type => ({ type, scale })), scale);
        }
      } else {
        for (const type of types) spawned.push(this.#units.spawnRaider(type, road, scale));
      }
    }
    for (const unit of spawned) unit.tag = tag;
  }

  #tickConvoys() {
    const convoys = this.#mission.convoys;
    if (!convoys || this.#clock < this.#convoyNext) return;
    this.#convoyNext = this.#clock + (convoys.every ?? 120);
    const road = ROADS.find(item => item.id === convoys.road) ?? ROADS[0];
    this.#units.spawnConvoy(road, this.#scale(0));
    this.#events.emit('convoy', { road });
  }

  // ---- Fim ----

  #checkLose() {
    const lose = this.#mission.lose ?? {};
    const mine = this.#state.organisms.filter(u => u.team === 'player' && u.life > 0);
    if (lose.wiped && !mine.some(u => !u.stats.passive)) return this.#defeat('wiped');
    for (const tag of lose.units ?? []) {
      const alive = mine.some(u => u.tag === tag || u.type === tag);
      if (alive) this.#seen.add(`unit:${tag}`);
      else if (this.#seen.has(`unit:${tag}`)) return this.#defeat('units');
    }
    if (lose.min) {
      const count = mine.filter(u => (lose.min.tag ? u.tag === lose.min.tag : true)).length;
      if (count >= lose.min.count) this.#seen.add('min');
      else if (this.#seen.has('min')) return this.#defeat('min');
    }
  }

  #defeat(reason) {
    if (this.#state.winner) return;
    this.#state.winner = 'enemy';
    this.#events.emit('gameOver', { winner: 'enemy', reason: this.#mission.defeat?.[reason] ?? '' });
  }

  #win() {
    if (this.#state.winner) return;
    this.#state.winner = 'player';
    this.#events.emit('victory', {});
  }
}
