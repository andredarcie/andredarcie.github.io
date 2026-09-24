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

  // O bicho nasce pelado, e pelado ele é da cor do próprio gene de pigmento — é o
  // que mantém o gene de cor visível na arena. Roupa cobre tronco e pernas; cabeça e
  // braços continuam mostrando o corpo, então vestir um grupo não apaga a genética.
  create(hasHair) {
    const group = new THREE.Group();
    // Grupo interno para o corpo: o de fora carrega posição no mundo, rumo e tamanho,
    // e o de dentro fica livre para o gingado, sem um sobrescrever o outro.
    const body = new THREE.Group();
    group.add(body);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    const outfitMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
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
    build(SHAPES.head, bodyMaterial, 0, 14, 0);
    // Pequenos demais para projetar sombra que se veja: fora do mapa de sombra.
    const eyes = [-EYE_SPREAD, EYE_SPREAD].map(x => {
      const eye = build(SHAPES.eye, EYE_MATERIAL, x, EYE_HEIGHT, EYE_DEPTH);
      eye.castShadow = false;
      return eye;
    });
    if (hasHair) {
      build(SHAPES.hair, HAIR_MATERIAL, 0, 16.4, 0);
      build(SHAPES.braid, HAIR_MATERIAL, 0, 13.4, -2.9);
    }
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
    // Tora no ombro direito, deitada para a frente, como se carrega de verdade.
    const shoulderLog = build(CARRIED_LOG_SHAPE, WOOD_MATERIALS, 3.3, 12.6, 0);
    shoulderLog.visible = false;
    group.userData = {
      bodyMaterial, outfitMaterial, body, torso, belly, legLeft, legRight, armLeft, armRight, axe,
      shoulderLog, eyes
    };
    return group;
  }

  // Troca de pano: só mexe no material quando o estado muda de fato, porque isso roda
  // para cada bicho a cada quadro.
  dress(view, bodyColor, outfit) {
    const { bodyMaterial, outfitMaterial, torso, belly, legLeft, legRight } = view.userData;
    bodyMaterial.color.set(bodyColor);
    const wanted = outfit ? outfitMaterial : bodyMaterial;
    if (outfit) outfitMaterial.color.set(outfit);
    if (torso.material === wanted) return;
    // A barriga veste junto com o tronco: a roupa estica por cima dela.
    for (const part of [torso, belly, legLeft, legRight]) part.material = wanted;
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

    const { pregnancy = 0, labor = null } = motion;
    CharacterModel.#poseBelly(view, pregnancy);
    if (labor) CharacterModel.#poseLabor(view, labor, rest);
    else if (pregnancy > .55 && chop === null && !carrying && !crying) {
      CharacterModel.#poseLatePregnancy(view, pregnancy, gait, pace, animate, awake);
    }
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
