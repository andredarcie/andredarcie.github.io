import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, FLOOR, BLUE, GLOW, LAMP } from './config.js';
import { objectName, linesOf } from './story.js';
import { termMat, termTex, drawIdle } from './terminal.js';

/* ===================== conteúdo da cena atual ===================== */
// reatribuídos a cada freshScene(); quem importa lê sempre a cena viva
export let scene = null;
export let walks = [], blocks = [], anims = [], inters = [];

// libera da GPU tudo o que a cena antiga criou (cada box tem geometria e material próprios)
function disposeScene(old) {
  old.traverse(o => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m === termMat) continue;            // tela do terminal é compartilhada entre cenas
      if (m.map && m.map !== termTex) m.map.dispose();
      m.dispose();
    }
  });
}

export function freshScene(fogNear = 9, fogFar = 34) {
  if (scene) disposeScene(scene);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(DARK);
  scene.fog = new THREE.Fog(DARK, fogNear, fogFar);
  walks = []; blocks = []; anims = []; inters = [];
  scene.add(new THREE.HemisphereLight(0xc9d5d7, 0x3a4f63, 1.05));
  const d = new THREE.DirectionalLight(0xe9f1f1, .5);
  d.position.set(3, 7, 2);
  scene.add(d);
  drawIdle();
  return scene;
}

/* ===================== helpers de construção ===================== */
export function box(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}
export function lite(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c }));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}
export function grp(x = 0, y = 0, z = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  (parent || scene).add(g);
  return g;
}
export function pointLight(intensity, dist, x, y, z, color = LAMP) {
  const l = new THREE.PointLight(color, intensity, dist);
  l.position.set(x, y, z);
  scene.add(l);
  return l;
}
// janelas acesas de prédios: uma InstancedMesh, 10% claras, 3% azuis, o resto apagadas
export function windowGrid(slots, geo, parent) {
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), slots.length);
  im.frustumCulled = false; // instâncias longe da origem do mesh: sem isso o Three corta tudo ao virar a câmera
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  slots.forEach((s, i) => {
    m4.setPosition(s.x, s.y, s.z);
    im.setMatrixAt(i, m4);
    const r = Math.random();
    c.setHex(r < .1 ? GLOW : r < .13 ? BLUE : NAVY);
    im.setColorAt(i, c);
  });
  (parent || scene).add(im);
  return im;
}
export function anim(fn) { anims.push(fn); }

// um molde (Group fora da cena) repetido em várias posições: uma InstancedMesh por peça.
// Dezenas de objetos idênticos viram poucos draw calls. colors (opcional): uma cor por instância.
export function instanciar(molde, mats, colors) {
  molde.updateMatrixWorld(true);
  const m4 = new THREE.Matrix4();
  molde.traverse(o => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, mats.length);
    im.frustumCulled = false; // instâncias longe da origem do mesh
    mats.forEach((P, i) => {
      im.setMatrixAt(i, m4.multiplyMatrices(P, o.matrixWorld));
      if (colors) im.setColorAt(i, colors[i]);
    });
    scene.add(im);
  });
}
// matriz de posição + giro em y (+ escala uniforme) para instanciar
export function at(x, y, z, ry = 0, s = 1) {
  return new THREE.Matrix4().makeRotationY(ry).scale(new THREE.Vector3(s, s, s)).setPosition(x, y, z);
}

/* ===================== interação ===================== */
// opções: lines (diálogo), terminal (+ seat/look), go (troca de cena),
// sequence (roda uma sequência do roteiro ao terminar), cb (função ao terminar)
export function tag(o, name, opts) { o.userData.inter = { name, ...opts }; inters.push(o); }
export function tagDialog(o, objectKey, scriptKey, opts = {}) {
  tag(o, objectName(objectKey), { lines: linesOf(scriptKey), ...opts });
}
export function tagTerminal(o, objectKey, scriptKey, opts = {}) {
  tag(o, objectName(objectKey), { terminal: linesOf(scriptKey), ...opts });
}
export function tagGo(o, objectKey, sceneName) {
  tag(o, objectName(objectKey), { go: sceneName });
}
export function walkOf(x1, z1, x2, z2) { walks.push({ x1, z1, x2, z2 }); }
export function blockOf(x1, z1, x2, z2) { blocks.push({ x1, z1, x2, z2 }); }

/* ===================== peças reaproveitadas ===================== */
export function room(W, D, H, hole, holeW) {
  box(W + .4, .2, D + .4, FLOOR, 0, -.1, 0);
  box(W + .4, .2, D + .4, DARK2, 0, H + .1, 0);
  const zN = -D / 2 - .09;
  if (!hole) {
    box(W + .4, H, .18, LIGHT, 0, H / 2, zN);
  } else {
    // parede norte em 4 segmentos, deixando o vão da janela aberto de verdade
    const X0 = -W / 2 - .2, X1 = W / 2 + .2;
    box(hole.x0 - X0, H, .18, LIGHT, (X0 + hole.x0) / 2, H / 2, zN);
    box(X1 - hole.x1, H, .18, LIGHT, (hole.x1 + X1) / 2, H / 2, zN);
    box(hole.x1 - hole.x0, hole.y0, .18, LIGHT, (hole.x0 + hole.x1) / 2, hole.y0 / 2, zN);
    box(hole.x1 - hole.x0, H - hole.y1, .18, LIGHT, (hole.x0 + hole.x1) / 2, (hole.y1 + H) / 2, zN);
  }
  box(W + .4, H, .18, LIGHT, 0, H / 2, D / 2 + .09);
  const xW = -W / 2 - .09;
  if (!holeW) {
    box(.18, H, D + .4, LIGHT, xW, H / 2, 0);
  } else {
    // parede oeste em 3 segmentos, deixando o vão da porta do banheiro
    const Z0 = -D / 2 - .2, Z1 = D / 2 + .2;
    box(.18, H, holeW.z0 - Z0, LIGHT, xW, H / 2, (Z0 + holeW.z0) / 2);
    box(.18, H, Z1 - holeW.z1, LIGHT, xW, H / 2, (holeW.z1 + Z1) / 2);
    box(.18, H - holeW.h, holeW.z1 - holeW.z0, LIGHT, xW, (holeW.h + H) / 2, (holeW.z0 + holeW.z1) / 2);
  }
  box(.18, H, D + .4, LIGHT, W / 2 + .09, H / 2, 0);
  for (const s of [-1, 1]) {
    box(W, .12, .06, DARK2, 0, .06, s * (D / 2 - .03));
    box(W, .1, .06, DARK2, 0, H - .05, s * (D / 2 - .03));
    box(.06, .12, D, DARK2, s * (W / 2 - .03), .06, 0);
    box(.06, .1, D, DARK2, s * (W / 2 - .03), H - .05, 0);
  }
}

export function person(sit, c = BLUE, parent) {
  const g = grp(0, 0, 0, parent);
  if (sit) {
    box(.13, .5, .14, c, -.1, .25, .38, g);  box(.13, .5, .14, c, .1, .25, .38, g);
    box(.13, .18, .42, c, -.1, .56, .18, g); box(.13, .18, .42, c, .1, .56, .18, g);
    box(.4, .55, .22, c, 0, .92, 0, g);
    box(.1, .42, .15, c, -.25, .95, .02, g); box(.1, .42, .15, c, .25, .95, .02, g);
    box(.15, .14, .16, c, 0, 1.16, 0, g);    // pescoço (fecha o vão torso-cabeça)
    box(.26, .26, .24, c, 0, 1.33, 0, g);
  } else {
    box(.13, .52, .16, c, -.1, .26, 0, g);   box(.13, .52, .16, c, .1, .26, 0, g);
    box(.4, .55, .22, c, 0, .79, 0, g);
    box(.1, .45, .15, c, -.25, .83, 0, g);   box(.1, .45, .15, c, .25, .83, 0, g);
    box(.15, .15, .16, c, 0, 1.06, 0, g);    // pescoço
    box(.26, .26, .24, c, 0, 1.22, 0, g);
    g.scale.setScalar(1.2);
  }
  return g;
}

export function cat(x, z, rot) {
  const g = grp(x, 0, z);
  g.rotation.y = rot;
  const c = DARK2;
  box(.42, .2, .17, c, 0, .26, 0, g);
  for (const [lx, lz] of [[-.15, -.05], [.15, -.05], [-.15, .05], [.15, .05]])
    box(.05, .16, .05, c, lx, .08, lz, g);
  box(.2, .18, .18, c, .27, .42, 0, g);
  box(.05, .07, .04, c, .22, .54, -.05, g);
  box(.05, .07, .04, c, .22, .54, .05, g);
  const tail = box(.05, .34, .05, c, 0, 0, 0, g);
  tail.geometry.translate(0, .17, 0);
  tail.position.set(-.23, .3, 0);
  anims.push(t => { tail.rotation.z = .5 + Math.sin(t * 2.4) * .3; });
  return g;
}

export function blob(rx, ry, rz, c, x, y, z, parent) { // esfera low-poly achatada, forma orgânica
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 10, 7),
    new THREE.MeshLambertMaterial({ color: c, flatShading: true })
  );
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}

const texLoader = new THREE.TextureLoader();
export function quadro(file, w, h, x, y, z, roty) { // quadro emoldurado com imagem
  const g = grp(x, y, z);
  g.rotation.y = roty;
  box(w + .16, h + .16, .06, DARK2, 0, 0, 0, g);
  const tex = texLoader.load(file);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; // mantém o pixel art da arte 2D
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.z = .035;
  g.add(m);
  return g;
}

/* ===================== a cidade lá fora ===================== */
export function cidade() {
  const g = grp(0, 0, 0);
  // torres gigantes em duas fileiras, sufocando o céu
  const defs = [
    [-13, -9, 7, 46], [-5.5, -8, 5, 40], [1.5, -9.5, 6, 52], [8, -8, 5, 38], [15, -9, 7, 48],
    [-18, -17, 9, 60], [-8, -18, 8, 66], [2, -19, 9, 58], [12, -17, 8, 64], [21, -18, 8, 56],
  ];
  const slots = [];
  const yBase = -18, towerDepth = 4;
  for (const [x, z, w, h] of defs) {
    box(w, h, towerDepth, DARK2, x, yBase + h / 2, z, g);
    box(w + .24, .22, towerDepth + .24, DARK, x, yBase + h + .11, z, g); // topo: evita bloco cortado
    box(.12, h - .3, towerDepth + .1, 0x223545, x - w / 2 + .06, yBase + h / 2 - .05, z, g);
    box(.12, h - .3, towerDepth + .1, 0x223545, x + w / 2 - .06, yBase + h / 2 - .05, z, g);
    const faceZ = z + towerDepth / 2 + .16; // bem à frente da torre: evita z-fighting à distância
    for (let wy = yBase + 1.2; wy < yBase + h - 1; wy += 1.5)
      for (let wx = -w / 2 + .8; wx < w / 2 - .5; wx += 1.1)
        slots.push({ x: x + wx, y: wy, z: faceZ });
  }
  // antenas em algumas torres
  box(.1, 3, .1, DARK2, 1.5, 34.5, -9.5, g);
  box(.1, 2.4, .1, DARK2, -8, 49.2, -18, g);
  box(.1, 2.6, .1, DARK2, 15, 31.3, -9, g);
  // mil outras janelas, exatamente como a minha
  windowGrid(slots, new THREE.BoxGeometry(.5, .75, .12), g);
}
