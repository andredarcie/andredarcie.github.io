export function cloneNetwork(network) {
  return {
    inputCount: network.inputCount,
    outputCount: network.outputCount,
    biasNodeId: network.biasNodeId,
    outputNodeIds: [...network.outputNodeIds],
    nodeOrder: { ...network.nodeOrder },
    genes: network.genes.map((gene) => ({ ...gene })),
    mutationRates: { ...network.mutationRates },
  };
}

export function evaluateNetwork(network, inputs) {
  return evaluateNetworkDetailed(network, inputs).outputs;
}

export function evaluateNetworkDetailed(network, inputs) {
  if (inputs.length !== network.inputCount) {
    console.error("Incorrect number of neural network inputs.");
    return {
      hidden: [],
      outputs: Array.from({ length: network.outputCount }, () => 0),
      hiddenNodeIds: [],
      nodeValues: {},
    };
  }

  const values = {};
  for (let index = 0; index < network.inputCount; index += 1) {
    values[index] = inputs[index];
  }
  values[network.biasNodeId] = 1;

  const incomingByNode = new Map();
  for (const gene of network.genes) {
    if (!gene.enabled) {
      continue;
    }
    if (!incomingByNode.has(gene.out)) {
      incomingByNode.set(gene.out, []);
    }
    incomingByNode.get(gene.out).push(gene);
  }

  const hiddenNodeIds = getHiddenNodeIds(network);
  const orderedNodeIds = [...hiddenNodeIds, ...network.outputNodeIds].sort(
    (a, b) => network.nodeOrder[a] - network.nodeOrder[b] || a - b,
  );

  for (const nodeId of orderedNodeIds) {
    const incoming = incomingByNode.get(nodeId) ?? [];
    let sum = 0;
    for (const gene of incoming) {
      sum += gene.weight * (values[gene.into] ?? 0);
    }
    values[nodeId] = sigmoid(sum);
  }

  return {
    hidden: hiddenNodeIds.map((nodeId) => values[nodeId] ?? 0),
    outputs: network.outputNodeIds.map((nodeId) => values[nodeId] ?? 0),
    hiddenNodeIds,
    nodeValues: values,
  };
}

export function createNetworkVisualization(network, evaluation, inputLabels, outputLabels) {
  const inputNodes = [];
  for (let index = 0; index < network.inputCount; index += 1) {
    inputNodes.push({
      id: index,
      label: inputLabels[index] ?? `I${index + 1}`,
      value: evaluation.sensors.normalizedInputs[index] ?? 0,
      column: "input",
    });
  }

  inputNodes.push({
    id: network.biasNodeId,
    label: "Bias",
    value: 1,
    column: "input",
  });

  const hiddenNodeIds = evaluation.hiddenNodeIds ?? getHiddenNodeIds(network);
  const hiddenNodes = hiddenNodeIds.map((nodeId) => ({
    id: nodeId,
    label: `H${nodeId}`,
    value: evaluation.nodeValues[nodeId] ?? 0,
    column: "hidden",
  }));

  const outputNodes = network.outputNodeIds.map((nodeId, index) => ({
    id: nodeId,
    label: outputLabels[index] ?? `O${index + 1}`,
    value: evaluation.outputs[index] ?? 0,
    column: "output",
  }));

  return {
    nodes: {
      input: inputNodes,
      hidden: hiddenNodes,
      output: outputNodes,
    },
    connections: network.genes
      .filter((gene) => gene.enabled)
      .map((gene) => ({
        from: gene.into,
        to: gene.out,
        weight: gene.weight,
      })),
  };
}

export function getHiddenNodeIds(network) {
  const hiddenIds = new Set();
  const outputIds = new Set(network.outputNodeIds);

  for (const gene of network.genes) {
    if (gene.into >= network.inputCount + 1 && !outputIds.has(gene.into)) {
      hiddenIds.add(gene.into);
    }
    if (gene.out >= network.inputCount + 1 && !outputIds.has(gene.out)) {
      hiddenIds.add(gene.out);
    }
  }

  return [...hiddenIds].sort((a, b) => network.nodeOrder[a] - network.nodeOrder[b] || a - b);
}

function sigmoid(value) {
  return 2 / (1 + Math.exp(-4.9 * value)) - 1;
}
