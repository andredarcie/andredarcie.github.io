// Tiny Zelda — pixel sprites (char grids) + tile renderer
'use strict';

const PAL = {
  G: '#80D010', // link green
  S: '#FC9838', // skin
  B: '#503000', // brown
  D: '#181818', // near black
  W: '#FCFCFC', // white
  R: '#D82800', // red
  r: '#FC7460', // light red
  O: '#E45C10', // orange
  U: '#0058F8', // blue
  u: '#3CBCFC', // light blue
  Y: '#FCB040', // gold
  y: '#FCE4A0', // pale sand
  g: '#00A800', // green
  d: '#005800', // dark green
  K: '#787878', // gray
  k: '#404040', // dark gray
  P: '#6844FC', // purple
};

const SPRITES = {
link_down: [
'......GGGG......',
'.....GGGGGG.....',
'.....GGGGGG.....',
'....SSSSSSSS....',
'....SDSSSSDS....',
'....SSSSSSSS....',
'.....SSSSSS.....',
'....GGGGGGGG....',
'...SGGGGGGGGS...',
'...SGGGYYGGGS...',
'...SGGGGGGGGS...',
'....GGGGGGGG....',
'....BGGGGGGB....',
'....BBGGGGBB....',
'....BBB..BBB....',
'...BBB....BBB...'],
link_down2: [
'................',
'......GGGG......',
'.....GGGGGG.....',
'.....GGGGGG.....',
'....SSSSSSSS....',
'....SDSSSSDS....',
'....SSSSSSSS....',
'.....SSSSSS.....',
'....GGGGGGGG....',
'...SGGGGGGGGS...',
'...SGGGYYGGGS...',
'....GGGGGGGG....',
'....BGGGGGGB....',
'....BBGGGGBB....',
'...BBB.....BB...',
'..........BBB...'],
link_up: [
'......GGGG......',
'.....GGGGGG.....',
'.....GGGGGG.....',
'....BBBBBBBB....',
'....BBBBBBBB....',
'....BBBBBBBB....',
'.....BBBBBB.....',
'....GGGGGGGG....',
'...SGGGGGGGGS...',
'...SGGGGGGGGS...',
'...SGGGGGGGGS...',
'....GGGGGGGG....',
'....BGGGGGGB....',
'....BBGGGGBB....',
'....BBB..BBB....',
'...BBB....BBB...'],
link_up2: [
'................',
'......GGGG......',
'.....GGGGGG.....',
'.....GGGGGG.....',
'....BBBBBBBB....',
'....BBBBBBBB....',
'....BBBBBBBB....',
'.....BBBBBB.....',
'....GGGGGGGG....',
'...SGGGGGGGGS...',
'...SGGGGGGGGS...',
'....GGGGGGGG....',
'....BGGGGGGB....',
'....BBGGGGBB....',
'...BB.....BBB...',
'...BBB..........'],
link_right: [
'......GGGG......',
'.....GGGGGG.....',
'.....GGGGGG.....',
'.....SSSSSSS....',
'.....SSSSDSS....',
'.....SSSSSSS....',
'......SSSSS.....',
'.....GGGGGGG....',
'.....GGGGGGS....',
'.....GGGYGGS....',
'.....GGGGGGG....',
'.....BGGGGB.....',
'.....BBGGBB.....',
'.....BBB.BB.....',
'.....BB..BBB....',
'....BBB.........'],
link_right2: [
'................',
'......GGGG......',
'.....GGGGGG.....',
'.....GGGGGG.....',
'.....SSSSSSS....',
'.....SSSSDSS....',
'.....SSSSSSS....',
'......SSSSS.....',
'.....GGGGGGG....',
'.....GGGGGGS....',
'.....GGGYGGS....',
'.....BGGGGB.....',
'.....BBGGBB.....',
'......BBBB......',
'.....BBBBB......',
'......B..BB.....'],
octorok: [
'................',
'.....RRRRRR.....',
'....RRRRRRRR....',
'...RRWWRRWWRR...',
'...RRWDRRWDRR...',
'...RRRRRRRRRR...',
'...rRRRRRRRRr...',
'....RRRRRRRR....',
'.....RRRRRR.....',
'...RRR.RR.RRR...',
'...RR..RR..RR...',
'...R...RR...R...',
'.......RR.......',
'.......rr.......',
'................',
'................'],
moblin: [
'................',
'.....BBBBBB.....',
'....BBBBBBBB....',
'....BWWBBWWB....',
'....BBBBBBBB....',
'.....BSSSSB.....',
'......SSSS......',
'....RRRRRRRR....',
'...RRRRRRRRRR...',
'...RSRRRRRRSR...',
'...RRRRRRRRRR...',
'....RRRRRRRR....',
'.....RRRRRR.....',
'....BB....BB....',
'....BB....BB....',
'...BBB....BBB...'],
tektite: [
'................',
'................',
'................',
'.....UUUUUU.....',
'....UUUUUUUU....',
'....UWDUUDWU....',
'....UUUUUUUU....',
'...U.UUUUUU.U...',
'..UU..UUUU..UU..',
'.UU....UU....UU.',
'.U.....UU.....U.',
'UU....U..U....UU',
'......U..U......',
'.....UU..UU.....',
'................',
'................'],
keese1: [
'................',
'................',
'................',
'................',
'................',
'..k..........k..',
'.kkk........kkk.',
'..kkk..kk..kkk..',
'...kkkkkkkkkk...',
'....kkRkkRkk....',
'.....kkkkkk.....',
'......k..k......',
'................',
'................',
'................',
'................'],
keese2: [
'................',
'................',
'................',
'.kk..........kk.',
'..kk........kk..',
'...kk......kk...',
'...kkk.kk.kkk...',
'....kkkkkkkk....',
'....kkRkkRkk....',
'.....kkkkkk.....',
'......k..k......',
'................',
'................',
'................',
'................',
'................'],
stalfos: [
'.....WWWWWW.....',
'....WWWWWWWW....',
'....WDDWWDDW....',
'....WWWWWWWW....',
'.....W.WW.W.....',
'......WWWW......',
'....W..WW..W....',
'....WWWWWWWW....',
'....W.WWWW.W....',
'......WWWW......',
'....WWWWWWWW....',
'......WWWW......',
'.....WW..WW.....',
'.....W....W.....',
'.....W....W.....',
'....WW....WW....'],
zol: [
'................',
'................',
'................',
'................',
'................',
'................',
'................',
'......gggg......',
'.....gggggg.....',
'....gggggggg....',
'....ggDggDgg....',
'....gggggggg....',
'...gggggggggg...',
'...gggggggggg...',
'................',
'................'],
oldman: [
'.....SSSSSS.....',
'....SSSSSSSS....',
'....SDSSSSDS....',
'....WSSSSSSW....',
'....WWSSSSWW....',
'....WWWWWWWW....',
'.....WWWWWW.....',
'....RRRWWRRR....',
'...RRRRWWRRRR...',
'...RRRRRRRRRR...',
'...RRRRRRRRRR...',
'...RRRRRRRRRR...',
'...RRRRRRRRRR...',
'....RRRRRRRR....',
'....RRRRRRRR....',
'....RR....RR....'],
zelda: [
'.....YYYYYY.....',
'....YSSSSSSY....',
'....YSDSSDSY....',
'....YSSSSSSY....',
'.....SSSSSS.....',
'....WWWWWWWW....',
'...WWRWWWWRWW...',
'...WWWWWWWWWW...',
'..SWWWWWWWWWWS..',
'...WWWRRRRWWW...',
'...WWWWWWWWWW...',
'...WWWWWWWWWW...',
'..WWWWWWWWWWWW..',
'..WWWWWWWWWWWW..',
'.WWWWWWWWWWWWWW.',
'................'],
fire1: [
'................',
'................',
'................',
'.......R........',
'....R..RR..R....',
'....RR.RRR.R....',
'...RRRRRRRRR....',
'...RRYRRYRRRR...',
'..RRYYYRYYRRR...',
'..RYYYYYYYYRR...',
'..RRYYYYYYYRR...',
'...RRYYYYYRRR...',
'...RRRRRRRRR....',
'................',
'................',
'................'],
fire2: [
'................',
'................',
'................',
'.........R......',
'...R..RR..R.....',
'...R.RRR.RR.....',
'....RRRRRRRRR...',
'...RRRYRRYRRR...',
'...RRYYRYYYRR...',
'..RRYYYYYYYYR...',
'..RRYYYYYYYRR...',
'...RRRYYYYRRR...',
'....RRRRRRRR....',
'................',
'................',
'................'],
heart: [
'.RR.RR..',
'RRRRRRRR',
'RRRRRRRR',
'RRRRRRRR',
'.RRRRRR.',
'..RRRR..',
'...RR...',
'........'],
heart_container: [
'..RR..RR..',
'.RRRR.RRRR',
'RRRRRRRRRR',
'RRWRRRRRRR',
'RRRRRRRRRR',
'.RRRRRRRR.',
'..RRRRRR..',
'...RRRR...',
'....RR....',
'..........'],
rupee: [
'...UU...',
'..UuUU..',
'.UuUUUU.',
'.UUUUUU.',
'.UUUUUU.',
'.UUUUUU.',
'..UUUU..',
'...UU...'],
rupee_y: [
'...YY...',
'..YyYY..',
'.YyYYYY.',
'.YYYYYY.',
'.YYYYYY.',
'.YYYYYY.',
'..YYYY..',
'...YY...'],
key: [
'..YYY...',
'.YY.YY..',
'.YY.YY..',
'..YYY...',
'...Y....',
'...YY...',
'...Y....',
'...YY...'],
bomb: [
'....kW..',
'...k....',
'..UUUU..',
'.UUWUUU.',
'.UWUUUU.',
'.UUUUUU.',
'..UUUU..',
'........'],
bow: [
'..BB....',
'.B..B...',
'.B...B..',
'.B...B..',
'.B...B..',
'.B...B..',
'.B..B...',
'..BB....'],
arrow_item: [
'...YY...',
'..YYYY..',
'...WW...',
'...WW...',
'...WW...',
'...WW...',
'..B..B..',
'...WW...'],
ring: [
'........',
'..UUUU..',
'.UU..UU.',
'.U....U.',
'.U....U.',
'.UU..UU.',
'..UUUU..',
'........'],
triforce: [
'...YY...',
'...YY...',
'..YYYY..',
'..YYYY..',
'.YY..YY.',
'.YYYYYY.',
'YYYYYYYY',
'YYYYYYYY'],
sword_item: [
'...WW...',
'...WW...',
'...WW...',
'...WW...',
'.YYWWYY.',
'...YY...',
'...YY...',
'...YY...'],
fairy: [
'........',
'.W.uu.W.',
'.WWuuWW.',
'..WuuWW.',
'..SuuSS.',
'...uu...',
'..W..W..',
'........'],
aquamentus: [
'..........YY............',
'.........YYY............',
'....dd..gggg............',
'...dddd.gggggg..........',
'...ddddgggggggg.........',
'....ddgggWDggggg........',
'..gggggggggggggg........',
'.gggggggggggggggg.......',
'.Rr.ggggggggggggggg.....',
'.RRr.ggggggggggggggg....',
'..RR..gggggggggggggg....',
'.......ggggggggggggggg..',
'......gggggggggggggggg..',
'.....ggggggdddgggggggg..',
'.....gggggdddddgggggg...',
'.....ggggdddddddggggg...',
'......gggddddddddgggg...',
'......ggddddddddddggg...',
'.....gggddddddddddggg...',
'....gggg.dddddddd.ggg...',
'....ggg...dddddd...gg...',
'....gg....dd..dd........',
'....g....ddd..ddd.......',
'.........dd....dd.......'],
dodongo: [
'................................',
'....KKKK........................',
'...KKKKKK.......................',
'..KKWDKKKKKKKKKKKKKKKK..........',
'..KKKKKKKKKKKKKKKKKKKKKK........',
'.KKKKKKKKKKKKKKKKKKKKKKKK.......',
'.KKkKKKKKKKKKKKKKKKKKKKKKK......',
'KKKkkKKKKKKKKKKKKKKKKKKKKKK.....',
'KKKKKKKKKKKKKKKKKKKKKKKKKKK.....',
'.KKKKKKKKKKKKKKKKKKKKKKKKK......',
'..KKKKKKKKKKKKKKKKKKKKKK........',
'...KKK...KKKK...KKKK...KK.......',
'...KK.....KK.....KK.....K.......',
'..KKK....KKK....KKK....KK.......',
'................................',
'................................'],
ganon: [
'.....UU..........UU.....',
'....UUUU........UUUU....',
'....UUUUU......UUUUU....',
'.....UUUUUUUUUUUUUU.....',
'......UUUUUUUUUUUU......',
'.....UUWWUUUUUUWWUU.....',
'.....UURWUUUUUURWUU.....',
'.....UUUUUUUUUUUUUU.....',
'......UUSSUUUUSSUU......',
'......UUUSSSSSSUUU......',
'.......UUUWWWWUUU.......',
'....U.UUUUUUUUUUUU.U....',
'...UUUUUUUUUUUUUUUUUU...',
'..UUU.UUUUUUUUUUUU.UUU..',
'..UU..UUUUUUUUUUUU..UU..',
'..U...UUUUUUUUUUUU...U..',
'......UUUUUUUUUUUU......',
'.......UUUUUUUUUU.......',
'......UUUU....UUUU......',
'......UUU......UUU......',
'.....UUUU......UUUU.....',
'.....UUU........UUU.....',
'....UUUU........UUUU....',
'........................'],
};

// ---- sprite cache & drawing ----
const spriteCache = new Map();

function buildSprite(name, flip, remap) {
  const grid = SPRITES[name];
  const h = grid.length, w = grid[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ch = grid[y][x];
      if (ch === '.' || ch === ' ') continue;
      if (remap && remap[ch]) ch = remap[ch];
      c.fillStyle = PAL[ch] || '#FF00FF';
      c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  }
  return cv;
}

function drawSprite(ctx, name, x, y, opts = {}) {
  if (!SPRITES[name]) {
    if (!spriteCache.has('warn|' + name)) { console.warn('unknown sprite: ' + name); spriteCache.set('warn|' + name, true); }
    return;
  }
  const key = name + '|' + (opts.flip ? 1 : 0) + '|' + (opts.remap ? JSON.stringify(opts.remap) : '');
  let cv = spriteCache.get(key);
  if (!cv) { cv = buildSprite(name, opts.flip, opts.remap); spriteCache.set(key, cv); }
  ctx.drawImage(cv, Math.round(x), Math.round(y));
  return cv;
}

// ---- tiles (procedural, 16x16) ----
const TILE = 16;
const OW_COLORS = {
  ground: '#FCD8A8', groundDot: '#E8B080',
  sand: '#FCE4A0',
  rock: '#C84C0C', rockDark: '#7C2C00',
  tree: '#00A800', treeDark: '#005800',
  water: '#2038EC', waterLight: '#3CBCFC',
  bridge: '#B87850',
};

function drawTile(ctx, ch, px, py, frame, env) {
  const C = OW_COLORS;
  const dungeon = env === 'dungeon';
  switch (ch) {
    case '.': // ground / dungeon floor
      ctx.fillStyle = dungeon ? '#FCD8A8' : C.ground;
      ctx.fillRect(px, py, TILE, TILE);
      if (!dungeon) {
        ctx.fillStyle = C.groundDot;
        ctx.fillRect(px + 3, py + 4, 2, 2); ctx.fillRect(px + 11, py + 10, 2, 2);
      }
      break;
    case 's': // sand
      ctx.fillStyle = C.sand; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#E8B080'; ctx.fillRect(px + 5, py + 7, 2, 2); ctx.fillRect(px + 12, py + 3, 2, 2);
      break;
    case '#': // rock / dungeon wall
      if (dungeon) {
        ctx.fillStyle = '#0058F8'; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#00287C';
        ctx.fillRect(px, py + 14, TILE, 2); ctx.fillRect(px + 14, py, 2, TILE);
        ctx.fillStyle = '#3CBCFC'; ctx.fillRect(px, py, TILE, 2); ctx.fillRect(px, py, 2, TILE);
      } else {
        ctx.fillStyle = C.rock; ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = C.rockDark;
        ctx.beginPath();
        ctx.moveTo(px, py + 16); ctx.lineTo(px + 8, py + 4); ctx.lineTo(px + 16, py + 16);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FC9838';
        ctx.fillRect(px + 6, py + 6, 3, 2);
      }
      break;
    case 'T': // tree
      ctx.fillStyle = C.ground; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = C.treeDark;
      ctx.fillRect(px + 2, py + 2, 12, 10);
      ctx.fillStyle = C.tree;
      ctx.fillRect(px + 4, py + 1, 8, 3); ctx.fillRect(px + 2, py + 4, 5, 5); ctx.fillRect(px + 9, py + 4, 5, 5);
      ctx.fillStyle = '#503000';
      ctx.fillRect(px + 6, py + 11, 4, 5);
      break;
    case 'W': { // water (animated)
      ctx.fillStyle = C.water; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = C.waterLight;
      const o = (frame >> 4) % 2 ? 0 : 4;
      ctx.fillRect(px + 1 + o, py + 3, 5, 1); ctx.fillRect(px + 8 - o + 2, py + 10, 5, 1);
      break;
    }
    case 'B': // bridge
      ctx.fillStyle = C.bridge; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#7C4800';
      for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 4 + 3, TILE, 1);
      break;
    case 'C': case 'D': case 'X': // cave/dungeon mouth in rock (X = hidden bombable, looks like rock)
      drawTile(ctx, '#', px, py, frame, env);
      if (ch !== 'X') {
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 4, py + 6, 8, 10);
      }
      break;
    case 'O': // dungeon entrance opening in rock face (walk-in, black)
      ctx.fillStyle = '#000'; ctx.fillRect(px, py, TILE, TILE);
      break;
    case 'b': // dungeon block (pushable-looking solid)
      ctx.fillStyle = '#0058F8'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#3CBCFC'; ctx.fillRect(px + 2, py + 2, 12, 12);
      ctx.fillStyle = '#0058F8'; ctx.fillRect(px + 4, py + 4, 8, 8);
      break;
    case 'w': // dungeon water
      ctx.fillStyle = '#0000A8'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#2038EC'; ctx.fillRect(px + ((frame >> 4) % 2 ? 2 : 8), py + 6, 5, 1);
      break;
    case '_': // black (cave floor)
      ctx.fillStyle = '#000'; ctx.fillRect(px, py, TILE, TILE);
      break;
    case '=': // stairs down
      ctx.fillStyle = '#000'; ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#787878';
      for (let i = 0; i < 4; i++) ctx.fillRect(px + 2, py + 2 + i * 4, 12, 2);
      break;
    default:
      ctx.fillStyle = '#FF00FF'; ctx.fillRect(px, py, TILE, TILE);
  }
}

// ---- tiny text ----
function drawText(ctx, str, x, y, color = '#FCFCFC') {
  ctx.save();
  ctx.font = '8px "Courier New", monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) ctx.fillText(str[i], x + i * 8 + 1, y);
  ctx.restore();
}
