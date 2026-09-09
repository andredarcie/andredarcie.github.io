/* Números que definem o comportamento da simulação.
   Ficam fora das classes de propósito: dá pra reajustar o bicho inteiro aqui sem
   abrir uma linha de lógica. */

// Marchas. O andar é run-and-tumble: corrida curta -> parada seca ou virada
// brusca -> corrida de novo. Velocidade constante é o que dá aspecto de
// plâncton à deriva.
export const RUN = 0;
export const PAUSE = 1;
export const PIVOT = 2;

// --- locomoção ---
export const CRUISE = 46;         // px/s de referência (cada formiga varia em volta disso)
export const TURN = 5.5;          // rad/s ao corrigir o rumo pelo feromônio
export const HOME_TURN = 1.2;     // rad/s de "senso de direção" do ninho
export const DRIFT_DECAY = 2.6;   // 1/s — memória do ruído de rumo (Ornstein-Uhlenbeck)
export const DRIFT_NOISE = 5.2;
export const SENSE_DIST = 11;     // px até cada sensor
export const SENSE_ANGLE = 0.62;  // rad entre sensor central e laterais
export const LOOK_AHEAD = 16;     // px que ela enxerga de mato à frente

// --- feromônio ---
export const TRAIL_LIFE = 42;     // s até o rastro de uma formiga virar nada
export const TAU_HOME = 17;       // s — constante de evaporação da trilha de ida
export const TAU_FOOD = 11;       // s — a da trilha de comida, que é mais volátil
export const TRAIL_CAP = 1.6;     // teto por célula

// --- colônia ---
export const NEST_R = 13;
export const MIN_FOODS = 3;
export const MAX_FOODS = 6;
export const MIN_ANTS = 14;       // abaixo disso a colônia ganha reforço de graça
export const LIFE_SPAN = [130, 280];
export const POP_PER_PX = 4200;   // px² de terra por formiga no teto de população
export const POP_RANGE = [110, 700];

// --- rainha e cria ---
// Estágios da cria. ADULT não é um estágio: é a saída, o momento em que a pupa
// vira operária e some da pilha.
export const EGG = 0;
export const LARVA = 1;
export const PUPA = 2;
export const ADULT = 3;

export const EGG_COST = 5;              // grãos guardados por ovo
export const LAY_INTERVAL = [0.5, 1.2]; // s entre uma postura e a próxima
export const BROOD_STAGES = [7, 9, 11]; // s em cada estágio (±20% por indivíduo)
export const CHAMBER_OFF = 13;          // px da entrada até a câmara de cria
export const CHAMBER_R = 9;             // px que a rainha se permite andar
export const QUEEN_SPEED = 5;           // px/s — ela quase não sai do lugar

// --- encontros ---
export const TOUCH_DIST = 4;      // px — distância de antenação entre duas formigas
export const HASH_CELL = 12;      // px — célula da grade que acha os vizinhos

// --- terreno ---
export const SHAPE_N = 2.6;       // expoente da superelipse do terreiro
export const GRASS_MARGIN = 0.11; // fração do menor lado ocupada por grama
export const GRASS_MARGIN_RANGE = [34, 130];
export const GRID_CELL = 6;       // px por célula de feromônio
export const GRID_CELL_BIG = 8;   // idem, em telas muito grandes
export const BIG_SCREEN = 2600000; // px² a partir de onde a célula cresce
