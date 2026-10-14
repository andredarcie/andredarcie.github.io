import * as THREE from 'three';
import { groundHeight } from './PondShape.js';

const MAX_STAINS = 640;
const MAX_DROPS = 520;
const FRESH = new THREE.Color(0x9a0b12);
const DRIED = new THREE.Color(0x4a1a12);

// Mancha de contorno torto (raio ~1), deitada no chão: com giro e esticão sorteados
// por mancha, nenhuma sai igual à outra.
function splatGeometry() {
  const shape = new THREE.Shape();
  const points = 18;
  for (let i = 0; i <= points; i++) {
    const angle = i / points * Math.PI * 2;
    const r = .78 + .22 * Math.sin(angle * 3 + 1.3) * Math.cos(angle * 5);
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

// O sangue na cena: manchas e poças no chão e as gotas voando. Fica na cena 3D, e
// não na sobreposição 2D, para o boneco em pé tapar a poça embaixo dele em vez de
// a poça ser pintada por cima das pernas. Tudo instanciado: duas chamadas de
// desenho, por mais sangue que haja. Cada mancha tem opacidade própria (atributo
// por instância): fresca é vermelho vivo, secando escurece e desbota.
export class BloodRenderer {
  #space;
  #stains;
  #drops;
  #alpha;
  #matrix = new THREE.Matrix4();
  #rotation = new THREE.Quaternion();
  #position = new THREE.Vector3();
  #scale = new THREE.Vector3();
  #color = new THREE.Color();
  #up = new THREE.Vector3(0, 1, 0);

  constructor(layer, space) {
    this.#space = space;
    const geometry = splatGeometry();
    this.#alpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX_STAINS), 1);
    geometry.setAttribute('instanceAlpha', this.#alpha);
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float instanceAlpha;\nvarying float vBloodAlpha;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBloodAlpha = instanceAlpha;');
      shader.fragmentShader = 'varying float vBloodAlpha;\n' +
        shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vBloodAlpha;');
    };
    this.#stains = new THREE.InstancedMesh(geometry, material, MAX_STAINS);
    this.#stains.count = 0;
    this.#stains.frustumCulled = false;
    this.#stains.receiveShadow = true;
    this.#stains.setColorAt(0, FRESH);
    this.#drops = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, .9, .9),
      new THREE.MeshLambertMaterial({ color: 0xb3121b }), MAX_DROPS);
    this.#drops.count = 0;
    this.#drops.frustumCulled = false;
    layer.add(this.#stains, this.#drops);
  }

  sync(stains, drops, { ponds = [], animate = true } = {}) {
    const mesh = this.#stains;
    const count = Math.min(MAX_STAINS, stains.length);
    const first = stains.length - count;
    for (let i = 0; i < count; i++) {
      const stain = stains[first + i];
      const age = stain.time / stain.life;
      const grown = stain.grow > 0 ? Math.min(1, stain.time / stain.grow) : 1;
      const radius = stain.radius * (.35 + .65 * Math.sqrt(grown));
      const place = this.#space.toScene(stain.x, stain.y);
      this.#position.set(place.x, groundHeight(stain.x, stain.y, ponds) + .08, place.z);
      this.#rotation.setFromAxisAngle(this.#up, stain.seed);
      const stretch = 1 + (stain.seed % 1) * .5;
      this.#scale.set(radius * stretch, 1, radius / stretch);
      this.#matrix.compose(this.#position, this.#rotation, this.#scale);
      mesh.setMatrixAt(i, this.#matrix);
      mesh.setColorAt(i, this.#color.copy(FRESH).lerp(DRIED, Math.min(1, age * 2.2)));
      this.#alpha.array[i] = .88 * (1 - age * age);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.#alpha.needsUpdate = true;

    // Gotas no ar: cubinhos que caem; sem animação, nem aparecem.
    const air = this.#drops;
    const dropCount = animate ? Math.min(MAX_DROPS, drops.length) : 0;
    this.#rotation.identity();
    for (let i = 0; i < dropCount; i++) {
      const drop = drops[i];
      const place = this.#space.toScene(drop.x, drop.y);
      this.#position.set(place.x, Math.max(.3, drop.z), place.z);
      this.#scale.setScalar(1);
      this.#matrix.compose(this.#position, this.#rotation, this.#scale);
      air.setMatrixAt(i, this.#matrix);
    }
    air.count = dropCount;
    air.instanceMatrix.needsUpdate = true;
  }
}
