import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day, night } from '../state.js';
import { sceneCaption } from '../story.js';
import { scene, freshScene, box, lite, grp, pointLight, windowGrid, anim, tagGo, walkOf, blockOf, person, casca } from '../kit.js';
import { chuva } from './rua.js';
import { vestibulo, VEST } from '../vestibulo.js';
import { frota, pedestre, letreiro, PINTURAS, mix } from '../cidade.js';
import { noMundo, transformada } from '../mapa.js';
const CONCRETO = mix(LIGHT2, DARK2, .45);

// uma caixa dada nas coordenadas de outro lugar, trazida para as desta rua: { x0, x1, z0, z1, y }
function caixaDe(nome, x0, x1, z0, z1) {
  const Ti = transformada('rua2').clone().invert();
  const ps = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => {
    const p = noMundo(nome, { x, z });
    return new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(Ti);
  });
  return {
    x0: Math.min(...ps.map(p => p.x)), x1: Math.max(...ps.map(p => p.x)),
    z0: Math.min(...ps.map(p => p.z)), z1: Math.max(...ps.map(p => p.z)), y: ps[0].y,
  };
}

// traçado: rua N-S (|x| <= 3.5), calçadas até |x| = 8.2; a saída do metrô sobe na calçada leste
// (trincheira em x 5.82..8.18, do patamar em z 10.4 até a calçada em z 2.6) olhando para o norte (-z),
// e logo à frente o viaduto cruza por cima da rua (tabuleiro em z -24.5..-17.5)
const VZ0 = -24.5, VZ1 = -17.5, VZ = (VZ0 + VZ1) / 2;
const noAsfalto = (x, z) => Math.abs(x) <= 3.5;
const naEscada = (x, z) => x > 5.85 && x < 8.15 && z > 2.6 && z < 12.5;   // a escada, o patamar e o vestíbulo lá embaixo
const sobViaduto = z => z > VZ0 && z < VZ1;

/* ===================== CENA: A RUA DO TRABALHO (saída do metrô, viaduto, a portinha) ===================== */
export function buildRua2(nav = {}) {
  freshScene();
  const nk = night ? .55 : 1;
  const streetBg = new THREE.Color(0x263848).multiplyScalar(nk);
  const streetFog = new THREE.Color(0x2b3d4c).multiplyScalar(nk);
  scene.background.copy(streetBg);
  scene.fog = new THREE.Fog(streetFog, 10, 60);

  const matRua = new THREE.MeshLambertMaterial({ color: DARK2 });
  const matCal = new THREE.MeshLambertMaterial({ color: FLOOR });
  const matFx = new THREE.MeshLambertMaterial({ color: LIGHT });
  const slab = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  slab(7, .2, 90, matRua, 0, -.08, -10);                          // pista
  slab(4.7, .18, 90, matCal, -5.85, .03, -10);                     // calçada oeste
  slab(2.35, .18, 90, matCal, 4.68, .03, -10);                     // calçada leste, faixa da guia
  slab(2.35, .18, 52.6, matCal, 7.03, .03, -23.7);                 // calçada leste, antes da escada
  slab(2.35, .18, 24.6, matCal, 7.03, .03, 22.7);                  // calçada leste, depois do patamar
  for (let z = -52; z < 34; z += 3) if (!sobViaduto(z)) slab(.14, .02, 1.2, matFx, 0, .035, z); // faixa central

  walkOf(-7.8, -40, 7.8, 2.7);     // rua e calçadas até a boca do metrô
  walkOf(-7.8, 2.6, 5.8, 33.4);    // calçada que segue ao lado da escada, até a avenida (bairro.js)
  walkOf(5.7, 12.6, 7.8, 33.4);    // e a calçada leste depois da escada (passado o vestíbulo, que fica embaixo)
  walkOf(5.9, 2.4, 8.1, 10.25);    // a escada e o patamar
  const elevFn = (x, z) => {
    if (naEscada(x, z)) {
      if (z > 8.0) return -3;
      return .125 - (z - 2.6) / .45 * .25;   // pelo meio de cada degrau
    }
    return noAsfalto(x, z) ? .02 : .12;
  };

  // ---------- prédios dos dois lados (o viaduto passa por cima, sem prédio embaixo) ----------
  const slots = [];
  const hs = [24, 32, 20, 28, 36, 22];
  let hi = 0;
  function predio(side, z0, z1) {
    const h = hs[hi++ % hs.length], d = z1 - z0, zc = (z0 + z1) / 2;
    box(6, h, d - .3, DARK2, side * 11.2, h / 2, zc);
    for (let wy = 3.1; wy < h - 1; wy += 1.5)
      for (let wz = z0 + .9; wz < z1 - .7; wz += 1.15) slots.push({ x: side * 8.14, y: wy, z: wz });
    // vitrine no térreo e o nome da loja por cima
    lite(.05, 1.4, Math.min(2.5, d - 1.5), night ? mix(DARK2, LIGHT2, .3) : NAVY, side * 8.13, 1.05, zc);
    box(.06, .44, 2.3, DARK2, side * 8.17, 2.45, zc);
    const nome = letreiro(LOJAS[hi % LOJAS.length], 2.1, .36, mix(GLOW, LIGHT, .3), DARK2);
    nome.position.set(side * 8.135, 2.45, zc);
    nome.rotation.y = -side * Math.PI / 2;
  }
  const LOJAS = ['CAFÉ', 'COPIADORA', 'RESTAURANTE', 'PAPELARIA', 'LOTÉRICA', 'SALGADOS', 'RELOJOARIA'];
  for (const [z0, z1] of [[-50, -38], [-38, -26], [-16, -4], [-4, 10], [10, 24], [24, 32.4]]) {
    predio(-1, z0, z1);
    predio(1, z0, z1);
  }
  windowGrid(slots, new THREE.BoxGeometry(.12, .75, .5));

  // ---------- o viaduto: tabuleiro, guarda-corpos, pilares, muros de apoio ----------
  const VY = 6.4;                                                   // fundo do tabuleiro
  box(90, 1.1, VZ1 - VZ0, CONCRETO, 0, VY + .55, VZ);               // tabuleiro
  for (const zz of [VZ0 + .1, VZ1 - .1]) {
    box(90, .9, .2, LIGHT2, 0, VY + 1.55, zz);                      // guarda-corpo
    box(90, .12, .26, DARK2, 0, VY + .06, zz);                      // pingadeira
  }
  for (let vx = -40; vx <= 40; vx += 5) box(.5, .3, VZ1 - VZ0 - .4, DARK2, vx, VY - .15, VZ); // vigas por baixo
  for (const px of [-4.6, 4.6]) for (const pz of [VZ0 + 1.6, VZ1 - 1.6]) {
    box(1.1, VY, 1.1, CONCRETO, px, VY / 2, pz);                    // pilares na guia
    blockOf(px - .55, pz - .55, px + .55, pz + .55);
  }
  // encontro do viaduto no alinhamento dos prédios a oeste (preenche o vão entre os quarteirões -26..-16):
  // embaixo do viaduto a cidade vira concreto
  box(6, VY, 10, CONCRETO, -11.2, VY / 2, VZ);
  // a leste, o prédio da empresa: oco (casca), em volta da recepção do térreo e do escritório do 12º
  // andar, que estão lá dentro de verdade (mapa.js). O escritório avança em balanço sobre a calçada.
  const rc = caixaDe('recepcao2', -4.4, 6.1, -2.6, 2.6);
  const ec = caixaDe('empresa', -8.4, 7.4, -10, 4.4);
  const BX1 = Math.max(14.2, rc.x1 + .3), BZ0 = Math.min(VZ0 - 1.5, rc.z0 - .3), BZ1 = Math.max(VZ1 + 1.5, rc.z1 + .3);
  const vv = VEST.VW + .16, DZp = VZ + 1.2;
  casca({ x0: 8.2, x1: BX1, y0: 0, y1: VY, z0: BZ0, z1: BZ1 }, CONCRETO, {
    furos: { x0: [[DZp - vv, DZp + vv, 0, .12 + VEST.VH + .1]] },         // a portinha
  });
  const TOPO = { x0: Math.min(8.2, ec.x0 - .3), x1: Math.max(BX1, ec.x1 + .3), z0: Math.min(BZ0, ec.z0 - .3), z1: Math.max(BZ1, ec.z1 + .3), y0: ec.y - 1, y1: ec.y + 4 };
  casca({ x0: 8.2, x1: BX1, y0: VY + 1.1, y1: TOPO.y0, z0: BZ0, z1: BZ1 }, DARK2, { faces: ['x0', 'x1', 'z0', 'z1'] });
  casca(TOPO, DARK2, { faces: ['x0', 'x1', 'z0', 'z1', 'y0', 'y1'] });
  box(TOPO.x1 - TOPO.x0 + .3, .4, TOPO.z1 - TOPO.z0 + .3, DARK, (TOPO.x0 + TOPO.x1) / 2, TOPO.y1 + .2, (TOPO.z0 + TOPO.z1) / 2);
  const tSlots = [];
  for (let wy = VY + 2.4; wy < TOPO.y0 - .8; wy += 1.5)
    for (let wz = BZ0 + .9; wz < BZ1 - .7; wz += 1.15) tSlots.push({ x: 8.14, y: wy, z: wz });
  for (let wz = TOPO.z0 + .9; wz < TOPO.z1 - .7; wz += 1.15) tSlots.push({ x: TOPO.x0 - .06, y: TOPO.y0 + 2.2, z: wz });
  windowGrid(tSlots, new THREE.BoxGeometry(.12, .75, .5));
  // postes de luz no guarda-corpo, lá em cima
  for (let lx = -30; lx <= 30; lx += 10) {
    box(.1, 1.6, .1, DARK2, lx, VY + 2.6, VZ1 - .1);
    lite(.3, .1, .3, GLOW, lx, VY + 3.4, VZ1 - .3);
  }

  // ---------- a portinha: no muro leste, debaixo do viaduto ----------
  const DZ = VZ + 1.2;
  // a porta dá num vestíbulo de serviço, o mesmo cômodo que fica atrás da porta da recepção do
  // trabalho: a troca de cena acontece lá dentro, com a porta de trás fechada
  const vestPorta = vestibulo({
    x: 9.2, y: .12, z: DZ, yaw: -Math.PI / 2, lado: 'Q', outro: ['recepcao2', 'rua'], estilo: 'servico',
    arrive: nav.entry === 'recepcao' ? (nav.rel || true) : null,
  });
  box(.4, .12, .7, DARK2, 7.92, 2.62, DZ);                          // pinga-água
  lite(.06, .1, .18, GLOW, 8.09, 2.5, DZ);                          // lâmpada sobre a porta
  lite(.02, .14, .5, BLUE, 8.11, 1.75, DZ + .85);                   // plaquinha ao lado
  pointLight(night ? .7 : .45, 7, 7.3, 2.4, DZ);
  // um morador sentado num caixote no outro muro, abrigado da chuva, olhando a rua
  if (!night) {
    box(.5, .45, .45, DARK2, -7.85, .12 + .225, VZ - 1.5);
    const m = person(true, BLUE);
    m.position.set(-7.85, .1, VZ - 1.5);
    m.rotation.y = Math.PI / 2;
    blockOf(-8.2, VZ - 2, -7.3, VZ - 1);
  }

  // ---------- a saída do metrô: trincheira com escada, patamar e porta lá embaixo ----------
  for (let i = 0; i < 12; i++) box(2.2, .25, .45, LIGHT2, 7, -(i + 1) * .25 + .125, 2.825 + i * .45);
  box(2.2, .2, 2.6, FLOOR, 7, -3.1, 9.1);                           // patamar
  box(.16, 4, 8.0, DARK2, 5.82, -1.3, 6.5);                         // paredes da trincheira
  box(.16, 4, 8.0, DARK2, 8.18, -1.3, 6.5);
  for (const wx of [5.82, 8.18]) {
    box(.28, .18, 8.0, LIGHT2, wx, .77, 6.5);
    lite(.1, .05, 7.9, mix(BLUE, GLOW, .45), wx, .88, 6.5);         // fita de luz, no tom da estação VIADUTO
  }
  box(2.5, 1.2, .14, DARK2, 7, .3, 10.49);                          // fundo acima do vestíbulo + mureta
  const tot = grp(5.28, 0, 1.9);                                    // totem do metrô, visível da rua
  box(.24, 3.6, .24, DARK2, 0, 1.8, 0, tot);
  lite(.36, .36, .38, mix(BLUE, GLOW, .45), 0, 3.5, 0, tot);
  blockOf(5.12, 1.74, 5.44, 2.06);
  pointLight(.6, 8, 7, -2.4, 8.6, 0x9fccef);                        // a estação lá embaixo
  // lá embaixo, o vestíbulo que sobe para o patamar da estação VIADUTO (o mesmo cômodo está lá)
  const vestMetro = vestibulo({
    x: 7, y: -3, z: 11.42, yaw: Math.PI, lado: 'Q', outro: ['plataforma2', 'rua'], estilo: 'metro',
    arrive: nav.entry === 'metro' ? (nav.rel || true) : null,
  });
  lite(1.5, .3, .04, mix(BLUE, GLOW, .45), 7, -.55, 10.32);         // letreiro sobre a porta

  // ---------- carros estacionados e gente na calçada ----------
  const parados = [];
  for (const z of [-36, -30, -12, -6, 0, 6, 14]) parados.push({ x: -2.5, z, ry: 0 });
  for (const z of [-34, -28, -10, -2.5, 12, 17]) parados.push({ x: 2.5, z, ry: Math.PI });
  if (night) parados.splice(1, 3);
  parados.forEach((c, i) => { c.cor = PINTURAS[(i * 3 + 2) % PINTURAS.length]; blockOf(c.x - .85, c.z - 2.1, c.x + .85, c.z + 2.1); });
  frota(parados);
  const rotas = [{ x: -6.4, z0: -38, z1: -27 }, { x: 6.4, z0: -15, z1: 1.5, vel: .95, fase: .3 }, { x: -6.4, z0: -15, z1: 18, fase: .6 }];
  for (const r of night ? [rotas[2]] : rotas) pedestre({ ...r, chuva: day < 5 });

  // ---------- postes da rua e fim da cidade (bloqueios) ----------
  let pi = 0;
  for (const [lx, lz] of [[-3.9, -8], [3.9, -2], [-3.9, 8], [3.9, 16], [-3.9, -32], [3.9, -36]]) {
    box(.12, 3.9, .12, DARK2, lx, 1.95, lz);
    box(.7, .09, .09, DARK2, lx + (lx < 0 ? .32 : -.32), 3.82, lz);
    lite(.3, .12, .18, GLOW, lx + (lx < 0 ? .6 : -.6), 3.72, lz);
    if (pi++ % 2 === 0) pointLight(.55, 11, lx + (lx < 0 ? .6 : -.6), 3.5, lz);
    blockOf(lx - .2, lz - .2, lx + .2, lz + .2);
  }
  function bloqueio(x, z) {
    const g = grp(x, 0, z);
    box(.08, 1.0, .5, DARK2, -1.05, .5, 0, g);
    box(.08, 1.0, .5, DARK2, 1.05, .5, 0, g);
    box(2.3, .34, .07, LIGHT, 0, .92, 0, g);
    box(.5, .34, .08, DARK2, -.7, .92, 0, g);
    box(.5, .34, .08, DARK2, .7, .92, 0, g);
  }
  for (const bx of [-6.6, -4.2, -1.8, .6, 3.0, 5.4]) bloqueio(bx, -40.6);   // ao norte a rua segue até a avenida

  if (day < 5) chuva({ matRua, matCal, cRua: new THREE.Color(DARK2), cCal: new THREE.Color(FLOOR),
    streetBg, streetFog, streetStormFog: new THREE.Color(0x233342).multiplyScalar(nk),
    streetFlash: new THREE.Color(0x354a5c).multiplyScalar(nk) },
  (x, z) => (naEscada(x, z) || sobViaduto(z) ? -9 : noAsfalto(x, z) ? .035 : .135),
  // dentro dos vestíbulos (a portinha e o da estação) não chove, nem fora desta rua (a avenida tem a dela)
  (x, z) => !(Math.abs(x) <= 8.2 && z > -41 && z < 33) || (x > 8.2 && x < 10.4 && Math.abs(z - DZ) < 1.2) || (x > 5.8 && x < 8.2 && z > 10.4 && z < 12.6));

  // subindo do metrô ou saindo da portinha: vindo pelo vestíbulo de cada um
  const spawn = vestMetro.spawn || vestPorta.spawn || { x: 7, z: 9.2, yaw: 0 };
  return { spawn, caption: sceneCaption('rua2'), auto: null, elevFn };
}
