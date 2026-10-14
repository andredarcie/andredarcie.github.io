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
import { BloodRenderer } from './BloodRenderer.js';
import { TreeRenderer } from './TreeRenderer.js';
import { LogRenderer } from './LogRenderer.js';
import { SertaoBuildingModel } from './SertaoBuildingModel.js';
import { HutRenderer } from './HutRenderer.js';
import { TowerRenderer } from './TowerRenderer.js';
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
    // No RTS a cena tem mais coisa andando: 2 já fica nítido e poupa o celular.
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
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
    // Sangue logo depois da grama: no chão, antes dos corpos que pisam nele.
    this.blood = new BloodRenderer(this.#layer(), space);
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
    const towerLayer = new THREE.Group();
    scene.add(treeLayer, logLayer, hutLayer, towerLayer);
    this.trees = new TreeRenderer(treeLayer, props, space);
    this.logs = new LogRenderer(logLayer, space);
    this.huts = new HutRenderer(hutLayer, new SertaoBuildingModel(), space);
    this.towers = new TowerRenderer(towerLayer, space);
    this.occlusion = new OcclusionFader(this.camera, {
      targets: this.organisms,
      occluders: [this.trees, this.scenery, this.huts, this.towers]
    });
  }

  get canvas() {
    return this.#canvas;
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
