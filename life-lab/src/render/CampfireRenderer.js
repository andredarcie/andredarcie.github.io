import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';

const FIRE_LIGHT_POOL = 4;
const STONE_SHAPE = new THREE.BoxGeometry(3.2, 2.2, 2.8);
const LOG_SHAPE = new THREE.BoxGeometry(12, 2.2, 2.4);
const FLAME_SHAPE = new THREE.BoxGeometry(1, 1, 1);
const LOG_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
const EMBER_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff5a1e });
const FLAME_COLORS = [0xff6a1a, 0xffa030, 0xffe070];
const GLOW_GEOMETRY = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);

// Fogueira: roda de pedras, duas toras cruzadas, chama de blocos sem sombreamento
// (fogo emite luz, não recebe) e um brilho no chão. A luz de verdade vem de um
// conjunto fixo de luzes pontuais criado uma vez: mudar a quantidade de luzes da
// cena obriga o three.js a recompilar todos os materiais, e isso daria um soluço a
// cada fogueira que acende ou apaga.
export class CampfireRenderer {
  #layer;
  #space;
  #stoneMaterial;
  #lights;
  #views = new Map();

  constructor(layer, scene, propFactory, space) {
    this.#layer = layer;
    this.#space = space;
    this.#stoneMaterial = propFactory.material(PALETTE.rock);
    this.#lights = Array.from({ length: FIRE_LIGHT_POOL }, () => {
      const light = new THREE.PointLight(0xff9a48, 0, 170, 2);
      scene.add(light);
      return light;
    });
  }

  sync(fires, { elapsed = 0, animate = true, daylight = 1 } = {}) {
    const seen = new Set();
    fires.forEach((fire, index) => {
      seen.add(fire);
      let view = this.#views.get(fire);
      if (!view) {
        view = this.#createView(fire);
        this.#layer.add(view);
        this.#views.set(fire, view);
      }
      const place = this.#space.toScene(fire.x, fire.y);
      view.position.set(place.x, 0, place.z);
      const { flames, embers, glow } = view.userData;
      const flame = fire.flame;
      // Tremor: duas senoides de frequência sem múltiplo comum não se repetem à vista.
      const flicker = animate
        ? 1 + Math.sin(elapsed * 9.3 + fire.seed) * .09 + Math.sin(elapsed * 15.7 + fire.seed * 2) * .06
        : 1;
      for (const part of flames) {
        const sway = animate ? Math.sin(elapsed * 6 + part.phase) : 0;
        const height = part.height * flame * flicker * (1 + sway * .08);
        part.mesh.visible = flame > .04;
        part.mesh.scale.set(part.width * (.6 + .4 * flame), Math.max(.01, height), part.width * (.6 + .4 * flame));
        part.mesh.position.set(sway * .5, 2.4 + height / 2, 0);
        part.mesh.rotation.y = part.phase + (animate ? elapsed * .8 : 0);
        part.mesh.material.opacity = Math.min(1, flame * 1.6);
      }
      // Brasa: ainda acesa quando a chama já foi, que é como o fogo morre de manhã.
      embers.material.opacity = Math.min(1, .25 + flame * 1.5);
      const dark = 1 - daylight;
      glow.scale.setScalar(26 + 8 * flicker);
      glow.material.opacity = .32 * flame * dark * flicker;

      const light = this.#lights[index];
      if (light) {
        light.position.set(place.x, 12, place.z);
        // De dia o fogo quase não faz diferença na claridade; de noite ilumina a roda.
        light.intensity = 520 * flame * flicker * (.25 + .75 * dark);
      }
    });
    for (let i = fires.length; i < FIRE_LIGHT_POOL; i++) this.#lights[i].intensity = 0;
    for (const [fire, view] of this.#views) {
      if (seen.has(fire)) continue;
      this.#layer.remove(view);
      view.traverse(node => {
        if (!node.isMesh) return;
        if (node.material !== this.#stoneMaterial && node.material !== LOG_MATERIAL) node.material.dispose();
      });
      view.userData.embers.geometry.dispose();
      this.#views.delete(fire);
    }
  }

  #createView(fire) {
    const group = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const angle = i / 9 * Math.PI * 2;
      const stone = new THREE.Mesh(STONE_SHAPE, this.#stoneMaterial);
      stone.position.set(Math.cos(angle) * 7.5, 1.1, Math.sin(angle) * 7.5);
      stone.rotation.y = -angle + pseudoRandom(fire.seed + i) * .5;
      stone.castShadow = true;
      group.add(stone);
    }
    for (const turn of [.4, .4 + Math.PI / 2]) {
      const log = new THREE.Mesh(LOG_SHAPE, LOG_MATERIAL);
      log.position.y = 1.4;
      log.rotation.y = turn;
      log.castShadow = true;
      group.add(log);
    }
    const embers = new THREE.Mesh(new THREE.BoxGeometry(6, .8, 6), EMBER_MATERIAL.clone());
    embers.material.transparent = true;
    embers.position.y = 2.2;
    group.add(embers);
    // Três línguas de fogo, uma por tom, do vermelho largo embaixo ao amarelo fino
    // em cima; cada uma com fase própria para a chama não pulsar em bloco.
    const flames = FLAME_COLORS.map((color, i) => {
      const flame = new THREE.Mesh(FLAME_SHAPE, new THREE.MeshBasicMaterial({
        color, transparent: true, depthWrite: false }));
      group.add(flame);
      return { mesh: flame, width: 6.5 - i * 1.9, height: 6 + i * 2.5, phase: i * 1.7 + fire.seed };
    });
    // Brilho no chão: aditivo, então só clareia, e só aparece de verdade no escuro.
    const glow = new THREE.Mesh(GLOW_GEOMETRY, new THREE.MeshBasicMaterial({
      color: 0xff8a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = .3;
    group.add(glow);
    group.userData = { flames, embers, glow };
    return group;
  }
}
