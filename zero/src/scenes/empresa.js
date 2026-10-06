import * as THREE from 'three';
import { DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW, ASSETS } from '../config.js';
import { day } from '../state.js';
import { sceneCaption } from '../story.js';
import { termMat } from '../terminal.js';
import { freshScene, box, lite, grp, pointLight, tagDialog, tagTerminal, walkOf, blockOf, person, cat, quadro } from '../kit.js';

/* ===================== CENA: O TRABALHO ===================== */
export function buildEmpresa() {
  freshScene(10, 40);
  const H = 3;

  box(3.4, .2, 8.6, FLOOR, 5.5, -.1, -3.9);
  box(15.6, .2, 4.4, FLOOR, -.5, -.1, 2);
  box(3.4, .2, 8.6, DARK2, 5.5, H + .1, -3.9);
  box(15.6, .2, 4.4, DARK2, -.5, H + .1, 2);
  box(3.4, H, .18, LIGHT, 5.5, H / 2, -8.09);
  box(.18, H, 12.6, LIGHT, 7.09, H / 2, -2.05);
  box(.18, H, 8.2, LIGHT, 3.91, H / 2, -4.05);
  box(12.2, H, .18, LIGHT, -2.05, H / 2, -.09);
  box(.18, H, 4.4, LIGHT, -8.09, H / 2, 2);
  box(15.6, H, .18, LIGHT, -.5, H / 2, 4.09);
  walkOf(4.3, -7.55, 6.7, 1.0);
  walkOf(-7.6, .4, 6.7, 3.65);

  for (const [lx, lz] of [[5.5, -5], [5.5, -1], [0, 2], [-5, 2], [4, 2]]) {
    pointLight(.35, 11, lx, 2.6, lz);
  }

  // porta da rua (cenário, atrás de você)
  const ed = grp(5.5, 0, -7.96);
  box(1.2, 2.3, .1, LIGHT2, 0, 1.15, 0, ed);
  box(1.0, 2.16, .09, DARK2, 0, 1.08, .04, ed);
  box(.07, .07, .06, BLUE, .38, 1.05, .09, ed);

  // relógio de ponto (cenário)
  const pt = grp(6.96, 1.45, -6.3);
  box(.1, .5, .62, DARK2, 0, 0, 0, pt);
  lite(.03, .07, .07, GLOW, -.06, .1, -.12, pt);
  lite(.03, .07, .07, GLOW, -.06, .1, .12, pt);

  // o chefe: escuro, maior, bloqueando o corredor
  const chefe = person(false, DARK2);
  chefe.position.set(5.9, 0, -1.2);
  chefe.rotation.y = Math.PI;
  chefe.scale.setScalar(1.34);
  tagDialog(chefe, 'boss', day === 1 ? 'chefe1a' : 'chefe2a');
  blockOf(5.55, -1.55, 6.25, -.85);

  // copa: balcão, cafeteira, micro-ondas (cenário)
  const copa = grp(-5.5, 0, .55);
  box(3.1, .95, .75, LIGHT2, 0, .475, 0, copa);
  box(3.2, .07, .85, LIGHT, 0, .99, 0, copa);
  const cafe = grp(-.9, 1.03, 0, copa);
  box(.32, .5, .32, DARK2, 0, .25, 0, cafe);
  box(.2, .2, .2, BLUE, 0, .1, .2, cafe);
  lite(.05, .05, .02, BLUE, .1, .42, .17, cafe);
  const micro = grp(.9, 1.21, 0, copa);
  box(.55, .36, .42, DARK2, 0, 0, 0, micro);
  box(.32, .26, .02, NAVY, -.06, 0, .22, micro);
  blockOf(-7.15, 0, -3.85, 1.05);

  // mural de avisos (cenário)
  const mural = grp(-7.94, 1.7, 2);
  box(.07, .7, .95, DARK2, 0, 0, 0, mural);
  box(.05, .6, .85, LIGHT2, .02, 0, 0, mural);
  lite(.02, .2, .16, GLOW, .06, .12, -.2, mural);
  lite(.02, .16, .13, GLOW, .06, -.1, .12, mural);
  box(.02, .12, .1, BLUE, .06, .14, .28, mural);

  // relógio de parede (cenário)
  const rel = grp(0, 2.25, .02);
  box(.36, .36, .07, DARK2, 0, 0, 0, rel);
  box(.28, .28, .02, 0xc7d4d5, 0, 0, .04, rel);
  box(.03, .1, .015, DARK2, 0, .04, .055, rel);
  box(.08, .03, .015, DARK2, .04, 0, .055, rel);

  // mesa do colega
  const mesaC = grp(-1.5, 0, 1.7);
  box(1.7, .07, .75, LIGHT2, 0, .76, 0, mesaC);
  for (const [lx, lz] of [[-.78, -.3], [.78, -.3], [-.78, .3], [.78, .3]])
    box(.07, .76, .07, DARK2, lx, .38, lz, mesaC);
  for (const dx of [-.38, .38]) {
    box(.22, .04, .18, DARK2, dx, .8, -.15, mesaC);
    box(.06, .14, .06, DARK2, dx, .88, -.18, mesaC);
    box(.5, .38, .06, DARK2, dx, 1.16, -.2, mesaC);
    box(.44, .32, .02, NAVY, dx, 1.16, -.16, mesaC);
  }
  box(.4, .04, .15, DARK2, 0, .81, .18, mesaC);
  box(.5, .07, .5, DARK2, 0, .5, .85, mesaC);
  box(.5, .55, .07, DARK2, 0, .85, 1.12, mesaC);
  const col = person(true, BLUE, mesaC);
  col.position.set(0, .04, .85);
  col.rotation.y = Math.PI;
  if (day === 1) tagDialog(mesaC, 'coworker', 'colega1');
  blockOf(-2.5, 1.2, -.5, 2.95);

  // funcionário parado (cenário)
  const func = person(false);
  func.position.set(2.3, 0, 2.45);
  func.rotation.y = -.7;
  blockOf(2.0, 2.15, 2.6, 2.75);

  // gato do escritório (cenário)
  cat(3.6, 3.45, 2.6);

  // placa de piso molhado (cenário)
  const placa = grp(-4.2, 0, 3.1);
  const a = box(.34, .52, .05, BLUE, 0, .26, .11, placa); a.rotation.x = -.35;
  const b = box(.34, .52, .05, BLUE, 0, .26, -.11, placa); b.rotation.x = .35;
  blockOf(-4.45, 2.85, -3.95, 3.35);

  // quadros com as 3 telas do jogo 2D original (cenário)
  quadro(ASSETS.pixelScreens.quarto, .59, .55, -.1, 2.0, 3.99, Math.PI);
  quadro(ASSETS.pixelScreens.metro, 1.02, .55, 1.0, 2.0, 3.99, Math.PI);
  quadro(ASSETS.pixelScreens.empresa, .65, .55, 2.1, 2.0, 3.99, Math.PI);

  // sua mesa: o computador do trabalho, fecha o dia
  const minha = grp(-7.3, 0, 2.6);
  box(.8, .07, 1.5, LIGHT2, 0, .76, 0, minha);
  for (const [lx, lz] of [[-.32, -.68], [.32, -.68], [-.32, .68], [.32, .68]])
    box(.07, .76, .07, DARK2, lx, .38, lz, minha);
  box(.3, .05, .42, DARK2, -.1, .81, 0, minha);
  box(.09, .22, .09, DARK2, -.14, .93, 0, minha);
  box(.08, .68, 1.04, DARK2, -.22, 1.42, 0, minha); // monitor grande
  const tela2 = new THREE.Mesh(new THREE.PlaneGeometry(.92, .56), termMat);
  tela2.rotation.y = Math.PI / 2;
  tela2.position.set(-.175, 1.42, 0);
  minha.add(tela2);
  box(.15, .04, .4, DARK2, .15, .81, 0, minha);
  box(.5, .07, .5, DARK2, .85, .5, 0, minha);
  box(.07, .55, .5, DARK2, 1.13, .85, 0, minha);
  box(.3, .42, .22, BLUE, .3, .21, 1.05, minha);
  const sentado2 = { seat: { x: -6.5, y: 1.15, z: 2.6 }, look: { x: -7.52, y: 1.42, z: 2.6 } };
  if (day === 1) tagTerminal(minha, 'computer', 'pcTrabalho1', {
    ...sentado2,
    sequence: 'finishDay1Work',
  });
  if (day === 2) tagTerminal(minha, 'computer', 'pcTrabalho2', {
    ...sentado2,
    sequence: 'finishDay2Work',
  });
  blockOf(-7.75, 1.7, -6.4, 3.5);

  return { spawn: { x: 5.5, z: -7.1, yaw: Math.PI }, caption: sceneCaption('empresa'), auto: null };
}
