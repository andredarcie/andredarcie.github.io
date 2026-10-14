import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { hutSize } from '../settlement/HutDimensions.js';

// Tufos por unidade de área, e quanto cada bioma tem do máximo. A clareira do meio,
// de terra batida, fica quase pelada.
const TUFTS_PER_AREA = 1 / 62;
const BIOME_DENSITY = Object.freeze({ desert: .16, taiga: .75, savanna: 1 });
const CLEARING_RADIUS = .29;
const CLEARING_DENSITY = .12;
const BLADES_PER_TUFT = 5;

// Um tufo: algumas folhas finas em leque, cada uma um triângulo afinando até a
// ponta. Altura 1 (a instância escala); a normal aponta para cima em todas, para o
// capim pegar a mesma luz do chão em que nasce e não virar um pisca-pisca de faces.
function buildTuft() {
  const positions = [], normals = [], colors = [];
  for (let blade = 0; blade < BLADES_PER_TUFT; blade++) {
    const angle = blade / BLADES_PER_TUFT * Math.PI * 2 + pseudoRandom(blade * 7 + 1) * .8;
    const spread = .35 + pseudoRandom(blade * 7 + 2) * .45;
    const lean = .25 + pseudoRandom(blade * 7 + 3) * .35;
    const height = .7 + pseudoRandom(blade * 7 + 4) * .3;
    const baseX = Math.cos(angle) * spread, baseZ = Math.sin(angle) * spread;
    // Folha perpendicular ao raio do leque, para ser vista de lado de qualquer ângulo.
    const sideX = -Math.sin(angle) * .22, sideZ = Math.cos(angle) * .22;
    const tipX = baseX + Math.cos(angle) * lean, tipZ = baseZ + Math.sin(angle) * lean;
    positions.push(
      baseX - sideX, 0, baseZ - sideZ,
      baseX + sideX, 0, baseZ + sideZ,
      tipX, height, tipZ
    );
    for (let v = 0; v < 3; v++) normals.push(0, 1, 0);
    // Pé escuro, ponta clara: é o que faz a massa de capim ter volume.
    colors.push(.55, .55, .55, .55, .55, .55, 1.18, 1.18, 1.18);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

// Capim rasteiro em 3D por cima da textura do chão: milhares de tufos numa única
// chamada de desenho (InstancedMesh), na cor do bioma logo embaixo, balançando com o
// vento no próprio shader — a CPU não mexe em tufo nenhum por quadro. Some onde há
// água ou cabana, para não furar a poça nem o piso.
export class GrassRenderer {
  #layer;
  #space;
  #mesh = null;
  #tufts = [];
  #uniforms = { uTime: { value: 0 }, uWind: { value: 0 } };
  #maskSignature = '';
  #matrix = new THREE.Matrix4();
  #hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  #rotation = new THREE.Quaternion();
  #scale = new THREE.Vector3();
  #position = new THREE.Vector3();
  #up = new THREE.Vector3(0, 1, 0);

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  // Semeia os tufos uma vez: onde, de que tamanho e de que cor. `toneAt(x, y)` dá a
  // cor do chão em [r, g, b] 0..255; `biomeAt(x, y)` o bioma.
  plant({ toneAt, biomeAt }) {
    const world = this.#space.world;
    const attempts = Math.round(world.width * world.height * TUFTS_PER_AREA);
    const clearing = Math.min(world.width, world.height) * CLEARING_RADIUS;
    const tufts = [];
    for (let i = 0; i < attempts; i++) {
      const seed = i * 11 + 90001;
      const x = 3 + pseudoRandom(seed) * (world.width - 6);
      const y = 3 + pseudoRandom(seed + 1) * (world.height - 6);
      let chance = BIOME_DENSITY[biomeAt(x, y)] ?? .5;
      if (Math.hypot(x - world.width / 2, y - world.height / 2) < clearing) chance *= CLEARING_DENSITY;
      if (pseudoRandom(seed + 2) > chance) continue;
      const tone = toneAt(x, y);
      const tint = .95 + pseudoRandom(seed + 3) * .25;
      tufts.push({
        x, y,
        height: 2.2 + pseudoRandom(seed + 4) * 2.4,
        width: 1.4 + pseudoRandom(seed + 5) * 1.2,
        turn: pseudoRandom(seed + 6) * Math.PI * 2,
        color: new THREE.Color().setRGB(
          Math.min(1, tone[0] / 255 * tint * .92),
          Math.min(1, tone[1] / 255 * tint * 1.04),
          Math.min(1, tone[2] / 255 * tint * .9),
          THREE.SRGBColorSpace)
      });
    }
    this.#tufts = tufts;
    if (this.#mesh) this.#layer.remove(this.#mesh);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    material.onBeforeCompile = shader => this.#addWind(shader);
    const mesh = new THREE.InstancedMesh(buildTuft(), material, Math.max(1, tufts.length));
    mesh.count = tufts.length;
    mesh.receiveShadow = true;
    // Os tufos cobrem o tabuleiro todo; a caixa da geometria de um tufo só não serve
    // para descartar o conjunto fora da tela.
    mesh.frustumCulled = false;
    tufts.forEach((tuft, index) => mesh.setColorAt(index, tuft.color));
    this.#mesh = mesh;
    this.#layer.add(mesh);
    this.#maskSignature = '';
  }

  sync({ ponds = [], huts = [], elapsed = 0, wind = 0 } = {}) {
    if (!this.#mesh) return;
    this.#uniforms.uTime.value = elapsed;
    this.#uniforms.uWind.value = wind;
    // Máscara só é refeita quando poça ou cabana muda de lugar ou de tamanho.
    const signature = ponds.map(p => `${p.x | 0},${p.y | 0},${p.fullRadius | 0}`).join(';') + '|' +
      huts.map(h => `${h.x | 0},${h.y | 0},${h.capacity}`).join(';');
    if (signature === this.#maskSignature) return;
    this.#maskSignature = signature;
    this.#layout(ponds, huts);
  }

  #layout(ponds, huts) {
    const mesh = this.#mesh;
    this.#tufts.forEach((tuft, index) => {
      const covered = ponds.some(p => Math.hypot(tuft.x - p.x, tuft.y - p.y) < p.fullRadius + 2) ||
        huts.some(h => {
          const size = hutSize(h.capacity);
          return Math.hypot(tuft.x - h.x, tuft.y - h.y) < Math.max(size.width, size.depth) * .62;
        });
      if (covered) {
        mesh.setMatrixAt(index, this.#hidden);
        return;
      }
      const place = this.#space.toScene(tuft.x, tuft.y);
      this.#position.set(place.x, 0, place.z);
      this.#rotation.setFromAxisAngle(this.#up, tuft.turn);
      this.#scale.set(tuft.width, tuft.height, tuft.width);
      mesh.setMatrixAt(index, this.#matrix.compose(this.#position, this.#rotation, this.#scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Vento no vértice: depois de posicionar o tufo no mundo, a ponta (quadrado da
  // altura, então o pé fica parado) é empurrada numa direção comum a todos — é vento,
  // não tremedeira —, com a fase pela posição, para a rajada correr pelo campo.
  #addWind(shader) {
    shader.uniforms.uTime = this.#uniforms.uTime;
    shader.uniforms.uWind = this.#uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        float bend = position.y * position.y;
        float gust = sin( uTime * 1.7 + mvPosition.x * .045 + mvPosition.z * .03 );
        float flutter = sin( uTime * 4.3 + mvPosition.x * .21 - mvPosition.z * .17 ) * .3;
        mvPosition.x += ( gust + flutter ) * uWind * bend * 1.1;
        mvPosition.z += ( gust * .6 - flutter ) * uWind * bend * .7;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
      `);
  }
}
