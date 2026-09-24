import * as THREE from 'three';
import { SceneSpace } from './SceneSpace.js';
import { CameraRig } from './CameraRig.js';
import { SkyRenderer } from './SkyRenderer.js';
import { TerrainRenderer } from './TerrainRenderer.js';
import { PropFactory } from './PropFactory.js';
import { CharacterModel } from './CharacterModel.js';
import { SceneryRenderer } from './SceneryRenderer.js';
import { OrganismRenderer } from './OrganismRenderer.js';
import { FoodRenderer } from './FoodRenderer.js';
import { PondRenderer } from './PondRenderer.js';
import { CorpseRenderer } from './CorpseRenderer.js';
import { CampfireRenderer } from './CampfireRenderer.js';
import { TreeRenderer } from './TreeRenderer.js';
import { LogRenderer } from './LogRenderer.js';
import { FlagModel } from './FlagModel.js';
import { HutModel } from './HutModel.js';
import { HutRenderer } from './HutRenderer.js';
import { InsetRenderer } from './InsetRenderer.js';
import { GrassRenderer } from './GrassRenderer.js';
import { OcclusionFader } from './OcclusionFader.js';

// A cena 3D inteira, vista de fora como uma coisa só: monta o renderer, a câmera e um
// renderizador por tipo de coisa do mundo, e expõe só o que o resto do jogo usa.
export class WorldView {
  #renderer;
  #scene;
  #canvas;

  constructor({ canvas, world }) {
    this.#canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    // Densidade de pixels real da tela até 3: celular costuma ter 3, e travar em 2
    // desenhava a cena em resolução menor e esticava, serrilhando as bordas.
    renderer.setPixelRatio(Math.min(3, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Sem tone mapping de propósito: qualquer curva filmica desviaria as cores medidas.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer = renderer;

    const scene = new THREE.Scene();
    this.#scene = scene;
    const space = new SceneSpace(world);
    const props = new PropFactory();
    const characters = new CharacterModel();
    this.camera = new CameraRig(space);
    // A ordem de montagem é a ordem em que a cena recebe cada camada.
    this.sky = new SkyRenderer(scene, renderer, this.camera, world);
    this.scenery = new SceneryRenderer(this.#layer(), props, space);
    this.terrain = new TerrainRenderer(scene, renderer, world);
    this.grass = new GrassRenderer(this.#layer(), space);
    const bodyLayer = new THREE.Group();
    const foodLayer = new THREE.Group();
    const pondLayer = new THREE.Group();
    const visionLayer = new THREE.Group();
    scene.add(bodyLayer, foodLayer, pondLayer, visionLayer);
    this.organisms = new OrganismRenderer(bodyLayer, visionLayer, characters, space);
    this.food = new FoodRenderer(foodLayer, props, space);
    this.ponds = new PondRenderer(pondLayer, space);
    this.corpses = new CorpseRenderer(this.#layer(), characters, space);
    this.campfires = new CampfireRenderer(this.#layer(), scene, props, space);
    const treeLayer = new THREE.Group();
    const logLayer = new THREE.Group();
    const hutLayer = new THREE.Group();
    scene.add(treeLayer, logLayer, hutLayer);
    this.trees = new TreeRenderer(treeLayer, props, space);
    this.logs = new LogRenderer(logLayer, space);
    this.huts = new HutRenderer(hutLayer, new HutModel(new FlagModel()), space);
    this.inset = new InsetRenderer(renderer, scene, this.camera, space);
    this.occlusion = new OcclusionFader(this.camera, {
      targets: this.organisms,
      occluders: [this.trees, this.scenery, this.huts]
    });
  }

  resize(width, height) {
    this.camera.resize(width, height);
    this.#renderer.setSize(this.camera.viewWidth, this.camera.viewHeight, false);
  }

  pickGround(clientX, clientY) {
    return this.camera.pickGround(this.#canvas, clientX, clientY);
  }

  render() {
    this.#renderer.render(this.#scene, this.camera.camera);
  }

  #layer() {
    const layer = new THREE.Group();
    this.#scene.add(layer);
    return layer;
  }
}
