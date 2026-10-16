import * as THREE from 'three';
import { day, night } from './state.js';
import { renderer, camera } from './renderer.js';
import * as kit from './kit.js';
import { silenciar } from './audio.js';
import { builders } from './scenes/index.js';
import { LUGARES, transformada, veiculos } from './mapa.js';

/* ===================== o mundo: todos os lugares montados juntos, cada um no seu lugar ===================== */
// Cada lugar (cena) continua sendo montado pelo seu builder, nas próprias coordenadas, num "mundo" do
// kit (freshScene). Aqui todos eles viram filhos de uma cena só (raiz), cada um com a sua matriz do
// mapa (mapa.js): andando, você atravessa de um para o outro sem corte. O jogador anda sempre nas
// coordenadas do lugar em que está (o atual, no main.js); para o resto, leva-se o ponto de um lugar
// para o outro pelas matrizes.
//   · colisão: o chão andável e os obstáculos dos lugares vizinhos no mesmo nível valem juntos
//   · luz: um céu e um sol para o mundo; das lâmpadas, acendem as N mais perto (o número fixo não
//     recompila os shaders)
//   · desenho: só os lugares perto (margem do mapa), a névoa e o fundo são os do lugar atual
//   · dia e noite: um lugar montado num dia/hora vira "velho" quando muda e é remontado, um por vez,
//     o mais perto primeiro (nunca o atual)

export const raiz = new THREE.Scene();
raiz.background = new THREE.Color(0x263848);
raiz.fog = new THREE.Fog(0x2b3d4c, 10, 68);

const ceu = new THREE.HemisphereLight(0xc9d5d7, 0x3a4f63, 1.05);
const sol = new THREE.DirectionalLight(0xe9f1f1, .5);
sol.position.set(3, 7, 2);
const sol2 = new THREE.DirectionalLight(0xffffff, 0);   // vaga do sol quente (praia, avião) quando o lugar não tem
sol2.position.set(0, 10, 0);
raiz.add(ceu, sol, sol2);
kit.luzes.ceu = ceu;
kit.luzes.sol = sol;

const N_LUZES = 12;
const fantasmas = [];
for (let i = 0; i < N_LUZES; i++) {
  const l = new THREE.PointLight(0x000000, 0, 1);
  l.position.set(0, -1e4, 0);
  raiz.add(l);
  fantasmas.push(l);
}

export const lugares = new Map();
export const lugar = nome => lugares.get(nome) || null;
export const presente = L => !L.cfg.presente || L.cfg.presente();
const carimbo = () => day + '|' + night;

/* ---------- montar um lugar ---------- */
function montar(nome, entry) {
  const b = builders[nome];
  if (!b) return null;
  const antes = kit.mundo;
  let def;
  try {
    def = b({ entry: entry || null, rel: null }) || {};
  } catch (e) {
    console.error('[mundo] não deu para montar', nome, e);
    if (kit.mundo && kit.mundo !== antes) { try { kit.descartarMundo(kit.mundo); } catch (_) { /* nada */ } }
    if (antes) kit.usarMundo(antes);
    return null;
  }
  const w = kit.mundo;
  if (antes) kit.usarMundo(antes);
  return { w, def };
}

function preparar(L) {
  const sc = L.w.scene;
  sc.matrixAutoUpdate = false;
  const dirs = [], pts = [];
  sc.traverse(o => {
    if (o.isHemisphereLight) o.visible = false;              // o céu é um só (raiz)
    else if (o.isDirectionalLight) {
      if (o === L.w.luzes.sol) o.visible = false;            // o sol também
      else dirs.push(o);                                     // sol próprio do lugar (praia, avião)
    } else if (o.isPointLight) pts.push(o);
  });
  // o alvo do sol próprio fica no lugar (senão ele miraria a origem do mundo, longe dali)
  for (const d of dirs) { const alvo = new THREE.Object3D(); sc.add(alvo); d.target = alvo; }
  L.extras = dirs;
  L.pontos = pts;
  L.caixa = new THREE.Box3().setFromObject(sc);
  if (L.caixa.isEmpty()) L.caixa.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
}

function posicionar(L) {
  const T = L.cfg.veiculo ? (veiculos[L.nome] || L.T) : transformada(L.nome);
  if (T !== L.T) L.T.copy(T);
  L.Ti.copy(L.T).invert();
  L.w.scene.matrix.copy(L.T);
  L.w.scene.matrixWorldNeedsUpdate = true;
  L.caixaM.copy(L.caixa).applyMatrix4(L.T);
}

function criar(nome, entry) {
  const r = montar(nome, entry);
  if (!r) return null;
  const L = {
    nome, cfg: LUGARES[nome], w: r.w, def: r.def, T: new THREE.Matrix4(), Ti: new THREE.Matrix4(),
    caixaM: new THREE.Box3(), carimbo: carimbo(), autoFeito: false, extras: [], pontos: [],
  };
  preparar(L);
  posicionar(L);
  raiz.add(L.w.scene);
  lugares.set(nome, L);
  return L;
}

function remontar(L) {
  const r = montar(L.nome, null);
  L.carimbo = carimbo();
  if (!r) return;                                            // quebrou: fica o velho
  raiz.remove(L.w.scene);
  kit.descartarMundo(L.w);
  L.w = r.w; L.def = r.def; L.autoFeito = false;
  preparar(L);
  posicionar(L);
  raiz.add(L.w.scene);
  ligarTudo();
}

// monta o mundo inteiro para o dia/hora de agora. entradas[nome] = por onde se chega (só muda o
// spawn que o builder devolve: seletor de cenas)
export function construirTudo(entradas = {}) {
  for (const L of lugares.values()) {
    raiz.remove(L.w.scene);
    try { kit.descartarMundo(L.w); } catch (e) { console.error(e); }
  }
  lugares.clear();
  for (const nome of Object.keys(LUGARES)) criar(nome, entradas[nome]);
  ligarTudo();
  ceu.intensity = night ? .5 : 1.05;
  sol.intensity = night ? .12 : .5;
  compilar();
}

// sobe todos os shaders de uma vez (com o mesmo número de luzes de sempre): andar não engasga
const camMundo = new THREE.PerspectiveCamera();
camMundo.matrixAutoUpdate = false;
camMundo.matrixWorldAutoUpdate = false;
export { camMundo };
function compilar() {
  const vis = [];
  for (const L of lugares.values()) {
    vis.push([L.w.scene, L.w.scene.visible]);
    L.w.scene.visible = true;
    for (const l of L.pontos) l.visible = false;
    for (const d of L.extras) d.visible = false;
  }
  for (const f of fantasmas) f.visible = true;
  sol2.visible = true;
  try {
    camMundo.projectionMatrix.copy(camera.projectionMatrix);
    camMundo.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    renderer.compile(raiz, camMundo);
  } catch (e) { console.error('[mundo] compile', e); }
  for (const [sc, v] of vis) sc.visible = v;
}

/* ---------- vestíbulos: as duas cópias são uma porta só ---------- */
const pares = [];
function ligarTudo() {
  pares.length = 0;
  for (const A of lugares.values()) {
    for (const s of A.w.saidas) {
      if (!s.portal) continue;
      const B = lugares.get(s.para[0]);
      if (!B || B === A) continue;
      const sB = B.w.saidas.find(x => x.portal && x.para[0] === A.nome);
      if (!sB || pares.some(p => p.a === sB && p.b === s)) continue;
      const ea = s.portal.ponte.est, eb = sB.portal.ponte.est;
      const est = (ea.P || ea.Q) ? ea : eb;                  // remontou um dos dois: vale o que estava aberto
      s.portal.ponte.est = sB.portal.ponte.est = est;
      s.portal.ponte.par = sB.portal.ponte;
      sB.portal.ponte.par = s.portal.ponte;
      s.pronto = sB.pronto = true;
      s.par = sB; sB.par = s;
      pares.push({ a: s, b: sB, A, B });
    }
  }
  mostrarCopias(atualAgora);
}
// das duas cópias, aparece a do lugar em que você está (são iguais; as duas juntas piscariam)
let atualAgora = null;
function mostrarCopias(atual) {
  for (const p of pares) {
    const v = p.A === atual ? p.a : p.B === atual ? p.b : (p.A.nome < p.B.nome ? p.a : p.b);
    p.a.portal.grupo.visible = v === p.a;
    p.b.portal.grupo.visible = v === p.b;
  }
}
// o lugar atual mudou: só as peças dele mandam no jogador (portas, elevador)
export function ativar(atual) {
  atualAgora = atual;
  for (const L of lugares.values()) L.w.ativo = L === atual;
  kit.usarMundo(atual.w);                                    // a cena, os interativos e os gatilhos do kit são os dele
  mostrarCopias(atual);
}

/* ---------- dia/hora mudou: remonta os velhos, um por vez ---------- */
let proxObra = 0;
const _pm = new THREE.Vector3();
export function cuidar(t, atual, px, pz) {
  if (t < proxObra) return;
  const c = carimbo();
  const e = atual.T.elements;
  _pm.set(e[0] * px + e[8] * pz + e[12], e[13], e[2] * px + e[10] * pz + e[14]);
  let melhor = null, dm = Infinity;
  for (const L of lugares.values()) {
    if (L === atual || L.carimbo === c) continue;
    const d = L.caixaM.distanceToPoint(_pm);
    if (d < dm) { dm = d; melhor = L; }
  }
  if (melhor) { remontar(melhor); proxObra = t + .25; }
}

/* ---------- colisão: os lugares vizinhos no mesmo nível ---------- */
// devolve [{ L, M }]: M leva um ponto do lugar atual para o lugar L (o primeiro é o próprio atual)
const _pool = [], _cands = [];
export function candidatos(atual, px, pz) {
  _cands.length = 0;
  let i = 0;
  const pega = () => (_pool[i] || (_pool[i] = { L: null, M: new THREE.Matrix4() }));
  const c0 = pega(); i++;
  c0.L = atual; c0.M.identity();
  _cands.push(c0);
  const e = atual.T.elements;
  const wx = e[0] * px + e[8] * pz + e[12], wz = e[2] * px + e[10] * pz + e[14];
  const chao = e[13] + (atual.def.elevFn ? atual.def.elevFn(px, pz) : 0);
  for (const L of lugares.values()) {
    if (L === atual || !presente(L)) continue;
    const b = L.caixaM;
    if (wx < b.min.x - 3 || wx > b.max.x + 3 || wz < b.min.z - 3 || wz > b.max.z + 3) continue;
    if (chao < b.min.y - 3 || chao > b.max.y + 3) continue;
    const c = pega(); i++;
    c.L = L;
    c.M.multiplyMatrices(L.Ti, atual.T);
    const m = c.M.elements;
    const lx = m[0] * px + m[8] * pz + m[12], lz = m[2] * px + m[10] * pz + m[14];
    const chaoL = L.T.elements[13] + (L.def.elevFn ? L.def.elevFn(lx, lz) : 0);
    if (Math.abs(chaoL - chao) > .7) continue;               // outro andar (o quarto lá em cima, a rua embaixo)
    _cands.push(c);
  }
  return _cands;
}
// leva (x, z) pela matriz M: [x, z]
export function levar(M, x, z) {
  const m = M.elements;
  return [m[0] * x + m[8] * z + m[12], m[2] * x + m[10] * z + m[14]];
}
export const giroDe = M => Math.atan2(M.elements[8], M.elements[0]);

/* ---------- animações: cada lugar com o jogador e a câmera levados para as coordenadas dele ---------- */
const _c0 = new THREE.Vector3(), _m = new THREE.Matrix4();
export function animar(t, atual, eu) {
  _c0.copy(camera.position);
  const salvo = { player: kit.game.player, travel: kit.game.travel, arrived: kit.game.arrived };
  for (const L of lugares.values()) {
    if (L === atual || !presente(L)) continue;
    if (!L.w.scene.visible && !L.cfg.sempre) continue;
    _m.multiplyMatrices(L.Ti, atual.T);
    const [lx, lz] = levar(_m, eu.px, eu.pz);
    const local = { px: lx, pz: lz, yaw: eu.yaw + giroDe(_m) };
    kit.game.player = () => local;
    kit.game.travel = () => {};
    kit.game.arrived = null;
    camera.position.copy(_c0).applyMatrix4(_m);
    kit.usarMundo(L.w);
    silenciar(!L.cfg.sempre);
    try { for (const a of L.w.anims) a(t); } catch (e) { console.error('[mundo] anim de', L.nome, e); }
    silenciar(false);
  }
  camera.position.copy(_c0);
  Object.assign(kit.game, salvo);
  kit.usarMundo(atual.w);
  try { for (const a of atual.w.anims) a(t); } catch (e) { console.error('[mundo] anim de', atual.nome, e); }
  for (const L of lugares.values()) if (L.cfg.veiculo && veiculos[L.nome]) posicionar(L);
}

/* ---------- desenho ---------- */
const _p = new THREE.Vector3(), _lp = new THREE.Vector3(), _cand = [];
function visivelAte(o) {
  let p = o.parent;
  while (p && p !== raiz) { if (!p.visible) return false; p = p.parent; }
  return p === raiz;
}
function escolherLuzes(atual, cam) {
  _cand.length = 0;
  for (const L of lugares.values()) {
    for (const d of L.extras) d.visible = L === atual;
    for (const l of L.pontos) {
      l.visible = false;
      if (!L.w.scene.visible || !(l.intensity > 0) || !visivelAte(l)) continue;
      l.getWorldPosition(_lp);
      _cand.push({ l, s: _lp.distanceTo(cam) - (l.distance || 20) });
    }
  }
  sol2.visible = !(atual.extras.length > 0);
  _cand.sort((a, b) => a.s - b.s);
  const n = Math.min(N_LUZES, _cand.length);
  for (let i = 0; i < n; i++) _cand[i].l.visible = true;
  for (let i = 0; i < N_LUZES; i++) fantasmas[i].visible = i >= n;
}

// põe a câmera do mundo onde a câmera local (do lugar atual) está
export function posicionarCamera(atual, camLocal = camera) {
  camLocal.updateMatrixWorld();
  camMundo.matrixWorld.multiplyMatrices(atual.T, camLocal.matrixWorld);
  camMundo.matrixWorldInverse.copy(camMundo.matrixWorld).invert();
  camMundo.projectionMatrix.copy(camLocal.projectionMatrix);
  camMundo.projectionMatrixInverse.copy(camLocal.projectionMatrixInverse);
}

export function desenhar(atual, camLocal = camera) {
  const sc = atual.w.scene;
  raiz.background = sc.background;
  raiz.fog = sc.fog;
  // o fim da câmera acompanha a névoa (do avião se vê longe; num quarto, perto)
  const far = Math.min(6000, Math.max(80, (sc.fog ? sc.fog.far : 80) * 1.15 + 5));
  if (Math.abs(camLocal.far - far) > .5) { camLocal.far = far; camLocal.updateProjectionMatrix(); }
  posicionarCamera(atual, camLocal);
  _p.setFromMatrixPosition(camMundo.matrixWorld);
  for (const L of lugares.values())
    L.w.scene.visible = presente(L) && (L === atual || L.caixaM.distanceToPoint(_p) <= (L.cfg.margem || 40));
  escolherLuzes(atual, _p);
  renderer.render(raiz, camMundo);
}
