(function () {
  const mount = document.getElementById("gameCanvas");
  const overlay = document.getElementById("overlay");
  const overlayEyebrow = overlay.querySelector(".eyebrow");
  const overlayTitle = overlay.querySelector("h2");
  const overlayText = overlay.querySelector("p");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const towerButtons = Array.from(document.querySelectorAll("[data-tower]"));
  const creditsValue = document.getElementById("creditsValue");
  const healthValue = document.getElementById("healthValue");
  const waveValue = document.getElementById("waveValue");

  const WIDTH = 900;
  const HEIGHT = 1400;
  const PATH_WIDTH = 82;
  const ENEMY_RADIUS = 18;
  const LEAK_LIMIT = 10;
  const WORLD_VIEW = { x: 26, y: 34, width: 848, height: 1288 };

  const palette = {
    bg0: "#120c08",
    bg1: "#23140c",
    bg2: "#3c1d11",
    line: "#b05b2c",
    lineBright: "#ff9e59",
    bolt: "#ff6d3a",
    boltGlow: "#ff8e54",
    pulse: "#ffd166",
    pulseGlow: "#ffef9f",
    core: "#ff4332",
    coreGlow: "#ff9372",
    enemy: "#ffb067",
    enemyAlt: "#ffd166",
    text: "#ffcf8f",
    muted: "#a97c53",
    green: "#9fef9d",
  };

  const pathPoints = [
    { x: 110, y: 120 },
    { x: 110, y: 360 },
    { x: 760, y: 360 },
    { x: 760, y: 620 },
    { x: 220, y: 620 },
    { x: 220, y: 930 },
    { x: 640, y: 930 },
    { x: 640, y: 1180 },
    { x: 450, y: 1300 },
  ];

  const buildPads = [
    { x: 250, y: 235 },
    { x: 610, y: 250 },
    { x: 620, y: 505 },
    { x: 370, y: 505 },
    { x: 355, y: 780 },
    { x: 585, y: 1070 },
  ].map((pad, index) => ({ ...pad, index, tower: null, pulseFx: 0, glow: 0 }));

  const towerTypes = {
    bolt: {
      cost: 35,
      range: 185,
      cadence: 0.42,
      damage: 16,
      color: palette.bolt,
      glow: palette.boltGlow,
    },
    pulse: {
      cost: 55,
      range: 130,
      cadence: 1.0,
      damage: 28,
      splash: 52,
      color: palette.pulse,
      glow: palette.pulseGlow,
    },
  };

  const pathSegments = [];
  let totalPathLength = 0;
  for (let i = 0; i < pathPoints.length - 1; i += 1) {
    const start = pathPoints[i];
    const end = pathPoints[i + 1];
    totalPathLength += Math.hypot(end.x - start.x, end.y - start.y);
    pathSegments.push(totalPathLength);
  }

  const backgroundGlyphs = Array.from({ length: 24 }, (_, index) => ({
    x: 70 + (index % 6) * 150,
    y: 120 + Math.floor(index / 6) * 290,
    speed: 0.35 + (index % 5) * 0.07,
    phase: index * 0.7,
    size: 18 + (index % 4) * 8,
  }));

  let lastTimestamp = 0;

  const worldBounds = {
    minX: 20,
    maxX: 880,
    minY: 20,
    maxY: 1388,
  };

  const worldScale = Math.min(
    WORLD_VIEW.width / (worldBounds.maxX - worldBounds.minX),
    WORLD_VIEW.height / (worldBounds.maxY - worldBounds.minY)
  ) * 0.5;

  const worldOffsetX = WORLD_VIEW.x - worldBounds.minX * worldScale;
  const worldOffsetY = WORLD_VIEW.y - worldBounds.minY * worldScale;

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createState() {
    return {
      mode: "menu",
      selectedTower: "bolt",
      credits: 110,
      baseHealth: LEAK_LIMIT,
      wave: 0,
      kills: 0,
      leaked: 0,
      enemies: [],
      projectiles: [],
      particles: [],
      waveTimer: 1.5,
      spawnBudget: 0,
      spawnTimer: 0,
      gameOver: false,
      victory: false,
      shockwave: 0,
    };
  }

  let state = createState();

  function resetPads() {
    buildPads.forEach((pad) => {
      pad.tower = null;
      pad.pulseFx = 0;
      pad.glow = 0;
    });
  }

  function beginGame() {
    state = createState();
    resetPads();
    overlay.classList.add("hidden");
    state.mode = "playing";
    startButton.textContent = "Ativar console";
    syncHud();
  }

  function selectTower(type) {
    state.selectedTower = type;
    towerButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tower === type);
    });
  }

  function pathPosition(progress) {
    const clamped = clamp(progress, 0, 1);
    const target = totalPathLength * clamped;
    let previous = 0;
    for (let i = 0; i < pathSegments.length; i += 1) {
      if (target <= pathSegments[i]) {
        const local = (target - previous) / (pathSegments[i] - previous || 1);
        return {
          x: lerp(pathPoints[i].x, pathPoints[i + 1].x, local),
          y: lerp(pathPoints[i].y, pathPoints[i + 1].y, local),
        };
      }
      previous = pathSegments[i];
    }
    return pathPoints[pathPoints.length - 1];
  }

  function spawnEnemy() {
    const waveScale = 1 + state.wave * 0.12;
    state.enemies.push({
      progress: 0,
      speed: 0.048 + state.wave * 0.0035,
      hp: 42 * waveScale,
      maxHp: 42 * waveScale,
      radius: ENEMY_RADIUS - Math.min(state.wave, 4),
      color: state.wave % 3 === 2 ? palette.enemyAlt : palette.enemy,
      trail: [],
      spin: Math.random() * Math.PI * 2,
    });
  }

  function startNextWave() {
    state.wave += 1;
    state.spawnBudget = 5 + state.wave * 2;
    state.spawnTimer = 0.18;
    syncHud();
  }

  function placeTower(pad) {
    if (state.mode !== "playing" || state.gameOver || pad.tower) {
      return;
    }
    const config = towerTypes[state.selectedTower];
    if (state.credits < config.cost) {
      return;
    }
    state.credits -= config.cost;
    pad.tower = {
      type: state.selectedTower,
      cooldown: 0.08,
      aim: 0,
      recoil: 0,
      flash: 0,
    };
    pad.glow = 1;
    syncHud();
  }

  function getPointerPosition(event) {
    const rect = mount.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: ((source.clientX - rect.left) * (WIDTH / rect.width) - worldOffsetX) / worldScale,
      y: ((source.clientY - rect.top) * (HEIGHT / rect.height) - worldOffsetY) / worldScale,
    };
  }

  function handlePointer(event) {
    if (state.mode !== "playing" || state.gameOver) {
      return;
    }
    event.preventDefault();
    const point = getPointerPosition(event);
    const pad = buildPads.find((item) => distance(item, point) <= 52);
    if (pad) {
      placeTower(pad);
    }
  }

  function addImpact(x, y, color, amount) {
    state.particles.push({ x, y, size: 18 + amount * 14, life: 0.32 + amount * 0.08, color, type: "ring" });
    state.particles.push({ x, y, size: 8 + amount * 8, life: 0.18 + amount * 0.04, color, type: "flare" });
  }

  function killEnemy(enemy, impactPoint) {
    state.kills += 1;
    state.credits += 12;
    state.shockwave = Math.min(1, state.shockwave + 0.14);
    addImpact(impactPoint.x, impactPoint.y, palette.coreGlow, 1.2);
    const index = state.enemies.indexOf(enemy);
    if (index >= 0) {
      state.enemies.splice(index, 1);
    }
    syncHud();
  }

  function damageEnemy(enemy, amount, impactPoint) {
    enemy.hp -= amount;
    addImpact(impactPoint.x, impactPoint.y, palette.lineBright, 0.45);
    if (enemy.hp <= 0) {
      killEnemy(enemy, impactPoint);
    }
  }

  function updateTowers(dt) {
    buildPads.forEach((pad) => {
      pad.glow = Math.max(0, pad.glow - dt * 0.8);
      if (!pad.tower) {
        pad.pulseFx = Math.max(0, pad.pulseFx - dt * 2.5);
        return;
      }

      const config = towerTypes[pad.tower.type];
      pad.tower.cooldown -= dt;
      pad.tower.recoil = Math.max(0, pad.tower.recoil - dt * 2.2);
      pad.tower.flash = Math.max(0, pad.tower.flash - dt * 3);
      pad.pulseFx = Math.max(0, pad.pulseFx - dt * 3);

      const target = state.enemies.find((enemy) => {
        const pos = pathPosition(enemy.progress);
        return distance(pad, pos) <= config.range;
      });
      if (!target) {
        return;
      }

      const targetPos = pathPosition(target.progress);
      pad.tower.aim = Math.atan2(targetPos.y - pad.y, targetPos.x - pad.x);
      if (pad.tower.cooldown > 0) {
        return;
      }

      pad.tower.cooldown = config.cadence;
      pad.tower.recoil = 1;
      pad.tower.flash = 1;
      if (pad.tower.type === "bolt") {
        state.projectiles.push({
          x: pad.x,
          y: pad.y,
          target,
          speed: 820,
          damage: config.damage,
          color: config.color,
          glow: config.glow,
          trail: [],
        });
      } else {
        pad.pulseFx = 1;
        state.shockwave = Math.min(1, state.shockwave + 0.08);
        state.enemies.slice().forEach((enemy) => {
          const pos = pathPosition(enemy.progress);
          if (distance(pos, targetPos) <= config.splash) {
            damageEnemy(enemy, config.damage, pos);
          }
        });
      }
    });
  }

  function updateProjectiles(dt) {
    state.projectiles = state.projectiles.filter((projectile) => {
      if (!state.enemies.includes(projectile.target)) {
        return false;
      }
      const targetPos = pathPosition(projectile.target.progress);
      const dx = targetPos.x - projectile.x;
      const dy = targetPos.y - projectile.y;
      const distanceToTarget = Math.hypot(dx, dy);
      const step = projectile.speed * dt;
      projectile.trail.unshift({ x: projectile.x, y: projectile.y });
      projectile.trail = projectile.trail.slice(0, 8);
      if (distanceToTarget <= step + 8) {
        damageEnemy(projectile.target, projectile.damage, targetPos);
        return false;
      }
      projectile.x += (dx / distanceToTarget) * step;
      projectile.y += (dy / distanceToTarget) * step;
      return true;
    });
  }

  function updateEnemies(dt) {
    state.enemies.slice().forEach((enemy) => {
      enemy.progress += enemy.speed * dt * 0.12;
      enemy.spin += dt * 1.6;
      const pos = pathPosition(enemy.progress);
      enemy.trail.unshift({ x: pos.x, y: pos.y });
      enemy.trail = enemy.trail.slice(0, 7);
      if (enemy.progress >= 1) {
        const index = state.enemies.indexOf(enemy);
        if (index >= 0) {
          state.enemies.splice(index, 1);
        }
        state.baseHealth -= 1;
        state.shockwave = 1;
        addImpact(pathPoints[pathPoints.length - 1].x, pathPoints[pathPoints.length - 1].y, palette.coreGlow, 1.8);
        if (state.baseHealth <= 0) {
          endGame(false);
        }
      }
    });
  }

  function updateWaves(dt) {
    if (state.gameOver) {
      return;
    }
    if (state.spawnBudget > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnBudget -= 1;
        state.spawnTimer = 0.72;
        spawnEnemy();
      }
      return;
    }
    if (state.enemies.length > 0) {
      return;
    }
    if (state.wave >= 7) {
      endGame(true);
      return;
    }
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.waveTimer = 2.2;
      startNextWave();
    }
  }

  function endGame(victory) {
    state.gameOver = true;
    state.victory = victory;
    state.mode = victory ? "victory" : "defeat";
    overlay.classList.remove("hidden");
    overlayEyebrow.textContent = victory ? "Sector Stable" : "Breach Detected";
    overlayTitle.textContent = victory ? "Nucleo preservado" : "Linha quebrada";
    overlayText.textContent = victory
      ? "Sete ondas repelidas. Reinicie o console para uma nova simulacao."
      : "Instale torres mais cedo e combine rajada com controle de area.";
    startButton.textContent = "Reiniciar simulacao";
  }

  function updateParticles(dt) {
    state.shockwave = Math.max(0, state.shockwave - dt * 0.8);
    state.particles = state.particles.filter((particle) => {
      particle.life -= dt;
      particle.size += dt * (particle.type === "ring" ? 95 : 46);
      return particle.life > 0;
    });
  }

  function update(dt) {
    if (state.mode !== "playing" || state.gameOver) {
      updateParticles(dt);
      return;
    }
    updateWaves(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    syncHud();
  }

  function syncHud() {
    creditsValue.textContent = String(state.credits);
    healthValue.textContent = String(state.baseHealth);
    waveValue.textContent = String(state.wave);
  }

  function withWorldTransform(p, drawFn) {
    p.push();
    p.translate(worldOffsetX, worldOffsetY);
    p.scale(worldScale);
    drawFn();
    p.pop();
  }

  function drawHex(p, x, y, radius, fillColor, strokeColor, weight) {
    p.push();
    p.translate(x, y);
    fillColor ? p.fill(fillColor) : p.noFill();
    strokeColor ? (p.stroke(strokeColor), p.strokeWeight(weight || 2)) : p.noStroke();
    p.beginShape();
    for (let i = 0; i < 6; i += 1) {
      const angle = p.PI / 3 * i + p.PI / 6;
      p.vertex(p.cos(angle) * radius, p.sin(angle) * radius);
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  function drawBackground(p, time) {
    const g = p.drawingContext.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, palette.bg2);
    g.addColorStop(0.35, palette.bg2);
    g.addColorStop(1, palette.bg0);
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, WIDTH, HEIGHT);

    p.push();
    p.translate(WIDTH * 0.75, HEIGHT * 0.18);
    p.noFill();
    for (let i = 0; i < 5; i += 1) {
      p.stroke(255, 124, 58, 22 - i * 3);
      p.strokeWeight(2);
      p.arc(0, 0, 160 + i * 48, 160 + i * 48, -p.PI * 0.25, p.PI * 1.15);
    }
    p.rotate(time * 0.4);
    p.stroke(255, 180, 102, 100);
    p.line(0, 0, 120, 0);
    p.pop();

    for (let y = 0; y < HEIGHT; y += 40) {
      p.stroke(255, 110, 50, 16 + 10 * p.sin(time * 1.4 + y * 0.02));
      p.line(0, y, WIDTH, y);
    }
    for (let x = 0; x < WIDTH; x += 60) {
      p.stroke(255, 140, 70, 10 + 12 * p.sin(time * 0.9 + x * 0.03));
      p.line(x, 0, x, HEIGHT);
    }

    backgroundGlyphs.forEach((glyph) => {
      p.push();
      p.translate(glyph.x, glyph.y + p.sin(time * glyph.speed + glyph.phase) * 18);
      p.rotate(time * glyph.speed * 0.25 + glyph.phase);
      p.noFill();
      p.stroke(255, 150, 85, 28);
      p.strokeWeight(2);
      p.rectMode(p.CENTER);
      p.rect(0, 0, glyph.size * 1.5, glyph.size * 1.5);
      p.line(-glyph.size, 0, glyph.size, 0);
      p.line(0, -glyph.size, 0, glyph.size);
      p.pop();
    });
  }

  function drawPath(p, time) {
    p.noFill();
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    p.stroke(95, 46, 23);
    p.strokeWeight(PATH_WIDTH + 20);
    p.beginShape();
    pathPoints.forEach((point) => p.vertex(point.x, point.y));
    p.endShape();
    p.stroke(176, 91, 44);
    p.strokeWeight(PATH_WIDTH);
    p.beginShape();
    pathPoints.forEach((point) => p.vertex(point.x, point.y));
    p.endShape();
    p.stroke(255, 173, 108, 220);
    p.strokeWeight(10);
    p.drawingContext.setLineDash([16, 20]);
    p.drawingContext.lineDashOffset = -(time * 120);
    p.beginShape();
    pathPoints.forEach((point) => p.vertex(point.x, point.y));
    p.endShape();
    p.drawingContext.setLineDash([]);
  }

  function drawCore(p, time) {
    const core = pathPoints[pathPoints.length - 1];
    p.push();
    p.translate(core.x, core.y);
    p.rotate(time * 0.7);
    drawHex(p, 0, 0, 76, p.color(18, 13, 9), p.color(255, 120, 62, 110), 3);
    p.rotate(-time * 1.2);
    drawHex(p, 0, 0, 44 + state.shockwave * 14, p.color(255, 67, 50), p.color(255, 180, 145), 3);
    p.noStroke();
    p.fill(255, 160, 120, 140 + state.shockwave * 70);
    p.circle(0, 0, 26 + state.shockwave * 18);
    p.pop();
  }

  function drawPads(p, time) {
    buildPads.forEach((pad) => {
      const selected = state.selectedTower && !pad.tower;
      drawHex(p, pad.x, pad.y, 44 + pad.glow * 8, p.color(18, 12, 9, pad.tower ? 210 : 190), p.color(255, 149, 79, selected ? 120 : 54), 2.5);
      p.push();
      p.translate(pad.x, pad.y);
      if (!pad.tower) {
        p.stroke(255, 160, 96, 110);
        p.strokeWeight(3);
        p.line(-10, 0, 10, 0);
        p.line(0, -10, 0, 10);
      } else {
        const config = towerTypes[pad.tower.type];
        const recoil = pad.tower.recoil * 10;
        p.rotate(pad.tower.aim);
        p.stroke(config.glow);
        p.strokeWeight(2);
        p.fill(config.color);
        if (pad.tower.type === "bolt") {
          p.rectMode(p.CENTER);
          p.rect(0, 0, 26, 26, 4);
          p.fill(12, 10, 8);
          p.rect(18 - recoil, 0, 30, 10, 2);
        } else {
          p.circle(0, 0, 28);
          p.fill(12, 10, 8);
          p.rectMode(p.CENTER);
          p.rect(16 - recoil, 0, 24, 16, 4);
        }
      }
      p.pop();
      if (pad.pulseFx > 0) {
        p.noFill();
        p.stroke(255, 209, 102, 90 * pad.pulseFx);
        p.strokeWeight(8 * pad.pulseFx);
        p.circle(pad.x, pad.y, 110 + pad.pulseFx * 120);
      }
      if (selected && !pad.tower) {
        p.noFill();
        p.stroke(255, 176, 110, 44 + 24 * p.sin(time * 3 + pad.index));
        p.strokeWeight(2);
        p.circle(pad.x, pad.y, 100 + p.sin(time * 3 + pad.index) * 6);
      }
    });
  }

  function drawEnemies(p, time) {
    state.enemies.forEach((enemy) => {
      const pos = pathPosition(enemy.progress);
      enemy.trail.forEach((trail, index) => {
        p.noStroke();
        p.fill(255, 160, 90, 18 - index * 2);
        p.circle(trail.x, trail.y, 26 - index * 2);
      });
      p.push();
      p.translate(pos.x, pos.y);
      p.rotate(enemy.spin);
      drawHex(p, 0, 0, enemy.radius + 10, p.color(enemy.color), p.color(255, 223, 175, 110), 2);
      p.rotate(-enemy.spin * 2.1);
      p.noFill();
      p.stroke(255, 232, 196, 100);
      p.strokeWeight(2);
      p.circle(0, 0, enemy.radius * 1.2);
      p.pop();
      p.noStroke();
      p.fill(255, 248, 230, 180);
      p.circle(pos.x, pos.y, enemy.radius * 0.7);
      p.fill(255, 110, 58, 180);
      p.circle(pos.x, pos.y, enemy.radius * 0.25 + 5 * p.sin(time * 5 + enemy.spin));
      p.fill(44, 19, 10, 160);
      p.rect(pos.x - 28, pos.y - enemy.radius - 26, 56, 7, 3);
      p.fill(255, 190, 120, 220);
      p.rect(pos.x - 28, pos.y - enemy.radius - 26, 56 * Math.max(0, enemy.hp / enemy.maxHp), 7, 3);
    });
  }

  function drawProjectiles(p) {
    state.projectiles.forEach((projectile) => {
      projectile.trail.forEach((trail, index) => {
        p.noStroke();
        p.fill(255, 164, 95, 28 - index * 3);
        p.circle(trail.x, trail.y, 10 - index);
      });
      p.fill(projectile.glow);
      p.circle(projectile.x, projectile.y, 18);
      p.fill(projectile.color);
      p.circle(projectile.x, projectile.y, 10);
    });
  }

  function drawParticles(p) {
    state.particles.forEach((particle) => {
      if (particle.type === "ring") {
        p.noFill();
        p.stroke(255, 170, 115, 150 * particle.life);
        p.strokeWeight(4 * particle.life + 1);
        p.circle(particle.x, particle.y, particle.size);
      } else {
        p.noStroke();
        p.fill(255, 210, 160, 140 * particle.life);
        p.circle(particle.x, particle.y, particle.size);
      }
    });
  }

  function drawHudBanner(p, time) {
    p.noStroke();
    p.fill(12, 10, 8, 110);
    p.rect(24, 18, WIDTH - 48, 42, 6);
    p.noFill();
    p.stroke(255, 156, 89, 50);
    p.rect(24, 18, WIDTH - 48, 42, 6);
    p.noStroke();
    p.fill(255, 207, 143);
    p.textAlign(p.LEFT, p.TOP);
    p.textFont("IBM Plex Mono");
    p.textSize(16);
    const status = state.gameOver
      ? state.victory
        ? "Sector locked // core stable"
        : "Core breach // reconstruction required"
      : state.spawnBudget > 0 || state.enemies.length > 0
        ? `Wave ${state.wave} active // hostiles ${state.enemies.length}`
        : `Next wave in ${Math.max(0, state.waveTimer).toFixed(1)}s`;
    p.text(status, 42, 30);
    p.noStroke();
    p.fill(159, 239, 157, 90 + 35 * p.sin(time * 3));
    p.circle(WIDTH - 42, 39, 10);
  }

  function drawBootOverlay(p, time) {
    if (state.mode !== "menu") {
      return;
    }
    p.noStroke();
    p.fill(255, 120, 60, 20 + 10 * p.sin(time * 2));
    p.rect(0, 0, WIDTH, HEIGHT);
    p.noFill();
    p.stroke(255, 166, 95, 50);
    for (let i = 0; i < 6; i += 1) {
      p.circle(WIDTH * 0.5, HEIGHT * 0.58, 220 + i * 90 + p.sin(time * 1.6 + i) * 18);
    }
    p.textAlign(p.CENTER, p.CENTER);
    p.noStroke();
    p.fill(255, 215, 172, 120);
    p.textSize(24);
    p.text("VECTOR FIELD PREHEATING", WIDTH / 2, HEIGHT * 0.24);
    p.fill(159, 239, 157, 120);
    p.textSize(18);
    p.text("touch a slot after boot", WIDTH / 2, HEIGHT * 0.28);
  }

  function drawScanlines(p, time) {
    p.noStroke();
    for (let y = 0; y < HEIGHT; y += 4) {
      p.fill(0, 0, 0, 16);
      p.rect(0, y + p.sin(time * 1.8 + y * 0.012), WIDTH, 2);
    }
    p.fill(255, 188, 120, 10 + 10 * p.sin(time * 7));
    p.rect(0, (time * 260) % HEIGHT, WIDTH, 24);
    p.noFill();
    p.stroke(255, 155, 86, 26);
    p.strokeWeight(16);
    p.rect(8, 8, WIDTH - 16, HEIGHT - 16, 28);
  }

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      note: "origin top-left; x grows right; y grows down",
      selectedTower: state.selectedTower,
      credits: state.credits,
      baseHealth: state.baseHealth,
      wave: state.wave,
      waveTimer: Number(state.waveTimer.toFixed(2)),
      spawnBudget: state.spawnBudget,
      pads: buildPads.map((pad) => ({ index: pad.index, x: Math.round(pad.x), y: Math.round(pad.y), tower: pad.tower ? pad.tower.type : null })),
      enemies: state.enemies.map((enemy) => {
        const pos = pathPosition(enemy.progress);
        return { x: Math.round(pos.x), y: Math.round(pos.y), hp: Math.round(enemy.hp) };
      }),
      projectiles: state.projectiles.map((projectile) => ({ x: Math.round(projectile.x), y: Math.round(projectile.y) })),
      gameOver: state.gameOver,
      victory: state.victory,
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function tick(dt) {
    update(dt);
  }

  new window.p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(WIDTH, HEIGHT);
      canvas.parent(mount);
      canvas.elt.setAttribute("aria-hidden", "true");
      canvas.elt.addEventListener("click", handlePointer);
      canvas.elt.addEventListener("touchstart", handlePointer, { passive: false });
      p.pixelDensity(1);
      p.noSmooth();
    };

    p.draw = () => {
      if (!lastTimestamp) {
        lastTimestamp = p.millis();
      }
      const now = p.millis();
      const dt = Math.min(0.033, (now - lastTimestamp) / 1000);
      lastTimestamp = now;
      tick(dt);
      const time = now / 1000;
      drawBackground(p, time);
      withWorldTransform(p, () => {
        drawPath(p, time);
        drawCore(p, time);
        drawPads(p, time);
        drawProjectiles(p);
        drawEnemies(p, time);
        drawParticles(p);
      });
      drawHudBanner(p, time);
      drawBootOverlay(p, time);
      drawScanlines(p, time);
    };
  });

  startButton.addEventListener("click", beginGame);
  restartButton.addEventListener("click", beginGame);
  towerButtons.forEach((button) => button.addEventListener("click", () => selectTower(button.dataset.tower)));
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    }
  });

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      tick(1 / 60);
    }
  };

  selectTower("bolt");
  syncHud();
})();
