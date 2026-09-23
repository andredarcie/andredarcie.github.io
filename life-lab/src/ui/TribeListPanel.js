import { Dom } from './Dom.js';

// Lista de tribos na HUD: uma linha por uniforme em uso por quem está numa tribo,
// da maior para a menor. Roda a cada quadro, mas só mexe no DOM quando algo muda.
export class TribeListPanel {
  #state;
  #names;
  #list;
  #empty;
  #total;
  #key = '';

  constructor(root, state, tribeNames) {
    this.#state = state;
    this.#names = tribeNames;
    this.#list = root.querySelector('#tribe-list');
    this.#empty = root.querySelector('#tribe-empty');
    this.#total = root.querySelector('#tribe-total');
  }

  render() {
    const sizes = new Map();
    for (const o of this.#state.organisms) {
      if (!o.band || !o.outfit) continue;
      sizes.set(o.outfit, (sizes.get(o.outfit) || 0) + 1);
    }
    const rows = [...sizes].map(([outfit, size]) => ({ outfit, size, name: this.#names.nameOf(outfit) }))
      .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
    const key = rows.map(row => `${row.outfit}:${row.size}:${row.name}`).join('|');
    if (key === this.#key) return;
    this.#key = key;
    this.#total.textContent = rows.length;
    this.#empty.hidden = rows.length > 0;
    this.#list.replaceChildren(...rows.map(row => TribeListPanel.#row(row)));
  }

  static #row(row) {
    const item = Dom.create('li', 'tribe-row');
    const swatch = Dom.create('span', 'tribe-swatch');
    swatch.style.backgroundColor = row.outfit;
    const name = Dom.create('span', 'tribe-name');
    name.textContent = row.name;
    name.title = row.name;
    const size = Dom.create('span', 'tribe-size');
    size.textContent = row.size;
    size.setAttribute('aria-label', `${row.size} ${row.size === 1 ? 'membro' : 'membros'}`);
    item.append(swatch, name, size);
    return item;
  }
}
