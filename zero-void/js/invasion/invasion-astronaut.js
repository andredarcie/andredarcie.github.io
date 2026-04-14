// ═══════════════════════════════════════════════════════════════
//  INVASION — Astronaut
// ═══════════════════════════════════════════════════════════════

let astCol, astRow;
let astX,   astY;
let astDir, astNextDir;
let astMoving, astProgress;
let astFacing;   // radians: 0=right, -PI/2=up, PI=left, PI/2=down
let astIframes;

const AST_SPEED = 0.08;

function initAstronaut() {
  astCol      = INV_PLAYER_START.col;
  astRow      = INV_PLAYER_START.row;
  astX        = INV_OX + astCol * INV_CELL + INV_CELL / 2;
  astY        = INV_OY + astRow * INV_CELL + INV_CELL / 2;
  astDir      = null;
  astNextDir  = null;
  astMoving   = false;
  astProgress = 0;
  astFacing   = -HALF_PI;
  astIframes  = 0;
}

function setAstDir(d) {
  astNextDir = d;
}

function tickAstronaut() {
  if (astIframes > 0) astIframes--;

  if (!astMoving) {
    for (let d of [astNextDir, astDir].filter(Boolean)) {
      let { dc, dr } = dirToDelta(d);
      if (!isWall(astCol + dc, astRow + dr)) {
        astDir      = d;
        astNextDir  = null;
        astMoving   = true;
        astProgress = 0;
        if (d === 'up')    astFacing = -HALF_PI;
        if (d === 'down')  astFacing =  HALF_PI;
        if (d === 'left')  astFacing =  PI;
        if (d === 'right') astFacing =  0;
        break;
      }
    }
  }

  if (astMoving) {
    astProgress += AST_SPEED;
    let { dc, dr } = dirToDelta(astDir);
    let sx = INV_OX + astCol * INV_CELL + INV_CELL / 2;
    let sy = INV_OY + astRow * INV_CELL + INV_CELL / 2;
    astX = lerp(sx, sx + dc * INV_CELL, min(astProgress, 1));
    astY = lerp(sy, sy + dr * INV_CELL, min(astProgress, 1));

    if (astProgress >= 1) {
      astCol   += dc;
      astRow   += dr;
      astX      = INV_OX + astCol * INV_CELL + INV_CELL / 2;
      astY      = INV_OY + astRow * INV_CELL + INV_CELL / 2;
      astMoving = false;

      sndAstStep();
      let eaten = eatCell(astCol, astRow);
      if (eaten === 'dot') {
        score += 5 * wave;
        sndDotEat();
      } else if (eaten === 'pellet') {
        score += 20 * wave;
        activateFrightened();
        shake(4, 6); flashAmt = 40;
        sndPelletEat();
      }
    }
  }

  drawAstronaut();
}

// ── Drawing ───────────────────────────────────────────────────
// Designed pointing RIGHT (angle 0). rotate(astFacing) handles direction.
// Style: same as ship — white strokes only, no fill.

function drawAstronaut() {
  if (astIframes > 0 && floor(astIframes / 5) % 2 === 0) return;

  push();
  translate(astX, astY);
  rotate(astFacing);

  let s = INV_CELL * 0.30;

  stroke(255); strokeWeight(1.5); noFill();

  // Helmet (large circle — most iconic astronaut element)
  ellipse(s * 0.22, 0, s * 0.85, s * 0.85);

  // Visor (rectangle on the front face of the helmet)
  stroke(255, 110); strokeWeight(1);
  fill(255, 14);
  rect(s * 0.42, -s * 0.16, s * 0.24, s * 0.32, 1);
  noFill();

  // Suit torso
  stroke(255); strokeWeight(1.4);
  line(-s * 0.44, -s * 0.24, -s * 0.44, s * 0.24); // back
  line(-s * 0.44, -s * 0.24,  s * 0.0,  -s * 0.24); // shoulder
  line(-s * 0.44,  s * 0.24,  s * 0.0,   s * 0.24); // hip
  line( s * 0.0,  -s * 0.24,  s * 0.0,   s * 0.24); // front of torso

  // Arms
  strokeWeight(1.2);
  line(-s * 0.36, -s * 0.24, -s * 0.54, -s * 0.44);
  line(-s * 0.36,  s * 0.24, -s * 0.54,  s * 0.44);

  // Legs
  line(-s * 0.16, s * 0.24, -s * 0.18, s * 0.56);
  line(-s * 0.30, s * 0.24, -s * 0.32, s * 0.56);
  // Boots
  strokeWeight(1.5);
  line(-s * 0.18, s * 0.56, -s * 0.04, s * 0.58);
  line(-s * 0.32, s * 0.56, -s * 0.46, s * 0.58);

  pop();
}

// Mini helmet icon — used in HUD lives display
function drawAstronautIcon(x, y, dim) {
  push(); translate(x, y);
  stroke(255, dim ? 55 : 210); strokeWeight(1.2); noFill();
  ellipse(0, 0, 12, 12);
  stroke(255, dim ? 30 : 100); strokeWeight(0.8);
  fill(255, dim ? 0 : 20);
  rect(2, -2, 5, 5, 1);
  pop();
}
