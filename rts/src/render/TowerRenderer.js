import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { shadedBox } from './Shading.js';
import { createContactShadow } from './ContactShadow.js';
import { CENTER } from '../config/rts.js';
import { hillHeight } from '../world/Hills.js';

// Raio do parapeito, altura de cada fiada de pedra e quanto cada nível de jirau
// ergue o atirador (a mesma conta do TowerSystem, de onde a bala sai).
const RING = 8;
const COURSE = 1.8;
const COURSES = 3;
const JIRAU_RISE = 9;
const STONE = shadedBox(3.6, COURSE, 2.6, .72, 1.08);
const EARTH = shadedBox(4.2, 1.2, 3.2, .8, 1.05);
const PIT = new THREE.CircleGeometry(RING - 1.5, 16).rotateX(-Math.PI / 2);
const FORK = shadedBox(1.1, 1, 1.1, .7, 1.05);
const STICK = new THREE.BoxGeometry(11, .7, .8);
const CRATE = shadedBox(3.2, 2.2, 2.2, .75, 1.08);
const TORSO = shadedBox(3, 3.6, 2, .8, 1.05);
const HEAD = shadedBox(2.4, 2.4, 2.4, .86, 1.08);
const BRIM = new THREE.CylinderGeometry(2.6, 2.6, .35, 10);
const CROWN = new THREE.CylinderGeometry(1.5, 1.7, 1.5, 8);
const GUN = new THREE.BoxGeometry(.5, .5, 8).translate(0, 0, 2.5);
const BELL = new THREE.BoxGeometry(1.2, 1.2, 1.1);

const STONE_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.rock, vertexColors: true });
const EARTH_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.soilDeep, vertexColors: true });
const PIT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x5e4630 });
const WOOD_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.stick, vertexColors: true });
const STICK_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.stick });
const CRATE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a6040, vertexColors: true });
const LEATHER_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a4e2c });
const SKIN_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa8714a, vertexColors: true });
const SHIRT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xe3d8bf, vertexColors: true });
const GUN_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x3a3c40 });
const BRASS_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9a7a3c });

// Trincheira do arraial: um buraco raso cercado de parapeito de pedra solta com terra
// por cima — como as trincheiras que os jagunços cavaram nas estradas e nos morros
// em volta de Belo Monte —, com a abertura voltada para a igreja e os atiradores de
// chapéu de couro mirando por cima. As melhorias aparecem: mais atiradores e o
// caixote de munição tomado da tropa (fuzis), o jirau de forquilhas que ergue o
// atirador (alcance) e a boca larga do bacamarte (carga espalhada). Em obra, o
// parapeito sobe do chão.
export class TowerRenderer {
  #layer;
  #space;
  #views = new Map();

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(towers) {
    const seen = new Set();
    for (const tower of towers) {
      seen.add(tower);
      const { power, range, scatter } = tower.levels;
      const stage = `${tower.built}-${power}-${range}-${scatter}`;
      let view = this.#views.get(tower);
      if (!view || view.stage !== stage) {
        if (view) this.#layer.remove(view.group);
        view = this.#build(tower, stage);
        this.#layer.add(view.group);
        this.#views.set(tower, view);
      }
      view.frame.scale.y = tower.built ? 1 : .15 + .85 * tower.progress;
      // Os atiradores viram juntos para o alvo.
      for (const shooter of view.shooters) shooter.rotation.y = Math.PI / 2 - tower.aim;
    }
    for (const [tower, view] of this.#views) {
      if (seen.has(tower)) continue;
      this.#layer.remove(view.group);
      this.#views.delete(tower);
    }
  }

  // Trincheiras que podem tapar alguém atrás delas (OcclusionFader).
  occluders() {
    const list = [];
    for (const view of this.#views.values()) {
      list.push({ object: view.frame, x: view.group.position.x, z: view.group.position.z, radius: RING + 1, height: view.height });
    }
    return list;
  }

  #build(tower, stage) {
    const { power, range, scatter } = tower.levels;
    const group = new THREE.Group();
    const place = this.#space.toScene(tower.x, tower.y);
    group.position.set(place.x, hillHeight(tower.x, tower.y), place.z);
    group.add(createContactShadow(RING + 3));
    const pit = new THREE.Mesh(PIT, PIT_MATERIAL);
    pit.position.y = .14;
    pit.receiveShadow = true;
    group.add(pit);
    const frame = new THREE.Group();
    group.add(frame);
    const mesh = (geometry, material, x, y, z, turn = 0) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(x, y, z);
      part.rotation.y = turn;
      part.castShadow = true;
      part.receiveShadow = true;
      frame.add(part);
      return part;
    };
    const top = COURSES * COURSE;
    // Parapeito em anel, com a abertura de entrada do lado da igreja (a trincheira é
    // girada pela simulação para que o lado de dentro fique para o arraial).
    const inward = Math.atan2(CENTER.y - tower.y, CENTER.x - tower.x);
    const stones = 11;
    for (let i = 0; i < stones; i++) {
      const angle = inward + (i + 1) / (stones + 1) * Math.PI * 2;
      const x = Math.cos(angle) * RING, z = Math.sin(angle) * RING;
      for (let course = 0; course < COURSES; course++) {
        const jitter = (pseudoRandom(tower.seed + i * 7 + course) - .5) * .5;
        mesh(STONE, STONE_MATERIAL, x, COURSE / 2 + course * COURSE, z, -angle + Math.PI / 2 + jitter);
      }
      mesh(EARTH, EARTH_MATERIAL, x, top + .5, z, -angle + Math.PI / 2);
    }
    const view = { group, frame, stage, shooters: [], height: top + 8 + range * JIRAU_RISE };
    if (!tower.built) return view;
    // Jirau: quatro forquilhas e o estrado de varas, com o atirador principal em cima.
    const lift = range * JIRAU_RISE;
    if (range > 0) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        mesh(FORK, WOOD_MATERIAL, sx * 4, lift / 2, sz * 4).scale.y = lift;
      }
      for (let i = -2; i <= 2; i++) mesh(STICK, STICK_MATERIAL, 0, lift + .4, i * 2);
    }
    const shooters = 1 + power;
    for (let i = 0; i < shooters; i++) {
      const onJirau = i === 0 && range > 0;
      const angle = inward + Math.PI + (i - (shooters - 1) / 2) * .9;
      const x = onJirau ? 0 : Math.cos(angle) * (RING - 3);
      const z = onJirau ? 0 : Math.sin(angle) * (RING - 3);
      view.shooters.push(this.#shooter(frame, x, onJirau ? lift + .8 : .4, z, scatter > 0 && i === 0));
    }
    // Caixote de munição tomado da tropa.
    if (power > 0) mesh(CRATE, CRATE_MATERIAL, Math.cos(inward) * 3, 1.1, Math.sin(inward) * 3, -inward);
    return view;
  }

  // Jagunço de chapéu de couro, meio agachado atrás do parapeito, com o fuzil (ou o
  // bacamarte de boca larga) apontado para a frente (+z, que o giro vira para o alvo).
  #shooter(frame, x, y, z, blunderbuss) {
    const shooter = new THREE.Group();
    shooter.position.set(x, y, z);
    const part = (geometry, material, px, py, pz) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      shooter.add(mesh);
    };
    part(TORSO, SHIRT_MATERIAL, 0, 4.2, 0);
    part(HEAD, SKIN_MATERIAL, 0, 7.2, .2);
    part(BRIM, LEATHER_MATERIAL, 0, 8.5, .2);
    part(CROWN, LEATHER_MATERIAL, 0, 9.3, .2);
    part(GUN, GUN_MATERIAL, .9, 5.6, 1);
    if (blunderbuss) part(BELL, BRASS_MATERIAL, .9, 5.6, 8.8);
    frame.add(shooter);
    return shooter;
  }
}
