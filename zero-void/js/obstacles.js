// ═══════════════════════════════════════════════════════════════
//  OBSTACLES
// ═══════════════════════════════════════════════════════════════

function spawnObstacle() {
  let planet  = getPlanet(wave);
  let fm      = planet.fallMult  || 1.0;
  let dm      = planet.driftMult || 1.0;
  let szMin   = (planet.obsSize  || [14, 32])[0];
  let szMax   = (planet.obsSize  || [14, 32])[1];
  let sides   = floor(random(3, 8));

  obstacles.push({
    x:          random(35, W - 35),
    y:          -40,
    vy:         (random(2.2, 4.2) + wave * 0.12) * fm,
    drift:      random(-0.7, 0.7) * dm,
    wobbleMult: dm * 0.6,
    rot:        random(TWO_PI),
    rotSpd:     random(-0.09, 0.09),
    size:       random(szMin, szMax),
    sides,
    wobble:     random(TWO_PI),
    wobbleFreq: random(0.03, 0.06),
    t: 0,
  });
}

function spawnLifePod() {
  lifePods.push({
    x: random(40, W - 40), y: -34,
    vy: random(1.8, 2.8) + wave * 0.08,
    drift: random(-0.45, 0.45),
    wobble: random(TWO_PI),
    wobbleFreq: random(0.025, 0.05),
    rot: random(TWO_PI),
    rotSpd: random(-0.04, 0.04),
    t: 0,
    size: 14,
  });
}

function tickObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let o = obstacles[i];
    o.t += timeScale;
    o.y += o.vy * timeScale;
    o.x += (o.drift + sin(o.t * o.wobbleFreq + o.wobble) * o.wobbleMult) * timeScale;
    o.x = constrain(o.x, 25, W - 25);
    o.rot += o.rotSpd * timeScale;

    if (o.y > H + 60) { obstacles.splice(i, 1); continue; }

    if (player.iframes === 0 && dist(player.x, player.y, o.x, o.y) < o.size + 11) {
      hitPlayer(o.x, o.y);
      explode(o.x, o.y, 14);
      sndObstacleHit();
      obstacles.splice(i, 1);
      continue;
    }

    push(); translate(o.x, o.y); rotate(o.rot);
    stroke(255); strokeWeight(1.5); noFill();
    poly(0, 0, o.size, o.sides);
    stroke(255, 45); strokeWeight(0.7);
    poly(0, 0, o.size * 0.48, o.sides);
    pop();
  }
}

function tickLifePods() {
  for (let i = lifePods.length - 1; i >= 0; i--) {
    let pod = lifePods[i];
    pod.t += timeScale;
    pod.y += pod.vy * timeScale;
    pod.x += (pod.drift + sin(pod.t * pod.wobbleFreq + pod.wobble) * 0.45) * timeScale;
    pod.x = constrain(pod.x, 28, W - 28);
    pod.rot += pod.rotSpd * timeScale;

    if (pod.y > H + 40) {
      lifePods.splice(i, 1);
      continue;
    }

    if (dist(player.x, player.y, pod.x, pod.y) < pod.size + 15) {
      lives = min(MAX_LIVES, lives + 1);
      flashAmt = max(flashAmt, 70);
      shake(6, 8);
      for (let k = 0; k < 10; k++) {
        let a = random(TWO_PI);
        addSpark(pod.x, pod.y, cos(a) * random(1.2, 4.2), sin(a) * random(1.2, 4.2), random(1.2, 2.8), 0.12);
      }
      sndLifePickup();
      lifePods.splice(i, 1);
      continue;
    }

    let pulse = sin(pod.t * 0.08) * 0.5 + 0.5;
    let halo = pod.size * (2.8 + pulse * 0.7);
    let p = getPlanet(wave);

    push();
    translate(pod.x, pod.y);
    rotate(pod.rot);
    noFill();
    stroke(p.r, p.g, p.b, 34 + pulse * 50);
    strokeWeight(0.9);
    ellipse(0, 0, halo);
    rotate(-pod.rot * 1.8);
    stroke(255, 45 + pulse * 75);
    poly(0, 0, pod.size * 1.85, 6);
    rotate(pod.rot * 2.6);
    stroke(255, 95 + pulse * 100);
    strokeWeight(1.1);
    poly(0, 0, pod.size * 1.28, 4);
    stroke(255);
    strokeWeight(1.5);
    ellipse(0, 0, pod.size * 2);
    line(-pod.size * 0.5, 0, pod.size * 0.5, 0);
    line(0, -pod.size * 0.5, 0, pod.size * 0.5);
    noStroke();
    fill(255, 70 + pulse * 95);
    circle(0, 0, 3.5 + pulse * 2.5);
    stroke(255, 55);
    strokeWeight(0.8);
    ellipse(0, 0, pod.size * 2.7);
    pop();
  }
}
