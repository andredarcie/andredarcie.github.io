// psx.js — pipeline de render estilo PlayStation 1:
//  - render em baixa resolução (chunky pixels)
//  - dithering + quantização de cor + grão de filme + scanlines + vinheta
//  - "vertex jitter" (snap dos vértices na grade, o tremor clássico do PSX)
import * as THREE from 'three';

// Desliga o color management do three pra ter comportamento previsível e retrô.
THREE.ColorManagement.enabled = false;

// Grade do vertex snapping (em NDC). Menor = tremor mais grosseiro.
export const SNAP = new THREE.Vector2(90, 64);

// Aplica o jitter de vértice (constantes fixas no shader -> seguro com clone/instancing).
export function applyVertexSnap(material, jitter = 1.0) {
  const gx = (SNAP.x / jitter).toFixed(3);
  const gy = (SNAP.y / jitter).toFixed(3);
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        vec4 _sp = gl_Position;
        _sp.xyz /= _sp.w;                         // -> NDC
        _sp.x = floor(_sp.x * ${gx} + 0.5) / ${gx};
        _sp.y = floor(_sp.y * ${gy} + 0.5) / ${gy};
        _sp.xyz *= _sp.w;
        gl_Position = _sp;
      }`
    );
  };
  // garante programa próprio (não colide com materiais sem snap)
  material.customProgramCacheKey = () => 'psx' + gx + '_' + gy;
  material.needsUpdate = true;
  return material;
}

const POST_VERT = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const POST_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2  uRes;
  uniform float uTime;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uAberr;
  uniform vec3  uTint;

  float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453123); }

  void main(){
    vec2 q = vUv - 0.5;                             // centro -> bordas

    // aberração cromática radial (vidro da TV CRT): ~0 no centro, cresce nas bordas
    vec2 off = q * uAberr;
    vec3 col;
    col.r = texture2D(tDiffuse, vUv + off).r;
    col.g = texture2D(tDiffuse, vUv).g;
    col.b = texture2D(tDiffuse, vUv - off).b;

    vec2 pix = floor(vUv * uRes);

    // dithering ordenado + quantização (cor ~15bit)
    float levels = 32.0;
    col += (ign(pix) - 0.5) / levels;
    col = floor(col * levels + 0.5) / levels;

    col *= uTint;                                   // tom do "outro mundo"

    col += (hash(pix + vec2(uTime*1.37, uTime*0.91)) - 0.5) * uGrain;   // grão dinâmico (perigo)

    // scanlines + vinheta agora vêm da camada global de TV CRT (crt.js),
    // a MESMA da intro -> gameplay e abertura com o mesmo "vidro" de CRT.
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

export class PSX {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.useLegacyLights = true;          // intensidades clássicas e previsíveis
    this.renderer.autoClear = true;

    this.internalHeight = 232;                      // altura interna (baixa res)
    this.rt = new THREE.WebGLRenderTarget(2, 2, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    });

    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse:  { value: this.rt.texture },
        uRes:      { value: new THREE.Vector2(2, 2) },
        uTime:     { value: 0 },
        uGrain:    { value: 0.07 },
        uVignette: { value: 1.15 },
        uAberr:    { value: 0.006 },               // aberração cromática (RGB split) tipo TV CRT
        uTint:     { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    this.setSize(window.innerWidth, window.innerHeight);
  }

  setSize(w, h) {
    this.renderer.setSize(w, h, false);
    const iw = Math.max(2, Math.round(this.internalHeight * (w / h)));
    const ih = this.internalHeight;
    this.rt.setSize(iw, ih);
    this.postMat.uniforms.uRes.value.set(iw, ih);
  }

  setTint(r, g, b) { this.postMat.uniforms.uTint.value.setRGB(r, g, b); }
  setGrain(v)      { this.postMat.uniforms.uGrain.value = v; }
  setAberration(v) { this.postMat.uniforms.uAberr.value = v; }

  render(scene, camera, time) {
    this.postMat.uniforms.uTime.value = time;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCam);
  }

  // inspeção: desenha o AMBIENTE congelado (bg) e a chave 3D por cima (fg),
  // tudo no MESMO render target -> passa pela mesma pós-produção PSX.
  renderInspect(bg, bgCam, fg, fgCam, time) {
    this.postMat.uniforms.uTime.value = time;
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    r.autoClear = true;
    r.render(bg, bgCam);          // cenário pausado ao fundo
    r.autoClear = false;
    r.clearDepth();               // a chave sempre por cima do cenário
    r.render(fg, fgCam);
    r.autoClear = true;
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }
}
