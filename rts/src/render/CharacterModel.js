import * as THREE from 'three';
import { easeInOut } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { WOOD_MATERIALS, LOG_RADIUS } from './WoodMaterials.js';
import { addVerticalShade } from './Shading.js';

const HIP_HEIGHT = 5.4;
const SHOULDER_HEIGHT = 11.2;
const HAND_OFFSET = -5.4;
// Altura para erguer o corpo deitado: metade da cabeça, a parte mais grossa, para
// nada afundar no chão quando ele tomba de costas em volta dos pés.
const LYING_LIFT = 2.6;
// Altura do centro da barriga da gravidez: a metade de baixo do tronco.
const BELLY_HEIGHT = 7.6;

// Bichos nascem e morrem sem parar. Geometria e material que não mudam ficam aqui,
// criados uma vez e compartilhados por todos; só a cor do corpo e da roupa é por
// indivíduo, e essa é descartada quando o bicho sai.
// Os blocos do corpo levam o degradê de sombra (Shading): pé e barra da roupa um
// pouco mais escuros, ombro e cocuruto mais claros — dá volume sem luz extra.
const SHAPES = {
  // Perna e braço têm a geometria deslocada para que o ponto (0,0,0) caia no quadril
  // e no ombro. Sem isso o giro acontece no meio do bloco e o membro fica tesourando
  // em volta do próprio centro em vez de balançar pendurado na articulação.
  leg: addVerticalShade(new THREE.BoxGeometry(2.4, 5.4, 2.4).translate(0, -2.7, 0), .66, 1),
  torso: addVerticalShade(new THREE.BoxGeometry(5.6, 6, 3.2), .82, 1.06),
  arm: addVerticalShade(new THREE.BoxGeometry(1.8, 5.6, 2.2).translate(0, -2.8, 0), .8, 1.04),
  head: addVerticalShade(new THREE.BoxGeometry(5, 5, 5), .86, 1.08),
  hair: addVerticalShade(new THREE.BoxGeometry(5.4, 1.4, 5.4), .85, 1.12),
  braid: addVerticalShade(new THREE.BoxGeometry(4.2, 4.4, 1.2), .75, 1.05),
  // Barriga da gravidez: um bloco que cresce para a frente do tronco.
  belly: addVerticalShade(new THREE.BoxGeometry(4.6, 4.2, 3.2), .78, 1.04),
  eye: new THREE.BoxGeometry(.9, 1.1, .3)
};
const HAIR_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.hair, vertexColors: true });
// Olho é o que faz o boneco parecer vivo de perto: dois pontinhos escuros na frente
// da cabeça, que piscam, fecham no sono e apertam no choro.
const EYE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x26201a });
const EYE_HEIGHT = 14.5;
const EYE_SPREAD = 1.15;
// Um pouco à frente da face da cabeça (meia-largura 2,5) para não brigar no z-buffer.
const EYE_DEPTH = 2.55;
const CARRIED_LOG_SHAPE = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 11, 8).rotateX(Math.PI / 2);
// Machado: cabo de madeira saindo da mão e cabeça de ferro de lado, com o fio
// virado para o sentido do golpe. Geometria deslocada para a origem cair na mão.
const AXE_HANDLE_SHAPE = new THREE.BoxGeometry(.7, 9.5, .7).translate(0, -3.4, 0);
const AXE_HEAD_SHAPE = new THREE.BoxGeometry(3.4, 2.2, .6).translate(-1.3, -7.6, 0);
const AXE_HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa0784a });
const AXE_HEAD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9aa2a8 });
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
// Mão: o braço agora é manga; a mão na ponta continua da cor da pele.
const HAND_SHAPE = addVerticalShade(new THREE.BoxGeometry(1.9, 1.5, 2.2).translate(0, -6.1, 0), .85, 1.05);

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
  stripe: new THREE.BoxGeometry(.35, 5, .7).translate(0, -2.7, 0),
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
    const build = (geometry, material, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      body.add(mesh);
      return mesh;
    };
    const legLeft = build(SHAPES.leg, bodyMaterial, -1.4, HIP_HEIGHT, 0);
    const legRight = build(SHAPES.leg, bodyMaterial, 1.4, HIP_HEIGHT, 0);
    const torso = build(SHAPES.torso, bodyMaterial, 0, 8.4, 0);
    const belly = build(SHAPES.belly, bodyMaterial, 0, BELLY_HEIGHT, 0);
    belly.visible = false;
    const armLeft = build(SHAPES.arm, bodyMaterial, -3.7, SHOULDER_HEIGHT, 0);
    const armRight = build(SHAPES.arm, bodyMaterial, 3.7, SHOULDER_HEIGHT, 0);
    for (const arm of [armLeft, armRight]) {
      const hand = new THREE.Mesh(HAND_SHAPE, bodyMaterial);
      hand.castShadow = true;
      arm.add(hand);
    }
    // Giro em y depois do x: com o braço já erguido para a frente, o y o leva para os
    // lados no plano horizontal (a varrida do porrete). Sem y, é igual ao XYZ.
    armRight.rotation.order = 'YXZ';
    const head = build(SHAPES.head, bodyMaterial, 0, 14, 0);
    // Pequenos demais para projetar sombra que se veja: fora do mapa de sombra.
    const eyes = [-EYE_SPREAD, EYE_SPREAD].map(x => {
      const eye = build(SHAPES.eye, EYE_MATERIAL, x, EYE_HEIGHT, EYE_DEPTH);
      eye.castShadow = false;
      return eye;
    });
    // Tudo o que sai junto quando a cabeça é arrancada.
    const headParts = [head, ...eyes];
    if (hasHair) {
      headParts.push(build(SHAPES.hair, HAIR_MATERIAL, 0, 16.4, 0));
      headParts.push(build(SHAPES.braid, HAIR_MATERIAL, 0, 13.4, -2.9));
    }
    const stump = build(STUMP_SHAPE, STUMP_MATERIAL, 0, 11.8, 0);
    stump.visible = false;
    // Machado na mão direita, só à vista enquanto corta.
    const axe = new THREE.Group();
    axe.position.y = HAND_OFFSET;
    for (const [shape, material] of [[AXE_HANDLE_SHAPE, AXE_HANDLE_MATERIAL], [AXE_HEAD_SHAPE, AXE_HEAD_MATERIAL]]) {
      const part = new THREE.Mesh(shape, material);
      part.castShadow = true;
      axe.add(part);
    }
    axe.visible = false;
    armRight.add(axe);
    const weaponOf = parts => {
      const group = new THREE.Group();
      group.position.y = HAND_OFFSET;
      for (const [shape, material] of parts) {
        const part = new THREE.Mesh(shape, material);
        part.castShadow = true;
        group.add(part);
      }
      group.visible = false;
      armRight.add(group);
      return group;
    };
    const club = weaponOf([[CLUB_SHAPE, CLUB_MATERIAL], [CLUB_KNOB_SHAPE, CLUB_MATERIAL]]);
    const spear = weaponOf([[SPEAR_SHAFT_SHAPE, AXE_HANDLE_MATERIAL], [SPEAR_TIP_SHAPE, SPEAR_TIP_MATERIAL]]);
    const arms = {
      club, spear,
      rifle: weaponOf([[STOCK_SHAPE, GUNSTOCK_MATERIAL], [BARREL_SHAPE, GUNMETAL_MATERIAL]]),
      bayonet: weaponOf([[STOCK_SHAPE, GUNSTOCK_MATERIAL], [BARREL_SHAPE, GUNMETAL_MATERIAL],
        [BAYONET_SHAPE, BLADE_MATERIAL]]),
      blunderbuss: weaponOf([[STOCK_SHAPE, GUNSTOCK_MATERIAL], [SHORT_BARREL_SHAPE, BRASS_MATERIAL],
        [MUZZLE_SHAPE, BRASS_MATERIAL]]),
      machete: weaponOf([[GRIP_SHAPE, GUNSTOCK_MATERIAL], [MACHETE_SHAPE, BLADE_MATERIAL]]),
      saber: weaponOf([[GRIP_SHAPE, GUNMETAL_MATERIAL], [SABER_GUARD_SHAPE, BRASS_MATERIAL],
        [SABER_SHAPE, BLADE_MATERIAL]])
    };
    // Feridas em lugares fixos, aparecendo uma a uma: peito, barriga, braço, coxa e
    // rosto; a do braço e a da perna presas ao membro, para balançar junto.
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
      wound(body, -1.3, 7.4, 1.7, -.4),
      wound(armLeft, 0, -3, 1.2, .3),
      wound(legRight, 0, -2.4, 1.3, -.5),
      wound(body, -1.6, 15, 2.6, .2)
    ];
    // Tora no ombro direito, deitada para a frente, como se carrega de verdade.
    const shoulderLog = build(CARRIED_LOG_SHAPE, WOOD_MATERIALS, 3.3, 12.6, 0);
    shoulderLog.visible = false;
    const gear = CharacterModel.#buildLook(group, body, armLeft, legLeft, legRight);
    headParts.push(...gear.head);
    group.userData = {
      bodyMaterial, outfitMaterial, trousersMaterial, body, torso, belly, legLeft, legRight, armLeft,
      armRight, axe, shoulderLog, eyes, club, spear, arms, wounds, headParts, stump, gear: gear.parts
    };
    return group;
  }

  // As peças do traje, todas escondidas; `equip` liga as de cada um. O canhão vai no
  // grupo de fora (não ginga com o corpo), à frente de quem empurra.
  static #buildLook(group, body, armLeft, legLeft, legRight) {
    const add = (parent, shape, x, y, z) => {
      const mesh = new THREE.Mesh(LOOK_SHAPES[shape], lookMaterial(0xffffff));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.visible = false;
      parent.add(mesh);
      return mesh;
    };
    const strapA = add(body, 'strap', 0, 8.6, 1.75);
    strapA.rotation.z = .62;
    const strapB = add(body, 'strap', 0, 8.6, 1.78);
    strapB.rotation.z = -.62;
    const tail = add(body, 'scarfTail', 0, 14.2, -3);
    tail.rotation.x = .25;
    const kepi = add(body, 'kepi', 0, 17.6, -.15);
    kepi.rotation.x = -.08;
    const parts = {
      brimLeather: add(body, 'brimLeather', 0, 16.5, 0),
      crownLeather: add(body, 'crownLeather', 0, 17.9, 0),
      brimStraw: add(body, 'brimStraw', 0, 16.5, 0),
      crownStraw: add(body, 'crownStraw', 0, 17.7, 0),
      kepi,
      kepiBand: add(body, 'kepiBand', 0, 16.6, -.1),
      visor: add(body, 'visor', 0, 16.25, 2.9),
      scarf: add(body, 'scarf', 0, 16.4, -.15),
      scarfTail: tail,
      skirt: add(body, 'skirt', 0, 3.5, 0),
      robe: add(body, 'robe', 0, 3.3, 0),
      beard: add(body, 'beard', 0, 10.6, 2.5),
      hairSides: [add(body, 'hairSide', -2.75, 13.6, -.3), add(body, 'hairSide', 2.75, 13.6, -.3)],
      longHair: add(body, 'longHair', 0, 13.2, -2.85),
      staff: add(armLeft, 'staff', 0, HAND_OFFSET, 0),
      gibao: add(body, 'gibao', 0, 8.5, 0),
      bandolier: strapA,
      crossStrap: strapB,
      waistBelt: add(body, 'waistBelt', 0, 6.1, 0),
      pouches: [add(body, 'pouch', -1.6, 6.1, 1.9), add(body, 'pouch', 1.6, 6.1, 1.9)],
      pack: add(body, 'pack', 0, 9.4, -2.5),
      bedroll: add(body, 'bedroll', 0, 12, -2.5),
      satchel: add(body, 'satchel', 3.1, 6.6, .4),
      stripes: [add(legLeft, 'stripe', -1.25, 0, 0), add(legRight, 'stripe', 1.25, 0, 0)],
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
    const { bodyMaterial, outfitMaterial, trousersMaterial, torso, belly, legLeft, legRight, armLeft, armRight } = view.userData;
    bodyMaterial.color.set(bodyColor);
    const wanted = outfit ? outfitMaterial : bodyMaterial;
    if (outfit) outfitMaterial.color.set(outfit);
    const legs = outfit && trousers ? trousersMaterial : wanted;
    if (trousers) trousersMaterial.color.set(trousers);
    if (torso.material === wanted && legLeft.material === legs) return;
    // A barriga veste junto com o tronco: a roupa estica por cima dela.
    for (const part of [torso, belly, armLeft, armRight]) part.material = wanted;
    for (const part of [legLeft, legRight]) part.material = legs;
  }

  // Um passo: pernas em oposição, braços na fase contrária às pernas do mesmo lado
  // (é como a gente anda de verdade), amplitude crescendo com a velocidade e o corpo
  // subindo duas vezes por ciclo, porque o quadril sobe a cada apoio. Por cima do
  // passo entram as poses de choro, de golpe de machado e de tora no ombro.
  pose(view, motion) {
    const { body, legLeft, legRight, armLeft, armRight, torso } = view.userData;
    const { gait, pace, lean, bellyScale, animate, rest = 0, breath = 0, eyes = 1 } = motion;
    // 1 é olho aberto; fechado vira um risco fino, não some.
    for (const eye of view.userData.eyes) eye.scale.y = Math.max(.12, eyes);
    const awake = 1 - rest;
    // Amplitude: com esta perna (5,4) e este passo, o pé só ficaria plantado de verdade
    // perto de 59°, o que vira passada de lunge. 41° deixa ~30% de deslize e
    // uma passada que parece passada. O bicho anda 2,1 alturas de corpo por segundo,
    // então a cadência rápida não é erro: para o tamanho dele isso é trote.
    const swing = animate ? Math.sin(gait) * .72 * pace * awake : 0;
    legLeft.rotation.x = swing;
    legRight.rotation.x = -swing;
    // Dormindo, os braços escorregam um pouco para o lado do corpo.
    armLeft.rotation.x = -swing * .78;
    armRight.rotation.x = swing * .78;
    armLeft.rotation.z = -.35 * rest;
    armRight.rotation.z = .35 * rest;
    const bob = animate ? (1 - Math.cos(gait * 2)) * .45 * pace : 0;
    body.position.y = bob * awake + LYING_LIFT * rest;
    body.rotation.z = animate ? Math.sin(gait) * .05 * pace * awake : 0;
    // Deitar é tombar de costas em volta dos pés: -90° em x põe o rosto para cima.
    body.rotation.x = lean * awake - Math.PI / 2 * rest;
    // Respiração do sono: o peito sobe e desce, que deitado é a escala em z.
    const chest = 1 + breath * .06 * rest;
    torso.scale.set(bellyScale, 1, bellyScale * chest);
    body.rotation.y = 0;

    const { chop = null, carrying = false, crying = false, elapsed = 0 } = motion;
    if (crying) CharacterModel.#poseCrying(view, animate, elapsed);
    const { axe, shoulderLog } = view.userData;
    axe.visible = chop !== null;
    shoulderLog.visible = carrying && chop === null;
    if (chop !== null) CharacterModel.#poseChopping(view, chop);
    else if (carrying) {
      // Mão direita no alto segurando a tora sobre o ombro; a esquerda balança.
      armRight.rotation.x = -2.75;
      armRight.rotation.z = -.15;
    }

    // Chama Primordial: braço esquerdo erguido, como quem carrega uma tocha.
    const { torch = false, strike = 0 } = motion;
    if (torch && !crying && rest < .5) {
      armLeft.rotation.x = -2.95;
      armLeft.rotation.z = .12;
    }
    // Briga: arma na mão, guarda alta, o golpe de cada arma e o recuo de quem apanha.
    const { weapon = null, guard = false, strikeKind = null, hurt = 0, wounds = 0, pushing = false } = motion;
    const { club, spear, arms } = view.userData;
    for (const [kind, group] of Object.entries(arms)) group.visible = weapon === kind;
    // Arma de fogo fora da mira vai de cano para cima, apoiada no ombro (a coronha
    // na mão); na mira e no tiro, deitada para a frente.
    const shouldered = ['rifle', 'bayonet', 'blunderbuss'].includes(weapon) && !guard && !(strike > 0);
    for (const group of Object.values(arms)) {
      group.position.y = HAND_OFFSET;
      group.rotation.x = 0;
    }
    if (shouldered) {
      arms[weapon].rotation.x = Math.PI;
      arms[weapon].position.y = HAND_OFFSET + 1.5;
    }
    // A guarnição do canhão empurra a carreta com os dois braços para a frente.
    if (pushing && rest < .5) {
      armLeft.rotation.x = armRight.rotation.x = -1.25;
      armLeft.rotation.z = .2;
      armRight.rotation.z = -.2;
      body.rotation.x += .18;
    }
    armRight.rotation.y = 0;
    club.rotation.x = 0;
    axe.rotation.x = 0;
    spear.position.y = HAND_OFFSET;
    if (weapon === 'axe') axe.visible = true;
    view.userData.wounds.forEach((mark, i) => { mark.visible = i < wounds; });
    if (guard && strike <= 0 && rest < .5 && chop === null) CharacterModel.#poseGuard(view, weapon, torch);
    if (strike > 0) CharacterModel.#poseStrike(view, strikeKind, 1 - strike);
    if (hurt > 0 && rest < .5) {
      // Recuo: o tronco joga para trás e torce com o tranco.
      body.rotation.x -= .38 * hurt;
      body.rotation.z += .14 * hurt;
    }

    const { pregnancy = 0, labor = null } = motion;
    CharacterModel.#poseBelly(view, pregnancy);
    if (labor) CharacterModel.#poseLabor(view, labor, rest);
    else if (pregnancy > .55 && chop === null && !carrying && !crying) {
      CharacterModel.#poseLatePregnancy(view, pregnancy, gait, pace, animate, awake);
    }
  }

  // Guarda: meio agachado, arma à frente e o outro braço protegendo o corpo.
  static #poseGuard(view, weapon, torch) {
    const { body, legLeft, legRight, armLeft, armRight } = view.userData;
    body.rotation.x += .12;
    legLeft.rotation.x = -.25;
    legRight.rotation.x = .2;
    const long = LONG_ARMS.has(weapon);
    armRight.rotation.x = long ? -1.35 : -1.05;
    armRight.rotation.z = long ? .1 : -.25;
    // Porrete e machado de pé, apontando para cima e para a frente, prontos para descer.
    const { club, axe } = view.userData;
    club.rotation.x = -1.15;
    axe.rotation.x = -1.05;
    if (long && weapon !== 'spear') {
      // Fuzil na mira: a mão esquerda segura o guarda-mão, à frente da direita.
      armLeft.rotation.x = -1.45;
      armLeft.rotation.z = -.42;
    } else if (!torch) {
      armLeft.rotation.x = -1.2;
      armLeft.rotation.z = .45;
    }
  }

  // Um golpe por arma, com `p` de 0 a 1 ao longo da animação:
  // porrete: puxa para o lado e varre na horizontal, com o tronco girando junto;
  // lança: recolhe e estoca reto para a frente, num bote do corpo inteiro;
  // machado: ergue acima da cabeça e desce de cima a baixo.
  static #poseStrike(view, kind, p) {
    const { body, legLeft, legRight, armLeft, armRight, arms } = view.userData;
    const phase = (from, to) => Math.max(0, Math.min(1, (p - from) / (to - from)));
    // O canhão dispara sozinho: a guarnição continua agarrada à carreta.
    if (kind === 'cannon') return;
    if (kind === 'rifle' || kind === 'blunderbuss') {
      // Tiro: fuzil no ombro e na mira, o coice no disparo joga o ombro para trás e o
      // cano sobe um pouco; depois volta à mira.
      const kick = Math.max(0, 1 - Math.abs(p - .58) / .14);
      armRight.rotation.x = -1.5 - .25 * kick;
      armRight.rotation.z = .1;
      armLeft.rotation.x = -1.48 - .25 * kick;
      armLeft.rotation.z = -.42;
      body.rotation.x -= .14 * kick;
      body.rotation.y = .12;
      return;
    }
    if (kind === 'spear' || kind === 'bayonet') {
      const spear = arms[kind];
      // A lança fica na horizontal: recua ao longo do próprio eixo (o braço puxa para
      // trás, o corpo inclina para trás) e então avança de uma vez no bote.
      const draw = easeInOut(phase(0, .4)), thrust = phase(.4, .55), back = easeInOut(phase(.6, 1));
      const reach = thrust * (1 - back);
      const pulled = draw * (1 - thrust);
      armRight.rotation.x = -1.5 - .1 * reach;
      armRight.rotation.z = .1;
      spear.position.y = HAND_OFFSET + 5 * pulled - 3 * reach;
      body.rotation.x += -.16 * pulled + .38 * reach;
      legLeft.rotation.x = -.5 * reach;
      legRight.rotation.x = .35 * reach;
    } else if (kind === 'axe' || kind === 'saber') {
      const lift = easeInOut(phase(0, .5)), chop = phase(.5, .65), back = easeInOut(phase(.7, 1));
      const down = chop * chop;
      armRight.rotation.x = -3.05 * lift * (1 - down) - .55 * down * (1 - back) - .9 * (1 - lift) * (1 - back);
      armRight.rotation.z = -.15;
      body.rotation.x += -.18 * lift * (1 - down) + .42 * down * (1 - back);
    } else {
      // Braço na horizontal à frente; o giro em y o leva para trás pela direita e
      // depois varre até a esquerda, com o tronco girando junto.
      const wind = easeInOut(phase(0, .45)), sweep = phase(.45, .65), back = easeInOut(phase(.7, 1));
      const swing = 1.25 * wind - 2.45 * sweep * sweep;
      armRight.rotation.x = -1.5 * Math.max(wind, 1 - back) - .1;
      armRight.rotation.y = swing * (1 - back);
      armRight.rotation.z = 0;
      body.rotation.y = (.5 * wind - 1 * sweep) * (1 - back);
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
    const { body, legLeft, legRight, armLeft, armRight } = view.userData;
    const standing = 1 - rest;
    // Em pé, na contração.
    body.rotation.x = .38 * contraction * standing - Math.PI / 2 * rest + push * .34 * rest;
    body.rotation.z = 0;
    body.position.y = LYING_LIFT * rest + push * .5 * rest;
    const knees = 1.05 + push * .12;
    const spread = .42 + push * .1;
    legLeft.rotation.set(-knees * rest + .18 * contraction * standing, 0, -spread * rest);
    legRight.rotation.set(-knees * rest + .18 * contraction * standing, 0, spread * rest);
    for (const [arm, side] of [[armLeft, -1], [armRight, 1]]) {
      arm.rotation.x = -.9 * contraction * standing - (1.25 + push * .15) * rest;
      arm.rotation.z = -side * (.2 * standing + .38 * rest);
    }
  }

  // Choro: cabeça baixa, as duas mãos no rosto e o soluço sacudindo os ombros.
  static #poseCrying(view, animate, elapsed) {
    const { body, legLeft, legRight, armLeft, armRight } = view.userData;
    const sob = animate ? Math.sin(elapsed * 13) : 0;
    legLeft.rotation.x = 0;
    legRight.rotation.x = 0;
    body.rotation.z = 0;
    body.rotation.x = .32 + sob * .03;
    body.position.y = Math.max(0, sob) * .35;
    for (const [arm, side] of [[armLeft, -1], [armRight, 1]]) {
      arm.rotation.x = -2.35 + sob * .06;
      arm.rotation.z = -side * .55;
    }
  }

  // Pernas firmes e afastadas, as duas mãos no cabo (braços para a frente e
  // fechados para o meio), e quem gira é o tronco inteiro. No preparo o machado
  // sobe um pouco; no impacto o corpo se joga levemente para a frente.
  static #poseChopping(view, chop) {
    const { body, legLeft, legRight, armLeft, armRight } = view.userData;
    const twist = chopTwist(chop);
    const raise = Math.max(0, twist) / .95;
    const impact = Math.max(0, 1 - Math.abs(chop - .68) / .08);
    legLeft.rotation.x = .12;
    legRight.rotation.x = -.12;
    body.position.y = 0;
    body.rotation.z = 0;
    body.rotation.y = twist;
    body.rotation.x = .08 + impact * .1;
    for (const [arm, side] of [[armLeft, -1], [armRight, 1]]) {
      arm.rotation.x = -1.2 - raise * .35;
      arm.rotation.z = -side * .38;
    }
  }
}
