import { pseudoRandom } from '../core/math.js';
import { WORLD, GROUND_TEXTURE_SIZE, GROUND_DETAIL_STROKES } from '../config/world.js';
import { PALETTE } from './Palette.js';
import { ROADS, HILLS } from '../config/rts.js';
import { roadPath } from '../world/Roads.js';
import { TUPI } from '../config/mission.js';
import { coastY } from '../world/Coast.js';

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
    riverbed: PALETTE.riverbedGround.map(rgb),
    thicket: PALETTE.thicketGround.map(rgb),
    scrub: PALETTE.scrubGround.map(rgb),
    ...(TUPI ? { beach: PALETTE.beachGround.map(rgb), sea: PALETTE.seaGround.map(rgb) } : {})
  };

  constructor(biomes) {
    this.#biomes = biomes;
  }

  // O chão do tabuleiro: biomas, detalhe rasteiro, a praça da vila e as estradas.
  paintGround() {
    const size = GROUND_TEXTURE_SIZE;
    const scale = size / WORLD.height;
    const { surface, context } = GroundPainter.#canvas(size);
    this.#paintBiomes(context, size, 0, 0, 1 / scale, 1 / scale);
    this.#paintDetail(context, size);
    if (TUPI) GroundPainter.#paintSea(context, size);
    GroundPainter.#paintHills(context, size);
    GroundPainter.#paintClearing(context, size);
    GroundPainter.#paintRoads(context, size);
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
    return this.#toneWithin(clampedX, clampedY);
  }

  #toneWithin(worldX, worldY) {
    const biomes = this.#biomes;
    const edge = biomes.noise(worldX * 1.7, worldY * 1.7) * 24;
    const biome = biomes.biomeAt(worldX, worldY, edge);
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
      for (let column = 0; column < size; column++, offset += 4) {
        const worldX = offsetX + column * stepX;
        const tone = this.#toneWithin(worldX, worldY);
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

  // Detalhe rasteiro, um traço por bioma: ondulação de areia no leito do rio, galho
  // e folha seca na caatinga fechada e tufo de capim seco na aberta.
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
      if (biome === 'sea') continue;
      if (biome === 'beach') {
        // Conchinha e grão de areia mais escuro na praia.
        context.fillStyle = pseudoRandom(seed + 2) > .5 ? hex(PALETTE.foam) : hex(PALETTE.beachGround[2]);
        context.globalAlpha = .55;
        context.fillRect(x, y, 1.6 * k, 1.1 * k);
        continue;
      }
      if (biome === 'riverbed') {
        context.strokeStyle = hex(PALETTE.riverbedGround[2]);
        context.globalAlpha = .18;
        context.lineWidth = 1.6 * k;
        context.beginPath();
        context.arc(x, y + 6 * k, 7 * k, Math.PI * 1.15, Math.PI * 1.85);
      } else if (biome === 'thicket') {
        const tilt = pseudoRandom(seed + 2) * Math.PI;
        context.strokeStyle = hex(PALETTE.litter);
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
    // Cascalho e pedrisco soltos por todo o chão do sertão, mais no areal e na
    // caatinga aberta: pontinhos claros e escuros, cada um com a sua sombrinha.
    for (let i = 0; i < GROUND_DETAIL_STROKES * .8; i++) {
      const seed = i * 13 + 5;
      const nx = pseudoRandom(seed), ny = pseudoRandom(seed + 1);
      const biome = this.#biomes.biomeAt(nx * WORLD.width, ny * WORLD.height);
      if (biome === 'thicket' && pseudoRandom(seed + 2) > .4) continue;
      if (biome === 'sea' || (TUPI && biome === 'riverbed')) continue;
      const x = nx * size, y = ny * size;
      const r = (.7 + pseudoRandom(seed + 3) * 1.3) * k;
      context.globalAlpha = .35;
      context.fillStyle = '#3e2e1e';
      context.fillRect(x - r + k * .6, y - r * .5 + k * .6, r * 2, r * 1.2);
      context.globalAlpha = .75;
      context.fillStyle = pseudoRandom(seed + 4) > .5 ? hex(PALETTE.rockLight) : hex(PALETTE.rockWarm);
      context.fillRect(x - r, y - r * .5, r * 2, r * 1.2);
    }
    context.restore();
  }

  // Os morros: chão pedregoso, mais claro no alto, com lajedos e cascalho de xisto
  // ("rasgadas de lascas de talcoxisto").
  static #paintHills(context, size) {
    const scale = size / WORLD.width;
    context.save();
    HILLS.forEach((hill, index) => {
      const x = hill.x * scale, y = hill.y * scale, r = hill.radius * scale;
      const glow = context.createRadialGradient(x, y, r * .1, x, y, r);
      glow.addColorStop(0, 'rgba(198, 184, 158, .55)');
      glow.addColorStop(.6, 'rgba(176, 154, 122, .35)');
      glow.addColorStop(1, 'rgba(176, 154, 122, 0)');
      context.fillStyle = glow;
      context.fillRect(x - r, y - r, r * 2, r * 2);
      for (let i = 0; i < 90; i++) {
        const seed = index * 503 + i * 3;
        const angle = pseudoRandom(seed) * Math.PI * 2;
        const distance = Math.sqrt(pseudoRandom(seed + 1)) * r * .85;
        const w = (1.5 + pseudoRandom(seed + 2) * (i < 8 ? 9 : 2.5)) * scale;
        context.globalAlpha = .35 + pseudoRandom(seed + 3) * .3;
        context.fillStyle = pseudoRandom(seed + 4) > .5 ? hex(PALETTE.rockLight) : hex(PALETTE.rock);
        context.fillRect(x + Math.cos(angle) * distance - w / 2, y + Math.sin(angle) * distance - w * .3, w, w * .6);
      }
      context.globalAlpha = 1;
    });
    context.restore();
  }

  // O mar da enseada: escurece para fora (mais fundo), a faixa de areia molhada logo
  // acima da linha d'água e duas linhas de espuma da arrebentação, interrompidas.
  static #paintSea(context, size) {
    const scale = size / WORLD.width;
    context.save();
    const line = (offset, from = 0, to = WORLD.width) => {
      context.beginPath();
      for (let x = from; x <= to; x += 6) {
        const y = (coastY(x) + offset) * scale;
        if (x === from) context.moveTo(x * scale, y);
        else context.lineTo(x * scale, y);
      }
    };
    // O fundo: um degradê do raso para o fundo, de cima para baixo da faixa de mar.
    const top = Math.min(...Array.from({ length: 42 }, (_, i) => coastY(i * 20)));
    const deep = context.createLinearGradient(0, top * scale, 0, size);
    deep.addColorStop(0, 'rgba(0, 0, 0, 0)');
    deep.addColorStop(.35, hex(PALETTE.seaGround[0]) + '00');
    deep.addColorStop(1, hex(PALETTE.seaDeep));
    line(6);
    context.lineTo(size, size);
    context.lineTo(0, size);
    context.closePath();
    context.fillStyle = deep;
    context.fill();
    // Areia molhada: uma faixa mais escura logo acima da água.
    context.filter = `blur(${2 * scale}px)`;
    context.strokeStyle = hex(PALETTE.beachGround[2]);
    context.globalAlpha = .7;
    context.lineWidth = 7 * scale;
    line(-3);
    context.stroke();
    // A espuma: na beira e uma onda mais para fora, em pedaços.
    context.filter = `blur(${.8 * scale}px)`;
    context.strokeStyle = hex(PALETTE.foam);
    for (const [offset, width, alpha] of [[1, 2.2, .85], [12, 1.4, .45], [26, 1.1, .3]]) {
      context.lineWidth = width * scale;
      context.globalAlpha = alpha;
      for (let i = 0; i < 26; i++) {
        const from = pseudoRandom(i * 7 + offset) * WORLD.width;
        const length = 18 + pseudoRandom(i * 7 + offset + 1) * 46;
        line(offset + (pseudoRandom(i * 7 + offset + 2) - .5) * 3, from, Math.min(WORLD.width, from + length));
        context.stroke();
      }
    }
    context.restore();
  }

  // A praça de terra batida no meio, onde a vila fica. Na aldeia tupinambá é o
  // "terreiro quadrado" no meio das casas (Soares, cap. CLI), varrido e pelado.
  static #paintClearing(context, size) {
    if (TUPI) {
      context.save();
      context.filter = `blur(${5 * size / 1024}px)`;
      context.globalAlpha = .85;
      context.fillStyle = hex(PALETTE.clearing);
      context.translate(size / 2, size / 2);
      context.rotate(Math.PI / 4);
      const half = size * .118;
      context.beginPath();
      for (let step = 0; step <= 48; step++) {
        const t = step / 48 * 4;
        const side = Math.floor(t) % 4, along = t - Math.floor(t);
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        const [ax, ay] = corners[side], [bx, by] = corners[(side + 1) % 4];
        const wobble = 1 + Math.sin(step * 1.7) * .03;
        const px = (ax + (bx - ax) * along) * half * wobble, py = (ay + (by - ay) * along) * half * wobble;
        if (step) context.lineTo(px, py); else context.moveTo(px, py);
      }
      context.closePath();
      context.fill();
      context.restore();
      return;
    }
    context.save();
    context.filter = `blur(${6 * size / 1024}px)`;
    context.globalAlpha = .82;
    context.fillStyle = hex(PALETTE.clearing);
    context.beginPath();
    for (let step = 0; step <= 60; step++) {
      const angle = step / 60 * Math.PI * 2;
      const wobble = 1 + Math.sin(angle * 3 + .7) * .13 + Math.sin(angle * 5 + 2.1) * .07;
      const radius = size * .17 * wobble;
      const px = size / 2 + Math.cos(angle) * radius;
      const py = size / 2 + Math.sin(angle) * radius * .94;
      if (step) context.lineTo(px, py); else context.moveTo(px, py);
    }
    context.closePath();
    context.fill();
    context.restore();
  }

  // As quatro estradas de terra, da beirada até a praça, seguindo a trilha sinuosa de
  // Roads.js. Chão batido, não faixa pintada: a trilha é desenhada numa camada à
  // parte, com a largura de cada trecho; depois o próprio chão "come" pedaços dela
  // (falhas onde o capim e a terra solta voltaram) e a beira fica gasta e irregular;
  // só então ela é assentada no chão, meio transparente e desfocada. Por cima, as
  // marcas de roda e de pé, fracas e interrompidas, e umas pedrinhas no leito.
  static #paintRoads(context, size) {
    const scale = size / WORLD.width;
    const layer = document.createElement('canvas');
    layer.width = layer.height = size;
    const ink = layer.getContext('2d');
    ink.lineCap = 'round';
    ink.lineJoin = 'round';
    ink.strokeStyle = hex(PALETTE.road);
    ROADS.forEach(road => {
      const points = roadPath(road);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        ink.lineWidth = (a.width + b.width) / 2 * scale;
        ink.beginPath();
        ink.moveTo(a.x * scale, a.y * scale);
        ink.lineTo(b.x * scale, b.y * scale);
        ink.stroke();
      }
    });
    // Falhas e beira gasta: manchas macias apagando a trilha aqui e ali.
    ink.globalCompositeOperation = 'destination-out';
    ROADS.forEach((road, index) => {
      const points = roadPath(road);
      for (let i = 0; i < points.length * 3; i++) {
        const seed = index * 911 + i * 7;
        const point = points[Math.floor(pseudoRandom(seed) * points.length)];
        const side = (pseudoRandom(seed + 1) - .5) * point.width * 1.1;
        const x = (point.x - point.dy * side) * scale, y = (point.y + point.dx * side) * scale;
        const radius = (2 + pseudoRandom(seed + 2) * 6) * scale;
        const blot = ink.createRadialGradient(x, y, 0, x, y, radius);
        const strength = .25 + pseudoRandom(seed + 3) * .55;
        blot.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
        blot.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ink.fillStyle = blot;
        ink.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    });
    context.save();
    context.filter = `blur(${2.2 * scale}px)`;
    context.globalAlpha = .62;
    context.drawImage(layer, 0, 0);
    context.restore();

    // Marcas de roda de carro de boi e trilho de pé: duas linhas finas, fracas, que
    // somem e voltam. Antes de 1500 não havia roda nem carro: as trilhas da mata são
    // só de pé, sem marca nenhuma.
    context.save();
    context.lineCap = 'round';
    context.strokeStyle = hex(PALETTE.roadRut);
    context.lineWidth = 1.4 * scale;
    (TUPI ? [] : ROADS).forEach((road, index) => {
      const points = roadPath(road);
      for (const rut of [-4.5, 4.5]) {
        for (let i = 1; i < points.length; i++) {
          const seed = index * 131 + i * 3 + rut;
          if (pseudoRandom(seed) < .35 || points[i].plaza) continue;
          const a = points[i - 1], b = points[i];
          context.globalAlpha = .12 + pseudoRandom(seed + 1) * .16;
          context.beginPath();
          context.moveTo((a.x - a.dy * rut) * scale, (a.y + a.dx * rut) * scale);
          context.lineTo((b.x - b.dy * rut) * scale, (b.y + b.dx * rut) * scale);
          context.stroke();
        }
      }
    });
    // Pedrinhas soltas no leito.
    context.fillStyle = hex(PALETTE.tile);
    ROADS.forEach((road, index) => {
      const points = roadPath(road).filter(point => !point.plaza);
      for (let i = 0; i < 50; i++) {
        const seed = index * 97 + i * 5;
        const point = points[Math.floor(pseudoRandom(seed) * points.length)];
        const side = (pseudoRandom(seed + 1) - .5) * (point.width - 4);
        const r = (.6 + pseudoRandom(seed + 2) * 1) * scale;
        context.globalAlpha = .35 + pseudoRandom(seed + 3) * .3;
        context.fillRect((point.x - point.dy * side) * scale - r, (point.y + point.dx * side) * scale - r * .7, r * 2, r * 1.4);
      }
    });
    context.restore();
  }
}
