import * as THREE from './lib/three.module.min.js';

/* ASCII DUNGEON — roguelike ASCII mobile-first, agora renderizado em 2.5D com three.js.
   A logica continua 100% em grade 2D por turnos; o three.js so desenha:
   paredes = blocos com textura '#', chao = quads com '.', entidades = sprites-glifo,
   tocha = point light no jogador, fog of war = tint por instancia.
   Texto visivel ao jogador: sempre em ingles. */

// ---------- Config ----------
const MAP_W = 44, MAP_H = 28;   // tamanho do mapa
const FOV_R2 = 42;              // raio de visao ao quadrado (~6.5 tiles)
const MAX_FLOOR = 5;

// ---------- Elementos ----------
const canvasEl   = document.getElementById('screen');
const screenWrap = document.getElementById('screen-wrap');
const overlayEl  = document.getElementById('overlay');
const fadeEl     = document.getElementById('fade');
const logEl      = document.getElementById('log');
const hdFloor    = document.getElementById('hd-floor');
const stHp   = document.getElementById('st-hp');
const stLv   = document.getElementById('st-lv');
const stXp   = document.getElementById('st-xp');
const stAtk  = document.getElementById('st-atk');
const stDef  = document.getElementById('st-def');
const stGold = document.getElementById('st-gold');
const btnPotion = document.getElementById('btn-potion');

// ---------- Estado ----------
let map = [], explored = [], visible = [], rooms = [];
let mobs = [], items = [], stairs = null;
let floorNum = 1, turnCount = 0;
let state = 'title'; // 'title' | 'play' | 'dead' | 'win'
let msgs = [];
const player = { x: 0, y: 0, hp: 22, maxHp: 22, atk: 3, def: 0, lvl: 1, xp: 0, gold: 0, potions: 1 };

// ---------- Cores ----------
const COL = {
  player: 0xffe27a, weak: 0x8ce99a, mid: 0xffa657, strong: 0xff7b72, boss: 0xd2a8ff,
  potion: 0xff6b9d, gold: 0xffd75e, gear: 0x9ecbff, stairs: 0x64d8ff,
  hurt: 0xff5544, heal: 0x8ce99a, white: 0xffffff,
};

// ---------- Dados dos monstros ----------
const MOBS = {
  rat:      { ch: 'r', name: 'rat',          hp: 4,  atk: 2, def: 0, xp: 2,  col: COL.weak },
  bat:      { ch: 'b', name: 'bat',          hp: 5,  atk: 2, def: 0, xp: 3,  col: COL.weak },
  goblin:   { ch: 'g', name: 'goblin',       hp: 8,  atk: 3, def: 1, xp: 5,  col: COL.mid },
  skeleton: { ch: 's', name: 'skeleton',     hp: 10, atk: 4, def: 1, xp: 7,  col: COL.mid },
  orc:      { ch: 'o', name: 'orc',          hp: 14, atk: 5, def: 2, xp: 10, col: COL.strong },
  wraith:   { ch: 'w', name: 'wraith',       hp: 12, atk: 6, def: 1, xp: 12, col: COL.strong },
  boss:     { ch: 'D', name: 'Dungeon Lord', hp: 40, atk: 7, def: 3, xp: 50, col: COL.boss },
};
// pool de bichos por andar (1 a 5)
const FLOOR_MOBS = [
  ['rat', 'rat', 'bat'],
  ['rat', 'bat', 'goblin', 'goblin'],
  ['goblin', 'skeleton', 'skeleton', 'bat'],
  ['skeleton', 'orc', 'wraith', 'goblin'],
  ['orc', 'wraith', 'skeleton'],
];
const ITEM_DEF = {
  potion: { ch: '!', col: COL.potion },
  gold:   { ch: '$', col: COL.gold },
  sword:  { ch: '/', col: COL.gear },
  armor:  { ch: ']', col: COL.gear },
};

// ---------- Utils ----------
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function walkable(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  const t = map[y][x];
  return t === '.' || t === ',';
}
function mobAt(x, y) { return mobs.find(m => m.x === x && m.y === y) || null; }
function itemAt(x, y) { return items.find(it => it.x === x && it.y === y) || null; }

// linha de visao (Bresenham); paredes bloqueiam, mas a propria parede alvo aparece
function los(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0) && map[y][x] === '#') return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// ---------- Geracao do andar ----------
function carveCorridor(a, b) {
  let x = a.cx, y = a.cy;
  const carve = () => { if (map[y][x] === '#') map[y][x] = '.'; };
  if (Math.random() < 0.5) {
    while (x !== b.cx) { x += Math.sign(b.cx - x); carve(); }
    while (y !== b.cy) { y += Math.sign(b.cy - y); carve(); }
  } else {
    while (y !== b.cy) { y += Math.sign(b.cy - y); carve(); }
    while (x !== b.cx) { x += Math.sign(b.cx - x); carve(); }
  }
}

function randFloorTile(minDist) {
  for (let i = 0; i < 300; i++) {
    const x = randInt(1, MAP_W - 2), y = randInt(1, MAP_H - 2);
    if (!walkable(x, y)) continue;
    if (x === player.x && y === player.y) continue;
    if (mobAt(x, y) || itemAt(x, y)) continue;
    if (stairs && stairs.x === x && stairs.y === y) continue;
    if (minDist && (Math.abs(x - player.x) + Math.abs(y - player.y)) < minDist) continue;
    return { x, y };
  }
  return null;
}

let bossMob = null;
function spawnMob(type, x, y) {
  const d = MOBS[type];
  const m = { type, x, y, hp: d.hp, atk: d.atk, def: d.def, xp: d.xp, ch: d.ch, name: d.name, col: d.col, awake: false, vis: null };
  mobs.push(m);
  if (type === 'boss') bossMob = m;
  return m;
}

function genFloor(n) {
  map = []; explored = []; visible = []; rooms = [];
  mobs = []; items = []; stairs = null; bossMob = null;
  for (let y = 0; y < MAP_H; y++) {
    map.push(Array(MAP_W).fill('#'));
    explored.push(Array(MAP_W).fill(false));
    visible.push(Array(MAP_W).fill(false));
  }
  // salas retangulares sem sobreposicao
  for (let i = 0; i < 80 && rooms.length < 9; i++) {
    const w = randInt(4, 9), h = randInt(3, 6);
    const x = randInt(1, MAP_W - w - 2), y = randInt(1, MAP_H - h - 2);
    if (rooms.some(o => x < o.x + o.w + 1 && o.x < x + w + 1 && y < o.y + o.h + 1 && o.y < y + h + 1)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) map[yy][xx] = '.';
  }
  for (let i = 1; i < rooms.length; i++) carveCorridor(rooms[i - 1], rooms[i]);
  // entulho decorativo
  for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
    if (map[y][x] === '.' && Math.random() < 0.06) map[y][x] = ',';
  }

  player.x = rooms[0].cx; player.y = rooms[0].cy;

  // sala mais distante recebe a escada (ou o chefe no ultimo andar)
  let far = rooms[0], fd = -1;
  for (const r of rooms) {
    if (rooms.length > 1 && r === rooms[0]) continue;
    const d = (r.cx - player.x) ** 2 + (r.cy - player.y) ** 2;
    if (d > fd) { fd = d; far = r; }
  }
  if (n < MAX_FLOOR) {
    stairs = { x: far.cx, y: far.cy };
  } else {
    spawnMob('boss', far.cx, far.cy);
  }

  // monstros
  const count = 3 + n * 2;
  const pool = FLOOR_MOBS[n - 1];
  for (let i = 0; i < count; i++) {
    const p = randFloorTile(9);
    if (!p) break;
    spawnMob(pick(pool), p.x, p.y);
  }

  // itens: pocoes, ouro e um equipamento por andar
  const nPot = 2 + (n === MAX_FLOOR ? 1 : 0);
  for (let i = 0; i < nPot; i++) {
    const p = randFloorTile(0);
    if (p) items.push({ type: 'potion', x: p.x, y: p.y, sprite: null });
  }
  for (let i = 0, g = randInt(2, 3); i < g; i++) {
    const p = randFloorTile(0);
    if (p) items.push({ type: 'gold', amount: randInt(2, 5) + n, x: p.x, y: p.y, sprite: null });
  }
  const gear = n % 2 === 1 ? 'sword' : 'armor';
  const gp = randFloorTile(0);
  if (gp) items.push({ type: gear, x: gp.x, y: gp.y, sprite: null });

  computeFov();
  rebuildLevelVisuals();
}

// ---------- Visao ----------
function computeFov() {
  for (let y = 0; y < MAP_H; y++) visible[y].fill(false);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const dx = x - player.x, dy = y - player.y;
    if (dx * dx + dy * dy > FOV_R2) continue;
    if (los(player.x, player.y, x, y)) { visible[y][x] = true; explored[y][x] = true; }
  }
}
function anyMobVisible() { return mobs.some(m => visible[m.y][m.x]); }

// ============================================================
// Camada 3D (three.js)
// ============================================================
let renderer, scene, camera, clock;
let ambLight, torch, stairsLight, bossLight;
let levelGroup = null, entityGroup = null, fxGroup = null;
let wallMesh = null, floorMesh = null, decoMesh = null;
let wallTiles = [], floorTiles = [], decoTiles = [];
let stairsSprite = null;
let boxGeo, floorGeo;
let wallMat, floorMat, decoMat;
let camK = 1;       // fator de afastamento pra telas em pe (portrait)
let shakeAmp = 0;
let elapsed = 0;
const fx = [];      // particulas e numeros flutuantes
const dummy = new THREE.Object3D();

// visual do jogador (sprite vive fora do levelGroup, sobrevive entre andares)
const pv = { sprite: null, dispX: 0, dispY: 0, lungeT: 0, lungeDX: 0, lungeDZ: 0, flashT: 0 };

const TINT_VISIBLE = new THREE.Color(0xffffff);
const TINT_DIM_WALL = new THREE.Color(0x3a3a52);
const TINT_DIM_FLOOR = new THREE.Color(0x262636);
const TINT_HIDDEN = new THREE.Color(0x000000);

// --- texturas de glifo desenhadas em canvas ---
const glyphCache = new Map();
const FONT = '"Cascadia Mono",Consolas,Menlo,"Courier New",monospace';

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// glifo branco com glow, fundo transparente — tinta-se pela cor do material
function glyphTex(ch) {
  if (glyphCache.has(ch)) return glyphCache.get(ch);
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.font = 'bold 84px ' + FONT;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,255,255,0.85)'; g.shadowBlur = 22;
  g.fillStyle = '#fff';
  g.fillText(ch, 64, 70);
  g.shadowBlur = 0;
  g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  glyphCache.set(ch, t);
  return t;
}

// textura de tile com cor ja "assada" (parede/chao reagem a luz da tocha)
function tileTex(ch, fg, bg) {
  const key = 'tile' + ch + fg + bg;
  if (glyphCache.has(key)) return glyphCache.get(key);
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.font = 'bold 88px ' + FONT;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = fg;
  g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  glyphCache.set(key, t);
  return t;
}

const textCache = new Map();
function textTex(str) {
  if (textCache.has(str)) return textCache.get(str);
  const c = makeCanvas(256, 128), g = c.getContext('2d');
  g.font = 'bold 64px ' + FONT;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(255,255,255,0.8)'; g.shadowBlur = 14;
  g.fillStyle = '#fff';
  g.fillText(str, 128, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textCache.set(str, t);
  return t;
}

function makeSprite(tex, colorHex, sx, sy) {
  const mat = new THREE.SpriteMaterial({ map: tex, color: colorHex, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(sx, sy, 1);
  return s;
}

function init3d() {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b10);
  scene.fog = new THREE.Fog(0x0b0b10, 8, 18);
  camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
  clock = new THREE.Clock();

  ambLight = new THREE.AmbientLight(0x8890b8, 0.4);
  scene.add(ambLight);
  torch = new THREE.PointLight(0xffc987, 2.6, 11, 1.7); // tocha do jogador
  scene.add(torch);

  boxGeo = new THREE.BoxGeometry(1, 1.15, 1);
  floorGeo = new THREE.PlaneGeometry(1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  wallMat = new THREE.MeshLambertMaterial({ map: tileTex('#', '#9a9ab8', '#171722') });
  floorMat = new THREE.MeshLambertMaterial({ map: tileTex('.', '#5a5a78', '#10101a') });
  decoMat = new THREE.MeshLambertMaterial({ map: tileTex(',', '#65658a', '#10101a') });

  pv.sprite = makeSprite(glyphTex('@'), COL.player, 1.05, 1.05);
  pv.sprite.visible = false;
  scene.add(pv.sprite);

  fxGroup = new THREE.Group();
  scene.add(fxGroup);

  onResize();
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.isInstancedMesh) o.dispose();
    if (o.isSprite) o.material.dispose();
  });
}

function rebuildLevelVisuals() {
  if (levelGroup) { scene.remove(levelGroup); disposeGroup(levelGroup); }
  if (entityGroup) { scene.remove(entityGroup); disposeGroup(entityGroup); }
  if (stairsLight) { scene.remove(stairsLight); stairsLight = null; }
  if (bossLight) { scene.remove(bossLight); bossLight = null; }
  levelGroup = new THREE.Group();
  entityGroup = new THREE.Group();
  stairsSprite = null;

  // coleta tiles: so paredes encostadas em area andavel (o resto e rocha solida invisivel)
  wallTiles = []; floorTiles = []; decoTiles = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const t = map[y][x];
    if (t === '.') floorTiles.push({ x, y });
    else if (t === ',') decoTiles.push({ x, y });
    else {
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (walkable(x + dx, y + dy)) { touches = true; break; }
      }
      if (touches) wallTiles.push({ x, y });
    }
  }

  wallMesh = new THREE.InstancedMesh(boxGeo, wallMat, wallTiles.length);
  wallTiles.forEach((t, i) => {
    dummy.position.set(t.x, 0.575, t.y);
    dummy.updateMatrix();
    wallMesh.setMatrixAt(i, dummy.matrix);
    wallMesh.setColorAt(i, TINT_HIDDEN);
  });
  floorMesh = new THREE.InstancedMesh(floorGeo, floorMat, floorTiles.length);
  floorTiles.forEach((t, i) => {
    dummy.position.set(t.x, 0, t.y);
    dummy.updateMatrix();
    floorMesh.setMatrixAt(i, dummy.matrix);
    floorMesh.setColorAt(i, TINT_HIDDEN);
  });
  decoMesh = new THREE.InstancedMesh(floorGeo, decoMat, decoTiles.length);
  decoTiles.forEach((t, i) => {
    dummy.position.set(t.x, 0, t.y);
    dummy.updateMatrix();
    decoMesh.setMatrixAt(i, dummy.matrix);
    decoMesh.setColorAt(i, TINT_HIDDEN);
  });
  wallMesh.frustumCulled = floorMesh.frustumCulled = decoMesh.frustumCulled = false;
  levelGroup.add(wallMesh, floorMesh, decoMesh);

  if (stairs) {
    stairsSprite = makeSprite(glyphTex('>'), COL.stairs, 0.9, 0.9);
    stairsSprite.position.set(stairs.x, 0.55, stairs.y);
    entityGroup.add(stairsSprite);
    stairsLight = new THREE.PointLight(COL.stairs, 1.1, 5, 2);
    stairsLight.position.set(stairs.x, 1, stairs.y);
    scene.add(stairsLight);
  }
  if (bossMob) {
    bossLight = new THREE.PointLight(COL.boss, 1.6, 7, 2);
    bossLight.position.set(bossMob.x, 1.2, bossMob.y);
    scene.add(bossLight);
  }

  scene.add(levelGroup, entityGroup);

  // jogador teleporta junto com a camera no andar novo
  pv.dispX = player.x; pv.dispY = player.y;
  pv.lungeT = 0; pv.flashT = 0;
  snapCamera();
  updateTileColors();
  syncSprites();
}

function updateTileColors() {
  const paint = (mesh, tiles, dimTint) => {
    tiles.forEach((t, i) => {
      const c = visible[t.y][t.x] ? TINT_VISIBLE : explored[t.y][t.x] ? dimTint : TINT_HIDDEN;
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  paint(wallMesh, wallTiles, TINT_DIM_WALL);
  paint(floorMesh, floorTiles, TINT_DIM_FLOOR);
  paint(decoMesh, decoTiles, TINT_DIM_FLOOR);
}

function createMobVisual(m) {
  const big = m.type === 'boss';
  const s = makeSprite(glyphTex(m.ch), m.col, big ? 1.6 : 0.95, big ? 1.6 : 0.95);
  s.position.set(m.x, big ? 0.85 : 0.55, m.y);
  entityGroup.add(s);
  m.vis = { sprite: s, dispX: m.x, dispY: m.y, lungeT: 0, lungeDX: 0, lungeDZ: 0, flashT: 0 };
}

function createItemVisual(it) {
  const d = ITEM_DEF[it.type];
  it.sprite = makeSprite(glyphTex(d.ch), d.col, 0.8, 0.8);
  it.sprite.position.set(it.x, 0.45, it.y);
  entityGroup.add(it.sprite);
}

function syncSprites() {
  for (const m of mobs) if (!m.vis) createMobVisual(m);
  for (const it of items) if (!it.sprite) createItemVisual(it);
  for (const m of mobs) m.vis.sprite.visible = visible[m.y][m.x];
  for (const it of items) it.sprite.visible = visible[it.y][it.x];
  if (stairsSprite) {
    const vis = visible[stairs.y][stairs.x];
    stairsSprite.visible = vis || explored[stairs.y][stairs.x];
    stairsSprite.material.color.setHex(vis ? COL.stairs : 0x2a4a58);
    if (stairsLight) stairsLight.visible = vis;
  }
}

function removeMobVisual(m) {
  if (m.vis) { entityGroup.remove(m.vis.sprite); m.vis.sprite.material.dispose(); m.vis = null; }
}
function removeItemVisual(it) {
  if (it.sprite) { entityGroup.remove(it.sprite); it.sprite.material.dispose(); it.sprite = null; }
}

// --- efeitos ---
function spawnBurst(x, z, colorHex, n, ch) {
  for (let i = 0; i < n; i++) {
    const s = makeSprite(glyphTex(ch || '*'), colorHex, 0.3, 0.3);
    s.position.set(x + (Math.random() - 0.5) * 0.3, 0.55, z + (Math.random() - 0.5) * 0.3);
    fxGroup.add(s);
    const a = Math.random() * Math.PI * 2;
    fx.push({
      sprite: s, t: 0, life: 0.45 + Math.random() * 0.35,
      vx: Math.cos(a) * (1 + Math.random() * 2), vy: 1.5 + Math.random() * 2.5, vz: Math.sin(a) * (1 + Math.random() * 2),
      grav: 7,
    });
  }
}

function floatText(str, colorHex, x, z, y0) {
  const s = makeSprite(textTex(str), colorHex, 1.5, 0.75);
  s.position.set(x, y0 === undefined ? 1.1 : y0, z);
  fxGroup.add(s);
  fx.push({ sprite: s, t: 0, life: 0.8, vx: 0, vy: 1.4, vz: 0, grav: 0 });
}

function lunge(v, tx, tz) {
  v.lungeT = 0.18;
  v.lungeDX = Math.sign(tx); v.lungeDZ = Math.sign(tz);
}

function snapCamera() {
  const p = new THREE.Vector3(pv.dispX, 0, pv.dispY);
  camera.position.set(p.x, 7.4 * camK, p.z + 5.6 * camK);
  camera.lookAt(p.x, 0.3, p.z);
}

function onResize() {
  const w = screenWrap.clientWidth, h = screenWrap.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camK = camera.aspect >= 1 ? 1 : Math.min(1.65, Math.pow(1 / camera.aspect, 0.75));
  camera.updateProjectionMatrix();
  scene.fog.near = 6 + 3 * camK;
  scene.fog.far = 12 * camK + 6;
  torch.distance = 8.5 * camK + 2.5;
}

// --- loop de animacao: interpola posicoes logicas -> visuais ---
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // jogador desliza ate o tile logico + bob de idle + investida de ataque
  const k = 1 - Math.pow(0.00005, dt);
  pv.dispX += (player.x - pv.dispX) * k;
  pv.dispY += (player.y - pv.dispY) * k;
  let ox = 0, oz = 0;
  if (pv.lungeT > 0) {
    pv.lungeT -= dt;
    const s = Math.sin(Math.PI * (1 - Math.max(0, pv.lungeT) / 0.18)) * 0.35;
    ox = pv.lungeDX * s; oz = pv.lungeDZ * s;
  }
  pv.sprite.position.set(pv.dispX + ox, 0.58 + Math.sin(elapsed * 3) * 0.045, pv.dispY + oz);
  if (pv.flashT > 0) {
    pv.flashT -= dt;
    pv.sprite.material.color.setHex(pv.flashT > 0 ? COL.hurt : COL.player);
  }

  // tocha segue com flicker
  torch.position.set(pv.dispX + ox, 1.5, pv.dispY + oz);
  torch.intensity = 2.5 + Math.sin(elapsed * 11) * 0.14 + Math.sin(elapsed * 23 + 1.7) * 0.1;

  // monstros deslizam, investem, piscam ao apanhar
  for (const m of mobs) {
    const v = m.vis;
    if (!v) continue;
    v.dispX += (m.x - v.dispX) * k;
    v.dispY += (m.y - v.dispY) * k;
    let mx = 0, mz = 0;
    if (v.lungeT > 0) {
      v.lungeT -= dt;
      const s = Math.sin(Math.PI * (1 - Math.max(0, v.lungeT) / 0.18)) * 0.3;
      mx = v.lungeDX * s; mz = v.lungeDZ * s;
    }
    const baseY = m.type === 'boss' ? 0.85 : 0.55;
    const bob = m.type === 'bat' || m.type === 'wraith' ? Math.sin(elapsed * 5 + m.x) * 0.12 : 0;
    v.sprite.position.set(v.dispX + mx, baseY + bob, v.dispY + mz);
    if (v.flashT > 0) {
      v.flashT -= dt;
      v.sprite.material.color.setHex(v.flashT > 0 ? COL.white : m.col);
    }
  }
  if (bossMob && bossLight) {
    bossLight.position.set(bossMob.vis ? bossMob.vis.dispX : bossMob.x, 1.2, bossMob.vis ? bossMob.vis.dispY : bossMob.y);
    bossLight.intensity = 1.5 + Math.sin(elapsed * 3) * 0.4;
  }

  // itens e escada pulsam
  for (const it of items) {
    if (it.sprite) {
      const p = 0.8 * (1 + 0.08 * Math.sin(elapsed * 4 + it.x * 2));
      it.sprite.scale.set(p, p, 1);
    }
  }
  if (stairsSprite) {
    const p = 0.9 * (1 + 0.1 * Math.sin(elapsed * 2.5));
    stairsSprite.scale.set(p, p, 1);
  }

  // particulas e textos flutuantes
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i];
    f.t += dt;
    if (f.t >= f.life) {
      fxGroup.remove(f.sprite); f.sprite.material.dispose();
      fx.splice(i, 1);
      continue;
    }
    f.vy -= f.grav * dt;
    f.sprite.position.x += f.vx * dt;
    f.sprite.position.y += f.vy * dt;
    f.sprite.position.z += f.vz * dt;
    f.sprite.material.opacity = 1 - (f.t / f.life) ** 2;
  }

  // camera persegue o jogador com suavidade + shake
  const ck = 1 - Math.pow(0.002, dt);
  const tx = pv.dispX, tz = pv.dispY;
  camera.position.x += (tx - camera.position.x) * ck;
  camera.position.y += (7.4 * camK - camera.position.y) * ck;
  camera.position.z += (tz + 5.6 * camK - camera.position.z) * ck;
  if (shakeAmp > 0) {
    shakeAmp = Math.max(0, shakeAmp - dt * 0.9);
    camera.position.x += (Math.random() - 0.5) * shakeAmp;
    camera.position.z += (Math.random() - 0.5) * shakeAmp;
  }
  camera.lookAt(tx, 0.3, tz);

  renderer.render(scene, camera);
}

// atualizacao visual pos-turno (a logica ja rodou)
function updateVisuals() {
  updateTileColors();
  syncSprites();
  updateHud();
}

// ---------- HUD / log ----------
function updateHud() {
  const ratio = player.hp / player.maxHp;
  let filled = Math.round(ratio * 10);
  if (player.hp > 0 && filled === 0) filled = 1;
  stHp.textContent = 'HP [' + '#'.repeat(filled) + '-'.repeat(10 - filled) + '] ' + player.hp + '/' + player.maxHp;
  stHp.className = ratio > 0.5 ? 'hp-ok' : ratio > 0.25 ? 'hp-warn' : 'hp-low';
  stLv.textContent = 'LV ' + player.lvl;
  stXp.textContent = 'XP ' + player.xp + '/' + (player.lvl * 10);
  stAtk.textContent = 'ATK ' + player.atk;
  stDef.textContent = 'DEF ' + player.def;
  stGold.textContent = '$ ' + player.gold;
  btnPotion.textContent = '! POTION ×' + player.potions;
  btnPotion.classList.toggle('empty', player.potions === 0);
  hdFloor.textContent = 'FLOOR ' + floorNum + '/' + MAX_FLOOR;
}

function msg(t, cls) {
  msgs.push({ t, cls: cls || '' });
  if (msgs.length > 40) msgs.shift();
  const last = msgs.slice(-4);
  logEl.innerHTML = last.map((m, i) =>
    '<div class="log-line ' + m.cls + (i < last.length - 1 ? ' old' : '') + '">' + m.t + '</div>'
  ).join('');
}

// ---------- Acoes do jogador ----------
function playerMove(dx, dy) {
  if (state !== 'play') return;
  const nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return;
  const m = mobAt(nx, ny);
  if (m) { lunge(pv, dx, dy); playerAttack(m); endTurn(); return; }
  if (!walkable(nx, ny)) return; // esbarrar na parede nao gasta turno
  player.x = nx; player.y = ny;
  onEnterTile();
  endTurn();
}

function waitTurn() {
  if (state !== 'play') return;
  endTurn();
}

function onEnterTile() {
  const it = itemAt(player.x, player.y);
  if (it) {
    removeItemVisual(it);
    items.splice(items.indexOf(it), 1);
    if (it.type === 'potion') {
      player.potions++;
      msg('You pick up a potion.', 'good');
      spawnBurst(player.x, player.y, COL.potion, 5, '+');
    } else if (it.type === 'gold') {
      player.gold += it.amount;
      msg('You pick up ' + it.amount + ' gold.', 'good');
      floatText('+' + it.amount + '$', COL.gold, player.x, player.y);
      spawnBurst(player.x, player.y, COL.gold, 5, '*');
    } else if (it.type === 'sword') {
      player.atk++;
      msg('You find a sharper blade. ATK +1!', 'good');
      floatText('ATK +1', COL.gear, player.x, player.y);
      spawnBurst(player.x, player.y, COL.gear, 7, '/');
    } else {
      player.def++;
      msg('You find sturdier armor. DEF +1!', 'good');
      floatText('DEF +1', COL.gear, player.x, player.y);
      spawnBurst(player.x, player.y, COL.gear, 7, ']');
    }
  }
  if (stairs && player.x === stairs.x && player.y === stairs.y) descend();
}

function descend() {
  floorNum++;
  fadeEl.style.opacity = 1;
  setTimeout(() => { fadeEl.style.opacity = 0; }, 200);
  genFloor(floorNum);
  if (floorNum === MAX_FLOOR) msg('You descend to floor ' + floorNum + '. A terrible presence lurks here...', 'bad');
  else msg('You descend to floor ' + floorNum + '.');
}

function drinkPotion() {
  if (state !== 'play') return;
  if (player.potions <= 0) { msg('You have no potions.'); return; }
  if (player.hp >= player.maxHp) { msg('You are already at full health.'); return; }
  player.potions--;
  const heal = 6 + player.lvl * 2;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  msg('You drink a potion. +' + heal + ' HP.', 'good');
  floatText('+' + heal + ' HP', COL.heal, player.x, player.y);
  spawnBurst(player.x, player.y, COL.heal, 6, '+');
  endTurn();
}

// ---------- Combate ----------
function playerAttack(m) {
  const dmg = Math.max(1, player.atk - m.def + randInt(0, 1));
  m.hp -= dmg;
  if (m.vis) m.vis.flashT = 0.16;
  floatText('' + dmg, COL.white, m.x, m.y);
  if (m.hp <= 0) killMob(m);
  else msg('You hit the ' + m.name + ' for ' + dmg + '.');
}

function killMob(m) {
  spawnBurst(m.x, m.y, m.col, m.type === 'boss' ? 26 : 9, '*');
  removeMobVisual(m);
  mobs.splice(mobs.indexOf(m), 1);
  msg('The ' + m.name + ' dies!', 'good');
  gainXp(m.xp);
  if (m.type === 'boss') {
    bossMob = null;
    if (bossLight) { scene.remove(bossLight); bossLight = null; }
    shakeAmp = 0.5;
    win();
    return;
  }
  const r = Math.random();
  if (r < 0.35) items.push({ type: 'gold', amount: randInt(2, 5) + floorNum, x: m.x, y: m.y, sprite: null });
  else if (r < 0.5) items.push({ type: 'potion', x: m.x, y: m.y, sprite: null });
}

function gainXp(n) {
  player.xp += n;
  while (player.xp >= player.lvl * 10) {
    player.xp -= player.lvl * 10;
    player.lvl++;
    player.maxHp += 4;
    player.hp = Math.min(player.maxHp, player.hp + 6);
    floatText('LEVEL UP!', COL.player, player.x, player.y, 1.4);
    spawnBurst(player.x, player.y, COL.player, 12, '+');
    if (player.lvl % 2 === 0) { player.atk++; msg('Level up! LV ' + player.lvl + ' — ATK +1.', 'good'); }
    else { player.def++; msg('Level up! LV ' + player.lvl + ' — DEF +1.', 'good'); }
  }
}

function mobAttack(m) {
  if (m.vis) lunge(m.vis, player.x - m.x, player.y - m.y);
  const dmg = Math.max(1, m.atk - player.def + randInt(-1, 1));
  player.hp -= dmg;
  msg('The ' + m.name + ' hits you for ' + dmg + '.', 'bad');
  floatText('-' + dmg, COL.hurt, player.x, player.y);
  pv.flashT = 0.18;
  shakeAmp = Math.max(shakeAmp, 0.22);
  if (navigator.vibrate) navigator.vibrate(20);
  if (player.hp <= 0) { player.hp = 0; die(); }
}

// ---------- Turno dos monstros ----------
function stepToward(m) {
  const dx = Math.sign(player.x - m.x), dy = Math.sign(player.y - m.y);
  const opts = Math.abs(player.x - m.x) >= Math.abs(player.y - m.y) ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
  for (const [ox, oy] of opts) {
    if (ox === 0 && oy === 0) continue;
    const nx = m.x + ox, ny = m.y + oy;
    if (nx === player.x && ny === player.y) continue; // ataca no proximo turno, quando adjacente
    if (walkable(nx, ny) && !mobAt(nx, ny)) { m.x = nx; m.y = ny; return; }
  }
}

function stepRandom(m) {
  const [ox, oy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
  const nx = m.x + ox, ny = m.y + oy;
  if (walkable(nx, ny) && !mobAt(nx, ny) && !(nx === player.x && ny === player.y)) { m.x = nx; m.y = ny; }
}

function mobsAct() {
  for (const m of mobs.slice()) {
    if (state !== 'play') return;
    if (Math.abs(m.x - player.x) + Math.abs(m.y - player.y) === 1) { mobAttack(m); continue; }
    const dx = m.x - player.x, dy = m.y - player.y;
    if (dx * dx + dy * dy <= 64 && los(m.x, m.y, player.x, player.y)) m.awake = true;
    if (m.awake) stepToward(m);
    else if (Math.random() < 0.2) stepRandom(m);
  }
}

function endTurn() {
  mobsAct();
  if (state === 'play') {
    turnCount++;
    // descanso: regenera devagar quando nao ha inimigo a vista
    if (turnCount % 10 === 0 && player.hp < player.maxHp && !anyMobVisible()) player.hp++;
  }
  computeFov();
  updateVisuals();
}

// ---------- Estados de jogo ----------
function showOverlay(inner) {
  overlayEl.innerHTML = '<div class="ov-inner">' + inner + '</div>';
  overlayEl.style.display = 'flex';
}
function hideOverlay() { overlayEl.style.display = 'none'; }

function showTitle() {
  state = 'title';
  showOverlay(
    '<div class="ov-title">ASCII DUNGEON</div>' +
    '<div class="ov-legend">' +
    '<span class="c-player">@</span> you &nbsp; <span class="mob-mid">g</span> monster &nbsp; <span class="c-potion">!</span> potion<br>' +
    '<span class="c-gold">$</span> gold &nbsp; <span class="c-gear">/</span> gear &nbsp; <span class="c-stairs">&gt;</span> stairs' +
    '</div>' +
    '<div class="ov-sub">Descend 5 floors.<br>Slay the Dungeon Lord.<br><br>Swipe or use the pad to move.<br>Bump into enemies to attack.</div>' +
    '<div class="ov-tap">TAP TO START</div>' +
    '<div class="ov-build">BUILD 2</div>'
  );
}

function start() {
  Object.assign(player, { hp: 22, maxHp: 22, atk: 3, def: 0, lvl: 1, xp: 0, gold: 0, potions: 1 });
  floorNum = 1; turnCount = 0; msgs = [];
  logEl.innerHTML = '';
  state = 'play';
  genFloor(1);
  pv.sprite.visible = true;
  hideOverlay();
  msg('Welcome to the dungeon. Good luck!', 'good');
  updateVisuals();
}

function die() {
  state = 'dead';
  spawnBurst(player.x, player.y, COL.hurt, 16, '*');
  pv.sprite.visible = false;
  shakeAmp = 0.45;
  if (navigator.vibrate) navigator.vibrate(80);
  showOverlay(
    '<div class="ov-title bad-t">YOU DIED</div>' +
    '<div class="ov-sub">Floor ' + floorNum + ' &middot; Level ' + player.lvl + ' &middot; ' + player.gold + ' gold</div>' +
    '<div class="ov-tap">TAP TO TRY AGAIN</div>'
  );
}

function win() {
  state = 'win';
  showOverlay(
    '<div class="ov-title win-t">VICTORY</div>' +
    '<div class="ov-sub">The Dungeon Lord is slain.<br>The dungeon falls silent.<br><br>Level ' + player.lvl + ' &middot; ' + player.gold + ' gold &middot; ' + turnCount + ' turns</div>' +
    '<div class="ov-tap">TAP TO PLAY AGAIN</div>'
  );
}

// ---------- Input ----------
document.addEventListener('keydown', e => {
  if (state !== 'play') {
    if (e.key === 'Enter' || e.key === ' ') { start(); e.preventDefault(); }
    return;
  }
  const k = e.key.toLowerCase();
  let handled = true;
  if (k === 'arrowup' || k === 'w') playerMove(0, -1);
  else if (k === 'arrowdown' || k === 's') playerMove(0, 1);
  else if (k === 'arrowleft' || k === 'a') playerMove(-1, 0);
  else if (k === 'arrowright' || k === 'd') playerMove(1, 0);
  else if (k === ' ' || k === '.') waitTurn();
  else if (k === 'q') drinkPotion();
  else handled = false;
  if (handled) e.preventDefault();
});

// d-pad com repeticao ao segurar
function bindHold(btn, fn) {
  let iv = null;
  const stop = () => { if (iv) { clearInterval(iv); iv = null; } };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    fn();
    stop();
    iv = setInterval(fn, 200);
  });
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('pointerleave', stop);
}
bindHold(document.getElementById('btn-up'),    () => playerMove(0, -1));
bindHold(document.getElementById('btn-down'),  () => playerMove(0, 1));
bindHold(document.getElementById('btn-left'),  () => playerMove(-1, 0));
bindHold(document.getElementById('btn-right'), () => playerMove(1, 0));
bindHold(document.getElementById('btn-wait'),  () => waitTurn());
btnPotion.addEventListener('click', drinkPotion);

// swipe no mapa tambem move
let tsx = 0, tsy = 0;
screenWrap.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  tsx = t.clientX; tsy = t.clientY;
}, { passive: true });
screenWrap.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - tsx, dy = t.clientY - tsy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // tap: overlay cuida
  if (Math.abs(dx) > Math.abs(dy)) playerMove(Math.sign(dx), 0);
  else playerMove(0, Math.sign(dy));
});

overlayEl.addEventListener('click', () => { if (state !== 'play') start(); });

window.addEventListener('resize', onResize);

// ---------- Boot ----------
init3d();
showTitle();
animate();
