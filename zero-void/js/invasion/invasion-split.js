// INVASION - split-screen override

let invEscortRocks = [];
let invEscortRockClock = 0;
let invEscortRockRate = 52;
let invEscortShipX = W / 2;
let invEscortShipIframes = 0;
let invEscortBullets = [];
let invEscortFireTimer = 0;
let invEscortFireRate = 9;
let invTransitionFrame = 0;
const INV_TRANSITION_DUR = 32;

function invSyncEscortShipToAstronaut() {
  const srcMin = INV_OX + INV_CELL * 0.5;
  const srcMax = INV_OX + (INV_COLS - 0.5) * INV_CELL;
  invEscortShipX = map(astX, srcMin, srcMax, INV_ROCK_MIN_X, INV_ROCK_MAX_X, true);
}

function invDrawLowerZoneBase() {
  const transitionT = constrain(invTransitionFrame / INV_TRANSITION_DUR, 0, 1);
  const lowerAlpha = lerp(0, 255, transitionT);
  const dividerAlpha = lerp(0, 45, transitionT);

  noStroke();
  fill(6, 10, 20, lowerAlpha);
  rect(0, INV_BOTTOM_Y, W, INV_BOTTOM_H);

  for (let lineSeg of warpLines) {
    lineSeg.y += lineSeg.speed * 0.22;
    if (lineSeg.y > H + 80) {
      lineSeg.y = -80;
      lineSeg.x = random(W);
    }
    if (lineSeg.y < INV_BOTTOM_Y) continue;

    stroke(255, lineSeg.alpha * 0.45 * transitionT);
    strokeWeight(0.5);
    line(lineSeg.x, lineSeg.y, lineSeg.x, min(lineSeg.y + lineSeg.len * 0.75, H));
  }

  stroke(255, dividerAlpha);
  strokeWeight(1.2);
  line(0, INV_DIVIDER_Y, W, INV_DIVIDER_Y);
  stroke(255, dividerAlpha * 0.33);
  line(0, INV_DIVIDER_Y + 5, W, INV_DIVIDER_Y + 5);

  noStroke();
  fill(255, dividerAlpha);
  textFont('monospace');
  textAlign(CENTER);
  textSize(8);
  text('ESCORT', W / 2, INV_BOTTOM_Y + 16);
}

function invTickEscortBullets() {
  invEscortFireTimer++;
  if (invEscortFireTimer >= invEscortFireRate) {
    invEscortFireTimer = 0;
    invEscortBullets.push({ x: invEscortShipX, y: INV_SHIP_Y - 28, vx: 0, vy: -15, w: 3 });

    for (let i = 0; i < 3; i++) {
      addSpark(
        invEscortShipX,
        INV_SHIP_Y - 24,
        random(-1.2, 1.2),
        random(-3.6, -0.4),
        random(1, 2.4),
        0.2
      );
    }
  }

  for (let i = invEscortBullets.length - 1; i >= 0; i--) {
    const bullet = invEscortBullets[i];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (bullet.y < INV_BOTTOM_Y + 10) {
      invEscortBullets.splice(i, 1);
      continue;
    }

    stroke(255);
    strokeWeight(bullet.w);
    line(bullet.x, bullet.y, bullet.x + bullet.vx * 2, bullet.y + bullet.vy * 2);
    stroke(255, 55);
    strokeWeight(bullet.w + 3);
    line(bullet.x, bullet.y, bullet.x + bullet.vx * 1.5, bullet.y + bullet.vy * 1.5);
  }
}

function invSpawnEscortRock() {
  invEscortRockClock++;
  if (invEscortRockClock < invEscortRockRate) return;
  invEscortRockClock = 0;

  invEscortRocks.push({
    x: random(INV_ROCK_MIN_X, INV_ROCK_MAX_X),
    y: INV_BOTTOM_Y + 22,
    vy: random(2.4, 4.4) + wave * 0.18,
    drift: random(-0.55, 0.55),
    rot: random(TWO_PI),
    rotSpd: random(-0.07, 0.07),
    size: random(12, 24),
    sides: floor(random(4, 8)),
    wobble: random(TWO_PI),
    wobbleFreq: random(0.03, 0.06),
    t: 0,
  });
}

function invHitEscortShip(x, y) {
  shake(10, 14);
  flashAmt = max(flashAmt, 90);
  explode(x, y, 12);
  invLives--;
  invEscortShipIframes = 110;

  if (invLives <= 0) {
    invPhase = 'fail';
    invTimer = 110;
    shake(20, 26);
    flashAmt = 180;
  }
}

function invTickEscortRocks() {
  for (let i = invEscortRocks.length - 1; i >= 0; i--) {
    const rock = invEscortRocks[i];
    rock.t++;
    rock.y += rock.vy;
    rock.x += rock.drift + sin(rock.t * rock.wobbleFreq + rock.wobble) * 0.45;
    rock.x = constrain(rock.x, INV_ROCK_MIN_X, INV_ROCK_MAX_X);
    rock.rot += rock.rotSpd;

    if (rock.y > H + 40) {
      invEscortRocks.splice(i, 1);
      continue;
    }

    if (invEscortShipIframes === 0 && dist(invEscortShipX, INV_SHIP_Y, rock.x, rock.y) < rock.size + 13) {
      invEscortRocks.splice(i, 1);
      invHitEscortShip(rock.x, rock.y);
      continue;
    }

    push();
    translate(rock.x, rock.y);
    rotate(rock.rot);
    stroke(255);
    strokeWeight(1.4);
    noFill();
    poly(0, 0, rock.size, rock.sides);
    stroke(255, 45);
    strokeWeight(0.7);
    poly(0, 0, rock.size * 0.5, rock.sides);
    pop();
  }
}

function invDrawEscortShip() {
  if (invEscortShipIframes > 0 && floor(invEscortShipIframes / 5) % 2 === 0) return;
  const transitionT = constrain(invTransitionFrame / INV_TRANSITION_DUR, 0, 1);
  const shipY = lerp(INV_BOTTOM_Y + INV_BOTTOM_H + 40, INV_SHIP_Y, transitionT);

  push();
  translate(invEscortShipX, shipY);
  stroke(255, 255 * transitionT);
  strokeWeight(1.6);
  noFill();
  shipPath();

  const thr = 10 + sin(frameCount * 0.35) * 3;
  stroke(255, 160 * transitionT);
  strokeWeight(1.1);
  line(-8, 15, -8, 15 + thr * 0.8);
  line(0, 17, 0, 17 + thr);
  line(8, 15, 8, 15 + thr * 0.8);
  pop();
}

function invTickLowerZone() {
  invSyncEscortShipToAstronaut();
  invTickEscortBullets();
  invSpawnEscortRock();
  invTickEscortRocks();
  invDrawEscortShip();
}

function invTickLowerZoneIntro() {
  invSyncEscortShipToAstronaut();
  invTickEscortBullets();
  invDrawEscortShip();
}

initInvasion = function () {
  captureTransitionEcho('invasion');
  enemies = [];
  obstacles = [];
  bullets = [];
  sparks = [];
  shrapnel = [];
  bgPulse = 0;
  combo = 0;
  comboTimer = 0;

  initMaze();
  initAstronaut();
  initAliens();

  invPhase = 'intro';
  invTimer = 130;
  invLives = 4;
  invTouchHint = 40;
  invEscortRocks = [];
  invEscortRockClock = 0;
  invEscortRockRate = max(44, 80 - wave * 2);
  invEscortShipIframes = 0;
  invEscortBullets = [];
  invEscortFireTimer = 0;
  invTransitionFrame = 0;
  invSyncEscortShipToAstronaut();
};

invasionFrame = function () {
  background(0);
  drawTransitionEcho();
  if (invTransitionFrame < INV_TRANSITION_DUR) invTransitionFrame++;
  invDrawLowerZoneBase();
  drawMaze();

  if (invPhase === 'intro') {
    invTickLowerZoneIntro();
    _drawInvasionIntro();
    invTimer--;
    if (invTimer <= 0) invPhase = 'playing';
    crtOverlay();
    drawBorder();
    return;
  }

  if (invPhase === 'outro' || invPhase === 'fail') {
    tickSparks();
    tickShrapnel();
    if (invPhase === 'outro') _drawInvasionOutro();
    else _drawInvasionFail();
    invTimer--;
    if (invTimer <= 0) {
      if (invPhase === 'fail') _applyInvasionFail();
      else _endInvasion();
    }
    crtOverlay();
    drawBorder();
    return;
  }

  if (invTouchHint > 0) invTouchHint--;
  if (invEscortShipIframes > 0) invEscortShipIframes--;

  tickAstronaut();
  tickAliens();
  invTickLowerZone();
  tickSparks();
  tickShrapnel();

  if (flashAmt > 0) {
    noStroke();
    fill(255, flashAmt);
    rect(0, 0, W, H);
    flashAmt = max(0, flashAmt - 12);
  }

  drawInvasionHUD();
  crtOverlay();
  drawBorder();

  const aliensAlive = invAliens.filter(a => !a.dead).length;
  if (invDotsEaten >= invDotsTotal || aliensAlive === 0) {
    invPhase = 'outro';
    invTimer = 110;
    shake(10, 14);
    flashAmt = 90;
    score += 100 * wave;
  }
};

_endInvasion = function () {
  ball.x = W / 2;
  ball.y = H / 3;
  ball.vx = (random() < 0.5 ? 1 : -1) * 4;
  ball.vy = 5;
  ball.dead = false;
  ball.trail = [];
  ball.respawnTimer = 0;

  spawnClock = 0;
  obsClock = 0;
  invEscortRocks = [];
  invEscortBullets = [];
  if (lives < MAX_LIVES) lives++;

  lastWaveAnnounced = wave;
  waveAnnounceTimer = 180;
  state = 'play';
};

invaderHitPlayer = function () {
  invLives--;
  astIframes = 120;
  shake(14, 18);
  flashAmt = 130;
  explode(astX, astY, 18);

  if (invLives <= 0) {
    invPhase = 'fail';
    invTimer = 110;
    shake(20, 26);
    flashAmt = 180;
    return;
  }

  initAstronaut();
  astIframes = 120;
  invSyncEscortShipToAstronaut();
};

_drawInvasionIntro = function () {
  const t = invTimer;
  const pulse = sin(t * 0.4) * 0.5 + 0.5;
  const transitionT = constrain(invTransitionFrame / INV_TRANSITION_DUR, 0, 1);
  const planet = getPlanet(wave);
  const introTop = 0;
  const introBottom = INV_TOP_H;
  const introH = introBottom - introTop;
  const panelY = introTop + introH * 0.5;
  const glowAlpha = (28 + pulse * 32) * transitionT;
  const lineAlpha = (18 + pulse * 18) * transitionT;
  const accentAlpha = (90 + pulse * 70) * transitionT;
  const textFade = constrain(map(t, 26, 0, 255, 0), 0, 255) * transitionT;

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, introTop, W, introBottom - introTop);
  drawingContext.clip();

  const grad = drawingContext.createLinearGradient(0, introTop, 0, introBottom);
  grad.addColorStop(0, `rgba(${planet.r},${planet.g},${planet.b},${0.14 * transitionT})`);
  grad.addColorStop(0.55, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, introTop, W, introBottom - introTop);

  noStroke();
  fill(255, glowAlpha * 0.18);
  rect(0, introTop, W, introBottom - introTop);

  stroke(255, lineAlpha);
  strokeWeight(0.8);
  for (let y = introTop; y < introBottom; y += 6) line(0, y, W, y);

  const blink = floor(t / 5) % 2 === 0;
  if (blink) {
    const tri = 12;
    noStroke();
    fill(planet.r, planet.g, planet.b, accentAlpha * 0.8);
    triangle(18, 18, 18 + tri, 18, 18, 18 + tri);
    triangle(W - 18, 18, W - 18 - tri, 18, W - 18, 18 + tri);
    triangle(18, INV_TOP_H - 18, 18 + tri, INV_TOP_H - 18, 18, INV_TOP_H - 18 - tri);
    triangle(W - 18, INV_TOP_H - 18, W - 18 - tri, INV_TOP_H - 18, W - 18, INV_TOP_H - 18 - tri);
  }

  noFill();
  stroke(planet.r, planet.g, planet.b, accentAlpha * 0.3);
  strokeWeight(1.1);
  rect(28, 26, W - 56, introH - 52);
  stroke(255, accentAlpha * 0.18);
  rect(36, 34, W - 72, introH - 68);

  push();
  translate(W / 2, panelY);
  rotate(t * 0.012);
  stroke(planet.r, planet.g, planet.b, accentAlpha * 0.3);
  strokeWeight(1);
  noFill();
  poly(0, 0, 84 + pulse * 8, 6);
  rotate(-t * 0.02);
  stroke(255, accentAlpha * 0.22);
  poly(0, 0, 52 + pulse * 5, 4);
  pop();

  push();
  translate(W / 2, panelY);
  textFont('monospace');
  textAlign(CENTER);
  noStroke();
  fill(255, 110 * transitionT);
  textSize(10);
  text('BREACH DETECTED', 0, -54);
  fill(planet.r, planet.g, planet.b, textFade * 0.85);
  textSize(12);
  text(planet.name, 0, -38);

  const sc = 1 + sin(t * 0.25) * 0.04;
  scale(sc);
  fill(255, 38 + pulse * 40 * transitionT);
  textSize(34);
  text('SHIP', 0, -6);
  text('INVADED', 0, 28);
  fill(255, textFade);
  textSize(34);
  text('SHIP', 0, -6);
  text('INVADED', 0, 28);

  fill(255, 92 * transitionT);
  textSize(9);
  text('PACIFY THE BREACH AND RESTORE CONTROL', 0, 56);
  pop();

  stroke(planet.r, planet.g, planet.b, accentAlpha * 0.45);
  strokeWeight(1);
  line(78, panelY - 20, 138, panelY - 20);
  line(W - 78, panelY - 20, W - 138, panelY - 20);
  line(78, panelY + 18, 138, panelY + 18);
  line(W - 78, panelY + 18, W - 138, panelY + 18);

  drawingContext.restore();

  if (transitionT < 1) {
    noStroke();
    fill(0, (1 - transitionT) * 255);
    rect(0, 0, W, H);
  }
};
