import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { night } from '../state.js';
import { sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, blob, pointLight, tagGo, walkOf, blockOf, person } from '../kit.js';
import { elevador, CABINE } from '../elevator.js';
import { vestibulo } from '../vestibulo.js';

/* ===================== CENA: A RECEPÇÃO DO TRABALHO (atrás da portinha sob o viaduto) ===================== */
// entra-se pela porta da parede oeste (vindo da rua, andando para +x) e o elevador fica em frente,
// na parede leste: sobe até o 12º, o corredor do escritório
export function buildRecepcao2(nav = {}) {
  freshScene(8, 26);
  const W = 8, D = 4.6, H = 3;

  box(W + .4, .2, D + .4, FLOOR, 0, -.1, 0);                       // piso
  box(W + .4, .2, D + .4, DARK2, 0, H + .1, 0);                    // teto
  for (const s of [-1, 1]) {
    box(W + .4, H, .18, LIGHT, 0, H / 2, s * (D / 2 + .09));       // paredes norte e sul
    box(W, .12, .06, DARK2, 0, .06, s * (D / 2 - .03));            // rodapés
    box(W, .1, .06, DARK2, 0, H - .05, s * (D / 2 - .03));
  }
  // parede oeste, com o vão da porta do vestíbulo de serviço
  for (const k of [-1, 1]) box(.18, H, D / 2 + .2 - .55, LIGHT, -W / 2 - .09, H / 2, k * ((D / 2 + .2 + .55) / 2));
  box(.18, H - 2.2, 1.1, LIGHT, -W / 2 - .09, (H + 2.2) / 2, 0);
  walkOf(-W / 2 + .4, -D / 2 + .4, W / 2 - .4, D / 2 - .4);

  // luz baixa de saguão de serviço: duas luminárias, uma delas cansada
  lite(.9, .05, .3, GLOW, -1.5, H - .04, 0);
  pointLight(.4, 9, -1.5, 2.4, 0);
  lite(.9, .05, .3, GLOW, 2, H - .04, 0);
  pointLight(night ? .2 : .32, 8, 2, 2.4, 0);

  // a portinha de volta para a rua (sob o viaduto): o vestíbulo de serviço, o mesmo cômodo que fica
  // atrás da porta no muro do viaduto; a troca acontece lá dentro, com a porta de trás fechada
  const vest = vestibulo({
    x: -W / 2 - 1, y: 0, z: 0, yaw: -Math.PI / 2, lado: 'P', outro: ['rua2', 'recepcao'], estilo: 'servico',
    arrive: nav.entry === 'rua' ? (nav.rel || true) : null,
  });
  lite(.02, .14, .5, GLOW, -W / 2 + .1, 2.48, 0);                   // "saída"
  box(1.4, .03, 1.0, DARK2, -W / 2 + .7, .015, 0);                  // capacho

  // balcão da recepção encostado na parede sul, com a recepcionista (de dia)
  const bal = grp(-.6, 0, 1.55);
  box(2.4, 1.05, .6, LIGHT2, 0, .525, 0, bal);
  box(2.5, .08, .7, DARK2, 0, 1.09, 0, bal);
  box(.42, .3, .05, DARK2, .5, 1.28, .05, bal);                     // monitor de costas para quem entra
  lite(.1, .1, .1, BLUE, -.9, 1.18, 0, bal);                        // luminária do balcão
  box(.5, .5, .45, DARK2, 0, .25, .55, bal);                        // banqueta
  if (!night) {
    const r = person(true, BLUE, bal);
    r.position.set(0, .04, .55);
    r.rotation.y = Math.PI;                                         // de frente para o saguão
  }
  blockOf(-1.9, 1.1, .7, 2.3);

  // catracas: dois postes com o vão livre no meio (a do meio está sempre aberta)
  for (const cz of [-1.35, -.55, .55]) {
    box(.9, .95, .18, LIGHT2, 1.2, .475, cz);
    lite(.08, .04, .1, BLUE, 1.55, .97, cz);
    blockOf(.75, cz - .09, 1.65, cz + .09);
  }

  // o nome da empresa na parede norte, e uma planta esquecida
  box(2.2, .6, .08, DARK2, -1.2, 2.1, -D / 2 + .04);
  lite(1.9, .36, .03, BLUE, -1.2, 2.1, -D / 2 + .1);
  box(.45, .5, .45, DARK2, 3.3, .25, -1.85);
  blob(.36, .45, .36, BLUE, 3.3, .85, -1.85);
  blockOf(3.05, -2.1, 3.55, -1.6);

  // o elevador, na parede leste: o poço que sobe até o escritório
  const elev = elevador({
    x: W / 2, z: 0, yaw: -Math.PI / 2, wall: { w: D + .4, H },
    here: 'T', there: 12, to: ['empresa', 'elevador'],
    arrive: nav.entry === 'elevador' ? (nav.rel || CABINE) : null,
  });

  const spawn = elev.spawn || vest.spawn || { x: -W / 2 + .8, z: 0, yaw: -Math.PI / 2 };  // entrando pela portinha
  return { spawn, caption: sceneCaption('recepcao2'), auto: null };
}
