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
    closeVictoryButton: document.querySelector("#closeVictoryButton"),
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

  ui.sensorGapDistanceLabel.textContent = debug.sensors.raw.gapDistance.toFixed(1);
  ui.sensorGapWidthLabel.textContent = debug.sensors.raw.gapWidth.toFixed(1);
  ui.sensorGoalDistanceLabel.textContent = `${debug.sensors.raw.goalDistance.toFixed(1)} | F:${debug.sensors.raw.finalGapDistance.toFixed(1)}`;
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

  const inputNodes = createColumn(38, networkViz.inputLabels.length, canvas.height);
  const hiddenNodes = createColumn(canvas.width / 2, networkViz.hidden.length, canvas.height);
  const outputNodes = createColumn(canvas.width - 42, networkViz.outputLabels.length, canvas.height);

  drawConnections(
    context,
    inputNodes,
    hiddenNodes,
    networkViz.network.inputHidden,
  );
  drawConnections(
    context,
    hiddenNodes,
    outputNodes,
    networkViz.network.hiddenOutput,
  );

  drawNodeColumn(context, inputNodes, networkViz.inputs, networkViz.inputLabels);
  drawNodeColumn(context, hiddenNodes, networkViz.hidden, null);
  drawNodeColumn(context, outputNodes, networkViz.outputs, networkViz.outputLabels);
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
  const spacing = height / (count + 1);
  for (let index = 0; index < count; index += 1) {
    nodes.push({
      x,
      y: spacing * (index + 1),
    });
  }
  return nodes;
}

function drawConnections(context, fromNodes, toNodes, weights) {
  for (let row = 0; row < weights.length; row += 1) {
    for (let column = 0; column < weights[row].length; column += 1) {
      const weight = weights[row][column];
      context.strokeStyle = weight >= 0
        ? `rgba(213, 160, 33, ${0.14 + Math.abs(weight) * 0.24})`
        : `rgba(198, 84, 47, ${0.14 + Math.abs(weight) * 0.24})`;
      context.lineWidth = 1 + Math.min(Math.abs(weight) * 1.8, 2.6);
      context.beginPath();
      context.moveTo(fromNodes[column].x, fromNodes[column].y);
      context.lineTo(toNodes[row].x, toNodes[row].y);
      context.stroke();
    }
  }
}

function drawNodeColumn(context, nodes, values, labels) {
  nodes.forEach((node, index) => {
    const value = values[index] ?? 0;
    const intensity = Math.min(Math.abs(value), 1);
    context.fillStyle = value >= 0
      ? `rgba(213, 160, 33, ${0.18 + intensity * 0.7})`
      : `rgba(95, 150, 210, ${0.18 + intensity * 0.7})`;
    context.beginPath();
    context.arc(node.x, node.y, 13, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(255, 247, 235, 0.85)";
    context.lineWidth = 1.5;
    context.stroke();

    context.fillStyle = "#fff7eb";
    context.font = "11px Georgia";
    context.textAlign = node.x < 60 ? "left" : node.x > 260 ? "right" : "center";

    if (labels) {
      const labelX = node.x < 60 ? node.x + 18 : node.x > 260 ? node.x - 18 : node.x;
      context.fillText(labels[index], labelX, node.y + 4);
    } else {
      context.fillText(value.toFixed(2), node.x, node.y + 28);
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
