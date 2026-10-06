import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { trainArrive, trainStopSfx } from '../audio.js';
import { freshScene, box, lite, grp, pointLight, anim, tagGo, walkOf, blockOf, person } from '../kit.js';

/* ===================== CENA: A PLATAFORMA (o metrô chega e para) ===================== */
export function buildPlataforma() {
  freshScene(6, 27);   // túnel escuro: o trem emerge da névoa

  // ---------- piso da plataforma (topo y=0) e faixa da borda ----------
  box(30, .5, 4.0, FLOOR, 0, -.25, 1.85);
  for (let fx = -14; fx <= 14; fx += 2) lite(.03, .012, 3.9, DARK2, fx, .012, 1.85);   // juntas do piso
  for (let fz = .3; fz <= 3.7; fz += 1.15) lite(30, .012, .03, DARK2, 0, .012, fz);
  box(30, .05, .34, DARK2, 0, .015, .3);                                                // faixa tátil
  for (let tx = -14.5; tx <= 14.5; tx += .62) lite(.26, .055, .16, GLOW, tx, .045, .3); // pastilhas táteis
  lite(30, .02, .06, BLUE, 0, .07, .12);                                                // linha azul de segurança
  box(30, 1.1, .12, DARK2, 0, -.5, -.02);                                               // face vertical da borda
  walkOf(-11.5, .55, 11.5, 3.4);

  // ---------- fosso, trilhos, terceiro trilho, cabos ----------
  box(32, .5, 3.6, DARK2, 0, -1.15, -1.7);           // balastro (topo y=-.9)
  for (let sx = -15; sx <= 15; sx += .78) box(.28, .1, 1.55, DARK, sx, -.86, -1.3); // dormentes
  box(32, .1, .12, LIGHT2, 0, -.79, -.85);           // trilho 1
  box(32, .1, .12, LIGHT2, 0, -.79, -1.75);          // trilho 2
  for (let sx = -14; sx <= 14; sx += 2.4) box(.1, .28, .1, DARK2, sx, -.71, -2.25); // isoladores
  box(32, .12, .16, NAVY, 0, -.64, -2.25);           // terceiro trilho (energizado)
  for (const cy of [-.3, -.45]) box(32, .05, .05, DARK2, 0, cy, -2.62); // cabos na parede do fosso

  // ---------- teto abobadado (vault facetado) com nervuras e cove ----------
  const V = [[-3.1, 3.0], [-1.2, 4.05], [.7, 4.62], [2.6, 4.05], [4.2, 3.0]]; // perfil (z,y)
  function facet(a, b) {
    const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
    const m = box(31, .22, len, LIGHT2, 0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    m.rotation.x = Math.atan2(-dy, dz);
  }
  for (let i = 0; i < V.length - 1; i++) facet(V[i], V[i + 1]);
  for (const [pz, py] of [V[1], V[2], V[3]]) box(31, .1, .12, DARK2, 0, py + .12, pz); // purlins
  box(32, .7, .4, DARK2, 0, 2.95, -2.95);            // lintel sobre a boca do túnel
  lite(31, .06, .5, GLOW, 0, 3.05, -2.85);           // cove de luz (lado do trilho)
  lite(31, .06, .5, GLOW, 0, 3.05, 4.05);            // cove de luz (lado da parede)
  // nervuras transversais escuras acompanhando a abóbada
  for (const rx of [-12, -8, -4, 4, 8, 12])
    for (let i = 0; i < V.length - 1; i++) {
      const a = V[i], b = V[i + 1], dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
      const m = box(.16, .14, len, DARK2, rx, (a[1] + b[1]) / 2 + .05, (a[0] + b[0]) / 2);
      m.rotation.x = Math.atan2(-dy, dz);
    }

  // ---------- parede do fundo azulejada (rodapé, faixa, cornija, pilastras) ----------
  box(30, 5.5, .3, LIGHT, 0, 2.5, 4.15);
  box(30, .9, .36, DARK2, 0, .45, 3.99);             // rodapé/wainscot
  lite(30, .34, .03, NAVY, 0, 1.15, 3.98);           // faixa lisa de azulejo
  box(30, .2, .5, LIGHT2, 0, 3.05, 4.0);             // cornija no topo
  for (let ty = 1.6; ty < 3.0; ty += .46) box(30, .02, .02, DARK2, 0, ty, 3.965);  // juntas h
  for (let tx = -13.5; tx <= 13.5; tx += 1.15) box(.02, 1.5, .02, DARK2, tx, 2.25, 3.965); // juntas v
  for (const px of [-12, -8, -4, 0, 4, 8, 12]) box(.5, 3.0, .55, LIGHT2, px, 1.5, 4.0);    // pilastras

  // painéis de anúncio iluminados entre as pilastras
  for (const px of [-10, -6, 10, 6]) {
    box(2.5, 1.7, .12, DARK2, px, 1.9, 3.9);
    lite(2.2, 1.44, .03, px % 4 === 0 ? NAVY : 0x2b4a63, px, 1.9, 3.83);
  }
  // letreiros "M" repetidos na parede
  function mSign(x) {
    const g = grp(x, 2.0, 3.86);
    box(.9, .66, .1, DARK2, 0, 0, 0, g);
    lite(.7, .5, .04, BLUE, 0, 0, -.06, g);
    lite(.1, .38, .03, GLOW, -.21, 0, -.09, g);
    lite(.1, .38, .03, GLOW, .21, 0, -.09, g);
    const a = lite(.08, .3, .03, GLOW, -.1, .08, -.09, g); a.rotation.z = .74;
    const b = lite(.08, .3, .03, GLOW, .1, .08, -.09, g); b.rotation.z = -.74;
  }
  mSign(-2); mSign(2);
  // painel indicador de próximo trem (pendurado)
  const ind = grp(0, 3.15, 1.4);
  box(3.0, .7, .12, DARK2, 0, 0, 0, ind);
  lite(2.7, .44, .03, BLUE, 0, 0, .07, ind);
  box(.05, .55, .05, DARK2, -1.1, .6, 0, ind); box(.05, .55, .05, DARK2, 1.1, .6, 0, ind);

  // ---------- bocas de túnel com anéis recuando na escuridão ----------
  for (const s of [-1, 1]) {
    // parede-portal com um vão do tamanho do trem
    box(.4, 5.6, 4.2, LIGHT, s * 14.6, 2.4, 2.0);        // parede da ponta (lado plataforma)
    box(.4, 1.5, 2.6, DARK2, s * 14.6, 3.75, -1.35);     // acima do vão (deixa o trem passar)
    box(.4, 5.6, .9, LIGHT, s * 14.6, 2.4, -3.05);       // fecha atrás do trilho
    for (let r = 0; r < 6; r++) {                         // anéis do túnel recuando
      const rx = s * (15.2 + r * 1.9), sc = 1 - r * .05;
      box(.5, (3.3) * sc, (3.0) * sc, DARK2, rx, .5, -1.4);
      lite(.06, 2.5 * sc, 2.4 * sc, r === 0 ? 0x0e1a24 : 0x0a141c, rx + s * .26, .4, -1.4);
    }
  }

  // ---------- luminárias: pendentes quentes + point lights ----------
  for (let lx = -10; lx <= 10; lx += 4) {
    box(.1, .5, .1, DARK2, lx, 4.0, .6);               // haste
    lite(1.4, .12, .5, GLOW, lx, 3.72, .6);            // luminária
    pointLight(.34, 15, lx, 3.4, .8);
  }
  pointLight(.3, 10, 0, .6, -.6, 0x9fc4e6);
  // um fluorescente piscando, ao fundo (atmosfera)
  const flick = lite(1.4, .12, .5, GLOW, 12, 3.72, .6);
  anim(t => { flick.visible = !(Math.sin(t * 22) > .7 && Math.sin(t * 3.3) > .2); });

  // ---------- colunas na borda da plataforma (base, fuste, capitel, uplight) ----------
  for (const cx of [-11, -7, -3.4, 3.4, 7, 11]) {
    box(.62, .2, .62, DARK2, cx, .1, .75);             // base
    box(.4, 3.0, .4, LIGHT2, cx, 1.6, .75);            // fuste
    box(.58, .22, .58, LIGHT2, cx, 3.15, .75);         // capitel
    lite(.09, 2.2, .09, BLUE, cx, 1.9, .56);           // veio de luz
    blockOf(cx - .32, .45, cx + .32, 1.05);
  }

  // ---------- mobiliário: bancos, lixeira, máquina, mapa, relógio ----------
  function banco(x) {
    const g = grp(x, 0, 3.35);
    box(2.2, .1, .58, LIGHT2, 0, .46, 0, g);
    box(2.2, .55, .09, LIGHT2, 0, .74, .26, g);
    for (const bx of [-.9, .9]) box(.1, .46, .52, DARK2, bx, .23, 0, g);
    blockOf(x - 1.15, 3.05, x + 1.15, 3.6);
    return g;
  }
  const b1 = banco(-8), b2 = banco(9);
  person(true, BLUE, b1).position.set(-.5, .5, -.02);
  const p2 = person(true, BLUE, b2); p2.position.set(.5, .5, -.02); p2.rotation.y = Math.PI;
  // passageiros em pé esperando o trem
  const w1 = person(false); w1.position.set(-3.5, 0, 1.3); w1.rotation.y = .1; blockOf(-3.8, 1.0, -3.2, 1.6);
  const w2 = person(false); w2.position.set(5.5, 0, 1.5); w2.rotation.y = -.2; blockOf(5.2, 1.2, 5.8, 1.8);
  // lixeira
  box(.5, .8, .5, DARK2, -11.5, .4, 2.8); box(.56, .1, .56, DARK2, -11.5, .82, 2.8); blockOf(-11.8, 2.5, -11.2, 3.1);
  // máquina de bilhetes (caixa iluminada)
  const maq = grp(11.6, 0, 2.9);
  box(1.0, 1.9, .7, LIGHT2, 0, .95, 0, maq);
  lite(.7, .8, .05, NAVY, 0, 1.25, .36, maq);
  lite(.5, .12, .05, BLUE, 0, .6, .36, maq);
  blockOf(11.0, 2.5, 12.2, 3.3);
  // mapa da rede (painel emoldurado)
  box(2.4, 1.5, .1, DARK2, 0, 1.7, 4.0);
  lite(2.1, 1.2, .03, 0x2b4a63, 0, 1.7, 3.92);
  // relógio
  const rel = grp(-6, 3.0, 3.9);
  box(.5, .5, .1, DARK2, 0, 0, 0, rel);
  lite(.38, .38, .03, GLOW, 0, 0, -.06, rel);
  box(.03, .16, .02, DARK2, 0, .06, -.09, rel);
  box(.12, .03, .02, DARK2, .05, 0, -.09, rel);

  // ===== o trem: chega da direita, desacelera e para com a porta no x=0 =====
  const LEN = 26, doorsX = [-8, -4, 0, 4, 8];
  const train = grp(34, 0, -1.35);
  box(LEN, 2.5, 2.1, LIGHT2, 0, 1.2, 0, train);            // corpo
  box(LEN - .4, .5, 1.9, DARK2, 0, 2.55, 0, train);        // teto arredondado
  for (let ax = -9; ax <= 9; ax += 4.5) box(1.2, .2, 1.0, DARK, ax, 2.84, 0, train); // ar-condicionado
  box(LEN, .34, 2.16, BLUE, 0, 1.98, 0, train);            // faixa azul superior
  box(LEN, .32, 2.16, DARK2, 0, .2, 0, train);             // saia inferior
  box(LEN, .12, 2.15, DARK2, 0, 1.18, 0, train);           // friso entre janelas
  for (let wx = -12; wx <= 12; wx += 1.5) {                // banda de janelas com moldura
    if (doorsX.some(dx => Math.abs(wx - dx) < 1.0)) continue;
    box(1.15, .82, .03, DARK2, wx, 1.56, 1.045, train);
    box(1.0, .68, .04, NAVY, wx, 1.56, 1.06, train);
  }
  for (const dx of doorsX) {                                // portas fechadas decorativas
    if (dx === 0) continue;
    box(1.55, 2.05, .05, DARK2, dx, 1.05, 1.03, train);
    box(.7, 1.9, .04, NAVY, dx - .38, 1.05, 1.07, train);
    box(.7, 1.9, .04, NAVY, dx + .38, 1.05, 1.07, train);
    box(.05, 2.05, .06, BLUE, dx, 1.05, 1.09, train);
  }
  for (const s of [-1, 1]) {                                // cabines: para-brisa, faróis, destino
    box(.7, 2.5, 2.1, LIGHT2, s * (LEN / 2 - .15), 1.2, 0, train);
    box(.12, .8, 1.5, NAVY, s * (LEN / 2 + .16), 1.75, 0, train);
    lite(.14, .2, .1, GLOW, s * (LEN / 2 + .18), .55, .6, train);
    lite(.14, .2, .1, GLOW, s * (LEN / 2 + .18), .55, -.6, train);
    lite(.9, .22, .05, BLUE, s * (LEN / 2 - .15), 2.28, .9, train);
  }
  // porta central (x=0), em frente ao jogador — abre só quando o trem para
  box(1.9, 2.15, .1, DARK2, 0, 1.05, 1.0, train);
  const doorGlow = lite(1.6, 2.0, .03, GLOW, 0, 1.05, .9, train);
  doorGlow.visible = false;
  const dpL = box(.56, 2.0, .08, LIGHT, -.3, 1.05, 1.06, train);
  const dpR = box(.56, 2.0, .08, LIGHT, .3, 1.05, 1.06, train);

  trainArrive(1.2, 4.6); // som sincronizado com a chegada

  let t0 = null, stopped = false;
  const DELAY = 1.2, DUR = 4.6, X0 = 34;
  function onStopped() {
    trainStopSfx();
    doorGlow.visible = true;
    let o0 = null;
    anim(t => {                    // portas deslizam abrindo
      if (o0 === null) o0 = t;
      const k = Math.min((t - o0) / .9, 1);
      dpL.position.x = -.3 - k * .42;
      dpR.position.x = .3 + k * .42;
    });
    tagGo(doorGlow, 'subwayDoor', 'metro'); // agora dá pra entrar no vagão
  }
  anim(t => {
    if (t0 === null) t0 = t;
    const e = t - t0 - DELAY;
    if (e <= 0) { train.position.x = X0; return; }
    if (e >= DUR) {
      train.position.x = 0;
      if (!stopped) { stopped = true; onStopped(); }
      return;
    }
    const k = e / DUR, ease = 1 - Math.pow(1 - k, 3); // desacelera ao chegar
    train.position.x = X0 * (1 - ease);
  });

  return { spawn: { x: -1.2, z: 2.7, yaw: 0 }, caption: sceneCaption('plataforma'), auto: null };
}
