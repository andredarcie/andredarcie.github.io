import {
  cloneNetwork,
  createNetwork,
  crossoverNetworks,
  mutateNetwork,
} from "./nn.js";

const INPUT_COUNT = 8;
const HIDDEN_COUNT = 8;
const OUTPUT_COUNT = 3;

export function createGenome() {
  return {
    network: createNetwork(INPUT_COUNT, HIDDEN_COUNT, OUTPUT_COUNT),
    fitness: 0,
  };
}

export function cloneGenome(genome) {
  return {
    network: cloneNetwork(genome.network),
    fitness: genome.fitness,
  };
}

export function breedGenome(parentA, parentB, config) {
  const child = {
    network: crossoverNetworks(parentA.network, parentB.network),
    fitness: 0,
  };
  mutateNetwork(child.network, config.mutationRate, config.mutationStrength);
  return child;
}

export function createPopulation(size) {
  return Array.from({ length: size }, () => createGenome());
}
