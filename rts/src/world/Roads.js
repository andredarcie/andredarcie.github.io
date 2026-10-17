import { ROADS, ROAD_WIDTH, PLAZA_RADIUS, CENTER } from '../config/rts.js';
import { pseudoRandom } from '../core/math.js';

// As estradas do sertão não eram retas: eram trilhas de terra batida que contornavam
// pedra, grota e moita, alargando aqui e afinando ali. Cada estrada vira um caminho
// sinuoso (pontos de 10 em 10 unidades, da beirada do tabuleiro até o meio), com a
// largura variando ao longo dele. O mesmo caminho serve para pintar o chão, reservar
// o leito, guiar a marcha da tropa e desenhar o mapinha.

const STEP = 10;
// Quanto a trilha se afasta da reta, no máximo, e o quanto ela pode alargar/afinar.
const MEANDER = 34;

function buildPath(road, index) {
  const length = Math.hypot(CENTER.x - road.mouth.x, CENTER.y - road.mouth.y);
  const nx = -road.dir.y, ny = road.dir.x;
  const seed = index * 17.3 + 4.1;
  const phase = [pseudoRandom(seed) * 6.28, pseudoRandom(seed + 1) * 6.28, pseudoRandom(seed + 2) * 6.28];
  const points = [];
  const steps = Math.ceil(length / STEP);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Zero nas duas pontas: a trilha nasce no meio da beirada e chega no meio da praça.
    const envelope = Math.pow(Math.sin(Math.PI * t), .7);
    const wander = Math.sin(t * Math.PI * 2.2 + phase[0]) * .6 + Math.sin(t * Math.PI * 5.3 + phase[1]) * .28 +
      Math.sin(t * Math.PI * 11 + phase[2]) * .12;
    const side = wander * MEANDER * envelope;
    const width = ROAD_WIDTH * (.72 + .32 * (Math.sin(t * Math.PI * 7 + phase[1] * 2) * .5 + .5));
    points.push({
      x: road.mouth.x + road.dir.x * length * t + nx * side,
      y: road.mouth.y + road.dir.y * length * t + ny * side,
      width
    });
  }
  // Rumo local em cada ponto (para a tropa andar de lado na trilha e para as setas).
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    points[i].dx = (b.x - a.x) / d;
    points[i].dy = (b.y - a.y) / d;
    points[i].plaza = Math.hypot(points[i].x - CENTER.x, points[i].y - CENTER.y) < PLAZA_RADIUS;
  }
  return points;
}

const PATHS = new Map(ROADS.map((road, index) => [road, buildPath(road, index)]));

// Os pontos da trilha de uma estrada, da beirada até o meio do mapa.
export function roadPath(road) {
  return PATHS.get(road);
}

// Os pontos da trilha fora da praça: o caminho que a tropa marcha.
export function marchPath(road) {
  return PATHS.get(road).filter(point => !point.plaza);
}

// Um ponto a `distance` da boca da estrada, medido ao longo da trilha.
export function pointAlong(road, distance) {
  const points = PATHS.get(road);
  let left = distance;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= segment) {
      const t = left / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: a.dx, dy: a.dy, width: a.width };
    }
    left -= segment;
  }
  return points.at(-1);
}

// Para onde olhar de (x, y) para ver chegar quem vem pela estrada mais perto: um
// ponto da trilha `ahead` unidades antes do trecho mais próximo, do lado da beirada
// do mapa (a trilha corre da beirada para o meio). A trincheira nasce mirando ali.
export function facingRoad(x, y, ahead = 70) {
  let nearest = null, index = 0, best = Infinity;
  for (const points of PATHS.values()) {
    points.forEach((point, i) => {
      if (point.plaza) return;
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < best) { best = distance; nearest = points; index = i; }
    });
  }
  if (!nearest) return Math.atan2(CENTER.y - y, CENTER.x - x) + Math.PI;
  const target = nearest[Math.max(0, index - Math.round(ahead / STEP))];
  return Math.atan2(target.y - y, target.x - x);
}

// O ponto (x, y) está em cima de alguma estrada, com `pad` de folga de cada lado
// (negativo: só o miolo da trilha)? Só conta o trecho fora da praça: lá dentro é chão
// da vila.
export function onRoad(x, y, pad = 0) {
  for (const points of PATHS.values()) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.plaza && b.plaza) continue;
      const limit = Math.max(a.width, b.width) / 2 + pad;
      if (x < Math.min(a.x, b.x) - limit || x > Math.max(a.x, b.x) + limit ||
        y < Math.min(a.y, b.y) - limit || y > Math.max(a.y, b.y) + limit) continue;
      const vx = b.x - a.x, vy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / (vx * vx + vy * vy)));
      const width = a.width + (b.width - a.width) * t;
      if (Math.hypot(x - a.x - vx * t, y - a.y - vy * t) < width / 2 + pad) return true;
    }
  }
  return false;
}

// O leito das estradas como círculos de chão reservado (SpaceOccupancy): nada de
// cenário nasce em cima. Vai da beirada até a boca da praça, seguindo a trilha.
export function roadReservations() {
  const spots = [];
  for (const points of PATHS.values()) {
    for (const point of points) {
      if (!point.plaza) spots.push({ x: point.x, y: point.y, radius: point.width / 2 + 1 });
    }
  }
  return spots;
}
