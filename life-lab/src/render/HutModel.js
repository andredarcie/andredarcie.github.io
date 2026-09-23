import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { BARK_MATERIAL, CUT_MATERIAL, WOOD_MATERIALS } from './WoodMaterials.js';

const HUT_COURSE = 2.6, HUT_DOOR_HALF = 3.6, HUT_DOOR_COURSES = 4, HUT_FOUNDATION = 1.2;
const BARK_ALT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7c6546 });
const WOOD_ALT_MATERIALS = [BARK_ALT_MATERIAL, CUT_MATERIAL, CUT_MATERIAL];
const SHINGLE_MATERIALS = [
  new THREE.MeshLambertMaterial({ color: 0x5c4630 }),
  new THREE.MeshLambertMaterial({ color: 0x6d5338 })
];
const MASONRY_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8b8c80 });
const DOORWAY_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x2e2218 });
const DOOR_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8a6440 });
const FRAME_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa27a4e });
const STAKE_SHAPE = new THREE.BoxGeometry(1, 6, 1);
export const WINDOW_DARK = new THREE.Color(0x2a241c);

// Cabana de toras, erguida fiada a fiada conforme chegam as toras. Paredes que correm
// em z ficam meia fiada abaixo das que correm em x, que é o encaixe de canto de uma
// cabana de verdade, e as pontas das toras passam do canto, cruzadas. A porta abre
// na parede do +x local, que o giro do grupo vira para o lado da porta na
// simulação. Assenta num alicerce de pedra e, pronta, ganha telhado de telhas com
// beiral, cumeeira, chaminé, janelas nas laterais e a bandeira da tribo.
export class HutModel {
  #flags;
  #logShapes = new Map();
  #sharedMaterials;

  constructor(flagModel) {
    this.#flags = flagModel;
    this.#sharedMaterials = new Set([
      BARK_MATERIAL, CUT_MATERIAL, BARK_ALT_MATERIAL, ...SHINGLE_MATERIALS, MASONRY_MATERIAL,
      DOORWAY_MATERIAL, DOOR_MATERIAL, FRAME_MATERIAL, ...flagModel.sharedMaterials
    ]);
  }

  get flags() {
    return this.#flags;
  }

  build(courses, built, totalCourses, size, flagColor) {
    const group = new THREE.Group();
    const width = size.width, depth = size.depth;
    const halfW = width / 2, halfD = depth / 2;
    const parts = { group, windows: null, flag: null };
    // Alicerce de pedra: a parede não encosta na terra, que apodreceria a tora.
    this.#box(group, width + 3, HUT_FOUNDATION, depth + 3, MASONRY_MATERIAL, 0, HUT_FOUNDATION / 2, 0);
    // Estacas nos cantos marcam o terreno enquanto a obra não fecha.
    if (!built) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const stake = new THREE.Mesh(STAKE_SHAPE, BARK_MATERIAL);
        stake.position.set(sx * (halfW + 2.5), 3, sz * (halfD + 2.5));
        stake.castShadow = true;
        group.add(stake);
      }
    }
    this.#buildWalls(group, courses, width, depth);
    if (!built) return parts;

    const top = HUT_FOUNDATION + 1.3 + totalCourses * HUT_COURSE;
    this.#buildDoor(group, halfW);
    parts.windows = this.#buildWindows(group, halfD);
    const { rise, span } = this.#buildRoof(group, width, depth, top);
    // Chaminé de pedra saindo da água de trás, perto do fundo.
    const chimneyHeight = rise + 7;
    this.#box(group, 3.6, chimneyHeight, 3.6, MASONRY_MATERIAL, -halfW * .45, top + chimneyHeight / 2 - 1, -span * .35);
    this.#box(group, 4.4, .8, 4.4, MASONRY_MATERIAL, -halfW * .45, top + chimneyHeight - .6, -span * .35);

    // Bandeira da tribo ao lado da porta, na cor do uniforme.
    if (flagColor) {
      const flag = this.#flags.create(flagColor, pseudoRandom(width + depth) * 6);
      flag.group.position.set(halfW + 3.5, 0, halfD + 1.5);
      group.add(flag.group);
      parts.flag = flag;
    }
    return parts;
  }

  // A cabana é refeita quando a tribo cresce ou muda de dono: o que é só dela (caixas,
  // oitão, vidraça, pano) vai embora junto; o que é compartilhado fica.
  dispose(group) {
    const sharedShapes = new Set([...this.#logShapes.values(), STAKE_SHAPE, ...this.#flags.sharedGeometries]);
    group.traverse(node => {
      if (!node.isMesh) return;
      if (!sharedShapes.has(node.geometry)) node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (!this.#sharedMaterials.has(material)) material.dispose();
      }
    });
  }

  #buildWalls(group, courses, width, depth) {
    const halfW = width / 2, halfD = depth / 2;
    for (let course = 0; course < courses; course++) {
      const low = HUT_FOUNDATION + 1.3 + course * HUT_COURSE;
      const high = low + HUT_COURSE / 2;
      // Fiadas alternam dois tons de casca: parede de tora de verdade nunca é lisa.
      const wood = course % 2 ? WOOD_ALT_MATERIALS : WOOD_MATERIALS;
      // Paredes do fundo e da frente (correm em z).
      this.#log(group, depth + 5, -halfW, low, 0, true, wood);
      if (course < HUT_DOOR_COURSES) {
        const segment = halfD + 2.5 - HUT_DOOR_HALF;
        const center = HUT_DOOR_HALF + segment / 2;
        this.#log(group, segment, halfW, low, -center, true, wood);
        this.#log(group, segment, halfW, low, center, true, wood);
      } else {
        this.#log(group, depth + 5, halfW, low, 0, true, wood);
      }
      // Paredes laterais (correm em x).
      this.#log(group, width + 5, 0, high, -halfD, false, wood);
      this.#log(group, width + 5, 0, high, halfD, false, wood);
    }
  }

  // Vão da porta escuro por dentro, batente claro e a folha entreaberta para fora,
  // presa na dobradiça de um lado; degrau de tábua na soleira.
  #buildDoor(group, halfW) {
    const doorHeight = HUT_DOOR_COURSES * HUT_COURSE;
    this.#box(group, .4, doorHeight, HUT_DOOR_HALF * 2, DOORWAY_MATERIAL, halfW - 1, HUT_FOUNDATION + doorHeight / 2, 0);
    for (const side of [-1, 1]) {
      this.#box(group, 1, doorHeight + 1, .9, FRAME_MATERIAL, halfW + .6, HUT_FOUNDATION + doorHeight / 2, side * (HUT_DOOR_HALF + .2));
    }
    this.#box(group, 1, 1, HUT_DOOR_HALF * 2 + 2, FRAME_MATERIAL, halfW + .6, HUT_FOUNDATION + doorHeight + .5, 0);
    const hinge = new THREE.Group();
    hinge.position.set(halfW + .6, HUT_FOUNDATION, -HUT_DOOR_HALF);
    hinge.rotation.y = -1.05;
    this.#box(hinge, .7, doorHeight - .3, HUT_DOOR_HALF * 2 - .4, DOOR_MATERIAL, 0, (doorHeight - .3) / 2, HUT_DOOR_HALF - .2);
    group.add(hinge);
    this.#box(group, 3.2, .6, HUT_DOOR_HALF * 2 + 2, FRAME_MATERIAL, halfW + 2.8, .3, 0);
  }

  // Janelas nas duas laterais: moldura clara e vidraça que fica escura de dia e acende
  // amarela quando tem gente dentro no escuro. Um material só por cabana.
  #buildWindows(group, halfD) {
    const pane = new THREE.MeshBasicMaterial({ color: WINDOW_DARK.clone() });
    const windowY = HUT_FOUNDATION + HUT_COURSE * 3.4;
    for (const side of [-1, 1]) {
      const z = side * (halfD + 1.45);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.6), pane);
      glass.position.set(0, windowY, z);
      glass.rotation.y = side > 0 ? 0 : Math.PI;
      group.add(glass);
      const frameZ = side * (halfD + 1.55);
      this.#box(group, 5.6, .7, .5, FRAME_MATERIAL, 0, windowY + 2.1, frameZ);
      this.#box(group, 5.6, .7, .5, FRAME_MATERIAL, 0, windowY - 2.1, frameZ);
      this.#box(group, .7, 4.9, .5, FRAME_MATERIAL, -2.5, windowY, frameZ);
      this.#box(group, .7, 4.9, .5, FRAME_MATERIAL, 2.5, windowY, frameZ);
      this.#box(group, .5, 3.6, .4, FRAME_MATERIAL, 0, windowY, frameZ);
    }
    return pane;
  }

  // Telhado de duas águas com a cumeeira correndo em x, beiral largo e telhas em
  // fileiras sobrepostas, cada fileira um tom; oitões fecham as pontas.
  #buildRoof(group, width, depth, top) {
    const halfW = width / 2, halfD = depth / 2;
    const rise = 8 + depth * .12, span = halfD + 4;
    const slope = Math.hypot(span, rise), pitch = Math.atan2(rise, span);
    const rows = 5, rowLength = slope / rows + 1.1;
    for (const side of [-1, 1]) {
      for (let row = 0; row < rows; row++) {
        const along = (row + .5) * (slope / rows);
        const shingle = new THREE.Mesh(new THREE.BoxGeometry(width + 10, 1, rowLength),
          SHINGLE_MATERIALS[row % 2]);
        // Cada fileira desce pela água e fica um tico acima da de baixo, sobreposta.
        shingle.position.set(0,
          top + rise - Math.sin(pitch) * along + .25 * (rows - row) / rows,
          side * Math.cos(pitch) * along);
        shingle.rotation.x = side * pitch;
        shingle.castShadow = true;
        shingle.receiveShadow = true;
        group.add(shingle);
      }
    }
    const ridge = new THREE.Mesh(this.#logShape(width + 11), WOOD_MATERIALS);
    ridge.rotation.z = Math.PI / 2;
    ridge.position.set(0, top + rise + .6, 0);
    ridge.castShadow = true;
    group.add(ridge);
    const gable = new THREE.Shape();
    gable.moveTo(-halfD - 1.5, 0);
    gable.lineTo(halfD + 1.5, 0);
    gable.lineTo(0, rise - .4);
    gable.closePath();
    const gableShape = new THREE.ShapeGeometry(gable);
    const gableMaterial = new THREE.MeshLambertMaterial({ color: 0x7c6546, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const end = new THREE.Mesh(gableShape, gableMaterial);
      end.position.set(side * (halfW + .5), top - .2, 0);
      end.rotation.y = Math.PI / 2;
      end.castShadow = true;
      group.add(end);
    }
    return { rise, span };
  }

  #logShape(length) {
    const key = Math.round(length * 10);
    if (!this.#logShapes.has(key)) {
      this.#logShapes.set(key, new THREE.CylinderGeometry(1.3, 1.3, length, 8));
    }
    return this.#logShapes.get(key);
  }

  #log(group, length, x, y, z, alongZ, materials = WOOD_MATERIALS) {
    const mesh = new THREE.Mesh(this.#logShape(length), materials);
    mesh.position.set(x, y, z);
    if (alongZ) mesh.rotation.x = Math.PI / 2;
    else mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  #box(group, width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
}
