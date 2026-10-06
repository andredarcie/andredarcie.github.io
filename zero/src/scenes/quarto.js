import * as THREE from 'three';
import { DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day } from '../state.js';
import { objectName, speakerName, linesOf, roomCaption, roomAuto } from '../story.js';
import { termMat } from '../terminal.js';
import { say } from '../dialog.js';
import { freshScene, box, lite, grp, pointLight, tag, tagDialog, tagTerminal, tagGo, walkOf, blockOf, room, cidade } from '../kit.js';

/* ===================== CENA: O QUARTO ===================== */
export function buildQuarto() {
  freshScene(9, 42);
  const W = 9, D = 4.6, H = 2.8;
  room(W, D, H, { x0: .34, x1: 1.46, y0: 1.32, y1: 2.18 }, { z0: -1.8, z1: -.7, h: 2.05 });
  cidade();
  walkOf(-4.2, -2.0, 4.2, 2.0);

  // banheiro: anexo atrás do vão na parede oeste
  box(2.7, .2, 2.7, FLOOR, -5.8, -.1, -1.2);
  box(2.7, .2, 2.7, DARK2, -5.8, H + .1, -1.2);
  box(.18, H, 2.7, LIGHT, -7.04, H / 2, -1.2);   // parede oeste
  box(2.4, H, .18, LIGHT, -5.79, H / 2, -2.39);  // norte
  box(2.4, H, .18, LIGHT, -5.79, H / 2, -.01);   // sul
  walkOf(-6.7, -2.0, -4.55, -.4);
  walkOf(-4.8, -1.7, -4.1, -.8); // passagem pelo vão
  box(.1, 2.05, .1, DARK2, -4.59, 1.025, -1.83); // batentes
  box(.1, 2.05, .1, DARK2, -4.59, 1.025, -.67);
  lite(.14, .06, .14, GLOW, -5.8, H - .07, -1.2);
  pointLight(.45, 6, -5.8, 2.2, -1.2);

  // pia + espelho (coluna esquerda da arte, agora no banheiro)
  const pia = grp(-6.6, 0, -.85);
  box(.6, .85, .95, LIGHT2, 0, .43, 0, pia);
  box(.64, .07, .99, DARK2, 0, .885, 0, pia);
  box(.1, .2, .08, DARK2, -.18, 1.0, 0, pia);
  const esp = grp(-6.92, 1.6, -.85);
  box(.07, .78, .6, DARK2, 0, 0, 0, esp);
  box(.05, .66, .48, NAVY, .03, 0, 0, esp);
  blockOf(-6.95, -1.35, -6.25, -.35);

  // vaso sanitário contra a parede norte
  const vaso = grp(-6.35, 0, -1.8);
  box(.36, .4, .44, LIGHT2, 0, .2, .05, vaso);
  box(.44, .08, .5, LIGHT, 0, .44, .05, vaso);
  box(.48, .55, .2, LIGHT2, 0, .62, -.32, vaso);
  box(.12, .05, .08, DARK2, 0, .92, -.32, vaso);
  blockOf(-6.65, -2.2, -6.05, -1.5);

  // chuveiro no canto
  box(.95, .07, .85, DARK2, -5.15, .035, -1.85);  // base
  box(.05, 1.1, .05, DARK2, -5.15, 1.7, -2.24);   // cano
  box(.3, .06, .3, LIGHT2, -5.15, 2.22, -2.05);   // ducha
  box(.12, .2, .06, DARK2, -5.15, 1.05, -2.26);   // registro

  // estante de livros na parede norte (é dela que ele fala ao lembrar dos seus livros)
  const gr = grp(-2.9, 0, -1.95);
  const woodC = LIGHT2;
  box(.07, 2.05, .52, woodC, -.565, 1.025, 0, gr);   // lateral esquerda
  box(.07, 2.05, .52, woodC, .565, 1.025, 0, gr);    // lateral direita
  box(1.2, .09, .56, DARK2, 0, 2.06, 0, gr);         // tampo
  box(1.2, .1, .52, woodC, 0, .05, 0, gr);           // base
  box(1.13, 2.0, .04, DARK2, 0, 1.03, -.225, gr);    // fundo escuro
  for (const sy of [.5, .87, 1.24, 1.61]) box(1.1, .05, .48, woodC, 0, sy, 0, gr); // prateleiras
  // livros de verdade: lombadas coloridas, alturas e larguras variadas
  const bookCols = [BLUE, LIGHT, DARK2, NAVY, GLOW, 0xc7d4d5, 0x35566e];
  let seed = 7;
  const rnd = () => { seed++; const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };
  for (const sy of [.1, .525, .895, 1.265, 1.635]) { // superfície de cada prateleira
    let x = -.5;
    while (x < .42) {
      const w = .04 + rnd() * .055, hgt = .23 + rnd() * .06;
      // assenta o livro um pouco DENTRO da prateleira: sem base quase-coplanar (evita piscar)
      const bk = box(w, hgt, .21, bookCols[Math.floor(rnd() * bookCols.length)], x + w / 2, sy + hgt / 2 - .012, .1, gr);
      bk.rotation.z = (rnd() - .5) * .022;           // inclinação sutil, sem raspar a prateleira
      x += w + .015;
    }
  }
  // dois livros deitados e um bibelô em cima da estante (encaixados, sem faces coplanares)
  box(.3, .05, .22, NAVY, -.18, 2.12, 0, gr);
  box(.26, .05, .2, BLUE, -.18, 2.16, 0, gr);
  box(.12, .17, .12, LIGHT, .22, 2.185, 0, gr);
  if (day === 1) tagDialog(gr, 'bookshelf', 'guardaRoupa');
  blockOf(-3.55, -2.3, -2.25, -1.6);

  // mesa: dias 1-4 têm computador; no dia 5 a mesa está vazia
  const pc = grp(-1.2, 0, -1.85);
  box(1.25, .07, .62, LIGHT2, 0, .78, 0, pc);
  for (const [lx, lz] of [[-.55, -.24], [.55, -.24], [-.55, .24], [.55, .24]])
    box(.07, .78, .07, DARK2, lx, .39, lz, pc);
  if (day !== 5) {
    box(.4, .05, .3, DARK2, 0, .84, -.08, pc);
    box(.09, .22, .09, DARK2, 0, .97, -.12, pc);
    box(1.04, .68, .08, DARK2, 0, 1.42, -.14, pc); // monitor grande
    const tela1 = new THREE.Mesh(new THREE.PlaneGeometry(.92, .56), termMat);
    tela1.position.set(0, 1.42, -.095);
    pc.add(tela1);
    box(.4, .04, .16, DARK2, 0, .83, .16, pc);
  }
  const sentado1 = { seat: { x: -1.2, y: 1.15, z: -1.0 }, look: { x: -1.2, y: 1.42, z: -1.99 } };
  if (day === 1) tagTerminal(pc, 'computer', 'pcQuarto1', { ...sentado1 });
  if (day === 3) tagTerminal(pc, 'computer', 'pcQuarto3', { ...sentado1, sequence: 'finishDay3' });
  if (day === 4) tagTerminal(pc, 'computer', 'pcQuarto4', { ...sentado1, cb: () => say(speakerName('thought'), linesOf('semViews')) });
  blockOf(-1.9, -2.3, -.5, -1.4);

  // janela de verdade: vão aberto na parede, a cidade lá fora
  const jan = grp(.9, 1.75, -2.39);
  box(1.34, .1, .22, LIGHT2, 0, .48, 0, jan);
  box(1.34, .1, .22, LIGHT2, 0, -.48, 0, jan);
  box(.1, 1.06, .22, LIGHT2, -.62, 0, 0, jan);
  box(.1, 1.06, .22, LIGHT2, .62, 0, 0, jan);
  box(.07, .86, .12, LIGHT2, 0, 0, 0, jan);   // cruzeta vertical
  box(1.14, .07, .12, LIGHT2, 0, 0, 0, jan);  // cruzeta horizontal
  box(1.34, .07, .34, LIGHT2, 0, -.55, .08, jan); // peitoril
  const vidro = new THREE.Mesh(
    new THREE.PlaneGeometry(1.14, .86),
    new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide })
  );
  vidro.position.z = -.03;
  jan.add(vidro);
  if (day === 1) tagDialog(jan, 'window', 'janela');

  // fotografia na parede
  const qs = grp(2.35, 1.55, -2.2);
  for (const [qx, qy] of [[-.23, .21], [.23, .21], [-.23, -.21], [.23, -.21]]) {
    box(.3, .3, .06, DARK2, qx, qy, 0, qs);
    box(.22, .22, .02, NAVY, qx, qy, .04, qs);
  }
  if (day === 1) tagDialog(qs, 'photo', 'fotografia');

  // porta de saída
  const door = grp(3.75, 0, -2.18);
  box(1.14, 2.3, .1, LIGHT2, 0, 1.15, 0, door);
  box(.96, 2.16, .09, DARK2, 0, 1.08, .03, door);
  box(.07, .07, .07, BLUE, -.36, 1.08, .07, door);
  if (day < 3 || day === 5) tagGo(door, 'door', 'corredor');
  else if (day === 4) tag(door, objectName('door'), { sequence: 'finishDay4' }); // dia 4: sair pela porta pula pro dia 5
  // (dia 3 termina no PC ao criar o jogo)

  // cama com cobertor azul
  const cama = grp(1.7, 0, 1.72);
  box(2.15, .32, 1.05, LIGHT2, 0, .16, 0, cama);
  box(2.1, .16, 1.0, LIGHT, 0, .4, 0, cama);
  box(1.25, .18, 1.02, BLUE, -.4, .42, 0, cama);
  box(.5, .14, .6, 0xc7d4d5, .72, .51, 0, cama);
  blockOf(.5, 1.1, 2.85, 2.3);

  // tapete e luminária
  box(1.9, .05, 1.25, DARK2, 0, .025, .6);
  box(.04, .5, .04, DARK2, 0, H - .25, 0);
  box(.34, .16, .34, DARK2, 0, H - .55, 0);
  lite(.14, .07, .14, GLOW, 0, H - .66, 0);
  pointLight(.55, 9, 0, 2, 0);

  // deitado na cama (cabeça no travesseiro, olhando o teto); o giro leva daqui até em pé
  const wake = { x: 2.0, y: .6, z: 1.72, yaw: .55, pitch: 1.2 };
  return { spawn: { x: 0, z: 1.1, yaw: 0 }, caption: roomCaption(), auto: roomAuto(), wake };
}
