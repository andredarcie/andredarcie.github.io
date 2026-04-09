// ═══════════════════════════════════════════════════════════════
//  SETUP & MAIN LOOP
// ═══════════════════════════════════════════════════════════════

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(min(pixelDensity(), 2));
  updateLayout();
  hiScore  = 0;
  warpLines = [];
  for (let i = 0; i < 45; i++) {
    warpLines.push({
      x: random(W), y: random(H),
      speed: random(4, 16),
      len:   random(15, 65),
      alpha: random(12, 55),
    });
  }
  state = 'menu';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}

function updateLayout() {
  gs = min(windowWidth / W, windowHeight / H);
  gx = (windowWidth  - W * gs) / 2;
  gy = (windowHeight - H * gs) / 2;
}

function screenToGame(sx, sy) {
  return { x: (sx - gx) / gs, y: (sy - gy) / gs };
}

function initGame() {
  player = {
    x: W / 2, y: H - 95,
    speed: 6.2,
    fireTimer: 0, fireRate: 9,
    trail: [],
    iframes: 0,
    thrPhase: 0,
    dead: false,
  };
  bullets   = [];
  enemies   = [];
  obstacles = [];
  lifePods  = [];
  sparks    = [];
  shrapnel  = [];
  score = 0; lives = 3; wave = 1;
  combo = 0; comboTimer = 0;
  shakeAmt = 0; shakeDur = 0; flashAmt = 0;
  bgPulse = 0;
  spawnClock = 0; spawnRate = 85;
  obsClock   = 0; obsRate   = 160;
  lifeClock  = 0; lifeRate  = 900;
  timeScale  = 1.0;
  btActive   = false;
  btThreat   = null;
  btRingPhase = 0;
  touchX      = -1;
  touchHint   = 90;
  wave               = 1;
  waveTimer          = WAVE_DURATION;
  waveAnnounceTimer  = 180;
  lastWaveAnnounced  = 1;
  escapeTimer        = 0;
  escapeStartedAt    = 0;
  escapeDurationMs   = 7000;
  finaleScene        = null;
  transitionEcho      = null;
  waveTransition      = null;
  transmissionIndex  = 0;

  ball = {
    x: W / 2, y: H / 3,
    vx: random([-1, 1])[floor(random(2))] * 4,
    vy: 5,
    r: 9,
    speed: 6.5,
    trail: [],
    dead: false,
    respawnTimer: 0,
  };
}

function draw() {
  background(0);

  push();
  translate(gx, gy);
  scale(gs);

  if (state === 'menu')     { menuFrame();     pop(); return; }
  if (state === 'dead')     { deadFrame();     pop(); return; }
  if (state === 'escape')   { escapeFrame();   pop(); return; }
  if (state === 'invasion') { invasionFrame(); pop(); return; }
  if (state === 'finale')   { finaleFrame();   pop(); return; }
  if (state === 'waveTransition') { waveTransitionFrame(); pop(); return; }
  if (state === 'transmission') { transmissionFrame(); pop(); return; }

  // Screen shake
  let sx = 0, sy = 0;
  if (shakeDur > 0) {
    sx = random(-shakeAmt, shakeAmt);
    sy = random(-shakeAmt, shakeAmt);
    shakeDur--;
    shakeAmt *= 0.85;
  }
  push(); translate(sx, sy);

  checkBulletTime();
  scrollBg();
  tickBullets();
  tickObstacles();
  tickLifePods();
  tickEnemies();
  tickBall();
  tickSparks();
  tickShrapnel();
  drawPlayer();

  pop(); // end shake

  if (btActive) drawBulletTimeEffect();

  // Flash overlay
  if (flashAmt > 0) {
    noStroke(); fill(255, flashAmt);
    rect(0, 0, W, H);
    flashAmt = max(0, flashAmt - 10);
  }

  drawHUD();
  drawWaveAnnounce();
  crtOverlay();
  drawBorder();

  pop(); // end layout transform

  bgPulse = max(0, bgPulse - 3);

  // Wave progression
  waveTimer -= timeScale;
  if (waveTimer <= 0) {
    beginWaveTransition(wave + 1);
    return;
  }

  player.thrPhase += 0.28 * timeScale;
  player.iframes   = max(0, player.iframes - 1);
  btRingPhase     += 0.08;
  if (touchHint > 0) touchHint--;
  if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 0; }

  // Keyboard input
  let spd = player.speed + wave * 0.12;
  if (keyIsDown(LEFT_ARROW)  || keyIsDown(65)) player.x = max(22, player.x - spd);
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) player.x = min(W - 22, player.x + spd);

  // Touch input
  if (touchX >= 0) {
    let tx = constrain(touchX, 22, W - 22);
    player.x = lerp(player.x, tx, 0.35);
  }

  // Auto-fire
  player.fireTimer++;
  if (player.fireTimer >= player.fireRate) {
    player.fireTimer = 0;
    shoot();
  }

  // Spawn clocks
  spawnClock += timeScale;
  let sRate = max(65, spawnRate - wave * 3);
  if (spawnClock >= sRate) { spawnClock = 0; spawnGroup(); }

  obsClock += timeScale;
  let oRate = max(110, obsRate - wave * 4);
  if (obsClock >= oRate) { obsClock = 0; spawnObstacle(); }

  if (lives < MAX_LIVES) {
    lifeClock += timeScale;
    if (lifeClock >= lifeRate) {
      lifeClock = 0;
      if (random() < 0.32) spawnLifePod();
    }
  } else {
    lifeClock = 0;
  }
}

function _shouldTriggerTransmissionForWave(nextWave) {
  return nextWave % 2 === 0 && nextWave <= PLANETS.length;
}
