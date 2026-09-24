import { pseudoRandom } from '../core/math.js';
import { PropFactory } from './PropFactory.js';

// Enfeites fixos: pedras, cactos e arbustos. Recebe a lista pronta
// de quem conhece os biomas e só decide como cada espécie é feita de blocos.
export class SceneryRenderer {
  #layer;
  #props;
  #space;
  #occluders = [];

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
    this.#occluders = [];
    for (const item of items) {
      const prop = this.#props.build(item.kind, item.seed);
      if (!prop) continue;
      const place = this.#space.toScene(item.x, item.y);
      prop.position.set(place.x, 0, place.z);
      prop.rotation.y = pseudoRandom(item.seed + 21) * Math.PI * 2;
      this.#layer.add(prop);
      const size = prop.scale.x;
      this.#occluders.push({
        object: prop, x: place.x, z: place.z,
        radius: PropFactory.footprint(item.kind) * size,
        height: PropFactory.height(item.kind) * size
      });
    }
  }

  // Enfeites que podem tapar um bicho atrás deles (OcclusionFader).
  occluders() {
    return this.#occluders;
  }
}
