import * as THREE from 'three';

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
      birthDuration = 1.4, lifeSize = 10, sight = 1, chopSwing = 1.8 } = motion;
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
      // No trabalho de parto o corpo pulsa; é o aviso visual de que vai nascer.
      const labor = animate && o.pregnancy?.labor ? 1 + Math.sin(elapsed * 12) * .04 : 1;
      const scale = o.size / lifeSize * (animate ? .45 + .55 * birth : 1) * labor;

      const feeding = o.eating > 0 || o.drinking > 0;
      // Deitar e levantar levam uns quadros, em vez de o bicho cair duro no chão.
      const restTarget = o.asleep ? 1 : 0;
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
        bellyScale: o.pregnancy
          ? 1 + Math.min(1, o.pregnancy.elapsed / o.pregnancy.duration) * .3 : 1,
        animate,
        // Fase do golpe em 0..1, vinda do mesmo relógio que decide o impacto na
        // simulação: o machado encosta no tronco no quadro em que a árvore treme.
        chop: o.chop ? (animate ? o.chop.timer / chopSwing : .68) : null,
        carrying: o.carrying,
        crying: o.crying,
        elapsed
      });

      // Dentro da cabana o bicho some de vista.
      view.body.visible = !o.inHut;
      view.body.position.set(place.x, 0, place.z);
      view.body.scale.setScalar(scale);
      // O grupo é montado olhando para +z; o rumo da simulação é medido em (x, y),
      // que vira (x, z) aqui, então o giro em torno de y é π/2 menos o rumo.
      view.body.rotation.set(0, Math.PI / 2 - o.heading, 0);
      if (o.life <= 0) {
        view.body.rotation.z = Math.PI / 2.1;
        view.body.position.y = -1.5;
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
      this.#views.delete(id);
    }
  }

  #createView(o) {
    const body = this.#characters.create(o.sex === 'female');
    const halfAngle = o.genes.visionAngle * Math.PI / 360;
    const fan = new THREE.CircleGeometry(o.genes.visionRange, 20, -halfAngle, halfAngle * 2);
    fan.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(fan, new THREE.MeshBasicMaterial({
      color: o.color, transparent: true, opacity: .13, depthWrite: false
    }));
    cone.position.y = .6;
    this.#bodyLayer.add(body);
    this.#visionLayer.add(cone);
    return { body, cone, rest: o.asleep ? 1 : 0 };
  }
}
