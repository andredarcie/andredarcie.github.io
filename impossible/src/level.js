export const TILE_SIZE = 32;
export const LEVEL_ROWS = 10;
export const LEVEL_COLS = 84;
export const GROUND_ROW = 8;

const MIN_START_PADDING = 6;
const MIN_END_PADDING = 5;
const MIN_GAP_WIDTH = 1;
const MAX_GAP_WIDTH = 4;
const MIN_SAFE_SPACING = 4;
const MAX_SAFE_SPACING = 8;
const MIN_GAPS = 7;
const MAX_GAPS = 11;

export function createLevel(seed = randomSeed()) {
  const rng = createMulberry32(seed);
  const gapColumns = createRandomGapColumns(rng);
  const solidTiles = new Set();

  for (let col = 0; col < LEVEL_COLS; col += 1) {
    const inGap = gapColumns.some(([start, end]) => col >= start && col <= end);
    if (inGap) {
      continue;
    }

    for (let row = GROUND_ROW; row < LEVEL_ROWS; row += 1) {
      solidTiles.add(tileKey(col, row));
    }
  }

  return {
    seed,
    rows: LEVEL_ROWS,
    cols: LEVEL_COLS,
    tileSize: TILE_SIZE,
    groundRow: GROUND_ROW,
    solidTiles,
    width: LEVEL_COLS * TILE_SIZE,
    height: LEVEL_ROWS * TILE_SIZE,
    goalX: (LEVEL_COLS - 1) * TILE_SIZE,
    gapRanges: gapColumns.map(([start, end]) => ({
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

function createRandomGapColumns(rng) {
  const gapColumns = [];
  const targetGaps = randomInt(rng, MIN_GAPS, MAX_GAPS);
  let cursor = MIN_START_PADDING;

  while (gapColumns.length < targetGaps) {
    cursor += randomInt(rng, MIN_SAFE_SPACING, MAX_SAFE_SPACING);
    const width = randomInt(rng, MIN_GAP_WIDTH, MAX_GAP_WIDTH);
    const end = cursor + width - 1;

    if (end >= LEVEL_COLS - MIN_END_PADDING) {
      break;
    }

    gapColumns.push([cursor, end]);
    cursor = end;
  }

  if (gapColumns.length < MIN_GAPS) {
    return [
      [6, 7],
      [13, 15],
      [22, 23],
      [30, 32],
      [39, 41],
      [49, 50],
      [60, 63],
    ];
  }

  return gapColumns;
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

function createMulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
