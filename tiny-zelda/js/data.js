// Tiny Zelda — world data: overworld screens, caves, dungeons
// Tile legend: . ground  s sand  # rock  T tree  W water  B bridge
//              C cave  D dungeon door  X hidden bombable cave  b block  w dwater
'use strict';

const OW_W = 8, OW_H = 4;
const START_SCREEN = { x: 2, y: 3 };
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

const OVERWORLD = {};
function S(x, y, meta, rows) { OVERWORLD[x + ',' + y] = Object.assign({ map: normMap(rows) }, meta); }

// ---------- row 0 (north / Death Mountain) ----------
S(0, 0, { enemies: ['tektite','tektite','tektite'], secret: 'money' }, [
'################','################','##X..........###','##...........###',
'##..............','##..............','##..............','##...........###',
'##...........###','################','################']);

S(1, 0, { enemies: ['tektite','tektite','octorok_b'], dungeon: 3 }, [
'################','################','#####..D...#####','#####......#####',
'................','................','................','####........####',
'#####......#####','######....######','######....######']);

S(2, 0, { enemies: ['tektite','tektite','tektite'] }, [
'################','################','###..........###','###...####...###',
'................','................','................','###...####...###',
'###..........###','######....######','######....######']);

S(3, 0, { enemies: ['octorok_b','octorok_b','tektite'] }, [
'################','################','##..#......#..##','##..#..##..#..##',
'................','................','................','##....####....##',
'##............##','######....######','######....######']);

S(4, 0, { enemies: ['tektite','tektite','octorok_b','octorok_b'] }, [
'################','################','####........####','##....####....##',
'................','................','................','##....####....##',
'####........####','################','################']);

S(5, 0, { enemies: ['tektite','tektite','tektite'] }, [
'################','################','###..###..##.###','###..........###',
'................','................','................','###..##..##..###',
'###..........###','################','################']);

S(6, 0, { enemies: ['octorok_b','octorok_b'], dungeon: 2 }, [
'################','################','#####..D...#####','#####......#####',
'..............##','..............##','..............##','####........####',
'#####......#####','######....######','######....######']);

S(7, 0, { enemies: ['tektite','tektite'], secret: 'money' }, [
'################','################','####....X...####','####........####',
'####........####','####........####','####........####','####........####',
'#####......#####','######....######','######....######']);

// ---------- row 1 ----------
S(0, 1, { enemies: ['tektite','tektite','octorok'] }, [
'################','################','##...#....#...##','##............##',
'##..............','##..............','##..............','##............##',
'##............##','######....######','######....######']);

S(1, 1, { enemies: ['octorok_b','octorok_b','moblin'] }, [
'######....######','######....######','###..........###','###....##.....##',
'................','................','................','###...........##',
'###...........##','######....######','######....######']);

S(2, 1, { enemies: ['octorok','octorok','octorok'] }, [
'######....######','######....######','##.....T......##','##............##',
'................','................','................','##.....#......##',
'##............##','######....######','######....######']);

S(3, 1, { enemies: ['octorok','octorok','tektite'] }, [
'######....######','######....######','##............##','##.....WW.....##',
'.......WW.......','.......BB.......','.......WW.......','##.....WW.....##',
'##.....WW.....##','######.WW.######','######.WW.######']);

S(4, 1, { enemies: ['octorok_b','octorok_b','tektite'] }, [
'################','################','##..##....##..##','##............##',
'................','................','................','##............##',
'##..##....##..##','######....######','######....######']);

S(5, 1, { enemies: ['moblin','moblin','moblin'] }, [
'################','################','#T..T..T..T..T.#','#.T..T..T..T...#',
'................','................','................','#.T..T..T..T...#',
'#..T..T..T..T..#','#TTTTTTTTTTTTTT#','TTTTTTTTTTTTTTTT']);

S(6, 1, { enemies: ['moblin','moblin'], cave: 'heart' }, [
'######....######','######....######','###..C........##','###...........##',
'................','................','................','###...........##',
'###...........##','######....######','######....######']);

S(7, 1, { enemies: ['tektite','tektite','octorok_b'] }, [
'######....######','######....######','####........####','####........####',
'..............##','..............##','..............##','####........####',
'####........####','######....######','######....######']);

// ---------- row 2 ----------
S(0, 2, { enemies: ['moblin','moblin','moblin'] }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','TT....T.....TTTT','TT..........TTTT',
'TT..............','TT..............','TT..............','TT.....T....TTTT',
'TT..........TTTT','TTTTTT....TTTTTT','TTTTTT....TTTTTT']);

S(1, 2, { enemies: ['moblin','moblin'], cave: 'hint' }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','TT..TTC.....TTTT','TT..........TTTT',
'................','................','................','TT...T...T..TTTT',
'TT..........TTTT','TTTTTT....TTTTTT','TTTTTT....TTTTTT']);

S(2, 2, { enemies: ['octorok','octorok','octorok'] }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','T..T........T..T','T..............T',
'................','................','................','T....T....T....T',
'T..............T','TTTTTT....TTTTTT','TTTTTT....TTTTTT']);

S(3, 2, { enemies: ['octorok','octorok','moblin'] }, [
'TTTTTT.WW.TTTTTT','TTTTTT.WW.TTTTTT','TT.....WW.....TT','TT.....WW.....TT',
'.......WW.......','.......BB.......','.......WW.......','TT.....WW.....TT',
'TT.....WW.....TT','TTTTTT.WW.TTTTTT','TTTTTT.WW.TTTTTT']);

S(4, 2, { enemies: ['octorok','octorok'] }, [
'######....######','######....######','##..........WWWW','##.........WWWWW',
'...........WWWWW','...........BBBBB','...........WWWWW','##.........WWWWW',
'##..........WWWW','######....WWWWWW','######....WWWWWW']);

S(5, 2, { enemies: [], dungeon: 1 }, [
'WWWWWWWWWWWWWWWW','WWWWWWWWWWWWWWWW','WWWWW......WWWWW','WWWWW..D...WWWWW',
'WWWWW......WWWWW','BBBBB......WWWWW','WWWWW......WWWWW','WWWWW......WWWWW',
'WWWWWWWWWWWWWWWW','WWWWWWWWWWWWWWWW','WWWWWWWWWWWWWWWW']);

S(6, 2, { enemies: ['octorok','octorok','moblin'] }, [
'######....######','######....######','WWWWW.........##','WWWWW.........##',
'WWWWW...........','WWWWW...........','WWWWW...........','WWWWW.........##',
'WWWWW.........##','WWWWWW....######','WWWWWW....######']);

S(7, 2, { enemies: ['moblin','moblin','moblin'] }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','TT....T......TTT','TT...........TTT',
'..............TT','..............TT','..............TT','TT...T....T..TTT',
'TT...........TTT','TTTTTT....TTTTTT','TTTTTT....TTTTTT']);

// ---------- row 3 (south) ----------
S(0, 3, { enemies: ['octorok','octorok'], secret: 'money' }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','##X..........ssT','##...........ssT',
'##..............','##..............','##..............','##..........sssT',
'ss..........sssT','sssssssssssssssT','WWWWWWWWWWWWWWWW']);

S(1, 3, { enemies: ['octorok','octorok','octorok'] }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','T...T....T.....T','T..............T',
'................','................','................','T....T....T....T',
'T..............T','TTTTTTTTTTTTTTTT','TTTTTTTTTTTTTTTT']);

S(2, 3, { enemies: [], cave: 'sword' }, [
'######....######','####........####','###C.........###','##............##',
'................','................','................','##............##',
'###..........###','####........####','################']);

S(3, 3, { enemies: ['octorok','octorok','tektite'] }, [
'TTTTTT.WW.TTTTTT','TTTTTT.WW.TTTTTT','TT....WWWW....TT','TT...WWWWWW...TT',
'.....WWWWWW.....','.....WWWWWW.....','......WWWW......','TT............TT',
'TT............TT','TTTTTTTTTTTTTTTT','TTTTTTTTTTTTTTTT']);

S(4, 3, { enemies: ['octorok','octorok','octorok'] }, [
'######....WWWWWW','######....WWWWWW','##.........WWWWW','##..........WWWW',
'................','................','................','##..............',
'##..............','Tsssssssssssssss','WWWWWWWWWWWWWWWW']);

S(5, 3, { enemies: ['octorok','octorok','moblin'] }, [
'WWWWWWWWWWWWWWWW','WWWWWWWWWWWWWWWW','WWWWWWWWWWWWWWWW','W....WWWWWW....W',
'................','................','................','....T......T....',
'................','ssssssssssssssss','WWWWWWWWWWWWWWWW']);

S(6, 3, { enemies: ['octorok','octorok','octorok'] }, [
'WWWWWW....######','WWWWWW....######','WWWW.........TTT','WW...........TTT',
'................','................','................','....T.....T..TTT',
'...............T','ssssssssssssssss','WWWWWWWWWWWWWWWW']);

S(7, 3, { enemies: ['moblin','moblin'], cave: 'shop' }, [
'TTTTTT....TTTTTT','TTTTTT....TTTTTT','TT.....##C....TT','TT............TT',
'..............TT','..............TT','..............TT','TT....T.......TT',
'TT............TT','ssssssssssssssss','WWWWWWWWWWWWWWWW']);

// ---------- caves ----------
const CAVES = {
  sword:  { npc: 'oldman', text: "IT'S DANGEROUS TO GO\nALONE! TAKE THIS.", gift: 'sword' },
  hint:   { npc: 'oldman', text: 'THE TRIFORCE SLEEPS ON\nTHE ISLE IN THE LAKE.' },
  heart:  { npc: 'oldman', text: 'TAKE THIS, BRAVE ONE.', gift: 'heartContainer' },
  money:  { npc: 'oldman', text: "IT'S A SECRET\nTO EVERYBODY.", gift: 'rupees30' },
  shop:   { npc: 'merchant', text: 'BUY SOMETHIN, WILL YA!',
            shop: [ { item: 'bombs', price: 20 }, { item: 'key', price: 15 }, { item: 'heal', price: 10 } ] },
};

// ---------- dungeon room map templates ----------
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

// doors: N,S,E,W -> 'open' | 'wall' | 'lock' | 'shut' (opens when room cleared)
const DUNGEONS = {
  1: { name: 'LEVEL-1', entry: '2,3', rooms: {
    '2,3': { tpl: 'plain',   doors: { N: 'open', S: 'exit' }, enemies: [] },
    '2,2': { tpl: 'pillars', doors: { N: 'lock', S: 'open', E: 'open', W: 'open' },
             enemies: ['stalfos','stalfos','stalfos'] },
    '1,2': { tpl: 'blocks',  doors: { E: 'open' }, enemies: ['keese','keese','keese','keese'], drop: 'key' },
    '3,2': { tpl: 'water',   doors: { W: 'open' }, enemies: ['zol','zol','zol','zol'], drop: 'key' },
    '2,1': { tpl: 'plain',   doors: { S: 'open', N: 'lock', W: 'open' },
             enemies: ['stalfos','stalfos','keese','keese'] },
    '1,1': { tpl: 'pillars', doors: { E: 'open' }, enemies: ['zol','zol','zol'], item: 'bow' },
    '2,0': { tpl: 'plain',   doors: { S: 'open' }, boss: 'aquamentus', item: 'triforce' },
  }},
  2: { name: 'LEVEL-2', entry: '2,3', rooms: {
    '2,3': { tpl: 'plain',   doors: { N: 'open', S: 'exit' }, enemies: [] },
    '2,2': { tpl: 'blocks',  doors: { N: 'lock', S: 'open', E: 'open', W: 'open' },
             enemies: ['zol','zol','zol','zol','zol'] },
    '1,2': { tpl: 'water',   doors: { E: 'open' }, enemies: ['keese','keese','keese','keese','keese'], drop: 'key' },
    '3,2': { tpl: 'pillars', doors: { W: 'open' }, enemies: ['stalfos','stalfos','stalfos'], item: 'ring' },
    '2,1': { tpl: 'pillars', doors: { S: 'open', N: 'lock', W: 'open' },
             enemies: ['stalfos_b','stalfos_b','keese','keese'], drop: 'key' },
    '1,1': { tpl: 'plain',   doors: { E: 'open' }, npc: 'oldman',
             text: 'DODONGO DISLIKES SMOKE.\nTAKE THESE.', gift: 'bombs4' },
    '2,0': { tpl: 'plain',   doors: { S: 'open' }, boss: 'dodongo', item: 'triforce' },
  }},
  3: { name: 'LEVEL-9', entry: '2,3', rooms: {
    '2,3': { tpl: 'plain',   doors: { N: 'open', S: 'exit' }, enemies: [] },
    '2,2': { tpl: 'blocks',  doors: { N: 'shut', S: 'open', W: 'open' },
             enemies: ['stalfos_b','stalfos_b','stalfos_b','keese','keese'] },
    '1,2': { tpl: 'water',   doors: { E: 'open' }, npc: 'oldman',
             text: 'DESTROY GANON AND\nSAVE PRINCESS ZELDA!' },
    '2,1': { tpl: 'pillars', doors: { S: 'open', N: 'shut' },
             enemies: ['keese','keese','keese','zol','zol','stalfos_b'] },
    '2,0': { tpl: 'plain',   doors: { S: 'open' }, boss: 'ganon' },
  }},
};

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
