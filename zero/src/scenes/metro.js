import * as THREE from 'three';
import { DARK2, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day } from '../state.js';
import { linesOf, sceneCaption } from '../story.js';
import { scene, freshScene, box, lite, grp, pointLight, anim, tagDialog, tagGo, walkOf, person } from '../kit.js';

/* ===================== CENA: O METRO ===================== */
export function buildMetro() {
  freshScene(8, 30);
  const L = 16, Wz = 2.7, H = 2.35;

  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0);
  for (const s of [-1, 1]) {
    box(L + .4, H, .16, LIGHT, 0, H / 2, s * (Wz / 2 + .08));
    box(L + .4, .26, .1, DARK2, 0, 2.18, s * (Wz / 2 - .02));
    box(L + .4, .14, .1, DARK2, 0, .07, s * (Wz / 2 - .02));
  }
  box(.16, H, Wz + .4, LIGHT, -L / 2 - .08, H / 2, 0);
  box(.16, H, Wz + .4, LIGHT, L / 2 + .08, H / 2, 0);
  walkOf(-7.5, -.85, 7.5, .85);

  // janelas com luzes do túnel passando (cenário)
  function janela(x, s) {
    const g = grp(x, 1.5, s * (Wz / 2 - .06));
    box(1.3, 1.0, .07, LIGHT2, 0, 0, 0, g);
    box(1.12, .84, .05, DARK2, 0, 0, -s * .02, g);
    const st = lite(.24, .06, .02, BLUE, 0, .1, -s * .055, g);
    const ph = Math.random() * 9, spd = 2.2 + Math.random();
    anim(t => {
      const k = ((t * spd + ph) % 1.6) - .8;
      st.position.x = k;
      st.visible = Math.abs(k) < .44;
    });
  }
  for (const x of [-6, -3, 0, 3]) { janela(x, 1); janela(x, -1); }
  janela(6, 1);

  // bancos corridos
  function banco(x1, x2, s) {
    const len = x2 - x1, cx = (x1 + x2) / 2;
    box(len, .46, .4, LIGHT2, cx, .23, s * (Wz / 2 - .31));
    box(len, .07, .48, LIGHT, cx, .5, s * (Wz / 2 - .33));
    box(len, .5, .06, LIGHT, cx, .78, s * (Wz / 2 - .12));
  }
  banco(-7.3, 7.3, 1);
  banco(-7.3, 4.2, -1);
  banco(6.3, 7.3, -1);

  // pegadores pendurados (cenário)
  box(12.5, .06, .06, DARK2, 0, 2.08, 0);
  for (let x = -5.6; x <= 5.7; x += 1.15) {
    box(.04, .2, .04, DARK2, x, 1.96, 0);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(.09, .028, 6, 10),
      new THREE.MeshLambertMaterial({ color: DARK2 })
    );
    ring.position.set(x, 1.8, 0);
    scene.add(ring);
  }

  // luzes pontilhadas do teto
  for (let x = -7; x <= 7; x += .9) lite(.22, .04, .22, GLOW, x, 2.32, 0);
  for (const lx of [-4, 4]) {
    pointLight(.4, 10, lx, 2, 0);
  }

  // letreiro azul pendurado (cenário)
  const let_ = grp(1.2, 1.92, 0);
  box(.06, .3, .06, DARK2, -.4, .3, 0, let_);
  box(.06, .3, .06, DARK2, .4, .3, 0, let_);
  box(1.0, .38, .1, DARK2, 0, 0, 0, let_);
  lite(.9, .28, .02, BLUE, 0, 0, .06, let_);
  lite(.9, .28, .02, BLUE, 0, 0, -.06, let_);

  if (day === 1) {
    // passageiro comum (cenário)
    const pas = person(true);
    pas.position.set(-2.5, .04, 1.0);
    pas.rotation.y = Math.PI;
  } else {
    // dia 2: os moradores de rua
    const m1 = person(true);
    m1.position.set(-1.0, .04, 1.0);
    m1.rotation.y = Math.PI;
    tagDialog(m1, 'homeless', 'morador2a');
    const m2 = person(true);
    m2.position.set(2.5, .04, -1.0);
    tagDialog(m2, 'otherHomeless', 'morador2b');
  }

  // porta do vagão
  const pdoor = grp(5.25, 0, -(Wz / 2 - .07));
  box(2.0, 2.2, .12, LIGHT2, 0, 1.1, 0, pdoor);
  box(.85, 2.05, .1, DARK2, -.46, 1.02, .05, pdoor);
  box(.85, 2.05, .1, DARK2, .46, 1.02, .05, pdoor);
  lite(.5, .09, .02, BLUE, 0, 2.0, .12, pdoor);
  tagGo(pdoor, 'subwayDoor', 'empresa');

  return {
    spawn: { x: -6.3, z: 0, yaw: -Math.PI / 2 },
    caption: sceneCaption('metro'),
    auto: day === 1 ? { name: '', lines: linesOf('metro1') } : null,
    sway: true, // o vagão balança a câmera
  };
}
