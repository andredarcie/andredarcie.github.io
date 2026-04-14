// ═══════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════

function keyPressed() {
  audioUnlock();
  if (state === 'intro') { _leaveIntro(); return false; }
  if (state === 'transmission') { advanceTransmissionDialogue(); return false; }
  if (state === 'invasion') { invKeyPressed(); return; }
  if (state === 'menu') {
    if (key === '1' || keyCode === 32) { sndMenuAmbientStop(); sndMenuClick(); gameMode = 'story';  initGame(); state = 'play'; }
    if (key === '2')                   { sndMenuAmbientStop(); sndMenuClick(); gameMode = 'arcade'; initGame(); state = 'play'; }
    return;
  }
  // Pause toggle — P, Escape, or Space during play/paused
  if (state === 'play' || state === 'paused') {
    if (key === 'p' || key === 'P' || keyCode === 27 || keyCode === 32) {
      togglePause(); return false;
    }
  }
  if (keyCode === 32) {
    if (state === 'dead' && deathTimer > 65) {
      if (gameMode === 'story') restartCurrentWave(); else initGame();
      state = 'play';
    }
  }
}

function mousePressed() {
  let g = screenToGame(mouseX, mouseY);
  if (state === 'menu') {
    if (menuBtnHit(g.x, g.y, MENU_BTN_STORY_CY))  { sndMenuAmbientStop(); sndMenuClick(); gameMode = 'story';  initGame(); state = 'play'; touchHint = 90; }
    if (menuBtnHit(g.x, g.y, MENU_BTN_ARCADE_CY)) { sndMenuAmbientStop(); sndMenuClick(); gameMode = 'arcade'; initGame(); state = 'play'; touchHint = 90; }
  }
  if ((state === 'play' || state === 'paused') && pauseBtnHit(g.x, g.y)) {
    togglePause();
  }
  if (state === 'paused' && pauseMenuBtnHit(g.x, g.y)) {
    _goToMenu();
  }
}

function _leaveIntro() {
  state = 'menu';
  sndMenuAmbientStart();
}

function touchStarted() {
  audioUnlock();
  if (!touches.length) return false;

  if (state === 'invasion') {
    invTouchStart(touches[0].x, touches[0].y);
    return false;
  }

  let g = screenToGame(touches[0].x, touches[0].y);
  if (state === 'menu') {
    if (menuBtnHit(g.x, g.y, MENU_BTN_STORY_CY))  { sndMenuAmbientStop(); sndMenuClick(); gameMode = 'story';  initGame(); state = 'play'; touchHint = 90; }
    if (menuBtnHit(g.x, g.y, MENU_BTN_ARCADE_CY)) { sndMenuAmbientStop(); sndMenuClick(); gameMode = 'arcade'; initGame(); state = 'play'; touchHint = 90; }
    return false;
  } else if (state === 'paused') {
    if (pauseMenuBtnHit(g.x, g.y)) { _goToMenu(); return false; }
    togglePause(); return false;
  } else if (state === 'play') {
    if (pauseBtnHit(g.x, g.y)) { togglePause(); return false; }
    touchX = g.x;
  }
  return false;
}

function touchMoved() {
  if (state === 'invasion') {
    if (touches.length) invTouchMove(touches[0].x, touches[0].y);
    return false;
  }
  if (state === 'play' && touches.length) {
    touchX = screenToGame(touches[0].x, touches[0].y).x;
  }
  return false;
}

function touchEnded() {
  if (state === 'invasion') {
    invTouchEnd();
    return false;
  }
  if (!touches.length) touchX = -1;
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  iOS NATIVE TOUCH FALLBACK
//  Registered in capture phase — fires before canvas handlers,
//  guaranteeing state transitions work on iOS Safari regardless
//  of how p5.js manages its own touch listeners.
//  Handles only states that need no coordinates (intro, transmission, dead).
//  Menu / invasion / gameplay remain in touchStarted above.
// ═══════════════════════════════════════════════════════════════
document.addEventListener('touchstart', function(e) {
  try { audioUnlock(); } catch(err) {}

  if (state === 'intro') {
    _leaveIntro();
  } else if (state === 'transmission') {
    advanceTransmissionDialogue();
  } else if (state === 'dead' && deathTimer > 65) {
    if (gameMode === 'story') restartCurrentWave(); else initGame();
    state = 'play';
    touchHint = 90;
  }
}, { capture: true, passive: true });
