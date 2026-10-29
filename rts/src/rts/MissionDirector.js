import { ROADS, DIFFICULTY, EDGE_ENTRIES, IGARA, CENTER, UNIT_TYPES, TEXT } from '../config/rts.js';
import { CURRENT } from '../config/campaign.js';
import { marchPath } from '../world/Roads.js';

// Segundos entre o último objetivo cumprido e a vitória: dá tempo de ver o que
// aconteceu (a tropa fugindo, a última casa caindo) antes da cena de fim.
const VICTORY_DELAY = 3;
// Quando o prazo de um objetivo chega a estes segundos, o aviso soa.
const DEADLINE_WARNINGS = [30, 10];
// Prazo apertado: o painel fica em vermelho abaixo disto.
const URGENT_SECONDS = 30;
// Alvos marcados um a um até este número; mais que isso, um anel em volta do grupo.
const MAX_TARGETS = 8;
const pick = list => list[Math.floor(Math.random() * list.length)];

// A missão aberta (config/campaign.js) correndo: põe os inimigos no mapa (as
// construções antes do cenário, os guardas na hora de começar), solta os ataques
// programados, os comboios e o roteiro (`script`: falas e acontecimentos na hora
// marcada), confere os objetivos, os prazos e as condições de derrota e declara o fim.
// É uma fase da simulação, como a das ondas.
//
// Eventos que solta: 'objectiveNew' e 'objectiveDone' ({ objective }), 'missionToast'
// ({ text, at }), 'missionFocus' ({ x, y }), 'missionSay' ({ lines }), 'raid'
// ({ text, at }), 'convoy' ({ road }), 'deadlineWarn' ({ left }), 'victory' e 'gameOver'
// ({ winner, reason }).
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
  // Quando cada objetivo se cumpriu (o roteiro e os ataques com `after` contam daí).
  #doneAt = new Map();
  #raids = [];
  #script = [];
  #convoyNext = Infinity;
  #convoysTaken = 0;
  // Inimigos com marca que saíram do mapa (mortos ou desertores), por marca.
  #removed = new Map();
  // Quem chegou ao fim de um caminho de saída (`exit`): a espia que voltou para contar.
  #escaped = new Map();
  // Marcas que já estiveram vivas (para "morreu" só valer depois de existir).
  #seen = new Set();
  // Os lados que já acordaram (o alarma só soa uma vez).
  #alarmed = new Set();
  #build;
  #train;
  #victoryAt = null;
  // O resumo do fim (`summary`): o que aconteceu na partida, contado enquanto corre.
  #stats = { kills: 0, lost: 0, built: 0, trained: 0, food: 0, wood: 0, rifles: 0 };
  #stock = null;

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
    events.on('death', ({ organism }) => {
      removed(organism);
      if (!this.#begun || this.#state.winner) return;
      if (organism.team === 'enemy') this.#stats.kills++;
      else if (organism.team === 'player') this.#stats.lost++;
    });
    events.on('built', ({ building }) => { if (this.#begun && building.team === 'player') this.#stats.built++; });
    events.on('trained', ({ unit }) => { if (this.#begun && unit?.team === 'player') this.#stats.trained++; });
    events.on('deserted', ({ unit }) => removed(unit));
    events.on('escaped', ({ unit }) => {
      if (unit.tag) this.#escaped.set(unit.tag, (this.#escaped.get(unit.tag) ?? 0) + 1);
    });
    events.on('alarm', ({ team }) => this.#alarm(team));
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
    for (const spot of this.#mission.enemy?.buildings ?? []) this.#placeBuilding('enemy', spot);
  }

  // Os guardas, na hora de começar (já com a dificuldade escolhida): cada um fica no
  // posto e só briga com quem chega perto (UnitSystem, `guard`). `asleep`: dorme até o
  // alarma (deitado, sem ver ninguém); `calm`: de pé, mas sem vigiar (o acampamento da
  // Favela "de costas", tranquilo); `sentry`: acordado, e quando vê o inimigo o
  // acampamento inteiro acorda.
  placeGuards() {
    for (const group of this.#mission.enemy?.guards ?? []) {
      const scale = { hpScale: this.#difficulty.hp * (group.hp ?? 1), power: 1 };
      for (let i = 0; i < group.count; i++) {
        const angle = Math.random() * Math.PI * 2, reach = Math.sqrt(Math.random()) * (group.spread ?? 30);
        const x = group.x + Math.cos(angle) * reach, y = group.y + Math.sin(angle) * reach;
        const unit = this.#factory.create('enemy', group.type, x, y, Math.atan2(CENTER.y - y, CENTER.x - x), scale);
        unit.guard = true;
        unit.post = { x, y };
        unit.tag = group.tag ?? null;
        unit.asleep = Boolean(group.asleep);
        unit.calm = Boolean(group.calm);
        unit.sentry = Boolean(group.sentry);
        this.#state.organisms.push(unit);
      }
    }
  }

  // Começa a partida: relógio, ataques sem condição, comboios, o roteiro e o primeiro
  // objetivo.
  begin() {
    this.#begun = true;
    this.#clock = 0;
    for (const def of this.#mission.raids ?? []) {
      if (!def.after) this.#raids.push({ def, next: def.at ?? 60, count: 0 });
    }
    this.#script = (this.#mission.script ?? []).map(entry => ({ entry, fired: false }));
    if (this.#mission.convoys) this.#convoyNext = this.#mission.convoys.first ?? 60;
    const first = this.#active()[0];
    if (first) this.#events.emit('objectiveNew', { objective: first });
  }

  update({ dt }) {
    if (!this.#begun || this.#state.winner) return;
    this.#clock += dt;
    this.#countIncome();
    if (this.#victoryAt !== null) {
      if (this.#clock >= this.#victoryAt) this.#win();
      return;
    }
    this.#tickScript();
    this.#tickRaids();
    this.#tickConvoys();
    this.#check();
    this.#checkLose();
  }

  // Para o painel: os objetivos à vista (no modo em etapas, os já feitos e o da vez),
  // com o andamento, o prazo que resta e a dica do que está valendo.
  objectives() {
    const active = new Set(this.#active());
    const shown = this.#mission.sequential ? this.#objectives.filter(o => o.done || active.has(o)) : this.#objectives;
    return shown.map(o => {
      let progress = o.done ? '' : this.#evaluate(o).progress;
      if (!o.done && o.deadline && active.has(o)) {
        const left = Math.max(0, o.deadline - (this.#clock - (this.#since.get(o.id) ?? this.#clock)));
        progress = progress ? `${progress} · ${MissionDirector.#clockText(left)}` : MissionDirector.#clockText(left);
      }
      const urgent = !o.done && Boolean(o.deadline) && active.has(o) && this.#left(o) <= URGENT_SECONDS;
      return { text: o.text, hint: o.hint ?? '', done: o.done, current: active.has(o), progress, urgent };
    });
  }

  // O que entrou no estoque desde o passo anterior (colheita, recompensa, fuzil
  // apanhado): só as subidas contam; o gasto não desconta.
  #countIncome() {
    const now = this.#ledger.team('player');
    if (this.#stock) {
      for (const resource of ['food', 'wood', 'rifles']) {
        const gain = (now[resource] ?? 0) - (this.#stock[resource] ?? 0);
        if (gain <= 0) continue;
        this.#stats[resource] += gain;
        for (const o of this.#objectives) if (!o.done && o.gain && o.resource === resource && o.got !== undefined) o.got += gain;
      }
    }
    this.#stock = { food: now.food ?? 0, wood: now.wood ?? 0, rifles: now.rifles ?? 0 };
  }

  // O resumo da partida, para a tela do fim: [{ label, value }]. Tempo, inimigos
  // derrubados e perdas sempre; o resto, quando houve.
  summary() {
    const s = this.#stats;
    const third = TEXT.thirdLabel ?? 'armas';
    const items = [
      { label: 'Tempo de missão', value: MissionDirector.#clockText(this.#clock) },
      { label: 'Inimigos derrubados', value: s.kills },
      { label: 'Perdas', value: s.lost },
      { label: 'Comida recolhida', value: Math.round(s.food) },
      { label: 'Madeira recolhida', value: Math.round(s.wood) },
      { label: third.charAt(0).toUpperCase() + third.slice(1), value: Math.round(s.rifles) },
      { label: 'Construções erguidas', value: s.built },
      { label: 'Gente preparada', value: s.trained }
    ];
    return items.filter((item, i) => i < 3 || item.value > 0);
  }

  // O objetivo da vez (o primeiro em aberto), para a tela de derrota dizer onde foi.
  currentObjective() {
    const o = this.#active()[0];
    return o ? { text: o.text, hint: o.hint ?? '' } : null;
  }

  // Onde está o que o objetivo pede, para o chão e o mapinha marcarem: `goal` é um
  // lugar aonde chegar (x, y, radius); `target` é quem derrubar (a unidade ou a
  // construção, com o tamanho dela). Grupo grande demais vira um anel em volta dele.
  markers() {
    if (!this.#begun || this.#state.winner) return [];
    const marks = [];
    for (const o of this.#active()) {
      if (o.type === 'reach') {
        marks.push({ kind: 'goal', x: o.x, y: o.y, radius: o.radius });
        continue;
      }
      let things = [];
      if (o.type === 'kill') things = this.#state.organisms.filter(u => u.team === 'enemy' && u.tag === o.tag && u.life > 0);
      else if (o.type === 'destroy') things = this.#state.buildings.filter(b => b.team === 'enemy' && b.tag === o.tag && b.life > 0);
      else if (o.type === 'convoys') things = this.#state.organisms.filter(u => u.stats.convoy && u.life > 0);
      if (!things.length) continue;
      if (things.length <= MAX_TARGETS) {
        for (const thing of things) marks.push({ kind: 'target', x: thing.x, y: thing.y, radius: thing.radius ?? 9 });
        continue;
      }
      const x = things.reduce((sum, t) => sum + t.x, 0) / things.length;
      const y = things.reduce((sum, t) => sum + t.y, 0) / things.length;
      const radius = Math.max(40, ...things.map(t => Math.hypot(t.x - x, t.y - y))) + 12;
      marks.push({ kind: 'area', x, y, radius });
    }
    return marks;
  }

  // Segundos que restam do prazo de um objetivo em jogo.
  #left(o) {
    return Math.max(0, o.deadline - (this.#clock - (this.#since.get(o.id) ?? this.#clock)));
  }

  // ---- Objetivos ----

  #active() {
    const open = this.#objectives.filter(o => !o.done);
    return this.#mission.sequential ? open.slice(0, 1) : open;
  }

  #check() {
    for (const o of this.#active()) {
      if (!this.#since.has(o.id)) this.#open(o);
      if (!this.#evaluate(o).done) {
        // Prazo vencido: o que a história pedia não se fez a tempo.
        if (o.deadline && this.#clock - this.#since.get(o.id) > o.deadline) {
          this.#defeat('late', o.late);
          return;
        }
        if (o.deadline) this.#warnDeadline(o);
        continue;
      }
      o.done = true;
      this.#doneAt.set(o.id, this.#clock);
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

  // O prazo apertando: aos 30 e aos 10 segundos, um aviso com o sino.
  #warnDeadline(o) {
    const left = this.#left(o);
    o.warned ??= new Set();
    for (const mark of DEADLINE_WARNINGS) {
      if (left > mark || o.warned.has(mark) || o.deadline <= mark) continue;
      o.warned.add(mark);
      this.#events.emit('deadlineWarn', { left: mark });
      this.#events.emit('missionToast', { text: `Faltam ${mark} segundos: ${o.text.charAt(0).toLowerCase()}${o.text.slice(1)}`, at: null });
    }
  }

  // O objetivo entrou em jogo agora: o relógio dele começa e, no `gather` com `gain`,
  // conta só o que entrar daqui em diante.
  #open(o) {
    this.#since.set(o.id, this.#clock);
    if (o.type === 'gather' && o.gain) o.got = 0;
  }

  // { done, progress } de um objetivo, agora.
  #evaluate(o) {
    const state = this.#state;
    switch (o.type) {
      case 'gather': {
        // Com `gain`, só o que entrou depois de o objetivo abrir (#countIncome).
        const have = o.gain ? Math.floor(o.got ?? 0) : Math.floor(this.#ledger.team('player')[o.resource] ?? 0);
        return { done: have >= o.amount, progress: `${Math.max(0, Math.min(have, o.amount))}/${o.amount}` };
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
        const need = Math.min(o.count ?? o.total, o.total);
        const down = o.total - left;
        return { done: o.total > 0 && down >= need, progress: `${Math.min(down, need)}/${need}` };
      }
      case 'kill': {
        const removed = this.#removed.get(o.tag) ?? 0;
        if (o.count) return { done: removed >= o.count, progress: `${Math.min(removed, o.count)}/${o.count}` };
        const alive = state.organisms.filter(u => u.team === 'enemy' && u.tag === o.tag && u.life > 0).length;
        // Visto vivo, ou já caído antes de o objetivo abrir: valeu.
        if (alive > 0 || (this.#removed.get(o.tag) ?? 0) > 0) o.seen = true;
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
    if (o.unit === 'any') return true;
    if (o.unit === 'army') return u.type !== 'worker' && !u.stats.passive;
    if (o.unit) return u.type === o.unit;
    return !u.stats.passive;
  }

  static #clockText(seconds) {
    const s = Math.ceil(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---- O roteiro ----

  // Cada entrada solta as suas ações uma vez, `at` segundos depois do começo (ou do
  // objetivo `after` cumprido).
  #tickScript() {
    for (const item of this.#script) {
      if (item.fired) continue;
      const { at = 0, after } = item.entry;
      const start = after ? this.#doneAt.get(after) : 0;
      if (start === undefined || this.#clock < start + at) continue;
      item.fired = true;
      this.#run([item.entry]);
    }
  }

  // ---- Ações (dos objetivos e do roteiro) ----

  #run(actions) {
    for (const action of actions) {
      if (action.spawnEnemy) {
        for (const group of action.spawnEnemy) {
          const spawned = this.#spawnGroup(Array(group.count).fill(group.type), group.from ?? { x: group.x, y: group.y },
            this.#scale(0), group.tag);
          for (const unit of spawned) {
            if (group.route) this.#setRoute(unit, group.route);
            if (group.guard) {
              unit.order = null;
              unit.guard = true;
              unit.post = { x: unit.x, y: unit.y };
            }
            if (group.asleep) unit.asleep = true;
          }
        }
      }
      if (action.spawnPlayer) {
        for (const group of action.spawnPlayer) {
          for (let i = 0; i < group.count; i++) {
            const x = group.x + (Math.random() - .5) * 30, y = group.y + (Math.random() - .5) * 30;
            const unit = this.#factory.create('player', group.type, x, y, Math.atan2(CENTER.y - y, CENTER.x - x));
            unit.post = { x, y };
            unit.tag = group.tag ?? null;
            if (group.route) this.#setRoute(unit, group.route);
            this.#state.organisms.push(unit);
          }
        }
      }
      for (const spot of action.spawnBuilding ?? []) this.#placeBuilding(spot.team ?? 'enemy', spot);
      if (action.route) {
        for (const u of this.#state.organisms) if (u.life > 0 && u.tag === action.route.tag) this.#setRoute(u, action.route);
      }
      if (action.flee) {
        for (const u of this.#state.organisms) {
          if (u.team !== 'enemy' || (typeof action.flee === 'string' && u.tag !== action.flee)) continue;
          u.guard = false;
          u.asleep = false;
          u.engage = null;
          u.order = null;
          u.flee = 999;
        }
      }
      if (action.wake) this.#alarm('enemy', true);
      // Fogo posto (a aldeia que os vencedores queimam, o mocambo que os próprios
      // palmarinos incendeiam): as construções com a marca caem.
      if (action.burn) {
        for (const b of this.#state.buildings) if (b.tag === action.burn && b.life > 0) b.life = 0;
      }
      // A caiçá que seca: perde a vida e a armadura que tinha.
      if (action.weaken) {
        const { tag, life = 1, armor = 1 } = action.weaken;
        for (const b of this.#state.buildings) {
          if (b.tag !== tag || b.life <= 0) continue;
          b.life = Math.min(b.life, b.maxLife * life);
          b.armor = armor;
        }
      }
      if (action.say) this.#events.emit('missionSay', { lines: action.say });
      const at = action.focus ? this.#where(action.focus) : null;
      if (action.toast) this.#events.emit('missionToast', { text: action.toast, at });
      if (at) this.#events.emit('missionFocus', at);
    }
  }

  // Uma construção da missão (do inimigo ou do jogador), pronta ou em obra; `armor`
  // multiplica o dano que ela sente.
  #placeBuilding(team, spot) {
    const building = this.#commands.spawnBuilding(team, spot.kind, spot.x, spot.y, spot.built ?? true);
    building.tag = spot.tag ?? null;
    if (spot.armor !== undefined) building.armor = spot.armor;
    return building;
  }

  // O caminho marcado: `path` (pontos), ou uma estrada — para dentro, até a fração
  // `depth` dela (e de volta, com `back`, parando `wait` segundos na volta), ou para
  // fora (`out`), da praça até a boca.
  #setRoute(unit, spec) {
    unit.guard = false;
    unit.asleep = false;
    unit.engage = null;
    unit.order = { type: 'route', path: this.#pathOf(spec), step: 0, exit: Boolean(spec.exit), evade: Boolean(spec.evade), hold: Boolean(spec.hold) };
  }

  #pathOf(spec) {
    if (spec.path) return spec.path.map(point => ({ x: point.x, y: point.y }));
    const road = ROADS.find(item => item.id === spec.road);
    if (!road) return [];
    const trail = marchPath(road).filter((point, i, all) => i % 3 === 0 || i === all.length - 1).map(point => ({ x: point.x, y: point.y }));
    if (spec.out) return trail.reverse();
    const inbound = trail.slice(0, Math.max(2, Math.round(trail.length * (spec.depth ?? 1))));
    if (spec.wait) inbound[inbound.length - 1].wait = spec.wait;
    return spec.back ? [...inbound, ...inbound.slice(0, -1).reverse()] : inbound;
  }

  // O alarma: quem dormia acorda e as sentinelas param de vigiar. `quiet`: sem o aviso
  // (o dia que clareia, no roteiro, traz o texto dele).
  #alarm(team, quiet = false) {
    if (this.#alarmed.has(team)) return;
    this.#alarmed.add(team);
    for (const u of this.#state.organisms) {
      if (u.team !== team) continue;
      u.asleep = false;
      u.calm = false;
      u.sentry = false;
    }
    if (!quiet && team === 'enemy' && this.#mission.alarm) this.#events.emit('missionToast', { text: this.#mission.alarm, at: null });
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
  // chefe e canhão vêm sempre na conta certa. `boats`: igaras vazias, de mantimento.
  #launch(def, k) {
    const grow = 1 + (def.grow ?? 0) * k;
    const types = [];
    for (const [type, count] of def.roster ?? []) {
      const fixed = type === 'officer' || type === 'matadeira' || UNIT_TYPES[type]?.cannon;
      const n = fixed ? count : Math.max(1, Math.round(count * this.#difficulty.count * grow));
      for (let i = 0; i < n; i++) types.push(type);
    }
    const from = def.from === 'roads' ? pick(ROADS.filter(road => !road.sea || IGARA)).id : def.from;
    if (types.length) this.#spawnGroup(types, from, this.#scale(k), def.tag);
    if (def.boats && IGARA) {
      const road = ROADS.find(item => item.id === from);
      for (let i = 0; road && i < def.boats; i++) this.#units.spawnBoat(road, [], this.#scale(k)).tag = def.tag ?? null;
    }
    if (def.text) this.#events.emit('raid', { text: def.text, at: from === 'edges' ? null : this.#where(from) });
  }

  // Põe um grupo inimigo no mapa: num ponto (vai atrás da construção mais perto),
  // pela mata ('edges'), por uma estrada ou, no litoral, de canoa pelo mar. Devolve
  // quem pisou o chão (quem vem de canoa só desce na praia).
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
      if (!road) return spawned;
      if (road.sea) {
        if (!IGARA) return spawned;
        // Quem desembarca leva a marca do ataque (`crewTag`, posta pelo UnitSystem).
        for (let i = 0; i < types.length; i += IGARA.crew) {
          this.#units.spawnBoat(road, types.slice(i, i + IGARA.crew).map(type => ({ type, scale })), scale).crewTag = tag;
        }
      } else {
        for (const type of types) spawned.push(this.#units.spawnRaider(type, road, scale));
      }
    }
    for (const unit of spawned) unit.tag = tag;
    return spawned;
  }

  #tickConvoys() {
    const convoys = this.#mission.convoys;
    if (!convoys || this.#clock < this.#convoyNext) return;
    this.#convoyNext = this.#clock + (convoys.every ?? 120);
    const road = ROADS.find(item => item.id === convoys.road) ?? ROADS[0];
    this.#units.spawnConvoy(road, this.#scale(0), convoys.escort);
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
    // `until`: a conta só vale até aquele objetivo se cumprir (os doze da Matadeira).
    if (lose.min && !(lose.min.until && this.#doneAt.has(lose.min.until))) {
      const count = mine.filter(u => (lose.min.tag ? u.tag === lose.min.tag : true)).length;
      if (count >= lose.min.count) this.#seen.add('min');
      else if (this.#seen.has('min')) return this.#defeat('min');
    }
    if (lose.escaped && (this.#escaped.get(lose.escaped.tag) ?? 0) >= (lose.escaped.count ?? 1)) return this.#defeat('escaped');
  }

  #defeat(reason, text = null) {
    if (this.#state.winner) return;
    this.#state.winner = 'enemy';
    this.#events.emit('gameOver', { winner: 'enemy', reason: text ?? this.#mission.defeat?.[reason] ?? '' });
  }

  #win() {
    if (this.#state.winner) return;
    this.#state.winner = 'player';
    this.#events.emit('victory', {});
  }
}
