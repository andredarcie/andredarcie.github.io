import { WORLD } from '../config/world.js';

// O Vaza-Barris como Euclides o descreve: Canudos fica "constrito numa volta do
// Vaza-Barris, que o limitava do levante ao sul abarcando-o", em leito "escavado e
// fundo, como um fosso"; depois o rio "inflectia, endireitando em cheio para leste".
// Aqui ele vem do oeste-sudoeste, passa ao sul do arraial — entre a praça e o morro
// da Favela, onde o esporão do morro "acabava em corte abrupto" no rio —, sobe pelo
// leste e sai para o leste pelo nordeste. Pontos em unidades do mundo (y cresce para
// o sul; o arraial está no meio, em 410 × 410).
const RIVER = Object.freeze([
  [0, 655], [110, 640], [215, 618], [300, 590], [410, 612], [505, 590], [575, 520],
  [610, 410], [585, 305], [530, 240], [610, 200], [715, 178], [820, 165]
]);
// Meia largura do leito seco (areal e cascalho), antes da ondulação da margem.
const RIVER_HALF_WIDTH = 24;
// Até esta distância do meio, a caatinga é aberta: Euclides descreve o entorno de
// Canudos como "colinas nuas [...] sem uma nesga de mato", só bromélia e cacto. A
// caatinga fechada fica para fora, nas estradas, onde estavam as tocaias.
const OPEN_RADIUS = 300;
// Grade da distância até o rio, calculada uma vez: pintar o chão pergunta por ela
// milhões de vezes.
const GRID_STEP = 4;

export class BiomeMap {
  #riverGrid;
  #gridSize;

  constructor() {
    this.#gridSize = Math.ceil(Math.max(WORLD.width, WORLD.height) / GRID_STEP) + 2;
    this.#riverGrid = new Float32Array(this.#gridSize * this.#gridSize);
    for (let gy = 0; gy < this.#gridSize; gy++) {
      for (let gx = 0; gx < this.#gridSize; gx++) {
        this.#riverGrid[gy * this.#gridSize + gx] = BiomeMap.#riverDistance(gx * GRID_STEP, gy * GRID_STEP);
      }
    }
  }

  // Bioma num ponto. `jitter` empurra as fronteiras (a textura do chão serrilha a
  // borda com ruído, para nenhuma divisa sair lisa).
  biomeAt(x, y, jitter = 0) {
    const wobble = this.noise(x * .9 + 40, y * .9 - 12) * 9;
    if (this.riverDistance(x, y) < RIVER_HALF_WIDTH + wobble + jitter * .5) return 'riverbed';
    const ring = OPEN_RADIUS + this.noise(x * .6, y * .6) * 46 + jitter;
    return Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2) < ring ? 'scrub' : 'thicket';
  }

  // Distância até o eixo do rio, da grade (interpolada entre os quatro cantos).
  riverDistance(x, y) {
    const size = this.#gridSize;
    const fx = Math.max(0, Math.min(size - 1.001, x / GRID_STEP));
    const fy = Math.max(0, Math.min(size - 1.001, y / GRID_STEP));
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const grid = this.#riverGrid;
    const top = grid[iy * size + ix] * (1 - tx) + grid[iy * size + ix + 1] * tx;
    const bottom = grid[(iy + 1) * size + ix] * (1 - tx) + grid[(iy + 1) * size + ix + 1] * tx;
    return top * (1 - ty) + bottom * ty;
  }

  // Quanto o ponto está perto do arraial: 1 dentro da caatinga aberta do entorno,
  // caindo a 0 na borda da fechada. Árvore rareia aí (SceneryPlanner).
  openness(x, y) {
    const d = Math.hypot(x - WORLD.width / 2, y - WORLD.height / 2);
    return Math.max(0, Math.min(1, (OPEN_RADIUS + 20 - d) / 120));
  }

  // Chance de um recurso vingar no bioma: água só sobra em poça e cacimba no leito do
  // rio; roça e fruta vingam na vazante do rio e na caatinga aberta.
  habitatWeight(biome, resource) {
    if (resource === 'water') return biome === 'riverbed' ? 1 : biome === 'thicket' ? .3 : .2;
    return biome === 'riverbed' ? 1 : biome === 'thicket' ? .12 : .25;
  }

  // Ruído suave e determinístico: serve tanto para serrilhar a fronteira entre
  // biomas quanto para manchar o tom dentro de cada um. Soma de senos porque
  // precisa rodar um milhão de vezes ao pintar a textura.
  noise(x, y) {
    return Math.sin(x * .031 + Math.sin(y * .017) * 2.1) * .5 +
      Math.sin(y * .026 + Math.sin(x * .021) * 1.7) * .3 +
      Math.sin((x + y) * .052) * .2;
  }

  static #riverDistance(x, y) {
    let best = Infinity;
    for (let i = 1; i < RIVER.length; i++) {
      const [ax, ay] = RIVER[i - 1], [bx, by] = RIVER[i];
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return best;
  }
}
