import * as THREE from 'three';
import { createContactShadow } from './ContactShadow.js';
import { groundHeight } from './PondShape.js';
import { smoothstep } from '../core/math.js';
import { NEWBORN_DISTANCE } from '../config/reproduction.js';

// Raio da sombra de contato de um bicho adulto, em unidades do boneco.
const CONTACT_RADIUS = 5.5;
// Tamanho, na tela, com que o filhote aparece (tamanho de nascença × começo da
// animação de crescer): o bebê do parto tem esse tamanho, para a troca não pular.
const NEWBORN_VIEW_SCALE = .55 * .45;
// Onde os pés do bebê começam, no corpo da mãe deitada: a cabeça dele ainda na pelve.
const BABY_START = -9.4;
// Fração da animação de nascer em que o recém-nascido ainda fica deitado no chão.
const NEWBORN_LIE_SHARE = .55;

// Os bichos vivos na cena: boneco, roupa, pose do momento e o leque de visão.
export class OrganismRenderer {
  #bodyLayer;
  #visionLayer;
  #characters;
  #space;
  #views = new Map();

  constructor(bodyLayer, visionLayer, characterModel, space) {
    this.#bodyLayer = bodyLayer;
    this.#visionLayer = visionLayer;
    this.#characters = characterModel;
    this.#space = space;
    // Cones de visão nascem desligados: são ferramenta de inspeção, e com algumas
    // dezenas de bichos a tela vira uma sopa de leques translúcidos. Esconder o grupo
    // inteiro já tira tudo do desenho, sem mexer em cone por cone a cada quadro.
    visionLayer.visible = false;
  }

  setVisionVisible(value) {
    this.#visionLayer.visible = Boolean(value);
  }

  sync(organisms, motion = {}) {
    const { animate = true, elapsed = 0, walkSpeed = 34,
      birthDuration = 1.4, lifeSize = 10, sight = 1, chopSwing = 1.8, ponds = [] } = motion;
    const seen = new Set();
    for (const o of organisms) {
      seen.add(o.id);
      let view = this.#views.get(o.id);
      if (!view) {
        view = this.#createView(o);
        this.#views.set(o.id, view);
      }
      this.#characters.dress(view.body, o.color, o.outfit);
      const place = this.#space.toScene(o.x, o.y);

      // Recém-nascido cresce até o tamanho, em vez de aparecer pronto do nada.
      const birth = o.birthAnimation > 0
        ? 1 - Math.pow(o.birthAnimation / birthDuration, 3) : 1;
      const scale = o.size / lifeSize * (animate ? .45 + .55 * birth : 1);
      const labor = OrganismRenderer.#laborState(o, motion, animate, elapsed);

      const feeding = o.eating > 0 || o.drinking > 0;
      // Deitar e levantar levam uns quadros, em vez de o bicho cair duro no chão.
      // Deita também a mãe no parto, e o recém-nascido fica um instante deitado no
      // chão, onde saiu, antes de se levantar.
      const newbornLying = o.birthAnimation > birthDuration * NEWBORN_LIE_SHARE;
      const restTarget = o.asleep || labor?.lying || newbornLying ? 1 : 0;
      view.rest = animate ? view.rest + (restTarget - view.rest) * .12 : restTarget;
      if (Math.abs(view.rest - restTarget) < .001) view.rest = restTarget;
      this.#characters.pose(view.body, {
        rest: view.rest,
        breath: animate ? Math.sin(elapsed * 2.4 + o.id) : 0,
        // Fase dobrada: gait já acompanha a distância percorrida, mas na escala crua
        // daria uma passada de 18 unidades, longa demais para a perna alcançar.
        gait: o.gait * 2,
        pace: Math.min(1.4, o.speed / walkSpeed),
        // Comendo e bebendo o bicho se inclina para a frente, sobre o recurso.
        lean: feeding ? .38 : 0,
        // O tronco alarga só um pouco; quem cresce de verdade é a barriga (pregnancy).
        bellyScale: o.pregnancy
          ? 1 + Math.min(1, o.pregnancy.elapsed / o.pregnancy.duration) * .07 : 1,
        pregnancy: o.pregnancy ? Math.min(1, o.pregnancy.elapsed / o.pregnancy.duration) : 0,
        labor,
        animate,
        // Fase do golpe em 0..1, vinda do mesmo relógio que decide o impacto na
        // simulação: o machado encosta no tronco no quadro em que a árvore treme.
        chop: o.chop ? (animate ? o.chop.timer / chopSwing : .68) : null,
        carrying: o.carrying,
        crying: o.crying,
        eyes: OrganismRenderer.#eyeOpening(o, view.rest, animate, elapsed, labor),
        elapsed
      });
      this.#syncBaby(view, o, labor, scale);

      // Dentro da cabana o bicho some de vista.
      view.body.visible = !o.inHut;
      // Pisa no chão de verdade: na margem ou numa tigela seca, desce junto com ela.
      view.body.position.set(place.x, groundHeight(o.x, o.y, ponds), place.z);
      view.body.scale.setScalar(scale);
      // O grupo é montado olhando para +z; o rumo da simulação é medido em (x, y),
      // que vira (x, z) aqui, então o giro em torno de y é π/2 menos o rumo.
      view.body.rotation.set(0, Math.PI / 2 - o.heading, 0);
      if (o.life <= 0) {
        view.body.rotation.z = Math.PI / 2.1;
        view.body.position.y -= 1.5;
      }
      // Olho fechado não enxerga: o leque some enquanto ele dorme.
      view.cone.visible = o.life > 0 && !o.asleep;
      view.cone.position.set(place.x, .6, place.z);
      view.cone.rotation.y = -o.heading;
      // No escuro o alcance encolhe; o leque mostra o que o bicho enxerga agora.
      // Pode vir por bicho: perto de uma fogueira o escuro não encolhe tanto a vista.
      const reach = typeof sight === 'function' ? sight(o) : sight;
      view.cone.scale.set(reach, 1, reach);
    }
    for (const [id, view] of this.#views) {
      if (seen.has(id)) continue;
      this.#bodyLayer.remove(view.body);
      this.#visionLayer.remove(view.cone);
      view.cone.geometry.dispose();
      view.cone.material.dispose();
      view.body.userData.bodyMaterial.dispose();
      view.body.userData.outfitMaterial.dispose();
      this.#dropBaby(view);
      this.#views.delete(id);
    }
  }

  // Bichos à vista, para quem estiver na frente deles ficar translúcido
  // (OcclusionFader). Deitado, o bicho é baixo e comprido.
  targets() {
    const list = [];
    for (const view of this.#views.values()) {
      const body = view.body;
      if (!body.visible) continue;
      const scale = body.scale.x;
      list.push({
        x: body.position.x, y: body.position.y, z: body.position.z,
        radius: (3.5 + 4 * view.rest) * scale,
        height: (16 - 11 * view.rest) * scale
      });
    }
    return list;
  }

  // Onde o parto está: fração do trabalho de parto, se a mãe já deitou, a onda de
  // contração (em pé) e a de força (deitada), e quanto do bebê já saiu. Contração e
  // força vêm em ondas, com pausa entre elas, como no parto de verdade.
  static #laborState(o, motion, animate, elapsed) {
    if (!o.pregnancy?.labor) return null;
    const { laborDuration = 5.5, laborLieDown = .18, laborCrown = .34, laborOut = .94 } = motion;
    const remaining = o.pregnancy.duration - o.pregnancy.elapsed;
    const progress = Math.max(0, Math.min(1, 1 - remaining / laborDuration));
    const wave = speed => animate ? Math.pow(Math.max(0, Math.sin(elapsed * speed + o.id)), 2) : .5;
    const lying = progress >= laborLieDown;
    const pushing = progress >= laborCrown && progress < laborOut;
    // O bebê avança durante as ondas de força e recua um tico na pausa, até passar.
    const emerged = smoothstep(laborCrown, laborOut, progress);
    const push = pushing ? wave(2.6) : 0;
    return {
      progress,
      lying,
      contraction: lying ? 0 : wave(3.4),
      push,
      emerged: Math.min(1, emerged + (pushing ? (push - .5) * .04 : 0))
    };
  }

  // O bebê saindo: um boneco pequeno, deitado de costas, pendurado no grupo da mãe.
  // Sai de cabeça, da altura da pelve dela (entre os joelhos erguidos) para a frente,
  // e termina exatamente onde a simulação faz o filhote nascer (NEWBORN_DISTANCE),
  // deitado e do tamanho com que o filhote aparece — a troca não dá salto.
  #syncBaby(view, o, labor, motherScale) {
    if (!labor || labor.emerged <= 0) {
      if (!o.pregnancy?.labor) this.#dropBaby(view);
      else if (view.baby) view.baby.visible = false;
      return;
    }
    if (!view.baby) {
      view.baby = this.#characters.create(false);
      this.#characters.dress(view.baby, o.pregnancy.color ?? o.color, null);
      view.body.add(view.baby);
    }
    const baby = view.baby;
    baby.visible = true;
    // Virado para a mãe: deitado, a cabeça dele aponta para longe dela.
    baby.rotation.set(0, Math.PI, 0);
    baby.scale.setScalar(NEWBORN_VIEW_SCALE / Math.max(.01, motherScale));
    baby.position.set(0, 0, BABY_START + (NEWBORN_DISTANCE - BABY_START) * labor.emerged);
    this.#characters.pose(baby, {
      gait: 0, pace: 0, lean: 0, bellyScale: 1, animate: false, rest: 1, eyes: .12
    });
  }

  #dropBaby(view) {
    if (!view.baby) return;
    view.body.remove(view.baby);
    view.baby.userData.bodyMaterial.dispose();
    view.baby.userData.outfitMaterial.dispose();
    view.baby = null;
  }

  // Quanto o olho está aberto, de 0 a 1: fecha junto com o deitar, aperta no choro e,
  // acordado, pisca rápido a cada ~3 s, cada bicho no seu tempo. No parto a mãe está
  // deitada mas acordada: olho aberto, apertado na contração e na força.
  static #eyeOpening(o, rest, animate, elapsed, labor) {
    let open = labor ? .8 : 1 - rest;
    if (labor) open -= Math.max(labor.push, labor.contraction) * .62;
    if (o.crying) open = Math.min(open, .45);
    if (animate && ((elapsed * .35 + o.id * .37) % 1) < .04) open = Math.min(open, .12);
    return open;
  }

  #createView(o) {
    const body = this.#characters.create(o.sex === 'female');
    // Mancha no pé, no grupo de fora: acompanha posição e tamanho, mas não o gingado
    // nem o deitar do corpo.
    body.add(createContactShadow(CONTACT_RADIUS));
    const halfAngle = o.genes.visionAngle * Math.PI / 360;
    const fan = new THREE.CircleGeometry(o.genes.visionRange, 20, -halfAngle, halfAngle * 2);
    fan.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(fan, new THREE.MeshBasicMaterial({
      color: o.color, transparent: true, opacity: .13, depthWrite: false
    }));
    cone.position.y = .6;
    this.#bodyLayer.add(body);
    this.#visionLayer.add(cone);
    // Recém-nascido já começa deitado, como o bebê do parto terminou.
    return { body, cone, rest: o.asleep || o.birthAnimation > 0 ? 1 : 0, baby: null };
  }
}
