import * as THREE from 'three';

const FLAG_SEGMENTS = 10;
const POLE_SHAPE = new THREE.CylinderGeometry(.35, .45, 22, 6);
const POLE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
const KNOB_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa27a4e });

// Bandeira num mastro: o pano é uma faixa subdividida cujos vértices são empurrados
// a cada quadro por uma onda que nasce presa ao mastro e cresce até a ponta solta.
export class FlagModel {
  get sharedGeometries() {
    return [POLE_SHAPE];
  }

  get sharedMaterials() {
    return [POLE_MATERIAL, KNOB_MATERIAL];
  }

  create(color, phase) {
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(POLE_SHAPE, POLE_MATERIAL);
    pole.position.y = 11;
    pole.castShadow = true;
    flag.add(pole);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.7, 8, 6), KNOB_MATERIAL);
    knob.position.y = 22.2;
    flag.add(knob);
    const clothShape = new THREE.PlaneGeometry(8, 5, FLAG_SEGMENTS, 2).translate(4, 0, 0);
    const cloth = new THREE.Mesh(clothShape, new THREE.MeshLambertMaterial({
      color, side: THREE.DoubleSide }));
    cloth.position.y = 19;
    cloth.castShadow = true;
    flag.add(cloth);
    return {
      group: flag,
      cloth,
      rest: Float32Array.from(clothShape.attributes.position.array),
      phase
    };
  }

  wave(flag, elapsed, animate) {
    const position = flag.cloth.geometry.attributes.position;
    const rest = flag.rest;
    for (let i = 0; i < position.count; i++) {
      const x = rest[i * 3];
      const reach = x / 8;
      const wave = animate
        ? Math.sin(x * .7 - elapsed * 5.5 + flag.phase) * 1.1 * reach
        : Math.sin(x * .7) * .6 * reach;
      position.setZ(i, rest[i * 3 + 2] + wave);
      // A ponta cede um pouco com o próprio peso.
      position.setY(i, rest[i * 3 + 1] - reach * reach * .8);
    }
    position.needsUpdate = true;
    flag.cloth.geometry.computeVertexNormals();
  }
}
