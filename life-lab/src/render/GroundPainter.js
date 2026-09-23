import { pseudoRandom } from '../core/math.js';
import { WORLD, GROUND_TEXTURE_SIZE, SURROUNDING_TEXTURE_SIZE, SURROUNDING_SCALE } from '../config/world.js';
import { PALETTE } from './Palette.js';

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

  // O terreno de fora: mesmos biomas e mesmos tons do chão do mundo, sem os
  // detalhes rasteiros, numa textura só que cobre SURROUNDING_SCALE vezes o mundo.
  paintSurroundings() {
    const size = SURROUNDING_TEXTURE_SIZE;
    const { surface, context } = GroundPainter.#canvas(size);
    // A textura começa (SURROUNDING_SCALE − 1) / 2 mundos antes da origem.
    const offsetX = -WORLD.width * (SURROUNDING_SCALE - 1) / 2;
    const offsetY = -WORLD.height * (SURROUNDING_SCALE - 1) / 2;
    const stepX = WORLD.width * SURROUNDING_SCALE / size;
    const stepY = WORLD.height * SURROUNDING_SCALE / size;
    this.#paintBiomes(context, size, offsetX, offsetY, stepX, stepY);
    return surface;
  }

  static #canvas(size) {
    const surface = document.createElement('canvas');
    surface.width = size;
    surface.height = size;
    return { surface, context: surface.getContext('2d') };
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
      const { desertEnd, taigaEnd } = biomes.boundaries(worldY);
      for (let column = 0; column < size; column++, offset += 4) {
        const worldX = offsetX + column * stepX;
        const edge = biomes.noise(worldX * 1.7, worldY * 1.7) * 24;
        const biome = worldX < desertEnd + edge ? 'desert'
          : worldX < taigaEnd + edge ? 'taiga' : 'savanna';
        const variation = biomes.noise(worldX * .55, worldY * .55);
        const tone = this.#tones[biome][variation > .34 ? 1 : variation < -.3 ? 2 : 0];
        data[offset] = tone[0];
        data[offset + 1] = tone[1];
        data[offset + 2] = tone[2];
        data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }

  // Detalhe rasteiro, um traço por bioma: ondulação de areia no deserto,
  // serrapilheira na taiga e tufo seco na savana.
  #paintDetail(context, size) {
    context.save();
    context.lineCap = 'round';
    for (let i = 0; i < 1300; i++) {
      const seed = i * 7 + 1;
      const nx = pseudoRandom(seed), ny = pseudoRandom(seed + 1);
      const biome = this.#biomes.biomeAt(nx * WORLD.width, ny * WORLD.height);
      const x = nx * size, y = ny * size;
      if (biome === 'desert') {
        context.strokeStyle = hex(PALETTE.desertGround[2]);
        context.globalAlpha = .45;
        context.lineWidth = 1.6;
        context.beginPath();
        context.arc(x, y + 6, 7, Math.PI * 1.15, Math.PI * 1.85);
      } else if (biome === 'taiga') {
        const tilt = pseudoRandom(seed + 2) * Math.PI;
        context.strokeStyle = hex(PALETTE.needle);
        context.globalAlpha = .34;
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(x - Math.cos(tilt) * 3.2, y - Math.sin(tilt) * 3.2);
        context.lineTo(x + Math.cos(tilt) * 3.2, y + Math.sin(tilt) * 3.2);
      } else {
        context.strokeStyle = hex(PALETTE.dryGrass);
        context.globalAlpha = .5;
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(x, y + 4);
        context.lineTo(x + (pseudoRandom(seed + 3) - .5) * 3.4, y - 3.4);
      }
      context.stroke();
    }
    context.restore();
  }

  // Clareira de terra batida no meio, o miolo gasto da referência.
  static #paintClearing(context, size) {
    context.save();
    context.filter = 'blur(6px)';
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
        context.fillRect(-8, -8, 16, 16);
        context.restore();
      }
    }
  }
}
