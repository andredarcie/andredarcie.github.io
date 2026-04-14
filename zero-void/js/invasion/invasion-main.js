// ═══════════════════════════════════════════════════════════════
//  INVASION — Main Controller
// ═══════════════════════════════════════════════════════════════

let invPhase      = 'intro'; // 'intro' | 'playing' | 'outro' | 'fail'
let invTimer      = 0;
let invTouchHint  = 40;
let invLives      = 4;       // lives specific to the invasion (not main lives)

// Swipe tracking
let invSwipeStart   = null;
let invLastTouchPos = { x: 0, y: 0 };

// ── Entry point ───────────────────────────────────────────────

function initInvasion() {
  enemies    = [];
  obstacles  = [];
  bullets    = [];
  sparks     = [];
  shrapnel   = [];
  bgPulse    = 0;
  combo      = 0;
  comboTimer = 0;

  initMaze();
  initAstronaut();
  initAliens();

  invPhase     = 'intro';
  invTimer     = 130;
  invLives     = 4;
  invTouchHint = 40;
  sndInvasionAlarm();
}

// ── Main frame ────────────────────────────────────────────────

function invasionFrame() {
  background(0);
  drawMaze();

  if (invPhase === 'intro') {
    _drawInvasionIntro();
    invTimer--;
    if (invTimer <= 0) { invPhase = 'playing'; sndInvasionStart(); }
    crtOverlay(); drawBorder();
    return;
  }

  if (invPhase === 'outro' || invPhase === 'fail') {
    tickSparks();
    tickShrapnel();
    if (invPhase === 'outro') _drawInvasionOutro();
    else                      _drawInvasionFail();
    invTimer--;
    if (invTimer <= 0) {
      if (invPhase === 'fail') _applyInvasionFail();
      else                     _endInvasion();
    }
    crtOverlay(); drawBorder();
    return;
  }

  // ── Playing ───────────────────────────────────────────────
  if (invTouchHint > 0) invTouchHint--;

  tickAstronaut();
  tickAliens();
  tickSparks();
  tickShrapnel();

  if (flashAmt > 0) {
    noStroke(); fill(255, flashAmt);
    rect(0, 0, W, H);
    flashAmt = max(0, flashAmt - 12);
  }

  drawInvasionHUD();
  crtOverlay();
  drawBorder();

  // Win: all dots eaten OR all aliens dead
  let aliensAlive = invAliens.filter(a => !a.dead).length;
  if (invDotsEaten >= invDotsTotal || aliensAlive === 0) {
    invPhase = 'outro';
    invTimer = 110;
    shake(10, 14);
    flashAmt = 90;
    score += 100 * wave;
    sndInvasionWin();
  }
}

// ── Transition screens ────────────────────────────────────────

function _drawInvasionIntro() {
  let t = invTimer; // counts down 130 → 0

  // Red pulsing overlay — heartbeat feel
  let pulse = sin(t * 0.4) * 0.5 + 0.5;
  noStroke(); fill(180, 0, 0, 30 + pulse * 50);
  rect(0, 0, W, H);

  // Glitch scanlines in red
  stroke(255, 20, 20, 18 + pulse * 22); strokeWeight(1);
  for (let y = 0; y < H; y += 6) line(0, y, W, y);

  // Warning triangles — corners, blinking fast
  let blink = floor(t / 5) % 2 === 0;
  if (blink) {
    let tri = 14;
    noStroke(); fill(255, 30, 30, 200);
    // top-left
    triangle(16, 16, 16 + tri, 16, 16, 16 + tri);
    // top-right
    triangle(W - 16, 16, W - 16 - tri, 16, W - 16, 16 + tri);
    // bottom-left
    triangle(16, H - 16, 16 + tri, H - 16, 16, H - 16 - tri);
    // bottom-right
    triangle(W - 16, H - 16, W - 16 - tri, H - 16, W - 16, H - 16 - tri);
  }

  // Main text — blink every 8 frames, scale breathing
  let textBlink = floor(t / 8) % 2 === 0;
  if (textBlink) {
    let sc   = 1 + sin(t * 0.25) * 0.06;
    let fade = constrain(map(t, 20, 0, 255, 0), 0, 255);

    push();
    translate(W / 2, H / 2);
    scale(sc);
    textFont('monospace'); textAlign(CENTER); noStroke();

    // Glow layer
    fill(255, 30, 30, 60 + pulse * 60);
    textSize(34);
    text('SHIP', 0, -22);
    text('INVADED', 0, 22);

    // Main text
    fill(255, 30, 30, fade);
    textSize(34);
    text('SHIP', 0, -22);
    text('INVADED', 0, 22);

    pop();
  }
}

function _drawInvasionOutro() {
  let p  = getPlanet(wave);
  let fi = constrain(map(invTimer, 110, 78, 0, 1), 0, 1);
  let fo = constrain(map(invTimer, 15,  0,  1, 0), 0, 1);
  let a  = fi * fo;

  noStroke(); fill(0, a * 180); rect(0, 0, W, H);
  noStroke(); fill(p.r*0.08, p.g*0.08, p.b*0.08, a*200);
  rect(W/2 - 135, H/2 - 60, 270, 120, 4);
  stroke(p.r, p.g, p.b, a*100); strokeWeight(1); noFill();
  rect(W/2 - 135, H/2 - 60, 270, 120, 4);

  textFont('monospace'); textAlign(CENTER); noStroke();
  fill(255, a * 255); textSize(11); text('INVASION', W/2, H/2 - 24);
  textSize(26); text('REPELLED', W/2, H/2 + 16);
  fill(p.r, p.g, p.b, a * 160); textSize(9);
  text('+ ' + (100 * wave) + '  CLEAR BONUS', W/2, H/2 + 42);
}

function _drawInvasionFail() {
  let p  = getPlanet(wave);
  let fi = constrain(map(invTimer, 110, 78, 0, 1), 0, 1);
  let fo = constrain(map(invTimer, 15,  0,  1, 0), 0, 1);
  let a  = fi * fo;

  noStroke(); fill(0, a * 200); rect(0, 0, W, H);
  noStroke(); fill(60 * a, 0, 0, a * 180);
  rect(W/2 - 135, H/2 - 60, 270, 120, 4);
  stroke(255, a * 80); strokeWeight(1); noFill();
  rect(W/2 - 135, H/2 - 60, 270, 120, 4);

  textFont('monospace'); textAlign(CENTER); noStroke();
  fill(255, a * 255); textSize(11); text('INVASION', W/2, H/2 - 24);
  textSize(26); text('FAILED', W/2, H/2 + 16);
  fill(255, a * 140); textSize(9);
  text('- 1 MAIN LIFE', W/2, H/2 + 42);
}

// ── End states ────────────────────────────────────────────────

function _endInvasion() {
  ball.x         = W / 2;
  ball.y         = H / 3;
  ball.vx        = (random() < 0.5 ? 1 : -1) * 4;
  ball.vy        = 5;
  ball.dead      = false;
  ball.trail     = [];
  ball.respawnTimer = 0;

  spawnClock = 0;
  obsClock   = 0;

  lastWaveAnnounced = wave;
  waveAnnounceTimer = 180;
  state = 'play';
}

function _applyInvasionFail() {
  lives--;
  if (lives <= 0) {
    hiScore    = max(hiScore, score);
    state      = 'dead';
    deathTimer = 0;
    return;
  }
  _endInvasion(); // still move to next wave, but with 1 less main life
}

// ── Player hit inside invasion ────────────────────────────────

function invaderHitPlayer() {
  invLives--;
  astIframes = 120;
  shake(14, 18);
  flashAmt = 130;
  explode(astX, astY, 18);

  if (invLives <= 0) {
    // All invasion lives spent — invasion fails
    invPhase = 'fail';
    invTimer = 110;
    shake(20, 26);
    flashAmt = 180;
    sndInvasionFail();
    return;
  }

  sndAstHit();
  // Still have invasion lives — respawn in place
  initAstronaut();
  astIframes = 120;
}

// ── Input: keyboard ───────────────────────────────────────────

function invKeyPressed() {
  if (invPhase !== 'playing') return;
  if      (keyCode === UP_ARROW    || key === 'w' || key === 'W') setAstDir('up');
  else if (keyCode === DOWN_ARROW  || key === 's' || key === 'S') setAstDir('down');
  else if (keyCode === LEFT_ARROW  || key === 'a' || key === 'A') setAstDir('left');
  else if (keyCode === RIGHT_ARROW || key === 'd' || key === 'D') setAstDir('right');
}

// ── Input: touch / swipe ──────────────────────────────────────

function invTouchStart(x, y) {
  invSwipeStart   = { x, y };
  invLastTouchPos = { x, y };
}

function invTouchMove(x, y) {
  invLastTouchPos = { x, y };
}

function invTouchEnd() {
  if (!invSwipeStart || invPhase !== 'playing') { invSwipeStart = null; return; }
  let dx  = invLastTouchPos.x - invSwipeStart.x;
  let dy  = invLastTouchPos.y - invSwipeStart.y;
  let thr = 28;

  if (abs(dx) > abs(dy)) {
    if (abs(dx) > thr) setAstDir(dx > 0 ? 'right' : 'left');
  } else {
    if (abs(dy) > thr) setAstDir(dy > 0 ? 'down' : 'up');
  }
  invSwipeStart = null;
}
