import { createGame, resetGame, stepGame } from "./game.js";
import { evaluateNetworkDetailed } from "./nn.js";

export const MAX_FRAMES = 900;
export const MAX_IDLE_FRAMES = 120;
export const INPUT_LABELS = ["Gap", "Width", "FinalGap", "FinalWidth", "Goal", "Ground", "VX", "VY"];
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
  const upcomingGap = findUpcomingGap(level, player.x + player.width * 0.5);
  const finalGap = findFinalGap(level, player.x + player.width * 0.5);
  const goalDistance = Math.max(level.goalX - player.x, 0);

  return {
    upcomingGap,
    finalGap,
    raw: {
      gapDistance: upcomingGap.distance,
      gapWidth: upcomingGap.width,
      finalGapDistance: finalGap.distance,
      finalGapWidth: finalGap.width,
      goalDistance,
      grounded: player.grounded,
      velocityX: player.vx,
      velocityY: player.vy,
    },
    normalizedInputs: [
      normalize(upcomingGap.distance, level.width),
      normalize(upcomingGap.width, level.width),
      normalize(finalGap.distance, level.width),
      normalize(finalGap.width, level.width),
      normalize(goalDistance, level.width),
      player.grounded ? 1 : -1,
      normalizeSigned(player.vx, 6),
      normalizeSigned(player.vy, 14),
    ],
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
    action,
  };
}

export function toAction(outputs) {
  return {
    left: outputs[0] > 0.35,
    right: outputs[1] > 0.35,
    jump: outputs[2] > 0.45,
  };
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

function findUpcomingGap(level, fromX) {
  const margin = level.tileSize * 0.5;
  for (const gap of level.gapRanges) {
    if (gap.endX < fromX - margin) {
      continue;
    }

    const distance = Math.max(gap.startX - fromX, 0);
    return {
      startX: gap.startX,
      endX: gap.endX,
      distance,
      width: gap.width,
    };
  }

  return {
    startX: level.goalX,
    endX: level.goalX,
    distance: Math.max(level.goalX - fromX, 0),
    width: 0,
  };
}

function findFinalGap(level, fromX) {
  const gap = level.gapRanges[level.gapRanges.length - 1];
  return {
    startX: gap.startX,
    endX: gap.endX,
    distance: Math.max(gap.startX - fromX, 0),
    width: gap.width,
  };
}

function normalize(value, max) {
  if (max === 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / max));
}

function normalizeSigned(value, max) {
  if (max === 0) {
    return 0;
  }
  return Math.max(-1, Math.min(1, value / max));
}
