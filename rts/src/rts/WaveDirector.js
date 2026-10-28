import {
  ROADS, DIFFICULTY, SPAWN_GAP, UNIT_TYPES, CONVOY, CERCO, MATADEIRA, HEROES, ROMEIROS, EDGE_ENTRIES, IGARA
} from '../config/rts.js';
import { CURRENT } from '../config/campaign.js';

// As ondas só existem na missão de defesa de cada era (CURRENT.waves): `offset`
// adianta a força e o letreiro (a 1ª onda da missão é a onda 1 + offset da guerra),
// `matadeira: false` deixa o canhão de sítio de fora.
const WAVES = CURRENT.waves ?? null;
const OFFSET = WAVES?.offset ?? 0;

// Os pontos da beirada por onde a tropa entra fora das estradas quando fecha o cerco
// (EDGE_ENTRIES) vêm da missão: no litoral, só as beiradas de terra.
//
// No litoral, quem vem pela praia vem de canoa: a fila daquela trilha vira igaras de
// IGARA.crew guerreiros cada, que remam do mar até a areia e desembarcam ali. Uma
// canoa ainda cheia conta como gente da onda; vazia e encalhada, não.
const crewCount = u => u.stats.boat ? (u.crew?.length ?? 0) : 1;

// As ondas da tropa republicana. Entre uma e outra há uma trégua com relógio; a
// próxima onda já é sorteada no começo da trégua, para o jogador ver por quais
// estradas ela vem e se preparar. Cada onda traz mais soldados, mais duros e por
// mais estradas — como as quatro expedições, cada uma maior que a anterior.
//
// Na trégua: chegam romeiros ao arraial (e, de vez em quando, um dos chefes); de três
// em três ondas passa o comboio de Monte Santo, que, tomado, encolhe a onda seguinte
// e, se escapar, a engorda. Nas ondas finais a tropa fecha o cerco pela caatinga, e
// com a 4ª expedição chega a Matadeira.
export class WaveDirector {
  #state;
  #units;
  #ledger;
  #events;
  #difficulty = DIFFICULTY.normal;

  constructor({ state, units, ledger, events }) {
    this.#state = state;
    this.#units = units;
    this.#ledger = ledger;
    this.#events = events;
    events.on('convoyEscaped', () => this.#supply(1));
    events.on('convoyTaken', () => this.#supply(-1));
  }

  setDifficulty(id) {
    this.#difficulty = DIFFICULTY[id] ?? DIFFICULTY.normal;
    if (!WAVES) {
      this.#state.wave = null;
      return;
    }
    this.#state.wave = {
      number: 0, cleared: 0, phase: 'calm', timer: this.#difficulty.firstWave, calmClock: 0,
      next: this.#plan(1), queue: [], clock: 0, convoyAt: null
    };
  }

  // Chama a próxima onda já: o tempo que sobrava da trégua vira comida.
  callNow() {
    const wave = this.#state.wave;
    if (!wave || wave.phase !== 'calm' || this.#state.winner) return 0;
    const bonus = Math.round(wave.timer * .5);
    if (bonus) this.#ledger.deposit('player', 'food', bonus);
    wave.timer = 0;
    return bonus;
  }

  // Soldados ainda de pé e os que ainda vão sair das estradas.
  remaining() {
    const wave = this.#state.wave;
    if (!wave) return 0;
    let alive = 0;
    for (const u of this.#state.organisms) if (u.team === 'enemy') alive += crewCount(u);
    return alive + wave.queue.reduce((sum, item) => sum + (item.boat ? item.crew.length : 1), 0);
  }

  update({ dt }) {
    const wave = this.#state.wave;
    if (!wave || this.#state.winner) return;
    if (wave.phase === 'calm') {
      wave.timer -= dt;
      wave.calmClock += dt;
      if (wave.convoyAt !== null && wave.calmClock >= wave.convoyAt) this.#sendConvoy(wave);
      if (wave.timer <= 0) this.#start(wave);
      return;
    }
    wave.clock += dt;
    while (wave.queue.length && wave.queue[0].at <= wave.clock) {
      const item = wave.queue.shift();
      if (item.boat) this.#units.spawnBoat(item.road, item.crew, item.scale);
      else if (item.entry) this.#units.spawnFromEdge(item.type, item.entry, item.scale);
      else this.#units.spawnRaider(item.type, item.road, item.scale);
    }
    if (!wave.queue.length && !this.#state.organisms.some(u => u.team === 'enemy' && crewCount(u) > 0)) this.#clear(wave);
  }

  #start(wave) {
    const plan = wave.next;
    wave.number = plan.number;
    wave.phase = 'active';
    wave.clock = 0;
    wave.current = plan;
    wave.convoyAt = null;
    // Saída de cada estrada (ou de cada ponto do cerco) em fila, com o intervalo
    // entre um e outro.
    const perSource = new Map();
    // Quem vem pelo mar embarca: de IGARA.crew em IGARA.crew, uma canoa por vez.
    const roster = [];
    const boats = new Map();
    for (const item of plan.roster) {
      if (!IGARA || !item.road?.sea || item.entry) {
        roster.push(item);
        continue;
      }
      let boat = boats.get(item.road);
      if (!boat || boat.crew.length >= IGARA.crew) {
        boat = { type: 'igara', road: item.road, scale: item.scale, boat: true, crew: [] };
        boats.set(item.road, boat);
        roster.push(boat);
      }
      boat.crew.push({ type: item.type, scale: item.scale });
    }
    wave.queue = roster.map(item => {
      const source = item.entry ?? item.road;
      const index = perSource.get(source) ?? 0;
      perSource.set(source, index + 1);
      // As canoas saem bem espaçadas: cada uma é uma fila inteira.
      return { ...item, at: index * SPAWN_GAP * (item.boat ? 3 : 1) + Math.random() * .6 };
    }).sort((a, b) => a.at - b.at);
    const count = type => plan.roster.filter(item => item.type === type).length;
    this.#events.emit('waveStart', {
      number: plan.number, stage: plan.stage, roads: plan.roads, count: plan.roster.length,
      guns: count('gunner'), officers: count('officer'), matadeira: count('matadeira') > 0,
      cerco: plan.roster.some(item => item.entry), canoes: roster.filter(item => item.boat).length
    });
  }

  #clear(wave) {
    wave.cleared = wave.number;
    wave.phase = 'calm';
    wave.timer = this.#difficulty.break;
    wave.calmClock = 0;
    wave.next = this.#plan(wave.number + 1);
    const bonus = { food: 30 + wave.number * 10, wood: 30 + wave.number * 10 };
    this.#ledger.deposit('player', 'food', bonus.food);
    this.#ledger.deposit('player', 'wood', bonus.wood);
    this.#events.emit('waveCleared', { number: wave.number, bonus });
    this.#units.launchBoats();
    this.#pilgrims(wave);
    const n = wave.number;
    if (n >= CONVOY.firstAfter && (n - CONVOY.firstAfter) % CONVOY.every === 0) wave.convoyAt = 8;
  }

  // Romeiros chegando por uma estrada que não é a da próxima onda; e, na hora dele,
  // um dos chefes junto.
  #pilgrims(wave) {
    const quiet = ROADS.filter(road => !wave.next.roads.includes(road));
    const road = (quiet.length ? quiet : ROADS)[Math.floor(Math.random() * (quiet.length || ROADS.length))];
    const room = this.#ledger.popCap('player') - this.#ledger.population('player');
    const count = Math.max(0, Math.min(room, ROMEIROS.max, ROMEIROS.base + Math.floor(wave.number / ROMEIROS.perWaves)));
    for (let i = 0; i < count; i++) this.#units.spawnPilgrim('worker', road);
    const flags = this.#state.flags;
    const hero = HEROES.find(item => item.after === wave.number && !flags[`hero-${item.type}`]);
    if (hero) {
      flags[`hero-${hero.type}`] = true;
      this.#units.spawnPilgrim(hero.type, road);
    }
    if (count || hero) this.#events.emit('romeiros', { count, road, hero: hero?.type ?? null });
  }

  #sendConvoy(wave) {
    wave.convoyAt = null;
    const road = ROADS[Math.floor(Math.random() * ROADS.length)];
    const n = wave.cleared;
    this.#units.spawnConvoy(road, { hpScale: (1 + n * .1) * this.#difficulty.hp, power: 1 + n * .03 });
    this.#events.emit('convoy', { road });
  }

  // O comboio decide o tamanho da próxima onda: tomado, ela vem menor; escapou, maior.
  #supply(sign) {
    const wave = this.#state.wave;
    const next = wave?.next;
    if (!next) return;
    const privates = next.roster.filter(item => item.type === 'private');
    const change = Math.max(1, Math.round(next.roster.length * CONVOY.bonus));
    if (sign > 0) {
      const sample = privates[0] ?? next.roster[0];
      for (let i = 0; i < change; i++) next.roster.unshift({ ...sample, type: 'private' });
    } else {
      for (let i = 0; i < change && privates.length; i++) next.roster.splice(next.roster.indexOf(privates.pop()), 1);
    }
  }

  // Quem vem na onda `n`: quantidade, tipos, estradas e o quanto estão mais duros.
  #plan(number) {
    // A força é a da onda da guerra (com o adiantamento da missão).
    const n = number + OFFSET;
    const difficulty = this.#difficulty;
    // Cresce um pouco mais que em linha reta: o exército do jogador também cresce, e
    // sem a curva as ondas finais viravam passeio (visto num teste de 14 ondas).
    const count = Math.max(2, Math.round((2 + n * 1.5 + n * n * .05) * difficulty.count));
    const roadCount = Math.min(ROADS.length, 1 + Math.floor((n - 1) / 2));
    const roads = [...ROADS].sort(() => Math.random() - .5).slice(0, roadCount);
    const scale = {
      hpScale: (1 + (n - 1) * .1) * difficulty.hp,
      power: 1 + (n - 1) * .03
    };
    // A tropa de linha atira de longe; a partir da 2ª onda vêm as cargas de baioneta,
    // da 3ª os oficiais (que, mortos, põem os soldados em debandada) e da 4ª as
    // guarnições de canhão Krupp.
    const bayonets = n >= 2 ? Math.min(.4, .2 + (n - 2) * .03) : 0;
    const roster = [];
    for (let i = 0; i < count; i++) {
      const type = Math.random() < bayonets ? 'bayonet' : 'private';
      roster.push({ type, road: roads[i % roads.length], scale });
    }
    if (n >= 4) {
      const guns = Math.min(roads.length, 1 + Math.floor((n - 4) / 3));
      for (let i = 0; i < guns; i++) roster.push({ type: 'gunner', road: roads[i % roads.length], scale });
    }
    if (n >= 3) {
      const officers = 1 + Math.floor((n - 3) / 5);
      for (let i = 0; i < officers; i++) roster.push({ type: 'officer', road: roads[i % roads.length], scale });
    }
    if (WAVES?.matadeira !== false && n >= MATADEIRA.from && (n - MATADEIRA.from) % MATADEIRA.every === 0) {
      roster.push({ type: 'matadeira', road: roads[0], scale });
    }
    // Os mais pesados saem por último, atrás da turma rápida; o oficial vai no meio da
    // coluna, comandando — e é por isso que, abatido, ele põe gente em debandada.
    roster.sort((a, b) => UNIT_TYPES[a.type].hp - UNIT_TYPES[b.type].hp);
    const officers = roster.filter(item => item.type === 'officer');
    for (const officer of officers) {
      roster.splice(roster.indexOf(officer), 1);
      roster.splice(Math.floor(roster.length * .4), 0, officer);
    }
    // O cerco: parte da tropa vem pela caatinga, entre as estradas.
    if (n >= CERCO.from && (n - CERCO.from) % CERCO.every === 0) {
      const extra = Math.round(count * CERCO.share);
      for (let i = 0; i < extra; i++) {
        roster.push({ type: i % 3 ? 'private' : 'bayonet', road: null, entry: EDGE_ENTRIES[i % EDGE_ENTRIES.length], scale });
      }
    }
    return { number, stage: n, roads, roster };
  }
}
