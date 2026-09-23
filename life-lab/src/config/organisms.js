// Corpo, movimento, necessidades e sono dos bichos.

export const LIFE_SIZE = 10;
// Altura do boneco em unidades da cena; o nome e os balões ancoram nela.
export const CHARACTER_HEIGHT = 16;
export const VISION = 105;
export const VISION_ANGLE = 120;
export const WALK_SPEED = 34;
export const RUN_SPEED = 84;
export const ACCELERATION = 145;
export const BRAKING = 190;
export const DRINK_RATE = 32;
export const BASE_HUNGER_DRAIN = 1.15;
export const BASE_THIRST_DRAIN = 1.45;
export const MOVEMENT_HUNGER_COST = .9;
export const MOVEMENT_THIRST_COST = 1.2;
export const VISION_ENERGY_LINEAR_COST = .18;
export const VISION_ENERGY_EXTREME_COST = .12;
export const VISION_ENERGY_MIN_MULTIPLIER = .88;
export const VISION_ENERGY_MAX_MULTIPLIER = 1.25;
export const VISION_RANGE_ANGLE_PENALTY = 30;
export const NEED_RESOURCE_THRESHOLD = 78;
// Beliscar: abaixo desta fome, capim visível a até esta distância é comido de
// passagem, mesmo sem o bicho estar procurando comida.
export const GRAZE_HUNGER = 90;
export const GRAZE_RANGE = 45;
export const SEARCH_GRID_SIZE = 3;
export const SEARCH_SCAN_DURATION = 1.65;
export const SEARCH_SCAN_SPEED = Math.PI * 2 / SEARCH_SCAN_DURATION;
export const SEARCH_ARRIVAL_RADIUS = 20;

// Idade conta em dias do céu, não em segundos de simulação: a vida de um bicho
// atravessa vários dias e noites, e como a noite passa 3× mais rápido, ela também
// envelhece 3× mais rápido no relógio da simulação — um dia é um dia. Amadurece
// em ~1 dia, fica velho perto do 5º e a velhice consome a vida em ~0,6 dia.
export const INFANT_AGE = 1;
export const ELDER_AGE = 5;
export const ELDER_DECLINE_PER_DAY = 170;

// Energia: só o esforço gasta — andar (correr custa mais que o dobro de andar) e
// acasalar. Parado não gasta, e só dormindo ela volta. A noite passa 3× mais
// rápido, então a recuperação é bem mais veloz que o gasto: uma noite inteira
// devolve o que um dia inteiro gastou. Dormindo o metabolismo cai, e é por isso
// que dá para atravessar a noite sem acordar faminto.
// Calibrado pelo orçamento de uma noite (~80 de energia): andar custa 0,5/s e
// correr ~1,7/s, então um dia com busca de comida gasta ~70. Com 1 e 0,9 a
// corrida custava 4,7/s e quem saía atrás de capim apagava antes de achar.
export const ENERGY_WALK_COST = .5;
export const ENERGY_MOVE_COST = .4;
export const ENERGY_SEX_RATE = 7;
export const MATE_MIN_ENERGY = 35;
export const ENERGY_RECOVERY = 3.2;
// Fisiologia do sono. A fome quase para (o corpo em jejum noturno gasta pouco e a
// sensação só volta ao acordar); a sede não: a água continua indo embora pela
// respiração e pelo suor, então ela cai quase no dobro do ritmo da fome e é o
// motivo mais comum de acordar no meio da noite, de boca seca.
export const SLEEP_HUNGER_RATE = .3;
export const SLEEP_THIRST_RATE = .55;
// Só vai dormir quem não está apertado (abaixo disto, a necessidade vence o sono).
// Com sono, a fome e a sede acima disso não são mais sentidas como urgência: o
// bicho vai para a cama em vez de sair procurando comida no escuro.
export const SLEEP_MIN_NEED = 32;
// Dormindo, a percepção cai: só uma fome extrema tira da cama; a sede, que o corpo
// não para de produzir, acorda um pouco antes.
export const SLEEP_WAKE_HUNGER = 6;
export const SLEEP_WAKE_THIRST = 12;
export const SLEEP_WAKE_ENERGY = 15;
// Acordou com sede abaixo disto: boca seca.
export const DRY_MOUTH_THIRST = 45;
// Cansado anda mais devagar: abaixo deste nível a passada vai encurtando.
export const FATIGUE_ENERGY = 35;

// Dia e noite pesam na simulação: no escuro o olho alcança menos — sem lua, menos da
// metade —, o que dá à seleção um motivo novo para favorecer visão longa.
export const NIGHT_SIGHT = .45;
export const MOON_SIGHT = .25;
