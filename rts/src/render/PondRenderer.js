import * as THREE from 'three';
import { PALETTE } from './Palette.js';
import { rimWobble, pondSeed, waterLevel } from './PondShape.js';

// Ondulação da superfície: um mapa de normais que emenda nas bordas, feito de ondas
// senoidais cruzadas. Deslizando devagar, faz o brilho do sol tremular e se partir
// como em água de verdade, em vez de uma mancha clara parada.
function paintRippleNormals() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const tau = Math.PI * 2;
  // Altura como soma de ondas com número inteiro de ciclos, para emendar sem costura.
  const height = (x, y) =>
    Math.sin((x * 3 + y * 1) / size * tau) * .5 +
    Math.sin((x * -2 + y * 4) / size * tau + 1.3) * .35 +
    Math.sin((x * 5 - y * 3) / size * tau + 2.1) * .2 +
    Math.sin((x * 1 + y * 7) / size * tau + .4) * .15;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      const length = Math.hypot(dx, dy, .35);
      const offset = (y * size + x) * 4;
      image.data[offset] = (-dx / length * .5 + .5) * 255;
      image.data[offset + 1] = (-dy / length * .5 + .5) * 255;
      image.data[offset + 2] = (.35 / length * .5 + .5) * 255;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}
const RIPPLES = paintRippleNormals();

// Quanto a água puxa a cor do céu: de dia azul-esverdeada, dourada no pôr do sol,
// quase preta de noite — como um espelho meio transparente.
const SKY_REFLECTION = .32;
const FOAM_WIDTH = .045;

// Disco da água em anéis, com cor e transparência por vértice: na margem a água é
// rasa, clara e deixa ver a lama do fundo; no meio é funda, escura e quase opaca.
// A borda ondula igual à da tigela do chão (PondShape), então a água encosta na
// margem certinho em qualquer nível.
function buildWater(seed) {
  const geometry = new THREE.RingGeometry(.0001, 1, 56, 7).rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 4);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const radial = Math.min(1, Math.hypot(x, z));
    const wobble = rimWobble(Math.atan2(z, x), seed);
    position.setX(i, x * wobble);
    position.setZ(i, z * wobble);
    // Profundidade relativa da tigela (parábola) naquele ponto.
    const depth = 1 - radial * radial;
    const tone = 1.18 - .6 * depth;
    colors.set([tone, tone, tone * 1.02, .34 + .6 * Math.sqrt(depth)], i * 4);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return geometry;
}

// Espuma: fita fina logo na margem, com a mesma ondulação.
function buildFoam(seed) {
  const geometry = new THREE.RingGeometry(1 - FOAM_WIDTH, 1 + FOAM_WIDTH * .4, 72, 1)
    .rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const wobble = rimWobble(Math.atan2(z, x), seed);
    position.setX(i, x * wobble);
    position.setZ(i, z * wobble);
  }
  return geometry;
}

// Os lagos: a tigela é o próprio chão (TerrainRenderer); aqui fica a água dentro dela,
// na altura que o volume manda — cheia, rente à margem; secando, lá embaixo, com a
// lama exposta em volta —, mais a espuma na beira.
export class PondRenderer {
  #layer;
  #views = new Map();
  #space;
  #tint = new THREE.Color();
  #baseColor = new THREE.Color(PALETTE.water);

  constructor(layer, space) {
    this.#layer = layer;
    this.#space = space;
  }

  // `sky`: cor do horizonte agora, que a água reflete.
  sync(ponds, { elapsed = 0, raining = false, animate = true, sky = null } = {}) {
    // A ondulação escorre com o vento, mais agitada na chuva.
    if (animate) RIPPLES.offset.set(elapsed * .018, elapsed * (raining ? .03 : .011));
    const tint = this.#tint.copy(this.#baseColor);
    if (sky) tint.lerp(sky, SKY_REFLECTION);
    const seen = new Set();
    for (const pond of ponds) {
      seen.add(pond);
      let view = this.#views.get(pond);
      if (!view) {
        view = this.#createView(pond);
        this.#views.set(pond, view);
      }
      const { group, water, foam } = view;
      const place = this.#space.toScene(pond.x, pond.y);
      group.position.set(place.x, 0, place.z);
      const wet = pond.r > .5;
      water.visible = foam.visible = wet;
      if (!wet) continue;
      const level = waterLevel(pond.r, pond.fullRadius);
      // Respiro de superfície, mais forte na chuva. Some com prefers-reduced-motion.
      const breath = animate
        ? 1 + Math.sin(elapsed * (raining ? 3.4 : 1.5) + pond.fullRadius) * (raining ? .012 : .005)
        : 1;
      water.position.y = level + .14;
      water.scale.set(pond.r * breath, 1, pond.r * breath);
      // Lago cheio é mais fundo, então mais opaco; poça rasa quase só mostra o fundo.
      const fill = pond.r / pond.fullRadius;
      water.material.color.copy(tint);
      water.material.opacity = .55 + .45 * fill * fill;
      foam.position.y = level + .2;
      foam.scale.set(pond.r * breath, 1, pond.r * breath);
      foam.material.opacity = animate
        ? .32 + Math.sin(elapsed * 2.2 + pond.fullRadius) * .12 + (raining ? .15 : 0)
        : .35;
    }
    for (const [pond, view] of this.#views) {
      if (seen.has(pond)) continue;
      this.#layer.remove(view.group);
      for (const mesh of [view.water, view.foam]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      this.#views.delete(pond);
    }
  }

  // Água em Phong e não em Lambert pela única razão que importa aqui: Lambert não
  // tem brilho especular, e sem reflexo a superfície lê como disco pintado.
  #createView(pond) {
    const seed = pondSeed(pond);
    const water = new THREE.Mesh(buildWater(seed), new THREE.MeshPhongMaterial({
      color: PALETTE.water, specular: PALETTE.waterShine, shininess: 90,
      vertexColors: true, transparent: true, depthWrite: false,
      normalMap: RIPPLES, normalScale: new THREE.Vector2(.45, .45)
    }));
    water.receiveShadow = true;
    const foam = new THREE.Mesh(buildFoam(seed), new THREE.MeshBasicMaterial({
      color: 0xf4fbff, transparent: true, depthWrite: false
    }));
    const group = new THREE.Group();
    group.add(water, foam);
    this.#layer.add(group);
    return { group, water, foam };
  }
}
