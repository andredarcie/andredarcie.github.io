// Astronomia de bolso: onde estão o sol e a lua a cada instante da ilha. Nada aqui
// sabe de three.js; a simulação usa a mesma conta para saber quanto os bichos
// enxergam, e a cena para acender a luz. As fórmulas são as de posição solar de
// verdade (hora angular, declinação, latitude), só com o relógio comprimido.

// O relógio do céu não é o da simulação: ele anda 1× de dia e 3× de noite (ver
// skyRate), então a noite, que é quase só sono, passa depressa. Em tempo do céu um
// dia dura 144 s; de dia uma hora leva 6 s, de noite 2 s. Com isso um dia inteiro
// dá uns 100 s de simulação, e todo bicho atravessa algumas noites na vida.
export const DAY_LENGTH = 144;
export const NIGHT_SPEEDUP = 3;
// Ano curto para as estações aparecerem numa sessão: o dia encurta no inverno e
// o sol do meio-dia sobe e desce, como acontece de fato fora do equador.
export const YEAR_LENGTH = 16;
// Trópico de Capricórnio, perto de São Paulo. No hemisfério sul o sol do meio-dia
// fica ao norte, e a lua crescente aparece iluminada do lado esquerdo.
const LATITUDE = -23.4 * Math.PI / 180;
const OBLIQUITY = 23.44 * Math.PI / 180;
const LUNAR_MONTH = 10;
// A ilha abre de manhã cedo, na primavera, com lua perto de cheia.
const START_HOUR = 6.2;
const START_YEAR = .5;
const START_MOON = .42;

const DEG = 180 / Math.PI;

// Direção local em (leste, norte, cima) de um astro com declinação e hora angular
// dadas. Hora angular zero é a passagem pelo meridiano; positiva é depois dele.
function localDirection(declination, hourAngle) {
  const cosDec = Math.cos(declination), sinDec = Math.sin(declination);
  const cosLat = Math.cos(LATITUDE), sinLat = Math.sin(LATITUDE);
  const east = -cosDec * Math.sin(hourAngle);
  const north = sinDec * cosLat - cosDec * Math.cos(hourAngle) * sinLat;
  const up = sinDec * sinLat + cosDec * Math.cos(hourAngle) * cosLat;
  return { east, north, up, altitude: Math.asin(Math.max(-1, Math.min(1, up))) * DEG };
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const SEASONS = ['outono', 'inverno', 'primavera', 'verão'];

// Quantos segundos de céu passam por segundo de simulação agora. Acompanha a
// claridade, então o crepúsculo acelera aos poucos em vez de dar um tranco.
export function skyRate(sky) {
  return 1 + (NIGHT_SPEEDUP - 1) * (1 - sky.daylight);
}

// `time` é o tempo do céu, acumulado com skyRate — não o tempo da simulação.
export function skyAt(time) {
  const days = time / DAY_LENGTH + START_HOUR / 24;
  const day = Math.floor(days);
  const hour = (days - day) * 24;
  // Fração zero é o equinócio de março: no sul, começo do outono. A declinação é a
  // senoide do ano, e é ela que muda a duração do dia e a altura do sol.
  const year = (days / YEAR_LENGTH + START_YEAR) % 1;
  const declination = OBLIQUITY * Math.sin(year * Math.PI * 2);
  const hourAngle = (hour - 12) / 24 * Math.PI * 2;
  const sun = localDirection(declination, hourAngle);

  // A lua atrasa em relação ao sol conforme a fase: nova junto dele, cheia do lado
  // oposto do céu — por isso a cheia nasce quando o sol se põe. No oposto da
  // eclíptica a declinação também se inverte.
  const phase = (days / LUNAR_MONTH + START_MOON) % 1;
  const moonDeclination = OBLIQUITY * Math.sin((year + phase) * Math.PI * 2);
  const moon = localDirection(moonDeclination, hourAngle - phase * Math.PI * 2);
  const illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2;

  // Claridade: o crepúsculo civil (até 6° abaixo do horizonte) ainda é bem claro, e
  // só depois do náutico a noite fecha de verdade.
  const daylight = smoothstep(-10, 8, sun.altitude);
  const moonlight = smoothstep(-2, 20, moon.altitude) * illumination * (1 - daylight);

  let period;
  if (sun.altitude < -8) period = 'noite';
  else if (sun.altitude < 4) period = hour < 12 ? 'amanhecer' : 'anoitecer';
  else period = hour < 12 ? 'manhã' : 'tarde';

  return {
    day: day + 1, hour, period, year,
    season: SEASONS[Math.floor(year * 4) % 4],
    sun, moon, phase, illumination, daylight, moonlight
  };
}
