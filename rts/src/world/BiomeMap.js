import { WORLD } from '../config/world.js';
import { TUPI } from '../config/mission.js';
import { coastY, BEACH } from './Coast.js';

// O Vaza-Barris como Euclides o descreve: Canudos fica "constrito numa volta do
// Vaza-Barris, que o limitava do levante ao sul abarcando-o", em leito "escavado e
// fundo, como um fosso"; depois o rio "inflectia, endireitando em cheio para leste".
// Aqui ele vem do oeste-sudoeste, passa ao sul do arraial — entre a praça e o morro
// da Favela, onde o esporão do morro "acabava em corte abrupto" no rio —, sobe pelo
// leste e sai para o leste pelo nordeste. Pontos em unidades do mundo (y cresce para
// o sul; o arraial está no meio, em 410 × 410).
//
// Na missão dos tupinambás é outro rio: de água corrente, que desce da serra ao
// norte, passa a leste da aldeia ("que tenha a água muito perto", Soares, cap. CLI)
// e entra no mar no canto da enseada. É raso: dá para passar a vau.
const RIVER = Object.freeze(TUPI ? [
  [598, 0], [588, 90], [612, 180], [594, 268], [618, 362], [600, 462], [632, 552], [648, 628], [662, 720]
] : [
  [0, 655], [110, 640], [215, 618], [300, 590], [410, 612], [505, 590], [575, 520],
  [610, 410], [585, 305], [530, 240], [610, 200], [715, 178], [820, 165]
]);
// Meia largura do leito seco (areal e cascalho), antes da ondulação da margem; o rio
// do litoral é mais estreito.
const RIVER_HALF_WIDTH = TUPI ? 13 : 24;
// Até esta distância do meio, a caatinga é aberta: Euclides descreve o entorno de
// Canudos como "colinas nuas [...] sem uma nesga de mato", só bromélia e cacto. A
// caatinga fechada fica para fora, nas estradas, onde estavam as tocaias.
// Em volta da aldeia tupinambá, a capoeira das roças: a mata derrubada e queimada
// para plantar ("de redor da aldeia fazerem suas roças", Soares, cap. CLI).
const OPEN_RADIUS = TUPI ? 230 : 300;
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
    if (TUPI) {
      // O mar e a praia vêm primeiro: a linha d'água é a da enseada (Coast).
      const coast = coastY(x);
      if (y > coast) return 'sea';
      if (y > coast - BEACH - wobble * .8 - jitter * .3) return 'beach';
    }
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
    if (TUPI) {
      // Roça é na capoeira em volta da aldeia; poça de chuva só na mata e na capoeira.
      if (resource === 'water') return biome === 'thicket' ? .5 : biome === 'scrub' ? .25 : 0;
      return biome === 'scrub' ? 1 : biome === 'thicket' ? .08 : 0;
    }
    if (resource === 'water') return biome === 'riverbed' ? 1 : biome === 'thicket' ? .3 : .2;
    return biome === 'riverbed' ? 1 : biome === 'thicket' ? .12 : .25;
  }

  // Dá para erguer uma construção de raio `radius` aqui? Em Canudos, em qualquer
  // chão; no litoral, nem no mar, nem dentro do rio.
  buildable(x, y, radius) {
    if (!TUPI) return true;
    if (y + radius > coastY(x) - 4) return false;
    return this.riverDistance(x, y) > RIVER_HALF_WIDTH + radius * .6;
  }

  // Roça pode nascer aqui? No litoral, só na capoeira e na mata.
  allowsCrop(x, y) {
    if (!TUPI) return true;
    const biome = this.biomeAt(x, y);
    return biome === 'scrub' || biome === 'thicket';
  }

  // Poça de chuva cabe aqui (no litoral, longe do mar, da praia e do rio)?
  allowsPond(x, y, radius) {
    if (!TUPI) return true;
    if (y + radius > coastY(x) - BEACH - 10) return false;
    return this.riverDistance(x, y) > RIVER_HALF_WIDTH + radius + 6;
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
