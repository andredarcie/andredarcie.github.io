import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from './config.js';
import { day, night } from './state.js';
import { box, lite, grp, anim, walkOf, tagDialog, person } from './kit.js';

/* ===================== o vagão: o mesmo por dentro na cena do metrô e no trem parado na estação ===================== */
// A troca estação ⇄ metrô não tem tela escura: o trem da plataforma carrega este mesmo interior.
// Você entra nele, as portas fecham e a cena troca (portas fechadas, nada lá fora à vista); na
// chegada a troca é de novo com as portas fechadas e elas abrem já na plataforma de verdade.
//
// Coordenadas locais do vagão: comprido em x, chão em y = 0, a porta na parede -z, em x = DX.
export const VAGAO = { L: 16, Wz: 2.36, H: 2.35, DX: 5.25, DW: .85 };

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

// g: grupo no referencial do vagão; W(lx, lz) → [x, z] do mundo com o vagão parado (para o chão andável)
// devolve { portas(k), andar(v), parada(cor | null), letreiro(msg), dentro(lx, lz), noVao(lx, lz) }
export function vagao(g, { W, nome }) {
  const { L, Wz, H, DX, DW } = VAGAO;
  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0, g);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0, g);
  for (const s of [-1, 1]) {
    const z = s * (Wz / 2 + .08), zb = s * (Wz / 2 - .02);
    if (s > 0) {
      box(L + .4, H, .16, LIGHT, 0, H / 2, z, g);
      box(L + .4, .14, .1, DARK2, 0, .07, zb, g);
    } else {
      // lado da porta: parede e rodapé interrompidos no vão
      const X0 = -L / 2 - .2, X1 = L / 2 + .2;
      for (const [a, b] of [[X0, DX - DW], [DX + DW, X1]]) {
        box(b - a, H, .16, LIGHT, (a + b) / 2, H / 2, z, g);
        box(b - a, .14, .1, DARK2, (a + b) / 2, .07, zb, g);
      }
      box(DW * 2, H - 2.05, .16, LIGHT, DX, (H + 2.05) / 2, z, g);
    }
    box(L + .4, .26, .1, DARK2, 0, 2.18, zb, g);
  }
  for (const k of [-1, 1]) box(.16, H, Wz + .4, LIGHT, k * (L / 2 + .08), H / 2, 0, g);

  // janelas: luzes do túnel passando; do lado da porta, a plataforma acesa quando o vagão para
  const luzes = [];
  function janela(x, s) {
    const j = grp(x, 1.5, s * (Wz / 2 - .06), g);
    box(1.3, 1.0, .07, LIGHT2, 0, 0, 0, j);
    box(1.12, .84, .05, DARK2, 0, 0, -s * .02, j);
    const st = lite(.24, .06, .02, BLUE, 0, .1, -s * .055, j);
    const est = s < 0 ? lite(1.1, .82, .01, GLOW, 0, 0, -s * .05, j) : null;
    luzes.push({ st, est, ph: Math.random() * 1.6, spd: 2.2 + Math.random() });
  }
  for (const x of [-6, -3, 0, 3]) { janela(x, 1); janela(x, -1); }
  janela(6, 1);

  // bancos corridos
  function banco(x1, x2, s) {
    const len = x2 - x1, cx = (x1 + x2) / 2;
    box(len, .46, .4, LIGHT2, cx, .23, s * (Wz / 2 - .31), g);
    box(len, .07, .48, LIGHT, cx, .5, s * (Wz / 2 - .33), g);
    box(len, .5, .06, LIGHT, cx, .78, s * (Wz / 2 - .12), g);
  }
  banco(-7.3, 7.3, 1);
  banco(-7.3, DX - DW - .2, -1);
  banco(DX + DW + .2, 7.3, -1);

  // pegadores pendurados
  box(12.5, .06, .06, DARK2, 0, 2.08, 0, g);
  for (let x = -5.6; x <= 5.7; x += 1.15) {
    if (Math.abs(x - 1.2) < .6) continue;   // ali pende o letreiro
    box(.04, .2, .04, DARK2, x, 1.96, 0, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.09, .028, 6, 10), new THREE.MeshLambertMaterial({ color: DARK2 }));
    ring.position.set(x, 1.8, 0);
    g.add(ring);
  }
  // luzes do teto (as lâmpadas pontuais vão junto com o trem)
  for (let x = -7; x <= 7; x += .9) lite(.22, .04, .22, GLOW, x, 2.32, 0, g);
  for (const lx of [-4, 4]) {
    const l = new THREE.PointLight(0xeaf2f2, .4, 10);
    l.position.set(lx, 2, 0);
    g.add(l);
  }

  // letreiro pendurado: a estação onde está, ou a próxima
  const let_ = grp(1.2, 1.92, 0, g);
  box(.06, .3, .06, DARK2, -.4, .3, 0, let_);
  box(.06, .3, .06, DARK2, .4, .3, 0, let_);
  box(1.0, .38, .1, DARK2, 0, 0, 0, let_);
  const lcv = document.createElement('canvas');
  lcv.width = 256; lcv.height = 80;
  const ltex = new THREE.CanvasTexture(lcv);
  ltex.colorSpace = THREE.SRGBColorSpace;
  const lmat = new THREE.MeshBasicMaterial({ map: ltex });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.9, .28), lmat);
    p.position.z = s * .056;
    if (s < 0) p.rotation.y = Math.PI;
    let_.add(p);
  }
  let lmsg = null;
  function letreiro(msg) {
    if (msg === lmsg) return;
    lmsg = msg;
    const c = lcv.getContext('2d');
    c.fillStyle = '#263848'; c.fillRect(0, 0, 256, 80);
    c.fillStyle = '#3aa2ea'; c.font = '46px VT323, monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(msg, 128, 42, 240);
    ltex.needsUpdate = true;
  }
  letreiro(nome || '');
  if (document.fonts) document.fonts.ready.then(() => { const m = lmsg; lmsg = null; letreiro(m); });

  // passageiros (os mesmos nas duas cenas): o de sempre (dia 1), os moradores (dia 2), alguém cochilando à noite
  const banco1 = Wz / 2 - .33;
  if (night) {
    const pas = person(true, BLUE, g);
    pas.position.set(-4.5, .04, banco1);
    pas.rotation.y = Math.PI;
    pas.rotation.z = .1;
  } else if (day === 1) {
    const pas = person(true, BLUE, g);
    pas.position.set(-2.5, .04, banco1);
    pas.rotation.y = Math.PI;
  } else if (day === 2) {
    const m1 = person(true, BLUE, g);
    m1.position.set(-1.0, .04, banco1);
    m1.rotation.y = Math.PI;
    tagDialog(m1, 'homeless', 'morador2a');
    const m2 = person(true, BLUE, g);
    m2.position.set(2.5, .04, -banco1);
    tagDialog(m2, 'otherHomeless', 'morador2b');
  }

  // porta: batentes por dentro e duas folhas que correm dentro da espessura da parede
  const pz = -(Wz / 2 - .02);
  for (const k of [-1, 1]) box(.1, 2.1, .1, LIGHT2, DX + k * (DW + .05), 1.05, pz, g);
  box(DW * 2 + .2, .1, .1, LIGHT2, DX, 2.1, pz, g);
  box(DW * 2, .03, .14, DARK2, DX, .015, pz - .04, g);                  // soleira
  const folhas = [-1, 1].map(k => {
    const f = box(DW, 2.05, .05, DARK2, DX + k * DW / 2, 1.025, -(Wz / 2 + .08), g);
    box(.45, .6, .07, NAVY, 0, .35, 0, f);                               // janelinha (dos dois lados)
    return f;
  });
  lite(.5, .09, .02, BLUE, DX, 2.2, pz + .07, g);

  // chão andável: o corredor do vagão e, com a porta aberta, o vão até a plataforma
  const rect = (x1, z1, x2, z2) => {
    const a = W(x1, z1), b = W(x2, z2);
    return walkOf(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]));
  };
  rect(-7.5, -.7, 7.5, .7);
  const vao = rect(DX - DW, -(Wz / 2 - .4), DX + DW, -(Wz / 2 + 1.1));
  const vaoAberto = { ...vao };

  let v = 0, parado = true, corParada = null, tl = null, kPorta = 0;
  function portas(k) {
    kPorta = k;
    const e = k * k * (3 - 2 * k);
    folhas[0].position.x = DX - DW / 2 - e * 1.15;
    folhas[1].position.x = DX + DW / 2 + e * 1.15;
    Object.assign(vao, k > .85 ? vaoAberto : { x1: 1e9, x2: -1e9 });
  }
  portas(0);
  anim(t => {
    const dt = tl === null ? 0 : Math.min(.05, t - tl);
    tl = t;
    for (const j of luzes) {
      j.ph = (j.ph + dt * j.spd * v) % 1.6;
      const k = j.ph - .8;
      j.st.position.x = k;
      j.st.visible = v > .05 && Math.abs(k) < .44;
      if (j.est) j.est.visible = parado && corParada !== null;
    }
  });
  return {
    portas,
    andar(nv) { v = nv; parado = nv <= 0; },
    parada(cor) { corParada = cor; if (cor !== null) for (const j of luzes) if (j.est) j.est.material.color.setHex(mix(cor, GLOW, .3)); },
    letreiro,
    // o jogador (em coordenadas do vagão) está lá dentro / no vão da porta
    dentro: (lx, lz) => Math.abs(lx) < L / 2 && lz > -(Wz / 2 - .05) && lz < Wz / 2,
    noVao: (lx, lz) => Math.abs(lx - DX) < DW + .2 && lz <= -(Wz / 2 - .25) && lz > -(Wz / 2 + 1.2),
  };
}
