import * as THREE from 'three';
import { NEST_R, POP_RANGE } from './config.js';
import {
  HOME_STAIN, FOOD_STAIN, STAIN_ALPHA,
  ANT_HEX, QUEEN_HEX, LOAD_HEX, BROOD_HEX, SKY_HEX, SUN_HEX, BOUNCE_HEX
} from './palette.js';
import { GrassField } from './grass-field.js';
import { CameraRig } from './camera-rig.js';

const MAX_ANTS = POP_RANGE[1] + 40;
const MAX_BROOD = 400;
const MAX_GRAINS = 460;
const ANT_R = 1.15;          // raio do gáster — também a altura do corpo no chão
const GRASS_RISE = 7;        // quanto o gramado sobe em relação à terra
const FOV = 42;

/**
 * Renderizador 3D. Implementa a mesma interface do antigo renderizador 2D
 * (`resize`, `syncTo`, `draw`, `showTrails`), então a simulação inteira ficou
 * intacta: nada em world/ant/colony sabe que virou three.js.
 *
 * O que vem de graça da parte 2D: a textura do chão é o mesmo canvas que o
 * `Ground` já assava, e a mancha de feromônio é o mesmo cálculo de sempre,
 * só que num DataTexture em vez de um putImageData.
 */
export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.showTrails = true;

    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 5, 12000);
    this.rig = new CameraRig(this.camera, canvas);

    this.#lights();
    this.#swarm();

    this.grass = new GrassField();
    this.ground = null;
    this.stain = null;
    this.stainData = null;
    this.stainTex = null;
    this.nest = null;

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hit = new THREE.Vector3();
    this.ndc = new THREE.Vector2();

    this.matrix = new THREE.Matrix4();
    this.vec = new THREE.Vector3();
    this.color = new THREE.Color();
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.gl.setPixelRatio(Math.min(dpr, 2));
    this.gl.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Reconstrói tudo que é estático: chão, gramado, ninho e buffer da mancha. */
  syncTo(world) {
    this.rig.fitTo(world.width, world.height, FOV);
    this.#buildGround(world);
    this.#buildStain(world);
    this.#buildNest();
    this.scene.add(this.grass.build(world.terrain, world.width, world.height));
  }

  draw(world) {
    if (this.showTrails) this.#updateStain(world);
    this.stain.visible = this.showTrails;
    this.#updateAnts(world);
    this.#updateFood(world);
    this.#updateBrood(world.colony);
    this.#updateQueen(world, world.colony.queen);
    this.gl.render(this.scene, this.camera);
  }

  /** Converte um ponto da tela em coordenada de simulação, no plano do chão. */
  screenToSim(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)) return null;
    return [this.hit.x + this.width / 2, this.hit.z + this.height / 2];
  }

  // --- cena estática --------------------------------------------------------

  #lights() {
    // Céu frio por cima, terra quente refletindo por baixo: é o que faz o
    // gramado não ficar chapado sem custar sombra nenhuma.
    this.scene.add(new THREE.HemisphereLight(SKY_HEX, BOUNCE_HEX, 2.1));
    const sun = new THREE.DirectionalLight(SUN_HEX, 2.4);
    sun.position.set(420, 900, 260);
    this.scene.add(sun);
  }

  #buildGround(world) {
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      this.ground.material.map.dispose();
      this.ground.material.dispose();
    }

    const { width, height, terrain } = world;
    const geo = new THREE.PlaneGeometry(width, height, 120, 84);
    geo.rotateX(-Math.PI / 2);

    // O gramado fica num degrau acima do chão batido: a clareira é uma
    // depressão gastada na grama, não um adesivo colado nela.
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const sx = pos.getX(i) + width / 2;
      const sz = pos.getZ(i) + height / 2;
      const m = terrain.valueAt(sx, sz);
      const rise = m >= 0 ? 0 : Math.min(GRASS_RISE, -m * 55);
      pos.setY(i, rise);
    }
    geo.computeVertexNormals();

    const tex = new THREE.CanvasTexture(world.ground.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.gl.capabilities.getMaxAnisotropy();

    this.ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    this.scene.add(this.ground);
  }

  #buildStain(world) {
    if (this.stain) {
      this.scene.remove(this.stain);
      this.stain.geometry.dispose();
      this.stain.material.dispose();
      this.stainTex.dispose();
    }

    this.stainData = new Uint8Array(world.cols * world.rows * 4);
    this.stainTex = new THREE.DataTexture(this.stainData, world.cols, world.rows, THREE.RGBAFormat);
    this.stainTex.minFilter = THREE.LinearFilter;
    this.stainTex.magFilter = THREE.LinearFilter;
    this.stainTex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(world.width, world.height);
    geo.rotateX(-Math.PI / 2);
    this.stain = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: this.stainTex,
      transparent: true,
      depthWrite: false
    }));
    this.stain.position.y = 0.45;   // um fio acima da terra, pra não brigar em z
    this.scene.add(this.stain);
  }

  #buildNest() {
    if (this.nest) return;
    // Perfil girado: buraco, borda e o montinho de terra cavada em volta.
    const profile = [
      new THREE.Vector2(0.6, -7),
      new THREE.Vector2(NEST_R * 0.5, -5.5),
      new THREE.Vector2(NEST_R, 1.2),
      new THREE.Vector2(NEST_R + 11, 3.4),
      new THREE.Vector2(NEST_R + 27, 0)
    ];
    const geo = new THREE.LatheGeometry(profile, 40);
    this.nest = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color: 0x6b5238,
      side: THREE.DoubleSide
    }));
    this.scene.add(this.nest);
  }

  // --- povo -----------------------------------------------------------------

  #swarm() {
    const dark = new THREE.MeshLambertMaterial({ color: ANT_HEX });

    this.gaster = new THREE.InstancedMesh(new THREE.SphereGeometry(ANT_R, 7, 5), dark, MAX_ANTS);
    this.fore = new THREE.InstancedMesh(new THREE.SphereGeometry(0.8, 6, 4), dark, MAX_ANTS);
    this.load = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.75, 5, 4),
      new THREE.MeshLambertMaterial({ color: LOAD_HEX }),
      MAX_ANTS
    );
    this.brood = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshLambertMaterial({ vertexColors: false }),
      MAX_BROOD
    );
    this.grain = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshLambertMaterial({ vertexColors: false }),
      MAX_GRAINS
    );

    for (const mesh of [this.gaster, this.fore, this.load, this.brood, this.grain]) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
    }

    const queenMat = new THREE.MeshLambertMaterial({ color: QUEEN_HEX });
    this.queen = new THREE.Group();
    this.queenBack = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), queenMat);
    this.queenFore = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 6), queenMat);
    this.queen.add(this.queenBack, this.queenFore);
    this.scene.add(this.queen);
  }

  #updateAnts(world) {
    const ants = world.colony.ants;
    const n = Math.min(ants.length, MAX_ANTS);
    const ox = world.width / 2, oz = world.height / 2;
    let loads = 0;

    for (let i = 0; i < n; i++) {
      const a = ants[i];
      const c = Math.cos(a.head), s = Math.sin(a.head);
      const x = a.x - ox, z = a.y - oz;

      this.matrix.makeTranslation(x - c * 1.1, ANT_R, z - s * 1.1);
      this.gaster.setMatrixAt(i, this.matrix);

      this.matrix.makeTranslation(x + c * 1.2, ANT_R * 0.9, z + s * 1.2);
      this.fore.setMatrixAt(i, this.matrix);

      if (a.carrying) {
        this.matrix.makeTranslation(x + c * 2.6, ANT_R * 1.5, z + s * 2.6);
        this.load.setMatrixAt(loads++, this.matrix);
      }
    }

    this.gaster.count = n;
    this.fore.count = n;
    this.load.count = loads;
    this.gaster.instanceMatrix.needsUpdate = true;
    this.fore.instanceMatrix.needsUpdate = true;
    this.load.instanceMatrix.needsUpdate = true;
  }

  // Os montes de comida: cada grão é uma pedrinha, e o monte rareia sozinho
  // conforme as formigas levam.
  #updateFood(world) {
    const ox = world.width / 2, oz = world.height / 2;
    let n = 0;

    for (const src of world.foods) {
      const vis = src.visibleGrains;
      for (let i = 0; i < vis && n < MAX_GRAINS; i++) {
        const g = src.grains[i];
        this.vec.set(src.x + g.dx - ox, g.r * 0.7, src.y + g.dy - oz);
        this.matrix.makeScale(g.r, g.r * g.squash, g.r * 1.15);
        this.matrix.setPosition(this.vec);
        this.grain.setMatrixAt(n, this.matrix);
        this.grain.setColorAt(n, this.color.setHex(g.color));
        n++;
      }
    }

    this.grain.count = n;
    this.grain.instanceMatrix.needsUpdate = true;
    if (this.grain.instanceColor) this.grain.instanceColor.needsUpdate = true;
  }

  #updateBrood(colony) {
    const n = Math.min(colony.brood.length, MAX_BROOD);
    const ox = this.width / 2, oz = this.height / 2;

    for (let i = 0; i < n; i++) {
      const item = colony.brood[i];
      const r = item.radius;
      this.vec.set(item.x - ox, r * 0.8, item.y - oz);
      this.matrix.makeScale(r, r * 0.78, r * 1.25);
      this.matrix.setPosition(this.vec);
      this.brood.setMatrixAt(i, this.matrix);
      this.brood.setColorAt(i, this.color.setHex(BROOD_HEX[item.stage]));
    }

    this.brood.count = n;
    this.brood.instanceMatrix.needsUpdate = true;
    if (this.brood.instanceColor) this.brood.instanceColor.needsUpdate = true;
  }

  #updateQueen(world, queen) {
    const c = Math.cos(queen.course), s = Math.sin(queen.course);
    const x = queen.x - world.width / 2, z = queen.y - world.height / 2;
    this.queenBack.position.set(x - c * 2, 2.6, z - s * 2);
    this.queenFore.position.set(x + c * 2.4, 2.2, z + s * 2.4);
  }

  // --- mancha de feromônio --------------------------------------------------

  // Mesmo cálculo do renderizador 2D. A única diferença é a linha invertida: o
  // DataTexture começa por baixo, e o campo começa por cima.
  #updateStain(world) {
    const data = this.stainData;
    const home = world.home.data;
    const food = world.food.data;
    const mask = world.terrain.mask;
    const { cols, rows } = world;

    for (let y = 0; y < rows; y++) {
      const src = y * cols;
      const dst = (rows - 1 - y) * cols * 4;
      for (let x = 0; x < cols; x++) {
        const i = src + x;
        const p = dst + x * 4;
        if (mask[i] <= 0) { data[p + 3] = 0; continue; }
        let h = home[i]; if (h > 1) h = 1;
        let f = food[i]; if (f > 1) f = 1;
        h = h > 0 ? Math.sqrt(h) : 0;
        f = f > 0 ? Math.sqrt(f) : 0;
        const t = h + f;
        if (t <= 0) { data[p + 3] = 0; continue; }
        const wh = h / t, wf = f / t;
        data[p] = HOME_STAIN[0] * wh + FOOD_STAIN[0] * wf;
        data[p + 1] = HOME_STAIN[1] * wh + FOOD_STAIN[1] * wf;
        data[p + 2] = HOME_STAIN[2] * wh + FOOD_STAIN[2] * wf;
        data[p + 3] = (t > 1 ? 1 : t) * STAIN_ALPHA;
      }
    }
    this.stainTex.needsUpdate = true;
  }
}
