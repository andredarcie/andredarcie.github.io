import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, GLOW } from '../config.js';
import { freshScene, box, lite, instanciar, at } from '../kit.js';
import { LINHA } from '../mapa.js';

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

/* ===================== LUGAR: A LINHA (o túnel entre as duas estações) ===================== */
// No referencial da plataforma CENTRAL (mapa.js): a CENTRAL fica em x = 0 e a VIADUTO em x = -LINHA.
// Cada estação já tem um pedaço de túnel até x = ±30 dela; este liga o da CENTRAL (x = -30) ao da
// VIADUTO (x = -LINHA + 30), com o mesmo corte: chão, duas paredes, teto, trilhos, nervuras.
export function buildLinha() {
  freshScene(6, 27);
  const X0 = -30, X1 = -LINHA + 30, L = X0 - X1, CX = (X0 + X1) / 2;
  const RIB = mix(DARK2, LIGHT, .22);
  box(L, 4.6, .2, DARK2, CX, .9, -2.85);                 // parede do fundo
  box(L, 4.6, .2, DARK2, CX, .9, .15);                   // parede do outro lado
  box(L, .2, 3.2, DARK2, CX, 3.2, -1.35);                // teto
  box(L, .5, 3.2, DARK2, CX, -1.17, -1.35);              // chão (o balastro)
  for (const rz of [-.85, -1.75]) box(L, .1, .12, LIGHT2, CX, -.79, rz);   // trilhos
  box(L, .12, .16, NAVY, CX, -.64, -2.25);               // terceiro trilho
  for (const cy of [-.3, -.45]) box(L, .05, .05, DARK2, CX, cy, -2.62);   // cabos na parede

  // dormentes, nervuras e luzinhas de serviço: um molde cada, repetido ao longo do túnel
  const dorm = new THREE.Group();
  box(.28, .1, 1.55, DARK, 0, -.86, -1.3, dorm);
  const dm = [];
  for (let x = X1; x < X0; x += .78) dm.push(at(x, 0, 0));
  instanciar(dorm, dm);
  const nerv = new THREE.Group();
  box(.25, .2, 3.0, RIB, 0, 3.02, -1.35, nerv);
  for (const rz of [-2.7, 0]) box(.25, 4.0, .12, RIB, 0, 1.0, rz, nerv);
  const nm = [];
  for (let x = X1 + 1; x < X0; x += 2) nm.push(at(x, 0, 0));
  instanciar(nerv, nm);
  const luz = new THREE.Group();
  lite(.1, .1, .06, GLOW, 0, 2.3, -2.62, luz);
  const lm = [];
  for (let x = X1 + 1; x < X0; x += 8) lm.push(at(x, 0, 0));
  instanciar(luz, lm);

  return { spawn: { x: CX, z: -1.35, yaw: 0 }, caption: '', auto: null };
}
