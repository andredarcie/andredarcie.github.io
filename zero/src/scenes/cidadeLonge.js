import * as THREE from 'three';
import { DARK, DARK2, NAVY, GLOW, BLUE } from '../config.js';
import { scene, freshScene } from '../kit.js';
import { noMundo, LINHA } from '../mapa.js';

/* ===================== LUGAR: A CIDADE AO LONGE ===================== */
// Os quarteirões que não se visitam: massas escuras com janelas, em volta de tudo o que se anda
// (as ruas, a avenida, o aeroporto). Ninguém chega perto delas; vê-se do alto (o quarto, o avião
// decolando) e no fim das ruas. Duas malhas instanciadas: os prédios e as janelas acesas.
export function buildCidadeLonge() {
  freshScene();
  const XE = noMundo('rua2', {}).x;
  // onde não pode haver prédio (x0, x1, z0, z1): o que se anda e o que já tem prédio
  const livre = [
    [-16, 16, -56, 40], [-34, 34, -22, 36], [-16, XE + 16, 36, 84], [XE - 16, XE + 26, -34, 64],
    [26, 262, -720, 54],
  ];
  let seed = 41;
  const rnd = () => { seed++; const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const caixas = [];
  const CEL = 26;
  for (let cx = -300; cx <= XE + 300; cx += CEL) {
    for (let cz = -320; cz <= 320; cz += CEL) {
      const w = 12 + rnd() * 9, d = 12 + rnd() * 9;
      const x = cx + (rnd() - .5) * 4, z = cz + (rnd() - .5) * 4;
      const x0 = x - w / 2 - 2, x1 = x + w / 2 + 2, z0 = z - d / 2 - 2, z1 = z + d / 2 + 2;
      if (livre.some(([a, b, c, e]) => x1 > a && x0 < b && z1 > c && z0 < e)) continue;
      const longe = Math.min(1, Math.hypot(x - XE / 2, z) / 400);
      const h = 14 + rnd() * (30 + 40 * longe);
      caixas.push({ x, z, w, d, h });
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  const predios = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), caixas.length);
  predios.frustumCulled = false;
  caixas.forEach((b, i) => {
    predios.setMatrixAt(i, m4.compose(p.set(b.x, b.h / 2, b.z), q, s.set(b.w, b.h, b.d)));
    predios.setColorAt(i, c.setHex(DARK2).lerp(new THREE.Color(DARK), rnd() * .5));
  });
  scene.add(predios);
  // janelas acesas espalhadas nas fachadas (poucas: é longe)
  const jan = [];
  for (const b of caixas) {
    for (let k = 0; k < 7; k++) {
      const face = Math.floor(rnd() * 4), y = 3 + rnd() * (b.h - 5);
      const u = (rnd() - .5) * .9;
      if (face === 0) jan.push([b.x + u * b.w, y, b.z + b.d / 2 + .05, 0]);
      else if (face === 1) jan.push([b.x + u * b.w, y, b.z - b.d / 2 - .05, 0]);
      else if (face === 2) jan.push([b.x + b.w / 2 + .05, y, b.z + u * b.d, 1]);
      else jan.push([b.x - b.w / 2 - .05, y, b.z + u * b.d, 1]);
    }
  }
  const janelas = new THREE.InstancedMesh(new THREE.BoxGeometry(.55, .8, .12), new THREE.MeshBasicMaterial({ color: 0xffffff }), jan.length);
  janelas.frustumCulled = false;
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  jan.forEach(([x, y, z, girado], i) => {
    janelas.setMatrixAt(i, m4.compose(p.set(x, y, z), girado ? qy : q, s.set(1, 1, 1)));
    const r = rnd();
    janelas.setColorAt(i, c.setHex(r < .6 ? GLOW : r < .7 ? BLUE : NAVY));
  });
  scene.add(janelas);
  return { spawn: { x: 0, z: 0, yaw: 0 }, caption: '', auto: null };
}
