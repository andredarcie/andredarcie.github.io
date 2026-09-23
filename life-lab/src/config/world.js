// Mundo: tamanho, biomas e o que cresce em cada um.

// O mundo é um quadrado fixo. A área (810.000) é quase a mesma da arena antiga em
// tela cheia, então densidade de capim e dinâmica de população não mudam.
export const WORLD = Object.freeze({ width: 900, height: 900 });

export const BIOMES = Object.freeze([
  { id: 'desert', label: 'Deserto', earthShare: 19, worldShare: 1 / 3 },
  { id: 'taiga', label: 'Taiga', earthShare: 11.5, worldShare: 1 / 3 },
  { id: 'savanna', label: 'Savana', earthShare: 10.5, worldShare: 1 / 3 }
]);
export const DESERT_END = BIOMES[0].worldShare;
export const TAIGA_END = BIOMES[0].worldShare + BIOMES[1].worldShare;

export const GROUND_TEXTURE_SIZE = 1024;
export const SURROUNDING_TEXTURE_SIZE = 1024;
// O terreno continua além da área dos bichos, até longe o bastante para nenhum
// zoom mostrar o fim dele.
export const SURROUNDING_SCALE = 5;
// Profundidade da mata que emoldura a área dos bichos, medida da borda para fora.
export const BORDER_FOREST_DEPTH = 200;

// Vegetação por bioma. A densidade não copia o habitatWeight de propósito: a taiga é
// a mais fechada em árvore e a savana a mais aberta, ainda que seja a savana que
// produz mais capim. Mato alto não é pasto.
export const SCENERY_DENSITY = Object.freeze({ desert: .3, taiga: .8, savanna: .6 });
export const SCENERY_KINDS = Object.freeze({
  desert: [['cactus', .42], ['rock', .84], ['shrub', 1]],
  taiga: [['conifer', .74], ['shrub', .9], ['rock', 1]],
  savanna: [['broadleaf', .6], ['shrub', .92], ['rock', 1]]
});

// Passo máximo da simulação: o tempo de cada quadro é fatiado nisso.
export const MAX_SIMULATION_STEP = .025;
// Ritmo base do jogo: o "1×" do slider já roda a simulação no dobro do tempo real.
// O slider multiplica em cima disto.
export const BASE_SIMULATION_SPEED = 2;
