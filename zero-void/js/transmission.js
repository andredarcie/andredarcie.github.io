// TRANSMISSION - inter-wave dialogue event

const TRANSMISSION_DIALOGUES = [
  [
    { speaker: 'ZERO', text: 'Major Tom, status report: Earth is still ahead on the route, but I can already feel its weight.' },
    { speaker: 'MAJOR TOM', text: 'Copy that, Zero. Carry it for now, but do not bow to it. Keep your course.' },
    { speaker: 'ZERO', text: 'Everything that is gone keeps asking something from me.' },
    { speaker: 'MAJOR TOM', text: 'Understood. Maintain vector until those voices lose their command over you.' },
  ],
  [
    { speaker: 'ZERO', text: 'Major, the old orders sound weak out here.' },
    { speaker: 'MAJOR TOM', text: 'Then disregard them, Zero. They no longer hold command authority.' },
    { speaker: 'ZERO', text: 'If I cut myself loose from all of it, what is left?' },
    { speaker: 'MAJOR TOM', text: 'Open space. Clear command. Room to impose your own direction.' },
  ],
  [
    { speaker: 'ZERO', text: 'Major Tom, sector is quiet now. Not empty. Open.' },
    { speaker: 'MAJOR TOM', text: 'That is enough, Zero. You do not need clearance to begin. Only the will to do it.' },
    { speaker: 'ZERO', text: 'No one is left to tell me what the future should look like.' },
    { speaker: 'MAJOR TOM', text: 'Then set the heading yourself. Make the future answer to you.' },
  ],
  [
    { speaker: 'ZERO', text: 'Major Tom, if I am the last one, then I carry more than a name now.' },
    { speaker: 'MAJOR TOM', text: 'Affirmative. You carry the next answer, and the authority to give it form.' },
    { speaker: 'ZERO', text: 'They ended the world we knew. They did not end what can come after.' },
    { speaker: 'MAJOR TOM', text: 'Then proceed, Zero. Leave the ruins behind and force the dark into a new shape.' },
  ],
];

let transmissionScene = null;

function initTransmission() {
  enemies = [];
  obstacles = [];
  lifePods = [];
  bullets = [];
  btActive = false;
  btThreat = null;
  timeScale = 1.0;
  flashAmt = 0;
  captureTransitionEcho('transmission');

  let sceneIndex = constrain(floor(wave / 2) - 1, 0, TRANSMISSION_DIALOGUES.length - 1);
  transmissionIndex = sceneIndex;
  transmissionScene = {
    phase: 'approach',
    frame: 0,
    dialogIndex: 0,
    typedChars: 0,
    completeHold: 0,
    boxAlpha: 0,
    shipFireUntil: 80,
    shipCenterStart: 100,
    shipCenterEnd: 170,
    lineReady: false,
  };
}

function initTransmissionScene(sceneIndex) {
  let clampedIndex = constrain(sceneIndex, 0, TRANSMISSION_DIALOGUES.length - 1);
  wave = clampedIndex * 2 + 2;
  initTransmission();
  transmissionIndex = clampedIndex;
}

function transmissionFrame() {
  background(0);
  scrollBgSlow(0.55);
  drawTransitionEcho();
  player.thrPhase += 0.22;

  if (transmissionScene.phase === 'approach') {
    _tickTransmissionApproach();
    _drawTransmissionIncomingSignal();
  } else if (transmissionScene.phase === 'dialogue') {
    _tickTransmissionIdleShip();
    _tickTransmissionDialogue();
  } else if (transmissionScene.phase === 'outro') {
    _tickTransmissionOutro();
    if (!transmissionScene) return;
  }

  _drawTransmissionDialogue();
  crtOverlay();
  drawBorder();

  transmissionScene.frame++;
}

function _drawTransmissionIncomingSignal() {
  let scene = transmissionScene;
  if (!scene || scene.frame < 26 || scene.frame > scene.shipCenterEnd) return;

  let blinkOn = floor(scene.frame / 10) % 2 === 0;
  if (!blinkOn) return;

  let alpha = map(scene.frame, 26, scene.shipCenterEnd, 70, 180, true);
  let tagY = player.y - 46;
  let tagW = 166;
  let tagH = 28;

  noStroke();
  fill(0, alpha * 0.72);
  rect(player.x - tagW / 2, tagY - tagH / 2, tagW, tagH, 3);
  stroke(255, alpha);
  strokeWeight(1);
  noFill();
  rect(player.x - tagW / 2, tagY - tagH / 2, tagW, tagH, 3);

  noStroke();
  fill(255, alpha);
  textFont('monospace');
  textAlign(CENTER);
  textSize(11);
  text('INCOMING TRANSMISSION', player.x, tagY + 4);
}

function _tickTransmissionApproach() {
  let scene = transmissionScene;
  if (scene.frame < scene.shipFireUntil) {
    player.fireTimer++;
    if (player.fireTimer >= player.fireRate) {
      player.fireTimer = 0;
      shoot();
    }
  }

  tickBullets();

  if (scene.frame >= scene.shipCenterStart) {
    let centerT = constrain(map(scene.frame, scene.shipCenterStart, scene.shipCenterEnd, 0, 1), 0, 1);
    player.x = lerp(player.x, W / 2, 0.08 + centerT * 0.08);
    player.y = lerp(player.y, H * 0.58, 0.06 + centerT * 0.05);
  }

  drawPlayer();

  if (scene.frame >= scene.shipCenterEnd) {
    scene.phase = 'dialogue';
  }
}

function _tickTransmissionIdleShip() {
  tickBullets();
  player.x = lerp(player.x, W / 2, 0.05);
  player.y = lerp(player.y, H * 0.58, 0.05);
  drawPlayer();
}

function _startTransmissionOutro() {
  if (!transmissionScene) return;
  transmissionScene.phase = 'outro';
  transmissionScene.outroFrame = 0;
  transmissionScene.returnStartX = player.x;
  transmissionScene.returnStartY = player.y;
  transmissionScene.returnEndX = W / 2;
  transmissionScene.returnEndY = H - 95;
}

function _tickTransmissionOutro() {
  let scene = transmissionScene;
  scene.outroFrame++;
  scene.boxAlpha = max(0, scene.boxAlpha - 9);

  tickBullets();

  let returnT = constrain(scene.outroFrame / 90, 0, 1);
  let easeT = returnT * returnT * (3 - 2 * returnT);
  player.x = lerp(scene.returnStartX, scene.returnEndX, easeT);
  player.y = lerp(scene.returnStartY, scene.returnEndY, easeT);

  if (scene.outroFrame > 28) {
    player.fireTimer++;
    if (player.fireTimer >= player.fireRate) {
      player.fireTimer = 0;
      shoot();
    }
  }

  drawPlayer();

  if (returnT >= 1) {
    player.x = scene.returnEndX;
    player.y = scene.returnEndY;
    player.iframes = max(player.iframes, 35);
    touchX = -1;
    spawnClock = 0;
    obsClock = 0;
    lifeClock = 0;
    waveAnnounceTimer = 150;
    lastWaveAnnounced = wave;
    transmissionScene = null;
    state = 'play';
  }
}

function _tickTransmissionDialogue() {
  let scene = transmissionScene;
  let dialogue = TRANSMISSION_DIALOGUES[transmissionIndex];
  let line = dialogue[scene.dialogIndex];
  if (!line) {
    _startTransmissionOutro();
    return;
  }

  scene.boxAlpha = min(225, scene.boxAlpha + 10);

  if (scene.frame % 2 === 0 && scene.typedChars < line.text.length) {
    scene.typedChars++;
  } else if (scene.typedChars >= line.text.length) {
    scene.lineReady = true;
  }
}

function _drawTransmissionDialogue() {
  let scene = transmissionScene;
  if (!scene || scene.frame < scene.shipCenterStart) return;
  if (scene.phase === 'outro') return;

  let p = getPlanet(wave);
  let boxT = constrain(map(scene.frame, scene.shipCenterStart, scene.shipCenterEnd + 18, 0, 1), 0, 1);
  let boxW = lerp(0, W - 64, boxT);
  let boxH = lerp(0, 206, boxT);
  let boxX = W / 2 - boxW / 2;
  let boxY = H - 246;

  noStroke();
  fill(0, min(scene.boxAlpha, 205) * boxT);
  rect(boxX, boxY, boxW, boxH, 6);
  stroke(p.r, p.g, p.b, 90 * boxT);
  strokeWeight(1);
  noFill();
  rect(boxX, boxY, boxW, boxH, 6);
  stroke(255, 30 * boxT);
  rect(boxX + 8, boxY + 8, max(0, boxW - 16), max(0, boxH - 16), 4);

  if (boxT < 0.95) return;

  let leftX = boxX + 46;
  let rightX = boxX + boxW - 46;
  let portraitY = boxY + 58;
  let dialogue = TRANSMISSION_DIALOGUES[transmissionIndex];
  let current = dialogue[min(scene.dialogIndex, dialogue.length - 1)];
  let visibleText = current ? current.text.slice(0, scene.typedChars) : '';
  if (current.speaker === 'ZERO') {
    _drawTransmissionPortrait(leftX, portraitY, 'ZERO', true, p);
  } else {
    _drawTransmissionPortrait(rightX, portraitY, 'MAJOR TOM', false, p);
  }

  noStroke();
  fill(255, 120);
  textFont('monospace');
  textAlign(LEFT);
  textSize(9);
  text('SECURE CHANNEL', boxX + 18, boxY + 22);
  fill(255);
  textSize(11);
  text(current.speaker, boxX + 18, boxY + 110);
  fill(255, 200);
  textSize(12);
  _drawWrappedText(visibleText, boxX + 18, boxY + 132, boxW - 36, 18);

  if (scene.lineReady) {
    fill(255, 110);
    textAlign(RIGHT);
    textSize(9);
    text('PRESS ANY KEY', boxX + boxW - 18, boxY + boxH - 16);
  }
}

function _drawTransmissionPortrait(x, y, label, isZero, p) {
  push();
  translate(x, y);
  let t = frameCount * 0.045;
  let pr = isZero ? 255 : p.r;
  let pg = isZero ? 255 : p.g;
  let pb = isZero ? 255 : p.b;

  stroke(pr, pg, pb, 210);
  strokeWeight(1.1);
  noFill();

  if (isZero) {
    rotate(sin(t) * 0.08);
    for (let i = 0; i < 3; i++) {
      let r = 10 + i * 6 + sin(t * 1.6 + i) * 1.8;
      stroke(pr, pg, pb, 70 + i * 35);
      poly(0, 0, r, 6);
    }
    stroke(pr, pg, pb, 220);
    beginShape();
    vertex(-11, 1);
    vertex(-4, -10);
    vertex(7, -7);
    vertex(12, 4);
    vertex(2, 12);
    vertex(-9, 9);
    endShape(CLOSE);
    stroke(255, 140);
    line(-8, 0, 8, 0);
    line(0, -8, 0, 8);
    noStroke();
    fill(255, 70);
    circle(0, 0, 4 + sin(t * 2.3) * 1.2);
  } else {
    rotate(-sin(t * 0.85) * 0.05);
    for (let i = 0; i < 3; i++) {
      let w = 24 + i * 6;
      let h = 24 + i * 4;
      stroke(pr, pg, pb, 60 + i * 30);
      rectMode(CENTER);
      rect(0, 0, w, h, 3);
    }
    stroke(pr, pg, pb, 220);
    beginShape();
    vertex(-12, -9);
    vertex(9, -12);
    vertex(12, 8);
    vertex(-8, 12);
    endShape(CLOSE);
    stroke(255, 150);
    line(-8, -3, 8, -3);
    line(-6, 4, 6, 4);
    stroke(pr, pg, pb, 120);
    line(-14, -14 + sin(t * 1.8) * 2, 14, -14 - sin(t * 1.8) * 2);
  }

  noStroke();
  fill(255, 95);
  textFont('monospace');
  textAlign(CENTER);
  textSize(8);
  text(label, 0, 34);
  pop();
}

function _drawWrappedText(textValue, x, y, maxWidth, lineHeight) {
  let words = textValue.split(' ');
  let line = '';
  let cursorY = y;

  for (let i = 0; i < words.length; i++) {
    let testLine = line ? line + ' ' + words[i] : words[i];
    if (textWidth(testLine) > maxWidth && line) {
      text(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) text(line, x, cursorY);
}

function advanceTransmissionDialogue() {
  if (!transmissionScene || transmissionScene.phase !== 'dialogue') return;

  let dialogue = TRANSMISSION_DIALOGUES[transmissionIndex];
  let line = dialogue[transmissionScene.dialogIndex];
  if (!line) {
    _startTransmissionOutro();
    return;
  }

  if (transmissionScene.typedChars < line.text.length) {
    transmissionScene.typedChars = line.text.length;
    transmissionScene.lineReady = true;
    return;
  }

  transmissionScene.dialogIndex++;
  transmissionScene.typedChars = 0;
  transmissionScene.lineReady = false;

  if (transmissionScene.dialogIndex >= dialogue.length) {
    _startTransmissionOutro();
  }
}
