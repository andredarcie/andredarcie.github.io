import * as THREE from 'three';
import { groundHeight } from './PondShape.js';

// Cores da chama: ela não é fogo de lenha, então queima azul e violeta com miolo
// branco — dá para achá-la de longe no meio das fogueiras laranja.
const FLAME_COLORS = [0x6a4cff, 0x48b8ff, 0xe8f6ff];
const FLAME_SHAPE = new THREE.BoxGeometry(1, 1, 1);
const ALTAR_SHAPE = new THREE.BoxGeometry(7, 2.4, 7);
const ALTAR_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x4a4650 });
const GLOW_GEOMETRY = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
// Mão esquerda erguida (a tocha), em unidades do boneco: ombro esquerdo + braço
// apontando para cima.
const HAND = { x: -3.7, y: 17.6, z: .4 };

// A Chama Primordial na cena: no chão, em cima de uma pedra; na mão de alguém,
// erguida como tocha. Tem luz própria, criada uma vez só (luz nova no meio do jogo
// obrigaria o three.js a recompilar os materiais).
export class PrimordialFlameRenderer {
  #space;
  #group = new THREE.Group();
  #fire = new THREE.Group();
  #altar;
  #glow;
  #parts;
  #light;

  constructor(layer, scene, space) {
    this.#space = space;
    this.#altar = new THREE.Mesh(ALTAR_SHAPE, ALTAR_MATERIAL);
    this.#altar.position.y = 1.2;
    this.#altar.castShadow = true;
    this.#parts = FLAME_COLORS.map((color, i) => {
      const mesh = new THREE.Mesh(FLAME_SHAPE, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: .92, depthWrite: false }));
      this.#fire.add(mesh);
      return { mesh, width: 4.6 - i * 1.3, height: 5.5 + i * 2, phase: i * 2.1 };
    });
    this.#glow = new THREE.Mesh(GLOW_GEOMETRY, new THREE.MeshBasicMaterial({
      color: 0x7a8cff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.#glow.position.y = .4;
    this.#group.add(this.#altar, this.#fire, this.#glow);
    this.#group.visible = false;
    layer.add(this.#group);
    this.#light = new THREE.PointLight(0x8aa0ff, 0, 190, 2);
    scene.add(this.#light);
  }

  sync(flame, { elapsed = 0, animate = true, daylight = 1, lifeSize = 10, ponds = [] } = {}) {
    const holder = flame?.holder;
    // Dentro da cabana a chama fica escondida junto com quem a carrega.
    const visible = Boolean(flame) && !holder?.inHut;
    this.#group.visible = visible;
    if (!visible) {
      this.#light.intensity = 0;
      return;
    }
    const place = this.#space.toScene(flame.x, flame.y);
    const floor = groundHeight(flame.x, flame.y, ponds);
    let x = place.x, y = floor, z = place.z, scale = 1;
    if (holder) {
      // Mesma conta de giro do OrganismRenderer: o boneco olha para +z e gira π/2 − rumo.
      scale = holder.size / lifeSize;
      const turn = Math.PI / 2 - holder.heading;
      const cos = Math.cos(turn), sin = Math.sin(turn);
      x += (HAND.x * cos + HAND.z * sin) * scale;
      z += (-HAND.x * sin + HAND.z * cos) * scale;
      y += HAND.y * scale;
    }
    this.#altar.visible = !holder;
    this.#glow.visible = !holder;
    this.#fire.position.set(x - place.x, (holder ? y - floor : 2.4), z - place.z);
    this.#group.position.set(place.x, floor, place.z);

    const flicker = animate
      ? 1 + Math.sin(elapsed * 8.1) * .1 + Math.sin(elapsed * 13.3) * .07 : 1;
    const size = holder ? .55 * scale : 1;
    for (const part of this.#parts) {
      const sway = animate ? Math.sin(elapsed * 5.5 + part.phase) : 0;
      const height = part.height * flicker * (1 + sway * .1) * size;
      part.mesh.scale.set(part.width * size, height, part.width * size);
      part.mesh.position.set(sway * .4 * size, height / 2, 0);
      part.mesh.rotation.y = part.phase + (animate ? elapsed * 1.1 : 0);
    }
    const dark = 1 - daylight;
    this.#glow.scale.setScalar(22 + 6 * flicker);
    this.#glow.material.opacity = (.18 + .3 * dark) * flicker;
    this.#light.position.set(x, y + 8, z);
    this.#light.intensity = 600 * flicker * (.35 + .65 * dark);
  }
}
