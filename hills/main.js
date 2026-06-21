// main.js — monta a cena, conecta tudo e roda o loop. Sem HUD, sem combate.
// Abertura (boot homage + menu) via boot.js; controles de toque via touch.js.
// Objetivo: atravessar a cidade enevoada e escapar pelo portão ao norte. Só correr.
import * as THREE from 'three';
import { PSX, applyVertexSnap } from './psx.js';
import { World } from './world.js';
import { Player } from './player.js';
import { MonsterManager } from './entities.js';
import { GameAudio } from './audio.js';
import { runIntro } from './boot.js';
import { TouchControls, isTouchDevice } from './touch.js';

const FOG_NORMAL = 0x0b0e12;
const FOG_OTHER = 0x140404;
const TOUCH_LOOK_X = 17;   // sensibilidade do analógico direito (girar)
const TOUCH_LOOK_Y = 13;
const SEE_MAX = 20;        // distância máx. p/ considerar o monstro "à vista"

const state = { mode: 'title', otherworld: false, time: 0, hasKey: false, alarmStarted: false, escaping: false };

// detecção de campo de visão + grão dinâmico + agendador de sons
const _frustum = new THREE.Frustum();
const _projScreen = new THREE.Matrix4();
const _mpos = new THREE.Vector3();
let grainNow = 0.07;
let creepyTimer = 3;
let aimingGate = false;   // mirando no portão?

// ---------- render / cena ----------
const canvas = document.getElementById('game');
const psx = new PSX(canvas);
const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG_NORMAL);
scene.fog = new THREE.FogExp2(FOG_NORMAL, 0.07);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 200);
scene.add(camera);

const ambient = new THREE.AmbientLight(0x191d24, 0.4); scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x222934, 0x05060a, 0.32); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x36506e, 0.22); moon.position.set(-30, 45, -12); scene.add(moon);

// ---------- mundo / jogador / inimigos / áudio / toque ----------
const world = new World(scene);
const player = new Player(camera, world.spawn);
const monsters = new MonsterManager(scene);
const audio = new GameAudio();
const touchMode = isTouchDevice();
const touch = touchMode ? new TouchControls() : null;

monsters.spawn(new THREE.Vector3(-18, 0, -8));
monsters.spawn(new THREE.Vector3(20, 0, 6));
monsters.spawn(new THREE.Vector3(-6, 0, -28));
monsters.spawn(new THREE.Vector3(10, 0, 16));

// ---------- chave em 3D na inspeção (renderizada pelo MESMO pipeline PSX do jogo) ----------
let keyScene = null, keyCam = null, keyMesh = null;
function rustTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6e4a28'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) { const s = Math.random(); g.fillStyle = `rgba(${120 + s * 90 | 0},${60 + s * 40 | 0},${24 + s * 22 | 0},${0.25 + s * 0.4})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + s * 3, 1 + s * 3); }
  for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(28,14,7,0.55)'; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 4, 0, 7); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function buildInspectKey() {
  const g = new THREE.Group();
  const m = applyVertexSnap(new THREE.MeshLambertMaterial({ map: rustTexture(), color: 0x9a6a3a, emissive: 0x241405, fog: false }));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 10), m); shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.15; g.add(shaft);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.15, 8, 16), m); bow.position.x = -1.15; g.add(bow);
  const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.18), m); bit1.position.set(1.05, -0.32, 0); g.add(bit1);
  const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.18), m); bit2.position.set(1.3, -0.24, 0); g.add(bit2);
  g.rotation.set(0.25, 0.5, 0.08);
  return g;
}
(function setupKeyView() {
  keyScene = new THREE.Scene();
  keyScene.background = new THREE.Color(0x07070a);
  keyCam = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 20);
  keyCam.position.set(0, 0, 4.6);
  keyScene.add(new THREE.AmbientLight(0x484b51, 0.7));
  const l1 = new THREE.PointLight(0xffe2b4, 1.5, 30, 1.0); l1.position.set(3, 4, 5); keyScene.add(l1);
  const l2 = new THREE.PointLight(0x355a78, 0.6, 30, 1.0); l2.position.set(-4, -2, 4); keyScene.add(l2);
  keyMesh = buildInspectKey(); keyScene.add(keyMesh);
})();

// ---------- UI (só telas; nenhum HUD em jogo) ----------
const ui = {
  pause: document.getElementById('pause'),
  dead: document.getElementById('dead'),
  win: document.getElementById('win'),
  damage: document.getElementById('damage'),
  flash: document.getElementById('flash'),
  inspect: document.getElementById('inspect'),
  open: document.getElementById('open'),
};
function flashDamage() { ui.damage.style.opacity = 0.9; setTimeout(() => ui.damage.style.opacity = 0, 120); }

// ---------- input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && state.mode === 'play') player.toggleFlash();
  if (e.code === 'KeyE' && state.mode === 'play') interactGate();
  if (state.mode === 'inspect' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) dismissInspect();
  if (e.code === 'KeyR' && (state.mode === 'dead' || state.mode === 'win')) location.reload();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('mousemove', (e) => {
  if (state.mode === 'play' && document.pointerLockElement) player.look(e.movementX, e.movementY);
});
addEventListener('mousedown', (e) => {
  if (state.mode === 'play' && e.button === 0 && document.pointerLockElement) interactGate();
});

// movimento combinado: teclado + analógico esquerdo (só andar, sem correr)
function gatherInput() {
  let mx = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
  let mz = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
  if (touch) {
    const mv = touch.moveVec;          // y pra cima = -1
    mx += mv.x; mz += -mv.y;
    const lv = touch.lookVec;          // analógico direito = girar a câmera
    if (lv.x || lv.y) player.look(lv.x * TOUCH_LOOK_X, lv.y * TOUCH_LOOK_Y);
    if (touch.consumeFlash()) player.toggleFlash();
  }
  return { mx, mz };
}

// ---------- abertura / início ----------
function startPlay() { state.mode = 'play'; ui.pause.classList.add('hidden'); }
function pauseGame() { state.mode = 'pause'; ui.pause.classList.remove('hidden'); ui.open.classList.remove('show'); audio.setStatic(0); audio.setHeartbeat(false); }

// chamado SÍNCRONO dentro do gesto do botão "start torture"
function beginGame() {
  audio.init();
  if (touchMode) { touch.show(); startPlay(); }
  else { document.body.requestPointerLock(); }   // startPlay vem do pointerlockchange
}
runIntro(beginGame);

// desktop: re-trava o ponteiro ao retomar da pausa
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

// reiniciar tocando na tela de morte/vitória (mobile) ou clicando (desktop)
ui.dead.addEventListener('click', () => { if (state.mode === 'dead') location.reload(); });
ui.win.addEventListener('click', () => { if (state.mode === 'win') location.reload(); });

// ---------- inspeção da chave (pausa + mostra o item, estilo Silent Hill) ----------
function enterInspect() {
  world.takeKey();
  state.mode = 'inspect';
  audio.keyPickup();                  // som de pegar a chave
  audio.setStatic(0); audio.setHeartbeat(false);
  ui.open.classList.remove('show');
  if (touch) touch.hide();
  if (!touchMode && document.pointerLockElement) document.exitPointerLock();
  ui.inspect.classList.remove('hidden');
}
function dismissInspect() {
  if (state.mode !== 'inspect') return;
  ui.inspect.classList.add('hidden');
  state.hasKey = true;
  if (touchMode) { if (touch) touch.show(); state.mode = 'play'; }
  else { document.body.requestPointerLock(); }   // startPlay vem do pointerlockchange
}
ui.inspect.addEventListener('click', dismissInspect);

// ---------- interação com o portão ----------
function interactGate() {
  if (state.mode !== 'play' || state.escaping || !aimingGate) return;
  if (state.hasKey) openGate();             // com a chave: destranca e abre
  else audio.gateLocked();                  // sem a chave: chacoalha trancado
}
ui.open.addEventListener('click', interactGate);
ui.open.addEventListener('touchend', (e) => { e.preventDefault(); interactGate(); }, { passive: false });

// ---------- alarme: ao QUASE chegar no portão com a chave -> sirene + horda ----------
function startAlarm() {
  if (state.alarmStarted) return;
  state.alarmStarted = true;
  state.otherworld = true;
  audio.siren();                       // sirene realista (urgência de fugir já dali)
  world.setOtherworld();
  psx.setTint(1.0, 0.7, 0.64);
  monsters.spawnRing(12, player.pos, 16);   // lota de bichos ao redor
  ui.flash.style.transition = 'none'; ui.flash.style.opacity = 0.9;
  setTimeout(() => { ui.flash.style.transition = 'opacity 1.4s'; ui.flash.style.opacity = 0; }, 60);
}

// abrir o portão com a chave (som realista de destrancar + abrir)
function openGate() {
  if (state.escaping) return;
  if (!state.alarmStarted) startAlarm();
  state.escaping = true;
  audio.gateUnlock();
  world.unlockGate();
  ui.open.classList.remove('show');
}

let fogLerp = 0;
function updateFog(dt) {
  const target = state.otherworld ? 1 : 0;
  fogLerp += (target - fogLerp) * Math.min(1, dt * 0.4);
  const c = new THREE.Color(FOG_NORMAL).lerp(new THREE.Color(FOG_OTHER), fogLerp);
  scene.fog.color.copy(c); scene.background.copy(c);
  scene.fog.density = 0.07 + fogLerp * 0.022;
  ambient.color.copy(new THREE.Color(0x191d24).lerp(new THREE.Color(0x2a1010), fogLerp));
  moon.color.copy(new THREE.Color(0x36506e).lerp(new THREE.Color(0x6a2218), fogLerp));
}

// ---------- visão / áudio espacial ----------
// monstro "à vista" = dentro do frustum, perto o bastante e sem prédio na frente
function isSeen(m, d) {
  if (d > SEE_MAX) return false;
  _mpos.set(m.pos.x, 1.2, m.pos.z);
  if (!_frustum.containsPoint(_mpos)) return false;
  return !lineBlocked(player.pos.x, player.pos.z, m.pos.x, m.pos.z);
}

// segmento A->B cruza algum colisor (AABB no plano x,z)? (slab test 2D)
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

// está mirando no portão? (gate à frente e perto)
function isAimingGate() {
  if (state.escaping) return false;
  const dx = world.gatePos.x - player.pos.x, dz = world.gatePos.z - player.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 7.5 || dist < 0.001) return false;
  const f = player.forward();
  return ((dx / dist) * f.x + (dz / dist) * f.z) > 0.92;
}

// pan estéreo [-1,1] do monstro relativo à direção do olhar
function panOf(m) {
  const dx = m.pos.x - player.pos.x, dz = m.pos.z - player.pos.z;
  const len = Math.hypot(dx, dz) || 1;
  const rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  return Math.max(-1, Math.min(1, (dx / len) * rx + (dz / len) * rz));
}

// chuvisco na tela cresce quando um monstro está à vista (mais perto = mais grão)
function updateGrain(dt, nearestSeen) {
  const base = state.otherworld ? 0.11 : 0.07;
  let target = base;
  if (nearestSeen < SEE_MAX) target += (1 - nearestSeen / SEE_MAX) * 0.32;
  grainNow += (target - grainNow) * Math.min(1, dt * 5);
  psx.setGrain(grainNow);
}

// ---------- loop ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  state.time += dt;

  if (state.mode === 'play') {
    player.update(dt, gatherInput(), world.colliders, () => audio.footstep());

    // frustum da câmera p/ saber quais monstros estão à vista
    camera.updateMatrixWorld();
    _projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse.copy(camera.matrixWorld).invert());
    _frustum.setFromProjectionMatrix(_projScreen);

    let nearestM = null, nearestD = Infinity, nearestSeen = Infinity;
    for (const m of monsters.list) {
      const d = Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z);
      if (d < nearestD) { nearestD = d; nearestM = m; }
      m.seen = isSeen(m, d);                 // monstro lido no update -> fica mais rápido à vista
      if (m.seen && d < nearestSeen) nearestSeen = d;
    }

    const { caught } = monsters.update(dt, state.time, player.pos, world.colliders, state.otherworld);
    world.update(dt, state.time, player.pos);

    audio.setStatic(nearestD === Infinity ? 0 : Math.max(0, 1 - nearestD / 17));   // estática do rádio
    updateGrain(dt, nearestSeen);                                                  // chuvisco na tela
    audio.setHeartbeat(nearestD < 13, nearestD < 7 ? 1.7 : 1.1);

    // sons sinistros do monstro mais próximo (mais frequentes quando à vista)
    creepyTimer -= dt;
    if (nearestM && nearestD < 18 && creepyTimer <= 0) {
      audio.creepy(panOf(nearestM));
      creepyTimer = (nearestSeen < SEE_MAX ? 1.2 : 2.6) + Math.random() * 2.5;
    }

    // objetivo: achar a chave no chão -> abre a inspeção (pausa o jogo)
    if (!state.hasKey && world.atKey(player.pos)) enterInspect();

    if (state.mode === 'play') {
      // quase chegando no portão com a chave -> a sirene já começa (urgência)
      if (state.hasKey && !state.alarmStarted && world.nearGate(player.pos, 14)) startAlarm();
      // mirar no portão mostra "Open" (abrir é via interactGate)
      aimingGate = isAimingGate();
      ui.open.classList.toggle('show', aimingGate);

      if (caught) { flashDamage(); audio.hurt(); gameOver(); }   // contato = morte na hora
      else if (state.escaping && world.atGate(player.pos)) youWin();
    }
  }

  updateFog(dt);
  if (state.mode === 'inspect' && keyMesh) {
    keyMesh.rotation.y += dt * 0.8;                 // gira o item enquanto inspeciona
    psx.render(keyScene, keyCam, state.time);       // mesma pipeline PSX (dither/jitter/grão)
  } else {
    psx.render(scene, camera, state.time);
  }
}

function gameOver() { state.mode = 'dead'; if (!touchMode) document.exitPointerLock(); if (touch) touch.hide(); ui.dead.classList.remove('hidden'); audio.setStatic(0); audio.setHeartbeat(false); }
function youWin() { state.mode = 'win'; if (!touchMode) document.exitPointerLock(); if (touch) touch.hide(); ui.win.classList.remove('hidden'); audio.setStatic(0); audio.setHeartbeat(false); }

// ---------- resize ----------
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (keyCam) { keyCam.aspect = camera.aspect; keyCam.updateProjectionMatrix(); }
  psx.setSize(window.innerWidth, window.innerHeight);
});

loop();
