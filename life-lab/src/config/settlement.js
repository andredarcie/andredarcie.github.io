// Fogueiras, madeira e cabanas.

// Fogueira: tribo com gente suficiente acende uma ao anoitecer, no meio do bando,
// e dorme em roda com os pés virados para o fogo. O fogo esquenta (energia volta
// mais rápido e o corpo gasta menos) e ilumina (em volta dele se enxerga quase
// como de dia). Chuva apaga; de manhã vira brasa e some.
export const CAMPFIRE_MIN_TRIBE = 4;
// Metade do limite de antes, junto com o mundo pela metade.
export const MAX_CAMPFIRES = 2;
export const CAMPFIRE_START_LIGHT = .45;
export const CAMPFIRE_END_LIGHT = .65;
// Quanto antes da própria hora de deitar o bicho já vai sentar perto do fogo.
export const CAMPFIRE_GATHER_LEAD = .18;
export const CAMPFIRE_WARM_RADIUS = 60;
export const CAMPFIRE_LIGHT_RADIUS = 110;
export const CAMPFIRE_REST_BONUS = .45;
export const CAMPFIRE_METABOLISM_CUT = .25;
export const CAMPFIRE_SEAT_TOLERANCE = 6;

// Madeira e abrigo. As árvores da taiga e da savana são recurso. Quem ainda não tem
// teto (nem a tribo dele) corta árvore de dia, carrega as toras uma a uma e ergue
// uma cabana de toras. Dormir dentro rende muito mais do que no chão ou no fogo.
// Um golpe de machado a cada 1,8 s de simulação; o impacto cai a 68% do ciclo, no
// fim da descida rápida, e é nesse instante que a árvore sente o golpe.
export const CHOP_SWING = 1.8;
export const CHOP_IMPACT = CHOP_SWING * .68;
export const CHOP_HITS = 5;
export const CHOP_REACH = 9;
export const ENERGY_PER_SWING = 1.2;
// Queda de um tronco rígido girando na base: aceleração angular proporcional ao
// seno do ângulo (g·3/2L). Começa quase de pé, então demora a pegar embalo e
// desaba no fim, que é o que se vê de verdade quando uma árvore cai.
export const TREE_FALL_GRAVITY = 1.6;
export const TREE_DOWN_TIME = 1.6;
// Uma árvore rende exatamente uma cabana: 4 toras.
export const LOGS_PER_TREE = 4;
// Toco rebrota: depois de 2 dias vira muda, que leva 1 dia para virar árvore.
export const TREE_REGROW_DAYS = 2;
export const TREE_GROW_DAYS = 1;
// Árvore é grande: dá para ver de longe, bem além do cone de visão comum.
export const TREE_LANDMARK_RANGE = 320;
export const HUT_LOGS = 4;
// Uma cabana por tribo, e a tribo inteira sempre cabe: a cabana cresce junto com
// ela (hutSize). Nunca é menor que 4 vagas, então sobra lugar para um andarilho.
export const HUT_MIN_CAPACITY = 4;
export const MAX_HUTS = 2;
export const HUT_DOOR_TOLERANCE = 6;
export const HUT_SEEK_RANGE = 380;
// Dentro da cabana a energia volta 2,2× mais rápido e o corpo gasta 35% menos.
export const HUT_REST_BONUS = 1.2;
export const HUT_METABOLISM_CUT = .35;
export const WORK_MIN_ENERGY = 25;
export const WORK_MIN_LIGHT = .5;
// Tora no ombro: anda 20% mais devagar e cansa 30% mais.
export const CARRY_SPEED = .8;
export const CARRY_ENERGY = 1.3;
