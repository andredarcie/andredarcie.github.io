// ═══════════════════════════════════════════════════════════════
//  BREAKOUT BALL
// ═══════════════════════════════════════════════════════════════

function tickBall() {
  // Dead: respawn countdown
  if (ball.dead) {
    ball.respawnTimer--;
    let progress = 1 - ball.respawnTimer / 200;
    stroke(255, 80); strokeWeight(1.4); noFill();
    arc(player.x, player.y - 48, 28, 28, -HALF_PI, -HALF_PI + TWO_PI * progress);
    stroke(255, 40); strokeWeight(0.8);
    ellipse(player.x, player.y - 48, 10, 10);
    if (ball.respawnTimer <= 0) {
      ball.x = player.x;
      ball.y = player.y - 55;
      let a   = random(-PI * 0.32, PI * 0.32) - HALF_PI;
      let spd = ball.speed + wave * 0.12;
      ball.vx = cos(a) * spd;
      ball.vy = sin(a) * spd;
      ball.dead  = false;
      ball.trail = [];
      shake(3, 5); flashAmt = 28;
    }
    return;
  }

  // Trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 14) ball.trail.shift();

  // Move
  ball.x += ball.vx * timeScale;
  ball.y += ball.vy * timeScale;

  // Normalize speed
  let spd = ball.speed + wave * 0.1;
  let mag = sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (mag > 0.01) { ball.vx = ball.vx / mag * spd; ball.vy = ball.vy / mag * spd; }

  // Wall bounces
  let margin = 14;
  if (ball.x - ball.r < margin) {
    ball.x = margin + ball.r;
    ball.vx = abs(ball.vx);
    wallBounceEffect(ball.x, ball.y);
  }
  if (ball.x + ball.r > W - margin) {
    ball.x = W - margin - ball.r;
    ball.vx = -abs(ball.vx);
    wallBounceEffect(ball.x, ball.y);
  }
  if (ball.y - ball.r < margin) {
    ball.y = margin + ball.r;
    ball.vy = abs(ball.vy);
    wallBounceEffect(ball.x, ball.y);
  }

  // Ship deflection (paddle)
  let padHalf = 22;
  let padY    = player.y - 16;
  if (ball.vy > 0 &&
      ball.y + ball.r >= padY &&
      ball.y < player.y + 10 &&
      abs(ball.x - player.x) < padHalf + ball.r) {

    let offset = (ball.x - player.x) / padHalf;
    let angle  = offset * (PI * 0.38) - HALF_PI;
    ball.vx = cos(angle) * spd;
    ball.vy = sin(angle) * spd;
    ball.y  = padY - ball.r;

    shake(3, 5);
    for (let i = 0; i < 10; i++) {
      addSpark(ball.x, padY, random(-3, 3), random(-4, -0.5), random(1, 3), 0.14);
    }
  }

  // Fell below screen
  if (ball.y > H + 20) {
    ball.dead = true;
    ball.respawnTimer = 200;
    shake(8, 12);
    flashAmt = 70;
    explode(ball.x, H - 20, 16);
    return;
  }

  // Enemy collision
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let d = dist(ball.x, ball.y, e.x, e.y);
    if (d < ball.r + e.size) {
      let nx = (ball.x - e.x) / d, ny = (ball.y - e.y) / d;
      let dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.x = e.x + nx * (ball.r + e.size + 1);
      ball.y = e.y + ny * (ball.r + e.size + 1);

      e.hp -= 2; e.hitFlash = 10;
      shake(5, 8); bgPulse = 40;
      for (let k = 0; k < 8; k++) {
        let a = random(TWO_PI);
        addSpark(e.x, e.y, cos(a)*random(2,6), sin(a)*random(2,6), random(1.5,3.5), 0.1);
      }
      if (e.hp <= 0) { killEnemy(e, i); }
      break;
    }
  }

  // Obstacle bounce
  for (let o of obstacles) {
    let d = dist(ball.x, ball.y, o.x, o.y);
    if (d < ball.r + o.size * 0.72) {
      let nx = (ball.x - o.x) / d, ny = (ball.y - o.y) / d;
      let dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.x = o.x + nx * (ball.r + o.size * 0.72 + 1);
      ball.y = o.y + ny * (ball.r + o.size * 0.72 + 1);
      shake(2, 4);
      wallBounceEffect(ball.x, ball.y);
      break;
    }
  }

  // Draw trail
  for (let i = 0; i < ball.trail.length; i++) {
    let t = ball.trail[i];
    let a = map(i, 0, ball.trail.length, 0, 55);
    let r = map(i, 0, ball.trail.length, 1.5, ball.r * 0.65);
    stroke(255, a); strokeWeight(1); noFill();
    ellipse(t.x, t.y, r * 2);
  }

  // Draw ball
  stroke(255); strokeWeight(1.8); noFill();
  ellipse(ball.x, ball.y, ball.r * 2);
  stroke(255, 130); strokeWeight(1.1);
  line(ball.x - ball.r * 0.58, ball.y, ball.x + ball.r * 0.58, ball.y);
  line(ball.x, ball.y - ball.r * 0.58, ball.x, ball.y + ball.r * 0.58);
  stroke(255, 55); strokeWeight(0.8);
  let ir = ball.r * 0.42;
  line(ball.x - ir, ball.y - ir, ball.x + ir, ball.y + ir);
  line(ball.x + ir, ball.y - ir, ball.x - ir, ball.y + ir);
}

function wallBounceEffect(x, y) {
  shake(2, 3);
  for (let i = 0; i < 5; i++) {
    addSpark(x, y, random(-2, 2), random(-2, 2), random(1, 2.5), 0.18);
  }
}
