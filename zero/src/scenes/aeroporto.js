import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day, passagem } from '../state.js';
import { sceneCaption } from '../story.js';
import { scene, freshScene, box, lite, grp, pointLight, walkOf, blockOf, instanciar, at } from '../kit.js';
import { vestibulo } from '../vestibulo.js';
import { noMundo } from '../mapa.js';

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

/* ===================== LUGAR: O AEROPORTO (atrás da loja do dia 5) ===================== */
// No mundo (coordenadas da rua, mapa.js): a leste das transversais, cercado. Os fundos da loja dão
// num portão de embarque (o vestíbulo que a loja também monta); dali uma passarela coberta leva até a
// escada do avião, parado no pátio. O avião (aviao.js) taxia pelo CAMINHO_TAXI até a cabeceira e
// decola para o sul pela PISTA.

// o portão, no mundo: o mesmo referencial que a loja dá ao vestíbulo dos fundos
export const portao = () => noMundo('loja', { x: -2.6, y: 0, z: -4.5, yaw: Math.PI });
const ESC_X0 = 40.5, ESC_X1 = 45.0, Y_PORTA = 2.6;       // a escada do avião: do chão até a porta
// onde o avião para no pátio (o piso da cabine): a porta dele fica no topo da escada
export function standAviao() {
  const g = portao();
  return { x: ESC_X1 + 2.6, y: Y_PORTA, z: g.z + 6.5 };
}
// do pátio até a cabeceira da pista (no chão; o avião anda pelo meio)
export function caminhoTaxi() {
  const s = standAviao();
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(s.x, 0, s.z), new THREE.Vector3(s.x, 0, 6), new THREE.Vector3(s.x + 4.5, 0, -14),
    new THREE.Vector3(s.x + 18, 0, -27), new THREE.Vector3(s.x + 47, 0, -31), new THREE.Vector3(128, 0, -31),
    new THREE.Vector3(145, 0, -38), new THREE.Vector3(150, 0, -55), new THREE.Vector3(150, 0, -70),
  ]);
}
export const PISTA = { x: 150, z0: -70, z1: -680, w: 30 };

export function buildAeroporto() {
  freshScene(10, 160);
  scene.background = new THREE.Color(0x263848);
  scene.fog.color.set(0x2b3d4c);

  // ---------- chão: grama rala, pátio, pista de taxiamento, pista ----------
  const GRAMA = mix(FLOOR, DARK2, .55), CONC = mix(LIGHT2, FLOOR, .5), ASF = mix(DARK2, DARK, .4);
  box(240, .1, 760, GRAMA, 152, -.08, -330);                          // o terreno do aeroporto
  box(92, .1, 98, CONC, 76, -.02, 1);                                 // o pátio
  // a pista de taxiamento: pedaços retos ao longo da mesma curva que o avião segue
  const cv = caminhoTaxi(), pts = cv.getSpacedPoints(40);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const m = box(12, .1, len + .6, ASF, (a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    const f = lite(.25, .02, len * .55, mix(GLOW, BLUE, .25), (a.x + b.x) / 2, .06, (a.z + b.z) / 2); // linha guia
    f.rotation.y = m.rotation.y;
  }
  const PL = PISTA.z0 - PISTA.z1, PZ = (PISTA.z0 + PISTA.z1) / 2;
  box(PISTA.w, .1, PL, ASF, PISTA.x, .01, PZ);                        // a pista
  for (let z = PISTA.z0 - 20; z > PISTA.z1 + 10; z -= 18) lite(.5, .02, 8, GLOW, PISTA.x, .07, z); // eixo tracejado
  for (let k = -5; k <= 5; k++) if (k) lite(1.6, .02, 14, GLOW, PISTA.x + k * 2.4, .07, PISTA.z0 - 14); // faixas da cabeceira
  const luzM = new THREE.Group();
  lite(.3, .25, .3, mix(GLOW, BLUE, .3), 0, .15, 0, luzM);
  const luzes = [];
  for (let z = PISTA.z0; z >= PISTA.z1; z -= 30) for (const s of [-1, 1]) luzes.push(at(PISTA.x + s * (PISTA.w / 2 + .6), 0, z));
  instanciar(luzM, luzes);

  // ---------- a cerca (do lado da cidade e da avenida) ----------
  const g = portao(), WZ = g.z;
  const poste = new THREE.Group();
  box(.08, 2.2, .08, DARK2, 0, 1.1, 0, poste);
  const postes = [];
  for (let z = -45; z <= 50; z += 3) if (Math.abs(z - WZ) > 2) postes.push(at(30.5, 0, z));
  for (let x = 30.5; x <= 175; x += 3) postes.push(at(x, 0, 50));
  instanciar(poste, postes);
  for (const [z0, z1] of [[-45, WZ - 2], [WZ + 2, 50]])
    for (const y of [.5, 1.3, 2.1]) box(.04, .04, z1 - z0, LIGHT2, 30.5, y, (z0 + z1) / 2);
  for (const y of [.5, 1.3, 2.1]) box(144.5, .04, .04, LIGHT2, (30.5 + 175) / 2, y, 50);

  // ---------- hangar e torre de controle ----------
  box(30, 12, 13, DARK2, 85, 6, 41.5);
  box(30.4, .4, 13.4, DARK, 85, 12.2, 41.5);
  box(22, 9, .1, mix(LIGHT2, DARK2, .4), 85, 4.5, 34.95);              // o portão do hangar
  for (let x = 75; x <= 95; x += 2) box(.06, 9, .14, DARK2, x, 4.5, 34.9);
  const torre = grp(112, 0, 40);
  box(3, 18, 3, LIGHT2, 0, 9, 0, torre);
  box(6.4, .3, 6.4, DARK2, 0, 18.15, 0, torre);
  box(6, 2.6, 6, NAVY, 0, 19.6, 0, torre);                             // a cabine envidraçada
  box(6.4, .4, 6.4, DARK2, 0, 21.1, 0, torre);
  lite(.3, .3, .3, BLUE, 0, 21.6, 0, torre);                           // o farolete do topo
  pointLight(.6, 30, 60, 9, 8);                                        // refletores do pátio
  pointLight(.5, 30, 98, 9, -18);
  for (const [lx, lz] of [[60, 8], [98, -18]]) { box(.3, 9, .3, DARK2, lx, 4.5, lz); lite(1.2, .3, .6, GLOW, lx, 9, lz); }
  // a biruta, no canto do pátio
  const bir = grp(122, 0, -40);
  box(.1, 5, .1, DARK2, 0, 2.5, 0, bir);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.32 - i * .07, .39 - i * .07, .7, 8, 1, true),
      new THREE.MeshLambertMaterial({ color: i % 2 ? LIGHT : NAVY, side: THREE.DoubleSide }));
    c.rotation.z = Math.PI / 2;
    c.position.set(.45 + i * .7, 4.7, 0);
    bir.add(c);
  }

  // ---------- a escada do avião (sempre no pátio; ele para com a porta no topo) ----------
  const NS = 12, SD = (ESC_X1 - ESC_X0) / NS;
  for (let i = 0; i < NS; i++) {
    const top = .12 + (i + 1) * (Y_PORTA - .12) / NS;
    box(SD + .02, .1, 1.3, LIGHT2, ESC_X0 + SD * (i + .5), top - .05, WZ);
  }
  box(.8, .1, 1.3, LIGHT2, ESC_X1 + .3, Y_PORTA - .05, WZ);            // patamar junto da porta
  const corr = Math.hypot(ESC_X1 - ESC_X0, Y_PORTA - .12);
  for (const s of [-1, 1]) {
    const c = box(corr, .05, .05, LIGHT, (ESC_X0 + ESC_X1) / 2, (Y_PORTA + .12) / 2 + .95, WZ + s * .62);
    c.rotation.z = Math.atan2(Y_PORTA - .12, ESC_X1 - ESC_X0);
    for (const x of [ESC_X0 + .2, (ESC_X0 + ESC_X1) / 2, ESC_X1]) {   // montantes do corrimão
      const y0 = .12 + (x - ESC_X0) / (ESC_X1 - ESC_X0) * (Y_PORTA - .12);
      box(.05, .95, .05, LIGHT, x, y0 + .47, WZ + s * .62);
    }
  }
  // a carroceria do caminhão da escada, por baixo
  box(4.6, 1.2, 2.0, mix(LIGHT2, DARK2, .3), (ESC_X0 + ESC_X1) / 2 + .2, .8, WZ);
  for (const [wx, wz] of [[ESC_X0 + .6, -.9], [ESC_X0 + .6, .9], [ESC_X1 - .4, -.9], [ESC_X1 - .4, .9]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .25, 8), new THREE.MeshLambertMaterial({ color: DARK, flatShading: true }));
    r.rotation.x = Math.PI / 2; r.position.set(wx, .34, WZ + wz); scene.add(r);
  }

  // ---------- dia 5: o portão da loja e a passarela até a escada ----------
  let spawn = { x: ESC_X0 - 1.5, z: WZ, yaw: -Math.PI / 2 };
  if (day === 5) {
    const v = vestibulo({
      x: g.x, y: g.y, z: g.z, yaw: g.yaw, lado: 'Q', outro: ['loja', 'aeroporto'], estilo: 'vidro',
      abre: () => passagem,
    });
    const X0 = g.x + 1, L = ESC_X0 - X0, CX = (X0 + ESC_X0) / 2;
    box(L, .1, 1.9, FLOOR, CX, .07, WZ);                              // piso da passarela
    box(L + .2, .12, 2.4, DARK2, CX, 2.72, WZ);                       // cobertura
    for (const s of [-1, 1]) {
      box(L, 2.6, .05, mix(NAVY, LIGHT, .3), CX, 1.4, WZ + s * 1.0);  // paredes de vidro
      box(L, .12, .08, DARK2, CX, .12, WZ + s * 1.0);                 // rodapé
    }
    for (let x = X0 + .2; x <= ESC_X0; x += 3) for (const s of [-1, 1]) box(.1, 2.7, .1, DARK2, x, 1.35, WZ + s * 1.02);
    for (let x = X0 + 1.5; x < ESC_X0; x += 4) lite(.5, .03, .3, GLOW, x, 2.64, WZ);
    pointLight(.4, 9, X0 + L * .3, 2.3, WZ);
    pointLight(.4, 9, X0 + L * .75, 2.3, WZ);
    walkOf(X0 - .1, WZ - .75, ESC_X0 + .2, WZ + .75);
    spawn = v.spawn || { x: X0 + 1, z: WZ, yaw: -Math.PI / 2 };
  }
  walkOf(ESC_X0 - .2, WZ - .5, ESC_X1 + .7, WZ + .5);                 // a escada e o patamar

  // o chão de quem anda: a passarela, a escada subindo até a porta
  const elevFn = (x, z) => {
    if (x < ESC_X0) return .12;
    return Math.min(Y_PORTA, .12 + (x - ESC_X0) / (ESC_X1 - ESC_X0) * (Y_PORTA - .12));
  };
  return { spawn, caption: sceneCaption('aeroporto'), auto: null, elevFn };
}
