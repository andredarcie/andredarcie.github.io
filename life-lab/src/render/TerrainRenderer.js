import * as THREE from 'three';
import { PALETTE } from './Palette.js';
import { SURROUNDING_SCALE } from '../config/world.js';

// O chão: o plano da área dos bichos e, logo abaixo dele, o terreno de fora, bem
// maior, para a tela nunca mostrar o fim do mundo.
export class TerrainRenderer {
  #renderer;
  #ground;
  #surroundings;

  constructor(scene, renderer, world) {
    this.#renderer = renderer;
    this.#ground = new THREE.Mesh(
      new THREE.PlaneGeometry(world.width, world.height),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    this.#ground.rotation.x = -Math.PI / 2;
    // Acima do terreno de fora: no mesmo y as duas superfícies brigam e piscam.
    this.#ground.position.y = .05;
    this.#ground.receiveShadow = true;
    scene.add(this.#ground);

    // Terreno além da área dos bichos, com os mesmos biomas em resolução menor. Fica
    // um nada abaixo do chão do mundo, que cobre o miolo dele por cima.
    this.#surroundings = new THREE.Mesh(
      new THREE.PlaneGeometry(world.width * SURROUNDING_SCALE, world.height * SURROUNDING_SCALE),
      new THREE.MeshLambertMaterial({ color: PALETTE.grassDark })
    );
    this.#surroundings.rotation.x = -Math.PI / 2;
    this.#surroundings.position.y = -.05;
    this.#surroundings.receiveShadow = true;
    scene.add(this.#surroundings);
  }

  // A vista é bem oblíqua: sem anisotropia o chão vira um borrão no fundo.
  setGroundTexture(source) {
    this.#ground.material.map = this.#texture(source);
    this.#ground.material.needsUpdate = true;
  }

  setSurroundingTexture(source) {
    this.#surroundings.material.color.set(0xffffff);
    this.#surroundings.material.map = this.#texture(source);
    this.#surroundings.material.needsUpdate = true;
  }

  #texture(source) {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.#renderer.capabilities.getMaxAnisotropy();
    return texture;
  }
}
