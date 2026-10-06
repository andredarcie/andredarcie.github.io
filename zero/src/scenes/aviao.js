import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { scene, freshScene, box, lite, grp, blob, pointLight, anim, instanciar, at, tagGo, person } from '../kit.js';

/* ===================== CENA: O AVIÃO (sentado na janela, só olha; sai pela poltrona do lado) ===================== */
// Corte da cabine (x, y), corredor em x=0, frente do avião em -z:
//   chão y=0 · parede baixa até y=.55 · painel das janelas inclinado para dentro
//   · bagageiros curvos · teto em arco a ~2.3. Duas poltronas de cada lado.
const L = 12;                                  // comprimento da cabine (z de -6 a 6)
const ROWS = [];                               // fileiras a cada 80 cm, a do jogador em z=0
for (let i = 0; i < 13; i++) ROWS.push(-4.8 + i * .8);
const SEAT_X = [-1.05, -.55, .55, 1.05];       // janela, corredor | corredor, janela
const PLAYER = { x: -1.05, z: 0 };             // poltrona da janela, lado esquerdo
const EXIT = { x: -.55, z: 0 };                // a poltrona vazia do lado: "Sair"
const WIN = { w: .27, h: .38, r: .11, cy: .55 }; // janela no painel (coordenadas locais)
const TILT = .16;                              // inclinação do painel das janelas
const HORIZON = 0xdfe8ee;                      // cor do horizonte = cor da névoa lá fora
const SUN_DIR = new THREE.Vector3(-.9, .22, -.35).normalize(); // sol à esquerda, à frente, baixo

const same = (a, b) => Math.abs(a - b) < .01;

/* ---------- helpers de geometria ---------- */
// contorno de um retângulo arredondado num Shape/Path (janelas)
function roundRect(p, cx, cy, w, h, r) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1);
  p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r);
  p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}
// perfil (x, y) extrudado ao longo da cabine inteira: bagageiros, teto
function perfil(pts, color) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -L / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  scene.add(m);
  return m;
}
// sólido de 8 vértices (0-3 uma face, 4-7 a oposta, na mesma ordem): asa, winglet
function solido(v, color, parent) {
  const quads = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  const pos = [];
  for (const [a, b, c, d] of quads) for (const i of [a, b, c, a, c, d]) pos.push(...v[i]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  // DoubleSide: a ordem dos vértices não importa, a luz vira a normal da face de trás
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, flatShading: true }));
  (parent || scene).add(m);
  return m;
}
// barra fina ligando dois pontos (frisos dos flaps)
function friso(a, b, w, color) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, .012, A.distanceTo(B)), new THREE.MeshBasicMaterial({ color }));
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.lookAt(B);
  scene.add(m);
}

/* ---------- poltrona (de frente para -z; origem no chão, no centro do assento) ---------- */
function poltrona(parent) {
  box(.03, .36, .42, DARK2, -.19, .2, 0, parent);     // estrutura lateral
  box(.03, .36, .42, DARK2, .19, .2, 0, parent);
  box(.4, .04, .04, DARK2, 0, .1, -.17, parent);      // travessa dos pés
  box(.46, .12, .5, NAVY, 0, .44, -.02, parent);      // assento
  box(.46, .03, .07, DARK2, 0, .385, -.25, parent);   // borda frontal do assento
  const back = grp(0, .5, .21, parent);               // encosto reclinado, pivô atrás do assento
  back.rotation.x = .13;
  box(.46, .72, .1, NAVY, 0, .36, 0, back);           // encosto
  box(.44, .7, .025, DARK2, 0, .36, .06, back);       // casca traseira
  box(.4, .2, .12, NAVY, 0, .8, -.005, back);         // apoio de cabeça
  box(.41, .13, .13, GLOW, 0, .84, -.005, back);      // capa branca do apoio de cabeça
  box(.24, .16, .012, DARK, 0, .6, .08, back);        // moldura da tela
  box(.34, .24, .015, LIGHT2, 0, .3, .08, back);      // mesinha fechada
  box(.05, .025, .012, DARK2, 0, .44, .094, back);    // trava da mesinha
  box(.36, .12, .025, DARK, 0, .08, .085, back);      // bolsão do encosto
  box(.3, .05, .01, GLOW, 0, .135, .1, back);         // cartão de segurança no bolsão
  return back;
}
// tela no encosto: molde à parte, para cada instância ter a sua cor
function telaMolde() {
  const g = new THREE.Group();
  const back = grp(0, .5, .21, g);
  back.rotation.x = .13;
  lite(.2, .12, .004, 0xffffff, 0, .6, .0885, back);
  return g;
}
// apoio de braço entre poltronas
function bracoMolde() {
  const g = new THREE.Group();
  box(.05, .05, .44, DARK2, 0, .66, 0, g);
  box(.055, .065, .06, DARK, 0, .66, -.22, g);        // ponta acolchoada
  box(.04, .2, .05, DARK2, 0, .53, .17, g);           // suporte
  return g;
}

/* ---------- painel de serviço sob o bagageiro (lado direito; o esquerdo é girado 180°) ---------- */
function psuMolde() {
  const g = new THREE.Group();
  const p = grp(0, 0, 0, g);
  p.rotation.z = -.155;                               // segue o fundo inclinado do bagageiro
  box(.56, .025, .55, LIGHT2, 0, 0, 0, p);
  for (const lx of [-.2, -.08]) lite(.05, .012, .05, DARK, lx, -.016, .08, p);   // luzes de leitura
  for (const lx of [.06, .17]) {                                                // saídas de ar
    const ar = new THREE.Mesh(new THREE.CylinderGeometry(.018, .024, .025, 8), new THREE.MeshLambertMaterial({ color: DARK2 }));
    ar.position.set(lx, -.022, .08);
    p.add(ar);
  }
  lite(.08, .01, .04, GLOW, -.03, -.016, -.14, p);    // aviso de cinto aceso
  lite(.02, .01, .02, BLUE, .22, -.016, -.14, p);     // botão de chamada
  return g;
}
// emendas e travas das portas dos bagageiros (lado direito)
function binMolde() {
  const g = new THREE.Group();
  lite(.012, .3, .012, DARK2, .694, 1.83, -.8, g);    // emenda entre portas
  box(.03, .05, .16, DARK2, .70, 1.71, 0, g);         // trava
  return g;
}

/* ---------- mapa de voo: canvas redesenhado com o avião avançando na rota ---------- */
function mapaDeVoo() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 160;
  const c = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false });
  const P0 = [30, 104], P1 = [116, 16], P2 = [222, 62];
  const curve = k => [
    (1 - k) * (1 - k) * P0[0] + 2 * (1 - k) * k * P1[0] + k * k * P2[0],
    (1 - k) * (1 - k) * P0[1] + 2 * (1 - k) * k * P1[1] + k * k * P2[1],
  ];
  function draw(k) {
    c.fillStyle = '#1f3142'; c.fillRect(0, 0, 256, 160);
    c.strokeStyle = 'rgba(166,182,184,.10)'; c.lineWidth = 1;          // meridianos
    for (let x = 16; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 132); c.stroke(); }
    for (let y = 12; y < 132; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(256, y); c.stroke(); }
    c.fillStyle = '#3a5066';                                            // a cidade que fica / o litoral
    c.beginPath(); c.moveTo(0, 78); c.lineTo(34, 70); c.lineTo(62, 92); c.lineTo(54, 132); c.lineTo(0, 132); c.fill();
    c.beginPath(); c.moveTo(186, 22); c.lineTo(256, 8); c.lineTo(256, 132); c.lineTo(214, 120); c.lineTo(226, 90); c.lineTo(196, 64); c.fill();
    c.setLineDash([4, 4]); c.strokeStyle = '#a6b6b8'; c.lineWidth = 2;  // rota inteira
    c.beginPath(); c.moveTo(...P0); c.quadraticCurveTo(...P1, ...P2); c.stroke();
    c.setLineDash([]); c.strokeStyle = '#3aa2ea'; c.lineWidth = 3;      // trecho já voado
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const p = curve(k * i / 24); if (i) c.lineTo(...p); else c.moveTo(...p); }
    c.stroke();
    c.fillStyle = '#dde8e9';
    for (const p of [P0, P2]) { c.beginPath(); c.arc(p[0], p[1], 4, 0, Math.PI * 2); c.fill(); }
    const p = curve(k), q = curve(Math.min(1, k + .01));                // aviãozinho na tangente
    c.save(); c.translate(p[0], p[1]); c.rotate(Math.atan2(q[1] - p[1], q[0] - p[0]));
    c.beginPath(); c.moveTo(9, 0); c.lineTo(-7, -6); c.lineTo(-3, 0); c.lineTo(-7, 6); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = '#263848'; c.fillRect(0, 132, 256, 28);              // dados de voo
    c.fillStyle = '#dde8e9'; c.font = '20px VT323, monospace'; c.textBaseline = 'middle';
    c.fillText('11 278 m', 8, 147);
    c.fillText('870 km/h', 94, 147);
    c.fillText('-52°C', 194, 147);
    tex.needsUpdate = true;
  }
  draw(.4);
  return { mat, draw };
}

/* ===================== a cena ===================== */
export function buildAviao() {
  freshScene(30, 78);                       // névoa só lá fora: dissolve as nuvens no horizonte
  scene.fog.color.set(HORIZON);
  scene.background = new THREE.Color(HORIZON);
  let seed = 11;
  const rnd = () => { seed++; const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };

  // ── casco da cabine ──────────────────────────────────────────────────────
  box(3.0, .1, L, FLOOR, 0, -.05, 0);                    // piso
  box(.64, .012, L, NAVY, 0, .006, 0);                   // carpete do corredor
  for (const s of [-1, 1]) lite(.02, .004, L, DARK2, s * .22, .014, 0); // frisos do carpete
  const pathMolde = new THREE.Group();                   // luzes de emergência no chão
  lite(.03, .01, .06, GLOW, 0, .018, 0, pathMolde);
  const pathMats = [];
  for (let z = -5.8; z < 5.9; z += .4) for (const s of [-1, 1]) pathMats.push(at(s * .3, 0, z));
  instanciar(pathMolde, pathMats);

  const binPts = [[1.46, 1.48], [.80, 1.60], [.72, 1.665], [.70, 1.84], [.73, 2.0], [.82, 2.08], [1.2, 2.14], [1.47, 1.98]];
  const arc = [];
  for (let i = 0; i <= 16; i++) { const x = -.9 + i * 1.8 / 16; arc.push([x, 2.27 - (x / .9) * (x / .9) * .24]); }
  perfil([...arc, ...arc.slice().reverse().map(([x, y]) => [x, y + .06])], LIGHT); // teto em arco

  for (const s of [-1, 1]) {
    perfil(binPts.map(([x, y]) => [s * x, y]), LIGHT);              // bagageiros
    lite(.03, .02, L, GLOW, s * .765, 2.05, 0);                      // luz indireta no vão do teto
    box(.12, .58, L, LIGHT2, s * 1.49, .29, 0);                      // parede baixa
    lite(.006, .05, L, DARK2, s * 1.425, .1, 0);                     // grelha do aquecimento
    box(.06, 1.45, L, LIGHT, s * 1.72, .125, 0);                     // casco externo sob as janelas

    // painel das janelas: placa inclinada com furos arredondados de verdade
    const wall = grp(s * 1.55, 0, 0);
    wall.rotation.y = -s * Math.PI / 2;                              // x local corre ao longo da cabine, z local aponta para dentro
    const pan = grp(0, .55, 0, wall);
    pan.rotation.x = TILT;                                           // topo pende para dentro, como na fuselagem
    const sh = new THREE.Shape();
    sh.moveTo(-L / 2, 0); sh.lineTo(L / 2, 0); sh.lineTo(L / 2, 1.0); sh.lineTo(-L / 2, 1.0); sh.lineTo(-L / 2, 0);
    for (const z of ROWS) sh.holes.push(roundRect(new THREE.Path(), s * z, WIN.cy, WIN.w, WIN.h, WIN.r));
    const panGeo = new THREE.ExtrudeGeometry(sh, { depth: .12, bevelEnabled: false, curveSegments: 6 });
    pan.add(new THREE.Mesh(panGeo, new THREE.MeshLambertMaterial({ color: LIGHT })));

    const ring = new THREE.Shape();                                  // moldura plástica de cada janela
    roundRect(ring, 0, 0, WIN.w + .07, WIN.h + .07, WIN.r + .035);
    ring.holes.push(roundRect(new THREE.Path(), 0, 0, WIN.w, WIN.h, WIN.r));
    const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: .02, bevelEnabled: false, curveSegments: 6 });
    const ringMat = new THREE.MeshLambertMaterial({ color: 0xc7d4d5 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xbfd6e6, transparent: true, opacity: .1, depthWrite: false });
    for (const z of ROWS) {
      const lx = s * z;
      const bz = new THREE.Mesh(ringGeo, ringMat);
      bz.position.set(lx, WIN.cy, .12);
      pan.add(bz);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.h), glassMat); // vidro recuado no fundo do vão
      gl.position.set(lx, WIN.cy, .01);
      pan.add(gl);
      lite(.008, .008, .002, DARK2, lx, WIN.cy - WIN.h / 2 + .05, .012, pan); // furinho de respiro do vidro
      // cortina: a janela do jogador e as vizinhas ficam abertas; do lado da sombra, mais fechadas
      const near = s < 0 && Math.abs(z - PLAYER.z) < 1;
      const c = near ? 0 : rnd() < (s < 0 ? .6 : .4) ? 0 : .35 + rnd() * .65;
      if (c > 0) {
        box(WIN.w - .01, WIN.h, .01, LIGHT2, lx, WIN.cy + WIN.h * (1 - c), .03, pan); // a sobra fica dentro do painel
        box(.05, .012, .01, DARK2, lx, WIN.cy + WIN.h * (.5 - c) + .006, .04, pan); // puxador da cortina
      }
      // feixe de sol entrando pelas janelas abertas do lado do sol (menos a do jogador)
      if (s < 0 && c === 0 && !same(z, PLAYER.z)) {
        const wy = .55 + WIN.cy * Math.cos(TILT), wx = -(1.55 - WIN.cy * Math.sin(TILT));
        const dir = SUN_DIR.clone().negate();
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(WIN.w * .8, WIN.h * .8, 2.4),
          new THREE.MeshBasicMaterial({ color: 0xfff1dc, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
        );
        beam.position.set(wx, wy, z).addScaledVector(dir, 1.25);
        beam.lookAt(beam.position.clone().add(dir));
        scene.add(beam);
      }
    }
  }

  // emendas/travas dos bagageiros e painéis de serviço de cada fileira
  const binMats = [];
  for (let z = -4.4; z < 6; z += 1.6) { binMats.push(at(0, 0, z)); binMats.push(at(0, 0, z, Math.PI)); }
  instanciar(binMolde(), binMats);
  const psuMats = [];
  for (const z of ROWS) { psuMats.push(at(1.1, 1.538, z - .1)); psuMats.push(at(-1.1, 1.538, z - .1, Math.PI)); }
  instanciar(psuMolde(), psuMats);

  // luz da cabine: fria e baixa, como em voo de cruzeiro
  for (const lz of [-4, -1, 2]) pointLight(.24, 7, 0, 1.95, lz);

  // ── poltronas, braços, telas ─────────────────────────────────────────────
  const seatMolde = new THREE.Group();
  poltrona(seatMolde);
  const seatMats = [], telaMats = [], telaCores = [], bracoMats = [];
  const cTela = [new THREE.Color(0x1d2b38), new THREE.Color(0x24384a), new THREE.Color(0x2f5f86)];
  for (const z of ROWS) {
    for (const x of SEAT_X) {
      if (!(same(x, EXIT.x) && same(z, EXIT.z))) seatMats.push(at(x, 0, z));
      telaMats.push(at(x, 0, z));
      telaCores.push(cTela[Math.floor(rnd() * 3)]);                 // telas apagadas, em espera ou passando filme
    }
    for (const bx of [-1.3, -.8, -.3, .3, .8, 1.3]) bracoMats.push(at(bx, 0, z));
  }
  instanciar(seatMolde, seatMats);
  instanciar(telaMolde(), telaMats, telaCores);
  instanciar(bracoMolde(), bracoMats);

  // mapa de voo na tela do encosto da frente
  const mapa = mapaDeVoo();
  const frente = grp(PLAYER.x, 0, PLAYER.z - .8);
  const frenteBack = grp(0, .5, .21, frente);
  frenteBack.rotation.x = .13;
  const telaMapa = new THREE.Mesh(new THREE.PlaneGeometry(.2, .12), mapa.mat);
  telaMapa.position.set(0, .6, .093);                                // à frente da tela instanciada (sem z-fighting)
  frenteBack.add(telaMapa);
  let mapT0 = null, mapLast = 0;
  anim(t => {                                                        // o aviãozinho avança devagar na rota
    if (mapT0 === null) mapT0 = t;
    if (t - mapLast < .5) return;
    mapLast = t;
    mapa.draw(.4 + Math.min(.5, (t - mapT0) * .002));
  });

  // a poltrona vazia do lado, com a manta dobrada: interagir aqui é levantar e sair
  const exitG = grp(EXIT.x, 0, EXIT.z);
  poltrona(exitG);
  box(.34, .07, .26, BLUE, 0, .535, -.05, exitG);                    // manta dobrada no assento
  box(.36, .02, .1, GLOW, 0, .575, -.1, exitG);                      // travesseirinho
  tagGo(exitG, 'exitSeat', 'praia');

  // ── passageiros ──────────────────────────────────────────────────────────
  // poucos especiais (com vida própria) e o resto instanciado; topos de cabeça acima dos encostos
  const special = [[1.05, -1.6], [-.55, -2.4], [-1.05, 1.6], [-.55, -.8]];
  const skip = (x, z) => (same(x, PLAYER.x) && same(z, PLAYER.z)) || (same(x, EXIT.x) && same(z, EXIT.z))
    || (same(x, PLAYER.x) && same(z, PLAYER.z - .8)) || special.some(([sx, sz]) => same(x, sx) && same(z, sz));
  const paxMolde = new THREE.Group();
  const pm = person(true, BLUE, paxMolde);
  pm.rotation.y = Math.PI;
  pm.position.set(0, .03, .06);
  const paxMats = [];
  for (const z of ROWS) for (const x of SEAT_X) if (!skip(x, z) && rnd() < .45) paxMats.push(at(x, 0, z));
  instanciar(paxMolde, paxMats);

  const pax = special.map(([x, z]) => {
    const g = grp(x, .03, z + .06);
    const p = person(true, BLUE, g);
    p.rotation.y = Math.PI;
    return p;
  });
  pax[0].rotation.z = .12;                                           // dormindo, encostado na janela
  anim(t => { pax[0].rotation.x = Math.sin(t * .9) * .02; });        // respiração lenta
  anim(t => { pax[2].rotation.y = Math.PI + Math.sin(t * .23) * .25; }); // olhando a janela de vez em quando
  // luz de leitura acesa sobre quem lê: a lâmpada do painel de serviço e o cone de luz até o colo
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff1dc, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, z] of [special[1], special[3]]) {
    const lx = Math.sign(x) * .9, ly = 1.545, lz = z - .02;
    lite(.05, .012, .05, GLOW, lx, ly, lz);
    const from = new THREE.Vector3(lx, ly - .01, lz), to = new THREE.Vector3(x, .5, z - .05);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.2, from.distanceTo(to), 14, 1, true), coneMat);
    cone.position.copy(from).add(to).multiplyScalar(.5);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), from.clone().sub(to).normalize()); // ponta na lâmpada
    scene.add(cone);
  }

  // ── divisória da frente: tela do mapa, aviso de cinto, saída, cortina da galley ──
  for (const s of [-1, 1]) box(1.26, 2.3, .08, LIGHT2, s * .97, 1.15, -6.04);
  box(.7, .32, .08, LIGHT2, 0, 2.14, -6.04);                         // verga da passagem
  box(.76, .48, .02, DARK, -.97, 1.45, -5.985);                      // tela grande
  const mapaGrande = new THREE.Mesh(new THREE.PlaneGeometry(.7, .42), mapa.mat);
  mapaGrande.position.set(-.97, 1.45, -5.972);
  scene.add(mapaGrande);
  lite(.36, .16, .02, GLOW, .97, 1.8, -5.985);                       // aviso de apertar o cinto, aceso
  box(.09, .05, .01, DARK2, .97, 1.8, -5.972);                       // fivela
  lite(.26, .014, .006, DARK2, .97, 1.8, -5.971);                    // cinto
  const exitCv = document.createElement('canvas');                   // placa de saída
  exitCv.width = 128; exitCv.height = 40;
  const exitTex = new THREE.CanvasTexture(exitCv);
  exitTex.colorSpace = THREE.SRGBColorSpace;
  const drawExit = () => {
    const c = exitCv.getContext('2d');
    c.fillStyle = '#263848'; c.fillRect(0, 0, 128, 40);
    c.fillStyle = '#3aa2ea'; c.font = '34px VT323, monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('EXIT', 64, 21);
    exitTex.needsUpdate = true;
  };
  drawExit();
  if (document.fonts) document.fonts.ready.then(drawExit);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(.3, .094), new THREE.MeshBasicMaterial({ map: exitTex }));
  exitSign.position.set(0, 2.14, -5.995);
  scene.add(exitSign);
  box(.7, .025, .025, DARK2, 0, 1.99, -5.97);                        // varão da cortina
  for (let i = 0; i < 6; i++)                                        // cortina franzida, entreaberta
    box(.1, 1.94, .02, NAVY, -.28 + i * .085, 1.0, -5.975 + (i % 2) * .022);
  // a galley lá atrás, clara (só se vê pela fresta da cortina)
  box(.7, .1, .9, FLOOR, 0, -.05, -6.45);
  for (const s of [-1, 1]) box(.05, 2.2, .9, LIGHT2, s * .37, 1.1, -6.45);
  box(.7, .05, .9, LIGHT2, 0, 2.2, -6.45);
  lite(.7, 2.2, .05, GLOW, 0, 1.1, -6.92);
  pointLight(.3, 3, 0, 1.8, -6.4);

  // ── divisória do fundo: banheiros ────────────────────────────────────────
  box(3.2, 2.3, .08, LIGHT2, 0, 1.15, 6.04);
  for (const s of [-1, 1]) {
    box(.55, 1.9, .03, LIGHT, s * .6, .95, 5.98);
    lite(.08, .03, .01, BLUE, s * .6, 1.6, 5.962);                   // "ocupado"
    box(.08, .02, .03, DARK2, s * .6 - s * .18, .95, 5.955);         // maçaneta
  }

  // ── comissária com o carrinho, indo e voltando pelo corredor ─────────────
  const trolley = grp(0, 0, -5.3);
  box(.32, .86, .7, LIGHT2, 0, .47, 0, trolley);
  box(.33, .03, .71, DARK2, 0, .915, 0, trolley);                    // tampo
  box(.3, .025, .025, DARK2, 0, .8, -.37, trolley);                  // alça
  for (const [wx, wz] of [[-.12, -.28], [.12, -.28], [-.12, .28], [.12, .28]]) box(.04, .06, .06, DARK, wx, .03, wz, trolley);
  for (const s of [-1, 1]) lite(.006, .5, .5, DARK2, s * .162, .5, 0, trolley); // frisos das gavetas
  for (const [cx, cz] of [[-.08, .2], [.06, .22], [-.05, .05]]) box(.05, .07, .05, GLOW, cx, .965, cz, trolley); // copos
  box(.09, .16, .09, DARK2, .07, 1.01, -.15, trolley);               // garrafa térmica
  const att = person(false, BLUE, trolley);
  att.scale.setScalar(1.1);                                          // cabe no corredor
  att.position.set(0, 0, -.62);
  anim(t => {
    const u = (t % 48) / 48, sm = k => k * k * (3 - 2 * k);
    const k = u < .4 ? sm(u / .4) : u < .5 ? 1 : u < .9 ? 1 - sm((u - .5) / .4) : 0; // vai, serve, volta, some
    trolley.position.z = -5.3 + 3.4 * k;
  });

  // ── lá fora: céu, sol, mar de nuvens ─────────────────────────────────────
  const ceu = grp(0, 0, 0);
  const domeGeo = new THREE.SphereGeometry(76, 32, 16);
  const dPos = domeGeo.attributes.position, cols = [], cc = new THREE.Color();
  const ZEN = new THREE.Color(0x5b8fc4), HOR = new THREE.Color(HORIZON), LOW = new THREE.Color(0xc9d6de);
  for (let i = 0; i < dPos.count; i++) {
    const h = dPos.getY(i) / 76;
    if (h >= 0) cc.lerpColors(HOR, ZEN, Math.pow(h, .55)); else cc.lerpColors(HOR, LOW, Math.min(1, -h * 3));
    cols.push(cc.r, cc.g, cc.b);
  }
  domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -1;
  ceu.add(dome);

  const eye = new THREE.Vector3(PLAYER.x, 1.15, PLAYER.z);
  const SUNC = 0xffe6b8;
  const sunG = grp(0, 0, 0, ceu);
  sunG.position.copy(SUN_DIR).multiplyScalar(62);
  sunG.lookAt(eye);
  sunG.add(new THREE.Mesh(new THREE.CircleGeometry(2.6, 28), new THREE.MeshBasicMaterial({ color: SUNC, fog: false })));
  for (let h = 0; h < 3; h++) {
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(4 + h * 3.4, 28),
      new THREE.MeshBasicMaterial({ color: SUNC, fog: false, transparent: true, opacity: .22 - h * .06, depthWrite: false })
    );
    halo.position.z = -.1 - h * .1;
    sunG.add(halo);
  }
  const sunLight = new THREE.DirectionalLight(0xfff0dc, .6);       // o sol bate na asa e no lado direito da cabine
  sunLight.position.copy(SUN_DIR).multiplyScalar(20);
  scene.add(sunLight);

  const floorGeo = new THREE.CircleGeometry(74, 40);               // o tapete de nuvens lá embaixo
  floorGeo.rotateX(-Math.PI / 2);
  const undercast = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ color: 0xd2dee6 }));
  undercast.position.y = -14;
  ceu.add(undercast);

  // cúmulos: cachos de bolhas boiando sobre o tapete, passando para trás (o avião voa para -z)
  const nuvens = [];
  const nuvem = (x, y, z, size, sp, alpha) => {
    const g = grp(x, y, z, ceu);
    const n = 3 + Math.floor(rnd() * 3);
    for (let p = 0; p < n; p++) {
      const s = size * (.6 + rnd() * .5);
      const b = blob(2.4 * s, (.8 + rnd() * .5) * s, 1.7 * s, GLOW,
        (p - (n - 1) / 2) * 2.1 * size, rnd() * .6 * size, (rnd() - .5) * 2 * size, g);
      b.material.emissive = new THREE.Color(GLOW).multiplyScalar(.6); // sem isso a barriga fica cinza-pedra
      if (alpha < 1) { b.material.transparent = true; b.material.opacity = alpha; b.material.depthWrite = false; }
    }
    nuvens.push({ g, z0: z, sp });
  };
  for (let i = 0; i < 34; i++) {
    let x = (rnd() - .5) * 140;
    if (Math.abs(x) < 5) x += x < 0 ? -5 : 5;
    nuvem(x, -13 + rnd() * 2.5, (rnd() - .5) * 144, 1.6 + rnd() * 2.2, 7, 1);
  }
  for (let i = 0; i < 6; i++)                                       // fiapos perto, sob a asa: dão a velocidade
    nuvem(-7 - rnd() * 30, -5 + rnd() * 2, (rnd() - .5) * 144, .9 + rnd() * .7, 22, .55);
  anim(t => {
    for (const n of nuvens) n.g.position.z = ((n.z0 + t * n.sp + 72) % 144 + 144) % 144 - 72;
    ceu.rotation.z = Math.sin(t * .045) * .025;                    // inclinação lenta: o horizonte respira
  });

  // ── a asa esquerda, vista da janela ──────────────────────────────────────
  const RX = -1.7, TX = -15.5;
  solido([
    [RX, -.42, -3.3], [RX, -.3, .9], [TX, 1.06, 4.9], [TX, 1.03, 3.7],   // intradorso
    [RX, 0, -3.3], [RX, -.2, .9], [TX, 1.1, 4.9], [TX, 1.15, 3.7],       // extradorso
  ], LIGHT);
  const lerp = (a, b, k) => a + (b - a) * k;
  const onTop = (span, chord) => [                                     // ponto no extradorso (0..1, 0..1)
    lerp(RX, TX, span),
    lerp(lerp(0, -.2, chord), lerp(1.15, 1.1, chord), span) + .02,
    lerp(lerp(-3.3, .9, chord), lerp(3.7, 4.9, chord), span),
  ];
  friso(onTop(.03, .74), onTop(.62, .74), .03, DARK2);               // flap
  friso(onTop(.62, .76), onTop(.96, .76), .03, DARK2);               // aileron
  friso(onTop(.62, .76), onTop(.62, 1), .02, DARK2);
  friso(onTop(.1, .42), onTop(.5, .42), .02, LIGHT2);                // spoilers
  solido([                                                           // winglet com a cor da companhia
    [TX + .05, 1.06, 3.8], [TX + .05, 1.06, 4.9], [TX - .45, 2.15, 5.15], [TX - .45, 2.15, 4.65],
    [TX - .03, 1.06, 3.8], [TX - .03, 1.06, 4.9], [TX - .53, 2.15, 5.15], [TX - .53, 2.15, 4.65],
  ], BLUE);
  lite(.08, .08, .08, BLUE, TX - .05, 1.12, 3.65);                   // luz de navegação
  const strobe = lite(.1, .1, .1, GLOW, TX - .05, 1.12, 4.95);
  const strobeHalo = new THREE.Mesh(new THREE.SphereGeometry(.45, 10, 8),
    new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  strobeHalo.position.copy(strobe.position);
  scene.add(strobeHalo);
  anim(t => {                                                        // pisca duplo do estroboscópio
    const ph = t % 1.4, on = ph < .06 || (ph > .16 && ph < .22);
    strobe.visible = strobeHalo.visible = on;
  });

  // motor sob a asa
  const EX = -5.6, EY = -.7, EZ = -1.7;
  const nac = new THREE.Mesh(new THREE.CylinderGeometry(.44, .5, 2.8, 18), new THREE.MeshLambertMaterial({ color: LIGHT, flatShading: true }));
  nac.rotation.x = Math.PI / 2;
  nac.position.set(EX, EY, EZ);
  scene.add(nac);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .14, 18, 1, true), new THREE.MeshLambertMaterial({ color: DARK2, side: THREE.DoubleSide }));
  lip.rotation.x = Math.PI / 2;
  lip.position.set(EX, EY, EZ - 1.4);
  scene.add(lip);
  const fan = new THREE.Mesh(new THREE.CircleGeometry(.44, 18), new THREE.MeshBasicMaterial({ color: DARK }));
  fan.rotation.y = Math.PI;                                          // de frente para o vento
  fan.position.set(EX, EY, EZ - 1.33);
  scene.add(fan);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.28, .6, 14), new THREE.MeshLambertMaterial({ color: DARK2 }));
  cone.rotation.x = Math.PI / 2;                                     // ponta para trás
  cone.position.set(EX, EY, EZ + 1.7);
  scene.add(cone);
  box(.12, .34, 1.9, LIGHT2, EX, EY + .55, EZ + .5);                 // pilone

  // olhando de lado para a janela já ao sentar: o céu é a primeira coisa que se vê
  return {
    spawn: { x: PLAYER.x, z: PLAYER.z - .06, yaw: .75 }, caption: sceneCaption('aviao'), auto: null,
    seated: true,          // preso na poltrona: só olha, não anda
    elevFn: () => -.45,    // altura dos olhos de quem está sentado (1.15)
    sway: true,            // a turbulência leve do voo
  };
}
