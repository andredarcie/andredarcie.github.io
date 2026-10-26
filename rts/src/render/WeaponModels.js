import * as THREE from 'three';

/* ===================== as armas, peça por peça, como as de verdade ===================== */
// Cada arma é montada de muitas peças pequenas e depois fundida numa malha por material
// (madeira, aço oxidado, aço claro, ferro, latão, couro...): fica cheia de detalhe e
// custa poucas chamadas de desenho. A geometria é feita uma vez por tipo e compartilhada
// por todos os bonecos; cada um só cria as suas malhas (weaponModel).
//
// Referencial de toda arma: a origem é onde a mão direita segura (o punho da coronha;
// o cabo, nas armas brancas), o cano/lâmina para -y, a coronha/pomo para +y, o "em
// cima" da arma para +z e o lado direito para +x. 1 unidade ≈ 8,4 cm (o fuzil tem 15).
//
// Modelos:
//   rifle       Mannlicher M1888 (Steyr), o fuzil da tropa em 1897 (e os tomados pelos
//               jagunços): ferrolho de puxar reto, pente de 5 balas que entra por cima
//               e fica no depósito saliente embaixo, coronha inteiriça com duas braçadeiras.
//   bayonet     o mesmo com a baioneta-faca M1888 calada.
//   blunderbuss bacamarte de pederneira: cano curto de latão abrindo em boca de sino,
//               fecho de pederneira (cão com a pedra, bateria, caçoleta), guarnições de
//               latão e a vareta embaixo do cano; tachas na coronha, enfeite sertanejo.
//   machete     facão sertanejo: cabo de chifre com rebites, lâmina larga na ponta.
//   saber       sabre de oficial: punho de fio enrolado, guarda com arco, lâmina curva.
//   spear       chuço: haste de pau, ponta de ferro em folha, alvado e amarração.
//   club        porrete de pau nodoso.  axe: machado de cunha.

export const BOLT_Y = -.9;                 // o ferrolho fechado, ao longo do cano
export const BOLT_X = .45;                 // a alavanca sai do lado direito da caixa

const M = {
  wood: new THREE.MeshLambertMaterial({ color: 0x6e4527 }),       // nogueira da coronha
  woodDark: new THREE.MeshLambertMaterial({ color: 0x553420 }),
  woodLight: new THREE.MeshLambertMaterial({ color: 0x9a7a4a }),
  blued: new THREE.MeshLambertMaterial({ color: 0x2c3034 }),      // aço oxidado (azulado)
  steel: new THREE.MeshLambertMaterial({ color: 0xaab2b8 }),      // aço polido (lâmina)
  iron: new THREE.MeshLambertMaterial({ color: 0x4a4e54 }),       // ferro forjado
  brass: new THREE.MeshLambertMaterial({ color: 0xb38b3e }),
  dark: new THREE.MeshLambertMaterial({ color: 0x15120f }),       // alma do cano, abertura
  leather: new THREE.MeshLambertMaterial({ color: 0x5e3e24 }),
  horn: new THREE.MeshLambertMaterial({ color: 0x2e241c }),
  wrap: new THREE.MeshLambertMaterial({ color: 0x2a2420 }),
  flint: new THREE.MeshLambertMaterial({ color: 0x6f6a62 }),
  // As armas dos tupinambás: pau escuro e duro do tacape, pau-d'arco do arco, a taquara
  // das flechas, o algodão cru das amarrações, as penas e a pedra polida do machado.
  tacapeWood: new THREE.MeshLambertMaterial({ color: 0x4a2a1c }),
  bowWood: new THREE.MeshLambertMaterial({ color: 0x3a2618 }),
  cane: new THREE.MeshLambertMaterial({ color: 0xc8b47a }),
  cotton: new THREE.MeshLambertMaterial({ color: 0xe8e0cc }),
  featherYellow: new THREE.MeshLambertMaterial({ color: 0xe8c43a }),
  featherRed: new THREE.MeshLambertMaterial({ color: 0xc0392b }),
  featherBlack: new THREE.MeshLambertMaterial({ color: 0x24201c }),
  shell: new THREE.MeshLambertMaterial({ color: 0xf0e8d6 }),
  greenStone: new THREE.MeshLambertMaterial({ color: 0x5a6e5e }),
  bone: new THREE.MeshLambertMaterial({ color: 0xe0d4b8 }),
  ember: new THREE.MeshBasicMaterial({ color: 0xff7a24 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffc04a })
};
export const WEAPON_MATERIALS = M;

/* ---------- peças ---------- */
const E = new THREE.Euler(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
// uma peça: a geometria levada para o lugar (cópia) com o seu material
function part(geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = geometry.clone();
  g.applyMatrix4(new THREE.Matrix4().compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S1));
  return { g, m: material };
}
const box = (w, h, d, m, x, y, z, rx, ry, rz) => part(new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
// cilindro ao longo do eixo y (o eixo da arma); rTop fica do lado +y (para a coronha)
const tube = (rTop, rBottom, h, m, x, y, z, seg = 10) => part(new THREE.CylinderGeometry(rTop, rBottom, h, seg), m, x, y, z);
// barra fina ligando dois pontos do plano (y, z), em x
function strap(a, b, width, thick, m, x = 0) {
  const dy = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dy, dz);
  return box(width, len, thick, m, x, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(dz, dy));
}
// perfil lateral (pontos em y, z) extrudado na largura x, com a borda arredondada
function profile(points, width, m, x = 0, bevel = .05) {
  const shape = new THREE.Shape(points.map(([y, z]) => new THREE.Vector2(y, z)));
  const depth = Math.max(.01, width - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 });
  // (sx, sy, sz) → (sz, sx, sy): o perfil fica no plano y-z e a extrusão em x
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, x - depth / 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  return { g, m };
}
// arco (meio anel) no plano y-z, do centro (y, z), raio r, abrindo para +z (ou -z)
function bow(r, tubeR, m, y, z, down = false) {
  const g = new THREE.TorusGeometry(r, tubeR, 6, 14, Math.PI);
  if (down) g.rotateZ(Math.PI);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, y, 0, 1, 0, z, 0, 0, 0, 1));
  return { g, m };
}
// anel em volta do eixo da arma (braçadeira redonda, anel da baioneta)
function ring(r, tubeR, m, y, z) {
  const g = new THREE.TorusGeometry(r, tubeR, 6, 14);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, z);
  return { g, m };
}
const sphere = (r, m, x, y, z) => part(new THREE.SphereGeometry(r, 8, 6), m, x, y, z);

// funde as peças: uma geometria por material (todas sem índice, só posição e normal)
function fuse(parts) {
  const groups = new Map();
  for (const { g, m } of parts) {
    const flat = g.index ? g.toNonIndexed() : g;
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(flat);
  }
  const out = [];
  for (const [m, list] of groups) {
    let n = 0;
    for (const g of list) n += g.attributes.position.array.length;
    const pos = new Float32Array(n), nor = new Float32Array(n);
    let o = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, o);
      nor.set(g.attributes.normal.array, o);
      o += g.attributes.position.array.length;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    merged.computeBoundingSphere();
    out.push([merged, m]);
  }
  return out;
}

/* ---------- Mannlicher M1888 ---------- */
function rifleParts(withBayonet) {
  const p = [];
  // a coronha inteiriça: soleira, delgado (punho), caixa e a telha de baixo até a ponteira
  p.push(profile([[4.35, .45], [3.0, .38], [1.3, .22], [.6, .12], [-.2, -.12], [-8.3, -.1], [-8.5, -.35], [-8.3, -.62],
    [-2.6, -.72], [-1.6, -.72], [-.4, -.62], [.4, -.6], [1.4, -.78], [4.35, -1.55]], .85, M.wood));
  p.push(box(.95, .1, 2.05, M.blued, 0, 4.37, -.55));                       // chapa da soleira
  p.push(box(.5, 2.6, .28, M.wood, 0, -4.2, .42));                          // telha de madeira sobre o cano
  // a caixa da culatra, a abertura por onde entra o pente e o casquilho do ferrolho
  p.push(box(.62, 2.9, .62, M.blued, 0, -1.25, .12));
  p.push(box(.36, 1.3, .05, M.dark, 0, -1.5, .44));
  p.push(tube(.14, .14, .45, M.blued, 0, .3, .3));
  // depósito do pente (saliente embaixo), guarda-mato e gatilho
  p.push(box(.58, 1.05, .78, M.blued, 0, -1.75, -1.05));
  p.push(box(.62, 1.1, .06, M.blued, 0, -1.75, -1.46));
  p.push(box(.1, 1.05, .08, M.blued, 0, -.38, -1.02));
  p.push(box(.1, .08, .36, M.blued, 0, -.9, -.86));
  p.push(box(.1, .08, .36, M.blued, 0, .14, -.86));
  p.push(box(.08, .12, .38, M.blued, 0, -.42, -.82, .25));
  // o cano (mais grosso na culatra), alça de mira (base e lâmina) e massa
  p.push(tube(.22, .18, 8.25, M.blued, 0, -6.725, .14, 12));
  p.push(box(.42, .55, .18, M.blued, 0, -2.75, .42));
  p.push(box(.3, .1, .32, M.blued, 0, -2.95, .62, -.5));
  p.push(box(.3, .4, .12, M.blued, 0, -10.55, .32));
  p.push(box(.08, .28, .26, M.blued, 0, -10.55, .44));
  // braçadeiras, ponteira com o encaixe da baioneta, vareta de limpeza
  p.push(box(.98, .22, 1.12, M.blued, 0, -5.7, -.18));
  p.push(box(.9, .22, 1.05, M.blued, 0, -8.0, -.2));
  p.push(box(.85, .35, .9, M.blued, 0, -8.42, -.24));
  p.push(box(.12, .4, .18, M.blued, 0, -8.62, -.66));
  p.push(tube(.06, .06, 1.9, M.steel, 0, -9.45, -.42, 6));
  // zarelhos e a bandoleira de couro, caída entre eles
  p.push(ring(.13, .035, M.steel, -5.7, -.84));
  p.push(ring(.13, .035, M.steel, 3.2, -1.3));
  p.push(strap([-5.7, -.95], [-1.25, -1.9], .3, .05, M.leather));
  p.push(strap([-1.25, -1.9], [3.2, -1.4], .3, .05, M.leather));
  if (withBayonet) {
    // baioneta-faca M1888: anel no cano, cruzeta, cabo sob a ponteira e a lâmina
    p.push(ring(.25, .05, M.steel, -10.1, .14));
    p.push(box(.18, .22, .95, M.steel, 0, -10.1, -.22));
    p.push(box(.22, 1.3, .38, M.woodDark, 0, -9.35, -.82));
    p.push(box(.26, .2, .42, M.steel, 0, -8.65, -.82));
    p.push(profile([[-10.25, -.02], [-14.2, -.02], [-14.95, -.18], [-14.3, -.5], [-10.25, -.5]], .1, M.steel, 0, .02));
  }
  return p;
}
// o ferrolho de puxar reto (corre para trás junto com a alavanca)
function boltParts() {
  return [
    tube(.15, .15, 1.3, M.steel, 0, .1, 0, 8),                              // o corpo do ferrolho (aparece quando abre)
    box(1, .3, .3, M.blued, .45, 0, 0),                                     // a alavanca, para a direita
    sphere(.3, M.blued, 1.05, 0, 0)                                         // a bolota
  ];
}

/* ---------- bacamarte de pederneira ---------- */
function blunderbussParts() {
  const p = [];
  p.push(profile([[4.0, .42], [2.7, .3], [1.3, .12], [.55, .02], [-.25, -.12], [-6.3, -.08], [-6.5, -.32], [-6.3, -.58],
    [-1.4, -.64], [-.2, -.6], [.5, -.58], [1.4, -.88], [4.0, -1.5]], .82, M.woodDark, 0, .06));
  // o cano de latão: culatra oitavada, corpo, anéis e a boca em sino com a alma escura
  p.push(tube(.33, .33, 1.1, M.brass, 0, -2.0, .16, 8));
  p.push(tube(.3, .27, 5.0, M.brass, 0, -4.0, .16, 12));
  p.push(tube(.28, .6, 2.6, M.brass, 0, -7.8, .16, 14));
  p.push(tube(.64, .64, .12, M.brass, 0, -9.05, .16, 14));
  p.push(tube(.33, .33, .14, M.brass, 0, -3.2, .16, 12));
  p.push(tube(.33, .33, .14, M.brass, 0, -5.4, .16, 12));
  p.push(part(new THREE.CircleGeometry(.5, 14), M.dark, 0, -9.12, .16, Math.PI / 2));
  // o fecho de pederneira, do lado direito: chapa, cão com a pedra, bateria, caçoleta, mola
  p.push(box(.06, 2.0, .62, M.iron, .43, -.35, -.02));
  p.push(box(.1, .28, .3, M.iron, .5, .35, .18));
  p.push(box(.1, .14, .5, M.iron, .5, .28, .45, .5));
  p.push(box(.14, .3, .16, M.iron, .5, .12, .68));
  p.push(box(.12, .18, .1, M.flint, .5, -.05, .66));
  p.push(box(.12, .1, .55, M.iron, .5, -.32, .5, -.2));
  p.push(box(.16, .35, .12, M.iron, .48, -.32, .22));
  p.push(box(.05, .6, .08, M.iron, .47, -.8, .05));
  // guarnições de latão: contra-chapa, guarda-mato, soleira; o gatilho de ferro
  p.push(box(.04, 1.4, .4, M.brass, -.43, -.2, -.1));
  p.push(box(.1, 1.3, .08, M.brass, 0, -.45, -.95));
  p.push(box(.1, .3, .08, M.brass, 0, -1.2, -.75, .6));
  p.push(box(.1, .3, .08, M.brass, 0, .3, -.78, -.6));
  p.push(box(.07, .12, .36, M.iron, 0, -.45, -.78, .2));
  p.push(box(.9, .1, 2.0, M.brass, 0, 4.02, -.55));
  // braçadeiras da vareta, embaixo do cano
  p.push(tube(.1, .1, .4, M.brass, 0, -2.6, -.42, 8));
  p.push(tube(.1, .1, .4, M.brass, 0, -4.9, -.42, 8));
  // tachas de latão na coronha, dos dois lados
  for (const [y, z] of [[2.6, -.4], [2.95, -.82], [3.35, -.5], [3.65, -1.0], [2.2, -.62]]) {
    for (const side of [-1, 1]) p.push(sphere(.075, M.brass, side * .44, y, z));
  }
  return p;
}
function storedRamrodParts() {
  return [tube(.06, .06, 6.4, M.woodDark, 0, -3.9, -.42, 6), tube(.08, .08, .25, M.brass, 0, -7.05, -.42, 6)];
}

/* ---------- armas brancas e de pau ---------- */
function macheteParts() {
  return [
    profile([[1.1, .35], [1.25, .1], [1.1, -.4], [-.9, -.4], [-.95, .38]], .5, M.horn, 0, .06),      // cabo de chifre
    part(new THREE.CylinderGeometry(.08, .08, .62, 6), M.brass, 0, .55, 0, 0, 0, Math.PI / 2),        // rebites
    part(new THREE.CylinderGeometry(.08, .08, .62, 6), M.brass, 0, -.3, 0, 0, 0, Math.PI / 2),
    box(.45, .25, .95, M.steel, 0, -1.05, -.02),                                                     // reforço
    profile([[-1.15, .38], [-6.6, .42], [-8.0, .2], [-8.35, -.15], [-7.4, -.62], [-4.0, -.52], [-1.15, -.42]], .1, M.steel, 0, .02),
    box(.11, 4.5, .08, M.iron, 0, -4.0, .27)                                                         // o dorso, mais escuro
  ];
}
function saberParts() {
  const p = [];
  p.push(box(.5, 2.0, .62, M.wrap, 0, 0, 0));                                                       // punho
  for (let y = -.8; y <= .81; y += .27) p.push(box(.54, .06, .66, M.brass, 0, y, 0));                // fio de latão enrolado
  p.push(box(.55, .3, .7, M.brass, 0, 1.12, 0));                                                     // pomo
  p.push(box(.2, 2.1, .1, M.brass, 0, 0, .36));                                                      // costa do punho (lado do dorso)
  p.push(box(.55, .18, 1.2, M.brass, 0, -1.12, -.2));                                                // guarda
  p.push(bow(1.12, .07, M.brass, 0, -.45, true));                                                    // o arco das juntas, do lado do fio
  p.push(box(.12, .4, .55, M.steel, 0, -1.4, 0));                                                    // talão
  // a lâmina curva: o dorso em +z, o fio em -z (convexo), a ponta indo para o lado do dorso
  const pts = [], n = 10;
  const at = (t, side) => {
    const y = -1.55 - 9.3 * t, zc = .5 * t * t, w = .55 * (1 - .3 * t);
    return [y, zc + side * w / 2];
  };
  for (let i = 0; i <= n; i++) pts.push(at(i / n, 1));
  pts.push([-11.2, .5]);
  for (let i = n; i >= 0; i--) pts.push(at(i / n, -1));
  p.push(profile(pts, .08, M.steel, 0, .015));
  return p;
}
function spearParts() {
  return [
    tube(.24, .24, 21, M.woodLight, 0, -6.5, 0, 7),                                                  // haste
    tube(.27, .2, .6, M.iron, 0, 4.2, 0, 7),                                                         // conto
    tube(.32, .26, 1.4, M.iron, 0, -17.4, 0, 8),                                                     // alvado
    ring(.3, .06, M.leather, -16.3, 0), ring(.3, .06, M.leather, -15.9, 0),                          // amarração
    profile([[-18.0, .18], [-18.9, .55], [-20.8, 0], [-18.9, -.55], [-18.0, -.18]], .16, M.iron, 0, .03)
  ];
}
function clubParts() {
  const p = [tube(.42, .62, 5.2, M.wood, 0, -1.9, 0, 9)];
  const head = new THREE.DodecahedronGeometry(1.3, 0);
  head.scale(1, 1.25, 1);
  p.push(part(head, M.woodDark, 0, -5.8, 0));
  for (const [x, y, z] of [[.5, -2.8, .2], [-.4, -3.8, -.3], [.3, -5.6, 1.1], [-1.0, -6.2, .4]]) p.push(sphere(.32, M.woodDark, x, y, z));
  p.push(ring(.46, .07, M.leather, .5, 0));                                                          // cordão do pulso
  return p;
}
function axeParts() {
  const p = [tube(.32, .38, 9.5, M.woodLight, 0, -3.4, 0, 8)];
  const shape = new THREE.Shape([[.75, -6.8], [.75, -8.4], [-.6, -8.2], [-2.9, -9.1], [-3.1, -7.6], [-2.9, -6.1], [-.6, -7.0]]
    .map(([x, y]) => new THREE.Vector2(x, y)));
  const head = new THREE.ExtrudeGeometry(shape, { depth: .5, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 1 });
  head.translate(0, 0, -.25);
  p.push({ g: head, m: M.iron });
  p.push(box(.12, 2.8, .52, M.steel, -3.02, -7.6, 0));                                              // o fio afiado
  return p;
}

/* ---------- as armas dos tupinambás (missão de antes de 1500: nada de ferro) ---------- */
// Tacape: o pau de guerra, "à feição de arrochos, com uma quina por uma ponta"
// (Soares, cap. CLXVIII): cabo roliço com amarração de algodão e a cabeça achatada,
// de gume dos dois lados.
function tacapeParts() {
  return [
    tube(.26, .3, 6.6, M.tacapeWood, 0, -1.6, 0, 8),
    profile([[-4.4, .32], [-6.6, 1.25], [-8.6, 1.35], [-9.7, .7], [-9.9, 0], [-9.7, -.7], [-8.6, -1.35], [-6.6, -1.25], [-4.4, -.32]], .42, M.tacapeWood, 0, .08),
    ring(.33, .07, M.cotton, .6, 0), ring(.33, .07, M.cotton, .2, 0), ring(.33, .07, M.cotton, -.2, 0)
  ];
}
// Ibirapema, a "espada de pau de ambas as mãos muito pesada, marchetada com continhas
// brancas de búzios", com o penacho pendurado da empunhadura (cap. CLXXIII).
function ibirapemaParts() {
  const p = [
    tube(.3, .34, 8.2, M.tacapeWood, 0, -2.2, 0, 8),
    profile([[-6, .4], [-8.4, 1.9], [-10.6, 2.2], [-12, 1.3], [-12.3, 0], [-12, -1.3], [-10.6, -2.2], [-8.4, -1.9], [-6, -.4]], .5, M.tacapeWood, 0, .1)
  ];
  for (const [y, z] of [[-9.2, .9], [-9.2, -.9], [-10.6, 0], [-11.4, .8], [-11.4, -.8], [-8.2, 0], [-10, 1.6], [-10, -1.6]]) {
    for (const side of [-1, 1]) p.push(sphere(.14, M.shell, side * .27, y, z));
  }
  for (let i = 0; i < 4; i++) p.push(ring(.37, .08, M.cotton, 1.2 - i * .35, 0));
  // a embagadura: penas em molho pendendo do pé da empunhadura
  for (let i = 0; i < 5; i++) p.push(box(.12, 2.4, .5, i % 2 ? M.featherRed : M.featherYellow, (i - 2) * .16, 2.3, (i - 2) * .12, (i - 2) * .12));
  return p;
}
// Tição: pau comprido com a ponta em brasa e a chama.
function torchParts() {
  return [
    tube(.24, .28, 7.6, M.tacapeWood, 0, -2.2, 0, 7),
    tube(.5, .36, 1.4, M.ember, 0, -6.4, 0, 7),
    part(new THREE.ConeGeometry(.6, 2, 6), M.flame, 0, -8, 0, Math.PI)
  ];
}
// Machado de pedra polida (o "djí"): a lâmina encaixada no cabo e amarrada com fibra.
function stoneAxeParts() {
  const head = new THREE.DodecahedronGeometry(1, 0);
  head.scale(1.7, 1.15, .5);
  return [
    tube(.3, .34, 9, M.woodLight, 0, -3.2, 0, 7),
    part(head, M.greenStone, -1.2, -7.4, 0),
    ring(.42, .1, M.cotton, -7, 0), ring(.42, .1, M.cotton, -7.8, 0)
  ];
}
// Pau de cavar, de ponta afinada, para arrancar a mandioca.
function diggerParts() {
  return [tube(.22, .26, 6.4, M.woodLight, 0, -1.8, 0, 6), part(new THREE.ConeGeometry(.22, 1.4, 6), M.woodLight, 0, -5.7, 0, Math.PI)];
}
// Flecha de taquara: haste, a ponta de pau (ou de dente) e a empenagem de duas penas.
function arrowParts(x = 0, z = 0, length = 11) {
  return [
    tube(.08, .08, length, M.cane, x, -length / 2 + 1.5, z, 5),
    part(new THREE.ConeGeometry(.16, 1, 4), M.bone, x, -length + 1, z, Math.PI),
    box(.05, 1.6, .5, M.featherBlack, x, .7, z + .2), box(.5, 1.6, .05, M.featherBlack, x - .2, .7, z)
  ];
}
// O feixe de flechas apanhadas do chão, levado na mão até a casa do principal.
function arrowBundleParts() {
  const p = [];
  for (const [x, z] of [[0, 0], [.3, .2], [-.3, .15], [.15, -.3], [-.2, -.25]]) p.push(...arrowParts(x, z));
  p.push(ring(.5, .08, M.cotton, -2, 0));
  return p;
}

const BUILDERS = {
  rifle: () => ({ main: rifleParts(false), bolt: boltParts() }),
  bayonet: () => ({ main: rifleParts(true), bolt: boltParts() }),
  blunderbuss: () => ({ main: blunderbussParts(), ramrod: storedRamrodParts() }),
  machete: () => ({ main: macheteParts() }),
  saber: () => ({ main: saberParts() }),
  spear: () => ({ main: spearParts() }),
  club: () => ({ main: clubParts() }),
  axe: () => ({ main: axeParts() }),
  tacape: () => ({ main: tacapeParts() }),
  ibirapema: () => ({ main: ibirapemaParts() }),
  torch: () => ({ main: torchParts() }),
  stoneAxe: () => ({ main: stoneAxeParts() }),
  digger: () => ({ main: diggerParts() }),
  arrows: () => ({ main: arrowBundleParts() }),
  arrow: () => ({ main: arrowParts() })
};
const cache = new Map();

// Uma arma nova (malhas novas, geometria compartilhada): { group, bolt?, ramrod? }.
// `bolt`: o grupo do ferrolho (anda em y); `ramrod`: a vareta guardada no bacamarte.
export function weaponModel(kind) {
  if (!cache.has(kind)) {
    const spec = BUILDERS[kind]();
    cache.set(kind, { main: fuse(spec.main), bolt: spec.bolt ? fuse(spec.bolt) : null, ramrod: spec.ramrod ? fuse(spec.ramrod) : null });
  }
  const spec = cache.get(kind);
  const meshes = (list, parent) => {
    for (const [g, m] of list) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      parent.add(mesh);
    }
  };
  const group = new THREE.Group();
  meshes(spec.main, group);
  let bolt = null, ramrod = null;
  if (spec.bolt) {
    bolt = new THREE.Group();
    bolt.position.set(BOLT_X - .45, BOLT_Y, .25);
    meshes(spec.bolt, bolt);
    group.add(bolt);
  }
  if (spec.ramrod) {
    ramrod = new THREE.Group();
    meshes(spec.ramrod, ramrod);
    group.add(ramrod);
  }
  return { group, bolt, ramrod };
}
export const WEAPON_KINDS = Object.keys(BUILDERS);

/* ---------- o arco ---------- */
// O arco tupinambá: comprido (quase da altura de quem atira), de pau escuro, com a
// empunhadura enrolada de algodão. A vara corre em y (de pé), com a empunhadura na
// origem e as pontas um pouco para trás (-z): é a curva do arco armado. A corda não
// vem aqui: quem usa o arco estica duas barras finas das pontas até a mão que puxa
// (CharacterModel, PalisadeRenderer).
export const BOW = Object.freeze({ half: 9.2, sag: 1.4 });
let bowGeometry = null;
export function bowModel() {
  if (!bowGeometry) {
    const p = [];
    const n = 10;
    const at = t => [0, t * BOW.half, -BOW.sag * t * t];
    for (let i = 0; i < n; i++) {
      const a = at(-1 + 2 * i / n), b = at(-1 + 2 * (i + 1) / n);
      const dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dy, dz);
      const r = .2 - Math.abs(-1 + (2 * i + 1) / n) * .08;
      const g = new THREE.CylinderGeometry(r, r, len + .05, 6);
      g.rotateX(Math.atan2(dz, dy));
      g.translate(0, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      p.push({ g, m: M.bowWood });
    }
    for (let i = 0; i < 5; i++) p.push(ring(.25, .06, M.cotton, -.8 + i * .4, 0));
    bowGeometry = fuse(p);
  }
  const group = new THREE.Group();
  for (const [g, m] of bowGeometry) {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}
// A corda: uma barra fina de comprimento 1 em y, esticada entre dois pontos (stringTo).
const STRING_SHAPE = new THREE.BoxGeometry(.07, 1, .07).translate(0, .5, 0);
const STRING_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xd8ccb0 });
export function bowString() {
  return new THREE.Mesh(STRING_SHAPE, STRING_MATERIAL);
}
const _dirS = new THREE.Vector3(), _upS = new THREE.Vector3(0, 1, 0);
export function stringTo(mesh, a, b) {
  _dirS.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const length = _dirS.length() || 1e-3;
  mesh.position.set(a[0], a[1], a[2]);
  mesh.quaternion.setFromUnitVectors(_upS, _dirS.divideScalar(length));
  mesh.scale.set(1, length, 1);
}
