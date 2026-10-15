import * as THREE from 'three';
import { easeInOut } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { WOOD_MATERIALS, LOG_RADIUS } from './WoodMaterials.js';
import { addVerticalShade } from './Shading.js';

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
// Saco de farinha/feijão colhido, levado nos braços até a sede.
const SACK_SHAPE = addVerticalShade(new THREE.BoxGeometry(4.2, 3.4, 3), .78, 1.08);
const SACK_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xcdb88a, vertexColors: true });
const SACK_TIE_SHAPE = new THREE.BoxGeometry(2.2, .5, 1.6);
const SACK_TIE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a5a36 });
// Machado: cabo de madeira saindo da mão e cabeça de ferro de lado, com o fio
// virado para o sentido do golpe. Geometria deslocada para a origem cair na mão.
const AXE_HANDLE_SHAPE = new THREE.BoxGeometry(.7, 9.5, .7).translate(0, -3.4, 0);
const AXE_HEAD_SHAPE = new THREE.BoxGeometry(3.4, 2.2, .6).translate(-1.3, -7.6, 0);
const AXE_HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa0784a });
const AXE_HEAD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9aa2a8 });
// Maço de pau para a obra: cabo curto e cabeça grossa de madeira.
const MALLET_HANDLE_SHAPE = new THREE.BoxGeometry(.6, 6, .6).translate(0, -2.2, 0);
const MALLET_HEAD_SHAPE = addVerticalShade(new THREE.BoxGeometry(1.8, 1.8, 3.2).translate(0, -5.3, 0), .8, 1.05);
const MALLET_HEAD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a5534, vertexColors: true });
// Armas de briga, na mão direita como o machado: porrete de madeira com a ponta
// grossa e lança comprida com ponta de pedra lascada (a mão segura no primeiro terço).
const CLUB_SHAPE = new THREE.BoxGeometry(1.1, 6.5, 1.1).translate(0, -3, 0);
const CLUB_KNOB_SHAPE = new THREE.BoxGeometry(2.2, 2.8, 2.2).translate(0, -6.6, 0);
const CLUB_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x6b4a2c });
const SPEAR_SHAFT_SHAPE = new THREE.BoxGeometry(.5, 21, .5).translate(0, -6.5, 0);
const SPEAR_TIP_SHAPE = new THREE.BoxGeometry(1.2, 2.6, .5).translate(0, -18.2, 0);
const SPEAR_TIP_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x55555e });
// Ferida aberta: talho vermelho-escuro por cima do corpo (e da roupa).
const WOUND_SHAPE = new THREE.BoxGeometry(1.7, 1.1, .3);
const WOUND_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x7a0a10 });
// Toco do pescoço de quem perdeu a cabeça.
const STUMP_SHAPE = new THREE.BoxGeometry(2.6, .9, 2.6);
const STUMP_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x8e1016 });
// Armas de fogo e de corte, na mão direita, com a origem na mão. O fuzil
// (Mannlicher da tropa) tem a coronha voltada para o ombro e o cano para a frente;
// o da carga de baioneta leva a lâmina na ponta; o bacamarte do jagunço é curto e de
// boca larga. Facão do sertanejo e sabre do oficial: lâmina saindo do punho.
const STOCK_SHAPE = new THREE.BoxGeometry(.9, 7.5, 1.2).translate(0, .6, 0);
const BARREL_SHAPE = new THREE.BoxGeometry(.5, 8.5, .5).translate(0, -6.6, 0);
const BAYONET_SHAPE = new THREE.BoxGeometry(.25, 4.2, .6).translate(0, -12.9, 0);
const SHORT_BARREL_SHAPE = new THREE.BoxGeometry(.7, 5.6, .7).translate(0, -5.2, 0);
const MUZZLE_SHAPE = new THREE.BoxGeometry(1.4, 1.2, 1.4).translate(0, -8.4, 0);
const GRIP_SHAPE = new THREE.BoxGeometry(.7, 2, .9);
const MACHETE_SHAPE = new THREE.BoxGeometry(.35, 6.8, 1.4).translate(0, -4.4, 0);
const SABER_GUARD_SHAPE = new THREE.BoxGeometry(.5, .4, 1.9).translate(0, -1.1, 0);
const SABER_SHAPE = new THREE.BoxGeometry(.25, 9.5, .6).translate(0, -6, 0);
const GUNSTOCK_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x6a4428 });
const GUNMETAL_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x3a3c40 });
const BRASS_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9a7a3c });
const BLADE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xb9bec2 });
// Quais armas se empunham como fuzil (na horizontal, mirando) e quais como lâmina.
const LONG_ARMS = new Set(['rifle', 'bayonet', 'blunderbuss', 'spear']);
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
    // Machado só à vista enquanto corta; maço só na obra.
    const axe = held([[AXE_HANDLE_SHAPE, AXE_HANDLE_MATERIAL], [AXE_HEAD_SHAPE, AXE_HEAD_MATERIAL]]);
    const mallet = held([[MALLET_HANDLE_SHAPE, AXE_HANDLE_MATERIAL], [MALLET_HEAD_SHAPE, MALLET_HEAD_MATERIAL]]);
    const club = held([[CLUB_SHAPE, CLUB_MATERIAL], [CLUB_KNOB_SHAPE, CLUB_MATERIAL]]);
    const spear = held([[SPEAR_SHAFT_SHAPE, AXE_HANDLE_MATERIAL], [SPEAR_TIP_SHAPE, SPEAR_TIP_MATERIAL]]);
    const arms = {
      club, spear,
      rifle: held([[STOCK_SHAPE, GUNSTOCK_MATERIAL], [BARREL_SHAPE, GUNMETAL_MATERIAL]]),
      bayonet: held([[STOCK_SHAPE, GUNSTOCK_MATERIAL], [BARREL_SHAPE, GUNMETAL_MATERIAL],
        [BAYONET_SHAPE, BLADE_MATERIAL]]),
      blunderbuss: held([[STOCK_SHAPE, GUNSTOCK_MATERIAL], [SHORT_BARREL_SHAPE, BRASS_MATERIAL],
        [MUZZLE_SHAPE, BRASS_MATERIAL]]),
      machete: held([[GRIP_SHAPE, GUNSTOCK_MATERIAL], [MACHETE_SHAPE, BLADE_MATERIAL]]),
      saber: held([[GRIP_SHAPE, GUNMETAL_MATERIAL], [SABER_GUARD_SHAPE, BRASS_MATERIAL],
        [SABER_SHAPE, BLADE_MATERIAL]])
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
    // Saco da colheita, abraçado na frente da barriga.
    const sack = new THREE.Group();
    sack.position.set(0, 8, 3.4);
    build(SACK_SHAPE, SACK_MATERIAL, 0, 0, 0, sack);
    build(SACK_TIE_SHAPE, SACK_TIE_MATERIAL, 0, 1.8, 0, sack).castShadow = false;
    sack.visible = false;
    body.add(sack);
    const gear = CharacterModel.#buildLook(group, body, neck, forearmLeft, [left, right]);
    gear.parts.feet = [left.foot, right.foot];
    headParts.push(...gear.head);
    group.userData = {
      bodyMaterial, outfitMaterial, trousersMaterial, body, torso, belly, neck,
      legLeft: left.thigh, legRight: right.thigh, shinLeft: left.shin, shinRight: right.shin,
      footLeft: left.foot, footRight: right.foot,
      armLeft, armRight, forearmLeft, forearmRight,
      axe, mallet, shoulderLog, sack, eyes, club, spear, arms, wounds, headParts, stump, gear: gear.parts
    };
    return group;
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

  // Peças do traje à mostra (o cadáver as esconde quando a carne desbota).
  gearParts(view) {
    const parts = view.userData.gear;
    return Object.values(parts).flat().filter(mesh => mesh.visible && mesh !== parts.cannon && mesh !== parts.cart);
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
    const { axe, mallet, shoulderLog, sack } = data;
    const hammering = chop !== null && building;
    axe.visible = chop !== null && !building;
    mallet.visible = hammering;
    shoulderLog.visible = carrying && chop === null;
    sack.visible = carryFood && !carrying && chop === null;
    if (hammering) { CharacterModel.#poseHammer(view, chop); plant = 1; }
    else if (chop !== null) { CharacterModel.#poseChopping(view, chop); plant = 1; }
    else if (gathering) { CharacterModel.#poseGather(view, animate ? elapsed : 0, seed); plant = 1; }
    else if (carrying) {
      // Mão direita no alto segurando a tora sobre o ombro; a esquerda balança.
      armRight.rotation.x = -2.8;
      armRight.rotation.z = -.15;
      forearmRight.rotation.x = -.35;
    } else if (sack.visible) {
      // Saco abraçado na frente: braços para baixo e para a frente, cotovelos
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
    for (const group of Object.values(arms)) {
      group.position.y = HAND_OFFSET;
      group.rotation.x = 0;
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
    // Debandada: corre de braços para o alto, sem olhar para trás.
    if (panic && stride > .2 && !(strike > 0)) CharacterModel.#posePanic(view, gait);
    // O Conselheiro parado prega: braço direito erguido e a mão falando, o bordão
    // firme na esquerda, a cabeça acompanhando a fala.
    if (preach && idle && !guard) CharacterModel.#posePreach(view, elapsed, seed);
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

  // Colhendo na roça: agachado de cócoras, tronco sobre a planta, as duas mãos
  // alternando — uma estica e arranca, a outra recolhe para junto do corpo — e a
  // vista baixa no que está colhendo.
  static #poseGather(view, elapsed, seed) {
    const { body, neck, legLeft, legRight, shinLeft, shinRight, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    legLeft.rotation.set(-1.05, 0, -.12);
    legRight.rotation.set(-1.05, 0, .12);
    shinLeft.rotation.x = 1.8;
    shinRight.rotation.x = 1.75;
    body.rotation.x = .32;
    body.rotation.z = 0;
    neck.rotation.set(.38, 0, 0);
    const p = elapsed * 3.1 + seed;
    for (const [upper, fore, side, phase] of [[armLeft, forearmLeft, -1, p], [armRight, forearmRight, 1, p + Math.PI]]) {
      const reach = Math.max(0, Math.sin(phase));
      upper.rotation.set(-1.05 - .45 * reach, 0, -side * .12);
      fore.rotation.x = -.95 + .75 * reach;
    }
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

  // Pregação: o braço direito sobe e desce devagar com a mão aberta para o povo, o
  // bordão firme na esquerda, a cabeça acompanhando as frases.
  static #posePreach(view, elapsed, seed) {
    const { neck, armLeft, armRight, forearmLeft, forearmRight } = view.userData;
    const phrase = Math.sin(elapsed * 1.1 + seed);
    armRight.rotation.set(-1.9 - .45 * phrase, 0, .3);
    forearmRight.rotation.x = -.45 - .35 * Math.max(0, -phrase);
    armLeft.rotation.set(-.3, 0, -.1);
    forearmLeft.rotation.x = 0;
    neck.rotation.x = -.12 + phrase * .08;
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
    const { club, axe } = view.userData;
    club.rotation.x = -1.15;
    axe.rotation.x = -1.05;
    if (long && weapon !== 'spear') {
      // Fuzil na mira: a mão esquerda segura o guarda-mão, à frente da direita.
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
    if (kind === 'rifle' || kind === 'blunderbuss') {
      // Tiro: coronha no ombro, rosto encostado nela, cotovelos fechados; o coice
      // joga o ombro para trás e o cano sobe um pouco; depois volta à mira.
      const kick = Math.max(0, 1 - Math.abs(p - .58) / .14);
      armRight.rotation.x = -1.05 - .25 * kick;
      forearmRight.rotation.x = -.45;
      armRight.rotation.z = .1;
      armLeft.rotation.x = -1.15 - .25 * kick;
      forearmLeft.rotation.x = -.33;
      armLeft.rotation.z = -.42;
      body.rotation.x -= .14 * kick;
      body.rotation.y = .12;
      neck.rotation.set(.1, -.1, .14);
      legLeft.rotation.x = -.35;
      shinLeft.rotation.x = .35;
      legRight.rotation.x = .2;
      shinRight.rotation.x = .12;
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
    } else if (kind === 'axe' || kind === 'saber' || kind === 'machete') {
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
