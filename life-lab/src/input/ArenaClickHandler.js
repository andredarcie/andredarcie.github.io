import { WORLD } from '../config/world.js';

// Toque no mundo: no modo de inspeção escolhe o bicho mais perto e abre a ficha;
// fora dele, cria um bicho novo onde tocou.
export class ArenaClickHandler {
  constructor({ canvas, view, state, factory, inspectMode, geneDialog, cameraController }) {
    canvas.addEventListener('click', event => {
      if (cameraController.consumeClickSuppression()) return;
      // A arena não é o próprio canvas: o ponto de tela vira ponto do chão por
      // interseção com o plano do mundo, senão semear e inspecionar erram o alvo.
      const hit = view.pickGround(event.clientX, event.clientY);
      if (!hit) return;
      const { x, y } = hit;
      if (x < 0 || y < 0 || x > WORLD.width || y > WORLD.height) return;
      if (inspectMode.active) {
        const selected = ArenaClickHandler.#closest(state.organisms, x, y);
        if (selected) {
          inspectMode.set(false);
          geneDialog.show(selected);
        }
        return;
      }
      state.organisms.push(factory.create({ x, y }));
    });
  }

  static #closest(organisms, x, y) {
    let selected = null, closest = Infinity;
    for (const o of organisms) {
      const distance = Math.hypot(o.x - x, o.y - y);
      if (distance <= Math.max(18, o.size + 8) && distance < closest) {
        selected = o;
        closest = distance;
      }
    }
    return selected;
  }
}
