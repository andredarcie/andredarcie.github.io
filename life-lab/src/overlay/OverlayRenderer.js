// A sobreposição 2D por cima da cena 3D. Primeiro as camadas que pertencem ao chão,
// desenhadas deitadas com a matriz do chão; depois as que encaram a câmera, em
// pixels de tela. Cada camada só precisa responder draw(frame): uma camada nova
// entra na lista sem mexer aqui.
export class OverlayRenderer {
  #canvas;
  #ctx;
  #camera;
  #state;
  #groundLayers;
  #screenLayers;

  constructor({ canvas, cameraRig, state, groundLayers, screenLayers }) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#camera = cameraRig;
    this.#state = state;
    this.#groundLayers = groundLayers;
    this.#screenLayers = screenLayers;
  }

  // O canvas 2D trabalha em pixels de tela, não em unidades do mundo; o WebGL é
  // dimensionado pelo renderer, aqui cuido só da sobreposição.
  resize(width, height, pixelRatio) {
    this.#canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.#canvas.height = Math.max(1, Math.round(height * pixelRatio));
    this.#ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  // `exclude`: retângulo (a lupa de acontecimentos) onde nada da cena grande pode vazar.
  draw(exclude = null) {
    const ctx = this.#ctx;
    const width = this.#canvas.clientWidth, height = this.#canvas.clientHeight;
    const frame = {
      ctx, width, height, elapsed: this.#state.elapsed,
      project: (x, y, lift) => this.#camera.project(x, y, lift)
    };
    ctx.clearRect(0, 0, width, height);
    const ground = this.#camera.groundMatrix();
    ctx.save();
    ctx.transform(ground.a, ground.b, ground.c, ground.d, ground.e, ground.f);
    for (const layer of this.#groundLayers) layer.draw(frame);
    ctx.restore();
    for (const layer of this.#screenLayers) layer.draw(frame);
    if (exclude) ctx.clearRect(exclude.left, exclude.top, exclude.width, exclude.height);
  }
}
