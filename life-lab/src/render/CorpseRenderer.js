import * as THREE from 'three';

// Esqueleto de blocos montado nas mesmas medidas do boneco (pés em y = 0, frente em
// +z), para ficar exatamente dentro do corpo e aparecer no lugar certo quando a
// carne some. Geometria compartilhada; o material é de cada corpo, para desbotar.
const BONE_SHAPES = {
  skull: new THREE.BoxGeometry(4.2, 4, 4.4),
  jaw: new THREE.BoxGeometry(3.4, 1, 3),
  socket: new THREE.BoxGeometry(1.1, 1.1, .4),
  nose: new THREE.BoxGeometry(.6, .8, .4),
  vertebra: new THREE.BoxGeometry(.9, .7, .9),
  ribFront: new THREE.BoxGeometry(4.2, .45, .45),
  ribSide: new THREE.BoxGeometry(.45, .45, 2.6),
  sternum: new THREE.BoxGeometry(.6, 3, .4),
  clavicle: new THREE.BoxGeometry(5.8, .5, .5),
  pelvis: new THREE.BoxGeometry(4.4, 1.4, 2.2),
  upperArm: new THREE.BoxGeometry(.7, 3, .7),
  forearm: new THREE.BoxGeometry(.6, 2.6, .6),
  hand: new THREE.BoxGeometry(.9, .9, .5),
  femur: new THREE.BoxGeometry(.8, 2.8, .8),
  shin: new THREE.BoxGeometry(.7, 2.6, .7),
  foot: new THREE.BoxGeometry(1, .5, 1.8)
};
const ROT_GREEN = new THREE.Color(0x6d7a45);
const ROT_DARK = new THREE.Color(0x3d3325);

function createSkeleton(boneMaterial, socketMaterial) {
  const skeleton = new THREE.Group();
  const bone = (shape, x, y, z, material = boneMaterial) => {
    const mesh = new THREE.Mesh(BONE_SHAPES[shape], material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    skeleton.add(mesh);
  };
  bone('skull', 0, 14.3, 0);
  bone('jaw', 0, 11.9, .5);
  bone('socket', -1, 14.6, 2.1, socketMaterial);
  bone('socket', 1, 14.6, 2.1, socketMaterial);
  bone('nose', 0, 13.5, 2.1, socketMaterial);
  for (let i = 0; i < 7; i++) bone('vertebra', 0, 5.9 + i * .82, -1.1);
  bone('clavicle', 0, 11.1, .5);
  // Costelas em "U": frente e os dois lados, quatro pares descendo pelo peito.
  for (let i = 0; i < 4; i++) {
    const y = 10.4 - i * .85, narrow = 1 - i * .06;
    bone('ribFront', 0, y, 1.25);
    bone('ribSide', -2.1 * narrow, y, 0);
    bone('ribSide', 2.1 * narrow, y, 0);
  }
  bone('sternum', 0, 9.3, 1.5);
  bone('pelvis', 0, 5.7, 0);
  for (const side of [-1, 1]) {
    bone('upperArm', side * 3.7, 9.7, 0);
    bone('forearm', side * 3.7, 6.8, 0);
    bone('hand', side * 3.7, 5.1, 0);
    bone('femur', side * 1.4, 3.9, 0);
    bone('shin', side * 1.4, 1.3, 0);
    bone('foot', side * 1.4, .25, .5);
  }
  return skeleton;
}

// Cor da carne apodrecendo: primeiro esverdeia, depois escurece até quase preto.
function rotColor(target, base, rot) {
  const green = Math.min(1, rot / .45);
  target.copy(base).lerp(ROT_GREEN, green * .75);
  if (rot > .45) target.lerp(ROT_DARK, Math.min(1, (rot - .45) / .35));
}

// Os mortos: o corpo tomba, apodrece, murcha e some até sobrar o esqueleto, que
// desbota no fim dos dias dele.
export class CorpseRenderer {
  #layer;
  #characters;
  #space;
  #views = new Map();

  constructor(layer, characterModel, space) {
    this.#layer = layer;
    this.#characters = characterModel;
    this.#space = space;
  }

  sync(corpses, { fall = .9, decay = .45, total = 2.45, lifeSize = 10 } = {}) {
    const seen = new Set();
    for (const corpse of corpses) {
      seen.add(corpse);
      let view = this.#views.get(corpse);
      if (!view) {
        view = this.#createView(corpse);
        this.#layer.add(view);
        this.#views.set(corpse, view);
      }
      const data = view.userData;
      const place = this.#space.toScene(corpse.x, corpse.y);
      // Queda: tomba de lado em volta dos pés, acelerando como corpo mole caindo, e
      // assenta com um quiquezinho. Deitado de lado, sobe a meia largura do corpo
      // para não afundar no chão.
      const f = Math.min(1, corpse.time / fall);
      const bounce = f >= 1 ? 0 : Math.sin(Math.max(0, f - .8) / .2 * Math.PI) * .06;
      const tip = (f * f - bounce) * Math.PI / 2;
      view.position.set(place.x, 2.2 * f * f, place.z);
      view.rotation.set(0, Math.PI / 2 - corpse.heading, 0);
      view.rotateZ(corpse.direction * tip);
      view.scale.setScalar(corpse.size / lifeSize);

      // Decomposição: esverdeia, escurece, murcha e a carne vai sumindo até só o
      // esqueleto ficar. A partir daí, ele espera os 2 dias e desbota no fim.
      const rot = Math.min(1, corpse.age / decay);
      rotColor(data.bodyMaterial.color, data.skinBase, rot);
      rotColor(data.outfitMaterial.color, data.clothBase, rot * .8);
      rotColor(data.hairMaterial.color, data.hairBase, rot);
      const fleshOpacity = rot < .5 ? 1 : Math.max(0, 1 - (rot - .5) / .42);
      for (const material of data.flesh) material.opacity = fleshOpacity;
      data.body.visible = fleshOpacity > .01;
      // Murchar: a carne perde volume, sobretudo na largura.
      const wither = 1 - Math.min(1, rot / .9) * .28;
      data.body.scale.set(wither, 1, wither);

      data.skeleton.visible = rot > .45;
      const remaining = total - corpse.age;
      const boneOpacity = remaining < .25 ? Math.max(0, remaining / .25) : 1;
      data.boneMaterial.opacity = boneOpacity;
      data.socketMaterial.opacity = boneOpacity;
    }
    for (const [corpse, view] of this.#views) {
      if (seen.has(corpse)) continue;
      this.#layer.remove(view);
      const data = view.userData;
      for (const material of [data.bodyMaterial, data.outfitMaterial, data.hairMaterial,
        data.boneMaterial, data.socketMaterial]) material.dispose();
      this.#views.delete(corpse);
    }
  }

  #createView(corpse) {
    const characters = this.#characters;
    const view = characters.create(corpse.sex === 'female');
    characters.dress(view, corpse.color, corpse.outfit);
    // Pose neutra uma vez só: um corpo caído não anda, então nada a recalcular.
    characters.pose(view, { gait: 0, pace: 0, lean: 0, bellyScale: 1, animate: false });
    const data = view.userData;
    // Cabelo sai do material compartilhado, porque vai apodrecer junto com o resto.
    data.hairMaterial = characters.hairMaterial.clone();
    data.body.traverse(node => {
      if (node.isMesh && node.material === characters.hairMaterial) node.material = data.hairMaterial;
    });
    data.flesh = [data.bodyMaterial, data.outfitMaterial, data.hairMaterial];
    for (const material of data.flesh) material.transparent = true;
    data.skinBase = new THREE.Color(corpse.color);
    data.clothBase = new THREE.Color(corpse.outfit || corpse.color);
    data.hairBase = characters.hairMaterial.color.clone();
    data.boneMaterial = new THREE.MeshLambertMaterial({ color: 0xe9e1c8, transparent: true });
    data.socketMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2218, transparent: true });
    data.skeleton = createSkeleton(data.boneMaterial, data.socketMaterial);
    data.skeleton.visible = false;
    view.add(data.skeleton);
    return view;
  }
}
