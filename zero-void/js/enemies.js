// ═══════════════════════════════════════════════════════════════
//  ENEMIES
// ═══════════════════════════════════════════════════════════════

const PATTERNS = ['straight', 'sine', 'zigzag', 'chase', 'bezier'];
const TYPES    = ['diamond', 'tri', 'cross', 'hex'];

function spawnGroup() {
  let planet = getPlanet(wave);
  let gm     = planet.groupMult || 1.0;

  // ── Lateral wave (Uranus / Venus / Neptune) ──────────────────
  if (planet.lateralEntry > 0 && random() < planet.lateralEntry) {
    let n = constrain(floor(random(2, 4) * gm), 1, 6);
    for (let i = 0; i < n; i++) _spawnLateralEnemy();
    return;
  }

  // ── Mars: pair bias (Phobos & Deimos) ────────────────────────
  if (planet.pairBias && random() < 0.5) {
    let gap = random(50, 130);
    let cx  = random(70, W - 70);
    spawnEnemy(cx - gap / 2, -30);
    spawnEnemy(cx + gap / 2, -22);
    return;
  }

  // ── Saturn: arc / ring formation ─────────────────────────────
  if (planet.ringSpawn && random() < 0.55) {
    let n  = floor(random(4, 7));
    let cx = W / 2;
    let r  = random(100, 150);
    for (let i = 0; i < n; i++) {
      let a = map(i, 0, n, -PI * 0.55, PI * 0.55) - HALF_PI;
      spawnEnemy(cx + cos(a) * r, -20 + (sin(a) + 1) * 30);
    }
    return;
  }

  // ── Standard formations (scaled by groupMult) ─────────────────
  let roll = random();
  if (roll < 0.28) {
    spawnEnemy(random(30, W - 30), -30);
  } else if (roll < 0.55) {
    let n   = constrain(floor(random(2, 5) * gm), 2, 8);
    let gap = (W - 80) / max(1, n - 1);
    for (let i = 0; i < n; i++) spawnEnemy(40 + gap * i, -30 - i * 15);
  } else if (roll < 0.75) {
    let cx = random(80, W - 80);
    spawnEnemy(cx, -30);
    spawnEnemy(cx - 45, -10); spawnEnemy(cx + 45, -10);
    if (wave > 4 || gm > 1.3) { spawnEnemy(cx - 90, 10); spawnEnemy(cx + 90, 10); }
  } else {
    let n = constrain(floor((3 + floor(wave * 0.4)) * gm), 3, 10);
    let cx = W / 2;
    for (let i = 0; i < n; i++) {
      let a = map(i, 0, n - 1, -PI * 0.4, PI * 0.4) - HALF_PI;
      spawnEnemy(cx + cos(a) * 140, -50 + (sin(a) + 1) * 50);
    }
  }
}

function spawnEnemy(x, y) {
  let planet  = getPlanet(wave);
  let ptypes  = planet.types;
  let isHeavy = random() < 0.12 && wave > 1 && ptypes.includes('hex');
  let type    = isHeavy ? 'hex' : ptypes[floor(random(ptypes.length))];

  let basespd = random(1.6, 2.8) + wave * 0.18;
  let spd     = basespd * (planet.speedMult || 1.0);

  let availPat = planet.patterns || PATTERNS;
  let pat      = availPat[floor(random(availPat.length))];
  if (type === 'hex') { pat = 'straight'; spd *= 0.7; }

  let sineAmp = random(35, 90) * (planet.sineAmpMult || 1.0);

  let bx1 = random(W), by1 = random(H * 0.3, H * 0.5);
  let bx2 = random(W), by2 = random(H * 0.5, H * 0.8);

  enemies.push({
    x, y,
    vy: spd, vx: 0,
    type, pattern: pat,
    phase: random(TWO_PI),
    sineAmp,
    sineFreq: random(0.022, 0.048),
    initX: x,
    t: 0,
    rot: random(TWO_PI),
    rotSpd: random(-0.07, 0.07),
    size: isHeavy ? 22 : random(11, 20),
    hp: isHeavy ? 3 : 1,
    maxHp: isHeavy ? 3 : 1,
    hitFlash: 0,
    bx1, by1, bx2, by2,
    bProgress: 0,
  });
}

// Enemies entering from left / right (Uranus axis tilt, Venus retrograde, Neptune winds)
function _spawnLateralEnemy() {
  let planet     = getPlanet(wave);
  let ptypes     = planet.types;
  let type       = ptypes[floor(random(ptypes.length))];
  let basespd    = random(1.6, 2.8) + wave * 0.18;
  let spd        = basespd * (planet.speedMult || 1.0);
  let fromLeft   = random() < 0.5;

  enemies.push({
    x:       fromLeft ? -35 : W + 35,
    y:       random(60, H * 0.62),
    vx:      fromLeft ? spd * 1.5 : -spd * 1.5,
    vy:      spd * 0.22,
    type,
    pattern: 'lateral',
    phase:   random(TWO_PI),
    sineAmp: 0,
    sineFreq: 0,
    initX:   fromLeft ? -35 : W + 35,
    t: 0,
    rot:     random(TWO_PI),
    rotSpd:  random(-0.07, 0.07),
    size:    random(11, 20),
    hp: 1, maxHp: 1, hitFlash: 0,
    bx1: 0, by1: 0, bx2: 0, by2: 0, bProgress: 0,
  });
}

function tickEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.t += timeScale;
    e.rot += e.rotSpd * timeScale;
    e.hitFlash = max(0, e.hitFlash - 1);

    switch (e.pattern) {
      case 'straight':
        e.y += e.vy * timeScale; break;
      case 'sine':
        e.y += e.vy * timeScale;
        e.x = e.initX + sin(e.t * e.sineFreq + e.phase) * e.sineAmp;
        e.x = constrain(e.x, 22, W - 22); break;
      case 'zigzag':
        e.y += e.vy * timeScale;
        e.x += sin(e.t * 0.045 + e.phase) * 3.5 * timeScale;
        e.x = constrain(e.x, 22, W - 22); break;
      case 'chase':
        e.y += e.vy * timeScale;
        e.x += (player.x - e.x) * 0.014 * timeScale; break;
      case 'bezier':
        e.bProgress += (0.008 + wave * 0.001) * timeScale;
        let bp   = min(e.bProgress, 1);
        let bpos = cubicBezier(e.initX, -30, e.bx1, e.by1, e.bx2, e.by2, W/2, H + 120, bp);
        e.x = bpos.x; e.y = bpos.y; break;
      case 'lateral':
        e.x += e.vx * timeScale;
        e.y += e.vy * timeScale; break;
    }

    if (e.y > H + 55 || e.x < -70 || e.x > W + 70 || e.bProgress >= 1) {
      enemies.splice(i, 1); combo = 0; continue;
    }

    // Bullet collisions
    let killed = false;
    for (let j = bullets.length - 1; j >= 0; j--) {
      let b = bullets[j];
      if (dist(b.x, b.y, e.x, e.y) < e.size + 5) {
        bullets.splice(j, 1);
        e.hp--;
        e.hitFlash = 8;
        for (let k = 0; k < 7; k++) {
          let a = random(TWO_PI);
          addSpark(e.x, e.y, cos(a)*random(2,6), sin(a)*random(2,6), random(1.5,4), random(0.06,0.14));
        }
        if (e.hp <= 0) { killEnemy(e, i); killed = true; break; }
        sndEnemyHit();
        break;
      }
    }
    if (killed) continue;

    // Player collision
    if (player.iframes === 0 && dist(player.x, player.y, e.x, e.y) < e.size + 13) {
      hitPlayer(e.x, e.y);
      enemies.splice(i, 1);
      continue;
    }

    drawEnemy(e);
  }
}

function killEnemy(e, idx) {
  enemies.splice(idx, 1);
  combo++;
  comboTimer = 160;
  let pts = 10 * wave + (combo > 1 ? combo * 3 : 0);
  score += pts;
  bgPulse = 55;
  shake(4, 7);
  explode(e.x, e.y, 20);
  sndEnemyKill();
  if (combo > 1 && combo % 5 === 0) sndCombo();
}

function drawEnemy(e) {
  push(); translate(e.x, e.y); rotate(e.rot);
  let p  = getPlanet(wave);
  let sw = e.hitFlash > 0 ? 3 : 1.6;
  stroke(p.r, p.g, p.b); strokeWeight(sw); noFill();
  if (e.hitFlash > 0) fill(p.r, p.g, p.b, 70);

  switch (e.type) {
    case 'diamond': {
      let s = e.size;
      beginShape();
      vertex(0, -s); vertex(s*0.65, 0); vertex(0, s); vertex(-s*0.65, 0);
      endShape(CLOSE);
      noFill(); stroke(p.r, p.g, p.b, 75); strokeWeight(0.8);
      beginShape();
      vertex(0, -s*0.5); vertex(s*0.35, 0); vertex(0, s*0.5); vertex(-s*0.35, 0);
      endShape(CLOSE);
      break;
    }
    case 'tri': {
      let s = e.size;
      beginShape(); vertex(0, s); vertex(-s, -s); vertex(s, -s); endShape(CLOSE);
      noFill(); stroke(p.r, p.g, p.b, 60); strokeWeight(0.8);
      beginShape(); vertex(0, 0); vertex(-s*0.5, -s*0.5); vertex(s*0.5, -s*0.5); endShape(CLOSE);
      break;
    }
    case 'cross': {
      let s = e.size;
      strokeWeight(sw);
      line(-s, 0, s, 0); line(0, -s, 0, s);
      line(-s*0.7, -s*0.7, s*0.7, s*0.7);
      line( s*0.7, -s*0.7,-s*0.7, s*0.7);
      break;
    }
    case 'hex': {
      poly(0, 0, e.size, 6);
      noFill(); stroke(p.r, p.g, p.b, 100); strokeWeight(1);
      poly(0, 0, e.size * 0.55, 3);
      stroke(p.r, p.g, p.b); strokeWeight(1.5);
      for (let h = 0; h < e.maxHp; h++) {
        let hx = (h - (e.maxHp - 1) / 2) * 9;
        if (h < e.hp) fill(p.r, p.g, p.b); else noFill();
        rect(hx - 3, e.size + 5, 6, 4);
      }
      break;
    }
    case 'circle': {
      let s = e.size;
      ellipse(0, 0, s * 2);
      noFill(); stroke(p.r, p.g, p.b, 70); strokeWeight(0.8);
      ellipse(0, 0, s);
      stroke(p.r, p.g, p.b, 50); strokeWeight(0.7);
      line(-s * 0.5, 0, s * 0.5, 0);
      line(0, -s * 0.5, 0, s * 0.5);
      break;
    }
    case 'pentagon': {
      poly(0, 0, e.size, 5);
      noFill(); stroke(p.r, p.g, p.b, 65); strokeWeight(0.8);
      poly(0, 0, e.size * 0.5, 5);
      break;
    }
    case 'ring': {
      let s = e.size;
      ellipse(0, 0, s * 2);
      noFill(); stroke(p.r, p.g, p.b, 80); strokeWeight(1.2);
      ellipse(0, 0, s * 1.35);
      stroke(p.r, p.g, p.b, 40); strokeWeight(0.7);
      ellipse(0, 0, s * 0.6);
      break;
    }
    case 'square': {
      poly(0, 0, e.size, 4);
      noFill(); stroke(p.r, p.g, p.b, 65); strokeWeight(0.8);
      poly(0, 0, e.size * 0.52, 4);
      break;
    }
    case 'octagon': {
      poly(0, 0, e.size, 8);
      noFill(); stroke(p.r, p.g, p.b, 65); strokeWeight(0.8);
      poly(0, 0, e.size * 0.55, 4);
      break;
    }
  }
  pop();
}
