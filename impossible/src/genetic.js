import { breedGenome, cloneGenome, createPopulation } from "./genome.js";

export const DEFAULT_TRAINING_CONFIG = {
  populationSize: 60,
  eliteCount: 6,
  mutationRate: 0.12,
  mutationStrength: 0.45,
  tournamentSize: 4,
};

export function createTrainingState(config = DEFAULT_TRAINING_CONFIG) {
  const population = createPopulation(config.populationSize);
  return {
    config,
    population,
    generation: 1,
    currentIndex: 0,
    bestGenome: cloneGenome(population[0]),
    bestFitness: 0,
    bestCompletion: 0,
    generationHistory: [],
  };
}

export function advanceGeneration(state) {
  state.population.sort((a, b) => b.fitness - a.fitness);
  state.generationHistory.push(state.population[0].fitness);

  if (state.population[0].fitness > state.bestFitness) {
    state.bestFitness = state.population[0].fitness;
    state.bestGenome = cloneGenome(state.population[0]);
  }

  const nextPopulation = [];
  for (let index = 0; index < state.config.eliteCount; index += 1) {
    nextPopulation.push(cloneGenome(state.population[index]));
  }

  while (nextPopulation.length < state.config.populationSize) {
    const parentA = selectTournament(state.population, state.config.tournamentSize);
    const parentB = selectTournament(state.population, state.config.tournamentSize);
    nextPopulation.push(breedGenome(parentA, parentB, state.config));
  }

  nextPopulation.forEach((genome) => {
    genome.fitness = 0;
  });

  state.population = nextPopulation;
  state.generation += 1;
  state.currentIndex = 0;
}

export function applyHistoricalBest(state, snapshot) {
  if (!snapshot) {
    return;
  }

  if (!snapshot.bestGenome?.network) {
    return;
  }

  if (snapshot.bestGenome.network.inputCount !== state.bestGenome.network.inputCount) {
    return;
  }

  state.bestGenome = cloneGenome(snapshot.bestGenome);
  state.bestFitness = snapshot.bestFitness;
  state.bestCompletion = snapshot.bestCompletion ?? 0;
  state.generationHistory = Array.isArray(snapshot.generationHistory)
    ? [...snapshot.generationHistory]
    : [];
}

function selectTournament(population, tournamentSize) {
  let best = population[Math.floor(Math.random() * population.length)];

  for (let round = 1; round < tournamentSize; round += 1) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }

  return best;
}
