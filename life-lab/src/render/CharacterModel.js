import * as THREE from 'three';
import { easeInOut } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { WOOD_MATERIALS, LOG_RADIUS } from './WoodMaterials.js';

const HIP_HEIGHT = 5.4;
const SHOULDER_HEIGHT = 11.2;
const HAND_OFFSET = -5.4;
// Altura para erguer o corpo deitado: metade da cabeça, a parte mais grossa, para
// nada afundar no chão quando ele tomba de costas em volta dos pés.
const LYING_LIFT = 2.6;

// Bichos nascem e morrem sem parar. Geometria e material que não mudam ficam aqui,
// criados uma vez e compartilhados por todos; só a cor do corpo e da roupa é por
// indivíduo, e essa é descartada quando o bicho sai.
const SHAPES = {
  // Perna e braço têm a geometria deslocada para que o ponto (0,0,0) caia no quadril
  // e no ombro. Sem isso o giro acontece no meio do bloco e o membro fica tesourando
  // em volta do próprio centro em vez de balançar pendurado na articulação.
  leg: new THREE.BoxGeometry(2.4, 5.4, 2.4).translate(0, -2.7, 0),
  torso: new THREE.BoxGeometry(5.6, 6, 3.2),
  arm: new THREE.BoxGeometry(1.8, 5.6, 2.2).translate(0, -2.8, 0),
  head: new THREE.BoxGeometry(5, 5, 5),
  hair: new THREE.BoxGeometry(5.4, 1.4, 5.4),
  braid: new THREE.BoxGeometry(4.2, 4.4, 1.2)
};
const HAIR_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.hair });
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
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const outfitMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
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
    const armLeft = build(SHAPES.arm, bodyMaterial, -3.7, SHOULDER_HEIGHT, 0);
    const armRight = build(SHAPES.arm, bodyMaterial, 3.7, SHOULDER_HEIGHT, 0);
    build(SHAPES.head, bodyMaterial, 0, 14, 0);
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
      bodyMaterial, outfitMaterial, body, torso, legLeft, legRight, armLeft, armRight, axe, shoulderLog
    };
    return group;
  }

  // Troca de pano: só mexe no material quando o estado muda de fato, porque isso roda
  // para cada bicho a cada quadro.
  dress(view, bodyColor, outfit) {
    const { bodyMaterial, outfitMaterial, torso, legLeft, legRight } = view.userData;
    bodyMaterial.color.set(bodyColor);
    const wanted = outfit ? outfitMaterial : bodyMaterial;
    if (outfit) outfitMaterial.color.set(outfit);
    if (torso.material === wanted) return;
    torso.material = wanted;
    legLeft.material = wanted;
    legRight.material = wanted;
  }

  // Um passo: pernas em oposição, braços na fase contrária às pernas do mesmo lado
  // (é como a gente anda de verdade), amplitude crescendo com a velocidade e o corpo
  // subindo duas vezes por ciclo, porque o quadril sobe a cada apoio. Por cima do
  // passo entram as poses de choro, de golpe de machado e de tora no ombro.
  pose(view, motion) {
    const { body, legLeft, legRight, armLeft, armRight, torso } = view.userData;
    const { gait, pace, lean, bellyScale, animate, rest = 0, breath = 0 } = motion;
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
