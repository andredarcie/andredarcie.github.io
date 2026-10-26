import * as THREE from 'three';
import { easeInOut } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { WOOD_MATERIALS, LOG_RADIUS } from './WoodMaterials.js';
import { addVerticalShade } from './Shading.js';
import { weaponModel, BOLT_Y, BOLT_X, bowModel, bowString, stringTo, BOW } from './WeaponModels.js';
import { TUPI } from '../config/mission.js';
import { TOOLS } from '../config/rts.js';

const HIP_HEIGHT = 5.4;
const SHOULDER_HEIGHT = 11.2;
// Coxa e canela do mesmo tamanho: o joelho fica no meio da perna. Braço e
// antebraço idem, com o cotovelo no meio.
const THIGH = 2.7;
const SHIN = 2.7;
const UPPER_ARM = 2.8;
// A mão (e o que ela segura) fica a esta distância do cotovelo.
const HAND_OFFSET = -2.6;
// O pescoço: tudo o que é cabeça (olho, cabelo, chapéu, barba) gira em volta daqui.
const NECK_Y = 11.4;
// Altura para erguer o corpo deitado: metade da cabeça, a parte mais grossa, para
// nada afundar no chão quando ele tomba de costas em volta dos pés.
const LYING_LIFT = 2.6;
// Altura do centro da barriga da gravidez: a metade de baixo do tronco.
const BELLY_HEIGHT = 7.6;

// Tronco afunilado: cintura mais estreita que os ombros, a silhueta deixa de ser
// um tijolo.
function taperedTorso() {
  const geometry = new THREE.BoxGeometry(5.6, 6, 3.2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) > 0) continue;
    position.setX(i, position.getX(i) * .84);
    position.setZ(i, position.getZ(i) * .9);
  }
  geometry.computeVertexNormals();
  return addVerticalShade(geometry, .82, 1.06);
}

// Bichos nascem e morrem sem parar. Geometria e material que não mudam ficam aqui,
// criados uma vez e compartilhados por todos; só a cor do corpo e da roupa é por
// indivíduo, e essa é descartada quando o bicho sai.
// Os blocos do corpo levam o degradê de sombra (Shading): pé e barra da roupa um
// pouco mais escuros, ombro e cocuruto mais claros — dá volume sem luz extra.
const SHAPES = {
  // Cada segmento tem a geometria deslocada para que (0,0,0) caia na articulação de
  // cima (quadril, joelho, ombro, cotovelo): gira pendurado nela, não no meio.
  // Os segmentos se sobrepõem um pouco, para o joelho e o cotovelo dobrados não
  // abrirem fresta.
  thigh: addVerticalShade(new THREE.BoxGeometry(2.4, 3, 2.4).translate(0, -1.35, 0), .8, 1),
  shin: addVerticalShade(new THREE.BoxGeometry(2.2, 2.9, 2.2).translate(0, -1.3, 0), .66, .92),
  // Pé com a ponta para a frente; a origem é o tornozelo.
  foot: addVerticalShade(new THREE.BoxGeometry(2.3, 1, 3.5).translate(0, -.05, .55), .7, 1),
  torso: taperedTorso(),
  upperArm: addVerticalShade(new THREE.BoxGeometry(1.8, 3, 2.2).translate(0, -1.4, 0), .86, 1.04),
  forearm: addVerticalShade(new THREE.BoxGeometry(1.7, 2.9, 2).translate(0, -1.3, 0), .8, .98),
  head: addVerticalShade(new THREE.BoxGeometry(5, 5, 5), .86, 1.08),
  hair: addVerticalShade(new THREE.BoxGeometry(5.4, 1.4, 5.4), .85, 1.12),
  braid: addVerticalShade(new THREE.BoxGeometry(4.2, 4.4, 1.2), .75, 1.05),
  // Barriga da gravidez: um bloco que cresce para a frente do tronco.
  belly: addVerticalShade(new THREE.BoxGeometry(4.6, 4.2, 3.2), .78, 1.04),
  eye: new THREE.BoxGeometry(.9, 1.1, .3),
  // Nariz: um tico de volume na frente do rosto, que dá direção ao olhar.
  nose: addVerticalShade(new THREE.BoxGeometry(.8, 1.1, .7), .9, 1)
};
const HAIR_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.hair, vertexColors: true });
// Olho é o que faz o boneco parecer vivo de perto: dois pontinhos escuros na frente
// da cabeça, que piscam, fecham no sono e apertam no choro.
const EYE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x26201a });
// Medidas da cabeça a partir do pescoço.
const HEAD_Y = 14 - NECK_Y;
const EYE_HEIGHT = 14.5 - NECK_Y;
const EYE_SPREAD = 1.15;
// Um pouco à frente da face da cabeça (meia-largura 2,5) para não brigar no z-buffer.
const EYE_DEPTH = 2.55;
// Calçado: alpercata de couro cru no sertão, botina preta na tropa.
const SANDAL_COLOR = '#5a3e26';
const BOOT_COLOR = '#211b17';
const CARRIED_LOG_SHAPE = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 11, 8).rotateX(Math.PI / 2);
// Feixe de mandioca colhida, abraçado na frente até a igreja: raízes compridas de
// casca parda (grossas num lado, afinando no outro), o miolo branco à mostra no
// corte, o pé da rama cortada e um resto de folha, amarrados com embira.
const ROOT_SHAPE = addVerticalShade(new THREE.CylinderGeometry(.2, .58, 5.8, 7).rotateZ(Math.PI / 2), .8, 1.08);
const ROOT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a5232, vertexColors: true });
const ROOT_CUT_SHAPE = new THREE.CylinderGeometry(.5, .5, .14, 7).rotateZ(Math.PI / 2);
const ROOT_CUT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xeee3c8 });
const RAMA_SHAPE = new THREE.BoxGeometry(.26, 2.6, .26).translate(0, 1.3, 0);
const RAMA_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8b7a66 });
const RAMA_LEAF_SHAPE = new THREE.BoxGeometry(.5, 1.7, .1).translate(0, .85, 0);
const RAMA_LEAF_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x55743a });
const TIE_SHAPE = new THREE.BoxGeometry(.3, 1.9, 1.9);
const TIE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9a7a4a });
// Machado: cabo de madeira saindo da mão e cabeça de ferro de lado, com o fio
// virado para o sentido do golpe. Geometria deslocada para a origem cair na mão.
const AXE_HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa0784a });
// Maço de pau para a obra: cabo curto e cabeça grossa de madeira.
const MALLET_HANDLE_SHAPE = new THREE.BoxGeometry(.6, 6, .6).translate(0, -2.2, 0);
const MALLET_HEAD_SHAPE = addVerticalShade(new THREE.BoxGeometry(1.8, 1.8, 3.2).translate(0, -5.3, 0), .8, 1.05);
const MALLET_HEAD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a5534, vertexColors: true });
// Armas de briga, na mão direita como o machado: porrete de madeira com a ponta
// grossa e lança comprida com ponta de pedra lascada (a mão segura no primeiro terço).
// Ferida aberta: talho vermelho-escuro por cima do corpo (e da roupa).
const WOUND_SHAPE = new THREE.BoxGeometry(1.7, 1.1, .3);
const WOUND_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a0a10 });
// Toco do pescoço de quem perdeu a cabeça.
const STUMP_SHAPE = new THREE.BoxGeometry(2.6, .9, 2.6);
const STUMP_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8e1016 });
// As armas (fuzil Mannlicher, bacamarte de pederneira, facão, sabre, chuço, porrete,
// machado) moram em WeaponModels.js; aqui só o latão das peças da recarga.
const BRASS_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9a7a3c });
// Quais armas se empunham como fuzil (na horizontal, mirando) e quais como lâmina.
const LONG_ARMS = new Set(['rifle', 'bayonet', 'blunderbuss', 'spear']);
// A recarga, peça por peça. No fuzil de ferrolho (Mannlicher/Comblain da tropa): a
// alavanca do ferrolho, do lado direito da caixa da culatra, que gira para cima, corre
// para trás e volta; a cápsula vazia que salta; e o pente de 5 balas que a mão traz da
// cartucheira. No bacamarte de carregar pela boca: o polvarinho, a bucha e a vareta.
// Como na vida real: a mão esquerda segura a arma e a direita faz a manobra.
//
// No referencial da arma: o cano para -y (a origem é o punho da coronha, onde a mão
// direita segura), a coronha para +y e o "em cima" da arma para +z.
// Onde as mãos pegam na arma (referencial da arma).
const GRIP_POINT = [0, 0, -.5];            // o punho da coronha (a mão direita, por baixo da linha)
const FOREND = { rifle: [0, -4.2, -.5], blunderbuss: [0, -3.6, -.55] };   // o guarda-mão (a esquerda)
const RECEIVER_TOP = [0, -1.4, .9];        // a boca da caixa da culatra, por onde entra o pente
const MUZZLE = { rifle: [0, -10.8, 0], blunderbuss: [0, -9.1, 0] };
// Da coronha encostada no ombro até o punho, ao longo da arma.
const BUTT_TO_GRIP = 3.6;
// O vão do ombro direito na mira e a arma baixa para mexer na culatra (atravessada no
// peito, boca para a frente e para a esquerda, coronha sob o braço direito), no
// referencial do corpo; e o giro do corpo (de lado, o ombro esquerdo para o alvo). Os
// braços do boneco são curtos: de frente a mão esquerda não chegaria ao guarda-mão.
// Com a coronha em x = 3.4 a linha do cano passa rente ao lado do rosto.
const BUTT_AIM = new THREE.Vector3(3.4, 12.3, .9);
const BUTT_LOW = new THREE.Vector3(2.5, 9.8, .6);
const LOW_DIR = new THREE.Vector3(-.85, .1, .52).normalize();
const YAW_AIM = 1.05, YAW_LOW = .55;
// Para onde cada cotovelo dobra: o direito para fora e para baixo, o esquerdo por baixo.
const POLE_RIGHT = new THREE.Vector3(1, -.6, -.2).normalize();
const POLE_LEFT = new THREE.Vector3(-.15, -1, .1).normalize();
const UP = new THREE.Vector3(0, 1, 0), FORWARD = new THREE.Vector3(0, 0, 1), DOWN = new THREE.Vector3(0, -1, 0);
// Onde fica a cartucheira (na frente do cinturão, do lado direito), no corpo.
const POUCH = new THREE.Vector3(2.2, 6.6, 2.1);
// Temporários das contas (nada é alocado por quadro).
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _e = new THREE.Vector3();
const _t = new THREE.Vector3(), _u = new THREE.Vector3(), _gx = new THREE.Vector3(), _gy = new THREE.Vector3();
const _gz = new THREE.Vector3(), _hr = new THREE.Vector3(), _hl = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _gun = new THREE.Matrix4(), _dir = new THREE.Vector3(), _butt = new THREE.Vector3(), _grip = new THREE.Vector3();
const _gd = new THREE.Vector3();           // a direção do cano (não é tocada pelo #solveArm)
const CASE_SHAPE = new THREE.BoxGeometry(.32, .7, .32);
const CLIP_SHAPE = new THREE.BoxGeometry(.8, 1.5, .45).translate(0, -.4, 0);
const RAMROD_SHAPE = new THREE.BoxGeometry(.2, 8.5, .2).translate(0, -3.6, 0);
const HORN_SHAPE = new THREE.ConeGeometry(.6, 2.6, 7).translate(0, -1.1, 0);
const WAD_SHAPE = new THREE.BoxGeometry(.6, .6, .6);
const HORN_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xd8c8a2 });
const WAD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xcdb88a });
const RAMROD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
// Cada quanto do ciclo: sobe uma curva suave entre a e b (0 antes, 1 depois).
const span = (t, a, b) => easeInOut(Math.max(0, Math.min(1, (t - a) / (b - a))));
const mixTo = (from, to, k) => from + (to - from) * k;
// Mão na ponta do antebraço (que é manga), da cor da pele.
const HAND_SHAPE = addVerticalShade(new THREE.BoxGeometry(1.9, 1.5, 2.2).translate(0, -3.3, 0), .85, 1.05);

// O traje, tudo escondido até `equip` ligar o de cada um:
// chapéu de couro de vaqueiro (aba curta e copa baixa), chapéu de palha de aba larga,
// quepe do Exército (copa, faixa e pala; a faixa dourada é do oficial) e o lenço das
// mulheres; a saia comprida; o camisolão azul de Antônio Conselheiro, que desce até
// os pés, com a barba longa, o cabelo comprido e o bordão; o gibão de couro do
// vaqueiro; a cartucheira cruzada do jagunço; o correame e a mochila com o cobertor
// enrolado do soldado; e o canhão Krupp que a guarnição empurra.
const LOOK_SHAPES = {
  brimLeather: addVerticalShade(new THREE.CylinderGeometry(4.4, 4.4, .5, 12), .8, 1.1),
  crownLeather: addVerticalShade(new THREE.CylinderGeometry(2.6, 3, 2.6, 10), .82, 1.12),
  brimStraw: new THREE.CylinderGeometry(5.6, 5.6, .35, 14),
  crownStraw: addVerticalShade(new THREE.CylinderGeometry(2.5, 2.9, 2.2, 10), .85, 1.1),
  kepi: addVerticalShade(new THREE.CylinderGeometry(2.55, 2.9, 3.2, 12), .85, 1.12),
  kepiBand: new THREE.CylinderGeometry(2.95, 2.95, .8, 12),
  visor: new THREE.BoxGeometry(3.6, .35, 1.8),
  scarf: addVerticalShade(new THREE.BoxGeometry(5.6, 2.6, 5.7), .85, 1.1),
  scarfTail: new THREE.BoxGeometry(3.4, 3.2, .6),
  skirt: addVerticalShade(new THREE.BoxGeometry(5.8, 5.6, 4), .7, 1.04),
  robe: addVerticalShade(new THREE.BoxGeometry(6, 6.4, 4.2), .7, 1.04),
  beard: addVerticalShade(new THREE.BoxGeometry(4.4, 7, 1.4), .75, 1.05),
  hairSide: new THREE.BoxGeometry(.8, 5.4, 4.6),
  longHair: new THREE.BoxGeometry(5.4, 6.4, 1.2),
  staff: new THREE.BoxGeometry(.7, 21, .7).translate(0, 5, 0),
  gibao: addVerticalShade(new THREE.BoxGeometry(6, 6.2, 3.6), .75, 1.06),
  strap: new THREE.BoxGeometry(.9, 8.2, .35),
  waistBelt: new THREE.BoxGeometry(5.9, .9, 3.5),
  pouch: new THREE.BoxGeometry(1.4, 1.2, .8),
  pack: addVerticalShade(new THREE.BoxGeometry(4.4, 4, 1.8), .75, 1.05),
  bedroll: new THREE.CylinderGeometry(.9, .9, 5.4, 8).rotateZ(Math.PI / 2),
  wheel: new THREE.CylinderGeometry(3.2, 3.2, .8, 12).rotateZ(Math.PI / 2),
  carriage: addVerticalShade(new THREE.BoxGeometry(2.6, 1.6, 7), .7, 1.05),
  gunBarrel: new THREE.CylinderGeometry(.9, 1.2, 9, 10).rotateX(Math.PI / 2),
  // A listra carmesim na costura de fora da calça da tropa.
  stripe: new THREE.BoxGeometry(.35, 2.7, .7).translate(0, -1.35, 0),
  satchel: addVerticalShade(new THREE.BoxGeometry(1.2, 2.6, 2.4), .8, 1.05),
  // Carro de bois: rodas maciças de madeira, a mesa, a carga e os bois de canga.
  cartWheel: new THREE.CylinderGeometry(3.4, 3.4, .9, 12).rotateZ(Math.PI / 2),
  cartBed: addVerticalShade(new THREE.BoxGeometry(6.6, 1.2, 10), .75, 1.05),
  cartRail: new THREE.BoxGeometry(.5, 2.2, 10),
  cargo: addVerticalShade(new THREE.BoxGeometry(2.6, 2.2, 2.8), .8, 1.08),
  beam: new THREE.BoxGeometry(.7, .7, 10),
  oxBody: addVerticalShade(new THREE.BoxGeometry(3.6, 4.2, 8), .72, 1.06),
  oxHead: addVerticalShade(new THREE.BoxGeometry(2.4, 2.4, 3), .8, 1.05),
  oxLeg: new THREE.BoxGeometry(1, 3.4, 1),
  horn: new THREE.BoxGeometry(2.8, .6, .6),
  yoke: new THREE.BoxGeometry(9.5, .9, .9)
};
// Várias formas fundidas numa geometria só (posição e normal): o diadema de penas, o
// cabelo aparado, a roda de penas de ema, a canoa — muito pedaço, uma chamada de desenho.
function fused(geometries) {
  const parts = geometries.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) {
    position.set(g.attributes.position.array, o * 3);
    normal.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.computeBoundingSphere();
  return out;
}

// O corpo dos tupinambás (missão de antes de 1500), feito uma vez e compartilhado:
// as "cascas" de pintura, um tico maiores que cada bloco do corpo, que pintam de
// jenipapo o tronco, os braços e as pernas conforme o lavor de cada um; o rosto de
// urucum; o cabelo aparado com a testa rapada; o diadema de penas e a carapuça; a
// pedra do beiço; o colar de búzios; a roda de penas de ema das ancas; os tapacurás;
// o maracá; o pavês; os riscos de quem tomou nomes; e a igara.
const TUPI_SHAPES = TUPI ? (() => {
  const shell = (w, h, d, y) => new THREE.BoxGeometry(w, h, d).translate(0, y, 0);
  const diadem = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2;
    diadem.push(new THREE.BoxGeometry(.55, 2.6 - (i % 2) * .5, .14).translate(0, 1.3, 0).rotateX(-.28)
      .rotateY(a).translate(Math.sin(a) * 2.62, 0, Math.cos(a) * 2.62));
  }
  diadem.push(new THREE.TorusGeometry(2.62, .24, 4, 18).rotateX(Math.PI / 2));
  const rhea = [new THREE.CylinderGeometry(3.6, 3.6, .3, 18).rotateX(Math.PI / 2)];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    rhea.push(new THREE.BoxGeometry(.7, 2.2, .2).translate(0, 4.3, 0).rotateZ(a));
  }
  return {
    torsoShell: taperedTorso().scale(1.03, 1.01, 1.07),
    band: shell(5.75, .6, 3.4, 0),
    bandLow: shell(5.05, .6, 3.15, 0),
    half: shell(2.9, 6.05, 3.4, 0),
    thigh: shell(2.55, 3.05, 2.55, -1.35),
    shin: shell(2.35, 2.95, 2.35, -1.3),
    upperArm: shell(1.95, 3.05, 2.35, -1.4),
    forearm: shell(1.85, 2.95, 2.15, -1.3),
    face: new THREE.BoxGeometry(4.7, 1.25, .12),
    crop: fused([
      new THREE.BoxGeometry(5.25, 1.3, 3.9).translate(0, 4.95, -.75),
      new THREE.BoxGeometry(5.3, 2.8, .55).translate(0, 3.7, -2.55),
      new THREE.BoxGeometry(.45, 1.5, 3.4).translate(-2.62, 4.1, -.8),
      new THREE.BoxGeometry(.45, 1.5, 3.4).translate(2.62, 4.1, -.8)
    ]),
    diadem: fused(diadem),
    cap: new THREE.SphereGeometry(2.9, 12, 6, 0, Math.PI * 2, 0, Math.PI * .56).scale(1, .95, 1),
    capBand: new THREE.TorusGeometry(2.78, .32, 4, 18).rotateX(Math.PI / 2),
    tembeta: new THREE.BoxGeometry(.6, .6, .55),
    necklace: new THREE.TorusGeometry(2.3, .3, 5, 16).rotateX(Math.PI / 2).scale(1, 1, .78),
    rhea: fused(rhea),
    tapacura: shell(2.42, .8, 2.42, -.35),
    gourd: new THREE.SphereGeometry(1.05, 8, 6).scale(1, 1.15, 1),
    gourdHandle: new THREE.BoxGeometry(.4, 2.6, .4).translate(0, 1.1, 0),
    paves: addVerticalShade(new THREE.BoxGeometry(4.8, 7.6, .45), .8, 1.06),
    scar: new THREE.BoxGeometry(.18, 1.9, .1)
  };
})() : null;
// As cores fixas das peças: o pau leve do pavês, o cabaço do maracá e o risco claro
// da cicatriz (a pele que fecha por cima do corte fica mais clara).
const PAVES_COLOR = '#c8b088';
const GOURD_COLOR = '#a8803e';
const SCAR_COLOR = '#d6ae86';
// Os pontos do arco no corpo (em unidades do boneco). Atirando de lado: o corpo vira
// BOW_YAW para o ombro esquerdo apontar o alvo; a mão esquerda segura o arco quase
// esticada, e a direita puxa a corda até o queixo (BOW_ANCHOR).
const BOW_YAW = 1.32;
const BOW_REACH = 5.25;
const BOW_ANCHOR = new THREE.Vector3(1.1, 12.7, 1.5);
const POLE_DRAW = new THREE.Vector3(1, .35, -.7).normalize();
const _bowHand = new THREE.Vector3(), _bowDir = new THREE.Vector3(), _nock = new THREE.Vector3(), _rest = new THREE.Vector3();
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bm = new THREE.Matrix4(), _tip = new THREE.Vector3();
const _arrowDir = new THREE.Vector3(), _bowQ = new THREE.Quaternion();
const _bowGrip = new THREE.Vector3(), _bowTarget = new THREE.Vector3(), _follow = new THREE.Vector3();
// Onde a mão direita descansa depois de soltar a corda, na frente do peito.
const BOW_CHEST = new THREE.Vector3(1.7, 9.6, 2.3);
const DOWN_Y = new THREE.Vector3(0, -1, 0);
// A igara: casco cavado num tronco, as pontas afinando e subindo, e os remadores de
// pé ("que remam em pé vinte e trinta índios", Soares, cap. CLX). Até IGARA_SEATS
// remadores à mostra, um por guerreiro que ainda vai nela.
const IGARA_SEATS = 6;
const IGARA_LENGTH = 30;
function hullShape(width, height, length, lift) {
  const g = new THREE.BoxGeometry(width, height, length, 1, 1, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = Math.abs(p.getZ(i)) / (length / 2);
    p.setX(i, p.getX(i) * (1 - .78 * t * t));
    if (p.getY(i) < 0) p.setY(i, p.getY(i) + lift * t * t);
  }
  g.computeVertexNormals();
  return g;
}
const IGARA_SHAPES = TUPI ? {
  hull: addVerticalShade(hullShape(4.6, 2.4, IGARA_LENGTH, 1.6).translate(0, 1.2, 0), .7, 1.05),
  hollow: hullShape(3.4, .2, IGARA_LENGTH - 3, 0).translate(0, 2.32, 0),
  rower: fused([
    new THREE.BoxGeometry(1.1, 4.2, 1.2).translate(-.7, 2.6, 0), new THREE.BoxGeometry(1.1, 4.2, 1.2).translate(.7, 2.6, 0),
    new THREE.BoxGeometry(3, 3.6, 1.8).translate(0, 6.4, 0), new THREE.BoxGeometry(2.6, 2.6, 2.6).translate(0, 9.6, 0)
  ]),
  hair: new THREE.BoxGeometry(2.7, .8, 2.7).translate(0, 11.1, -.1),
  paddle: fused([new THREE.BoxGeometry(.3, 8, .3).translate(0, -2, 0), new THREE.BoxGeometry(.2, 2.6, 1.4).translate(0, -6.6, 0)])
} : null;

const lookMaterials = new Map();
function lookMaterial(color, shaded = false) {
  const key = `${color}-${shaded}`;
  if (!lookMaterials.has(key)) {
    lookMaterials.set(key, new THREE.MeshLambertMaterial({ color, vertexColors: shaded }));
  }
  return lookMaterials.get(key);
}

// Um golpe de machado lateral, em quatro tempos: levar o machado para trás girando o
// tronco devagar (preparo), descer rápido e acelerando até o impacto, o tranco do
// impacto, e voltar ao meio. O impacto cai a 68% do ciclo, igual à simulação.
function chopTwist(phase) {
  if (phase < .55) return .95 * easeInOut(phase / .55);
  if (phase < .68) {
    const q = (phase - .55) / .13;
    return .95 - 1.35 * q * q;
  }
  if (phase < .78) return -.4 + Math.sin((phase - .68) / .1 * Math.PI) * .06;
  return -.4 * (1 - easeInOut((phase - .78) / .22));
}

// Martelada: ergue o maço devagar com o cotovelo dobrado, desce rápido até a
// batida (68% do ciclo, igual à simulação) e o maço quica de leve na madeira.
function hammerLift(phase) {
  if (phase < .55) return easeInOut(phase / .55);
  if (phase < .68) {
    const q = (phase - .55) / .13;
    return 1 - q * q;
  }
  if (phase < .8) return Math.sin((phase - .68) / .12 * Math.PI) * .12;
  return 0;
}

// Quanto o quadril desce com a perna nesta dobra: a altura que a perna alcança é a
// soma das alturas da coxa e da canela, cada uma inclinada pelo próprio ângulo.
function legDrop(thigh, knee) {
  return HIP_HEIGHT - THIGH * Math.cos(thigh) - SHIN * Math.cos(thigh + knee);
}

// O boneco de blocos: montagem, roupa e poses.
export class CharacterModel {
  get hairMaterial() {
    return HAIR_MATERIAL;
  }

  // O boneco nasce sem roupa, da cor da pele; `dress` veste camisa (tronco e mangas)
  // e calça, e `equip` põe o chapéu, a saia, o camisolão e o resto do traje.
  create(hasHair) {
    const group = new THREE.Group();
    // Grupo interno para o corpo: o de fora carrega posição no mundo, rumo e tamanho,
    // e o de dentro fica livre para o gingado, sem um sobrescrever o outro.
    const body = new THREE.Group();
    group.add(body);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    const outfitMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    const trousersMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    const build = (geometry, material, x, y, z, parent = body) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    // Perna: coxa no quadril, canela no joelho, pé no tornozelo.
    const leg = side => {
      const thigh = build(SHAPES.thigh, bodyMaterial, side * 1.4, HIP_HEIGHT, 0);
      const shin = build(SHAPES.shin, bodyMaterial, 0, -THIGH, 0, thigh);
      const foot = build(SHAPES.foot, lookMaterial(SANDAL_COLOR, true), 0, -SHIN + .5, 0, shin);
      return { thigh, shin, foot };
    };
    const left = leg(-1), right = leg(1);
    const torso = build(SHAPES.torso, bodyMaterial, 0, 8.4, 0);
    const belly = build(SHAPES.belly, bodyMaterial, 0, BELLY_HEIGHT, 0);
    belly.visible = false;
    // Braço: manga de cima no ombro, antebraço no cotovelo, mão na ponta.
    const arm = side => {
      const upper = build(SHAPES.upperArm, bodyMaterial, side * 3.7, SHOULDER_HEIGHT, 0);
      const fore = build(SHAPES.forearm, bodyMaterial, 0, -UPPER_ARM, 0, upper);
      build(HAND_SHAPE, bodyMaterial, 0, 0, 0, fore);
      return { upper, fore };
    };
    const leftArm = arm(-1), rightArm = arm(1);
    const armLeft = leftArm.upper, armRight = rightArm.upper;
    const forearmLeft = leftArm.fore, forearmRight = rightArm.fore;
    // Giro em y depois do x: com o braço já erguido para a frente, o y o leva para os
    // lados no plano horizontal (a varrida do porrete). Sem y, é igual ao XYZ.
    armRight.rotation.order = 'YXZ';
    // Cabeça num pescoço que gira: olhar em volta, baixar a vista no trabalho,
    // jogar para trás no tranco. Tudo o que é da cabeça vai pendurado nele.
    const neck = new THREE.Group();
    neck.position.y = NECK_Y;
    body.add(neck);
    const head = build(SHAPES.head, bodyMaterial, 0, HEAD_Y, 0, neck);
    const nose = build(SHAPES.nose, bodyMaterial, 0, EYE_HEIGHT - 1.3, 2.75, neck);
    nose.castShadow = false;
    // Pequenos demais para projetar sombra que se veja: fora do mapa de sombra.
    const eyes = [-EYE_SPREAD, EYE_SPREAD].map(x => {
      const eye = build(SHAPES.eye, EYE_MATERIAL, x, EYE_HEIGHT, EYE_DEPTH, neck);
      eye.castShadow = false;
      return eye;
    });
    // Tudo o que sai junto quando a cabeça é arrancada.
    const headParts = [head, nose, ...eyes];
    if (hasHair) {
      headParts.push(build(SHAPES.hair, HAIR_MATERIAL, 0, 16.4 - NECK_Y, 0, neck));
      headParts.push(build(SHAPES.braid, HAIR_MATERIAL, 0, 13.4 - NECK_Y, -2.9, neck));
    }
    const stump = build(STUMP_SHAPE, STUMP_MATERIAL, 0, 11.8, 0);
    stump.visible = false;
    // O que a mão direita segura vai no antebraço, na altura da mão.
    const held = parts => {
      const holder = new THREE.Group();
      holder.position.y = HAND_OFFSET;
      for (const [shape, material] of parts) {
        const part = new THREE.Mesh(shape, material);
        part.castShadow = true;
        holder.add(part);
      }
      holder.visible = false;
      forearmRight.add(holder);
      return holder;
    };
    // Machado só à vista enquanto corta; maço só na obra. As armas (WeaponModels) são
    // réplicas peça por peça das de verdade, com a origem no punho, como as antigas.
    const model = kind => {
      const built = weaponModel(kind);
      built.group.position.y = HAND_OFFSET;
      built.group.visible = false;
      forearmRight.add(built.group);
      return built;
    };
    // O machado da lenha é o da missão: de ferro no sertão, de pedra polida na aldeia.
    const axe = model(TOOLS.axe).group;
    const mallet = held([[MALLET_HANDLE_SHAPE, AXE_HANDLE_MATERIAL], [MALLET_HEAD_SHAPE, MALLET_HEAD_MATERIAL]]);
    const rifle = model('rifle'), blunderbuss = model('blunderbuss');
    const arms = {
      club: model('club').group, spear: model('spear').group,
      rifle: rifle.group, bayonet: model('bayonet').group, blunderbuss: blunderbuss.group,
      machete: model('machete').group, saber: model('saber').group
    };
    // Na aldeia: o tacape, a ibirapema, o tição, o pau de cavar e o feixe de flechas.
    if (TUPI) for (const kind of ['tacape', 'ibirapema', 'torch', 'digger', 'arrows']) arms[kind] = model(kind).group;
    const { club, spear } = arms;
    // O ferrolho do fuzil (alavanca e bolota, do lado direito) e a cápsula que ele cospe.
    const bolt = rifle.bolt;
    const storedRod = blunderbuss.ramrod;             // a vareta no lugar dela, embaixo do cano
    const casing = new THREE.Mesh(CASE_SHAPE, BRASS_MATERIAL);
    casing.visible = false;
    arms.rifle.add(casing);
    // Na mão direita: o pente, o polvarinho, a bucha e a vareta, cada um na sua hora.
    const rightHand = new THREE.Group();
    rightHand.position.y = HAND_OFFSET - .6;
    forearmRight.add(rightHand);
    const prop = (shape, material) => {
      const mesh = new THREE.Mesh(shape, material);
      mesh.visible = false;
      rightHand.add(mesh);
      return mesh;
    };
    const reloadProps = {
      clip: prop(CLIP_SHAPE, BRASS_MATERIAL),
      horn: prop(HORN_SHAPE, HORN_MATERIAL),
      wad: prop(WAD_SHAPE, WAD_MATERIAL),
      ramrod: prop(RAMROD_SHAPE, RAMROD_MATERIAL),
      bolt, casing, storedRod
    };
    // Feridas em lugares fixos, aparecendo uma a uma: peito, barriga, braço, coxa e
    // rosto; a do braço, a da perna e a do rosto presas à peça, para mexer junto.
    const wound = (parent, x, y, z, turn = 0) => {
      const mesh = new THREE.Mesh(WOUND_SHAPE, WOUND_MATERIAL);
      mesh.position.set(x, y, z);
      mesh.rotation.z = turn;
      mesh.visible = false;
      parent.add(mesh);
      return mesh;
    };
    const wounds = [
      wound(body, 1.2, 10, 1.7, .5),
      wound(body, -1.3, 7.4, 1.6, -.4),
      wound(armLeft, 0, -1.6, 1.2, .3),
      wound(right.thigh, 0, -1.5, 1.3, -.5),
      wound(neck, -1.6, 15 - NECK_Y, 2.6, .2)
    ];
    // Tora no ombro direito, deitada para a frente, como se carrega de verdade.
    const shoulderLog = build(CARRIED_LOG_SHAPE, WOOD_MATERIALS, 3.3, 12.6, 0);
    shoulderLog.visible = false;
    // A mandioca colhida, abraçada na frente da barriga: quatro raízes de lado, as
    // pontas grossas (com o corte branco) para a direita, de onde sai a rama.
    const cassava = new THREE.Group();
    cassava.position.set(0, 8, 3.4);
    [[0, .45, .1, .06], [.15, -.5, -.08, -.1], [-.7, .1, .12, .04], [.75, 0, -.1, -.05]].forEach(([y, z, yaw, roll]) => {
      const root = build(ROOT_SHAPE, ROOT_MATERIAL, 0, y, z, cassava);
      root.rotation.set(0, yaw, roll);
      build(ROOT_CUT_SHAPE, ROOT_CUT_MATERIAL, 2.95, 0, 0, root).castShadow = false;
    });
    for (const [z, lean] of [[.25, -.35], [-.25, -.65]]) {
      const rama = build(RAMA_SHAPE, RAMA_MATERIAL, 3, .2, z, cassava);
      rama.rotation.z = lean;
      const leaf = build(RAMA_LEAF_SHAPE, RAMA_LEAF_MATERIAL, 0, 2.5, 0, rama);
      leaf.rotation.set(.5, 0, .9);
    }
    build(TIE_SHAPE, TIE_MATERIAL, 1.2, 0, 0, cassava).castShadow = false;
    cassava.visible = false;
    body.add(cassava);
    const gear = CharacterModel.#buildLook(group, body, neck, forearmLeft, [left, right]);
    gear.parts.feet = [left.foot, right.foot];
    headParts.push(...gear.head);
    group.userData = {
      bodyMaterial, outfitMaterial, trousersMaterial, body, torso, belly, neck,
      legLeft: left.thigh, legRight: right.thigh, shinLeft: left.shin, shinRight: right.shin,
      footLeft: left.foot, footRight: right.foot,
      armLeft, armRight, forearmLeft, forearmRight,
      axe, mallet, shoulderLog, cassava, eyes, club, spear, arms, wounds, headParts, stump, gear: gear.parts,
      reloadProps, bow: null, tupi: null, canoe: null
    };
    return group;
  }

  // O arco na mão esquerda (com o feixe de flechas junto, "levam na mão esquerda seu
  // arco e flechas", Soares, cap. CLV), as duas metades da corda e a flecha encaixada.
  // Feito só para quem usa arco, na hora de vestir.
  static #buildBow(view) {
    const data = view.userData;
    const group = bowModel();
    const strings = [bowString(), bowString()];
    for (const string of strings) group.add(string);
    const spare = weaponModel('arrows').group;
    spare.position.set(.35, 2, .2);
    spare.rotation.set(Math.PI, 0, 0);
    spare.scale.setScalar(.9);
    group.add(spare);
    const arrow = weaponModel('arrow').group;
    arrow.visible = false;
    data.body.add(arrow);
    group.visible = false;
    data.forearmLeft.add(group);
    data.bow = { group, strings, arrow };
  }

  // As peças do traje, todas escondidas; `equip` liga as de cada um. O canhão vai no
  // grupo de fora (não ginga com o corpo), à frente de quem empurra. O que é de
  // cabeça vai no pescoço, para girar junto com ela.
  static #buildLook(group, body, neck, forearmLeft, legs) {
    const add = (parent, shape, x, y, z) => {
      const mesh = new THREE.Mesh(LOOK_SHAPES[shape], lookMaterial(0xffffff));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.visible = false;
      parent.add(mesh);
      return mesh;
    };
    const onHead = (shape, x, y, z) => add(neck, shape, x, y - NECK_Y, z);
    const strapA = add(body, 'strap', 0, 8.6, 1.75);
    strapA.rotation.z = .62;
    const strapB = add(body, 'strap', 0, 8.6, 1.78);
    strapB.rotation.z = -.62;
    const tail = onHead('scarfTail', 0, 14.2, -3);
    tail.rotation.x = .25;
    const kepi = onHead('kepi', 0, 17.6, -.15);
    kepi.rotation.x = -.08;
    const parts = {
      brimLeather: onHead('brimLeather', 0, 16.5, 0),
      crownLeather: onHead('crownLeather', 0, 17.9, 0),
      brimStraw: onHead('brimStraw', 0, 16.5, 0),
      crownStraw: onHead('crownStraw', 0, 17.7, 0),
      kepi,
      kepiBand: onHead('kepiBand', 0, 16.6, -.1),
      visor: onHead('visor', 0, 16.25, 2.9),
      scarf: onHead('scarf', 0, 16.4, -.15),
      scarfTail: tail,
      skirt: add(body, 'skirt', 0, 3.5, 0),
      robe: add(body, 'robe', 0, 3.3, 0),
      beard: onHead('beard', 0, 10.6, 2.5),
      hairSides: [onHead('hairSide', -2.75, 13.6, -.3), onHead('hairSide', 2.75, 13.6, -.3)],
      longHair: onHead('longHair', 0, 13.2, -2.85),
      staff: add(forearmLeft, 'staff', 0, HAND_OFFSET, 0),
      gibao: add(body, 'gibao', 0, 8.5, 0),
      bandolier: strapA,
      crossStrap: strapB,
      waistBelt: add(body, 'waistBelt', 0, 6.1, 0),
      pouches: [add(body, 'pouch', -1.6, 6.1, 1.9), add(body, 'pouch', 1.6, 6.1, 1.9)],
      pack: add(body, 'pack', 0, 9.4, -2.5),
      bedroll: add(body, 'bedroll', 0, 12, -2.5),
      satchel: add(body, 'satchel', 3.1, 6.6, .4),
      // A listra corre pela coxa e pela canela, cada pedaço no seu segmento.
      stripes: legs.flatMap(({ thigh, shin }, i) => {
        const side = i ? 1 : -1;
        return [add(thigh, 'stripe', side * 1.25, 0, 0), add(shin, 'stripe', side * 1.15, 0, 0)];
      }),
      cannon: CharacterModel.#buildCannon(group),
      cart: CharacterModel.#buildCart(group)
    };
    const head = [parts.brimLeather, parts.crownLeather, parts.brimStraw, parts.crownStraw, parts.kepi,
      parts.kepiBand, parts.visor, parts.scarf, parts.scarfTail, parts.beard, parts.longHair, ...parts.hairSides];
    return { parts, head };
  }


  // Canhão de campanha: duas rodas, a carreta e o cano de bronze escurecido,
  // apontando para a frente.
  static #buildCannon(group) {
    const cannon = new THREE.Group();
    cannon.position.set(0, 0, 8.5);
    const part = (shape, color, x, y, z, shaded = false) => {
      const mesh = new THREE.Mesh(LOOK_SHAPES[shape], lookMaterial(color, shaded));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      cannon.add(mesh);
    };
    part('wheel', 0x4a3424, -3, 3.2, 0);
    part('wheel', 0x4a3424, 3, 3.2, 0);
    part('carriage', 0x5a5048, 0, 3, -1.8, true);
    part('gunBarrel', 0x5a5a4a, 0, 4.6, 2.4);
    cannon.visible = false;
    group.add(cannon);
    return cannon;
  }

  // Carro de bois do comboio de Monte Santo: a dupla de bois na canga puxando o
  // cambão, e o carro de rodas maciças carregado de sacos de farinha e caixotes de
  // munição. Vai à direita do carreiro, que anda ao lado tocando os bois.
  static #buildCart(group) {
    const cart = new THREE.Group();
    cart.position.set(7, 0, 4);
    const part = (shape, color, x, y, z, shaded = false) => {
      const mesh = new THREE.Mesh(LOOK_SHAPES[shape], lookMaterial(color, shaded));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      cart.add(mesh);
      return mesh;
    };
    for (const side of [-1, 1]) {
      part('cartWheel', 0x6b4a2c, side * 3.8, 3.4, -2);
      part('cartRail', 0x7a5532, side * 3.1, 5.4, -2);
    }
    part('cartBed', 0x8a6640, 0, 4.4, -2, true);
    part('cargo', 0xd8ccae, -1.4, 6.1, -4.2, true);
    part('cargo', 0xcbbd9c, 1.4, 6.1, -3.6, true);
    part('cargo', 0x6a5a40, 0, 6.1, .2, true);
    part('cargo', 0xd8ccae, -1, 8, -2.6, true);
    part('beam', 0x5a3c22, 0, 4, 7);
    part('yoke', 0x5a3c22, 0, 6.6, 12);
    for (const side of [-1, 1]) {
      const tone = side < 0 ? 0xb89a72 : 0x8f6e4e;
      part('oxBody', tone, side * 2.6, 6.2, 15.5, true);
      part('oxHead', tone, side * 2.6, 7.2, 20.5, true);
      part('horn', 0xe2d8c0, side * 2.6, 8.8, 20.2);
      for (const [lx, lz] of [[-1.1, 12.5], [1.1, 12.5], [-1.1, 18.5], [1.1, 18.5]]) {
        part('oxLeg', tone, side * 2.6 + lx, 1.7, lz);
      }
    }
    cart.visible = false;
    group.add(cart);
    return cart;
  }

  // Veste o traje (LOOKS, montado por UnitFactory). Uma vez só, na criação: o papel
  // de uma unidade não muda.
  equip(view, look) {
    const parts = view.userData.gear;
    if (!look) return;
    if (look.tupi) {
      CharacterModel.#equipTupi(view, look);
      return;
    }
    // Tropa de botina preta; o sertão de alpercata de couro cru.
    const boots = look.hat === 'kepi' || look.hat === 'officer';
    for (const foot of parts.feet) foot.material = lookMaterial(boots ? BOOT_COLOR : SANDAL_COLOR, true);
    const show = (mesh, color, shaded = false) => {
      mesh.visible = true;
      mesh.material = lookMaterial(color, shaded);
    };
    switch (look.hat) {
      case 'leather':
        show(parts.brimLeather, look.hatColor, true);
        show(parts.crownLeather, look.hatColor, true);
        break;
      case 'straw':
        show(parts.brimStraw, look.hatColor);
        show(parts.crownStraw, look.hatColor, true);
        break;
      case 'kepi':
      case 'officer':
        show(parts.kepi, look.hatColor, true);
        show(parts.kepiBand, look.bandColor);
        show(parts.visor, '#1a1612');
        break;
      case 'scarf':
        show(parts.scarf, look.hatColor, true);
        show(parts.scarfTail, look.hatColor);
        break;
    }
    if (look.skirt) show(parts.skirt, look.skirt, true);
    if (look.tunic) show(parts.robe, look.shirt, true);
    if (look.beard) show(parts.beard, look.hair ?? '#4a4038', true);
    if (look.longHair) {
      show(parts.longHair, look.hair ?? '#4a4038');
      for (const side of parts.hairSides) show(side, look.hair ?? '#4a4038');
    }
    if (look.staff) show(parts.staff, '#6b4a2c');
    if (look.gibao) show(parts.gibao, look.gibao, true);
    if (look.bandolier) show(parts.bandolier, '#5a3a22');
    if (look.belts) {
      show(parts.crossStrap, look.belt);
      show(parts.waistBelt, look.belt);
      for (const pouch of parts.pouches) show(pouch, look.belt);
    }
    if (look.pack) {
      show(parts.pack, '#5a5040', true);
      show(parts.bedroll, '#8a8272');
    }
    if (look.stripe) for (const stripe of parts.stripes) show(stripe, look.stripeColor ?? '#a3262a');
    if (look.satchel) show(parts.satchel, '#7a4e2c', true);
    if (look.vest) show(parts.gibao, '#4a3a2c', true);
    if (look.cannon || look.bigCannon) {
      parts.cannon.visible = true;
      // A Matadeira: o Whitworth 32, bem maior que o Krupp de campanha.
      if (look.bigCannon) parts.cannon.scale.setScalar(1.75);
    }
    if (look.cart) parts.cart.visible = true;
  }

  // O traje de um tupinambá (ou tupiniquim): pintura, penas e enfeites, por cima do
  // boneco da cor da pele. Uma vez só, na criação, como o equip de Canudos.
  static #equipTupi(view, look) {
    const data = view.userData;
    const S = TUPI_SHAPES;
    const extra = [];
    const add = (parent, shape, color, x = 0, y = 0, z = 0, shaded = false) => {
      const mesh = new THREE.Mesh(shape, lookMaterial(color, shaded));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      extra.push(mesh);
      return mesh;
    };
    const ink = look.paintColor, paint = look.paint ?? 'none';
    // Os pés tingidos de urucum ("tingem os pés de uma tinta vermelha muito fina").
    for (const foot of data.gear.feet) foot.material = lookMaterial(paint === 'none' ? look.skin : look.red, true);
    // Os lavores de jenipapo.
    const limb = (part, shape) => add(part, shape, ink);
    if (paint === 'stripes') {
      add(data.torso, S.band, ink, 0, 1.5);
      add(data.torso, S.band, ink, 0, .5);
      add(data.torso, S.bandLow, ink, 0, -1.4);
      limb(data.forearmLeft, S.forearm);
      limb(data.forearmRight, S.forearm);
    } else if (paint === 'legs') {
      limb(data.shinLeft, S.shin);
      limb(data.shinRight, S.shin);
      add(data.torso, S.bandLow, ink, 0, -2.2);
    } else if (paint === 'quartered') {
      add(data.torso, S.half, ink, -1.45, 0);
      limb(data.legLeft, S.thigh);
      limb(data.shinLeft, S.shin);
      limb(data.armRight, S.upperArm);
      limb(data.forearmRight, S.forearm);
    } else if (paint === 'full') {
      add(data.torso, S.torsoShell, ink);
      for (const part of [data.legLeft, data.legRight]) limb(part, S.thigh);
      for (const part of [data.shinLeft, data.shinRight]) limb(part, S.shin);
      for (const part of [data.armLeft, data.armRight]) limb(part, S.upperArm);
      for (const part of [data.forearmLeft, data.forearmRight]) limb(part, S.forearm);
    }
    if (paint !== 'none') add(data.neck, S.face, look.red, 0, 1.75, 2.57);
    // Cabelo: o homem aparado, de testa rapada; a mulher comprido e preto.
    if (look.hair === 'long') {
      const parts = data.gear;
      parts.longHair.visible = true;
      parts.longHair.material = lookMaterial(look.hairColor);
      for (const side of parts.hairSides) {
        side.visible = true;
        side.material = lookMaterial(look.hairColor);
      }
    } else {
      data.headParts.push(add(data.neck, S.crop, look.hairColor));
    }
    if (look.tembeta) data.headParts.push(add(data.neck, S.tembeta, look.tembeta, 0, 1.05, 2.62));
    // Penas na cabeça: o diadema, ou a carapuça "de penas amarelas e vermelhas".
    if (look.feathers === 'diadem') data.headParts.push(add(data.neck, S.diadem, look.featherColor, 0, 5.05, 0));
    if (look.feathers === 'cap') {
      const cap = add(data.neck, S.cap, look.featherColor, 0, 3.3, 0);
      cap.scale.set(1.26, 1, 1.26);
      const band = add(data.neck, S.capBand, look.enemy ? '#8a5a34' : '#c0392b', 0, 3.25, 0);
      band.scale.set(1.26, 1, 1.26);
      data.headParts.push(cap, band);
    }
    if (look.necklace) add(data.body, S.necklace, look.necklace, 0, 11.1, .15);
    if (look.enduape) add(data.body, S.rhea, look.rheaColor, 0, 7.2, -2.15);
    if (look.tapacura) for (const shin of [data.shinLeft, data.shinRight]) add(shin, S.tapacura, look.tapacura);
    if (look.maraca) {
      const maraca = new THREE.Group();
      maraca.position.y = HAND_OFFSET;
      data.forearmRight.add(maraca);
      add(maraca, S.gourdHandle, '#6b4a2c', 0, -1.2, 0).rotation.x = Math.PI;
      add(maraca, S.gourd, GOURD_COLOR, 0, -3, 0);
    }
    if (look.paves) add(data.forearmLeft, S.paves, PAVES_COLOR, 0, -1.8, 1.35, true);
    // Os riscos de quem tomou nomes: aparecem um a um (pose, `names`).
    const scars = [[-1.3, 1.3, .5], [1.1, 1, -.45], [-.2, -.1, .3], [1.5, -.8, .6], [-1.5, -1.1, -.5]].map(([x, y, turn]) => {
      const scar = add(data.torso, S.scar, SCAR_COLOR, x, y, 1.78);
      scar.rotation.z = turn;
      scar.visible = false;
      scar.castShadow = false;
      return scar;
    });
    data.tupi = { extra, scars, paves: Boolean(look.paves) };
    if (look.boat) CharacterModel.#buildCanoe(view, look);
  }

  // A igara: o casco, o vão escavado e os remadores de pé, cada um com o remo.
  static #buildCanoe(view, look) {
    const data = view.userData;
    const canoe = new THREE.Group();
    const part = (shape, color, shaded = false) => {
      const mesh = new THREE.Mesh(shape, lookMaterial(color, shaded));
      mesh.castShadow = true;
      return mesh;
    };
    canoe.add(part(IGARA_SHAPES.hull, '#5a3a22', true), part(IGARA_SHAPES.hollow, '#2a1c12'));
    const seats = [];
    for (let i = 0; i < IGARA_SEATS; i++) {
      const side = i % 2 ? 1 : -1;
      const seat = new THREE.Group();
      seat.position.set(side * .5, 1.4, -11 + i * 4.4);
      seat.add(part(IGARA_SHAPES.rower, look.skin), part(IGARA_SHAPES.hair, look.hairColor));
      const paddle = part(IGARA_SHAPES.paddle, '#6b4a2c');
      paddle.position.set(side * 2.1, 7.4, 0);
      seat.add(paddle);
      canoe.add(seat);
      seats.push({ seat, paddle, side, phase: i * .7 });
    }
    view.add(canoe);
    data.body.visible = false;
    data.canoe = { group: canoe, seats };
  }

  // A canoa a cada quadro: quantos remadores ainda vão nela (vazia, dois a levam de
  // volta), as remadas desencontradas e o balanço na água.
  syncCanoe(view, crew, elapsed, animate) {
    const canoe = view.userData.canoe;
    if (!canoe) return;
    const shown = Math.max(2, Math.min(IGARA_SEATS, crew));
    canoe.seats.forEach(({ seat, paddle, side, phase }, i) => {
      seat.visible = i < shown;
      const stroke = animate ? Math.sin(elapsed * 3.2 + phase) : 0;
      paddle.rotation.set(.75 * stroke, 0, side * (.35 + .1 * stroke));
      seat.rotation.x = .1 * stroke;
    });
    canoe.group.rotation.z = animate ? Math.sin(elapsed * 1.3 + view.id * .1) * .03 : 0;
  }

  // Peças do traje à mostra (o cadáver as esconde quando a carne desbota).
  gearParts(view) {
    const parts = view.userData.gear;
    const own = Object.values(parts).flat().filter(mesh => mesh.visible && mesh !== parts.cannon && mesh !== parts.cart);
    return view.userData.tupi ? [...own, ...view.userData.tupi.extra.filter(mesh => mesh.visible)] : own;
  }

  // Troca de pano: só mexe no material quando o estado muda de fato, porque isso roda
  // para cada bicho a cada quadro.
  // Camisa no tronco e nas mangas, calça nas pernas (sem `trousers`, a mesma cor).
  dress(view, bodyColor, outfit, trousers = null) {
    const data = view.userData;
    const { bodyMaterial, outfitMaterial, trousersMaterial, torso, belly, legLeft, legRight, shinLeft, shinRight,
      armLeft, armRight, forearmLeft, forearmRight } = data;
    bodyMaterial.color.set(bodyColor);
    const wanted = outfit ? outfitMaterial : bodyMaterial;
    if (outfit) outfitMaterial.color.set(outfit);
    const legs = outfit && trousers ? trousersMaterial : wanted;
    if (trousers) trousersMaterial.color.set(trousers);
    if (torso.material === wanted && legLeft.material === legs) return;
    // A barriga veste junto com o tronco: a roupa estica por cima dela.
    for (const part of [torso, belly, armLeft, armRight, forearmLeft, forearmRight]) part.material = wanted;
    for (const part of [legLeft, legRight, shinLeft, shinRight]) part.material = legs;
  }

  // A pose do quadro. Primeiro a base — passada, corrida ou o corpo parado
  // respirando —, depois por cima o que a unidade estiver fazendo (cortar, martelar,
  // colher, carregar, tocaia, guarda, golpe, fuga, pregação, tranco). No fim o
  // quadril desce o quanto as pernas dobraram, para o pé continuar no chão.
  pose(view, motion) {
    const data = view.userData;
    const { body, neck, legLeft, legRight, shinLeft, shinRight, footLeft, footRight,
      armLeft, armRight, forearmLeft, forearmRight, torso } = data;
    const { gait, pace, lean, bellyScale, animate, rest = 0, breath = 0, eyes = 1, seed = 0, elapsed = 0 } = motion;
    // 1 é olho aberto; fechado vira um risco fino, não some.
    for (const eye of data.eyes) eye.scale.y = Math.max(.12, eyes);
    const awake = 1 - rest;

    // ---- Passada ----
    // A coxa balança para a frente e para trás; o joelho dobra na perna que está
    // passando por baixo do corpo (é ela que precisa tirar o pé do chão) e quase
    // estica na que apoia. Correndo, tudo abre mais e o cotovelo fecha.
    const stride = animate ? Math.min(1.35, pace) * awake : 0;
    const run = Math.max(0, Math.min(1, (pace - 1) / .35)) * awake;
    const s = Math.sin(gait), c = Math.cos(gait);
    const swing = s * .6 * stride;
    const lift = 1 + run * .9;
    legLeft.rotation.set(swing, 0, 0);
    legRight.rotation.set(-swing, 0, 0);
    shinLeft.rotation.set((Math.max(0, -c) * 1.05 * lift + .1) * stride, 0, 0);
    shinRight.rotation.set((Math.max(0, c) * 1.05 * lift + .1) * stride, 0, 0);
    // Braços na fase contrária às pernas do mesmo lado, cotovelo dobrando mais
    // quando o braço vem para a frente.
    armLeft.rotation.set(-swing * .85, 0, -.35 * rest);
    armRight.rotation.set(swing * .85, 0, .35 * rest);
    const elbow = .16 + .22 * stride + .85 * run;
    forearmLeft.rotation.set(-(elbow + Math.max(0, swing) * .5), 0, 0);
    forearmRight.rotation.set(-(elbow + Math.max(0, -swing) * .5), 0, 0);
    body.position.set(0, LYING_LIFT * rest, 0);
    body.rotation.set(lean * awake - Math.PI / 2 * rest + (.05 * stride + .16 * run), 0,
      animate ? s * .045 * stride : 0);
    // A cabeça compensa a inclinação do tronco e fica olhando para a frente.
    neck.rotation.set(-(.05 * stride + .12 * run) * .7, 0, 0);
    // Peito subindo e descendo: de pé, devagar; dormindo (deitado, escala em z), fundo.
    const chest = 1 + breath * .06 * rest;
    const standingBreath = animate ? 1 + Math.sin(elapsed * 1.7 + seed) * .018 * awake : 1;
    torso.scale.set(bellyScale * standingBreath, 1, bellyScale * chest * standingBreath);
    // Quanto o pé gruda no chão: andando, metade (o resto é o quique natural da
    // passada); nas poses paradas, inteiro.
    let plant = .45;

    const { chop = null, building = false, carrying = false, carryFood = false, gathering = false,
      crouch = false, panic = false, preach = false, crying = false } = motion;
    const idle = animate && stride < .06 && awake > .5 && chop === null && !gathering && !crying &&
      !motion.guard && !crouch && !(motion.strike > 0);
    if (idle) CharacterModel.#poseIdle(view, elapsed, seed);

    if (crying) CharacterModel.#poseCrying(view, animate, elapsed);
    const { axe, mallet, shoulderLog, cassava } = data;
    const hammering = chop !== null && building;
    axe.visible = chop !== null && !building;
    mallet.visible = hammering;
    shoulderLog.visible = carrying && chop === null;
    cassava.visible = carryFood && !carrying && chop === null;
    if (hammering) { CharacterModel.#poseHammer(view, chop); plant = 1; }
    else if (chop !== null) { CharacterModel.#poseChopping(view, chop); plant = 1; }
    else if (gathering) { CharacterModel.#poseGather(view, animate ? elapsed : 0, seed); plant = 1; }
    else if (carrying) {
      // Mão direita no alto segurando a tora sobre o ombro; a esquerda balança.
      armRight.rotation.x = -2.8;
      armRight.rotation.z = -.15;
      forearmRight.rotation.x = -.35;
    } else if (cassava.visible) {
      // Feixe abraçado na frente: braços para baixo e para a frente, cotovelos
      // fechados em volta dele, e o tronco um pouco para trás contra o peso.
      for (const [upper, fore, side] of [[armLeft, forearmLeft, -1], [armRight, forearmRight, 1]]) {
        upper.rotation.x = -.55 + (upper === armLeft ? -swing : swing) * .12;
        upper.rotation.z = -side * .3;
        fore.rotation.x = -1.25;
      }
      body.rotation.x -= .06;
    }

    // Chama Primordial: braço esquerdo erguido, como quem carrega uma tocha.
    const { torch = false, strike = 0 } = motion;
    if (torch && !crying && rest < .5) {
      armLeft.rotation.x = -2.95;
      armLeft.rotation.z = .12;
      forearmLeft.rotation.x = 0;
    }
    // Briga: arma na mão, guarda alta, o golpe de cada arma e o recuo de quem apanha.
    const { weapon = null, guard = false, strikeKind = null, hurt = 0, wounds = 0, pushing = false } = motion;
    const { club, spear, arms } = data;
    for (const [kind, group] of Object.entries(arms)) group.visible = weapon === kind;
    // Toda arma começa o quadro na mão direita; na mira, no tiro e na recarga o fuzil e
    // o bacamarte passam para o corpo (#holdGun) e as mãos vão até eles.
    for (const group of Object.values(arms)) {
      if (group.parent !== forearmRight) forearmRight.add(group);
      group.position.set(0, HAND_OFFSET, 0);
      group.rotation.set(0, 0, 0);
    }
    // Arma de fogo fora da mira vai de cano para cima, apoiada no ombro (a coronha
    // na mão); na mira e no tiro, deitada para a frente.
    const shouldered = ['rifle', 'bayonet', 'blunderbuss'].includes(weapon) && !guard && !(strike > 0);
    if (shouldered) {
      arms[weapon].rotation.x = Math.PI;
      arms[weapon].position.y = HAND_OFFSET + 1.5;
      // Cotovelo firme segurando a arma ao ombro: o braço da arma quase não balança.
      armRight.rotation.x *= .3;
      forearmRight.rotation.x = -.5;
    }
    // A guarnição do canhão empurra a carreta com os dois braços para a frente.
    if (pushing && rest < .5) {
      armLeft.rotation.x = armRight.rotation.x = -1;
      forearmLeft.rotation.x = forearmRight.rotation.x = -.4;
      armLeft.rotation.z = .2;
      armRight.rotation.z = -.2;
      body.rotation.x += .2;
    }
    armRight.rotation.y = 0;
    club.rotation.x = 0;
    axe.rotation.x = 0;
    mallet.rotation.x = hammering ? mallet.rotation.x : 0;
    spear.position.y = HAND_OFFSET;
    if (weapon === 'axe') axe.visible = true;
    data.wounds.forEach((mark, i) => { mark.visible = i < wounds; });
    // Tocaia: ajoelhado atrás do mato, arma pronta, cabeça erguida espiando.
    if (crouch && rest < .5 && chop === null && !(strike > 0)) {
      CharacterModel.#poseCrouch(view, weapon);
      plant = 1;
    } else if (guard && strike <= 0 && rest < .5 && chop === null) {
      CharacterModel.#poseGuard(view, weapon, torch);
      plant = 1;
    }
    if (strike > 0) { CharacterModel.#poseStrike(view, strikeKind, 1 - strike); plant = 1; }
    // Entre um tiro e outro: a recarga (ferrolho e pente no fuzil; pólvora, bucha e
    // vareta no bacamarte). As peças da mão esquerda só aparecem na hora delas.
    const { reload = -1, reloadMag = false } = motion;
    const props = data.reloadProps;
    props.bolt.position.y = BOLT_Y;
    props.casing.visible = props.clip.visible = props.horn.visible = props.wad.visible = props.ramrod.visible = false;
    props.storedRod.visible = true;
    if (reload >= 0 && !(strike > 0) && rest < .5 && (weapon === 'rifle' || weapon === 'blunderbuss')) {
      CharacterModel.#poseReload(view, weapon, reload, reloadMag);
      plant = 1;
    }
    // O arco: puxar, soltar e encaixar a próxima flecha; de guarda, meio puxado; fora
    // da briga, na mão esquerda com o feixe de flechas.
    if (weapon === 'bow' && !data.bow) CharacterModel.#buildBow(view);
    if (data.bow) {
      const shooting = weapon === 'bow' && rest < .5 && chop === null;
      if (shooting && strike > 0 && strikeKind === 'bow') { CharacterModel.#poseBow(view, 'shot', 1 - strike); plant = 1; }
      else if (shooting && reload >= 0) { CharacterModel.#poseBow(view, 'reload', reload); plant = 1; }
      else if (shooting && (guard || crouch)) CharacterModel.#poseBow(view, crouch ? 'carry' : 'hold', .35);
      else CharacterModel.#poseBow(view, 'carry', 0);
      data.bow.group.visible = weapon === 'bow';
      if (!data.bow.group.visible) data.bow.arrow.visible = false;
    }
    // O pavês: o braço esquerdo baixo, segurando a tábua na frente do corpo.
    if (data.tupi?.paves && rest < .5 && (guard || strike > 0)) {
      armLeft.rotation.set(-.5, 0, .3);
      forearmLeft.rotation.set(-.55, 0, 0);
    }
    // Os riscos dos nomes tomados (Soares, cap. CLXX).
    if (data.tupi) {
      const { names = 0 } = motion;
      data.tupi.scars.forEach((scar, i) => { scar.visible = i < names; });
    }
    // Debandada: corre de braços para o alto, sem olhar para trás.
    if (panic && stride > .2 && !(strike > 0)) CharacterModel.#posePanic(view, gait);
    // O Conselheiro parado reza por um ferido: o bordão erguido balançando sobre ele
    // e a outra mão estendida.
    if (preach && idle && !guard) CharacterModel.#posePray(view, elapsed, seed);
    if (hurt > 0 && rest < .5) {
      // Recuo: o tronco joga para trás e torce com o tranco, e a cabeça vai junto.
      body.rotation.x -= .38 * hurt;
      body.rotation.z += .14 * hurt;
      neck.rotation.x -= .45 * hurt;
      forearmLeft.rotation.x -= .4 * hurt;
    }

    const { pregnancy = 0, labor = null } = motion;
    CharacterModel.#poseBelly(view, pregnancy);
    if (labor) {
      CharacterModel.#poseLabor(view, labor, rest);
      return;
    }
    if (pregnancy > .55 && chop === null && !carrying && !crying) {
      CharacterModel.#poseLatePregnancy(view, pregnancy, gait, pace, animate, awake);
    }
    // Pé chato no chão: a sola compensa a dobra da perna. E o quadril desce o quanto
    // a perna mais comprida das duas deixa, para nenhum pé afundar nem boiar.
    footLeft.rotation.x = -(legLeft.rotation.x + shinLeft.rotation.x) * (plant > .9 ? 1 : .6);
    footRight.rotation.x = -(legRight.rotation.x + shinRight.rotation.x) * (plant > .9 ? 1 : .6);
    const drop = Math.min(legDrop(legLeft.rotation.x, shinLeft.rotation.x), legDrop(legRight.rotation.x, shinRight.rotation.x));
    body.position.y -= Math.max(0, drop) * plant * awake;
  }

  // Parado: o peso troca de uma perna para a outra devagar, os braços pendem com o
  // cotovelo solto e a cabeça olha em volta de tempos em tempos — cada um no seu
  // ritmo (seed), para a tropa parada não respirar em uníssono.
  static #poseIdle(view, elapsed, seed) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, forearmLeft, forearmRight, armLeft, armRight } = view.userData;
    const shift = Math.sin(elapsed * .7 + seed * 1.7);
    body.rotation.z += shift * .03;
    // A perna que descansa dobra um tico o joelho.
    shinLeft.rotation.x += Math.max(0, shift) * .22;
    legLeft.rotation.x -= Math.max(0, shift) * .1;
    shinRight.rotation.x += Math.max(0, -shift) * .22;
    legRight.rotation.x -= Math.max(0, -shift) * .1;
    armLeft.rotation.z -= .06;
    armRight.rotation.z += .06;
    forearmLeft.rotation.x -= .08;
    forearmRight.rotation.x -= .08;
    // Olhar em volta: vira, fica um pouco e volta. A curva fica parada perto do meio
    // e dos extremos, como olhar de gente.
    const look = Math.sin(elapsed * .31 + seed * 2.3);
    neck.rotation.y += Math.sign(look) * Math.pow(Math.abs(look), 3) * .55;
    neck.rotation.x += Math.sin(elapsed * .23 + seed) * .06;
  }

  // Colhendo mandioca: ajoelhado (joelho direito no chão, o pé esquerdo plantado à
  // frente), o tronco curvado sobre o pé de mandioca, a mão esquerda segurando a
  // haste rente à terra e a direita cortando com o facão — sobe devagar e desce de
  // uma vez, em golpes curtos e baixos —, a vista no corte.
  static #poseGather(view, elapsed, seed) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    legLeft.rotation.set(-1.45, 0, -.08);
    shinLeft.rotation.x = 1.45;
    legRight.rotation.set(-.1, 0, .1);
    shinRight.rotation.x = 1.5;
    body.rotation.x = .42;
    body.rotation.z = 0;
    neck.rotation.set(.35, 0, 0);
    armLeft.rotation.set(-1.15, 0, .25);
    forearmLeft.rotation.x = -.35;
    const t = (elapsed * 1.6 + seed) % 1;
    const lift = t < .72 ? t / .72 : 1 - (t - .72) / .28;
    const raise = lift * lift * (3 - 2 * lift);
    armRight.rotation.set(-.9 - 1.1 * raise, 0, -.35 + .15 * raise);
    forearmRight.rotation.x = -.6 - .5 * raise;
  }

  // Na obra: pernas abertas e meio dobradas, a mão esquerda firmando a peça e a
  // direita batendo o maço; o tronco acompanha a batida.
  static #poseHammer(view, phase) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight, mallet } = view.userData;
    const raise = hammerLift(phase);
    const impact = Math.max(0, 1 - Math.abs(phase - .68) / .06);
    legLeft.rotation.set(-.5, 0, -.1);
    legRight.rotation.set(-.2, 0, .1);
    shinLeft.rotation.x = .7;
    shinRight.rotation.x = .7;
    body.rotation.set(.3 + impact * .08 - raise * .06, 0, 0);
    neck.rotation.set(.3, 0, 0);
    armRight.rotation.set(-1.05 - 1.35 * raise, 0, -.1);
    forearmRight.rotation.x = -.25 - 1.25 * raise;
    // O cabo segue o antebraço, levemente erguido no alto: a cabeça do maço cai
    // de face na madeira.
    mallet.rotation.x = -.15 - .3 * raise;
    armLeft.rotation.set(-1.05, 0, .25);
    forearmLeft.rotation.x = -.65;
  }

  // Tocaia: um joelho no chão e o outro pé plantado à frente, tronco curvado e a
  // cabeça erguida espiando. Com arma comprida, ela fica atravessada no colo,
  // pronta; sem arma, o braço descansa sobre o joelho.
  static #poseCrouch(view, weapon) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight, arms } = view.userData;
    legLeft.rotation.set(-1.5, 0, -.08);
    shinLeft.rotation.x = 1.5;
    legRight.rotation.set(0, 0, .08);
    shinRight.rotation.x = 1.57;
    body.rotation.set(.22, 0, 0);
    neck.rotation.set(-.2, 0, 0);
    armLeft.rotation.set(-.75, 0, .15);
    forearmLeft.rotation.x = -.6;
    armRight.rotation.set(-.6, 0, -.1);
    forearmRight.rotation.x = -.9;
    if (weapon && arms[weapon]) arms[weapon].rotation.x = -.15;
  }

  // Fuga em debandada: braços para o alto agitados, tronco jogado para a frente.
  static #posePanic(view, gait) {
    const { body, neck, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    armLeft.rotation.set(-2.5 + Math.sin(gait * 2) * .35, 0, -.35);
    armRight.rotation.set(-2.3 + Math.cos(gait * 2) * .35, 0, .35);
    forearmLeft.rotation.x = -.7;
    forearmRight.rotation.x = -.8;
    body.rotation.x += .14;
    neck.rotation.x -= .15;
  }

  // Oração sobre um ferido: o braço esquerdo ergue o bordão à frente e o balança
  // devagar de um lado a outro, como quem benze; a mão direita fica estendida para
  // a pessoa, palma aberta, e a cabeça baixa.
  static #posePray(view, elapsed, seed) {
    const { neck, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    const sway = Math.sin(elapsed * 2.2 + seed);
    armLeft.rotation.set(-1.25 - .15 * Math.abs(sway), 0, -.1 + .35 * sway);
    forearmLeft.rotation.x = -.35;
    armRight.rotation.set(-1.35, 0, .2);
    forearmRight.rotation.x = -.2 - .1 * Math.sin(elapsed * 1.3 + seed);
    neck.rotation.x = .22;
    neck.rotation.y *= .3;
  }

  // Guarda: meio agachado, arma à frente e o outro braço protegendo o corpo.
  static #poseGuard(view, weapon, torch) {
    const { body, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    body.rotation.x += .12;
    legLeft.rotation.x = -.45;
    legRight.rotation.x = .15;
    shinLeft.rotation.x = .55;
    shinRight.rotation.x = .3;
    const long = LONG_ARMS.has(weapon);
    // O ângulo da arma é a soma ombro + cotovelo: o cotovelo dobrado traz a mão
    // para perto do corpo sem mudar para onde a arma aponta.
    armRight.rotation.x = long ? -.95 : -.7;
    forearmRight.rotation.x = long ? -.4 : -.4;
    armRight.rotation.z = long ? .1 : -.25;
    // Porrete e machado de pé, apontando para cima e para a frente, prontos para descer.
    const { club, axe, arms } = view.userData;
    club.rotation.x = -1.15;
    axe.rotation.x = -1.05;
    // O tacape, a ibirapema e o tição também, de pé e prontos.
    for (const kind of ['tacape', 'ibirapema', 'torch']) if (arms[kind]) arms[kind].rotation.x = -1.15;
    if (weapon === 'rifle' || weapon === 'blunderbuss') {
      // Fuzil pronto: na mira, coronha no ombro (o mesmo do tiro, parado).
      CharacterModel.#aimRig(view, weapon, 1, 0);
    } else if (long && weapon !== 'spear') {
      // Baioneta calada: a mão esquerda segura o guarda-mão, à frente da direita.
      armLeft.rotation.x = -1.15;
      forearmLeft.rotation.x = -.3;
      armLeft.rotation.z = -.42;
    } else if (!torch) {
      armLeft.rotation.x = -.85;
      forearmLeft.rotation.x = -.75;
      armLeft.rotation.z = .45;
    }
  }

  // Um golpe por arma, com `p` de 0 a 1 ao longo da animação:
  // porrete: puxa para o lado e varre na horizontal, com o tronco girando junto;
  // lança: recolhe e estoca reto para a frente, num bote do corpo inteiro;
  // machado: ergue acima da cabeça e desce de cima a baixo.
  static #poseStrike(view, kind, p) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight, arms } = view.userData;
    const phase = (from, to) => Math.max(0, Math.min(1, (p - from) / (to - from)));
    // O canhão dispara sozinho: a guarnição continua agarrada à carreta.
    if (kind === 'cannon') return;
    // O arco tem pose própria (#poseBow), que vem depois.
    if (kind === 'bow') return;
    if (kind === 'rifle' || kind === 'blunderbuss') {
      // Tiro, como se faz: da arma baixa até a coronha no ombro e o rosto encostado
      // nela (0–42%); a respiração presa, quase imóvel, apontando (42–58%); o disparo
      // (58%, o mesmo instante da simulação): o coice é seco — sobe de uma vez e decai
      // devagar —, joga o ombro e o tronco para trás e o cano sobe; depois a mira volta.
      // O bacamarte escoiceia bem mais.
      const heavy = kind === 'blunderbuss';
      const raise = span(p, 0, .42);
      const since = p - .58;
      const kick = since > 0 ? Math.min(1, since / .025) * Math.exp(-since * (heavy ? 8 : 12)) : 0;
      // o tremor de quem segura o ar, só na hora de apontar
      const hold = p > .42 && p < .58 ? Math.sin(p * 90) * .004 : 0;
      CharacterModel.#aimRig(view, kind, raise, kick, hold);
      return;
    }
    if (kind === 'spear' || kind === 'bayonet') {
      const spear = arms[kind];
      // A lança fica na horizontal: recua ao longo do próprio eixo (o braço puxa para
      // trás, o corpo inclina para trás) e então avança de uma vez no bote.
      const draw = easeInOut(phase(0, .4)), thrust = phase(.4, .55), back = easeInOut(phase(.6, 1));
      const reach = thrust * (1 - back);
      const pulled = draw * (1 - thrust);
      armRight.rotation.x = -1.5 - .1 * reach + .5 * pulled;
      forearmRight.rotation.x = -.5 * pulled;
      armRight.rotation.z = .1;
      spear.position.y = HAND_OFFSET + 4 * pulled - 3 * reach;
      body.rotation.x += -.16 * pulled + .38 * reach;
      legLeft.rotation.x = -.6 * reach;
      shinLeft.rotation.x = .5 * reach;
      legRight.rotation.x = .4 * reach;
      shinRight.rotation.x = .1;
    } else if (kind === 'axe' || kind === 'saber' || kind === 'machete' || kind === 'tacape' || kind === 'ibirapema' || kind === 'torch') {
      // Ergue com o cotovelo dobrado atrás da cabeça e desce esticando o braço.
      const lift = easeInOut(phase(0, .5)), chop = phase(.5, .65), back = easeInOut(phase(.7, 1));
      const down = chop * chop;
      armRight.rotation.x = -2.6 * lift * (1 - down) - .55 * down * (1 - back) - .9 * (1 - lift) * (1 - back);
      forearmRight.rotation.x = -1.2 * lift * (1 - down) - .1;
      armRight.rotation.z = -.15;
      body.rotation.x += -.18 * lift * (1 - down) + .42 * down * (1 - back);
      legLeft.rotation.x = -.4 * down * (1 - back);
      shinLeft.rotation.x = .4 * down * (1 - back);
    } else {
      // Braço na horizontal à frente; o giro em y o leva para trás pela direita e
      // depois varre até a esquerda, com o tronco girando junto. O cotovelo dobra no
      // preparo e estica na varrida.
      const wind = easeInOut(phase(0, .45)), sweep = phase(.45, .65), back = easeInOut(phase(.7, 1));
      const swing = 1.25 * wind - 2.45 * sweep * sweep;
      armRight.rotation.x = -1.5 * Math.max(wind, 1 - back) - .1;
      armRight.rotation.y = swing * (1 - back);
      armRight.rotation.z = 0;
      forearmRight.rotation.x = -.7 * wind * (1 - sweep);
      body.rotation.y = (.5 * wind - 1 * sweep) * (1 - back);
      legLeft.rotation.x = -.3 * sweep * (1 - back);
      shinLeft.rotation.x = .3 * sweep * (1 - back);
    }
  }

  /* ---------- o arco ---------- */
  // Como se atira de arco: de lado para o alvo (o ombro esquerdo na frente), a mão
  // esquerda segurando o arco quase esticada na altura do ombro, a direita puxando a
  // corda até o queixo, a cabeça virada para o alvo. `mode`:
  //   shot    o tiro, `t` de 0 a 1: a mão direita traz a flecha do feixe e encaixa na
  //           corda (0–20%), puxa (20–50%), segura (50–58%) e solta (58%, o instante da
  //           simulação): a corda volta, a flecha some e a mão escapa para trás;
  //   reload  entre um tiro e outro: a mão volta ao arco, tira outra flecha do feixe,
  //           encaixa na corda e espera;
  //   hold    de guarda, a flecha encaixada e meio puxada (`t`);
  //   carry   fora da briga, o arco pendurado na mão esquerda.
  static #poseBow(view, mode, t) {
    const data = view.userData;
    const { body, neck, armLeft, forearmLeft, armRight, forearmRight } = data;
    const { group, arrow } = data.bow;
    if (mode === 'carry') {
      if (group.parent !== forearmLeft) forearmLeft.add(group);
      group.position.set(0, HAND_OFFSET, .3);
      group.quaternion.identity();
      CharacterModel.#bowString(data, null);
      arrow.visible = false;
      return;
    }
    // A mira, com um tico de elevação: a flecha vai em arco.
    _bowDir.set(-Math.sin(BOW_YAW), .12, Math.cos(BOW_YAW)).normalize();
    _bowHand.copy(armLeft.position).addScaledVector(_bowDir, BOW_REACH);
    // O arco no corpo, de pé, com a barriga para o alvo.
    if (group.parent !== body) body.add(group);
    _by.set(0, 1, 0).addScaledVector(_bowDir, -_bowDir.y).normalize();
    _bx.crossVectors(_by, _bowDir);
    _bm.makeBasis(_bx, _by, _bowDir).setPosition(_bowHand);
    group.position.copy(_bowHand);
    group.quaternion.setFromRotationMatrix(_bm);
    // A corda em repouso passa atrás da empunhadura; o feixe fica na mão do arco.
    _rest.copy(_bowHand).addScaledVector(_bowDir, -BOW.sag);
    _bowGrip.copy(_bowHand).addScaledVector(_by, 1.2);
    const nockAt = draw => _nock.copy(_rest).lerp(BOW_ANCHOR, draw);
    let string = null, nocked = false, inHand = false;
    if (mode === 'hold') {
      string = nockAt(t);
      _bowTarget.copy(string);
      nocked = true;
    } else if (mode === 'shot') {
      if (t < .2) {
        _bowTarget.copy(_bowGrip).lerp(_rest, span(t, 0, .2));
        inHand = t < .14;
        nocked = !inHand;
        if (nocked) string = _bowTarget;
      } else if (t < .58) {
        string = nockAt(span(t, .2, .5));
        _bowTarget.copy(string);
        nocked = true;
      } else {
        // Soltou: a mão escapa para trás e para fora, e depois desce ao peito.
        _follow.copy(BOW_ANCHOR).addScaledVector(_bx, -1.1).addScaledVector(_bowDir, -1);
        _bowTarget.copy(BOW_ANCHOR).lerp(_follow, span(t, .58, .66)).lerp(BOW_CHEST, span(t, .8, 1));
      }
    } else {
      if (t < .35) _bowTarget.copy(BOW_CHEST).lerp(_bowGrip, span(t, 0, .35));
      else if (t < .55) {
        _bowTarget.copy(_bowGrip).lerp(_rest, span(t, .35, .55));
        inHand = true;
      } else {
        _bowTarget.copy(_rest);
        string = _bowTarget;
        nocked = true;
      }
    }
    CharacterModel.#solveArm(armLeft, forearmLeft, _bowHand, POLE_LEFT);
    CharacterModel.#solveArm(armRight, forearmRight, _bowTarget, POLE_DRAW);
    CharacterModel.#bowString(data, string);
    // A flecha: encaixada na corda, apontando para a empunhadura; ou na mão, deitada.
    arrow.visible = nocked || inHand;
    if (arrow.visible) {
      const from = nocked ? (string ?? _bowTarget) : _bowTarget;
      if (nocked) _arrowDir.copy(_bowHand).sub(from).normalize();
      else _arrowDir.copy(_bowDir);
      arrow.quaternion.setFromUnitVectors(DOWN_Y, _arrowDir);
      arrow.position.copy(from).addScaledVector(_arrowDir, 1.5);
    }
    body.rotation.y = BOW_YAW;
    neck.rotation.set(.05, -BOW_YAW * .92, 0);
    CharacterModel.#stance(view, 0);
  }

  // As duas metades da corda, das pontas do arco até `point` (no corpo); sem ponto, reta.
  static #bowString(data, point) {
    const { group, strings } = data.bow;
    const top = [0, BOW.half, -BOW.sag], bottom = [0, -BOW.half, -BOW.sag];
    let middle = [0, 0, -BOW.sag];
    if (point) {
      _tip.copy(point).sub(group.position).applyQuaternion(_bowQ.copy(group.quaternion).invert());
      middle = [_tip.x, _tip.y, _tip.z];
    }
    stringTo(strings[0], top, middle);
    stringTo(strings[1], bottom, middle);
  }

  /* ---------- armas de fogo: a arma no corpo, as mãos indo até ela ---------- */
  // Como se segura um fuzil de verdade: a coronha encostada no vão do ombro direito, o
  // rosto descendo até ela, a linha do cano na altura do olho, apontando o alvo. A mão
  // direita no punho da coronha, o cotovelo direito para fora; a esquerda por baixo do
  // guarda-mão, o cotovelo por baixo da arma. O corpo fica de lado (o ombro esquerdo
  // para o alvo) e a cabeça vira de volta para ele. A arma é posta no referencial do
  // corpo (#holdGun) e cada braço é resolvido por cinemática inversa de dois ossos
  // (#solveArm) até o ponto da arma em que aquela mão pega.

  // A mira, de `raise` 0 (arma baixa, no peito) a 1 (no ombro, apontando); `kick` é o
  // coice (a arma recua no ombro e o cano sobe, o tronco vai junto).
  static #aimRig(view, weapon, raise, kick, hold = 0) {
    const { body, neck } = view.userData;
    const heavy = weapon === 'blunderbuss';
    const yaw = mixTo(YAW_LOW, YAW_AIM, raise);
    // para onde a arma aponta, no corpo: o alvo está à frente (+z) do boneco, e o corpo
    // girou `yaw`; na arma baixa, o cano um pouco para baixo e para dentro
    _dir.set(-Math.sin(yaw), hold, Math.cos(yaw));
    _a.copy(LOW_DIR).lerp(_dir, raise).normalize();
    _butt.copy(BUTT_LOW).lerp(BUTT_AIM, raise);
    _butt.addScaledVector(_a, -(heavy ? 1.1 : .75) * kick);
    _a.y += (heavy ? .34 : .22) * kick;
    _a.normalize();
    _grip.copy(_butt).addScaledVector(_a, BUTT_TO_GRIP);
    CharacterModel.#holdGun(view, weapon, _grip, _a, UP);
    CharacterModel.#solveArm(view.userData.armRight, view.userData.forearmRight, CharacterModel.#onGun(GRIP_POINT, _hr), POLE_RIGHT);
    CharacterModel.#solveArm(view.userData.armLeft, view.userData.forearmLeft, CharacterModel.#onGun(FOREND[weapon], _hl), POLE_LEFT);
    body.rotation.y = yaw;
    body.rotation.x -= (heavy ? .16 : .1) * kick;
    // o rosto desce e encosta na coronha; no coice a cabeça vai junto
    neck.rotation.set(.22 * raise - .12 * kick, -yaw, -.12 * raise);
    CharacterModel.#stance(view, kick);
  }

  // A recarga depois do tiro, com `r` de 0 a 1 ao longo do tempo até o próximo.
  // Fuzil de ferrolho: a arma desce do ombro para o peito; a mão direita sai do punho, gira
  // a alavanca do ferrolho para cima e puxa para trás (a cápsula vazia salta para a
  // direita), empurra para a frente e gira para baixo, volta ao punho e a arma sobe à
  // mira. A cada 5 tiros (`mag`), de ferrolho aberto, a mão desce à cartucheira, traz o
  // pente, encaixa e empurra por cima na culatra, e só então fecha.
  // Bacamarte de carregar pela boca: a arma fica em pé, coronha no chão, a mão esquerda
  // segurando o cano; a direita pega o polvarinho e despeja a pólvora pela boca, põe a
  // bucha, tira a vareta de baixo do cano, soca duas vezes, guarda a vareta, escorva no
  // cão e a arma volta à mira.
  static #poseReload(view, weapon, r, mag) {
    const { body, neck, armRight, forearmRight, armLeft, forearmLeft, reloadProps: P } = view.userData;
    CharacterModel.#stance(view, 0);
    if (weapon === 'rifle') {
      const low = span(r, 0, .12) * (1 - span(r, .86, 1));
      const raise = 1 - low;
      const yaw = mixTo(YAW_LOW, YAW_AIM, raise);
      _dir.set(-Math.sin(yaw), 0, Math.cos(yaw));
      _a.copy(LOW_DIR).lerp(_dir, raise).normalize();
      _butt.copy(BUTT_LOW).lerp(BUTT_AIM, raise);
      _grip.copy(_butt).addScaledVector(_a, BUTT_TO_GRIP);
      CharacterModel.#holdGun(view, 'rifle', _grip, _a, UP);
      // o ferrolho: gira para cima e corre para trás; fecha ao contrário
      const T = mag
        ? { open: [.2, .28], close: [.7, .78] }
        : { open: [.26, .38], close: [.5, .62] };
      const state = span(r, T.open[0], T.open[1]) * (1 - span(r, T.close[0], T.close[1]));
      const turn = Math.min(1, state * 2), slide = Math.max(0, state * 2 - 1);
      P.bolt.rotation.y = -1.15 * turn;
      P.bolt.position.y = BOLT_Y + 1.2 * slide;
      // a bolota da alavanca, onde a mão direita pega (no referencial da arma)
      const kx = P.bolt.position.x + 1.05 * Math.cos(P.bolt.rotation.y);
      const kz = P.bolt.position.z - 1.05 * Math.sin(P.bolt.rotation.y);
      const knob = CharacterModel.#onGun([kx, P.bolt.position.y, kz], _b);
      const grip = CharacterModel.#onGun(GRIP_POINT, _c);
      // a cápsula vazia salta para a direita e para cima, girando, quando o ferrolho chega atrás
      const c = (r - (T.open[0] + T.open[1]) / 2) / .2;
      if (c > 0 && c < 1) {
        P.casing.visible = true;
        P.casing.position.set(BOLT_X + .6 + 2.8 * c, BOLT_Y + .5, .5 + 3.4 * c - 4.8 * c * c);
        P.casing.rotation.set(c * 9, 0, c * 6);
      }
      // o caminho da mão direita
      let keys;
      if (mag) {
        const top = CharacterModel.#onGun(RECEIVER_TOP, _e);
        const pushed = _t.copy(top).addScaledVector(UP, -.5);
        keys = [[0, grip], [.12, grip], [.18, knob], [.29, knob], [.4, POUCH], [.44, POUCH], [.54, top], [.6, pushed],
          [.63, top], [.68, knob], [.79, knob], [.86, grip], [1, grip]];
        P.clip.visible = r > .42 && r < .6;
      } else {
        keys = [[0, grip], [.12, grip], [.24, knob], [.63, knob], [.74, grip], [1, grip]];
      }
      CharacterModel.#solveArm(armRight, forearmRight, CharacterModel.#path(keys, r, _u), POLE_RIGHT);
      CharacterModel.#solveArm(armLeft, forearmLeft, CharacterModel.#onGun(FOREND.rifle, _hl), POLE_LEFT);
      body.rotation.y = yaw;
      neck.rotation.set(.22 + .3 * low, -yaw + .35 * low, -.12 * raise);   // olha a culatra
      return;
    }
    // Bacamarte: da mira para em pé (coronha no chão, boca para cima, na frente do corpo)
    const up = span(r, 0, .12) * (1 - span(r, .88, .98));
    const yaw = mixTo(YAW_AIM, .25, up);
    _dir.set(-Math.sin(yaw), 0, Math.cos(yaw));
    const aimGrip = _b.copy(BUTT_AIM).addScaledVector(_dir, BUTT_TO_GRIP);
    _a.copy(_dir).lerp(_e.set(0, 1, -.12), up).normalize();
    _grip.copy(aimGrip).lerp(_c.set(.5, 4.4, 2.8), up);
    _u.copy(UP).lerp(FORWARD, up).normalize();
    _gd.copy(_a);
    CharacterModel.#holdGun(view, 'blunderbuss', _grip, _gd, _u);
    // a esquerda: do guarda-mão para o cano, segurando a arma em pé
    _t.set(...FOREND.blunderbuss).lerp(_e.set(0, -5.2, .55), up);
    CharacterModel.#solveArm(armLeft, forearmLeft, CharacterModel.#onGun([_t.x, _t.y, _t.z], _hl), POLE_LEFT);
    // a direita: polvarinho na boca, bucha, vareta (duas socadas), escorva
    const grip = CharacterModel.#onGun(GRIP_POINT, _c);
    const muzzle = CharacterModel.#onGun(MUZZLE.blunderbuss, _b);
    const above = (k, out) => out.copy(muzzle).addScaledVector(_gd, k);
    const pour = above(.9, new THREE.Vector3()), rodIn = above(2.4, new THREE.Vector3());
    const pipe = CharacterModel.#onGun([0, -6, -.7], new THREE.Vector3());   // a vareta, embaixo do cano
    const lock = CharacterModel.#onGun([.6, .3, .35], new THREE.Vector3());  // o cão, acima do punho
    let stroke = 0;
    if (r > .56 && r < .76) stroke = Math.max(0, Math.sin((r - .56) / .2 * Math.PI * 4 - Math.PI / 2));
    const ram = above(2.4 - 1.9 * stroke, new THREE.Vector3());
    const keys = [[0, grip], [.12, grip], [.18, POUCH], [.2, POUCH], [.26, pour], [.34, pour], [.4, POUCH], [.42, POUCH],
      [.47, pour], [.5, pipe], [.54, rodIn], [.56, ram], [.76, ram], [.8, rodIn], [.83, pipe], [.87, lock], [.92, lock], [1, grip]];
    CharacterModel.#solveArm(armRight, forearmRight, CharacterModel.#path(keys, r, _hr), POLE_RIGHT);
    // as peças na mão direita, viradas para a boca da arma quando estão nela
    const forearmQ = _q3.copy(armRight.quaternion).multiply(forearmRight.quaternion).invert();
    P.horn.visible = r > .18 && r < .36;
    P.horn.quaternion.copy(forearmQ).multiply(_q1.setFromUnitVectors(UP, _e.copy(_gd).negate()));
    P.wad.visible = r > .4 && r < .49;
    P.ramrod.visible = r > .5 && r < .83;
    P.storedRod.visible = !P.ramrod.visible;
    if (r > .53 && r < .81) P.ramrod.quaternion.copy(forearmQ).multiply(_q2.setFromUnitVectors(DOWN, _e.copy(_gd).negate()));
    else P.ramrod.quaternion.identity();
    body.rotation.y = yaw;
    neck.rotation.set(mixTo(.22, -.05, up), -yaw, -.12 * (1 - up));
  }

  // A arma no corpo: o punho em `grip`, o cano para `dir`, o "em cima" da arma o mais
  // perto de `upHint`. Guarda a matriz (_gun) para #onGun.
  static #holdGun(view, weapon, grip, dir, upHint) {
    const { body, arms } = view.userData;
    const holder = arms[weapon];
    _gy.copy(dir).negate();
    _gz.copy(upHint).addScaledVector(_gy, -upHint.dot(_gy));
    if (_gz.lengthSq() < 1e-6) _gz.copy(FORWARD).addScaledVector(_gy, -FORWARD.dot(_gy));
    _gz.normalize();
    _gx.crossVectors(_gy, _gz);
    _gun.makeBasis(_gx, _gy, _gz).setPosition(grip);
    if (holder.parent !== body) body.add(holder);
    holder.position.copy(grip);
    holder.quaternion.setFromRotationMatrix(_gun);
  }

  // Um ponto da arma (referencial da arma) no corpo.
  static #onGun(point, out) {
    return out.set(point[0], point[1], point[2]).applyMatrix4(_gun);
  }

  // Braço de dois ossos (manga e antebraço, pendurados para -y) até a mão chegar em
  // `target` (no corpo). O cotovelo dobra para o lado de `pole`. Longe demais, o braço
  // estica todo na direção do alvo.
  static #solveArm(upper, fore, target, pole) {
    const L1 = UPPER_ARM, L2 = -HAND_OFFSET;
    _a.copy(target).sub(upper.position);
    const dist = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, _a.length()));
    _a.normalize();
    const along = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
    _t.copy(pole).addScaledVector(_a, -pole.dot(_a));
    if (_t.lengthSq() < 1e-6) _t.set(0, -1, 0).addScaledVector(_a, _a.y);
    _t.normalize();
    // o cotovelo e a mão (no corpo)
    _e.copy(upper.position).addScaledVector(_a, along).addScaledVector(_t, h);
    _b.copy(upper.position).addScaledVector(_a, dist);
    _q1.setFromUnitVectors(DOWN, _c.copy(_e).sub(upper.position).normalize());
    upper.quaternion.copy(_q1);
    _q2.setFromUnitVectors(DOWN, _c.copy(_b).sub(_e).normalize());
    fore.quaternion.copy(_q1).invert().multiply(_q2);
  }

  // Um ponto ao longo de um caminho de pontos com tempo: [[t, Vector3], ...], suave
  // entre um e outro (a mão vai, para e segue).
  static #path(keys, r, out) {
    for (let i = 0; i < keys.length - 1; i++) {
      const [ta, a] = keys[i], [tb, b] = keys[i + 1];
      if (r <= tb) return out.copy(a).lerp(b, easeInOut(Math.max(0, Math.min(1, (r - ta) / Math.max(1e-6, tb - ta)))));
    }
    return out.copy(keys[keys.length - 1][1]);
  }

  // De pé para atirar: o pé esquerdo à frente, os joelhos um tico dobrados; o coice
  // empurra o peso para a perna de trás.
  static #stance(view, kick) {
    const { legLeft, legRight, shinLeft, shinRight } = view.userData;
    legLeft.rotation.set(-.32, 0, -.06);
    shinLeft.rotation.x = .34;
    legRight.rotation.set(.18 + .06 * kick, 0, .08);
    shinRight.rotation.x = .14;
  }

  // Cabeça arrancada: some do corpo e fica só o toco do pescoço.
  behead(view) {
    for (const part of view.userData.headParts) part.visible = false;
    view.userData.stump.visible = true;
  }

  // A barriga cresce devagar no começo e bem mais no fim, como de verdade: quase nada
  // no primeiro terço, redonda no último. Cresce para a frente e um pouco para baixo.
  static #poseBelly(view, pregnancy) {
    const { belly } = view.userData;
    const growth = pregnancy <= 0 ? 0 : Math.pow(Math.min(1, pregnancy), 1.6);
    belly.visible = growth > .03;
    if (!belly.visible) return;
    const size = .35 + .65 * growth;
    belly.scale.set(size, size, size);
    belly.position.set(0, BELLY_HEIGHT - growth * .5, 1.6 * size - .2);
  }

  // Fim da gravidez: o andar gingado de lado a lado, a mão direita segurando as costas
  // e a esquerda apoiada na barriga.
  static #poseLatePregnancy(view, pregnancy, gait, pace, animate, awake) {
    const { body, armLeft, armRight } = view.userData;
    const weight = (pregnancy - .55) / .45 * awake;
    if (animate) body.rotation.z += Math.sin(gait) * .09 * weight * Math.max(.3, pace);
    body.rotation.x -= .06 * weight;
    armLeft.rotation.x = -.55 * weight + armLeft.rotation.x * (1 - weight);
    armLeft.rotation.z = .5 * weight;
    armRight.rotation.x = .55 * weight + armRight.rotation.x * (1 - weight);
    armRight.rotation.z = .25 * weight;
  }

  // Trabalho de parto. Em pé (rest ~0): a contração dobra o corpo para a frente, as
  // mãos nos joelhos. Deitada (rest → 1): de costas, joelhos erguidos e afastados, as
  // mãos segurando as coxas; a cada onda de força o tronco se curva para cima e os
  // joelhos se abrem mais.
  static #poseLabor(view, { contraction = 0, push = 0 }, rest) {
    const { body, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    const standing = 1 - rest;
    // Em pé, na contração.
    body.rotation.x = .38 * contraction * standing - Math.PI / 2 * rest + push * .34 * rest;
    body.rotation.z = 0;
    body.position.y = LYING_LIFT * rest + push * .5 * rest;
    const knees = 1.05 + push * .12;
    const spread = .42 + push * .1;
    legLeft.rotation.set(-knees * rest + .18 * contraction * standing, 0, -spread * rest);
    legRight.rotation.set(-knees * rest + .18 * contraction * standing, 0, spread * rest);
    shinLeft.rotation.x = shinRight.rotation.x = 1.2 * rest;
    for (const [arm, fore, side] of [[armLeft, forearmLeft, -1], [armRight, forearmRight, 1]]) {
      arm.rotation.x = -.9 * contraction * standing - (1.25 + push * .15) * rest;
      arm.rotation.z = -side * (.2 * standing + .38 * rest);
      fore.rotation.x = 0;
    }
  }

  // Choro: cabeça baixa, as duas mãos no rosto e o soluço sacudindo os ombros.
  static #poseCrying(view, animate, elapsed) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    const sob = animate ? Math.sin(elapsed * 13) : 0;
    legLeft.rotation.x = legRight.rotation.x = 0;
    shinLeft.rotation.x = shinRight.rotation.x = 0;
    body.rotation.z = 0;
    body.rotation.x = .32 + sob * .03;
    body.position.y = Math.max(0, sob) * .35;
    neck.rotation.x = .35;
    for (const [arm, fore, side] of [[armLeft, forearmLeft, -1], [armRight, forearmRight, 1]]) {
      arm.rotation.x = -1.5 + sob * .06;
      arm.rotation.z = -side * .45;
      fore.rotation.x = -1.2;
    }
  }

  // Pernas firmes, afastadas e meio dobradas, as duas mãos no cabo (braços para a
  // frente e fechados para o meio), e quem gira é o tronco inteiro. No preparo o
  // machado sobe um pouco; no impacto o corpo se joga levemente para a frente.
  static #poseChopping(view, chop) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    const twist = chopTwist(chop);
    const raise = Math.max(0, twist) / .95;
    const impact = Math.max(0, 1 - Math.abs(chop - .68) / .08);
    legLeft.rotation.set(-.3, 0, -.12);
    legRight.rotation.set(.05, 0, .12);
    shinLeft.rotation.x = .4;
    shinRight.rotation.x = .3;
    body.rotation.z = 0;
    body.rotation.y = twist;
    body.rotation.x = .1 + impact * .12;
    neck.rotation.set(.12, -twist * .5, 0);
    for (const [arm, fore, side] of [[armLeft, forearmLeft, -1], [armRight, forearmRight, 1]]) {
      arm.rotation.x = -.95 - raise * .25;
      arm.rotation.z = -side * .38;
      fore.rotation.x = -.3 - raise * .12 + impact * .15;
    }
  }
}
