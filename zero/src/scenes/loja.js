import { DARK2, NAVY, LIGHT, LIGHT2, BLUE, GLOW } from '../config.js';
import { objectName, linesOf, sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, pointLight, tag, walkOf, blockOf, room, person } from '../kit.js';

/* ===================== CENA: A LOJA (compra a passagem) ===================== */
export function buildLoja() {
  freshScene(10, 34);
  const W = 8, D = 7, H = 3.2;
  room(W, D, H);
  walkOf(-3.4, -2.8, 3.4, 2.8);

  for (const lx of [-2.5, 2.5]) for (const lz of [-1.5, 1.5]) {
    lite(.5, .05, .5, GLOW, lx, H - .05, lz);
    pointLight(.3, 10, lx, 2.6, lz);
  }

  // balcão de atendimento ao fundo, com o atendente
  const bal = grp(0, 0, -2.2);
  box(3.4, 1.05, .7, LIGHT2, 0, .525, 0, bal);
  box(3.5, .08, .8, DARK2, 0, 1.09, 0, bal);
  lite(.1, .1, .1, BLUE, -1.2, 1.18, 0, bal);   // luminária do balcão
  box(.5, .5, .45, DARK2, 0, .25, -.7, bal);    // banqueta
  const clerk = person(true, BLUE, bal);
  clerk.position.set(0, .04, -.7);
  tag(bal, objectName('storeClerk'), { lines: linesOf('atendente'), go: 'aviao' });
  blockOf(-1.9, -2.7, 1.9, -1.5);

  // cartaz de passagens atrás
  const cz = grp(1.3, 2.1, -2.86);
  box(1.4, .9, .06, DARK2, 0, 0, 0, cz);
  lite(1.1, .6, .03, NAVY, 0, 0, .04, cz);
  lite(.8, .12, .03, GLOW, 0, .18, .06, cz);

  // prateleiras nas laterais
  for (const s of [-1, 1]) {
    const sh = grp(s * 3.5, 0, .3);
    box(.3, 2.4, 3.6, LIGHT2, 0, 1.2, 0, sh);
    for (let sy = .6; sy < 2.3; sy += .55)
      for (let sz = -1.4; sz <= 1.4; sz += .7) {
        const cc = [BLUE, NAVY, LIGHT, GLOW][(Math.round(sy * 10) + Math.round(sz * 10)) % 4];
        box(.22, .4, .5, cc, -s * .06, sy, sz, sh);
      }
    blockOf(s * 3.5 - .3, -1.5, s * 3.5 + .3, 2.2);
  }

  // porta de volta pra rua (cenário)
  const back = grp(0, 0, 2.85);
  box(1.3, 2.4, .12, LIGHT2, 0, 1.2, 0, back);
  box(1.05, 2.25, .1, DARK2, 0, 1.12, -.05, back);

  return { spawn: { x: 0, z: 2.2, yaw: 0 }, caption: sceneCaption('loja'), auto: null };
}
