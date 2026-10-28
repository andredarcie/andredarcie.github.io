import {
  UNIT_TYPES, BUILDING_TYPES, BUILD_ORDER, ALERT_COOLDOWN, TOWER_UPGRADES, TOWER_UPGRADE_ORDER,
  TRADE, THIRST, CRAFT, TEXT, PREACHER_TYPE, HEROES
} from '../config/rts.js';
import { BASE_SIMULATION_SPEED } from '../config/world.js';
import { TowerSystem } from '../rts/TowerSystem.js';
import { icon } from './Icons.js';
import { TeamLedger } from '../rts/TeamLedger.js';
import { ResourceGains } from './ResourceGains.js';

const TOAST_SECONDS = 2.6;
// Quanto tempo (s reais) o letreiro grande da onda fica no meio da tela.
const BANNER_SECONDS = 2.8;
// Quanto tempo um despacho (trecho de Os Sertões) fica na tela, e quantos esperam.

// A interface do jogo por cima da cena: recursos e população no topo, a onda (o
// relógio até a próxima ou quantos soldados faltam) logo abaixo, o letreiro grande
// quando uma onda começa ou é rechaçada, o painel de comando embaixo (muda conforme o
// que está selecionado) e os avisos. Tudo em português e com os ícones próprios
// (ui/Icons.js), nunca emoji. O painel só é refeito quando o contexto muda;
// números e barras são atualizados no lugar, para um toque não cair num botão que
// acabou de ser trocado.
export class RtsHud {
  #root;
  #state;
  #selection;
  #commands;
  #ledger;
  #camera;
  #els;
  #signature = '';
  #toastTimer = 0;
  #toastTarget = null;
  #lastAlert = -Infinity;
  #idleCursor = 0;
  #waves;
  #bannerTimer = 0;
  #heroCursor = 0;
  #gains;
  // A missão aberta (MissionDirector): o que se pode construir e treinar nela.
  #mission;

  constructor({ root, state, selection, commands, ledger, camera, events, waves, mission }) {
    this.#root = root;
    this.#state = state;
    this.#selection = selection;
    this.#commands = commands;
    this.#ledger = ledger;
    this.#camera = camera;
    this.#waves = waves;
    this.#mission = mission;
    const $ = selector => root.querySelector(selector);
    this.#els = {
      food: $('#res-food'), wood: $('#res-wood'), rifles: $('#res-rifles'), pop: $('#res-pop'), popBox: $('#res-pop-box'),
      title: $('#sel-title'), detail: $('#sel-detail'), life: $('#sel-life'), lifeFill: $('#sel-life-fill'),
      actions: $('#actions'), queue: $('#sel-queue'), toast: $('#toast'), panel: $('#command-panel'),
      waveStatus: $('#wave-status'), waveLabel: $('#wave-label'), waveCall: $('#wave-call'),
      banner: $('#wave-banner'), bannerKicker: $('#wave-banner-kicker'),
      bannerTitle: $('#wave-banner-title'), bannerSub: $('#wave-banner-sub')
    };
    const chip = el => el.closest('.res');
    this.#gains = new ResourceGains({
      food: chip(this.#els.food), wood: chip(this.#els.wood), rifles: chip(this.#els.rifles)
    });
    this.#els.waveCall.addEventListener('click', () => {
      const bonus = this.#waves.callNow();
      if (bonus) this.toast(`Chamada antecipada: +${bonus} de comida`);
    });
    this.#els.actions.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button || button.getAttribute('aria-disabled') === 'true') {
        if (button?.dataset.reason) this.toast(button.dataset.reason, 'warn');
        return;
      }
      this.#act(button.dataset.action, button.dataset.arg);
    });
    this.#els.toast.addEventListener('click', () => {
      if (this.#toastTarget) this.focus(this.#toastTarget.x, this.#toastTarget.y);
    });
    events.on('underAttack', ({ team, x, y }) => {
      if (team !== 'player') return;
      const now = performance.now() / 1000;
      if (now - this.#lastAlert < ALERT_COOLDOWN) return;
      this.#lastAlert = now;
      this.toast(TEXT.underAttack, 'alert', { x, y });
      navigator.vibrate?.([40, 60, 40]);
    });
    events.on('built', ({ building }) => {
      if (building.team === 'player') this.toast(`${building.stats.label} ${building.stats.fem ? 'pronta' : 'pronto'}`);
    });
    events.on('destroyed', ({ building }) => {
      if (building.team === 'player') {
        this.toast(`${building.stats.label} ${building.stats.fem ? 'destruída' : 'destruído'}!`, 'alert', building);
      }
    });
    events.on('upgraded', ({ track }) => this.toast(`${TOWER_UPGRADES[track].label}: feito`));
    events.on('death', ({ organism }) => {
      if (organism.team === 'player' && (organism.type === PREACHER_TYPE || organism.stats.hero)) {
        this.toast(`${organism.stats.label} morreu`, 'alert', { x: organism.x, y: organism.y });
      }
    });
    events.on('debandada', ({ x, y, fled, rifles }) => {
      this.toast(TEXT.rout({ fled, rifles }), 'info', { x, y });
    });
    events.on('convoy', ({ road }) => {
      this.toast(`O comboio de Monte Santo vem pela estrada de ${road.label}. Tome-o!`, 'alert', road.mouth);
    });
    events.on('convoyTaken', () => this.toast('Comboio tomado! A tropa fica sem farinha e sem munição'));
    events.on('convoyEscaped', () => this.toast('O comboio escapou: a próxima onda vem reforçada', 'warn'));
    events.on('romeiros', ({ count, road, hero }) => {
      const text = TEXT.arrival({ count, road, hero });
      if (text) this.toast(text, 'info', road.mouth);
    });
    // O primeiro nome que um guerreiro toma (e cada terceiro) vem anunciado.
    events.on('newName', ({ unit }) => {
      if (TEXT.newName && unit.team === 'player') this.toast(TEXT.newName(unit.stats.label), 'info', { x: unit.x, y: unit.y });
    });
    // O primeiro fuzil apanhado ensina o caminho dele.
    events.on('riflePickup', ({ x, y, first }) => {
      if (first) this.toast(TEXT.firstPickup, 'info', { x, y });
    });
    events.on('thirst', () => {
      this.toast('A tropa está com sede: longe d\'água, os soldados enfraquecem');
    });
    // A missão: os avisos e os ataques (os objetivos ficam no painel deles,
    // ObjectivesPanel, que pisca quando muda).
    events.on('missionToast', ({ text, at }) => this.toast(text, 'alert', at));
    events.on('raid', ({ text, at }) => this.toast(text, 'alert', at));
    events.on('waveStart', wave => {
      // O letreiro da missão: a expedição em Canudos; na aldeia, por onde e com quem.
      // A força (e o letreiro) é a da onda da guerra (`stage`); a missão pode fixar o
      // letreiro de cima (a 3ª expedição inteira, em Canudos).
      const { kicker, sub } = TEXT.waveBanner({ ...wave, number: wave.stage ?? wave.number });
      const fixed = this.#mission?.mission.waves?.kicker;
      this.#showBanner(fixed ?? kicker, `${TEXT.waveWord} ${wave.number}`, sub, 'danger');
      navigator.vibrate?.([60, 40, 60]);
    });
    events.on('waveCleared', ({ number, bonus }) => {
      this.#showBanner(TEXT.waveCleared.kicker, TEXT.waveCleared.title(number), `Ficou para trás: ${RtsHud.#costText(bonus, '+')}`, 'calm', true);
    });
  }

  // `subHtml`: a linha de baixo já vem montada com ícones (marcação de Icons.js).
  #showBanner(kicker, title, sub, tone, subHtml = false) {
    const els = this.#els;
    els.bannerKicker.textContent = kicker;
    els.bannerTitle.textContent = title;
    if (subHtml) els.bannerSub.innerHTML = sub;
    else els.bannerSub.textContent = sub;
    els.banner.dataset.tone = tone;
    // Tira e põe de volta para a animação de entrada rodar de novo. Enquanto ele está
    // na tela, o contador da onda sai de cena (em tela baixa os dois se encostam).
    els.banner.hidden = true;
    void els.banner.offsetWidth;
    els.banner.hidden = false;
    els.waveStatus.style.visibility = 'hidden';
    this.#bannerTimer = BANNER_SECONDS;
  }

  // Relógio da trégua em m:ss do tempo real em 1×.
  static #clock(simSeconds) {
    const seconds = Math.max(0, Math.ceil(simSeconds / BASE_SIMULATION_SPEED));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  #refreshWave() {
    const wave = this.#state.wave;
    const els = this.#els;
    els.waveStatus.hidden = !wave;
    if (!wave) return;
    let text;
    if (wave.phase === 'calm') {
      const roads = wave.next.roads.map(road => road.short).join(' ');
      text = `${TEXT.waveWord} ${wave.next.number} em ${RtsHud.#clock(wave.timer)} · ${roads}`;
    } else {
      text = `${TEXT.waveWord} ${wave.number} · faltam ${this.#waves.remaining()}`;
    }
    if (els.waveLabel.textContent !== text) els.waveLabel.textContent = text;
    els.waveStatus.dataset.phase = wave.phase;
    els.waveCall.hidden = wave.phase !== 'calm';
  }

  toast(message, tone = 'info', target = null) {
    const toast = this.#els.toast;
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.hidden = false;
    this.#toastTarget = target;
    this.#toastTimer = TOAST_SECONDS;
  }

  // Põe o ponto no meio da área livre (entre a barra de cima e o painel).
  focus(x, y) {
    const panel = this.#els.panel.getBoundingClientRect();
    const top = this.#root.querySelector('#topbar').getBoundingClientRect().bottom;
    this.#camera.centerOn(x, y, innerWidth / 2, (top + panel.top) / 2);
  }

  update(realDt) {
    this.#selection.prune(this.#state);
    if (this.#toastTimer > 0) {
      this.#toastTimer -= realDt;
      if (this.#toastTimer <= 0) this.#els.toast.hidden = true;
    }
    if (this.#bannerTimer > 0) {
      this.#bannerTimer -= realDt;
      if (this.#bannerTimer <= 0) {
        this.#els.banner.hidden = true;
        this.#els.waveStatus.style.visibility = '';
      }
    }
    this.#refreshWave();
    const team = this.#ledger.team('player');
    const pop = this.#ledger.population('player'), cap = this.#ledger.popCap('player');
    const stock = { food: Math.floor(team.food), wood: Math.floor(team.wood), rifles: Math.floor(team.rifles ?? 0) };
    this.#els.food.textContent = stock.food;
    this.#els.wood.textContent = stock.wood;
    this.#els.rifles.textContent = stock.rifles;
    this.#gains.update(stock, realDt);
    this.#els.pop.textContent = `${pop}/${cap}`;
    this.#els.popBox.dataset.full = String(pop >= cap);
    const specs = this.#buttons();
    const signature = this.#contextSignature(specs);
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#rebuild(specs);
    } else {
      this.#patch(specs);
    }
    this.#refreshLive();
  }

  // ---- O que está na mão ----

  // Só a lista de botões decide se o painel é refeito; liberado/bloqueado e os
  // textos pequenos mudam no lugar (#patch).
  #contextSignature(specs) {
    const s = this.#selection;
    return [s.version, ...specs.map(spec => `${spec.action}:${spec.arg ?? ''}`)].join('|');
  }

  #patch(specs) {
    const buttons = this.#els.actions.children;
    specs.forEach((spec, i) => {
      const button = buttons[i];
      if (!button) return;
      const disabled = String(Boolean(spec.disabled));
      if (button.getAttribute('aria-disabled') !== disabled) button.setAttribute('aria-disabled', disabled);
      if ((button.dataset.reason ?? '') !== (spec.reason ?? '')) {
        if (spec.reason) button.dataset.reason = spec.reason;
        else delete button.dataset.reason;
      }
      const sub = button.querySelector('.action-sub');
      // Compara com o texto guardado: o innerHTML que o navegador devolve já vem
      // normalizado e nunca bateria com a marcação, refazendo o ícone a cada quadro.
      if (sub && button.dataset.sub !== spec.sub) {
        sub.innerHTML = spec.sub;
        button.dataset.sub = spec.sub;
      }
    });
  }

  #buttons() {
    const s = this.#selection;
    const list = [];
    if (s.placing) {
      list.push({ action: 'cancel-place', icon: 'close', label: 'Cancelar' });
      return list;
    }
    if (s.building && s.building.team === 'player') {
      const b = s.building;
      if (b.built) {
        for (const type of b.stats.trains) if (this.#mission.allowsTrain(type)) list.push(this.#trainButton(b, type));
        if (b.queue.length) list.push({ action: 'cancel-train', icon: 'undo', label: 'Desfazer', sub: 'devolve' });
        if (b.isTower) for (const track of TOWER_UPGRADE_ORDER) list.push(this.#upgradeButton(b, track));
        // No fogo do conselho se fazem flechas (CRAFT, na aldeia); na Casa do Conselho
        // dos Palmares, o trato com os moradores.
        if (CRAFT && b.kind === CRAFT.at) list.push(this.#craftButton());
        // Com Antônio Vilanova no arraial, o armazém e a igreja fazem negócio.
        if (b.stats.dropOff && this.#trader()) {
          list.push(this.#tradeButton('food'));
          list.push(this.#tradeButton('wood'));
        }
      }
      list.push({ action: 'deselect', icon: 'close', label: 'Fechar' });
      return list;
    }
    if (s.enemy) {
      list.push({ action: 'deselect', icon: 'close', label: 'Fechar' });
      return list;
    }
    if (s.units.length) {
      const workers = s.units.some(u => u.type === 'worker');
      const soldiers = s.units.some(u => u.type !== 'worker');
      if (workers) for (const kind of BUILD_ORDER) if (this.#mission.allowsBuild(kind)) list.push(this.#buildButton(kind));
      if (soldiers) list.push({ action: 'retreat', icon: 'retreat', label: 'Recuar', sub: TEXT.retreatSub });
      list.push({ action: 'stop', icon: 'stop', label: 'Parar' });
      list.push({ action: 'deselect', icon: 'close', label: 'Soltar' });
      return list;
    }
    const idle = this.#idleWorkers().length, army = this.#army().length;
    const worker = UNIT_TYPES.worker, preacherStats = UNIT_TYPES[PREACHER_TYPE], hall = BUILDING_TYPES.hall;
    list.push({ action: 'idle', icon: 'idle', label: 'À toa', sub: TEXT.idleSub(idle), disabled: !idle });
    list.push({ action: 'army', icon: 'fighters', label: TEXT.armyLabel, sub: `${army} na luta`, disabled: !army });
    list.push({ action: 'all-workers', icon: worker.icon, label: TEXT.workersLabel, sub: 'todos' });
    const preacher = this.#preacher();
    list.push({ action: 'preacher', icon: preacherStats.icon, label: TEXT.preacherLabel, sub: TEXT.preacherSub(Boolean(preacher)), disabled: !preacher });
    const heroes = this.#heroes();
    if (heroes.length) list.push({ action: 'heroes', icon: UNIT_TYPES[HEROES[0].type].icon, label: TEXT.heroesLabel, sub: TEXT.heroesSub(heroes.length) });
    list.push({ action: 'base', icon: hall.icon, label: TEXT.baseLabel, sub: 'câmera' });
    return list;
  }

  #craftButton() {
    const missing = this.#ledger.shortage('player', CRAFT.give);
    return {
      action: 'craft', icon: CRAFT.icon, label: CRAFT.label,
      sub: `${RtsHud.#costText(CRAFT.give)} → ${RtsHud.#costText(CRAFT.get)}`,
      disabled: Boolean(missing), reason: TeamLedger.lack(missing)
    };
  }

  #tradeButton(from) {
    const to = from === 'food' ? 'wood' : 'food';
    const missing = this.#ledger.shortage('player', { [from]: TRADE.give });
    return {
      action: 'trade', arg: from, icon: 'trade', label: from === 'food' ? 'Comida → madeira' : 'Madeira → comida',
      sub: `${RtsHud.#costText({ [from]: TRADE.give })} → ${RtsHud.#costText({ [to]: TRADE.get })}`,
      disabled: Boolean(missing), reason: TeamLedger.lack(missing)
    };
  }

  #upgradeButton(tower, track) {
    const upgrade = TOWER_UPGRADES[track];
    const next = this.#commands.nextUpgrade(tower, track);
    if (!next) {
      return { action: 'upgrade', arg: track, icon: upgrade.icon, label: upgrade.short, sub: 'máximo', disabled: true, reason: 'Já está no nível máximo' };
    }
    const missing = this.#ledger.shortage('player', next.cost);
    const label = upgrade.costs.length > 1 ? `${upgrade.short} ${next.level + 1}` : upgrade.short;
    return {
      action: 'upgrade', arg: track, icon: upgrade.icon, label,
      sub: RtsHud.#costText(next.cost), disabled: Boolean(missing), reason: RtsHud.#lack(missing)
    };
  }

  #trainButton(building, type) {
    const stats = UNIT_TYPES[type];
    const pop = this.#ledger.population('player'), cap = this.#ledger.popCap('player');
    const missing = this.#ledger.shortage('player', stats.cost);
    const full = building.queue.length >= 5;
    const reason = pop >= cap ? TEXT.noHousing
      : missing ? RtsHud.#lack(missing) : full ? 'A fila está cheia' : '';
    return {
      action: 'train', arg: type, icon: stats.icon, label: stats.label,
      sub: RtsHud.#costText(stats.cost), disabled: Boolean(reason), reason
    };
  }

  #buildButton(kind) {
    const stats = BUILDING_TYPES[kind];
    const missing = this.#ledger.shortage('player', stats.cost);
    const taken = this.#commands.alreadyBuilt(kind);
    return {
      action: 'place', arg: kind, icon: stats.icon, label: stats.label,
      sub: taken ? 'já existe' : RtsHud.#costText(stats.cost), disabled: Boolean(missing) || taken,
      reason: taken ? `${stats.label}: só pode haver uma` : TeamLedger.lack(missing)
    };
  }

  static #lack(missing) {
    return TeamLedger.lack(missing);
  }

  // Custo com os ícones de comida e madeira (marcação, vai em innerHTML).
  static #costText(cost, sign = '') {
    const parts = [];
    if (cost.food) parts.push(`<span class="cost">${sign}${cost.food}${icon('food', 'comida')}</span>`);
    if (cost.wood) parts.push(`<span class="cost">${sign}${cost.wood}${icon('wood', 'madeira')}</span>`);
    if (cost.rifles) parts.push(`<span class="cost">${sign}${cost.rifles}${icon('rifles', TEXT.thirdLabel)}</span>`);
    return parts.join(' ');
  }

  #rebuild(specs) {
    const actions = this.#els.actions;
    actions.replaceChildren(...specs.map(spec => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'action';
      button.dataset.action = spec.action;
      if (spec.arg) button.dataset.arg = spec.arg;
      if (spec.reason) button.dataset.reason = spec.reason;
      button.setAttribute('aria-disabled', String(Boolean(spec.disabled)));
      const glyph = document.createElement('span');
      glyph.className = 'action-icon';
      glyph.innerHTML = icon(spec.icon);
      const label = document.createElement('span');
      label.className = 'action-label';
      label.textContent = spec.label;
      button.append(glyph, label);
      if (spec.sub) {
        const sub = document.createElement('span');
        sub.className = 'action-sub';
        sub.innerHTML = spec.sub;
        button.dataset.sub = spec.sub;
        button.append(sub);
      }
      return button;
    }));
  }

  // Título, vida e fila: mudam a cada quadro sem refazer os botões.
  #refreshLive() {
    const s = this.#selection;
    const els = this.#els;
    let title = '', detail = '', life = null;
    els.queue.replaceChildren();
    if (s.placing) {
      title = BUILDING_TYPES[s.placing].label;
    } else if (s.building) {
      const b = s.building;
      title = b.stats.label;
      life = b.life / b.maxLife;
      if (!b.built) detail = `Em obra · ${Math.floor(b.progress * 100)}%`;
      else if (b.stats.herd) detail = TEXT.herdDetail(b.stats.herd);
      else if (b.shoots) {
        const stats = TowerSystem.stats(b);
        detail = `Dano ${stats.damage} · alcance ${stats.range}${b.levels?.scatter > 0 ? ` · ${TEXT.scatterTag}` : ''}` +
          (b.life < b.maxLife - .5 ? ` · ${TEXT.repairHint}` : '');
      } else if (b.queue.length) {
        const first = b.queue[0];
        detail = `Preparando ${UNIT_TYPES[first.type].label} · ${Math.floor(first.time / UNIT_TYPES[first.type].time * 100)}%`;
        for (const item of b.queue) {
          const chip = document.createElement('span');
          chip.innerHTML = icon(UNIT_TYPES[item.type].icon, UNIT_TYPES[item.type].label);
          els.queue.append(chip);
        }
      } else if (b.stats.trains.length) {
        detail = b.rally ? 'Toque no mapa para mudar o ponto de encontro' : 'Toque no mapa para marcar o ponto de encontro';
      } else {
        detail = `+${b.stats.pop} de população`;
      }
    } else if (s.enemy) {
      const u = s.enemy;
      title = u.stats.label;
      const states = [];
      if (u.flee > 0) states.push('em debandada');
      if (u.disarmed) states.push(TEXT.disarmed);
      if (u.stats.boat && u.crew?.length) states.push(`${u.crew.length} guerreiros a bordo`);
      if (u.thirst > THIRST.grace) states.push('com sede');
      if (u.stats.convoy) states.push('tome o comboio antes que ele volte');
      detail = states.length ? states.join(' · ') : TEXT.enemyHint;
      life = u.life / u.maxLife;
    } else if (s.units.length === 1) {
      const u = s.units[0];
      title = u.stats.label;
      // Os nomes que ele já tomou (missão dos tupinambás).
      const names = u.names > 0 ? `${u.names} ${u.names === 1 ? 'nome' : 'nomes'} · ` : '';
      detail = (u.hidden ? `${TEXT.hidden} · ` : '') + names + (u.stats.role && !u.order && !u.engage ? u.stats.role : RtsHud.#activity(u));
      life = u.life / u.maxLife;
    } else if (s.units.length) {
      const counts = {};
      for (const u of s.units) counts[u.type] = (counts[u.type] ?? 0) + 1;
      title = `${s.units.length} pessoas`;
      detail = Object.entries(counts)
        .map(([type, n]) => `${n} ${n === 1 ? UNIT_TYPES[type].label : UNIT_TYPES[type].plural}`).join(' · ');
      life = s.units.reduce((sum, u) => sum + u.life / u.maxLife, 0) / s.units.length;
    } else {
      title = TEXT.homeTitle;
      detail = 'Toque numa pessoa · segure e arraste para juntar um grupo';
    }
    els.title.textContent = title;
    els.detail.textContent = detail;
    els.life.hidden = life === null;
    if (life !== null) {
      els.lifeFill.style.transform = `scaleX(${Math.max(0, Math.min(1, life))})`;
      els.lifeFill.dataset.low = String(life < .35);
    }
  }

  static #activity(u) {
    const order = u.order;
    if (u.engage) return 'Lutando';
    if (u.carrying) return TEXT.carryWood;
    if (u.carryFood) return 'Levando comida';
    switch (order?.type) {
      case 'gather': return order.resource === 'wood' ? TEXT.chopping : TEXT.farming;
      case 'build': return 'Construindo';
      case 'attack': return 'Atacando';
      case 'attackMove': return 'Avançando';
      case 'move': return 'Andando';
      default: return u.stats.blessing ? (u.praying > 0 ? TEXT.praying : TEXT.preacherIdle)
        : u.stats.passive ? 'De prontidão'
        : u.type === 'worker' ? TEXT.workerIdle : 'De guarda';
    }
  }

  // ---- Botões ----

  #act(action, arg) {
    const s = this.#selection;
    switch (action) {
      case 'train': {
        const result = this.#commands.train(s.building, arg);
        if (!result.ok) this.toast(result.reason, 'warn');
        break;
      }
      case 'cancel-train':
        this.#commands.cancelTrain(s.building);
        break;
      case 'upgrade': {
        const result = this.#commands.upgradeTower(s.building, arg);
        if (!result.ok) this.toast(result.reason, 'warn');
        break;
      }
      case 'place':
        s.startPlacing(arg);
        s.hover = null;
        break;
      case 'cancel-place':
        s.stopPlacing();
        break;
      case 'retreat': {
        const home = this.#ledger.hall() ?? this.#ledger.buildings('player')[0];
        const soldiers = s.units.filter(u => u.type !== 'worker');
        if (home) this.#commands.move(soldiers, home.doorX, home.doorY);
        break;
      }
      case 'stop':
        this.#commands.stop(s.units);
        break;
      case 'deselect':
        s.clear();
        break;
      case 'idle': {
        const idle = this.#idleWorkers();
        if (!idle.length) break;
        const worker = idle[this.#idleCursor++ % idle.length];
        s.setUnits([worker]);
        this.focus(worker.x, worker.y);
        break;
      }
      case 'army': {
        const army = this.#army();
        if (!army.length) break;
        s.setUnits(army);
        const x = army.reduce((sum, u) => sum + u.x, 0) / army.length;
        const y = army.reduce((sum, u) => sum + u.y, 0) / army.length;
        this.focus(x, y);
        break;
      }
      case 'preacher': {
        const preacher = this.#preacher();
        if (!preacher) break;
        s.setUnits([preacher]);
        this.focus(preacher.x, preacher.y);
        break;
      }
      case 'craft': {
        const result = this.#commands.craft(s.building);
        if (!result.ok) this.toast(result.reason, 'warn');
        else if (TEXT.crafted) this.toast(TEXT.crafted(CRAFT.get.rifles));
        break;
      }
      case 'trade': {
        const result = this.#commands.trade('player', arg);
        if (!result.ok) this.toast(result.reason, 'warn');
        break;
      }
      case 'heroes': {
        const heroes = this.#heroes();
        if (!heroes.length) break;
        const hero = heroes[this.#heroCursor++ % heroes.length];
        s.setUnits([hero]);
        this.focus(hero.x, hero.y);
        break;
      }
      case 'all-workers':
        s.setUnits(this.#ledger.units('player').filter(u => u.type === 'worker'));
        break;
      case 'base': {
        const home = this.#ledger.hall() ?? this.#ledger.buildings('player')[0];
        if (home) this.focus(home.x, home.y);
        break;
      }
    }
    this.#signature = '';
  }

  #idleWorkers() {
    return this.#state.organisms.filter(u => u.team === 'player' && u.type === 'worker' && !u.order && !u.engage);
  }

  #army() {
    return this.#state.organisms.filter(u => u.team === 'player' && u.type !== 'worker' && !u.stats.passive && !u.stats.hero);
  }

  #heroes() {
    return this.#state.organisms.filter(u => u.team === 'player' && u.stats.hero);
  }

  #trader() {
    return this.#state.organisms.some(u => u.team === 'player' && u.stats.trader);
  }

  #preacher() {
    return this.#state.organisms.find(u => u.team === 'player' && u.type === PREACHER_TYPE) ?? null;
  }
}
