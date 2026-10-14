// Mede os painéis da HUD que ficam por cima da cena e passa os retângulos para a
// câmera, que dimensiona o tabuleiro para não encostar neles.
//
// A câmera de acontecimentos fica de fora de propósito: ela aparece e some sozinha, e
// o tabuleiro encolher e crescer a cada nascimento seria pior que ela cobrir um canto.
export class HudObstacleTracker {
  #canvas;
  #rig;
  #panels;

  constructor({ canvas, cameraRig, panels }) {
    this.#canvas = canvas;
    this.#rig = cameraRig;
    this.#panels = panels.filter(Boolean);
    // Painel crescendo (tribo nova na lista), janela mudando, celular girando: tudo
    // isso muda o tamanho de algum destes elementos.
    const observer = new ResizeObserver(() => this.measure());
    for (const element of [canvas, ...this.#panels]) observer.observe(element);
  }

  measure() {
    const view = this.#canvas.getBoundingClientRect();
    if (view.width < 1 || view.height < 1) return;
    const rects = [];
    for (const element of this.#panels) {
      const box = element.getBoundingClientRect();
      // Escondido (display: none) não cobre nada.
      if (box.width < 1 || box.height < 1) continue;
      rects.push({
        left: box.left - view.left, top: box.top - view.top,
        right: box.right - view.left, bottom: box.bottom - view.top
      });
    }
    this.#rig.setObstacles(rects);
  }
}
