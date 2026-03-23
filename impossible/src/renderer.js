import { PLAYER_SIZE } from "./physics.js";

export function createRenderer(canvas, level) {
  const context = canvas.getContext("2d");
  return {
    canvas,
    context,
    level,
  };
}

export function renderGame(renderer, game, overlay) {
  const { context, canvas, level } = renderer;
  const cameraX = clamp(
    game.player.x - canvas.width * 0.3,
    0,
    Math.max(level.width - canvas.width, 0),
  );

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawSky(context, canvas);
  drawSun(context, game.frame);
  drawClouds(context, canvas, cameraX, game.frame);
  drawMountains(context, cameraX);

  context.save();
  context.translate(-cameraX, 0);
  drawStartMarker(context, level);
  drawGoal(context, level);
  drawGaps(context, level, game.frame);
  drawGround(context, level);
  drawSensors(context, game, overlay.debug);
  drawPlayer(context, game.player);
  context.restore();

  drawOverlay(context, canvas, overlay);
  drawCenterCard(context, canvas, overlay);
}

function drawSky(context, canvas) {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#111520");
  gradient.addColorStop(0.55, "#171d2c");
  gradient.addColorStop(1, "#0c0f18");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 36; index += 1) {
    const x = (index * 97) % canvas.width;
    const y = (index * 53) % 150;
    context.fillStyle = index % 4 === 0 ? "rgba(214, 221, 255, 0.26)" : "rgba(214, 221, 255, 0.14)";
    context.fillRect(x, y, 4, 4);
  }
}

function drawSun(context, frame) {
  const moonY = 74 + Math.sin(frame * 0.02) * 2;
  context.fillStyle = "rgba(255, 96, 144, 0.92)";
  context.beginPath();
  context.arc(860, moonY, 26, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f6ecd7";
  context.beginPath();
  context.arc(860, moonY, 18, 0, Math.PI * 2);
  context.fill();
}

function drawClouds(context, canvas, cameraX, frame) {
  const drift = frame * 0.15;
  const clouds = [
    { x: 180, y: 72, scale: 1 },
    { x: 460, y: 108, scale: 0.8 },
    { x: 780, y: 86, scale: 1.1 },
    { x: 1100, y: 132, scale: 0.9 },
  ];

  context.save();
  context.fillStyle = "rgba(61, 69, 96, 0.38)";
  for (const cloud of clouds) {
    const x = ((cloud.x - cameraX * 0.35 + drift) % (canvas.width + 220)) - 120;
    const y = cloud.y;
    const r = 18 * cloud.scale;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.arc(x + r, y - 8, r * 0.9, 0, Math.PI * 2);
    context.arc(x + r * 2.1, y, r * 1.1, 0, Math.PI * 2);
    context.arc(x + r * 0.9, y + 10, r * 1.05, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawMountains(context, cameraX) {
  const offset = cameraX * 0.2;
  context.fillStyle = "#1b2030";
  context.beginPath();
  context.moveTo(-120 - offset, 300);
  context.lineTo(60 - offset, 178);
  context.lineTo(190 - offset, 300);
  context.lineTo(350 - offset, 136);
  context.lineTo(520 - offset, 300);
  context.lineTo(760 - offset, 154);
  context.lineTo(980 - offset, 300);
  context.lineTo(1200, 300);
  context.lineTo(1200, 360);
  context.lineTo(-120, 360);
  context.closePath();
  context.fill();

  context.fillStyle = "#303a4f";
  context.beginPath();
  context.moveTo(-120 - offset, 300);
  context.lineTo(10 - offset, 210);
  context.lineTo(140 - offset, 252);
  context.lineTo(390 - offset, 146);
  context.lineTo(468 - offset, 182);
  context.lineTo(620 - offset, 236);
  context.lineTo(892 - offset, 180);
  context.lineTo(1100 - offset, 238);
  context.lineTo(1200, 300);
  context.lineTo(1200, 360);
  context.lineTo(-120, 360);
  context.closePath();
  context.fill();

  drawForest(context, cameraX);
}

function drawForest(context, cameraX) {
  const offset = cameraX * 0.45;
  context.fillStyle = "#220a0b";
  for (let index = -2; index < 36; index += 1) {
    const x = index * 38 - offset;
    const baseY = 286;
    const height = 34 + ((index * 17) % 64);
    context.beginPath();
    context.moveTo(x, baseY);
    context.lineTo(x + 10, baseY - height);
    context.lineTo(x + 20, baseY);
    context.closePath();
    context.fill();
    context.fillRect(x + 8, baseY, 4, 22);
  }
}

function drawGround(context, level) {
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const key = `${col}:${row}`;
      if (!level.solidTiles.has(key)) {
        continue;
      }

      const x = col * level.tileSize;
      const y = row * level.tileSize;
      const isTopSoil = row === level.groundRow;

      context.fillStyle = isTopSoil ? "#49526f" : "#343954";
      context.fillRect(x, y, level.tileSize, level.tileSize);

      if (isTopSoil) {
        context.fillStyle = "#69749b";
        context.fillRect(x, y, level.tileSize, 5);
        context.fillStyle = "rgba(210, 220, 255, 0.18)";
        context.fillRect(x + 3, y + 9, level.tileSize - 6, 2);
      } else {
        context.fillStyle = "rgba(0, 0, 0, 0.14)";
        context.fillRect(x + 2, y + 6, level.tileSize - 4, 2);
        context.fillStyle = "rgba(103, 116, 156, 0.18)";
        context.fillRect(x + 8, y + 16, 4, level.tileSize - 18);
      }
    }
  }
}

function drawGaps(context, level, frame) {
  const floorY = level.groundRow * level.tileSize;
  for (const gap of level.gapRanges) {
    const pulse = 0.18 + (Math.sin(frame * 0.08 + gap.startX * 0.02) + 1) * 0.08;
    const gradient = context.createLinearGradient(0, floorY, 0, level.height);
    gradient.addColorStop(0, `rgba(50, 56, 86, ${pulse})`);
    gradient.addColorStop(1, "rgba(4, 4, 8, 0.96)");
    context.fillStyle = gradient;
    context.fillRect(gap.startX, floorY, gap.width, level.height - floorY);

    context.strokeStyle = "rgba(137, 153, 206, 0.35)";
    context.lineWidth = 2;
    context.strokeRect(gap.startX + 1, floorY + 1, gap.width - 2, level.height - floorY - 2);
  }
}

function drawStartMarker(context, level) {
  const x = level.tileSize * 1.5;
  const y = (level.groundRow - 2.5) * level.tileSize;
  context.fillStyle = "#f2f2f4";
  context.fillRect(x, y, 4, level.tileSize * 2.5);
  context.fillStyle = "#d8e0ff";
  context.beginPath();
  context.moveTo(x + 4, y);
  context.lineTo(x + 44, y + 14);
  context.lineTo(x + 4, y + 28);
  context.closePath();
  context.fill();
  context.fillStyle = "rgba(14, 18, 28, 0.76)";
  context.fillRect(x - 8, y - 28, 72, 20);
  context.fillStyle = "#fff7eb";
  context.font = "12px Georgia";
  context.fillText("START", x + 2, y - 14);
}

function drawGoal(context, level) {
  const poleX = level.goalX;
  const poleY = (level.groundRow - 4) * level.tileSize;
  context.fillStyle = "#f2f2f4";
  context.fillRect(poleX, poleY, 5, level.height - poleY - level.tileSize * 2);

  context.fillStyle = "#6675a8";
  context.beginPath();
  context.moveTo(poleX + 5, poleY);
  context.lineTo(poleX + 54, poleY + 16);
  context.lineTo(poleX + 5, poleY + 32);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(14, 18, 28, 0.76)";
  context.fillRect(poleX - 28, poleY - 28, 86, 20);
  context.fillStyle = "#fff7eb";
  context.font = "12px Georgia";
  context.fillText("FINISH", poleX - 16, poleY - 14);
}

function drawPlayer(context, player) {
  const tilt = clamp(player.vx * 0.08, -0.16, 0.16);
  const centerX = player.x + PLAYER_SIZE / 2;
  const centerY = player.y + PLAYER_SIZE / 2;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(tilt);

  context.fillStyle = "rgba(0, 0, 0, 0.24)";
  context.fillRect(-PLAYER_SIZE / 2 + 2, PLAYER_SIZE / 2 + 6, PLAYER_SIZE - 4, 6);

  context.fillStyle = "#f2f2f4";
  context.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

  const bodyGradient = context.createLinearGradient(-12, -12, 12, 12);
  bodyGradient.addColorStop(0, "#ffffff");
  bodyGradient.addColorStop(1, "#d3d6de");
  context.fillStyle = bodyGradient;
  context.fillRect(-PLAYER_SIZE / 2 + 3, -PLAYER_SIZE / 2 + 3, PLAYER_SIZE - 6, PLAYER_SIZE - 6);

  context.fillStyle = "#2d3142";
  context.fillRect(-5, -3, 3, 3);
  context.fillRect(2, -3, 3, 3);
  context.fillRect(-2, 5, 4, 2);
  context.restore();
}

function drawSensors(context, game, debug) {
  if (!debug) {
    return;
  }

  const playerCenterX = game.player.x + game.player.width * 0.5;
  const playerTopY = game.player.y + 2;
  const playerMidY = game.player.y + game.player.height * 0.5;
  const playerBottomY = game.player.y + game.player.height + 20;
  const gap = debug.sensors.upcomingGap;

  context.save();
  context.setLineDash([8, 6]);
  context.strokeStyle = "rgba(29, 42, 43, 0.75)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(playerCenterX, playerBottomY);
  context.lineTo(gap.startX, playerBottomY);
  context.stroke();
  context.setLineDash([]);

  if (gap.width > 0) {
    context.fillStyle = "rgba(198, 84, 47, 0.16)";
    context.fillRect(
      gap.startX,
      game.level.groundRow * game.level.tileSize,
      gap.width,
      game.level.height - game.level.groundRow * game.level.tileSize,
    );

    context.strokeStyle = "rgba(198, 84, 47, 0.86)";
    context.lineWidth = 3;
    context.strokeRect(
      gap.startX,
      game.level.groundRow * game.level.tileSize + 2,
      gap.width,
      game.level.height - game.level.groundRow * game.level.tileSize - 4,
    );
  }

  drawOutputBar(context, playerCenterX - 34, playerTopY - 42, 18, 36, debug.outputs[0], debug.action.left, "#c6542f");
  drawOutputBar(context, playerCenterX - 10, playerTopY - 42, 18, 36, debug.outputs[1], debug.action.right, "#d5a021");
  drawOutputBar(context, playerCenterX + 14, playerTopY - 42, 18, 36, debug.outputs[2], debug.action.jump, "#396e54");

  context.fillStyle = "rgba(14, 18, 18, 0.72)";
  context.fillRect(playerCenterX + 18, playerMidY - 26, 110, 52);
  context.fillStyle = "#fff7eb";
  context.font = "12px Georgia";
  context.fillText(`gap ${debug.sensors.raw.gapDistance.toFixed(0)}px`, playerCenterX + 28, playerMidY - 6);
  context.fillText(`vx ${debug.sensors.raw.velocityX.toFixed(2)}`, playerCenterX + 28, playerMidY + 12);
  context.fillText(`vy ${debug.sensors.raw.velocityY.toFixed(2)}`, playerCenterX + 28, playerMidY + 30);
  context.restore();
}

function drawOverlay(context, canvas, overlay) {
  context.fillStyle = "rgba(14, 18, 18, 0.68)";
  context.fillRect(14, 14, 420, 136);

  context.fillStyle = "#fff7eb";
  context.font = "16px Georgia";
  context.fillText(`Mode: ${overlay.mode}`, 28, 38);
  context.fillText(`Generation: ${overlay.generation}`, 28, 58);
  context.fillText(`Agent: ${overlay.agent}`, 28, 78);
  context.fillText(`Best Fitness: ${overlay.bestFitness}`, 28, 98);
  context.fillText(`Gen Best: ${overlay.generationBest}`, 28, 118);
  context.font = "14px Georgia";
  context.fillStyle = "rgba(255, 247, 235, 0.84)";
  context.fillText(`${overlay.submessage ?? ""}`, 28, 136);

  context.fillStyle = "#fff7eb";
  context.font = "16px Georgia";
  context.textAlign = "right";
  context.fillText(`${overlay.message}`, canvas.width - 24, 38);
  context.textAlign = "left";
}

function drawCenterCard(context, canvas, overlay) {
  if (!overlay.centerCard) {
    return;
  }

  const { title, text, tone } = overlay.centerCard;
  const width = 430;
  const height = 122;
  const x = (canvas.width - width) / 2;
  const y = canvas.height * 0.18;

  context.save();
  context.fillStyle = tone === "danger"
    ? "rgba(94, 28, 20, 0.8)"
    : tone === "success"
      ? "rgba(28, 82, 53, 0.8)"
      : "rgba(14, 18, 18, 0.72)";
  context.fillRect(x, y, width, height);
  context.strokeStyle = "rgba(255, 247, 235, 0.25)";
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);

  context.fillStyle = "#fff7eb";
  context.textAlign = "center";
  context.font = "bold 30px Georgia";
  context.fillText(title, canvas.width / 2, y + 42);
  context.font = "18px Georgia";
  context.fillText(text, canvas.width / 2, y + 78);
  context.font = "14px Georgia";
  context.fillStyle = "rgba(255, 247, 235, 0.8)";
  context.fillText("Use Left, Right, Space and R", canvas.width / 2, y + 103);
  context.textAlign = "left";
  context.restore();
}

function drawOutputBar(context, x, y, width, height, value, active, color) {
  const normalized = (value + 1) / 2;
  const fillHeight = height * clamp(normalized, 0, 1);
  context.fillStyle = "rgba(14, 18, 18, 0.48)";
  context.fillRect(x, y, width, height);
  context.fillStyle = active ? color : "rgba(255, 247, 235, 0.55)";
  context.fillRect(x, y + height - fillHeight, width, fillHeight);
  context.strokeStyle = active ? "#fff7eb" : "rgba(255, 247, 235, 0.5)";
  context.lineWidth = active ? 2 : 1;
  context.strokeRect(x, y, width, height);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
