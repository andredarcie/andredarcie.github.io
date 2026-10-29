// As regras da missão aberta (config/mission.js). Cada missão é um módulo em
// missions/ com os mesmos nomes; o resto do jogo importa daqui sem saber qual é.
// As estradas e os morros podem vir do cenário próprio da missão (config/maps.js).
import { TUPI, PALMARES } from './mission.js';
import { MAP } from './maps.js';
import { coastY } from '../world/Coast.js';
import * as canudos from './missions/canudos.js';
import * as tupinamba from './missions/tupinamba.js';
import * as palmares from './missions/palmares.js';

const M = TUPI ? tupinamba : PALMARES ? palmares : canudos;

export const {
  CENTER, SKIN_TONES, CLOTH, TEAMS, START_FOOD, START_WOOD, START_RIFLES, RIFLE_PICKUP_REACH, START_WORKERS,
  MAX_POPULATION, FOOD_PER_TRIP, FOOD_GATHER_TIME, BUSH_STOCK, WOOD_PER_LOG, RESOURCE_SEARCH_RANGE, LOG_PICKUP_RANGE,
  ROAD_WIDTH, PLAZA_RADIUS, LOOKS, UNIT_TYPES, BUILDING_TYPES, BUILD_ORDER, TRAIN_QUEUE_MAX, TOWER,
  TOWER_UPGRADES, TOWER_UPGRADE_ORDER, EXPEDITIONS, DIFFICULTY, SPAWN_GAP, HEROES, ROMEIROS, THICKET, TOCAIA,
  THIRST, NIGHT, DEBANDADA, CONVOY, CERCO, MATADEIRA, TRADE, BLESSING_FADE, HILL_REACH, WOUND_HIT_CHANCE,
  GUARD_LEASH, WORKER_RETALIATE, FORMATION_SPACING, ALERT_COOLDOWN, PREACHER_TYPE, START_HEROES, RECORD_KEY, EDGE_ENTRIES,
  TOOLS, RECOVER_ARROWS, CRAFT, NAMES, SNARE, IGARA, LATITUDE, TEXT
} = M;

// As estradas do cenário da missão: da boca na beirada até o meio, com a direção e
// o ponto onde a estrada chega à praça (como em missions/canudos.js).
// A estrada do mar (`sea`) desce até a linha d'água da enseada daquela missão.
export const ROADS = MAP?.roads ? Object.freeze(MAP.roads.map(road => {
  if (road.sea) road = { ...road, mouth: { x: road.mouth.x, y: coastY(road.mouth.x) - 6 } };
  const length = Math.hypot(M.CENTER.x - road.mouth.x, M.CENTER.y - road.mouth.y);
  const dir = { x: (M.CENTER.x - road.mouth.x) / length, y: (M.CENTER.y - road.mouth.y) / length };
  return Object.freeze({ ...road, dir, end: { x: M.CENTER.x - dir.x * M.PLAZA_RADIUS, y: M.CENTER.y - dir.y * M.PLAZA_RADIUS } });
})) : M.ROADS;
export const HILLS = MAP?.hills ? Object.freeze(MAP.hills) : M.HILLS;
