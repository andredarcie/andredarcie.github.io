// Tiny Zelda — main engine: states, rooms, combat, HUD
'use strict';

const HUD_H = 64, ROOM_W = 256, ROOM_H = 176;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------------- input ----------------
const input = { up: 0, down: 0, left: 0, right: 0, a: 0, b: 0, start: 0, sel: 0 };
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Space: 'a', KeyX: 'b', Enter: 'start', KeyC: 'sel',
};
window.addEventListener('keydown', e => {
  if (e.code === 'KeyM') { Audio2.ensure(); Audio2.toggleMute(); return; }
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (!e.repeat) input[k] = 1;
  if (k === 'up' || k === 'down' || k === 'left' || k === 'right') input[k] = 1;
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) input[k] = 0; });

// ---------------- game state ----------------
const G = {
  state: 'title',
  t: 0,
  env: 'overworld',        // 'overworld' | 'dungeon'
  screen: { x: START_SCREEN.x, y: START_SCREEN.y },
  dungeon: null,           // {id, room:'x,y'}
  player: null,
  enemies: [], projectiles: [], bombsLive: [], explosions: [], pickups: [], poofs: [], floorItems: [],
  boss: null, npc: null, zelda: null,
  baseCanvas: null,
  // persistence
  secrets: new Set(),      // opened bombable caves 'x,y'
  unlockedDoors: new Set(),// 'id:room:dir'
  takenItems: new Set(),   // major items taken 'id:room' or 'cave:x,y'
  killedBosses: new Set(), // 'id'
  msg: null, msgT: 0,
  scroll: null, cave: null, itemGet: null, dialog: null,
  gameoverT: 0, winT: 0, paused: false,
  // respawn point on continue: last dungeon entrance touched, else world start
  checkpoint: { screen: { x: START_SCREEN.x, y: START_SCREEN.y }, x: START_POS.x, y: START_POS.y },
};

function curMeta() { return OVERWORLD[G.screen.x + ',' + G.screen.y]; }
function curRoomDef() { return DUNGEONS[G.dungeon.id].rooms[G.dungeon.room]; }
function roomKey() { return G.dungeon.id + ':' + G.dungeon.room; }

function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx > 15 || ty > 10) return '#';
  if (G.env === 'overworld') {
    let ch = curMeta().map[ty][tx];
    if (ch === 'X' && G.secrets.has(G.screen.x + ',' + G.screen.y)) ch = 'C';
    return ch;
  }
  return RTPL[curRoomDef().tpl][ty][tx];
}

// door helpers -------------------------------------------------
const DOOR_TILES = { N: [[7, 0], [8, 0]], S: [[7, 10], [8, 10]], W: [[0, 4], [0, 5]], E: [[15, 4], [15, 5]] };
const DIR_DELTA = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };

function doorState(dir) {
  const d = curRoomDef().doors || {};
  let st = d[dir] || 'wall';
  if (st === 'lock' && G.unlockedDoors.has(G.dungeon.id + ':' + G.dungeon.room + ':' + dir)) st = 'open';
  if (st === 'shut' && G.enemies.length === 0 && !G.boss) st = 'open';
  return st;
}
function doorPassable(dir) { const s = doorState(dir); return s === 'open' || s === 'exit'; }

G.isSolid = function (tx, ty) {
  if (G.state === 'cave' || G.cave) return false; // caves are open black rooms
  const ch = tileAt(tx, ty);
  if (G.env === 'dungeon') {
    for (const dir in DOOR_TILES)
      for (const [dx, dy] of DOOR_TILES[dir])
        if (dx === tx && dy === ty) return !doorPassable(dir);
    return ch === '#' || ch === 'b' || ch === 'w';
  }
  return '#TWCDX'.includes(ch);
};

// projectiles fly over water/bridges, only tall obstacles stop them
G.shotSolid = function (px, py) {
  if (px < 0 || py < 0 || px >= 256 || py >= 176) return true;
  const ch = tileAt(Math.floor(px / 16), Math.floor(py / 16));
  return G.env === 'dungeon' ? (ch === '#' || ch === 'b') : '#TCDX'.includes(ch);
};

// ---------------- room rendering ----------------
function renderBase() {
  const cv = document.createElement('canvas');
  cv.width = ROOM_W; cv.height = ROOM_H;
  const c = cv.getContext('2d');
  const env = G.env;
  G.hasWater = false;
  for (let ty = 0; ty < 11; ty++)
    for (let tx = 0; tx < 16; tx++) {
      const ch = tileAt(tx, ty);
      if (ch === 'W' || ch === 'w') G.hasWater = true;
      drawTile(c, ch, tx * 16, ty * 16, G.t, env);
    }
  if (env === 'dungeon') drawDoors(c);
  G.baseCanvas = cv;
}

function drawDoors(c) {
  for (const dir in DOOR_TILES) {
    const st = doorState(dir);
    if (st === 'wall') continue;
    const [[x1, y1], [x2, y2]] = DOOR_TILES[dir];
    const px = x1 * 16, py = y1 * 16;
    const w = (x2 - x1 + 1) * 16, h = (y2 - y1 + 1) * 16;
    if (st === 'open' || st === 'exit') {
      c.fillStyle = '#000'; c.fillRect(px, py, w, h);
      c.fillStyle = '#FCD8A8';
      if (dir === 'N') c.fillRect(px + 4, py, w - 8, h);
      if (dir === 'S') c.fillRect(px + 4, py, w - 8, h);
      if (dir === 'W' || dir === 'E') c.fillRect(px, py + 4, w, h - 8);
    } else if (st === 'lock') {
      c.fillStyle = '#000'; c.fillRect(px, py, w, h);
      c.fillStyle = '#FCB040';
      c.fillRect(px + w / 2 - 5, py + h / 2 - 5, 10, 10);
      c.fillStyle = '#503000';
      c.fillRect(px + w / 2 - 2, py + h / 2 - 2, 4, 6);
    } else if (st === 'shut') {
      c.fillStyle = '#000'; c.fillRect(px, py, w, h);
      c.fillStyle = '#787878'; c.fillRect(px + 2, py + 2, w - 4, h - 4);
    }
  }
}

// ---------------- room loading ----------------
function spawnEnemies(list) {
  G.enemies = [];
  for (const type of list || []) {
    for (let tries = 0; tries < 40; tries++) {
      const tx = 1 + Math.floor(Math.random() * 14), ty = 1 + Math.floor(Math.random() * 9);
      if (G.isSolid(tx, ty)) continue;
      const px = tx * 16 + 1, py = ty * 16 + 1;
      const pc = G.player.center();
      if (Math.hypot(px - pc.x, py - pc.y) < 56) continue;
      G.enemies.push(new Enemy(type, px, py));
      break;
    }
  }
}

// nearest non-solid spot so drops never land inside a block/water pool
function openSpotNear(px, py) {
  const ctx0 = Math.floor(px / 16), cty0 = Math.floor(py / 16);
  for (let r = 0; r < 8; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = ctx0 + dx, ty = cty0 + dy;
        if (tx < 1 || ty < 1 || tx > 14 || ty > 9) continue;
        if (!G.isSolid(tx, ty)) return { x: tx * 16 + 4, y: ty * 16 + 4 };
      }
  return { x: px, y: py };
}

function clearVolatiles() {
  G.projectiles = []; G.bombsLive = []; G.explosions = []; G.pickups = [];
  G.poofs = []; G.floorItems = []; G.boss = null; G.npc = null; G.zelda = null;
}

function loadOverworldScreen() {
  clearVolatiles();
  G.clearProcessed = false;
  renderBase();
  spawnEnemies(curMeta().enemies);
}

function loadDungeonRoom() {
  clearVolatiles();
  G.clearProcessed = false;
  const def = curRoomDef(), rk = roomKey();
  if (def.boss && !G.killedBosses.has(rk)) {
    G.boss = new Boss(def.boss);
  } else if (!def.boss) {
    spawnEnemies(def.enemies);
  }
  // persistent items if boss already dead but untaken
  if (def.boss && G.killedBosses.has(rk)) {
    if (def.item && !G.takenItems.has(rk + ':item'))
      G.floorItems.push({ kind: def.item, x: 120, y: 80, pkey: rk + ':item' });
    if (def.boss !== 'ganon' && !G.takenItems.has(rk + ':hc'))
      G.floorItems.push({ kind: 'heartContainer', x: 150, y: 80, pkey: rk + ':hc' });
    if (def.boss === 'ganon') G.zelda = { x: 120, y: 40 };
  }
  if (!def.boss && def.item && !G.takenItems.has(rk + ':item') && (def.enemies || []).length === 0)
    G.floorItems.push({ kind: def.item, x: 120, y: 80, pkey: rk + ':item' });
  if (def.npc) {
    G.npc = { sprite: def.npc, x: 120, y: 48, text: def.text, gift: def.gift };
    if (def.gift && !G.takenItems.has(rk + ':item'))
      G.floorItems.push({ kind: def.gift, x: 124, y: 96, pkey: rk + ':item' });
  }
  renderBase();
}

// ---------------- transitions ----------------
function startScroll(dir, after) {
  const oldBase = G.baseCanvas;
  after();               // switches screen/room + renders new base
  G.scroll = { dir, t: 0, dur: 26, oldBase, newBase: G.baseCanvas };
  G.state = 'scroll';
}

function moveOverworld(dx, dy) {
  const nx = G.screen.x + dx, ny = G.screen.y + dy;
  if (!OVERWORLD[nx + ',' + ny]) { // clamp at world edge
    G.player.x = Math.max(0, Math.min(ROOM_W - G.player.w, G.player.x));
    G.player.y = Math.max(0, Math.min(ROOM_H - G.player.h, G.player.y));
    return;
  }
  const p = G.player;
  startScroll(dx ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N'), () => {
    G.screen = { x: nx, y: ny };
    loadOverworldScreen();
    if (dx > 0) p.x = 1; if (dx < 0) p.x = ROOM_W - p.w - 1;
    if (dy > 0) p.y = 1; if (dy < 0) p.y = ROOM_H - p.h - 1;
  });
}

function moveDungeon(dir) {
  const st = doorState(dir);
  if (st === 'exit') { exitDungeon(); return; }
  const [dx, dy] = DIR_DELTA[dir];
  const [rx, ry] = G.dungeon.room.split(',').map(Number);
  const nk = (rx + dx) + ',' + (ry + dy);
  if (!DUNGEONS[G.dungeon.id].rooms[nk]) return;
  const p = G.player;
  startScroll(dir, () => {
    G.dungeon.room = nk;
    loadDungeonRoom();
    if (dir === 'E') p.x = 2; if (dir === 'W') p.x = ROOM_W - p.w - 2;
    if (dir === 'S') p.y = 2; if (dir === 'N') p.y = ROOM_H - p.h - 2;
  });
}

function enterDungeon(id) {
  if (id === 3 && G.player.triforce < 2) {
    showMsg('THE DOOR IS SEALED. FIND 2 TRIFORCE PIECES.');
    return;
  }
  Audio2.sfx.stairs();
  G.owReturn = { screen: { ...G.screen }, x: G.player.x, y: G.player.y + 6 };
  G.checkpoint = { screen: { ...G.owReturn.screen }, x: G.owReturn.x, y: G.owReturn.y };
  G.env = 'dungeon';
  G.dungeon = { id, room: DUNGEONS[id].entry };
  G.player.x = 7.5 * 16; G.player.y = 8.5 * 16;
  G.player.dir = 'up';
  loadDungeonRoom();
  Audio2.play('dungeon');
  G.state = 'play';
}

function exitDungeon() {
  Audio2.sfx.stairs();
  G.env = 'overworld';
  G.dungeon = null;
  G.screen = G.owReturn.screen;
  G.player.x = G.owReturn.x; G.player.y = G.owReturn.y;
  G.player.dir = 'down';
  loadOverworldScreen();
  Audio2.play('overworld');
  G.state = 'play';
}

// ---------------- caves ----------------
function enterCave(id) {
  const def = CAVES[id];
  if (!def) return;
  Audio2.sfx.stairs();
  G.owReturn = { screen: { ...G.screen }, x: G.player.x, y: G.player.y + 6 };
  G.cave = { id, def, key: 'cave:' + G.screen.x + ',' + G.screen.y, textN: 0 };
  G.player.x = 120; G.player.y = 150; G.player.dir = 'up';
  G.state = 'cave';
}
function exitCave() {
  Audio2.sfx.stairs();
  G.cave = null;
  G.screen = G.owReturn.screen;
  G.player.x = G.owReturn.x; G.player.y = G.owReturn.y;
  G.player.dir = 'down';
  loadOverworldScreen();
  G.state = 'play';
}

function caveItems() {
  const c = G.cave, out = [];
  if (!c) return out;
  if (c.def.shop) {
    c.def.shop.forEach((s, i) => out.push({ kind: s.item, price: s.price, x: 80 + i * 36, y: 92, shop: true }));
  } else if (c.def.gift && !G.takenItems.has(c.key)) {
    out.push({ kind: c.def.gift, x: 124, y: 92 });
  }
  return out;
}

function giveGift(kind) {
  const p = G.player;
  switch (kind) {
    case 'sword': p.hasSword = true; return itemGetSeq('sword_item');
    case 'bow': p.hasBow = true; if (!p.bItem) p.bItem = 'bow'; return itemGetSeq('bow');
    case 'ring': p.hasRing = true; return itemGetSeq('ring');
    case 'heartContainer': p.hearts = Math.min(8, p.hearts + 1); p.hp = p.maxHp; return itemGetSeq('heart_container');
    case 'triforce': return triforceSeq();
    case 'rupees30': p.rupees = Math.min(255, p.rupees + 30); Audio2.sfx.rupee(); return;
    case 'bombs4': p.bombs = Math.min(8, p.bombs + 4); if (!p.bItem) p.bItem = 'bombs'; Audio2.sfx.rupee(); return;
    case 'bombs': p.bombs = Math.min(8, p.bombs + 4); if (!p.bItem) p.bItem = 'bombs'; Audio2.sfx.rupee(); return;
    case 'key': p.keys++; Audio2.sfx.key(); return;
    case 'heal': p.hp = p.maxHp; Audio2.sfx.heart(); return;
  }
}

function itemGetSeq(sprite) {
  Audio2.sfx.item();
  G.itemGet = { sprite, t: 90, prev: G.state };
  G.state = 'itemGet';
}
function triforceSeq() {
  Audio2.sfx.triforce();
  G.player.triforce++;
  G.itemGet = { sprite: 'triforce', t: 170, prev: G.state, triforce: true };
  G.state = 'itemGet';
}

function showMsg(text) { G.msg = text; G.msgT = 150; }

// ---------------- combat & events ----------------
G.onEnemyDead = function (en) {
  // random drop
  const r = Math.random();
  let kind = null;
  if (r < 0.22) kind = 'heart';
  else if (r < 0.40) kind = 'rupee';
  else if (r < 0.46) kind = 'rupee5';
  else if (r < 0.54) kind = 'bomb';
  if (kind) G.pickups.push(new Pickup(kind, en.x + 2, en.y + 2));
};

// true while this dungeon still has a locked door nobody has opened yet
function dungeonNeedsKey() {
  const rooms = DUNGEONS[G.dungeon.id].rooms;
  for (const rk in rooms) {
    const doors = rooms[rk].doors || {};
    for (const dir in doors)
      if (doors[dir] === 'lock' && !G.unlockedDoors.has(G.dungeon.id + ':' + rk + ':' + dir))
        return true;
  }
  return false;
}

function checkRoomClear() {
  if (G.env !== 'dungeon' || G.enemies.length > 0 || G.boss || G.clearProcessed) return;
  G.clearProcessed = true;
  const def = curRoomDef(), rk = roomKey();
  // key rooms respawn a key on every clear as long as a locked door still needs one,
  // so using a key on the wrong door (or losing track) can never soft-lock the dungeon
  if (def.drop === 'key' && G.player.keys === 0 && dungeonNeedsKey()) {
    const s = openSpotNear(120, 84);
    G.pickups.push(new Pickup('key', s.x, s.y));
  }
  if (def.item && !def.boss && !G.takenItems.has(rk + ':item') &&
      !G.floorItems.some(f => f.kind === def.item)) {
    G.floorItems.push({ kind: def.item, x: 120, y: 80, pkey: rk + ':item' });
    Audio2.sfx.secret();
  }
  if (Object.values(def.doors || {}).includes('shut')) { Audio2.sfx.unlock(); renderBase(); }
}

G.onBossDead = function (boss) {
  const rk = roomKey();
  G.killedBosses.add(rk);
  G.projectiles = G.projectiles.filter(p => p.friendly);
  const def = curRoomDef();
  if (boss.kind === 'ganon') {
    G.zelda = { x: 120, y: 40 };
    Audio2.sfx.triforce();
  } else {
    G.floorItems.push({ kind: 'heartContainer', x: boss.x + 8, y: boss.y + 8, pkey: rk + ':hc' });
    if (def.item && !G.takenItems.has(rk + ':item'))
      G.floorItems.push({ kind: def.item, x: 120, y: 80, pkey: rk + ':item' });
  }
  renderBase();
};

G.bombDamage = function (ex) {
  const cx = ex.x, cy = ex.y;
  for (const en of G.enemies) {
    if (ex.hit.has(en)) continue;
    const c = en.center();
    if (Math.hypot(c.x - cx, c.y - cy) < ex.r) { ex.hit.add(en); en.takeHit(2, { x: cx, y: cy }); }
  }
  if (G.boss && !ex.hit.has(G.boss)) {
    const c = G.boss.center();
    if (Math.hypot(c.x - cx, c.y - cy) < ex.r + 8) { ex.hit.add(G.boss); G.boss.takeHit(1, { x: cx, y: cy }, 'bomb'); }
  }
  // open secret walls
  if (G.env === 'overworld' && !G.secrets.has(G.screen.x + ',' + G.screen.y)) {
    const m = curMeta();
    for (let ty = 0; ty < 11; ty++) for (let tx = 0; tx < 16; tx++) {
      if (m.map[ty][tx] === 'X' && Math.hypot(tx * 16 + 8 - cx, ty * 16 + 8 - cy) < 30) {
        G.secrets.add(G.screen.x + ',' + G.screen.y);
        Audio2.sfx.secret();
        renderBase();
      }
    }
  }
};

G.playerDied = function () {
  Audio2.play('gameover');
  Audio2.sfx.die();
  G.state = 'gameover';
  G.gameoverT = 0;
};

// ---------------- play update ----------------
function updatePlay() {
  const p = G.player;
  if (input.start) {
    input.start = 0;
    G.paused = !G.paused;
  }
  if (G.paused) return;
  if (input.sel) {
    input.sel = 0;
    const opts = [];
    if (p.bombs > 0 || p.bItem === 'bombs') opts.push('bombs');
    if (p.hasBow) opts.push('bow');
    if (opts.length) p.bItem = opts[(opts.indexOf(p.bItem) + 1) % opts.length];
  }
  if (G.msgT > 0 && --G.msgT === 0) G.msg = null;
  if (G.hasWater && G.t % 16 === 0) renderBase(); // animate water
  p.update(input);

  // low hp beep
  if (p.hp > 0 && p.hp <= 2 && G.t % 60 === 0) Audio2.sfx.lowHp();

  // screen/room crossing (out-of-bounds is solid, so trigger at edge while pushing out)
  const atL = p.x < -1 || (p.x <= 2 && input.left);
  const atR = p.x > ROOM_W - p.w + 1 || (p.x >= ROOM_W - p.w - 2 && input.right);
  const atU = p.y < -1 || (p.y <= 2 && input.up);
  const atD = p.y > ROOM_H - p.h + 1 || (p.y >= ROOM_H - p.h - 2 && input.down);
  if (G.env === 'overworld') {
    if (atL) return moveOverworld(-1, 0);
    if (atR) return moveOverworld(1, 0);
    if (atU) return moveOverworld(0, -1);
    if (atD) return moveOverworld(0, 1);
    // cave / dungeon entry: tile player pushes into
    if (p.moving) {
      const c = p.center(), d = DIRS[p.dir];
      const tx = Math.floor((c.x + d[0] * 10) / 16), ty = Math.floor((c.y + d[1] * 10) / 16);
      const m = curMeta();
      if (tx >= 0 && ty >= 0 && tx < 16 && ty < 11) {
        const raw = m.map[ty][tx];
        if (raw === 'C' && m.cave) return enterCave(m.cave);
        if (raw === 'X' && G.secrets.has(G.screen.x + ',' + G.screen.y) && m.secret) return enterCave(m.secret);
        if (raw === 'D' && m.dungeon) return enterDungeon(m.dungeon);
      }
    }
  } else {
    if (atL) return moveDungeon('W');
    if (atR) return moveDungeon('E');
    if (atU) return moveDungeon('N');
    if (atD) return moveDungeon('S');
    // unlock doors
    for (const dir in DOOR_TILES) {
      if (doorState(dir) !== 'lock') continue;
      const [[x1, y1]] = DOOR_TILES[dir];
      const zone = { x: x1 * 16 - 6, y: y1 * 16 - 6, w: (dir === 'N' || dir === 'S' ? 32 : 16) + 12, h: (dir === 'N' || dir === 'S' ? 16 : 32) + 12 };
      const pushing = (dir === 'N' && input.up) || (dir === 'S' && input.down) || (dir === 'W' && input.left) || (dir === 'E' && input.right);
      if (!pushing || !rectsHit(p.hitbox(), zone)) continue;
      if (p.keys > 0) {
        p.keys--;
        G.unlockedDoors.add(G.dungeon.id + ':' + G.dungeon.room + ':' + dir);
        const [dx, dy] = DIR_DELTA[dir];
        const [rx, ry] = G.dungeon.room.split(',').map(Number);
        G.unlockedDoors.add(G.dungeon.id + ':' + (rx + dx) + ',' + (ry + dy) + ':' + OPP[dir]);
        Audio2.sfx.unlock();
        renderBase();
      } else if (!G.msg) {
        showMsg('YOU NEED A KEY.');
        Audio2.sfx.shield();
      }
    }
  }

  // entities
  for (const en of G.enemies) en.update();
  if (G.boss) G.boss.update();
  for (const pr of G.projectiles) pr.update();
  for (const b of G.bombsLive) b.update();
  for (const ex of G.explosions) ex.update();
  for (const pk of G.pickups) pk.update();
  for (const pf of G.poofs) pf.t--;

  // sword hits
  if (p.attacking > 2 && p.attacking < 12) {
    const sb = p.swordBox();
    for (const en of G.enemies) {
      if (!p.attackHit.has(en) && rectsHit(sb, en)) { p.attackHit.add(en); en.takeHit(1, p.center()); }
    }
    if (G.boss && !p.attackHit.has(G.boss) && rectsHit(sb, G.boss)) {
      p.attackHit.add(G.boss); G.boss.takeHit(1, p.center(), 'sword');
    }
  }

  // friendly projectiles vs enemies / enemy projectiles vs player
  for (const pr of G.projectiles) {
    if (pr.dead) continue;
    const prBox = { x: pr.x, y: pr.y, w: pr.w, h: pr.h };
    if (pr.friendly) {
      for (const en of G.enemies)
        if (!en.dead && rectsHit(prBox, en)) { en.takeHit(pr.dmg, { x: pr.x, y: pr.y }); pr.dead = true; break; }
      if (!pr.dead && G.boss && rectsHit(prBox, G.boss)) { G.boss.takeHit(pr.dmg, { x: pr.x, y: pr.y }, 'arrow'); pr.dead = true; }
    } else if (rectsHit(prBox, p.hitbox())) {
      p.hurt(pr.dmg, { x: pr.x, y: pr.y }); pr.dead = true;
    }
  }

  // contact damage
  for (const en of G.enemies)
    if (en.spawnT <= 0 && rectsHit(en, p.hitbox())) p.hurt(en.def.dmg, en.center());
  if (G.boss && rectsHit(G.boss, p.hitbox())) p.hurt(G.boss.kind === 'ganon' ? 4 : 2, G.boss.center());

  // floor items (major)
  for (const it of G.floorItems) {
    if (rectsHit({ x: it.x, y: it.y, w: 10, h: 10 }, p.hitbox())) {
      it.dead = true;
      if (it.pkey) G.takenItems.add(it.pkey);
      giveGift(it.kind);
    }
  }

  // zelda rescue
  if (G.zelda && rectsHit({ x: G.zelda.x, y: G.zelda.y, w: 14, h: 14 }, p.hitbox())) {
    G.state = 'win'; G.winT = 0;
    Audio2.play('ending'); Audio2.sfx.triforce();
  }

  // cleanup
  if (G.boss && G.boss.dead) G.boss = null;
  G.enemies = G.enemies.filter(e => !e.dead);
  G.projectiles = G.projectiles.filter(x => !x.dead);
  G.bombsLive = G.bombsLive.filter(x => !x.dead);
  G.explosions = G.explosions.filter(x => !x.dead);
  G.pickups = G.pickups.filter(x => !x.dead);
  G.poofs = G.poofs.filter(x => x.t > 0);
  G.floorItems = G.floorItems.filter(x => !x.dead);
  checkRoomClear();
}

// ---------------- cave update ----------------
function updateCave() {
  const p = G.player;
  p.update(inputCaveWrap());
  p.x = Math.max(8, Math.min(ROOM_W - p.w - 8, p.x));
  if (p.y < 64) p.y = 64;
  if (p.y > ROOM_H - p.h - 2) { exitCave(); return; }
  if (G.cave.textN < 200) G.cave.textN += 0.7;

  for (const it of caveItems()) {
    if (!rectsHit({ x: it.x, y: it.y, w: 10, h: 12 }, p.hitbox())) continue;
    if (it.shop) {
      if (p.rupees >= it.price) {
        p.rupees -= it.price;
        giveGift(it.kind);
      } else Audio2.sfx.shield();
      p.y = it.y + 16; // step back so one touch = one purchase
    } else {
      G.takenItems.add(G.cave.key);
      giveGift(it.kind);
    }
  }
}
function inputCaveWrap() { return input; }

// ---------------- drawing ----------------
function drawRoomEntities(c) {
  for (const it of G.floorItems) drawSprite(c, ITEM_INFO[it.kind === 'bombs4' ? 'bombs' : it.kind] ? ITEM_INFO[it.kind === 'bombs4' ? 'bombs' : it.kind].sprite : it.kind, it.x, it.y);
  for (const pk of G.pickups) pk.draw(c, G.t);
  for (const b of G.bombsLive) b.draw(c);
  if (G.npc) {
    drawSprite(c, 'fire1', G.npc.x - 32, G.npc.y);
    drawSprite(c, G.t % 20 < 10 ? 'fire1' : 'fire2', G.npc.x + 32, G.npc.y);
    drawSprite(c, 'oldman', G.npc.x, G.npc.y);
    if (G.npc.text) drawWrapped(c, G.npc.text, 24);
  }
  if (G.zelda) drawSprite(c, 'zelda', G.zelda.x, G.zelda.y);
  for (const en of G.enemies) en.draw(c, G.t);
  if (G.boss) G.boss.draw(c, G.t);
  G.player.draw(c);
  for (const pr of G.projectiles) pr.draw(c, G.t);
  for (const ex of G.explosions) ex.draw(c);
  for (const pf of G.poofs) {
    c.fillStyle = (pf.t >> 1) % 2 ? '#FCFCFC' : '#787878';
    const r = (16 - Math.min(16, pf.t));
    c.fillRect(pf.x + 6 - r / 3, pf.y + 6 - r / 3, 4 + r / 2, 4 + r / 2);
  }
}

function drawWrapped(c, text, y) {
  const lines = text.split('\n');
  lines.forEach((ln, i) => drawText(c, ln, 128 - ln.length * 4, y + i * 12));
}

function drawHUD() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, HUD_H);
  const p = G.player;
  // minimap
  ctx.fillStyle = '#585858';
  ctx.fillRect(16, 12, 64, 34);
  if (G.env === 'overworld') {
    ctx.fillStyle = '#80D010';
    ctx.fillRect(16 + G.screen.x * 8 + 2, 12 + G.screen.y * 8 + 3, 4, 4);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(16, 12, 64, 34);
    const dun = DUNGEONS[G.dungeon.id];
    drawText(ctx, dun.name, 16, 2, '#FCFCFC');
    for (const k in dun.rooms) {
      const [rx, ry] = k.split(',').map(Number);
      ctx.fillStyle = '#0058F8';
      ctx.fillRect(16 + rx * 12, 14 + ry * 8, 10, 6);
    }
    const [cx, cy] = G.dungeon.room.split(',').map(Number);
    ctx.fillStyle = '#80D010';
    ctx.fillRect(16 + cx * 12 + 3, 14 + cy * 8 + 1, 4, 4);
  }
  // counters
  drawSprite(ctx, 'rupee_y', 96, 8);
  drawText(ctx, 'X' + p.rupees, 104, 8);
  drawSprite(ctx, 'key', 96, 24);
  drawText(ctx, 'X' + p.keys, 104, 24);
  drawSprite(ctx, 'bomb', 96, 38);
  drawText(ctx, 'X' + p.bombs, 104, 40);
  // B / A boxes
  boxItem(132, 8, 'B', p.bItem === 'bombs' ? 'bomb' : p.bItem === 'bow' ? 'bow' : null);
  boxItem(152, 8, 'A', p.hasSword ? 'sword_item' : null);
  // life
  drawText(ctx, '-LIFE-', 184, 8, '#D82800');
  for (let i = 0; i < p.hearts; i++) {
    const full = p.hp >= (i + 1) * 2, half = p.hp === i * 2 + 1;
    const x = 184 + (i % 4) * 9, y = 20 + Math.floor(i / 4) * 9;
    ctx.fillStyle = full || half ? '#D82800' : '#404040';
    if (full) drawSprite(ctx, 'heart', x, y);
    else if (half) { drawSprite(ctx, 'heart', x, y, { remap: { R: 'k' } }); ctx.save(); ctx.beginPath(); ctx.rect(x, y, 4, 8); ctx.clip(); drawSprite(ctx, 'heart', x, y); ctx.restore(); }
    else drawSprite(ctx, 'heart', x, y, { remap: { R: 'k' } });
  }
  // triforce count
  for (let i = 0; i < p.triforce; i++) drawSprite(ctx, 'triforce', 132 + i * 10, 44);
  if (Audio2.muted) drawText(ctx, 'MUTE', 224, 54, '#787878');
}

function boxItem(x, y, label, sprite) {
  ctx.strokeStyle = '#0058F8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 15, 23);
  drawText(ctx, label, x + 4, y - 8, '#FCFCFC');
  if (sprite) drawSprite(ctx, sprite, x + 4, y + 8);
}

// ---------------- state renders ----------------
function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 240);

  if (G.state === 'title') { renderTitle(); return; }
  if (G.state === 'gameover') { renderGameOver(); return; }
  if (G.state === 'win') { renderWin(); return; }

  drawHUD();
  ctx.save();
  ctx.translate(0, HUD_H);
  ctx.beginPath(); ctx.rect(0, 0, ROOM_W, ROOM_H); ctx.clip();

  if (G.state === 'scroll') {
    const s = G.scroll, k = s.t / s.dur;
    const [dx, dy] = DIR_DELTA[s.dir];
    ctx.drawImage(s.oldBase, -dx * k * ROOM_W, -dy * k * ROOM_H);
    ctx.drawImage(s.newBase, dx * (1 - k) * ROOM_W, dy * (1 - k) * ROOM_H);
    G.player.draw(ctx);
  } else if (G.state === 'cave') {
    // black cave with npc
    const c = G.cave;
    drawSprite(ctx, 'fire1', 88, 44);
    drawSprite(ctx, G.t % 20 < 10 ? 'fire1' : 'fire2', 152, 44);
    if (c.def.npc === 'merchant') drawSprite(ctx, 'oldman', 120, 44, { remap: { R: 'U' } });
    else drawSprite(ctx, 'oldman', 120, 44);
    const shown = c.def.text.slice(0, Math.floor(c.textN));
    if (G.t % 4 === 0 && shown.length < c.def.text.length) Audio2.sfx.text();
    drawWrapped(ctx, shown, 14);
    for (const it of caveItems()) {
      const info = ITEM_INFO[it.kind] || { sprite: it.kind };
      drawSprite(ctx, info.sprite || it.kind, it.x, it.y);
      if (it.shop) { drawText(ctx, '' + it.price, it.x - 2, it.y + 14, '#FCFCFC'); drawSprite(ctx, 'rupee_y', it.x - 12, it.y + 12); }
    }
    G.player.draw(ctx);
  } else if (G.state === 'itemGet') {
    if (!G.cave) ctx.drawImage(G.baseCanvas, 0, 0);
    const p = G.player;
    drawSprite(ctx, 'link_down', p.x - 2, p.y - 3);
    const it = G.itemGet;
    drawSprite(ctx, it.sprite, p.x + 2, p.y - 14);
    if (it.triforce) {
      const fl = (G.t >> 2) % 2;
      ctx.fillStyle = fl ? 'rgba(252,216,168,0.15)' : 'rgba(252,176,64,0.12)';
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    }
  } else {
    ctx.drawImage(G.baseCanvas, 0, 0);
    drawRoomEntities(ctx);
  }

  if (G.msg) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(12, 6, 232, 26);
    drawWrapped(ctx, G.msg, 10);
  }
  if (G.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    drawText(ctx, 'PAUSED', 104, 84, '#FCFCFC');
  }
  ctx.restore();
}

function renderTitle() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 240);
  // triforce glow
  ctx.save();
  ctx.translate(112, 40);
  ctx.scale(4, 4);
  drawSprite(ctx, 'triforce', 0, 0);
  ctx.restore();
  drawText(ctx, 'TINY', 112, 92, '#D82800');
  drawText(ctx, '-THE LEGEND OF-', 68, 106, '#FCFCFC');
  drawText(ctx, 'Z E L D A', 92, 122, '#D82800');
  drawText(ctx, 'AN NES DEMAKE', 76, 146, '#787878');
  if ((G.t >> 5) % 2) drawText(ctx, 'PRESS ENTER', 84, 180, '#FCFCFC');
  drawText(ctx, '(C)1986 TRIBUTE', 68, 220, '#787878');
}

function renderGameOver() {
  ctx.fillStyle = G.gameoverT < 40 ? '#A80000' : '#000';
  ctx.fillRect(0, 0, 256, 240);
  if (G.gameoverT > 40) {
    drawText(ctx, 'GAME OVER', 88, 100, '#D82800');
    if (G.gameoverT > 90 && (G.t >> 5) % 2) drawText(ctx, 'PRESS ENTER TO CONTINUE', 36, 140, '#FCFCFC');
  }
}

function renderWin() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 240);
  ctx.save();
  ctx.translate(96, 30);
  ctx.scale(2, 2);
  drawSprite(ctx, 'triforce', 0, 0);
  drawSprite(ctx, 'triforce', 16, 0);
  ctx.restore();
  drawSprite(ctx, 'zelda', 108, 90);
  drawSprite(ctx, 'link_down', 132, 90);
  drawText(ctx, 'THANKS LINK,', 80, 130, '#FCFCFC');
  drawText(ctx, "YOU'RE THE HERO", 68, 144, '#FCFCFC');
  drawText(ctx, 'OF HYRULE.', 88, 158, '#FCFCFC');
  if (G.winT > 180) {
    drawText(ctx, 'FINALLY,', 96, 184, '#FCB040');
    drawText(ctx, 'PEACE RETURNS TO HYRULE.', 32, 198, '#FCB040');
    drawText(ctx, 'THE END', 100, 220, '#D82800');
  }
  if (G.winT > 300 && (G.t >> 5) % 2) drawText(ctx, 'PRESS ENTER TO PLAY AGAIN', 28, 230, '#787878');
}

// ---------------- state updates ----------------
function update() {
  G.t++;
  switch (G.state) {
    case 'title':
      // any non-start key = user gesture, enough to start the title theme
      if (input.up || input.down || input.left || input.right || input.a || input.b) Audio2.play('title');
      if (input.start) { input.start = 0; startGame(); }
      break;
    case 'play': updatePlay(); break;
    case 'scroll':
      if (++G.scroll.t >= G.scroll.dur) { G.scroll = null; G.state = 'play'; }
      break;
    case 'cave': updateCave(); break;
    case 'itemGet':
      if (--G.itemGet.t <= 0) {
        const tri = G.itemGet.triforce;
        G.state = G.itemGet.prev === 'cave' ? 'cave' : 'play';
        G.itemGet = null;
        if (tri) exitDungeon();
      }
      break;
    case 'gameover':
      G.gameoverT++;
      if (G.gameoverT > 90 && input.start) { input.start = 0; continueGame(); }
      break;
    case 'win':
      G.winT++;
      if (G.winT > 300 && input.start) { input.start = 0; resetAll(); }
      break;
  }
}

function startGame() {
  Audio2.ensure();
  G.player = new Player();
  G.env = 'overworld';
  G.screen = { x: START_SCREEN.x, y: START_SCREEN.y };
  G.state = 'play';
  loadOverworldScreen();
  Audio2.play('overworld');
}

function resetAll() {
  G.secrets.clear(); G.unlockedDoors.clear();
  G.takenItems.clear(); G.killedBosses.clear();
  G.player = null; G.dungeon = null; G.cave = null; G.msg = null;
  G.checkpoint = { screen: { x: START_SCREEN.x, y: START_SCREEN.y }, x: START_POS.x, y: START_POS.y };
  Audio2.stop();
  G.state = 'title';
}

function continueGame() {
  const p = G.player;
  p.hp = Math.min(p.maxHp, 6);
  const cp = G.checkpoint;
  p.x = cp.x; p.y = cp.y; p.dir = 'down';
  p.invuln = 0; p.kb = null; p.attacking = 0;
  G.env = 'overworld';
  G.dungeon = null;
  G.screen = { ...cp.screen };
  G.state = 'play';
  loadOverworldScreen();
  Audio2.play('overworld');
}

// ---------------- main loop ----------------
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  const STEP = 1000 / 60;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
canvas.focus();
