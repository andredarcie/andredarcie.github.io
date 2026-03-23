import { PLAYER_SIZE, applyAction, stepPlayer } from "./physics.js";

export function createGame(level) {
  return {
    level,
    player: createPlayer(level),
    frame: 0,
    maxX: 0,
    idleFrames: 0,
    finished: false,
    dead: false,
  };
}

export function resetGame(game) {
  game.player = createPlayer(game.level);
  game.frame = 0;
  game.maxX = 0;
  game.idleFrames = 0;
  game.finished = false;
  game.dead = false;
}

export function stepGame(game, action) {
  if (game.finished || game.dead) {
    return;
  }

  applyAction(game.player, action);
  stepPlayer(game.level, game.player);

  game.frame += 1;
  const progress = Math.max(game.player.x, 0);
  if (progress > game.maxX) {
    game.maxX = progress;
    game.idleFrames = 0;
  } else {
    game.idleFrames += 1;
  }

  if (game.player.y > game.level.height + 120) {
    game.dead = true;
  }

  if (game.player.x + game.player.width >= game.level.goalX) {
    game.finished = true;
  }
}

function createPlayer(level) {
  return {
    x: level.tileSize * 1.5,
    y: level.tileSize * (level.groundRow - 1) - PLAYER_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    grounded: false,
  };
}
