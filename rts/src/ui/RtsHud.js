import { UNIT_TYPES, BUILDING_TYPES, BUILD_ORDER, ALERT_COOLDOWN } from '../config/rts.js';

const TOAST_SECONDS = 2.6;

// A interface do jogo por cima da cena: recursos e população no topo, o painel de
// comando embaixo (muda conforme o que está selecionado) e os avisos. O painel só é
// refeito quando o contexto muda; números e barras são atualizados no lugar, para
// um toque não cair num botão que acabou de ser trocado.
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

  constructor({ root, state, selection, commands, ledger, camera, events }) {
    this.#root = root;
    this.#state = state;
    this.#selection = selection;
    this.#commands = commands;
    this.#ledger = ledger;
    this.#camera = camera;
    const $ = selector => root.querySelector(selector);
    this.#els = {
      food: $('#res-food'), wood: $('#res-wood'), pop: $('#res-pop'), popBox: $('#res-pop-box'),
      title: $('#sel-title'), detail: $('#sel-detail'), life: $('#sel-life'), lifeFill: $('#sel-life-fill'),
      actions: $('#actions'), queue: $('#sel-queue'), toast: $('#toast'), panel: $('#command-panel')
    };
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
      this.toast('⚠ We are under attack! Tap to look', 'alert', { x, y });
      navigator.vibrate?.([40, 60, 40]);
    });
    events.on('built', ({ building }) => {
      if (building.team === 'player') this.toast(`${building.stats.label} complete`);
    });
    events.on('destroyed', ({ building }) => {
      if (building.team === 'player') this.toast(`Our ${building.stats.label} was destroyed!`, 'alert', building);
      else this.toast(`Enemy ${building.stats.label} destroyed`);
    });
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
    const team = this.#ledger.team('player');
    const pop = this.#ledger.population('player'), cap = this.#ledger.popCap('player');
    this.#els.food.textContent = Math.floor(team.food);
    this.#els.wood.textContent = Math.floor(team.wood);
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
      if (sub && sub.textContent !== spec.sub) sub.textContent = spec.sub;
    });
  }

  #buttons() {
    const s = this.#selection;
    const list = [];
    if (s.placing) {
      list.push({ action: 'cancel-place', icon: '✕', label: 'Cancel' });
      return list;
    }
    if (s.building && s.building.team === 'player') {
      const b = s.building;
      if (b.built) {
        for (const type of b.stats.trains) list.push(this.#trainButton(b, type));
        if (b.queue.length) list.push({ action: 'cancel-train', icon: '↶', label: 'Undo', sub: 'refund' });
      }
      list.push({ action: 'deselect', icon: '✕', label: 'Close' });
      return list;
    }
    if (s.enemy) {
      list.push({ action: 'deselect', icon: '✕', label: 'Close' });
      return list;
    }
    if (s.units.length) {
      const workers = s.units.some(u => u.type === 'worker');
      const soldiers = s.units.some(u => u.type !== 'worker');
      if (workers) for (const kind of BUILD_ORDER) list.push(this.#buildButton(kind));
      if (soldiers) list.push({ action: 'retreat', icon: '↩', label: 'Retreat', sub: 'to base' });
      list.push({ action: 'stop', icon: '✋', label: 'Stop' });
      list.push({ action: 'deselect', icon: '✕', label: 'Clear' });
      return list;
    }
    const idle = this.#idleWorkers().length, army = this.#army().length;
    list.push({ action: 'idle', icon: '⛏', label: 'Idle', sub: `${idle} worker${idle === 1 ? '' : 's'}`, disabled: !idle });
    list.push({ action: 'army', icon: '⚔', label: 'Army', sub: `${army} unit${army === 1 ? '' : 's'}`, disabled: !army });
    list.push({ action: 'all-workers', icon: '👷', label: 'Workers', sub: 'all' });
    list.push({ action: 'base', icon: '🛖', label: 'Base', sub: 'camera' });
    return list;
  }

  #trainButton(building, type) {
    const stats = UNIT_TYPES[type];
    const pop = this.#ledger.population('player'), cap = this.#ledger.popCap('player');
    const missing = this.#ledger.shortage('player', stats.cost);
    const full = building.queue.length >= 5;
    const reason = pop >= cap ? 'Population limit — build a House'
      : missing ? `Not enough ${missing}` : full ? 'Queue is full' : '';
    return {
      action: 'train', arg: type, icon: stats.icon, label: stats.label,
      sub: RtsHud.#costText(stats.cost), disabled: Boolean(reason), reason
    };
  }

  #buildButton(kind) {
    const stats = BUILDING_TYPES[kind];
    const missing = this.#ledger.shortage('player', stats.cost);
    return {
      action: 'place', arg: kind, icon: stats.icon, label: stats.label,
      sub: RtsHud.#costText(stats.cost), disabled: Boolean(missing),
      reason: missing ? `Not enough ${missing}` : ''
    };
  }

  static #costText(cost) {
    const parts = [];
    if (cost.food) parts.push(`${cost.food}🍖`);
    if (cost.wood) parts.push(`${cost.wood}🪵`);
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
      const icon = document.createElement('span');
      icon.className = 'action-icon';
      icon.textContent = spec.icon;
      const label = document.createElement('span');
      label.className = 'action-label';
      label.textContent = spec.label;
      button.append(icon, label);
      if (spec.sub) {
        const sub = document.createElement('span');
        sub.className = 'action-sub';
        sub.textContent = spec.sub;
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
      title = `Place ${BUILDING_TYPES[s.placing].label}`;
      detail = 'Tap an open spot on the map';
    } else if (s.building || s.enemy?.queue) {
      const b = s.building ?? s.enemy;
      const enemy = b.team !== 'player';
      title = `${enemy ? 'Enemy ' : ''}${b.stats.label}`;
      life = b.life / b.maxLife;
      if (!b.built) detail = `Under construction · ${Math.floor(b.progress * 100)}%`;
      else if (enemy) detail = 'Tap with troops selected to attack';
      else if (b.queue.length) {
        const first = b.queue[0];
        detail = `Training ${UNIT_TYPES[first.type].label} · ${Math.floor(first.time / UNIT_TYPES[first.type].time * 100)}%`;
        for (const item of b.queue) {
          const chip = document.createElement('span');
          chip.textContent = UNIT_TYPES[item.type].icon;
          els.queue.append(chip);
        }
      } else if (b.stats.trains.length) {
        detail = b.rally ? 'Tap the map to move the rally point' : 'Tap the map to set a rally point';
      } else {
        detail = `+${b.stats.pop} population`;
      }
    } else if (s.enemy) {
      const u = s.enemy;
      title = `Enemy ${u.stats.label}`;
      detail = 'Select troops, then tap it to attack';
      life = u.life / u.maxLife;
    } else if (s.units.length === 1) {
      const u = s.units[0];
      title = u.stats.label;
      detail = RtsHud.#activity(u);
      life = u.life / u.maxLife;
    } else if (s.units.length) {
      const counts = {};
      for (const u of s.units) counts[u.type] = (counts[u.type] ?? 0) + 1;
      title = `${s.units.length} units`;
      detail = Object.entries(counts)
        .map(([type, n]) => `${n} ${n === 1 ? UNIT_TYPES[type].label : UNIT_TYPES[type].plural}`).join(' · ');
      life = s.units.reduce((sum, u) => sum + u.life / u.maxLife, 0) / s.units.length;
    } else {
      title = 'Your tribe';
      detail = 'Tap a unit · hold & drag to select a group';
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
    if (u.engage) return 'Fighting';
    if (u.carrying) return 'Carrying wood';
    if (u.carryFood) return 'Carrying food';
    switch (order?.type) {
      case 'gather': return order.resource === 'wood' ? 'Chopping wood' : 'Picking berries';
      case 'build': return 'Building';
      case 'attack': return 'Attacking';
      case 'attackMove': return 'Advancing';
      case 'move': return 'Moving';
      default: return u.type === 'worker' ? 'Idle — tap a tree or bush' : 'Guarding';
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
      case 'place':
        s.startPlacing(arg);
        s.hover = null;
        this.toast('Tap the map to place it');
        break;
      case 'cancel-place':
        s.stopPlacing();
        break;
      case 'retreat': {
        const home = this.#ledger.nearestDropOff('player', s.units[0].x, s.units[0].y) ??
          this.#ledger.buildings('player')[0];
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
      case 'all-workers':
        s.setUnits(this.#ledger.units('player').filter(u => u.type === 'worker'));
        break;
      case 'base': {
        const home = this.#ledger.buildings('player').find(b => b.kind === 'lodge') ?? this.#ledger.buildings('player')[0];
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
    return this.#state.organisms.filter(u => u.team === 'player' && u.type !== 'worker');
  }
}
