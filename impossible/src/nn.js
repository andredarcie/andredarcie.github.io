function randomWeight() {
  return Math.random() * 2 - 1;
}

export function createNetwork(inputCount, hiddenCount, outputCount) {
  return {
    inputCount,
    hiddenCount,
    outputCount,
    inputHidden: createMatrix(hiddenCount, inputCount, randomWeight),
    hiddenBias: createArray(hiddenCount, randomWeight),
    hiddenOutput: createMatrix(outputCount, hiddenCount, randomWeight),
    outputBias: createArray(outputCount, randomWeight),
  };
}

export function cloneNetwork(network) {
  return {
    inputCount: network.inputCount,
    hiddenCount: network.hiddenCount,
    outputCount: network.outputCount,
    inputHidden: network.inputHidden.map((row) => [...row]),
    hiddenBias: [...network.hiddenBias],
    hiddenOutput: network.hiddenOutput.map((row) => [...row]),
    outputBias: [...network.outputBias],
  };
}

export function evaluateNetwork(network, inputs) {
  return evaluateNetworkDetailed(network, inputs).outputs;
}

export function evaluateNetworkDetailed(network, inputs) {
  const hidden = network.inputHidden.map((row, index) =>
    tanh(dot(row, inputs) + network.hiddenBias[index]),
  );

  const outputs = network.hiddenOutput.map((row, index) =>
    tanh(dot(row, hidden) + network.outputBias[index]),
  );

  return {
    hidden,
    outputs,
  };
}

export function crossoverNetworks(primary, secondary) {
  return {
    inputCount: primary.inputCount,
    hiddenCount: primary.hiddenCount,
    outputCount: primary.outputCount,
    inputHidden: mixMatrices(primary.inputHidden, secondary.inputHidden),
    hiddenBias: mixArrays(primary.hiddenBias, secondary.hiddenBias),
    hiddenOutput: mixMatrices(primary.hiddenOutput, secondary.hiddenOutput),
    outputBias: mixArrays(primary.outputBias, secondary.outputBias),
  };
}

export function mutateNetwork(network, mutationRate, mutationStrength) {
  mutateMatrix(network.inputHidden, mutationRate, mutationStrength);
  mutateMatrix(network.hiddenOutput, mutationRate, mutationStrength);
  mutateArray(network.hiddenBias, mutationRate, mutationStrength);
  mutateArray(network.outputBias, mutationRate, mutationStrength);
}

function createMatrix(rows, cols, factory) {
  return Array.from({ length: rows }, () => createArray(cols, factory));
}

function createArray(length, factory) {
  return Array.from({ length }, () => factory());
}

function dot(weights, values) {
  let total = 0;
  for (let index = 0; index < weights.length; index += 1) {
    total += weights[index] * values[index];
  }
  return total;
}

function tanh(value) {
  return Math.tanh(value);
}

function mixMatrices(a, b) {
  return a.map((row, rowIndex) => mixArrays(row, b[rowIndex]));
}

function mixArrays(a, b) {
  return a.map((value, index) => (Math.random() < 0.5 ? value : b[index]));
}

function mutateMatrix(matrix, mutationRate, mutationStrength) {
  matrix.forEach((row) => mutateArray(row, mutationRate, mutationStrength));
}

function mutateArray(values, mutationRate, mutationStrength) {
  for (let index = 0; index < values.length; index += 1) {
    if (Math.random() < mutationRate) {
      values[index] += (Math.random() * 2 - 1) * mutationStrength;
    }
  }
}
