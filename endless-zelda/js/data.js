// Endless Zelda — static world pieces reused by the generator.
// The overworld screens and the three dungeons are built fresh every run in
// generate.js; this file only holds the fixed parts that generation draws on.
// Tile legend: . ground  s sand  # rock  T tree  W water  B bridge
//              C cave  D dungeon door  X hidden bombable cave  b block  w dwater
'use strict';

const OW_W = 8, OW_H = 4;
const START_SCREEN = { x: 2, y: 3 };            // set by generateWorld() each run
const START_POS = { x: 7.5 * 16, y: 5 * 16 };

function normMap(rows) {
  const out = [];
  for (let y = 0; y < 11; y++) {
    let r = rows[y] || '################';
    if (r.length < 16) r = r + r[r.length - 1].repeat(16 - r.length);
    out.push(r.slice(0, 16));
  }
  return out;
}

const OVERWORLD = {};                            // filled by generateWorld()
function S(x, y, meta, rows) { OVERWORLD[x + ',' + y] = Object.assign({ map: normMap(rows) }, meta); }

// ---------- caves (content is fixed; the generator scatters the entrances) ----------
const CAVES = {
  sword:  { npc: 'oldman', text: "IT'S DANGEROUS TO GO\nALONE! TAKE THIS.", gift: 'sword' },
  hint:   { npc: 'oldman', text: 'GANON AWAITS BEYOND\nTWO TRIFORCE PIECES.' },
  heart:  { npc: 'oldman', text: 'TAKE THIS, BRAVE ONE.', gift: 'heartContainer' },
  money:  { npc: 'oldman', text: "IT'S A SECRET\nTO EVERYBODY.", gift: 'rupees30' },
  shop:   { npc: 'merchant', text: 'BUY SOMETHIN, WILL YA!',
            shop: [ { item: 'bombs', price: 20 }, { item: 'key', price: 15 }, { item: 'heal', price: 10 } ] },
};

// ---------- dungeon room map templates ----------
// Every template keeps the door lanes reachable: the N/S doors sit on cols 7-8,
// the E/W doors on rows 4-5, and no pool ever seals a room off.
const RTPL = {
  plain: [
  '################','#..............#','#..............#','#..............#',
  '#..............#','#..............#','#..............#','#..............#',
  '#..............#','#..............#','################'],
  pillars: [ // keep cols 7-8 clear: that is the N/S door lane
  '################','#..............#','#..............#','#..b..b..b..b..#',
  '#..............#','#..............#','#..............#','#..b..b..b..b..#',
  '#..............#','#..............#','################'],
  water: [ // solid pool - a hollow ring would trap spawned walkers inside
  '################','#..............#','#..............#','#....wwwwww....#',
  '#....wwwwww....#','#....wwwwww....#','#....wwwwww....#','#..............#',
  '#..............#','#..............#','################'],
  blocks: [
  '################','#..............#','#..bb......bb..#','#..............#',
  '#......bb......#','#......bb......#','#..............#','#..bb......bb..#',
  '#..............#','#..............#','################'],
};

// doors: N,S,E,W -> 'open' | 'wall' | 'lock' | 'shut' (opens when cleared) | 'exit'
const DUNGEONS = {};                             // filled by generateWorld()

// items purchasable / gifts
const ITEM_INFO = {
  bombs:  { sprite: 'bomb',       name: 'BOMBS'  },
  key:    { sprite: 'key',        name: 'KEY'    },
  heal:   { sprite: 'heart',      name: 'LIFE'   },
  bow:    { sprite: 'bow',        name: 'BOW'    },
  ring:   { sprite: 'ring',       name: 'BLUE RING' },
  sword:  { sprite: 'sword_item', name: 'SWORD'  },
  triforce: { sprite: 'triforce', name: 'TRIFORCE' },
  heartContainer: { sprite: 'heart_container', name: 'HEART CONTAINER' },
  rupees30: { sprite: 'rupee_y',  name: 'RUPEES' },
  bombs4:   { sprite: 'bomb',     name: 'BOMBS'  },
};
