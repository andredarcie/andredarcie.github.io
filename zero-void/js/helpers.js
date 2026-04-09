// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function shake(amt, dur) {
  shakeAmt = max(shakeAmt, amt);
  shakeDur = max(shakeDur, dur);
}

function poly(x, y, r, sides) {
  beginShape();
  for (let i = 0; i < sides; i++) {
    let a = (TWO_PI / sides) * i - HALF_PI;
    vertex(x + cos(a) * r, y + sin(a) * r);
  }
  endShape(CLOSE);
}

function cubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, t) {
  let mt = 1 - t;
  return {
    x: mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3,
    y: mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3,
  };
}

// ── Planet helpers ────────────────────────────────────────────

function getPlanet(w) {
  return PLANETS[min(w - 1, PLANETS.length - 1)];
}

function planetStroke(p, alpha) {
  stroke(p.r, p.g, p.b, alpha !== undefined ? alpha : 255);
}

function planetFill(p, alpha) {
  fill(p.r, p.g, p.b, alpha !== undefined ? alpha : 255);
}
