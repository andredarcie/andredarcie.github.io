function captureTransitionEcho(kind) {
  if (!player) return;

  let trail = [];
  if (player.trail && player.trail.length) {
    trail = player.trail.slice(-18).map((p) => ({ x: p.x, y: p.y }));
  }
  trail.push({ x: player.x, y: player.y });

  transitionEcho = {
    kind,
    frame: 0,
    duration: 54,
    x: player.x,
    y: player.y,
    trail,
  };
}

function drawTransitionEcho() {
  if (!transitionEcho) return;

  let e = transitionEcho;
  let t = constrain(e.frame / e.duration, 0, 1);
  let a = (1 - t) * 130;

  push();
  noFill();
  for (let i = 0; i < e.trail.length; i++) {
    let p = e.trail[i];
    let k = i / max(1, e.trail.length - 1);
    let drift = t * (e.kind === 'finale' ? -90 : -42);
    stroke(255, a * k);
    strokeWeight(0.55 + k * 0.8);
    push();
    translate(p.x, p.y + drift * (1 - k));
    scale(0.35 + k * 0.55 + t * 0.22);
    rotate(sin(e.frame * 0.08 + i) * 0.08);
    shipPath();
    pop();
  }

  stroke(255, a * 0.55);
  strokeWeight(1);
  line(e.x - 16, e.y + t * 16, e.x + 16, e.y + t * 16);
  pop();

  e.frame++;
  if (e.frame > e.duration) transitionEcho = null;
}

function beginWaveTransition(nextWave) {
  let roll = random();
  let target = 'play';
  if (gameMode === 'arcade') {
    target = 'play';
  } else if (nextWave > PLANETS.length) {
    target = 'finale';
  } else if (_shouldTriggerTransmissionForWave(nextWave)) {
    target = 'transmission';
  } else if (roll < INVASION_CHANCE) {
    target = 'invasion';
  }

  // Direct to play: no pause, game continues uninterrupted
  if (target === 'play') {
    wave = nextWave;
    waveTimer = WAVE_DURATION;
    spawnClock = 0;
    obsClock  = 0;
    combo = 0;
    comboTimer = 0;
    lastWaveAnnounced = wave;
    waveAnnounceTimer = 180;
    sndWaveUp();
    return;
  }

  // Story events (transmission, invasion, finale) still use the animated transition
  sndWaveTransition();
  captureTransitionEcho('wave');
  waveTransition = {
    frame: 0,
    duration: 78,
    fromWave: wave,
    nextWave,
    target,
  };

  enemies = [];
  obstacles = [];
  lifePods = [];
  combo = 0;
  comboTimer = 0;
  btActive = false;
  btThreat = null;
  timeScale = 1.0;
  state = 'waveTransition';
}

function waveTransitionFrame() {
  if (!waveTransition) {
    state = 'play';
    return;
  }

  let wt = waveTransition;
  let t = constrain(wt.frame / wt.duration, 0, 1);

  scrollBgSlow(0.36 + t * 0.34);
  player.thrPhase += 0.22;
  tickBullets();
  tickSparks();
  tickShrapnel();
  drawPlayer();
  drawTransitionEcho();
  crtOverlay();
  drawBorder();

  wt.frame++;
  if (wt.frame >= wt.duration) {
    finishWaveTransition();
  }
}

function finishWaveTransition() {
  let wt = waveTransition;
  waveTransition = null;
  wave = wt.nextWave;
  waveTimer = WAVE_DURATION;

  if (wt.target === 'finale') {
    initFinale();
    state = 'finale';
    return;
  }

  if (wt.target === 'transmission') {
    initTransmission();
    state = 'transmission';
    return;
  }

  if (wt.target === 'invasion') {
    initInvasion();
    state = 'invasion';
    return;
  }

  lastWaveAnnounced = wave;
  waveAnnounceTimer = 180;
  state = 'play';
}
