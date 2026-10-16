import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from './config.js';
import { scene, box, lite, grp, anim, blocks, game, person } from './kit.js';

/* ===================== a cidade de verdade: carros, gente, letreiros (ruas) ===================== */
// "Detalhe sim, realismo não": a rua fica crível por ter MAIS COISAS (carros, pedestres, toldos,
// letreiros, mobiliário), cada uma de poucas caixas chapadas da paleta.

export const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

// cores de lataria: cinzas e azuis-escuros da paleta (azul vivo é só de gente)
export const PINTURAS = [LIGHT, LIGHT2, DARK, NAVY, FLOOR, GLOW, mix(LIGHT2, DARK2, .45), mix(NAVY, LIGHT, .35)];

/* ---------- carros instanciados: poucas chamadas de desenho para a frota inteira ---------- */
// molde de frente para +z, origem no chão no centro do carro (4.2 × 1.7 m)
function moldeCarro() {
  const pintura = new THREE.Group(), fixas = new THREE.Group();
  const BR = 0xffffff;                                   // a cor de cada instância tinge o branco
  box(1.7, .5, 4.1, BR, 0, .6, 0, pintura);              // caixa de baixo
  box(1.5, .46, 2.1, BR, 0, 1.08, -.25, pintura);        // cabine
  box(1.52, .06, 2.0, BR, 0, 1.33, -.25, pintura);       // teto
  box(1.54, .28, 2.14, NAVY, 0, 1.06, -.25, fixas);      // faixa dos vidros (para-brisa incluído)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .24, 8), new THREE.MeshLambertMaterial({ color: DARK, flatShading: true }));
    r.rotation.z = Math.PI / 2;
    r.position.set(sx * .76, .32, sz * 1.32);
    fixas.add(r);
  }
  for (const sz of [-1, 1]) box(1.74, .14, .12, DARK2, 0, .4, sz * 2.08, fixas);   // para-choques
  for (const sx of [-1, 1]) {
    lite(.32, .12, .04, GLOW, sx * .55, .72, 2.06, fixas);                       // faróis
    lite(.3, .1, .04, mix(DARK, GLOW, .45), sx * .56, .74, -2.06, fixas);        // lanternas
  }
  return { pintura, fixas };
}
// carros: [{ x, z, ry, cor }]; devolve { set(i, x, z, ry) } para mover um carro (engarrafamento)
export function frota(carros) {
  const n = carros.length, partes = [];
  const { pintura, fixas } = moldeCarro();
  for (const [molde, pinta] of [[pintura, true], [fixas, false]]) {
    molde.updateMatrixWorld(true);
    molde.traverse(o => {
      if (!o.isMesh) return;
      const im = new THREE.InstancedMesh(o.geometry, o.material, n);
      im.frustumCulled = false;
      if (pinta) carros.forEach((c, i) => im.setColorAt(i, new THREE.Color(c.cor)));
      scene.add(im);
      partes.push({ im, local: o.matrixWorld.clone() });
    });
  }
  const P = new THREE.Matrix4(), M = new THREE.Matrix4();
  function set(i, x, z, ry) {
    P.makeRotationY(ry).setPosition(x, 0, z);
    for (const p of partes) { p.im.setMatrixAt(i, M.multiplyMatrices(P, p.local)); p.im.instanceMatrix.needsUpdate = true; }
  }
  carros.forEach((c, i) => set(i, c.x, c.z, c.ry || 0));
  return { set };
}

/* ---------- pedestres: vão e voltam na calçada, de guarda-chuva se chove ---------- */
// x fixo, anda entre z0 e z1; para diante do jogador e, se ele não sair, dá meia-volta
export function pedestre({ x, z0, z1, y = .12, chuva = false, vel = 1.1, fase = 0, cor = BLUE }) {
  const w = grp(x, y, z0);
  const p = person(false, cor, w);
  if (chuva) {
    box(.03, .75, .03, DARK2, .12, 1.62, .1, w);                     // cabo
    const copa = new THREE.Mesh(new THREE.ConeGeometry(.66, .3, 8), new THREE.MeshLambertMaterial({ color: mix(DARK, NAVY, .5), flatShading: true }));
    copa.position.set(.06, 2.1, .06);
    w.add(copa);
  }
  const blk = { x1: 0, z1: 0, x2: 0, z2: 0 };                       // corpo sólido: o jogador não atravessa
  blocks.push(blk);
  const L = z1 - z0;
  let s = ((fase % 1) + 1) % 1 * L * 2, dir = 1, espera = 0, tl = null;
  anim(t => {
    const dt = tl === null ? 0 : Math.min(.05, t - tl);
    tl = t;
    // posição no vai-e-volta
    const u = s % (L * 2), z = u < L ? z0 + u : z1 - (u - L);
    dir = u < L ? 1 : -1;
    // o jogador logo à frente: espera; esperou demais, dá meia-volta
    const pl = game.player ? game.player() : null;
    const ahead = pl && Math.abs(pl.px - x) < .9 && (pl.pz - z) * dir > 0 && Math.abs(pl.pz - z) < 1.3;
    if (ahead) {
      espera += dt;
      if (espera > 1.6) { s = (L * 2 - u) % (L * 2); espera = 0; }
    } else {
      espera = 0;
      s += dt * vel;
    }
    w.position.z = z;
    w.position.y = y + (ahead ? 0 : Math.abs(Math.sin(t * 7 * vel + fase * 9)) * .035); // passada
    w.rotation.y = dir > 0 ? 0 : Math.PI;
    p.rotation.z = ahead ? 0 : Math.sin(t * 7 * vel + fase * 9) * .025;
    Object.assign(blk, { x1: x - .25, x2: x + .25, z1: z - .25, z2: z + .25 });
  });
  return w;
}

/* ---------- letreiro: texto chapado num canvas (lojas, placas de rua) ---------- */
export function letreiro(txt, w, h, cor = GLOW, fundo = DARK2) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = Math.max(16, Math.round(256 * h / w));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const css = c => '#' + new THREE.Color(c).getHexString();
  const draw = () => {
    const c = cv.getContext('2d');
    c.fillStyle = css(fundo); c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = css(cor);
    c.font = `${Math.round(cv.height * .78)}px VT323, monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(txt, cv.width / 2, cv.height * .54, cv.width * .9);
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts) document.fonts.ready.then(draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  scene.add(m);
  return m;
}

/* ---------- prédios ao longe: quarteirões ladeando uma transversal (a cidade continua) ---------- */
// faces viradas para a rua em z = zc ± 4; de x0 a x1 (lado positivo; espelha para o negativo)
export function quarteiraoLonge(zc, x0, x1, slots, alturas) {
  let i = 0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let a = x0; a < x1 - 2; ) {
      const wd = 5 + (i * 3.7 % 4), h = alturas[i++ % alturas.length], b = Math.min(x1, a + wd);
      const cx = sx * (a + b) / 2, face = zc + sz * 4;
      box(b - a - .2, h, 8, DARK2, cx, h / 2, face + sz * 4);
      box(b - a + .04, .3, 8.2, DARK, cx, h + .15, face + sz * 4);                  // platibanda
      for (let wy = 3.1; wy < h - 1; wy += 1.5)
        for (let wx = a + .8; wx < b - .6; wx += 1.15) slots.push({ x: sx * wx, y: wy, z: face - sz * .06 });
      a = b;
    }
  }
}
