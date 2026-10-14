import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { addVerticalShade } from './Shading.js';

export const WINDOW_DARK = new THREE.Color(0x241c14);
const WALL_HEIGHT = 10;
const SHARED = {
  taipa: new THREE.MeshLambertMaterial({ color: PALETTE.taipa, vertexColors: true }),
  taipaDark: new THREE.MeshLambertMaterial({ color: PALETTE.taipaDark }),
  whitewash: new THREE.MeshLambertMaterial({ color: PALETTE.whitewash, vertexColors: true }),
  roofMud: new THREE.MeshLambertMaterial({ color: PALETTE.roofMud }),
  roofTile: new THREE.MeshLambertMaterial({ color: PALETTE.roofTile }),
  stick: new THREE.MeshLambertMaterial({ color: PALETTE.stick }),
  doorway: new THREE.MeshLambertMaterial({ color: 0x2a2018 }),
  door: new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
  sack: new THREE.MeshLambertMaterial({ color: 0xcbb98f }),
  stone: new THREE.MeshLambertMaterial({ color: 0xa89a82, vertexColors: true }),
  stoneDark: new THREE.MeshLambertMaterial({ color: 0x8a7c66 }),
  goatWhite: new THREE.MeshLambertMaterial({ color: 0xe6e0d2 }),
  goatBrown: new THREE.MeshLambertMaterial({ color: 0x7a5a3c }),
  goatBlack: new THREE.MeshLambertMaterial({ color: 0x3a3430 }),
  horn: new THREE.MeshLambertMaterial({ color: 0xcfc4a8 }),
  base: new THREE.MeshLambertMaterial({ color: 0x9a8a72 })
};
const SHARED_MATERIALS = new Set(Object.values(SHARED));

// As construções de Belo Monte. As casas eram de taipa — pau-a-pique: uma trama de
// varas barreada à mão —, baixas, de uma porta e uma janela, cobertas de barro sobre
// varas, coladas umas nas outras em becos estreitos (Euclides da Cunha contou mais
// de cinco mil). Em obra, aparece a trama de varas e o barro subindo. O armazém é
// uma casa maior, com alpendre e sacos de farinha à porta. A igreja de Santo
// Antônio, a "igreja velha" na praça, é caiada de branco, de telha de barro, com a
// torre sineira e o cruzeiro de madeira em frente.
// Orientação: a fachada (porta) fica no +x local, que o giro do grupo vira para o
// lado da porta na simulação; o comprido da casa corre em z.
export class SertaoBuildingModel {
  build(kind, progress, built, size) {
    const group = new THREE.Group();
    const parts = { group, windows: null };
    if (kind === 'hall') this.#church(group, parts, size);
    else if (kind === 'igrejanova') this.#newChurch(group, parts, progress, built, size);
    else if (kind === 'curral') this.#pen(group, progress, built, size);
    else this.#house(group, parts, kind, progress, built, size);
    return parts;
  }

  // Descarta só o que é da construção (formas e o material da janela).
  dispose(group) {
    group.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      if (!SHARED_MATERIALS.has(node.material)) node.material.dispose();
    });
  }

  #house(group, parts, kind, progress, built, size) {
    const front = size.depth * .8, long = size.width * .82;
    const halfF = front / 2, halfL = long / 2;
    const seed = size.width * 13 + size.depth * 7 + (kind === 'lodge' ? 50 : 0);
    // Rodapé de pedra solta, onde a parede encosta no chão.
    this.#box(group, front + 1, .8, long + 1, SHARED.base, 0, .4, 0);
    const height = WALL_HEIGHT * (built ? 1 : Math.max(.08, progress));
    if (!built || progress < 1) {
      // A trama de varas do pau-a-pique, em pé no contorno da casa.
      for (let i = 0; i <= 6; i++) {
        const t = i / 6 * 2 - 1;
        for (const [x, z] of [[halfF, t * halfL], [-halfF, t * halfL], [t * halfF, halfL], [t * halfF, -halfL]]) {
          this.#box(group, .5, WALL_HEIGHT + 1, .5, SHARED.stick, x, (WALL_HEIGHT + 1) / 2, z);
        }
      }
      for (const y of [3, 6.5, 10]) {
        this.#box(group, .4, .4, long, SHARED.stick, halfF, y, 0);
        this.#box(group, .4, .4, long, SHARED.stick, -halfF, y, 0);
      }
    }
    // O barro, subindo com a obra.
    this.#box(group, front, height, long, SHARED.taipa, 0, .8 + height / 2, 0, true);
    if (!built) return;
    // Remendos onde o reboco caiu e a trama aparece.
    for (let i = 0; i < 3; i++) {
      const side = pseudoRandom(seed + i) > .5 ? 1 : -1;
      const z = (pseudoRandom(seed + i + 3) - .5) * long * .7;
      const y = 3 + pseudoRandom(seed + i + 6) * 5;
      this.#box(group, .3, 1.4 + pseudoRandom(seed + i) * 1.4, 2 + pseudoRandom(seed + i + 9) * 2,
        SHARED.taipaDark, side * (halfF + .05), y, z);
    }
    // Porta e janela na fachada.
    const doorZ = -long * .18;
    this.#box(group, .4, 7, 4, SHARED.doorway, halfF + .05, .8 + 3.5, doorZ);
    const leaf = this.#box(group, .5, 6.8, 3.8, SHARED.door, halfF + 1.4, .8 + 3.4, doorZ + 1.6);
    leaf.rotation.y = .9;
    const windows = new THREE.MeshLambertMaterial({ color: WINDOW_DARK });
    this.#box(group, .4, 2.6, 2.8, windows, halfF + .05, 6.6, long * .22);
    parts.windows = windows.color;
    // Telhado baixo de barro sobre varas, com beiral.
    this.#roof(group, front + 2.4, long + 2.4, 2.8, .8 + WALL_HEIGHT, SHARED.roofMud);
    if (kind === 'lodge') {
      // Alpendre: esteios, uma cobertura rasa de varas e barro, sacos à porta.
      for (const z of [-halfL + 1, 0, halfL - 1]) this.#box(group, .9, 8.6, .9, SHARED.stick, halfF + 7, 4.3, z);
      this.#box(group, 7.6, .7, long + 1, SHARED.roofMud, halfF + 3.6, 8.9, 0, false, -.12);
      for (let i = 0; i < 4; i++) {
        this.#box(group, 2.2, 2.4, 1.8, SHARED.sack, halfF + 2.4 + (i % 2) * 2.4, 1.2 + Math.floor(i / 2) * 1.6,
          long * .2 + (i % 2) * .8, true);
      }
    }
  }

  #church(group, parts, size) {
    const nave = size.width * .78, wide = 20;
    const halfN = nave / 2, halfW = wide / 2;
    const wall = 24;
    this.#box(group, nave + 2, 1, wide + 2, SHARED.base, 0, .5, 0);
    this.#box(group, nave, wall, wide, SHARED.whitewash, 0, 1 + wall / 2, 0, true);
    this.#roof(group, wide + 2, nave + 1, 6, 1 + wall, SHARED.roofTile, true);
    // Frontão: a fachada sobe acima do telhado, com o remate em degraus e a cruz.
    const faceX = halfN + .6;
    this.#box(group, 1.4, 6, wide, SHARED.whitewash, faceX, 1 + wall + 3, 0, true);
    this.#box(group, 1.4, 3, wide * .55, SHARED.whitewash, faceX, 1 + wall + 7.5, 0, true);
    this.#box(group, .8, 5, .8, SHARED.door, faceX, 1 + wall + 11.5, 0);
    this.#box(group, .8, .8, 3, SHARED.door, faceX, 1 + wall + 12.4, 0);
    // Porta grande e duas janelas altas.
    this.#box(group, .5, 13, 6, SHARED.doorway, faceX + .5, 1 + 6.5, 0);
    const windows = new THREE.MeshLambertMaterial({ color: WINDOW_DARK });
    for (const z of [-halfW * .6, halfW * .6]) this.#box(group, .5, 4.4, 2.4, windows, faceX + .5, 1 + 16, z);
    // Óculo redondo no alto do frontão.
    this.#box(group, .5, 2.2, 2.2, windows, faceX + .75, 1 + wall + 2.6, 0);
    parts.windows = windows.color;
    // Torre sineira no canto da fachada, com a abertura do sino e o capuz de telha.
    const towerZ = halfW + 3;
    const towerHeight = wall + 16;
    this.#box(group, 7, towerHeight, 7, SHARED.whitewash, halfN - 3, 1 + towerHeight / 2, towerZ, true);
    this.#box(group, 7.2, 3.4, 4, SHARED.doorway, halfN - 3, 1 + towerHeight - 4, towerZ);
    this.#box(group, 1.8, 2, 1.8, SHARED.base, halfN - 3, 1 + towerHeight - 4.5, towerZ);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(5.6, 5, 4).rotateY(Math.PI / 4), SHARED.roofTile);
    cap.position.set(halfN - 3, 1 + towerHeight + 2.5, towerZ);
    cap.castShadow = true;
    group.add(cap);
    // O cruzeiro de madeira no adro, em frente à porta.
    const crossX = faceX + 6, crossZ = -halfW - 4;
    this.#box(group, 1.4, 18, 1.4, SHARED.door, crossX, 9, crossZ);
    this.#box(group, 1.4, 1.4, 8, SHARED.door, crossX, 14, crossZ);
    this.#box(group, 4.4, 1.6, 4.4, SHARED.base, crossX, .8, crossZ);
  }

  // A igreja nova: "retangular, e vasto, e pesado", de paredes mestras espessas, de
  // pedra; inacabada, sem telhado, com as duas torres da fachada ainda nos andaimes
  // — de onde os jagunços atiravam. Em obra, as paredes sobem do chão.
  #newChurch(group, parts, progress, built, size) {
    const long = size.width * 1.02, wide = size.depth * 1.02;
    const halfL = long / 2, halfW = wide / 2;
    const wall = 20 * (built ? 1 : Math.max(.08, progress));
    const thick = 2.6;
    this.#box(group, long + 2, 1.2, wide + 2, SHARED.base, 0, .6, 0);
    // Paredes: fundo, laterais e a fachada (no +x) com o vão da porta.
    this.#box(group, thick, wall, wide, SHARED.stone, -halfL + thick / 2, 1.2 + wall / 2, 0, true);
    for (const side of [-1, 1]) this.#box(group, long, wall, thick, SHARED.stone, 0, 1.2 + wall / 2, side * (halfW - thick / 2), true);
    for (const side of [-1, 1]) {
      this.#box(group, thick, wall, wide / 2 - 4, SHARED.stone, halfL - thick / 2, 1.2 + wall / 2, side * (wide / 4 + 2), true);
    }
    // Fiadas de pedra mais escura marcando a alvenaria.
    for (let y = 4; y < wall; y += 5) {
      for (const side of [-1, 1]) this.#box(group, long + .2, .6, thick + .2, SHARED.stoneDark, 0, 1.2 + y, side * (halfW - thick / 2));
    }
    // Chão de terra dentro da nave.
    this.#box(group, long - thick * 2, .5, wide - thick * 2, SHARED.roofMud, 0, 1.3, 0);
    if (!built) return;
    if (wall > 4) this.#box(group, thick + .2, 4, 8, SHARED.stone, halfL - thick / 2, 1.2 + wall - 2, 0, true);
    // As duas torres da fachada, mais altas que as paredes, abertas em cima.
    const towerHeight = 32;
    for (const side of [-1, 1]) {
      const z = side * (halfW - 4);
      const x = halfL - 4;
      this.#box(group, 9, towerHeight, 9, SHARED.stone, x, 1.2 + towerHeight / 2, z, true);
      this.#box(group, 9.4, 1, 9.4, SHARED.stoneDark, x, 1.2 + towerHeight, z);
      // Seteiras: os vãos estreitos de onde se atirava.
      for (const y of [14, 22]) this.#box(group, .5, 3, 1.2, SHARED.doorway, x + 4.6, 1.2 + y, z);
      // Andaime de varas encostado à torre.
      for (const dz of [-5.5, 5.5]) this.#box(group, .5, towerHeight + 4, .5, SHARED.stick, x + 5.6, 1.2 + (towerHeight + 4) / 2, z + dz);
      for (let y = 6; y < towerHeight + 3; y += 6) this.#box(group, .4, .4, 11.5, SHARED.stick, x + 5.6, 1.2 + y, z);
    }
    this.#box(group, .5, 12, 7, SHARED.doorway, halfL + .05, 1.2 + 6, 0);
  }

  // Curral de cabras: cerca de varas fincadas com duas travessas, a porteira, o cocho
  // de madeira e as cabras, de três pelagens.
  #pen(group, progress, built, size) {
    const wide = size.width * .9, deep = size.depth * .9;
    const halfW = wide / 2, halfD = deep / 2;
    const share = built ? 1 : Math.max(.1, progress);
    const posts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8 * 2 - 1;
      posts.push([t * halfD, -halfW], [t * halfD, halfW]);
      if (i % 2 === 0) posts.push([-halfD, t * halfW]);
      if (i % 2 === 0 && Math.abs(t) > .3) posts.push([halfD, t * halfW]);
    }
    posts.slice(0, Math.ceil(posts.length * share)).forEach(([x, z], i) => {
      const tall = 5 + ((i * 37) % 7) * .25;
      this.#box(group, .7, tall, .7, SHARED.stick, x, tall / 2, z);
    });
    if (!built) return;
    for (const y of [2, 4]) {
      for (const side of [-1, 1]) this.#box(group, deep, .45, .45, SHARED.stick, 0, y, side * halfW);
      this.#box(group, .45, .45, wide, SHARED.stick, -halfD, y, 0);
      for (const side of [-1, 1]) this.#box(group, .45, .45, wide * .35, SHARED.stick, halfD, y, side * wide * .33);
    }
    // Cocho.
    this.#box(group, 2, 1.2, 7, SHARED.door, -halfD + 3, .6, 0);
    const coats = [SHARED.goatWhite, SHARED.goatBrown, SHARED.goatBlack];
    for (let i = 0; i < 6; i++) {
      const x = (pseudoRandom(i * 3.1 + wide) - .5) * deep * .7;
      const z = (pseudoRandom(i * 5.7 + deep) - .5) * wide * .7;
      const turn = pseudoRandom(i * 1.3) * Math.PI * 2;
      const goat = new THREE.Group();
      goat.position.set(x, 0, z);
      goat.rotation.y = turn;
      const coat = coats[i % 3];
      const part = (w, h, d, material, px, py, pz) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(px, py, pz);
        mesh.castShadow = true;
        goat.add(mesh);
      };
      part(1.8, 1.8, 3.4, coat, 0, 2.5, 0);
      part(1.2, 1.4, 1.6, coat, 0, 3.6, 2.1);
      part(.3, 1, .3, SHARED.horn, -.35, 4.6, 1.8);
      part(.3, 1, .3, SHARED.horn, .35, 4.6, 1.8);
      for (const [lx, lz] of [[-.6, -1.2], [.6, -1.2], [-.6, 1.2], [.6, 1.2]]) part(.4, 1.6, .4, coat, lx, .8, lz);
      group.add(goat);
    }
  }

  // Telhado de duas águas, cumeeira ao longo de z: um prisma triangular.
  #roof(group, spanX, lengthZ, rise, y, material, ridgeAlongX = false) {
    const shape = new THREE.Shape();
    shape.moveTo(-spanX / 2, 0);
    shape.lineTo(spanX / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: lengthZ, bevelEnabled: false });
    geometry.translate(0, 0, -lengthZ / 2);
    const roof = new THREE.Mesh(geometry, material);
    roof.position.y = y;
    if (ridgeAlongX) roof.rotation.y = Math.PI / 2;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
  }

  #box(group, x, y, z, material, px, py, pz, shaded = false, tilt = 0) {
    const geometry = new THREE.BoxGeometry(x, y, z);
    if (shaded) addVerticalShade(geometry, .78, 1.04);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(px, py, pz);
    mesh.rotation.z = tilt;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
}
