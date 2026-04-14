// ═══════════════════════════════════════════════════════════════
//  BACKGROUND
// ═══════════════════════════════════════════════════════════════

function scrollBg() {
  if (bgPulse > 0) {
    noStroke(); fill(255, map(bgPulse, 0, 60, 0, 18));
    rect(0, 0, W, H);
  }
  for (let l of warpLines) {
    l.y += l.speed;
    if (l.y > H + 80) { l.y = -80; l.x = random(W); l.speed = random(4, 16); }
    stroke(255, l.alpha); strokeWeight(0.5);
    line(l.x, l.y, l.x, l.y + l.len);
  }
}

function scrollBgSlow(factor) {
  for (let l of warpLines) {
    l.y += l.speed * factor;
    if (l.y > H + 80) { l.y = -80; l.x = random(W); }
    stroke(255, l.alpha); strokeWeight(0.5);
    line(l.x, l.y, l.x, l.y + l.len);
  }
}

// ═══════════════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════════════

function drawHUD() {
  textFont('monospace');

  // Score (left)
  noStroke(); fill(255);
  textSize(10); textAlign(LEFT);
  text('SCORE', 16, 22);
  textSize(22); text(score, 16, 46);

  // Best score (below current score, left side)
  let bestScore = gameMode === 'arcade' ? arcadeHiScore : hiScore;
  fill(255, 120); textSize(8);
  text('BEST', 16, 61);
  fill(255, 200); textSize(12);
  text(max(score, bestScore), 16, 74);

  // Wave + planet name (story) or just wave number (arcade)
  if (gameMode === 'arcade') {
    fill(255, 140); textSize(10); textAlign(CENTER);
    text('ARCADE', W / 2, 20);
    fill(255, 230); textSize(17);
    text('WAVE ' + wave, W / 2, 40);
  } else {
    let wp = getPlanet(wave);
    fill(wp.r, wp.g, wp.b, 160); textSize(10); textAlign(CENTER);
    text('WAVE ' + wave, W / 2, 20);
    fill(wp.r, wp.g, wp.b, 230); textSize(17);
    text(wp.name, W / 2, 40);
  }

  // Pause button (top right)
  let gm = screenToGame(mouseX, mouseY);
  let hovered = pauseBtnHit(gm.x, gm.y);
  let isPaused = state === 'paused';
  let pAlpha = hovered ? 210 : 110;
  noFill(); stroke(255, pAlpha); strokeWeight(hovered ? 1.5 : 1);
  rect(PAUSE_BTN_CX - PAUSE_BTN_W / 2, PAUSE_BTN_CY - PAUSE_BTN_H / 2, PAUSE_BTN_W, PAUSE_BTN_H, 3);
  noStroke(); fill(255, pAlpha);
  textAlign(CENTER); textFont('monospace'); textSize(13);
  text(isPaused ? '\u25B6' : 'II', PAUSE_BTN_CX, PAUSE_BTN_CY + 5);

  // Lives (mini ship icons)
  for (let i = 0; i < MAX_LIVES; i++) {
    push(); translate(18 + i * 22, 106);
    stroke(255, i < lives ? 255 : 55); strokeWeight(1.1); noFill();
    scale(0.52); shipPath();
    pop();
  }

  // Combo burst
  if (combo > 1 && comboTimer > 0) {
    let fa = comboTimer > 40 ? 255 : map(comboTimer, 0, 40, 0, 255);
    let sc = min(2.8, 1 + combo * 0.18);
    fill(255, fa); noStroke();
    textAlign(CENTER);
    textSize(11 * sc); text('×' + combo, W / 2, H / 2 - 65);
    textSize(8); fill(255, fa * 0.6);
    text('COMBO', W / 2, H / 2 - 50);
  }

  // Ball status indicator
  if (ball.dead) {
    let progress = 1 - ball.respawnTimer / 200;
    stroke(255, 80); strokeWeight(1.2); noFill();
    arc(W - 22, H - 22, 20, 20, -HALF_PI, -HALF_PI + TWO_PI * progress);
    noStroke(); fill(255, 60); textSize(7); textAlign(CENTER);
    text('BALL', W - 22, H - 16);
  } else {
    stroke(255, 100); strokeWeight(1); noFill();
    ellipse(W - 22, H - 22, 12, 12);
  }

  // Touch hint zones
  if (touchHint > 0) {
    let a = min(touchHint, 40);
    noStroke(); fill(255, a * 0.3);
    rect(0, H * 0.55, W * 0.45, H * 0.45);
    rect(W * 0.55, H * 0.55, W * 0.45, H * 0.45);
    fill(255, a); textSize(22); textAlign(CENTER);
    text('←', W * 0.22, H * 0.82);
    text('→', W * 0.78, H * 0.82);
  }

  // Touch position indicator
  if (touchX >= 0) {
    stroke(255, 35); strokeWeight(1); noFill();
    line(touchX, H - 85, touchX, H - 15);
  }

  // Low lives warning
  if (lives === 1 && frameCount % 50 < 25) {
    noStroke(); fill(255, 12);
    rect(0, 0, W, H);
  }
}

// ═══════════════════════════════════════════════════════════════
//  WAVE ANNOUNCE
// ═══════════════════════════════════════════════════════════════

function drawWaveAnnounce() {
  if (waveAnnounceTimer <= 0) return;
  let dur = 180;
  let a   = waveAnnounceTimer > 40
              ? map(waveAnnounceTimer, dur, dur - 30, 0, 255)
              : map(waveAnnounceTimer, 0, 40, 0, 255);
  a = constrain(a, 0, 255);

  if (gameMode === 'arcade') {
    noStroke();
    fill(255, a * 0.25);
    rect(0, H / 2 - 68, W, 90);
    fill(255, a * 0.6);
    textFont('monospace'); textAlign(CENTER);
    textSize(13);
    text('INCOMING', W / 2, H / 2 - 38);
    fill(255, a);
    textSize(46);
    text('WAVE ' + wave, W / 2, H / 2 + 8);
  } else {
    let p = getPlanet(wave);
    noStroke();
    fill(p.r, p.g, p.b, a * 0.35);
    rect(0, H / 2 - 68, W, 90);
    fill(p.r, p.g, p.b, a * 0.7);
    textFont('monospace'); textAlign(CENTER);
    textSize(13);
    text('WAVE ' + wave, W / 2, H / 2 - 38);
    fill(p.r, p.g, p.b, a);
    textSize(46);
    text(p.name, W / 2, H / 2 + 8);
  }

  waveAnnounceTimer--;
}

// ═══════════════════════════════════════════════════════════════
//  CRT + BORDER
// ═══════════════════════════════════════════════════════════════

function crtOverlay() {
  stroke(0, 18); strokeWeight(1);
  for (let y = 0; y < H; y += 3) line(0, y, W, y);

  let vig = drawingContext.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  drawingContext.fillStyle = vig;
  drawingContext.fillRect(0, 0, W, H);
}

function drawBorder() {
  noFill();
  stroke(255, 65); strokeWeight(1);
  rect(4, 4, W - 8, H - 8);
  stroke(255, 28); rect(9, 9, W - 18, H - 18);

  stroke(255, 115); strokeWeight(1.5);
  let c = 16;
  line(4, 4+c, 4, 4); line(4, 4, 4+c, 4);
  line(W-4, 4+c, W-4, 4); line(W-4, 4, W-4-c, 4);
  line(4, H-4-c, 4, H-4); line(4, H-4, 4+c, H-4);
  line(W-4, H-4-c, W-4, H-4); line(W-4, H-4, W-4-c, H-4);
}

// ═══════════════════════════════════════════════════════════════
//  MENU
// ═══════════════════════════════════════════════════════════════

// Button bounds in game-coordinates (used in menuFrame and input)
const MENU_BTN_W = 260;
const MENU_BTN_H = 52;
const MENU_BTN_STORY_CY  = H / 2 + 100;
const MENU_BTN_ARCADE_CY = H / 2 + 162;

// Pause button bounds in game-coordinates
const PAUSE_BTN_CX = W - 34;
const PAUSE_BTN_CY = 26;
const PAUSE_BTN_W  = 54;
const PAUSE_BTN_H  = 38;

function pauseBtnHit(gx, gy) {
  return gx > PAUSE_BTN_CX - PAUSE_BTN_W / 2 && gx < PAUSE_BTN_CX + PAUSE_BTN_W / 2 &&
         gy > PAUSE_BTN_CY - PAUSE_BTN_H / 2 && gy < PAUSE_BTN_CY + PAUSE_BTN_H / 2;
}

function menuBtnHit(gx, gy, centerY) {
  return gx > W / 2 - MENU_BTN_W / 2 && gx < W / 2 + MENU_BTN_W / 2 &&
         gy > centerY - MENU_BTN_H / 2 && gy < centerY + MENU_BTN_H / 2;
}

function menuFrame() {
  sndMenuAmbientTick();
  scrollBgSlow(0.45);

  let t = frameCount;
  stroke(255, 35); strokeWeight(1); noFill();
  push(); translate(W/2, H/2);
  rotate(t * 0.004); poly(0, 0, 150, 6);
  rotate(t * 0.007); poly(0, 0, 105, 4);
  rotate(-t * 0.011); poly(0, 0, 62, 3);
  pop();

  fill(255); noStroke(); textFont('monospace'); textAlign(CENTER);
  textSize(42); text('ZERO', W/2, H/2 - 68);
  textSize(42); text('VOID', W/2, H/2 - 22);

  stroke(255, 55); strokeWeight(1);
  line(W/2 - 90, H/2 + 2, W/2 + 90, H/2 + 2);

  noStroke(); textSize(10); fill(255, 150);
  text('GEOMETRIC  ANNIHILATION', W/2, H/2 + 20);

  textSize(9); fill(255, 90);
  text('drag  /  ← →  /  A D  —  auto-fire', W/2, H/2 + 44);
  text('destroy shapes  ·  deflect the ball  ·  survive', W/2, H/2 + 58);

  // --- Mode buttons ---
  let g = screenToGame(mouseX, mouseY);
  let p = sin(t * 0.085) * 0.5 + 0.5;

  _drawMenuButton('STORY MODE',  W/2, MENU_BTN_STORY_CY,  menuBtnHit(g.x, g.y, MENU_BTN_STORY_CY),  p);
  _drawMenuButton('ARCADE MODE', W/2, MENU_BTN_ARCADE_CY, menuBtnHit(g.x, g.y, MENU_BTN_ARCADE_CY), p);

  // Best scores
  let hasScore = hiScore > 0 || arcadeHiScore > 0;
  if (hasScore) {
    fill(255, 70); textSize(8); noStroke(); textAlign(CENTER);
    if (hiScore > 0)       text('STORY BEST : '  + hiScore,       W/2, H/2 + 200);
    if (arcadeHiScore > 0) text('ARCADE BEST : ' + arcadeHiScore, W/2, H/2 + 214);
  }

  push(); translate(W/2, H/2 + 250);
  stroke(255, 55 + p * 45); strokeWeight(1.4); noFill();
  shipPath(); pop();

  crtOverlay(); drawBorder();
}

function _drawMenuButton(label, cx, cy, hovered, pulse) {
  let bx = cx - MENU_BTN_W / 2;
  let by = cy - MENU_BTN_H / 2;
  let alpha = hovered ? 200 + pulse * 55 : 70 + pulse * 40;

  noFill(); stroke(255, alpha); strokeWeight(hovered ? 1.4 : 1);
  rect(bx, by, MENU_BTN_W, MENU_BTN_H, 3);

  noStroke(); fill(255, hovered ? 255 : 140 + pulse * 60);
  textFont('monospace'); textAlign(CENTER); textSize(15);
  text(label, cx, cy + 6);
}

// ═══════════════════════════════════════════════════════════════
//  PAUSE SCREEN
// ═══════════════════════════════════════════════════════════════

const PAUSE_MENU_BTN_W  = 200;
const PAUSE_MENU_BTN_H  = 46;
const PAUSE_MENU_BTN_CY = H / 2 + 72;

function pauseMenuBtnHit(gx, gy) {
  return gx > W / 2 - PAUSE_MENU_BTN_W / 2 && gx < W / 2 + PAUSE_MENU_BTN_W / 2 &&
         gy > PAUSE_MENU_BTN_CY - PAUSE_MENU_BTN_H / 2 && gy < PAUSE_MENU_BTN_CY + PAUSE_MENU_BTN_H / 2;
}

function pausedFrame() {
  scrollBgSlow(0);

  noStroke(); fill(0, 185);
  rect(0, 0, W, H);

  fill(255); textFont('monospace'); textAlign(CENTER); noStroke();
  textSize(34); text('PAUSED', W / 2, H / 2 - 28);

  stroke(255, 38); strokeWeight(1);
  line(W / 2 - 75, H / 2 - 10, W / 2 + 75, H / 2 - 10);
  noStroke();

  fill(255, 95); textSize(9);
  text('P  \u00B7  ESC  \u00B7  TAP  TO  RESUME', W / 2, H / 2 + 14);

  // Back to menu button
  let g = screenToGame(mouseX, mouseY);
  let hovered = pauseMenuBtnHit(g.x, g.y);
  let pulse = sin(frameCount * 0.07) * 0.5 + 0.5;
  let alpha = hovered ? 210 + pulse * 45 : 80 + pulse * 40;
  noFill(); stroke(255, alpha); strokeWeight(hovered ? 1.5 : 1);
  rect(W / 2 - PAUSE_MENU_BTN_W / 2, PAUSE_MENU_BTN_CY - PAUSE_MENU_BTN_H / 2, PAUSE_MENU_BTN_W, PAUSE_MENU_BTN_H, 3);
  noStroke(); fill(255, hovered ? 255 : 150 + pulse * 60);
  textFont('monospace'); textAlign(CENTER); textSize(13);
  text('MAIN MENU', W / 2, PAUSE_MENU_BTN_CY + 5);

  drawHUD();
  crtOverlay();
  drawBorder();
}

// ═══════════════════════════════════════════════════════════════
//  DEAD SCREEN
// ═══════════════════════════════════════════════════════════════

function deadFrame() {
  deathTimer++;
  scrollBgSlow(0.3);
  tickShrapnel();
  crtOverlay(); drawBorder();

  let fi = min(1, deathTimer / 55);

  if (gameMode === 'arcade') {
    _arcadeDeadFrame(fi);
    return;
  }

  fill(255, fi * 255); noStroke(); textFont('monospace'); textAlign(CENTER);

  textSize(28); text('ZERO IS DEAD', W/2, H/2 - 72);

  stroke(255, fi * 70); strokeWeight(1);
  line(W/2 - 95, H/2 - 50, W/2 + 95, H/2 - 50);
  noStroke();

  textSize(12); fill(255, fi * 170);
  text('SCORE   ' + score, W/2, H/2 - 8);
  text('WAVE    ' + wave,  W/2, H/2 + 14);

  if (score > 0 && score >= hiScore) {
    fill(255, fi * 190); textSize(10);
    text('— NEW BEST —', W/2, H/2 + 40);
  }

  if (deathTimer > 70) {
    let p = sin(frameCount * 0.09) * 0.5 + 0.5;
    fill(255, 100 + p * 155); textSize(13);
    text('[  SPACE TO RESTART  ]', W/2, H/2 + 82);
  }
}

function _arcadeDeadFrame(fi) {
  noStroke(); textFont('monospace'); textAlign(CENTER);

  fill(255, fi * 220);
  textSize(22); text('GAME OVER', W/2, H/2 - 115);

  stroke(255, fi * 55); strokeWeight(1);
  line(W/2 - 100, H/2 - 94, W/2 + 100, H/2 - 94);
  noStroke();

  fill(255, fi * 120); textSize(10);
  text('WAVE  ' + wave, W/2, H/2 - 74);

  // Score box
  fill(0, fi * 150); noStroke();
  rectMode(CENTER);
  rect(W/2, H/2 - 12, 224, 82, 6);
  rectMode(CORNER);
  stroke(255, fi * 60); strokeWeight(1); noFill();
  rectMode(CENTER);
  rect(W/2, H/2 - 12, 224, 82, 6);
  rectMode(CORNER);

  noStroke(); fill(255, fi * 255);
  textSize(72); text(score, W/2, H/2 + 16);

  if (score > 0 && score >= arcadeHiScore) {
    fill(255, fi * 180); textSize(10);
    text('— NEW BEST —', W/2, H/2 + 48);
  }

  stroke(255, fi * 35); strokeWeight(1);
  line(W/2 - 115, H/2 + 66, W/2 + 115, H/2 + 66);
  noStroke();

  fill(255, fi * 190); textSize(11);
  text('screenshot and share your score!', W/2, H/2 + 86);

  if (deathTimer > 70) {
    let p = sin(frameCount * 0.09) * 0.5 + 0.5;
    fill(255, 100 + p * 155); textSize(13);
    text('[  SPACE TO RESTART  ]', W/2, H/2 + 130);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ESCAPE SCREEN
// ═══════════════════════════════════════════════════════════════

function initEscape() {
  escapeStartedAt = millis();
  escapeDurationMs = 7000;
  escapeTimer = 420;
  state = 'escape';
  sndEscape();
}

function escapeFrame() {
  if (!escapeStartedAt) {
    escapeStartedAt = millis();
    escapeDurationMs = escapeDurationMs || 7000;
  }

  const elapsed = millis() - escapeStartedAt;
  const remaining = max(0, escapeDurationMs - elapsed);
  escapeTimer = map(remaining, 0, escapeDurationMs, 0, 420);

  for (let l of warpLines) {
    l.y += l.speed * 3.5;
    if (l.y > H + 80) { l.y = -80; l.x = random(W); }
    stroke(255, l.alpha * 0.8); strokeWeight(0.5);
    line(l.x, l.y, l.x, l.y + l.len * 2.5);
  }

  crtOverlay(); drawBorder();

  let fi   = min(1, elapsed / 1000);
  let fade = remaining < 1200 ? map(remaining, 0, 1200, 0, 1) : 1;
  let a    = fi * fade;

  let shipProgress = min(1, elapsed / (escapeDurationMs * 0.7));
  let shipY = lerp(H - 95, -50, shipProgress * shipProgress);
  push();
  translate(W / 2, shipY);
  stroke(255, a * 200); strokeWeight(1.4); noFill();
  shipPath();
  let th = sin(frameCount * 0.4) * 6 + 14;
  line(-8, 15, -8, 15 + th);
  line( 0, 17,  0, 17 + th * 1.4);
  line( 8, 15,  8, 15 + th);
  pop();

  noStroke(); textFont('monospace'); textAlign(CENTER);

  fill(255, a * 255);
  textSize(13);
  text('YOU MANAGED TO', W / 2, H / 2 - 55);
  textSize(26);
  text('ESCAPE THE', W / 2, H / 2 - 22);
  textSize(26);
  text('SOLAR SYSTEM', W / 2, H / 2 + 14);

  stroke(255, a * 60); strokeWeight(1);
  line(W / 2 - 110, H / 2 + 30, W / 2 + 110, H / 2 + 30);
  noStroke();

  fill(255, a * 130);
  textSize(11);
  text('FINAL SCORE', W / 2, H / 2 + 52);

  noStroke();
  fill(0, a * 140);
  rectMode(CENTER);
  rect(W / 2, H / 2 + 92, 190, 62, 6);
  rectMode(CORNER);

  fill(255, a * 255);
  textSize(60);
  text(score, W / 2, H / 2 + 112);

  if (score >= hiScore && score > 0) {
    fill(255, a * 160);
    textSize(10);
    text('— ALL TIME BEST —', W / 2, H / 2 + 130);
  }

  if (elapsed >= escapeDurationMs) {
    state = 'menu';
  }
}

// ═══════════════════════════════════════════════════════════════
//  BULLET TIME
// ═══════════════════════════════════════════════════════════════

function checkBulletTime() {
  if (player.iframes > 0) {
    btActive = false; btThreat = null;
    timeScale = lerp(timeScale, 1.0, 0.06);
    return;
  }

  let nearest     = null;
  let nearestDist = Infinity;

  for (let e of enemies) {
    if (e.y < player.y + 30) {
      let d = dist(player.x, player.y, e.x, e.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }
  }
  for (let o of obstacles) {
    if (o.y < player.y + 30) {
      let d = dist(player.x, player.y, o.x, o.y);
      if (d < nearestDist) { nearestDist = d; nearest = o; }
    }
  }

  if (nearestDist < BT_DANGER_R) {
    btActive  = true;
    btThreat  = nearest;
    timeScale = lerp(timeScale, 0.14, 0.09);
  } else {
    btThreat = null;
    if (nearestDist > BT_SAFE_R) btActive = false;
    timeScale = lerp(timeScale, 1.0, 0.025);
  }
  timeScale = constrain(timeScale, 0.12, 1.0);
  sndBulletTimeCheck(btActive);
}

function drawBulletTimeEffect() {
  let px = player.x, py = player.y;

  let grad = drawingContext.createRadialGradient(px, py, 40, px, py, 260);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.72)');
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, 0, W, H);

  noFill();
  for (let i = 0; i < 3; i++) {
    let r  = 38 + i * 22 + sin(btRingPhase + i * 1.2) * 4;
    let a  = map(i, 0, 2, 80, 25);
    let sw = map(i, 0, 2, 1.4, 0.7);
    stroke(255, a); strokeWeight(sw);
    ellipse(px, py, r * 2);
  }

  if (btThreat) {
    let tx     = btThreat.x, ty = btThreat.y;
    let pulseA = 50 + sin(btRingPhase * 2) * 30;

    drawingContext.save();
    drawingContext.setLineDash([5, 7]);
    drawingContext.strokeStyle = `rgba(255,255,255,${pulseA / 255})`;
    drawingContext.lineWidth   = 0.8;
    drawingContext.beginPath();
    drawingContext.moveTo(px, py);
    drawingContext.lineTo(tx, ty);
    drawingContext.stroke();
    drawingContext.setLineDash([]);
    drawingContext.restore();

    let angle     = atan2(ty - py, tx - px);
    let arrowDist = 48;
    let ax = px + cos(angle) * arrowDist;
    let ay = py + sin(angle) * arrowDist;
    push();
    translate(ax, ay);
    rotate(angle + HALF_PI);
    stroke(255, pulseA); strokeWeight(1); noFill();
    beginShape();
    vertex(0, -8); vertex(-5, 6); vertex(5, 6);
    endShape(CLOSE);
    pop();

    stroke(255, 60 + sin(btRingPhase * 3) * 30);
    strokeWeight(1.2); noFill();
    ellipse(tx, ty, (btThreat.size || btThreat.r || 20) * 2 + 14);
  }

  noStroke(); fill(255, 100); textFont('monospace');
  textSize(8); textAlign(LEFT);
  text('SLOW', 16, H - 10);
}

// ═══════════════════════════════════════════════════════════════
//  INTRO SCREEN
// ═══════════════════════════════════════════════════════════════

let introTimer = 0;

function introFrame() {
  introTimer++;
  scrollBgSlow(0.25);

  let t = introTimer;

  // Rotating geometric shape — same language as the menu
  stroke(255, 22); strokeWeight(1); noFill();
  push(); translate(W / 2, H / 2);
  rotate(t * 0.003);  poly(0, 0, 130, 6);
  rotate(t * 0.005);  poly(0, 0, 88, 3);
  rotate(-t * 0.009); poly(0, 0, 50, 4);
  pop();

  // Fade in
  let fi = constrain(map(t, 0, 90, 0, 1), 0, 1);

  noStroke(); textFont('monospace'); textAlign(CENTER);

  fill(255, fi * 80);
  textSize(9);
  text('A GAME BY', W / 2, H / 2 - 28);

  fill(255, fi * 220);
  textSize(22);
  text('ANDRÉ N. DARCIE', W / 2, H / 2 + 4);

  stroke(255, fi * 35); strokeWeight(1);
  line(W / 2 - 105, H / 2 + 18, W / 2 + 105, H / 2 + 18);
  noStroke();

  // Blinking prompt — only after fade in
  if (t > 80) {
    let p = sin(t * 0.07) * 0.5 + 0.5;
    fill(255, 60 + p * 100);
    textSize(10);
    text('PRESS ANY KEY', W / 2, H / 2 + 52);
  }

  crtOverlay();
  drawBorder();
}
