import * as THREE from 'three';
import { hillHeight } from '../world/Hills.js';
import { TUPI } from '../config/mission.js';
import { WORLD } from '../config/world.js';

// Os bichos do sertão que Os Sertões põe em volta de Canudos, só de cena (a simulação
// não sabe deles): as cabras do arraial — "tangiam os rebanhos de cabras" —, que
// pastam em volta do curral (ou, antes de ter curral, num canto da praça), e os
// urubus, que chegam rodando alto sobre os mortos das batalhas e vão embora quando
// não há mais o que esperar. Andam no relógio da partida: param com o jogo parado.

const GOATS = 6;
// Raio em que o rebanho pasta em volta de casa, e a passo de quê.
const HERD_RANGE = 34;
const GOAT_WALK = 5;
// Urubus: no máximo tantos, rodando a esta altura e neste raio sobre os corpos.
const MAX_VULTURES = 6;
const SOAR_HEIGHT = [70, 105];
const SOAR_RADIUS = [18, 40];
const VULTURE_SPEED = 60;

const GOAT_COATS = [
  { body: 0x8a5a36, belly: 0x2c2420 },
  { body: 0xe8e0d0, belly: 0xb8ab96 },
  { body: 0x3a3028, belly: 0x6a5240 },
  { body: 0xb88a58, belly: 0x3a2c22 }
];

const material = (() => {
  const cache = new Map();
  return color => {
    if (!cache.has(color)) cache.set(color, new THREE.MeshLambertMaterial({ color }));
    return cache.get(color);
  };
})();

function part(geometry, color, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// Cabra sertaneja (~60 cm na cernelha, 6 unidades): corpo, pescoço erguido, cabeça
// com chifres para trás e orelha caída, rabinho em pé e as quatro pernas finas,
// cada uma num pivô no quadril para andar.
function goatModel(coat) {
  const goat = new THREE.Group();
  const body = new THREE.Group();
  goat.add(body);
  // Corpo baixo e roliço sobre pernas curtas; o pescoço sai para a frente.
  body.add(part(new THREE.BoxGeometry(2.3, 2, 4.4), coat.body, 0, 4.1, 0));
  body.add(part(new THREE.BoxGeometry(2, .6, 3.8), coat.belly, 0, 3.1, 0));
  const head = new THREE.Group();
  head.position.set(0, 4.6, 2);
  body.add(head);
  const neck = part(new THREE.BoxGeometry(1, 1.8, 1.1), coat.body, 0, .6, .4);
  neck.rotation.x = .55;
  head.add(neck);
  head.add(part(new THREE.BoxGeometry(1.1, 1, 1.9), coat.body, 0, 1.5, 1.3));
  head.add(part(new THREE.BoxGeometry(.65, .65, .7), coat.belly, 0, 1.3, 2.4));
  // Barbicha de bode.
  head.add(part(new THREE.BoxGeometry(.3, .6, .3), coat.belly, 0, .8, 2.2));
  for (const side of [-1, 1]) {
    const horn = part(new THREE.BoxGeometry(.22, .22, 1.4), 0x3a3430, side * .3, 2.3, .7);
    horn.rotation.x = .9;
    head.add(horn);
    const ear = part(new THREE.BoxGeometry(1, .22, .45), coat.belly, side * .75, 1.6, 1);
    ear.rotation.z = side * -.6;
    head.add(ear);
  }
  const tail = part(new THREE.BoxGeometry(.32, .9, .32), coat.belly, 0, 5.2, -2.2);
  tail.rotation.x = -.5;
  body.add(tail);
  const legs = [];
  for (const [x, z] of [[-.7, 1.6], [.7, 1.6], [-.7, -1.6], [.7, -1.6]]) {
    const hip = new THREE.Group();
    hip.position.set(x, 3.1, z);
    hip.add(part(new THREE.BoxGeometry(.42, 3.1, .42), coat.belly, 0, -1.55, 0));
    body.add(hip);
    legs.push(hip);
  }
  goat.userData = { head, legs };
  return goat;
}

// Urubu-de-cabeça-preta (asas de ~1,4 m): corpo preto, cabeça cinza nua, cauda curta
// e as asas largas de ponta franjada, em leve V. Plana quase sem bater asa.
function vultureModel() {
  const bird = new THREE.Group();
  bird.add(part(new THREE.BoxGeometry(1.6, 1.4, 4.2), 0x1c1a1a, 0, 0, 0));
  bird.add(part(new THREE.BoxGeometry(.8, .8, 1.1), 0x4a4644, 0, .2, 2.5));
  bird.add(part(new THREE.BoxGeometry(1.8, .3, 1.6), 0x1c1a1a, 0, 0, -2.6));
  const wings = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * .7, .2, .3);
    hinge.add(part(new THREE.BoxGeometry(4.2, .25, 2.6), 0x201d1c, side * 2.1, 0, 0));
    // A ponta mais clara por baixo, com as rêmiges abertas.
    hinge.add(part(new THREE.BoxGeometry(3, .2, 1.9), 0x3a3634, side * 5.6, 0, -.2));
    bird.add(hinge);
    wings.push({ hinge, side });
  }
  bird.userData = { wings };
  return bird;
}

export class FaunaRenderer {
  #layer;
  #space;
  #goats = [];
  #vultures = [];
  #last = null;

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(state, { elapsed = 0, animate = true } = {}) {
    const dt = this.#last === null ? 0 : Math.max(0, Math.min(.1, elapsed - this.#last));
    this.#last = elapsed;
    this.#herd(state, dt, elapsed, animate);
    this.#soar(state, dt, elapsed, animate);
  }

  // ---- Cabras ----

  #home(state) {
    const pen = state.buildings.find(b => b.kind === 'curral' && b.team === 'player' && b.life > 0);
    if (pen) return { x: pen.x + 26, y: pen.y + 18 };
    const hall = state.buildings.find(b => b.kind === 'hall');
    if (!hall) return null;
    const angle = Math.PI * .75;
    return { x: hall.x + Math.cos(angle) * 150, y: hall.y + Math.sin(angle) * 150 };
  }

  #herd(state, dt, elapsed, animate) {
    // Na aldeia tupinambá não há bicho de criação: "Nem há aqui boi ou vaca, cabra,
    // ovelha ou galinha" (Caminha, 1500).
    if (TUPI) return;
    const home = this.#home(state);
    if (!home) return;
    while (this.#goats.length < GOATS) {
      const i = this.#goats.length;
      const view = goatModel(GOAT_COATS[i % GOAT_COATS.length]);
      view.scale.setScalar(i === 0 ? 1.15 : i > 3 ? .75 : 1);
      this.#layer.add(view);
      const angle = i / GOATS * Math.PI * 2;
      this.#goats.push({
        view, x: home.x + Math.cos(angle) * 12, y: home.y + Math.sin(angle) * 12,
        heading: angle, target: null, rest: Math.random() * 3, stride: Math.random() * 6
      });
    }
    for (const goat of this.#goats) {
      if (goat.rest > 0) {
        goat.rest -= dt;
      } else {
        if (!goat.target || Math.hypot(goat.target.x - home.x, goat.target.y - home.y) > HERD_RANGE * 1.5) {
          const angle = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * HERD_RANGE;
          goat.target = { x: home.x + Math.cos(angle) * r, y: home.y + Math.sin(angle) * r };
        }
        const dx = goat.target.x - goat.x, dy = goat.target.y - goat.y;
        const d = Math.hypot(dx, dy);
        // Longe de casa (o curral mudou de lugar), vai num trote.
        const speed = Math.hypot(goat.x - home.x, goat.y - home.y) > HERD_RANGE * 2 ? GOAT_WALK * 3 : GOAT_WALK;
        if (d < 1) {
          goat.target = null;
          goat.rest = 2 + Math.random() * 6;
        } else {
          const step = Math.min(d, speed * dt);
          goat.x += dx / d * step;
          goat.y += dy / d * step;
          goat.heading = Math.atan2(dy, dx);
          goat.stride += step * .9;
        }
      }
      const place = this.#space.toScene(goat.x, goat.y);
      const view = goat.view;
      view.position.set(place.x, hillHeight(goat.x, goat.y), place.z);
      view.rotation.y = Math.PI / 2 - goat.heading;
      const walking = goat.rest <= 0 && goat.target;
      const { head, legs } = view.userData;
      legs.forEach((leg, k) => {
        leg.rotation.x = walking && animate ? Math.sin(goat.stride + (k === 0 || k === 3 ? 0 : Math.PI)) * .5 : 0;
      });
      // Parada, pasta: a cabeça desce ao chão e sobe de vez em quando.
      const graze = !walking && animate ? (Math.sin(elapsed * .7 + goat.stride) > -.3 ? 1 : 0) : 0;
      head.rotation.x += ((graze ? 1.25 : 0) - head.rotation.x) * Math.min(1, dt * 4);
    }
  }

  // ---- Urubus ----

  // Onde os urubus rodam: em cima do monte de mortos mais recente.
  #carrion(state) {
    const corpses = state.corpses;
    if (!corpses.length) return null;
    const last = corpses[corpses.length - 1];
    let x = 0, y = 0, n = 0;
    for (const corpse of corpses) {
      if (Math.hypot(corpse.x - last.x, corpse.y - last.y) > 90) continue;
      x += corpse.x;
      y += corpse.y;
      n++;
    }
    return { x: x / n, y: y / n, wanted: Math.min(MAX_VULTURES, 1 + Math.floor(corpses.length / 3)) };
  }

  #soar(state, dt, elapsed, animate) {
    const carrion = this.#carrion(state);
    const wanted = carrion?.wanted ?? 0;
    const active = this.#vultures.filter(v => !v.leaving);
    // Chegam de longe, de fora do tabuleiro.
    while (active.length < wanted) {
      const view = vultureModel();
      this.#layer.add(view);
      const from = Math.random() * Math.PI * 2;
      const vulture = {
        view,
        position: new THREE.Vector3(Math.cos(from) * WORLD.width * .6, SOAR_HEIGHT[1] + 40, Math.sin(from) * WORLD.height * .6),
        radius: SOAR_RADIUS[0] + Math.random() * (SOAR_RADIUS[1] - SOAR_RADIUS[0]),
        height: SOAR_HEIGHT[0] + Math.random() * (SOAR_HEIGHT[1] - SOAR_HEIGHT[0]),
        phase: Math.random() * Math.PI * 2,
        turn: (.25 + Math.random() * .15) * (Math.random() < .3 ? -1 : 1),
        leaving: false, away: null
      };
      this.#vultures.push(vulture);
      active.push(vulture);
    }
    // Sobrando, os últimos a chegar vão embora.
    for (let i = wanted; i < active.length; i++) {
      const v = active[i];
      v.leaving = true;
      const out = Math.atan2(v.position.z, v.position.x);
      v.away = new THREE.Vector3(Math.cos(out) * WORLD.width * 1.4, SOAR_HEIGHT[1] + 60, Math.sin(out) * WORLD.height * 1.4);
    }
    const center = carrion ? this.#space.toScene(carrion.x, carrion.y) : null;
    const goal = new THREE.Vector3();
    for (const v of this.#vultures) {
      if (v.leaving || !center) {
        if (!v.away) v.away = new THREE.Vector3(v.position.x * 3, SOAR_HEIGHT[1] + 60, v.position.z * 3);
        goal.copy(v.away);
      } else {
        v.phase += v.turn * dt;
        goal.set(center.x + Math.cos(v.phase) * v.radius, v.height + Math.sin(elapsed * .3 + v.radius) * 4,
          center.z + Math.sin(v.phase) * v.radius);
      }
      const delta = goal.sub(v.position);
      const distance = delta.length();
      const step = Math.min(distance, VULTURE_SPEED * dt);
      if (distance > 1e-3) {
        v.position.addScaledVector(delta, step / distance);
        // De frente para onde vai, inclinado na curva.
        v.view.rotation.set(0, Math.atan2(delta.x, delta.z), 0);
        v.view.rotateZ(v.leaving ? 0 : -Math.sign(v.turn) * .35);
      }
      v.view.position.copy(v.position);
      // Plana com as asas em V; de tempos em tempos, umas batidas.
      const flap = animate && Math.sin(elapsed * .5 + v.radius) > .85 ? Math.sin(elapsed * 9 + v.radius) * .45 : 0;
      for (const { hinge, side } of v.view.userData.wings) hinge.rotation.z = side * (.12 + flap);
    }
    this.#vultures = this.#vultures.filter(v => {
      const gone = (v.leaving || !center) && v.position.distanceTo(v.away) < 5;
      if (gone) this.#layer.remove(v.view);
      return !gone;
    });
  }
}
