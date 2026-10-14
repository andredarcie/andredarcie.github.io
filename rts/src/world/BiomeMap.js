import { WORLD, DESERT_END, TAIGA_END } from '../config/world.js';

// Onde começa e termina cada bioma. As faixas correm em x (deserto, taiga, savana) e
// a fronteira ondula em y; a textura do chão usa a mesma conta, então o que se vê
// bate com onde comida e água realmente aparecem.
export class BiomeMap {
  boundaries(y, width = WORLD.width, height = WORLD.height) {
    const progress = y / Math.max(1, height);
    const firstWave = Math.sin(progress * Math.PI * 2 + .35) * width * .018 +
      Math.sin(progress * Math.PI * 6) * width * .006;
    const secondWave = Math.sin(progress * Math.PI * 2 + 1.8) * width * .017 +
      Math.sin(progress * Math.PI * 8 + .5) * width * .006;
    return {
      desertEnd: width * DESERT_END + firstWave,
      taigaEnd: width * TAIGA_END + secondWave
    };
  }

  biomeAt(x, y) {
    const boundaries = this.boundaries(y);
    if (x < boundaries.desertEnd) return 'desert';
    if (x < boundaries.taigaEnd) return 'taiga';
    return 'savanna';
  }

  // Chance de um recurso vingar no bioma: o deserto quase não segura água nem capim.
  habitatWeight(biome, resource) {
    if (resource === 'water') return biome === 'desert' ? .28 : biome === 'taiga' ? 1 : .72;
    return biome === 'desert' ? .35 : biome === 'taiga' ? .78 : 1;
  }

  // Ruído suave e determinístico: serve tanto para serrilhar a fronteira entre
  // biomas quanto para manchar o tom dentro de cada um. Soma de senos porque
  // precisa rodar um milhão de vezes ao pintar a textura.
  noise(x, y) {
    return Math.sin(x * .031 + Math.sin(y * .017) * 2.1) * .5 +
      Math.sin(y * .026 + Math.sin(x * .021) * 1.7) * .3 +
      Math.sin((x + y) * .052) * .2;
  }
}
