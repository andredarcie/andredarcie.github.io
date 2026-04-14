function initFinale() {
  hiScore = max(hiScore, score);
  captureTransitionEcho('finale');
  sndFinaleAmbient();
  const mobileLike = windowWidth < 700 || windowHeight < 760 || navigator.maxTouchPoints > 0;
  finaleScene = {
    frame: 0,
    startedAt: millis(),
    durationMs: 12500,
    seed: random(1000),
    pulse: random(TWO_PI),
    cubes: [],
    cubeStride: mobileLike ? 4 : 2,
    ifsPoints: mobileLike ? 180 : 280,
    ringCount: mobileLike ? 10 : 14,
    tetraCount: mobileLike ? 3 : 4,
  };
  collectMengerCubes(0, 0, 0, 250, 2, finaleScene.cubes);
}

function finaleFrame() {
  if (!finaleScene) initFinale();

  const t = finaleScene.frame;
  const elapsed = millis() - finaleScene.startedAt;
  const progress = constrain(elapsed / finaleScene.durationMs, 0, 1);
  const fadeIn = constrain(map(elapsed, 0, 1100, 0, 1), 0, 1);
  const fadeOut = elapsed > finaleScene.durationMs - 1600
    ? constrain(map(elapsed, finaleScene.durationMs - 1600, finaleScene.durationMs, 1, 0), 0, 1)
    : 1;
  const alpha = fadeIn * fadeOut;

  background(0);
  drawTransitionEcho();
  blendMode(ADD);
  drawFinaleStarLattice(t, alpha, progress);
  drawFinaleDepthRings(t, alpha, progress);
  drawFinaleIFSCloud(t, alpha, progress);
  drawFinaleMenger(t, alpha, progress);
  drawFinaleTetraOrbit(t, alpha, progress);
  blendMode(BLEND);

  // "Zero Void" title below the cube
  noStroke(); fill(255, alpha * 160);
  textFont('monospace'); textAlign(CENTER);
  textSize(32); text('ZERO', W / 2, H / 2 + 120);
  textSize(32); text('VOID', W / 2, H / 2 + 158);

  crtOverlay();
  drawBorder();

  finaleScene.frame++;
  if (elapsed >= finaleScene.durationMs) {
    initEscape();
  }
}

function drawFinaleStarLattice(t, alpha, progress) {
  strokeWeight(1);
  for (let i = 0; i < 110; i++) {
    const a = i * 2.399963 + finaleScene.seed;
    const r = sqrt(i) * (9.5 + progress * 2.8);
    const z = ((i * 37 + t * 9) % 780) - 120;
    const twist = t * 0.012 + z * 0.006;
    const x = cos(a + twist) * r;
    const y = sin(a * 1.18 - twist) * r;
    const p = finaleProject({ x, y, z }, t * 0.6, progress);
    const aDepth = alpha * constrain(map(p.s, 0.45, 1.5, 18, 125), 10, 145);
    stroke(255, aDepth);
    point(p.x, p.y);
  }
}

function drawFinaleDepthRings(t, alpha, progress) {
  push();
  translate(W / 2, H / 2);
  noFill();

  for (let i = 0; i < finaleScene.ringCount; i++) {
    const z = ((i * 52 + t * 7) % 820) - 120;
    const p = finaleProject({ x: 0, y: 0, z }, t, progress);
    const r = (28 + i * 10) * p.s * (1 + progress * 0.7);
    const a = alpha * map(z, -120, 860, 110, 10);
    stroke(255, a);
    strokeWeight(max(0.35, 1.8 * p.s));
    ellipse(0, 0, r * 2.2, r * 1.26);

    if (i % 3 === 0) {
      rotate(PI / 7 + sin(t * 0.004 + i) * 0.03);
    }
  }

  pop();
}

function drawFinaleIFSCloud(t, alpha, progress) {
  let x = sin(finaleScene.seed) * 0.22;
  let y = cos(finaleScene.seed * 1.7) * 0.22;
  let z = 0;
  const points = finaleScene.ifsPoints;
  const attract = [
    { x: -1, y: -1, z: -1 },
    { x: 1, y: -1, z: -1 },
    { x: 1, y: 1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: 0, y: 0, z: 1.35 },
  ];

  strokeWeight(1.15);
  for (let i = 0; i < points; i++) {
    const pick = floor(abs(sin(i * 12.9898 + t * 0.011 + finaleScene.seed) * 43758.5453)) % attract.length;
    const target = attract[pick];
    x = (x + target.x) * 0.5;
    y = (y + target.y) * 0.5;
    z = (z + target.z) * 0.5;

    if (i < 16) continue;

    const twist = t * 0.013 + z * 1.7;
    const px = (x * cos(twist) - y * sin(twist)) * (150 + progress * 90);
    const py = (x * sin(twist) + y * cos(twist)) * (150 + progress * 90);
    const pz = z * 190 + sin(i * 0.04 + t * 0.02) * 28;
    const p = finaleProject({ x: px, y: py, z: pz }, t * 1.8, progress);
    const depthA = constrain(map(p.s, 0.42, 1.62, 12, 160), 8, 190);
    stroke(255, alpha * depthA * (0.42 + (i % 7) * 0.045));
    point(p.x, p.y);
  }
}

function drawFinaleMenger(t, alpha, progress) {
  const spin = t * 0.011;
  const cubes = finaleScene.cubes;

  for (let i = 0; i < cubes.length; i += finaleScene.cubeStride) {
    const c = cubes[i];
    const breathe = 1 + sin(t * 0.018 + c.x * 0.01 + c.y * 0.013) * 0.05;
    drawFinaleCube(c.x, c.y, c.z, c.size * breathe, spin, alpha, progress);
  }
}

function collectMengerCubes(x, y, z, size, depth, out) {
  if (depth <= 0 || size < 12) {
    out.push({ x, y, z, size });
    return;
  }

  const next = size / 3;
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        const holes = (ix === 0 ? 1 : 0) + (iy === 0 ? 1 : 0) + (iz === 0 ? 1 : 0);
        if (holes >= 2) continue;
        collectMengerCubes(x + ix * next, y + iy * next, z + iz * next, next, depth - 1, out);
      }
    }
  }
}

function drawFinaleCube(cx, cy, cz, size, spin, alpha, progress) {
  const h = size / 2;
  const vertices = [
    { x: cx - h, y: cy - h, z: cz - h },
    { x: cx + h, y: cy - h, z: cz - h },
    { x: cx + h, y: cy + h, z: cz - h },
    { x: cx - h, y: cy + h, z: cz - h },
    { x: cx - h, y: cy - h, z: cz + h },
    { x: cx + h, y: cy - h, z: cz + h },
    { x: cx + h, y: cy + h, z: cz + h },
    { x: cx - h, y: cy + h, z: cz + h },
  ].map((p) => finaleProject(p, spin * 90, progress));

  const avgScale = vertices.reduce((sum, p) => sum + p.s, 0) / vertices.length;
  const lineA = alpha * constrain(map(avgScale, 0.42, 1.7, 18, 190), 12, 220);
  const sw = constrain(avgScale * 1.65, 0.35, 3.1);
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  stroke(255, lineA);
  strokeWeight(sw);
  noFill();
  for (let i = 0; i < edges.length; i++) {
    const a = vertices[edges[i][0]];
    const b = vertices[edges[i][1]];
    line(a.x, a.y, b.x, b.y);
  }

  if (avgScale > 0.92 && size > 18) {
    const c = finaleProject({ x: cx, y: cy, z: cz }, spin * 90, progress);
    noStroke();
    fill(255, alpha * 14 * avgScale);
    ellipse(c.x, c.y, size * avgScale * 0.42, size * avgScale * 0.42);
  }
}

function drawFinaleTetraOrbit(t, alpha, progress) {
  const count = finaleScene.tetraCount;
  for (let i = 0; i < count; i++) {
    const a = TWO_PI * i / count + t * 0.016;
    const z = sin(a * 2 + t * 0.011) * 180;
    const center = {
      x: cos(a) * (130 + progress * 45),
      y: sin(a * 1.7) * 92,
      z,
    };
    drawRecursiveTetra(center, 48 - i * 2.2, 2, t * 0.009 + i, alpha * 0.72, progress);
  }
}

function drawRecursiveTetra(center, size, depth, spin, alpha, progress) {
  if (depth <= 0 || size < 9) {
    drawFinaleTetra(center, size, spin, alpha, progress);
    return;
  }

  const h = size * 0.52;
  const offsets = [
    { x: 0, y: -h, z: 0 },
    { x: -h, y: h * 0.58, z: -h },
    { x: h, y: h * 0.58, z: -h },
    { x: 0, y: h * 0.58, z: h },
  ];

  for (let i = 0; i < offsets.length; i++) {
    drawRecursiveTetra({
      x: center.x + offsets[i].x,
      y: center.y + offsets[i].y,
      z: center.z + offsets[i].z,
    }, size * 0.5, depth - 1, spin + i * 0.7, alpha * 0.88, progress);
  }
}

function drawFinaleTetra(center, size, spin, alpha, progress) {
  const h = size;
  const pts = [
    { x: center.x, y: center.y - h, z: center.z },
    { x: center.x - h * 0.86, y: center.y + h * 0.5, z: center.z - h * 0.62 },
    { x: center.x + h * 0.86, y: center.y + h * 0.5, z: center.z - h * 0.62 },
    { x: center.x, y: center.y + h * 0.5, z: center.z + h },
  ].map((p) => finaleProject(p, spin * 80, progress));

  const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
  const avgScale = pts.reduce((sum, p) => sum + p.s, 0) / pts.length;
  stroke(255, alpha * 70 * avgScale);
  strokeWeight(constrain(avgScale * 0.9, 0.25, 1.7));
  noFill();
  for (let i = 0; i < edges.length; i++) {
    const a = pts[edges[i][0]];
    const b = pts[edges[i][1]];
    line(a.x, a.y, b.x, b.y);
  }
}

function finaleProject(point, t, progress) {
  const ry = t * 0.008 + progress * 1.9;
  const rx = t * 0.005 + sin(t * 0.006) * 0.32;
  const rz = t * 0.003;

  let x = point.x;
  let y = point.y;
  let z = point.z;

  let nx = x * cos(ry) - z * sin(ry);
  let nz = x * sin(ry) + z * cos(ry);
  x = nx;
  z = nz;

  let ny = y * cos(rx) - z * sin(rx);
  nz = y * sin(rx) + z * cos(rx);
  y = ny;
  z = nz;

  nx = x * cos(rz) - y * sin(rz);
  ny = x * sin(rz) + y * cos(rz);
  x = nx;
  y = ny;

  z += 450 - progress * 220 + sin(finaleScene.frame * 0.012 + finaleScene.pulse) * 35;
  const perspective = 500 / max(80, 500 + z);
  return {
    x: W / 2 + x * perspective,
    y: H / 2 + y * perspective,
    z,
    s: perspective,
  };
}
