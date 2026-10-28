import * as THREE from 'three';
import { ghostify, ghostFade } from './GhostLook.js';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { hillHeight } from '../world/Hills.js';
import { TUPI, PALMARES } from '../config/mission.js';

const FIRE_LIGHT_POOL = 4;
const STONE_SHAPE = new THREE.BoxGeometry(3.2, 2.2, 2.8);
const LOG_SHAPE = new THREE.BoxGeometry(12, 2.2, 2.4);
const FLAME_SHAPE = new THREE.BoxGeometry(1, 1, 1);
const LOG_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
const EMBER_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff5a1e });
const FLAME_COLORS = [0xff6a1a, 0xffa030, 0xffe070];
const GLOW_GEOMETRY = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
// O fogo do conselho dos tupinambás: as redes armadas "em estacas que têm para isso
// metidas no chão [...] de redor da do principal" (Gabriel Soares, cap. CLXIV). Cada
// rede: duas estacas e o pano de algodão caindo em curva entre elas.
const STAKE_SHAPE = new THREE.CylinderGeometry(.3, .36, 7, 5).translate(0, 3.5, 0);
const HAMMOCK_SHAPE = new THREE.BoxGeometry(2.6, .3, 1);
const STAKE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x6b5236 });
const HAMMOCK_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xe2d8c0 });
const HAMMOCKS = 5;
// A forja dos Palmares: "quatro forjas" no meio das casas (diário de João Blaer,
// 1645); "tendas de ferreiro, e outras oficinas, com que poderão fazer armas"
// (governador Fernão Coutinho, 1671). O fogo fica na roda de pedras; ao lado, a
// tenda: quatro esteios e uma água de palha cobrindo a bigorna no cepo, o fole de
// couro soprando o fogo e as lâminas encostadas num esteio.
const FORGE_POST_SHAPE = new THREE.CylinderGeometry(.4, .45, 1, 6).translate(0, .5, 0);
const FORGE_ROOF_SHAPE = new THREE.BoxGeometry(13, .8, 10.5);
const STUMP_SHAPE = new THREE.CylinderGeometry(1.5, 1.7, 3, 8).translate(0, 1.5, 0);
const ANVIL_SHAPE = new THREE.BoxGeometry(1.6, 1.4, 3.4);
const ANVIL_HORN_SHAPE = new THREE.ConeGeometry(.6, 1.6, 6).rotateX(Math.PI / 2);
const BELLOWS_SHAPE = new THREE.BoxGeometry(3, 1.2, 4.2);
const NOZZLE_SHAPE = new THREE.CylinderGeometry(.25, .35, 3, 6).rotateZ(Math.PI / 2);
const BLADE_SHAPE = new THREE.BoxGeometry(.25, 6, .7).translate(0, 3, 0);
const FORGE_POST_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x6b5236 });
const FORGE_THATCH_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9a8e58 });
const STUMP_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x5e4630 });
const IRON_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x3c3a38 });
const LEATHER_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x6a4428 });
const SHARED_MATERIALS = new Set([LOG_MATERIAL, STAKE_MATERIAL, HAMMOCK_MATERIAL, FORGE_POST_MATERIAL,
  FORGE_THATCH_MATERIAL, STUMP_MATERIAL, IRON_MATERIAL, LEATHER_MATERIAL]);

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
        // A obra fantasma do modo de obra (FrameRenderer): o acampamento, transparente.
        if (fire.preview) ghostify(view, fire.previewOpen);
        this.#layer.add(view);
        this.#views.set(fire, view);
      }
      const place = this.#space.toScene(fire.x, fire.y);
      view.position.set(place.x, hillHeight(fire.x, fire.y), place.z);
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
        part.mesh.material.opacity = Math.min(1, flame * 1.6) * ghostFade(fire);
      }
      // Brasa: ainda acesa quando a chama já foi, que é como o fogo morre de manhã.
      embers.material.opacity = Math.min(1, .25 + flame * 1.5) * ghostFade(fire);
      const dark = 1 - daylight;
      glow.scale.setScalar(26 + 8 * flicker);
      glow.material.opacity = .32 * flame * dark * flicker * ghostFade(fire);

      const light = this.#lights[index];
      if (light) {
        light.position.set(place.x, 12 + hillHeight(fire.x, fire.y), place.z);
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
        if (node.material !== this.#stoneMaterial && !SHARED_MATERIALS.has(node.material)) node.material.dispose();
      });
      view.userData.embers.geometry.dispose();
      this.#views.delete(fire);
    }
  }

  // As redes em volta do fogo, uma estaca em cada ponta e o pano em curva.
  static #hammocks(group, seed) {
    for (let i = 0; i < HAMMOCKS; i++) {
      const angle = i / HAMMOCKS * Math.PI * 2 + pseudoRandom(seed + i) * .3;
      const holder = new THREE.Group();
      holder.position.set(Math.cos(angle) * 11.5, 0, Math.sin(angle) * 11.5);
      holder.rotation.y = -angle + Math.PI / 2;
      group.add(holder);
      for (const side of [-1, 1]) {
        const stake = new THREE.Mesh(STAKE_SHAPE, STAKE_MATERIAL);
        stake.position.x = side * 5;
        stake.castShadow = true;
        holder.add(stake);
      }
      for (let k = 0; k < 5; k++) {
        const t = (k - 2) / 2.5;
        const piece = new THREE.Mesh(HAMMOCK_SHAPE, HAMMOCK_MATERIAL);
        piece.position.set(t * 4, 3.4 + t * t * 2.4, 0);
        piece.rotation.z = Math.atan(t * 2.1) * .9;
        piece.castShadow = true;
        holder.add(piece);
      }
    }
  }

  // A tenda do ferreiro ao lado do fogo (+z local), com a bigorna, o fole e as lâminas.
  static #forge(group, seed) {
    const add = (shape, material, x, y, z, ry = 0) => {
      const mesh = new THREE.Mesh(shape, material);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    // A tenda: os esteios de trás mais altos, a água de palha caindo para a frente.
    for (const [x, z, h] of [[-5.5, 9, 9], [5.5, 9, 9], [-5.5, 17, 11], [5.5, 17, 11]]) {
      add(FORGE_POST_SHAPE, FORGE_POST_MATERIAL, x, 0, z).scale.y = h;
    }
    // (girar em x para trás ergue a ponta de +z: o fundo da tenda, mais alto)
    const roof = add(FORGE_ROOF_SHAPE, FORGE_THATCH_MATERIAL, 0, 10.4, 13);
    roof.rotation.x = -.24;
    // A bigorna de ferro no cepo, com o bico.
    add(STUMP_SHAPE, STUMP_MATERIAL, 0, 0, 12.5);
    add(ANVIL_SHAPE, IRON_MATERIAL, 0, 3.7, 12.5);
    add(ANVIL_HORN_SHAPE, IRON_MATERIAL, 0, 3.9, 14.9);
    // O fole entre a tenda e o fogo, com o bico virado para as brasas.
    add(BELLOWS_SHAPE, LEATHER_MATERIAL, -4.5, .8, 7.5, .5);
    add(NOZZLE_SHAPE, IRON_MATERIAL, -2.8, 1.2, 5.6, .9);
    // As lâminas encostadas no esteio, esperando o cabo.
    for (let i = 0; i < 3; i++) {
      const blade = add(BLADE_SHAPE, IRON_MATERIAL, 5.1 - i * .5, 0, 16.4, pseudoRandom(seed + i) * .3);
      blade.rotation.z = .12 + i * .05;
    }
  }

  #createView(fire) {
    const group = new THREE.Group();
    if (TUPI) CampfireRenderer.#hammocks(group, fire.seed);
    if (PALMARES) CampfireRenderer.#forge(group, fire.seed);
    // (a roda de pedras é do sertão; o fogo da aldeia é aceso direto no chão)
    for (let i = 0; i < (TUPI ? 0 : 9); i++) {
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
