// ═══════════════════════════════════════════════════════════════
//  PLAYER
// ═══════════════════════════════════════════════════════════════

function shoot() {
  let px = player.x, py = player.y;
  bullets.push({ x: px, y: py - 28, vx: 0, vy: -15, w: 3 });
  for (let i = 0; i < 5; i++) {
    addSpark(px, py - 24, random(-1.5, 1.5), random(-4, -0.5), random(1, 3), 0.18);
  }
}

function drawPlayer() {
  let px = player.x, py = player.y;
  let lowLife = lives === 1 && state === 'play';
  let damageJitter = lowLife ? sin(frameCount * 0.7) * 1.2 : 0;

  // Trail
  player.trail.push({ x: px, y: py });
  if (player.trail.length > 18) player.trail.shift();
  for (let i = 0; i < player.trail.length - 1; i++) {
    let t = player.trail[i];
    let a  = map(i, 0, player.trail.length, 0, 45);
    let sc = map(i, 0, player.trail.length, 0.25, 0.85);
    stroke(255, a); strokeWeight(0.7); noFill();
    push(); translate(t.x, t.y); scale(sc); shipPath(); pop();
  }

  // Blink during iframes
  if (player.iframes > 0 && floor(player.iframes / 5) % 2 === 0) return;

  // Thrusters
  let th = sin(player.thrPhase) * 5 + 12;
  let leftTh = lowLife ? th * (0.45 + noise(frameCount * 0.05) * 1.3) : th * 0.8;
  let midTh = lowLife ? th * (0.65 + sin(frameCount * 0.32) * 0.28) : th;
  let rightTh = lowLife ? th * (0.25 + noise(80 + frameCount * 0.06) * 1.5) : th * 0.8;
  stroke(255, lowLife ? 120 + sin(frameCount * 0.5) * 60 : 170);
  strokeWeight(1.4); noFill();
  push(); translate(px, py);
  line(-8, 15, -8 + damageJitter, 15 + leftTh);
  line( 0, 17,  0, 17 + midTh);
  line( 8, 15,  8 - damageJitter, 15 + rightTh);
  for (let i = 0; i < 2; i++) {
    if (random() < (lowLife ? 0.68 : 0.4)) {
      addSpark(px + [-8, 0, 8][floor(random(3))], py + 17 + th,
               random(-0.5, 0.5), random(0.5, 2), random(1, 2), 0.25);
    }
  }
  if (lowLife && frameCount % 11 === 0) {
    addSpark(px + random([-16, 16]), py + random(-4, 12), random(-1.2, 1.2), random(0.5, 2.5), random(1, 2.4), 0.16);
  }
  pop();

  // Ship body
  push(); translate(px + damageJitter * 0.35, py);
  stroke(255, lowLife ? 190 + sin(frameCount * 0.4) * 55 : 255);
  strokeWeight(1.8); noFill();
  shipPath();
  // Cockpit
  stroke(255, 160); strokeWeight(1.1);
  beginShape();
  vertex(0, -18); vertex(-5, -4); vertex(5, -4);
  endShape(CLOSE);
  // Wing detail
  stroke(255, 90); strokeWeight(0.8);
  line(-16, 6, -10, 11);
  line( 16, 6,  10, 11);
  if (lowLife) {
    stroke(255, 120 + sin(frameCount * 0.8) * 60);
    line(-11, -5, -4, -1);
    line(7, 2, 14, 7);
  }
  pop();
}

function shipPath() {
  beginShape();
  vertex( 0, -28);
  vertex(-18, 13); vertex(-9, 7);
  vertex( 0,  15);
  vertex( 9,  7); vertex(18, 13);
  endShape(CLOSE);
}

// ═══════════════════════════════════════════════════════════════
//  BULLETS
// ═══════════════════════════════════════════════════════════════

function tickBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.y < -20) { bullets.splice(i, 1); continue; }

    stroke(255); strokeWeight(b.w);
    line(b.x, b.y, b.x + b.vx * 2, b.y + b.vy * 2);
    stroke(255, 55); strokeWeight(b.w + 3);
    line(b.x, b.y, b.x + b.vx * 1.5, b.y + b.vy * 1.5);
  }
}

// ═══════════════════════════════════════════════════════════════
//  HIT & DEATH
// ═══════════════════════════════════════════════════════════════

function hitPlayer(ex, ey) {
  shake(13, 16);
  flashAmt = 130;
  lives--;
  player.iframes = 140;
  explode(player.x, player.y, 28);

  if (lives <= 0) {
    hiScore = max(hiScore, score);
    shake(20, 28);
    flashAmt = 210;
    state = 'dead';
    deathTimer = 0;
  }
}
