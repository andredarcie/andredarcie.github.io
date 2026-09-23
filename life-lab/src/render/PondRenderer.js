import * as THREE from 'three';
import { PALETTE } from './Palette.js';

// Água em Phong e não em Lambert pela única razão que importa aqui: Lambert não tem
// brilho especular, e sem um reflexo a superfície lê como disco pintado, não como
// água. Semitransparente porque em poça rasa se vê o fundo.
const SHALLOW_MATERIAL = new THREE.MeshPhongMaterial({
  color: PALETTE.water, specular: PALETTE.waterShine, shininess: 78,
  transparent: true, opacity: .78, depthWrite: false
});
const DEEP_MATERIAL = new THREE.MeshPhongMaterial({
  color: PALETTE.waterDeep, specular: PALETTE.waterShine, shininess: 92,
  transparent: true, opacity: .9, depthWrite: false
});
const POND_BED_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.pondBed });

// Disco com a borda amassada. Três variantes compartilhadas bastam: cada poça escolhe
// uma e recebe um giro próprio, então nenhuma fica igual à outra sem custar geometria.
function createPuddleGeometry(seed) {
  const geometry = new THREE.CircleGeometry(1, 30);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  // O vértice 0 é o centro; do 1 em diante é a borda, e só ela é deformada.
  for (let i = 1; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const wobble = 1 + Math.sin(angle * 3 + seed) * .11 + Math.sin(angle * 5 + seed * 2.3) * .06;
    position.setX(i, x * wobble);
    position.setZ(i, z * wobble);
  }
  position.needsUpdate = true;
  // Sem recalcular normal: o rotateX já girou as que vieram prontas, a deformação
  // não tira nenhum vértice do plano, e refazer pela orientação das faces só arrisca
  // invertê-las e deixar a água preta.
  return geometry;
}

const PUDDLE_SHAPES = [0, 1, 2].map(i => createPuddleGeometry(i * 2.1 + .7));

// As poças: leito de terra úmida, água rasa por cima e o miolo fundo, respirando.
export class PondRenderer {
  #layer;
  #views = new Map();
  #space;

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  sync(ponds, { elapsed = 0, raining = false, animate = true } = {}) {
    const seen = new Set();
    for (const pond of ponds) {
      seen.add(pond);
      let view = this.#views.get(pond);
      if (!view) {
        const shape = PUDDLE_SHAPES[Math.floor(Math.abs(pond.x + pond.y)) % PUDDLE_SHAPES.length];
        const bed = new THREE.Mesh(shape, POND_BED_MATERIAL);
        const shallow = new THREE.Mesh(shape, SHALLOW_MATERIAL);
        const deep = new THREE.Mesh(shape, DEEP_MATERIAL);
        // Empilhados com folga mínima: o chão é opaco, então água abaixo dele sumiria.
        bed.position.y = .06;
        shallow.position.y = .1;
        deep.position.y = .14;
        bed.receiveShadow = true;
        view = new THREE.Group();
        view.rotation.y = (pond.x + pond.y) % Math.PI;
        view.add(bed, shallow, deep);
        view.userData = { bed, shallow, deep };
        this.#layer.add(view);
        this.#views.set(pond, view);
      }
      const place = this.#space.toScene(pond.x, pond.y);
      view.position.set(place.x, 0, place.z);
      const { bed, shallow, deep } = view.userData;

      // O leito fica no tamanho cheio mesmo com a poça baixa: é a marca de terra
      // úmida que sobra quando a água recua, e é o que conta a história da seca.
      bed.scale.set(pond.fullRadius + 3, 1, pond.fullRadius + 3);
      // Respiro de superfície, mais forte na chuva. Some com prefers-reduced-motion.
      const breath = animate
        ? 1 + Math.sin(elapsed * (raining ? 3.4 : 1.5) + pond.fullRadius) * (raining ? .022 : .009)
        : 1;
      const radius = Math.max(.001, pond.r);
      shallow.scale.set(radius * breath, 1, radius * breath);
      deep.scale.set(radius * .58, 1, radius * .58);
      const wet = pond.r > .5;
      shallow.visible = wet;
      deep.visible = wet;
    }
    for (const [pond, view] of this.#views) {
      if (seen.has(pond)) continue;
      this.#layer.remove(view);
      this.#views.delete(pond);
    }
  }
}
