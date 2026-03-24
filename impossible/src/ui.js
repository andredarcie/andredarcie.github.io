export function createUI() {
  return {
    modeLabel: document.querySelector("#modeLabel"),
    generationLabel: document.querySelector("#generationLabel"),
    agentLabel: document.querySelector("#agentLabel"),
    frameLabel: document.querySelector("#frameLabel"),
    bestFitnessLabel: document.querySelector("#bestFitnessLabel"),
    bestCompletionLabel: document.querySelector("#bestCompletionLabel"),
    generationBestLabel: document.querySelector("#generationBestLabel"),
    currentFitnessLabel: document.querySelector("#currentFitnessLabel"),
    completionLabel: document.querySelector("#completionLabel"),
    toggleTrainingButton: document.querySelector("#toggleTrainingButton"),
    toggleTurboButton: document.querySelector("#toggleTurboButton"),
    watchBestButton: document.querySelector("#watchBestButton"),
    manualModeButton: document.querySelector("#manualModeButton"),
    restartRunButton: document.querySelector("#restartRunButton"),
    resumeTrainingButton: document.querySelector("#resumeTrainingButton"),
    resetTrainingButton: document.querySelector("#resetTrainingButton"),
    clearSavedButton: document.querySelector("#clearSavedButton"),
    speedRange: document.querySelector("#speedRange"),
    speedValue: document.querySelector("#speedValue"),
    historyLine: document.querySelector("#historyLine"),
    historyArea: document.querySelector("#historyArea"),
    historyMinLabel: document.querySelector("#historyMinLabel"),
    historyMaxLabel: document.querySelector("#historyMaxLabel"),
    sensorGapDistanceLabel: document.querySelector("#sensorGapDistanceLabel"),
    sensorGapWidthLabel: document.querySelector("#sensorGapWidthLabel"),
    sensorGoalDistanceLabel: document.querySelector("#sensorGoalDistanceLabel"),
    sensorGroundedLabel: document.querySelector("#sensorGroundedLabel"),
    sensorVelocityXLabel: document.querySelector("#sensorVelocityXLabel"),
    sensorVelocityYLabel: document.querySelector("#sensorVelocityYLabel"),
    outputLeftLabel: document.querySelector("#outputLeftLabel"),
    outputRightLabel: document.querySelector("#outputRightLabel"),
    outputJumpLabel: document.querySelector("#outputJumpLabel"),
    actionLabel: document.querySelector("#actionLabel"),
    networkCanvas: document.querySelector("#networkCanvas"),
    victoryModal: document.querySelector("#victoryModal"),
    victorySummary: document.querySelector("#victorySummary"),
    victoryGeneration: document.querySelector("#victoryGeneration"),
    victoryAgents: document.querySelector("#victoryAgents"),
    restartVictoryButton: document.querySelector("#restartVictoryButton"),
    closeVictoryButton: document.querySelector("#closeVictoryButton"),
    levelReadyModal: document.querySelector("#levelReadyModal"),
    startSimulationButton: document.querySelector("#startSimulationButton"),
  };
}

export function updateUI(ui, snapshot) {
  ui.modeLabel.textContent = snapshot.mode;
  ui.generationLabel.textContent = String(snapshot.generation);
  ui.agentLabel.textContent = snapshot.agent;
  ui.frameLabel.textContent = String(snapshot.frame);
  ui.bestFitnessLabel.textContent = snapshot.bestFitness.toFixed(1);
  ui.bestCompletionLabel.textContent = `${snapshot.bestCompletion.toFixed(1)}%`;
  ui.generationBestLabel.textContent = snapshot.generationBest.toFixed(1);
  ui.currentFitnessLabel.textContent = snapshot.currentFitness.toFixed(1);
  ui.completionLabel.textContent = `${snapshot.completion.toFixed(1)}%`;
  ui.speedValue.textContent = snapshot.turboEnabled
    ? `Turbo ${snapshot.speed} steps`
    : `${snapshot.speed} steps`;
  renderHistory(ui, snapshot.generationHistory);
  renderBrain(ui, snapshot.debug);
  renderNetwork(ui, snapshot.networkViz);
  renderVictory(ui, snapshot.victory);
  renderLevelReady(ui, snapshot.levelReadyVisible);
}

function renderHistory(ui, history) {
  if (!history.length) {
    ui.historyLine.setAttribute("d", "");
    ui.historyArea.setAttribute("d", "");
    ui.historyMinLabel.textContent = "0";
    ui.historyMaxLabel.textContent = "0";
    return;
  }

  const width = 320;
  const height = 140;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = Math.max(max - min, 1);

  const points = history.map((value, index) => {
    const x = history.length === 1 ? width / 2 : (index / (history.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(2)} ${height} L ${points[0][0].toFixed(2)} ${height} Z`;

  ui.historyLine.setAttribute("d", linePath);
  ui.historyArea.setAttribute("d", areaPath);
  ui.historyMinLabel.textContent = min.toFixed(1);
  ui.historyMaxLabel.textContent = max.toFixed(1);
}

function renderBrain(ui, debug) {
  if (!debug) {
    ui.sensorGapDistanceLabel.textContent = "-";
    ui.sensorGapWidthLabel.textContent = "-";
    ui.sensorGoalDistanceLabel.textContent = "-";
    ui.sensorGroundedLabel.textContent = "-";
    ui.sensorVelocityXLabel.textContent = "-";
    ui.sensorVelocityYLabel.textContent = "-";
    ui.outputLeftLabel.textContent = "-";
    ui.outputRightLabel.textContent = "-";
    ui.outputJumpLabel.textContent = "-";
    ui.actionLabel.textContent = "Manual";
    return;
  }

  ui.sensorGapDistanceLabel.textContent = String(debug.sensors.raw.solidTiles);
  ui.sensorGapWidthLabel.textContent = String(debug.sensors.raw.dangerTiles);
  ui.sensorGoalDistanceLabel.textContent = `${debug.sensors.raw.originTileX}, ${debug.sensors.raw.originTileY}`;
  ui.sensorGroundedLabel.textContent = debug.sensors.raw.grounded ? "Yes" : "No";
  ui.sensorVelocityXLabel.textContent = debug.sensors.raw.velocityX.toFixed(2);
  ui.sensorVelocityYLabel.textContent = debug.sensors.raw.velocityY.toFixed(2);
  ui.outputLeftLabel.textContent = debug.outputs[0].toFixed(3);
  ui.outputRightLabel.textContent = debug.outputs[1].toFixed(3);
  ui.outputJumpLabel.textContent = debug.outputs[2].toFixed(3);

  const actions = [];
  if (debug.action.left) {
    actions.push("Left");
  }
  if (debug.action.right) {
    actions.push("Right");
  }
  if (debug.action.jump) {
    actions.push("Jump");
  }
  ui.actionLabel.textContent = actions.length ? actions.join(" + ") : "Idle";
}

function renderNetwork(ui, networkViz) {
  const canvas = ui.networkCanvas;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawNetworkBackground(context, canvas);

  if (!networkViz) {
    context.fillStyle = "rgba(255, 247, 235, 0.76)";
    context.font = "16px Georgia";
    context.textAlign = "center";
    context.fillText("Network view unavailable in manual mode", canvas.width / 2, canvas.height / 2);
    context.textAlign = "left";
    return;
  }

  const columns = {
    input: createColumn(44, networkViz.nodes.input.length, canvas.height),
    hidden: createColumn(canvas.width / 2, networkViz.nodes.hidden.length, canvas.height),
    output: createColumn(canvas.width - 44, networkViz.nodes.output.length, canvas.height),
  };
  const nodePositions = new Map();

  for (const [columnKey, nodes] of Object.entries(networkViz.nodes)) {
    nodes.forEach((node, index) => {
      nodePositions.set(node.id, { ...columns[columnKey][index], column: columnKey });
    });
  }

  drawConnections(context, networkViz.connections, nodePositions);
  drawNodeColumn(context, networkViz.nodes.input, nodePositions, true);
  drawNodeColumn(context, networkViz.nodes.hidden, nodePositions, false);
  drawNodeColumn(context, networkViz.nodes.output, nodePositions, true);
}

function drawNetworkBackground(context, canvas) {
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(50, 32, 20, 0.18)");
  gradient.addColorStop(1, "rgba(14, 18, 18, 0.18)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function createColumn(x, count, height) {
  const nodes = [];
  const safeCount = Math.max(count, 1);
  const spacing = height / (safeCount + 1);
  for (let index = 0; index < count; index += 1) {
    nodes.push({
      x,
      y: spacing * (index + 1),
    });
  }
  return nodes;
}

function drawConnections(context, connections, nodePositions) {
  for (const connection of connections) {
    const fromNode = nodePositions.get(connection.from);
    const toNode = nodePositions.get(connection.to);
    if (!fromNode || !toNode) {
      continue;
    }

    context.strokeStyle = connection.weight >= 0
      ? `rgba(213, 160, 33, ${0.14 + Math.abs(connection.weight) * 0.24})`
      : `rgba(198, 84, 47, ${0.14 + Math.abs(connection.weight) * 0.24})`;
    context.lineWidth = 1 + Math.min(Math.abs(connection.weight) * 1.8, 2.6);
    context.beginPath();
    context.moveTo(fromNode.x, fromNode.y);
    context.lineTo(toNode.x, toNode.y);
    context.stroke();
  }
}

function drawNodeColumn(context, nodes, nodePositions, showLabels) {
  const shouldShowLabels = showLabels && nodes.length <= 24;
  nodes.forEach((node) => {
    const position = nodePositions.get(node.id);
    const value = node.value ?? 0;
    const intensity = Math.min(Math.abs(value), 1);
    context.fillStyle = value >= 0
      ? `rgba(213, 160, 33, ${0.18 + intensity * 0.7})`
      : `rgba(95, 150, 210, ${0.18 + intensity * 0.7})`;
    context.beginPath();
    context.arc(position.x, position.y, 13, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(255, 247, 235, 0.85)";
    context.lineWidth = 1.5;
    context.stroke();

    context.fillStyle = "#fff7eb";
    context.font = "11px Georgia";
    context.textAlign = position.x < 60 ? "left" : position.x > 260 ? "right" : "center";

    if (shouldShowLabels) {
      const labelX = position.x < 60 ? position.x + 18 : position.x > 260 ? position.x - 18 : position.x;
      context.fillText(node.label, labelX, position.y + 4);
    } else {
      context.fillText(value.toFixed(2), position.x, position.y + 28);
    }
  });
  context.textAlign = "left";
}

function renderVictory(ui, victory) {
  if (!victory?.visible) {
    ui.victoryModal.classList.add("hidden");
    ui.victoryModal.setAttribute("aria-hidden", "true");
    return;
  }

  ui.victorySummary.textContent = victory.summary;
  ui.victoryGeneration.textContent = String(victory.generation);
  ui.victoryAgents.textContent = String(victory.agentsTested);
  ui.victoryModal.classList.remove("hidden");
  ui.victoryModal.setAttribute("aria-hidden", "false");
}

function renderLevelReady(ui, visible) {
  if (!visible) {
    ui.levelReadyModal.classList.add("hidden");
    ui.levelReadyModal.setAttribute("aria-hidden", "true");
    return;
  }

  ui.levelReadyModal.classList.remove("hidden");
  ui.levelReadyModal.setAttribute("aria-hidden", "false");
}
