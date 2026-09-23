import * as THREE from 'three';
import { WOOD_MATERIALS, LOG_RADIUS } from './WoodMaterials.js';

const GROUND_LOG_SHAPE = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 9, 8).rotateZ(Math.PI / 2);

// Toras no chão, deitadas ao longo de onde o tronco caiu.
export class LogRenderer {
  #layer;
  #space;
  #views = new Map();

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(logs) {
    const seen = new Set();
    for (const log of logs) {
      seen.add(log);
      let mesh = this.#views.get(log);
      if (!mesh) {
        mesh = new THREE.Mesh(GROUND_LOG_SHAPE, WOOD_MATERIALS);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.#layer.add(mesh);
        this.#views.set(log, mesh);
      }
      const place = this.#space.toScene(log.x, log.y);
      mesh.position.set(place.x, LOG_RADIUS, place.z);
      // Deitada ao longo do tronco caído: o eixo da tora é o x local, girado para o rumo.
      mesh.rotation.set(0, -log.angle, 0);
    }
    for (const [log, mesh] of this.#views) {
      if (seen.has(log)) continue;
      this.#layer.remove(mesh);
      this.#views.delete(log);
    }
  }
}
