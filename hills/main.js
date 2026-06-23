// main.js — DOOM HILLS: monta a cena, conecta tudo e roda o loop de combate.
// Estética Silent Hill PSX (névoa, grão, CRT) + gameplay Doom (espingarda, hordas,
// munição, chave azul, porta trancada, switch de saída). Abertura via boot.js,
// controles de toque via touch.js.
import * as THREE from 'three';
import { PSX } from './psx.js';
import { World } from './world.js';
import { Player } from './player.js';
import { MonsterManager } from './entities.js';
import { GameAudio } from './audio.js';
import { runIntro } from './boot.js';
import { TouchControls, isTouchDevice } from './touch.js';
import { startCRT } from './crt.js';
import { Shotgun } from './weapon.js';

const FOG = 0x0a0d10;
const TOUCH_LOOK_X = 17;
const TOUCH_LOOK_Y = 13;
const SEE_MAX = 20;

const state = { mode: 'title', time: 0, hasKey: false };

// detecção de visão + grão dinâmico + sons
const _frustum = new THREE.Frustum();
const _projScreen = new THREE.Matrix4();
const _mpos = new THREE.Vector3();
let grainNow = 0.07;
let creepyTimer = 3;
let spottedCd = 0;
let nukeTimer = 0;
let firingMouse = false;
let shake = 0;        // tremor aleatório da tela (tiro / dano)
let viewKick = 0;     // coice: a câmera sobe e volta

// ---------- render / cena ----------
const canvas = document.getElementById('game');
const psx = new PSX(canvas);
startCRT();
const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.FogExp2(FOG, 0.05);

const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.05, 200);
scene.add(camera);

const ambient = new THREE.AmbientLight(0x22262d, 0.55); scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x2a313c, 0x07080c, 0.4); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x3a4a60, 0.25); moon.position.set(-30, 45, -12); scene.add(moon);

// ---------- mundo / jogador / inimigos / arma / áudio / toque ----------
const world = new World(scene);
const player = new Player(camera, world.spawn);
player.yaw = 0;                       // olhando pro norte (-z), pro fundo da fase
const monsters = new MonsterManager(scene);
const weapon = new Shotgun(camera);
const audio = new GameAudio();
const touchMode = isTouchDevice();
const touch = touchMode ? new TouchControls() : null;

for (const p of world.monsterSpawns) monsters.spawn(p);

// ---------- UI ----------
const ui = {
  pause: document.getElementById('pause'),
  dead: document.getElementById('dead'),
  win: document.getElementById('win'),
  damage: document.getElementById('damage'),
  flash: document.getElementById('flash'),
  open: document.getElementById('open'),
  hp: document.getElementById('hp'),
  armor: document.getElementById('armor'),
  ammo: document.getElementById('ammo'),
};
function flashDamage() { ui.damage.style.opacity = 0.9; setTimeout(() => ui.damage.style.opacity = 0, 120); }
let lastMsg = null;
function showMsg(txt) {
  if (txt === lastMsg) return; lastMsg = txt;
  if (txt) { ui.open.textContent = txt; ui.open.classList.add('show'); }
  else ui.open.classList.remove('show');
}
function updateHUD() {
  ui.hp.textContent = player.health;
  ui.hp.style.color = player.health <= 25 ? '#ff3030' : '#d8d2c6';
  ui.armor.textContent = player.armor;
  ui.ammo.textContent = weapon.ammo;
  ui.ammo.style.color = weapon.ammo <= 0 ? '#ff3030' : '#d8d2c6';
}

// ---------- input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && state.mode === 'play') player.toggleFlash();
  if (e.code === 'KeyE' && state.mode === 'play') useAction();
  if (e.code === 'KeyR') {
    if (state.mode === 'dead') restartToTitle();
    else if (state.mode === 'win') location.reload();
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousemove', (e) => {
  if (state.mode === 'play' && document.pointerLockElement) player.look(e.movementX, e.movementY);
});
addEventListener('mousedown', (e) => {
  if (state.mode !== 'play' || e.button !== 0 || !document.pointerLockElement) return;
  firingMouse = true;
  if (weapon.empty) audio.empty();
});
addEventListener('mouseup', (e) => { if (e.button === 0) firingMouse = false; });

// movimento: teclado + analógico esquerdo
function gatherInput() {
  let mx = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  let mz = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  let run = keys['ShiftLeft'] || keys['ShiftRight'] || false;
  if (touch) {
    const mv = touch.moveVec; mx += mv.x; mz += -mv.y;
    const lv = touch.lookVec;
    if (lv.x || lv.y) player.look(lv.x * TOUCH_LOOK_X, lv.y * TOUCH_LOOK_Y);
    if (touch.consumeFlash()) player.toggleFlash();
    if (touch.running) run = true;          // analógico no talo = correr
  }
  return { mx, mz, run };
}

// ---------- abertura / início ----------
function startPlay() { state.mode = 'play'; ui.pause.classList.add('hidden'); }
function pauseGame() { state.mode = 'pause'; ui.pause.classList.remove('hidden'); ui.open.classList.remove('show'); audio.setStatic(0); audio.setHeartbeat(false); }

function beginGame() {
  audio.init();
  if (touchMode) { touch.show(); startPlay(); }
  else { document.body.requestPointerLock(); }
}
runIntro(beginGame);

function requestPlay() { audio.init(); document.body.requestPointerLock(); }
ui.pause.addEventListener('click', requestPlay);

document.addEventListener('pointerlockchange', () => {
  if (touchMode) return;
  if (document.pointerLockElement) {
    if (state.mode !== 'win' && state.mode !== 'dead') startPlay();
  } else if (state.mode === 'play') {
    pauseGame();
  }
});

ui.dead.addEventListener('click', () => { if (state.mode === 'dead') restartToTitle(); });
ui.win.addEventListener('click', () => { if (state.mode === 'win') location.reload(); });
function restartToTitle() {
  try { sessionStorage.setItem('hills-skip-intro', '1'); } catch (e) { /* ignora */ }
  location.reload();
}

// ---------- ação USE (porta / saída) ----------
function useAction() {
  if (!world.doorOpen && world.nearDoor(player.pos)) {
    if (state.hasKey) { world.openDoor(); audio.gateUnlock(); }
    else audio.gateLocked();
  } else if (world.nearExit(player.pos)) {
    finishLevel();
  }
}

// ---------- tiro: hitscan em cone (espalhamento da espingarda) ----------
function doHitscan() {
  const f = player.forward();
  for (const m of monsters.list) {
    if (m.dead) continue;
    const dx = m.pos.x - player.pos.x, dz = m.pos.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > weapon.range || dist < 0.001) continue;
    const ndx = dx / dist, ndz = dz / dist;
    const dot = ndx * f.x + ndz * f.z;
    if (dot < 0.95) continue;                                 // fora do cone (~18°)
    if (lineBlocked(player.pos.x, player.pos.z, m.pos.x, m.pos.z)) continue;
    const falloff = Math.max(0.3, 1 - dist / weapon.range);
    const center = (dot - 0.95) / 0.05;                       // 0=borda 1=centro
    const dmg = Math.round((40 + 50 * center) * falloff);     // 40..90 * falloff
    const killed = m.hurt(dmg, ndx, ndz);
    if (killed) audio.enemyDie(panOf(m)); else audio.enemyHit(panOf(m));
  }
}

// ---------- segmento A->B cruza algum colisor? (slab test 2D) ----------
function lineBlocked(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  for (const c of world.colliders) {
    let tmin = 0, tmax = 1;
    if (Math.abs(dx) < 1e-6) { if (ax < c.minX || ax > c.maxX) continue; }
    else { let t1 = (c.minX - ax) / dx, t2 = (c.maxX - ax) / dx; if (t1 > t2) { const u = t1; t1 = t2; t2 = u; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) continue; }
    if (Math.abs(dz) < 1e-6) { if (az < c.minZ || az > c.maxZ) continue; }
    else { let t1 = (c.minZ - az) / dz, t2 = (c.maxZ - az) / dz; if (t1 > t2) { const u = t1; t1 = t2; t2 = u; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) continue; }
    return true;
  }
  return false;
}

// ---------- visão / áudio espacial ----------
function isSeen(m, d) {
  if (d > SEE_MAX) return false;
  _mpos.set(m.pos.x, 1.2, m.pos.z);
  if (!_frustum.containsPoint(_mpos)) return false;
  return !lineBlocked(player.pos.x, player.pos.z, m.pos.x, m.pos.z);
}
function panOf(m) {
  const dx = m.pos.x - player.pos.x, dz = m.pos.z - player.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  return Math.max(-1, Math.min(1, (dx / len) * rx + (dz / len) * rz));
}
function updateGrain(dt, nearestSeen) {
  let target = 0.07;
  if (nearestSeen < SEE_MAX) target += (1 - nearestSeen / SEE_MAX) * 0.3;
  grainNow += (target - grainNow) * Math.min(1, dt * 5);
  psx.setGrain(grainNow);
}

// ---------- itens ----------
function applyPickup(got) {
  if (got.type === 'ammo') { weapon.addAmmo(got.amount); audio.ammoPickup(); }
  else if (got.type === 'med') { player.heal(got.amount); audio.itemPickup(); }
  else if (got.type === 'armor') { player.addArmor(got.amount); audio.itemPickup(); }
  else if (got.type === 'key') { state.hasKey = true; audio.keyPickup(); }
}

// ---------- loop ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  state.time += dt;
  if (state.mode === 'play') updatePlay(dt);
  else { weapon.update(dt, false, false); world.update(dt, state.time, player.pos); }
  psx.render(scene, camera, state.time);
}

function updatePlay(dt) {
  const input = gatherInput();
  player.update(dt, input, world.colliders, () => audio.footstep());
  const moving = Math.hypot(input.mx, input.mz) > 0.05;

  // frustum p/ "à vista"
  camera.updateMatrixWorld();
  _projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse.copy(camera.matrixWorld).invert());
  _frustum.setFromProjectionMatrix(_projScreen);

  if (spottedCd > 0) spottedCd -= dt;
  let nearestM = null, nearestD = Infinity, nearestSeen = Infinity;
  for (const m of monsters.list) {
    if (m.dead) continue;
    const d = Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
    if (d < nearestD) { nearestD = d; nearestM = m; }
    m.seen = isSeen(m, d);
    if (m.seen && d < nearestSeen) nearestSeen = d;
    const sawNow = d < m.detect && !lineBlocked(player.pos.x, player.pos.z, m.pos.x, m.pos.z);
    if (sawNow && !m.sawPlayer && spottedCd <= 0) { audio.spotted(panOf(m)); spottedCd = 0.7; }
    m.sawPlayer = sawNow;
  }

  const { caught } = monsters.update(dt, state.time, player.pos, world.colliders, false);
  world.update(dt, state.time, player.pos);

  // arma (auto a cada pump enquanto segura o gatilho)
  const fire = firingMouse || (touch && touch.firing);
  if (weapon.update(dt, fire, moving)) { audio.shotgun(); doHitscan(); shake = Math.max(shake, 0.7); viewKick = Math.max(viewKick, 0.07); }

  // itens
  const got = world.collect(player.pos);
  if (got) applyPickup(got);

  // dano do lodo radioativo
  if (world.inNukage(player.pos)) {
    nukeTimer -= dt;
    if (nukeTimer <= 0) {
      nukeTimer = 0.4; player.damage(7, true); flashDamage(); audio.hurt();
      if (player.health <= 0) { gameOver(); return; }
    }
  } else nukeTimer = 0;

  // contato com inimigo = dano (não mais morte instantânea)
  if (caught && player.damage(16)) {
    flashDamage(); audio.hurt(); shake = Math.max(shake, 0.9);
    if (player.health <= 0) { gameOver(); return; }
  }

  // áudio ambiente
  audio.setStatic(nearestD === Infinity ? 0 : Math.max(0, 1 - nearestD / 17));
  updateGrain(dt, nearestSeen);
  audio.setHeartbeat(nearestD < 13, nearestD < 7 ? 1.7 : 1.1);
  creepyTimer -= dt;
  if (nearestM && nearestD < 18 && creepyTimer <= 0) {
    audio.creepy(panOf(nearestM));
    creepyTimer = (nearestSeen < SEE_MAX ? 1.2 : 2.6) + Math.random() * 2.5;
  }

  // prompts de porta / saída
  if (!world.doorOpen && world.nearDoor(player.pos)) {
    if (state.hasKey) { world.openDoor(); audio.gateUnlock(); showMsg(''); }
    else showMsg(touchMode ? 'BLUE KEYCARD REQUIRED' : 'NEED BLUE KEYCARD — [E]');
  } else if (world.nearExit(player.pos)) {
    if (touchMode) { finishLevel(); return; }
    showMsg('EXIT — [E]');
  } else showMsg('');

  // feedback de câmera: coice (a tela sobe e volta) + tremor do tiro/dano
  viewKick = Math.max(0, viewKick - dt * 0.55);
  shake = Math.max(0, shake - dt * 3.5);
  if (viewKick > 0.0001 || shake > 0.0001) {
    camera.rotation.x += viewKick + (Math.random() - 0.5) * 0.09 * shake;
    camera.rotation.y += (Math.random() - 0.5) * 0.09 * shake;
    camera.rotation.z += (Math.random() - 0.5) * 0.05 * shake;
  }

  updateHUD();
}

function finishLevel() { showMsg(''); world.pullExit(); audio.gateUnlock(); youWin(); }

function gameOver() {
  if (state.mode !== 'play') return;
  state.mode = 'dead'; if (!touchMode) document.exitPointerLock(); if (touch) touch.hide();
  ui.dead.classList.remove('hidden'); ui.open.classList.remove('show');
  audio.setStatic(0); audio.setHeartbeat(false);
}
function youWin() {
  if (state.mode !== 'play') return;
  state.mode = 'win'; if (!touchMode) document.exitPointerLock(); if (touch) touch.hide();
  ui.win.classList.remove('hidden'); ui.open.classList.remove('show');
  audio.setStatic(0); audio.setHeartbeat(false);
}

// ---------- resize ----------
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  psx.setSize(window.innerWidth, window.innerHeight);
});

loop();
