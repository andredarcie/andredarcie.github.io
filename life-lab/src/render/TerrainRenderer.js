import * as THREE from 'three';
import { PALETTE } from './Palette.js';
import { BOARD_THICKNESS } from '../config/world.js';
import { rimWobble, pondSeed, bedHeight } from './PondShape.js';

// Ordem das faces no BoxGeometry do three.js: +x, −x, +y, −y, +z, −z.
const SIDE_FACES = Object.freeze({ east: 0, west: 1, south: 4, north: 5 });
// Malha do chão: uma célula a cada ~2,5 unidades num mundo de 407, fina o bastante
// para a tigela do menor lago (raio 22) ter curva e não degraus.
const GROUND_CELL = 2.5;
// A lama molhada vai além da água: até este múltiplo do raio cheio.
const WET_REACH = 1.28;

// O chão: o mundo é um tabuleiro flutuando no céu. Em cima, a malha com os biomas,
// que afunda em tigela onde há lago; embaixo dela, um bloco de terra de bordas retas,
// com as laterais mostrando o corte (grama, terra, argila, rocha).
export class TerrainRenderer {
  #renderer;
  #world;
  #ground;
  #block;
  #pondSignature = null;

  constructor(scene, renderer, world) {
    this.#renderer = renderer;
    this.#world = world;
    const columns = Math.ceil(world.width / GROUND_CELL);
    const rows = Math.ceil(world.height / GROUND_CELL);
    const geometry = new THREE.PlaneGeometry(world.width, world.height, columns, rows)
      .rotateX(-Math.PI / 2);
    // Cor por vértice: 1 no chão seco, mais escura na lama em volta e no fundo do lago.
    geometry.setAttribute('color', new THREE.BufferAttribute(
      new Float32Array(geometry.attributes.position.count * 3).fill(1), 3));
    this.#ground = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })
    );
    // Um fio acima do topo do bloco: nas bordas as duas superfícies se encontram.
    this.#ground.position.y = .05;
    this.#ground.receiveShadow = true;
    scene.add(this.#ground);

    // Laterais começam lisas na cor da terra e ganham a textura do corte depois. O
    // topo do bloco não é desenhado: o chão é quem fecha o tabuleiro por cima, e um
    // topo chato tamparia o buraco dos lagos. O fundo é rocha.
    const soil = () => new THREE.MeshLambertMaterial({ color: PALETTE.soilTop });
    const bottom = new THREE.MeshLambertMaterial({ color: PALETTE.bedrockDark });
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    this.#block = new THREE.Mesh(
      new THREE.BoxGeometry(world.width, BOARD_THICKNESS, world.height),
      [soil(), soil(), hidden, bottom, soil(), soil()]
    );
    this.#block.position.y = -BOARD_THICKNESS / 2;
    this.#block.receiveShadow = true;
    scene.add(this.#block);
  }

  // A vista é bem oblíqua: sem anisotropia o chão vira um borrão no fundo.
  setGroundTexture(source) {
    this.#ground.material.map = this.#texture(source);
    this.#ground.material.needsUpdate = true;
  }

  // `sources`: { east, west, south, north } → canvas do corte daquela lateral.
  setSideTextures(sources) {
    for (const [side, source] of Object.entries(sources)) {
      const material = this.#block.material[SIDE_FACES[side]];
      material.color.set(0xffffff);
      material.map = this.#texture(source);
      material.needsUpdate = true;
    }
  }

  // Cava as tigelas dos lagos. Só refaz quando algum lago surge, some ou muda de
  // lugar — o nível da água sobe e desce sem mexer no chão.
  syncPonds(ponds) {
    const signature = ponds.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.fullRadius.toFixed(1)}`).join(';');
    if (signature === this.#pondSignature) return;
    this.#pondSignature = signature;
    const world = this.#world;
    const geometry = this.#ground.geometry;
    const position = geometry.attributes.position;
    const color = geometry.attributes.color;
    const shapes = ponds.map(pond => ({ pond, seed: pondSeed(pond) }));
    for (let i = 0; i < position.count; i++) {
      const worldX = position.getX(i) + world.width / 2;
      const worldY = position.getZ(i) + world.height / 2;
      let height = 0, shade = 1;
      for (const { pond, seed } of shapes) {
        const dx = worldX - pond.x, dy = worldY - pond.y;
        const reach = pond.fullRadius * WET_REACH * 1.2;
        if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        const normalized = Math.hypot(dx, dy) / (pond.fullRadius * rimWobble(Math.atan2(dy, dx), seed));
        height = Math.min(height, bedHeight(normalized, pond.fullRadius));
        // Lama: escurece chegando na borda e mais ainda descendo a tigela.
        if (normalized < WET_REACH) {
          const bank = Math.min(1, (WET_REACH - normalized) / (WET_REACH - .85));
          const bed = normalized < 1 ? (1 - normalized) : 0;
          shade = Math.min(shade, 1 - bank * bank * .34 - bed * .22);
        }
      }
      position.setY(i, height);
      color.setXYZ(i, shade, shade * .97, shade * .93);
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  #texture(source) {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.#renderer.capabilities.getMaxAnisotropy();
    return texture;
  }
}
