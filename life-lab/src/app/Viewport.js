// O tamanho da área de desenho: quando a janela muda, a cena 3D e a sobreposição 2D
// acompanham juntas.
export class Viewport {
  #canvas;
  #view;
  #overlay;

  constructor(canvas, view, overlay) {
    this.#canvas = canvas;
    this.#view = view;
    this.#overlay = overlay;
  }

  resize() {
    const bounds = this.#canvas.getBoundingClientRect();
    this.#overlay.resize(bounds.width, bounds.height, devicePixelRatio || 1);
    this.#view.resize(bounds.width, bounds.height);
  }
}
