import * as THREE from 'three';
import { hutSize } from '../settlement/HutDimensions.js';
import { WINDOW_DARK } from './HutModel.js';

const WINDOW_LIT = new THREE.Color(0xffc56a);
// A cabana pronta tem sempre 6 fiadas, alta o bastante para o boneco caber de pé;
// quantas toras ela custa é regra da simulação, então cada tora ergue a fração
// correspondente das fiadas.
const HUT_TOTAL_COURSES = 6;
// Altura da cabana com telhado e chaminé, para saber quem ela tapa.
const HUT_HEIGHT = 30;

// As cabanas na cena: refeitas só quando mudam de forma, com a bandeira balançando
// e as janelas acendendo quando tem gente dentro no escuro.
export class HutRenderer {
  #layer;
  #model;
  #space;
  #views = new Map();

  constructor(layer, hutModel, space) {
    this.#layer = layer;
    this.#model = hutModel;
    this.#space = space;
  }

  sync(huts, logsNeeded, { elapsed = 0, animate = true, daylight = 1 } = {}) {
    const seen = new Set();
    const dark = 1 - daylight;
    for (const hut of huts) {
      seen.add(hut);
      const size = hutSize(hut.capacity);
      const flagColor = hut.built && typeof hut.owner === 'string' && hut.owner.startsWith('#')
        ? hut.owner : null;
      // Só refaz quando muda o que dá forma à cabana: tora nova, conclusão, tamanho
      // (a tribo cresceu) ou dono (a bandeira troca de cor).
      const stage = `${hut.logs}-${hut.built}-${size.width}-${flagColor}`;
      let view = this.#views.get(hut);
      if (!view || view.stage !== stage) {
        if (view) {
          this.#layer.remove(view.group);
          this.#model.dispose(view.group);
        }
        const courses = Math.min(HUT_TOTAL_COURSES,
          Math.round(hut.logs / Math.max(1, logsNeeded) * HUT_TOTAL_COURSES));
        const parts = this.#model.build(courses, hut.built, HUT_TOTAL_COURSES, size, flagColor);
        const place = this.#space.toScene(hut.x, hut.y);
        parts.group.position.set(place.x, 0, place.z);
        parts.group.rotation.y = -hut.angle;
        this.#layer.add(parts.group);
        view = { ...parts, stage };
        this.#views.set(hut, view);
      }
      if (view.flag) this.#model.flags.wave(view.flag, elapsed, animate);
      if (view.windows) {
        // Janela acesa só com gente dentro e só quando escurece.
        const glow = hut.inside > 0 ? Math.min(1, dark * 1.4) : 0;
        view.windows.color.copy(WINDOW_DARK).lerp(WINDOW_LIT, glow);
      }
    }
    for (const [hut, view] of this.#views) {
      if (seen.has(hut)) continue;
      this.#layer.remove(view.group);
      this.#model.dispose(view.group);
      this.#views.delete(hut);
    }
  }

  // Cabanas que podem tapar um bicho atrás delas (OcclusionFader).
  occluders() {
    const list = [];
    for (const [hut, view] of this.#views) {
      const size = hutSize(hut.capacity);
      list.push({
        object: view.group,
        x: view.group.position.x, z: view.group.position.z,
        radius: Math.max(size.width, size.depth) * .55,
        height: HUT_HEIGHT
      });
    }
    return list;
  }
}
