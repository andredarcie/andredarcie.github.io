import { createGame, resetGame, stepGame } from "./game.js";
import {
  DEFAULT_TRAINING_CONFIG,
  advanceGeneration,
  createTrainingState,
  applyHistoricalBest,
} from "./genetic.js";
import {
  computeFitness,
  getDecisionSnapshot,
  INPUT_LABELS,
  MAX_FRAMES,
  MAX_IDLE_FRAMES,
  OUTPUT_LABELS,
} from "./evaluator.js";
import { createLevel } from "./level.js";
import { createNetworkVisualization } from "./nn.js";
import { createRenderer, renderGame } from "./renderer.js";
import { clearBestGenome, loadBestGenome, saveBestGenome } from "./storage.js";
import { createUI, updateUI } from "./ui.js";

const level = createLevel();
const canvas = document.querySelector("#game");
const renderer = createRenderer(canvas, level);
const ui = createUI();

let trainingState = createTrainingState(DEFAULT_TRAINING_CONFIG);
let watchedGame = createGame(level);
let watchedGenome = trainingState.population[0];
let mode = "training";
let trainingPaused = false;
let simulationSpeed = Number(ui.speedRange.value);
let turboEnabled = false;
let bestGenomeDirty = false;
let latestDebug = null;
let manualMessage = "Press Left, Right and Space";
let totalEvaluatedAgents = 0;
let victoryState = {
  visible: false,
  generation: 0,
  agentsTested: 0,
  summary: "",
};

const TURBO_STEPS = 4000;

const manualInput = {
  left: false,
  right: false,
  jump: false,
};

wireUi();
applyHistoricalBest(trainingState, loadBestGenome());
resetWatchedGame(trainingState.population[0]);
requestAnimationFrame(frame);

function frame() {
  if (mode === "training" && !trainingPaused) {
    const steps = turboEnabled ? TURBO_STEPS : simulationSpeed;
    for (let step = 0; step < steps; step += 1) {
      runTrainingStep();
    }
  } else if (mode === "watch") {
    runWatchStep();
  } else if (mode === "manual") {
    runManualStep();
  }

  if (bestGenomeDirty) {
    persistBestGenome();
  }

  if (!(mode === "training" && turboEnabled)) {
    render();
  } else {
    updateUiOnly();
  }
  requestAnimationFrame(frame);
}

function runTrainingStep() {
  if (victoryState.visible) {
    return;
  }

  const genome = trainingState.population[trainingState.currentIndex];
  latestDebug = getDecisionSnapshot(watchedGame, genome.network);
  stepGame(watchedGame, latestDebug.action);

  if (isAttemptFinished(watchedGame)) {
    genome.fitness = computeFitness(watchedGame);
    updateHistoricalBestIfNeeded(genome, watchedGame);
    totalEvaluatedAgents += 1;

    if (watchedGame.finished) {
      handleTrainingVictory();
      return;
    }

    trainingState.currentIndex += 1;

    if (trainingState.currentIndex >= trainingState.population.length) {
      advanceGeneration(trainingState);
    }

    resetWatchedGame(trainingState.population[trainingState.currentIndex]);
  }
}

function runWatchStep() {
  if (!trainingState.bestGenome) {
    return;
  }

  latestDebug = getDecisionSnapshot(watchedGame, trainingState.bestGenome.network);
  stepGame(watchedGame, latestDebug.action);
  if (isAttemptFinished(watchedGame)) {
    resetWatchedGame(trainingState.bestGenome);
  }
}

function runManualStep() {
  if (watchedGame.dead || watchedGame.finished) {
    return;
  }

  stepGame(watchedGame, manualInput);
  latestDebug = null;

  if (watchedGame.finished) {
    manualMessage = "Level complete. Press R to play again";
  } else if (watchedGame.dead) {
    manualMessage = "You fell. Press R to restart";
  }
}

function isAttemptFinished(game) {
  return (
    game.dead ||
    game.finished ||
    game.frame >= MAX_FRAMES ||
    game.idleFrames >= MAX_IDLE_FRAMES
  );
}

function resetWatchedGame(genome) {
  watchedGenome = genome;
  resetGame(watchedGame);
  latestDebug = genome ? getDecisionSnapshot(watchedGame, genome.network) : null;
}

function render() {
  const currentFitness = mode === "training"
    ? computeFitness(watchedGame)
    : watchedGame.maxX;
  const currentCompletion = Math.min((watchedGame.maxX / level.goalX) * 100, 100);
  const generationBest = getGenerationBest();

  renderGame(renderer, watchedGame, {
    mode: getModeLabel(),
    generation: trainingState.generation,
    agent: getAgentLabel(),
    bestFitness: trainingState.bestFitness.toFixed(1),
    generationBest: generationBest.toFixed(1),
    message: getStatusMessage(),
    submessage: getSubmessage(),
    debug: mode === "manual" ? null : latestDebug,
    centerCard: getCenterCard(),
  });

  updateUI(ui, {
    mode: getModeLabel(),
    generation: trainingState.generation,
    agent: getAgentLabel(),
    frame: watchedGame.frame,
    bestFitness: trainingState.bestFitness,
    bestCompletion: trainingState.bestCompletion,
    generationBest,
    currentFitness,
    completion: currentCompletion,
    speed: turboEnabled ? TURBO_STEPS : simulationSpeed,
    turboEnabled,
    generationHistory: trainingState.generationHistory,
    debug: mode === "manual" ? null : latestDebug,
    networkViz: getNetworkVisualization(),
    victory: victoryState,
  });
}

function updateUiOnly() {
  const currentFitness = computeFitness(watchedGame);
  const currentCompletion = Math.min((watchedGame.maxX / level.goalX) * 100, 100);

  updateUI(ui, {
    mode: getModeLabel(),
    generation: trainingState.generation,
    agent: getAgentLabel(),
    frame: watchedGame.frame,
    bestFitness: trainingState.bestFitness,
    bestCompletion: trainingState.bestCompletion,
    generationBest: getGenerationBest(),
    currentFitness,
    completion: currentCompletion,
    speed: TURBO_STEPS,
    turboEnabled: true,
    generationHistory: trainingState.generationHistory,
    debug: null,
    networkViz: null,
    victory: victoryState,
  });
}

function getModeLabel() {
  if (mode === "training") {
    if (trainingPaused) {
      return "Training Paused";
    }
    return turboEnabled ? "Training Turbo" : "Training";
  }
  if (mode === "watch") {
    return "Watching Best";
  }
  return "Manual Play";
}

function wireUi() {
  ui.toggleTrainingButton.addEventListener("click", () => {
    if (mode !== "training") {
      mode = "training";
      resetWatchedGame(trainingState.population[trainingState.currentIndex]);
    }
    trainingPaused = !trainingPaused;
    ui.toggleTrainingButton.textContent = trainingPaused ? "Resume Training" : "Pause Training";
  });

  ui.toggleTurboButton.addEventListener("click", () => {
    turboEnabled = !turboEnabled;
    ui.toggleTurboButton.textContent = turboEnabled ? "Turbo On" : "Turbo Off";

    if (mode !== "training") {
      mode = "training";
      trainingPaused = false;
      ui.toggleTrainingButton.textContent = "Pause Training";
      resetWatchedGame(trainingState.population[trainingState.currentIndex]);
    }
  });

  ui.watchBestButton.addEventListener("click", () => {
    mode = "watch";
    trainingPaused = true;
    if (trainingState.bestGenome) {
      resetWatchedGame(trainingState.bestGenome);
    }
  });

  ui.manualModeButton.addEventListener("click", () => {
    startManualMode();
  });

  ui.restartRunButton.addEventListener("click", () => {
    if (mode === "manual") {
      restartManualRun();
      return;
    }

    if (mode === "watch") {
      resetWatchedGame(trainingState.bestGenome);
      return;
    }

    resetWatchedGame(trainingState.population[trainingState.currentIndex]);
  });

  ui.resumeTrainingButton.addEventListener("click", () => {
    mode = "training";
    trainingPaused = false;
    ui.toggleTrainingButton.textContent = "Pause Training";
    resetWatchedGame(trainingState.population[trainingState.currentIndex]);
  });

  ui.resetTrainingButton.addEventListener("click", () => {
    trainingState = createTrainingState(DEFAULT_TRAINING_CONFIG);
    mode = "training";
    trainingPaused = false;
    ui.toggleTrainingButton.textContent = "Pause Training";
    totalEvaluatedAgents = 0;
    victoryState.visible = false;
    resetWatchedGame(trainingState.population[0]);
  });

  ui.clearSavedButton.addEventListener("click", () => {
    clearBestGenome();
    trainingState.bestFitness = 0;
    trainingState.bestCompletion = 0;
    trainingState.generationHistory = [];
  });

  ui.closeVictoryButton.addEventListener("click", () => {
    victoryState.visible = false;
  });

  ui.speedRange.addEventListener("input", (event) => {
    simulationSpeed = Number(event.target.value);
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "ArrowLeft") {
      manualInput.left = true;
    } else if (event.code === "ArrowRight") {
      manualInput.right = true;
    } else if (event.code === "Space") {
      manualInput.jump = true;
      event.preventDefault();
    } else if (event.code === "KeyR") {
      if (mode === "manual") {
        restartManualRun();
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "ArrowLeft") {
      manualInput.left = false;
    } else if (event.code === "ArrowRight") {
      manualInput.right = false;
    } else if (event.code === "Space") {
      manualInput.jump = false;
      event.preventDefault();
    }
  });
}

function updateHistoricalBestIfNeeded(genome, game) {
  const completion = Math.min((game.maxX / level.goalX) * 100, 100);
  if (genome.fitness <= trainingState.bestFitness) {
    return;
  }

  trainingState.bestFitness = genome.fitness;
  trainingState.bestGenome = structuredClone(genome);
  trainingState.bestCompletion = completion;
  bestGenomeDirty = true;
}

function persistBestGenome() {
  saveBestGenome({
    bestGenome: trainingState.bestGenome,
    bestFitness: trainingState.bestFitness,
    bestCompletion: trainingState.bestCompletion,
    generationHistory: trainingState.generationHistory,
  });
  bestGenomeDirty = false;
}

function getGenerationBest() {
  let best = 0;
  for (const genome of trainingState.population) {
    if (genome.fitness > best) {
      best = genome.fitness;
    }
  }
  return best;
}

function startManualMode() {
  mode = "manual";
  trainingPaused = true;
  victoryState.visible = false;
  restartManualRun();
}

function restartManualRun() {
  resetGame(watchedGame);
  manualMessage = "Press Left, Right and Space";
  latestDebug = null;
}

function getAgentLabel() {
  if (mode === "manual") {
    return "Player";
  }

  return `${Math.min(trainingState.currentIndex + 1, trainingState.population.length)} / ${trainingState.population.length}`;
}

function getStatusMessage() {
  if (mode === "manual") {
    if (watchedGame.finished) {
      return "You win";
    }
    if (watchedGame.dead) {
      return "Game over";
    }
    return "Play now";
  }

  return watchedGame.finished ? "Goal reached" : watchedGame.dead ? "Fell" : "Running";
}

function getSubmessage() {
  if (mode === "manual") {
    return manualMessage;
  }

  if (mode === "training" && turboEnabled) {
    return "Headless training is running at high speed";
  }

  return "Training the next jump timing";
}

function getCenterCard() {
  if (mode !== "manual") {
    return null;
  }

  if (watchedGame.finished) {
    return {
      title: "Level Complete",
      text: "You made it to the finish flag.",
      tone: "success",
    };
  }

  if (watchedGame.dead) {
    return {
      title: "You Fell",
      text: "Restart and time the jump earlier.",
      tone: "danger",
    };
  }

  if (watchedGame.frame < 45 && watchedGame.maxX < 8) {
    return {
      title: "Manual Mode",
      text: "Run right and jump the glowing pits.",
      tone: "neutral",
    };
  }

  return null;
}

function getNetworkVisualization() {
  if (mode === "manual" || !watchedGenome || !latestDebug) {
    return null;
  }

  return createNetworkVisualization(watchedGenome.network, latestDebug, INPUT_LABELS, OUTPUT_LABELS);
}

function handleTrainingVictory() {
  trainingPaused = true;
  turboEnabled = false;
  ui.toggleTurboButton.textContent = "Turbo Off";
  ui.toggleTrainingButton.textContent = "Resume Training";
  victoryState = {
    visible: true,
    generation: trainingState.generation,
    agentsTested: totalEvaluatedAgents,
    summary: "O treino foi interrompido no exato momento em que a primeira execucao vencedora alcancou a bandeira.",
  };
}
