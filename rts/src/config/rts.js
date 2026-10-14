// Regras do mini RTS: times, unidades, construções, economia e a IA.
// Tempos em segundos de simulação (o "1×" já roda 2× o tempo real: BASE_SIMULATION_SPEED).

// Dois povos: o jogador embaixo da tela (canto sul do losango) e a IA em cima.
export const TEAMS = Object.freeze({
  player: { id: 'player', name: 'Blue Tribe', outfit: '#2f5b86', ring: '#5fb4ff', base: { x: 610, y: 640 } },
  enemy: { id: 'enemy', name: 'Red Tribe', outfit: '#8c3b2e', ring: '#ff6a55', base: { x: 210, y: 180 } }
});

export const START_FOOD = 150;
export const START_WOOD = 120;
export const START_WORKERS = 5;
export const MAX_POPULATION = 40;

// Quanto cada viagem rende e quanto tempo o trabalhador fica colhendo.
export const FOOD_PER_TRIP = 10;
export const FOOD_GATHER_TIME = 2.4;
export const BUSH_STOCK = 60;
export const WOOD_PER_LOG = 10;
// Até onde o trabalhador procura outra árvore/moita quando a dele acaba.
export const RESOURCE_SEARCH_RANGE = 260;
// Tora no chão a até esta distância do trabalhador é recolhida antes de cortar outra.
export const LOG_PICKUP_RANGE = 70;

// `speed` multiplica o passo de caminhada; `reach` é o alcance do golpe; `sight` a
// distância em que o soldado parado percebe inimigo. `vsBuilding` multiplica o dano
// em construção.
export const UNIT_TYPES = Object.freeze({
  worker: {
    label: 'Worker', plural: 'Workers', icon: '⛏', hp: 45, damage: 4, weapon: 'club', reach: 12,
    interval: 1.4, swing: .95, speed: 1.15, size: 9.4, sight: 60, vsBuilding: .5,
    cost: { food: 50, wood: 0 }, time: 9, from: 'lodge'
  },
  warrior: {
    label: 'Clubman', plural: 'Clubmen', icon: '🏏', hp: 90, damage: 10, weapon: 'club', reach: 13,
    interval: 1.3, swing: .95, speed: 1.2, size: 10, sight: 120, vsBuilding: 1,
    cost: { food: 50, wood: 20 }, time: 11, from: 'camp'
  },
  spearman: {
    label: 'Spearman', plural: 'Spearmen', icon: '🔱', hp: 65, damage: 8, weapon: 'spear', reach: 26,
    interval: 1.35, swing: .85, speed: 1.3, size: 10, sight: 135, vsBuilding: .7,
    cost: { food: 40, wood: 45 }, time: 12, from: 'camp'
  },
  brute: {
    label: 'Axe Brute', plural: 'Axe Brutes', icon: '🪓', hp: 150, damage: 17, weapon: 'axe', reach: 12,
    interval: 1.8, swing: 1.2, speed: .95, size: 11.6, sight: 110, vsBuilding: 2.2,
    cost: { food: 85, wood: 60 }, time: 16, from: 'camp'
  }
});

// `capacity` é o tamanho da cabana (hutSize); `radius` o chão que ocupa; `pop` quanto
// teto de população dá; `build` os segundos de trabalho de UM trabalhador.
export const BUILDING_TYPES = Object.freeze({
  lodge: {
    label: 'Lodge', icon: '🛖', hp: 700, radius: 27, capacity: 12, pop: 8, build: 60,
    cost: { food: 0, wood: 220 }, trains: ['worker'], dropOff: true
  },
  house: {
    label: 'House', icon: '🏠', hp: 220, radius: 16, capacity: 4, pop: 6, build: 18,
    cost: { food: 0, wood: 60 }, trains: [], dropOff: false
  },
  camp: {
    label: 'War Camp', icon: '🔥', hp: 360, radius: 14, capacity: 0, pop: 0, build: 26,
    cost: { food: 0, wood: 110 }, trains: ['warrior', 'spearman', 'brute'], dropOff: false
  }
});
export const BUILD_ORDER = Object.freeze(['house', 'camp', 'lodge']);
export const TRAIN_QUEUE_MAX = 5;

// Combate.
export const WOUND_HIT_CHANCE = .55;
// Soldado parado persegue até esta distância do posto antes de voltar.
export const GUARD_LEASH = 200;
// Trabalhador atacado revida (se o agressor estiver perto) por este tempo.
export const WORKER_RETALIATE = 6;
// Espaçamento da formação ao mandar um grupo andar.
export const FORMATION_SPACING = 15;

// IA, por dificuldade: quantos trabalhadores quer, quanto ganha a mais por viagem,
// quando começa a atacar (s de simulação), o tamanho da primeira onda e quanto ela
// cresce a cada ataque.
export const AI_LEVELS = Object.freeze({
  easy: { label: 'Easy', workers: 8, bonus: .8, firstAttack: 520, wave: 3, waveGrowth: 1, think: 1.6 },
  normal: { label: 'Normal', workers: 11, bonus: 1, firstAttack: 380, wave: 4, waveGrowth: 2, think: 1 },
  hard: { label: 'Hard', workers: 14, bonus: 1.35, firstAttack: 280, wave: 5, waveGrowth: 3, think: .7 }
});

// Aviso de "base sob ataque": no máximo um a cada tantos segundos reais.
export const ALERT_COOLDOWN = 8;
