// Regras da segunda missão: uma aldeia tupinambá no litoral dos atuais Rio de
// Janeiro e São Paulo, pouco antes de 1500, defendendo-se dos tupiniquins. A
// estrutura é a mesma de Canudos (a casa do principal no meio, ataques em ondas
// pelas trilhas, cercas de seteiras na beira delas); só muda o que é desta gente.
//
// Quase tudo o que se sabe dos tupinambás foi escrito por europeus depois de 1500:
// a carta de Pero Vaz de Caminha (1500), Pero de Magalhães Gândavo (c. 1570) e,
// sobretudo, Gabriel Soares de Sousa, "Tratado descritivo do Brasil em 1587", que
// dedica dezenas de capítulos à vida, às aldeias e à guerra deles. Cada escolha
// daqui cita o capítulo de onde vem. O que é do tempo do contato (ferro, cachorro,
// galinha, coqueiro, banana) fica de fora: antes de Cabral não havia nada disso.
//
// Os nomes que não estão aqui vêm iguais aos de Canudos (export *): a economia, os
// tempos, a coleta e o combate básico são os mesmos.
import { WORLD } from '../world.js';
import { coastY } from '../../world/Coast.js';
import { CONVOY as CANUDOS_CONVOY } from './canudos.js';

export * from './canudos.js';

export const CENTER = Object.freeze({ x: WORLD.width / 2, y: WORLD.height / 2 });

// "de cor muito baça" (Soares, cap. CXLVIII); "pardos, um tanto avermelhados"
// (Caminha). Tupinambás e tupiniquins eram o mesmo povo: a mesma cara dos dois lados.
export const SKIN_TONES = Object.freeze(['#9a6a45', '#a5714a', '#8f5f3e', '#b07a52', '#946243', '#a86e48', '#875a3a']);

// Ninguém se veste: "Estes indios andaõ nũs sem cobertura alguã assi machos como
// femeas" (Gândavo). O que cobre o corpo é pintura e pena. `jenipapo`: a tinta preta
// dos lavores ("pintam-se de lavores pretos, que fazem com tinta de jenipapo",
// Soares, cap. CLIII); `urucum`: o vermelho dos pés e do rosto ("tingem os pés de uma
// tinta vermelha muito fina, e as faces", cap. CLV). Penas amarelas na cabeça dos
// tupinambás (cap. CLIII) e "penas vermelhas e pardas" nas dos tupiniquins que
// Caminha viu em Porto Seguro: é por elas que se distingue um lado do outro.
export const CLOTH = Object.freeze({
  jenipapo: '#1e2531',
  urucum: '#b0402a',
  featherYellow: '#e8c43a',
  featherRed: '#c0392b',
  featherBrown: '#8a5a34',
  // A "roda de penas de ema" atada sobre as ancas (cap. CLV).
  rhea: '#8a8274',
  // As contas brancas de búzio ao pescoço (cap. CLIII).
  shell: '#ece4d2',
  // A pedra verde do beiço (Caminha: "uma pedra verde"; Soares, cap. CLV) e o osso.
  greenStone: '#5f8f6a',
  bone: '#e6dcc4',
  // Os tapacurás: "do fio do algodão, tinto de vermelho", nas pernas das moças.
  tapacura: '#a8382a',
  hair: '#17130f',
  greyHair: '#8f8a84'
});

export const TEAMS = Object.freeze({
  player: { id: 'player', name: 'Aldeia tupinambá', outfit: '#a5714a', ring: '#ffd36b', base: CENTER },
  enemy: { id: 'enemy', name: 'Tupiniquins', outfit: '#9a6a45', ring: '#ff6a55', base: CENTER }
});

// O terceiro recurso são as flechas (no código continua `rifles`, o nome de Canudos).
// Cada flecheiro e cada cerca levam algumas; vêm das que se fazem no fogo do conselho
// e das que os contrários erram e ficam no chão — "alguãs velhas custumaõ apanharlhes
// as frechas pello chaõ e seruillos emquanto pellejaõ" (Gândavo).
export const START_RIFLES = 20;

// As trilhas que chegam à aldeia, cada uma do meio de uma beirada, e a praia, no
// fundo da enseada, onde as canoas de guerra desembarcam: o mar fica ao sul.
export const ROADS = Object.freeze([
  { id: 'serra', short: 'SER', label: 'Trilha da serra', mouth: { x: CENTER.x, y: 0 } },
  { id: 'rio', short: 'RIO', label: 'Trilha do rio', mouth: { x: WORLD.width, y: CENTER.y } },
  { id: 'praia', short: 'MAR', label: 'Praia', sea: true, mouth: { x: CENTER.x, y: coastY(CENTER.x) - 6 } },
  { id: 'costa', short: 'COS', label: 'Trilha da costa', mouth: { x: 0, y: CENTER.y } }
].map(road => {
  const length = Math.hypot(CENTER.x - road.mouth.x, CENTER.y - road.mouth.y);
  const dir = { x: (CENTER.x - road.mouth.x) / length, y: (CENTER.y - road.mouth.y) / length };
  return Object.freeze({ ...road, dir, end: { x: CENTER.x - dir.x * 82, y: CENTER.y - dir.y * 82 } });
}));

// A gente de cada papel (CharacterModel.equip, com `tupi`). `feathers`: diadem (o
// diadema de penas, cap. CLIII) ou cap (a "carapuça de penas amarelas e vermelhas",
// cap. CLV); `paint`: os lavores de jenipapo — stripes (faixas), legs (só as pernas),
// quartered ("quartejados, assim pelos corpos como pelas pernas", Caminha) ou full
// ("se tingem todos de jenipapo", cap. CLV); `enduape`: a roda de penas de ema;
// `tembeta`: a pedra do beiço; `maraca`: o cabaço de pedrinhas na mão.
export const LOOKS = Object.freeze({
  villager: { kind: 'villager', tupi: true },
  guerreiro: { tupi: true, feathers: 'diadem', paint: 'stripes', tembeta: true, necklace: true },
  paves: { tupi: true, feathers: 'diadem', paint: 'quartered', tembeta: true, paves: true },
  flecheiro: { tupi: true, feathers: 'diadem', paint: 'legs', tembeta: true, necklace: true },
  paje: { tupi: true, feathers: 'cap', paint: 'stripes', maraca: true, necklace: true, tembeta: true },
  principal: { tupi: true, feathers: 'cap', paint: 'full', enduape: true, necklace: true, tembeta: true },
  matador: { tupi: true, feathers: 'diadem', paint: 'full', enduape: true, tembeta: true },
  velha: { tupi: true, sex: 'female', paint: 'legs', necklace: true, grey: true },
  inimigoFlecheiro: { tupi: true, enemy: true, feathers: 'diadem', paint: 'stripes', tembeta: true },
  inimigoGuerreiro: { tupi: true, enemy: true, feathers: 'diadem', paint: 'quartered', tembeta: true, necklace: true },
  inimigoFogo: { tupi: true, enemy: true, paint: 'legs', tembeta: true },
  inimigoPrincipal: { tupi: true, enemy: true, feathers: 'cap', paint: 'full', enduape: true, necklace: true, tembeta: true },
  igara: { tupi: true, enemy: true, paint: 'stripes', boat: true }
});

// Mesmos campos de Canudos. `shield` multiplica o dano de flecha que o pavês segura;
// `drops`: quantas flechas ficam no chão quando ele cai (o flecheiro leva as dele na
// mão: "levam na mão esquerda seu arco e flechas", cap. CLV); `names`: os nomes que
// ele já tomou matando contrários (cap. CLXX); `boat`: a canoa de guerra.
export const UNIT_TYPES = Object.freeze({
  worker: {
    label: 'Morador', plural: 'Moradores', icon: 'morador', hp: 45, damage: 4, weapon: 'tacape', reach: 12,
    interval: 1.4, swing: .95, speed: 1.15, size: 9.4, sight: 60, vsBuilding: .5, look: 'villager',
    cost: { food: 50, wood: 0 }, time: 9, from: 'hall'
  },
  // "uns paus à feição de arrochos, com uma quina por uma ponta, com o que da
  // primeira pancada que dão na cabeça ao contrário, lha fazem em pedaços" (cap. CLXVIII).
  warrior: {
    label: 'Guerreiro de tacape', plural: 'Guerreiros de tacape', icon: 'tacape', hp: 115, damage: 12, weapon: 'tacape', reach: 13,
    interval: 1.2, swing: .9, speed: 1.25, size: 10.2, sight: 120, vsBuilding: 1, look: 'guerreiro',
    cost: { food: 50, wood: 25 }, time: 11, from: 'camp'
  },
  // "alguns paveses, que fazem de um pau mole e muito leve" (cap. CLXVII).
  spearman: {
    label: 'Guerreiro de pavês', plural: 'Guerreiros de pavês', icon: 'paves', hp: 165, damage: 9, weapon: 'tacape', reach: 13,
    interval: 1.35, swing: .9, speed: 1.05, size: 10.2, sight: 120, vsBuilding: .8, look: 'paves', shield: .45,
    cost: { food: 50, wood: 45 }, time: 12, from: 'camp'
  },
  // "São os tupinambás grandes flecheiros" (cap. CLX).
  rifleman: {
    label: 'Flecheiro', plural: 'Flecheiros', icon: 'bow', hp: 70, damage: 11, weapon: 'bow', reach: 86,
    interval: 2.1, swing: .9, speed: 1.2, size: 10.2, sight: 115, vsBuilding: .3, look: 'flecheiro',
    ranged: true, accuracy: .72, drops: 2, cost: { food: 40, wood: 30, rifles: 5 }, time: 12, from: 'camp'
  },
  // O pajé (cap. CLXI): Soares, colono, o chama de feiticeiro e o despreza, mas é ele
  // quem cura — "são os feiticeiros grandes médicos, chupando-lhes com a boca o lugar
  // onde lhes dói" (cap. CLXV).
  paje: {
    label: 'Pajé', plural: 'Pajés', icon: 'maraca', hp: 200, damage: 0, weapon: null,
    reach: 0, interval: 1, swing: 1, speed: .85, size: 10.4, sight: 0, vsBuilding: 0, look: 'paje',
    passive: true, blessing: { radius: 60, heal: 6 }
  },
  // Os aliados que chegam em socorro: "mandar pedir socorro a seus vizinhos, e lho
  // veem logo dar com muita presteza" (cap. CLXIX). Antes de 1500 não sobrou nome de
  // ninguém: cada um é o seu papel.
  principal: {
    label: 'Principal aliado', plural: 'Principal aliado', icon: 'feather', hp: 260, damage: 16, weapon: 'ibirapema', reach: 14,
    interval: 1.1, swing: .9, speed: 1.2, size: 10.8, sight: 130, vsBuilding: 1, look: 'principal', hero: true,
    aura: { radius: 95, damage: 1.2, heal: 0 },
    role: 'Veio de uma aldeia vizinha em socorro e prega aos guerreiros: os de perto lutam com mais força'
  },
  matador: {
    label: 'Matador de muitos nomes', plural: 'Matador de muitos nomes', icon: 'scar', hp: 190, damage: 18, weapon: 'bow', reach: 92,
    interval: 1.8, swing: .9, speed: 1.3, size: 10.6, sight: 140, vsBuilding: .4, look: 'matador', hero: true,
    ranged: true, accuracy: .86, ambusher: true, names: 5, drops: 4,
    role: 'Cada contrário que matou lhe deu um nome e um risco no corpo; parado, some na mata, e o primeiro tiro vale por três'
  },
  velha: {
    label: 'Velha curandeira', plural: 'Velha curandeira', icon: 'herb', hp: 110, damage: 0, weapon: null, reach: 0,
    interval: 1, swing: 1, speed: .9, size: 9.6, sight: 0, vsBuilding: 0, look: 'velha', hero: true, passive: true,
    aura: { radius: 80, damage: 1, heal: 3.5 },
    role: 'Cura as flechadas com as ervas da mata: quem está perto dela sara depressa'
  },
  // ---- Os tupiniquins ----
  private: {
    label: 'Flecheiro tupiniquim', plural: 'Flecheiros tupiniquins', icon: 'bow', hp: 45, damage: 7, weapon: 'bow', reach: 74,
    interval: 2.4, swing: .9, speed: .65, size: 10, sight: 90, vsBuilding: .3, look: 'inimigoFlecheiro',
    ranged: true, accuracy: .58, drops: 3, bounty: { food: 6, wood: 4 }
  },
  bayonet: {
    label: 'Guerreiro tupiniquim', plural: 'Guerreiros tupiniquins', icon: 'tacape', hp: 55, damage: 10, weapon: 'tacape', reach: 13,
    interval: 1.3, swing: .9, speed: .8, size: 10, sight: 90, vsBuilding: .9, look: 'inimigoGuerreiro',
    drops: 0, bounty: { food: 8, wood: 6 }
  },
  // As casas eram "cobertas de palmas até o chão" e o fogo nelas era o fim de uma
  // aldeia vencida (cap. CLXVIII): o tição vai direto às ocas.
  gunner: {
    label: 'Tupiniquim com tição', plural: 'Tupiniquins com tição', icon: 'torch', hp: 70, damage: 8, weapon: 'torch', reach: 13,
    interval: 1.6, swing: .9, speed: .75, size: 10, sight: 140, vsBuilding: 4, look: 'inimigoFogo', siege: true,
    drops: 0, bounty: { food: 12, wood: 10 }
  },
  // A "espada de pau de ambas as mãos muito pesada, marchetada com continhas brancas
  // de búzios" (cap. CLXXIII). Morto o principal, quem está perto foge.
  officer: {
    label: 'Principal tupiniquim', plural: 'Principais tupiniquins', icon: 'feather', hp: 420, damage: 22, weapon: 'ibirapema', reach: 14,
    interval: 1.3, swing: .9, speed: .6, size: 11, sight: 100, vsBuilding: 1.5, look: 'inimigoPrincipal',
    drops: 0, bounty: { food: 60, wood: 60, rifles: 6 }, commander: true
  },
  // "suas canoas, que fazem de um só pau, que remam em pé vinte e trinta índios"
  // (cap. CLX). Aqui cabem seis; afundada, quem vai nela nada até a praia ("São os
  // tupinambás grandes nadadores", cap. CLX).
  igara: {
    label: 'Igara (canoa de guerra)', plural: 'Igaras', icon: 'canoe', hp: 260, damage: 0, weapon: null, reach: 0,
    interval: 1, swing: 1, speed: .55, size: 10, sight: 0, vsBuilding: 0, look: 'igara', passive: true, boat: true,
    drops: 0, bounty: { food: 0, wood: 30 }
  }
});

// As construções. A casa do principal é a primeira da aldeia, "muito comprida,
// coberta da palma, a que os índios chamam pindoba" (cap. CLI); caiu, acabou.
// `door`: a que distância do meio fica a porta (as ocas têm uma em cada ponta).
export const BUILDING_TYPES = Object.freeze({
  hall: {
    label: 'Casa do principal', fem: true, icon: 'oca', hp: 1500, radius: 28, capacity: 12, pop: 10, build: 90,
    cost: { food: 0, wood: 0 }, trains: ['worker'], dropOff: true, door: 32
  },
  // "uma cerca de pau a pique muito forte, com suas portas e seteiras" (cap. CLI).
  tower: {
    label: 'Cerca de seteiras', fem: true, icon: 'palisade', hp: 420, radius: 11, capacity: 0, pop: 0, build: 20,
    cost: { food: 30, wood: 70, rifles: 10 }, trains: [], dropOff: false
  },
  house: {
    label: 'Oca', fem: true, icon: 'oca', hp: 240, radius: 18, capacity: 4, pop: 6, build: 18,
    cost: { food: 20, wood: 120 }, trains: [], dropOff: false, door: 22
  },
  // O moquém: o jirau de varas sobre o fogo onde se moqueia o peixe e a caça; rende
  // comida sozinho, a dos que pescam e caçam fora do mapa.
  moquem: {
    label: 'Moquém', icon: 'moquem', hp: 200, radius: 11, capacity: 4, pop: 0, build: 22,
    cost: { food: 40, wood: 170 }, trains: [], dropOff: false, herd: { food: 4, every: 5 }
  },
  // O conselho no terreiro, onde "em estacas que têm para isso metidas no chão, armam
  // suas redes de redor da do principal" e se decide a guerra (caps. CLXIV e CLXVII).
  camp: {
    label: 'Fogo do conselho', icon: 'campfire', hp: 360, radius: 14, capacity: 0, pop: 0, build: 26,
    cost: { food: 60, wood: 230 }, trains: ['warrior', 'spearman', 'rifleman'], dropOff: false
  },
  // "suas choupanas, a que chamam tejupares" (cap. CLXVII): abrigo de palha longe da
  // aldeia, onde se deixa o que se colhe.
  lodge: {
    label: 'Tejupar', icon: 'tejupar', hp: 300, radius: 16, capacity: 8, pop: 4, build: 30,
    cost: { food: 80, wood: 300 }, trains: [], dropOff: true
  }
});
export const BUILD_ORDER = Object.freeze(['tower', 'house', 'moquem', 'camp', 'lodge']);

// A cerca atira flecha, não bala: mais devagar e com a curva do arco.
export const TOWER = Object.freeze({
  range: [110, 140, 170],
  damage: [9, 15, 23],
  interval: 1.5,
  bulletSpeed: 300,
  splash: 0,
  splashShare: 0
});
// As melhorias da cerca. As pontas: "arco e flechas, com dentes de tubarão" (cap.
// CLV); a rede de madeira, a cerca de fora que embaraça quem chega "de maneira que
// os possam flechar e desbaratar" (cap. CLI); o jirau é o estrado de varas que eles
// armavam por cima dos tirantes das casas (cap. CLI), aqui erguido em forquilhas para
// atirar por cima da cerca — essa serventia é do jogo, não do livro.
export const TOWER_UPGRADES = Object.freeze({
  power: { label: 'Pontas de dente de tubarão', short: 'Pontas', icon: 'tooth', costs: [{ food: 60, wood: 150, rifles: 15 }, { food: 130, wood: 280, rifles: 30 }] },
  range: { label: 'Jirau de vigia', short: 'Jirau', icon: 'jirau', costs: [{ food: 40, wood: 120 }, { food: 100, wood: 240 }] },
  scatter: { label: 'Rede de madeira', short: 'Rede', icon: 'rede', costs: [{ food: 150, wood: 220 }] }
});
// Quem passa perto de uma cerca com rede de madeira anda devagar, embaraçado.
export const SNARE = Object.freeze({ radius: 70, slow: .55 });

// Os aliados que chegam depois de cada ataque rechaçado.
export const HEROES = Object.freeze([
  { type: 'principal', after: 1 }, { type: 'matador', after: 2 }, { type: 'velha', after: 3 }
]);
// Sem sede (há água por toda parte), sem comboio e sem canhão de sítio.
export const THIRST = Object.freeze({ grace: Infinity, span: 1, maxLoss: 0, drinkReach: 8 });
export const CONVOY = Object.freeze({ ...CANUDOS_CONVOY, firstAfter: Infinity });
export const MATADEIRA = Object.freeze({ from: Infinity, every: 8 });
// Morto o principal, os de perto fogem largando flechas.
export const DEBANDADA = Object.freeze({ radius: 160, time: 9, rifleChance: .35 });
// O morro de vigia, na mata a noroeste da aldeia.
export const HILLS = Object.freeze([
  { id: 'morro', label: 'Morro', x: 215, y: 210, radius: 80, height: 44 }
]);

export const PREACHER_TYPE = 'paje';
export const RECORD_KEY = 'tupinamba-melhor';
// O cerco pela mata entra pelas beiradas de terra (ao sul é mar).
export const EDGE_ENTRIES = Object.freeze([
  { x: 130, y: 6 }, { x: 690, y: 6 }, { x: WORLD.width - 6, y: 130 }, { x: WORLD.width - 6, y: 520 },
  { x: 6, y: 520 }, { x: 6, y: 130 }
]);
// Antes de 1500 não havia ferro: machado de pedra, pau de cavar na roça e, na mão,
// o feixe de flechas apanhadas.
export const TOOLS = Object.freeze({ axe: 'stoneAxe', gather: 'digger', loot: 'arrows' });
export const RECOVER_ARROWS = true;
// Flechas de taquara feitas no fogo do conselho ("fazem arcos e flechas", cap. CLIX).
export const CRAFT = Object.freeze({ at: 'camp', label: 'Fazer flechas', icon: 'arrows', give: { wood: 30 }, get: { rifles: 10 } });
// "todo aquele que mata contrário, toma logo nome" (cap. CLXX): cada nome dá um tanto
// de força a mais, até o teto.
export const NAMES = Object.freeze({ bonus: .06, max: 5 });
// Quantos guerreiros cabem numa canoa e onde, no mar, ela aparece.
export const IGARA = Object.freeze({ crew: 6 });
// Ubatuba, a Uwattibi de Hans Staden: 23°26' S.
export const LATITUDE = -23.43;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const join = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} e ${list.at(-1)}` : list[0];
const how = (glyph, html) => `<li><span data-icon="${glyph}"></span><span>${html}</span></li>`;
export const TEXT = Object.freeze({
  page: {
    title: 'Eras do Brasil — Tupinambás',
    kicker: 'Litoral do Rio de Janeiro e de São Paulo · antes de 1500',
    heading: 'Tupinambás',
    themeColor: '#1f2a1c',
    intro: 'No litoral entre a Guanabara e Ubatuba, pouco antes da chegada dos portugueses, as aldeias tupinambás viviam em guerra com os tupiniquins — gente da mesma língua e dos mesmos costumes. Defenda a casa do principal pelo maior número de ataques que conseguir.',
    how: [
      how('morador', 'Escolha <b>moradores</b> e toque numa <b>árvore da mata</b> ou numa <b>roça de mandioca</b> para juntar madeira e comida. O machado é de pedra: ainda não há ferro nesta terra.'),
      how('palisade', 'Os moradores erguem <b>cercas de pau a pique com seteiras</b> na beira das trilhas. Toque numa para pôr <b>pontas de dente de tubarão</b>, erguer um <b>jirau</b> ou armar a <b>rede de madeira</b>, que embaraça quem chega.'),
      how('campfire', 'No <b>fogo do conselho</b> se preparam guerreiros de tacape, de pavês e flecheiros, e se fazem flechas. <b>Ocas</b> aumentam a população.'),
      how('arrows', 'Cada flecheiro e cada cerca levam <b>flechas</b>. Você começa com vinte. As que os contrários erram ficam no chão — passe qualquer um dos seus por cima para apanhar e levar à casa do principal.'),
      how('maraca', 'Leve os feridos para perto do <b>pajé</b>: ele os cura e a vida volta ao máximo.'),
      how('canoe', 'Setas vermelhas mostram por onde vem o próximo ataque: pelas trilhas ou pelo mar, em <b>igaras</b> que desembarcam na praia. <b>Chamar já</b> encerra a trégua e dá comida de bônus.'),
      how('tap', '<b>Toque</b> para escolher, <b>dois toques</b> para todos do mesmo tipo, <b>segure e arraste</b> para juntar um grupo. Mande moradores a uma construção danificada para <b>consertar</b>.')
    ].join(''),
    storyKicker: 'Memória da aldeia',
    storyEmpty: 'Ainda não há nada aqui. Os registros chegam conforme a guerra acontece.',
    arena: 'O litoral com a aldeia tupinambá no meio',
    thirdTitle: 'Flechas',
    callIcon: 'horn'
  },
  startToast: 'Corte lenha com o machado de pedra e erga cercas de seteiras nas trilhas',
  webgl: 'Este jogo precisa de WebGL para desenhar a mata e o mar, e o seu navegador não conseguiu ligá-lo. Tente outro navegador ou ative a aceleração de hardware.',
  underAttack: 'A aldeia está sob ataque! Toque para ver',
  rout: ({ fled, rifles }) => `Principal tupiniquim abatido: ${fled} guerreiros fogem${rifles ? `, largando ${rifles} flechas` : ''}`,
  arrival: ({ count, road, hero }) => {
    const people = plural(count, 'parente', 'parentes');
    if (hero) return `${UNIT_TYPES[hero].label} chega em socorro${count ? ` com ${people}` : ''}`;
    return count ? `Chegam ${people} de uma aldeia vizinha ${road.sea ? 'pela praia' : `pela ${road.label.toLowerCase()}`}` : '';
  },
  firstPickup: 'Flechas dos contrários caídas no chão! Quem apanhou leva à casa do principal',
  waveBanner: ({ roads, count, guns, officers, cerco, canoes }) => {
    const land = roads.filter(road => !road.sea).map(road => `pela ${road.label.toLowerCase()}`);
    const ways = [...land];
    if (canoes) ways.push(`em ${plural(canoes, 'igara', 'igaras')} pelo mar`);
    const extras = [guns && plural(guns, 'com tição', 'com tições'),
      officers && plural(officers, 'principal', 'principais')].filter(Boolean);
    const list = join(extras);
    return {
      // "possam dar nos contrários de madrugada" (cap. CLXVIII).
      kicker: cerco ? 'Os tupiniquins cercam a aldeia pela mata' : 'Ataque tupiniquim · ao romper do dia',
      sub: `${count} guerreiros ${join(ways)}` + (list ? `, ${list}` : '')
    };
  },
  waveCleared: { kicker: 'Os contrários recuam', title: number => `Ataque ${number} rechaçado` },
  waveWord: 'Ataque',
  noHousing: 'Sem lugar para morar — erga uma oca',
  retreatSub: 'para a casa do principal',
  idleSub: n => `${n} morador${n === 1 ? '' : 'es'}`,
  armyLabel: 'Guerreiros',
  workersLabel: 'Moradores',
  preacherLabel: 'Pajé',
  preacherSub: alive => alive ? 'cura os feridos' : 'morto',
  heroesLabel: 'Aliados',
  heroesSub: n => `${n} na aldeia`,
  baseLabel: 'Aldeia',
  herdDetail: herd => `O moquém dá +${herd.food} de comida (peixe e caça moqueados) a cada ${herd.every} s`,
  scatterTag: 'rede de madeira',
  repairHint: 'mande moradores consertar',
  disarmed: 'sem flechas',
  enemyHint: 'Escolha guerreiros e toque nele para atacar',
  hidden: 'Escondido na mata',
  homeTitle: 'A aldeia',
  praying: 'Curando os feridos',
  preacherIdle: 'Cura quem chega ferido perto dele, e a pessoa sara',
  carryWood: 'Levando lenha',
  chopping: 'Cortando lenha com o machado de pedra',
  farming: 'Trabalhando na roça',
  workerIdle: 'À toa — toque numa árvore ou numa roça',
  lack: { food: 'Falta comida', wood: 'Falta madeira', rifles: 'Faltam flechas' },
  thirdLabel: 'flechas',
  resultKicker: 'A casa do principal caiu',
  resultHeld: waves => `A aldeia resistiu a ${plural(waves, 'ataque', 'ataques')} dos tupiniquins.`,
  waveUnit: ['ataque', 'ataques'],
  towerHit: 'Flecha da cerca',
  splashHit: 'Flecha da cerca',
  newName: label => `${label} matou um contrário e tomou um nome novo`,
  crafted: count => `+${count} flechas`
});
