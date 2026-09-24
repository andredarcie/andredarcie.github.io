// Raiz de composição: o único lugar que conhece todas as peças. Cria cada uma, entrega
// a cada classe só o que ela usa, põe o mundo de pé e liga o laço de quadros.
import { WORLD } from './config/world.js';
import { EventBus } from './core/EventBus.js';
import { Astronomy } from './sky/Astronomy.js';
import { SkyClock } from './sky/SkyClock.js';
import { ScientistNameGenerator } from './names/ScientistNameGenerator.js';
import { TribeNameRegistry } from './names/TribeNameRegistry.js';
import { WorldState } from './world/WorldState.js';
import { BiomeMap } from './world/BiomeMap.js';
import { SpaceOccupancy } from './world/SpaceOccupancy.js';
import { GrassField } from './world/GrassField.js';
import { PondSystem } from './world/PondSystem.js';
import { Weather } from './world/Weather.js';
import { ForestSystem } from './world/ForestSystem.js';
import { SceneryPlanner } from './world/SceneryPlanner.js';
import { VisionPhysiology } from './organisms/VisionPhysiology.js';
import { Genetics } from './genetics/Genetics.js';
import { OrganismFactory } from './organisms/OrganismFactory.js';
import { Perception } from './organisms/Perception.js';
import { Locomotion } from './organisms/Locomotion.js';
import { Foraging } from './organisms/Foraging.js';
import { Metabolism } from './organisms/Metabolism.js';
import { SleepBehavior } from './organisms/SleepBehavior.js';
import { Wandering } from './organisms/Wandering.js';
import { OrganismBrain } from './organisms/OrganismBrain.js';
import { BandFormation } from './social/BandFormation.js';
import { TribeSystem } from './social/TribeSystem.js';
import { ReproductionSystem } from './social/ReproductionSystem.js';
import { MourningSystem } from './social/MourningSystem.js';
import { DeathSystem } from './social/DeathSystem.js';
import { CampfireSystem } from './settlement/CampfireSystem.js';
import { ShelterSystem } from './settlement/ShelterSystem.js';
import { Woodcutting } from './settlement/Woodcutting.js';
import { GeneStatistics } from './stats/GeneStatistics.js';
import { GeneReadings } from './stats/GeneReadings.js';
import { Simulation } from './simulation/Simulation.js';
import { WorldView } from './render/WorldView.js';
import { GroundPainter } from './render/GroundPainter.js';
import { Theme } from './ui/Theme.js';
import { MotionPreference } from './ui/MotionPreference.js';
import { Glyphs } from './overlay/Glyphs.js';
import { OverlayRenderer } from './overlay/OverlayRenderer.js';
import { PairRingsLayer } from './overlay/layers/PairRingsLayer.js';
import { BirthEffectsLayer } from './overlay/layers/BirthEffectsLayer.js';
import { FallDustLayer } from './overlay/layers/FallDustLayer.js';
import { WoodChipsLayer } from './overlay/layers/WoodChipsLayer.js';
import { FliesLayer } from './overlay/layers/FliesLayer.js';
import { HutMarksLayer } from './overlay/layers/HutMarksLayer.js';
import { OrganismLabelsLayer } from './overlay/layers/OrganismLabelsLayer.js';
import { PairHeartsLayer } from './overlay/layers/PairHeartsLayer.js';
import { RainLayer } from './overlay/layers/RainLayer.js';
import { CloudShadowsLayer } from './overlay/layers/CloudShadowsLayer.js';
import { PondRipplesLayer } from './overlay/layers/PondRipplesLayer.js';
import { FirefliesLayer } from './overlay/layers/FirefliesLayer.js';
import { HudPanel } from './ui/HudPanel.js';
import { TribeListPanel } from './ui/TribeListPanel.js';
import { SpeedControl } from './ui/SpeedControl.js';
import { InspectMode } from './ui/InspectMode.js';
import { GeneDialog } from './ui/GeneDialog.js';
import { EvolutionPlot } from './ui/EvolutionPlot.js';
import { EvolutionDialog } from './ui/EvolutionDialog.js';
import { EventCamera } from './ui/EventCamera.js';
import { ViewControls } from './ui/ViewControls.js';
import { HudObstacleTracker } from './ui/HudObstacleTracker.js';
import { CameraController } from './input/CameraController.js';
import { ArenaClickHandler } from './input/ArenaClickHandler.js';
import { FrameRenderer } from './app/FrameRenderer.js';
import { StateSerializer } from './app/StateSerializer.js';
import { Viewport } from './app/Viewport.js';
import { GameLoop } from './app/GameLoop.js';
import { DebugApi } from './app/DebugApi.js';

const root = document;
const canvas = root.querySelector('#arena');
const overlayCanvas = root.querySelector('#arena-overlay');
const theme = new Theme();
const motion = new MotionPreference();

// Sem WebGL não há cena: avisa em vez de deixar a página em branco.
let view;
try {
  view = new WorldView({ canvas, world: WORLD });
} catch (error) {
  const warning = document.createElement('p');
  warning.className = 'webgl-missing';
  warning.textContent = 'Esta página precisa de WebGL para desenhar a ilha, e o navegador não conseguiu iniciar. Tente outro navegador ou habilite a aceleração de hardware.';
  document.body.append(warning);
  throw error;
}

// ---- Mundo e simulação ----
const events = new EventBus();
const state = new WorldState();
const skyClock = new SkyClock(new Astronomy());
const biomes = new BiomeMap();
const tribeNames = new TribeNameRegistry();
const occupancy = new SpaceOccupancy(state);
const grassField = new GrassField(state, biomes, occupancy);
const ponds = new PondSystem(state, biomes, occupancy);
const weather = new Weather(state, ponds);
const forest = new ForestSystem(state);
const campfires = new CampfireSystem(state, skyClock, weather, occupancy);
const vision = new VisionPhysiology();
const genetics = new Genetics(vision);
const factory = new OrganismFactory(genetics, new ScientistNameGenerator(), theme.pigments);
const perception = new Perception(skyClock, vision, campfires);
const locomotion = new Locomotion(state);
const foraging = new Foraging({ state, perception, grassField, ponds });
const bands = new BandFormation(state);
const tribes = new TribeSystem({ state, perception, tribeNames, bands });
const shelter = new ShelterSystem(state, skyClock, occupancy);
const woodcutting = new Woodcutting({ state, skyClock, perception, locomotion, shelter, forest, events });
const sleep = new SleepBehavior({ skyClock, shelter, campfires, woodcutting, foraging });
const mourning = new MourningSystem({ state, locomotion, woodcutting });
const reproduction = new ReproductionSystem({
  state, perception, genetics, factory, events, motionPreference: motion
});
const death = new DeathSystem({ state, events, mourning, woodcutting, shelter, forest });
const metabolism = new Metabolism({ state, visionPhysiology: vision, campfires });
const brain = new OrganismBrain({
  metabolism, sleep, mourning, reproduction, foraging, woodcutting, tribes, bands, locomotion,
  wandering: new Wandering(state)
});
const geneStatistics = new GeneStatistics(state, events);
// Depois dos bichos, as fases do mundo nesta ordem.
const simulation = new Simulation({
  state, skyClock, brain,
  phases: [death, reproduction, tribes, grassField, bands, campfires, forest, shelter, weather, geneStatistics]
});

// ---- Interface ----
const glyphs = new Glyphs(theme, motion);
const overlay = new OverlayRenderer({
  canvas: overlayCanvas,
  cameraRig: view.camera,
  state,
  groundLayers: [
    new CloudShadowsLayer(state, skyClock, weather, motion),
    new PondRipplesLayer(state, weather, theme, motion),
    new PairRingsLayer(state, theme),
    new BirthEffectsLayer(state, theme, motion),
    new FallDustLayer(state)
  ],
  screenLayers: [
    new WoodChipsLayer(state, motion),
    new FliesLayer(state, theme, motion),
    new FirefliesLayer(state, skyClock, weather, motion),
    new HutMarksLayer(state, theme, glyphs),
    new OrganismLabelsLayer(state, theme, motion, glyphs),
    new PairHeartsLayer(state, motion, glyphs),
    new RainLayer(state, weather, theme, motion)
  ]
});
const geneDialog = new GeneDialog(root, genetics, tribeNames);
const geneReadings = new GeneReadings(geneStatistics);
const evolutionDialog = new EvolutionDialog({
  root, theme, geneStatistics, geneReadings, events,
  plot: new EvolutionPlot(root.querySelector('#evolution-plot'), theme, geneStatistics, geneReadings)
});
const eventCamera = new EventCamera({ root, canvas, state, inset: view.inset, events });
const inspectMode = new InspectMode(root, canvas);
new SpeedControl(root, simulation);
new ViewControls(root, view.camera, view.organisms);
// O slider de velocidade também responde a seta: com ele em foco, quem manda é ele.
const cameraController = new CameraController({
  window, canvas, cameraRig: view.camera,
  canPan: () => {
    if (geneDialog.open || evolutionDialog.open) return false;
    const active = document.activeElement;
    return !active || !['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName);
  }
});
new ArenaClickHandler({ canvas, view, state, factory, inspectMode, geneDialog, cameraController });
const frameRenderer = new FrameRenderer({
  state, skyClock, weather, perception, motionPreference: motion, view, eventCamera, overlay,
  panels: [new TribeListPanel(root, state, tribeNames), new HudPanel(root, state, skyClock)]
});
const viewport = new Viewport(canvas, view, overlay);
// O que fica por cima da cena o tempo todo; o tabuleiro, centrado, cresce até
// encostar neles.
const hudObstacles = new HudObstacleTracker({
  canvas,
  cameraRig: view.camera,
  panels: ['.hud-stack > aside', '.tribes-panel', '.view-controls', '#arena-hint']
    .map(selector => root.querySelector(selector))
});
DebugApi.install(window, {
  serializer: new StateSerializer({ state, skyClock, simulation, genetics, biomes, ponds, tribeNames }),
  simulation, frameRenderer
});

// ---- O mundo de pé ----
state.organisms.push(...factory.createFounders());
// Nesta ordem, cada um conferindo o chão contra quem já nasceu (SpaceOccupancy):
// lagos primeiro (são os maiores), depois árvores e enfeites, por último o capim.
ponds.restore();
const sceneryItems = new SceneryPlanner(state, biomes, occupancy).plan();
grassField.seed();
const painter = new GroundPainter(biomes);
view.terrain.setGroundTexture(painter.paintGround());
// Cada lateral do tabuleiro com a coluna u da textura apontando para o ponto certo da
// beirada (o sentido de u em cada face é o do BoxGeometry), para a franja de grama
// bater com o bioma logo acima.
view.terrain.setSideTextures({
  east: painter.paintSide(u => ({ x: WORLD.width, y: WORLD.height * (1 - u) })),
  west: painter.paintSide(u => ({ x: 0, y: WORLD.height * u })),
  south: painter.paintSide(u => ({ x: WORLD.width * u, y: WORLD.height })),
  north: painter.paintSide(u => ({ x: WORLD.width * (1 - u), y: 0 }))
});
view.scenery.set(sceneryItems);
view.grass.plant({
  toneAt: (x, y) => painter.toneAt(x, y),
  biomeAt: (x, y) => biomes.biomeAt(x, y)
});
geneStatistics.capture();
viewport.resize();
hudObstacles.measure();
frameRenderer.render();

window.addEventListener('resize', () => {
  viewport.resize();
  frameRenderer.render();
  evolutionDialog.refreshIfOpen();
});

new GameLoop(dt => {
  cameraController.update(dt);
  view.camera.update(dt);
  simulation.advance(dt);
  frameRenderer.render();
}).start();
