// Infinity Zelda — procedural world generator.
// Rebuilds OVERWORLD + DUNGEONS from scratch on every run. Two invariants are
// always kept so a run can always be finished:
//   1. The 8x4 overworld is fully connected — every screen has a cleared "+"
//      corridor, so any special (sword cave, dungeon doors...) is reachable.
//   2. Every dungeon is a spine from entry to boss with a single key-locked
//      boss door and a reachable key room, so it is always solvable.
'use strict';

let WORLD_SEED = 0;

const generateWorld = (() => {
  // ---- seeded RNG (mulberry32) so a run is reproducible from its seed ----
  let RS = 1;
  function seedRNG(s) { RS = (s >>> 0) || 1; }
  function rnd() {
    RS |= 0; RS = (RS + 0x6D2B79F5) | 0;
    let t = Math.imul(RS ^ (RS >>> 15), 1 | RS);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const chance = p => rnd() < p;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function wpick(cands) {
    let tot = 0; for (const c of cands) tot += c.w;
    let r = rnd() * tot;
    for (const c of cands) { r -= c.w; if (r <= 0) return c.c; }
    return cands[cands.length - 1].c;
  }

  const GDELTA = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
  const GOPP = { N: 'S', S: 'N', W: 'E', E: 'W' };

  let MODS = [];                                  // active run mutators
  const swarmBonus = () => (MODS.indexOf('swarm') >= 0 ? 1 : 0);

  // =========================================================
  //  OVERWORLD
  // =========================================================
  // Interior starts fully open; obstacles only ever go in the 4 corner blocks,
  // never on the central "+" (rows 4-6 + cols 6-9), which stays walkable and
  // lines every screen up with its neighbours edge-to-edge.
  const QUADS = [
    { x0: 1, x1: 5, y0: 1, y1: 3 }, { x0: 10, x1: 14, y0: 1, y1: 3 },
    { x0: 1, x1: 5, y0: 7, y1: 9 }, { x0: 10, x1: 14, y0: 7, y1: 9 },
  ];
  // cave / dungeon / secret mouths sit on the upper vertical corridor,
  // approached from below with an open column beside them to slip past.
  const SPECIAL_SPOTS = [[7, 2], [8, 2], [7, 3], [8, 3]];

  function newGrid() {
    const g = [];
    for (let y = 0; y < 11; y++) g.push('................'.split(''));
    return g;
  }

  function setBorder(g, sx, sy, wall) {
    for (let x = 0; x < 16; x++) { g[0][x] = wall; g[10][x] = wall; }
    for (let y = 0; y < 11; y++) { g[y][0] = wall; g[y][15] = wall; }
    // open the border only toward existing neighbours (mid rows / mid cols)
    if (sx > 0) { g[4][0] = '.'; g[5][0] = '.'; g[6][0] = '.'; }
    if (sx < OW_W - 1) { g[4][15] = '.'; g[5][15] = '.'; g[6][15] = '.'; }
    if (sy > 0) { g[0][7] = '.'; g[0][8] = '.'; }
    if (sy < OW_H - 1) { g[10][7] = '.'; g[10][8] = '.'; }
  }

  function decorate(g) {
    const primary = pick(['T', 'T', '#', '#', 'W', 's']);
    for (const q of QUADS) {
      const blobs = ri(0, 2);
      for (let b = 0; b < blobs; b++) {
        let cx = ri(q.x0, q.x1), cy = ri(q.y0, q.y1);
        const ch = chance(0.8) ? primary : pick(['T', '#', 'W', 's']);
        const size = ri(1, 4);
        for (let s = 0; s < size; s++) {
          if (cx >= q.x0 && cx <= q.x1 && cy >= q.y0 && cy <= q.y1) g[cy][cx] = ch;
          if (chance(0.5)) cx += chance(0.5) ? 1 : -1; else cy += chance(0.5) ? 1 : -1;
        }
      }
    }
  }

  function owEnemies(count, run) {
    const pool = run <= 2 ? ['octorok', 'octorok', 'tektite']
      : run <= 5 ? ['octorok', 'octorok_b', 'tektite', 'moblin']
        : ['octorok_b', 'moblin', 'moblin', 'tektite', 'octorok_b'];
    const out = [], n = count + swarmBonus();
    for (let i = 0; i < n; i++) out.push(pick(pool));
    return out;
  }

  function buildScreen(x, y, sp, isStart, run) {
    const g = newGrid();
    setBorder(g, x, y, chance(0.35) ? 'T' : '#');
    decorate(g);
    if (sp) { const s = pick(SPECIAL_SPOTS); g[s[1]][s[0]] = sp.tile; }
    let count;
    if (isStart) count = ri(0, 1);
    else if (sp) count = ri(1, 2);
    else count = ri(2, 3) + (run >= 4 ? 1 : 0);
    const meta = Object.assign({ enemies: owEnemies(count, run) }, sp ? sp.meta : {});
    S(x, y, meta, g.map(r => r.join('')));
  }

  function genOverworld(run) {
    for (const k in OVERWORLD) delete OVERWORLD[k];
    const cells = [];
    for (let y = 0; y < OW_H; y++) for (let x = 0; x < OW_W; x++) cells.push([x, y]);
    shuffle(cells);
    const start = cells.pop();
    START_SCREEN.x = start[0]; START_SCREEN.y = start[1];
    START_POS.x = 7.5 * 16; START_POS.y = 5 * 16;
    const specials = {};
    const assign = (tile, meta) => { const c = cells.pop(); specials[c[0] + ',' + c[1]] = { tile, meta }; };
    assign('C', { cave: 'sword' });
    assign('C', { cave: 'shop' });
    assign('C', { cave: 'heart' });
    assign('C', { cave: 'hint' });
    assign('D', { dungeon: 1 });
    assign('D', { dungeon: 2 });
    assign('D', { dungeon: 3 });
    assign('X', { secret: 'money' });
    assign('X', { secret: 'money' });
    for (let y = 0; y < OW_H; y++)
      for (let x = 0; x < OW_W; x++)
        buildScreen(x, y, specials[x + ',' + y], x === START_SCREEN.x && y === START_SCREEN.y, run);
  }

  // ---- overworld solvability check (tile flood-fill across the whole map) ----
  const owWalk = (sx, sy, tx, ty) => {
    const m = OVERWORLD[sx + ',' + sy];
    if (!m || tx < 0 || ty < 0 || tx > 15 || ty > 10) return false;
    return !'#TWCDX'.includes(m.map[ty][tx]);   // s/./B are walkable
  };
  function owFlood() {
    const key = (sx, sy, tx, ty) => sx + ',' + sy + ':' + tx + ',' + ty;
    const seen = new Set();
    const stack = [[START_SCREEN.x, START_SCREEN.y, 7, 5]];
    seen.add(key(START_SCREEN.x, START_SCREEN.y, 7, 5));
    const push = (nx, ny, ntx, nty) => {
      if (!owWalk(nx, ny, ntx, nty)) return;
      const k = key(nx, ny, ntx, nty);
      if (!seen.has(k)) { seen.add(k); stack.push([nx, ny, ntx, nty]); }
    };
    while (stack.length) {
      const [cx, cy, tx, ty] = stack.pop();
      push(cx, cy, tx - 1, ty); push(cx, cy, tx + 1, ty);
      push(cx, cy, tx, ty - 1); push(cx, cy, tx, ty + 1);
      if (tx === 0) push(cx - 1, cy, 15, ty);
      if (tx === 15) push(cx + 1, cy, 0, ty);
      if (ty === 0) push(cx, cy - 1, tx, 10);
      if (ty === 10) push(cx, cy + 1, tx, 0);
    }
    return seen;
  }
  // a mouth (cave/dungeon tile) is usable if the hero can stand next to it
  function owSolvable() {
    const seen = owFlood();
    const reachMouth = (mx, my, tile) => {
      const m = OVERWORLD[mx + ',' + my];
      for (let ty = 0; ty < 11; ty++) for (let tx = 0; tx < 16; tx++) {
        if (m.map[ty][tx] !== tile) continue;
        for (const [ax, ay] of [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx, ty + 1]])
          if (seen.has(mx + ',' + my + ':' + ax + ',' + ay)) return true;
      }
      return false;
    };
    for (const kk in OVERWORLD) {
      const m = OVERWORLD[kk], [mx, my] = kk.split(',').map(Number);
      if (m.cave === 'sword' && !reachMouth(mx, my, 'C')) return false;   // sword required
      if (m.dungeon && !reachMouth(mx, my, 'D')) return false;            // every dungeon required
    }
    return true;
  }

  // =========================================================
  //  DUNGEONS
  // =========================================================
  const K = c => c.x + ',' + c.y;
  const inB = c => c.x >= 0 && c.x <= 4 && c.y >= 0 && c.y <= 3;
  function dirBetween(a, b) {
    if (b.y < a.y) return 'N'; if (b.y > a.y) return 'S';
    if (b.x > a.x) return 'E'; return 'W';
  }
  function dunEnemies(count, run) {
    const pool = run <= 2 ? ['stalfos', 'keese', 'zol']
      : run <= 5 ? ['stalfos', 'keese', 'zol', 'stalfos_b']
        : ['stalfos_b', 'keese', 'zol', 'stalfos_b', 'keese'];
    const out = [], n = count + swarmBonus();
    for (let i = 0; i < n; i++) out.push(pick(pool));
    return out;
  }

  // hang a new leaf room off any non-boss room via a mutually-open door
  function addBranch(spine, rooms, used) {
    for (const room of shuffle(spine.slice())) {
      for (const dir of shuffle(['N', 'S', 'E', 'W'])) {
        const [dx, dy] = GDELTA[dir];
        const nc = { x: room.x + dx, y: room.y + dy };
        if (!inB(nc) || used.has(K(nc))) continue;
        used.add(K(nc));
        rooms[K(nc)] = { doors: {}, enemies: [] };
        if (!rooms[K(room)].doors[dir]) rooms[K(room)].doors[dir] = 'open';
        rooms[K(nc)].doors[GOPP[dir]] = 'open';
        return nc;
      }
    }
    return null;
  }

  function tryDungeon(cfg, run) {
    const used = new Set();
    const entry = { x: ri(1, 3), y: 3 };
    const path = [entry]; used.add(K(entry));
    let cur = { x: entry.x, y: 2 };              // always step up out of the entry
    path.push(cur); used.add(K(cur));
    let guard = 0;
    while (cur.y > 0 && guard++ < 30) {
      const cands = [];
      const up = { x: cur.x, y: cur.y - 1 };
      if (inB(up) && !used.has(K(up))) cands.push({ c: up, w: 5 });
      if (path.length < 6) for (const dx of [-1, 1]) {
        const s = { x: cur.x + dx, y: cur.y };
        if (inB(s) && !used.has(K(s))) cands.push({ c: s, w: 2 });
      }
      if (!cands.length) return null;
      cur = wpick(cands); path.push(cur); used.add(K(cur));
    }
    if (cur.y !== 0 || path.length < 3) return null;

    const boss = path[path.length - 1];
    const rooms = {};
    for (const c of path) rooms[K(c)] = { doors: {}, enemies: [] };
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], dir = dirBetween(a, b);
      if (i === path.length - 2) { rooms[K(a)].doors[dir] = 'lock'; rooms[K(b)].doors[GOPP[dir]] = 'open'; }
      else { rooms[K(a)].doors[dir] = 'open'; rooms[K(b)].doors[GOPP[dir]] = 'open'; }
    }
    const er = rooms[K(entry)];
    er.doors.S = 'exit'; er.tpl = 'plain'; er.enemies = [];
    const brm = rooms[K(boss)];
    brm.boss = cfg.boss; brm.tpl = 'plain';
    if (!cfg.final) brm.item = 'triforce';

    // required rooms, all on the entry side of the single boss lock
    const need = ['key'];
    if (!cfg.final) need.push('item');
    if (cfg.bombs) need.push('bombs');
    const spine = path.slice(0, path.length - 1);
    const hosts = shuffle(path.slice(1, path.length - 1));
    while (hosts.length < need.length) { const b = addBranch(spine, rooms, used); if (!b) break; hosts.push(b); }
    if (hosts.length < need.length) return null;
    const role = new Map();
    for (let i = 0; i < need.length; i++) role.set(K(hosts[i]), need[i]);

    for (const rk in rooms) {
      const r = rooms[rk];
      if (r.boss || rk === K(entry)) continue;
      if (!r.tpl) r.tpl = pick(['plain', 'pillars', 'blocks', 'water']);
      switch (role.get(rk)) {
        case 'key': r.enemies = dunEnemies(ri(3, 4), run); r.drop = 'key'; break;
        case 'item': r.enemies = dunEnemies(ri(2, 3), run); r.item = cfg.item; break;
        case 'bombs': r.tpl = 'plain'; r.npc = 'oldman'; r.text = 'DODONGO DISLIKES SMOKE.\nTAKE THESE.'; r.gift = 'bombs4'; r.enemies = []; break;
        default: r.enemies = dunEnemies(ri(3, 4), run);
      }
    }
    // optional side rooms — pure exploration, never gate progress
    for (let i = 0, extra = ri(0, 2); i < extra; i++) {
      const b = addBranch(spine, rooms, used); if (!b) break;
      const r = rooms[K(b)]; r.tpl = pick(['plain', 'pillars', 'blocks', 'water']); r.enemies = dunEnemies(ri(2, 3), run);
    }
    // occasional "bars slam shut, clear the room" beat on the spine
    for (let i = 1; i < path.length - 2; i++) {
      const r = rooms[K(path[i])], fwd = dirBetween(path[i], path[i + 1]);
      if (r.doors[fwd] === 'open' && r.enemies.length && chance(0.35)) r.doors[fwd] = 'shut';
    }
    return { name: cfg.name, entry: K(entry), rooms };
  }

  // guaranteed-valid straight dungeon, only used if 80 random tries all fail
  function fallbackDungeon(cfg, run) {
    const rooms = {
      '2,3': { tpl: 'plain', doors: { N: 'open', S: 'exit' }, enemies: [] },
      '2,2': { tpl: 'blocks', doors: { N: 'open', S: 'open' }, enemies: dunEnemies(3, run), drop: 'key' },
      '2,1': { tpl: 'pillars', doors: { N: 'lock', S: 'open' }, enemies: dunEnemies(3, run) },
      '2,0': { tpl: 'plain', doors: { S: 'open' }, boss: cfg.boss },
    };
    if (!cfg.final) { rooms['2,0'].item = 'triforce'; rooms['2,1'].item = cfg.item; }
    if (cfg.bombs) { const r = rooms['2,2']; r.npc = 'oldman'; r.text = 'DODONGO DISLIKES SMOKE.\nTAKE THESE.'; r.gift = 'bombs4'; r.enemies = []; }
    return { name: cfg.name, entry: '2,3', rooms };
  }

  // ---- dungeon solvability check: get a key without crossing the lock,
  //      then reach the boss; for L2 the bomb gift must be reachable too ----
  function dungeonSolvable(d, cfg) {
    const rooms = d.rooms;
    const bossKey = Object.keys(rooms).find(k => rooms[k].boss);
    if (!bossKey) return false;
    const neigh = (rk, passLock) => {
      const [x, y] = rk.split(',').map(Number), out = [];
      for (const dir of ['N', 'S', 'E', 'W']) {
        const st = rooms[rk].doors[dir];
        if (!st) continue;
        if (!(st === 'open' || st === 'shut' || st === 'exit' || (st === 'lock' && passLock))) continue;
        const [dx, dy] = GDELTA[dir], nk = (x + dx) + ',' + (y + dy);
        if (rooms[nk]) out.push(nk);
      }
      return out;
    };
    const bfs = passLock => {
      const seen = new Set([d.entry]), q = [d.entry];
      while (q.length) { const c = q.shift(); for (const n of neigh(c, passLock)) if (!seen.has(n)) { seen.add(n); q.push(n); } }
      return seen;
    };
    const noKey = bfs(false);
    if (![...noKey].some(k => rooms[k].drop === 'key')) return false;   // key obtainable pre-lock
    const withKey = bfs(true);
    if (!withKey.has(bossKey)) return false;                           // boss reachable with a key
    if (cfg.bombs && ![...withKey].some(k => rooms[k].gift === 'bombs4')) return false; // dodongo needs bombs
    return true;
  }

  function genDungeon(cfg, run) {
    for (let a = 0; a < 80; a++) { const d = tryDungeon(cfg, run); if (d && dungeonSolvable(d, cfg)) return d; }
    return fallbackDungeon(cfg, run);   // hand-verified solvable
  }

  const CFG1 = { name: 'LEVEL-1', boss: 'aquamentus', item: 'bow' };
  const CFG2 = { name: 'LEVEL-2', boss: 'dodongo', item: 'ring', bombs: true };
  const CFG3 = { name: 'LEVEL-9', boss: 'ganon', final: true };

  return function generateWorld(run, mods) {
    MODS = mods || [];
    // build, then verify the whole run is beatable; reseed and retry if not.
    // (each piece already self-validates, so this practically never loops.)
    for (let attempt = 0; attempt < 40; attempt++) {
      WORLD_SEED = (Math.floor(Math.random() * 4294967296) ^ Math.imul(run, 0x9E3779B1) ^ Math.imul(attempt, 0x85EBCA6B)) >>> 0;
      seedRNG(WORLD_SEED);
      genOverworld(run);
      for (const k in DUNGEONS) delete DUNGEONS[k];
      DUNGEONS[1] = genDungeon(CFG1, run);
      DUNGEONS[2] = genDungeon(CFG2, run);
      DUNGEONS[3] = genDungeon(CFG3, run);
      if (owSolvable() &&
          dungeonSolvable(DUNGEONS[1], CFG1) &&
          dungeonSolvable(DUNGEONS[2], CFG2) &&
          dungeonSolvable(DUNGEONS[3], CFG3)) return;
    }
    // fell through 40 tries: overworld is connected by construction and every
    // dungeon fell back to a hand-verified solvable layout, so this is still beatable.
  };
})();
