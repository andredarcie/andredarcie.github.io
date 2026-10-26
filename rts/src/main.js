// Raiz de composição: o único lugar que conhece todas as peças. Cria cada uma, entrega
// a cada classe só o que ela usa, põe o mundo, as estradas e a vila de pé e liga o laço.
import { WORLD, FOOTPRINT, SCHIST_RADIUS } from './config/world.js';
import { CHOP_HITS } from './config/settlement.js';
import {
  TEAMS, START_FOOD, START_WOOD, START_RIFLES, START_WORKERS, DIFFICULTY, HILLS, TEXT, PREACHER_TYPE, RECORD_KEY
} from './config/rts.js';
import { TUPI, MISSION } from './config/mission.js';
import { coastY } from './world/Coast.js';
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
import { Selection } from './rts/Selection.js';
import { BuildGrid } from './rts/BuildGrid.js';
import { Simulation } from './simulation/Simulation.js';
import { WorldView } from './render/WorldView.js';
import { GroundPainter } from './render/GroundPainter.js';
import { Theme } from './ui/Theme.js';
import { MotionPreference } from './ui/MotionPreference.js';
import { OverlayRenderer } from './overlay/OverlayRenderer.js';
import { SelectionLayer } from './overlay/layers/SelectionLayer.js';
import { UnitMarksLayer } from './overlay/layers/UnitMarksLayer.js';
import { BlessingLayer } from './overlay/layers/BlessingLayer.js';
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
import { StoryBook } from './ui/StoryBook.js';
import { HudObstacleTracker } from './ui/HudObstacleTracker.js';
import { CameraController } from './input/CameraController.js';
import { PlayerInput } from './input/PlayerInput.js';
import { FrameRenderer } from './app/FrameRenderer.js';
import { Viewport } from './app/Viewport.js';
import { GameLoop } from './app/GameLoop.js';
import { AudioManager } from './audio/AudioManager.js';

// Clareira em volta da vila, livre de cenário na hora de plantar o mundo.
const BASE_CLEARING = 72;
// O recorde de ondas por dificuldade (RECORD_KEY) vem da missão: cada uma tem o seu.
// Zoom inicial: quantos pixels de tela por unidade do mundo (o boneco tem 16).
const START_PIXELS_PER_UNIT = 1.7;

// A tela de carregamento (src/boot/loading.js, script clássico) mede o download do
// código; daqui em diante cada etapa pesada da montagem se anuncia a ela antes de
// começar, e ela só abre o jogo quando a última termina. Sem ela (script bloqueado),
// as chamadas viram nada.
const loading = window.canudosLoading ?? { stage: async () => {}, finish: async () => {}, fail() {} };

const root = document;
// Os textos fixos da página são de Canudos (index.html); a outra missão troca os seus
// (TEXT.page) antes de os ícones serem desenhados.
applyPageText(TEXT.page);
// Os ícones fixos da página (data-icon) ganham o desenho antes de qualquer coisa.
paintIcons(root);
const canvas = root.querySelector('#arena');
const overlayCanvas = root.querySelector('#arena-overlay');
const theme = new Theme();
const motion = new MotionPreference();

// Todo o código importado acima já chegou: começa a montagem.
await loading.stage('view');

// Sem WebGL não há cena: avisa em vez de deixar a página em branco.
let view;
try {
  view = new WorldView({ canvas, world: WORLD });
} catch (error) {
  const warning = document.createElement('p');
  warning.className = 'webgl-missing';
  warning.textContent = TEXT.webgl;
  document.body.append(warning);
  loading.fail(warning.textContent);
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
ledger.reset({ food: START_FOOD, wood: START_WOOD, rifles: START_RIFLES });
const factory = new UnitFactory(state);
const commands = new Commands({ state, ledger, occupancy, events, biomes });
const units = new UnitSystem({ state, locomotion, grassField, forest, blood, events, ledger, factory, biomes, skyClock });
const waves = new WaveDirector({ state, units, ledger, events });
waves.setDifficulty(level);
const towers = new TowerSystem({ state, units, ledger, events });
const selection = new Selection();
const buildGrid = new BuildGrid(commands);
// A onda solta os invasores e as torres atiram antes; as unidades cumprem depois,
// no mesmo passo, e é nelas que quem morreu sai do mundo.
const simulation = new Simulation({
  state, skyClock,
  phases: [waves, towers, units, blood, grassField, forest, weather]
});

// ---- Interface ----
const hud = new RtsHud({ root, state, selection, commands, ledger, camera: view.camera, events, waves });
const story = new StoryBook({ root, events });
const overlay = new OverlayRenderer({
  canvas: overlayCanvas,
  cameraRig: view.camera,
  state,
  groundLayers: [
    new CloudShadowsLayer(state, skyClock, weather, motion),
    new PondRipplesLayer(state, weather, theme, motion),
    new RoadWarningLayer(state, motion),
    new SelectionLayer(state, selection, buildGrid),
    new FallDustLayer(state)
  ],
  screenLayers: [
    new WoodChipsLayer(state, motion),
    new FirefliesLayer(state, skyClock, weather, motion),
    new BlessingLayer(state, motion),
    new UnitMarksLayer(state, selection, theme),
    new FightLayer(state, theme),
    new EffectsLayer(state, theme),
    new RainLayer(state, weather, theme, motion)
  ]
});
const input = new PlayerInput({
  canvas, view, state, selection, commands, hud, grid: buildGrid, boxElement: root.querySelector('#box-select')
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
const frameRenderer = new FrameRenderer({ state, selection, grid: buildGrid, skyClock, weather, motionPreference: motion, view, overlay });
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
await loading.stage('world');
// Nesta ordem, cada um conferindo o chão contra quem já nasceu (SpaceOccupancy):
// a clareira da vila e as estradas, lagos, árvores e enfeites; depois a vila e, por
// último, o capim. A clareira sai depois de plantar; as estradas ficam reservadas
// para sempre (nem capim novo, nem lago de chuva, nem construção nascem nelas).
const roadSpots = roadReservations();
state.reserved.push({ x: TEAMS.player.base.x, y: TEAMS.player.base.y, radius: BASE_CLEARING }, ...roadSpots);
ponds.restore();
if (TUPI) plantHeadlands();
else plantQuixabeiras();
const sceneryItems = new SceneryPlanner(state, biomes, occupancy).plan();
// Os morros são de pedra: lascas de xisto (perto do arraial) ou matacões na encosta,
// e mandacaru entre elas. No litoral, o granito com gravatá e samambaia.
for (const [index, hill] of HILLS.entries()) {
  const schist = !TUPI && Math.hypot(hill.x - WORLD.width / 2, hill.y - WORLD.height / 2) < SCHIST_RADIUS;
  for (let i = 0; i < 26; i++) {
    const seed = index * 977 + i * 13 + 5;
    const angle = pseudoRandom(seed) * Math.PI * 2;
    const distance = Math.sqrt(pseudoRandom(seed + 1)) * hill.radius * .95;
    const x = hill.x + Math.cos(angle) * distance, y = hill.y + Math.sin(angle) * distance;
    const kind = pseudoRandom(seed + 2) < .62 ? (schist ? 'lasca' : 'rock')
      : TUPI ? (pseudoRandom(seed + 3) < .6 ? 'bromelia' : 'samambaia')
      : pseudoRandom(seed + 3) < .6 ? 'mandacaru' : 'xiquexique';
    if (!occupancy.isFree(x, y, 7)) continue;
    const item = { x, y, seed, kind };
    state.scenery.push(item);
  }
}
foundVillage(TEAMS.player);
state.reserved = roadSpots;
grassField.seed();
await loading.stage('ground');
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
await loading.stage('plants');
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
// O primeiro quadro compila os shaders da cena inteira: é etapa de carga também.
await loading.stage('frame');
remeasure();
requestAnimationFrame(remeasure);
await loading.stage('fonts');
await document.fonts?.ready;
remeasure();

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
  // Antônio Conselheiro no adro, entre a porta e o cruzeiro (na aldeia, o pajé).
  const preacher = factory.create(team.id, PREACHER_TYPE,
    hall.doorX + Math.cos(out) * 8, hall.doorY + Math.sin(out) * 8, out + Math.PI);
  preacher.post = { x: preacher.x, y: preacher.y };
  state.organisms.push(preacher);
  const villagers = state.organisms.filter(u => u.type === 'worker');
  // Os vãos entre as estradas ficam nas diagonais do tabuleiro.
  [-3, -1, 1, 3].forEach((quarter, index) => {
    const angle = quarter * Math.PI / 4;
    if (index % 2 === 0) {
      const cx = x + Math.cos(angle) * 125, cy = y + Math.sin(angle) * 125;
      // Na aldeia, a capoeira tem pindoba e embaúba.
      const kinds = TUPI ? ['pindoba', 'embauba'] : ['catingueira'];
      plantCluster(cx, cy, 10, 36, (px, py, seed) => {
        if (!occupancy.isFree(px, py, 9) || onRoad(px, py, 6) || !biomes.buildable(px, py, 4)) return;
        const kind = kinds[Math.floor(pseudoRandom(seed + 9) * kinds.length)];
        state.trees.push(new Tree({ id: state.trees.length + 1, x: px, y: py, kind, seed, health: CHOP_HITS }));
      });
    } else {
      plantCluster(x + Math.cos(angle) * 105, y + Math.sin(angle) * 105, 7, 26, (px, py) => {
        if (!occupancy.isFree(px, py, 7) || onRoad(px, py, 6) || !biomes.allowsCrop(px, py)) return;
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

// "As ramagens virentes de seis pés de quixabeiras" do outro lado do rio, em frente
// à praça, no pé do esporão da Favela, entre "pequenos renques de palmatórias
// rutilantes" — o "jardim agreste" de Os Sertões, onde desceu a infantaria de
// Moreira César (o "vale das quixabeiras").
function plantQuixabeiras() {
  const cx = 482, cy = 668;
  plantCluster(cx, cy, 6, 26, (px, py, seed) => {
    if (!occupancy.isFree(px, py, FOOTPRINT.quixabeira) || onRoad(px, py, 6)) return;
    state.trees.push(new Tree({ id: state.trees.length + 1, x: px, y: py, kind: 'quixabeira', seed, health: CHOP_HITS }));
  });
  for (let i = 0; i < 7; i++) {
    const seed = 4100 + i * 17;
    const angle = pseudoRandom(seed) * Math.PI * 2;
    const x = cx + Math.cos(angle) * (30 + pseudoRandom(seed + 1) * 14);
    const y = cy + Math.sin(angle) * (22 + pseudoRandom(seed + 1) * 12);
    if (occupancy.isFree(x, y, FOOTPRINT.palmatoria) && !onRoad(x, y, 6)) state.scenery.push({ x, y, seed, kind: 'palmatoria' });
  }
}

// O costão: matacões de granito nas duas pontas da enseada, na areia e entrando no
// mar, onde a praia acaba (missão dos tupinambás).
function plantHeadlands() {
  for (const [from, to] of [[24, 150], [670, 796]]) {
    for (let i = 0; i < 9; i++) {
      const seed = 5200 + from + i * 23;
      const x = from + pseudoRandom(seed) * (to - from);
      const y = coastY(x) - 4 - pseudoRandom(seed + 1) * 22;
      if (occupancy.isFree(x, y, FOOTPRINT.costao)) state.scenery.push({ x, y, seed, kind: 'costao' });
    }
  }
}

// Os textos fixos do index.html trocados pelos da missão: `data-text` (texto),
// `data-html` (marcação), `data-title` (dica), `data-label` (nome acessível) e
// `data-icon-text` (o ícone), cada um com a chave em TEXT.page.
function applyPageText(page) {
  if (!page) return;
  document.title = page.title;
  root.querySelector('meta[name="theme-color"]')?.setAttribute('content', page.themeColor);
  for (const element of root.querySelectorAll('[data-text]')) if (page[element.dataset.text]) element.textContent = page[element.dataset.text];
  for (const element of root.querySelectorAll('[data-html]')) if (page[element.dataset.html]) element.innerHTML = page[element.dataset.html];
  for (const element of root.querySelectorAll('[data-title]')) if (page[element.dataset.title]) element.title = page[element.dataset.title];
  for (const element of root.querySelectorAll('[data-label]')) if (page[element.dataset.label]) element.setAttribute('aria-label', page[element.dataset.label]);
  for (const element of root.querySelectorAll('[data-icon-text]')) if (page[element.dataset.iconText]) element.dataset.icon = page[element.dataset.iconText];
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
    hud.toast(TEXT.startToast);
    story.begin();
  },
  onPause: paused => { running = !paused; },
  onRestart: chosen => {
    location.search = `?missao=${MISSION}&level=${chosen}&play=1`;
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
  .map(([id, item]) => `${records[id]} ${records[id] === 1 ? TEXT.waveUnit[0] : TEXT.waveUnit[1]} no ${item.label.toLowerCase()}`).join(' · ');

// Só em localhost: alça para inspecionar e adiantar a partida no console (revisão).
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__canudos = { state, simulation, view, waves, ledger, commands, selection, hud, units, factory, events, skyClock, audio };
  // Visor de modelos e animações (tecla M; alça window.__visor), só aqui.
  import('./dev/ModelViewer.js').then(m => m.installModelViewer()).catch(error => console.error('[visor]', error));
}

window.addEventListener('resize', remeasure);

// Modo de obra: com uma obra na mão o mundo inteiro para na hora (inimigos, gente,
// relógio do dia), o cenário fica cinza e só a grade tem cor. A câmera continua
// livre para escolher o lugar. Marcada ou cancelada a obra, tudo volta a correr.
let buildMode = false;

function updateFrame(dt) {
  cameraController.update(dt);
  view.camera.update(dt);
  if (buildMode !== Boolean(selection.placing)) {
    buildMode = Boolean(selection.placing);
    document.body.classList.toggle('build-mode', buildMode);
    events.emit('buildMode', { on: buildMode });
  }
  // Com o livro de história aberto o mundo também espera, para ler com calma.
  if (running && !buildMode && !story.isOpen) {
    simulation.advance(dt);
    story.update(dt);
  }
  hud.update(dt);
  minimap.update(dt);
  audio.update({ daylight: skyClock.current.daylight, rain: weather.strength() });
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

// Tudo pronto: a tela de carregamento sai e só então a abertura aparece (o menu é
// um <dialog> modal, que ficaria por cima dela).
await loading.finish();
if (params.get('play') === '1') menu.start();
else menu.open();
new GameLoop(updateFrame).start();
