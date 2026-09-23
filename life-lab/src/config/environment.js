// Capim, poças e chuva.

export const GRASS_MIN_COUNT = 24;
export const GRASS_MAX_COUNT = 64;
// Uma moita a cada 15.000 de área: 54 na ilha de 900 × 900. Com 24 (uma a cada
// 40.000) o bicho com fome ficava em média a 210 da moita mais próxima, o dobro
// do alcance da visão, e morria procurando com capim sobrando no mapa.
export const GRASS_AREA_PER_PATCH = 15000;
// Moita comida renasce em 4 a 10 s (era 8 a 20). Com 54 moitas e a população
// passando de 25, o capim repunha menos do que se comia e a fome voltava.
export const GRASS_REGROW_MIN = 4;
export const GRASS_REGROW_SPREAD = 6;

export const POND_COUNT = 5;
export const RAIN_START_RATIO = .3;
export const RAIN_CRISIS_THIRST = 30;
export const RAIN_CRISIS_SHARE = .25;
export const RAIN_HYDRATION_RATE = 8;
// Segundos para uma poça ir do seco ao cheio debaixo de chuva. Mais curto que
// RAIN_DURATION, para a chuva ainda passar um tempo sobre a poça já cheia.
export const RAIN_FILL_TIME = 3.4;
// Intervalo entre o surgimento de poças novas durante a chuva.
export const RAIN_POND_INTERVAL = .9;
export const RAIN_DURATION = 5;
