import { pseudoRandom } from '../core/math.js';
import { WORLD, GROUND_TEXTURE_SIZE, GROUND_DETAIL_STROKES } from '../config/world.js';
import { PALETTE } from './Palette.js';

// Textura de cada lateral do tabuleiro: comprida no sentido da beirada.
const SIDE_TEXTURE_WIDTH = 1024;
const SIDE_TEXTURE_HEIGHT = 128;

const hex = value => '#' + value.toString(16).padStart(6, '0');
const rgb = value => [value >> 16 & 255, value >> 8 & 255, value & 255];

// Pinta as texturas do chão. As faixas de bioma saem da mesma fronteira ondulada que
// a simulação usa, então o que se vê bate com onde comida e água realmente aparecem.
export class GroundPainter {
  #biomes;
  #tones = {
    desert: PALETTE.desertGround.map(rgb),
    taiga: PALETTE.taigaGround.map(rgb),
    savanna: PALETTE.savannaGround.map(rgb)
  };

  constructor(biomes) {
    this.#biomes = biomes;
  }

  // O chão da área dos bichos: biomas, detalhe rasteiro, clareira e lajotas.
  paintGround() {
    const size = GROUND_TEXTURE_SIZE;
    const scale = size / WORLD.height;
    const { surface, context } = GroundPainter.#canvas(size);
    this.#paintBiomes(context, size, 0, 0, 1 / scale, 1 / scale);
    this.#paintDetail(context, size);
    GroundPainter.#paintClearing(context, size);
    GroundPainter.#paintTiles(context, size);
    return surface;
  }

  // Uma lateral do tabuleiro, como corte de barranco: a borda da grama no topo, na
  // cor do bioma que chega naquela beirada, depois terra, argila e rocha.
  // `pointAt(u)` diz que ponto da beirada do mundo fica na coluna u (0..1) da face.
  paintSide(pointAt) {
    const width = SIDE_TEXTURE_WIDTH, height = SIDE_TEXTURE_HEIGHT;
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const context = surface.getContext('2d');
    const noise = (x, seed) => Math.sin(x * .031 + seed) * .5 + Math.sin(x * .087 + seed * 2.3) * .3 +
      Math.sin(x * .19 + seed * 4.1) * .2;
    // Camadas de cima para baixo, com as divisas onduladas como estrato de verdade.
    const layers = [
      [hex(PALETTE.soilTop), .07, 0],
      [hex(PALETTE.soilDeep), .38, 1.3],
      [hex(PALETTE.bedrock), .66, 2.7],
      [hex(PALETTE.bedrockDark), .9, 4.2]
    ];
    context.fillStyle = hex(PALETTE.soilTop);
    context.fillRect(0, 0, width, height);
    for (const [color, depth, seed] of layers) {
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(0, height);
      for (let x = 0; x <= width; x += 8) {
        context.lineTo(x, height * (depth + noise(x, seed) * .035));
      }
      context.lineTo(width, height);
      context.closePath();
      context.fill();
    }
    // Pedrinhas e grãos soltos no corte, mais escuros que a camada.
    context.fillStyle = hex(PALETTE.bedrockDark);
    for (let i = 0; i < 260; i++) {
      const x = pseudoRandom(i * 5 + 11) * width;
      const y = height * (.12 + pseudoRandom(i * 5 + 12) * .85);
      context.globalAlpha = .25 + pseudoRandom(i * 5 + 13) * .3;
      const r = 1 + pseudoRandom(i * 5 + 14) * 2.2;
      context.fillRect(x - r, y - r * .6, r * 2, r * 1.2);
    }
    context.globalAlpha = 1;
    // Beirada de grama: a cor do chão logo ali em cima, com franja irregular.
    for (let x = 0; x < width; x += 4) {
      const point = pointAt((x + 2) / width);
      const tone = this.toneAt(point.x, point.y);
      context.fillStyle = `rgb(${tone[0]}, ${tone[1]}, ${tone[2]})`;
      const fringe = height * (.06 + Math.max(0, noise(x * 3.1, 7.7)) * .05);
      context.fillRect(x, 0, 4, fringe);
    }
    return surface;
  }

  static #canvas(size) {
    const surface = document.createElement('canvas');
    surface.width = size;
    surface.height = size;
    return { surface, context: surface.getContext('2d') };
  }

  // Tom do chão num ponto do mundo, [r, g, b] em 0..255: mesmo cálculo da textura do
  // chão, para a beirada do tabuleiro e o capim 3D baterem com o chão embaixo deles.
  toneAt(worldX, worldY) {
    const clampedX = Math.max(0, Math.min(WORLD.width - 1, worldX));
    const clampedY = Math.max(0, Math.min(WORLD.height - 1, worldY));
    return this.#toneWithin(this.#biomes.boundaries(clampedY), clampedX, clampedY);
  }

  #toneWithin({ desertEnd, taigaEnd }, worldX, worldY) {
    const biomes = this.#biomes;
    const edge = biomes.noise(worldX * 1.7, worldY * 1.7) * 24;
    const biome = worldX < desertEnd + edge ? 'desert'
      : worldX < taigaEnd + edge ? 'taiga' : 'savanna';
    const variation = biomes.noise(worldX * .55, worldY * .55);
    return this.#tones[biome][variation > .34 ? 1 : variation < -.3 ? 2 : 0];
  }

  // Pixel a pixel, em ImageData: com fillRect por coluna seriam meio milhão de
  // chamadas e a página travaria ao abrir.
  #paintBiomes(context, size, offsetX, offsetY, stepX, stepY) {
    const biomes = this.#biomes;
    const image = context.createImageData(size, size);
    const data = image.data;
    let offset = 0;
    for (let row = 0; row < size; row++) {
      const worldY = offsetY + row * stepY;
      const boundaries = biomes.boundaries(worldY);
      for (let column = 0; column < size; column++, offset += 4) {
        const worldX = offsetX + column * stepX;
        const tone = this.#toneWithin(boundaries, worldX, worldY);
        // Por cima do tom do bioma: manchas grandes de claro e escuro (solo mais seco
        // ou mais úmido) e um grão fino de pixel, que tiram o aspecto de tinta chapada.
        const mottle = biomes.noise(worldX * .09 + 31.7, worldY * .09 + 17.3) * .07;
        const grain = (((column * 73856093) ^ (row * 19349663)) >>> 0) % 997 / 997 - .5;
        const shade = 1 + mottle + grain * .05;
        data[offset] = Math.min(255, tone[0] * shade);
        data[offset + 1] = Math.min(255, tone[1] * shade);
        data[offset + 2] = Math.min(255, tone[2] * shade);
        data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }

  // Detalhe rasteiro, um traço por bioma: ondulação de areia no deserto,
  // serrapilheira na taiga e tufo seco na savana.
  // Os tamanhos foram afinados numa textura de 1024; `k` os acompanha quando a
  // textura cresce, para o traço ter o mesmo tamanho no mundo.
  #paintDetail(context, size) {
    const k = size / 1024;
    context.save();
    context.lineCap = 'round';
    for (let i = 0; i < GROUND_DETAIL_STROKES; i++) {
      const seed = i * 7 + 1;
      const nx = pseudoRandom(seed), ny = pseudoRandom(seed + 1);
      const biome = this.#biomes.biomeAt(nx * WORLD.width, ny * WORLD.height);
      const x = nx * size, y = ny * size;
      if (biome === 'desert') {
        context.strokeStyle = hex(PALETTE.desertGround[2]);
        context.globalAlpha = .45;
        context.lineWidth = 1.6 * k;
        context.beginPath();
        context.arc(x, y + 6 * k, 7 * k, Math.PI * 1.15, Math.PI * 1.85);
      } else if (biome === 'taiga') {
        const tilt = pseudoRandom(seed + 2) * Math.PI;
        context.strokeStyle = hex(PALETTE.needle);
        context.globalAlpha = .34;
        context.lineWidth = 1.4 * k;
        context.beginPath();
        context.moveTo(x - Math.cos(tilt) * 3.2 * k, y - Math.sin(tilt) * 3.2 * k);
        context.lineTo(x + Math.cos(tilt) * 3.2 * k, y + Math.sin(tilt) * 3.2 * k);
      } else {
        context.strokeStyle = hex(PALETTE.dryGrass);
        context.globalAlpha = .5;
        context.lineWidth = 1.5 * k;
        context.beginPath();
        context.moveTo(x, y + 4 * k);
        context.lineTo(x + (pseudoRandom(seed + 3) - .5) * 3.4 * k, y - 3.4 * k);
      }
      context.stroke();
    }
    context.restore();
  }

  // Clareira de terra batida no meio, o miolo gasto da referência.
  static #paintClearing(context, size) {
    context.save();
    context.filter = `blur(${6 * size / 1024}px)`;
    context.globalAlpha = .82;
    context.fillStyle = hex(PALETTE.clearing);
    context.beginPath();
    for (let step = 0; step <= 60; step++) {
      const angle = step / 60 * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 3 + .7) * .13 + Math.sin(angle * 5 + 2.1) * .07;
      const radius = size * .29 * wobble;
      const px = size / 2 + Math.cos(angle) * radius;
      const py = size / 2 + Math.sin(angle) * radius * .94;
      if (step) context.lineTo(px, py); else context.moveTo(px, py);
    }
    context.closePath();
    context.fill();
    context.restore();
  }

  // Lajotas soltas saindo do centro, como os caminhos da referência.
  static #paintTiles(context, size) {
    context.fillStyle = hex(PALETTE.tile);
    for (let arm = 0; arm < 5; arm++) {
      const angle = arm / 5 * Math.PI * 2 + .4;
      for (let stone = 2; stone < 15; stone++) {
        const distance = stone * size * .019;
        const drift = Math.sin(stone * 1.7 + arm) * size * .012;
        context.save();
        context.translate(
          size / 2 + Math.cos(angle) * distance - Math.sin(angle) * drift,
          size / 2 + Math.sin(angle) * distance + Math.cos(angle) * drift
        );
        context.rotate(angle + Math.sin(stone) * .2);
        const half = 8 * size / 1024;
        context.fillRect(-half, -half, half * 2, half * 2);
        context.restore();
      }
    }
  }
}
