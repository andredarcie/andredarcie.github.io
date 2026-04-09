// ═══════════════════════════════════════════════════════════════
//  PARTICLES — sparks + shrapnel
// ═══════════════════════════════════════════════════════════════

function addSpark(x, y, vx, vy, size, decay) {
  sparks.push({ x, y, vx, vy, life: 1, decay, size, type: 'spark' });
}

function explode(x, y, count) {
  for (let i = 0; i < count; i++) {
    let a = random(TWO_PI), spd = random(2, 10);
    shrapnel.push({
      x, y,
      vx: cos(a) * spd, vy: sin(a) * spd,
      life: 1, decay: random(0.018, 0.048),
      rot: random(TWO_PI), rotSpd: random(-0.22, 0.22),
      size: random(3, 10),
      sides: random() < 0.5 ? 0 : floor(random(3, 6)),
    });
  }
}

function tickSparks() {
  for (let i = sparks.length - 1; i >= 0; i--) {
    let p = sparks[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.91; p.vy *= 0.91;
    p.life -= p.decay;
    if (p.life <= 0) { sparks.splice(i, 1); continue; }

    let a = p.life * 255;
    if (p.type === 'spark') {
      stroke(255, a); strokeWeight(p.size * 0.5); noFill();
      line(p.x, p.y, p.x - p.vx * 3, p.y - p.vy * 3);
    } else if (p.type === 'text') {
      noStroke(); fill(255, a);
      textFont('monospace'); textSize(p.size); textAlign(CENTER);
      text(p.text, p.x, p.y);
    }
  }
}

function tickShrapnel() {
  for (let i = shrapnel.length - 1; i >= 0; i--) {
    let s = shrapnel[i];
    s.x += s.vx; s.y += s.vy;
    s.vx *= 0.93; s.vy *= 0.93;
    s.vy += 0.06;
    s.life -= s.decay;
    s.rot += s.rotSpd;
    if (s.life <= 0) { shrapnel.splice(i, 1); continue; }

    let a = s.life * 255;
    stroke(255, a); strokeWeight(1.2); noFill();
    push(); translate(s.x, s.y); rotate(s.rot);
    if (s.sides === 0) line(-s.size, 0, s.size, 0);
    else poly(0, 0, s.size, s.sides);
    pop();
  }
}
