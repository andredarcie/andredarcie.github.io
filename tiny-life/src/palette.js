/* Cores. Separadas da configuração de comportamento porque mudam por outro
   motivo: aqui é decisão visual, lá é decisão de simulação.

   Terra batida sob luz de dia, cercada de grama. Em chão claro trilha não
   brilha — ela escurece o solo, que é o que acontece num caminho pisado. */

export const SOIL = '#7e6349';
export const SOIL_LIGHT = [166, 138, 101];  // areia seca
export const SOIL_DARK = [74, 55, 38];      // terra úmida

export const GRASS_BED = '#33481f';
export const GRASS_TONE = [[86, 112, 52], [40, 58, 26]];
export const BLADES = ['#3f5a26', '#4a6a2c', '#587a33', '#65883b', '#2f451c', '#77974c'];
export const GRASS_SHADOW = [26, 32, 15];   // sombra do capim caindo na terra

export const GRIT = [
  'rgba(172, 147, 110, 0.55)',
  'rgba(64, 47, 31, 0.5)',
  'rgba(103, 79, 47, 0.6)'
];
export const NEST_SPOIL = ['rgba(178, 152, 114, 0.5)', 'rgba(88, 66, 44, 0.45)'];

export const SEEDS = ['#cbb083', '#dcc79a', '#b9986a', '#e2d2ab'];

export const HOME_STAIN = [72, 58, 42];     // trilha de ida: terra pisada
export const FOOD_STAIN = [92, 54, 28];     // trilha da comida: barro mais escuro
export const STAIN_ALPHA = 116;             // 0-255, teto da mancha

export const ANT = 'rgba(22, 17, 13, 0.95)';
export const QUEEN = 'rgba(26, 19, 14, 0.97)';
export const BROOD = ['#efe7d4', '#e7dab9', '#d7c197'];  // ovo, larva, pupa
export const LOAD = 'rgba(228, 210, 168, 0.95)';
