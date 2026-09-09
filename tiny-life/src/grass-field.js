import * as THREE from 'three';
import { rand, pick, TAU } from './math.js';
import { BLADES } from './palette.js';

const MAX_BLADES = 14000;
const AREA_PER_BLADE = 52;   // px² de grama por lâmina

/**
 * O gramado em volta do terreiro, como geometria de verdade.
 *
 * Uma lâmina só, repetida por InstancedMesh: 14 mil tufos custam um desenho.
 * A posição sai da mesma máscara que a formiga usa pra saber onde é chão, então
 * a grama nasce exatamente onde ela não pode pisar.
 */
export class GrassField {
  constructor() {
    this.mesh = null;
    this.geometry = null;
    this.material = null;
  }

  build(shape, width, height) {
    this.dispose();

    this.geometry = bladeGeometry();
    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    });

    const want = Math.min(MAX_BLADES, Math.round((width * height - shape.area) / AREA_PER_BLADE));
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, Math.max(1, want));

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    const wind = Math.random() * TAU;

    let placed = 0, tries = 0;
    while (placed < want && tries < want * 6) {
      tries++;
      const x = Math.random() * width;
      const y = Math.random() * height;
      if (shape.valueAt(x, y) > 0.004) continue;   // aqui é terra, não planta

      // O tufo nasce mais alto quanto mais longe da terra: na beirada o pisoteio
      // deixa a grama baixa.
      const edge = Math.min(1, -shape.valueAt(x, y) * 6 + 0.35);
      const h = rand(9, 24) * (0.55 + 0.45 * edge);

      pos.set(x - width / 2, 0, y - height / 2);
      euler.set(rand(-0.35, 0.35), wind + rand(-1.1, 1.1), rand(-0.4, 0.4));
      q.setFromEuler(euler);
      scale.set(rand(0.8, 1.3), h / 16, 1);
      m.compose(pos, q, scale);
      mesh.setMatrixAt(placed, m);

      color.set(pick(BLADES));
      mesh.setColorAt(placed, color);
      placed++;
    }

    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;

    this.mesh = mesh;
    return mesh;
  }

  dispose() {
    this.mesh?.removeFromParent();
    this.geometry?.dispose();
    this.material?.dispose();
    this.geometry = this.material = this.mesh = null;
  }
}

/**
 * Uma lâmina: fita de quatro segmentos que afina e curva pra frente, escura na
 * base e clara na ponta. A cor por vértice multiplica a cor da instância, então
 * cada tufo mantém o próprio tom e ainda ganha o degradê.
 */
function bladeGeometry(segments = 4, height = 16, width = 1.9) {
  const position = [];
  const color = [];
  const index = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w = (width * (1 - t * 0.85)) / 2;
    const y = height * t;
    const z = t * t * height * 0.42;          // curvatura
    const shade = 0.55 + 0.45 * t;            // base na sombra, ponta no sol
    position.push(-w, y, z, w, y, z);
    color.push(shade, shade, shade, shade, shade, shade);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
