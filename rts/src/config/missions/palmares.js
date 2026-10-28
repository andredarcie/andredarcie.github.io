// Regras da terceira missão: Palmares, o quilombo da serra da Barriga, no sertão do
// que hoje é Alagoas, contra as entradas holandesas (1644–1645) e portuguesas
// (1654–1694), até o cerco da cerca real do Macaco, em janeiro e fevereiro de 1694.
// A estrutura é a mesma de Canudos (a casa do meio que não pode cair, ataques em
// ondas pelos caminhos, cercas na beira deles); só muda o que é desta gente.
//
// Tudo o que se sabe de Palmares foi escrito por quem o combatia: governadores,
// capitães, o diário de uma expedição holandesa. Cada escolha daqui cita o documento
// de onde vem, copiado do texto integral, nunca de memória, da edição de Edison
// Carneiro, "O Quilombo dos Palmares", 2ª ed. revista (Companhia Editora Nacional,
// Brasiliana vol. 302, 1958), que traz no apêndice:
//   "Relação das guerras feitas aos Palmares de Pernambuco no tempo do governador
//     D. Pedro de Almeida, de 1675 a 1678" (Torre do Tombo; Revista do IHGB, t. XXII,
//     1859) — aqui "Relação";
//   "Diário da viagem do capitão João Blaer aos Palmares em 1645" — aqui "Blaer";
// e, no corpo do livro, as cartas de governadores, de Fernão Carrilho e de Domingos
// Jorge Velho. A grafia é a da edição de 1958 ("êles", "tôda").
//
// Os nomes que não estão aqui vêm iguais aos de Canudos (export *): a economia, os
// tempos, a sede da tropa ("a falta das águas, o descômodo dos soldados", Relação),
// a tocaia na mata, a noite e a debandada.
import { WORLD } from '../world.js';
import { TOWER as TUPI_TOWER } from './tupinamba.js';
import { CONVOY as CANUDOS_CONVOY } from './canudos.js';

export * from './canudos.js';

export const CENTER = Object.freeze({ x: WORLD.width / 2, y: WORLD.height / 2 });

// A gente dos Palmares: "alguns negros" fugidos (Relação) — da Costa da Mina e,
// sobretudo, de Angola ("Ganga-Muíça, Mestre de Campo da gente de Angola") —, os
// crioulos nascidos ali, mulatos e alguns índios (Carneiro, cap. I, 10). Um tom só
// para os dois lados, como nas outras missões, não serve: a tropa era de "homens
// brancos, mulatos e índios" (Relação, 1675), e cada um sai com a sua cara (LOOKS).
export const SKIN_TONES = Object.freeze(['#4a2e20', '#5a3826', '#3e271b', '#6e4530', '#553422', '#7a4c32', '#8d5a3b']);
const TROOP_SKINS = Object.freeze(['#d9a27a', '#c48a5e', '#e0b088', '#a8714a', '#b77f55']);

// A roupa: "O modo de vestir entre si é o mesmo que observam entre nós. Mais ou menos
// enroupados conforme as possibilidades" (Relação); "as suas roupas são quase tôdas de
// entrecasca de árvores e pouca chita" (Blaer). Os de 1678 vieram "cobertas as partes
// naturais como costumam, uns com panos, outros com peles" (Relação). Daí: tanga ou
// calção de entrecasca (o pardo da casca batida), algum pano de chita, e o tronco nu.
// A tropa: cada soldado levava "às costas a arma, a pólvora, balas, capote, farinha,
// água, peixe, carne e rêde com que possa dormir" (Relação) — o capote e a rede vão
// na mochila; o resto (camisa e calção de pano cru, chapéu de feltro) é do jogo.
export const CLOTH = Object.freeze({
  entrecasca: ['#8a6a48', '#7a5a3c', '#9a7a52', '#6e5236'],
  chita: ['#b8473a', '#3e5a7e', '#c9a046', '#7a5a7a', '#e3d8bf'],
  // O pano branco do que serve de pároco.
  linen: '#e2d8c0',
  troopShirts: ['#d6c8a6', '#c9b994', '#e3d8bf', '#b9a98a'],
  troopBreeches: ['#5a4a3a', '#6f5a44', '#4a4038', '#7d7262'],
  officerCoat: '#5a2a24',
  felt: '#2a2420',
  belt: '#3a2a1e',
  leather: '#7a4e2c',
  hair: '#17130f',
  // A pintura dos índios da tropa (o mesmo urucum e jenipapo das outras aldeias).
  jenipapo: '#1e2531',
  urucum: '#b0402a',
  featherYellow: '#e8c43a',
  featherRed: '#c0392b',
  featherBrown: '#8a5a34',
  rhea: '#8a8274',
  shell: '#ece4d2',
  greenStone: '#5f8f6a',
  bone: '#e6dcc4',
  tapacura: '#a8382a',
  greyHair: '#8f8a84'
});

export const TEAMS = Object.freeze({
  player: { id: 'player', name: 'Palmares', outfit: '#7a5a3c', ring: '#ffd36b', base: CENTER },
  enemy: { id: 'enemy', name: 'Tropa das entradas', outfit: '#c9b994', ring: '#ff6a55', base: CENTER }
});

// O terceiro recurso são as armas de fogo: "usam hoje de tôdas, umas que fazem,
// outras que roubam, e as que compram são de fogo" (Relação). Vêm das que a tropa
// larga no chão (como os fuzis de Canudos) e do trato com os moradores (CRAFT).
// No código continua `rifles`, o nome de Canudos.
export const START_RIFLES = 2;

// Os caminhos que subiam aos Palmares, cada um do meio de uma beirada, pelo lado de
// cada vila de onde partiam as entradas: Serinhaém ao norte, Porto Calvo a leste
// (16 léguas do mocambo do Zumbi, Relação), as Alagoas ao sul e, a oeste, o rio de
// São Francisco, por onde vieram os paulistas (a pólvora deles foi entregue "no Rio
// de São Francisco (Penedo)", Capitulações de 1687).
export const ROADS = Object.freeze([
  { id: 'serinhaem', short: 'SER', label: 'Serinhaém', mouth: { x: CENTER.x, y: 0 } },
  { id: 'portocalvo', short: 'PCA', label: 'Porto Calvo', mouth: { x: WORLD.width, y: CENTER.y } },
  { id: 'alagoas', short: 'ALA', label: 'Alagoas', mouth: { x: CENTER.x, y: WORLD.height } },
  { id: 'saofrancisco', short: 'RSF', label: 'Rio São Francisco', mouth: { x: 0, y: CENTER.y } }
].map(road => {
  const length = Math.hypot(CENTER.x - road.mouth.x, CENTER.y - road.mouth.y);
  const dir = { x: (CENTER.x - road.mouth.x) / length, y: (CENTER.y - road.mouth.y) / length };
  return Object.freeze({ ...road, dir, end: { x: CENTER.x - dir.x * 82, y: CENTER.y - dir.y * 82 } });
}));

// A roupa de cada papel (UnitFactory, com `palmares` ou, nos índios da tropa, `tupi`).
// `shirt`: com camisa de chita (sem ela, o tronco nu); `troop`: a tropa das entradas,
// com o chapéu de feltro, o correame e a mochila do capote e da rede; `officer`: o
// gibão do capitão; `skins`: os tons de quem sai com essa roupa.
export const LOOKS = Object.freeze({
  villager: { kind: 'villager', palmares: true },
  guerreiro: { palmares: true, bandolier: true },
  lanceiro: { palmares: true },
  flecheiro: { palmares: true },
  espingardeiro: { palmares: true, shirt: true, bandolier: true },
  paroco: { palmares: true, robe: true },
  gaspar: { palmares: true, shirt: true, bandolier: true },
  muica: { palmares: true, shirt: true, gibao: true },
  zumbi: { palmares: true, bandolier: true },
  soldado: { troop: true, belts: true, pack: true, skins: TROOP_SKINS },
  incendiario: { troop: true, belts: true, skins: TROOP_SKINS },
  artilheiro: { troop: true, belts: true, skins: TROOP_SKINS },
  capitao: { troop: true, officer: true, belts: true, skins: TROOP_SKINS },
  // "índios do Camarão" com Fernão Carrilho (1677); os "índios oroazes e cupinharões"
  // dos paulistas (Domingos Jorge Velho, 1694). Arco e flecha, a pintura de urucum e
  // jenipapo; sem pena: os documentos não dizem nada do enfeite deles.
  indio: { tupi: true, enemy: true, paint: 'legs' }
});

// Mesmos campos de Canudos. Soldado da tropa: `bounty` é o que o quilombo recolhe
// dele; cada um que cai larga a espingarda no chão (`drops`, padrão 1).
export const UNIT_TYPES = Object.freeze({
  // "São grandemente trabalhadores, plantam todos os legumes da terra" (Relação).
  worker: {
    label: 'Palmarino', plural: 'Palmarinos', icon: 'morador', hp: 45, damage: 4, weapon: 'club', reach: 12,
    interval: 1.4, swing: .95, speed: 1.15, size: 9.4, sight: 60, vsBuilding: .5, look: 'villager',
    cost: { food: 50, wood: 0 }, time: 9, from: 'hall'
  },
  // As armas brancas saem das forjas: "tendas de ferreiro, e outras oficinas, com que
  // poderão fazer armas" (governador Fernão Coutinho, 1671). O rei mesmo fugiu em
  // 1677 largando "uma pistola dourada e a espada de que usava" (Relação).
  warrior: {
    label: 'Guerreiro de espada', plural: 'Guerreiros de espada', icon: 'fighters', hp: 115, damage: 11, weapon: 'machete', reach: 13,
    interval: 1.2, swing: .9, speed: 1.2, size: 10.2, sight: 120, vsBuilding: 1, look: 'guerreiro',
    cost: { food: 50, wood: 25 }, time: 11, from: 'camp'
  },
  spearman: {
    label: 'Lanceiro', plural: 'Lanceiros', icon: 'pike', hp: 85, damage: 10, weapon: 'spear', reach: 26,
    interval: 1.35, swing: .85, speed: 1.25, size: 10.2, sight: 135, vsBuilding: .7, look: 'lanceiro',
    cost: { food: 40, wood: 45 }, time: 12, from: 'camp'
  },
  // A embaixada de 1678 "entraram com seus arcos e flechas, e uma arma de fogo"
  // (Relação); no cerco de 1694, "muitas balas, flechas e pedras que de noite e de
  // dia atiravam" (alferes Gabriel de Góis).
  archer: {
    label: 'Flecheiro', plural: 'Flecheiros', icon: 'bow', hp: 70, damage: 10, weapon: 'bow', reach: 84,
    interval: 2.1, swing: .9, speed: 1.2, size: 10.2, sight: 115, vsBuilding: .3, look: 'flecheiro',
    ranged: true, accuracy: .7, cost: { food: 40, wood: 40 }, time: 12, from: 'camp'
  },
  // "e as que compram são de fogo" (Relação): carrega pela boca, como o bacamarte.
  rifleman: {
    label: 'Espingardeiro', plural: 'Espingardeiros', icon: 'espingarda', hp: 75, damage: 16, weapon: 'blunderbuss', reach: 80,
    interval: 3, swing: .7, speed: 1.1, size: 10.2, sight: 110, vsBuilding: .5, look: 'espingardeiro',
    ranged: true, accuracy: .68, cost: { food: 70, wood: 40, rifles: 1 }, time: 14, from: 'camp'
  },
  // "Escolhem um dos mais ladinos, a quem veneram como pároco, que os batiza e os
  // casa" (Relação). Que ele cure os feridos é do jogo, como a reza do Conselheiro.
  paroco: {
    label: 'Pároco do Macaco', plural: 'Pároco do Macaco', icon: 'cross', hp: 220, damage: 0, weapon: null,
    reach: 0, interval: 1, swing: 1, speed: .85, size: 10.4, sight: 0, vsBuilding: 0, look: 'paroco',
    passive: true, blessing: { radius: 60, heal: 6 }
  },
  // Os chefes, cada um com o que o documento diz dele. Chegam ao Macaco com os
  // fugidos, um por vez (HEROES); únicos e, mortos, não voltam.
  // "acabaram nêle os cabos de maior fama, como foram Gaspar, capitão da guarda do
  // rei" (Relação, 1677).
  gaspar: {
    label: 'Gaspar', plural: 'Gaspar', icon: 'pike', hp: 300, damage: 15, weapon: 'spear', reach: 26,
    interval: 1.2, swing: .85, speed: 1.15, size: 10.8, sight: 130, vsBuilding: 1, look: 'gaspar', hero: true,
    role: 'O capitão da guarda do rei: aguenta muito mais que um lanceiro'
  },
  // "o Ganga-Muíça, Mestre de Campo da gente de Angola" (Relação, 1677).
  muica: {
    label: 'Ganga-Muíça', plural: 'Ganga-Muíça', icon: 'saber', hp: 240, damage: 15, weapon: 'machete', reach: 13,
    interval: 1.1, swing: .9, speed: 1.2, size: 10.8, sight: 130, vsBuilding: 1, look: 'muica', hero: true,
    aura: { radius: 95, damage: 1.2, heal: 0 },
    role: 'Mestre de Campo da gente de Angola: os guerreiros perto dele lutam com mais força'
  },
  // "o general das armas, que se chamava Zambi, que quer dizer deus da guerra, negro
  // de singular valor, grande ânimo e constância rara"; ferido a bala em 1675, "ficou
  // vivo, porém aleijado de uma perna" (Relação): anda menos que os outros chefes.
  zumbi: {
    label: 'Zumbi', plural: 'Zumbi', icon: 'fighters', hp: 320, damage: 18, weapon: 'machete', reach: 13,
    interval: 1.05, swing: .9, speed: 1, size: 11, sight: 140, vsBuilding: 1, look: 'zumbi', hero: true,
    aura: { radius: 120, damage: 1.3, heal: 0 },
    role: 'O general das armas: os guerreiros perto dele lutam com mais força, e de mais longe'
  },
  // ---- A tropa das entradas ----
  // "280 homens brancos, mulatos e índios" (Relação, 1675). A espingarda é de
  // pederneira; nas entradas mais antigas ainda se usava o fecho de mecha — o jogo
  // usa um desenho só.
  private: {
    label: 'Soldado de espingarda', plural: 'Soldados de espingarda', icon: 'espingarda', hp: 45, damage: 8, weapon: 'blunderbuss', reach: 72,
    interval: 3, swing: .7, speed: .6, size: 10, sight: 90, vsBuilding: .5, look: 'soldado',
    ranged: true, accuracy: .55, bounty: { food: 6, wood: 4 }
  },
  bayonet: {
    label: 'Índio flecheiro', plural: 'Índios flecheiros', icon: 'bow', hp: 50, damage: 7, weapon: 'bow', reach: 74,
    interval: 2.3, swing: .9, speed: .8, size: 10, sight: 100, vsBuilding: .3, look: 'indio',
    ranged: true, accuracy: .6, drops: 0, bounty: { food: 8, wood: 6 }
  },
  // Em 1675, "largaram os nossos soldados fogo a algumas casas, que como são de
  // matéria capaz de incêndio, começaram a arder e os negros a fugir" (Relação).
  gunner: {
    label: 'Soldado com tição', plural: 'Soldados com tição', icon: 'torch', hp: 70, damage: 8, weapon: 'torch', reach: 13,
    interval: 1.6, swing: .9, speed: .7, size: 10, sight: 140, vsBuilding: 4, look: 'incendiario', siege: true,
    drops: 0, bounty: { food: 12, wood: 10 }
  },
  officer: {
    label: 'Capitão', plural: 'Capitães', icon: 'saber', hp: 420, damage: 22, weapon: 'saber', reach: 14,
    interval: 1.3, swing: .9, speed: .55, size: 11, sight: 100, vsBuilding: 1.5, look: 'capitao',
    bounty: { food: 60, wood: 60, rifles: 3 }, commander: true
  },
  // "Pela primeira vez em tôda a campanha dos Palmares, os homens de Domingos Jorge
  // Velho viram-se na contingência de empregar artilharia" (Carneiro, cap. V): o
  // sargento Estácio dos Santos foi buscar "palanquetas para uma peça de campanha".
  matadeira: {
    label: 'Peça de campanha', plural: 'Peças de campanha', icon: 'cannon', hp: 600, damage: 60, weapon: null,
    reach: 200, interval: 8, swing: .8, speed: .28, size: 10.6, sight: 220, vsBuilding: 2, look: 'artilheiro',
    cannon: true, ranged: true, siege: true, churchHunter: true, accuracy: .85,
    bounty: { food: 80, wood: 80, rifles: 6 }
  },
  // Sem comboio: "as ladeiras muito precipitadas e incapazes de carruagens para os
  // mantimentos" (Relação). Fica o tipo, que o resto do jogo conhece.
  convoy: {
    label: 'Carregadores', plural: 'Carregadores', icon: 'storehouse', hp: 200, damage: 0, weapon: null, reach: 0,
    interval: 1, swing: 1, speed: .4, size: 10, sight: 0, vsBuilding: 0, look: 'soldado', passive: true, convoy: true,
    bounty: { food: 60, wood: 20 }
  }
});

// As construções. No meio, a casa do conselho: "as casas eram em número de 220 e no
// meio delas erguia-se uma igreja, quatro forjas e uma grande casa de conselho"
// (Blaer); ali os chefes "se reuniam para deliberar" (Carneiro). Caiu, acabou.
// As casas são de palmeira: "fazem com elas as suas casas" (Blaer); "as fôlhas servem
// às casas de cobertura; os ramos de esteios" (Relação).
export const BUILDING_TYPES = Object.freeze({
  hall: {
    label: 'Casa do Conselho', fem: true, icon: 'conselho', hp: 1500, radius: 28, capacity: 12, pop: 10, build: 90,
    cost: { food: 0, wood: 0 }, trains: ['worker'], dropOff: true
  },
  // O Macaco estava "fortificado com uma cêrca de pau a pique, com torneiras abertas
  // para ofender a seu salvo os combatentes" (Relação, como Carneiro a cita no cap. V).
  tower: {
    label: 'Cerca de pau a pique', fem: true, icon: 'palisade', hp: 420, radius: 11, capacity: 0, pop: 0, build: 20,
    cost: { food: 30, wood: 70 }, trains: [], dropOff: false
  },
  house: {
    label: 'Casa de palha', fem: true, icon: 'palha', hp: 220, radius: 16, capacity: 4, pop: 6, build: 18,
    cost: { food: 20, wood: 120 }, trains: [], dropOff: false
  },
  // "O seu principal sustento é o milho grosso" (Relação); "tôdas as roças são
  // habitadas por dois ou três indivíduos" (Blaer). Rende comida sozinha: a gente
  // que mora nela.
  roca: {
    label: 'Roça de milho', fem: true, icon: 'milho', hp: 200, radius: 15, capacity: 4, pop: 0, build: 22,
    cost: { food: 40, wood: 170 }, trains: [], dropOff: false, herd: { food: 4, every: 5 }
  },
  // "quatro forjas" (Blaer): ali se fazem as armas e se preparam os guerreiros.
  camp: {
    label: 'Forja', fem: true, icon: 'forja', hp: 360, radius: 14, capacity: 0, pop: 0, build: 26,
    cost: { food: 60, wood: 230 }, trains: ['warrior', 'spearman', 'archer', 'rifleman'], dropOff: false
  },
  // "de cujos frutos formam providamente celeiros para os tempos de guerra e de
  // inverno" (Relação).
  lodge: {
    label: 'Celeiro', icon: 'tejupar', hp: 400, radius: 18, capacity: 8, pop: 4, build: 34,
    cost: { food: 80, wood: 300 }, trains: [], dropOff: true
  },
  // Só do inimigo (campanha): o engenho que os palmarinos assaltam — a casa-grande do
  // senhor e a senzala, de taipa, como as casas do sertão (SertaoBuildingModel).
  engenho: {
    label: 'Casa-grande do engenho', fem: true, icon: 'house', hp: 800, radius: 20, capacity: 10, pop: 0, build: 60,
    cost: { food: 0, wood: 0 }, trains: [], dropOff: false
  },
  senzala: {
    label: 'Senzala', fem: true, icon: 'storehouse', hp: 600, radius: 18, capacity: 8, pop: 0, build: 40,
    cost: { food: 0, wood: 0 }, trains: [], dropOff: false
  }
});
export const BUILD_ORDER = Object.freeze(['tower', 'house', 'roca', 'camp', 'lodge']);

// A cerca atira flecha (os defensores atrás dela) como a dos tupinambás.
export const TOWER = TUPI_TOWER;
// As melhorias da cerca, pelo que Domingos Jorge Velho achou no alto da Barriga em
// 1694: "cêrca muito forte, de 2 470 braças craveiras, com torneiras a dois fogos a
// cada braça, com flancos, redutos, redentes, faces, e guaritas [...] e os exteriores
// tão cheios de estrepes ocultos, e de fojos cheios dêles". Torneira a dois fogos é a
// seteira de dois atiradores: mais gente atrás da cerca.
export const TOWER_UPGRADES = Object.freeze({
  power: { label: 'Torneiras a dois fogos', short: 'Torneiras', icon: 'espingarda', costs: [{ food: 60, wood: 150, rifles: 2 }, { food: 130, wood: 280, rifles: 5 }] },
  range: { label: 'Guarita', short: 'Guarita', icon: 'jirau', costs: [{ food: 40, wood: 120 }, { food: 100, wood: 240 }] },
  scatter: { label: 'Estrepes e fojos', short: 'Estrepes', icon: 'estrepes', costs: [{ food: 150, wood: 220 }] }
});
// Quem chega perto de uma cerca com estrepes anda devagar, sondando o chão: "mal
// aparecia um soldado na extrema da estreparia para especular, e tirar algum estrepe".
export const SNARE = Object.freeze({ radius: 70, slow: .5 });

// As entradas, para o letreiro de cada onda: as duas holandesas, a de Manuel Lopes,
// a de Fernão Carrilho, a chegada dos paulistas e, da 10ª em diante, o cerco final.
export const EXPEDITIONS = Object.freeze([
  { until: 1, name: 'Expedição holandesa · 1644', leader: 'Rodolfo Baro' },
  { until: 2, name: 'Expedição holandesa · 1645', leader: 'Cap. João Blaer e Ten. Jürgens Reijmbach' },
  { until: 4, name: 'Entrada de 1675', leader: 'Sargento-mor Manuel Lopes' },
  { until: 7, name: 'Entrada de 1677', leader: 'Capitão-mor Fernão Carrilho' },
  { until: 9, name: 'Os paulistas · 1692', leader: 'Mestre de Campo Domingos Jorge Velho' },
  { until: Infinity, name: 'O cerco do Macaco · 1694', leader: 'Domingos Jorge Velho e Bernardo Vieira de Melo' }
]);

// Zumbi está no Macaco desde o começo: é o chefe que o jogador conhece e comanda.
// Concessão do jogo à história: ele só aparece nos documentos em 1675 (já "general
// das armas") e não era nascido nas entradas holandesas de 1644–1645.
export const START_HEROES = Object.freeze(['zumbi']);
// Os chefes que chegam ao Macaco depois de cada onda rechaçada.
export const HEROES = Object.freeze([
  { type: 'gaspar', after: 1 }, { type: 'muica', after: 2 }
]);
// Os fugidos que chegam depois de cada ataque: "uns levados do amor da liberdade,
// outros do mêdo do castigo" (Fernão Carrilho, 1687).
export const ROMEIROS = Object.freeze({ base: 1, perWaves: 3, max: 5 });
// Sem comboio de carro (não havia caminho para ele).
export const CONVOY = Object.freeze({ ...CANUDOS_CONVOY, firstAfter: Infinity });
// O cerco: em 1694 os sitiantes ergueram "uma contra-cêrca de enormes dimensões" em
// volta do reduto; nas ondas do cerco, parte da tropa vem pela mata.
export const CERCO = Object.freeze({ from: 10, every: 3, share: .3 });
// A peça de campanha só aparece no cerco de 1694.
export const MATADEIRA = Object.freeze({ from: 10, every: 4 });
// A serra da Barriga, a noroeste da cerca: em cima dela o tiro alcança mais longe.
export const HILLS = Object.freeze([
  { id: 'barriga', label: 'Serra da Barriga', x: 215, y: 210, radius: 90, height: 50 }
]);

export const PREACHER_TYPE = 'paroco';
export const RECORD_KEY = 'palmares-melhor';
// Ferro: "tendas de ferreiro" (1671). Machado de ferro na lenha, facão na roça, e
// na mão, a espingarda tomada da tropa.
export const TOOLS = Object.freeze({ axe: 'axe', gather: 'machete', loot: 'blunderbuss' });
// Comprar armas de fogo dos moradores: "as que compram são de fogo" (Relação); os
// moradores que se arranchavam perto dos Palmares lhes pagavam tributo "de
// ferramentas, de pólvora, de chumbo, de armas" (Domingos Jorge Velho). Com que os
// palmarinos pagavam não está nos documentos: o jogo usa o milho das roças.
export const CRAFT = Object.freeze({ at: 'hall', label: 'Trato com os moradores', icon: 'trade', give: { food: 90, wood: 30 }, get: { rifles: 1 } });
// Serra da Barriga: 9°10' S.
export const LATITUDE = -9.17;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const join = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list.at(-1)}` : list[0];
const how = (glyph, html) => `<li><span data-icon="${glyph}"></span><span>${html}</span></li>`;
export const TEXT = Object.freeze({
  page: {
    title: 'Eras do Brasil — Palmares',
    kicker: 'Serra da Barriga · 1644–1694',
    heading: 'Palmares',
    themeColor: '#1f2a1c',
    intro: 'Na mata da serra da Barriga, no sertão de Pernambuco que hoje é Alagoas, gente fugida da escravidão ergueu os Palmares: dezenas de mocambos e, no meio deles, a cerca real do Macaco. Por cinquenta anos, holandeses e portugueses mandaram entradas contra eles. Defenda a Casa do Conselho pelo maior número de ataques que conseguir.',
    how: [
      how('morador', 'Escolha <b>palmarinos</b> e toque numa <b>árvore</b> ou numa <b>roça</b> para juntar madeira e comida. Os palmarinos erguem casas de palha, roças de milho, forjas e celeiros.'),
      how('palisade', 'Erga <b>cercas de pau a pique</b> na beira dos caminhos. Toque numa para abrir <b>torneiras a dois fogos</b>, erguer uma <b>guarita</b> ou semear <b>estrepes e fojos</b>, que obrigam a tropa a andar devagar.'),
      how('forja', 'Na <b>forja</b> se preparam guerreiros de espada, lanceiros, flecheiros e espingardeiros. <b>Casas de palha</b> aumentam a população.'),
      how('espingarda', 'O espingardeiro e as torneiras pedem <b>armas de fogo</b>. Elas vêm das que a tropa larga no chão — passe qualquer um dos seus por cima e leve à Casa do Conselho — e do <b>trato com os moradores</b>, na própria casa.'),
      how('cross', 'Leve os feridos para perto do <b>pároco</b>: ele reza por eles e a vida volta ao máximo.'),
      how('road', 'Setas vermelhas mostram por onde vem a próxima entrada. A tropa sofre com a sede e com a mata; os seus, parados no mato, ficam de tocaia. <b>Chamar já</b> encerra a trégua e dá comida de bônus.'),
      how('tap', '<b>Toque</b> para escolher, <b>dois toques</b> para todos do mesmo tipo, <b>segure e arraste</b> para juntar um grupo. Mande palmarinos a uma construção danificada para <b>consertar</b>.')
    ].join(''),
    storyKicker: 'Memória dos Palmares',
    storyEmpty: 'Ainda não há nada aqui. Os registros chegam conforme a guerra acontece.',
    arena: 'A mata da serra da Barriga com a cerca do Macaco no meio',
    thirdTitle: 'Armas de fogo',
    callIcon: 'bugle'
  },
  startToast: 'Corte lenha e erga cercas de pau a pique na beira dos caminhos',
  webgl: 'Este jogo precisa de WebGL para desenhar a mata, e o seu navegador não conseguiu ligá-lo. Tente outro navegador ou ative a aceleração de hardware.',
  underAttack: 'O Macaco está sob ataque! Toque para ver',
  rout: ({ fled, rifles }) => `Capitão abatido: ${fled} soldados fogem${rifles ? `, largando ${plural(rifles, 'espingarda', 'espingardas')}` : ''}`,
  arrival: ({ count, road, hero }) => {
    const people = plural(count, 'fugido', 'fugidos');
    if (hero) return `${UNIT_TYPES[hero].label} chega ao Macaco${count ? ` com ${people}` : ''}`;
    return count ? `Chegam ${people} dos engenhos, pelo caminho de ${road.label}` : '';
  },
  firstPickup: 'Espingarda tomada da tropa! Quem apanhou leva à Casa do Conselho',
  waveBanner: ({ number, roads, count, guns, officers, matadeira, cerco }) => {
    const expedition = EXPEDITIONS.find(item => number <= item.until);
    const extras = [matadeira && 'uma peça de campanha', guns && plural(guns, 'soldado com tição', 'soldados com tição'),
      officers && plural(officers, 'capitão', 'capitães')].filter(Boolean);
    const list = join(extras);
    return {
      kicker: `${expedition.name} · ${expedition.leader}`,
      sub: `${count} homens ${roads.length > 1 ? 'pelos caminhos' : 'pelo caminho'} de ${join(roads.map(road => road.label))}` +
        (list ? `, com ${list}` : '') + (cerco ? '. A tropa fecha o cerco pela mata' : '')
    };
  },
  waveCleared: { kicker: 'A tropa recua', title: number => `Entrada ${number} rechaçada` },
  waveWord: 'Entrada',
  noHousing: 'Sem lugar para morar — erga uma casa de palha',
  retreatSub: 'para a Casa do Conselho',
  idleSub: n => `${n} palmarino${n === 1 ? '' : 's'}`,
  armyLabel: 'Guerreiros',
  workersLabel: 'Palmarinos',
  preacherLabel: 'Pároco',
  preacherSub: alive => alive ? 'reza e cura' : 'morto',
  heroesLabel: 'Chefes',
  heroesSub: n => `${n} no Macaco`,
  baseLabel: 'Conselho',
  herdDetail: herd => `A roça dá +${herd.food} de comida (milho) a cada ${herd.every} s`,
  scatterTag: 'estrepes',
  repairHint: 'mande palmarinos consertar',
  disarmed: 'sem arma',
  enemyHint: 'Escolha guerreiros e toque nele para atacar',
  hidden: 'De tocaia no mato',
  homeTitle: 'O Macaco',
  praying: 'Rezando pelos feridos',
  preacherIdle: 'Reza por quem chega ferido perto dele, e a pessoa sara',
  carryWood: 'Levando lenha',
  chopping: 'Cortando lenha',
  farming: 'Trabalhando na roça',
  workerIdle: 'À toa — toque numa árvore ou numa roça',
  lack: { food: 'Falta comida', wood: 'Falta madeira', rifles: 'Faltam armas de fogo' },
  thirdLabel: 'armas de fogo',
  resultKicker: 'A Casa do Conselho caiu',
  resultHeld: waves => `O Macaco resistiu a ${plural(waves, 'entrada', 'entradas')}.`,
  waveUnit: ['entrada', 'entradas'],
  towerHit: 'Flecha da cerca',
  splashHit: 'Flecha da cerca',
  newName: null,
  crafted: count => `+${plural(count, 'arma de fogo', 'armas de fogo')}`
});
