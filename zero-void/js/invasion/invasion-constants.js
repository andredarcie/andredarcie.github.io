// ═══════════════════════════════════════════════════════════════
//  INVASION — Constants & Maze Definition
// ═══════════════════════════════════════════════════════════════

const INV_TOP_H    = H * 0.5;
const INV_BOTTOM_Y = INV_TOP_H;
const INV_BOTTOM_H = H - INV_BOTTOM_Y;
const INV_CELL = 26;
const INV_COLS = 11;
const INV_ROWS = 11;
const INV_HUD_H = 58;
const INV_OX   = (W - INV_COLS * INV_CELL) / 2;
const INV_OY   = INV_HUD_H + (INV_TOP_H - INV_HUD_H - INV_ROWS * INV_CELL) / 2;
const INV_SHIP_Y = INV_BOTTOM_Y + INV_BOTTOM_H - 74;
const INV_ROCK_MIN_X = 34;
const INV_ROCK_MAX_X = W - 34;
const INV_DIVIDER_Y  = INV_BOTTOM_Y;

// Cell values:
//   1 = wall
//   0 = dot
//   2 = power pellet
//   3 = alien spawn (no dot)
//   4 = empty corridor (dot already eaten or never had one)
const MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,0,1],
  [1,2,1,0,0,0,0,0,1,2,1],
  [1,0,1,0,1,0,1,0,1,0,1],
  [1,0,0,0,1,3,1,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1],
  [1,2,1,0,0,0,0,0,1,2,1],
  [1,0,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1],
];

const INV_PLAYER_START  = { col: 5, row: 9 };
const INV_ALIEN_SPAWN   = { col: 5, row: 5 };
const INV_BASE_ALIENS   = 3;   // scales up with wave
const INV_FRIGHTENED_DUR = 300; // frames

// ── Direction helper ──────────────────────────────────────────
function dirToDelta(d) {
  if (d === 'up')    return { dc:  0, dr: -1 };
  if (d === 'down')  return { dc:  0, dr:  1 };
  if (d === 'left')  return { dc: -1, dr:  0 };
  if (d === 'right') return { dc:  1, dr:  0 };
  return { dc: 0, dr: 0 };
}
