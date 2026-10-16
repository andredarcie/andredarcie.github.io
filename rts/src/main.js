// Raiz de composição: o único lugar que conhece todas as peças. Cria cada uma, entrega
// a cada classe só o que ela usa, põe o mundo, as estradas e a vila de pé e liga o laço.
import { WORLD } from './config/world.js';
import { CHOP_HITS } from './config/settlement.js';
import { TEAMS, START_FOOD, START_WOOD, START_WORKERS, DIFFICULTY, HILLS } from './config/rts.js';
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
import { onRoad, roadReservations } from './world/Roads.js';
import { Tree } from './entities/Tree.js';
import { FoodPatch } from './entities/FoodPatch.js';
import { Locomotion } from './organisms/Locomotion.js';
import { TeamLedger } from './rts/TeamLedger.js';
import { UnitFactory } from './rts/UnitFactory.js';
import { Commands } from './rts/Commands.js';
import { UnitSystem } from './rts/UnitSystem.js';
import { WaveDirector } from './rts/WaveDirector.js';
import { TowerSystem } from './rts/TowerSystem.js';
import { Vespers } from './rts/Vespers.js';
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
import { EffectsLayer } from './overlay/layers/EffectsLayer.js';
import { RoadWarningLayer } from './overlay/layers/RoadWarningLayer.js';
import { RtsHud } from './ui/RtsHud.js';
import { paintIcons } from './ui/Icons.js';
import { Minimap } from './ui/Minimap.js';
import { GameMenu } from './ui/GameMenu.js';
import { HudObstacleTracker } from './ui/HudObstacleTracker.js';
import { CameraController } from './input/CameraController.js';
import { PlayerInput } from './input/PlayerInput.js';
import { FrameRenderer } from './app/FrameRenderer.js';
import { Viewport } from './app/Viewport.js';
import { GameLoop } from './app/GameLoop.js';
import { AudioManager } from './audio/AudioManager.js';

// Clareira em volta da vila, livre de cenário na hora de plantar o mundo.
const BASE_CLEARING = 72;
// Recorde de ondas por dificuldade, guardado neste navegador.
const RECORD_KEY = 'canudos-melhor';
// Zoom inicial: quantos pixels de tela por unidade do mundo (o boneco tem 16).
const START_PIXELS_PER_UNIT = 1.7;

const root = document;
// Os ícones fixos da página (data-icon) ganham o desenho antes de qualquer coisa.
paintIcons(root);
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
  warning.textContent = 'Este jogo precisa de WebGL para desenhar o sertão, e o seu navegador não conseguiu ligá-lo. Tente outro navegador ou ative a aceleração de hardware.';
  document.body.append(warning);
  throw error;
}

// ---- Mundo e regras ----
const params = new URLSearchParams(location.search);
let level = DIFFICULTY[params.get('level')] ? params.get('level') : 'normal';
const events = new EventBus();
const audio = new AudioManager({ events, root, camera: view.camera });
const state = new WorldState();
const skyClock = new SkyClock(new Astronomy());
const biomes = new BiomeMap();
const occupancy = new SpaceOccupancy(state);
const grassField = new GrassField(state, biomes, occupancy);
const ponds = new PondSystem(state, biomes, occupancy);
const weather = new Weather(state, ponds, events);
const forest = new ForestSystem(state, events);
const blood = new BloodSystem(state, events);
const locomotion = new Locomotion(state);
const ledger = new TeamLedger(state);
ledger.reset({ food: START_FOOD, wood: START_WOOD });
const factory = new UnitFactory(state);
const commands = new Commands({ state, ledger, occupancy, events });
const units = new UnitSystem({ state, locomotion, grassField, forest, blood, events, ledger, factory, biomes, skyClock });
const vespers = new Vespers({ state, skyClock, events });
const waves = new WaveDirector({ state, units, ledger, events });
waves.setDifficulty(level);
const towers = new TowerSystem({ state, units, ledger, events });
const selection = new Selection();
// A onda solta os invasores e as torres atiram antes; as unidades cumprem depois,
// no mesmo passo, e é nelas que quem morreu sai do mundo.
const simulation = new Simulation({
  state, skyClock,
  phases: [waves, vespers, towers, units, blood, grassField, forest, weather]
});

// ---- Interface ----
const hud = new RtsHud({ root, state, selection, commands, ledger, camera: view.camera, events, waves });
const overlay = new OverlayRenderer({
  canvas: overlayCanvas,
  cameraRig: view.camera,
  state,
  groundLayers: [
    new CloudShadowsLayer(state, skyClock, weather, motion),
    new PondRipplesLayer(state, weather, theme, motion),
    new RoadWarningLayer(state, motion),
    new SelectionLayer(state, selection, commands),
    new FallDustLayer(state)
  ],
  screenLayers: [
    new WoodChipsLayer(state, motion),
    new FirefliesLayer(state, skyClock, weather, motion),
    new UnitMarksLayer(state, selection, theme),
    new FightLayer(state, theme),
    new EffectsLayer(state, theme),
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
// a clareira da vila e as estradas, lagos, árvores e enfeites; depois a vila e, por
// último, o capim. A clareira sai depois de plantar; as estradas ficam reservadas
// para sempre (nem capim novo, nem lago de chuva, nem construção nascem nelas).
const roadSpots = roadReservations();
state.reserved.push({ x: TEAMS.player.base.x, y: TEAMS.player.base.y, radius: BASE_CLEARING }, ...roadSpots);
ponds.restore();
const sceneryItems = new SceneryPlanner(state, biomes, occupancy).plan();
// Os morros são de pedra: matacões e lajedos na encosta, e mandacaru entre eles.
for (const [index, hill] of HILLS.entries()) {
  for (let i = 0; i < 26; i++) {
    const seed = index * 977 + i * 13 + 5;
    const angle = pseudoRandom(seed) * Math.PI * 2;
    const distance = Math.sqrt(pseudoRandom(seed + 1)) * hill.radius * .95;
    const x = hill.x + Math.cos(angle) * distance, y = hill.y + Math.sin(angle) * distance;
    const kind = pseudoRandom(seed + 2) < .62 ? 'rock' : pseudoRandom(seed + 3) < .6 ? 'mandacaru' : 'xiquexique';
    if (!occupancy.isFree(x, y, 7)) continue;
    const item = { x, y, seed, kind };
    state.scenery.push(item);
  }
}
foundVillage(TEAMS.player);
state.reserved = roadSpots;
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
  biomeAt: (x, y) => biomes.biomeAt(x, y),
  // Capim só some no miolo da trilha; na beira ele invade, como em estrada de terra.
  bare: (x, y) => onRoad(x, y, -5)
});
// Mede tela, HUD e mapinha. No carregamento a página ainda não terminou o layout
// (as fontes chegam depois e mudam a altura das barras): medindo só uma vez, a
// câmera enquadrava o tabuleiro fora da tela e o mapinha ficava vazio até o
// primeiro redimensionamento. Por isso mede de novo no primeiro quadro e quando
// as fontes ficam prontas.
function remeasure() {
  viewport.resize();
  hudObstacles.measure();
  minimap.resize();
  frameRenderer.render();
}
remeasure();
requestAnimationFrame(remeasure);
document.fonts?.ready.then(remeasure);

// Belo Monte no meio do mapa: a igreja de Santo Antônio pronta, com a porta virada
// para a câmera (o vão entre as estradas de Jeremoabo e de Monte Santo), Antônio
// Conselheiro no adro, os sertanejos em volta e recurso garantido por perto, nos
// quatro vãos entre as estradas: dois capões de caatinga e duas roças, para começar a
// colher sem andar até a beira do mapa.
function foundVillage(team) {
  const { x, y } = team.base;
  const hall = commands.spawnBuilding(team.id, 'hall', x, y, true, Math.PI / 4);
  const out = hall.angle;
  for (let i = 0; i < START_WORKERS; i++) {
    const angle = out + (i - (START_WORKERS - 1) / 2) * .4;
    const worker = factory.create(team.id, 'worker',
      hall.doorX + Math.cos(angle) * 18, hall.doorY + Math.sin(angle) * 18, angle);
    worker.post = { x: worker.x, y: worker.y };
    state.organisms.push(worker);
  }
  // Antônio Conselheiro no adro, entre a porta e o cruzeiro.
  const preacher = factory.create(team.id, 'conselheiro',
    hall.doorX + Math.cos(out) * 8, hall.doorY + Math.sin(out) * 8, out + Math.PI);
  preacher.post = { x: preacher.x, y: preacher.y };
  state.organisms.push(preacher);
  const villagers = state.organisms.filter(u => u.type === 'worker');
  // Os vãos entre as estradas ficam nas diagonais do tabuleiro.
  [-3, -1, 1, 3].forEach((quarter, index) => {
    const angle = quarter * Math.PI / 4;
    if (index % 2 === 0) {
      const cx = x + Math.cos(angle) * 125, cy = y + Math.sin(angle) * 125;
      const kind = 'catingueira';
      plantCluster(cx, cy, 10, 36, (px, py, seed) => {
        if (!occupancy.isFree(px, py, 9) || onRoad(px, py, 6)) return;
        state.trees.push(new Tree({ id: state.trees.length + 1, x: px, y: py, kind, seed, health: CHOP_HITS }));
      });
    } else {
      plantCluster(x + Math.cos(angle) * 105, y + Math.sin(angle) * 105, 7, 26, (px, py) => {
        if (!occupancy.isFree(px, py, 7) || onRoad(px, py, 6)) return;
        state.grass.push(new FoodPatch({ x: px, y: py, lean: (Math.random() - .5) * 2, size: 6 + Math.random() * 2 }));
      });
    }
  });
  // A vila já abre trabalhando: metade na lenha, metade na roça mais perto.
  villagers.forEach((villager, index) => {
    const pool = index % 2 ? state.grass : state.trees.filter(tree => !tree.stump);
    const nearest = [...pool].sort((a, b) =>
      Math.hypot(a.x - villager.x, a.y - villager.y) - Math.hypot(b.x - villager.x, b.y - villager.y))[0];
    if (nearest) commands.gather([villager], nearest);
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
    waves.setDifficulty(level);
    running = true;
    view.camera.zoomToPixels(START_PIXELS_PER_UNIT);
    const hall = ledger.hall();
    hud.focus(hall.x, hall.y);
    hud.toast('Corte lenha e cave trincheiras na beira das estradas');
  },
  onPause: paused => { running = !paused; },
  onRestart: chosen => {
    location.search = `?level=${chosen}&play=1`;
  }
});
events.on('gameOver', () => {
  const survived = state.wave?.cleared ?? 0;
  const records = readRecords();
  const record = survived > (records[level] ?? 0);
  if (record) {
    records[level] = survived;
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(records)); } catch { /* sem armazenamento */ }
  }
  setTimeout(() => menu.showResult({ waves: survived, best: records[level] ?? 0, record }), 1800);
});

function readRecords() {
  try { return JSON.parse(localStorage.getItem(RECORD_KEY)) ?? {}; } catch { return {}; }
}

// Recordes no menu de abertura: a marca a bater em cada dificuldade já jogada.
const records = readRecords();
const played = Object.entries(DIFFICULTY).filter(([id]) => records[id] > 0);
const recordLine = root.querySelector('#start-record');
recordLine.hidden = !played.length;
recordLine.textContent = 'Recorde: ' + played
  .map(([id, item]) => `${records[id]} ${records[id] === 1 ? 'onda' : 'ondas'} no ${item.label.toLowerCase()}`).join(' · ');
if (params.get('play') === '1') menu.start();

// Só em localhost: alça para inspecionar e adiantar a partida no console (revisão).
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__canudos = { state, simulation, view, waves, ledger, commands, selection, hud, units, factory, events, skyClock, audio };
  // Visor de modelos e animações (tecla M; alça window.__visor), só aqui.
  import('./dev/ModelViewer.js').then(m => m.installModelViewer()).catch(error => console.error('[visor]', error));
}

window.addEventListener('resize', remeasure);

function updateFrame(dt) {
  cameraController.update(dt);
  view.camera.update(dt);
  if (running) simulation.advance(dt);
  hud.update(dt);
  minimap.update(dt);
  frameRenderer.render();
}

// Alças determinísticas para revisão local e testes de interface: o resumo fica
// no que alguém vê e comanda, sem vazar o estado interno inteiro da simulação.
window.advanceTime = milliseconds => {
  const steps = Math.max(1, Math.ceil(milliseconds / (1000 / 60)));
  for (let i = 0; i < steps; i++) updateFrame(milliseconds / steps / 1000);
};
window.render_game_to_text = () => JSON.stringify({
  running,
  wave: state.wave ? { number: state.wave.number, phase: state.wave.phase, enemies: state.wave.enemies?.length ?? 0 } : null,
  resources: ledger.team('player'),
  selected: selection.units.map(unit => ({ type: unit.type, x: Math.round(unit.x), y: Math.round(unit.y) })),
  units: state.organisms.filter(unit => unit.life > 0).map(unit => ({ team: unit.team, type: unit.type, x: Math.round(unit.x), y: Math.round(unit.y), life: Math.round(unit.life) })),
  buildings: state.buildings.map(building => ({ team: building.team, kind: building.kind, built: building.built, life: Math.round(building.life) }))
});

new GameLoop(updateFrame).start();
