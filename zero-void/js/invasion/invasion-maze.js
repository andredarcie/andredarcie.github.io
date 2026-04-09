// ═══════════════════════════════════════════════════════════════
//  INVASION — Maze Rendering & State
// ═══════════════════════════════════════════════════════════════

let invMaze       = [];
let invDotsTotal  = 0;
let invDotsEaten  = 0;
let invPelletAnim = 0;

function initMaze() {
  invMaze      = MAZE_TEMPLATE.map(row => [...row]);
  invDotsTotal = 0;
  invDotsEaten = 0;
  for (let r = 0; r < INV_ROWS; r++)
    for (let c = 0; c < INV_COLS; c++) {
      let v = invMaze[r][c];
      if (v === 0 || v === 2) invDotsTotal++;
    }
}

function eatCell(col, row) {
  let v = invMaze[row][col];
  if (v === 0) { invMaze[row][col] = 4; invDotsEaten++; return 'dot'; }
  if (v === 2) { invMaze[row][col] = 4; invDotsEaten++; return 'pellet'; }
  return null;
}

function isWall(col, row) {
  if (col < 0 || col >= INV_COLS || row < 0 || row >= INV_ROWS) return true;
  return invMaze[row][col] === 1;
}

// ── Draw ──────────────────────────────────────────────────────
// Walls = white lines along corridor edges (no fills, no blocks).
// Matches the game's line-based visual language.

function drawMaze() {
  invPelletAnim += 0.08;

  let mazeW = INV_COLS * INV_CELL;
  let mazeH = INV_ROWS * INV_CELL;

  // ── Ship interior atmosphere ──────────────────────────────────

  // Faint blue-grey floor wash over entire maze area
  noStroke(); fill(10, 18, 32, 200);
  rect(INV_OX, INV_OY, mazeW, mazeH);

  // Subtle floor grid — tiny crosses at corridor intersections
  stroke(255, 12); strokeWeight(0.6);
  for (let r = 0; r <= INV_ROWS; r++) {
    for (let c = 0; c <= INV_COLS; c++) {
      let gx = INV_OX + c * INV_CELL;
      let gy = INV_OY + r * INV_CELL;
      line(gx - 3, gy, gx + 3, gy);
      line(gx, gy - 3, gx, gy + 3);
    }
  }

  // Metal panel lines on wall cells (horizontal stripes, alternating)
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (invMaze[r][c] !== 1) continue;
      let x = INV_OX + c * INV_CELL;
      let y = INV_OY + r * INV_CELL;
      // Panel fill — very dark with slight blue tint
      noStroke(); fill(6, 10, 20);
      rect(x, y, INV_CELL, INV_CELL);
      // Panel stripe — single centered horizontal line
      stroke(255, 18); strokeWeight(0.8);
      line(x + 4, y + INV_CELL / 2, x + INV_CELL - 4, y + INV_CELL / 2);
      // Rivet dots — corners
      noStroke(); fill(255, 22);
      ellipse(x + 5,             y + 5,              2.5, 2.5);
      ellipse(x + INV_CELL - 5,  y + 5,              2.5, 2.5);
      ellipse(x + 5,             y + INV_CELL - 5,   2.5, 2.5);
      ellipse(x + INV_CELL - 5,  y + INV_CELL - 5,   2.5, 2.5);
    }
  }

  // Subtle vignette — darkens maze edges
  noStroke();
  let vEdge = 28;
  for (let i = 0; i < vEdge; i++) {
    fill(0, map(i, 0, vEdge, 60, 0));
    rect(INV_OX + i, INV_OY, 1, mazeH);                     // left
    rect(INV_OX + mazeW - i - 1, INV_OY, 1, mazeH);         // right
    rect(INV_OX, INV_OY + i, mazeW, 1);                     // top
    rect(INV_OX, INV_OY + mazeH - i - 1, mazeW, 1);         // bottom
  }

  // ── Corridor cells ────────────────────────────────────────────

  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (invMaze[r][c] === 1) continue;

      let x  = INV_OX + c * INV_CELL;
      let y  = INV_OY + r * INV_CELL;
      let x2 = x + INV_CELL;
      let y2 = y + INV_CELL;
      let cx = x + INV_CELL / 2;
      let cy = y + INV_CELL / 2;

      // Wall borders adjacent to this corridor cell
      stroke(255, 70); strokeWeight(1.2);
      if (isWall(c, r - 1)) line(x, y,  x2, y);
      if (isWall(c, r + 1)) line(x, y2, x2, y2);
      if (isWall(c - 1, r)) line(x, y,  x,  y2);
      if (isWall(c + 1, r)) line(x2, y, x2, y2);

      // Dot
      if (invMaze[r][c] === 0) {
        noStroke(); fill(255, 170);
        ellipse(cx, cy, 4, 4);
      }

      // Power pellet
      if (invMaze[r][c] === 2) {
        let pulse = sin(invPelletAnim) * 0.5 + 0.5;
        noStroke(); fill(255, 160 + pulse * 95);
        ellipse(cx, cy, 7 + pulse * 3, 7 + pulse * 3);
        noFill(); stroke(255, 40 + pulse * 40); strokeWeight(0.8);
        ellipse(cx, cy, 18 + pulse * 5, 18 + pulse * 5);
      }
    }
  }
}
