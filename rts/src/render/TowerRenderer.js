import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { addVerticalShade, shadedBox } from './Shading.js';
import { createContactShadow } from './ContactShadow.js';
import { CENTER, SKIN_TONES, CLOTH, TOWER } from '../config/rts.js';
import { easeInOut } from '../core/math.js';
import { hillHeight } from '../world/Hills.js';
import { weaponModel, BOLT_Y as WEAPON_BOLT_Y } from './WeaponModels.js';
import { ghostify, disposeGhost } from './GhostLook.js';

// Medidas da trincheira. RING é o raio do muro de pedra; por fora dele o aterro desce
// até BERM_OUT; por dentro, a banqueta de tiro (onde os atiradores se ajoelham) sobe
// STEP. O muro tem COURSES fiadas de pedra solta sobre o aterro, e cada nível de jirau
// ergue o atirador JIRAU_RISE (a mesma conta do TowerSystem, de onde a bala sai).
const RING = 8.6;
const BERM_TOP = 2.4;
const BERM_OUT = RING + 4.4;
const STEP = 1.3;
const COURSE = 1.5;
const COURSES = 3;
const WALL_TOP = BERM_TOP + COURSES * COURSE;
const JIRAU_RISE = 9;
// Abertura do anel, voltada para a igreja (radianos).
const GAP = .72;

const rnd = seed => pseudoRandom(seed);
// Uma curva suave entre a e b (0 antes, 1 depois): as etapas do ciclo do tiro.
const span = (t, a, b) => easeInOut(Math.max(0, Math.min(1, (t - a) / (b - a))));
// A vareta de socar do bacamarte, quando sai na mão (cano para +z). A arma em si,
// com o ferrolho, vem de WeaponModels.
const RAMROD = new THREE.BoxGeometry(.18, .18, 7).translate(0, 0, 3.5);

/* ---------- geometrias compartilhadas por todas as trincheiras ---------- */

// Pedra solta: uma caixa com os cantos puxados ao acaso (cada canto uma vez só, para
// as faces continuarem fechadas) e o degradê de sombra. Algumas variantes, sorteadas.
function stoneVariant(seed) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const position = geometry.attributes.position;
  const corners = new Map();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const key = `${Math.sign(x)}${Math.sign(y)}${Math.sign(z)}`;
    if (!corners.has(key)) {
      const k = corners.size * 3 + seed * 17;
      // O de cima encolhe mais que o de baixo: a pedra assenta larga e afina no topo.
      const shrink = y > 0 ? .78 + rnd(k) * .2 : .94 + rnd(k) * .1;
      corners.set(key, [shrink, (rnd(k + 1) - .5) * .22, shrink * (.9 + rnd(k + 2) * .14)]);
    }
    const [sx, dy, sz] = corners.get(key);
    position.setXYZ(i, x * sx, y + dy, z * sz);
  }
  geometry.computeVertexNormals();
  return addVerticalShade(geometry, .7, 1.1);
}
const STONES = Array.from({ length: 7 }, (_, i) => stoneVariant(i + 1));

// Torrão de terra socada no topo do muro e a pedra solta do chão: bolota facetada.
const CLOD = addVerticalShade(new THREE.IcosahedronGeometry(1, 0), .72, 1.08);
const PEBBLE = addVerticalShade(new THREE.DodecahedronGeometry(1, 0), .7, 1.08);

// O aterro: anel de terra com a encosta de fora, o topo onde o muro assenta e a borda
// de dentro caindo para a banqueta. Girado (LatheGeometry) com a abertura da entrada.
function bermGeometry(openingAt, seed) {
  const profile = [
    [BERM_OUT + .6, -.3], [BERM_OUT, .15], [RING + 2.6, 1.3], [RING + 1.4, BERM_TOP - .1],
    [RING + .9, BERM_TOP], [RING - 1.2, BERM_TOP], [RING - 1.5, STEP + .2], [RING - 2.9, STEP], [RING - 3.3, .2]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  // Na Lathe, o ponto de ângulo φ fica em (sen φ, cos φ); a direção θ do jogo (cos θ, sen θ)
  // é φ = π/2 − θ. A abertura fica centrada na direção da igreja.
  const phiIn = Math.PI / 2 - openingAt;
  const geometry = new THREE.LatheGeometry(profile, 30, phiIn + GAP / 2, Math.PI * 2 - GAP);
  // Terra não é torneada: a borda ondula e o topo sobe e desce um pouco.
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const angle = Math.atan2(x, z), radius = Math.hypot(x, z);
    const wobble = Math.sin(angle * 5 + seed) * .35 + Math.sin(angle * 11 + seed * 2.3) * .2;
    const scale = (radius + wobble * (radius > RING + 1 ? 1 : .35)) / Math.max(radius, 1e-6);
    position.setXYZ(i, x * scale, y + (y > .3 ? Math.sin(angle * 7 + seed * 1.7) * .18 : 0), z * scale);
  }
  geometry.computeVertexNormals();
  return addVerticalShade(geometry, .74, 1.06);
}

// Galho seco de catingueira fincado no aterro (camuflagem): vara e dois brotos.
const TWIG = new THREE.BoxGeometry(.28, 4.2, .28).translate(0, 2.1, 0);
const TWIG_BRANCH = new THREE.BoxGeometry(.2, 1.8, .2).translate(0, .9, 0);
// Macambira: touceira de folhas duras em leque.
const MACAMBIRA_LEAF = new THREE.BoxGeometry(.5, 2.6, .18).translate(0, 1.3, 0);

// O jirau: forquilha (vara com o "Y" no alto), as travessas e o estrado de varas.
const POST = shadedBox(.9, 1, .9, .7, 1.05);
const FORK_TIP = new THREE.BoxGeometry(.5, 1.8, .5).translate(0, .9, 0);
const BEAM = new THREE.CylinderGeometry(.42, .42, 10.4, 6).rotateZ(Math.PI / 2);
const SLAT = new THREE.CylinderGeometry(.34, .34, 10.6, 6).rotateX(Math.PI / 2);
const RAIL = new THREE.BoxGeometry(.4, 1, .4);
const RUNG = new THREE.BoxGeometry(2.4, .3, .3);
const LASHING = new THREE.BoxGeometry(1.1, .45, 1.1);

// Caixote de munição tomado da tropa, cabaça d'água, esteira de palha, cápsulas.
const CRATE = shadedBox(3.6, 2.2, 2.4, .75, 1.08);
const CRATE_LID = new THREE.BoxGeometry(3.8, .3, 2.6);
const CRATE_BAND = new THREE.BoxGeometry(.25, 2.3, 2.5);
const GOURD = addVerticalShade(new THREE.SphereGeometry(1, 8, 6), .78, 1.1);
const GOURD_NECK = new THREE.CylinderGeometry(.32, .45, .9, 6);
const MAT = new THREE.BoxGeometry(4.2, .12, 2.8);
const CASING = new THREE.BoxGeometry(.18, .18, .5);

// O atirador: o mesmo boneco de blocos das unidades (CharacterModel), ajoelhado. Medidas
// iguais às de lá para ficar do mesmo tamanho de um jagunço do arraial.
function taperedTorso() {
  const geometry = new THREE.BoxGeometry(5.6, 6, 3.2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) > 0) continue;
    position.setX(i, position.getX(i) * .84);
    position.setZ(i, position.getZ(i) * .9);
  }
  geometry.computeVertexNormals();
  return addVerticalShade(geometry, .82, 1.06);
}
const BODY = {
  torso: taperedTorso(),
  thigh: addVerticalShade(new THREE.BoxGeometry(2.4, 3, 2.4).translate(0, -1.35, 0), .8, 1),
  shin: addVerticalShade(new THREE.BoxGeometry(2.2, 2.9, 2.2).translate(0, -1.3, 0), .66, .92),
  foot: addVerticalShade(new THREE.BoxGeometry(2.3, 1, 3.5).translate(0, -.05, .55), .7, 1),
  upperArm: addVerticalShade(new THREE.BoxGeometry(1.8, 3, 2.2).translate(0, -1.4, 0), .86, 1.04),
  forearm: addVerticalShade(new THREE.BoxGeometry(1.7, 2.9, 2).translate(0, -1.3, 0), .8, .98),
  hand: addVerticalShade(new THREE.BoxGeometry(1.9, 1.5, 2.2).translate(0, -3.3, 0), .85, 1.05),
  head: addVerticalShade(new THREE.BoxGeometry(5, 5, 5), .86, 1.08),
  eye: new THREE.BoxGeometry(.9, 1.1, .3),
  nose: addVerticalShade(new THREE.BoxGeometry(.8, 1.1, .7), .9, 1),
  beard: addVerticalShade(new THREE.BoxGeometry(4.4, 2.2, 1), .8, 1.05),
  brim: addVerticalShade(new THREE.CylinderGeometry(4.4, 4.4, .5, 12), .8, 1.1),
  crown: addVerticalShade(new THREE.CylinderGeometry(2.6, 3, 2.6, 10), .82, 1.12),
  strap: new THREE.BoxGeometry(.9, 8.2, .35),
  belt: new THREE.BoxGeometry(5.9, .9, 3.5),
  // O fuzil em pé no referencial dele: coronha para trás (+z menos), cano para a frente.
};
const materials = new Map();
function material(color, shaded = true) {
  const key = `${color}-${shaded}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color, vertexColors: shaded }));
  return materials.get(key);
}
// (com degradê só nas geometrias que têm a cor por vértice: Shading/addVerticalShade;
// nas outras o material liso, senão a peça sai preta)
const ROCK = [PALETTE.rock, PALETTE.rockLight, PALETTE.rockWarm].map(c => material(c));
const BERM = new THREE.MeshLambertMaterial({ color: PALETTE.clearing, vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const CLOD_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.soilDeep, vertexColors: true, flatShading: true });
const PEBBLE_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.rock, vertexColors: true, flatShading: true });
const PIT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x6a4e34 });
const WOOD = material(PALETTE.stick);
const WOOD_PLAIN = material(PALETTE.stick, false);
const BARK = material(PALETTE.barkDark, false);
const TWIG_MATERIAL = material(PALETTE.bark, false);
const LEAF = material(PALETTE.macambira, false);
const LEAF_RED = material(PALETTE.macambiraRed, false);
const ROPE = material(0xb8a070, false);
const CRATE_MATERIAL = material(0x7a6040);
const CRATE_PLAIN = material(0x7a6040, false);
const CRATE_DARK = material(0x4a3a28, false);
const GOURD_MATERIAL = material(0xb08a4a);
const GOURD_PLAIN = material(0xb08a4a, false);
const STRAW = material(PALETTE.dryGrass, false);
const BRASS = material(0x9a7a3c, false);
const LEATHER = material(new THREE.Color(CLOTH.leather).getHex());
const EYE = material(0x26201a, false);
const HAIR = material(PALETTE.hair);
const STRAP_MATERIAL = material(0x5a3e26, false);
const ROD = material(0x5a4632, false);

// Trincheira do arraial: um aterro de terra socada em anel, com a encosta de fora
// coberta de pedra solta e galho seco, e por cima um muro baixo de pedra seca coroado
// de torrões de terra — como as trincheiras que os jagunços cavaram nas estradas e nos
// morros em volta de Belo Monte. A abertura fica voltada para a igreja. Por dentro, a
// banqueta de tiro, onde os atiradores de chapéu de couro se ajoelham e miram por cima
// do muro. As melhorias aparecem: mais atiradores e o caixote de munição tomado da
// tropa (fuzis), o jirau de forquilhas que ergue o atirador (alcance) e a boca larga do
// bacamarte (carga espalhada). Em obra, o anel sobe do chão.
export class TowerRenderer {
  #layer;
  #space;
  #views = new Map();

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(towers) {
    const seen = new Set();
    for (const tower of towers) {
      seen.add(tower);
      const { power, range, scatter } = tower.levels;
      const stage = `${tower.built}-${power}-${range}-${scatter}`;
      let view = this.#views.get(tower);
      if (!view || view.stage !== stage) {
        if (view) this.#dispose(view);
        view = this.#build(tower, stage);
        // A obra fantasma do modo de obra (FrameRenderer): a trincheira pronta, transparente.
        if (tower.preview) ghostify(view.group, tower.previewOpen);
        this.#layer.add(view.group);
        this.#views.set(tower, view);
      }
      view.frame.scale.y = tower.built ? 1 : .15 + .85 * tower.progress;
      // Os atiradores viram juntos para o alvo e passam pelo ciclo do tiro: o primeiro
      // no compasso da trincheira (o tiro sai quando o cooldown recomeça); os outros
      // desencontrados, como numa fuzilaria. Sem alvo, ficam na mira, parados.
      const interval = (tower.stats && tower.stats.interval) || TOWER.interval;
      const firing = tower.cooldown > 0;
      const base = firing ? 1 - tower.cooldown / interval : 1;
      view.shooters.forEach((shooter, i) => {
        shooter.rotation.y = Math.PI / 2 - tower.aim;
        TowerRenderer.#cycle(shooter.userData, firing && i > 0 ? (base + i * .37) % 1 : base);
      });
    }
    for (const [tower, view] of this.#views) {
      if (seen.has(tower)) continue;
      this.#dispose(view);
      this.#views.delete(tower);
    }
  }

  // Trincheiras que podem tapar alguém atrás delas (OcclusionFader).
  occluders() {
    const list = [];
    for (const [tower, view] of this.#views) {
      if (tower.preview) continue;
      list.push({ object: view.frame, x: view.group.position.x, z: view.group.position.z, radius: BERM_OUT, height: view.height });
    }
    return list;
  }

  // O aterro é uma geometria própria de cada trincheira (a abertura e a ondulação dela).
  #dispose(view) {
    this.#layer.remove(view.group);
    for (const geometry of view.owned) geometry.dispose();
    disposeGhost(view.group);
  }

  #build(tower, stage) {
    const { power, range, scatter } = tower.levels;
    const seed = tower.seed;
    const group = new THREE.Group();
    const place = this.#space.toScene(tower.x, tower.y);
    group.position.set(place.x, hillHeight(tower.x, tower.y), place.z);
    group.add(createContactShadow(BERM_OUT + 2));
    // O fundo da trincheira: chão de terra pisada, mais escuro que o de fora.
    const pit = new THREE.Mesh(new THREE.CircleGeometry(RING - 2.9, 20).rotateX(-Math.PI / 2), PIT_MATERIAL);
    pit.position.y = .12;
    pit.receiveShadow = true;
    group.add(pit);
    const frame = new THREE.Group();
    group.add(frame);
    const owned = [pit.geometry];
    const mesh = (geometry, mat, x, y, z, turn = 0, parent = frame) => {
      const part = new THREE.Mesh(geometry, mat);
      part.position.set(x, y, z);
      part.rotation.y = turn;
      part.castShadow = true;
      part.receiveShadow = true;
      parent.add(part);
      return part;
    };
    // A abertura do anel, do lado da igreja (o lado de dentro fica para o arraial).
    const inward = Math.atan2(CENTER.y - tower.y, CENTER.x - tower.x);
    const inGap = angle => Math.abs(Math.atan2(Math.sin(angle - inward), Math.cos(angle - inward))) < GAP / 2 + .06;
    const at = (angle, radius) => [Math.cos(angle) * radius, Math.sin(angle) * radius];

    // ---------- o aterro ----------
    const berm = bermGeometry(inward, seed * .37);
    owned.push(berm);
    mesh(berm, BERM, 0, 0, 0);

    // ---------- o muro de pedra seca: fiadas desencontradas, um tico inclinado para dentro ----------
    for (let course = 0; course < COURSES; course++) {
      const radius = RING - course * .22;
      const count = 17 - course;
      const offset = course % 2 ? .5 : 0;
      for (let i = 0; i < count; i++) {
        const angle = inward + (i + offset + .5) / count * Math.PI * 2;
        if (inGap(angle)) continue;
        const k = seed * 31 + course * 101 + i * 7;
        const [x, z] = at(angle + (rnd(k) - .5) * .06, radius + (rnd(k + 1) - .5) * .35);
        const stone = mesh(STONES[Math.floor(rnd(k + 2) * STONES.length)], ROCK[Math.floor(rnd(k + 3) * 3)],
          x, BERM_TOP + COURSE * (course + .5) + (rnd(k + 4) - .5) * .15, z, -angle + Math.PI / 2 + (rnd(k + 5) - .5) * .3);
        const w = 2.7 + rnd(k + 6) * 1.1;
        stone.scale.set(w, COURSE * (.92 + rnd(k + 7) * .22), 2.1 + rnd(k + 8) * .8);
        stone.rotation.z = (rnd(k + 9) - .5) * .12;
      }
    }
    // Coroa de torrões de terra socada sobre o muro; aqui e ali falta um: a seteira.
    for (let i = 0; i < 22; i++) {
      const angle = inward + (i + .5) / 22 * Math.PI * 2;
      if (inGap(angle) || i % 6 === 3) continue;
      const k = seed * 53 + i * 11;
      const [x, z] = at(angle, RING - .4);
      const clod = mesh(CLOD, CLOD_MATERIAL, x, WALL_TOP + .45, z, -angle + rnd(k) * 2);
      clod.scale.set(1.5 + rnd(k + 1) * .6, .75 + rnd(k + 2) * .3, 1.2 + rnd(k + 3) * .4);
    }
    // As pedras de canto da entrada, maiores, e um tronco atravessado como degrau.
    for (const side of [-1, 1]) {
      const angle = inward + side * (GAP / 2 + .1);
      for (let h = 0; h < 2; h++) {
        const [x, z] = at(angle, RING + .2);
        const corner = mesh(STONES[(seed + h + (side > 0 ? 3 : 0)) % STONES.length], ROCK[(h + 1) % 3],
          x, BERM_TOP * .55 + h * 2.1, z, -angle + Math.PI / 2);
        corner.scale.set(3.4, 2.3 + h * .2, 3);
      }
    }
    const [lx, lz] = at(inward, RING + 1.4);
    const log = mesh(BEAM, BARK, lx, .45, lz, Math.PI / 2 - inward);   // atravessado na entrada
    log.scale.set(.42, 1.2, 1.2);

    // ---------- a encosta: pedras soltas, galhos secos e macambira ----------
    for (let i = 0; i < 16; i++) {
      const k = seed * 71 + i * 13;
      const angle = inward + rnd(k) * Math.PI * 2;
      if (inGap(angle)) continue;
      const radius = RING + 2 + rnd(k + 1) * (BERM_OUT - RING - 1);
      const [x, z] = at(angle, radius);
      const s = .45 + rnd(k + 2) * .6;
      const t = (radius - RING - 1.4) / (BERM_OUT - RING - 1.4);
      const pebble = mesh(PEBBLE, PEBBLE_MATERIAL, x, BERM_TOP * (1 - Math.min(1, Math.max(0, t))) + s * .3, z, rnd(k + 3) * 6);
      pebble.scale.set(s * 1.3, s, s * 1.1);
    }
    for (let i = 0; i < 9; i++) {
      const k = seed * 89 + i * 17;
      const angle = inward + Math.PI * (.2 + rnd(k) * 1.6);
      if (inGap(angle)) continue;
      const [x, z] = at(angle, RING + 1.6 + rnd(k + 1) * 1.4);
      const twig = mesh(TWIG, TWIG_MATERIAL, x, BERM_TOP - .4, z, rnd(k + 2) * 6);
      twig.rotation.z = (rnd(k + 3) - .5) * .7;
      twig.rotation.x = (rnd(k + 4) - .5) * .5;
      twig.scale.y = .8 + rnd(k + 5) * .5;
      for (const side of [-1, 1]) {
        const branch = mesh(TWIG_BRANCH, TWIG_MATERIAL, 0, 2 + rnd(k + 6 + side) * 1.4, 0, 0, twig);
        branch.rotation.z = side * (.6 + rnd(k + 8) * .4);
      }
    }
    for (let i = 0; i < 3; i++) {
      const k = seed * 97 + i * 19;
      const angle = inward + Math.PI * (.5 + i * .5) + (rnd(k) - .5) * .4;
      const [x, z] = at(angle, BERM_OUT - 1.2);
      const tuft = new THREE.Group();
      tuft.position.set(x, .2, z);
      frame.add(tuft);
      for (let j = 0; j < 7; j++) {
        const leaf = mesh(MACAMBIRA_LEAF, j % 3 ? LEAF : LEAF_RED, 0, 0, 0, j / 7 * Math.PI * 2, tuft);
        leaf.rotation.x = .5 + rnd(k + j) * .3;
        leaf.scale.y = .8 + rnd(k + j + 9) * .5;
      }
    }

    const view = { group, frame, stage, shooters: [], owned, height: WALL_TOP + 16 + range * JIRAU_RISE };
    if (!tower.built) return view;

    // ---------- por dentro: esteira, cabaça d'água, cápsulas no chão ----------
    const back = inward + Math.PI;
    const [mx, mz] = at(inward + .9, RING - 4.6);
    mesh(MAT, STRAW, mx, .2, mz, -inward + .3);
    const [gx, gz] = at(inward - .7, RING - 4.4);
    const gourd = mesh(GOURD, GOURD_MATERIAL, gx, 1.1, gz);
    gourd.scale.set(1.1, 1, 1.1);
    mesh(GOURD_NECK, GOURD_PLAIN, gx, 2.4, gz);
    for (let i = 0; i < 6; i++) {
      const k = seed * 113 + i * 5;
      const [cx, cz] = at(back + (rnd(k) - .5) * 1.6, RING - 3.4 - rnd(k + 1) * 1.5);
      mesh(CASING, BRASS, cx, .22, cz, rnd(k + 2) * 6);
    }

    // ---------- o jirau: quatro forquilhas, travessas amarradas, estrado de varas e escada ----------
    const lift = range * JIRAU_RISE;
    if (range > 0) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const post = mesh(POST, WOOD, sx * 4.4, lift / 2, sz * 4.4);
        post.scale.y = lift;
        for (const side of [-1, 1]) {
          const tip = mesh(FORK_TIP, WOOD_PLAIN, sx * 4.4 + side * .3, lift - .2, sz * 4.4);
          tip.rotation.z = -side * .45;
        }
        mesh(LASHING, ROPE, sx * 4.4, lift - .5, sz * 4.4);
      }
      for (const sz of [-1, 1]) mesh(BEAM, WOOD_PLAIN, 0, lift - .1, sz * 4.4);
      for (let i = -6; i <= 6; i++) mesh(SLAT, WOOD_PLAIN, i * .8, lift + .55, 0);
      // a escada, encostada do lado da igreja
      const [ex, ez] = at(inward, 4.4);
      const ladder = new THREE.Group();
      ladder.position.set(ex, 0, ez);
      ladder.rotation.y = -inward + Math.PI / 2;
      frame.add(ladder);
      for (const side of [-1, 1]) {
        const rail = mesh(RAIL, WOOD_PLAIN, side * 1.1, lift / 2, .9, 0, ladder);
        rail.scale.y = lift + 1.2;
        rail.rotation.x = -.18;
      }
      for (let y = 1.6; y < lift; y += 1.9) mesh(RUNG, WOOD_PLAIN, 0, y, .9 - y * .18, 0, ladder);
    }

    // ---------- os atiradores ----------
    const shooters = 1 + power;
    for (let i = 0; i < shooters; i++) {
      const onJirau = i === 0 && range > 0;
      const angle = back + (i - (shooters - 1) / 2) * .95;
      const [x, z] = onJirau ? [0, 0] : at(angle, RING - 2.4);
      view.shooters.push(this.#shooter(frame, x, onJirau ? lift + .9 : STEP, z, scatter > 0 && i === 0, seed * 7 + i * 3));
    }
    // Caixote de munição tomado da tropa, com a tampa entreaberta.
    if (power > 0) {
      const [cx, cz] = at(inward, 3.4);
      const crate = new THREE.Group();
      crate.position.set(cx, 0, cz);
      crate.rotation.y = -inward;
      frame.add(crate);
      mesh(CRATE, CRATE_MATERIAL, 0, 1.1, 0, 0, crate);
      for (const side of [-1, 1]) mesh(CRATE_BAND, CRATE_DARK, side * 1.2, 1.1, 0, 0, crate);
      const lid = mesh(CRATE_LID, CRATE_PLAIN, 0, 2.35, -.3, 0, crate);
      lid.rotation.x = -.35;
    }
    return view;
  }

  // Jagunço ajoelhado na banqueta: um joelho no chão, o outro à frente, o fuzil (ou o
  // bacamarte de boca larga) no ombro, apontado para +z (que o giro vira para o alvo).
  // Chapéu de couro de vaqueiro, a cartucheira cruzada e o cinturão.
  #shooter(frame, x, y, z, blunderbuss, seed) {
    const shooter = new THREE.Group();
    shooter.position.set(x, y, z);
    const skin = material(new THREE.Color(SKIN_TONES[Math.floor(rnd(seed) * SKIN_TONES.length)]).getHex());
    const shirt = material(new THREE.Color(CLOTH.shirts[Math.floor(rnd(seed + 1) * CLOTH.shirts.length)]).getHex());
    const trousers = material(new THREE.Color(CLOTH.trousers[Math.floor(rnd(seed + 2) * CLOTH.trousers.length)]).getHex());
    const part = (geometry, mat, px, py, pz, parent = shooter) => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const HIP = 3.3;
    // Perna da frente: coxa para a frente, canela em pé, pé no chão.
    const front = part(BODY.thigh, trousers, 1.4, HIP, 0);
    front.rotation.x = -Math.PI / 2 + .15;
    const frontShin = part(BODY.shin, trousers, 0, -2.7, 0, front);
    frontShin.rotation.x = Math.PI / 2 - .15;
    part(BODY.foot, LEATHER, 0, -2.4, 0, frontShin);
    // Perna de trás: coxa em pé, joelho no chão, canela deitada para trás.
    const rear = part(BODY.thigh, trousers, -1.4, HIP, 0);
    rear.rotation.x = .12;
    const rearShin = part(BODY.shin, trousers, 0, -2.7, 0, rear);
    rearShin.rotation.x = Math.PI / 2 - .12;              // deitada para trás, o pé de ponta no chão
    part(BODY.foot, LEATHER, 0, -2.4, 0, rearShin);
    // Tronco um pouco inclinado para a frente, como quem mira.
    const torso = new THREE.Group();
    torso.position.set(0, HIP, 0);
    torso.rotation.x = .16;
    shooter.add(torso);
    part(BODY.torso, shirt, 0, 3, 0, torso);
    part(BODY.belt, STRAP_MATERIAL, 0, .7, 0, torso);
    for (const side of [-1, 1]) {                          // a cartucheira cruzada
      const strap = part(BODY.strap, STRAP_MATERIAL, 0, 3.2, 1.72, torso);
      strap.rotation.z = side * .62;
    }
    // Cabeça: rosto, olhos, nariz, a barba de alguns, o chapéu de couro.
    const head = new THREE.Group();
    head.position.set(0, 6.1, 0);
    head.rotation.x = -.2;                                 // olha para a frente, apesar do tronco inclinado
    torso.add(head);
    part(BODY.head, skin, 0, 2.6, 0, head);
    for (const side of [-1, 1]) part(BODY.eye, EYE, side * 1.15, 3.1, 2.55, head);
    part(BODY.nose, skin, 0, 2.5, 2.7, head);
    if (rnd(seed + 3) < .55) part(BODY.beard, HAIR, 0, 1, 2.3, head);
    part(BODY.brim, LEATHER, 0, 5.1, 0, head);
    part(BODY.crown, LEATHER, 0, 6.5, 0, head);
    // Braços para a frente segurando a arma; a coronha no ombro direito.
    const gunY = 5.3, gunX = 1.6;
    const limbs = {};
    for (const side of [-1, 1]) {
      const upper = part(BODY.upperArm, shirt, side * 3.7, 5.4, 0, torso);
      const fore = part(BODY.forearm, shirt, 0, -2.8, 0, upper);
      part(BODY.hand, skin, 0, 0, 0, fore);
      limbs[side > 0 ? 'right' : 'left'] = { upper, fore };
    }
    const gun = new THREE.Group();
    gun.position.set(gunX, gunY, 1.2);
    torso.add(gun);
    // a mesma arma das unidades (WeaponModels), deitada: o cano dela (-y) vira +z
    const weapon = weaponModel(blunderbuss ? 'blunderbuss' : 'rifle');
    weapon.group.rotation.x = -Math.PI / 2;
    weapon.group.position.z = .6;
    gun.add(weapon.group);
    const bolt = weapon.bolt, storedRod = weapon.ramrod;
    let ramrod = null;
    if (blunderbuss) {
      ramrod = part(RAMROD, ROD, 0, 0, 0, gun);            // socando pela boca, na recarga
      ramrod.visible = false;
    }
    shooter.userData = { torso, head, gun, bolt, ramrod, storedRod, blunderbuss, ...limbs };
    TowerRenderer.#cycle(shooter.userData, 1);
    frame.add(shooter);
    return shooter;
  }

  // Um ciclo de tiro do atirador ajoelhado, com `s` de 0 (acabou de atirar) a 1 (na
  // mira, pronto). O coice é seco e decai (0–12%). Fuzil: a mão esquerda vai ao
  // ferrolho, abre (a cápsula salta), fecha e volta ao guarda-mão. Bacamarte: a arma
  // sobe de boca para o alto e a vareta soca duas vezes antes de voltar à mira.
  static #cycle(u, s) {
    const { torso, head, gun, bolt, ramrod, storedRod, left, right, blunderbuss } = u;
    const kick = s < .2 ? Math.min(1, s / .02) * Math.exp(-s * (blunderbuss ? 16 : 24)) : 0;
    // a mira: os dois braços fechando na arma, à direita do peito
    let rUp = -1.15, rFore = -.35, lUp = -1.35, lFore = -.15, lZ = .55;
    let gunPitch = -.16, lean = .16;
    if (blunderbuss) {
      const up = span(s, .12, .24) * (1 - span(s, .8, .94));
      gunPitch = -.16 - 1.25 * up;                         // de boca para cima
      rUp = -1.15 + .55 * up; rFore = -.35 - .5 * up;
      lean = .16 - .12 * up;
      ramrod.visible = s > .26 && s < .78;
      storedRod.visible = !ramrod.visible;
      const stroke = s > .3 && s < .74 ? Math.max(0, Math.sin((s - .3) / .44 * Math.PI * 4 - Math.PI / 2)) : 0;
      ramrod.position.z = 7.6 - 3.4 * stroke;               // entra e sai pela boca
      lUp = -1.35 - 1.05 * up + .3 * stroke; lFore = -.15 - .2 * up; lZ = .55 + .15 * up;
    } else {
      const toBolt = span(s, .14, .26) * (1 - span(s, .66, .8));
      const open = span(s, .28, .38) * (1 - span(s, .46, .56));
      bolt.position.y = WEAPON_BOLT_Y + 1.1 * open;           // corre para trás, para a coronha
      bolt.rotation.y = -1.1 * span(s, .26, .3) * (1 - span(s, .54, .58));   // a alavanca sobe antes
      lUp = -1.35 + .3 * toBolt; lFore = -.15 - .9 * toBolt - .25 * open; lZ = .55 - .1 * toBolt;
      gunPitch = -.16 + .12 * toBolt;                      // cano um pouco para baixo enquanto mexe na culatra
    }
    torso.rotation.x = lean - .16 * kick;
    head.rotation.x = -.2 + .1 * kick;
    gun.rotation.x = gunPitch - (blunderbuss ? .4 : .26) * kick;
    gun.position.z = 1.2 - .5 * kick;
    right.upper.rotation.set(rUp - .2 * kick, 0, -.35);
    right.fore.rotation.x = rFore;
    left.upper.rotation.set(lUp - .18 * kick, 0, lZ);
    left.fore.rotation.x = lFore;
  }
}
