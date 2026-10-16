import { DARK2, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { freshScene, box, lite, grp, pointLight, tagGo, walkOf } from '../kit.js';
import { elevador, CABINE } from '../elevator.js';
import { vestibulo } from '../vestibulo.js';

/* ===================== CENA: O CORREDOR DO PRÉDIO ===================== */
export function buildCorredor(nav = {}) {
  freshScene(7, 26);
  const L = 12, Wz = 2.4, H = 2.6;

  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0);
  for (const s of [-1, 1]) {
    box(L + .4, H, .16, LIGHT, 0, H / 2, s * (Wz / 2 + .08));
    box(L, .12, .06, DARK2, 0, .06, s * (Wz / 2 - .03));
    box(L, .1, .06, DARK2, 0, H - .05, s * (Wz / 2 - .03));
  }
  // parede do apartamento (oeste) com o vão do hall de entrada; a do elevador (leste) ele monta
  for (const k of [-1, 1]) box(.16, H, .85, LIGHT, -L / 2 - .08, H / 2, k * .975);
  box(.16, H - 2.2, 1.1, LIGHT, -L / 2 - .08, (H + 2.2) / 2, 0);
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

  // a porta do seu apartamento, no fim do corredor: dá no hall de entrada, o mesmo cômodo que fica
  // atrás da porta sul do quarto (a troca de cena acontece no hall, sem tela escura)
  lite(.03, .12, .18, GLOW, -L / 2 + .1, 2.42, 0);                  // o seu número, igual ao dos vizinhos
  const hall = vestibulo({
    x: -L / 2 - 1, y: 0, z: 0, yaw: Math.PI / 2, lado: 'Q', outro: ['quarto', 'corredor'], estilo: 'hall',
    arrive: nav.entry === 'quarto' ? (nav.rel || true) : null,
  });

  // o elevador, na outra ponta: desce do 23º até a recepção
  const elev = elevador({
    x: L / 2, z: 0, yaw: -Math.PI / 2, wall: { w: Wz + .4, H },
    here: 23, there: 'T', to: ['recepcao', 'elevador'],
    arrive: nav.entry === 'elevador' ? (nav.rel || CABINE) : null,
  });

  const spawn = elev.spawn || hall.spawn || { x: -5, z: 0, yaw: -Math.PI / 2 }; // saindo do apartamento
  return { spawn, caption: sceneCaption('corredor'), auto: null };
}
