import { isSolidAt } from "./level.js";

export const GRAVITY = 0.52;
export const MOVE_ACCEL = 0.5;
export const MAX_SPEED_X = 4;
export const GROUND_FRICTION = 0.8;
export const AIR_FRICTION = 0.96;
export const JUMP_SPEED = -10.8;
export const PLAYER_SIZE = 24;

export function applyAction(player, action) {
  if (action.left && !action.right) {
    player.vx -= MOVE_ACCEL;
  } else if (action.right && !action.left) {
    player.vx += MOVE_ACCEL;
  } else {
    player.vx *= player.grounded ? GROUND_FRICTION : AIR_FRICTION;
  }

  player.vx = clamp(player.vx, -MAX_SPEED_X, MAX_SPEED_X);

  if (action.jump && player.grounded) {
    player.vy = JUMP_SPEED;
    player.grounded = false;
  }
}

export function stepPlayer(level, player) {
  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, 14);

  player.x += player.vx;
  resolveHorizontal(level, player);

  player.y += player.vy;
  resolveVertical(level, player);

  if (Math.abs(player.vx) < 0.01) {
    player.vx = 0;
  }
}

function resolveHorizontal(level, player) {
  const direction = Math.sign(player.vx);
  if (direction === 0) {
    return;
  }

  const points = getCollisionPoints(player);
  for (const point of points) {
    const tileCol = Math.floor(point.x / level.tileSize);
    const tileRow = Math.floor(point.y / level.tileSize);
    if (!isSolidAt(level, tileCol, tileRow)) {
      continue;
    }

    if (direction > 0) {
      player.x = tileCol * level.tileSize - player.width;
    } else {
      player.x = (tileCol + 1) * level.tileSize;
    }
    player.vx = 0;
    return;
  }
}

function resolveVertical(level, player) {
  player.grounded = false;
  const direction = Math.sign(player.vy);
  if (direction === 0) {
    return;
  }

  const points = getCollisionPoints(player);
  for (const point of points) {
    const tileCol = Math.floor(point.x / level.tileSize);
    const tileRow = Math.floor(point.y / level.tileSize);
    if (!isSolidAt(level, tileCol, tileRow)) {
      continue;
    }

    if (direction > 0) {
      player.y = tileRow * level.tileSize - player.height;
      player.grounded = true;
    } else {
      player.y = (tileRow + 1) * level.tileSize;
    }
    player.vy = 0;
    return;
  }
}

function getCollisionPoints(player) {
  const left = player.x + 1;
  const right = player.x + player.width - 1;
  const top = player.y + 1;
  const bottom = player.y + player.height - 1;

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
