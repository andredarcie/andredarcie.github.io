// ═══════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════

function keyPressed() {
  if (state === 'transmission') { advanceTransmissionDialogue(); return false; }
  if (state === 'invasion') { invKeyPressed(); return; }
  if (keyCode === 32) {
    if (state === 'menu') { initGame(); state = 'play'; }
    else if (state === 'dead' && deathTimer > 65) { initGame(); state = 'play'; }
  }
}

function touchStarted() {
  if (!touches.length) return false;

  if (state === 'transmission') {
    advanceTransmissionDialogue();
    return false;
  }

  if (state === 'invasion') {
    invTouchStart(touches[0].x, touches[0].y);
    return false;
  }

  let g = screenToGame(touches[0].x, touches[0].y);
  if (state === 'menu') {
    initGame(); state = 'play'; touchHint = 90;
  } else if (state === 'dead' && deathTimer > 65) {
    initGame(); state = 'play'; touchHint = 90;
  } else if (state === 'play') {
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
