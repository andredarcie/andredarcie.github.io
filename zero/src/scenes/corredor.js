import { DARK2, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, pointLight, tagGo, walkOf } from '../kit.js';

/* ===================== CENA: O CORREDOR DO PRÉDIO ===================== */
export function buildCorredor() {
  freshScene(7, 26);
  const L = 12, Wz = 2.4, H = 2.6;

  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0);
  for (const s of [-1, 1]) {
    box(L + .4, H, .16, LIGHT, 0, H / 2, s * (Wz / 2 + .08));
    box(L, .12, .06, DARK2, 0, .06, s * (Wz / 2 - .03));
    box(L, .1, .06, DARK2, 0, H - .05, s * (Wz / 2 - .03));
  }
  box(.16, H, Wz + .4, LIGHT, -L / 2 - .08, H / 2, 0);
  box(.16, H, Wz + .4, LIGHT, L / 2 + .08, H / 2, 0);
  walkOf(-L / 2 + .45, -Wz / 2 + .42, L / 2 - .45, Wz / 2 - .42);

  // tapete corrido
  box(L - 1.2, .04, .95, DARK2, 0, .02, 0);

  // luzes do teto
  for (const lx of [-4, 0, 4]) {
    lite(.5, .04, .2, GLOW, lx, H - .03, 0);
    pointLight(.35, 8, lx, 2.2, 0);
  }

  // portas dos vizinhos, todas exatamente iguais (cenário)
  function portaViz(x, s) {
    const d = grp(x, 0, s * (Wz / 2 - .04));
    box(1.0, 2.2, .1, LIGHT2, 0, 1.1, 0, d);
    box(.84, 2.06, .09, DARK2, 0, 1.03, -s * .03, d);
    box(.06, .06, .06, BLUE, .32, 1.05, -s * .07, d);
    lite(.18, .12, .03, GLOW, 0, 2.32, -s * .06, d); // numerinho iluminado
  }
  for (const x of [-3.6, -1.2, 1.2, 3.6]) { portaViz(x, 1); portaViz(x, -1); }

  // a porta do seu apartamento, atrás de você (cenário)
  const ap = grp(-L / 2 + .02, 0, 0);
  ap.rotation.y = Math.PI / 2;
  box(1.14, 2.3, .1, LIGHT2, 0, 1.15, 0, ap);
  box(.96, 2.16, .09, DARK2, 0, 1.08, .03, ap);
  box(.07, .07, .07, BLUE, -.36, 1.08, .07, ap);

  // o elevador que desce até a recepção
  const out = grp(L / 2 - .02, 0, 0);
  out.rotation.y = -Math.PI / 2;
  box(1.3, 2.4, .12, LIGHT2, 0, 1.2, 0, out);
  box(.55, 2.25, .1, DARK2, -.29, 1.12, .05, out);
  box(.55, 2.25, .1, DARK2, .29, 1.12, .05, out);
  lite(.8, .14, .06, BLUE, 0, 2.51, .06, out); // indicador do andar
  box(.12, .3, .08, LIGHT2, .82, 1.15, .05, out);
  lite(.05, .05, .04, BLUE, .82, 1.22, .1, out); // botão de chamada
  tagGo(out, 'elevator', 'recepcao');

  return { spawn: { x: -5, z: 0, yaw: -Math.PI / 2 }, caption: sceneCaption('corredor'), auto: null };
}
