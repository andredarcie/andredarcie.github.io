// Conversão de coordenadas: a simulação mede o mundo de (0, 0) no canto a (W, H); a
// cena 3D centra o mundo na origem e usa (x, z) no chão.
export class SceneSpace {
  #world;

  constructor(world) {
    this.#world = world;
  }

  get world() {
    return this.#world;
  }

  toScene(x, y) {
    return { x: x - this.#world.width / 2, z: y - this.#world.height / 2 };
  }

  toWorld(x, z) {
    return { x: x + this.#world.width / 2, y: z + this.#world.height / 2 };
  }
}
