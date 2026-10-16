import { DARK2, NAVY, LIGHT, LIGHT2, BLUE, GLOW } from '../config.js';
import { objectName, linesOf, sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, pointLight, tag, walkOf, blockOf, room, person } from '../kit.js';
import { vestibulo } from '../vestibulo.js';

/* ===================== CENA: A LOJA (compra a passagem) ===================== */
export function buildLoja(nav = {}) {
  freshScene(10, 34);
  const W = 8, D = 7, H = 3.2;
  room(W, D, H, null, null, { s: { a0: -.55, a1: .55, h: 2.2 } });   // vão da porta da rua na parede sul
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

  // cartaz de passagens atrás (na parede do fundo)
  const cz = grp(1.3, 2.1, -D / 2 + .04);
  box(1.4, .9, .06, DARK2, 0, 0, 0, cz);
  lite(1.1, .6, .03, NAVY, 0, 0, .04, cz);
  lite(.8, .12, .03, GLOW, 0, .18, .06, cz);

  // prateleiras nas laterais: estante aberta (fundo, laterais, tábuas) com os produtos à vista
  for (const s of [-1, 1]) {
    const sh = grp(s * 3.5, 0, .3);
    box(.04, 2.4, 3.6, LIGHT2, s * .13, 1.2, 0, sh);                 // fundo
    for (const ez of [-1.78, 1.78]) box(.3, 2.4, .04, LIGHT2, 0, 1.2, ez, sh); // laterais
    box(.3, .04, 3.6, LIGHT2, 0, 2.38, 0, sh);                       // tampo
    for (let r = 0; r < 3; r++) {
      const sy = .6 + r * .55;
      box(.3, .04, 3.52, LIGHT2, 0, sy - .22, 0, sh);                // tábua sob a fileira
      for (let c = 0; c < 5; c++)
        box(.22, .4, .5, [BLUE, NAVY, LIGHT, GLOW][(r + c) % 4], -s * .02, sy, -1.4 + c * .7, sh);
    }
    blockOf(s * 3.5 - .3, -1.5, s * 3.5 + .3, 2.2);
  }

  // a porta da rua (parede de trás): o vestíbulo de vidro, o mesmo cômodo que está atrás da porta
  // da loja na esquina; a troca acontece lá dentro, sem tela escura
  const vest = vestibulo({
    x: 0, y: 0, z: D / 2 + 1, yaw: 0, lado: 'P', outro: ['rua', 'loja'], estilo: 'vidro',
    arrive: nav.entry === 'rua' ? (nav.rel || true) : null,
  });

  return { spawn: vest.spawn || { x: 0, z: 2.2, yaw: 0 }, caption: sceneCaption('loja'), auto: null };
}
