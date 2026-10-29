// Raiz de composição: o único lugar que conhece todas as peças. Cria cada uma, entrega
// a cada classe só o que ela usa, põe o mundo, as estradas e a vila de pé e liga o laço.
import { WORLD, FOOTPRINT, SCHIST_RADIUS } from './config/world.js';
import { CHOP_HITS } from './config/settlement.js';
import {
  TEAMS, START_FOOD, START_WOOD, START_RIFLES, DIFFICULTY, HILLS, TEXT, PREACHER_TYPE
} from './config/rts.js';
import { TUPI, FOREST, MISSION } from './config/mission.js';
import { MAP } from './config/maps.js';
import { CURRENT, STAGES, STAGE, STAGE_COUNT, completeStage } from './config/campaign.js';
import { MissionDirector } from './rts/MissionDirector.js';
import { Cutscene } from './ui/Cutscene.js';
import { ObjectivesPanel } from './ui/ObjectivesPanel.js';
import { MissionTalk } from './ui/MissionTalk.js';
import { coastY } from './world/Coast.js';
import { pseudoRandom } from './core/math.js';
import { EventBus } from './core/EventBus.js';
import { Astronomy, DAY_LENGTH } from './sky/Astronomy.js';
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
import { Log } from './entities/Log.js';
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
import { ObjectiveMarkerLayer } from './overlay/layers/ObjectiveMarkerLayer.js';
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
// A hora em que a missão começa (a madrugada de Uauá, a noite da brecha): o céu, a luz
// e a vista de todo mundo já abrem nela, inclusive na cena de abertura.
if (CURRENT.start.hour !== undefined) {
  skyClock.time = ((CURRENT.start.hour - 8 + 24) % 24) / 24 * DAY_LENGTH;
  skyClock.advance(0);
}
skyClock.scale = CURRENT.start.skyScale ?? 1;
const biomes = new BiomeMap();
const occupancy = new SpaceOccupancy(state);
const grassField = new GrassField(state, biomes, occupancy);
const ponds = new PondSystem(state, biomes, occupancy);
const weather = new Weather(state, ponds, events);
const forest = new ForestSystem(state, events);
const blood = new BloodSystem(state, events);
const locomotion = new Locomotion(state);
const ledger = new TeamLedger(state);
// A missão aberta (config/campaign.js) diz com quanto se começa.
const start = CURRENT.start;
ledger.reset({ food: start.food ?? START_FOOD, wood: start.wood ?? START_WOOD, rifles: start.rifles ?? START_RIFLES });
const factory = new UnitFactory(state);
const commands = new Commands({ state, ledger, occupancy, events, biomes });
const units = new UnitSystem({ state, locomotion, grassField, forest, blood, events, ledger, factory, biomes, skyClock });
const waves = new WaveDirector({ state, units, ledger, events });
waves.setDifficulty(level);
const mission = new MissionDirector({ state, units, ledger, events, factory, commands });
mission.setDifficulty(level);
const towers = new TowerSystem({ state, units, ledger, events });
const selection = new Selection();
const buildGrid = new BuildGrid(commands);
// A onda e a missão soltam os invasores e as torres atiram antes; as unidades
// cumprem depois, no mesmo passo, e é nelas que quem morreu sai do mundo.
const simulation = new Simulation({
  state, skyClock,
  phases: [waves, mission, towers, units, blood, grassField, forest, weather]
});

// ---- Interface ----
const hud = new RtsHud({ root, state, selection, commands, ledger, camera: view.camera, events, waves, mission });
const story = new StoryBook({ root, events });
const cutscene = new Cutscene({ root, view, state, audio, factory });
const talk = new MissionTalk({ root, state, events, audio, focus: (x, y) => hud.focus(x, y) });
const objectives = new ObjectivesPanel({ root, mission, events });
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
    new ObjectiveMarkerLayer(mission, motion),
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
const minimap = new Minimap({ canvas: root.querySelector('#minimap'), state, view, hud, mission });
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
// Sem vila (uma tropa só, em marcha), a clareira é onde ela começa. Com a casa do
// meio ainda em ruína e a gente chegando de longe (`start.at`), as duas clareiras.
const startSpot = start.hall === false ? (start.at ?? TEAMS.player.base) : TEAMS.player.base;
state.reserved.push({ x: startSpot.x, y: startSpot.y, radius: start.hall === false ? 50 : BASE_CLEARING }, ...roadSpots);
if (start.hall !== false && start.at) state.reserved.push({ x: start.at.x, y: start.at.y, radius: 50 });
ponds.restore();
if (TUPI) plantHeadlands();
else if (!FOREST) plantQuixabeiras();
// As construções do inimigo (aldeia, engenho, acampamento) antes do cenário: a mata
// não nasce em cima delas.
mission.placeBuildings();
const sceneryItems = new SceneryPlanner(state, biomes, occupancy).plan();
// Os morros são de pedra: lascas de xisto (perto do arraial) ou matacões na encosta,
// e mandacaru entre elas. Na mata (litoral e Palmares), o granito com gravatá e
// samambaia.
for (const [index, hill] of HILLS.entries()) {
  const schist = !FOREST && Math.hypot(hill.x - WORLD.width / 2, hill.y - WORLD.height / 2) < SCHIST_RADIUS;
  for (let i = 0; i < 26; i++) {
    const seed = index * 977 + i * 13 + 5;
    const angle = pseudoRandom(seed) * Math.PI * 2;
    const distance = Math.sqrt(pseudoRandom(seed + 1)) * hill.radius * .95;
    const x = hill.x + Math.cos(angle) * distance, y = hill.y + Math.sin(angle) * distance;
    const kind = pseudoRandom(seed + 2) < .62 ? (schist ? 'lasca' : 'rock')
      : FOREST ? (pseudoRandom(seed + 3) < .6 ? 'bromelia' : 'samambaia')
      : pseudoRandom(seed + 3) < .6 ? 'mandacaru' : 'xiquexique';
    if (!occupancy.isFree(x, y, 7)) continue;
    const item = { x, y, seed, kind };
    state.scenery.push(item);
  }
}
foundVillage(TEAMS.player);
markTime();
ledger.extraCap = Math.max(0, ledger.population('player') - ledger.popCap('player'));
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

// A vila da missão no meio do mapa (CURRENT.start): a casa do meio pronta, com a
// porta virada para a câmera (o vão entre as estradas do leste e do sul), as obras
// que a missão já traz de pé, o pregador na porta, os moradores, os chefes e a tropa
// em fileiras, e recurso garantido por perto, nos quatro vãos entre as estradas: dois
// capões de mata e duas roças, para começar a colher sem andar até a beira do mapa.
// Missão sem vila (uma tropa em marcha): só a tropa, no ponto de partida.
function foundVillage(team) {
  const { x, y } = team.base;
  // `hall: 'ruin'`: a casa do meio está de pé só em parte (a capela velha de Canudos, o
  // chão da aldeia nova) e a gente tem de erguê-la.
  const hall = start.hall === false ? null : commands.spawnBuilding(team.id, 'hall', x, y, start.hall !== 'ruin', Math.PI / 4);
  if (start.hall === 'ruin') hall.advance(start.ruin ?? .3);
  // A marca da casa do meio e das obras (`tag`), para a missão achar: Subupira, que os
  // próprios palmarinos queimam antes de a tropa chegar.
  if (hall) hall.tag = start.hallTag ?? null;
  for (const spot of start.buildings ?? []) {
    const building = commands.spawnBuilding(team.id, spot.kind, spot.x, spot.y, true);
    if (spot.levels) Object.assign(building.levels, spot.levels);
    building.tag = spot.tag ?? null;
    // Já castigada (o canhoneio de julho de 1897): começa com parte da vida.
    if (spot.life) building.life = building.maxLife * spot.life;
  }
  // Quem chega de longe (`start.at`) começa lá, virado para o meio.
  const away = start.at && hall ? start.at : null;
  const out = away ? Math.atan2(y - away.y, x - away.x) : hall ? hall.angle : -Math.PI / 2;
  const origin = away ?? (hall ? { x: hall.doorX, y: hall.doorY } : startSpot);
  const place = (type, px, py, heading) => {
    const unit = factory.create(team.id, type, px, py, heading);
    unit.post = { x: unit.x, y: unit.y };
    state.organisms.push(unit);
    return unit;
  };
  const workers = start.workers ?? 0;
  for (let i = 0; i < workers; i++) {
    const angle = out + (i - (workers - 1) / 2) * .4;
    const worker = place('worker', origin.x + Math.cos(angle) * 18, origin.y + Math.sin(angle) * 18, angle);
    if (start.workersTag) worker.tag = start.workersTag;
  }
  // O pregador (Antônio Conselheiro, o pajé, o pároco) na porta da casa do meio.
  if (hall && start.preacher !== false) {
    if (away) place(PREACHER_TYPE, origin.x - Math.cos(out) * 10, origin.y - Math.sin(out) * 10, out);
    else place(PREACHER_TYPE, hall.doorX + Math.cos(out) * 8, hall.doorY + Math.sin(out) * 8, out + Math.PI);
  }
  // Os chefes que a missão já traz, do outro lado da porta; marcados, para não
  // chegarem de novo com os romeiros (WaveDirector).
  (start.heroes ?? []).forEach((type, i) => {
    const angle = out - .9 - i * .5;
    place(type, origin.x + Math.cos(angle) * 22, origin.y + Math.sin(angle) * 22, angle);
    state.flags[`hero-${type}`] = true;
  });
  // A tropa, em fileiras de seis: na frente da porta, ou em volta do ponto de partida.
  // O terceiro campo (`[tipo, quantos, marca]`) marca o grupo para a missão.
  const army = (start.units ?? []).flatMap(([type, count, tag = null]) => Array(count).fill({ type, tag }));
  army.forEach(({ type, tag }, i) => {
    const row = Math.floor(i / 6), column = i % 6;
    const back = (hall && !away ? 44 : 0) + row * 15, side = (column - 2.5) * 15;
    const across = out + Math.PI / 2;
    const unit = place(type, origin.x + Math.cos(out) * back + Math.cos(across) * side,
      origin.y + Math.sin(out) * back + Math.sin(across) * side, out);
    unit.tag = tag;
  });
  if (!hall) return;
  const villagers = state.organisms.filter(u => u.type === 'worker');
  // Os vãos entre as estradas ficam nas diagonais do tabuleiro.
  [-3, -1, 1, 3].forEach((quarter, index) => {
    const angle = quarter * Math.PI / 4;
    if (index % 2 === 0) {
      const cx = x + Math.cos(angle) * 125, cy = y + Math.sin(angle) * 125;
      // Na aldeia, a capoeira tem pindoba e embaúba; em Palmares, mais palmeira — "o
      // caminho dêste Palmares era margeado de aléias de palmeiras" (Blaer, 1645).
      const kinds = TUPI ? ['pindoba', 'embauba'] : FOREST ? ['pindoba', 'pindoba', 'embauba'] : ['catingueira'];
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
  // A vila já abre trabalhando: metade na lenha, metade na roça mais perto (com a casa
  // do meio de pé: sem ela não há onde guardar).
  if (!hall.built || away) return;
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
  // No pé da Favela, em frente à praça: o lugar vem do cenário (`quixabeiras`, em
  // frações do lado) ou fica onde estava no arraial de 820.
  const spot = MAP && 'quixabeiras' in MAP ? MAP.quixabeiras : [.588, .815];
  if (!spot) return;
  const cx = WORLD.width * spot[0], cy = WORLD.height * spot[1];
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
  const side = WORLD.width;
  for (const [from, to] of [[side * .03, side * .18], [side * .82, side * .97]]) {
    for (let i = 0; i < 9; i++) {
      const seed = 5200 + from + i * 23;
      const x = from + pseudoRandom(seed) * (to - from);
      const y = coastY(x) - 4 - pseudoRandom(seed + 1) * 22;
      if (occupancy.isFree(x, y, FOOTPRINT.costao)) state.scenery.push({ x, y, seed, kind: 'costao' });
    }
  }
}

// O que o tempo fez ao lugar (config/maps.js): a mata cortada em volta do meio (os
// tocos não rebrotam durante a missão) e os escombros de casa — toras caídas e pedra
// solta —, em frações do lado.
function markTime() {
  const cut = MAP?.stumps;
  if (cut) {
    for (const tree of state.trees) {
      if (Math.hypot(tree.x - WORLD.width / 2, tree.y - WORLD.height / 2) > cut.radius) continue;
      if (pseudoRandom(tree.id * 7.3) > cut.share) continue;
      tree.stump = true;
      tree.stumpAge = -1e6;
    }
  }
  (MAP?.ruins ?? []).forEach(([u, v], index) => {
    const cx = u * WORLD.width, cy = v * WORLD.height;
    for (let i = 0; i < 3; i++) {
      const seed = 6100 + index * 31 + i * 7;
      const angle = pseudoRandom(seed) * Math.PI * 2, distance = 4 + pseudoRandom(seed + 1) * 12;
      state.logs.push(new Log({ x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance, angle: pseudoRandom(seed + 2) * Math.PI, seed }));
    }
    for (let i = 0; i < 5; i++) {
      const seed = 6300 + index * 37 + i * 11;
      const angle = pseudoRandom(seed) * Math.PI * 2, distance = 6 + pseudoRandom(seed + 1) * 16;
      const x = cx + Math.cos(angle) * distance, y = cy + Math.sin(angle) * distance;
      if (occupancy.isFree(x, y, 3)) state.scenery.push({ x, y, seed, kind: FOREST ? 'rock' : 'lasca' });
    }
  });
}

// Os escombros que ainda ardem (MAP.fires): fagulha e fumaça subindo sem parar.
let fireClock = 0;
function burnRuins(dt) {
  const fires = MAP?.fires;
  if (!fires) return;
  fireClock -= dt;
  if (fireClock > 0) return;
  fireClock = .32;
  for (const [u, v] of fires) {
    state.sparks.push({
      x: u * WORLD.width + (Math.random() - .5) * 14, y: v * WORLD.height + (Math.random() - .5) * 14,
      time: 0, life: 1.4, radius: 14, kind: 'fire'
    });
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
// A missão N da era aberta, com a dificuldade; `play` pula o menu e vai à cena.
const stageUrl = (stage, chosen) => `?missao=${MISSION}&fase=${stage}&level=${chosen}&play=1`;
const menu = new GameMenu({
  root, level, simulation,
  onStart: chosen => {
    level = chosen;
    beginMission();
  },
  onPause: paused => { running = !paused; },
  // De novo a mesma missão: a cena de abertura já foi vista (`repetir`), vai direto.
  onRestart: chosen => { location.search = `${stageUrl(STAGE, chosen)}&repetir=1`; },
  onPickStage: (stage, chosen) => { location.search = stageUrl(stage, chosen); }
});

// A missão começa: os guardas inimigos no posto (já na dificuldade escolhida), a
// cena de abertura e só então o jogo anda.
async function beginMission() {
  waves.setDifficulty(level);
  mission.setDifficulty(level);
  mission.placeGuards();
  if (params.get('repetir') !== '1') await cutscene.play(CURRENT.intro, { lastLabel: 'Começar a missão' });
  view.camera.zoomToPixels(START_PIXELS_PER_UNIT);
  const home = start.at ?? ledger.hall() ?? startSpot;
  hud.focus(home.x, home.y);
  running = true;
  mission.begin();
  objectives.show();
  story.begin();
  for (const id of CURRENT.story ?? []) story.unlock(id);
}

// Vitória: a próxima missão fica liberada e a cena de fim leva a ela (ou, na última,
// de volta às eras).
events.on('victory', async () => {
  completeStage();
  objectives.hide();
  talk.clear();
  const last = STAGE >= STAGE_COUNT;
  const choices = last
    ? [{ id: 'eras', label: 'Era concluída · voltar às eras', primary: true }]
    : [{ id: 'next', label: `Próxima missão: ${STAGES[STAGE].title}`, primary: true }, { id: 'eras', label: 'Voltar às eras', primary: false }];
  await new Promise(resolve => setTimeout(resolve, 900));
  await menu.showSummary({ items: mission.summary() });
  const choice = await cutscene.play(CURRENT.outro, { choices });
  location.search = choice === 'next' ? stageUrl(STAGE + 1, level) : '';
});
events.on('gameOver', ({ reason }) => {
  const tip = mission.currentObjective();
  objectives.hide();
  talk.clear();
  const stats = mission.summary();
  setTimeout(() => menu.showResult({ title: 'Derrota', text: reason || TEXT.resultKicker, tip, stats }), 1800);
});
events.on('missionFocus', ({ x, y }) => hud.focus(x, y));

// Só em localhost: alça para inspecionar e adiantar a partida no console (revisão).
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__canudos = { state, simulation, view, waves, mission, ledger, commands, selection, hud, units, factory, events, skyClock, audio };
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
  // Com o livro de história aberto (ou uma cena passando) o mundo também espera.
  if (running && !buildMode && !story.isOpen && !cutscene.isOpen) {
    simulation.advance(dt);
    story.update(dt);
    talk.update(dt);
    burnRuins(dt);
  }
  cutscene.update(dt);
  objectives.update(dt);
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
