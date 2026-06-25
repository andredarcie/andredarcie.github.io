// main.js — DOOM HILLS: monta a cena, conecta tudo e roda o loop de combate.
// Estética Silent Hill PSX (névoa, grão, CRT) + gameplay Doom (espingarda, hordas,
// munição). Objetivo: EXTERMÍNIO — limpar a horda gera uma nova arena procedural
// (fases infinitas, cada vez mais difíceis). Abertura via boot.js, toque via touch.js.
import * as THREE from 'three';
import { PSX } from './psx.js';
import { World } from './world.js';
import { Player } from './player.js';
import { MonsterManager, clearGore } from './entities.js';
import { GameAudio } from './audio.js';
import { runIntro } from './boot.js';
import { TouchControls, isTouchDevice } from './touch.js';
import { startCRT } from './crt.js';
import { Shotgun } from './weapon.js';

const FOG = 0x0a0d10;
const TOUCH_LOOK_X = 17;
const TOUCH_LOOK_Y = 13;
const SEE_MAX = 20;

const state = { mode: 'title', time: 0, level: 1 };

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
let timeScale = 1;    // 1 normal; <1 durante o clímax (câmera lenta)
let climax = 0;       // tempo REAL restante do clímax de fim de fase
let rage = 0;         // tempo restante do berserk (RAGE)
let score = 0;        // pontuação da run atual (abates encadeados + bônus de fase)
let kills = 0;        // total de abates na run
let deadReady = false; // tela de morte aceita interação? (respiro p/ ler o score)

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
let world = new World(scene, state.level);
const player = new Player(camera, world.spawn);
player.yaw = 0;                       // olhando pro norte (-z), pro fundo da fase
const monsters = new MonsterManager(scene);
const weapon = new Shotgun(camera);
const audio = new GameAudio();
const touchMode = isTouchDevice();
const touch = touchMode ? new TouchControls() : null;

spawnWave();

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
  level: document.getElementById('level'),
  left: document.getElementById('left'),
  combo: document.getElementById('combo'),
  comboRank: document.getElementById('comboRank'),
  comboNum: document.getElementById('comboNum'),
  comboBar: document.querySelector('#comboBar > i'),
  rage: document.getElementById('rage'),
  scScore: document.getElementById('sc-score'),
  scKills: document.getElementById('sc-kills'),
  scLevel: document.getElementById('sc-level'),
  scBest: document.getElementById('sc-best'),
  scNew: document.getElementById('sc-new'),
  deadHint: document.getElementById('dead-hint'),
};
function flashDamage() { ui.damage.style.opacity = 0.9; setTimeout(() => ui.damage.style.opacity = 0, 120); }
let bannerT = 0;
function banner(txt) { ui.open.textContent = txt; ui.open.classList.add('show'); bannerT = 2.2; }
function updateHUD() {
  ui.hp.textContent = player.health;
  ui.hp.style.color = player.health <= 25 ? '#ff3030' : '#d8d2c6';
  ui.armor.textContent = player.armor;
  ui.ammo.textContent = weapon.ammo;
  ui.ammo.style.color = weapon.ammo <= 0 ? '#ff3030' : '#d8d2c6';
  ui.level.textContent = state.level;
  ui.left.textContent = monsters.aliveCount;
}

// ---------- bússola estilo Call of Duty: fita de cardeais que rola + blips dos inimigos ----------
const compass = document.getElementById('compass');
const cctx = compass.getContext('2d');
function drawCompass() {
  const W = 300, H = 26, cx = W / 2, halfW = W / 2 - 20;
  cctx.setTransform(2, 0, 0, 2, 0, 0);                 // canvas 600x52 -> desenha em 300x26
  cctx.clearRect(0, 0, W, H);
  cctx.lineWidth = 1; cctx.textAlign = 'center';

  // linha base
  cctx.globalAlpha = 0.22; cctx.strokeStyle = '#cfcabf';
  cctx.beginPath(); cctx.moveTo(18, H - 3); cctx.lineTo(W - 18, H - 3); cctx.stroke();

  const yaw = player.yaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);      // frente
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);       // direita
  let Hdeg = Math.atan2(fx, -fz) * 180 / Math.PI; if (Hdeg < 0) Hdeg += 360;

  // fita de graus + letras cardeais (N/E/S/W), com fade nas bordas
  const start = Math.ceil((Hdeg - 90) / 15) * 15;
  for (let m = start; m <= Hdeg + 90; m += 15) {
    const off = m - Hdeg;                              // -90..90
    const x = cx + (off / 90) * halfW;
    const md = ((m % 360) + 360) % 360;
    const fade = 1 - Math.min(1, Math.abs(off) / 96) * 0.72;
    const card = md % 90 === 0, inter = md % 45 === 0;
    cctx.globalAlpha = 0.5 * fade; cctx.strokeStyle = '#cfcabf';
    const th = card ? 9 : (inter ? 6 : 4);
    cctx.beginPath(); cctx.moveTo(x, H - 3); cctx.lineTo(x, H - 3 - th); cctx.stroke();
    if (card) {
      cctx.globalAlpha = 0.92 * fade; cctx.fillStyle = '#e8e2d4';
      cctx.font = 'bold 9px "Courier New", monospace';
      cctx.fillText('NESW'[md / 90], x, 9);
    }
  }

  // marcador central (sua frente)
  cctx.globalAlpha = 0.95; cctx.fillStyle = '#e8e2d4';
  cctx.beginPath(); cctx.moveTo(cx - 4, 0); cctx.lineTo(cx + 4, 0); cctx.lineTo(cx, 5); cctx.closePath(); cctx.fill();

  // blips dos inimigos: à frente = losango (tamanho/brilho pela distância), atrás = seta na borda
  for (const mob of monsters.list) {
    if (mob.dead) continue;
    const dx = mob.pos.x - player.pos.x, dz = mob.pos.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    const fd = dx * fx + dz * fz, rd = dx * rx + dz * rz;
    const bearing = Math.atan2(rd, fd) * 180 / Math.PI;
    const behind = Math.abs(bearing) > 90;
    const x = cx + Math.max(-1, Math.min(1, bearing / 90)) * halfW;
    const prox = Math.max(0, 1 - dist / 55);
    const y = H - 9;
    cctx.fillStyle = mob.sawPlayer ? '#ff3a28' : '#d23a2a';   // quem te enxerga pisca mais vivo
    if (behind) {
      cctx.globalAlpha = 0.5;
      const d = bearing > 0 ? 1 : -1;
      cctx.beginPath(); cctx.moveTo(x + d * 4, y); cctx.lineTo(x - d * 2, y - 3.2); cctx.lineTo(x - d * 2, y + 3.2); cctx.closePath(); cctx.fill();
    } else {
      cctx.globalAlpha = 0.55 + prox * 0.45;
      const r = 2.6 + prox * 2.2;
      cctx.beginPath(); cctx.moveTo(x, y - r); cctx.lineTo(x + r, y); cctx.lineTo(x, y + r); cctx.lineTo(x - r, y); cctx.closePath(); cctx.fill();
    }
  }
  cctx.globalAlpha = 1;
}

// ---------- combo / kill streak (estilo ultrakill): abates encadeados sobem de tier ----------
const COMBO_WINDOW = 3.0;
const COMBO_TIERS = [
  { min: 2, name: 'DOUBLE KILL', tier: 1, color: '#e8e2d4' },
  { min: 3, name: 'TRIPLE KILL', tier: 2, color: '#ffe08a' },
  { min: 4, name: 'MULTI KILL', tier: 3, color: '#ffc04a' },
  { min: 6, name: 'MEGA KILL', tier: 4, color: '#ff8c2a' },
  { min: 8, name: 'ULTRA KILL', tier: 5, color: '#ff5a1e' },
  { min: 11, name: 'MONSTER KILL', tier: 6, color: '#ff2e1e' },
  { min: 15, name: 'SAVAGE', tier: 7, color: '#ff113a' },
  { min: 22, name: 'APOCALYPSE', tier: 8, color: '#ff0044' },
];
let combo = 0, comboTimer = 0, comboPunch = 0;
function comboRank(n) { let r = COMBO_TIERS[0]; for (const t of COMBO_TIERS) if (n >= t.min) r = t; return r; }
function onKill() {
  combo++;
  comboTimer = COMBO_WINDOW;
  kills++;
  score += 100 * combo;                                          // encadear vale MUITO mais
  shake = Math.max(shake, 0.32 + Math.min(0.5, combo * 0.03));   // tremor brutal a cada abate
  if (combo >= 2) {
    const rk = comboRank(combo);
    ui.comboRank.textContent = rk.name;
    ui.comboNum.textContent = 'x' + combo;
    ui.combo.style.color = rk.color;
    ui.combo.style.opacity = '1';
    comboPunch = 1;
    audio.combo(rk.tier);
  }
}
function updateCombo(dt) {
  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) { combo = 0; ui.combo.style.opacity = '0'; }
  }
  comboPunch = Math.max(0, comboPunch - dt * 3.2);
  if (combo >= 2) {
    ui.comboBar.style.width = Math.max(0, comboTimer / COMBO_WINDOW * 100) + '%';
    ui.combo.style.transform = `scale(${(1 + comboPunch * 0.4).toFixed(3)})`;
    ui.combo.style.opacity = comboTimer < 0.5 ? (comboTimer / 0.5).toFixed(2) : '1';
  }
}

// ---------- clímax de fim de fase: slow-mo + zoom no abate que limpa a arena ----------
const CLIMAX_DUR = 1.15, CLIMAX_SLOW = 0.18, CLIMAX_FOV = 56, BASE_FOV = 78;
function startClimax() {
  climax = CLIMAX_DUR;
  shake = Math.max(shake, 0.7);
  ui.flash.style.opacity = '0.28';                 // pulso branco curtinho
  setTimeout(() => { ui.flash.style.opacity = '0'; }, 70);
  audio.setStatic(0); audio.setHeartbeat(false);   // silencia o dread pra saborear a vitória
}
function updateClimax(realDt) {
  const k = Math.min(1, realDt * 11);
  timeScale += (CLIMAX_SLOW - timeScale) * k;       // afunda no slow-mo
  camera.fov += (CLIMAX_FOV - camera.fov) * k;      // dolly-zoom pra dentro
  camera.updateProjectionMatrix();
}
function endClimax() {
  climax = 0; timeScale = 1;
  camera.fov = BASE_FOV; camera.updateProjectionMatrix();
}

// ---------- berserk / RAGE: dano multiplicado + bombeia mais rápido por alguns segundos ----------
const RAGE_DUR = 9, RAGE_DMG = 2.6, RAGE_FIRE = 0.3;
function startRage() {
  rage = RAGE_DUR;
  player.heal(25);                                  // recompensa por cruzar a arena
  weapon.fireRate = RAGE_FIRE;
  document.body.classList.add('raging');
  audio.keyPickup();
  shake = Math.max(shake, 0.5);
}
function endRage() {
  rage = 0;
  weapon.fireRate = 0.55;                            // volta ao pump normal
  document.body.classList.remove('raging');
}

// ---------- input ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF' && state.mode === 'play') player.toggleFlash();
  if (state.mode === 'dead') tryLeaveDeath();          // qualquer tecla volta pra tela inicial
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
function startPlay() { state.mode = 'play'; ui.pause.classList.add('hidden'); document.body.classList.add('playing'); }
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

ui.dead.addEventListener('pointerdown', tryLeaveDeath);   // celular + PC: toque/clique/caneta
function restartToTitle() {
  try { sessionStorage.setItem('hills-skip-intro', '1'); } catch (e) { /* ignora */ }
  location.reload();
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
    const dmg = Math.round((40 + 50 * center) * falloff * (rage > 0 ? RAGE_DMG : 1));   // RAGE multiplica
    const killed = m.hurt(dmg, ndx, ndz);
    if (killed) { audio.enemyDie(panOf(m)); onKill(); } else audio.enemyHit(panOf(m));
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
  else if (got.type === 'berserk') { startRage(); }
}

// ---------- ondas / progressão (extermínio: limpar a horda abre a próxima fase) ----------
function spawnWave() {
  const lvl = state.level;
  monsters.setTuning({
    health: 45 + lvl * 7,
    speed: 2.0 + Math.min(1.4, lvl * 0.08),
    detect: 18 + Math.min(12, lvl),
  });
  const count = Math.min(46, 16 + (lvl - 1) * 3);   // horda densa já no level 1
  for (const p of world.enemySpawns(count, player.pos)) monsters.spawn(p);
}

function nextLevel() {
  score += 500 * state.level;               // bônus por ter limpado a fase atual
  state.level++;
  world.dispose();
  clearGore(scene);
  world = new World(scene, state.level);
  monsters.clear();
  player.pos.copy(world.spawn);
  weapon.addAmmo(8);                       // pequeno reforço ao limpar a fase
  spawnWave();
  banner('LEVEL ' + state.level);
  audio.gateUnlock();                      // sting de "fase concluída"
}

// ---------- loop ----------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const realDt = Math.min(0.05, clock.getDelta());
  const dt = realDt * timeScale;                 // câmera lenta no clímax
  state.time += dt;
  if (state.mode === 'play') updatePlay(dt, realDt);
  else { weapon.update(dt, false, false); world.update(dt, state.time, player.pos); }
  psx.render(scene, camera, state.time);
}

function updatePlay(dt, realDt) {
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

  // CLÍMAX: o abate que limpa a arena merece um flourish — slow-mo + zoom curtos (a última
  // morte e as vísceras tombam em câmera lenta) ANTES de gerar a próxima fase.
  if (monsters.aliveCount === 0) {
    if (climax <= 0) startClimax();
    climax -= realDt;                                  // o clímax dura em tempo REAL
    updateClimax(realDt);                              // ease do slow-mo + zoom
    world.update(dt, state.time, player.pos);          // ambiente + gore seguem (lentos)
    if (weapon.update(dt, firingMouse || (touch && touch.firing), moving)) { audio.shotgun(); doHitscan(); }
    viewKick = Math.max(0, viewKick - realDt * 0.55);
    shake = Math.max(0, shake - realDt * 3.5);
    if (viewKick > 0.0001 || shake > 0.0001) {
      camera.rotation.x += viewKick + (Math.random() - 0.5) * 0.09 * shake;
      camera.rotation.y += (Math.random() - 0.5) * 0.09 * shake;
      camera.rotation.z += (Math.random() - 0.5) * 0.05 * shake;
    }
    drawCompass(); updateHUD();
    if (climax <= 0) { endClimax(); nextLevel(); }
    return;
  }
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

  // banner de transição de fase (LEVEL N) some sozinho
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) ui.open.classList.remove('show'); }

  // feedback de câmera: coice (a tela sobe e volta) + tremor do tiro/dano
  viewKick = Math.max(0, viewKick - dt * 0.55);
  shake = Math.max(0, shake - dt * 3.5);
  if (viewKick > 0.0001 || shake > 0.0001) {
    camera.rotation.x += viewKick + (Math.random() - 0.5) * 0.09 * shake;
    camera.rotation.y += (Math.random() - 0.5) * 0.09 * shake;
    camera.rotation.z += (Math.random() - 0.5) * 0.05 * shake;
  }

  if (rage > 0) {
    rage -= dt;
    ui.rage.style.setProperty('--rage', Math.max(0, rage / RAGE_DUR).toFixed(3));
    if (rage <= 0) endRage();
  }

  updateCombo(dt);
  drawCompass();
  updateHUD();
}

function gameOver() {
  if (state.mode !== 'play') return;
  state.mode = 'dead'; if (!touchMode) document.exitPointerLock(); if (touch) touch.hide();
  ui.open.classList.remove('show');
  ui.combo.style.opacity = '0'; combo = 0;
  endRage(); endClimax();                  // limpa buffs/efeitos ao morrer
  audio.setStatic(0); audio.setHeartbeat(false);

  // --- tela final de score ---
  const best = loadBest();
  const isNewBest = score > best;
  if (isNewBest) saveBest(score);
  ui.scScore.textContent = score.toLocaleString('en-US');
  ui.scKills.textContent = kills;
  ui.scLevel.textContent = state.level;
  ui.scBest.textContent = Math.max(best, score).toLocaleString('en-US');
  ui.scNew.classList.toggle('hidden', !isNewBest);

  ui.dead.classList.remove('hidden');
  // exige interação, mas só DEPOIS de um respiro (pra não pular sem ver a pontuação)
  deadReady = false;
  ui.deadHint.style.opacity = '0';
  setTimeout(() => { deadReady = true; ui.deadHint.style.opacity = '1'; }, 900);
}

// recorde persiste entre runs (a run zera ao recarregar a página)
function loadBest() { try { return parseInt(localStorage.getItem('hills-best') || '0', 10) || 0; } catch (e) { return 0; } }
function saveBest(v) { try { localStorage.setItem('hills-best', String(v)); } catch (e) { /* indisponível */ } }

// sair da tela de morte -> volta pra tela inicial (qualquer tecla / toque / clique)
function tryLeaveDeath() { if (state.mode === 'dead' && deadReady) restartToTitle(); }

// ---------- resize ----------
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  psx.setSize(window.innerWidth, window.innerHeight);
});

loop();
