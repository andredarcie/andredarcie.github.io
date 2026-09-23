import { pseudoRandom } from '../core/math.js';

// Enfeites fixos: pedras, cactos, arbustos e a mata da borda. Recebe a lista pronta
// de quem conhece os biomas e só decide como cada espécie é feita de blocos.
export class SceneryRenderer {
  #layer;
  #props;
  #space;

  constructor(layer, propFactory, space) {
    this.#layer = layer;
    this.#props = propFactory;
    this.#space = space;
  }

  set(items) {
    for (const prop of [...this.#layer.children]) {
      this.#layer.remove(prop);
      prop.traverse(node => {
        // Arbusto usa a geometria compartilhada com o capim da simulação: descartar
        // aqui quebraria todo o capim da arena. Só o que é exclusivo do cenário sai.
        if (node.isMesh && !this.#props.isShared(node.geometry)) node.geometry.dispose();
      });
    }
    for (const item of items) {
      const prop = this.#props.build(item.kind, item.seed);
      if (!prop) continue;
      const place = this.#space.toScene(item.x, item.y);
      prop.position.set(place.x, 0, place.z);
      prop.rotation.y = pseudoRandom(item.seed + 21) * Math.PI * 2;
      // A mata de fora é só moldura: longe do mapa de sombra e numerosa, projetar
      // sombra dela custaria caro sem aparecer.
      if (item.decor) prop.traverse(node => { node.castShadow = false; });
      this.#layer.add(prop);
    }
  }
}
