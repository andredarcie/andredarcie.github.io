import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { easeInOut } from '../core/math.js';
import { addVerticalShade } from './Shading.js';
import { createContactShadow } from './ContactShadow.js';
import { CENTER, TOWER, CLOTH, SKIN_TONES } from '../config/rts.js';
import { hillHeight } from '../world/Hills.js';
import { bowModel, bowString, stringTo, BOW } from './WeaponModels.js';
import { ghostify, disposeGhost } from './GhostLook.js';
import { PALMARES } from '../config/mission.js';

// A "cerca de seteiras" da aldeia tupinambá, a torre da missão (no lugar da
// trincheira de Canudos): "uma cerca de pau a pique muito forte, com suas portas e
// seteiras" (Gabriel Soares, cap. CLI). Um arco de troncos fincados lado a lado, de
// ponta afiada, amarrados com cipó a duas travessas, virado para fora; a abertura
// fica do lado da aldeia. Algumas fendas entre os troncos são as seteiras. Atrás,
// os flecheiros (um a mais por nível de "pontas"); com o jirau, um deles atira lá de
// cima; com a rede de madeira, a cerca baixa de fora, "afastado da cerca vinte e
// trinta palmos", onde quem chega se embaraça.
//
// Nos Palmares é a mesma cerca: o Macaco estava "fortificado com uma cêrca de pau a
// pique, com torneiras abertas para ofender a seu salvo os combatentes; e pela parte
// de fora tôda se semêa de estrepes de ferro, e de fojos" (Relação das guerras feitas
// aos Palmares, 1678). Os defensores atiram "balas, flechas e pedras" (1694): aqui,
// flecheiros de tanga de entrecasca, sem pena nem pintura. No lugar da rede de
// madeira, o campo de estrepes (paus de ponta virados para fora) e os fojos.

// Raio do arco de troncos, quantos troncos e a abertura (radianos) do lado da aldeia.
const RING = 8.6;
const LOGS = 24;
const GAP = .9;
const LOG_HEIGHT = 9.5;
// Onde a rede de madeira corre, por fora, e cada nível de jirau ergue o flecheiro.
const NET_RING = 15;
const JIRAU_RISE = 9;
const rnd = seed => pseudoRandom(seed);
const span = (t, a, b) => easeInOut(Math.max(0, Math.min(1, (t - a) / (b - a))));

/* ---------- geometrias e materiais compartilhados ---------- */
const LOG = addVerticalShade(new THREE.CylinderGeometry(.62, .7, 1, 7).translate(0, .5, 0), .7, 1.06);
const TIP = addVerticalShade(new THREE.ConeGeometry(.66, 1.6, 7).translate(0, .8, 0), .85, 1.1);
const RAIL = new THREE.CylinderGeometry(.24, .24, 1, 5).rotateZ(Math.PI / 2);
const LASHING = new THREE.TorusGeometry(.72, .12, 4, 8).rotateX(Math.PI / 2);
const STAKE = addVerticalShade(new THREE.CylinderGeometry(.22, .28, 1, 5).translate(0, .5, 0), .75, 1.05);
const POST = addVerticalShade(new THREE.CylinderGeometry(.42, .48, 1, 6).translate(0, .5, 0), .7, 1.05);
const SLAT = new THREE.CylinderGeometry(.3, .3, 10, 5).rotateX(Math.PI / 2);
const GROUND = new THREE.CircleGeometry(RING - .8, 18).rotateX(-Math.PI / 2);
// O flecheiro: pernas, tronco, cabeça (com o cabelo aparado e o diadema amarelo) e os
// dois braços, cada um num pivô no ombro.
const BODY = {
  leg: addVerticalShade(new THREE.BoxGeometry(1.2, 5.2, 1.3).translate(0, -2.6, 0), .75, 1),
  torso: addVerticalShade(new THREE.BoxGeometry(3.4, 4.8, 2.2), .82, 1.05),
  head: addVerticalShade(new THREE.BoxGeometry(2.6, 2.6, 2.6), .86, 1.08),
  hair: new THREE.BoxGeometry(2.72, .8, 2.1).translate(0, 1.15, -.35),
  diadem: new THREE.TorusGeometry(1.4, .22, 4, 12).rotateX(Math.PI / 2),
  arm: addVerticalShade(new THREE.BoxGeometry(.95, 4.6, 1).translate(0, -2.3, 0), .8, 1.02),
  paint: new THREE.BoxGeometry(3.5, .5, 2.3)
};
const materials = new Map();
function material(color, shaded = true) {
  const key = `${color}-${shaded}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color, vertexColors: shaded }));
  return materials.get(key);
}
const WOOD = [0x6b5236, 0x5e4630, 0x7a5e3e].map(c => material(c));
const WOOD_DARK = material(0x4a3826);
const VINE = material(0x8a7a52, false);
const PACKED = new THREE.MeshLambertMaterial({ color: 0x8a6440 });
// O fojo dos Palmares: a boca escura no chão; e a tanga de entrecasca do defensor.
const PIT = new THREE.CircleGeometry(2.2, 10).rotateX(-Math.PI / 2);
const PIT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x2a1e14 });
const LOINCLOTH = new THREE.BoxGeometry(3.5, 1.6, 2.3);
const BARK_CLOTH = material(0x7a5a3c);
const ARROW = new THREE.CylinderGeometry(.08, .08, 9, 4).translate(0, -4.5, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _dir = new THREE.Vector3(), _local = new THREE.Vector3(), _rest = new THREE.Vector3(), _nock = new THREE.Vector3();
const _hand = new THREE.Vector3();

export class PalisadeRenderer {
  #layer;
  #space;
  #views = new Map();

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(towers, { elapsed = 0, animate = true } = {}) {
    const seen = new Set();
    for (const tower of towers) {
      seen.add(tower);
      const { power, range, scatter } = tower.levels;
      const stage = `${tower.built}-${power}-${range}-${scatter}`;
      let view = this.#views.get(tower);
      if (!view || view.stage !== stage) {
        if (view) this.#dispose(view);
        view = this.#build(tower, stage);
        if (tower.preview) ghostify(view.group, tower.previewOpen);
        this.#layer.add(view.group);
        this.#views.set(tower, view);
      }
      view.frame.scale.y = tower.built ? 1 : .15 + .85 * tower.progress;
      // Os flecheiros viram para o alvo e passam pelo ciclo do arco: o primeiro no
      // compasso da cerca (a flecha sai quando o cooldown recomeça), os outros
      // desencontrados. Sem alvo, ficam de flecha encaixada, meio puxada.
      const interval = (tower.stats && tower.stats.interval) || TOWER.interval;
      const firing = tower.cooldown > 0 && tower.target;
      const base = firing ? 1 - tower.cooldown / interval : -1;
      view.shooters.forEach((shooter, i) => {
        shooter.rotation.y = Math.PI / 2 - tower.aim;
        const phase = base < 0 ? -1 : (i > 0 ? (base + i * .37) % 1 : base);
        PalisadeRenderer.#cycle(shooter.userData, phase, animate ? elapsed + i : 0);
      });
    }
    for (const [tower, view] of this.#views) {
      if (seen.has(tower)) continue;
      this.#dispose(view);
      this.#views.delete(tower);
    }
  }

  occluders() {
    const list = [];
    for (const [tower, view] of this.#views) {
      if (tower.preview) continue;
      list.push({ object: view.frame, x: view.group.position.x, z: view.group.position.z, radius: RING + 2, height: view.height });
    }
    return list;
  }

  #dispose(view) {
    this.#layer.remove(view.group);
    disposeGhost(view.group);
  }

  #build(tower, stage) {
    const { power, range, scatter } = tower.levels;
    const seed = tower.seed;
    const group = new THREE.Group();
    const place = this.#space.toScene(tower.x, tower.y);
    group.position.set(place.x, hillHeight(tower.x, tower.y), place.z);
    group.add(createContactShadow(RING + 3));
    const ground = new THREE.Mesh(GROUND, PACKED);
    ground.position.y = .1;
    ground.receiveShadow = true;
    group.add(ground);
    const frame = new THREE.Group();
    group.add(frame);
    const mesh = (geometry, mat, x, y, z, parent = frame) => {
      const part = new THREE.Mesh(geometry, mat);
      part.position.set(x, y, z);
      part.castShadow = true;
      part.receiveShadow = true;
      parent.add(part);
      return part;
    };
    const inward = Math.atan2(CENTER.y - tower.y, CENTER.x - tower.x);
    const inGap = angle => Math.abs(Math.atan2(Math.sin(angle - inward), Math.cos(angle - inward))) < GAP / 2;
    const at = (angle, radius) => [Math.cos(angle) * radius, Math.sin(angle) * radius];

    // ---------- os troncos fincados, de ponta afiada; as seteiras são fendas ----------
    for (let i = 0; i < LOGS; i++) {
      const angle = inward + (i + .5) / LOGS * Math.PI * 2;
      if (inGap(angle)) continue;
      const k = seed * 31 + i * 7;
      const [x, z] = at(angle, RING + (rnd(k) - .5) * .25);
      const tall = LOG_HEIGHT * (.92 + rnd(k + 1) * .16);
      const wood = WOOD[Math.floor(rnd(k + 2) * WOOD.length)];
      // A seteira: o tronco em dois pedaços, com a fenda na altura do peito.
      if (i % 4 === 2) {
        mesh(LOG, wood, x, 0, z).scale.y = 4.6;
        mesh(LOG, wood, x, 6.2, z).scale.y = tall - 6.2;
      } else {
        mesh(LOG, wood, x, 0, z).scale.y = tall;
      }
      mesh(TIP, wood, x, tall, z);
    }
    // As duas travessas por dentro, amarradas com cipó a cada tronco.
    for (const y of [2.4, 7.4]) {
      for (let i = 0; i < LOGS; i++) {
        const a = inward + (i + .5) / LOGS * Math.PI * 2, b = inward + (i + 1.5) / LOGS * Math.PI * 2;
        if (inGap(a) || inGap(b)) continue;
        const [ax, az] = at(a, RING - .8), [bx, bz] = at(b, RING - .8);
        const rail = mesh(RAIL, WOOD_DARK, (ax + bx) / 2, y, (az + bz) / 2);
        rail.scale.x = Math.hypot(bx - ax, bz - az) + .3;
        rail.rotation.y = -Math.atan2(bz - az, bx - ax);
        mesh(LASHING, VINE, ax, y, az);
      }
    }
    const view = { group, frame, stage, shooters: [], height: LOG_HEIGHT + 6 + range * JIRAU_RISE };
    if (!tower.built) return view;

    // ---------- os estrepes e os fojos (Palmares) ----------
    if (scatter > 0 && PALMARES) {
      const spikes = 46;
      for (let i = 0; i < spikes; i++) {
        const angle = inward + (i + .5) / spikes * Math.PI * 2;
        if (inGap(angle)) continue;
        const k = seed * 13 + i * 5;
        const [x, z] = at(angle, NET_RING - 2 + rnd(k) * 5);
        const spike = mesh(STAKE, WOOD[i % 3], x, 0, z);
        spike.scale.y = 2.2 + rnd(k + 1) * 1.2;
        // Inclinado para fora, a ponta virada para quem chega.
        spike.rotation.set(Math.sin(angle) * .55, 0, -Math.cos(angle) * .55);
        mesh(TIP, WOOD_DARK, x + Math.cos(angle) * spike.scale.y * .5, spike.scale.y * .86, z + Math.sin(angle) * spike.scale.y * .5).scale.setScalar(.35);
      }
      // Os fojos: buracos escuros, com a boca meio coberta de rama.
      for (let i = 0; i < 5; i++) {
        const angle = inward + Math.PI + (i - 2) * .55;
        const [x, z] = at(angle, NET_RING + 4);
        const pit = new THREE.Mesh(PIT, PIT_MATERIAL);
        pit.position.set(x, .12, z);
        frame.add(pit);
      }
    } else if (scatter > 0) {
    // ---------- a rede de madeira: a cerca baixa de fora, com as entradas ----------
      const stakes = 40;
      for (let i = 0; i < stakes; i++) {
        const angle = inward + (i + .5) / stakes * Math.PI * 2;
        if (inGap(angle) || i % 7 === 3) continue;
        const [x, z] = at(angle, NET_RING + (rnd(seed + i) - .5) * .6);
        mesh(STAKE, WOOD[i % 3], x, 0, z).scale.y = 3.6 + rnd(seed + i * 3) * .8;
        const [nx, nz] = at(inward + (i + 1.5) / stakes * Math.PI * 2, NET_RING);
        if (i % 7 === 2 || inGap(inward + (i + 1.5) / stakes * Math.PI * 2)) continue;
        for (const y of [1.2, 2.8]) {
          const rail = mesh(RAIL, WOOD_DARK, (x + nx) / 2, y, (z + nz) / 2);
          rail.scale.set(Math.hypot(nx - x, nz - z) + .2, .7, .7);
          rail.rotation.y = -Math.atan2(nz - z, nx - x);
        }
      }
    }

    // ---------- o jirau: quatro forquilhas e o estrado de varas ----------
    const lift = range * JIRAU_RISE;
    if (range > 0) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(POST, WOOD[1], sx * 3.6, 0, sz * 3.6).scale.y = lift;
      for (let i = -5; i <= 5; i++) mesh(SLAT, WOOD[2], i * .7, lift + .3, 0).scale.z = .78;
    }

    // ---------- os flecheiros, atrás das seteiras ----------
    const back = inward + Math.PI;
    const shooters = 1 + power;
    for (let i = 0; i < shooters; i++) {
      const onJirau = i === 0 && range > 0;
      const angle = back + (i - (shooters - 1) / 2) * .8;
      const [x, z] = onJirau ? [0, 0] : at(angle, RING - 3);
      view.shooters.push(this.#archer(frame, x, onJirau ? lift + .6 : 0, z, seed * 7 + i * 3));
    }
    return view;
  }

  // O flecheiro de pé, de lado para o alvo (+z, que o giro vira para ele): a mão
  // esquerda estendida com o arco, a direita puxando a corda até o queixo.
  #archer(frame, x, y, z, seed) {
    const archer = new THREE.Group();
    archer.position.set(x, y, z);
    const skin = material(new THREE.Color(SKIN_TONES[Math.floor(rnd(seed) * SKIN_TONES.length)]).getHex());
    const ink = material(new THREE.Color(CLOTH.jenipapo).getHex(), false);
    const part = (geometry, mat, px, py, pz, parent = archer) => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // O corpo de lado: o ombro esquerdo para o alvo.
    const body = new THREE.Group();
    body.rotation.y = 1.25;
    archer.add(body);
    part(BODY.leg, skin, -.8, 5.2, .5, body).rotation.x = -.2;
    part(BODY.leg, skin, .8, 5.2, -.4, body).rotation.x = .15;
    part(BODY.torso, skin, 0, 7.6, 0, body);
    if (PALMARES) {
      part(LOINCLOTH, BARK_CLOTH, 0, 5.6, 0, body);
    } else {
      part(BODY.paint, ink, 0, 8.4, 0, body);
      part(BODY.paint, ink, 0, 6.8, 0, body);
    }
    const head = new THREE.Group();
    head.position.set(0, 11.3, 0);
    head.rotation.y = -1.2;
    body.add(head);
    part(BODY.head, skin, 0, 0, 0, head);
    part(BODY.hair, material(new THREE.Color(CLOTH.hair).getHex(), false), 0, 0, 0, head);
    if (!PALMARES) part(BODY.diadem, material(new THREE.Color(CLOTH.featherYellow).getHex(), false), 0, 1.4, 0, head);
    // Os braços nos ombros; o arco fica no referencial do flecheiro (não do corpo).
    const left = new THREE.Group(), right = new THREE.Group();
    left.position.set(-1.6 * Math.cos(1.25), 9.6, 1.6 * Math.sin(1.25));
    right.position.set(1.6 * Math.cos(1.25), 9.6, -1.6 * Math.sin(1.25));
    archer.add(left, right);
    part(BODY.arm, skin, 0, 0, 0, left);
    part(BODY.arm, skin, 0, 0, 0, right);
    const bow = bowModel();
    bow.position.set(left.position.x, 9.9, left.position.z + 4.4);
    archer.add(bow);
    const strings = [bowString(), bowString()];
    for (const string of strings) bow.add(string);
    const arrow = new THREE.Mesh(ARROW, WOOD_DARK);
    archer.add(arrow);
    archer.userData = { left, right, bow, strings, arrow, anchor: new THREE.Vector3(.4, 10.4, .9) };
    PalisadeRenderer.#cycle(archer.userData, -1, 0);
    frame.add(archer);
    return archer;
  }

  // O ciclo do arco com `s` de 0 (acabou de soltar) a 1 (puxado, pronto); `s` < 0 é
  // a espera, de flecha encaixada e meio puxada, respirando.
  static #cycle(u, s, time) {
    const { left, right, bow, strings, arrow, anchor } = u;
    let draw;
    if (s < 0) draw = .3 + Math.sin(time * 1.3) * .03;
    else if (s < .14) draw = 0;
    else draw = span(s, .45, .92);
    const nocked = s < 0 || s > .3;
    // A mão esquerda vai até o arco; a direita, até a corda.
    const rest = _rest.set(bow.position.x, bow.position.y, bow.position.z - BOW.sag);
    const nock = _nock.copy(rest).lerp(anchor, draw);
    PalisadeRenderer.#point(left, bow.position);
    // Logo depois de soltar, a mão direita escapa para trás e volta à corda.
    PalisadeRenderer.#point(right, s >= 0 && s < .3 ? _hand.copy(rest).lerp(anchor, 1 - span(s, 0, .3) * .5) : nock);
    _local.copy(nock).sub(bow.position);
    const middle = [_local.x, _local.y, _local.z];
    stringTo(strings[0], [0, BOW.half, -BOW.sag], middle);
    stringTo(strings[1], [0, -BOW.half, -BOW.sag], middle);
    arrow.visible = nocked;
    if (nocked) {
      _dir.copy(bow.position).sub(nock).normalize();
      arrow.quaternion.setFromUnitVectors(DOWN, _dir);
      arrow.position.copy(nock).addScaledVector(_dir, -.6);
    }
  }

  // O braço (pendurado para -y no pivô do ombro) apontado para `target`.
  // O braço estica ou encolhe um pouco para a mão cair no ponto.
  static #point(arm, target) {
    _dir.copy(target).sub(arm.position);
    const reach = _dir.length();
    arm.quaternion.setFromUnitVectors(DOWN, _dir.normalize());
    arm.scale.y = Math.min(1.1, Math.max(.5, reach / 4.6));
  }
}
