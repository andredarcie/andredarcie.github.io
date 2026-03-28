(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const overlay = document.getElementById("overlay");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const towerButtons = Array.from(document.querySelectorAll("[data-tower]"));
  const creditsValue = document.getElementById("creditsValue");
  const healthValue = document.getElementById("healthValue");
  const waveValue = document.getElementById("waveValue");

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const PATH_WIDTH = 112;
  const ENEMY_RADIUS = 23;
  const LEAK_LIMIT = 10;

  const palette = {
    sand: "#f3efe7",
    paper: "#fffcf6",
    track: "#e1d7ca",
    line: "rgba(29, 42, 47, 0.10)",
    ink: "#1d2a2f",
    muted: "#64706e",
    bolt: "#2c7a7b",
    boltSoft: "rgba(44, 122, 123, 0.18)",
    pulse: "#c6724f",
    pulseSoft: "rgba(198, 114, 79, 0.16)",
    focus: "#d5a021",
    core: "#d85a66",
    coreSoft: "rgba(216, 90, 102, 0.18)",
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
  ].map((pad, index) => ({ ...pad, index, tower: null, pulseFx: 0 }));

  const towerTypes = {
    bolt: {
      cost: 35,
      range: 185,
      cadence: 0.42,
      damage: 16,
      color: palette.bolt,
    },
    pulse: {
      cost: 55,
      range: 130,
      cadence: 1.0,
      damage: 28,
      splash: 52,
      color: palette.pulse,
    },
  };

  let animationFrameId = 0;
  let lastTimestamp = 0;

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
    };
  }

  let state = createState();

  function resetPads() {
    buildPads.forEach((pad) => {
      pad.tower = null;
      pad.pulseFx = 0;
    });
  }

  function beginGame() {
    state = createState();
    resetPads();
    overlay.classList.add("hidden");
    state.mode = "playing";
    syncHud();
    render();
  }

  function selectTower(type) {
    state.selectedTower = type;
    towerButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.tower === type);
    });
  }

  function pathPosition(progress) {
    const clamped = clamp(progress, 0, 1);
    const lengths = [];
    let total = 0;
    for (let i = 0; i < pathPoints.length - 1; i += 1) {
      total += distance(pathPoints[i], pathPoints[i + 1]);
      lengths.push(total);
    }

    const target = total * clamped;
    let previous = 0;
    for (let i = 0; i < lengths.length; i += 1) {
      if (target <= lengths[i]) {
        const local = (target - previous) / (lengths[i] - previous || 1);
        return {
          x: lerp(pathPoints[i].x, pathPoints[i + 1].x, local),
          y: lerp(pathPoints[i].y, pathPoints[i + 1].y, local),
        };
      }
      previous = lengths[i];
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
      color: state.wave % 3 === 2 ? palette.focus : palette.ink,
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
    };
    syncHud();
  }

  function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    return {
      x: (source.clientX - rect.left) * scaleX,
      y: (source.clientY - rect.top) * scaleY,
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

  function killEnemy(enemy, impactPoint) {
    state.kills += 1;
    state.credits += 12;
    state.particles.push({
      x: impactPoint.x,
      y: impactPoint.y,
      size: 52,
      life: 0.35,
      color: palette.coreSoft,
    });
    const index = state.enemies.indexOf(enemy);
    if (index >= 0) {
      state.enemies.splice(index, 1);
    }
    syncHud();
  }

  function damageEnemy(enemy, amount, impactPoint) {
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      killEnemy(enemy, impactPoint);
    }
  }

  function updateTowers(dt) {
    buildPads.forEach((pad) => {
      if (!pad.tower) {
        pad.pulseFx = Math.max(0, pad.pulseFx - dt * 2.5);
        return;
      }

      const config = towerTypes[pad.tower.type];
      pad.tower.cooldown -= dt;
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
      if (pad.tower.type === "bolt") {
        state.projectiles.push({
          type: "bolt",
          x: pad.x,
          y: pad.y,
          target,
          speed: 820,
          damage: config.damage,
          color: config.color,
        });
      } else {
        pad.pulseFx = 1;
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
      if (distanceToTarget <= step + 8) {
        damageEnemy(projectile.target, projectile.damage, targetPos);
        state.particles.push({
          x: targetPos.x,
          y: targetPos.y,
          size: 28,
          life: 0.18,
          color: palette.boltSoft,
        });
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
      if (enemy.progress >= 1) {
        const index = state.enemies.indexOf(enemy);
        if (index >= 0) {
          state.enemies.splice(index, 1);
        }
        state.baseHealth -= 1;
        state.leaked += 1;
        state.particles.push({
          x: pathPoints[pathPoints.length - 1].x,
          y: pathPoints[pathPoints.length - 1].y,
          size: 70,
          life: 0.45,
          color: palette.coreSoft,
        });
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
    overlay.querySelector(".eyebrow").textContent = victory ? "Missão concluída" : "Defesa falhou";
    overlay.querySelector("h2").textContent = victory ? "O núcleo resistiu" : "A linha rompeu";
    overlay.querySelector("p").textContent = victory
      ? "Você segurou sete ondas. Toque em reiniciar para jogar novamente."
      : "Reposicione as torres mais cedo e espalhe o dano em área.";
    startButton.textContent = "Jogar novamente";
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter((particle) => {
      particle.life -= dt;
      particle.size += dt * 60;
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

  function drawRoundedRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawHexagon(x, y, radius, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, palette.sand);
    gradient.addColorStop(1, "#ebe4d8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.globalAlpha = 0.22;
    drawHexagon(130, 1180, 170, "#ffffff", "rgba(255,255,255,0)");
    drawHexagon(780, 170, 145, "#ffffff", "rgba(255,255,255,0)");
    ctx.restore();
  }

  function drawPath() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = palette.track;
    ctx.lineWidth = PATH_WIDTH;
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i += 1) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 10;
    ctx.setLineDash([12, 18]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCore() {
    const core = pathPoints[pathPoints.length - 1];
    ctx.save();
    ctx.translate(core.x, core.y);
    drawHexagon(0, 0, 68, palette.paper, "rgba(29,42,47,0.08)");
    drawHexagon(0, 0, 34, palette.core, "rgba(255,255,255,0.7)");
    ctx.restore();
  }

  function drawPads() {
    buildPads.forEach((pad) => {
      const selected = !pad.tower && state.selectedTower;
      drawHexagon(
        pad.x,
        pad.y,
        42,
        pad.tower ? "rgba(255,252,246,0.92)" : "rgba(255,255,255,0.42)",
        selected ? "rgba(29,42,47,0.18)" : "rgba(29,42,47,0.08)"
      );

      if (!pad.tower) {
        ctx.strokeStyle = "rgba(29,42,47,0.18)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pad.x - 10, pad.y);
        ctx.lineTo(pad.x + 10, pad.y);
        ctx.moveTo(pad.x, pad.y - 10);
        ctx.lineTo(pad.x, pad.y + 10);
        ctx.stroke();
        return;
      }

      const config = towerTypes[pad.tower.type];
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.rotate(pad.tower.aim);
      if (pad.tower.type === "bolt") {
        drawHexagon(0, 0, 22, config.color, "rgba(255,255,255,0.7)");
        drawRoundedRect(0, -8, 36, 16, 8, palette.ink);
      } else {
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        drawRoundedRect(0, -11, 30, 22, 10, palette.ink);
      }
      ctx.restore();

      if (pad.pulseFx > 0) {
        ctx.beginPath();
        ctx.arc(pad.x, pad.y, 40 + pad.pulseFx * 70, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(198, 114, 79, ${0.22 * pad.pulseFx})`;
        ctx.lineWidth = 10 * pad.pulseFx;
        ctx.stroke();
      }
    });
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      const pos = pathPosition(enemy.progress);
      drawHexagon(pos.x, pos.y, enemy.radius + 6, enemy.color, "rgba(255,255,255,0.5)");
      ctx.fillStyle = palette.paper;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, enemy.radius * 0.44, 0, Math.PI * 2);
      ctx.fill();

      drawRoundedRect(pos.x - 28, pos.y - enemy.radius - 24, 56, 8, 4, "rgba(29,42,47,0.12)");
      drawRoundedRect(
        pos.x - 28,
        pos.y - enemy.radius - 24,
        56 * Math.max(0, enemy.hp / enemy.maxHp),
        8,
        4,
        enemy.color
      );
    });
  }

  function drawProjectiles() {
    state.projectiles.forEach((projectile) => {
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color.replace("0.18", String(0.24 * particle.life));
      ctx.fill();
    });
  }

  function drawTopLabel() {
    drawRoundedRect(38, 38, WIDTH - 76, 90, 30, "rgba(255,252,246,0.72)");
    ctx.fillStyle = palette.ink;
    ctx.font = "700 28px Manrope";
    ctx.fillText("Fluxo automático", 72, 82);
    ctx.fillStyle = palette.muted;
    ctx.font = "500 20px Manrope";
    const status = state.gameOver
      ? state.victory
        ? "Núcleo estável"
        : "Reconstrução necessária"
      : state.spawnBudget > 0 || state.enemies.length > 0
        ? `Onda ${state.wave} ativa`
        : `Próxima onda em ${Math.max(0, state.waveTimer).toFixed(1)}s`;
    ctx.fillText(status, 72, 112);
  }

  function render() {
    drawBackground();
    drawPath();
    drawCore();
    drawPads();
    drawProjectiles();
    drawEnemies();
    drawParticles();
    drawTopLabel();
  }

  function syncHud() {
    creditsValue.textContent = String(state.credits);
    healthValue.textContent = String(state.baseHealth);
    waveValue.textContent = String(state.wave);
  }

  function animationLoop(timestamp) {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }
    const dt = Math.min(0.033, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    update(dt);
    render();
    animationFrameId = window.requestAnimationFrame(animationLoop);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function renderGameToText() {
    const payload = {
      mode: state.mode,
      note: "origin top-left; x grows right; y grows down",
      selectedTower: state.selectedTower,
      credits: state.credits,
      baseHealth: state.baseHealth,
      wave: state.wave,
      waveTimer: Number(state.waveTimer.toFixed(2)),
      spawnBudget: state.spawnBudget,
      pads: buildPads.map((pad) => ({
        index: pad.index,
        x: Math.round(pad.x),
        y: Math.round(pad.y),
        tower: pad.tower ? pad.tower.type : null,
      })),
      enemies: state.enemies.map((enemy) => {
        const pos = pathPosition(enemy.progress);
        return {
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          hp: Math.round(enemy.hp),
        };
      }),
      projectiles: state.projectiles.map((projectile) => ({
        x: Math.round(projectile.x),
        y: Math.round(projectile.y),
      })),
      gameOver: state.gameOver,
      victory: state.victory,
    };
    return JSON.stringify(payload);
  }

  startButton.addEventListener("click", beginGame);
  restartButton.addEventListener("click", beginGame);
  towerButtons.forEach((button) => {
    button.addEventListener("click", () => selectTower(button.dataset.tower));
  });
  canvas.addEventListener("click", handlePointer);
  canvas.addEventListener("touchstart", handlePointer, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    }
  });

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      update(1 / 60);
    }
    render();
  };

  selectTower("bolt");
  syncHud();
  render();
  animationFrameId = window.requestAnimationFrame(animationLoop);

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(animationFrameId);
  });
})();
