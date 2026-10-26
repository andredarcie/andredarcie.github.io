import * as THREE from 'three';
import { hutSize } from '../settlement/HutDimensions.js';
import { WINDOW_DARK } from './SertaoBuildingModel.js';
import { hillHeight } from '../world/Hills.js';
import { ghostify } from './GhostLook.js';

// Luz de candeeiro de azeite, amarelada, nas janelas quando escurece.
const WINDOW_LIT = new THREE.Color(0xffb85a);
// Altura das construções com telhado, para saber quem elas tapam.
const HOUSE_HEIGHT = 16;
const CHURCH_HEIGHT = 48;

// As casas e a igreja na cena: refeitas só quando mudam de forma (a obra avança um
// pedaço, fica pronta), com as janelas acendendo quando escurece.
export class HutRenderer {
  #layer;
  #model;
  #space;
  #views = new Map();

  constructor(layer, model, space) {
    this.#layer = layer;
    this.#model = model;
    this.#space = space;
  }

  sync(huts, { daylight = 1 } = {}) {
    const seen = new Set();
    const dark = 1 - daylight;
    for (const hut of huts) {
      seen.add(hut);
      const size = hutSize(hut.capacity);
      // A obra é refeita a cada décimo de andamento, não a cada quadro.
      const progress = Math.floor(hut.progress * 10) / 10;
      const stage = `${hut.kind}-${hut.built}-${progress}-${size.width}`;
      let view = this.#views.get(hut);
      if (!view || view.stage !== stage) {
        if (view) {
          this.#layer.remove(view.group);
          this.#model.dispose(view.group);
        }
        const parts = this.#model.build(hut.kind, progress, hut.built, size);
        const place = this.#space.toScene(hut.x, hut.y);
        parts.group.position.set(place.x, hillHeight(hut.x, hut.y), place.z);
        parts.group.rotation.y = -hut.angle;
        // A obra fantasma do modo de obra (FrameRenderer): a casa pronta, transparente.
        if (hut.preview) ghostify(parts.group, hut.previewOpen);
        this.#layer.add(parts.group);
        view = { ...parts, stage, height: parts.height ?? (hut.kind === 'hall' || hut.kind === 'igrejanova' ? CHURCH_HEIGHT : HOUSE_HEIGHT) };
        this.#views.set(hut, view);
      }
      if (view.windows) view.windows.copy(WINDOW_DARK).lerp(WINDOW_LIT, Math.min(1, dark * 1.4));
    }
    for (const [hut, view] of this.#views) {
      if (seen.has(hut)) continue;
      this.#layer.remove(view.group);
      this.#model.dispose(view.group);
      this.#views.delete(hut);
    }
  }

  // Construções que podem tapar alguém atrás delas (OcclusionFader).
  occluders() {
    const list = [];
    for (const [hut, view] of this.#views) {
      if (hut.preview) continue;
      const size = hutSize(hut.capacity);
      list.push({
        object: view.group,
        x: view.group.position.x, z: view.group.position.z,
        radius: Math.max(size.width, size.depth) * .55,
        height: view.height
      });
    }
    return list;
  }
}
