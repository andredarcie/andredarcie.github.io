/* tiny life — colônia de formigas minimalista.
 *
 * Este arquivo só monta as peças e toca o laço. A lógica está nos módulos:
 *
 *   world        junta terreno, feromônios, comida e colônia
 *   terrain-*    a forma do terreiro e o retrato assado dele
 *   colony/ant   quem nasce, quem morre e como cada uma anda
 *   renderer     desenha, e só desenha
 *   hud          a única peça que toca o DOM fora do canvas
 */

import { World } from './world.js';
import { Renderer } from './renderer.js';
import { Telemetry } from './telemetry.js';
import { Hud } from './hud.js';

const canvas = document.getElementById('scene');
const world = new World();
const renderer = new Renderer(canvas);
const telemetry = new Telemetry();

const hud = new Hud({
  onReset: () => {
    world.reset();
    telemetry.reset();
  },
  onToggleTrails: () => {
    renderer.showTrails = !renderer.showTrails;
    hud.setTrails(renderer.showTrails);
  }
});

let running = true;
let crashed = false;
let last = 0;
let sinceSample = 0;

function layout() {
  const width = Math.max(320, window.innerWidth);
  const height = Math.max(320, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  renderer.resize(width, height, dpr);
  world.resize(width, height);
  renderer.syncTo(world);
  console.info('[tiny life] terreno assado em', world.ground.bakeMs, 'ms');
}

function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;

  world.update(dt);
  renderer.draw(world);

  // O painel anda a 4 Hz: mais que isso o número fica ilegível e o custo de
  // escrever no DOM aparece.
  sinceSample += dt;
  if (sinceSample >= 0.25) {
    hud.render(telemetry.sample(world, sinceSample));
    sinceSample = 0;
  }
}

function frame(now) {
  if (!running) return;
  try {
    step(now);
  } catch (err) {
    fail(err);
    return;
  }
  requestAnimationFrame(frame);
}

function fail(err) {
  console.error('[tiny life]', err);
  running = false;
  crashed = true;
  hud.showError(err);
}

// --- entrada ----------------------------------------------------------------

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  world.dropFood(e.clientX - r.left, e.clientY - r.top);
  hud.dismissHint();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') world.reset();
  if (e.key === 't' || e.key === 'T') hud.btnTrails.click();
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (crashed) return;
    try {
      layout();
    } catch (err) {
      fail(err);
    }
  }, 150);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
  } else if (!running && !crashed) {
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
});

try {
  layout();
  world.reset();
  last = performance.now();
  requestAnimationFrame(frame);
} catch (err) {
  fail(err);
}
