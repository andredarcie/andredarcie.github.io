import * as THREE from 'three';
import { PALETTE } from './Palette.js';

export const WINDOW_DARK = new THREE.Color(0x241c14);
const WALL_HEIGHT = 10;
// Todos com cor por vértice: cada peça traz o seu degradê de sombra e a sua variação
// de tom (pedra mais clara, tábua mais escura) sem precisar de material novo.
const lambert = color => new THREE.MeshLambertMaterial({ color, vertexColors: true });
const M = {
  taipa: lambert(PALETTE.taipa),
  taipaDark: lambert(PALETTE.taipaDark),
  whitewash: lambert(PALETTE.whitewash),
  roofMud: lambert(PALETTE.roofMud),
  roofTile: lambert(PALETTE.roofTile),
  stick: lambert(PALETTE.stick),
  doorway: lambert(0x2a2018),
  door: lambert(0x7a5a3a),
  sack: lambert(0xcbb98f),
  stone: lambert(0xa89a82),
  stoneDark: lambert(0x7d705c),
  base: lambert(0x9a8a72),
  trim: lambert(0xc9a46c),              // cantaria pintada de ocre da igreja
  paintBlue: lambert(0x5d7d96),         // barrado das casas caiadas
  paintOchre: lambert(0xb9863f),
  paintRed: lambert(0x9a4b36),
  clay: lambert(0xa65a3a),              // potes e moringas de barro cozido
  brass: lambert(0xb08a3c),
  iron: lambert(0x3c3a38),
  straw: lambert(0xb89c5e),
  water: lambert(0x5f7d86),
  ash: lambert(0x4a443e),
  goatWhite: lambert(0xe6e0d2),
  goatBrown: lambert(0x7a5a3c),
  goatBlack: lambert(0x3a3430),
  horn: lambert(0xcfc4a8)
};
const SHARED_MATERIALS = new Set(Object.values(M));

/* ---------- o kit de montagem ---------- */
// Junta as peças da construção e, no fim, funde tudo numa malha por material: muito
// detalhe, poucas chamadas de desenho. `frame` é o referencial corrente (para montar
// uma fachada, uma cabra, um telhado girado como se estivessem na origem).
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
class Kit {
  #items = new Map();
  #state;
  frame = new THREE.Matrix4();

  constructor(seed) { this.#state = (Math.floor(Math.abs(seed) * 7919) % 2147483646) + 1; }
  rand() { this.#state = (this.#state * 16807) % 2147483647; return (this.#state - 1) / 2147483646; }
  range(a, b) { return a + (b - a) * this.rand(); }
  pick(list) { return list[Math.floor(this.rand() * list.length) % list.length]; }
  at(x, y, z, ry = 0, scale = 1) {
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
      new THREE.Vector3(scale, scale, scale));
  }
  with(matrix, fn) {
    const saved = this.frame;
    this.frame = saved.clone().multiply(matrix);
    fn();
    this.frame = saved;
  }

  // o: { rx, ry, rz, scale (número ou [x,y,z]), shade: [pé, topo] | false, tint: número | [r,g,b] }
  geom(source, material, x = 0, y = 0, z = 0, o = {}) {
    const g = source.index ? source.toNonIndexed() : source;
    const pos = g.attributes.position;
    g.computeBoundingBox();
    const min = g.boundingBox.min.y, h = Math.max(1e-6, g.boundingBox.max.y - min);
    const [bottom, top] = o.shade === false ? [1, 1] : (o.shade ?? [.84, 1.03]);
    const tint = o.tint ?? 1;
    const [tr, tg, tb] = Array.isArray(tint) ? tint : [tint, tint, tint];
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = bottom + (top - bottom) * Math.sqrt((pos.getY(i) - min) / h);
      colors[i * 3] = k * tr; colors[i * 3 + 1] = k * tg; colors[i * 3 + 2] = k * tb;
    }
    _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    if (Array.isArray(o.scale)) _s.set(o.scale[0], o.scale[1], o.scale[2]); else _s.setScalar(o.scale ?? 1);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s).premultiply(this.frame);
    g.applyMatrix4(_m);
    if (!this.#items.has(material)) this.#items.set(material, []);
    this.#items.get(material).push({ position: g.attributes.position.array, normal: g.attributes.normal.array, color: colors });
  }
  box(w, h, d, material, x, y, z, o) { this.geom(new THREE.BoxGeometry(w, h, d), material, x, y, z, o); }
  cyl(rt, rb, h, material, x, y, z, o = {}) {
    this.geom(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 8, 1, false, o.start ?? 0, o.arc ?? Math.PI * 2), material, x, y, z, o);
  }
  ball(r, material, x, y, z, o = {}) { this.geom(new THREE.SphereGeometry(r, o.seg ?? 8, o.rings ?? 6), material, x, y, z, o); }
  // um pau roliço entre dois pontos [x, y, z]
  stick(a, b, r, material, o = {}) {
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const g = new THREE.CylinderGeometry(r, r, dir.length(), o.seg ?? 5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
    this.geom(g, material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, o);
  }

  finish(group) {
    for (const [material, list] of this.#items) {
      let n = 0;
      for (const item of list) n += item.position.length;
      const position = new Float32Array(n), normal = new Float32Array(n), color = new Float32Array(n);
      let o = 0;
      for (const item of list) {
        position.set(item.position, o); normal.set(item.normal, o); color.set(item.color, o);
        o += item.position.length;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}

// Referencial de uma fachada: origem no ponto (x, z) da parede, +x para fora dela e
// z correndo ao longo dela. Assim porta, janela e remendo se desenham de um jeito só.
const FACE_TURN = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 };
const onFace = (kit, side, x, z, fn) => kit.with(kit.at(x, 0, z, FACE_TURN[side]), fn);

// Vão em arco (janela, porta, sineira) no referencial da fachada: o fundo escuro, a
// volta de cima, e — com `trim` — as ombreiras, o arco de cantaria e o peitoril.
function arch(kit, w, h, y, fill, trim, z = 0) {
  const r = w / 2;
  kit.box(.2, h, w, fill, .1, y + h / 2, z, { shade: false });
  kit.cyl(r, r, .2, fill, .1, y + h, z, { arc: Math.PI, rz: Math.PI / 2, seg: 12, shade: false });
  if (!trim) return;
  const t = .55;
  for (const s of [-1, 1]) kit.box(.5, h, t, trim, .3, y + h / 2, z + s * (r + t / 2));
  kit.geom(new THREE.TorusGeometry(r + t / 2, t / 2, 5, 14, Math.PI).rotateY(Math.PI / 2), trim, .3, y + h, z);
  kit.box(.8, .45, w + t * 2 + .5, trim, .4, y - .22, z);
}

// Fiada de pedras soltas em volta de um retângulo (meias medidas hx, hz): o rodapé.
function stoneRow(kit, hx, hz, h) {
  const run = (len, place) => {
    let t = -len / 2;
    while (t < len / 2 - .3) {
      const l = Math.min(kit.range(1.3, 2.5), len / 2 - t);
      place(t + l / 2, l - .14, kit.range(.75, 1.05) * h);
      t += l;
    }
  };
  for (const s of [-1, 1]) {
    run(hz * 2, (c, l, sh) => kit.box(1.1, sh, l, M.stone, s * hx, sh / 2, c, { tint: kit.range(.82, 1.1), shade: [.7, 1.02] }));
    run(hx * 2, (c, l, sh) => kit.box(l, sh, 1.1, M.stone, c, sh / 2, s * hz, { tint: kit.range(.82, 1.1), shade: [.7, 1.02] }));
  }
}

// As construções de Belo Monte. As casas eram de taipa — pau-a-pique: uma trama de
// varas barreada à mão —, baixas, de uma porta e uma janela, cobertas de barro sobre
// varas, coladas umas nas outras em becos estreitos (Euclides da Cunha contou mais
// de cinco mil). Em obra, aparece a trama de varas e o barro subindo. O armazém é
// uma casa maior, com alpendre e sacos de farinha à porta. A igreja de Santo
// Antônio, a "igreja velha" na praça, é caiada de branco, de telha de barro, com a
// torre sineira e o cruzeiro de madeira em frente.
// Orientação: a fachada (porta) fica no +x local, que o giro do grupo vira para o
// lado da porta na simulação; o comprido da casa corre em z.
export class SertaoBuildingModel {
  build(kind, progress, built, size) {
    const group = new THREE.Group();
    const parts = { group, windows: null };
    const kit = new Kit(size.width * 13 + size.depth * 7 + kind.length * 31 + (built ? 0 : progress * 100));
    if (kind === 'hall') this.#church(kit, parts, size);
    else if (kind === 'igrejanova') this.#newChurch(kit, progress, built, size);
    else if (kind === 'curral') this.#pen(kit, progress, built, size);
    else this.#house(kit, parts, kind, progress, built, size);
    kit.finish(group);
    return parts;
  }

  // Descarta só o que é da construção (formas e o material da janela).
  dispose(group) {
    group.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      if (!SHARED_MATERIALS.has(node.material)) node.material.dispose();
    });
  }

  /* ===================== casa de taipa e armazém ===================== */
  #house(kit, parts, kind, progress, built, size) {
    const lodge = kind === 'lodge';
    const F = size.depth * .8, L = size.width * .82, hf = F / 2, hl = L / 2;
    const B = .9, H = WALL_HEIGHT, top = B + H;
    // Rodapé de pedra solta, onde a parede encosta no chão.
    kit.box(F + .4, B, L + .4, M.base, 0, B / 2, 0, { shade: [.7, 1] });
    stoneRow(kit, hf + .25, hl + .25, B + .25);
    const wallH = built ? H : H * Math.max(.08, progress);
    if (!built) this.#wattle(kit, F, L, B, H, progress);
    // O barro (subindo com a obra).
    kit.box(F, wallH, L, M.taipa, 0, B + wallH / 2, 0, { shade: [.76, 1.04], tint: kit.range(.93, 1.05) });
    if (!built) return;

    // Respingo da chuva no pé da parede, os esteios dos cantos e o frechal sob o beiral.
    kit.box(F + .14, .9, L + .14, M.taipaDark, 0, B + .45, 0, { shade: [.85, 1] });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) kit.box(.7, H + .2, .7, M.stick, sx * (hf - .15), B + (H + .2) / 2, sz * (hl - .15), { tint: kit.range(.85, 1.1) });
      kit.box(.6, .6, L + .7, M.stick, sx * (hf + .05), top - .3, 0);
    }
    const doorZ = -L * .18, dw = 3.6, dh = 7.2;
    const wz = L * .22, ww = 2.8, wh = 2.6, wy = top - 3.4;
    // Metade das casas tem a frente caiada, com o barrado colorido embaixo.
    if (kit.rand() < .55) {
      const barrado = kit.pick([M.paintBlue, M.paintOchre, M.paintRed]);
      kit.box(.16, H - 2.8, L - .3, M.whitewash, hf + .08, B + 2.2 + (H - 2.8) / 2, 0, { shade: [.9, 1.03] });
      kit.box(.2, 2.2, L - .3, barrado, hf + .1, B + 1.1, 0, { shade: [.85, 1.02], tint: kit.range(.85, 1) });
    }
    // Remendos onde o reboco caiu e a trama de varas aparece.
    const patches = 2 + Math.floor(kit.rand() * 3);
    for (let i = 0; i < patches; i++) {
      const side = kit.pick(['+z', '-z', '-x', '-x']);
      const along = side[1] === 'x' ? L : F;
      const fx = side === '-x' ? -hf : 0, fz = side === '+z' ? hl : side === '-z' ? -hl : 0;
      const u = (kit.rand() - .5) * along * .6, y = B + 2.6 + kit.rand() * 4.2;
      const w = kit.range(1.8, 3.2), h = kit.range(1.2, 2.2);
      onFace(kit, side, fx, fz, () => {
        kit.box(.16, h, w, M.taipaDark, .06, y, u, { shade: [.85, 1] });
        for (let k = 0; k < 2; k++) kit.box(.2, .2, w + .3, M.stick, .2, y - h * .25 + k * h * .5, u, { tint: kit.range(.85, 1.1) });
        for (let k = 0; k < 3; k++) kit.box(.2, h + .2, .2, M.stick, .28, y, u - w * .3 + k * w * .3, { tint: kit.range(.85, 1.1) });
      });
    }
    const windows = new THREE.MeshLambertMaterial({ color: WINDOW_DARK, vertexColors: true });
    parts.windows = windows.color;
    onFace(kit, '+x', hf, 0, () => {
      // Porta de duas folhas (meia-porta): a de baixo fechada, a de cima aberta.
      kit.box(.24, dh, dw, M.doorway, .1, B + dh / 2, doorZ, { shade: false });
      for (const s of [-1, 1]) kit.box(.55, dh + .5, .55, M.stick, .25, B + (dh + .5) / 2, doorZ + s * (dw / 2 + .27), { tint: kit.range(.85, 1.05) });
      kit.box(.7, .7, dw + 1.8, M.stick, .3, B + dh + .45, doorZ);
      const low = dh * .48, plank = dw / 3;
      for (let k = 0; k < 3; k++) kit.box(.28, low, plank - .08, M.door, .32, B + low / 2, doorZ - dw / 2 + plank * (k + .5), { tint: kit.range(.82, 1.1) });
      kit.box(.36, .35, dw - .2, M.door, .45, B + low * .7, doorZ, { tint: .75 });
      const leaf = dw - .1, a = 1.25, hingeZ = doorZ - dw / 2;
      kit.box(.26, dh - low - .1, leaf, M.door, .4 + leaf / 2 * Math.sin(a), B + low + (dh - low) / 2, hingeZ + leaf / 2 * Math.cos(a),
        { ry: a, tint: kit.range(.85, 1.05) });
      kit.box(1.6, B, dw + .8, M.stone, .8, B / 2, doorZ, { tint: kit.range(.85, 1.05), shade: [.75, 1.02] });   // soleira
      // Janela de tábua, com o caixilho, o peitoril e as duas folhas abertas.
      kit.box(.24, wh, ww, windows, .1, wy, wz, { shade: false });
      for (const s of [-1, 1]) {
        kit.box(.5, .45, ww + 1, M.stick, .25, wy + s * (wh / 2 + .22), wz);
        kit.box(.5, wh, .45, M.stick, .25, wy, wz + s * (ww / 2 + .22));
        const l = ww / 2, open = 1.35, hz = wz + s * (ww / 2 + .45);
        kit.box(.2, wh, l, M.door, .35 + l / 2 * Math.sin(open), wy, hz - s * l / 2 * Math.cos(open), { ry: -s * open, tint: kit.range(.85, 1.08) });
      }
      kit.box(1.2, .35, ww + 1.4, M.stick, .5, wy - wh / 2 - .45, wz);
    });
    // Telhado baixo de barro sobre varas, com beiral, oitões e a cumeeira roliça.
    this.#roof(kit, F + 2.6, L + 2.4, 3.2, top, F, L, 'mud', M.taipa);
    this.#yard(kit, hf, hl, doorZ, dw, wz);
    if (lodge) this.#porch(kit, hf, hl, top, L);
  }

  // A obra: a trama de varas do pau-a-pique, as ripas dos dois lados, a armação do
  // telhado quando as paredes já vão altas, o monte de barro e a gamela d'água.
  #wattle(kit, F, L, B, H, progress) {
    const hf = F / 2, hl = L / 2;
    const posts = (len, place) => {
      const n = Math.max(2, Math.round(len / 2.4));
      for (let i = 0; i <= n; i++) place(-len / 2 + len * i / n);
    };
    for (const s of [-1, 1]) {
      posts(L, z => kit.cyl(.26, .3, H + .8, M.stick, s * hf, B + (H + .8) / 2, z, { tint: kit.range(.85, 1.1), seg: 5 }));
      posts(F, x => kit.cyl(.26, .3, H + .8, M.stick, x, B + (H + .8) / 2, s * hl, { tint: kit.range(.85, 1.1), seg: 5 }));
      for (let y = B + .7; y < B + H; y += 1.15) {
        for (const inset of [.28, -.28]) {
          kit.box(.22, .22, L + .3, M.stick, s * (hf + inset), y, 0, { tint: kit.range(.8, 1.1) });
          kit.box(F + .3, .22, .22, M.stick, 0, y, s * (hl + inset), { tint: kit.range(.8, 1.1) });
        }
      }
    }
    if (progress >= .6) {
      const half = hf + 1.3, rise = 3.2, ang = Math.atan2(rise, half), slope = Math.hypot(half, rise);
      for (const s of [-1, 1]) {
        for (let z = -hl; z <= hl + .01; z += 1.8) kit.box(slope, .3, .3, M.stick, s * half / 2, B + H + rise / 2, z, { rz: -s * ang, tint: kit.range(.85, 1.1) });
      }
      kit.cyl(.35, .35, L + 1, M.stick, 0, B + H + rise, 0, { rx: Math.PI / 2 });
    }
    kit.ball(2.6, M.taipaDark, hf + 5, .2, hl * .35, { scale: [1, .38, 1.2], shade: [.8, 1.05] });
    kit.ball(1.5, M.taipa, hf + 4, .3, hl * .35 + 2.6, { scale: [1, .45, 1], shade: [.8, 1.05] });
    kit.box(1.6, .9, 3.4, M.door, hf + 4.5, .45, -hl * .45, { tint: .85 });
    kit.box(1.2, .1, 3, M.water, hf + 4.5, .86, -hl * .45, { shade: false });
  }

  // Telhado de duas águas com espessura, cumeeira ao longo de z, beiral, pontas dos
  // caibros e os oitões (os triângulos de parede nas pontas). 'mud': barro sobre
  // varas, com os cordões de barro; 'tile': telha-canal em fileiras, capa e canal.
  #roof(kit, span, length, rise, y0, wallWidth, wallLength, style, gableMaterial) {
    const half = span / 2, slope = Math.hypot(half, rise), ang = Math.atan2(rise, half);
    const thick = style === 'tile' ? .8 : .7;
    const mat = style === 'tile' ? M.roofTile : M.roofMud;
    for (const s of [-1, 1]) {
      const nx = s * Math.sin(ang), ny = Math.cos(ang), ux = s * Math.cos(ang), uy = -Math.sin(ang);
      // um ponto a `d` da cumeeira, descendo a água, e `lift` acima da face de baixo
      const along = (d, lift) => [ux * d + nx * lift, y0 + rise + uy * d + ny * lift];
      const [cx, cy] = along(slope / 2, thick / 2);
      kit.box(slope + .3, thick, length, mat, cx, cy, 0, { rz: -s * ang, shade: [.8, 1.02] });
      if (style === 'tile') {
        for (let z = -length / 2 + .45, k = 0; z < length / 2 - .3; z += 1.05, k++) {
          const lift = k % 2 ? .25 : .5;
          const [tx, ty] = along(slope / 2 + .1, thick + lift / 2);
          kit.box(slope + .5, lift, .6, M.roofTile, tx, ty, z, { rz: -s * ang, tint: kit.range(.82, 1.12), shade: [.9, 1.05] });
        }
      } else {
        for (let d = 1.2; d < slope - .4; d += kit.range(1.3, 1.8)) {
          let z = -length / 2 + .2;
          while (z < length / 2 - .5) {
            const l = Math.min(kit.range(2.5, 5), length / 2 - z);
            const [tx, ty] = along(d, thick + .1);
            kit.box(.6, .28, l - .3, M.roofMud, tx, ty, z + l / 2, { rz: -s * ang, tint: kit.range(.86, 1.08) });
            z += l;
          }
        }
      }
      for (let z = -length / 2 + 1; z < length / 2 - .5; z += 2.2) {
        const [ex, ey] = along(slope - .6, -.25);
        kit.box(1.4, .42, .42, M.stick, ex, ey, z, { rz: -s * ang, tint: kit.range(.85, 1.05) });
      }
    }
    if (style === 'tile') kit.box(1.4, .7, length + .2, M.roofTile, 0, y0 + rise + thick + .1, 0, { tint: .9 });
    else kit.cyl(.45, .45, length + 1, M.stick, 0, y0 + rise + thick * .9, 0, { rx: Math.PI / 2, tint: .9 });
    if (gableMaterial) {
      const hw = wallWidth / 2;
      const shape = new THREE.Shape([new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0), new THREE.Vector2(0, rise)]);
      for (const s of [-1, 1]) {
        kit.geom(new THREE.ExtrudeGeometry(shape, { depth: .8, bevelEnabled: false }), gableMaterial, 0, y0, s > 0 ? wallLength / 2 - .8 : -wallLength / 2,
          { shade: [.9, 1.02] });
      }
    }
  }

  // O terreiro: três coisas do dia a dia, sorteadas por casa.
  #yard(kit, hf, hl, doorZ, dw, wz) {
    const all = ['bench', 'pot', 'wood', 'pestle', 'stove', 'jar'];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(kit.rand() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    for (const item of all.slice(0, 3)) {
      if (item === 'bench') {
        // banco de tábua debaixo da janela
        kit.box(1.2, .35, 3.8, M.door, hf + 1.6, 1.55, wz, { tint: kit.range(.85, 1.05) });
        for (const s of [-1, 1]) kit.box(1, 1.4, .35, M.stick, hf + 1.6, .7, wz + s * 1.4);
      } else if (item === 'pot') {
        // pote d'água na forquilha de três paus
        const cx = hf + 2, cz = doorZ - dw / 2 - 2.4;
        for (let k = 0; k < 3; k++) {
          const a = k / 3 * Math.PI * 2;
          kit.stick([cx + Math.cos(a) * 1.2, 0, cz + Math.sin(a) * 1.2], [cx, 3.7, cz], .16, M.stick, { tint: kit.range(.85, 1.1) });
        }
        kit.ball(1.15, M.clay, cx, 4.2, cz, { scale: [1, .95, 1], shade: [.75, 1.05] });
        kit.cyl(.55, .7, .6, M.clay, cx, 5.2, cz, { seg: 10 });
      } else if (item === 'wood') {
        // lenha empilhada encostada no oitão
        const x0 = -hf * .25;
        for (let r = 0; r < 3; r++) {
          for (let k = 0; k < 4 - r; k++) {
            kit.cyl(.42, .42, 3.6, M.door, x0, .42 + r * .74, hl + 1.9 + (k - (3 - r) / 2) * .86, { rz: Math.PI / 2, tint: kit.range(.85, 1.2), seg: 6 });
          }
        }
      } else if (item === 'pestle') {
        // pilão de madeira com a mão de pilão encostada
        const x = -hf - 1.8, z = -hl * .3;
        kit.cyl(.95, .75, 2.3, M.door, x, 1.15, z, { seg: 10, tint: kit.range(.85, 1.05) });
        kit.cyl(.7, .7, .06, M.doorway, x, 2.31, z, { seg: 10 });
        kit.stick([x + .2, 1.6, z], [x + 1.2, 5.4, z + .4], .22, M.door, { tint: 1.1 });
      } else if (item === 'stove') {
        // fogão de três pedras, cinza, tições e a panela de barro
        const x = -hf - 3, z = hl * .3;
        for (let k = 0; k < 3; k++) {
          const a = k / 3 * Math.PI * 2 + .4;
          kit.ball(.65, M.stone, x + Math.cos(a) * 1, .4, z + Math.sin(a) * 1, { tint: kit.range(.8, 1.05), scale: [1, .8, 1] });
        }
        kit.cyl(1.4, 1.5, .12, M.ash, x, .06, z, { seg: 10, shade: false });
        kit.stick([x - 1.6, .2, z - .8], [x + .2, .4, z], .18, M.iron);
        kit.ball(.85, M.clay, x, 1.25, z, { scale: [1, .8, 1], shade: [.6, 1] });
      } else {
        // moringa ao pé da porta
        const x = hf + 1.3, z = doorZ + dw / 2 + 1.2;
        kit.ball(.75, M.clay, x, .85, z, { scale: [1, 1.15, 1], shade: [.7, 1.05] });
        kit.cyl(.3, .4, .5, M.clay, x, 1.8, z, { seg: 8 });
      }
    }
  }

  // Alpendre do armazém: esteios de forquilha, a travessa, os caibros, a cobertura de
  // palha e, embaixo, os sacos de farinha, os barris e o caixote.
  #porch(kit, hf, hl, top, L) {
    const P = 7, px = hf + P, hi = top - .4, lo = 9.2;
    for (const z of [-hl + 1, 0, hl - 1]) {
      kit.cyl(.42, .5, lo - .4, M.stick, px, (lo - .4) / 2, z, { tint: kit.range(.85, 1.1), seg: 6 });
      kit.stick([px, lo - .9, z], [px + .5, lo + .3, z + .3], .17, M.stick);
      kit.stick([px, lo - .9, z], [px - .5, lo + .3, z - .3], .17, M.stick);
    }
    kit.cyl(.4, .4, L + 1.2, M.stick, px, lo - .45, 0, { rx: Math.PI / 2 });
    const ang = Math.atan2(hi - lo, P), slope = Math.hypot(P, hi - lo), cy = (hi + lo) / 2;
    for (let z = -hl; z <= hl + .01; z += 2.2) kit.box(slope + 1, .32, .32, M.stick, hf + P / 2, cy, z, { rz: -ang });
    kit.box(slope + 1.6, .45, L + 1.8, M.straw, hf + P / 2 + .2, cy + .4, 0, { rz: -ang, shade: [.8, 1.02] });
    for (let d = .6; d < slope; d += 1.1) {
      kit.box(.5, .25, L + 1.6, M.straw, hf + d * Math.cos(ang) + .2, hi - d * Math.sin(ang) + .7, 0, { rz: -ang, tint: kit.range(.85, 1.1) });
    }
    // sacos: duas fileiras e um por cima
    const sack = (x, y, z) => {
      kit.ball(1.15, M.sack, x, y, z, { scale: [1, 1.15, .85], tint: kit.range(.88, 1.05), shade: [.75, 1.05] });
      kit.cyl(.3, .45, .5, M.sack, x, y + 1.35, z, { seg: 6 });
      kit.box(.75, .16, .75, M.stick, x, y + 1.15, z);
    };
    const sz = hl * .35;
    sack(hf + 1.8, 1.2, sz); sack(hf + 4, 1.2, sz); sack(hf + 1.8, 1.2, sz + 2.1); sack(hf + 4, 1.2, sz + 2.1);
    sack(hf + 2.9, 3.3, sz + 1);
    // barris de ripas com os arcos de ferro, e o caixote
    for (const [x, z] of [[hf + 2, -hl + 2.6], [hf + 4.3, -hl + 2.2]]) {
      kit.cyl(1, .92, 2.6, M.door, x, 1.3, z, { seg: 12, tint: kit.range(.85, 1.05) });
      for (const y of [.5, 2.1]) kit.cyl(1.03, 1.03, .25, M.iron, x, y, z, { seg: 12 });
    }
    kit.box(2, 1.6, 2, M.door, hf + 3, .8, -hl + 5.2, { tint: 1.1 });
    for (const y of [.4, 1.2]) kit.box(2.06, .15, 2.06, M.stick, hf + 3, y, -hl + 5.2);
  }

  /* ===================== igreja de Santo Antônio (a velha) ===================== */
  #church(kit, parts, size) {
    const N = size.width * .78, W = 20, wall = 24, y0 = 1;
    const hn = N / 2, hw = W / 2;
    kit.box(N + 2.4, y0, W + 2.4, M.base, 0, y0 / 2, 0, { shade: [.7, 1] });
    stoneRow(kit, hn + 1, hw + 1, y0 + .3);
    // A nave caiada, o rodapé, a cimalha em dois degraus e os cunhais de cantaria.
    kit.box(N, wall, W, M.whitewash, 0, y0 + wall / 2, 0, { shade: [.82, 1.03] });
    kit.box(N + .3, 1.5, W + .3, M.trim, 0, y0 + .75, 0, { shade: [.85, 1] });
    kit.box(N + 1.4, 1, W + 1.4, M.trim, 0, y0 + wall - .5, 0);
    kit.box(N + .7, .5, W + .7, M.trim, 0, y0 + wall - 1.3, 0);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) kit.box(1.8, wall - 1.5, 1.8, M.trim, sx * (hn - .6), y0 + .75 + (wall - 1.5) / 2, sz * (hw - .6));
    }
    const windows = new THREE.MeshLambertMaterial({ color: WINDOW_DARK, vertexColors: true });
    parts.windows = windows.color;
    // Janelas altas em arco dos dois lados da nave.
    for (const side of ['+z', '-z']) {
      for (let i = 1; i <= 3; i++) onFace(kit, side, -hn + N * i / 4.4, side === '+z' ? hw : -hw, () => arch(kit, 2.6, 5, y0 + 12, windows, M.trim));
    }
    // A fachada: pano mais saliente, quatro pilastras, o entablamento e o frontão
    // recortado em volutas, com o óculo, os pináculos e a cruz no alto.
    const fx = hn;
    kit.box(1.6, wall + .4, W + 1.2, M.whitewash, fx + .6, y0 + (wall + .4) / 2, 0, { shade: [.84, 1.03] });
    for (const z of [-(hw + .1), -W * .2, W * .2, hw + .1]) kit.box(2, wall - 1.5, 1.7, M.trim, fx + .75, y0 + .75 + (wall - 1.5) / 2, z);
    kit.box(2.6, 1.2, W + 2.4, M.trim, fx + .7, y0 + wall + .2, 0);
    const pedY = y0 + wall + .8, ph = hw + .5;
    const outline = scale => {
      const s = new THREE.Shape(), w = ph * scale, k = scale;
      s.moveTo(-w, 0);
      s.lineTo(-w, 1.1 * k);
      s.bezierCurveTo(-w * .7, 1.1 * k, -w * .52, 2.4 * k, -w * .44, 5 * k);
      s.lineTo(-w * .22, 6.2 * k);
      s.quadraticCurveTo(0, 9 * k, w * .22, 6.2 * k);
      s.lineTo(w * .44, 5 * k);
      s.bezierCurveTo(w * .52, 2.4 * k, w * .7, 1.1 * k, w, 1.1 * k);
      s.lineTo(w, 0);
      s.closePath();
      return s;
    };
    const pediment = (scale, depth, material, x) => kit.geom(
      new THREE.ExtrudeGeometry(outline(scale), { depth, bevelEnabled: false, curveSegments: 8 }).rotateY(Math.PI / 2),
      material, x, pedY, 0, { shade: [.9, 1.03] });
    pediment(1.07, 1, M.trim, fx - .3);
    pediment(1, 1.3, M.whitewash, fx - .1);
    kit.geom(new THREE.TorusGeometry(1.4, .35, 6, 16).rotateY(Math.PI / 2), M.trim, fx + 1.3, pedY + 3.3, 0);
    kit.cyl(1.25, 1.25, .2, windows, fx + 1.2, pedY + 3.3, 0, { rz: Math.PI / 2, seg: 16, shade: false });
    kit.box(.6, 4.2, .6, M.iron, fx + .6, pedY + 9.5, 0);
    kit.box(.6, .6, 2.6, M.iron, fx + .6, pedY + 10.4, 0);
    for (const s of [-1, 1]) {
      kit.box(1.4, 1, 1.4, M.trim, fx + .6, pedY + 1.6, s * (ph - .3));
      kit.cyl(0, .65, 2.4, M.trim, fx + .6, pedY + 3.3, s * (ph - .3), { seg: 4, ry: Math.PI / 4 });
      kit.cyl(0, .45, 1.6, M.trim, fx + .6, pedY + 6.2, s * ph * .44, { seg: 4, ry: Math.PI / 4 });
    }
    onFace(kit, '+x', fx + 1.4, 0, () => {
      // A porta grande em arco, de tábuas cravejadas, com a cantaria e o fecho.
      const dw = 6, dh = 9;
      kit.box(.2, dh, dw, M.doorway, .1, y0 + dh / 2, 0, { shade: false });
      kit.cyl(dw / 2, dw / 2, .2, M.door, .1, y0 + dh, 0, { arc: Math.PI, rz: Math.PI / 2, seg: 14, tint: .7 });
      for (const s of [-1, 1]) {
        for (let k = 0; k < 3; k++) kit.box(.3, dh - .2, dw / 6 - .08, M.door, .3, y0 + dh / 2, s * (dw / 6) * (k + .5), { tint: kit.range(.8, 1.08) });
        for (const y of [2.5, 5, 7.5]) kit.box(.2, .3, .3, M.iron, .5, y0 + y, s * dw / 4);
        kit.box(.7, dh, .8, M.trim, .35, y0 + dh / 2, s * (dw / 2 + .4));
      }
      kit.geom(new THREE.TorusGeometry(dw / 2 + .4, .4, 6, 16, Math.PI).rotateY(Math.PI / 2), M.trim, .35, y0 + dh, 0);
      kit.box(.9, 1.3, .9, M.trim, .45, y0 + dh + dw / 2 + .4, 0);
      // a escadaria de pedra do adro
      for (let k = 0; k < 3; k++) {
        const h = y0 - k * .33;
        kit.box(1.3, h, dw + 3 + k * 1.2, M.stone, .65 + k * 1.3, h / 2, 0, { tint: kit.range(.88, 1.05), shade: [.75, 1.02] });
      }
      // as duas janelas do coro
      for (const s of [-1, 1]) arch(kit, 2.2, 3.8, y0 + 14.5, windows, M.trim, s * W * .3);
    });
    this.#belfry(kit, fx + 1.4, hw, y0, wall, windows);
    // Telhado de telha-canal, cumeeira no comprido da nave.
    kit.with(new THREE.Matrix4().makeRotationY(Math.PI / 2), () => this.#roof(kit, W + 2.6, N + 1.2, 6.5, y0 + wall, W, N, 'tile', M.whitewash));
    // O cruzeiro de madeira no adro, sobre o pedestal de três degraus.
    const cx = fx + 8, cz = -hw - 5;
    kit.box(5.2, .7, 5.2, M.stone, cx, .35, cz, { tint: .95 });
    kit.box(3.8, .7, 3.8, M.stone, cx, 1.05, cz, { tint: 1.02 });
    kit.box(2.4, 1.2, 2.4, M.stone, cx, 2, cz, { tint: .92 });
    kit.box(1.1, 16, 1.1, M.door, cx, 2.6 + 8, cz, { tint: .8 });
    kit.box(1.1, 1.1, 7, M.door, cx, 2.6 + 12.5, cz, { tint: .8 });
    kit.box(.3, .8, 1.5, M.whitewash, cx + .7, 2.6 + 14, cz);
  }

  // A torre sineira no canto da fachada: cunhais, cornijas, a sineira aberta nos
  // quatro lados com o sino de bronze na frente, e o coruchéu de telha com a cruz.
  #belfry(kit, front, hw, y0, wall, windows) {
    const T = 7.4, TH = wall + 15, tx = front - T / 2, tz = hw + T / 2 - .2;
    kit.box(T, TH, T, M.whitewash, tx, y0 + TH / 2, tz, { shade: [.82, 1.03] });
    kit.box(T + .3, 1.5, T + .3, M.trim, tx, y0 + .75, tz, { shade: [.85, 1] });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) kit.box(1.5, TH - 1.5, 1.5, M.trim, tx + sx * (T / 2 - .5), y0 + .75 + (TH - 1.5) / 2, tz + sz * (T / 2 - .5));
    }
    kit.box(T + 1, 1, T + 1, M.trim, tx, y0 + wall - .5, tz);
    kit.box(T + .8, .7, T + .8, M.trim, tx, y0 + TH - 8, tz);
    kit.box(T + 1.6, 1, T + 1.6, M.trim, tx, y0 + TH - .5, tz);
    for (const [side, x, z] of [['+x', tx + T / 2, tz], ['-x', tx - T / 2, tz], ['+z', tx, tz + T / 2], ['-z', tx, tz - T / 2]]) {
      onFace(kit, side, x, z, () => arch(kit, 3, 3.8, y0 + TH - 7.2, M.doorway, M.trim));
    }
    onFace(kit, '+x', tx + T / 2, tz, () => arch(kit, 1.4, 2.6, y0 + wall * .5, windows, M.trim));
    // o sino pendurado na travessa, na boca da sineira
    const bx = tx + T / 2 + .1, by = y0 + TH - 4.9;
    kit.box(.6, .6, 3.4, M.door, bx, y0 + TH - 3.2, tz, { tint: .85 });
    kit.box(.5, .6, .5, M.iron, bx, y0 + TH - 3.6, tz);
    kit.cyl(.85, 1.45, 2.1, M.brass, bx, by, tz, { seg: 12, shade: [.75, 1.1] });
    kit.cyl(1.55, 1.55, .25, M.brass, bx, by - 1.1, tz, { seg: 12 });
    const r = (T / 2 + 1) * Math.SQRT2;
    kit.cyl(0, r, 5.5, M.roofTile, tx, y0 + TH + 2.75, tz, { seg: 4, ry: Math.PI / 4, shade: [.85, 1.05] });
    kit.ball(.5, M.trim, tx, y0 + TH + 5.9, tz);
    kit.box(.4, 2.6, .4, M.iron, tx, y0 + TH + 7.6, tz);
    kit.box(.4, .4, 1.6, M.iron, tx, y0 + TH + 8.1, tz);
  }

  /* ===================== igreja nova ===================== */
  // "Retangular, e vasto, e pesado", de paredes mestras espessas, de pedra; inacabada,
  // sem telhado, com as duas torres da fachada ainda nos andaimes — de onde os
  // jagunços atiravam. Em obra, as paredes sobem do chão em fiadas desencontradas.
  #newChurch(kit, progress, built, size) {
    const Lx = size.width * 1.02, Wz = size.depth * 1.02, hx = Lx / 2, hz = Wz / 2;
    const y0 = 1.2, thick = 2.6;
    const grow = built ? 1 : Math.max(.08, progress);
    const wall = 20 * grow;
    kit.box(Lx + 2, y0, Wz + 2, M.base, 0, y0 / 2, 0, { shade: [.7, 1] });
    stoneRow(kit, hx + .8, hz + .8, y0 + .3);
    kit.box(Lx - thick * 2, .4, Wz - thick * 2, M.roofMud, 0, y0 + .2, 0, { tint: .9, shade: false });
    // Paredes de pedra: fundo, laterais e a fachada com o vão da porta.
    this.#masonry(kit, { axis: 'z', x: -hx + thick / 2, z: 0, length: Wz - thick * 2, height: wall, thick, y0 });
    for (const s of [-1, 1]) this.#masonry(kit, { axis: 'x', x: 0, z: s * (hz - thick / 2), length: Lx, height: wall, thick, y0 });
    this.#masonry(kit, { axis: 'z', x: hx - thick / 2, z: 0, length: Wz - thick * 2, height: wall, thick, y0, opening: { from: -3.5, to: 3.5, top: 12 } });
    if (wall > 12.5) {
      // o arco de aduelas sobre a porta, com o enchimento dos cantos
      kit.geom(new THREE.TorusGeometry(3.9, .9, 6, 14, Math.PI).rotateY(Math.PI / 2), M.stone, hx - thick / 2, y0 + 8.1, 0, { scale: [1.7, 1, 1], tint: .96 });
      for (const s of [-1, 1]) kit.box(thick + .4, 2.2, 1.6, M.stone, hx - thick / 2, y0 + 10.9, s * 2.9, { tint: kit.range(.85, 1.05) });
    }
    // As duas torres da fachada, subindo com a obra, abertas em cima.
    const TH = Math.max(wall, 32 * grow);
    for (const s of [-1, 1]) this.#tower(kit, hx - 4.5, s * (hz - 4.5), TH, y0, s, built);
    // O canteiro: andaimes, a cábrea com a pedra pendurada, pedras lavradas, a masseira.
    if (built) {
      for (const s of [-1, 1]) {
        this.#scaffold(kit, '+x', hx, s * (hz - 4.5), 9, TH + 3, y0);
        this.#scaffold(kit, s > 0 ? '+z' : '-z', hx - 4.5, s * hz, 9, TH + 3, y0);
      }
    } else if (wall > 5) {
      this.#scaffold(kit, '+z', -hx * .2, hz, Lx * .45, wall + 2, y0);
    }
    if (wall > 5) this.#crane(kit, hx + 3, -hz * .1, Math.min(wall + 5, 24));
    for (let i = 0; i < 9; i++) {
      kit.box(kit.range(1.6, 2.8), kit.range(1, 1.4), kit.range(1.2, 1.8), M.stone, hx + 8 + (i % 3) * 2.4 + kit.range(-.3, .3),
        .6 + Math.floor(i / 3) * 1.25, hz * .45 + kit.range(-.4, .4), { tint: kit.range(.85, 1.12), ry: kit.range(-.2, .2) });
    }
    kit.box(4, .9, 2.2, M.door, hx + 7, .45, -hz * .55, { tint: .85 });
    kit.box(3.6, .15, 1.8, M.base, hx + 7, .86, -hz * .55, { tint: 1.15, shade: false });
    kit.ball(2.6, M.base, hx + 11, .2, -hz * .55, { scale: [1, .4, 1], tint: 1.18 });
    for (let i = 0; i < 3; i++) kit.cyl(.45, .45, 12, M.door, -hx * .3, y0 + .85 + i * .4, -hz * .4 + i * .95, { rz: Math.PI / 2 + kit.range(-.05, .05), tint: kit.range(.85, 1.1), seg: 6 });
  }

  // Um pano de alvenaria: o núcleo de argamassa mais escuro e as pedras em fiadas
  // desencontradas, salientes nas duas faces; a fiada de cima, incompleta.
  #masonry(kit, { axis, x, z, length, height, thick, y0, opening = null }) {
    const course = 1.5;
    const put = (u, y, len, h, material, extra, o) => {
      if (axis === 'x') kit.box(len, h, thick + extra, material, x + u, y, z, o);
      else kit.box(thick + extra, h, len, material, x, y, z + u, o);
    };
    const segs = opening ? [[-length / 2, opening.from], [opening.to, length / 2]] : [[-length / 2, length / 2]];
    for (const [a, b] of segs) if (b - a > .05) put((a + b) / 2, y0 + height / 2, b - a, height, M.stoneDark, -.1, { shade: [.7, 1] });
    if (opening && height > opening.top) {
      put((opening.from + opening.to) / 2, y0 + (opening.top + height) / 2, opening.to - opening.from, height - opening.top, M.stoneDark, -.1, { shade: [.7, 1] });
    }
    const courses = Math.max(1, Math.ceil(height / course));
    for (let k = 0; k < courses; k++) {
      const yb = k * course, last = k === courses - 1;
      let u = -length / 2 - (k % 2 ? kit.range(.6, 1.4) : 0);
      while (u < length / 2) {
        const len = kit.range(2.2, 3.6);
        const a = Math.max(u, -length / 2), b = Math.min(u + len, length / 2);
        u += len;
        let pieces = [[a, b]];
        if (opening && yb < opening.top && b > opening.from && a < opening.to) pieces = [[a, Math.min(b, opening.from)], [Math.max(a, opening.to), b]];
        for (const [pa, pb] of pieces) {
          if (pb - pa < .4) continue;
          let h = Math.min(course, height - yb) - .12;
          if (last) {
            if (kit.rand() < .25) continue;
            h *= kit.range(.35, 1);
          }
          if (h < .2) continue;
          put((pa + pb) / 2, y0 + yb + h / 2 + .06, pb - pa - .12, h, M.stone, .5, { tint: kit.range(.8, 1.12), shade: [.88, 1.04] });
        }
      }
    }
  }

  // Torre de pedra: fiadas marcadas, cunhais de pedra alternando comprido e curto,
  // as seteiras dos atiradores e o topo por acabar.
  #tower(kit, x, z, TH, y0, side, built) {
    const S = 9, h = S / 2;
    kit.box(S, TH, S, M.stone, x, y0 + TH / 2, z, { shade: [.78, 1.04], tint: .95 });
    for (let y = 1.5; y < TH; y += 1.5) kit.box(S + .15, .14, S + .15, M.stoneDark, x, y0 + y, z, { shade: false });
    for (let k = 0, y = 0; y < TH - .5; k++, y += 1.5) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const lx = (k + (sx === sz ? 0 : 1)) % 2 ? 2.4 : 1.3, lz = lx > 2 ? 1.3 : 2.4;
          kit.box(lx, 1.36, lz, M.stone, x + sx * (h - lx / 2 + .15), y0 + y + .74, z + sz * (h - lz / 2 + .15), { tint: kit.range(.95, 1.15), shade: [.9, 1.04] });
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      const bh = kit.range(.5, 1.5), along = kit.range(-h + 1, h - 1), edge = kit.pick([-1, 1]) * (h - 1);
      const [bx, bz] = kit.rand() < .5 ? [along, edge] : [edge, along];
      kit.box(kit.range(1.5, 2.8), bh, kit.range(1.4, 2.4), M.stone, x + bx, y0 + TH + bh / 2, z + bz, { tint: kit.range(.85, 1.1) });
    }
    if (!built) return;
    for (const [face, fx, fz] of [['+x', x + h, z], [side > 0 ? '+z' : '-z', x, z + side * h]]) {
      for (const y of [14, 22]) {
        if (y > TH - 2) continue;
        onFace(kit, face, fx, fz, () => {
          kit.box(.3, 3, .8, M.doorway, .1, y0 + y, 0, { shade: false });
          for (const s of [-1, 1]) kit.box(.5, 3.6, .7, M.stone, .2, y0 + y, s * .75, { tint: 1.1 });
        });
      }
    }
  }

  // Andaime de varas encostado numa face: duas fileiras de esteios, travessas,
  // tábuas em cada piso, as diagonais, as amarrações e a escada.
  #scaffold(kit, side, x, z, width, height, y0) {
    onFace(kit, side, x, z, () => {
      const zs = [];
      const n = Math.max(1, Math.round(width / 3.2));
      for (let i = 0; i <= n; i++) zs.push(-width / 2 - .4 + (width + .8) * i / n);
      for (const row of [1.3, 3.3]) {
        for (const pz of zs) kit.cyl(.22, .26, height, M.stick, row, y0 + height / 2 - .3, pz, { tint: kit.range(.85, 1.15), seg: 5 });
      }
      for (let y = 3.2, k = 0; y < height - .5; y += 3.2, k++) {
        for (const row of [1.3, 3.3]) kit.box(.26, .26, width + 1.4, M.stick, row, y0 + y, 0, { tint: kit.range(.85, 1.1) });
        for (const pz of zs) {
          kit.box(3.8, .24, .24, M.stick, 2, y0 + y + .25, pz, { tint: kit.range(.85, 1.1) });
          kit.box(.42, .42, .42, M.iron, 3.3, y0 + y, pz, { tint: 1.4 });
        }
        for (let p = 0; p < 3; p++) kit.box(.6, .18, width + .6, M.door, 1.6 + p * .65, y0 + y + .45, 0, { tint: kit.range(.85, 1.2) });
        for (let i = 0; i < zs.length - 1; i++) {
          const [a, b] = (i + k) % 2 ? [zs[i], zs[i + 1]] : [zs[i + 1], zs[i]];
          kit.stick([3.45, y0 + y - 3.2, a], [3.45, y0 + y, b], .12, M.stick, { tint: .95 });
        }
      }
      const lz = width / 2 + 1.4;
      for (const s of [-.45, .45]) kit.cyl(.14, .14, height - 1, M.stick, 3.6, y0 + (height - 1) / 2, lz + s, { seg: 4 });
      for (let y = .8; y < height - 1.2; y += .8) kit.box(.18, .18, 1, M.stick, 3.6, y0 + y, lz, { shade: false });
    });
  }

  // Cábrea: dois paus em A inclinados para a obra, o espia para trás, a corda com a
  // roldana e a pedra pendurada.
  #crane(kit, x, z, height) {
    const apex = [x - 2.5, height, z];
    for (const s of [-1, 1]) kit.stick([x + 4, 0, z + s * 2.6], apex, .3, M.stick, { tint: kit.range(.85, 1.1), seg: 6 });
    kit.stick(apex, [x + 13, 0, z], .07, M.iron, { seg: 4 });
    kit.cyl(.5, .5, .4, M.door, apex[0], height - .4, z, { rx: Math.PI / 2, seg: 8 });
    kit.stick([apex[0], height - .6, z], [apex[0], 4.1, z], .06, M.iron, { seg: 4 });
    kit.box(2, 1.4, 1.6, M.stone, apex[0], 3.3, z, { tint: 1.08 });
  }

  /* ===================== curral de cabras ===================== */
  // Cerca de faxina (varas finas fincadas entre os mourões, com três travessas), a
  // porteira entreaberta, a latada de palha no canto, o cocho de tronco escavado com
  // água, o feno e as cabras, de três pelagens, umas pastando, uns cabritos.
  #pen(kit, progress, built, size) {
    const wide = size.width * .9, deep = size.depth * .9, hw = wide / 2, hd = deep / 2;
    const share = built ? 1 : Math.max(.1, progress);
    const gate = wide * .16;
    const segs = [[[-hd, -hw], [hd, -hw]], [[hd, -hw], [hd, -gate]], [[hd, gate], [hd, hw]], [[hd, hw], [-hd, hw]], [[-hd, hw], [-hd, -hw]]];
    const posts = [];
    for (const [a, b] of segs) {
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.4));
      for (let i = 0; i <= n; i++) posts.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    }
    posts.slice(0, Math.ceil(posts.length * share)).forEach(([x, z]) => {
      const h = kit.range(4.6, 5.6);
      kit.cyl(.3, .36, h, M.stick, x, h / 2, z, { rx: kit.range(-.05, .05), rz: kit.range(-.05, .05), tint: kit.range(.82, 1.12), seg: 6 });
    });
    if (!built) return;
    for (const [a, b] of segs) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
      for (const y of [1.5, 3, 4.4]) {
        kit.stick([a[0], y + kit.range(-.15, .15), a[1]], [b[0], y + kit.range(-.15, .15), b[1]], .16, M.stick, { tint: kit.range(.85, 1.1) });
      }
      for (let t = .3; t < len - .2; t += .55) {
        const h = kit.range(2.6, 3.4), k = t / len, off = kit.range(.1, .3) * (Math.round(t / .55) % 2 ? 1 : -1);
        kit.cyl(.09, .11, h, M.stick, a[0] + (b[0] - a[0]) * k + nx * off, h / 2, a[1] + (b[1] - a[1]) * k + nz * off,
          { tint: kit.range(.78, 1.18), seg: 4, rz: kit.range(-.06, .06) });
      }
    }
    // a porteira: os mourões grossos e a folha entreaberta, com a mão-francesa
    for (const s of [-1, 1]) kit.cyl(.45, .5, 6.2, M.stick, hd, 3.1, s * gate, { tint: .9, seg: 7 });
    const l = gate * 2 - .8;
    kit.with(kit.at(hd + .2, 0, -gate + .4, .6), () => {
      for (const zz of [.2, l - .2]) kit.box(.35, 4, .35, M.door, 0, 2.6, zz, { tint: kit.range(.85, 1.05) });
      for (const y of [1.1, 2.1, 3.1, 4.1]) kit.box(.3, .3, l, M.door, 0, y, l / 2, { tint: kit.range(.85, 1.1) });
      kit.stick([0, 1.1, .3], [0, 4.1, l - .3], .15, M.door, { tint: .9 });
    });
    // a latada no canto do fundo, com o feno embaixo
    const lx = -hd + 4.8, lz = -hw + 4.5;
    for (const [dx, dz] of [[-3.6, -3.4], [3.6, -3.4], [-3.6, 3.4], [3.6, 3.4]]) {
      const h = dx > 0 ? 6.4 : 5.6;
      kit.cyl(.3, .36, h, M.stick, lx + dx, h / 2, lz + dz, { tint: kit.range(.85, 1.1), seg: 6 });
    }
    kit.box(9, .5, 8.6, M.straw, lx, 6.3, lz, { rz: .1, shade: [.8, 1.02] });
    for (let d = -3.8; d < 4; d += 1) kit.box(.5, .3, 8.4, M.straw, lx + d, 6.55 + d * .1, lz, { rz: .1, tint: kit.range(.85, 1.12) });
    for (let i = 0; i < 4; i++) kit.ball(1.4, M.straw, lx + kit.range(-2, 2), .3, lz + kit.range(-2, 2), { scale: [1.2, .55, 1], tint: kit.range(.9, 1.1) });
    // o cocho: meio tronco escavado, com água, sobre duas pedras
    const trough = new THREE.CylinderGeometry(1, 1, 7, 10, 1, false, 0, Math.PI).rotateZ(-Math.PI / 2);
    kit.geom(trough, M.door, 0, 1.1, hw - 2.2, { tint: .85 });
    kit.box(6.6, .1, 1.7, M.water, 0, 1.02, hw - 2.2, { shade: false });
    for (const s of [-1, 1]) {
      kit.box(7, .3, .25, M.door, 0, 1.15, hw - 2.2 + s * .95, { tint: .8 });
      kit.ball(.6, M.stone, s * 2.6, .2, hw - 2.2, { tint: .9 });
    }
    const coats = [M.goatWhite, M.goatBrown, M.goatBlack];
    for (let i = 0; i < 8; i++) {
      const kid = i >= 6;
      this.#goat(kit, kit.range(-hd + 3, hd - 3), kit.range(-hw + 3, hw - 4), kit.rand() * Math.PI * 2,
        coats[i % 3], kit.rand() < .45 ? coats[(i + 1) % 3] : null, kit.rand() < .4, kid ? .62 : kit.range(.92, 1.08));
    }
  }

  // Cabra de perfil olhando para +z: pernas com o casco, corpo, pescoço e a cabeça
  // com o focinho, as orelhas de lado, os chifres curvos para trás e a barbicha.
  #goat(kit, x, z, turn, coat, patch, grazing, scale) {
    kit.with(kit.at(x, 0, z, turn, scale), () => {
      for (const [lx, lz] of [[-.55, -1.15], [.55, -1.15], [-.55, 1.15], [.55, 1.15]]) {
        kit.box(.38, 1.7, .38, coat, lx, 1, lz);
        kit.box(.42, .3, .42, M.goatBlack, lx, .15, lz, { shade: false });
      }
      kit.box(1.7, 1.6, 3.2, coat, 0, 2.5, 0, { shade: [.78, 1.04] });
      if (patch) kit.box(1.74, 1, 1.4, patch, 0, 2.75, kit.pick([-.7, .6]), { shade: [.9, 1] });
      kit.box(.25, .7, .25, coat, 0, 3.4, -1.7, { rx: -.6 });
      const [neckY, neckZ, neckTilt, head, pitch] = grazing
        ? [2.35, 2.05, 2.35, [0, 1.35, 2.9], 1.1]
        : [3.35, 1.6, .5, [0, 4.25, 2.3], .2];
      kit.box(.85, 1.6, .9, coat, 0, neckY, neckZ, { rx: neckTilt });
      const hm = new THREE.Matrix4().compose(new THREE.Vector3(...head), new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, 0, 0)), new THREE.Vector3(1, 1, 1));
      kit.with(hm, () => {
        kit.box(1, 1.05, 1.5, coat, 0, 0, 0);
        kit.box(.72, .66, .6, coat, 0, -.18, .85, { tint: .82 });
        for (const s of [-1, 1]) {
          kit.box(.16, .75, .4, coat, s * .62, .2, -.2, { rz: s * 1 });
          kit.box(.2, .9, .24, M.horn, s * .27, .75, -.25, { rx: -.45 });
          kit.box(.18, .75, .2, M.horn, s * .3, 1.05, -.75, { rx: -1.35, tint: .9 });
          kit.box(.1, .14, .14, M.goatBlack, s * .51, .15, .3, { shade: false });
        }
        kit.box(.24, .65, .24, coat, 0, -.75, .65, { tint: .7 });
      });
    });
  }
}
