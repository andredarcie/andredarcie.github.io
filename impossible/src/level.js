export const TILE_SIZE = 32;
export const LEVEL_ROWS = 10;
export const LEVEL_COLS = 48;
export const GROUND_ROW = 8;

const GAP_RANGES = [
  [6, 7],
  [13, 15],
  [22, 23],
  [30, 32],
];

export function createLevel() {
  const solidTiles = new Set();

  for (let col = 0; col < LEVEL_COLS; col += 1) {
    const inGap = GAP_RANGES.some(([start, end]) => col >= start && col <= end);
    if (inGap) {
      continue;
    }

    for (let row = GROUND_ROW; row < LEVEL_ROWS; row += 1) {
      solidTiles.add(tileKey(col, row));
    }
  }

  return {
    rows: LEVEL_ROWS,
    cols: LEVEL_COLS,
    tileSize: TILE_SIZE,
    groundRow: GROUND_ROW,
    solidTiles,
    width: LEVEL_COLS * TILE_SIZE,
    height: LEVEL_ROWS * TILE_SIZE,
    goalX: (LEVEL_COLS - 1) * TILE_SIZE,
    gapRanges: GAP_RANGES.map(([start, end]) => ({
      startX: start * TILE_SIZE,
      endX: (end + 1) * TILE_SIZE,
      width: (end - start + 1) * TILE_SIZE,
    })),
  };
}

export function isSolidAt(level, col, row) {
  return level.solidTiles.has(tileKey(col, row));
}

function tileKey(col, row) {
  return `${col}:${row}`;
}
