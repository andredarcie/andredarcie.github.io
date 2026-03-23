(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TinyCreaturesSprites = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getCreatureSprite() {
    return [
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 3, 3, 1, 1, 0],
      [1, 1, 1, 4, 4, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 2, 1, 1, 2, 1, 1],
      [0, 1, 1, 2, 2, 1, 1, 0],
      [0, 1, 0, 1, 1, 0, 1, 0],
      [1, 0, 0, 1, 1, 0, 0, 1],
    ];
  }

  function getSpriteScale(cellSize) {
    return Math.max(1, Math.floor(cellSize / 10));
  }

  function getSpriteRenderSize(cellSize) {
    return getSpritePixelSize() * getSpriteScale(cellSize);
  }

  function getSpritePixelSize() {
    return 8;
  }

  function getSpriteInset(cellSize) {
    return Math.floor((cellSize - getSpriteRenderSize(cellSize)) / 2);
  }

  function getResponsiveRenderMetrics(options) {
    var cellSize = options.cellSize;
    var population = options.population;
    var spriteScale = getSpriteScale(cellSize);
    var spriteInset = getSpriteInset(cellSize);
    var cols = 5;
    var rows = Math.ceil(population / cols);
    var xStep = Math.max(1, Math.floor(cellSize / 22));
    var yStep = xStep;
    var xStart = -((cols - 1) * xStep) / 2;
    var yStart = -((rows - 1) * yStep) / 2;
    var subPositions = [];

    for (var i = 0; i < population; i++) {
      var x = spriteInset + xStart + (i % cols) * xStep;
      var y = spriteInset + yStart + Math.floor(i / cols) * yStep;
      subPositions.push({
        x: Math.max(0, Math.min(cellSize - spriteScale, x)),
        y: Math.max(0, Math.min(cellSize - spriteScale, y)),
      });
    }

    return {
      spriteScale: spriteScale,
      spriteInset: spriteInset,
      subPositions: subPositions,
    };
  }

  const CREATURE_NAMES = [
    'Riane',
    'Diego',
    'Rodrigo',
    'Capivara',
    'Augusto',
    'Cris',
    'Cainã',
    'Leo',
    'Rick',
    'Geovani',
    'Taki',
    'Well',
    'Marlon',
    'Wallison',
    'Al Caponi',
    'Felipão',
    'Adriel',
    'Youdy',
    'José',
    'Jorge',
    'Guilherme',
    'Robson',
    'Lucas',
  ];

  const CREATURE_COLORS = [
    '#29adff',
    '#ff004d',
    '#00e436',
    '#ffec27',
    '#ffa300',
    '#83769c',
    '#ff77a8',
    '#1d2b53',
    '#008751',
    '#ab5236',
    '#c2c3c7',
    '#ffccaa',
    '#7e2553',
    '#5f574f',
    '#7cffd4',
    '#6f8cff',
    '#ff8c42',
    '#a7f070',
    '#ffd6ff',
    '#9b5de5',
    '#00bbf9',
    '#f15bb5',
    '#fee440',
  ];

  function getCreatureNames() {
    return CREATURE_NAMES.slice();
  }

  function getCreatureColorPalette() {
    return CREATURE_COLORS.slice();
  }

  function createCreatureName() {
    return CREATURE_NAMES[Math.floor(Math.random() * CREATURE_NAMES.length)];
  }

  function createCreatureColor(options) {
    var usedColors = options && Array.isArray(options.usedColors) ? options.usedColors : [];
    var availableColors = CREATURE_COLORS.filter(function (color) {
      return usedColors.indexOf(color) === -1;
    });
    var pool = availableColors.length ? availableColors : CREATURE_COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function genomesMatch(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every(function (gene, index) {
      return gene === right[index];
    });
  }

  function getOffspringIdentity(options) {
    const genome = options.genome;
    const createName = options.createName || createCreatureName;
    const parents = Array.isArray(options.parents) && options.parents.length
      ? options.parents
      : [{ genome: options.parentGenome || genome, name: options.parentName, color: options.parentColor }];
    const matchingParent = parents.find(function (parent) {
      return parent && parent.name && genomesMatch(genome, parent.genome);
    });

    return {
      genome: genome,
      name: matchingParent ? matchingParent.name : createName(),
      color: matchingParent && matchingParent.color
        ? matchingParent.color
        : (options.createColor || createCreatureColor)({ usedColors: options.usedColors || [] }),
    };
  }

  function getEvolutionPreviewEntry(options) {
    if (options.type === 'elite') {
      return {
        type: 'elite',
        childName: options.childName,
        childGenome: options.childGenome.slice(),
        baseGenome: options.childGenome.slice(),
        sourceMap: options.childGenome.map(function () { return 'A'; }),
        mutationIndices: [],
        parentA: options.parentA,
        parentB: null,
        crossoverPoint: null,
      };
    }

    const crossoverPoint = options.crossoverPoint;
    const parentAGenome = options.parentA.genome;
    const parentBGenome = options.parentB.genome;
    const baseGenome = parentAGenome
      .slice(0, crossoverPoint)
      .concat(parentBGenome.slice(crossoverPoint));
    const sourceMap = baseGenome.map(function (_, index) {
      return index < crossoverPoint ? 'A' : 'B';
    });
    const mutationIndices = options.childGenome.reduce(function (indexes, gene, index) {
      if (gene !== baseGenome[index]) indexes.push(index);
      return indexes;
    }, []);

    return {
      type: 'offspring',
      childName: options.childName,
      childGenome: options.childGenome.slice(),
      baseGenome: baseGenome,
      sourceMap: sourceMap,
      mutationIndices: mutationIndices,
      parentA: options.parentA,
      parentB: options.parentB,
      crossoverPoint: crossoverPoint,
    };
  }

  return {
    createCreatureColor,
    createCreatureName,
    getEvolutionPreviewEntry,
    getCreatureColorPalette,
    getCreatureSprite,
    getCreatureNames,
    getOffspringIdentity,
    getResponsiveRenderMetrics,
    getSpritePixelSize,
    getSpriteRenderSize,
    getSpriteScale,
    getSpriteInset,
  };
});
