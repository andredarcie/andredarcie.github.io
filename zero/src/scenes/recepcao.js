import * as THREE from 'three';
import { DARK2, NAVY, LIGHT2, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, blob, pointLight, tagGo, walkOf, blockOf, room, person } from '../kit.js';
import { elevador, CABINE } from '../elevator.js';
import { vestibulo } from '../vestibulo.js';

/* ===================== CENA: A RECEPÇÃO DO PRÉDIO ===================== */
export function buildRecepcao(nav = {}) {
  freshScene(8, 30);
  const W = 12, D = 5.4, H = 3;
  // vão do elevador na parede oeste e o da porta da rua na leste
  room(W, D, H, null, { z0: -.5, z1: .5, h: 2.1 }, { e: { a0: -.55, a1: .55, h: 2.2 } });
  walkOf(-5.4, -2.2, 5.4, 2.2);

  // luzes do saguão
  for (const lx of [-3.5, 0, 3.5]) {
    lite(.6, .05, .3, GLOW, lx, H - .04, 0);
    pointLight(.38, 9, lx, 2.4, 0);
  }

  // tapete da entrada
  box(2.2, .04, 3.6, DARK2, 4.2, .02, 0);

  // o elevador (parede oeste): o mesmo poço do corredor do 23º, de frente para a porta da rua
  const elev = elevador({
    x: -W / 2, z: 0, yaw: Math.PI / 2,
    here: 'T', there: 23, to: ['corredor', 'elevador'],
    arrive: nav.entry === 'elevador' ? (nav.rel || CABINE) : null,
  });

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

  // a saída para a rua: um vestíbulo de vidro (o mesmo cômodo está atrás da porta do prédio na rua);
  // a cena troca lá dentro, com a porta de trás fechada, sem tela escura
  const vest = vestibulo({
    x: W / 2 + 1, y: 0, z: 0, yaw: Math.PI / 2, lado: 'P', outro: ['rua', 'predio'], estilo: 'vidro',
    arrive: nav.entry === 'rua' ? (nav.rel || true) : null,
  });

  const spawn = elev.spawn || vest.spawn || { x: -4.9, z: 0, yaw: -Math.PI / 2 };
  return { spawn, caption: sceneCaption('recepcao'), auto: null };
}
