// A Chama Primordial: o único fogo que não apaga. Existe uma só na ilha; quem a
// carrega ilumina e aquece em volta, e a tribo dele acende fogueira sem precisar de
// gente bastante e sem a chuva apagar. Os outros povos a tomam à força.

// Luz e calor em volta de quem carrega (ou de onde ela caiu), na mesma escala das
// fogueiras: a luz em fração do dia, o calor de 0 a 1.
export const FLAME_LIGHT_RADIUS = 130;
export const FLAME_LIGHT = .95;
export const FLAME_WARM_RADIUS = 70;
// Tribo guardiã: fogueira com só este tanto de gente, e a chuva não apaga.
export const FLAME_CAMPFIRE_MIN_TRIBE = 2;
// Distância para pegar a chama do chão.
export const FLAME_PICKUP_RANGE = 10;
// Sem fome ou sede abaixo disto ninguém larga a busca da comida pela chama.
export const FLAME_MIN_NEED = 30;

// Combate corpo a corpo (alcance, dano e ritmo de cada arma: config/combat.js).
export const STRIKE_ENERGY = 1.6;
// A cada golpe em quem carrega, chance de a chama cair da mão.
export const FLAME_DROP_CHANCE = .25;
// Para atacar: vida e energia mínimas.
export const ATTACK_MIN_LIFE = 45;
export const ATTACK_MIN_ENERGY = 25;
// Quantos agressores no máximo em cima do mesmo alvo.
export const MAX_ATTACKERS = 3;
// Aliados até esta distância correm para defender quem carrega a chama.
export const DEFEND_RANGE = 120;
// A briga acaba quando os dois se afastam além disto, ou quando passa este tempo
// sem golpe de nenhum dos lados.
export const FIGHT_LEASH = 150;
export const FIGHT_IDLE_TIMEOUT = 5;
// Depois de uma briga, um tempo sem procurar outra.
export const FIGHT_COOLDOWN = 8;
// Quanto dura o lampejo de dor (e o recuo do corpo) de quem apanha, em segundos.
export const HURT_FLASH = .35;
