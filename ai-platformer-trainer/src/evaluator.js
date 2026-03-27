import { createGame, resetGame, stepGame } from "./game.js";
import { isSolidAt } from "./level.js";
import { evaluateNetworkDetailed } from "./nn.js";

export const MAX_FRAMES = 900;
export const MAX_IDLE_FRAMES = 120;
export const SENSOR_RADIUS = 4;
export const INPUT_LABELS = createInputLabels(SENSOR_RADIUS);
export const OUTPUT_LABELS = ["Left", "Right", "Jump"];

export function evaluateGenome(level, genome) {
  const game = createGame(level);
  resetGame(game);

  while (!game.dead && !game.finished && game.frame < MAX_FRAMES && game.idleFrames < MAX_IDLE_FRAMES) {
    const debugState = getDecisionSnapshot(game, genome.network);
    stepGame(game, debugState.action);
  }

  return computeFitness(game);
}

export function getInputs(game) {
  return getSensorSnapshot(game).normalizedInputs;
}

export function getSensorSnapshot(game) {
  const { player, level } = game;
  const originX = player.x + player.width * 0.5;
  const originY = player.y + player.height * 0.5;
  const normalizedInputs = [];
  let solidTiles = 0;
  let dangerTiles = 0;

  for (let dy = -SENSOR_RADIUS; dy <= SENSOR_RADIUS; dy += 1) {
    for (let dx = -SENSOR_RADIUS; dx <= SENSOR_RADIUS; dx += 1) {
      const worldX = originX + dx * level.tileSize;
      const worldY = originY + dy * level.tileSize;
      const tileCol = Math.floor(worldX / level.tileSize);
      const tileRow = Math.floor(worldY / level.tileSize);
      let value = 0;

      if (isSolidAt(level, tileCol, tileRow)) {
        value = 1;
        solidTiles += 1;
      } else if (tileRow >= level.groundRow) {
        value = -1;
        dangerTiles += 1;
      }

      normalizedInputs.push(value);
    }
  }

  return {
    raw: {
      solidTiles,
      dangerTiles,
      originTileX: Math.floor(originX / level.tileSize),
      originTileY: Math.floor(originY / level.tileSize),
      grounded: player.grounded,
      velocityX: player.vx,
      velocityY: player.vy,
    },
    normalizedInputs,
  };
}

export function getDecisionSnapshot(game, network) {
  const sensors = getSensorSnapshot(game);
  const evaluation = evaluateNetworkDetailed(network, sensors.normalizedInputs);
  const action = toAction(evaluation.outputs);

  return {
    sensors,
    hidden: evaluation.hidden,
    outputs: evaluation.outputs,
    hiddenNodeIds: evaluation.hiddenNodeIds,
    nodeValues: evaluation.nodeValues,
    action,
  };
}

export function toAction(outputs) {
  const action = {
    left: outputs[0] > 0.35,
    right: outputs[1] > 0.35,
    jump: outputs[2] > 0.45,
  };

  if (action.left && action.right) {
    if (outputs[0] >= outputs[1]) {
      action.right = false;
    } else {
      action.left = false;
    }
  }

  return action;
}

export function computeFitness(game) {
  const completion = Math.min(game.maxX / game.level.goalX, 1);
  let fitness = game.maxX;
  fitness += Math.min(game.frame * 0.2, 80);

  if (game.finished) {
    fitness += 2600;
  }

  if (game.dead) {
    const deathPenalty = 120 * (1 - completion * 0.75);
    fitness -= deathPenalty;
  }

  if (game.idleFrames >= MAX_IDLE_FRAMES) {
    const idlePenalty = 60 * (1 - completion * 0.85);
    fitness -= idlePenalty;
  }

  if (!game.finished && completion > 0.9) {
    fitness += 220 * completion;
  }

  return Math.max(fitness, 1);
}

function createInputLabels(radius) {
  const labels = [];
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      labels.push(`${dx},${dy}`);
    }
  }
  return labels;
}
