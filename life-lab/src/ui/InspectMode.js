// "Ver genes": liga o modo em que o toque escolhe um bicho em vez de criar um.
export class InspectMode {
  #toggle;
  #hint;
  #canvas;
  active = false;

  constructor(root, canvas) {
    this.#toggle = root.querySelector('#inspect-toggle');
    this.#hint = root.querySelector('#arena-hint');
    this.#canvas = canvas;
    this.#toggle.addEventListener('click', () => this.set(!this.active));
  }

  set(active) {
    this.active = active;
    this.#toggle.setAttribute('aria-pressed', String(active));
    this.#toggle.textContent = active ? 'Cancelar' : 'Ver genes';
    this.#toggle.setAttribute('aria-label', active ? 'Cancelar seleção de bicho' : 'Ver genes de um bicho');
    this.#hint.textContent = active
      ? 'Toque em um bicho para ver seus genes'
      : '♂ sem cabelo · ♀ com cabelo · mesma roupa = mesma tribo · arraste ou use setas/WASD para passear';
    this.#canvas.style.cursor = active ? 'pointer' : 'crosshair';
  }
}
