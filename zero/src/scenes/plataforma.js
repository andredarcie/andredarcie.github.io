import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { night } from '../state.js';
import { scene, freshScene, box, lite, grp, pointLight, anim, walkOf, blockOf, person } from '../kit.js';
import { vestibulo } from '../vestibulo.js';
import { painelDoTrem } from './trem.js';

// cor nova só como mistura da paleta (README)
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();
const AD = mix(NAVY, DARK, .3);                  // fundo dos anúncios e do mapa

// placa com texto (nome da estação, saída): canvas numa chapa
function placa(txt, cor, w, h) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = Math.round(256 * h / w);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => {
    const c = cv.getContext('2d');
    c.fillStyle = '#263848'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#' + new THREE.Color(cor).getHexString();
    c.font = `${Math.round(cv.height * .8)}px VT323, monospace`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(txt, cv.width / 2, cv.height * .54, cv.width * .92); // texto longo encolhe, não corta
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts) document.fonts.ready.then(draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  scene.add(m);
  return m;
}

/* ===================== as duas estações da linha ===================== */
// A (perto de casa) e B (perto do trabalho) são a mesma planta com outra cara: nome, cor da faixa,
// parede, acento, lado da saída. A linha corre em -x de manhã (casa → trabalho) e em +x de noite.
const ESTACOES = {
  plataforma: {
    nome: 'CENTRAL', saidaTxt: 'SAÍDA · RUA', rua: 'rua', exitX: -6, bancos: [-9.6, 9],
    parede: LIGHT, faixa: NAVY, acento: BLUE,
  },
  plataforma2: {
    nome: 'VIADUTO', saidaTxt: 'SAÍDA · VIADUTO', rua: 'rua2', exitX: 6, bancos: [-9, 9.6],
    parede: mix(LIGHT, LIGHT2, .6), faixa: AD, acento: mix(BLUE, GLOW, .45),
  },
};
export const buildPlataforma = nav => buildEstacao(nav, ESTACOES.plataforma, 'plataforma');
export const buildPlataforma2 = nav => buildEstacao(nav, ESTACOES.plataforma2, 'plataforma2');

/* ===================== CENA: A PLATAFORMA ===================== */
// O trem é um lugar à parte (trem.js), que corre de verdade pelo túnel (linha.js) de uma estação à
// outra; aqui ficam a plataforma, a escada da rua e o painel, que mostra o que o trem está fazendo.
// entry 'rua': chegou pela escada da rua (seletor de cenas)
function buildEstacao(nav = {}, cfg, sceneName) {
  freshScene(6, 27);   // túnel escuro: o trem emerge da névoa

  // ---------- piso da plataforma (topo y=0) e faixa da borda ----------
  box(30, .5, 4.0, FLOOR, 0, -.25, 1.85);
  for (let fx = -14; fx <= 14; fx += 2) lite(.03, .012, 3.9, DARK2, fx, .012, 1.85);   // juntas do piso
  for (let fz = .3; fz <= 3.7; fz += 1.15) lite(30, .012, .03, DARK2, 0, .012, fz);
  box(30, .05, .34, DARK2, 0, .015, .3);                                                // faixa tátil
  for (let tx = -14.5; tx <= 14.5; tx += .62) lite(.26, .055, .16, GLOW, tx, .045, .3); // pastilhas táteis
  lite(30, .02, .06, BLUE, 0, .07, .12);                                                // linha azul de segurança
  box(30, 1.1, .12, DARK2, 0, -.5, -.02);                                               // face vertical da borda
  walkOf(-11.5, .55, 11.5, 3.4);

  // ---------- fosso, trilhos, terceiro trilho, cabos ----------
  box(32, .5, 3.6, DARK2, 0, -1.15, -1.7);           // balastro (topo y=-.9)
  for (let sx = -15; sx <= 15; sx += .78) box(.28, .1, 1.55, DARK, sx, -.86, -1.3); // dormentes
  box(32, .1, .12, LIGHT2, 0, -.79, -.85);           // trilho 1
  box(32, .1, .12, LIGHT2, 0, -.79, -1.75);          // trilho 2
  for (let sx = -14; sx <= 14; sx += 2.4) box(.1, .28, .1, DARK2, sx, -.71, -2.25); // isoladores
  box(32, .12, .16, NAVY, 0, -.64, -2.25);           // terceiro trilho (energizado)
  for (const cy of [-.3, -.45]) box(32, .05, .05, DARK2, 0, cy, -2.62); // cabos na parede do fosso

  // ---------- parede do outro lado dos trilhos (sem ela, a estação acabava na névoa) ----------
  box(30, 4.4, .3, LIGHT, 0, .8, -2.95);                // parede (face em z=-2.8)
  box(30, 1.5, .34, DARK2, 0, -.15, -2.93);             // barra escura na altura do fosso
  lite(30, .3, .03, NAVY, 0, .75, -2.77);               // faixa de azulejo, como a do fundo
  for (let ty = 1.3; ty < 2.9; ty += .46) box(30, .02, .02, DARK2, 0, ty, -2.79);          // juntas h
  for (let tx = -13.5; tx <= 13.5; tx += 1.15) box(.02, 1.9, .02, DARK2, tx, 1.95, -2.79); // juntas v
  for (const px of [-9, -3, 3, 9]) {                    // anúncios de frente para a plataforma
    box(2.6, 1.5, .1, DARK2, px, 1.75, -2.78);
    lite(2.3, 1.2, .03, px % 6 === 3 || px % 6 === -3 ? AD : NAVY, px, 1.75, -2.72);
  }
  for (const px of [-12, 0, 12]) {                      // o nome da estação, repetido
    box(1.6, .5, .08, DARK2, px, 1.75, -2.78);
    placa(cfg.nome, cfg.acento, 1.4, .34).position.set(px, 1.75, -2.735);
  }

  // ---------- teto abobadado (vault facetado) com nervuras e cove ----------
  const V = [[-3.1, 3.0], [-1.2, 4.05], [.7, 4.62], [2.6, 4.05], [4.2, 3.0]]; // perfil (z,y)
  function facet(a, b) {
    const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
    const m = box(31, .22, len, LIGHT2, 0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    m.rotation.x = Math.atan2(-dy, dz);
  }
  for (let i = 0; i < V.length - 1; i++) facet(V[i], V[i + 1]);
  for (const [pz, py] of [V[1], V[2], V[3]]) box(31, .1, .12, DARK2, 0, py + .12, pz); // purlins
  box(32, .7, .4, DARK2, 0, 2.95, -2.95);            // lintel sobre a boca do túnel
  lite(31, .06, .5, GLOW, 0, 3.05, -2.85);           // cove de luz (lado do trilho)
  lite(31, .06, .5, GLOW, 0, 3.05, 4.05);            // cove de luz (lado da parede)
  // nervuras transversais escuras acompanhando a abóbada
  for (const rx of [-12, -8, -4, 4, 8, 12])
    for (let i = 0; i < V.length - 1; i++) {
      const a = V[i], b = V[i + 1], dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
      const m = box(.16, .14, len, DARK2, rx, (a[1] + b[1]) / 2 + .05, (a[0] + b[0]) / 2);
      m.rotation.x = Math.atan2(-dy, dz);
    }

  // ---------- parede do fundo azulejada (rodapé, faixa, cornija, pilastras) ----------
  // com o vão da saída: a escada que sobe até a porta da rua (G0..G1, GH de altura)
  const EX = cfg.exitX, G0 = EX - .9, G1 = EX + .9, GH = 2.6;
  const corrido = fn => { for (const [a, b] of [[-15, G0], [G1, 15]]) fn(b - a, (a + b) / 2); }; // de ponta a ponta, menos o vão
  corrido((w, cx) => box(w, 5.5, .3, cfg.parede, cx, 2.5, 4.15));
  box(G1 - G0, 5.25 - GH, .3, cfg.parede, EX, (GH + 5.25) / 2, 4.15);                // sobre o vão
  corrido((w, cx) => box(w, .9, .36, DARK2, cx, .45, 3.99));                          // rodapé/wainscot
  corrido((w, cx) => lite(w, .34, .03, cfg.faixa, cx, 1.15, 3.98));                   // faixa lisa de azulejo
  box(30, .2, .5, LIGHT2, 0, 3.05, 4.0);             // cornija no topo
  for (let ty = 1.6; ty < 3.0; ty += .46) {          // juntas h
    if (ty < GH) corrido((w, cx) => box(w, .02, .02, DARK2, cx, ty, 3.965));
    else box(30, .02, .02, DARK2, 0, ty, 3.965);
  }
  for (let tx = -13.5; tx <= 13.5; tx += 1.15)       // juntas v
    if (tx < G0 - .05 || tx > G1 + .05) box(.02, 1.5, .02, DARK2, tx, 2.25, 3.965);
  for (const px of [-12, -8, -4, 4, 8, 12]) box(.5, 3.0, .55, LIGHT2, px, 1.5, 4.0);       // pilastras (o centro fica livre para o mapa)

  // painéis de anúncio iluminados entre as pilastras (o do lado da saída dá lugar ao vão)
  for (const px of [-10, -6, 10, 6]) {
    if (px === EX) continue;
    box(2.5, 1.7, .12, DARK2, px, 1.9, 3.9);
    lite(2.2, 1.44, .03, px % 4 === 0 ? NAVY : AD, px, 1.9, 3.83);
  }

  // ---------- a saída: escada subindo até o patamar e a porta da rua ----------
  for (const k of [-1, 1]) box(.12, GH, .42, LIGHT2, EX + k * .96, GH / 2, 4.08);    // batentes do vão
  box(2.04, .14, .42, LIGHT2, EX, GH + .07, 4.08);                                    // verga
  // placa SAÍDA na faixa livre entre a verga (até 2.74) e a cornija (de 2.95), senão as duas a cobrem
  box(1.3, .19, .04, DARK2, EX, 2.845, 3.98);
  const saida = placa(cfg.saidaTxt, cfg.acento, 1.2, .16);
  saida.position.set(EX, 2.845, 3.955);
  saida.rotation.y = Math.PI;
  const PZ0 = 4.3, PZ1 = 8.3, PZ2 = 9.9, TOPO = 2.4, NS = 12, SD = (PZ1 - PZ0) / NS;
  for (const k of [-1, 1]) box(.2, 6.2, PZ2 - PZ0 + .2, cfg.parede, EX + k * 1.0, 2.6, (PZ0 + PZ2) / 2);  // paredes da escada
  box(2.2, .2, PZ2 - PZ0 + .2, DARK2, EX, 5.4, (PZ0 + PZ2) / 2);                      // teto
  for (let i = 0; i < NS; i++) {                                                       // degraus maciços
    const top = (i + 1) * TOPO / NS, z = PZ0 + SD * i;
    box(1.8, top, SD, FLOOR, EX, top / 2, z + SD / 2);
    lite(1.8, .012, .05, cfg.acento, EX, top + .006, z + .03);                         // fita no focinho do degrau
  }
  box(1.8, TOPO, PZ2 - PZ1, FLOOR, EX, TOPO / 2, (PZ1 + PZ2) / 2);                     // patamar
  const corr = Math.hypot(PZ1 - PZ0, TOPO);
  for (const k of [-1, 1]) {                                                           // corrimãos acompanhando a escada
    const c = box(.05, .05, corr, cfg.acento, EX + k * .86, .9 + TOPO / 2, (PZ0 + PZ1) / 2);
    c.rotation.x = Math.atan2(-TOPO, PZ1 - PZ0);
  }
  lite(.3, .03, PZ2 - PZ0 - .4, GLOW, EX, 5.29, (PZ0 + PZ2) / 2);                      // luz corrida no teto
  pointLight(.45, 8, EX, 4.3, 7.4);
  box(1.8, .5, PZ0 - 3.85, FLOOR, EX, -.25, (3.85 + PZ0) / 2);                        // chão sob o vão
  // no patamar, o vestíbulo para a rua: o mesmo cômodo existe no fim da escada da rua, e a cena
  // troca lá dentro, com a porta de trás fechada (sem tela escura)
  box(1.8, .3, .2, cfg.parede, EX, TOPO + 2.85, PZ2);                                 // fecha acima do vestíbulo
  const saidaVest = vestibulo({
    x: EX, y: TOPO, z: PZ2 + 1, yaw: 0, lado: 'P', outro: [cfg.rua, 'metro'], estilo: 'metro',
    arrive: nav.entry === 'rua' ? (nav.rel || true) : null,
  });
  walkOf(G0, 3.3, G1, PZ2 - .15);
  const elevFn = (x, z) => {
    if (x < G0 || x > G1 || z < PZ0) return 0;
    if (z >= PZ1) return TOPO;
    return Math.min(TOPO, TOPO / NS * (.5 + (z - PZ0) / SD)); // pelo meio de cada degrau
  };
  // letreiros "M" repetidos na parede
  function mSign(x) {
    const g = grp(x, 2.0, 3.86);
    box(.9, .66, .1, DARK2, 0, 0, 0, g);
    lite(.7, .5, .04, BLUE, 0, 0, -.06, g);
    lite(.1, .38, .03, GLOW, -.21, 0, -.09, g);
    lite(.1, .38, .03, GLOW, .21, 0, -.09, g);
    const a = lite(.08, .3, .03, GLOW, -.1, .08, -.09, g); a.rotation.z = .74;
    const b = lite(.08, .3, .03, GLOW, .1, .08, -.09, g); b.rotation.z = -.74;
  }
  mSign(-2); mSign(2);
  // painel indicador de próximo trem (pendurado)
  // (a abóbada passa a ~4.4 em z=1.4: as hastes vão até ela, senão o painel flutua)
  const ind = grp(0, 3.15, 1.4);
  box(3.0, .7, .12, DARK2, 0, 0, 0, ind);
  box(.05, 1.0, .05, DARK2, -1.1, .85, 0, ind); box(.05, 1.0, .05, DARK2, 1.1, .85, 0, ind);
  // o letreiro diz o que está acontecendo: aguardando, chegando, embarque
  const indCv = document.createElement('canvas');
  indCv.width = 512; indCv.height = 84;
  const indTex = new THREE.CanvasTexture(indCv);
  indTex.colorSpace = THREE.SRGBColorSpace;
  const indTela = new THREE.Mesh(new THREE.PlaneGeometry(2.7, .44), new THREE.MeshBasicMaterial({ map: indTex }));
  indTela.position.z = .07;
  ind.add(indTela);
  let indMsg = null;
  function letreiro(msg, aceso) {
    const key = msg + aceso;
    if (key === indMsg) return;
    indMsg = key;
    const c = indCv.getContext('2d');
    c.fillStyle = '#263848'; c.fillRect(0, 0, 512, 84);
    c.fillStyle = aceso ? '#dde8e9' : '#3aa2ea';
    c.font = '58px VT323, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(msg, 256, 44);
    indTex.needsUpdate = true;
  }
  letreiro('PRÓXIMO TREM', false);
  anim(t => {
    const st = painelDoTrem(sceneName);
    if (st === 'chegando') letreiro('CHEGANDO', Math.floor(t * 2.5) % 2 === 0);
    else if (st === 'embarque') letreiro('EMBARQUE', true);
    else letreiro('PRÓXIMO TREM', false);
  });

  // ---------- bocas de túnel com anéis recuando na escuridão ----------
  // o lado que segue para a outra estação não tem fundo: o túnel continua (linha.js)
  const ladoDaLinha = sceneName === 'plataforma' ? -1 : 1;
  for (const s of [-1, 1]) {
    // parede-portal com um vão do tamanho do trem
    box(.4, 5.6, 4.2, LIGHT, s * 14.6, 2.4, 2.0);        // parede da ponta (lado plataforma)
    box(.4, 1.5, 2.6, DARK2, s * 14.6, 3.75, -1.35);     // acima do vão (deixa o trem passar)
    box(.4, 5.6, .9, LIGHT, s * 14.6, 2.4, -3.05);       // fecha atrás do trilho
    // o túnel de verdade: casca oca, nervuras e luzinhas recuando na névoa, trilhos seguindo até o
    // fundo escuro (antes eram anéis maciços: de frente, uma placa chapada, e o trem atravessava uma parede)
    const L = 15.2, cx = s * (14.8 + L / 2), RIB = mix(DARK2, LIGHT, .22);
    box(L, 4.6, .2, DARK2, cx, .9, -2.85);                // parede do fundo
    box(L, 4.6, .2, DARK2, cx, .9, .15);                  // parede do lado da plataforma
    box(L, .2, 3.2, DARK2, cx, 3.2, -1.35);               // teto
    box(L, .5, 3.2, DARK2, cx, -1.17, -1.35);             // chão (um tico abaixo do balastro da estação)
    if (s !== ladoDaLinha) box(.2, 4.6, 3.2, DARK, s * 30, .9, -1.35);   // o fundo (do lado de lá o túnel segue)
    for (const rz of [-.85, -1.75]) box(14, .1, .12, LIGHT2, s * 23, -.79, rz);       // trilhos seguem
    box(14, .12, .16, NAVY, s * 23, -.64, -2.25);                                       // terceiro trilho
    for (let sx = 16.2; sx < 29.5; sx += .78) box(.28, .1, 1.55, DARK, s * sx, -.86, -1.3); // dormentes
    for (let r = 0; r < 7; r++) {
      const rx = s * (15.6 + r * 2);
      box(.25, .2, 3.0, RIB, rx, 3.02, -1.35);                                          // nervura do teto
      for (const rz of [-2.7, .0]) box(.25, 4.0, .12, RIB, rx, 1.0, rz);               // nervuras laterais
      lite(.1, .1, .06, GLOW, rx, 2.3, -2.62);                                          // luzinha de serviço
    }
  }

  // ---------- luminárias: pendentes quentes + point lights ----------
  for (let lx = -10; lx <= 10; lx += 4) {
    box(.06, .84, .06, DARK2, lx, 4.18, .6);           // haste até a abóbada (~4.6 em z=.6)
    lite(1.4, .12, .5, GLOW, lx, 3.72, .6);            // luminária
    pointLight(.34, 15, lx, 3.4, .8);
  }
  pointLight(.3, 10, 0, .6, -.6, mix(BLUE, GLOW, .5));
  // um fluorescente piscando, ao fundo (atmosfera)
  box(.06, .84, .06, DARK2, 12, 4.18, .6);
  const flick = lite(1.4, .12, .5, GLOW, 12, 3.72, .6);
  anim(t => { flick.visible = !(Math.sin(t * 22) > .7 && Math.sin(t * 3.3) > .2); });

  // ---------- colunas na borda da plataforma (base, fuste, capitel, uplight) ----------
  for (const cx of [-11, -7, -3.4, 3.4, 7, 11]) {
    box(.62, .2, .62, DARK2, cx, .1, .75);             // base
    box(.4, 3.0, .4, LIGHT2, cx, 1.6, .75);            // fuste
    box(.58, .22, .58, LIGHT2, cx, 3.15, .75);         // capitel
    lite(.09, 2.2, .09, cfg.acento, cx, 1.9, .56);     // veio de luz
    blockOf(cx - .32, .45, cx + .32, 1.05);
  }

  // ---------- mobiliário: bancos, lixeira, máquina, mapa, relógio ----------
  function banco(x) {
    const g = grp(x, 0, 3.35);
    box(2.2, .1, .58, LIGHT2, 0, .46, 0, g);
    box(2.2, .55, .09, LIGHT2, 0, .74, .26, g);
    for (const bx of [-.9, .9]) box(.1, .46, .52, DARK2, bx, .23, 0, g);
    blockOf(x - 1.15, 3.05, x + 1.15, 3.6);
    return g;
  }
  const b1 = banco(cfg.bancos[0]), b2 = banco(cfg.bancos[1]);
  // o boneco sentado tem origem no chão (coxas a .47 = o assento); de costas para o encosto, olhando os trilhos
  // (de noite a estação esvazia: sobra um só, no banco)
  for (const [b, x] of night ? [[b2, .5]] : [[b1, -.5], [b2, .5]]) { const p = person(true, BLUE, b); p.position.set(x, 0, .1); p.rotation.y = Math.PI; }
  // passageiros em pé esperando o trem
  if (!night) {
    const w1 = person(false); w1.position.set(-3.5, 0, 1.3); w1.rotation.y = .1; blockOf(-3.8, 1.0, -3.2, 1.6);
    const w2 = person(false); w2.position.set(5.5, 0, 1.5); w2.rotation.y = -.2; blockOf(5.2, 1.2, 5.8, 1.8);
  }
  // lixeira
  box(.5, .8, .5, DARK2, -11.5, .4, 2.8); box(.56, .1, .56, DARK2, -11.5, .82, 2.8); blockOf(-11.8, 2.5, -11.2, 3.1);
  // máquina de bilhetes (caixa iluminada)
  const maq = grp(11.6, 0, 2.9);
  box(1.0, 1.9, .7, LIGHT2, 0, .95, 0, maq);
  lite(.7, .8, .05, NAVY, 0, 1.25, .36, maq);
  lite(.5, .12, .05, BLUE, 0, .6, .36, maq);
  blockOf(11.0, 2.5, 12.2, 3.3);
  // mapa da rede (painel emoldurado)
  box(2.4, 1.5, .1, DARK2, 0, 1.7, 3.92);
  lite(2.1, 1.2, .03, AD, 0, 1.7, 3.86);
  for (const [lx1, ly1, lx2, ly2, c] of [[-.8, .3, .7, -.2, BLUE], [-.6, -.4, .8, .35, GLOW], [-.9, -.05, .9, -.05, LIGHT]]) { // linhas da rede
    const len = Math.hypot(lx2 - lx1, ly2 - ly1);
    const ln = lite(len, .045, .02, c, (lx1 + lx2) / 2, 1.7 + (ly1 + ly2) / 2, 3.84);
    ln.rotation.z = Math.atan2(ly2 - ly1, lx2 - lx1);
  }
  // relógio, acima do mapa e abaixo da cornija (antes ficava metido nela)
  const rel = grp(0, 2.69, 3.9);
  box(.5, .5, .1, DARK2, 0, 0, 0, rel);
  lite(.38, .38, .03, GLOW, 0, 0, -.06, rel);
  box(.03, .16, .02, DARK2, 0, .06, -.09, rel);
  box(.12, .03, .02, DARK2, .05, 0, -.09, rel);

  // desceu a escada da rua: no patamar; sem entrada: esperando o trem na plataforma
  const spawn = nav.entry === 'rua' ? (saidaVest.spawn || { x: EX, z: 9.4, yaw: 0 }) : { x: -1.2, z: 2.7, yaw: 0 };
  return { spawn, caption: sceneCaption(sceneName), auto: null, elevFn };
}
