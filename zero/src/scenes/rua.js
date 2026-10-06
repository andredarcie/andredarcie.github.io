import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day } from '../state.js';
import { sceneCaption } from '../story.js';
import { camera } from '../renderer.js';
import { thunder, whaleCall } from '../audio.js';
import { scene, freshScene, box, lite, grp, blob, pointLight, windowGrid, anim, tagDialog, tagGo, walkOf, blockOf, person } from '../kit.js';

// traçado do chão (compartilhado pela altura do jogador e pelos respingos da chuva)
const noAsfalto = (x, z) => Math.abs(x) <= 3.5 || (z > -12 && z < -4) || (z > 16 && z < 24);
const naEscada = (x, z) => x > 5.85 && z > 27.3;

/* ===================== CENA: A RUA (dois quarteirões até o metro) ===================== */
export function buildRua() {
  freshScene();
  const streetBg = new THREE.Color(0x263848);
  const streetFog = new THREE.Color(0x2b3d4c);
  const streetStormFog = new THREE.Color(0x233342);
  const streetFlash = new THREE.Color(0x354a5c);
  scene.background.copy(streetBg);
  scene.fog = new THREE.Fog(streetFog, 10, 68);

  // traçado: rua N-S com duas transversais; quarteirões A(-32..-12), B(-4..16), C(24..38)
  const matRua = new THREE.MeshLambertMaterial({ color: DARK2 });
  const matCal = new THREE.MeshLambertMaterial({ color: FLOOR });
  const matFx = new THREE.MeshLambertMaterial({ color: LIGHT });
  const cRua = new THREE.Color(DARK2), cCal = new THREE.Color(FLOOR);
  function slab(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  slab(7, .2, 105, matRua, 0, -.08, 9.5);      // pista principal, até o horizonte
  slab(60, .2, 8, matRua, 0, -.08, -8);        // transversal 1
  slab(60, .2, 8, matRua, 0, -.08, 20);        // transversal 2
  for (const [z0, z1] of [[-32, -12], [-4, 16], [24, 38]]) {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    slab(4.7, .18, len, matCal, -5.85, .03, zc);                 // calçada oeste
    if (z0 < 24) slab(4.7, .18, len, matCal, 5.85, .03, zc);     // leste
  }
  // calçada leste do quarteirão C, recortada em volta da escada do metro
  slab(2.35, .18, 14, matCal, 4.68, .03, 31);
  slab(2.35, .18, 3.3, matCal, 7.03, .03, 25.65);
  slab(2.35, .18, 2.6, matCal, 7.03, .03, 36.7);

  // pintura do asfalto: faixa central pontilhada e faixas de pedestre
  for (let z = -40; z < 56; z += 3) {
    if ((z > -13 && z < -3) || (z > 15 && z < 25)) continue;
    slab(.14, .02, 1.2, matFx, 0, .035, z);
  }
  for (const zc of [-8, 20]) {
    for (let x = -28; x <= 28; x += 3) {
      if (Math.abs(x) < 4.6) continue;
      slab(1.2, .02, .14, matFx, x, .035, zc);
    }
    for (let i = -3; i <= 3; i++)
      for (const xs of [-5.85, 5.85]) slab(2.6, .02, .5, matFx, xs, .035, zc + i * 1.05);
  }

  walkOf(-7.8, -31, 7.8, 27.1);   // rua e calçadas
  walkOf(-7.8, 27.1, 5.8, 36.2);  // calçada que segue ao lado da escada
  walkOf(5.9, 26.8, 8.1, 34.6);   // a escada e o patamar

  // andar por onde dá: calçada, asfalto, escada
  const elevFn = (x, z) => {
    if (naEscada(x, z)) {         // descendo pro metro
      if (z > 32.7) return -3;
      return -(z - 27.3) / 5.4 * 3;
    }
    return noAsfalto(x, z) ? .02 : .12;     // guia da calçada
  };

  // prédios colados na calçada, com vitrines e portas no térreo
  const wSlots = [], eSlots = [], sSlots = [];
  const hs = [22, 30, 18, 34, 26, 20];
  let hi = 0;
  // entrada no térreo: emoldurada e recuada, para ler como porta/vitrine e não buraco
  // (xf = face do prédio na rua; nf aponta da parede para a rua)
  function entrada(side, zc, porta) {
    const xf = side * 8.2, nf = -side;
    if (porta) {
      box(.1, 2.4, 1.55, DARK, xf + nf * .04, 1.2, zc);           // folha recuada
      box(.22, 2.5, .16, LIGHT2, xf + nf * .13, 1.25, zc - .78);  // batente esquerdo
      box(.22, 2.5, .16, LIGHT2, xf + nf * .13, 1.25, zc + .78);  // batente direito
      box(.22, .2, 2.0, LIGHT2, xf + nf * .13, 2.46, zc);         // padieira
      box(.4, .16, 1.9, LIGHT2, xf + nf * .15, .12, zc);          // soleira/degrau
      lite(.05, .08, 1.5, BLUE, xf + nf * .17, 2.33, zc);         // luz sobre a porta
    } else {
      lite(.05, 1.4, 2.5, NAVY, xf + nf * .07, 1.05, zc);         // vidro aceso, recuado
      box(.2, .16, 2.9, LIGHT2, xf + nf * .12, 1.86, zc);         // verga
      box(.2, .18, 2.9, LIGHT2, xf + nf * .12, .2, zc);           // base
      box(.2, 1.75, .16, LIGHT2, xf + nf * .12, 1.02, zc - 1.42); // montante esquerdo
      box(.2, 1.75, .16, LIGHT2, xf + nf * .12, 1.02, zc + 1.42); // montante direito
      box(.2, 1.75, .13, LIGHT2, xf + nf * .12, 1.02, zc);        // montante central
    }
  }
  function predio(side, z0, z1, h, semTerreo) {
    const d = z1 - z0, zc = (z0 + z1) / 2;
    box(6, h, d - .3, DARK2, side * 11.2, h / 2, zc);
    const fx = side * 8.14;
    for (let wy = 3.1; wy < h - 1.0; wy += 1.5)   // janelas só nos andares de cima
      for (let wz = z0 + .9; wz < z1 - .7; wz += 1.15)
        (side < 0 ? wSlots : eSlots).push({ x: fx, y: wy, z: wz });
    if (!semTerreo) entrada(side, zc, hi % 2 === 0);
    if (hi % 3 === 0) box(.06, 2.8 + (hi % 2), .06, DARK2, side * 10, h + 1.4, zc); // antena
    hi++;
  }
  for (const [z0, z1] of [[-32, -22], [-22, -12], [-4, 6], [6, 16], [24, 38]]) {
    predio(-1, z0, z1, hs[hi % 6]);
    predio(1, z0, z1, hs[(hi + 2) % 6], z0 === 24); // no quarteirão C a escada toma o térreo
  }

  // seu prédio fecha a rua no sul (a rua morre num T)
  box(28, 34, 6, DARK2, 0, 16.6, -36);
  box(6, 34, 1.4, DARK2, -11.2, 17, -32.3); // sela os cantos com os vizinhos
  box(6, 34, 1.4, DARK2, 11.2, 17, -32.3);
  for (let wy = 3; wy < 30; wy += 1.5)
    for (let wx = -12.5; wx < 12.6; wx += 1.1) sSlots.push({ x: wx, y: wy, z: -32.94 });
  const ap = grp(-5.75, .12, -32.9);
  box(1.5, 2.5, .18, LIGHT2, 0, 1.25, 0, ap);
  box(1.14, 2.3, .14, DARK2, 0, 1.15, .05, ap);
  box(.07, .07, .07, BLUE, -.4, 1.12, .12, ap);
  box(2.0, .3, .9, DARK2, 0, 2.72, .3, ap); // marquise

  // limite da cidade: horizonte escuro, tratado como massa de ar distante
  const matHor = new THREE.MeshBasicMaterial({ color: 0x223545, fog: true });
  function horizonte(w, x, z, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 50), matHor);
    m.position.set(x, 24, z);
    m.rotation.y = ry;
    scene.add(m);
  }
  horizonte(80, 0, 60, Math.PI);        // fim da rua ao norte
  horizonte(22, -30, -8, Math.PI / 2);  // fim das transversais
  horizonte(22, 30, -8, -Math.PI / 2);
  horizonte(22, -30, 20, Math.PI / 2);
  horizonte(22, 30, 20, -Math.PI / 2);

  windowGrid(wSlots.concat(eSlots), new THREE.BoxGeometry(.12, .75, .5));
  windowGrid(sSlots, new THREE.BoxGeometry(.5, .75, .12));

  // postes na guia (metade com luz de verdade)
  let pi = 0;
  for (const [lx, lz] of [[-3.9, -28], [3.9, -16], [-3.9, -2], [3.9, 10], [-3.9, 26], [3.9, 30]]) {
    box(.12, 3.9, .12, DARK2, lx, 1.95, lz);
    box(.7, .09, .09, DARK2, lx + (lx < 0 ? .32 : -.32), 3.82, lz);
    lite(.3, .12, .18, GLOW, lx + (lx < 0 ? .6 : -.6), 3.72, lz);
    if (pi % 2 === 0) pointLight(.55, 11, lx + (lx < 0 ? .6 : -.6), 3.5, lz);
    blockOf(lx - .2, lz - .2, lx + .2, lz + .2);
    pi++;
  }

  // semáforos das travessias
  function semaforo(x, z, ry) {
    const g = grp(x, 0, z);
    g.rotation.y = ry;
    box(.1, 3.1, .1, DARK2, 0, 1.55, 0, g);
    box(.3, .8, .22, DARK2, 0, 3.3, 0, g);
    lite(.14, .14, .04, GLOW, 0, 3.52, .12, g); // parado no "pare"
    box(.14, .14, .04, DARK, 0, 3.3, .12, g);
    box(.14, .14, .04, DARK, 0, 3.08, .12, g);
    blockOf(x - .18, z - .18, x + .18, z + .18);
  }
  semaforo(-4.1, -13, 0); semaforo(4.1, -3, Math.PI);
  semaforo(-4.1, 15, 0); semaforo(4.1, 25, Math.PI);

  // bloqueios de obra: a cidade além daqui está fechada
  function bloqueio(x, z, ry) {
    const g = grp(x, 0, z);
    g.rotation.y = ry;
    box(.08, 1.0, .5, DARK2, -1.05, .5, 0, g);  // pés
    box(.08, 1.0, .5, DARK2, 1.05, .5, 0, g);
    box(2.3, .34, .07, LIGHT, 0, .92, 0, g);    // tábua listrada
    box(.5, .34, .08, DARK2, -.7, .92, 0, g);
    box(.5, .34, .08, DARK2, .7, .92, 0, g);
    box(2.3, .16, .06, LIGHT2, 0, .38, 0, g);   // travessa baixa
  }
  for (const zc of [-8, 20]) for (const sx of [-1, 1]) {
    if (day === 5 && sx === 1 && zc === 20) continue; // dia 5: esquina aberta pra loja
    bloqueio(sx * 8.1, zc - 1.9, Math.PI / 2);  // bocas das transversais
    bloqueio(sx * 8.1, zc + 1.9, Math.PI / 2);
  }
  if (day === 5) {
    // dia 5: uma esquina que vira para uma loja do tamanho de uma casa
    slab(7, .18, 6, matCal, 12.5, .03, 20);         // calçada em frente à loja
    walkOf(3.5, 17.2, 12.2, 22.8);                   // pode virar a esquina e andar até a porta
    box(7, 5.2, 6.4, DARK2, 16, 2.6, 20);            // corpo da loja
    box(7.4, .4, 6.8, DARK2, 16, 5.3, 20);           // beiral do telhado
    lite(.05, 1.7, 2.0, NAVY, 12.52, 1.5, 18.2);     // vitrine acesa
    lite(.05, 1.7, 2.0, NAVY, 12.52, 1.5, 21.8);     // vitrine acesa
    const loja = grp(12.5, 0, 20);
    box(.16, 2.5, 1.8, LIGHT2, 0, 1.25, 0, loja);    // moldura da porta
    box(.1, 2.2, 1.3, DARK, .05, 1.1, 0, loja);      // folha
    lite(.04, 1.9, 1.1, GLOW, .1, 1.15, 0, loja);    // luz vazando de dentro
    tagGo(loja, 'storeDoor', 'loja');
    const ls = grp(12.4, 3.9, 20); ls.rotation.y = -Math.PI / 2; // letreiro da loja
    box(3.4, .9, .14, DARK2, 0, 0, 0, ls);
    lite(3.0, .62, .05, BLUE, 0, 0, -.08, ls);
    pointLight(.5, 13, 10, 3.4, 20);
  }
  for (const bx of [-6.6, -4.2, -1.8, .6, 3.0, 5.4])
    bloqueio(bx, 36.8, 0);                      // a rua morre depois do metro

  // ponto de ônibus com alguém esperando na chuva
  const abrigo = grp(-6.4, 0, 4);
  box(.08, 2.3, .08, DARK2, .5, 1.15, -1.4, abrigo);
  box(.08, 2.3, .08, DARK2, .5, 1.15, 1.4, abrigo);
  box(1.7, .1, 3.4, NAVY, 0, 2.35, 0, abrigo);
  box(.5, .08, 2.6, LIGHT2, -.3, .62, 0, abrigo);
  box(.08, .62, .08, DARK2, -.3, .31, -1.1, abrigo);
  box(.08, .62, .08, DARK2, -.3, .31, 1.1, abrigo);
  const esp = person(true, BLUE, abrigo);
  esp.position.set(-.25, .2, 0);
  esp.rotation.y = Math.PI / 2;
  blockOf(-7.3, 2.3, -5.6, 5.7);

  // mobiliário: hidrante e lixeira
  box(.24, .55, .24, BLUE, -4.0, .4, -24);
  box(.3, .1, .3, BLUE, -4.0, .72, -24);
  blockOf(-4.2, -24.2, -3.8, -23.8);
  box(.55, .8, .55, DARK2, 4.1, .52, -18);
  blockOf(3.8, -18.3, 4.4, -17.7);

  // ===== a boca do metro: entrada iluminada, marcante, convidando na chuva =====
  // trincheira: escada descendo a calçada
  for (let i = 0; i < 12; i++)
    box(2.2, .25, .45, LIGHT2, 7, -(i + 1) * .25 + .125, 27.525 + i * .45);
  box(2.2, .2, 2.6, FLOOR, 7, -3.1, 34.1);   // patamar lá embaixo
  box(.16, 4, 8.6, DARK2, 5.82, -1.3, 31.5); // paredes laterais da trincheira
  box(.16, 4, 8.6, DARK2, 8.18, -1.3, 31.5);
  box(2.5, 3.6, .14, DARK2, 7, -1.4, 35.55); // parede do fundo
  // acabamento no topo das paredes, com fita de luz azul guiando escada abaixo
  for (const wx of [5.82, 8.18]) {
    box(.28, .18, 8.6, LIGHT2, wx, .77, 31.5);
    lite(.1, .05, 8.5, BLUE, wx, .88, 31.5);
  }

  // marquise/cobertura sobre a entrada, com testeira e letreiro grande
  for (const cx of [5.66, 8.34]) {                 // pilares da marquise
    box(.18, 3.5, .18, DARK2, cx, 1.75, 25.7);
    lite(.06, 2.4, .07, BLUE, cx, 1.95, 25.6);     // veio de luz nos pilares
    blockOf(cx - .16, 25.5, cx + .16, 25.9);
  }
  box(3.4, .2, 3.7, LIGHT2, 7, 3.5, 26.85);        // telhado da marquise
  lite(3.4, .07, .1, GLOW, 7, 3.43, 25.0);         // brilho na borda da frente
  box(3.4, .62, .12, DARK2, 7, 3.16, 25.02);       // testeira onde vai o letreiro

  // letreiro "M" iluminado, virado para quem sobe a rua vindo do sul
  const sign = grp(7, 3.22, 24.93);
  box(1.6, .96, .12, DARK2, 0, 0, .07, sign);      // caixa do letreiro
  lite(1.26, .82, .04, BLUE, 0, 0, -.02, sign);    // campo azul brilhante
  lite(.15, .62, .03, GLOW, -.35, 0, -.05, sign);  // perna esquerda do M
  lite(.15, .62, .03, GLOW, .35, 0, -.05, sign);   // perna direita
  const ml = lite(.13, .5, .03, GLOW, -.18, .13, -.05, sign); ml.rotation.z = .74;
  const mr = lite(.13, .5, .03, GLOW, .18, .13, -.05, sign); mr.rotation.z = -.74;

  // totem luminoso: marco vertical visível de longe na rua
  const tot = grp(5.28, 0, 25.9);
  box(.24, 4.7, .24, DARK2, 0, 2.35, 0, tot);
  lite(.14, 3.1, .15, BLUE, 0, 3.0, 0, tot);       // haste de luz azul
  box(.52, .52, .52, DARK2, 0, 4.55, 0, tot);
  lite(.36, .36, .38, BLUE, 0, 4.55, 0, tot);      // cubo luminoso no topo
  blockOf(5.12, 25.74, 5.44, 26.06);

  // luz derramando da entrada: brilho na chuva e na escada molhada
  pointLight(.75, 9, 7, .8, 28);
  pointLight(.6, 8, 7, -2.4, 34, 0x9fccef); // a estação lá embaixo
  pointLight(.5, 6, 7, 3.0, 24.2, 0xbfe0ff);

  // a porta lá embaixo, agora clara e acesa
  const em = grp(7, -3, 35.42);
  em.rotation.y = Math.PI;
  box(2.3, 2.6, .18, LIGHT2, 0, 1.3, 0, em);
  box(.92, 2.34, .1, DARK, -.52, 1.16, .07, em);
  box(.92, 2.34, .1, DARK, .52, 1.16, .07, em);
  lite(.05, 2.0, .04, GLOW, 0, 1.2, .1, em);       // fresta de luz entre as portas
  lite(1.5, .34, .08, BLUE, 0, 2.72, -.02, em);    // letreiro sobre a porta
  if (day < 5) {
    tagGo(em, 'metroEntrance', 'plataforma');
  } else {
    // dia 5: metro fechado — grade no alto da escada
    const grade = grp(7, 0, 27.25);
    for (let gx = -1.0; gx <= 1.01; gx += .29) box(.06, 2.25, .06, DARK2, gx, 1.15, 0, grade);
    box(2.35, .1, .1, DARK2, 0, 2.24, 0, grade);
    box(2.35, .1, .1, DARK2, 0, 1.2, 0, grade);
    box(2.35, .1, .1, DARK2, 0, .12, 0, grade);
    tagDialog(grade, 'metroEntrance', 'metroClosed');
    blockOf(5.9, 26.9, 8.1, 27.6);                 // trava a descida
  }

  baleia();
  if (day < 5) chuva({ matRua, matCal, cRua, cCal, streetBg, streetFog, streetStormFog, streetFlash }); // no dia 5 o tempo abriu

  return {
    spawn: { x: -5.75, z: -30.6, yaw: Math.PI }, caption: sceneCaption('rua'), auto: null,
    elevFn,
  };
}

/* ===================== a baleia: gigante, flutuando como se estivesse no mar ===================== */
function baleia() {
  const w = grp(0, 30, 0);
  const corpo = grp(0, 0, 0, w);
  blob(5.8, 2.1, 2.4, BLUE, 0, 0, 0, corpo);            // corpo fusiforme
  blob(4.6, 1.5, 2.1, LIGHT, .9, -.85, 0, corpo);       // barriga clara
  blob(2.6, 1.25, 1.7, LIGHT, 3.6, -.75, 0, corpo);     // mandíbula
  blob(.3, .12, .2, DARK2, 2.2, 2.0, 0, corpo);         // respiradouro
  blob(.16, .16, .16, DARK2, 4.55, .25, 1.78, corpo);   // olhos
  blob(.16, .16, .16, DARK2, 4.55, .25, -1.78, corpo);
  const dorsal = blob(.85, .5, .14, BLUE, -2.6, 2.0, 0, corpo);
  dorsal.rotation.z = .5;
  for (const s of [-1, 1]) {                            // nadadeiras peitorais
    const nad = blob(1.6, .16, .6, BLUE, 1.4, -1.5, s * 2.3, corpo);
    nad.rotation.x = s * .55;
    nad.rotation.y = s * -.35;
  }
  const cauda = grp(-4.6, .2, 0, w);
  blob(2.2, .8, .9, BLUE, -1.1, .15, 0, cauda);         // pedúnculo
  for (const s of [-1, 1]) {                            // nadadeira da cauda
    const f = blob(1.05, .14, 1.9, BLUE, -2.9, .35, s * 1.35, cauda);
    f.rotation.y = s * .45;
  }
  w.scale.setScalar(2.1);
  w.visible = false;
  // cruza a cidade lateralmente, acima dos telhados
  let t0 = null, sang = 0;
  anim(t => {
    if (t0 === null) t0 = t;
    const e = t - t0 - 3, dur = 26;
    if (e < 0 || e > dur) { w.visible = false; return; }
    w.visible = true;
    if (sang === 0 && e > 1.5) { sang = 1; whaleCall(0); }
    else if (sang === 1 && e > 14) { sang = 2; whaleCall(1); }
    const k = e / dur;
    w.position.set(
      -70 + 140 * k,
      37 + Math.sin(t * .75) * 1.4 + k * 4, // acima dos telhados, vista do fundo do canyon
      8 - Math.sin(k * Math.PI) * 3
    );
    w.rotation.x = Math.sin(t * .5) * .07;
    cauda.rotation.z = Math.sin(t * 1.7) * .3;
    corpo.rotation.z = Math.sin(t * 1.7 + 1.1) * .04;
  });
}

/* ===================== chuva: gotas, respingos, chão molhado e relâmpagos ===================== */
function chuva({ matRua, matCal, cRua, cCal, streetBg, streetFog, streetStormFog, streetFlash }) {
  const NRAIN = 1600, RS = 26, RH = 20;
  const dropGeo = new THREE.BoxGeometry(.02, 1, .02);
  dropGeo.rotateZ(.09); dropGeo.rotateX(.07); // inclinação do vento nos dois eixos
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const rain = new THREE.InstancedMesh(dropGeo, rainMat, NRAIN);
  rain.frustumCulled = false; // instâncias longe da origem: sem isso o Three corta tudo ao virar a câmera
  const drops = [], cTmp = new THREE.Color();
  for (let i = 0; i < NRAIN; i++) {
    drops.push({
      x: Math.random() * RS, z: Math.random() * RS,
      y: Math.random() * RH,
      v: 18 + Math.random() * 12,           // gotas em velocidades diferentes
      len: .7 + Math.random() * .6,         // estrias mais longas = mais perto
    });
    rain.setColorAt(i, cTmp.setHex(LIGHT).multiplyScalar(.35 + Math.random() * .65));
  }
  scene.add(rain);

  // respingos abrindo no chão molhado
  const NSPL = 90, SLIFE = .5;
  const splGeo = new THREE.RingGeometry(.55, 1, 10);
  splGeo.rotateX(-Math.PI / 2);
  const splMat = new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: .22, depthWrite: false });
  const spl = new THREE.InstancedMesh(splGeo, splMat, NSPL);
  spl.frustumCulled = false;
  scene.add(spl);
  const sdat = [];
  for (let i = 0; i < NSPL; i++) sdat.push({ x: 0, z: 0, t0: -9 });

  // relâmpago distante: a luz vem antes do trovão
  const flashL = new THREE.AmbientLight(0xbfd6e6, 0);
  scene.add(flashL);
  const bgDry = streetBg.clone(), bgFlash = streetFlash.clone();
  const fogDry = streetFog.clone(), fogWet = streetStormFog.clone(), fogFlash = new THREE.Color(0x42566a);

  const rm4 = new THREE.Matrix4(), rP = new THREE.Vector3(), rSc = new THREE.Vector3();
  const rQ = new THREE.Quaternion();
  let rt0 = null, flashT = null, boomAt = 0, nextStorm = 0;
  anim(t => {
    if (rt0 === null) rt0 = t;
    const e = t - rt0 - 3;                        // espera um pouco antes de cair
    const wet = Math.max(0, Math.min(1, e / 12)); // a tempestade se arma devagar
    rainMat.opacity = .32 * wet;
    // o chão escurece de molhado e o ar fecha
    matRua.color.copy(cRua).multiplyScalar(1 - .35 * wet);
    matCal.color.copy(cCal).multiplyScalar(1 - .35 * wet);
    scene.fog.far = 68 - 18 * wet;
    scene.fog.near = 10 - 3 * wet;
    scene.fog.color.lerpColors(fogDry, fogWet, wet);
    if (e < 0) return;
    const px = camera.position.x, pz = camera.position.z; // a chuva cai em volta de quem olha
    for (let i = 0; i < NRAIN; i++) {
      const d = drops[i];
      rP.set(
        px + (((d.x - px) % RS) + RS) % RS - RS / 2,
        RH - ((d.y + d.v * e) % RH),
        pz + (((d.z - pz) % RS) + RS) % RS - RS / 2
      );
      rSc.set(1, d.len, 1);
      rm4.compose(rP, rQ, rSc);
      rain.setMatrixAt(i, rm4);
    }
    rain.instanceMatrix.needsUpdate = true;
    // respingos nascem, abrem e somem perto do jogador
    const alive = Math.floor(NSPL * wet);
    for (let i = 0; i < NSPL; i++) {
      const sd = sdat[i], a = (t - sd.t0) / SLIFE;
      if (a > 1 && i < alive) {
        sd.t0 = t + Math.random() * .35;
        sd.x = (Math.random() - .5) * 15.8; // só na rua: dentro dos prédios não molha
        sd.z = pz + (Math.random() - .5) * 22;
      }
      const k = a >= 0 && a <= 1 ? a : 0;
      rP.set(sd.x, naEscada(sd.x, sd.z) ? -9 : noAsfalto(sd.x, sd.z) ? .035 : .135, sd.z);
      rSc.setScalar(k * .34);
      rm4.compose(rP, rQ, rSc);
      spl.setMatrixAt(i, rm4);
    }
    spl.instanceMatrix.needsUpdate = true;
    // tempestade formada: relâmpago de vez em quando, trovão depois da luz
    if (wet > .8) {
      if (!nextStorm) nextStorm = t + 6 + Math.random() * 18;
      else if (t > nextStorm) {
        flashT = t;
        boomAt = t + 1.2 + Math.random() * 1.6;
        nextStorm = t + 28 + Math.random() * 35;
      }
    }
    if (flashT !== null) {
      const a = t - flashT;
      const k = Math.max(0, Math.sin(a * 26)) * Math.exp(-a * 5.5); // tremeluz e morre
      flashL.intensity = k * .7;
      scene.background.lerpColors(bgDry, bgFlash, Math.min(1, k));
      scene.fog.color.lerpColors(fogWet, fogFlash, Math.min(1, k));
      if (a > 2.5) { flashT = null; flashL.intensity = 0; }
    }
    if (boomAt && t > boomAt) { boomAt = 0; thunder(); }
  });
}
