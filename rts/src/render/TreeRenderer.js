import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { WOOD_MATERIALS } from './WoodMaterials.js';
import { PropFactory } from './PropFactory.js';
import { createContactShadow } from './ContactShadow.js';

const STUMP_SHAPE = new THREE.CylinderGeometry(2.2, 2.6, 2.4, 8);

// As árvores da simulação: tremem no golpe, tombam com a física da queda, viram
// toco e rebrotam como muda que cresce.
export class TreeRenderer {
  #layer;
  #props;
  #space;
  #views = new Map();
  #fallAxis = new THREE.Vector3();

  constructor(layer, propFactory, space) {
    this.#layer = layer;
    this.#props = propFactory;
    this.#space = space;
  }

  sync(trees, { elapsed = 0, animate = true, wind = 0 } = {}) {
    for (const tree of trees) {
      let view = this.#views.get(tree);
      if (!view) {
        view = this.#createView(tree);
        this.#views.set(tree, view);
      }
      const { pivot, prop, stump } = view;
      const fall = tree.fall;
      if (fall) {
        // Tomba em direção ao rumo de quem cortou: o eixo é o horizontal
        // perpendicular a esse rumo, e o ângulo vem da física da simulação.
        this.#fallAxis.set(Math.sin(fall.dir), 0, -Math.cos(fall.dir));
        pivot.quaternion.setFromAxisAngle(this.#fallAxis, fall.angle);
        // Deitada, o tronco não pode afundar no chão pela metade da grossura.
        pivot.position.y = Math.sin(fall.angle) * 2.2;
      } else {
        pivot.quaternion.identity();
        pivot.position.y = 0;
      }
      // Tremor do golpe: a copa balança rápido e o balanço morre em meio segundo.
      const shake = animate ? Math.sin(elapsed * 42) * .045 * tree.shake : 0;
      // Vento: balanço lento, cada árvore na sua fase para a mata não ondular em
      // bloco. Caída ou em toco não balança.
      const sway = fall || tree.stump ? 0 : wind * .014;
      const phase = view.swayPhase;
      prop.rotation.set(
        shake + Math.sin(elapsed * 1.3 + phase) * sway,
        view.baseRotation,
        shake * .6 + Math.sin(elapsed * 1.1 + phase * 1.7) * sway * .7
      );
      prop.visible = !tree.stump;
      // Muda nasce pequena e cresce até o tamanho de árvore.
      prop.scale.setScalar(tree.stump ? 1 : .25 + .75 * tree.growth);
      stump.visible = tree.stump || Boolean(fall);
      // Mancha acompanha a copa: cresce com a muda, some quando ela tomba e fica
      // pequena sob o toco.
      const standing = fall ? Math.cos(fall.angle) : 1;
      const cover = tree.stump ? .3 : (.25 + .75 * tree.growth) * standing;
      view.contact.scale.setScalar(view.footprint * Math.max(.3, cover));
    }
  }

  // Árvores em pé que podem tapar um bicho atrás delas (OcclusionFader). Caindo não
  // entra: a queda é rápida e o tronco deitado não esconde ninguém.
  occluders() {
    const list = [];
    for (const [tree, view] of this.#views) {
      if (tree.stump || tree.fall || !view.prop.visible) continue;
      const growth = view.prop.scale.x;
      list.push({
        object: view.prop,
        x: view.pivot.position.x, z: view.pivot.position.z,
        radius: view.footprint * growth,
        height: PropFactory.height(tree.kind) * growth
      });
    }
    return list;
  }

  // Pivô na base do tronco: é em volta dele que a árvore tomba. A árvore de dentro
  // guarda o giro próprio, para o tombo não depender de para onde ela olhava.
  #createView(tree) {
    const pivot = new THREE.Group();
    const prop = this.#props.build(tree.kind, tree.seed, { withShadow: false });
    prop.rotation.y = pseudoRandom(tree.seed + 21) * Math.PI * 2;
    pivot.add(prop);
    // A mancha de contato fica no chão, fora do pivô: não tomba junto com a árvore.
    const contact = createContactShadow(PropFactory.footprint(tree.kind));
    const stump = new THREE.Mesh(STUMP_SHAPE, WOOD_MATERIALS);
    stump.position.y = 1.2;
    stump.castShadow = true;
    stump.visible = false;
    const place = this.#space.toScene(tree.x, tree.y);
    pivot.position.set(place.x, 0, place.z);
    stump.position.x = place.x;
    stump.position.z = place.z;
    contact.position.x = place.x;
    contact.position.z = place.z;
    this.#layer.add(pivot, stump, contact);
    return {
      pivot, prop, stump, contact, footprint: PropFactory.footprint(tree.kind),
      baseRotation: prop.rotation.y,
      swayPhase: pseudoRandom(tree.seed + 37) * Math.PI * 2
    };
  }
}
