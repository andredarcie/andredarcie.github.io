import * as THREE from 'three';

// Quanto do caminho até o alvo a força da janela anda a cada quadro (abre e fecha em
// uns poucos quadros, sem piscar).
const FADE_STEP = .2;
// Um pouco de folga na caixa do bicho, para a janela começar antes de ele sumir.
const TARGET_PADDING = 1.5;
// Quantos bichos cada objeto consegue "abrir" de uma vez (os mais perto do centro dele).
const MAX_HOLES = 6;
// A janela é uma elipse em volta da silhueta: um pouco mais larga e mais alta que a
// caixa do bicho. Dentro dela o objeto fica com GHOST de presença (um vulto, para não
// sumir de todo); a borda vai sumindo em degradê de EDGE (fração do raio).
const HOLE_WIDTH = 1.35;
const HOLE_HEIGHT = 1.15;
const GHOST = .2;
const EDGE = .45;
// Só abre o que está mesmo na frente do bicho: a parede de trás da igreja, o lado de
// lá da copa, continuam inteiros.
const DEPTH_MARGIN = 1;

// Janela de quem tapa: quando um bicho fica atrás de uma árvore, cacto, pedra, casa ou
// da igreja, só o pedaço do objeto que está na frente dele some — uma elipse em volta
// da silhueta, com borda suave — e o resto continua sólido. O recorte é feito no
// shader do próprio objeto (uma cópia do material, criada uma vez por peça): cada
// pixel compara a sua posição na tela com as janelas dos bichos e, se está dentro e
// mais perto da câmera que o bicho, é descartado num pontilhado ordenado (dither) cuja
// densidade faz o degradê. Descartar em vez de misturar mantém o objeto opaco: a
// profundidade continua certa e nada precisa de ordenação de transparência.
//
// A detecção é a de antes: no espaço da câmera, "na frente" é só profundidade e
// "tapar" é sobreposição de caixas na tela (a câmera é ortográfica, então a caixa de
// cada coisa na tela é exata o bastante).
//
// Quem desenha bichos fornece `targets()`; quem desenha o que pode tapar fornece
// `occluders()`. Cada um devolve itens { x, y, z (cena), radius, height } — o
// oclusor com `object` (o Object3D a recortar).
export class OcclusionFader {
  #rig;
  #targets;
  #occluderSources;
  #states = new Map();
  #toCamera = new THREE.Matrix4();
  #point = new THREE.Vector3();
  #ndc = new THREE.Vector3();

  constructor(cameraRig, { targets, occluders }) {
    this.#rig = cameraRig;
    this.#targets = targets;
    this.#occluderSources = occluders;
  }

  update() {
    const camera = this.#rig.camera;
    this.#toCamera.copy(camera.matrixWorld).invert();
    const targets = this.#targets.targets().map(item => this.#box(item, TARGET_PADDING));
    const live = new Set();
    for (const source of this.#occluderSources) {
      for (const occluder of source.occluders()) {
        const object = occluder.object;
        live.add(object);
        const box = this.#box(occluder, 0);
        // Tapa quem está mais longe da câmera e cuja caixa cruza a dele na tela.
        const hidden = targets.filter(target => box.depth > target.depth + 1 &&
          box.left < target.right && box.right > target.left &&
          box.bottom < target.top && box.top > target.bottom);
        let state = this.#states.get(object);
        if (!state && !hidden.length) continue;
        if (!state) {
          state = OcclusionFader.#newState();
          this.#states.set(object, state);
        }
        if (hidden.length) this.#placeHoles(state, box, hidden, camera);
        const wanted = hidden.length ? 1 : 0;
        let next = state.strength + (wanted - state.strength) * FADE_STEP;
        if (Math.abs(next - wanted) < .01) next = wanted;
        state.strength = next;
        state.uniforms.uOccStrength.value = next;
        this.#apply(object, state, next > 0);
        if (next === 0 && !hidden.length) this.#states.delete(object);
      }
    }
    // Quem saiu da cena (árvore cortada virou toco, cabana refeita) sai da conta.
    for (const object of this.#states.keys()) if (!live.has(object)) this.#states.delete(object);
  }

  static #newState() {
    return {
      strength: 0,
      uniforms: {
        uOccStrength: { value: 0 },
        uOccCount: { value: 0 },
        uOccHole: { value: Array.from({ length: MAX_HOLES }, () => new THREE.Vector4()) },
        uOccDepth: { value: new Float32Array(MAX_HOLES) }
      }
    };
  }

  // As janelas dos bichos escondidos, em coordenadas de tela (NDC): centro e raios da
  // elipse, e a distância de cada um à câmera. Ficam os mais perto do centro do objeto.
  #placeHoles(state, box, hidden, camera) {
    const cx = (box.left + box.right) / 2, cy = (box.bottom + box.top) / 2;
    hidden.sort((a, b) => Math.hypot((a.left + a.right) / 2 - cx, (a.bottom + a.top) / 2 - cy) -
      Math.hypot((b.left + b.right) / 2 - cx, (b.bottom + b.top) / 2 - cy));
    const count = Math.min(MAX_HOLES, hidden.length);
    const projection = camera.projectionMatrix.elements;
    const { uOccHole, uOccDepth, uOccCount } = state.uniforms;
    for (let i = 0; i < count; i++) {
      const t = hidden[i];
      const center = this.#ndc.set((t.left + t.right) / 2, (t.bottom + t.top) / 2, t.depth).applyMatrix4(camera.projectionMatrix);
      // câmera ortográfica: o tamanho na tela é a escala da projeção em cada eixo
      const rx = (t.right - t.left) / 2 * HOLE_WIDTH * Math.abs(projection[0]);
      const ry = (t.top - t.bottom) / 2 * HOLE_HEIGHT * Math.abs(projection[5]);
      uOccHole.value[i].set(center.x, center.y, Math.max(1e-4, rx), Math.max(1e-4, ry));
      uOccDepth.value[i] = -t.depth;
    }
    uOccCount.value = count;
  }

  // Caixa na tela (unidades da câmera) e profundidade (maior = mais perto).
  #box({ x, y = 0, z, radius, height }, padding) {
    const base = this.#point.set(x, y, z).applyMatrix4(this.#toCamera);
    const baseX = base.x, baseY = base.y, depth = base.z;
    const top = this.#point.set(x, y + height, z).applyMatrix4(this.#toCamera);
    // O pé ocupa um losango no chão: na tela, meia-largura ~ raio e meia-altura
    // ~ raio × seno da elevação.
    const flat = radius * .58;
    return {
      left: baseX - radius - padding,
      right: baseX + radius + padding,
      bottom: Math.min(baseY, top.y) - flat - padding,
      top: Math.max(baseY, top.y) + flat + padding,
      depth
    };
  }

  // Troca o material de cada peça por uma cópia com a janela (criada uma vez por
  // peça), porque os materiais das plantas são compartilhados entre muitas — mexer
  // no original recortaria a mata inteira. Sem janela, volta o original.
  #apply(object, state, on) {
    object.traverse(node => {
      if (!node.isMesh || node.userData.skipFade) return;
      const data = node.userData;
      if (!on) {
        if (data.solidMaterial) node.material = data.solidMaterial;
        return;
      }
      if (!data.solidMaterial || data.holeUniforms !== state.uniforms ||
        (node.material !== data.holeMaterial && node.material !== data.solidMaterial)) {
        if (node.material !== data.holeMaterial) data.solidMaterial = node.material;
        if (data.holeMaterial) for (const old of [data.holeMaterial].flat()) old.dispose();
        data.holeUniforms = state.uniforms;
        data.holeMaterial = Array.isArray(data.solidMaterial)
          ? data.solidMaterial.map(material => OcclusionFader.#holeCopy(material, state.uniforms))
          : OcclusionFader.#holeCopy(data.solidMaterial, state.uniforms);
      }
      node.material = data.holeMaterial;
    });
  }

  static #holeCopy(material, uniforms) {
    const copy = material.clone();
    const previous = material.onBeforeCompile;
    copy.onBeforeCompile = (shader, renderer) => {
      if (previous && previous !== THREE.Material.prototype.onBeforeCompile) previous.call(copy, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vOccScreen;\nvarying float vOccDepth;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvOccScreen = gl_Position.xy / gl_Position.w;\nvOccDepth = -mvPosition.z;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec2 vOccScreen;
varying float vOccDepth;
uniform float uOccStrength;
uniform int uOccCount;
uniform vec4 uOccHole[${MAX_HOLES}];
uniform float uOccDepth[${MAX_HOLES}];
// limiar do pontilhado ordenado 4×4 (Bayer), de 0 a 1
float occBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  vec2 a = mod(q, 2.0), b = floor(q / 2.0);
  float l1 = a.x < .5 ? (a.y < .5 ? 0.0 : 3.0) : (a.y < .5 ? 2.0 : 1.0);
  float l2 = b.x < .5 ? (b.y < .5 ? 0.0 : 3.0) : (b.y < .5 ? 2.0 : 1.0);
  return (4.0 * l1 + l2 + .5) / 16.0;
}`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
{
  float occKeep = 1.0;
  for (int i = 0; i < ${MAX_HOLES}; i++) {
    if (i >= uOccCount) break;
    if (vOccDepth > uOccDepth[i] - ${DEPTH_MARGIN.toFixed(1)}) continue;
    vec4 h = uOccHole[i];
    float d = length((vOccScreen - h.xy) / h.zw);
    occKeep = min(occKeep, mix(${GHOST.toFixed(2)}, 1.0, smoothstep(${(1 - EDGE).toFixed(2)}, 1.0, d)));
  }
  occKeep = mix(1.0, occKeep, uOccStrength);
  if (occKeep < 1.0 && occKeep < occBayer(gl_FragCoord.xy)) discard;
}`);
    };
    copy.customProgramCacheKey = () => `occlusion-window:${material.customProgramCacheKey?.() ?? ''}`;
    return copy;
  }
}
