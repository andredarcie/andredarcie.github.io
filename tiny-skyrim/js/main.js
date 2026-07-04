// Bootstrap, input, game states and the main loop.

import * as THREE from 'three';
import { AudioSys } from 'audio';
import { World } from 'world';
import { Projectiles } from 'projectiles';
import { Player } from 'player';
import { Enemies } from 'enemies';
import { Quests } from 'quests';
import { Hud } from 'hud';
import { TouchControls } from 'touch';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);
scene.add(camera);

const game = {
  scene, camera, renderer,
  state: 'title',
  paused: false,
  timePlayed: 0,
  kills: 0,
  input: {
    keys: new Set(),
    attack: false, fire: false, jump: false, shout: false, interact: false,
    touchMove: { x: 0, y: 0 },
    touchSprint: false,
  },
  onPlayerDeath,
  onVictory,
};

game.audio = new AudioSys();
game.hud = new Hud(game);
game.world = new World(game);
game.projectiles = new Projectiles(game);
game.player = new Player(game);
game.enemies = new Enemies(game);
game.quests = new Quests(game);
game.touch = new TouchControls(game);

function clearEdges() {
  const i = game.input;
  i.attack = i.fire = i.jump = i.shout = i.interact = false;
}

function lockPointer() {
  if (game.touch.enabled) return;
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* pointer lock unavailable */ }
}

function startGame() {
  if (game.state !== 'title') return;
  game.state = 'playing';
  document.getElementById('title').style.display = 'none';
  game.audio.init();
  game.audio.startMusic();
  game.quests.start();
  lockPointer();
}

function onPlayerDeath() {
  game.state = 'dead';
  clearEdges();
  game.audio.death();
  game.hud.showDeath();
  if (document.exitPointerLock) document.exitPointerLock();
}

function respawn() {
  game.player.respawn();
  game.enemies.onPlayerRespawn();
  game.hud.hideDeath();
  clearEdges();
  game.state = 'playing';
  lockPointer();
}

function onVictory() {
  game.state = 'victory';
  clearEdges();
  game.audio.victory();
  game.hud.showVictory({
    time: game.timePlayed,
    level: game.player.level,
    gold: game.player.gold,
    kills: game.kills,
  });
  if (document.exitPointerLock) document.exitPointerLock();
}

function continueExploring() {
  game.hud.hideVictory();
  clearEdges();
  game.state = 'playing';
  lockPointer();
}

// ---- input ----

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) game.audio.toggleMute();
  game.input.keys.add(e.code);
  if (game.state !== 'playing' || game.paused || e.repeat) return;
  if (e.code === 'Space') { game.input.jump = true; e.preventDefault(); }
  if (e.code === 'KeyE') game.input.interact = true;
  if (e.code === 'KeyQ') game.input.shout = true;
  if (e.code === 'KeyF') game.input.fire = true;
});
document.addEventListener('keyup', (e) => game.input.keys.delete(e.code));

document.addEventListener('mousedown', (e) => {
  if (game.state !== 'playing' || game.paused) return;
  if (document.pointerLockElement !== renderer.domElement) return;
  if (e.button === 0) game.input.attack = true;
  if (e.button === 2) game.input.fire = true;
});

document.addEventListener('contextmenu', (e) => {
  if (game.state !== 'title') e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement && game.state === 'playing' && !game.paused) {
    game.player.addLook(e.movementX, e.movementY);
  }
});

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && game.state === 'playing' && !game.touch.enabled) {
    game.paused = true;
    game.hud.showPause(true);
  }
  if (locked && game.paused) {
    game.paused = false;
    game.hud.showPause(false);
  }
});

document.getElementById('title').addEventListener('click', startGame);
document.getElementById('paused').addEventListener('click', lockPointer);
document.getElementById('death').addEventListener('click', respawn);
document.getElementById('vicBtn').addEventListener('click', continueExploring);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- loop ----

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (game.state === 'playing' && !game.paused) {
    game.timePlayed += dt;
    game.world.update(dt, game.player.pos);
    game.player.update(dt);
    game.enemies.update(dt);
    game.projectiles.update(dt);
    game.quests.update(dt);
    game.touch.update();
    game.hud.update(dt);
  } else if (game.state === 'title' || game.state === 'dead' || game.state === 'victory') {
    game.world.update(dt, game.player.pos);
  }
  renderer.render(scene, camera);
});
