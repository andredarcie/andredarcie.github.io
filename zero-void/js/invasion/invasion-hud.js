// ═══════════════════════════════════════════════════════════════
//  INVASION — HUD
// Mirrors the main game HUD style: same font, same positions,
// same text sizes. No background bars or heavy fills.
// ═══════════════════════════════════════════════════════════════

function drawInvasionHUD() {
  let p = getPlanet(wave);
  let lowerInfoY = INV_TOP_H - 18;
  textFont('monospace');

  // ── Score (top left — mirrors main HUD) ───────────────────
  noStroke(); fill(255);
  textSize(10); textAlign(LEFT);
  text('SCORE', 16, 22);
  textSize(26); text(score, 16, 50);

  // ── Wave + planet (top center) ────────────────────────────
  fill(p.r, p.g, p.b, 160); textSize(10); textAlign(CENTER);
  text('WAVE ' + wave, W / 2, 20);
  fill(p.r, p.g, p.b, 230); textSize(17);
  text(p.name, W / 2, 40);

  // "INVADED" sub-label
  fill(255, 90); textSize(8);
  text('INVADED', W / 2, 56);

  // ── Invasion lives (top right — helmet icons like ship icons in main HUD) ──
  textAlign(RIGHT); textSize(10); fill(255, 130);
  text('LIVES', W - 16, 22);
  for (let i = 0; i < 4; i++) {
    drawAstronautIcon(W - 20 - i * 22, 42, i >= invLives);
  }

  // ── Dots remaining (bottom — minimal, no bar background) ──
  let aliensLeft = invAliens.filter(a => !a.dead).length;
  let dotsLeft   = invDotsTotal - invDotsEaten;

  noStroke(); fill(255, 100); textSize(9); textAlign(LEFT);
  text('DOTS  ' + dotsLeft, 16, lowerInfoY);

  fill(255, 100); textAlign(RIGHT);
  text('ALIENS  ' + aliensLeft, W - 16, lowerInfoY);

  // Thin progress line (single stroke — same weight as game border lines)
  let prog = invDotsEaten / max(1, invDotsTotal);
  stroke(255, 30); strokeWeight(1); noFill();
  line(16, INV_TOP_H - 8, W - 16, INV_TOP_H - 8);
  stroke(255, 150); strokeWeight(1);
  line(16, INV_TOP_H - 8, 16 + (W - 32) * prog, INV_TOP_H - 8);

  // ── Frightened indicator (brief, left side) ───────────────
  if (frightenedActive) {
    let fa = frightenedTimer > 60 ? 180 : map(frightenedTimer, 0, 60, 0, 180);
    noStroke(); fill(255, fa); textSize(8); textAlign(LEFT);
    text('POWER', 16, INV_TOP_H - 32);
    stroke(255, fa * 0.5); strokeWeight(1); noFill();
    line(16, INV_TOP_H - 24, 16 + 60, INV_TOP_H - 24);
    stroke(255, fa); strokeWeight(1.5);
    line(16, INV_TOP_H - 24, 16 + 60 * (frightenedTimer / INV_FRIGHTENED_DUR), INV_TOP_H - 24);
  }

  // ── Swipe hint (fades out at start) ───────────────────────
  if (invTouchHint > 0) {
    let ha = min(invTouchHint * 4, 120);
    noStroke(); fill(255, ha); textSize(8); textAlign(CENTER);
    text('SWIPE  TO  MOVE', W / 2, INV_TOP_H - 32);
  }
}
