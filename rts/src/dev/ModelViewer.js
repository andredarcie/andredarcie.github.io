import * as THREE from 'three';
import { CharacterModel } from '../render/CharacterModel.js';
import { SertaoBuildingModel } from '../render/SertaoBuildingModel.js';
import { TowerRenderer } from '../render/TowerRenderer.js';
import { PropFactory } from '../render/PropFactory.js';
import { weaponModel } from '../render/WeaponModels.js';
import { WOOD_MATERIALS, LOG_RADIUS } from '../render/WoodMaterials.js';
import { PALETTE } from '../render/Palette.js';
import { hutSize } from '../settlement/HutDimensions.js';
import { UnitFactory } from '../rts/UnitFactory.js';
import { UNIT_TYPES, BUILDING_TYPES, LOOKS, CENTER, TOWER } from '../config/rts.js';

/* ===================== Visor de modelos e animações (só em localhost, tecla F9) ===================== */
// Duas abas:
//   Modelos   — a galeria de tudo o que se vê no jogo, em cartões com a miniatura, por
//               categoria (personagens, itens de cenário, construções); clicar abre o
//               modelo grande, girando, com os dados dele.
//   Animações — a lista de todas as animações; a escolhida roda na tela, com tocar,
//               pausar, velocidade e quadro a quadro, e embaixo os blocos de ESTADO da
//               animação (as etapas dela, com os limites tirados do próprio código das
//               poses). Sem estado escolhido, a animação passa por todos e o bloco do
//               estado em execução acende; escolhido um, ela repete só aquele estado.
// Serve para revisar de perto — e para a IA que ajuda a desenvolver, pela alça
// window.__visor (ver o fim do arquivo): monta qualquer animação, para num instante
// exato, e devolve a imagem com o nome do estado escrito na tela.

const ARMY = new Set(Object.entries(LOOKS).filter(([, look]) => look.army).map(([id]) => id));
const ARMAS = { rifle: 'fuzil', blunderbuss: 'bacamarte', club: 'porrete', spear: 'chuço', bayonet: 'baioneta', machete: 'facão', saber: 'sabre' };
const TAU = Math.PI * 2;
const has = id => Boolean(UNIT_TYPES[id]);
const ALL_UNITS = Object.keys(UNIT_TYPES);
const ARMED = ALL_UNITS.filter(id => UNIT_TYPES[id].weapon && !UNIT_TYPES[id].cannon);

/* ---------- as animações e os estados de cada uma ---------- */
// len: duração de um ciclo (s) para aquele personagem; estados: [nome, de, até] na fração
// do ciclo; motion(m, u, p): preenche o `motion` do CharacterModel.pose para a fração p.
const swing = u => u.stats.swing;
const reloadSpan = u => Math.max(.6, u.stats.interval - u.stats.swing);
const fight = (m, weapon) => { m.weapon = weapon; m.guard = true; };
const passos = [['Passada esquerda', 0, .5], ['Passada direita', .5, 1]];

function fuzilaria(u) {
  // cinco tiros seguidos: golpe e ferrolho, e depois do quinto a recarga do pente
  const s = u.stats.swing, i = u.stats.interval, total = i * 5 + 1.6, out = [];
  let t = 0;
  for (let k = 1; k <= 5; k++) {
    const span = i + (k === 5 ? 1.6 : 0);
    out.push([`Tiro ${k}`, t / total, (t + s) / total, { shot: true, from: t, len: s }]);
    out.push([k === 5 ? 'Pente' : `Ferrolho ${k}`, (t + s) / total, (t + span) / total, { shot: false, from: t + s, len: span - s, mag: k === 5 }]);
    t += span;
  }
  return out;
}

const ANIMS = [
  // ---- Armas de fogo ----
  { id: 'tiroFuzil', grupo: 'Armas de fogo', label: 'Tiro de fuzil', chars: ['private', 'pajeu'], len: swing,
    estados: [['Levar ao ombro', 0, .42], ['Apontar (respiração presa)', .42, .58], ['Disparo e coice', .58, .76], ['Volta à mira', .76, 1]],
    motion: (m, u, p) => { fight(m, 'rifle'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'rifle'; } },
  { id: 'recargaFerrolho', grupo: 'Armas de fogo', label: 'Recarga do ferrolho', chars: ['private', 'pajeu'], len: reloadSpan,
    estados: [['Baixar a arma', 0, .12], ['Mão ao ferrolho', .12, .24], ['Abrir o ferrolho', .24, .38], ['A cápsula salta', .38, .5],
      ['Fechar o ferrolho', .5, .64], ['Mão ao punho', .64, .74], ['Firmar', .74, .86], ['Erguer à mira', .86, 1]],
    motion: (m, u, p) => { fight(m, 'rifle'); m.reload = p; } },
  { id: 'recargaPente', grupo: 'Armas de fogo', label: 'Recarga do pente (a cada 5 tiros)', chars: ['private', 'pajeu'], len: u => reloadSpan(u) + 1.6,
    estados: [['Baixar a arma', 0, .12], ['Mão ao ferrolho', .12, .2], ['Abrir o ferrolho', .2, .29], ['Pegar o pente na cartucheira', .29, .44],
      ['Encaixar na culatra', .44, .54], ['Empurrar as balas', .54, .63], ['De volta ao ferrolho', .63, .7], ['Fechar o ferrolho', .7, .79],
      ['Mão ao punho', .79, .86], ['Erguer à mira', .86, 1]],
    motion: (m, u, p) => { fight(m, 'rifle'); m.reload = p; m.reloadMag = true; } },
  { id: 'fuzilaria', grupo: 'Armas de fogo', label: 'Fuzilaria: 5 tiros e o pente', chars: ['private', 'pajeu'], len: u => u.stats.interval * 5 + 1.6,
    estados: fuzilaria,
    motion: (m, u, p, estados) => {
      fight(m, 'rifle');
      const total = u.stats.interval * 5 + 1.6, t = p * total;
      const st = estados.find(e => p >= e[1] && p < e[2]) ?? estados[estados.length - 1];
      const info = st[3], k = Math.min(1, Math.max(0, (t - info.from) / info.len));
      if (info.shot) { m.strike = Math.max(1e-4, 1 - k); m.strikeKind = 'rifle'; } else { m.reload = k; m.reloadMag = info.mag; }
    } },
  { id: 'tiroBacamarte', grupo: 'Armas de fogo', label: 'Tiro de bacamarte', chars: ['rifleman'], len: swing,
    estados: [['Levar ao ombro', 0, .42], ['Apontar (respiração presa)', .42, .58], ['Disparo e coice', .58, .8], ['Volta à mira', .8, 1]],
    motion: (m, u, p) => { fight(m, 'blunderbuss'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'blunderbuss'; } },
  { id: 'recargaBacamarte', grupo: 'Armas de fogo', label: 'Recarga do bacamarte (pela boca)', chars: ['rifleman'], len: reloadSpan,
    estados: [['Pôr a arma em pé', 0, .12], ['Pegar o polvarinho', .12, .2], ['Despejar a pólvora', .2, .36], ['Pegar a bucha', .36, .44],
      ['Bucha na boca', .44, .5], ['Tirar a vareta', .5, .56], ['Socar (duas vezes)', .56, .76], ['Guardar a vareta', .76, .84],
      ['Escorvar', .84, .92], ['Volta à mira', .92, 1]],
    motion: (m, u, p) => { fight(m, 'blunderbuss'); m.reload = p; } },
  // ---- Corpo a corpo ----
  { id: 'porrete', grupo: 'Corpo a corpo', label: 'Golpe de porrete', chars: ['worker', 'macambira'], len: swing,
    estados: [['Preparo', 0, .45], ['Varrida', .45, .65], ['Volta', .65, 1]],
    motion: (m, u, p) => { fight(m, 'club'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'club'; } },
  { id: 'chuco', grupo: 'Corpo a corpo', label: 'Estocada de chuço', chars: ['spearman'], len: swing,
    estados: [['Recolher', 0, .4], ['Estocada', .4, .6], ['Volta', .6, 1]],
    motion: (m, u, p) => { fight(m, 'spear'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'spear'; } },
  { id: 'baioneta', grupo: 'Corpo a corpo', label: 'Carga de baioneta', chars: ['bayonet'], len: swing,
    estados: [['Recolher', 0, .4], ['Estocada', .4, .6], ['Volta', .6, 1]],
    motion: (m, u, p) => { fight(m, 'bayonet'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'bayonet'; } },
  { id: 'facao', grupo: 'Corpo a corpo', label: 'Golpe de facão', chars: ['warrior', 'abade'], len: swing,
    estados: [['Erguer', 0, .5], ['Golpe', .5, .7], ['Volta', .7, 1]],
    motion: (m, u, p) => { fight(m, 'machete'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'machete'; } },
  { id: 'sabre', grupo: 'Corpo a corpo', label: 'Golpe de sabre', chars: ['officer'], len: swing,
    estados: [['Erguer', 0, .5], ['Golpe', .5, .7], ['Volta', .7, 1]],
    motion: (m, u, p) => { fight(m, 'saber'); m.strike = Math.max(1e-4, 1 - p); m.strikeKind = 'saber'; } },
  { id: 'guarda', grupo: 'Corpo a corpo', label: 'Guarda (pronto para a briga)', chars: ARMED, len: () => 3,
    estados: [['Guarda', 0, 1]],
    motion: (m, u) => { fight(m, u.weapon); } },
  { id: 'tranco', grupo: 'Corpo a corpo', label: 'Tranco (apanhou)', chars: ALL_UNITS, len: () => .9,
    estados: [['Tranco', 0, .3], ['Recupera', .3, 1]],
    motion: (m, u, p) => { m.hurt = 1 - p; m.weapon = u.armed ? u.weapon : null; } },
  // ---- Trabalho ----
  { id: 'cortar', grupo: 'Trabalho', label: 'Cortar lenha', chars: ['worker'], len: () => 1.8,
    estados: [['Preparo', 0, .55], ['Descida', .55, .68], ['Impacto', .68, .78], ['Volta', .78, 1]],
    motion: (m, u, p) => { m.chop = p; } },
  { id: 'martelar', grupo: 'Trabalho', label: 'Martelar (obra)', chars: ['worker', 'quadrado'], len: () => 1.8,
    estados: [['Erguer o maço', 0, .55], ['Batida', .55, .68], ['Quique', .68, .8], ['Repouso', .8, 1]],
    motion: (m, u, p) => { m.chop = p; m.building = true; } },
  { id: 'colher', grupo: 'Trabalho', label: 'Colher na roça', chars: ['worker'], len: () => TAU / 3.1,
    estados: [['Mão esquerda arranca', 0, .5], ['Mão direita arranca', .5, 1]],
    motion: (m, u, p, e, len) => { m.gathering = true; m.elapsed = p * len - 1.37 / 3.1; } },
  { id: 'carregarTora', grupo: 'Trabalho', label: 'Carregar tora', chars: ['worker'], len: () => 1.05,
    estados: passos, motion: (m, u, p) => { m.carrying = true; m.pace = .8; m.gait = p * TAU; } },
  { id: 'carregarSaco', grupo: 'Trabalho', label: 'Carregar saco da colheita', chars: ['worker'], len: () => 1.05,
    estados: passos, motion: (m, u, p) => { m.carryFood = true; m.pace = .8; m.gait = p * TAU; } },
  { id: 'empurrarCanhao', grupo: 'Trabalho', label: 'Empurrar o canhão', chars: ['gunner', 'matadeira'], len: () => 1.3,
    estados: passos, motion: (m, u, p) => { m.pace = .6; m.gait = p * TAU; } },
  // ---- Locomoção ----
  { id: 'andar', grupo: 'Locomoção', label: 'Andar', chars: ALL_UNITS, len: () => 1.0,
    estados: passos, motion: (m, u, p) => { m.pace = .9; m.gait = p * TAU; m.weapon = u.armed && u.weapon !== 'cannon' ? u.weapon : null; } },
  { id: 'correr', grupo: 'Locomoção', label: 'Correr', chars: ALL_UNITS, len: () => .66,
    estados: passos, motion: (m, u, p) => { m.pace = 1.35; m.gait = p * TAU; m.weapon = u.armed && u.weapon !== 'cannon' ? u.weapon : null; } },
  { id: 'fuga', grupo: 'Locomoção', label: 'Fuga em debandada', chars: ALL_UNITS, len: () => .66,
    estados: passos, motion: (m, u, p) => { m.panic = true; m.pace = 1.35; m.gait = p * TAU; } },
  // ---- Estados ----
  { id: 'parado', grupo: 'Estados', label: 'Parado (respira, troca o peso, olha em volta)', chars: ALL_UNITS, len: () => 12,
    estados: [['Respirando', 0, 1]], motion: (m, u, p, e, len) => { m.elapsed = p * len; m.weapon = u.armed && u.weapon !== 'cannon' ? u.weapon : null; } },
  { id: 'tocaia', grupo: 'Estados', label: 'Tocaia (escondido no mato)', chars: ['rifleman', 'warrior', 'spearman', 'pajeu'], len: () => 3,
    estados: [['Agachado espiando', 0, 1]], motion: (m, u) => { m.crouch = true; m.weapon = u.weapon; } },
  { id: 'pregacao', grupo: 'Estados', label: 'Pregação do Conselheiro', chars: ['conselheiro'], len: () => TAU / 1.1,
    estados: [['Braço desce', 0, .5], ['Braço sobe', .5, 1]], motion: (m, u, p, e, len) => { m.preach = true; m.elapsed = p * len - 1.37 / 1.1 + Math.PI / 2 / 1.1; } },
  { id: 'dormir', grupo: 'Estados', label: 'Dormindo', chars: ALL_UNITS, len: () => 4.5,
    estados: [['Inspira', 0, .5], ['Expira', .5, 1]], motion: (m, u, p) => { m.rest = 1; m.breath = .5 - .5 * Math.cos(p * TAU); m.eyes = .1; } },
  // ---- Trincheira (os atiradores lá dentro) ----
  { id: 'trincheiraFuzil', grupo: 'Trincheira', label: 'Atirador da trincheira: fuzil', tower: { power: 0, range: 0, scatter: 0 }, len: () => TOWER.interval,
    estados: [['Coice', 0, .12], ['Mão ao ferrolho', .12, .26], ['Abrir o ferrolho', .26, .38], ['Fechar o ferrolho', .38, .56], ['Mão de volta', .56, .8], ['Na mira', .8, 1]] },
  { id: 'trincheiraJirau', grupo: 'Trincheira', label: 'Atirador no jirau', tower: { power: 0, range: 1, scatter: 0 }, len: () => TOWER.interval,
    estados: [['Coice', 0, .12], ['Mão ao ferrolho', .12, .26], ['Abrir o ferrolho', .26, .38], ['Fechar o ferrolho', .38, .56], ['Mão de volta', .56, .8], ['Na mira', .8, 1]] },
  { id: 'trincheiraBacamarte', grupo: 'Trincheira', label: 'Atirador da trincheira: bacamarte', tower: { power: 0, range: 0, scatter: 1 }, len: () => TOWER.interval,
    estados: [['Coice', 0, .12], ['Erguer de boca para cima', .12, .24], ['Socar com a vareta', .24, .78], ['Baixar', .78, .94], ['Na mira', .94, 1]] }
].map(a => ({ ...a, chars: a.tower ? [] : a.chars.filter(has) }));

/* ---------- o catálogo de modelos ---------- */
const CATEGORIAS = [['personagens', 'Personagens'], ['armas', 'Armas'], ['cenario', 'Itens de cenário'], ['construcoes', 'Construções']];
const WEAPONS = [['rifle', 'Fuzil Mannlicher M1888', 'Ferrolho de puxar reto, pente de 5'], ['bayonet', 'Mannlicher com baioneta', 'Baioneta-faca M1888'],
  ['blunderbuss', 'Bacamarte de pederneira', 'Cano de latão, boca de sino'], ['machete', 'Facão sertanejo', 'Cabo de chifre'],
  ['saber', 'Sabre de oficial', 'Guarda de latão com arco'], ['spear', 'Chuço', 'Ponta de ferro em folha'],
  ['club', 'Porrete', 'Pau nodoso'], ['axe', 'Machado', 'Cunha de ferro']];
const PROPS = [['umbuzeiro', 'Umbuzeiro'], ['catingueira', 'Catingueira'], ['mandacaru', 'Mandacaru'], ['xiquexique', 'Xique-xique'],
  ['macambira', 'Macambira'], ['garrancho', 'Garrancho'], ['rock', 'Pedra']];

export function installModelViewer() {
  const characters = new CharacterModel();
  const buildings = new SertaoBuildingModel();
  const props = new PropFactory();
  let nextId = 900000;
  const factory = new UnitFactory({ newId: () => nextId++ });
  const logShape = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 9, 8).rotateZ(Math.PI / 2);

  const MODELS = [];
  for (const [id, stats] of Object.entries(UNIT_TYPES)) {
    MODELS.push({ id: `unit:${id}`, cat: 'personagens', label: stats.label, unitType: id,
      info: `${stats.hp} de vida · ${stats.damage ? `${stats.damage} de dano` : 'não briga'}${stats.weapon ? ` · ${ARMAS[stats.weapon] ?? stats.weapon}` : stats.cannon ? ' · canhão' : ''}` });
  }
  for (const [kind, label, info] of WEAPONS) MODELS.push({ id: `weapon:${kind}`, cat: 'armas', label, weapon: kind, info });
  for (const [kind, label] of PROPS) MODELS.push({ id: `prop:${kind}`, cat: 'cenario', label, prop: kind, info: 'Caatinga' });
  MODELS.push({ id: 'prop:roca', cat: 'cenario', label: 'Roça (mandioca e feijão)', prop: 'roca', info: 'Comida' });
  MODELS.push({ id: 'prop:tora', cat: 'cenario', label: 'Tora no chão', prop: 'tora', info: 'Madeira' });
  for (const kind of ['hall', 'house', 'lodge', 'curral', 'igrejanova']) {
    if (BUILDING_TYPES[kind]) MODELS.push({ id: `building:${kind}`, cat: 'construcoes', label: BUILDING_TYPES[kind].label, building: kind,
      info: `${BUILDING_TYPES[kind].hp} de vida` });
  }
  MODELS.push({ id: 'tower:0', cat: 'construcoes', label: 'Trincheira', tower: { power: 0, range: 0, scatter: 0 }, info: 'Sem melhorias' });
  MODELS.push({ id: 'tower:max', cat: 'construcoes', label: 'Trincheira (todas as melhorias)', tower: { power: 2, range: 2, scatter: 1 }, info: 'Fuzis, jirau e bacamarte' });

  // monta um modelo do catálogo: { object, unit?, view?, tower? }
  function build(model) {
    if (model.unitType) {
      const stats = UNIT_TYPES[model.unitType];
      const unit = factory.create(ARMY.has(stats.look) ? 'enemy' : 'player', model.unitType, 0, 0, Math.PI / 2);
      const view = characters.create(unit.sex === 'female');
      characters.equip(view, unit.look);
      characters.dress(view, unit.color, unit.outfit, unit.trousers);
      view.scale.setScalar(unit.size / 10);
      view.traverse(o => { if (o.isMesh) o.castShadow = true; });
      return { object: view, unit, view };
    }
    if (model.weapon) {
      // deitada, com o cano para a frente e o "em cima" da arma para cima
      const built = weaponModel(model.weapon);
      built.group.rotation.x = -Math.PI / 2;
      built.group.position.y = 2;
      const g = new THREE.Group(); g.add(built.group);
      return { object: g };
    }
    if (model.prop === 'tora') {
      const mesh = new THREE.Mesh(logShape, WOOD_MATERIALS);
      mesh.position.y = LOG_RADIUS;
      mesh.castShadow = true;
      const g = new THREE.Group(); g.add(mesh);
      return { object: g };
    }
    if (model.prop === 'roca') return { object: props.roca(7) };
    if (model.prop) return { object: props.build(model.prop, 5) };
    if (model.building) {
      const type = BUILDING_TYPES[model.building];
      const parts = buildings.build(model.building, 1, true, hutSize(type.capacity));
      parts.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return { object: parts.group };
    }
    const layer = new THREE.Group();
    const tower = { x: CENTER.x + 80, y: CENTER.y, seed: 7, levels: { ...model.tower }, built: true, progress: 1, aim: -.4,
      cooldown: 0, stats: { interval: TOWER.interval } };
    const renderer3d = new TowerRenderer(layer, { toScene: () => ({ x: 0, z: 0 }) });
    renderer3d.sync([tower]);
    for (const child of layer.children) child.position.y = 0;
    return { object: layer, tower, towerRenderer: renderer3d };
  }

  /* ---------- a janela ---------- */
  const css = `
    .vz{position:fixed;inset:0;z-index:9999;display:none;flex-direction:column;background:#15110d;color:#efe6d4;font:13px/1.4 system-ui,sans-serif}
    .vz *{box-sizing:border-box}
    .vz-top{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid #3a3128;background:#1d1813}
    .vz-top strong{font-size:14px;margin-right:12px;letter-spacing:.02em}
    .vz-tab{background:none;border:0;color:#b8a888;padding:7px 14px;border-radius:6px;cursor:pointer;font:inherit}
    .vz-tab[aria-selected=true]{background:#3a3128;color:#ffd36b}
    .vz-x{margin-left:auto;background:#3a3128;color:#efe6d4;border:0;border-radius:6px;padding:6px 12px;cursor:pointer;font:inherit}
    .vz-body{flex:1;display:flex;min-height:0}
    .vz-pane{flex:1;display:none;min-height:0}
    .vz-pane.on{display:flex}
    .vz-side{width:300px;overflow:auto;border-right:1px solid #3a3128;background:#1b1611;padding:10px}
    .vz-cats{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
    .vz-chip{background:#2a231b;border:1px solid #3a3128;color:#d8c9a8;border-radius:999px;padding:4px 11px;cursor:pointer;font:inherit}
    .vz-chip[aria-pressed=true]{background:#ffd36b;color:#2a1f12;border-color:#ffd36b}
    .vz-gallery{flex:1;overflow:auto;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;align-content:start}
    .vz-cat-title{grid-column:1/-1;color:#b8a888;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:6px 0 -4px}
    .vz-card{background:#211b15;border:1px solid #3a3128;border-radius:10px;overflow:hidden;cursor:pointer;transition:transform .12s,border-color .12s}
    .vz-card:hover{transform:translateY(-2px);border-color:#8a6a40}
    .vz-card[aria-current=true]{border-color:#ffd36b;box-shadow:0 0 0 1px #ffd36b}
    .vz-card img,.vz-card .vz-ph{display:block;width:100%;aspect-ratio:5/4;background:linear-gradient(#e9efe6,#d9c9a3);object-fit:cover}
    .vz-card span{display:block;padding:6px 8px 2px;font-weight:600;font-size:12.5px}
    .vz-card small{display:block;padding:0 8px 8px;color:#9a8b70;font-size:11px}
    .vz-stage{flex:1.2;display:flex;flex-direction:column;min-width:0;border-left:1px solid #3a3128}
    .vz-canvas-box{position:relative;flex:1;min-height:0;background:#e9efe6}
    .vz-canvas-box canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .vz-hud{position:absolute;left:10px;top:10px;background:rgba(21,17,13,.78);color:#efe6d4;padding:6px 10px;border-radius:6px;pointer-events:none;font-size:12.5px}
    .vz-hud b{color:#ffd36b}
    .vz-detail{padding:10px 14px;border-top:1px solid #3a3128;display:flex;align-items:center;gap:10px}
    .vz-btn{background:#3a3128;color:#efe6d4;border:0;border-radius:6px;padding:7px 12px;cursor:pointer;font:inherit}
    .vz-btn.main{background:#ffd36b;color:#2a1f12;font-weight:700}
    .vz-group{color:#b8a888;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 4px}
    .vz-anim{display:block;width:100%;text-align:left;background:none;border:0;color:#d8c9a8;padding:6px 8px;border-radius:6px;cursor:pointer;font:inherit}
    .vz-anim:hover{background:#2a231b}
    .vz-anim[aria-current=true]{background:#3a3128;color:#ffd36b}
    .vz-controls{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid #3a3128;flex-wrap:wrap}
    .vz-controls select{background:#211b15;color:#efe6d4;border:1px solid #3a3128;border-radius:6px;padding:5px}
    .vz-time{font-variant-numeric:tabular-nums;color:#b8a888;margin-left:auto}
    .vz-states{display:flex;gap:4px;padding:0 14px 6px}
    .vz-state{position:relative;min-width:0;height:46px;border-radius:6px;background:#2a231b;border:1px solid #3a3128;color:#b8a888;
      font-size:11.5px;padding:5px 7px;cursor:pointer;overflow:hidden;text-align:left;transition:background .08s}
    .vz-state.live{background:#ffd36b;color:#2a1f12;border-color:#ffd36b;font-weight:700}
    .vz-state.pick{outline:2px solid #ffd36b;outline-offset:1px}
    .vz-state em{position:absolute;right:6px;bottom:4px;font-style:normal;opacity:.7;font-size:10.5px}
    .vz-scrub{padding:0 14px 12px}
    .vz-scrub input{width:100%}
    .vz-hint{color:#8a7d66;font-size:11.5px;padding:0 14px 10px}`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.className = 'vz';
  root.innerHTML = `
    <div class="vz-top">
      <strong>Visor · Canudos</strong>
      <button class="vz-tab" data-tab="modelos" aria-selected="true">Modelos</button>
      <button class="vz-tab" data-tab="animacoes" aria-selected="false">Animações</button>
      <button class="vz-x" data-close>Fechar (F9)</button>
    </div>
    <div class="vz-body">
      <section class="vz-pane on" data-pane="modelos">
        <div style="display:flex;flex-direction:column;flex:1;min-width:0">
          <div class="vz-cats" style="padding:12px 14px 0" data-cats></div>
          <div class="vz-gallery" data-gallery></div>
        </div>
        <div class="vz-stage">
          <div class="vz-canvas-box" data-box="modelos"><div class="vz-hud" data-hud-model></div></div>
          <div class="vz-detail">
            <div style="flex:1"><div data-model-name style="font-weight:700;font-size:14px"></div><div data-model-info style="color:#9a8b70"></div></div>
            <button class="vz-btn main" data-go-anim hidden>Ver animações</button>
          </div>
        </div>
      </section>
      <section class="vz-pane" data-pane="animacoes">
        <nav class="vz-side" data-anim-list></nav>
        <div class="vz-stage" style="border-left:0">
          <div class="vz-canvas-box" data-box="animacoes"><div class="vz-hud" data-hud-anim></div></div>
          <div class="vz-controls">
            <button class="vz-btn main" data-play>Pausar</button>
            <button class="vz-btn" data-step="-1" title="quadro anterior">◂</button>
            <button class="vz-btn" data-step="1" title="próximo quadro">▸</button>
            <label>Velocidade <select data-speed>
              <option value="0.1">0,1×</option><option value="0.25">0,25×</option><option value="0.5">0,5×</option>
              <option value="1" selected>1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></label>
            <label>Personagem <select data-char></select></label>
            <span class="vz-time" data-time></span>
          </div>
          <div class="vz-states" data-states></div>
          <div class="vz-scrub"><input type="range" min="0" max="1" step="0.0005" value="0" data-scrub></div>
          <div class="vz-hint">Sem estado escolhido, a animação passa por todos e o bloco do estado em execução acende. Clique num bloco para repetir só aquele estado (clique de novo para soltar). Arrastar gira a câmera, roda aproxima, botão direito desloca.</div>
        </div>
      </section>
    </div>`;
  document.body.appendChild(root);
  const $ = sel => root.querySelector(sel);

  /* ---------- a cena (um renderizador só: o canvas muda de aba) ---------- */
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.add(new THREE.HemisphereLight(0xf4efe2, 0x8a6a48, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(40, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 260 });
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(200, 64).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: PALETTE.clearing }));
  ground.receiveShadow = true;
  scene.add(ground);
  const stage = new THREE.Group();
  scene.add(stage);
  const camera = new THREE.PerspectiveCamera(30, 1, .5, 1200);
  const orbit = { yaw: .75, pitch: .3, dist: 46, target: new THREE.Vector3(0, 8, 0) };

  // miniaturas: um segundo renderizador pequeno, uma vez por modelo
  const thumbRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  thumbRenderer.setSize(300, 240, false);
  thumbRenderer.shadowMap.enabled = true;
  const thumbCam = new THREE.PerspectiveCamera(30, 300 / 240, .5, 1200);

  function frameObject(object, cam, o, margin = 1) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y * 1.15, size.z) * .5 + 1;
    o.target.copy(center);
    o.dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * margin;
  }
  function placeCamera(cam, o) {
    cam.position.set(o.target.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, o.target.y + Math.sin(o.pitch) * o.dist,
      o.target.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
    cam.lookAt(o.target);
  }

  /* ---------- estado ---------- */
  const S = {
    tab: 'modelos', cat: 'todos', model: null, built: null,
    anim: null, charType: null, t: 0, playing: true, speed: 1, state: -1, phase: 0
  };
  const animById = id => ANIMS.find(a => a.id === id);

  function setStage(built) {
    while (stage.children.length) stage.remove(stage.children[0]);
    S.built = built;
    if (built) stage.add(built.object);
  }

  /* ---------- aba Modelos ---------- */
  const thumbs = new Map();
  function renderGallery() {
    const cats = $('[data-cats]');
    cats.innerHTML = '';
    for (const [id, label] of [['todos', 'Todos'], ...CATEGORIAS]) {
      const b = document.createElement('button');
      b.className = 'vz-chip';
      b.textContent = label;
      b.setAttribute('aria-pressed', String(S.cat === id));
      b.addEventListener('click', () => { S.cat = id; renderGallery(); });
      cats.appendChild(b);
    }
    const gallery = $('[data-gallery]');
    gallery.innerHTML = '';
    for (const [catId, catLabel] of CATEGORIAS) {
      if (S.cat !== 'todos' && S.cat !== catId) continue;
      const title = document.createElement('div');
      title.className = 'vz-cat-title';
      title.textContent = catLabel;
      gallery.appendChild(title);
      for (const model of MODELS.filter(m => m.cat === catId)) {
        const card = document.createElement('div');
        card.className = 'vz-card';
        card.dataset.model = model.id;
        card.setAttribute('aria-current', String(S.model === model.id));
        card.innerHTML = `${thumbs.has(model.id) ? `<img alt="" src="${thumbs.get(model.id)}">` : '<div class="vz-ph"></div>'}<span></span><small></small>`;
        card.querySelector('span').textContent = model.label;
        card.querySelector('small').textContent = model.info;
        card.addEventListener('click', () => showModel(model.id));
        gallery.appendChild(card);
      }
    }
    queueThumbs();
  }
  // as miniaturas saem uma por vez, sem travar a janela
  let thumbQueue = null;
  function queueThumbs() {
    if (thumbQueue) return;
    const pending = MODELS.filter(m => !thumbs.has(m.id));
    if (!pending.length) return;
    thumbQueue = setTimeout(function next() {
      const model = pending.shift();
      if (model) {
        try {
          const thumbScene = new THREE.Scene();
          thumbScene.background = new THREE.Color(PALETTE.sky);
          thumbScene.add(new THREE.HemisphereLight(0xf4efe2, 0x8a6a48, 1.2));
          const light = new THREE.DirectionalLight(0xfff2dc, 1.4);
          light.position.set(40, 80, 30);
          thumbScene.add(light);
          const built = build(model);
          if (built.view) characters.pose(built.view, baseMotion(0, { weapon: built.unit.armed && built.unit.weapon !== 'cannon' ? built.unit.weapon : null, animate: false }));
          thumbScene.add(built.object);
          const o = { yaw: .8, pitch: .28, dist: 40, target: new THREE.Vector3() };
          frameObject(built.object, thumbCam, o, 1.05);
          placeCamera(thumbCam, o);
          thumbRenderer.render(thumbScene, thumbCam);
          thumbs.set(model.id, thumbRenderer.domElement.toDataURL('image/png'));
          const card = root.querySelector(`.vz-card[data-model="${CSS.escape(model.id)}"]`);
          if (card) {
            const img = document.createElement('img');
            img.alt = '';
            img.src = thumbs.get(model.id);
            card.firstElementChild.replaceWith(img);
          }
        } catch (error) { console.error('[visor] miniatura', model.id, error); thumbs.set(model.id, ''); }
      }
      if (pending.length) thumbQueue = setTimeout(next, 16);
      else thumbQueue = null;
    }, 30);
  }

  function showModel(id) {
    const model = MODELS.find(m => m.id === id) ?? MODELS[0];
    S.model = model.id;
    const built = build(model);
    setStage(built);
    if (built.view) characters.pose(built.view, baseMotion(0, { weapon: built.unit.armed && built.unit.weapon !== 'cannon' ? built.unit.weapon : null }));
    frameObject(built.object, camera, orbit, 1.25);
    $('[data-model-name]').textContent = model.label;
    $('[data-model-info]').textContent = `${CATEGORIAS.find(c => c[0] === model.cat)[1]} · ${model.info}`;
    const animsHere = model.unitType ? ANIMS.filter(a => a.chars.includes(model.unitType)) : [];
    $('[data-go-anim]').hidden = !animsHere.length;
    for (const card of root.querySelectorAll('.vz-card')) card.setAttribute('aria-current', String(card.dataset.model === model.id));
  }

  /* ---------- aba Animações ---------- */
  function renderAnimList() {
    const nav = $('[data-anim-list]');
    nav.innerHTML = '';
    let group = null;
    for (const anim of ANIMS) {
      if (!anim.tower && !anim.chars.length) continue;
      if (anim.grupo !== group) {
        group = anim.grupo;
        const g = document.createElement('div');
        g.className = 'vz-group';
        g.textContent = group;
        nav.appendChild(g);
      }
      const b = document.createElement('button');
      b.className = 'vz-anim';
      b.dataset.anim = anim.id;
      b.textContent = anim.label;
      b.setAttribute('aria-current', String(S.anim === anim.id));
      b.addEventListener('click', () => showAnim(anim.id));
      nav.appendChild(b);
    }
  }

  function currentStates() {
    const anim = animById(S.anim);
    return typeof anim.estados === 'function' ? anim.estados(S.built.unit) : anim.estados;
  }
  function cycleLength() {
    const anim = animById(S.anim);
    return anim.len(S.built?.unit);
  }

  function showAnim(id, charType = null) {
    const anim = animById(id) ?? ANIMS[0];
    S.anim = anim.id;
    S.state = -1;
    S.t = 0;
    const charSelect = $('[data-char]');
    charSelect.innerHTML = '';
    if (anim.tower) {
      charSelect.add(new Option('Trincheira', 'tower'));
      charSelect.disabled = true;
      const built = build({ tower: anim.tower });
      setStage(built);
      frameObject(built.object, camera, orbit, 1.1);
      orbit.yaw = 1.2; orbit.pitch = .35;
    } else {
      charSelect.disabled = anim.chars.length < 2;
      for (const c of anim.chars) charSelect.add(new Option(UNIT_TYPES[c].label, c));
      S.charType = anim.chars.includes(charType) ? charType : anim.chars.includes(S.charType) ? S.charType : anim.chars[0];
      charSelect.value = S.charType;
      const built = build({ unitType: S.charType });
      setStage(built);
      orbit.target.set(0, 9 * built.unit.size / 10, 0);
      orbit.dist = 52;
      orbit.yaw = .55; orbit.pitch = .18;
    }
    for (const b of root.querySelectorAll('.vz-anim')) b.setAttribute('aria-current', String(b.dataset.anim === anim.id));
    renderStates();
  }

  function renderStates() {
    const box = $('[data-states]');
    box.innerHTML = '';
    currentStates().forEach(([name, from, to], i) => {
      const b = document.createElement('button');
      b.className = 'vz-state';
      b.style.flex = String(Math.max(.04, to - from));
      b.title = `${name} (${Math.round(from * 100)}–${Math.round(to * 100)}%)`;
      b.innerHTML = '<span></span><em></em>';
      b.querySelector('span').textContent = name;
      b.querySelector('em').textContent = `${Math.round(from * 100)}%`;
      b.addEventListener('click', () => {
        S.state = S.state === i ? -1 : i;
        S.t = 0;
        S.playing = true;
        syncPlay();
      });
      box.appendChild(b);
    });
  }

  function baseMotion(time, extra = {}) {
    return {
      gait: 0, pace: 0, lean: 0, bellyScale: 1, animate: true, rest: 0, breath: 0, eyes: 1, seed: 1.37, elapsed: time,
      weapon: null, guard: false, strike: 0, strikeKind: null, reload: -1, reloadMag: false, pushing: false, ...extra
    };
  }

  // a fração do ciclo agora: inteira, ou presa dentro do estado escolhido
  function phaseNow() {
    const len = cycleLength(), states = currentStates();
    if (S.state >= 0 && states[S.state]) {
      const [, from, to] = states[S.state], span = Math.max(1e-4, (to - from) * len);
      return from + (((S.t % span) + span) % span) / len;
    }
    return ((S.t / len) % 1 + 1) % 1;
  }

  function poseAnim(phase) {
    const anim = animById(S.anim), built = S.built;
    if (!built) return;
    if (anim.tower) {
      const tower = built.tower;
      tower.cooldown = Math.max(1e-4, TOWER.interval * (1 - phase));
      tower.aim = -.4;
      built.towerRenderer.sync([tower]);
      return;
    }
    const u = built.unit, len = cycleLength();
    const m = baseMotion(phase * len, { pushing: Boolean(u.look?.cannon || u.look?.bigCannon) });
    anim.motion(m, u, phase, currentStates(), len);
    characters.pose(built.view, m);
  }

  /* ---------- quadro a quadro ---------- */
  let last = performance.now(), raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (S.playing) S.t += dt * S.speed;
    draw();
  }

  function draw() {
    const box = $(`[data-box="${S.tab}"]`);
    if (canvas.parentElement !== box) box.prepend(canvas);
    if (S.tab === 'modelos') {
      if (S.built?.view) characters.pose(S.built.view, baseMotion(S.t, { weapon: S.built.unit.armed && S.built.unit.weapon !== 'cannon' ? S.built.unit.weapon : null }));
      if (S.playing) orbit.yaw += .0035 * S.speed;
      const model = MODELS.find(m => m.id === S.model);
      $('[data-hud-model]').innerHTML = model ? `<b>${model.label}</b>` : '';
    } else if (S.anim) {
      const phase = phaseNow();
      S.phase = phase;
      poseAnim(phase);
      const states = currentStates(), live = states.findIndex(([, a, b]) => phase >= a && phase < b);
      root.querySelectorAll('.vz-state').forEach((el, i) => {
        el.classList.toggle('live', i === live);
        el.classList.toggle('pick', i === S.state);
      });
      const anim = animById(S.anim), len = cycleLength();
      const who = anim.tower ? 'Trincheira' : UNIT_TYPES[S.charType].label;
      const stateName = states[live]?.[0] ?? '';
      $('[data-hud-anim]').innerHTML = `<b>${anim.label}</b> · ${who}<br>Estado: <b>${stateName}</b> · ${(phase * 100).toFixed(1)}% · ${(phase * len).toFixed(2)} s de ${len.toFixed(2)} s${S.playing ? '' : ' · pausado'}${S.state >= 0 ? ' · repetindo o estado' : ''}`;
      $('[data-time]').textContent = `${(phase * len).toFixed(2)} / ${len.toFixed(2)} s`;
      const scrub = $('[data-scrub]');
      if (document.activeElement !== scrub) scrub.value = String(phase);
    }
    const w = box.clientWidth, h = box.clientHeight;
    if (w && h && (canvas.width !== Math.floor(w * devicePixelRatio) || canvas.height !== Math.floor(h * devicePixelRatio))) {
      renderer.setPixelRatio(devicePixelRatio);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    placeCamera(camera, orbit);
    renderer.render(scene, camera);
  }

  /* ---------- controles ---------- */
  function setTab(tab) {
    S.tab = tab;
    for (const b of root.querySelectorAll('.vz-tab')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    for (const p of root.querySelectorAll('.vz-pane')) p.classList.toggle('on', p.dataset.pane === tab);
    if (tab === 'modelos') { renderGallery(); showModel(S.model ?? MODELS[0].id); }
    else { renderAnimList(); showAnim(S.anim ?? ANIMS[0].id, S.charType); }
  }
  function syncPlay() { $('[data-play]').textContent = S.playing ? 'Pausar' : 'Tocar'; }
  for (const b of root.querySelectorAll('.vz-tab')) b.addEventListener('click', () => setTab(b.dataset.tab));
  $('[data-close]').addEventListener('click', () => close());
  $('[data-play]').addEventListener('click', () => { S.playing = !S.playing; syncPlay(); });
  for (const b of root.querySelectorAll('[data-step]')) {
    b.addEventListener('click', () => { S.playing = false; syncPlay(); S.t += Number(b.dataset.step) / 30; });
  }
  $('[data-speed]').addEventListener('change', e => { S.speed = Number(e.target.value); });
  $('[data-char]').addEventListener('change', e => showAnim(S.anim, e.target.value));
  $('[data-scrub]').addEventListener('input', e => {
    S.playing = false; syncPlay();
    S.state = -1;
    S.t = Number(e.target.value) * cycleLength();
  });
  $('[data-go-anim]').addEventListener('click', () => {
    const model = MODELS.find(m => m.id === S.model);
    const anim = ANIMS.find(a => a.chars.includes(model.unitType));
    S.charType = model.unitType;
    S.anim = anim.id;
    setTab('animacoes');
  });
  let drag = null;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      orbit.target.addScaledVector(right, -dx * orbit.dist * .0015).addScaledVector(up, dy * orbit.dist * .0015);
    } else {
      orbit.yaw -= dx * .008;
      orbit.pitch = Math.max(-.15, Math.min(1.45, orbit.pitch + dy * .006));
    }
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = Math.max(6, Math.min(600, orbit.dist * Math.exp(e.deltaY * .001))); }, { passive: false });

  /* ---------- abrir e fechar ---------- */
  function open(tab) {
    if (root.style.display !== 'flex') {
      root.style.display = 'flex';
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    if (tab && tab !== S.tab) setTab(tab);
    else if (!S.built) setTab(S.tab);
  }
  function close() {
    root.style.display = 'none';
    cancelAnimationFrame(raf);
  }
  window.addEventListener('keydown', e => {
    if (e.code !== 'F9') return;
    e.preventDefault();
    if (root.style.display === 'flex') close(); else open();
  });

  /* ---------- a alça para scripts e para a IA ---------- */
  // __visor.lista()                    → modelos (com categoria) e animações (com personagens e estados)
  // __visor.modelo('unit:private')     → abre a aba Modelos nele
  // __visor.animacao({ id, personagem, estado, fase, tocando, velocidade, camera: { yaw, pitch, dist } })
  //      estado: índice ou nome do estado (ou null para o ciclo inteiro); fase: 0..1 do ciclo
  // __visor.estado()                   → o que está na tela agora (animação, estado aceso, fase, tempo)
  // __visor.foto()                     → PNG (data URL) do que está na tela, com o painel do estado
  const api = {
    abrir: tab => { open(tab); return api.estado(); },
    fechar: close,
    lista: () => ({
      modelos: MODELS.map(m => ({ id: m.id, nome: m.label, categoria: m.cat })),
      animacoes: ANIMS.filter(a => a.tower || a.chars.length).map(a => ({
        id: a.id, nome: a.label, grupo: a.grupo, personagens: a.tower ? ['trincheira'] : a.chars,
        estados: (typeof a.estados === 'function' ? a.estados(factory.create('enemy', a.chars[0], 0, 0)) : a.estados)
          .map(([nome, de, ate]) => ({ nome, de, ate }))
      }))
    }),
    modelo(id) { open('modelos'); showModel(id); draw(); return api.estado(); },
    animacao({ id, personagem, estado, fase, tocando, velocidade, camera: cam } = {}) {
      open('animacoes');
      if (id && (id !== S.anim || (personagem && personagem !== S.charType))) showAnim(id, personagem);
      if (estado !== undefined) {
        const states = currentStates();
        S.state = estado === null ? -1 : typeof estado === 'number' ? estado : states.findIndex(s => s[0] === estado);
      }
      if (fase !== undefined) {
        const states = currentStates(), len = cycleLength();
        if (S.state >= 0) { const [, a] = states[S.state]; S.t = Math.max(0, (fase - a)) * len; }
        else S.t = fase * len;
      }
      if (tocando !== undefined) S.playing = Boolean(tocando);
      if (velocidade !== undefined) S.speed = velocidade;
      if (cam) Object.assign(orbit, { yaw: cam.yaw ?? orbit.yaw, pitch: cam.pitch ?? orbit.pitch, dist: cam.dist ?? orbit.dist });
      syncPlay();
      draw();
      return api.estado();
    },
    estado: () => {
      const states = S.anim && S.built ? currentStates() : [];
      const live = states.findIndex(([, a, b]) => S.phase >= a && S.phase < b);
      return {
        aba: S.tab, modelo: S.model, animacao: S.anim, personagem: S.charType,
        estadoEscolhido: S.state >= 0 ? states[S.state]?.[0] : null, estadoAceso: states[live]?.[0] ?? null,
        fase: S.phase, segundos: S.anim ? S.phase * cycleLength() : 0, duracao: S.anim ? cycleLength() : 0,
        tocando: S.playing, camera: { yaw: orbit.yaw, pitch: orbit.pitch, dist: orbit.dist }
      };
    },
    foto: () => { draw(); return canvas.toDataURL('image/png'); }
  };
  // nomes em inglês também, para scripts antigos
  Object.assign(api, { open: api.abrir, close: api.fechar, list: api.lista, state: api.estado, snapshot: api.foto,
    show: o => api.animacao({ id: o.anim, personagem: o.model?.replace('unit:', ''), fase: o.phase, tocando: o.playing }) });
  window.__visor = api;
}
