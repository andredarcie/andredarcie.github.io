(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TinyCreaturesSprites = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Um sprite 8×8 por direção. Paleta por célula:
  //   0 = vazio      3 = branco do olho
  //   1 = corpo      4 = pupila
  //   2 = contorno   5 = brilho (gloss)
  // A silhueta é uma gota arredondada com contorno; os olhos (cols 2 e 5)
  // deslocam a pupila para indicar para onde a criatura encara.
  function getCreatureSprites() {
    return {
      // encara o jogador / para baixo: pupila ABAIXO do branco
      D: [
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [2, 5, 1, 1, 1, 1, 1, 2],
        [2, 1, 3, 1, 1, 3, 1, 2],
        [2, 1, 4, 1, 1, 4, 1, 2],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
      ],
      // de costas / para cima: pupila ACIMA do branco
      U: [
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [2, 5, 1, 1, 1, 1, 1, 2],
        [2, 1, 4, 1, 1, 4, 1, 2],
        [2, 1, 3, 1, 1, 3, 1, 2],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
      ],
      // para a esquerda: pupila à ESQUERDA do branco
      L: [
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [2, 5, 1, 1, 1, 1, 1, 2],
        [2, 1, 4, 3, 1, 4, 3, 2],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
      ],
      // para a direita: pupila à DIREITA do branco
      R: [
        [0, 0, 2, 2, 2, 2, 0, 0],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [2, 5, 1, 1, 1, 1, 1, 2],
        [2, 1, 3, 4, 1, 3, 4, 2],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [2, 1, 1, 1, 1, 1, 1, 2],
        [0, 2, 1, 1, 1, 1, 2, 0],
        [0, 0, 2, 2, 2, 2, 0, 0],
      ],
    };
  }

  function getCreatureSprite() { return getCreatureSprites().D; }

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

  // Cientistas da computação famosos (sobrenomes, curtos para o rótulo).
  const CREATURE_NAMES = [
    'Turing',
    'Lovelace',
    'Hopper',
    'Dijkstra',
    'Knuth',
    'Neumann',
    'Ritchie',
    'Thompson',
    'Torvalds',
    'Shannon',
    'Hamming',
    'Karp',
    'Hoare',
    'Liskov',
    'Backus',
    'McCarthy',
    'Minsky',
    'Cerf',
    'Wozniak',
    'Stallman',
    'Tarjan',
    'Rivest',
    'Babbage',
    'Boole',
  ];

  // Paleta PICO-8 (cores das criaturas). PICO-8 só tem 16 cores; aqui ficam as
  // 13 distintas e legíveis sobre o gramado — fora preto (contorno), verde-escuro
  // (#008751, cor do gramado) e roxo-escuro (#7e2553, reservado ao inimigo).
  // Como POP (40) > 13, as cores repetem; é o limite inerente do PICO-8.
  const CREATURE_COLORS = [
    '#ff004d', // red
    '#ffa300', // orange
    '#ffec27', // yellow
    '#00e436', // green
    '#29adff', // blue
    '#ff77a8', // pink
    '#ffccaa', // peach
    '#83769c', // indigo
    '#c2c3c7', // light-grey
    '#fff1e8', // white
    '#ab5236', // brown
    '#1d2b53', // dark-blue
    '#5f574f', // dark-grey
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

  // ── Paleta PICO-8 (índice → cor). Use o índice nas matrizes; -1 = vazio. ──
  const PICO8 = [
    '#000000', // 0  preto
    '#1d2b53', // 1  azul-escuro
    '#7e2553', // 2  roxo-escuro
    '#008751', // 3  verde-escuro
    '#ab5236', // 4  marrom
    '#5f574f', // 5  cinza-escuro
    '#c2c3c7', // 6  cinza-claro
    '#fff1e8', // 7  branco
    '#ff004d', // 8  vermelho
    '#ffa300', // 9  laranja
    '#ffec27', // 10 amarelo
    '#00e436', // 11 verde
    '#29adff', // 12 azul
    '#83769c', // 13 índigo
    '#ff77a8', // 14 rosa
    '#ffccaa', // 15 pêssego
  ];

  // ── Sprites do tabuleiro (16×16). É só desenhar com números: cada número é
  // uma cor da PICO8 acima, -1 é transparente. Para editar, mexa nos números. ──
  const BOARD_SPRITES = {
    sword: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 0, 6, 0,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 7, 6, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1, 0, 9,10,10,10,10,10, 9, 0,-1,-1,-1,-1],
      [-1,-1,-1, 0, 9, 9, 9, 9, 9, 9, 9, 0,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 0, 4, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 0, 5, 5, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 0, 4, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 0,10, 9, 0,-1,-1,-1,-1,-1,-1],
    ],
    base: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,10,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 7,12,12,12,12,12, 0],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4,12,12,12,12,12, 0,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4,12,12,12,12, 0,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 1, 1, 1, 0,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 1, 1, 0,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 1, 0,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 0, 4, 0,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 0, 4, 4, 4, 4, 4, 0,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 5, 5, 5, 5, 5,-1,-1,-1,-1,-1],
    ],
    tower: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1, 6, 6, 5,-1, 6, 6, 6, 5,-1, 6, 6, 5,-1,-1],
      [-1,-1, 6, 6, 5,-1, 6, 6, 6, 5,-1, 6, 6, 5,-1,-1],
      [-1, 0, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 0,-1],
      [-1, 0, 6, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 5, 0,-1],
      [-1, 0, 6, 6, 6, 5, 6, 6, 5, 6, 6, 5, 6, 5, 0,-1],
      [-1, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0,-1],
      [-1, 0, 6, 6, 6, 6, 6, 0, 0, 6, 6, 6, 6, 5, 0,-1],
      [-1, 0, 6, 6, 6, 6, 6, 0, 0, 6, 6, 6, 6, 5, 0,-1],
      [-1, 0, 5, 5, 5, 5, 5, 0, 0, 5, 5, 5, 5, 5, 0,-1],
      [-1, 0, 6, 6, 5, 6, 6, 0, 0, 6, 5, 6, 5, 5, 0,-1],
      [-1, 0, 6, 6, 5, 6, 6, 0, 0, 6, 5, 6, 5, 5, 0,-1],
      [-1, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0,-1],
      [-1, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0,-1],
      [-1,-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
    ],
    trap: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1, 7,-1,-1,-1,-1, 7,-1,-1,-1,-1, 7,-1,-1],
      [-1,-1, 6, 7, 5,-1,-1, 6, 7, 5,-1,-1, 6, 7, 5,-1],
      [-1,-1, 6, 6, 5,-1,-1, 6, 6, 5,-1,-1, 6, 6, 5,-1],
      [-1, 6, 6, 6, 5, 5, 6, 6, 6, 5, 5, 6, 6, 6, 5, 5],
      [-1, 6, 6, 6, 5, 5, 6, 6, 6, 5, 5, 6, 6, 6, 5, 5],
      [ 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      [ 5, 5, 0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 0, 5, 5],
      [ 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
    ],
    enemy: [
      [-1,-1,-1, 0,-1,-1,-1,-1,-1,-1,-1,-1, 0,-1,-1,-1],
      [-1,-1,-1, 0, 2, 0,-1,-1,-1,-1, 0, 2, 0,-1,-1,-1],
      [-1,-1, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0,-1,-1],
      [-1,-1, 0, 2,14,14, 2, 2, 2, 2, 2, 2, 2, 0,-1,-1],
      [-1,-1, 0,14, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0,-1,-1],
      [-1,-1, 0, 2,10,10, 2, 2, 2, 2,10,10, 2, 0,-1,-1],
      [-1,-1, 0, 2, 0,10, 2, 2, 2, 2,10, 0, 2, 0,-1,-1],
      [-1,-1, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0,-1,-1],
      [-1,-1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 2, 1, 0,-1,-1],
      [-1,-1, 0, 2, 2, 7, 0, 7, 7, 0, 7, 2, 1, 0,-1,-1],
      [-1,-1, 0, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0,-1,-1],
      [-1,-1,-1, 0, 2, 2, 2, 2, 2, 2, 1, 1, 0,-1,-1,-1],
      [-1,-1,-1, 0, 2, 2, 0,-1,-1, 0, 2, 2, 0,-1,-1,-1],
      [-1,-1,-1,-1, 0, 0,-1,-1,-1,-1, 0, 0,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
    ],
    // ── Enfeites decorativos (só visual, sem efeito no jogo) ──
    grass: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,11,-1,-1,11,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,11,11,-1,11,11,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,11, 3,11,11, 3,11,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 3,11, 3,11,11, 3,11,-1,-1,-1,-1],
      [-1,-1,-1,-1,11, 3,11, 3, 3,11, 3, 3,-1,-1,-1,-1],
      [-1,-1,-1,-1, 3, 3, 3, 3, 3, 3, 3, 3,-1,-1,-1,-1],
    ],
    bush: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 3, 3,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 3,11,11, 3,11, 3,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1, 3,11, 3,11,11, 3,11, 3,-1,-1,-1,-1],
      [-1,-1,-1, 3,11, 3, 3,11, 3,11, 3,11, 3,-1,-1,-1],
      [-1,-1,-1, 3, 3,11, 3, 3,11, 3, 3, 3, 3,-1,-1,-1],
      [-1,-1,-1,-1, 3, 3, 3, 3, 3, 3, 3, 3,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 3, 3, 3, 3, 3, 3,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 3, 3, 3, 3,-1,-1,-1,-1,-1,-1],
    ],
    tree: [
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 3, 3,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 3,11,11, 3, 3,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1, 3,11,11, 3,11, 3, 3,-1,-1,-1,-1,-1],
      [-1,-1,-1, 3,11, 3,11,11, 3,11, 3, 3,-1,-1,-1,-1],
      [-1,-1,-1, 3, 3,11, 3, 3,11, 3,11, 3, 3,-1,-1,-1],
      [-1,-1,-1, 3,11, 3, 3,11, 3, 3, 3,11, 3,-1,-1,-1],
      [-1,-1,-1,-1, 3, 3, 3, 3, 3, 3, 3, 3,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1, 3, 3, 3, 3, 3, 3,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 4, 4,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 4, 4,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1,-1, 4, 4,-1,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 4, 4, 4, 4,-1,-1,-1,-1,-1,-1],
      [-1,-1,-1,-1,-1,-1, 4, 4, 4, 4,-1,-1,-1,-1,-1,-1],
    ],
  };

  // Converte uma matriz de cores PICO-8 num data-URI SVG (pixels nítidos),
  // pronto pra usar como background-image. Junta corridas horizontais p/ ficar leve.
  function spriteToDataURL(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    let rects = '';
    for (let y = 0; y < rows; y++) {
      let x = 0;
      while (x < cols) {
        const c = matrix[y][x];
        if (c < 0 || c == null) { x++; continue; }
        let run = 1;
        while (x + run < cols && matrix[y][x + run] === c) run++;
        rects += "<rect x='" + x + "' y='" + y + "' width='" + run + "' height='1' fill='" + (PICO8[c] || '#000000') + "'/>";
        x += run;
      }
    }
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 " + cols + " " + rows +
      "' shape-rendering='crispEdges'>" + rects + "</svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  return {
    createCreatureColor,
    createCreatureName,
    getEvolutionPreviewEntry,
    getCreatureColorPalette,
    getCreatureSprite,
    getCreatureSprites,
    getCreatureNames,
    getOffspringIdentity,
    getResponsiveRenderMetrics,
    getSpritePixelSize,
    getSpriteRenderSize,
    getSpriteScale,
    getSpriteInset,
    PICO8,
    BOARD_SPRITES,
    spriteToDataURL,
  };
});
