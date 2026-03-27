import { INPUT_LABELS, OUTPUT_LABELS } from "./evaluator.js";
import { cloneNetwork } from "./nn.js";

export const INPUT_COUNT = INPUT_LABELS.length;
export const OUTPUT_COUNT = OUTPUT_LABELS.length;

export const DEFAULT_MUTATION_RATES = {
  connections: 0.25,
  link: 1.9,
  bias: 0.45,
  node: 0.28,
  enable: 0.2,
  disable: 0.15,
  step: 0.35,
};

export function createInnovationTracker() {
  return {
    nextInnovation: 0,
    nextNodeId: INPUT_COUNT + OUTPUT_COUNT + 1,
    linkInnovations: {},
    splitInnovations: {},
  };
}

export function createGenome(registry) {
  return {
    network: createMinimalNetwork(registry),
    fitness: 0,
    adjustedFitness: 0,
  };
}

export function cloneGenome(genome) {
  return {
    network: cloneNetwork(genome.network),
    fitness: genome.fitness,
    adjustedFitness: genome.adjustedFitness ?? 0,
  };
}

export function createPopulation(size, config, registry) {
  return Array.from({ length: size }, () => {
    const genome = createGenome(registry);
    for (let round = 0; round < 2; round += 1) {
      mutateGenome(genome, config, registry);
    }
    genome.fitness = 0;
    genome.adjustedFitness = 0;
    return genome;
  });
}

export function crossoverGenomes(parentA, parentB) {
  let fitter = parentA;
  let weaker = parentB;

  if (parentB.fitness > parentA.fitness) {
    fitter = parentB;
    weaker = parentA;
  }

  const weakerInnovations = new Map();
  for (const gene of weaker.network.genes) {
    weakerInnovations.set(gene.innovation, gene);
  }

  const child = {
    network: {
      inputCount: fitter.network.inputCount,
      outputCount: fitter.network.outputCount,
      biasNodeId: fitter.network.biasNodeId,
      outputNodeIds: [...fitter.network.outputNodeIds],
      nodeOrder: { ...fitter.network.nodeOrder, ...weaker.network.nodeOrder },
      genes: [],
      mutationRates: { ...fitter.network.mutationRates },
    },
    fitness: 0,
    adjustedFitness: 0,
  };

  for (const gene of fitter.network.genes) {
    const matching = weakerInnovations.get(gene.innovation);
    if (matching && Math.random() < 0.5 && matching.enabled) {
      child.network.genes.push({ ...matching });
    } else {
      child.network.genes.push({ ...gene });
    }
  }

  child.network.genes.sort((a, b) => a.innovation - b.innovation);
  return child;
}

export function mutateGenome(genome, config, registry) {
  adjustMutationRates(genome.network.mutationRates);

  if (Math.random() < genome.network.mutationRates.connections) {
    pointMutate(genome.network);
  }

  mutateRepeatedly(genome.network.mutationRates.link, () => linkMutate(genome.network, registry, false));
  mutateRepeatedly(genome.network.mutationRates.bias, () => linkMutate(genome.network, registry, true));
  mutateRepeatedly(genome.network.mutationRates.node, () => nodeMutate(genome.network, registry));
  mutateRepeatedly(genome.network.mutationRates.enable, () => toggleGene(genome.network, true));
  mutateRepeatedly(genome.network.mutationRates.disable, () => toggleGene(genome.network, false));
}

export function geneticDistance(genomeA, genomeB, config) {
  const genesA = genomeA.network.genes;
  const genesB = genomeB.network.genes;
  const innovationsA = new Map(genesA.map((gene) => [gene.innovation, gene]));
  const innovationsB = new Map(genesB.map((gene) => [gene.innovation, gene]));

  let disjoint = 0;
  for (const gene of genesA) {
    if (!innovationsB.has(gene.innovation)) {
      disjoint += 1;
    }
  }
  for (const gene of genesB) {
    if (!innovationsA.has(gene.innovation)) {
      disjoint += 1;
    }
  }

  let weightDifference = 0;
  let coincident = 0;
  for (const gene of genesA) {
    const match = innovationsB.get(gene.innovation);
    if (!match) {
      continue;
    }
    weightDifference += Math.abs(gene.weight - match.weight);
    coincident += 1;
  }

  const normalizer = Math.max(genesA.length, genesB.length, 1);
  const averageWeightDifference = coincident === 0 ? 0 : weightDifference / coincident;
  return config.deltaDisjoint * (disjoint / normalizer) + config.deltaWeights * averageWeightDifference;
}

function createMinimalNetwork(registry) {
  const biasNodeId = INPUT_COUNT;
  const outputNodeIds = Array.from({ length: OUTPUT_COUNT }, (_, index) => INPUT_COUNT + 1 + index);
  const nodeOrder = {};

  for (let index = 0; index < INPUT_COUNT; index += 1) {
    nodeOrder[index] = 0;
  }
  nodeOrder[biasNodeId] = 0;
  for (const outputNodeId of outputNodeIds) {
    nodeOrder[outputNodeId] = 1;
  }

  const network = {
    inputCount: INPUT_COUNT,
    outputCount: OUTPUT_COUNT,
    biasNodeId,
    outputNodeIds,
    nodeOrder,
    genes: [],
    mutationRates: { ...DEFAULT_MUTATION_RATES },
  };

  for (const outputNodeId of outputNodeIds) {
    const randomInput = Math.floor(Math.random() * INPUT_COUNT);
    network.genes.push(createGene(randomInput, outputNodeId, randomWeight(), registry));
    network.genes.push(createGene(biasNodeId, outputNodeId, randomWeight(), registry));
  }

  network.genes.sort((a, b) => a.innovation - b.innovation);
  return network;
}

function createGene(into, out, weight, registry) {
  return {
    into,
    out,
    weight,
    enabled: true,
    innovation: registerLinkInnovation(registry, into, out),
  };
}

function pointMutate(network) {
  const step = network.mutationRates.step;
  for (const gene of network.genes) {
    if (Math.random() < 0.9) {
      gene.weight += (Math.random() * 2 - 1) * step;
    } else {
      gene.weight = randomWeight();
    }
  }
}

function linkMutate(network, registry, forceBias) {
  const fromCandidates = getSourceNodeIds(network, forceBias);
  const toCandidates = getTargetNodeIds(network);
  if (!fromCandidates.length || !toCandidates.length) {
    return;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const into = forceBias ? network.biasNodeId : pickRandom(fromCandidates);
    const out = pickRandom(toCandidates);
    if (into === out) {
      continue;
    }
    if ((network.nodeOrder[into] ?? 0) >= (network.nodeOrder[out] ?? 0)) {
      continue;
    }
    if (containsLink(network.genes, into, out)) {
      continue;
    }

    network.genes.push(createGene(into, out, randomWeight(), registry));
    network.genes.sort((a, b) => a.innovation - b.innovation);
    return;
  }
}

function nodeMutate(network, registry) {
  const enabledGenes = network.genes.filter((gene) => gene.enabled);
  if (!enabledGenes.length) {
    return;
  }

  const gene = pickRandom(enabledGenes);
  gene.enabled = false;

  const split = registerNodeSplit(registry, gene);
  if (network.nodeOrder[split.nodeId] == null) {
    network.nodeOrder[split.nodeId] = (network.nodeOrder[gene.into] + network.nodeOrder[gene.out]) / 2;
  }

  network.genes.push({
    into: gene.into,
    out: split.nodeId,
    weight: 1,
    enabled: true,
    innovation: split.firstInnovation,
  });
  network.genes.push({
    into: split.nodeId,
    out: gene.out,
    weight: gene.weight,
    enabled: true,
    innovation: split.secondInnovation,
  });
  network.genes.sort((a, b) => a.innovation - b.innovation);
}

function toggleGene(network, shouldEnable) {
  const candidates = network.genes.filter((gene) => gene.enabled !== shouldEnable);
  if (!candidates.length) {
    return;
  }
  pickRandom(candidates).enabled = shouldEnable;
}

function adjustMutationRates(mutationRates) {
  for (const key of Object.keys(mutationRates)) {
    if (Math.random() < 0.5) {
      mutationRates[key] *= 0.95;
    } else {
      mutationRates[key] *= 1.05263;
    }
  }
}

function mutateRepeatedly(rate, mutate) {
  let chance = rate;
  while (chance > 0) {
    if (Math.random() < chance) {
      mutate();
    }
    chance -= 1;
  }
}

function getSourceNodeIds(network, forceBias) {
  if (forceBias) {
    return [network.biasNodeId];
  }

  const sourceIds = [];
  for (let index = 0; index < network.inputCount; index += 1) {
    sourceIds.push(index);
  }
  sourceIds.push(network.biasNodeId);

  const outputSet = new Set(network.outputNodeIds);
  for (const nodeId of Object.keys(network.nodeOrder).map(Number)) {
    if (!outputSet.has(nodeId) && nodeId > network.inputCount) {
      sourceIds.push(nodeId);
    }
  }
  return sourceIds;
}

function getTargetNodeIds(network) {
  const targetIds = [...network.outputNodeIds];
  const outputSet = new Set(network.outputNodeIds);
  for (const nodeId of Object.keys(network.nodeOrder).map(Number)) {
    if (!outputSet.has(nodeId) && nodeId > network.inputCount) {
      targetIds.push(nodeId);
    }
  }
  return targetIds;
}

function containsLink(genes, into, out) {
  return genes.some((gene) => gene.into === into && gene.out === out);
}

function registerLinkInnovation(registry, into, out) {
  const key = `${into}:${out}`;
  if (registry.linkInnovations[key] != null) {
    return registry.linkInnovations[key];
  }

  const innovation = registry.nextInnovation;
  registry.nextInnovation += 1;
  registry.linkInnovations[key] = innovation;
  return innovation;
}

function registerNodeSplit(registry, gene) {
  const key = String(gene.innovation);
  if (registry.splitInnovations[key]) {
    return registry.splitInnovations[key];
  }

  const nodeId = registry.nextNodeId;
  registry.nextNodeId += 1;

  const split = {
    nodeId,
    firstInnovation: registerLinkInnovation(registry, gene.into, nodeId),
    secondInnovation: registerLinkInnovation(registry, nodeId, gene.out),
  };
  registry.splitInnovations[key] = split;
  return split;
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function randomWeight() {
  return Math.random() * 4 - 2;
}
