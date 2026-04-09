// ═══════════════════════════════════════════════════════════════
//  INVASION — Aliens
// ═══════════════════════════════════════════════════════════════

let invAliens        = [];
let frightenedTimer  = 0;
let frightenedActive = false;

const INV_ALL_DIRS = ['up', 'down', 'left', 'right'];

function initAliens() {
  invAliens        = [];
  frightenedTimer  = 0;
  frightenedActive = false;

  let count = 3;

  let spawnOffsets = [
    { dc: 0, dr:  0 },
    { dc: 0, dr: -1 },
    { dc: 0, dr:  1 },
    { dc: 0, dr: -2 },
    { dc: 0, dr:  2 },
  ];

  for (let i = 0; i < count; i++) {
    let o  = spawnOffsets[i];
    let sc = INV_ALIEN_SPAWN.col + o.dc;
    let sr = INV_ALIEN_SPAWN.row + o.dr;
    if (isWall(sc, sr)) { sc = INV_ALIEN_SPAWN.col; sr = INV_ALIEN_SPAWN.row; }

    invAliens.push({
      col:       sc,
      row:       sr,
      x:         INV_OX + sc * INV_CELL + INV_CELL / 2,
      y:         INV_OY + sr * INV_CELL + INV_CELL / 2,
      dir:       INV_ALL_DIRS[floor(random(4))],
      moving:    false,
      progress:  0,
      speed:     0.052 + i * 0.007 + wave * 0.004,
      modeTimer: floor(random(80, 160)),
      mode:      'scatter',
      dead:      false,
      animPhase: random(TWO_PI),
    });
  }
}

function activateFrightened() {
  frightenedTimer  = INV_FRIGHTENED_DUR;
  frightenedActive = true;
}

function tickAliens() {
  if (frightenedTimer > 0) {
    frightenedTimer--;
    if (frightenedTimer <= 0) frightenedActive = false;
  }

  for (let i = invAliens.length - 1; i >= 0; i--) {
    let a = invAliens[i];
    if (a.dead) continue;
    moveAlien(a);
    checkAlienCollision(a);
    if (!a.dead) drawAlien(a);
  }
}

function moveAlien(a) {
  if (!a.moving) {
    let dir        = chooseAlienDir(a);
    let { dc, dr } = dirToDelta(dir);
    if (!isWall(a.col + dc, a.row + dr)) {
      a.dir = dir; a.moving = true; a.progress = 0;
    }
  }

  if (a.moving) {
    a.progress += frightenedActive ? a.speed * 0.48 : a.speed;
    let { dc, dr } = dirToDelta(a.dir);
    let sx = INV_OX + a.col * INV_CELL + INV_CELL / 2;
    let sy = INV_OY + a.row * INV_CELL + INV_CELL / 2;
    a.x = lerp(sx, sx + dc * INV_CELL, min(a.progress, 1));
    a.y = lerp(sy, sy + dr * INV_CELL, min(a.progress, 1));

    if (a.progress >= 1) {
      a.col += dc; a.row += dr;
      a.x    = INV_OX + a.col * INV_CELL + INV_CELL / 2;
      a.y    = INV_OY + a.row * INV_CELL + INV_CELL / 2;
      a.moving = false;
      if (--a.modeTimer <= 0) {
        a.mode      = a.mode === 'scatter' ? 'chase' : 'scatter';
        a.modeTimer = floor(random(80, 160));
      }
    }
  }
  a.animPhase += 0.11;
}

function chooseAlienDir(a) {
  let opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  let opp      = opposite[a.dir];

  if (a.mode === 'chase' && !frightenedActive) {
    let best = null, bestDist = Infinity;
    for (let d of INV_ALL_DIRS) {
      if (d === opp) continue;
      let { dc, dr } = dirToDelta(d);
      let nc = a.col + dc, nr = a.row + dr;
      if (isWall(nc, nr)) continue;
      let dist = (nc - astCol) * (nc - astCol) + (nr - astRow) * (nr - astRow);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    if (best) return best;
  }

  let options = INV_ALL_DIRS.filter(d => {
    if (d === opp) return false;
    let { dc, dr } = dirToDelta(d);
    return !isWall(a.col + dc, a.row + dr);
  });
  return options.length ? options[floor(random(options.length))] : opp;
}

function checkAlienCollision(a) {
  if (astIframes > 0) return;
  let dx = a.x - astX, dy = a.y - astY;
  if (sqrt(dx * dx + dy * dy) > INV_CELL * 0.5) return;

  if (frightenedActive) {
    a.dead = true;
    score += 50 * wave;
    shake(6, 8);
    for (let k = 0; k < 12; k++) {
      let ang = random(TWO_PI);
      addSpark(a.x, a.y, cos(ang)*random(2,6), sin(ang)*random(2,6), random(1.5,3.5), 0.09);
    }
    explode(a.x, a.y, 8);
  } else {
    invaderHitPlayer();
  }
}

// ── Drawing ───────────────────────────────────────────────────
// Style: planet color, stroke only — same visual language as enemies.
// Shape: classic alien silhouette (large oval head, almond eyes, antennae).

function drawAlien(a) {
  // Neon green base color
  let flash = frightenedActive && frightenedTimer < 90 && floor(frightenedTimer / 8) % 2 === 0;
  let r = frightenedActive ? (flash ? 255 : 55) : 20;
  let g = frightenedActive ? (flash ? 255 : 75) : 255;
  let b = frightenedActive ? (flash ? 255 : 200) : 80;
  let sw = frightenedActive ? 1 : 1.6;

  push();
  translate(a.x, a.y);
  let bob = sin(a.animPhase) * 1.5;
  translate(0, bob);

  let s = INV_CELL * 0.34;

  // Neon glow pass (only when not frightened)
  if (!frightenedActive) {
    let glow = sin(a.animPhase * 0.7) * 0.5 + 0.5;
    stroke(r, g, b, 30 + glow * 40); strokeWeight(sw + 5); noFill();
    ellipse(0, -s * 0.46, s * 1.1, s * 1.22);
    strokeWeight(sw + 2);
    line(-s * 0.22, -s * 0.84, -s * 0.42, -s * 1.22);
    line( s * 0.22, -s * 0.84,  s * 0.42, -s * 1.22);
    beginShape();
    vertex(-s * 0.26, s * 0.14);
    vertex( s * 0.26, s * 0.14);
    vertex( 0,        s * 0.58);
    endShape(CLOSE);
  }

  stroke(r, g, b); strokeWeight(sw); noFill();

  // ── Antennae ──────────────────────────────────────────────
  line(-s * 0.22, -s * 0.84, -s * 0.42, -s * 1.22);
  line( s * 0.22, -s * 0.84,  s * 0.42, -s * 1.22);
  // Tip dots
  fill(r, g, b); noStroke();
  ellipse(-s * 0.44, -s * 1.26, s * 0.14, s * 0.14);
  ellipse( s * 0.44, -s * 1.26, s * 0.14, s * 0.14);

  // ── Head (tall oval — classic alien cranium) ──────────────
  noFill(); stroke(r, g, b); strokeWeight(sw);
  ellipse(0, -s * 0.46, s * 1.1, s * 1.22);

  // ── Eyes ──────────────────────────────────────────────────
  if (!frightenedActive) {
    // Almond shapes — fill with planet color
    fill(r, g, b, 200); noStroke();
    push(); translate(-s * 0.28, -s * 0.48); rotate(-0.32);
    ellipse(0, 0, s * 0.36, s * 0.20);
    pop();
    push(); translate( s * 0.28, -s * 0.48); rotate( 0.32);
    ellipse(0, 0, s * 0.36, s * 0.20);
    pop();
    // Pupils — track astronaut
    let pdx = astX - a.x, pdy = astY - a.y;
    let pm  = max(0.01, sqrt(pdx*pdx + pdy*pdy));
    fill(0); noStroke();
    ellipse(-s*0.28 + pdx/pm*2, -s*0.48 + pdy/pm*1.5, s*0.1, s*0.1);
    ellipse( s*0.28 + pdx/pm*2, -s*0.48 + pdy/pm*1.5, s*0.1, s*0.1);
  } else {
    // Frightened — simple x marks for eyes
    stroke(r, g, b, 180); strokeWeight(1); noFill();
    let er = s * 0.1;
    line(-s*0.28 - er, -s*0.48 - er, -s*0.28 + er, -s*0.48 + er);
    line(-s*0.28 + er, -s*0.48 - er, -s*0.28 - er, -s*0.48 + er);
    line( s*0.28 - er, -s*0.48 - er,  s*0.28 + er, -s*0.48 + er);
    line( s*0.28 + er, -s*0.48 - er,  s*0.28 - er, -s*0.48 + er);
  }

  // ── Body (small triangle below neck — like a 'tri' enemy) ─
  noFill(); stroke(r, g, b); strokeWeight(sw);
  beginShape();
  vertex(-s * 0.26, s * 0.14);
  vertex( s * 0.26, s * 0.14);
  vertex( 0,        s * 0.58);
  endShape(CLOSE);

  // ── Thin arms ─────────────────────────────────────────────
  strokeWeight(sw * 0.7);
  line(-s * 0.26, s * 0.22, -s * 0.52, s * 0.36);
  line( s * 0.26, s * 0.22,  s * 0.52, s * 0.36);

  pop();
}
