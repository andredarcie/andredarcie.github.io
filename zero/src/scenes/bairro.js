import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day, night } from '../state.js';
import { sceneCaption } from '../story.js';
import { scene, freshScene, box, lite, grp, blob, pointLight, windowGrid, walkOf, blockOf } from '../kit.js';
import { frota, pedestre, letreiro, PINTURAS, mix } from '../cidade.js';
import { chuva } from './rua.js';
import { noMundo } from '../mapa.js';

/* ===================== LUGAR: O BAIRRO (a rua de casa continua até a avenida, que leva à do trabalho) ===================== */
// No mundo (coordenadas da rua de casa, mapa.js). A rua sai do sul (z = 37, depois da boca do metrô)
// e sobe até a Av. do Viaduto, que corre para leste (z 60..76.4) e encontra a rua do trabalho
// (rua2.js), que chega do sul e acaba em z = 60. Por baixo, o túnel do metrô liga as duas estações.
const AV0 = 60, AV1 = 76.4, PISTA0 = 64.7, PISTA1 = 71.7;       // a avenida: calçada sul, pista, calçada norte
export function buildBairro() {
  freshScene();
  const nk = night ? .55 : 1;
  const streetBg = new THREE.Color(0x263848).multiplyScalar(nk);
  const streetFog = new THREE.Color(0x2b3d4c).multiplyScalar(nk);
  scene.background.copy(streetBg);
  scene.fog = new THREE.Fog(streetFog, 10, 68);

  const R2 = noMundo('rua2', {});                 // a rua do trabalho no mundo (o eixo da pista: x = R2.x)
  const XE = R2.x;                                // onde a avenida encontra a rua do trabalho

  const matRua = new THREE.MeshLambertMaterial({ color: DARK2 });
  const matCal = new THREE.MeshLambertMaterial({ color: FLOOR });
  const matFx = new THREE.MeshLambertMaterial({ color: LIGHT });
  const slab = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  // ---------- chão ----------
  // a rua de casa continuando (a pista dela já vem da rua.js até z = 62; a do trabalho, até z = 60)
  slab(4.7, .18, AV0 - 38, matCal, -5.85, .03, (38 + AV0) / 2);     // calçadas
  slab(4.7, .18, AV0 - 38, matCal, 5.85, .03, (38 + AV0) / 2);
  slab(7, .2, PISTA0 - 62, matRua, 0, -.08, (62 + PISTA0) / 2);     // as duas pistas emendando na avenida
  slab(7, .2, PISTA0 - 60, matRua, XE, -.08, (60 + PISTA0) / 2);
  // a avenida (a calçada sul se abre nas duas esquinas)
  const AX0 = -8.2, AX1 = XE + 8.2, ALEN = AX1 - AX0, ACX = (AX0 + AX1) / 2;
  slab(XE + 7, .2, PISTA1 - PISTA0, matRua, XE / 2, -.08, (PISTA0 + PISTA1) / 2);
  for (const [a, b] of [[AX0, -3.5], [3.5, XE - 3.5], [XE + 3.5, AX1]])
    slab(b - a, .18, PISTA0 - AV0, matCal, (a + b) / 2, .03, (AV0 + PISTA0) / 2);
  slab(ALEN, .18, AV1 - PISTA1, matCal, ACX, .03, (PISTA1 + AV1) / 2);
  for (let x = 6; x < XE - 6; x += 3) slab(1.2, .02, .14, matFx, x, .035, (PISTA0 + PISTA1) / 2); // faixa central
  for (const xc of [0, XE]) for (let i = -3; i <= 3; i++)            // faixas de pedestre nas duas esquinas
    slab(.5, .02, 2.6, matFx, xc + i * 1.05, .035, (AV0 + PISTA0) / 2 + .3);

  walkOf(-7.8, 36.0, 7.8, AV1 - .4);                                 // a rua de casa até a avenida
  walkOf(-7.8, AV0 + .4, AX1 - .4, AV1 - .4);                        // a avenida
  walkOf(XE - 7.8, 57, XE + 7.8, AV0 + 1);                           // a rua do trabalho encontrando a avenida
  const noAsfalto = (x, z) => (Math.abs(x) <= 3.5 && z < PISTA1) || (z >= PISTA0 && z <= PISTA1 && x > -3.5 && x < XE + 3.5)
    || (Math.abs(x - XE) <= 3.5 && z < PISTA1);
  const elevFn = (x, z) => (noAsfalto(x, z) ? .02 : .12);

  // ---------- prédios ----------
  const slotsX = [], slotsZ = [];
  const LOJAS = ['MERCADO', 'PADARIA', 'BANCA', 'FARMÁCIA', 'CAFÉ', 'BAR', 'XEROX', 'BRECHÓ', 'CHAVEIRO', 'LANCHES'];
  let hi = 0, li = 0;
  const alt = () => [26, 38, 22, 44, 30, 18, 34, 48, 24][hi++ % 9];
  // fachada para x (rua N-S): side = de que lado da rua; z0..z1 ao longo dela
  function predioX(cx, side, z0, z1) {
    const h = alt(), d = z1 - z0, zc = (z0 + z1) / 2, xf = cx - side * 3;
    box(6, h, d - .3, DARK2, cx, h / 2, zc);
    box(6.2, .35, d - .2, DARK, cx, h + .17, zc);
    for (let wy = 3.1; wy < h - 1; wy += 1.5)
      for (let wz = z0 + .9; wz < z1 - .7; wz += 1.15) slotsX.push({ x: xf - side * .06, y: wy, z: wz });
    lite(.05, 1.4, Math.min(2.5, d - 1.5), night ? mix(DARK2, LIGHT2, .3) : NAVY, xf - side * .07, 1.05, zc);
    const n = letreiro(LOJAS[li++ % LOJAS.length], 2.1, .36, mix(GLOW, LIGHT, .3), DARK2);
    n.position.set(xf - side * .09, 2.45, zc);
    n.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
  // fachada para z (a avenida): side = -1 ao sul (fachada em z = zf para +z), 1 ao norte
  function predioZ(x0, x1, zc, side) {
    const h = alt(), w = x1 - x0, xc = (x0 + x1) / 2, zf = zc - side * 3;
    box(w - .3, h, 6, DARK2, xc, h / 2, zc);
    box(w - .2, .35, 6.2, DARK, xc, h + .17, zc);
    for (let wy = 3.1; wy < h - 1; wy += 1.5)
      for (let wx = x0 + .9; wx < x1 - .7; wx += 1.15) slotsZ.push({ x: wx, y: wy, z: zf - side * .06 });
    if (hi % 2) {
      lite(Math.min(2.5, w - 1.5), 1.4, .05, night ? mix(DARK2, LIGHT2, .3) : NAVY, xc, 1.05, zf - side * .07);
      const n = letreiro(LOJAS[li++ % LOJAS.length], 2.1, .36, mix(GLOW, LIGHT, .3), DARK2);
      n.position.set(xc, 2.45, zf - side * .09);
      n.rotation.y = side > 0 ? Math.PI : 0;
    }
  }
  // a rua de casa, de z = 38 até a avenida (a leste, depois do quiosque do metrô)
  for (const [z0, z1] of [[38, 48], [48, AV0]]) { predioX(-11.2, -1, z0, z1); predioX(11.2, 1, z0, z1); }
  // o quiosque de ventilação do metrô, na calçada leste (a escada da estação passa embaixo)
  box(2.8, 2.6, 10, LIGHT2, 7, 1.3, 43);
  box(3.0, .2, 10.2, DARK2, 7, 2.7, 43);
  for (let z = 38.6; z < 47.6; z += .7) box(.04, 1.4, .3, DARK2, 5.58, 1.4, z);  // grelha
  blockOf(5.5, 37.9, 8.5, 48.1);
  // a avenida: ao norte, de ponta a ponta; ao sul, entre as duas ruas
  for (let x = -14.2; x < AX1 + 6; ) { const w = 12 + (hi * 7) % 9; predioZ(x, Math.min(AX1 + 6, x + w), AV1 + 3, 1); x += w; }
  for (let x = 14.2; x < XE - 14.2; ) { const w = 12 + (hi * 5) % 10, x1 = Math.min(XE - 14.2, x + w); predioZ(x, x1, AV0 - 3, -1); x = x1; }
  predioX(-11.2, -1, AV0, AV1);                                      // a avenida morre a oeste num prédio
  predioX(XE + 11.2, 1, AV0, AV1);                                   // e a leste, depois da esquina
  windowGrid(slotsX, new THREE.BoxGeometry(.12, .75, .5));
  windowGrid(slotsZ, new THREE.BoxGeometry(.5, .75, .12));
  // a placa da avenida, nas duas esquinas
  for (const xc of [-4.1, XE - 4.1]) {
    box(.1, 3.1, .1, DARK2, xc, 1.55, AV0 + .5);
    const pl = letreiro('AV. DO VIADUTO', 1.3, .22, GLOW, mix(NAVY, BLUE, .35));
    pl.position.set(xc + .7, 2.8, AV0 + .45);
  }

  // ---------- postes, carros, gente ----------
  let pi = 0;
  const poste = (lx, lz, dir) => {
    box(.12, 3.9, .12, DARK2, lx, 1.95, lz);
    lite(.3, .12, .18, GLOW, lx + dir[0] * .6, 3.72, lz + dir[1] * .6);
    if (pi++ % 2 === 0) pointLight(.55, 11, lx + dir[0] * .6, 3.5, lz + dir[1] * .6);
    blockOf(lx - .2, lz - .2, lx + .2, lz + .2);
  };
  for (const z of [42, 52]) { poste(-3.9, z, [1, 0]); poste(3.9, z + 5, [-1, 0]); }
  for (let x = 4; x < XE - 4; x += 22) { poste(x, PISTA0 - .4, [0, 1]); poste(x + 11, PISTA1 + .4, [0, -1]); }
  const parados = [];
  for (let x = 14; x < XE - 14; x += 9) if ((x * 7) % 3 !== 0) parados.push({ x, z: PISTA0 + .9, ry: -Math.PI / 2 });
  for (let x = 19; x < XE - 14; x += 11) parados.push({ x, z: PISTA1 - .9, ry: Math.PI / 2 });
  if (night) parados.splice(0, Math.floor(parados.length / 2));
  parados.forEach((c, i) => { c.cor = PINTURAS[(i * 3 + 1) % PINTURAS.length]; blockOf(c.x - 2.1, c.z - .85, c.x + 2.1, c.z + .85); });
  frota(parados);
  const chove = day < 5;
  pedestre({ x: -6.3, z0: 38, z1: 56, chuva: chove, fase: .3 });
  if (!night) pedestre({ x: 6.2, z0: 49, z1: 57, chuva: chove, vel: .9, fase: .7 });
  // árvores na calçada norte da avenida (vivas: azuis)
  for (let x = 30; x < XE - 30; x += 37) {
    box(.9, .14, .9, DARK2, x, .19, AV1 - 1.6);
    box(.16, 2.6, .16, DARK2, x, 1.4, AV1 - 1.6);
    blob(.85, .7, .85, BLUE, x, 3.1, AV1 - 1.6);
    blockOf(x - .4, AV1 - 2, x + .4, AV1 - 1.2);
  }

  // ---------- chuva (só no bairro: a rua de casa e a do trabalho têm a delas) ----------
  const ceuAberto = (x, z) => (Math.abs(x) <= 8.2 && z >= 37 && z <= AV1) || (z >= AV0 && z <= AV1 && x > -8.2 && x < AX1)
    || (Math.abs(x - XE) <= 8.2 && z >= 58 && z <= AV1);
  // (a rua do trabalho chove até z = 58 no mundo: rua2.js)
  if (chove) chuva({ matRua, matCal, cRua: new THREE.Color(DARK2), cCal: new THREE.Color(FLOOR), streetBg, streetFog,
    streetStormFog: new THREE.Color(0x233342).multiplyScalar(nk), streetFlash: new THREE.Color(0x354a5c).multiplyScalar(nk) },
  (x, z) => (noAsfalto(x, z) ? .035 : .135), (x, z) => !ceuAberto(x, z));

  return { spawn: { x: 0, z: AV0 + 2, yaw: Math.PI }, caption: sceneCaption('bairro'), auto: null, elevFn };
}
