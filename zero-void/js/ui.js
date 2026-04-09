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

  // Score
  noStroke(); fill(255);
  textSize(10); textAlign(LEFT);
  text('SCORE', 16, 22);
  textSize(26); text(score, 16, 50);

  // Wave + planeta
  let wp = getPlanet(wave);
  fill(wp.r, wp.g, wp.b, 160); textSize(10); textAlign(CENTER);
  text('WAVE ' + wave, W / 2, 20);
  fill(wp.r, wp.g, wp.b, 230); textSize(17);
  text(wp.name, W / 2, 40);

  // Best
  textAlign(RIGHT); textSize(10); fill(255, 130);
  text('BEST', W - 16, 22);
  textSize(14); fill(255); text(max(score, hiScore), W - 16, 38);

  // Lives (mini ship icons)
  for (let i = 0; i < MAX_LIVES; i++) {
    push(); translate(18 + i * 22, 68);
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
  let p   = getPlanet(wave);
  let dur = 180;
  let a   = waveAnnounceTimer > 40
              ? map(waveAnnounceTimer, dur, dur - 30, 0, 255)
              : map(waveAnnounceTimer, 0, 40, 0, 255);
  a = constrain(a, 0, 255);

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

function menuFrame() {
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

  let p = sin(t * 0.085) * 0.5 + 0.5;
  fill(255, 100 + p * 155); textSize(13);
  text('[  SPACE TO START  ]', W/2, H/2 + 104);

  if (hiScore > 0) {
    fill(255, 90); textSize(9);
    text('BEST : ' + hiScore, W/2, H/2 + 122);
  }

  push(); translate(W/2, H/2 + 210);
  stroke(255, 55 + p * 45); strokeWeight(1.4); noFill();
  shipPath(); pop();

  crtOverlay(); drawBorder();
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

// ═══════════════════════════════════════════════════════════════
//  ESCAPE SCREEN
// ═══════════════════════════════════════════════════════════════

function initEscape() {
  escapeStartedAt = millis();
  escapeDurationMs = 7000;
  escapeTimer = 420;
  state = 'escape';
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
