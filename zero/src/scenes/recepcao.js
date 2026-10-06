import * as THREE from 'three';
import { DARK2, NAVY, LIGHT2, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, blob, pointLight, tagGo, walkOf, blockOf, room, person } from '../kit.js';

/* ===================== CENA: A RECEPÇÃO DO PRÉDIO ===================== */
export function buildRecepcao() {
  freshScene(8, 30);
  const W = 12, D = 5.4, H = 3;
  room(W, D, H);
  walkOf(-5.4, -2.2, 5.4, 2.2);

  // luzes do saguão
  for (const lx of [-3.5, 0, 3.5]) {
    lite(.6, .05, .3, GLOW, lx, H - .04, 0);
    pointLight(.38, 9, lx, 2.4, 0);
  }

  // tapete da entrada
  box(2.2, .04, 3.6, DARK2, 4.2, .02, 0);

  // o elevador de onde você desceu (parede oeste)
  const ev = grp(-5.9, 0, 0);
  ev.rotation.y = Math.PI / 2;
  box(1.8, 2.5, .14, LIGHT2, 0, 1.25, 0, ev);
  box(.78, 2.3, .1, DARK2, -.41, 1.15, .06, ev);
  box(.78, 2.3, .1, DARK2, .41, 1.15, .06, ev);
  lite(.5, .12, .05, BLUE, 0, 2.62, .09, ev);

  // balcão da recepção com o porteiro
  const bal = grp(0, 0, -1.55);
  box(3.0, 1.05, .6, LIGHT2, 0, .525, 0, bal);
  box(3.1, .08, .7, DARK2, 0, 1.09, 0, bal);
  box(.34, .05, .26, DARK2, .6, 1.13, 0, bal);   // livro de registros
  lite(.1, .1, .1, BLUE, -.9, 1.18, 0, bal);     // luminária do balcão
  box(.5, .5, .45, DARK2, 0, .25, -.75, bal);    // banqueta
  const port = person(true, BLUE, bal);
  port.position.set(0, .04, -.75);
  blockOf(-1.7, -2.4, 1.7, -1.1);

  // caixas de correio, todas exatamente iguais
  const cor = grp(-3.4, 1.5, -2.64);
  for (let cy = 0; cy < 3; cy++)
    for (let cx = 0; cx < 6; cx++) {
      box(.3, .24, .07, LIGHT2, cx * .36 - .9, cy * .3 - .3, 0, cor);
      box(.2, .03, .02, DARK2, cx * .36 - .9, cy * .3 - .25, .04, cor);
    }

  // sofá de espera e vaso de planta
  const sofa = grp(1.8, 0, 2.0);
  box(2.0, .42, .8, LIGHT2, 0, .24, 0, sofa);
  box(2.0, .6, .2, LIGHT2, 0, .62, .32, sofa);
  box(.9, .14, .7, BLUE, -.5, .5, -.02, sofa);
  box(.9, .14, .7, BLUE, .5, .5, -.02, sofa);
  blockOf(.7, 1.5, 2.9, 2.5);
  box(.5, .55, .5, DARK2, -2.6, .275, 2.05);
  blob(.42, .5, .42, BLUE, -2.6, .95, 2.05);
  blockOf(-2.95, 1.7, -2.25, 2.4);

  // a porta de vidro para a rua (dá pra ver a chuva do lado de fora)
  const pv = grp(5.9, 0, 0);
  pv.rotation.y = -Math.PI / 2;
  box(2.6, 2.6, .14, LIGHT2, 0, 1.3, 0, pv);
  for (const s of [-1, 1]) {
    const vd = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 2.3, .05),
      new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: .6 })
    );
    vd.position.set(s * .56, 1.22, .05);
    pv.add(vd);
    box(.06, .5, .07, BLUE, s * .18, 1.15, .1, pv); // puxadores
  }
  tagGo(pv, 'streetDoor', 'rua');

  return { spawn: { x: -4.9, z: 0, yaw: -Math.PI / 2 }, caption: sceneCaption('recepcao'), auto: null };
}
