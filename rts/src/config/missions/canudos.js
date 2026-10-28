// Regras do jogo: a defesa de Belo Monte (Canudos), no sertão da Bahia, contra as
// expedições do Exército republicano (novembro de 1896 a outubro de 1897). O arraial
// do jogador fica no meio do mapa, em volta da igreja; as tropas chegam em ondas
// pelas quatro estradas do sertão. Tempos em segundos de simulação (o "1×" já roda
// 2× o tempo real: BASE_SIMULATION_SPEED).
import { WORLD } from '../world.js';

export const CENTER = Object.freeze({ x: WORLD.width / 2, y: WORLD.height / 2 });

// Tons de pele para os dois lados. O arraial era gente pobre do sertão — mestiços de
// indígenas, africanos e portugueses, ex-escravizados, vaqueiros —, e a tropa de
// linha era recrutada do mesmo povo pobre: os dois lados têm a mesma cara.
export const SKIN_TONES = Object.freeze(['#8d5a3b', '#a8714a', '#c48a5e', '#6e4530', '#d9a27a', '#5a3826', '#b77f55']);

// Roupa do arraial: camisa e calça de algodão cru ou de riscado, desbotados de sol;
// chapéu de palha ou de couro de vaqueiro; as mulheres de saia comprida e lenço na
// cabeça. Da tropa: dólmã azul-ferrete, calça de brim claro, quepe, correame de
// couro preto e mochila com o cobertor enrolado (como nas fotografias de Flávio de
// Barros, 1897).
export const CLOTH = Object.freeze({
  shirts: ['#e3d8bf', '#d6c8a6', '#c9b994', '#b9a98a', '#8f9aa6', '#a88c6a'],
  trousers: ['#8a6a48', '#a08766', '#6f5a44', '#cbbd9c', '#7d7262'],
  dresses: ['#7a5a7a', '#8a5a42', '#5a6a7a', '#a0784e', '#6a7a5a', '#c9b994'],
  scarves: ['#e3d8bf', '#b8473a', '#3e5a7e', '#d6c8a6'],
  leather: '#7a4e2c',
  straw: '#d8c48a',
  armyTunic: '#24304a',
  armyTrousers: '#d4cdb8',
  armyKepi: '#24304a',
  armyBand: '#a8322a',
  officerBand: '#c9a440',
  belt: '#2a2420',
  // "...dólmãs e calças de listra carmesim, cujos vivos denunciadores demais no pardo
  // da caatinga..." (Os Sertões, A Luta).
  armyStripe: '#a3262a',
  // O camisolão de brim azul de Antônio Conselheiro, desbotado.
  tunic: '#3e5a7e'
});

export const TEAMS = Object.freeze({
  player: { id: 'player', name: 'Belo Monte', outfit: '#e3d8bf', ring: '#ffd36b', base: CENTER },
  enemy: { id: 'enemy', name: 'Exército republicano', outfit: CLOTH.armyTunic, ring: '#ff6a55', base: CENTER }
});

// O arraial começa com o bastante para uma trincheira só (30 de comida e 70 de
// madeira) e quase nada de troco: a próxima obra vem do trabalho na roça e na lenha.
export const START_FOOD = 60;
export const START_WOOD = 90;
// Fuzis tomados da tropa: fuzil não se fabrica no sertão, só se toma do inimigo
// abatido. O arraial começa com dois, e cada jagunço e cada trincheira levam um.
export const START_RIFLES = 2;
// Fuzil caído no chão: quem do arraial passar a esta distância dele o apanha.
export const RIFLE_PICKUP_REACH = 9;
export const START_WORKERS = 6;
export const MAX_POPULATION = 40;

// Quanto cada viagem rende e quanto tempo o trabalhador fica colhendo.
export const FOOD_PER_TRIP = 10;
export const FOOD_GATHER_TIME = 2.4;
export const BUSH_STOCK = 60;
export const WOOD_PER_LOG = 10;
// Até onde o trabalhador procura outra árvore/roça quando a dele acaba.
export const RESOURCE_SEARCH_RANGE = 260;
// Tora no chão a até esta distância do trabalhador é recolhida antes de cortar outra.
export const LOG_PICKUP_RANGE = 70;

// As quatro estradas que chegavam a Belo Monte, cada uma saindo do meio de uma
// beirada do tabuleiro (as pontas do losango ficam de fora): a de Uauá (por onde veio
// a 1ª expedição), a de Jeremoabo (a coluna de Sergipe, na 4ª), a de Monte Santo
// (base de quase todas as expedições) e a do Cambaio (a serra onde a 2ª expedição foi
// barrada).
export const ROAD_WIDTH = 24;
export const PLAZA_RADIUS = 82;
export const ROADS = Object.freeze([
  { id: 'uaua', short: 'UAU', label: 'Uauá', mouth: { x: CENTER.x, y: 0 } },
  { id: 'jeremoabo', short: 'JER', label: 'Jeremoabo', mouth: { x: WORLD.width, y: CENTER.y } },
  { id: 'montesanto', short: 'MSA', label: 'Monte Santo', mouth: { x: CENTER.x, y: WORLD.height } },
  { id: 'cambaio', short: 'CAM', label: 'Cambaio', mouth: { x: 0, y: CENTER.y } }
].map(road => {
  const length = Math.hypot(CENTER.x - road.mouth.x, CENTER.y - road.mouth.y);
  const dir = { x: (CENTER.x - road.mouth.x) / length, y: (CENTER.y - road.mouth.y) / length };
  return Object.freeze({ ...road, dir, end: { x: CENTER.x - dir.x * PLAZA_RADIUS, y: CENTER.y - dir.y * PLAZA_RADIUS } });
}));

// A roupa de cada papel (CharacterModel.equip). `villager` é sorteada por pessoa.
// `hat`: straw | leather | kepi | officer | scarf. `gibao`: o gibão de couro do
// vaqueiro, que muito jagunço usava contra o espinho da caatinga. `pack`: mochila
// com o cobertor enrolado. `belts`: correame de couro com cartucheiras.
export const LOOKS = Object.freeze({
  villager: { kind: 'villager' },
  jaguncoBlade: { hat: 'leather', gibao: true, bandolier: false },
  jaguncoPike: { hat: 'leather', bandolier: false },
  jaguncoRifle: { hat: 'leather', bandolier: true },
  conselheiro: { tunic: true, beard: true, longHair: true, staff: true },
  soldier: { army: true, hat: 'kepi', belts: true, pack: true, stripe: true },
  officer: { army: true, hat: 'officer', belts: true, stripe: true },
  matadeira: { army: true, hat: 'kepi', belts: true, stripe: true, bigCannon: true },
  // O carreiro tocando o carro de bois do comboio de Monte Santo.
  carter: { army: true, hat: 'kepi', stripe: true, cart: true },
  // Os chefes do arraial, cada um com a sua cara.
  abade: { hat: 'leather', gibao: true, bandolier: true },
  // Euclides o descreve como "legítimo cafuz": filho de indígena e de africano.
  pajeu: { hat: 'leather', bandolier: true, skin: '#5a3826' },
  quadrado: { hat: 'straw', satchel: true },
  vilanova: { hat: 'straw', vest: true },
  macambira: { hat: 'leather' }
});

// `speed` multiplica o passo de caminhada; `reach` é o alcance do golpe (ou do tiro,
// em `ranged`); `sight` a distância em que se percebe inimigo; `vsBuilding`
// multiplica o dano em construção; `accuracy` é a chance do tiro acertar. Soldado da
// República: `bounty` é o que o arraial recolhe dele (munição e comida; `rifles`,
// os fuzis a mais além do dele, que cai no chão junto — UnitSystem.#dropRifles).
export const UNIT_TYPES = Object.freeze({
  worker: {
    label: 'Sertanejo', plural: 'Sertanejos', icon: 'sertanejo', hp: 45, damage: 4, weapon: 'club', reach: 12,
    interval: 1.4, swing: .95, speed: 1.15, size: 9.4, sight: 60, vsBuilding: .5, look: 'villager',
    cost: { food: 50, wood: 0 }, time: 9, from: 'hall'
  },
  warrior: {
    label: 'Jagunço de facão', plural: 'Jagunços de facão', icon: 'jagunco', hp: 115, damage: 11, weapon: 'machete', reach: 13,
    interval: 1.2, swing: .9, speed: 1.2, size: 10.2, sight: 120, vsBuilding: 1, look: 'jaguncoBlade',
    cost: { food: 50, wood: 25, rifles: 1 }, time: 11, from: 'camp'
  },
  spearman: {
    label: 'Jagunço de chuço', plural: 'Jagunços de chuço', icon: 'pike', hp: 85, damage: 10, weapon: 'spear', reach: 26,
    interval: 1.35, swing: .85, speed: 1.25, size: 10.2, sight: 135, vsBuilding: .7, look: 'jaguncoPike',
    cost: { food: 40, wood: 45, rifles: 1 }, time: 12, from: 'camp'
  },
  rifleman: {
    // (o bacamarte carrega pela boca: o ciclo é mais longo e o tiro, mais forte)
    label: 'Atirador', plural: 'Atiradores', icon: 'blunderbuss', hp: 75, damage: 16, weapon: 'blunderbuss', reach: 78,
    interval: 3, swing: .7, speed: 1.1, size: 10.2, sight: 110, vsBuilding: .5, look: 'jaguncoRifle',
    ranged: true, accuracy: .7, cost: { food: 70, wood: 50, rifles: 1 }, time: 14, from: 'camp'
  },
  conselheiro: {
    label: 'Antônio Conselheiro', plural: 'Antônio Conselheiro', icon: 'cross', hp: 240, damage: 0, weapon: null,
    reach: 0, interval: 1, swing: 1, speed: .8, size: 10.4, sight: 0, vsBuilding: 0, look: 'conselheiro',
    passive: true, blessing: { radius: 60, heal: 6 }
  },
  // Os chefes de Belo Monte (Os Sertões, O Homem e A Luta). Chegam ao arraial com os
  // romeiros, um por vez (HEROES); cada um é único e, morto, não volta.
  abade: {
    label: 'João Abade', plural: 'João Abade', icon: 'jagunco', hp: 260, damage: 16, weapon: 'machete', reach: 13,
    interval: 1.1, swing: .9, speed: 1.2, size: 10.8, sight: 130, vsBuilding: 1, look: 'abade', hero: true,
    aura: { radius: 95, damage: 1.2, heal: 0 },
    role: 'O "chefe do povo": os jagunços perto dele lutam com mais força'
  },
  pajeu: {
    label: 'Pajeú', plural: 'Pajeú', icon: 'eye', hp: 190, damage: 18, weapon: 'rifle', reach: 88,
    interval: 1.8, swing: .7, speed: 1.3, size: 10.6, sight: 140, vsBuilding: .6, look: 'pajeu', hero: true,
    ranged: true, accuracy: .85, ambusher: true,
    role: 'Mestre da tocaia: parado, some em qualquer lugar e o primeiro tiro vale por três'
  },
  quadrado: {
    label: 'Manuel Quadrado', plural: 'Manuel Quadrado', icon: 'repair', hp: 120, damage: 0, weapon: null, reach: 0,
    interval: 1, swing: 1, speed: 1, size: 10, sight: 0, vsBuilding: 0, look: 'quadrado', hero: true, passive: true,
    aura: { radius: 80, damage: 1, heal: 3.5 },
    role: 'O curandeiro: quem está perto dele sara depressa'
  },
  vilanova: {
    label: 'Antônio Vilanova', plural: 'Antônio Vilanova', icon: 'trade', hp: 120, damage: 0, weapon: null, reach: 0,
    interval: 1, swing: 1, speed: 1, size: 10.2, sight: 0, vsBuilding: 0, look: 'vilanova', hero: true, passive: true,
    trader: true,
    role: 'O negociante: tudo o que entra rende mais, e dá para trocar comida por madeira'
  },
  macambira: {
    label: 'Filho de Macambira', plural: 'Filho de Macambira', icon: 'club', hp: 160, damage: 14, weapon: 'club', reach: 13,
    interval: 1.1, swing: .9, speed: 1.35, size: 10, sight: 120, vsBuilding: 1, look: 'macambira', hero: true,
    antiCannon: 5,
    role: '"Pai! quero escangalhar a matadeira!" — arrebenta canhão com a alavanca'
  },
  private: {
    label: 'Soldado de linha', plural: 'Soldados de linha', icon: 'soldier', hp: 45, damage: 7, weapon: 'rifle', reach: 70,
    interval: 2.4, swing: .7, speed: .6, size: 10, sight: 90, vsBuilding: .5, look: 'soldier',
    ranged: true, accuracy: .6, bounty: { food: 6, wood: 4 }
  },
  bayonet: {
    label: 'Soldado de baioneta', plural: 'Soldados de baioneta', icon: 'bayonet', hp: 55, damage: 10, weapon: 'bayonet', reach: 24,
    interval: 1.35, swing: .85, speed: .78, size: 10, sight: 90, vsBuilding: .8, look: 'soldier',
    bounty: { food: 8, wood: 6 }
  },
  gunner: {
    label: 'Canhão Krupp', plural: 'Canhões Krupp', icon: 'cannon', hp: 120, damage: 34, weapon: null, reach: 130,
    interval: 5, swing: .8, speed: .4, size: 10.4, sight: 140, vsBuilding: 2, look: 'soldier', cannon: true,
    ranged: true, siege: true, accuracy: .8, bounty: { food: 18, wood: 18 }
  },
  officer: {
    label: 'Oficial', plural: 'Oficiais', icon: 'saber', hp: 420, damage: 22, weapon: 'saber', reach: 14,
    interval: 1.3, swing: .9, speed: .55, size: 11, sight: 100, vsBuilding: 1.5, look: 'officer',
    bounty: { food: 60, wood: 60, rifles: 4 }, commander: true
  },
  // O Whitworth 32 (Euclides grafa "Withworth"), a "matadeira": canhão de sítio que
  // bombardeava as igrejas.
  matadeira: {
    label: 'Matadeira (Whitworth 32)', plural: 'Matadeiras', icon: 'siege', hp: 900, damage: 90, weapon: null,
    reach: 240, interval: 9, swing: .8, speed: .22, size: 11, sight: 250, vsBuilding: 2, look: 'matadeira',
    cannon: true, ranged: true, siege: true, churchHunter: true, accuracy: .9,
    bounty: { food: 100, wood: 100, rifles: 10 }
  },
  // O comboio de Monte Santo: carro de bois com munição e farinha para a tropa.
  convoy: {
    label: 'Comboio de Monte Santo', plural: 'Comboios', icon: 'cart', hp: 340, damage: 0, weapon: null, reach: 0,
    interval: 1, swing: 1, speed: .34, size: 10, sight: 0, vsBuilding: 0, look: 'carter', passive: true, convoy: true,
    bounty: { food: 80, wood: 40, rifles: 6 }
  }
});

// `capacity` é o tamanho da casa (hutSize); `radius` o chão que ocupa; `pop` quanto
// teto de população dá; `build` os segundos de trabalho de UM trabalhador.
// Os custos sobem em escada, na ordem de BUILD_ORDER: no começo só a trincheira
// cabe no bolso, e cada obra seguinte pede mais trabalho acumulado que a anterior
// (com 6 sertanejos, o arraial junta perto de 100 de madeira e 100 de comida por
// minuto, mais o prêmio de cada onda vencida). Assim as opções vão se abrindo com
// o tempo, uma de cada vez, em vez de todas de uma vez logo no início.
// A igreja de Santo Antônio é o coração do arraial: caiu, acabou.
export const BUILDING_TYPES = Object.freeze({
  hall: {
    label: 'Igreja de Santo Antônio', fem: true, icon: 'church', hp: 1500, radius: 30, capacity: 12, pop: 10, build: 90,
    cost: { food: 0, wood: 0 }, trains: ['worker'], dropOff: true
  },
  tower: {
    label: 'Trincheira', fem: true, icon: 'trench', hp: 420, radius: 11, capacity: 0, pop: 0, build: 20,
    cost: { food: 30, wood: 70, rifles: 1 }, trains: [], dropOff: false
  },
  house: {
    label: 'Casa de taipa', fem: true, icon: 'house', hp: 220, radius: 16, capacity: 4, pop: 6, build: 18,
    cost: { food: 20, wood: 120 }, trains: [], dropOff: false
  },
  camp: {
    label: 'Acampamento', icon: 'campfire', hp: 360, radius: 14, capacity: 0, pop: 0, build: 26,
    cost: { food: 60, wood: 230 }, trains: ['warrior', 'spearman', 'rifleman'], dropOff: false
  },
  lodge: {
    label: 'Armazém', icon: 'storehouse', hp: 450, radius: 22, capacity: 8, pop: 4, build: 40,
    cost: { food: 80, wood: 300 }, trains: [], dropOff: true
  },
  // "...ou tangiam os rebanhos de cabras": o curral rende comida sozinho.
  curral: {
    label: 'Curral de cabras', icon: 'goat', hp: 260, radius: 15, capacity: 6, pop: 0, build: 24,
    cost: { food: 40, wood: 170 }, trains: [], dropOff: false, herd: { food: 4, every: 5 }
  },
  // A igreja nova, "retangular, e vasto, e pesado", inacabada, de cujas torres os
  // jagunços atiravam. Uma só, cara e demorada.
  igrejanova: {
    label: 'Igreja Nova', fem: true, icon: 'newchurch', hp: 2400, radius: 26, capacity: 12, pop: 0, build: 140,
    cost: { food: 220, wood: 600 }, trains: [], dropOff: false, unique: true,
    turret: { range: 190, damage: 13, interval: .8 }
  },
  // Só do inimigo (campanha): a barraca de lona dos acampamentos da tropa, em Uauá
  // e no alto da Favela.
  barraca: {
    label: 'Barraca da tropa', fem: true, icon: 'storehouse', hp: 300, radius: 12, capacity: 4, pop: 0, build: 10,
    cost: { food: 0, wood: 0 }, trains: [], dropOff: false
  }
});
export const BUILD_ORDER = Object.freeze(['tower', 'house', 'curral', 'camp', 'lodge', 'igrejanova']);
export const TRAIN_QUEUE_MAX = 5;

// Trincheira: alcance e dano por nível (0, 1, 2), cadência e a carga de bacamarte
// (pedra, prego e chumbo), que espalha o dano em quem está do lado.
export const TOWER = Object.freeze({
  range: [115, 145, 175],
  damage: [9, 15, 23],
  interval: 1.3,
  bulletSpeed: 520,
  splash: 26,
  splashShare: .5
});
// Os jagunços tomaram centenas de fuzis Mannlicher e munição da 3ª expedição
// (março de 1897); o jirau é o estrado de forquilhas do sertão, aqui como posto de
// vigia; e o bacamarte carregado de pedra e prego era arma comum no arraial.
// Melhorar custa mais que erguer: a trincheira nova não sai melhorada na mesma
// hora, e cada nível pede um bom tempo de trabalho (o segundo, bem mais).
export const TOWER_UPGRADES = Object.freeze({
  power: { label: 'Mannlichers tomados', short: 'Fuzis', icon: 'mannlicher', costs: [{ food: 60, wood: 150, rifles: 4 }, { food: 130, wood: 280, rifles: 10 }] },
  range: { label: 'Jirau de vigia', short: 'Jirau', icon: 'jirau', costs: [{ food: 40, wood: 120 }, { food: 100, wood: 240 }] },
  scatter: { label: 'Carga de bacamarte', short: 'Bacamarte', icon: 'scatter', costs: [{ food: 150, wood: 220 }] }
});
export const TOWER_UPGRADE_ORDER = Object.freeze(['power', 'range', 'scatter']);

// As expedições, para o letreiro de cada onda: até a 2ª onda a 1ª expedição, e
// assim por diante; da 7ª em diante, a 4ª expedição e seus reforços até o fim.
export const EXPEDITIONS = Object.freeze([
  { until: 2, name: '1ª expedição', leader: 'Ten. Pires Ferreira' },
  { until: 4, name: '2ª expedição', leader: 'Maj. Febrônio de Brito' },
  { until: 6, name: '3ª expedição', leader: 'Cel. Moreira César' },
  { until: Infinity, name: '4ª expedição', leader: 'Gen. Artur Oscar' }
]);

// Ondas: espera antes da primeira, intervalo entre elas, e por dificuldade quanto
// cresce a quantidade (`count`) e a vida dos soldados (`hp`).
export const DIFFICULTY = Object.freeze({
  easy: { label: 'Fácil', count: .75, hp: .8, firstWave: 120, break: 70 },
  normal: { label: 'Normal', count: 1, hp: 1, firstWave: 100, break: 60 },
  hard: { label: 'Difícil', count: 1.3, hp: 1.2, firstWave: 80, break: 50 }
});
// Segundos entre dois soldados saindo da mesma estrada: a tropa marcha em coluna.
export const SPAWN_GAP = 1.8;

// ---- Os Sertões no jogo ----

// Os chefes que chegam ao arraial depois de cada onda rechaçada.
export const HEROES = Object.freeze([
  { type: 'abade', after: 1 }, { type: 'pajeu', after: 2 }, { type: 'quadrado', after: 3 },
  { type: 'vilanova', after: 4 }, { type: 'macambira', after: 6 }
]);
// Romeiros: depois de cada onda, chegam famílias por uma estrada, até o teto.
export const ROMEIROS = Object.freeze({ base: 1, perWaves: 3, max: 5 });
// Caatinga como aliada: a tropa anda mais devagar na caatinga fechada e erra mais em
// quem está nela; jagunço parado nela entra em tocaia.
export const THICKET = Object.freeze({ slow: .72, cover: .6 });
export const TOCAIA = Object.freeze({ settle: 2, firstHit: 2.2, ambusher: 3, reveal: 18 });
// Sede: a tropa longe d'água vai perdendo força; numa cacimba ela bebe e se refaz.
export const THIRST = Object.freeze({ grace: 35, span: 140, maxLoss: .35, drinkReach: 8 });
// Noite: as balas dos jagunços "durante a noite inteira" não deixam a tropa descansar.
export const NIGHT = Object.freeze({ dark: .3, accuracy: .75, pace: .9 });
// Debandada: oficial morto, quem está perto foge largando o fuzil.
export const DEBANDADA = Object.freeze({ radius: 160, time: 9, rifleChance: .6 });
// Comboio: de três em três ondas, na trégua, por uma estrada; vai até o meio dela,
// descarrega e volta. Escapou: a próxima onda vem maior; tomado: menor.
export const CONVOY = Object.freeze({ every: 3, firstAfter: 2, escort: 2, reach: .55, unload: 18, bonus: .25 });
// Cerco: nas ondas finais, parte da tropa vem pela caatinga, fora das estradas.
export const CERCO = Object.freeze({ from: 12, every: 4, share: .3 });
// Matadeira: chega com a 4ª expedição, de oito em oito ondas.
export const MATADEIRA = Object.freeze({ from: 8, every: 8 });
// Troca do Vilanova e o rendimento a mais do que entra enquanto ele vive.
export const TRADE = Object.freeze({ give: 100, get: 60, bonus: 1.2 });
// Quanto a luz da oração do Conselheiro (e o bordão erguido) leva para sumir, em
// segundos, depois que a pessoa sara ou sai de perto dele.
export const BLESSING_FADE = .6;
// Os morros em volta do arraial: em cima deles o tiro alcança mais longe.
export const HILLS = Object.freeze([
  { id: 'favela', label: 'Morro da Favela', x: 590, y: 668, radius: 86, height: 46 },
  { id: 'mario', label: 'Alto do Mário', x: 215, y: 205, radius: 72, height: 36 }
]);
export const HILL_REACH = 1.22;

// Combate.
export const WOUND_HIT_CHANCE = .55;
// Soldado parado persegue até esta distância do posto antes de voltar.
export const GUARD_LEASH = 200;
// Trabalhador atacado revida (se o agressor estiver perto) por este tempo.
export const WORKER_RETALIATE = 6;
// Espaçamento da formação ao mandar um grupo andar.
export const FORMATION_SPACING = 15;

// Aviso de "arraial sob ataque": no máximo um a cada tantos segundos reais.
export const ALERT_COOLDOWN = 8;

// ---- O que muda de uma missão para outra (config/rts.js escolhe a missão) ----

// O pregador da vila: quem nasce no adro e cura os feridos perto dele.
export const PREACHER_TYPE = 'conselheiro';
// Chefes que já estão na vila no começo da partida (os outros chegam com HEROES).
export const START_HEROES = Object.freeze([]);
// Recorde de ondas por dificuldade, guardado neste navegador.
export const RECORD_KEY = 'canudos-melhor';
// Pontos da beirada do tabuleiro entre uma estrada e outra: por onde a tropa entra
// pela caatinga quando fecha o cerco.
export const EDGE_ENTRIES = Object.freeze([
  { x: 130, y: 6 }, { x: 690, y: 6 }, { x: WORLD.width - 6, y: 130 }, { x: WORLD.width - 6, y: 690 },
  { x: 690, y: WORLD.height - 6 }, { x: 130, y: WORLD.height - 6 }, { x: 6, y: 690 }, { x: 6, y: 130 }
]);
// As ferramentas da gente da vila: machado de ferro na lenha, facão na roça, e o que
// se leva na mão até a igreja (o fuzil tomado).
export const TOOLS = Object.freeze({ axe: 'axe', gather: 'machete', loot: 'rifle' });
// Mecânicas que só a outra missão tem: flecha perdida que se recolhe do chão, flecha
// feita na fogueira, nome novo de quem mata, a rede de madeira e as canoas de guerra.
export const RECOVER_ARROWS = false;
export const CRAFT = null;
export const NAMES = null;
export const SNARE = null;
export const IGARA = null;
// Latitude de Belo Monte (9°58' S), para o caminho do sol (sky/Astronomy).
export const LATITUDE = -9.97;

// Os textos da interface que contam a história desta missão (RtsHud, GameMenu,
// main.js). `page` troca os textos fixos do index.html; aqui é null porque o
// index.html já vem escrito para Canudos.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const join = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list.at(-1)}` : list[0];
export const TEXT = Object.freeze({
  page: null,
  startToast: 'Corte lenha e cave trincheiras na beira das estradas',
  webgl: 'Este jogo precisa de WebGL para desenhar o sertão, e o seu navegador não conseguiu ligá-lo. Tente outro navegador ou ative a aceleração de hardware.',
  underAttack: 'Belo Monte está sob ataque! Toque para ver',
  rout: ({ fled, rifles }) => `Oficial abatido: ${fled} soldados em debandada${rifles ? `, ${rifles} fuzis largados` : ''}`,
  arrival: ({ count, road, hero }) => hero
    ? `${UNIT_TYPES[hero].label} chega a Belo Monte${count ? ` com ${plural(count, 'romeiro', 'romeiros')}` : ''}`
    : count ? `Chegam ${plural(count, 'romeiro', 'romeiros')} pela estrada de ${road.label}` : '',
  firstPickup: 'Fuzil tomado da tropa! Quem apanhou leva até a igreja',
  waveBanner: ({ number, roads, count, guns, officers, matadeira, cerco }) => {
    const expedition = EXPEDITIONS.find(item => number <= item.until);
    // Canhão e oficial vêm anunciados: são os que pedem resposta (jirau, jagunços).
    const extras = [matadeira && 'a Matadeira', guns && `${guns} ${guns > 1 ? 'canhões' : 'canhão'} Krupp`,
      officers && `${officers} ${officers > 1 ? 'oficiais' : 'oficial'}`].filter(Boolean);
    const list = join(extras);
    return {
      kicker: `${expedition.name} · ${expedition.leader}`,
      sub: `${count} soldados ${roads.length > 1 ? 'pelas estradas' : 'pela estrada'} de ${join(roads.map(road => road.label))}` +
        (list ? `, com ${list}` : '') + (cerco ? '. A tropa fecha o cerco pela caatinga' : '')
    };
  },
  waveCleared: { kicker: 'A tropa recua', title: number => `Onda ${number} rechaçada` },
  waveWord: 'Onda',
  noHousing: 'Sem lugar para morar — construa uma casa de taipa',
  retreatSub: 'para a igreja',
  idleSub: n => `${n} sertanejo${n === 1 ? '' : 's'}`,
  armyLabel: 'Jagunços',
  workersLabel: 'Sertanejos',
  preacherLabel: 'Conselheiro',
  preacherSub: alive => alive ? 'reza e cura' : 'morto',
  heroesLabel: 'Chefes',
  heroesSub: n => `${n} no arraial`,
  baseLabel: 'Igreja',
  herdDetail: herd => `As cabras dão +${herd.food} de comida a cada ${herd.every} s`,
  scatterTag: 'bacamarte',
  repairHint: 'mande sertanejos consertar',
  disarmed: 'sem fuzil',
  enemyHint: 'Escolha jagunços e toque nele para atacar',
  hidden: 'De tocaia',
  homeTitle: 'Belo Monte',
  praying: 'Rezando pelos feridos',
  preacherIdle: 'Reza por quem chega ferido perto dele, e a pessoa sara',
  carryWood: 'Levando lenha',
  chopping: 'Cortando lenha',
  farming: 'Trabalhando na roça',
  workerIdle: 'À toa — toque numa árvore ou numa roça',
  lack: { food: 'Falta comida', wood: 'Falta madeira', rifles: 'Faltam fuzis tomados da tropa' },
  thirdLabel: 'fuzis tomados',
  resultKicker: 'A igreja caiu',
  resultHeld: waves => `Belo Monte resistiu a ${plural(waves, 'onda', 'ondas')} do Exército.`,
  waveUnit: ['onda', 'ondas'],
  towerHit: 'Tiro da trincheira',
  splashHit: 'Carga de bacamarte',
  newName: null,
  crafted: null
});
