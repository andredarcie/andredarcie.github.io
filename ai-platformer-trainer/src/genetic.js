import {
  cloneGenome,
  createInnovationTracker,
  createPopulation,
  crossoverGenomes,
  geneticDistance,
  mutateGenome,
} from "./genome.js";

export const DEFAULT_TRAINING_CONFIG = {
  populationSize: 60,
  crossoverChance: 0.75,
  staleSpecies: 15,
  deltaDisjoint: 2,
  deltaWeights: 0.4,
  deltaThreshold: 1.25,
};

export function createTrainingState(config = DEFAULT_TRAINING_CONFIG) {
  const innovation = createInnovationTracker();
  const population = createPopulation(config.populationSize, config, innovation);
  const state = {
    config,
    innovation,
    population,
    species: [],
    generation: 1,
    currentIndex: 0,
    bestGenome: cloneGenome(population[0]),
    bestFitness: 0,
    bestCompletion: 0,
    generationHistory: [],
  };

  speciatePopulation(state, population);
  return state;
}

export function advanceGeneration(state) {
  speciatePopulation(state, state.population);
  state.population.sort((a, b) => b.fitness - a.fitness);
  state.generationHistory.push(state.population[0]?.fitness ?? 0);

  updateSpeciesStaleness(state);
  state.species = state.species.filter((species) =>
    species.staleness < state.config.staleSpecies || species.topFitness >= state.bestFitness,
  );

  calculateAdjustedFitness(state);
  const survivors = removeWeakSpecies(state);
  const offspringPlan = allocateOffspring(state, survivors);
  const nextPopulation = [];

  for (const species of survivors) {
    sortSpecies(species, false);
    nextPopulation.push(cloneGenome(species.genomes[0]));
  }

  for (const species of survivors) {
    const targetCount = Math.max(0, (offspringPlan.get(species.id) ?? 0) - 1);
    for (let count = 0; count < targetCount; count += 1) {
      nextPopulation.push(breedChild(species, state.config, state.innovation));
    }
  }

  while (nextPopulation.length < state.config.populationSize && survivors.length) {
    nextPopulation.push(breedChild(pickRandom(survivors), state.config, state.innovation));
  }

  state.population = nextPopulation.length
    ? nextPopulation.slice(0, state.config.populationSize)
    : createPopulation(state.config.populationSize, state.config, state.innovation);

  for (const genome of state.population) {
    genome.fitness = 0;
    genome.adjustedFitness = 0;
  }

  state.generation += 1;
  state.currentIndex = 0;
  speciatePopulation(state, state.population);
}

export function applyHistoricalBest(state, snapshot) {
  if (!snapshot?.bestGenome?.network) {
    return;
  }

  if (
    snapshot.bestGenome.network.inputCount !== state.bestGenome.network.inputCount ||
    !Array.isArray(snapshot.bestGenome.network.genes) ||
    !Array.isArray(snapshot.bestGenome.network.outputNodeIds)
  ) {
    return;
  }

  state.bestGenome = cloneGenome(snapshot.bestGenome);
  state.bestFitness = snapshot.bestFitness;
  state.bestCompletion = snapshot.bestCompletion ?? 0;
  state.generationHistory = Array.isArray(snapshot.generationHistory)
    ? [...snapshot.generationHistory]
    : [];
}

function speciatePopulation(state, population) {
  const previousSpecies = state.species.map((species) => ({
    id: species.id,
    representative: cloneGenome(species.representative),
    topFitness: species.topFitness,
    staleness: species.staleness,
    genomes: [],
    averageFitness: 0,
  }));

  const nextSpecies = [];
  let nextSpeciesId = previousSpecies.reduce((maxId, species) => Math.max(maxId, species.id), 0) + 1;

  for (const genome of population) {
    let match = null;

    for (const species of previousSpecies) {
      if (geneticDistance(genome, species.representative, state.config) < state.config.deltaThreshold) {
        match = species;
        break;
      }
    }

    if (!match) {
      for (const species of nextSpecies) {
        if (geneticDistance(genome, species.representative, state.config) < state.config.deltaThreshold) {
          match = species;
          break;
        }
      }
    }

    if (!match) {
      match = {
        id: nextSpeciesId,
        representative: cloneGenome(genome),
        topFitness: 0,
        staleness: 0,
        genomes: [],
        averageFitness: 0,
      };
      nextSpeciesId += 1;
      nextSpecies.push(match);
    } else if (!nextSpecies.includes(match)) {
      nextSpecies.push(match);
    }

    match.genomes.push(genome);
  }

  state.species = nextSpecies.filter((species) => species.genomes.length > 0);
  for (const species of state.species) {
    sortSpecies(species, false);
    species.representative = cloneGenome(species.genomes[0]);
  }
}

function updateSpeciesStaleness(state) {
  for (const species of state.species) {
    sortSpecies(species, false);
    const currentTop = species.genomes[0]?.fitness ?? 0;
    if (currentTop > species.topFitness) {
      species.topFitness = currentTop;
      species.staleness = 0;
    } else {
      species.staleness += 1;
    }
  }
}

function calculateAdjustedFitness(state) {
  for (const species of state.species) {
    for (const genome of species.genomes) {
      genome.adjustedFitness = genome.fitness / Math.max(species.genomes.length, 1);
    }
    const total = species.genomes.reduce((sum, genome) => sum + genome.adjustedFitness, 0);
    species.averageFitness = total / Math.max(species.genomes.length, 1);
  }
}

function removeWeakSpecies(state) {
  const totalAverage = state.species.reduce((sum, species) => sum + species.averageFitness, 0);
  if (totalAverage <= 0) {
    return [...state.species];
  }

  return state.species.filter((species) =>
    Math.floor((species.averageFitness / totalAverage) * state.config.populationSize) >= 1,
  );
}

function allocateOffspring(state, speciesList) {
  const plan = new Map();
  const totalAverage = speciesList.reduce((sum, species) => sum + species.averageFitness, 0);

  if (totalAverage <= 0) {
    const perSpecies = Math.max(1, Math.floor(state.config.populationSize / Math.max(speciesList.length, 1)));
    for (const species of speciesList) {
      plan.set(species.id, perSpecies);
    }
    return plan;
  }

  let assigned = 0;
  for (const species of speciesList) {
    const count = Math.floor((species.averageFitness / totalAverage) * state.config.populationSize);
    plan.set(species.id, count);
    assigned += count;
  }

  while (assigned < state.config.populationSize && speciesList.length) {
    const species = pickRandom(speciesList);
    plan.set(species.id, (plan.get(species.id) ?? 0) + 1);
    assigned += 1;
  }

  return plan;
}

function breedChild(species, config, innovation) {
  let child;
  if (species.genomes.length > 1 && Math.random() < config.crossoverChance) {
    child = crossoverGenomes(pickRandom(species.genomes), pickRandom(species.genomes));
  } else {
    child = cloneGenome(pickRandom(species.genomes));
  }

  mutateGenome(child, config, innovation);
  child.fitness = 0;
  child.adjustedFitness = 0;
  return child;
}

function sortSpecies(species, cull = true) {
  species.genomes.sort((a, b) => b.fitness - a.fitness);
  if (!cull) {
    return;
  }
  const keepCount = Math.max(1, Math.ceil(species.genomes.length / 2));
  species.genomes = species.genomes.slice(0, keepCount);
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}
