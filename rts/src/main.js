// Raiz de composição: o único lugar que conhece todas as peças. Cria cada uma, entrega
// a cada classe só o que ela usa, põe o mundo e as bases de pé e liga o laço.
import { WORLD } from './config/world.js';
import { CHOP_HITS } from './config/settlement.js';
import { TEAMS, START_FOOD, START_WOOD, START_WORKERS, AI_LEVELS } from './config/rts.js';
import { pseudoRandom } from './core/math.js';
import { EventBus } from './core/EventBus.js';
import { Astronomy } from './sky/Astronomy.js';
import { SkyClock } from './sky/SkyClock.js';
import { WorldState } from './world/WorldState.js';
import { BiomeMap } from './world/BiomeMap.js';
import { SpaceOccupancy } from './world/SpaceOccupancy.js';
import { GrassField } from './world/GrassField.js';
import { PondSystem } from './world/PondSystem.js';
import { Weather } from './world/Weather.js';
import { ForestSystem } from './world/ForestSystem.js';
import { SceneryPlanner } from './world/SceneryPlanner.js';
import { BloodSystem } from './world/BloodSystem.js';
import { Tree } from './entities/Tree.js';
import { FoodPatch } from './entities/FoodPatch.js';
import { Locomotion } from './organisms/Locomotion.js';
import { TeamLedger } from './rts/TeamLedger.js';
import { UnitFactory } from './rts/UnitFactory.js';
import { Commands } from './rts/Commands.js';
import { UnitSystem } from './rts/UnitSystem.js';
import { AiPlayer } from './rts/AiPlayer.js';
import { Selection } from './rts/Selection.js';
import { Simulation } from './simulation/Simulation.js';
import { WorldView } from './render/WorldView.js';
import { GroundPainter } from './render/GroundPainter.js';
import { Theme } from './ui/Theme.js';
import { MotionPreference } from './ui/MotionPreference.js';
import { OverlayRenderer } from './overlay/OverlayRenderer.js';
import { SelectionLayer } from './overlay/layers/SelectionLayer.js';
import { UnitMarksLayer } from './overlay/layers/UnitMarksLayer.js';
import { FallDustLayer } from './overlay/layers/FallDustLayer.js';
import { WoodChipsLayer } from './overlay/layers/WoodChipsLayer.js';
import { FightLayer } from './overlay/layers/FightLayer.js';
import { RainLayer } from './overlay/layers/RainLayer.js';
import { CloudShadowsLayer } from './overlay/layers/CloudShadowsLayer.js';
import { PondRipplesLayer } from './overlay/layers/PondRipplesLayer.js';
import { FirefliesLayer } from './overlay/layers/FirefliesLayer.js';
import { RtsHud } from './ui/RtsHud.js';
import { Minimap } from './ui/Minimap.js';
import { GameMenu } from './ui/GameMenu.js';
import { HudObstacleTracker } from './ui/HudObstacleTracker.js';
import { CameraController } from './input/CameraController.js';
import { PlayerInput } from './input/PlayerInput.js';
import { FrameRenderer } from './app/FrameRenderer.js';
import { Viewport } from './app/Viewport.js';
import { GameLoop } from './app/GameLoop.js';

// Clareira em volta de cada base, livre de cenário na hora de plantar o mundo.
const BASE_CLEARING = 72;
// Zoom inicial: quantos pixels de tela por unidade do mundo (o boneco tem 16).
const START_PIXELS_PER_UNIT = 1.7;

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
  warning.textContent = 'This game needs WebGL to draw the island, and your browser could not start it. Try another browser or enable hardware acceleration.';
  document.body.append(warning);
  throw error;
}

// ---- Mundo e regras ----
const params = new URLSearchParams(location.search);
let level = AI_LEVELS[params.get('level')] ? params.get('level') : 'normal';
const events = new EventBus();
const state = new WorldState();
const skyClock = new SkyClock(new Astronomy());
const biomes = new BiomeMap();
const occupancy = new SpaceOccupancy(state);
const grassField = new GrassField(state, biomes, occupancy);
const ponds = new PondSystem(state, biomes, occupancy);
const weather = new Weather(state, ponds);
const forest = new ForestSystem(state);
const blood = new BloodSystem(state, events);
const locomotion = new Locomotion(state);
const ledger = new TeamLedger(state);
ledger.reset({ food: START_FOOD, wood: START_WOOD, aiBonus: AI_LEVELS[level].bonus });
const factory = new UnitFactory(state, theme.pigments);
const commands = new Commands({ state, ledger, occupancy, events });
const units = new UnitSystem({ state, locomotion, grassField, forest, blood, events, ledger, factory });
const ai = new AiPlayer({ state, ledger, commands, events });
ai.setLevel(level);
const selection = new Selection();
// A IA decide antes, as unidades cumprem depois, no mesmo passo.
const simulation = new Simulation({
  state, skyClock,
  phases: [ai, units, blood, grassField, forest, weather]
});

// ---- Interface ----
const hud = new RtsHud({ root, state, selection, commands, ledger, camera: view.camera, events });
const overlay = new OverlayRenderer({
  canvas: overlayCanvas,
  cameraRig: view.camera,
  state,
  groundLayers: [
    new CloudShadowsLayer(state, skyClock, weather, motion),
    new PondRipplesLayer(state, weather, theme, motion),
    new SelectionLayer(state, selection, commands),
    new FallDustLayer(state)
  ],
  screenLayers: [
    new WoodChipsLayer(state, motion),
    new FirefliesLayer(state, skyClock, weather, motion),
    new UnitMarksLayer(state, selection, theme),
    new FightLayer(state, theme),
    new RainLayer(state, weather, theme, motion)
  ]
});
const input = new PlayerInput({
  canvas, view, state, selection, commands, hud, boxElement: root.querySelector('#box-select')
});
const cameraController = new CameraController({
  window, canvas, cameraRig: view.camera, box: input.box,
  canPan: () => {
    const active = document.activeElement;
    return !root.querySelector('dialog[open]') && (!active || !['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName));
  }
});
input.attach(cameraController);
const minimap = new Minimap({ canvas: root.querySelector('#minimap'), state, view, hud });
const frameRenderer = new FrameRenderer({ state, skyClock, weather, motionPreference: motion, view, overlay });
const viewport = new Viewport(canvas, view, overlay);
const hudObstacles = new HudObstacleTracker({
  canvas,
  cameraRig: view.camera,
  panels: ['#topbar', '#command-panel'].map(selector => root.querySelector(selector))
});
for (const id of ['view-in', 'view-out', 'view-reset']) {
  root.querySelector(`#${id}`).addEventListener('click', () => {
    if (id === 'view-reset') view.camera.reset();
    else view.camera.zoomBy(id === 'view-in' ? 1.3 : 1 / 1.3);
  });
}

// ---- O mundo de pé ----
// Nesta ordem, cada um conferindo o chão contra quem já nasceu (SpaceOccupancy):
// clareiras das bases, lagos, árvores e enfeites; depois as bases e, por último, o
// capim.
for (const team of Object.values(TEAMS)) {
  state.reserved.push({ x: team.base.x, y: team.base.y, radius: BASE_CLEARING });
}
ponds.restore();
const sceneryItems = new SceneryPlanner(state, biomes, occupancy).plan();
for (const team of Object.values(TEAMS)) foundBase(team);
state.reserved = [];
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
viewport.resize();
hudObstacles.measure();
minimap.resize();
frameRenderer.render();

// Cada base: a sede pronta com a porta para o meio do mapa, os trabalhadores em
// volta dela, e recurso garantido por perto — um bosque de um lado e moitas do
// outro —, para nenhum dos dois começar num deserto sem nada.
function foundBase(team) {
  const { x, y } = team.base;
  const lodge = commands.spawnBuilding(team.id, 'lodge', x, y, true);
  const out = lodge.angle;
  for (let i = 0; i < START_WORKERS; i++) {
    const angle = out + (i - (START_WORKERS - 1) / 2) * .45;
    const worker = factory.create(team.id, 'worker',
      lodge.doorX + Math.cos(angle) * 18, lodge.doorY + Math.sin(angle) * 18, angle);
    worker.post = { x: worker.x, y: worker.y };
    state.organisms.push(worker);
  }
  const side = out + Math.PI / 2;
  const kind = biomes.biomeAt(x, y) === 'taiga' ? 'conifer' : 'broadleaf';
  plantCluster(x + Math.cos(side) * 105, y + Math.sin(side) * 105, 9, 34, (px, py, seed) => {
    if (!occupancy.isFree(px, py, 9)) return;
    state.trees.push(new Tree({ id: state.trees.length + 1, x: px, y: py, kind, seed, health: CHOP_HITS }));
  });
  plantCluster(x - Math.cos(side) * 90, y - Math.sin(side) * 90, 6, 26, (px, py) => {
    if (!occupancy.isFree(px, py, 7)) return;
    state.grass.push(new FoodPatch({ x: px, y: py, lean: (Math.random() - .5) * 2, size: 6 + Math.random() * 2 }));
  });
}

// Até `count` coisas sorteadas num círculo; quem cai em lugar ocupado é pulado.
function plantCluster(cx, cy, count, spread, plant) {
  let planted = 0;
  for (let i = 0; i < count * 4 && planted < count; i++) {
    const seed = cx * 7 + cy * 3 + i * 11;
    const angle = pseudoRandom(seed) * Math.PI * 2;
    const distance = Math.sqrt(pseudoRandom(seed + 1)) * spread;
    const px = cx + Math.cos(angle) * distance, py = cy + Math.sin(angle) * distance;
    if (px < 20 || py < 20 || px > WORLD.width - 20 || py > WORLD.height - 20) continue;
    const before = state.trees.length + state.grass.length;
    plant(px, py, seed);
    if (state.trees.length + state.grass.length > before) planted++;
  }
}

// ---- Partida ----
let running = false;
const menu = new GameMenu({
  root, level, simulation,
  onStart: chosen => {
    level = chosen;
    ai.setLevel(level);
    ledger.team('enemy').bonus = AI_LEVELS[level].bonus;
    running = true;
    view.camera.zoomToPixels(START_PIXELS_PER_UNIT);
    const home = state.buildings.find(b => b.team === 'player');
    hud.focus(home.x, home.y);
    hud.toast('Gather food and wood, then build a War Camp');
  },
  onPause: paused => { running = !paused; },
  onRestart: chosen => {
    location.search = `?level=${chosen}&play=1`;
  }
});
events.on('gameOver', ({ winner }) => {
  setTimeout(() => menu.showResult(winner === 'player', {
    time: state.elapsed,
    level
  }), 1800);
});
if (params.get('play') === '1') menu.start();

window.addEventListener('resize', () => {
  viewport.resize();
  minimap.resize();
  frameRenderer.render();
});

new GameLoop(dt => {
  cameraController.update(dt);
  view.camera.update(dt);
  if (running) simulation.advance(dt);
  hud.update(dt);
  minimap.update(dt);
  frameRenderer.render();
}).start();
