import { WORLD } from '../config/world.js';
import { BUILDING_TYPES } from '../config/rts.js';

// Raio de toque, em pixels de tela: dedo é grosso, e no celular a unidade tem
// poucos pixels. Vira unidades do mundo pelo zoom do momento.
const TOUCH_RADIUS = 22;
// Dois toques na mesma unidade dentro deste tempo (ms) selecionam o tipo inteiro.
const DOUBLE_TAP = 320;

// O toque no mundo vira ordem. Com nada selecionado, toque seleciona. Com tropas na
// mão: tocar no chão anda (soldado ataca o que achar no caminho), na árvore ou na
// moita colhe, no inimigo ataca, na obra própria constrói (ou conserta, se ela está
// machucada). Com uma construção na
// mão, tocar no chão marca o ponto de encontro. Segurar o dedo e arrastar faz o
// laço que seleciona um grupo.
export class PlayerInput {
  #canvas;
  #view;
  #state;
  #selection;
  #commands;
  #hud;
  #grid;
  #cameraController;
  #lastTap = { unit: null, time: 0 };
  #boxElement;
  #boxStart = null;
  #boxEnd = null;

  constructor({ canvas, view, state, selection, commands, hud, grid, boxElement }) {
    this.#canvas = canvas;
    this.#view = view;
    this.#state = state;
    this.#selection = selection;
    this.#commands = commands;
    this.#hud = hud;
    this.#grid = grid;
    this.#boxElement = boxElement;
    canvas.addEventListener('click', event => {
      if (this.#cameraController?.consumeClickSuppression()) return;
      this.#tap(event.clientX, event.clientY);
    });
    // Mouse sem botão apertado: a obra fantasma acompanha o cursor, e em casa
    // vermelha o cursor avisa que ali não se clica.
    canvas.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || event.buttons) return;
      if (!this.#selection.placing) {
        canvas.style.cursor = '';
        return;
      }
      const hover = this.#view.pickGround(event.clientX, event.clientY);
      this.#selection.hover = hover;
      const open = hover && this.#grid.isOpen(this.#grid.snap(hover.x, hover.y));
      canvas.style.cursor = open ? 'copy' : 'not-allowed';
    });
    // Esc larga a obra e o jogo volta a correr.
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.#selection.placing) this.#selection.stopPlacing();
    });
  }

  // O controlador da câmera nasce depois (precisa do laço daqui).
  attach(cameraController) {
    this.#cameraController = cameraController;
  }

  get box() {
    return {
      start: (x, y) => this.#boxBegin(x, y),
      move: (x, y) => this.#boxMove(x, y),
      end: cancelled => this.#boxFinish(cancelled)
    };
  }

  #tap(clientX, clientY) {
    if (this.#state.winner) return;
    const point = this.#view.pickGround(clientX, clientY);
    if (!point) return;
    const selection = this.#selection;
    if (selection.placing) {
      this.#place(point);
      return;
    }
    const reach = TOUCH_RADIUS / Math.max(.05, this.#view.camera.pixelsPerUnit());
    const unit = this.#unitAt(clientX, clientY, point, reach);
    const building = unit ? null : this.#buildingAt(point, reach);
    const own = selection.units;

    if (unit && unit.team === 'player') {
      this.#selectUnit(unit);
      return;
    }
    const enemy = unit ?? (building && building.team !== 'player' ? building : null);
    if (enemy) {
      if (own.length) {
        this.#commands.attack(own, enemy);
        this.#ping(enemy.x, enemy.y, 'attack');
      } else {
        selection.setEnemy(enemy);
      }
      return;
    }
    if (building) {
      const workers = own.filter(u => u.type === 'worker');
      const damaged = building.built && building.life < building.maxLife - .5;
      if ((!building.built || damaged) && workers.length) {
        this.#commands.build(workers, building);
        this.#ping(building.x, building.y, 'build');
        if (damaged) this.#hud.toast(`Consertando: ${building.stats.label}`);
        return;
      }
      selection.setBuilding(building);
      return;
    }
    if (point.x < 0 || point.y < 0 || point.x > WORLD.width || point.y > WORLD.height) {
      selection.clear();
      return;
    }
    const resource = this.#resourceAt(point, reach);
    if (own.length) {
      if (resource) {
        this.#commands.gather(own, resource);
        this.#ping(resource.x, resource.y, 'gather');
      } else {
        const soldiers = own.filter(u => u.type !== 'worker');
        const workers = own.filter(u => u.type === 'worker');
        // Soldado anda atacando o que encontrar; para fugir há o "Retreat".
        if (soldiers.length) this.#commands.move(soldiers, point.x, point.y, true);
        if (workers.length) this.#commands.move(workers, point.x, point.y);
        this.#ping(point.x, point.y, 'move');
      }
      return;
    }
    if (selection.building && selection.building.team === 'player') {
      this.#commands.setRally(selection.building, {
        x: resource?.x ?? point.x, y: resource?.y ?? point.y, resource
      });
      this.#ping(resource?.x ?? point.x, resource?.y ?? point.y, 'rally');
      this.#hud.toast(resource ? 'Ponto de encontro marcado: quem sair já vai trabalhar ali' : 'Ponto de encontro marcado');
      return;
    }
    selection.clear();
  }

  #selectUnit(unit) {
    const now = performance.now();
    const twice = this.#lastTap.unit === unit && now - this.#lastTap.time < DOUBLE_TAP;
    this.#lastTap = { unit, time: now };
    if (!twice) {
      this.#selection.setUnits([unit]);
      return;
    }
    // Dois toques: todos os do mesmo tipo que estão na tela.
    const bounds = this.#canvas.getBoundingClientRect();
    const same = this.#state.organisms.filter(u => {
      if (u.team !== 'player' || u.type !== unit.type) return false;
      const p = this.#view.camera.project(u.x, u.y, 6);
      return p.x >= 0 && p.y >= 0 && p.x <= bounds.width && p.y <= bounds.height;
    });
    this.#selection.setUnits(same);
  }

  // No modo de obra só casa verde aceita o toque; na vermelha nada acontece, nem
  // aviso: o erro não chega a existir. A obra assenta no centro da casa.
  #place(point) {
    const selection = this.#selection;
    const kind = selection.placing;
    const cell = this.#grid.snap(point.x, point.y);
    if (!this.#grid.isOpen(cell)) return;
    const result = this.#commands.place('player', kind, cell.x, cell.y);
    if (!result.ok) {
      this.#hud.toast(result.reason, 'warn');
      return;
    }
    const workers = selection.units.filter(u => u.type === 'worker');
    if (workers.length) this.#commands.build(workers, result.building);
    selection.stopPlacing();
    this.#canvas.style.cursor = '';
    this.#ping(cell.x, cell.y, 'build');
    this.#hud.toast(`${BUILDING_TYPES[kind].label}: obra marcada`);
  }

  // A unidade mais perto do toque. Mede na tela, na altura do peito, porque é o
  // corpo que o dedo mira, e não o pé.
  #unitAt(clientX, clientY, point, reach) {
    const bounds = this.#canvas.getBoundingClientRect();
    const x = clientX - bounds.left, y = clientY - bounds.top;
    let best = null, bestDistance = TOUCH_RADIUS;
    for (const u of this.#state.organisms) {
      if (Math.abs(u.x - point.x) > reach * 3 || Math.abs(u.y - point.y) > reach * 3) continue;
      const chest = this.#view.camera.project(u.x, u.y, 7 * u.size / 10);
      const distance = Math.hypot(chest.x - x, chest.y - y);
      // Do próprio time ganha uma folguinha: selecionar é o toque mais comum.
      const score = distance - (u.team === 'player' ? 3 : 0);
      if (score < bestDistance) { best = u; bestDistance = score; }
    }
    return best;
  }

  #buildingAt(point, reach) {
    let best = null, bestDistance = Infinity;
    for (const b of this.#state.buildings) {
      const distance = Math.hypot(b.x - point.x, b.y - point.y) - b.radius;
      if (distance < reach * .6 && distance < bestDistance) { best = b; bestDistance = distance; }
    }
    return best;
  }

  #resourceAt(point, reach) {
    let best = null, bestDistance = Math.max(10, reach);
    for (const tree of this.#state.trees) {
      if (tree.stump) continue;
      const distance = Math.hypot(tree.x - point.x, tree.y - point.y) - 4;
      if (distance < bestDistance) { best = tree; bestDistance = distance; }
    }
    for (const patch of this.#state.grass) {
      const distance = Math.hypot(patch.x - point.x, patch.y - point.y) - 3;
      if (distance < bestDistance) { best = patch; bestDistance = distance; }
    }
    // Tora no chão também é madeira: manda colher a árvore mais perto dela.
    return best;
  }

  #ping(x, y, kind) {
    this.#state.pings.push({ x, y, kind, time: 0, life: .9 });
  }

  // ---- Laço de seleção ----

  #boxBegin(x, y) {
    this.#boxStart = { x, y };
    this.#boxEnd = { x, y };
    this.#drawBox();
    this.#boxElement.hidden = false;
  }

  #boxMove(x, y) {
    this.#boxEnd = { x, y };
    this.#drawBox();
  }

  #boxFinish(cancelled) {
    this.#boxElement.hidden = true;
    const start = this.#boxStart, end = this.#boxEnd;
    this.#boxStart = null;
    if (cancelled || !start) return;
    const bounds = this.#canvas.getBoundingClientRect();
    const left = Math.min(start.x, end.x) - bounds.left, right = Math.max(start.x, end.x) - bounds.left;
    const top = Math.min(start.y, end.y) - bounds.top, bottom = Math.max(start.y, end.y) - bounds.top;
    // Laço quase sem tamanho (segurou e soltou): pega quem está sob o dedo, num raio.
    const tiny = right - left < 12 && bottom - top < 12;
    const picked = this.#state.organisms.filter(u => {
      if (u.team !== 'player') return false;
      const p = this.#view.camera.project(u.x, u.y, 7 * u.size / 10);
      if (tiny) return Math.hypot(p.x - left, p.y - top) < 60;
      return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
    });
    // Laço com soldados e trabalhadores: fica com os soldados, que é o que se quer
    // ao laçar um exército.
    const soldiers = picked.filter(u => u.type !== 'worker');
    this.#selection.setUnits(soldiers.length && soldiers.length < picked.length && !tiny ? soldiers : picked);
  }

  #drawBox() {
    const start = this.#boxStart, end = this.#boxEnd;
    const style = this.#boxElement.style;
    style.left = `${Math.min(start.x, end.x)}px`;
    style.top = `${Math.min(start.y, end.y)}px`;
    style.width = `${Math.abs(end.x - start.x)}px`;
    style.height = `${Math.abs(end.y - start.y)}px`;
  }
}
