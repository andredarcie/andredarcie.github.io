import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { day, night } from '../state.js';
import { sceneCaption } from '../story.js';
import { camera } from '../renderer.js';
import { thunder, whaleCall } from '../audio.js';
import { scene, freshScene, box, lite, grp, blob, pointLight, windowGrid, anim, tagDialog, tagGo, walkOf, blockOf, person, instanciar, at, casca } from '../kit.js';
import { frota, pedestre, letreiro, quarteiraoLonge, PINTURAS, mix } from '../cidade.js';
import { vestibulo, VEST } from '../vestibulo.js';
import { noMundo } from '../mapa.js';

// os cantos de uma caixa dada nas coordenadas de outro lugar, levados para a rua (que é o mundo):
// { x0, x1, z0, z1, y } com a caixa do mundo que contém os quatro cantos
function caixaDe(nome, x0, x1, z0, z1) {
  const ps = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => noMundo(nome, { x, z }));
  return {
    x0: Math.min(...ps.map(p => p.x)), x1: Math.max(...ps.map(p => p.x)),
    z0: Math.min(...ps.map(p => p.z)), z1: Math.max(...ps.map(p => p.z)), y: ps[0].y,
  };
}

// traçado do chão (compartilhado pela altura do jogador e pelos respingos da chuva)
const noAsfalto = (x, z) => Math.abs(x) <= 3.5 || (z > -12 && z < -4) || (z > 16 && z < 24);
const naEscada = (x, z) => x > 5.85 && x < 8.15 && z > 27.3 && z < 37.5;   // a escada, o patamar e o vestíbulo lá embaixo

/* ===================== CENA: A RUA (dois quarteirões até o metro) ===================== */
export function buildRua(nav = {}) {
  freshScene();
  // de noite (voltando do trabalho) o mesmo céu, bem mais fundo
  const nk = night ? .55 : 1;
  const streetBg = new THREE.Color(0x263848).multiplyScalar(nk);
  const streetFog = new THREE.Color(0x2b3d4c).multiplyScalar(nk);
  const streetStormFog = new THREE.Color(0x233342).multiplyScalar(nk);
  const streetFlash = new THREE.Color(0x354a5c).multiplyScalar(nk);
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
      return .125 - (z - 27.3) / .45 * .25; // passa pelo meio de cada degrau, não meio degrau abaixo
    }
    if (day === 5 && x > 9 && z > 17 && z < 23) return .12; // calçada em frente à loja
    return noAsfalto(x, z) ? .02 : .12;     // guia da calçada
  };

  // prédios colados na calçada, com vitrines e portas no térreo
  const wSlots = [], eSlots = [], sSlots = [], farSlots = [];
  const hs = [22, 30, 18, 34, 26, 20];
  let hi = 0;
  const LOJAS = ['PADARIA', 'FARMÁCIA', 'LANCHES', 'LAVANDERIA', 'ÓTICA', 'CHAVEIRO', 'BAR', 'SAPATARIA'];
  let li = 0, num = 112;
  const arCond = [];                               // aparelhos de ar-condicionado sob algumas janelas
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
      const n = letreiro(String(num += 36), .34, .16, GLOW, DARK); // número do prédio
      n.position.set(xf + nf * .03, 2.64, zc + 1.0);
      n.rotation.y = nf * Math.PI / 2;
    } else {
      // vitrine de loja: de dia acesa; de noite, porta de aço baixada
      if (!night) lite(.05, 1.4, 2.5, NAVY, xf + nf * .07, 1.05, zc); // vidro aceso, recuado
      else {
        box(.06, 1.5, 2.6, mix(DARK2, LIGHT2, .3), xf + nf * .07, 1.05, zc);
        for (let gy = .4; gy < 1.75; gy += .16) box(.02, .02, 2.6, DARK2, xf + nf * .1, gy, zc); // gomos da porta de aço
      }
      box(.2, .16, 2.9, LIGHT2, xf + nf * .12, 1.86, zc);         // verga
      box(.2, .18, 2.9, LIGHT2, xf + nf * .12, .2, zc);           // base
      box(.2, 1.75, .16, LIGHT2, xf + nf * .12, 1.02, zc - 1.42); // montante esquerdo
      box(.2, 1.75, .16, LIGHT2, xf + nf * .12, 1.02, zc + 1.42); // montante direito
      if (!night) box(.2, 1.75, .13, LIGHT2, xf + nf * .12, 1.02, zc); // montante central
      // toldo listrado, caído para a rua, e o nome da loja por cima
      const tg = grp(xf + nf * .45, 2.07, zc);
      tg.rotation.z = -.28 * nf;
      for (let k = 0; k < 6; k++) box(.9, .04, .5, k % 2 ? LIGHT : mix(NAVY, LIGHT, .25), 0, 0, -1.25 + k * .5, tg);
      box(.03, .2, 3.0, mix(NAVY, LIGHT, .25), .45, -.1, 0, tg);           // babado na ponta
      box(.06, .44, 2.3, DARK2, xf + nf * .03, 2.45, zc);
      const nome = letreiro(LOJAS[li++ % LOJAS.length], 2.1, .36, night ? GLOW : mix(GLOW, LIGHT, .3), DARK2);
      nome.position.set(xf + nf * .065, 2.45, zc);
      nome.rotation.y = nf * Math.PI / 2;
    }
  }
  function predio(side, z0, z1, h, semTerreo) {
    const d = z1 - z0, zc = (z0 + z1) / 2;
    box(6, h, d - .3, DARK2, side * 11.2, h / 2, zc);
    box(6.2, .35, d - .2, DARK, side * 11.2, h + .17, zc);       // platibanda no topo
    const fx = side * 8.14;
    let ai = hi * 7;
    for (let wy = 3.1; wy < h - 1.0; wy += 1.5)   // janelas só nos andares de cima
      for (let wz = z0 + .9; wz < z1 - .7; wz += 1.15) {
        (side < 0 ? wSlots : eSlots).push({ x: fx, y: wy, z: wz });
        if (wy < 16 && (ai++ * 37) % 100 < 11) arCond.push(at(side * 8.02, wy - .58, wz, side < 0 ? Math.PI / 2 : -Math.PI / 2));
      }
    if (!semTerreo) entrada(side, zc, hi % 2 === 0);
    if (hi % 3 === 0) box(.06, 2.8 + (hi % 2), .06, DARK2, side * 10, h + 1.4, zc); // antena
    if (hi % 2 === 1) {                                            // caixa d'água sobre pilaretes
      const cx = side * 12.2;
      for (const [px, pz] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) box(.12, 1.0, .12, DARK, cx + px, h + .85, zc + pz);
      box(2.0, 1.3, 2.0, LIGHT2, cx, h + 2.0, zc);
      box(2.1, .1, 2.1, DARK2, cx, h + 2.7, zc);
    }
    hi++;
  }
  for (const [z0, z1] of [[-32, -22], [-22, -12], [-4, 6], [6, 16], [24, 38]]) {
    predio(-1, z0, z1, hs[hi % 6]);
    predio(1, z0, z1, hs[(hi + 2) % 6], z0 === 24); // no quarteirão C a escada toma o térreo
  }

  // seu prédio fecha a rua no sul (a rua morre num T); fundo de 20 m: cabem a recepção de 12 m,
  // o poço do elevador atrás dela e, lá em cima, o corredor do 23º que corre para os fundos.
  // A torre é oca (casca: vista só de fora), então a recepção, o corredor e o quarto, que estão de
  // verdade lá dentro (mapa.js), aparecem quando você está neles. O quarto avança em balanço sobre a
  // rua: a janela dele dá para cá.
  const TH = 76;                                                   // altura da torre (o 23º andar fica a ~69 m)
  const qc = caixaDe('quarto', -7.25, 4.75, -2.62, 2.62);          // o quarto (com o banheiro), na rua
  const BAL = { x0: Math.max(-14.4, qc.x0 - .3), x1: qc.x1 + .3, y0: qc.y - .9, y1: qc.y + 3.9, z1: qc.z1 + .3 };
  // o vão da porta de vidro: a parede de ponta do vestíbulo (com a porta) fica no lugar da fachada
  const PORTA = [-5.75 - VEST.VW - .16, -5.75 + VEST.VW + .16, 0, .12 + VEST.VH + .1];
  casca({ x0: -14, x1: 14, y0: 0, y1: TH, z0: -53, z1: -33 }, DARK2, {
    furos: { z1: [PORTA, [BAL.x0, BAL.x1, BAL.y0, BAL.y1]] },
  });
  // o balanço: cinco faces (a de trás é a própria torre, aberta ali)
  casca({ x0: BAL.x0, x1: BAL.x1, y0: BAL.y0, y1: BAL.y1, z0: -33, z1: BAL.z1 }, DARK2, { faces: ['x0', 'x1', 'z1', 'y0', 'y1'] });
  box(28.4, .5, 20.4, DARK, 0, TH + .25, -43);                     // platibanda no topo
  box(6, 34, 1.4, DARK2, -11.2, 17, -32.3); // sela os cantos com os vizinhos
  box(6, 34, 1.4, DARK2, 11.2, 17, -32.3);
  for (let wy = 3; wy < TH - 3; wy += 1.5)
    for (let wx = -12.5; wx < 12.6; wx += 1.1) {
      if (wx > BAL.x0 - .4 && wx < BAL.x1 + .4 && wy > BAL.y0 - .6 && wy < BAL.y1 + .6) continue;
      sSlots.push({ x: wx, y: wy, z: -32.94 });
    }
  // a janela do quarto, de fora (de dentro ela some: é um plano virado para a rua)
  const jq = noMundo('quarto', { x: .9, y: 1.75, z: -2.39 });
  const janQ = new THREE.Mesh(new THREE.PlaneGeometry(1.14, .86), new THREE.MeshBasicMaterial({ color: mix(NAVY, GLOW, night ? .55 : .3) }));
  janQ.position.set(jq.x, jq.y, BAL.z1 + .02);
  scene.add(janQ);
  for (let wx = BAL.x0 + .9; wx < BAL.x1 - .6; wx += 1.1)
    if (Math.abs(wx - jq.x) > 1.2) sSlots.push({ x: wx, y: BAL.y0 + 2.6, z: BAL.z1 + .06 });
  // a porta do prédio é um vestíbulo de vidro: o mesmo cômodo está atrás da porta da recepção,
  // e a cena troca lá dentro, com a porta de trás fechada (sem tela escura)
  box(2.0, .3, .9, DARK2, -5.75, 3.0, -32.6);                      // marquise
  const vestPredio = vestibulo({
    x: -5.75, y: .12, z: -34, yaw: 0, lado: 'Q', outro: ['recepcao', 'rua'], estilo: 'vidro', alcance: 2.3,
    arrive: nav.entry === 'predio' ? (nav.rel || true) : null,
  });

  // limite da cidade: horizonte escuro, tratado como massa de ar distante
  const matHor = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x223545).multiplyScalar(nk), fog: true });
  function horizonte(w, x, z, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 50), matHor);
    m.position.set(x, 24, z);
    m.rotation.y = ry;
    scene.add(m);
  }
  // (a rua segue para o norte até a avenida, bairro.js; a leste das transversais fica o aeroporto)
  horizonte(22, -30, -8, Math.PI / 2);  // fim das transversais a oeste
  horizonte(22, -30, 20, Math.PI / 2);

  // a cidade continua pelas transversais: quarteirões ao longe, atrás dos bloqueios
  quarteiraoLonge(-8, 14.2, 29.8, farSlots, [28, 40, 22, 34, 46]);
  quarteiraoLonge(20, 14.2, 29.8, farSlots, [36, 24, 42, 30, 26]);

  windowGrid(wSlots.concat(eSlots), new THREE.BoxGeometry(.12, .75, .5));
  windowGrid(sSlots.concat(farSlots), new THREE.BoxGeometry(.5, .75, .12));
  // aparelhos de ar-condicionado (um molde, instanciado)
  const acMolde = new THREE.Group();
  box(.55, .3, .36, LIGHT2, 0, 0, 0, acMolde);
  box(.45, .2, .02, DARK2, 0, 0, .185, acMolde);
  instanciar(acMolde, arCond);

  // ===== o trânsito =====
  // carros estacionados nas duas guias (mão inglesa não: aqui se anda pela direita), um ônibus no ponto
  const parados = [];
  for (const z of [-27, -21.5, -16.5, 13.5, 28, 33.4]) parados.push({ x: -2.5, z, ry: 0 });
  for (const z of [-29, -20, -14.6, 1.5, 7, 12.5, 27, 32.2]) parados.push({ x: 2.5, z, ry: Math.PI });
  if (night) parados.splice(2, 1);                                   // de noite sobra vaga
  parados.forEach((c, i) => { c.cor = PINTURAS[(i * 5) % PINTURAS.length]; blockOf(c.x - .85, c.z - 2.1, c.x + .85, c.z + 2.1); });
  // engarrafamento nas transversais, além dos bloqueios: "o trânsito hoje está parado"
  const fila = [];
  for (const zc of [-8, 20]) for (const sx of [-1, 1]) {
    if (day === 5 && sx === 1 && zc === 20) continue;                // a esquina da loja
    for (const lane of [-1, 1]) for (let k = 0; k < 4; k++) {
      const dirX = lane * sx > 0 ? sx : -sx;                         // pela direita: cada faixa num sentido
      fila.push({ x: sx * (10.4 + k * 5.6), z: zc + lane * 1.7, ry: dirX > 0 ? Math.PI / 2 : -Math.PI / 2, dirX,
        cor: PINTURAS[(k * 3 + (lane > 0 ? 1 : 4) + (zc > 0 ? 2 : 0)) % PINTURAS.length] });
    }
  }
  frota(parados);
  const fl = frota(fila);
  // a fila que se afasta anda meio metro de vez em quando; a que vem para cá está presa no bloqueio
  let filaT0 = null;
  anim(t => {
    if (filaT0 === null) filaT0 = t;
    const u = t - filaT0, passo = Math.min(4, Math.floor(u / 13)), e = Math.min(1, (u % 13) / 1.6);
    const avanco = (passo + (passo < 4 ? e * e * (3 - 2 * e) : 0)) * .55;
    fila.forEach((c, i) => fl.set(i, c.x + (c.dirX * c.x > 0 ? c.dirX * avanco : 0), c.z, c.ry));
  });
  if (!night) {
    const bus = grp(-2.35, 0, 4.2);
    box(2.4, 2.4, 10.4, LIGHT2, 0, 1.55, 0, bus);
    box(2.44, .8, 9.6, NAVY, 0, 2.05, -.1, bus);                     // janelas
    box(2.44, .3, 10.44, mix(NAVY, LIGHT, .25), 0, .55, 0, bus);     // faixa da empresa
    box(2.3, .1, 10.2, DARK2, 0, 2.8, 0, bus);
    lite(1.6, .3, .04, GLOW, 0, 2.5, 5.22, bus);                     // letreiro de destino
    for (const sz of [-3.6, 3.4]) for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .3, 8), new THREE.MeshLambertMaterial({ color: DARK, flatShading: true }));
      r.rotation.z = Math.PI / 2; r.position.set(sx * 1.1, .48, sz); bus.add(r);
    }
    blockOf(-3.6, -1.05, -1.1, 9.45);
  }

  // pedestres indo e vindo nas calçadas (de guarda-chuva quando chove); de noite quase ninguém
  const chove = day < 5;
  const rotas = [
    { x: -6.4, z0: -28, z1: -13.5 }, { x: 6.2, z0: -31, z1: -13.2, vel: .9, fase: .4 },
    { x: -4.7, z0: -3, z1: 14, fase: .7 }, { x: 6.2, z0: -3, z1: 15, vel: 1.25, fase: .2 },
    { x: -6.2, z0: 25, z1: 36, fase: .5 },
  ];
  for (const r of night ? [rotas[1], rotas[3]] : rotas) pedestre({ ...r, chuva: chove });

  // ===== mobiliário urbano =====
  // banca de jornal (fechada de noite)
  const banca = grp(-4.75, .12, -19);
  box(1.4, 2.1, 2.2, LIGHT2, 0, 1.05, 0, banca);
  box(1.7, .12, 2.5, DARK2, 0, 2.18, 0, banca);
  if (!night) for (let k = 0; k < 6; k++)
    lite(.03, .32, .28, [GLOW, NAVY, LIGHT, mix(NAVY, LIGHT, .4)][k % 4], -.71, .75 + (k % 2) * .42, -.7 + Math.floor(k / 2) * .7, banca);
  else box(.04, 1.6, 2.0, mix(DARK2, LIGHT2, .3), -.71, 1.0, 0, banca);
  blockOf(-5.5, -20.15, -4.0, -17.85);
  // orelhão
  const ore = grp(4.6, .12, 10.8);
  box(.1, 1.3, .1, DARK2, 0, .65, 0, ore);
  box(.62, .72, .5, LIGHT2, 0, 1.7, -.05, ore);
  box(.2, .3, .08, DARK, 0, 1.55, .2, ore);
  blockOf(4.3, 10.5, 4.9, 11.1);
  // árvores em canteiros na calçada leste (vivas: azuis)
  for (const tz of [3.2, 6.3]) {
    box(.9, .14, .9, DARK2, 4.5, .19, tz);
    box(.16, 2.6, .16, DARK2, 4.5, 1.4, tz);
    blob(.85, .7, .85, BLUE, 4.5, 3.1, tz);
    blob(.6, .5, .6, BLUE, 4.25, 3.55, tz + .2);
    blockOf(4.1, tz - .4, 4.9, tz + .4);
  }
  // sacos de lixo ao lado da lixeira, tampas de bueiro, poças (só com chuva)
  blob(.3, .26, .3, DARK, 4.62, .36, -17.5);
  blob(.26, .22, .26, DARK, 4.5, .34, -18.5);
  for (const [mx, mz] of [[.9, -20], [-1.2, 6], [1.4, 30], [-.6, -9]]) {
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .02, 10), new THREE.MeshLambertMaterial({ color: mix(DARK2, DARK, .5) }));
    tampa.position.set(mx, .03, mz); scene.add(tampa);
  }
  if (chove) for (const [px, pz, sx, sz] of [[-3.0, -25, 1.0, .5], [3.1, -10, .8, 1.3], [-2.9, 10.5, .6, 1.1], [.4, 24, 1.3, .7], [3.0, 35, .9, .6]])
    blob(sx, .006, sz, mix(DARK2, NAVY, .35), px, .031, pz);
  // fios atravessando a rua de prédio a prédio, com barriga
  for (const [fz, fy] of [[-24, 8.6], [-1, 9.2], [11, 8.4], [31, 9.0]]) {
    const pts = [[-8.2, fy], [-4, fy - .45], [0, fy - .6], [4, fy - .45], [8.2, fy]];
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const f = box(Math.hypot(bx - ax, by - ay), .025, .025, DARK, (ax + bx) / 2, (ay + by) / 2, fz);
      f.rotation.z = Math.atan2(by - ay, bx - ax);
    }
  }
  // placas com o nome das ruas, nas esquinas
  // (presas no poste do semáforo, abaixo das lâmpadas, de frente para quem sobe a rua)
  for (const [tz, txt] of [[-13, 'R. DA ROTINA'], [15, 'R. DA ROTINA']]) {
    const pl = letreiro(txt, 1.0, .22, GLOW, mix(NAVY, BLUE, .35));
    pl.position.set(-4.1 + .55, 2.6, tz - .06);
    pl.rotation.y = Math.PI;
  }

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
  // o semáforo funciona: "pare" (de cima) e "siga" (de baixo) se revezam; sem vermelho/verde na
  // paleta, quem diz o estado é a posição da lâmpada acesa
  const sinais = [];
  function semaforo(x, z, ry) {
    const g = grp(x, 0, z);
    g.rotation.y = ry;
    box(.1, 3.1, .1, DARK2, 0, 1.55, 0, g);
    box(.3, .8, .22, DARK2, 0, 3.3, 0, g);
    box(.34, .05, .14, DARK2, 0, 3.55, .16, g);                    // pala sobre cada lâmpada
    box(.34, .05, .14, DARK2, 0, 3.33, .16, g);
    box(.34, .05, .14, DARK2, 0, 3.11, .16, g);
    const pare = lite(.14, .14, .04, GLOW, 0, 3.52, .12, g);
    box(.14, .14, .04, DARK, 0, 3.3, .12, g);
    const siga = lite(.14, .14, .04, DARK, 0, 3.08, .12, g);
    sinais.push({ pare, siga });
    blockOf(x - .18, z - .18, x + .18, z + .18);
  }
  anim(t => {
    const fechado = (t % 14) < 8;
    for (const s of sinais) {
      s.pare.material.color.setHex(fechado ? GLOW : DARK);
      s.siga.material.color.setHex(fechado ? DARK : GLOW);
    }
  });
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
  let vestLoja = null;
  if (day === 5) {
    // dia 5: uma esquina que vira para uma loja do tamanho de uma casa
    slab(7, .18, 6, matCal, 12.5, .03, 20);         // calçada em frente à loja
    walkOf(3.5, 17.2, 12.2, 22.8);                   // pode virar a esquina e andar até a porta
    // o corpo da loja: casca em volta do salão (que está lá dentro de verdade), com o vão da porta da
    // rua e, nos fundos, o do portão de embarque (aeroporto.js)
    const lc = caixaDe('loja', -4.2, 4.2, -3.7, 3.7);
    const gate = noMundo('loja', { x: -2.6, z: -3.5 });
    const LX1 = lc.x1 + .05, LZ0 = Math.min(16.8, lc.z0 - .2), LZ1 = Math.max(23.2, lc.z1 + .2);
    const vv = VEST.VW + .16;
    casca({ x0: 12.5, x1: LX1, y0: 0, y1: 5.32, z0: LZ0, z1: LZ1 }, DARK2, {
      furos: { x0: [[20 - vv, 20 + vv, 0, .12 + VEST.VH + .1]], x1: [[gate.z - vv, gate.z + vv, 0, .12 + VEST.VH + .1]] },
    });
    box(LX1 - 12.5 + .4, .4, LZ1 - LZ0 + .4, DARK2, (12.5 + LX1) / 2, 5.5, (LZ0 + LZ1) / 2); // beiral do telhado
    lite(.05, 1.7, 1.6, NAVY, 12.47, 1.5, 17.9);     // vitrine acesa
    lite(.05, 1.7, 1.6, NAVY, 12.47, 1.5, 22.1);     // vitrine acesa
    // a porta da loja: vestíbulo de vidro (a troca para dentro da loja acontece nele, sem tela escura)
    vestLoja = vestibulo({
      x: 13.5, y: .12, z: 20, yaw: -Math.PI / 2, lado: 'Q', outro: ['loja', 'rua'], estilo: 'vidro',
      arrive: nav.entry === 'loja' ? (nav.rel || true) : null,
    });
    const ls = grp(12.4, 3.9, 20); ls.rotation.y = -Math.PI / 2; // letreiro da loja
    box(3.4, .9, .14, DARK2, 0, 0, 0, ls);
    lite(3.0, .62, .05, BLUE, 0, 0, -.08, ls);
    pointLight(.5, 13, 10, 3.4, 20);
  }

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
  box(2.5, .7, .14, DARK2, 7, .05, 35.49);   // parede do fundo, acima do vestíbulo da estação
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

  // a porta lá embaixo: o vestíbulo que leva ao patamar da estação (o mesmo cômodo está lá)
  let vestMetro = null;
  if (day < 5) {
    vestMetro = vestibulo({
      x: 7, y: -3, z: 36.42, yaw: Math.PI, lado: 'Q', outro: ['plataforma', 'rua'], estilo: 'metro',
      arrive: nav.entry === 'metro' ? (nav.rel || true) : null,
    });
    lite(1.5, .3, .04, BLUE, 7, -.55, 35.32);        // letreiro sobre a porta
  } else {
    const em = grp(7, -3, 35.42);                     // dia 5: a porta lá embaixo, fechada
    em.rotation.y = Math.PI;
    box(2.3, 2.6, .18, LIGHT2, 0, 1.3, 0, em);
    box(.92, 2.34, .1, DARK, -.52, 1.16, .07, em);
    box(.92, 2.34, .1, DARK, .52, 1.16, .07, em);
    box(2.5, 3.0, .14, DARK2, 7, -1.5, 35.6);
  }
  if (day >= 5) {
    // dia 5: metro fechado — grade no alto da escada
    const grade = grp(7, 0, 27.25);
    for (let gx = -1.0; gx <= 1.01; gx += .29) box(.06, 2.25, .06, DARK2, gx, 1.15, 0, grade);
    box(2.35, .1, .1, DARK2, 0, 2.24, 0, grade);
    box(2.35, .1, .1, DARK2, 0, 1.2, 0, grade);
    box(2.35, .1, .1, DARK2, 0, .12, 0, grade);
    tagDialog(grade, 'metroEntrance', 'metroClosed');
    blockOf(5.9, 26.9, 8.1, 27.6);                 // trava a descida
  }

  if (!night) baleia();
  // dentro dos vestíbulos não chove (a chuva cai em volta da câmera, sem saber de teto); nem dentro dos
  // prédios, nem além do fim desta rua (a avenida tem a chuva dela, bairro.js)
  const ceuAberto = (x, z) => z < 37 && ((Math.abs(x) <= 8.2 && z > -32.9)
    || (Math.abs(x) <= 30 && ((z > -12 && z < -4) || (z > 16 && z < 24))));
  const coberto = (x, z) => !ceuAberto(x, z) || (x > -6.95 && x < -4.55 && z < -33 && z > -35.1) || (x > 5.8 && x < 8.2 && z > 35.4 && z < 37.6);
  if (day < 5) chuva({ matRua, matCal, cRua, cCal, streetBg, streetFog, streetStormFog, streetFlash },
    (x, z) => (coberto(x, z) ? -9 : chaoRua(x, z)), coberto); // no dia 5 o tempo abriu

  // saindo do prédio (padrão), subindo do metrô ou saindo da loja: vindo pelo vestíbulo de cada um
  const spawn = (vestMetro && vestMetro.spawn) || vestPredio.spawn || (vestLoja && vestLoja.spawn)
    || (nav.entry === 'metro' ? { x: 7, z: 34.2, yaw: 0 } : { x: -5.75, z: -30.6, yaw: Math.PI });
  return { spawn, caption: sceneCaption('rua'), auto: null, elevFn };
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
// chao(x, z): altura onde o respingo abre (abaixo de -5 = não respinga ali, ex.: escada coberta)
const chaoRua = (x, z) => (naEscada(x, z) ? -9 : noAsfalto(x, z) ? .035 : .135);
// coberto(x, z): a câmera está sob um teto (vestíbulo): ali a chuva some
export function chuva({ matRua, matCal, cRua, cCal, streetBg, streetFog, streetStormFog, streetFlash }, chao = chaoRua, coberto = () => false) {
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
      // sob um teto (vestíbulo) a gota some; de dentro dele se vê a rua chovendo pela porta aberta
      if (coberto(rP.x, rP.z)) rSc.set(0, 0, 0);
      else rSc.set(1, d.len, 1);
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
        sd.x = px + (Math.random() - .5) * 15.8; // em volta de quem olha; dentro dos prédios não molha (coberto)
        sd.z = pz + (Math.random() - .5) * 22;
      }
      const k = a >= 0 && a <= 1 && !coberto(sd.x, sd.z) ? a : 0;
      rP.set(sd.x, chao(sd.x, sd.z), sd.z);
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
