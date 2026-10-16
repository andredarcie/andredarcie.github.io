import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption, objectName, speakerName, linesOf } from '../story.js';
import { camera } from '../renderer.js';
import { say } from '../dialog.js';
import { IS_LOCAL } from '../input.js';
import { sfxPaddle, sfxStep, sfxSit } from '../audio.js';
import { pose, applyPose, placeBody, cameraFromHead, makeAction, fadeNearCamera, SOLE } from '../body.js';
import { scene, inters, freshScene, box, lite, grp, blob, anim, instanciar, at, tag, triggerOf, walkOf, blockOf } from '../kit.js';

/* ===================== CENA: A PRAIA (o fim da fuga) ===================== */
// Lições que custaram caro (não desfazer):
// · O CHÃO É y≈0 na beira d'água: tudo que se apoia na areia (espuma, faixa
//   molhada, pegadas, pedras) fica ACIMA de sandH(). Enterrado, nunca aparece.
// · Espuma da beira: no máximo TRÊS línguas, da largura da AREIA (não do mar),
//   finas e com alcance curto. Mais que isso, em ângulo rasante vira zebrado.
// · O mar fica quase rente ao chão (-.05): mais fundo sobra um degrau reto na tela.
// · NAVY puro contra céu claro vira um vazio preto: o mar puxa um pouco do céu.
// · Uma bolha só lê como disco voador: nuvem é um cacho de bolhas, com emissive.
// · Nada de segunda hemisférica: lava o contraste. O relevo vem do sol baixo.
// · Spawn rente à arrebentação: longe, o mar vira um fio no horizonte.

const SHORE = -20;                              // linha d'água média
const SAND_W = 150;                             // largura da praia
const SEA_Y = -.05;
const SUNC = 0xffe6b8;                          // sol quente contra o céu frio: o "Paraíso"
const SUN_DIR = new THREE.Vector3(.12, .14, -1).normalize();  // baixo, à frente: fim de tarde
const HOR = new THREE.Color(GLOW).lerp(new THREE.Color(LIGHT), .22);   // horizonte = cor da névoa
const ZEN = new THREE.Color(BLUE).lerp(new THREE.Color(NAVY), .22);    // azul do alto

const clamp01 = k => Math.max(0, Math.min(1, k));
const smooth = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);

// a beira d'água faz uma enseada suave, não uma régua
const shoreZ = x => SHORE + 1.4 * Math.sin(x * .06 + .5) + .5 * Math.sin(x * .17 + 2);
// altura da areia: sobe devagar da água e vira dunas lá atrás
function sandH(x, z) {
  const u = z - shoreZ(x);                      // metros acima da linha d'água
  // sob a água o fundo despenca: rasinho, a cava das ondas descia abaixo da areia e
  // ela furava o mar em manchas, com a borda reta da malha aparecendo no meio
  if (u < 0) return u * .028 - 5 * smooth(-u / 3);
  const dune = smooth((u - 16) / 22);
  return u * .028 + dune * (1.3 + .55 * Math.sin(x * .13 + z * .05) + .35 * Math.sin(x * .29 - z * .12));
}

// a ilha do farol: elipse com um platô de capim e costão de pedra caindo no mar
const IX = -36, IZ = -49, IRX = 13, IRZ = 8, ITOP = 3.2;
function ilhaQ(x, z) {                          // 0 no centro, 1 na borda d'água (contorno irregular)
  const dx = (x - IX) / IRX, dz = (z - IZ) / IRZ, a = Math.atan2(dz, dx);
  return Math.hypot(dx, dz) * (1 + .05 * Math.sin(a * 3 + 1) + .03 * Math.sin(a * 7));
}
function ilhaH(x, z) {
  const q = ilhaQ(x, z);
  if (q < .68) return ITOP + .12 * Math.sin(x * .6 + z * .4) * (1 - q / .68);
  return ITOP + (-4 - ITOP) * smooth((q - .68) / .4);
}
// chão de quem anda: areia da praia, ou platô e trapiche na ilha
const PIER_Z0 = IZ + 3.8, PIER_Z1 = IZ + 10.2, PIER_Y = ITOP + .1;
const LAD_Z = PIER_Z1 + .08;                    // plano da escada, na ponta do trapiche (de frente para +z)
const rungY = j => PIER_Y - .35 - .38 * (11 - j); // degrau j: 0 = o de baixo (perto da água), 11 = o do topo
function chaoH(x, z) {
  if (z > -30) return sandH(x, z);
  if (Math.abs(x - IX) < .75 && z > PIER_Z0) return PIER_Y;
  return ilhaH(x, z);
}
// Altura da onda pela distância d da arrebentação. As cristas andam PARA A PRAIA
// (d diminui com o tempo: +t nos termos em d); antes iam mar adentro.
// A MESMA fórmula existe em GLSL (WAVE_GLSL): o shader desenha o mar e o JS faz
// boiar o barco, a canoa, a espuma das pedras e o espirro. Mudou uma, mude a outra.
const SHARP = 1.8;
// abrigo do trapiche: a ilha quebra o mar e a água em volta da escada fica mansa
// (sem isso a canoa subia e descia 3 m ao lado da escada)
const CALM_X = IX, CALM_Z = PIER_Z1 + 1.2;
const calmAt = (x, z) => .12 + .88 * smooth((Math.hypot(x - CALM_X, z - CALM_Z) - 4) / 16);                               // >1: crista pontuda e cava larga, como ondulação de verdade
const swell = ph => Math.pow(Math.sin(ph) * .5 + .5, SHARP) * 2 - 1;
function waveAt(x, d, t) {
  const shoal = Math.max(.3, 2.2 - d * .045);   // a onda encorpa ao perder fundo
  const edge = clamp01(d / 7) * calmAt(x, shoreZ(x) - d); // ...morre nos últimos metros, já quebrada, e no abrigo
  return edge * (
    swell(d * .17 + t * 1.5) * .62 * shoal +
    swell(d * .06 + t * .85 + x * .055) * .80 +      // cristas tortas, não paralelas
    Math.sin(x * .11 + t * .65) * .34 +
    Math.sin(x * .045 + d * .09 + t * .4) * .40);    // segundo trem, cruzado
}

/* ---------- o mar em GLSL ---------- */
const WAVE_GLSL = /* glsl */`
float shoreZ(float x) { return -20.0 + 1.4 * sin(x * 0.06 + 0.5) + 0.5 * sin(x * 0.17 + 2.0); }
float swell(float ph) { return pow(sin(ph) * 0.5 + 0.5, ${SHARP.toFixed(2)}) * 2.0 - 1.0; }
float waveH(float x, float d, float t) {
  float shoal = max(0.3, 2.2 - d * 0.045);
  float zz = shoreZ(x) - d;
  float r = length(vec2(x - ${CALM_X.toFixed(2)}, zz - (${CALM_Z.toFixed(2)})));
  float k = clamp((r - 4.0) / 16.0, 0.0, 1.0);
  float edge = clamp(d / 7.0, 0.0, 1.0) * (0.12 + 0.88 * k * k * (3.0 - 2.0 * k));
  return edge * (
    swell(d * 0.17 + t * 1.5) * 0.62 * shoal +
    swell(d * 0.06 + t * 0.85 + x * 0.055) * 0.80 +
    sin(x * 0.11 + t * 0.65) * 0.34 +
    sin(x * 0.045 + d * 0.09 + t * 0.4) * 0.40);
}
float waveXZ(float x, float z, float t) { return waveH(x, shoreZ(x) - z, t); }
`;

const SEA_VS = /* glsl */`
attribute float aD;
uniform float uTime;
varying vec3 vWorld;
varying float vD;
varying float vH;
#include <fog_pars_vertex>
${WAVE_GLSL}
void main() {
  vec3 p = position;
  float h = waveH(p.x, aD, uTime);
  p.y += h;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vD = aD;
  vH = h;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// Mar no estilo do jogo (README, "Natureza estilizada"): facetas chapadas, três faixas de
// cor da paleta, espuma em formas sólidas e o sol desenhado em tracinhos. Sem reflexo,
// fresnel, especular, normal map nem transparência.
const SEA_FS = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uShallow;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uCrest;
uniform vec3 uFoam;
uniform vec3 uSun;
varying vec3 vWorld;
varying float vD;
varying float vH;
#include <fog_pars_fragment>
void main() {
  float t = uTime;
  // a normal é a da própria faceta: cada triângulo uma cor, como o resto do jogo
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (N.y < 0.0) N = -N;
  // luz baixa vinda do sol: faceta virada para ele clareia, a de costas escurece (o mar fica facetado)
  float lit = clamp(0.7 + 0.55 * (dot(N, normalize(vec3(0.2, 0.45, -1.0))) - 0.4), 0.5, 1.1);

  // profundidade em faixas, sem degradê: raso, meio, fundo
  vec3 col = vD < 3.5 ? uShallow : (vD < 14.0 ? uMid : uDeep);
  col *= lit;
  col = mix(col, uCrest, step(1.25, vH) * 0.5);                  // topo da onda clareia num degrau

  // espuma sólida: a crista quebrando, os pedaços que ficam atrás e a lâmina na beira
  float q = fract((vD * 0.17 + t * 1.5 - 1.5708) / 6.2832);     // 0 = crista passando aqui
  float zone = step(1.2, vD) * step(vD, 11.0);
  float crest = step(q, 0.035) + step(0.98, q);
  float chunks = step(q, 0.14) * step(0.55, fract(vWorld.x * 0.11 + floor(vD * 0.5) * 0.37));
  float shore = step(vD, 0.8 + 0.3 * sin(vWorld.x * 0.9 + t * 0.8));
  float foam = clamp(max(zone * max(crest, chunks), shore), 0.0, 1.0);

  // o sol na água: tracinhos horizontais quentes, mais largos ao longe, até o sol
  vec2 rel = vWorld.xz - cameraPosition.xz;
  vec2 sh = normalize(uSunDir.xz);
  float al = dot(rel, sh);
  float lat = abs(rel.x * sh.y - rel.y * sh.x);
  float row = floor(al * 0.3);
  float wid = (0.8 + al * 0.12) * (0.55 + 0.45 * sin(row * 2.7 + t * 1.1));
  float dash = step(fract(al * 0.3), 0.35) * step(lat, wid) * step(4.0, al) * step(14.0, vD);
  col = mix(col, uSun, dash * 0.8);

  col = mix(col, uFoam, foam);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

/* ---------- texturas de canvas ---------- */
function canvasTex(w, h, draw, repeat) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(...repeat); tex.anisotropy = 4; }
  return tex;
}
// marcas de vento na areia + grãos: quase branca, multiplica a cor da areia de leve
function sandTexture() {
  return canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(38,56,72,.07)'; c.lineWidth = 3;
    for (let y = 8; y < h; y += 21) {
      c.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin(x / w * Math.PI * 4 + y) * 4;
        if (x) c.lineTo(x, yy); else c.moveTo(x, yy);
      }
      c.stroke();
    }
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = Math.random() < .5 ? 'rgba(38,56,72,.09)' : 'rgba(255,255,255,.5)';
      c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  }, [SAND_W / 3.2, 84 / 3.2]);
}
// mancha redonda de borda macia: sombras de contato e pegadas
function softTexture() {
  return canvasTex(64, 64, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(.55, 'rgba(255,255,255,.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
}


/* ---------- a água não entra na canoa ---------- */
// O casco fica meio afundado: o mar (uma superfície só) cortaria o fundo dela por dentro.
// Uma tampa invisível na boca da canoa marca o stencil antes de tudo; mar e espuma só pintam
// onde a marca não está. Tudo que está dentro da canoa (forro, bancos, pernas) aparece seco.
const STENCIL_CANOA = 1;
function foraDaCanoa(mat) {
  mat.stencilWrite = true;                      // o three só liga o teste de stencil com isso
  mat.stencilRef = STENCIL_CANOA;
  mat.stencilFunc = THREE.NotEqualStencilFunc;
  mat.stencilFail = mat.stencilZFail = mat.stencilZPass = THREE.KeepStencilOp;
  return mat;
}

/* ---------- fita: faixa sólida ao longo de x, redesenhada a cada quadro (espuma, areia molhada) ---------- */
function fita(nx, color, opacity, order) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((nx + 1) * 6);
  const idx = [];
  for (let i = 0; i < nx; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = foraDaCanoa(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = order;
  scene.add(m);
  // vértice 2i = borda do lado do mar, 2i+1 = borda do lado da areia
  const set = (i, back, front) => { pos.set(back, i * 6); pos.set(front, i * 6 + 3); };
  const done = () => { geo.attributes.position.needsUpdate = true; };
  return { m, mat, set, done, nx };
}

export function buildPraia() {
  freshScene(24, 78);                           // a névoa fecha exatamente no fim da câmera: horizonte sem emenda
  scene.fog.color.copy(HOR);
  scene.background = HOR.clone();
  const sunLight = new THREE.DirectionalLight(0xffe8c8, .65);
  sunLight.position.copy(SUN_DIR).multiplyScalar(40);
  scene.add(sunLight);

  let seed = 3;
  const rnd = () => { seed++; const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const soft = softTexture();
  // sombra de contato macia no chão
  const sombra = (x, z, rx, rz, op, ry = 0) => {
    const g = new THREE.CircleGeometry(1, 20);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: DARK2, map: soft, transparent: true, opacity: op, depthWrite: false }));
    m.scale.set(rx, 1, rz);
    m.rotation.y = ry;
    m.position.set(x, sandH(x, z) + .02, z);
    m.renderOrder = 2;
    scene.add(m);
    return m;
  };

  // ── areia ────────────────────────────────────────────────────────────────
  const sandGeo = new THREE.PlaneGeometry(SAND_W, 90, 100, 60);
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(0, 0, 15);                  // z de -30 (fundo raso, visto pela água transparente) a 60 (dunas)
  const aPos = sandGeo.attributes.position, aCol = [];
  const cWet = mix(LIGHT2, FLOOR, .45), cDry = mix(LIGHT2, LIGHT, .3), cDune = mix(LIGHT2, LIGHT, .5);
  const cc = new THREE.Color();
  for (let i = 0; i < aPos.count; i++) {
    const x = aPos.getX(i), z = aPos.getZ(i), h = sandH(x, z), u = z - shoreZ(x);
    aPos.setY(i, h);
    cc.copy(cWet).lerp(cDry, smooth((u - 1) / 7));           // úmida perto da água, seca acima
    cc.lerp(cDune, smooth((h - 1.4) / 1.6) * .6);            // topo das dunas mais claro
    cc.multiplyScalar(.985 + rnd() * .03);                    // irregularidade
    aCol.push(cc.r, cc.g, cc.b);
  }
  sandGeo.setAttribute('color', new THREE.Float32BufferAttribute(aCol, 3));
  sandGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(sandGeo, new THREE.MeshLambertMaterial({ vertexColors: true, map: sandTexture() })));
  walkOf(-30, -18.5, 30, 45);

  // ── o mar: malha fixa, a GPU ergue as ondas (SEA_VS) e pinta a água (SEA_FS) ──
  // Mais linhas perto da arrebentação, onde a onda tem relevo; nada roda na CPU por quadro.
  const NX = 110, NZ = 50, D0 = -1.5, D1 = 88;
  const seaGeo = new THREE.PlaneGeometry(220, 1, NX, NZ);
  seaGeo.rotateX(-Math.PI / 2);
  const sPos = seaGeo.attributes.position, aD = new Float32Array(sPos.count);
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i), k = .5 - sPos.getZ(i);           // 0 na praia → 1 mar adentro
    const d = D0 + (D1 - D0) * Math.pow(k, 1.5);
    aD[i] = d;
    sPos.setXYZ(i, x, 0, shoreZ(x) - d);
  }
  seaGeo.setAttribute('aD', new THREE.BufferAttribute(aD, 1));
  // três faixas de água, todas misturas da paleta (NAVY puro contra o céu claro vira buraco preto)
  const seaU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);   // névoa da cena (o mar se dissolve no horizonte)
  Object.assign(seaU, {
    uTime: { value: 0 },
    uSunDir: { value: SUN_DIR.clone() },
    uShallow: { value: mix(BLUE, LIGHT, .4) },
    uMid: { value: mix(BLUE, NAVY, .5) },
    uDeep: { value: mix(NAVY, BLUE, .3) },
    uCrest: { value: mix(BLUE, GLOW, .45) },
    uFoam: { value: new THREE.Color(GLOW) },
    uSun: { value: new THREE.Color(SUNC) },
  });
  const sea = new THREE.Mesh(seaGeo, foraDaCanoa(new THREE.ShaderMaterial({
    uniforms: seaU, vertexShader: SEA_VS, fragmentShader: SEA_FS, fog: true,
    extensions: { derivatives: true },             // normal da faceta (WebGL1); no WebGL2 já vem
  })));
  sea.position.y = SEA_Y;                        // começa 1.5 m por baixo da areia: sem fresta na beira
  sea.frustumCulled = false;                     // a GPU mexe nos vértices: a caixa da malha não vale
  scene.add(sea);
  anim(t => { seaU.uTime.value = t; });

  // ── a espuma que sobe a areia e a areia molhada (a arrebentação é do shader) ──
  const FX = 300, fx = i => -SAND_W / 2 + i * SAND_W / FX;
  const foam = [];
  for (let i = 0; i < 3; i++) foam.push({
    f: fita(FX, GLOW, 0, 3),
    w: .7 + i * .45,
    per: i === 0 ? 2 * Math.PI / 1.5 : 5.5 + i * 1.35, // a primeira vem com a onda; as outras fora de fase
    run: 1.8 + i * .9,
    off: i === 0 ? -Math.PI / 3 : i * 1.7,             // a crista chega na beira em t = π/3 + k·período
    base: -i * .5,
  });
  const wet = fita(FX, DARK2, .3, 1);
  const V = [0, 0, 0], W = [0, 0, 0];
  let wetRun = 0, lastT = null;
  anim(t => {
    const dt = lastT === null ? 0 : t - lastT; lastT = t;
    // línguas d'água subindo a areia e recuando, cada uma no seu tempo
    let maxRun = 0;
    for (const fo of foam) {
      const ph = (((t + fo.off) % fo.per) + fo.per) % fo.per / fo.per;
      const surge = Math.sin(ph * Math.PI);
      const adv = fo.base + surge * fo.run;
      fo.f.mat.opacity = .2 + surge * .6;            // faixa sólida que acende e apaga com a onda
      if (adv > maxRun) maxRun = adv;
      for (let i = 0; i <= FX; i++) {
        const x = fx(i), zs = shoreZ(x);
        const lace = .22 * Math.sin(x * 1.7 + fo.off * 3 + t * .5) + .12 * Math.sin(x * 4.3 - t * .8 + fo.off);
        const zf = zs + adv + lace, zb = zf - fo.w;
        V[0] = x; V[2] = zb; V[1] = Math.max(sandH(x, zb), SEA_Y) + .035;
        W[0] = x; W[2] = zf; W[1] = Math.max(sandH(x, zf), SEA_Y) + .035;
        fo.f.set(i, V, W);
      }
      fo.f.done();
    }
    // a areia lembra por onde a água passou e seca devagar
    wetRun = Math.max(maxRun, wetRun - dt * .35);
    wet.mat.opacity = .16 + .12 * smooth(wetRun / 3);
    for (let i = 0; i <= FX; i++) {
      const x = fx(i), zs = shoreZ(x), zb = zs - .3, zf = zs + wetRun + .3;
      V[0] = x; V[2] = zb; V[1] = Math.max(sandH(x, zb), SEA_Y) + .015;
      W[0] = x; W[2] = zf; W[1] = Math.max(sandH(x, zf), SEA_Y) + .015;
      wet.set(i, V, W);
    }
    wet.done();
  });

  // ── céu: domo em degradê, sol, nuvens (acompanham quem anda: estão longe) ──
  const ceu = grp(0, 0, 0);
  const domeGeo = new THREE.SphereGeometry(76, 40, 20);
  const dP = domeGeo.attributes.position, dCol = [], n = new THREE.Vector3();
  const cWarm = new THREE.Color(SUNC);
  for (let i = 0; i < dP.count; i++) {
    n.set(dP.getX(i), dP.getY(i), dP.getZ(i)).normalize();
    if (n.y <= 0) cc.copy(HOR);
    else cc.copy(HOR).lerp(ZEN, Math.pow(n.y, .5));
    // o céu esquenta em volta do sol; no horizonte exato fica na cor da névoa (sem emenda com o mar)
    const glow = Math.pow(Math.max(0, n.dot(SUN_DIR)), 6) * smooth(n.y / .05);
    cc.lerp(cWarm, glow * .75);
    dCol.push(cc.r, cc.g, cc.b);
  }
  domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(dCol, 3));
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -1;
  ceu.add(dome);

  const sunG = grp(0, 0, 0, ceu);
  sunG.position.copy(SUN_DIR).multiplyScalar(64);
  sunG.add(new THREE.Mesh(new THREE.CircleGeometry(3.6, 32), new THREE.MeshBasicMaterial({ color: SUNC, fog: false })));
  for (let h = 0; h < 4; h++) {                  // halo em camadas, o brilho não tem borda dura
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(5 + h * 3.6, 32),
      new THREE.MeshBasicMaterial({ color: SUNC, fog: false, transparent: true, opacity: .22 - h * .05, depthWrite: false })
    );
    halo.position.z = -.1 - h * .1;
    sunG.add(halo);
  }

  // cúmulos baixos no horizonte, mais quentes perto do sol; cirros finos no alto
  const nuvensG = grp(0, 0, 0, ceu);
  const nuvem = (az, el, dist, size, n0, op, flat) => {
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const g = grp(dir.x * dist, dir.y * dist, dir.z * dist, nuvensG);
    g.lookAt(0, dir.y * dist, 0);                // o cacho se espalha de lado, de frente para quem olha
    const warm = Math.pow(Math.max(0, dir.dot(SUN_DIR)), 3);
    const em = mix(GLOW, SUNC, warm * .7).multiplyScalar(.6);
    for (let p = 0; p < n0; p++) {
      const s = size * (.6 + rnd() * .55);
      const b = blob(2.3 * s, (flat ? .12 : .9 + rnd() * .5) * s, 1.2 * s, GLOW,
        (p - (n0 - 1) / 2) * 1.9 * size, flat ? 0 : rnd() * .7 * size, (rnd() - .5) * size, g);
      b.material.emissive = em;                   // sem isso a barriga fica cinza-pedra
      b.material.fog = false;
      b.material.transparent = true; b.material.opacity = op; b.material.depthWrite = false;
    }
  };
  for (let i = 0; i < 11; i++) nuvem(-1.6 + i * .32 + rnd() * .15, .03 + rnd() * .1, 66, 2.2 + rnd() * 2.2, 4 + Math.floor(rnd() * 3), .85, false);
  for (let i = 0; i < 4; i++) nuvem(-2.6 + i * 1.6, -.2 + .35 + i * .04, 66, 3.5, 3, .45, false); // atrás e dos lados
  for (let i = 0; i < 6; i++) nuvem(-1.2 + i * .5, .42 + rnd() * .25, 66, 4 + rnd() * 2, 2, .32, true); // cirros

  anim(t => {
    ceu.position.set(camera.position.x, 0, camera.position.z);
    sunG.lookAt(camera.position);
    nuvensG.rotation.y = Math.sin(t * .01) * .06; // deriva lenta
  });

  // ── a ilha do farol (destino da canoa), uma ilhota ao longe, um veleiro ──
  const LEAF = mix(BLUE, NAVY, .3), LEAF2 = mix(BLUE, NAVY, .55);
  const ilhaGeo = new THREE.PlaneGeometry(2 * IRX + 8, 2 * IRZ + 8, 48, 32);
  ilhaGeo.rotateX(-Math.PI / 2);
  ilhaGeo.translate(IX, 0, IZ);
  const iPos = ilhaGeo.attributes.position, iCol = [];
  const cCapim = mix(BLUE, LIGHT2, .55), cPedra = mix(DARK2, NAVY, .3);
  for (let i = 0; i < iPos.count; i++) {
    const x = iPos.getX(i), z = iPos.getZ(i), q = ilhaQ(x, z);
    iPos.setY(i, ilhaH(x, z));
    cc.copy(cCapim).lerp(new THREE.Color(LEAF2), .5 + .5 * Math.sin(x * .9 + z * 1.3)); // capim em manchas
    cc.lerp(new THREE.Color(cPedra), smooth((q - .6) / .14));                           // pedra na borda do platô
    cc.multiplyScalar(.97 + rnd() * .06);
    iCol.push(cc.r, cc.g, cc.b);
  }
  ilhaGeo.setAttribute('color', new THREE.Float32BufferAttribute(iCol, 3));
  ilhaGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(ilhaGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  // andável: o platô (duas faixas cruzadas, dentro da borda) e o trapiche
  walkOf(IX - 7.5, IZ - 2.2, IX + 7.5, IZ + 2.2);
  walkOf(IX - 4.5, IZ - 4.5, IX + 4.5, IZ + 4.5);
  walkOf(IX - .5, IZ + 3.6, IX + .5, PIER_Z1 - .3);

  // pedras grandes no costão, meio dentro d'água (o lado do trapiche fica livre)
  for (const a of [0, .65, 2.35, 2.95, 3.55, 4.2, 4.85, 5.55]) {
    const x = IX + Math.cos(a) * IRX * .98, z = IZ + Math.sin(a) * IRZ * .98, s = .8 + rnd() * .7;
    blob(1.7 * s, 1.3 * s, 1.4 * s, DARK2, x, -.2, z);
    blob(1.0 * s, .8 * s, .9 * s, cPedra, x + .9 * s, .3 * s, z - .5 * s);
  }
  // moitas no platô (vivas: azuis)
  for (const [mx, mz, s] of [[6.2, -2.2, 1], [3.6, -4.2, .8], [-7.6, .6, 1.1], [7.4, 1.4, .7], [-6.2, -3.3, .9], [-1.2, -4.6, .7]]) {
    const x = IX + mx, z = IZ + mz, y = ilhaH(x, z);
    blob(.9 * s, .55 * s, .8 * s, LEAF2, x, y + .25 * s, z);
    blob(.6 * s, .45 * s, .55 * s, LEAF, x + .5 * s, y + .4 * s, z + .2 * s);
    blockOf(x - .9 * s, z - .8 * s, x + .9 * s, z + .8 * s);
  }

  // o trapiche: deck de tábuas sobre estacas, escada descendo até a água
  const MAD = mix(FLOOR, LIGHT2, .5), MAD2 = mix(FLOOR, DARK2, .35);
  for (let z = PIER_Z0 + .2; z < PIER_Z1; z += .4) box(1.4, .08, .36, MAD, IX, PIER_Y - .04, z);
  for (const s of [-1, 1]) box(.1, .18, PIER_Z1 - PIER_Z0, MAD2, IX + s * .6, PIER_Y - .17, (PIER_Z0 + PIER_Z1) / 2);
  for (const z of [IZ + 5.2, IZ + 7.4, PIER_Z1 - .1]) for (const s of [-1, 1]) {
    const top = z > PIER_Z1 - .5 ? PIER_Y + .45 : PIER_Y - .05;  // as da ponta sobem: cabeços de amarrar
    box(.14, top + 4, .14, MAD2, IX + s * .62, (top - 4) / 2, z);
  }
  // escada: 12 degraus da água até o deck; os montantes passam do deck como corrimão (a mão
  // precisa de onde se apoiar para subir no fim) e dobram para dentro do trapiche
  const escada = grp(0, 0, 0);
  const RAIL_TOP = PIER_Y + .95;
  // (montantes a ±.3 e o pescoço abrindo para ±.45: quem sobe passa pelo vão sem raspar os braços)
  for (const s of [-1, 1]) {
    box(.05, RAIL_TOP + 1.6, .05, MAD2, IX + s * .3, (RAIL_TOP - 1.6) / 2, LAD_Z, escada);
    const pg = box(.05, .05, .45, MAD2, IX + s * .375, RAIL_TOP, LAD_Z - .2, escada); // pescoço de ganso, abrindo
    pg.rotation.y = Math.atan2(s * .15, -.4);
    box(.05, .9, .05, MAD2, IX + s * .45, RAIL_TOP - .45, LAD_Z - .4, escada);   // desce até o deck
  }
  for (let j = 0; j < 12; j++) box(.6, .04, .05, MAD, IX, rungY(j), LAD_Z, escada);
  const alvoEscada = new THREE.Mesh(new THREE.BoxGeometry(.9, RAIL_TOP + 1.7, .5), new THREE.MeshBasicMaterial());
  alvoEscada.visible = false;                     // caixa invisível só para a mira pegar a escada inteira
  alvoEscada.position.set(IX, (RAIL_TOP - 1.7) / 2, LAD_Z + .12);
  escada.add(alvoEscada);

  // o farol, em escala de gente: torre listrada, galeria, lanterna e cúpula
  const LX = IX - 4, LZ = IZ - 2.5;
  const farol = grp(LX, ITOP, LZ);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.45, .7, 14), new THREE.MeshLambertMaterial({ color: DARK2, flatShading: true }));
  base.position.y = .05;
  farol.add(base);
  for (let i = 0; i < 6; i++) {                   // torre listrada
    const r0 = 1.15 - i * .06;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r0 - .06, r0, 1.4, 12),
      new THREE.MeshLambertMaterial({ color: i % 2 ? DARK2 : GLOW, flatShading: true }));
    seg.position.y = .7 + i * 1.4;
    farol.add(seg);
  }
  box(.84, 1.66, .1, DARK2, 0, 1.23, 1.1, farol); // porta virada para o trapiche
  box(.7, 1.55, .1, DARK, 0, 1.18, 1.13, farol);
  for (const [wy, wr] of [[3.6, 1.02], [6.3, .9]]) lite(.28, .42, .06, NAVY, 0, wy, wr, farol);
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, .14, 14), new THREE.MeshLambertMaterial({ color: DARK2, flatShading: true }));
  gal.position.y = 8.47;
  farol.add(gal);
  for (let k = 0; k < 12; k++) {                  // guarda-corpo da galeria
    const a = k / 12 * Math.PI * 2;
    box(.04, .5, .04, DARK2, Math.cos(a) * 1.24, 8.79, Math.sin(a) * 1.24, farol);
  }
  const corrimao = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, .05, 14, 1, true), new THREE.MeshLambertMaterial({ color: DARK2, side: THREE.DoubleSide }));
  corrimao.position.y = 9.04;
  farol.add(corrimao);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, 1.0, 10), new THREE.MeshBasicMaterial({ color: GLOW }));
  lamp.position.y = 9.04;
  farol.add(lamp);
  for (let k = 0; k < 5; k++) {                   // montantes da lanterna
    const a = k / 5 * Math.PI * 2;
    box(.05, 1.0, .05, DARK2, Math.cos(a) * .63, 9.04, Math.sin(a) * .63, farol);
  }
  const cupula = new THREE.Mesh(new THREE.ConeGeometry(.9, .75, 10), new THREE.MeshLambertMaterial({ color: DARK2, flatShading: true }));
  cupula.position.y = 9.92;
  farol.add(cupula);
  blob(.12, .12, .12, DARK2, 0, 10.36, 0, farol);
  box(.03, .5, .03, DARK2, 0, 10.6, 0, farol);
  const lampHalo = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8),
    new THREE.MeshBasicMaterial({ color: SUNC, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  lampHalo.position.y = 9.04;
  farol.add(lampHalo);
  blockOf(LX - 1.5, LZ - 1.5, LX + 1.5, LZ + 1.5);

  // perto do farol e olhando para ele: a câmera sobe até a lanterna e ele pensa (fim do jogo)
  triggerOf((x, z, yaw) => {
    const dx = LX - x, dz = LZ - z;
    if (Math.hypot(dx, dz) > 9.5) return false;
    const d = Math.atan2(-dx, -dz) - yaw;
    return Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) < .5;
  }, { look: { x: LX, y: ITOP + 9.04, z: LZ }, sequence: 'finishGame' });
  anim(t => {                                     // o facho girando: pisca devagar
    const k = Math.pow(Math.max(0, Math.sin(t * 1.1)), 12);
    lampHalo.material.opacity = .08 + k * .5;
    lamp.material.color.setHex(k > .3 ? 0xffffff : GLOW);
  });
  blob(9, 1.6, 3, DARK2, 46, -.6, -58);           // ilha baixa à direita, quase sumindo
  blob(4, 1.4, 2, LEAF2, 47, .6, -58);

  const barco = grp(-30, 0, -64);              // passa atrás da ilha do farol
  box(1.7, .3, .5, LIGHT, 0, .15, 0, barco);      // casco
  box(1.5, .06, .44, DARK2, 0, .33, 0, barco);    // convés
  box(.04, 2.3, .04, DARK2, .1, 1.45, 0, barco);  // mastro
  const vela = (pts, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.computeVertexNormals();
    barco.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })));
  };
  vela([.14, .45, 0, .14, 2.5, 0, .95, .45, 0], GLOW);        // vela grande
  vela([.06, .45, 0, .06, 2.1, 0, -.7, .45, 0], LIGHT);        // giba
  anim(t => {
    const x = ((t * .45 + 40) % 140 + 140) % 140 - 70;
    const d = shoreZ(x) + 64;
    barco.position.set(x, SEA_Y + waveAt(x, d, t) * .55, -64);
    barco.rotation.z = Math.sin(t * .9) * .06;
    barco.rotation.x = Math.sin(t * .7 + 1) * .04;
  });

  // ── pedras na areia (posições escolhidas: várias entre o jogador e a água) ──
  const rocha = (rx, rz, s) => {
    const y = sandH(rx, rz);
    blob(.6 * s, .34 * s, .6 * s, DARK2, rx, y + .34 * s * .5, rz);        // meio enterrada
    blob(.32 * s, .22 * s, .3 * s, mix(DARK2, NAVY, .4), rx + .38 * s, y + .08 * s, rz + .2 * s);
    sombra(rx, rz + .25 * s, .75 * s, .6 * s, .28);
  };
  for (const [rx, rz, s] of [[-2.4, -17.2, .5], [3.1, -18.4, .35], [-5.6, -15.1, .7],
                             [6.8, -14.3, .45], [1.2, -13.2, .3], [-9.4, -16.8, .6],
                             [9.9, -17.6, .55], [-13, -13.4, .8], [14, -12.6, .5],
                             [-8, 6, 1], [10, 10, .7], [-14, 16, 1.2], [6, 22, .8],
                             [-3, -6, .6], [16, -2, .9], [-19, 2, .7], [12, 30, 1.1]]) rocha(rx, rz, s);

  // ── o costão à esquerda: pedras grandes entrando no mar, onda estourando ──
  const costao = [[-22.5, -21.6, 1.6], [-24.4, -23.2, 2.1], [-26.8, -21.4, 1.8], [-21.2, -24.6, 1.2], [-27.5, -25.5, 2.4], [-24.6, -19.6, 1.0]];
  const rings = [];
  for (const [x, z, s] of costao) {
    blob(1.2 * s, .8 * s, 1.0 * s, DARK2, x, .25 * s - .1, z);
    blob(.8 * s, .55 * s, .7 * s, mix(DARK2, NAVY, .35), x + .6 * s, .1 * s, z - .4 * s);
    blob(.5 * s, .7 * s, .5 * s, DARK2, x - .5 * s, .4 * s, z + .3 * s);
    const rg = new THREE.RingGeometry(1.05 * s, 1.5 * s, 22);
    rg.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: .3, depthWrite: false }));
    ring.position.set(x, .02, z);
    scene.add(ring);
    rings.push({ ring, x, d: shoreZ(x) - z });
  }
  blockOf(-30, -21, -19.6, -18.5);
  // espirro da onda contra as pedras
  const NSP = 48;
  const spray = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: .85, depthWrite: false }), NSP);
  spray.frustumCulled = false;
  scene.add(spray);
  const drops = [];
  for (let i = 0; i < NSP; i++) drops.push({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), age: 9, life: 1 });
  let lastCycle = null, spT = null, nextDrop = 0;
  const pm4 = new THREE.Matrix4(), pQ = new THREE.Quaternion(), pS = new THREE.Vector3();
  anim(t => {
    const dt = spT === null ? 0 : t - spT; spT = t;
    const cycle = Math.floor((2.5 * .17 + 1.5 * t - Math.PI / 2) / (2 * Math.PI)); // crista chegando no costão
    if (lastCycle !== null && cycle !== lastCycle) {
      for (let k = 0; k < 20; k++) {
        const dr = drops[nextDrop]; nextDrop = (nextDrop + 1) % NSP;
        const [x, z] = costao[k % 3];
        dr.p.set(x + (rnd() - .5) * 1.6, .5 + rnd() * .5, z + .6 + rnd() * .5);
        dr.v.set((rnd() - .5) * 2.2, 3 + rnd() * 3.2, .8 + rnd() * 1.6);
        dr.age = 0; dr.life = .9 + rnd() * .6;
      }
    }
    lastCycle = cycle;
    for (let i = 0; i < NSP; i++) {
      const dr = drops[i];
      dr.age += dt;
      if (dr.age < dr.life) { dr.v.y -= 9.8 * dt; dr.p.addScaledVector(dr.v, dt); }
      const k = dr.age < dr.life ? .1 * (1 - dr.age / dr.life) + .03 : 0;
      pS.setScalar(k);
      spray.setMatrixAt(i, pm4.compose(dr.p, pQ, pS));
    }
    spray.instanceMatrix.needsUpdate = true;
    for (const r of rings) {                     // espuma em volta das pedras sobe e desce com a onda
      const h = waveAt(r.x, Math.max(r.d, .5), t);
      r.ring.position.y = SEA_Y + Math.max(0, h * .5) + .05;
      r.ring.material.opacity = .18 + clamp01(h) * .3;
    }
  });

  // ── coqueiros: tronco curvo em anéis, folhas azuis (o que é vivo é azul) ──
  const TRUNK = mix(FLOOR, DARK2, .35), TRUNK2 = mix(FLOOR, LIGHT2, .3);
  const up = new THREE.Vector3(0, 1, 0);
  const fronds = [];
  const coqueiro = (bx, bz, H, lx, lz, ph) => {
    const by = sandH(bx, bz);
    const N = 11, pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, c = Math.pow(s, 1.8);
      pts.push(new THREE.Vector3(bx + lx * c, by - .2 + H * s, bz + lz * c));
    }
    for (let i = 0; i < N; i++) {
      const a = pts[i], b = pts[i + 1];
      const r0 = .23 - i * .011;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r0 - .006, r0 + .012, a.distanceTo(b) * 1.03, 7),
        new THREE.MeshLambertMaterial({ color: i % 2 ? TRUNK : TRUNK2, flatShading: true }));
      seg.position.copy(a).add(b).multiplyScalar(.5);
      seg.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
      scene.add(seg);
    }
    const top = pts[N];
    const crown = grp(top.x, top.y, top.z);
    blob(.3, .24, .3, TRUNK, 0, 0, 0, crown);
    for (let c = 0; c < 3; c++) blob(.13, .14, .13, DARK2, Math.cos(c * 2.1) * .2, -.22, Math.sin(c * 2.1) * .2, crown); // cocos
    for (let f = 0; f < 9; f++) {
      const fg = grp(0, .08, 0, crown);
      fg.rotation.y = f / 9 * Math.PI * 2 + ph;
      const droop = grp(0, 0, 0, fg);
      droop.rotation.z = .3 + (f % 3) * .14;      // a folha sai para cima e cai em arco
      let parent = droop;
      for (let k = 0; k < 4; k++) {
        const seg = grp(k === 0 ? 0 : .72, 0, 0, parent);
        seg.rotation.z = -.3 - k * .04;
        box(.74, .025, .025, TRUNK2, .37, .012, 0, seg);                              // nervura
        blob(.4, .022, .34 - k * .07, (f + k) % 2 ? LEAF : LEAF2, .38, 0, 0, seg);    // folíolos
        parent = seg;
      }
      fronds.push({ g: droop, base: droop.rotation.z, ph: f * 1.7 + ph });
    }
    sombra(bx, bz + .3, .7, .55, .4);             // pé do tronco
    sombra(top.x, top.z + 4, 2.6, 1.6, .16);      // copa, projetada pelo sol baixo
    blockOf(bx - .3, bz - .3, bx + .3, bz + .3);
  };
  coqueiro(-11, -13.5, 7.5, 1.2, -3, .3);      // estes dois emolduram a vista de quem chega
  coqueiro(12, -12.5, 7, -1.4, -2.8, 2.2);
  coqueiro(-16.5, -6, 9, -.8, -3, 1.4);
  coqueiro(19, -1, 8.6, -.6, -2.8, .8);
  coqueiro(-24, 11, 8, .9, -2, 2.9);
  coqueiro(26, 15, 9.4, -1.2, -2.2, 1.9);
  anim(t => {
    for (const fr of fronds) fr.g.rotation.z = fr.base + Math.sin(t * 1.1 + fr.ph) * .06 + Math.sin(t * 2.7 + fr.ph) * .02;
  });

  // ── capim das dunas (instanciado) ────────────────────────────────────────
  const tufo = new THREE.Group();
  const GRASS = mix(BLUE, LIGHT2, .55);
  for (let k = 0; k < 6; k++) {
    const bl = box(.025, .5, .012, k % 2 ? GRASS : LEAF2, 0, 0, 0, tufo);
    bl.geometry.translate(0, .25, 0);             // pivô no pé da folha
    bl.rotation.set(Math.cos(k * 1.05) * .35, k, Math.sin(k * 1.05) * .35);
  }
  const tufoMats = [];
  for (let i = 0; i < 140; i++) {
    const x = (rnd() - .5) * 64, z = -4 + rnd() * 50;
    if (z - shoreZ(x) < 15 || Math.abs(x - 3) < 1.3) continue;    // só nas dunas, fora da passarela
    tufoMats.push(at(x, sandH(x, z) - .03, z, rnd() * 6.28, .7 + rnd() * .7));
  }
  instanciar(tufo, tufoMats);

  // ── passarela de madeira descendo das dunas (por onde ele chegou) ────────
  const WX = 3, plankMats = [], postMats = [], ropeMats = [];
  const pV = new THREE.Vector3(), pQ2 = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), eX = new THREE.Euler();
  const deck = z => sandH(WX, z) + .14;
  for (let z = -4.5; z < 45; z += .3) {
    const slope = Math.atan2(deck(z + .15) - deck(z - .15), .3);
    pQ2.setFromEuler(eX.set(-slope, (rnd() - .5) * .03, 0));
    plankMats.push(new THREE.Matrix4().compose(pV.set(WX, deck(z), z), pQ2, one));
  }
  const plankM = new THREE.Group();
  box(1.4, .045, .25, mix(FLOOR, LIGHT2, .5), 0, 0, 0, plankM);
  instanciar(plankM, plankMats);
  const posts = [];
  for (let z = -4.4; z < 45; z += 1.8) for (const s of [-1, 1]) {
    const x = WX + s * .75, top = deck(z) + .55;
    posts.push([x, z, top]);
    postMats.push(at(x, top - .4, z));
  }
  const postM = new THREE.Group();
  box(.08, .8, .08, TRUNK, 0, 0, 0, postM);
  instanciar(postM, postMats);
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i + 2 < posts.length; i++) {    // corda entre postes do mesmo lado
    A.set(posts[i][0], posts[i][2] - .05, posts[i][1]);
    B.set(posts[i + 2][0], posts[i + 2][2] - .05, posts[i + 2][1]);
    const m = new THREE.Matrix4().lookAt(A, B, up);
    m.multiply(new THREE.Matrix4().makeScale(1, 1, A.distanceTo(B)));
    m.setPosition(A.clone().add(B).multiplyScalar(.5));
    ropeMats.push(m);
  }
  const ropeM = new THREE.Group();
  box(.02, .02, 1, mix(LIGHT, FLOOR, .3), 0, 0, 0, ropeM);
  instanciar(ropeM, ropeMats);

  // ── o canto dele: guarda-sol, espreguiçadeira, toalha, chinelos, um livro ──
  const GX = -7.4, GZ = -15.6, gy = sandH(GX, GZ);
  const gs = grp(GX, gy, GZ);
  gs.rotation.set(-.07, 0, .06);
  box(.05, 2.5, .05, GLOW, 0, 1.0, 0, gs);        // haste (enterrada um pouco)
  const canopyGeo = new THREE.ConeGeometry(1.45, .5, 16, 1, true).toNonIndexed();
  const cP = canopyGeo.attributes.position, cCol = [], cBlue = new THREE.Color(BLUE), cWhite = new THREE.Color(GLOW);
  for (let i = 0; i < cP.count; i += 3) {         // gomos alternados azul e branco
    const ax = (cP.getX(i) + cP.getX(i + 1) + cP.getX(i + 2)) / 3, az = (cP.getZ(i) + cP.getZ(i + 1) + cP.getZ(i + 2)) / 3;
    const seg = Math.floor(((Math.atan2(az, ax) + Math.PI) / (Math.PI * 2)) * 8) % 2;
    const c = seg ? cBlue : cWhite;
    for (let k = 0; k < 3; k++) cCol.push(c.r, c.g, c.b);
  }
  canopyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cCol, 3));
  canopyGeo.computeVertexNormals();
  const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true }));
  canopy.position.y = 2.3;
  gs.add(canopy);
  box(.07, .1, .07, DARK2, 0, 2.58, 0, gs);       // ponteira
  for (let k = 0; k < 8; k++) {                   // franja na borda
    const a = k / 8 * Math.PI * 2;
    box(.32, .05, .02, k % 2 ? BLUE : GLOW, Math.cos(a) * 1.42, 2.03, Math.sin(a) * 1.42, gs).rotation.y = -a + Math.PI / 2;
  }
  anim(t => { canopy.rotation.y = Math.sin(t * .8) * .03; gs.rotation.z = .06 + Math.sin(t * 1.3) * .008; }); // brisa
  sombra(GX + .2, GZ + 1.1, 1.6, 1.3, .3);
  blockOf(GX - .2, GZ - .2, GX + .2, GZ + .2);

  // espreguiçadeira de frente para o mar, na sombra
  const CX = GX - 1.3, CZ = GZ + .4, cy = sandH(CX, CZ);
  const cad = grp(CX, cy, CZ);
  const WOOD = mix(FLOOR, LIGHT2, .5);
  for (const [lx, lz] of [[-.28, -.62], [.28, -.62], [-.28, .45], [.28, .45]]) box(.05, .28, .05, WOOD, lx, .14, lz, cad);
  for (const s of [-1, 1]) box(.05, .05, 1.2, WOOD, s * .29, .3, -.05, cad);  // longarinas
  box(.54, .03, .95, BLUE, 0, .33, -.15, cad);   // lona do assento
  for (let k = 0; k < 4; k++) lite(.54, .002, .08, GLOW, 0, .347, -.55 + k * .25, cad); // listras
  const encosto = grp(0, .33, .33, cad);
  encosto.rotation.x = .85;                      // reclinado para trás
  box(.54, .75, .03, BLUE, 0, .37, 0, encosto);
  for (const s of [-1, 1]) box(.05, .78, .05, WOOD, s * .29, .37, 0, encosto);
  for (let k = 0; k < 3; k++) lite(.54, .07, .002, GLOW, 0, .15 + k * .25, -.017, encosto);
  box(.4, .025, .6, mix(NAVY, GLOW, .15), .02, .36, -.1, cad);  // toalha dobrada
  lite(.4, .002, .06, GLOW, .02, .374, -.25, cad);
  lite(.4, .002, .06, GLOW, .02, .374, .05, cad);
  const livro = grp(-.1, .385, -.45, cad);       // um livro aberto, de bruços (ele trouxe um dos seus)
  livro.rotation.y = .4;
  box(.13, .012, .19, NAVY, -.06, 0, 0, livro).rotation.z = .25;
  box(.13, .012, .19, NAVY, .06, 0, 0, livro).rotation.z = -.25;
  box(.012, .03, .185, GLOW, 0, -.012, 0, livro);
  sombra(CX, CZ + .2, .55, .95, .3);
  blockOf(CX - .35, CZ - .75, CX + .35, CZ + .6);
  for (const [fx2, fz, r] of [[CX + .5, CZ - .95, .2], [CX + .72, CZ - .85, -.1]]) { // chinelos
    const ch = grp(fx2, sandH(fx2, fz) + .012, fz);
    ch.rotation.y = r;
    blob(.055, .012, .13, BLUE, 0, 0, 0, ch);
    box(.08, .012, .012, GLOW, 0, .02, -.03, ch);
  }

  // ── tronco de madeira trazido pelo mar, desbotado ────────────────────────
  const tr = grp(8.6, sandH(8.6, -12.8) + .08, -12.8);
  tr.rotation.y = .6;
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, 2.6, 7), new THREE.MeshLambertMaterial({ color: LIGHT, flatShading: true }));
  tronco.rotation.z = Math.PI / 2;
  tr.add(tronco);
  const galho = new THREE.Mesh(new THREE.CylinderGeometry(.03, .06, .7, 5), new THREE.MeshLambertMaterial({ color: LIGHT, flatShading: true }));
  galho.position.set(.6, .18, .12); galho.rotation.set(.5, 0, -.9);
  tr.add(galho);
  blob(.16, .16, .16, LIGHT2, -1.32, 0, 0, tr);  // ponta lascada
  sombra(8.6, -12.5, 1.5, .4, .25, .6);
  blockOf(7.6, -13.6, 9.6, -12.0);

  // ── linha da maré: algas e gravetos onde a água alta chegou ──────────────
  const alga = new THREE.Group();
  box(.28, .014, .03, mix(NAVY, BLUE, .25), 0, 0, 0, alga);
  const graveto = new THREE.Group();
  box(.14, .02, .025, DARK2, 0, 0, 0, graveto);
  const algaMats = [], gravMats = [];
  for (let i = 0; i < 160; i++) {
    const x = (rnd() - .5) * 120, z = shoreZ(x) + 3.9 + rnd() * .7;
    (i % 3 ? algaMats : gravMats).push(at(x, sandH(x, z) + .012, z, rnd() * 6.28, .6 + rnd() * .9));
  }
  instanciar(alga, algaMats);
  instanciar(graveto, gravMats);

  // conchas e estrelas-do-mar perto dos pés
  for (let i = 0; i < 18; i++) {
    const x = (rnd() - .5) * 18, z = -18.2 + rnd() * 6;
    const y = sandH(x, z);
    if (i % 2) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(.035, .085, 6), new THREE.MeshLambertMaterial({ color: GLOW, flatShading: true }));
      c.position.set(x, y + .03, z); c.rotation.set(0, rnd() * 6.28, Math.PI / 2);
      scene.add(c);
    } else {
      const c = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: i % 4 ? LIGHT : mix(GLOW, SUNC, .4), flatShading: true }));
      c.scale.y = .45; c.position.set(x, y + .005, z); c.rotation.y = rnd() * 6.28;
      scene.add(c);
    }
  }
  const STAR = mix(BLUE, LIGHT, .25);
  for (const [x, z, r] of [[-3.8, -17.1, .3], [4.7, -16.3, 1.2]]) {
    const st = grp(x, sandH(x, z) + .012, z);
    st.rotation.y = r;
    blob(.055, .016, .055, STAR, 0, 0, 0, st);
    for (let k = 0; k < 5; k++) {
      const arm = grp(0, 0, 0, st);
      arm.rotation.y = k * Math.PI * 2 / 5;
      blob(.07, .014, .026, STAR, .07, 0, 0, arm);
    }
  }

  // ── um caranguejo correndo de lado na areia molhada ──────────────────────
  const crab = grp(2.4, 0, -17.6);
  blob(.13, .05, .095, BLUE, 0, .075, 0, crab);
  for (const s of [-1, 1]) {
    box(.012, .05, .012, BLUE, s * .04, .12, -.07, crab);       // pedúnculos dos olhos
    lite(.022, .022, .022, DARK, s * .04, .15, -.07, crab);
  }
  const claws = [], legs = [];
  for (const s of [-1, 1]) {
    const cl = grp(s * .12, .07, -.09, crab);
    box(.08, .04, .05, BLUE, s * .03, 0, -.02, cl);
    box(.05, .03, .04, BLUE, s * .07, .02, -.06, cl);
    claws.push({ cl, s });
    for (let k = 0; k < 3; k++) {
      const lg = grp(s * .1, .06, -.03 + k * .05, crab);
      box(.15, .012, .012, BLUE, s * .075, 0, 0, lg);
      lg.rotation.z = -s * .55;
      legs.push({ lg, s, k });
    }
  }
  anim(t => {
    const u = t % 11;                             // corre 2 s, para 3.5, volta 2, para 3.5
    const k = u < 2 ? smooth(u / 2) : u < 5.5 ? 1 : u < 7.5 ? 1 - smooth((u - 5.5) / 2) : 0;
    const moving = u < 2 || (u > 5.5 && u < 7.5);
    const x = 2.4 + k * 2.6;
    crab.position.set(x, sandH(x, -17.6), -17.6);
    for (const L of legs) L.lg.rotation.z = -L.s * .55 + (moving ? Math.sin(t * 22 + L.k * 2.1 + L.s) * .35 : 0);
    for (const C of claws) C.cl.rotation.y = Math.sin(t * 1.7 + C.s) * .15;
  });

  // ── gaivotas planando em círculos sobre a água ───────────────────────────
  const gulls = [];
  for (let i = 0; i < 4; i++) {
    const g = grp(0, 0, 0);
    g.rotation.order = 'YXZ';
    blob(.07, .07, .24, GLOW, 0, 0, 0, g);       // corpo
    blob(.05, .05, .06, GLOW, 0, .02, -.22, g);  // cabeça
    box(.025, .02, .05, mix(GLOW, SUNC, .6), 0, .015, -.29, g); // bico
    box(.09, .015, .12, LIGHT, 0, 0, .25, g);    // cauda
    const wings = [];
    for (const s of [-1, 1]) {
      const root = grp(s * .04, .02, 0, g);
      box(.45, .02, .17, GLOW, s * .22, 0, 0, root);
      const tip = grp(s * .44, 0, 0, root);
      box(.4, .016, .13, GLOW, s * .2, 0, .02, tip);
      lite(.12, .018, .11, DARK2, s * .36, 0, .03, tip);  // pontas pretas das asas
      wings.push({ root, tip, s });
    }
    g.scale.setScalar(1.6);
    gulls.push({ g, wings, cx: (rnd() - .5) * 24, cz: -34 - rnd() * 14, R: 7 + rnd() * 7, h: 7 + rnd() * 5, w: .22 + rnd() * .16, ph: rnd() * 6.28 });
  }
  anim(t => {
    for (const b of gulls) {
      const a = b.ph + b.w * t;
      b.g.position.set(b.cx + Math.cos(a) * b.R, b.h + Math.sin(t * .7 + b.ph) * .5, b.cz + Math.sin(a) * b.R);
      b.g.rotation.y = Math.atan2(Math.sin(a), -Math.cos(a)); // de frente para onde voa
      b.g.rotation.z = -.32;                      // inclinada na curva
      const flapping = ((t * .18 + b.ph) % 1) < .3;
      const fl = flapping ? Math.sin(t * 9 + b.ph) * .55 : .1 + Math.sin(t * 1.3 + b.ph) * .04;
      for (const w of b.wings) { w.root.rotation.z = w.s * fl; w.tip.rotation.z = w.s * fl * .7; }
    }
  });

  // ── a canoa ──────────────────────────────────────────────────────────────
  // Na beira, proa para o mar. E: ele vai até ela, apoia as mãos na borda e entra. Andar = remar
  // para onde se olha (a remada escolhe o lado sozinha, como quem rema de verdade). Perto da escada
  // do trapiche, mirar nela e apertar E: ele encosta a canoa, larga o remo, vira e sobe degrau a degrau.
  const CL = 1.85, CW = .42, CD = .3;            // meio-comprimento, meia-boca, pontal
  const rimX = z => CW * (1 - .3 * Math.abs(z) / CL) * Math.sqrt(Math.max(0, 1 - (z / CL) ** 2)); // meia-boca em z
  const rimY = z => .9 * CD * (Math.abs(z) / CL) ** 4;                                           // a borda sobe nas pontas
  const floorY = z => -CD * .9 * Math.sqrt(Math.max(0, 1 - (z / CL) ** 2)) + .02;               // o fundo, por dentro
  const NS = 14;
  const cascoGeo = new THREE.SphereGeometry(1, NS, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); // meia esfera: a cuia
  const kP = cascoGeo.attributes.position;
  for (let i = 0; i < kP.count; i++) {
    const k = Math.abs(kP.getZ(i));
    kP.setX(i, kP.getX(i) * (1 - .3 * k));       // pontas afinadas
    kP.setY(i, kP.getY(i) + .9 * k ** 4);         // proa e popa levantadas
  }
  cascoGeo.computeVertexNormals();
  const canoa = grp(0, 0, 0);
  canoa.rotation.order = 'YXZ';
  const casco = new THREE.Mesh(cascoGeo, new THREE.MeshLambertMaterial({ color: MAD2, flatShading: true, side: THREE.DoubleSide }));
  casco.scale.set(CW, CD, CL);
  canoa.add(casco);
  const forro = new THREE.Mesh(cascoGeo, new THREE.MeshLambertMaterial({ color: MAD, flatShading: true, side: THREE.BackSide }));
  forro.scale.set(CW * .93, CD * .9, CL * .96);   // por dentro, madeira mais clara
  canoa.add(forro);
  // a boca da canoa vira uma tampa invisível que marca o stencil: o mar não pinta ali dentro
  const tampaPos = [0, 0, 0];
  for (let i = 0; i <= NS; i++) tampaPos.push(kP.getX(i), kP.getY(i), kP.getZ(i)); // a 1ª fileira da cuia é a borda
  const tampaGeo = new THREE.BufferGeometry();
  tampaGeo.setAttribute('position', new THREE.Float32BufferAttribute(tampaPos, 3));
  const tIdx = [];
  for (let i = 1; i <= NS; i++) tIdx.push(0, i, i + 1);
  tampaGeo.setIndex(tIdx);
  const tampa = new THREE.Mesh(tampaGeo, new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: STENCIL_CANOA, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  }));
  tampa.scale.set(CW, CD, CL);
  tampa.renderOrder = -.5;                        // antes do mar
  canoa.add(tampa);
  for (const z of [-.75, 1.0])                    // bancos, da largura do casco naquele ponto
    box(2 * rimX(z) * .97, .04, .2, MAD2, 0, -.12, z, canoa); // baixos: sentado, o quadril fica abaixo da borda

  // remo de pá única: origem no punho, o cabo desce por -y até a pá
  const BLADE = 1.17;                             // do punho ao centro da pá
  const remo = grp(0, 0, 0, canoa);
  box(.12, .04, .04, MAD, 0, 0, 0, remo);         // punho em T
  box(.035, .97, .035, MAD, 0, -.5, 0, remo);     // cabo
  box(.08, .1, .03, MAD2, 0, -.97, 0, remo);      // garganta
  box(.17, .44, .022, MAD2, 0, -BLADE, 0, remo);  // pá
  remo.traverse(o => { if (o.isMesh) fadeNearCamera(o.material); }); // nunca visto por dentro, nem colado no olho

  // Estados do remo no espaço da canoa: G = punho, D = rumo do punho para a pá, F = normal da
  // face da pá, a = [onde a mão esquerda, a direita] seguram no cabo (m a partir do punho).
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const estado = () => ({ G: V3(0, 0, 0), D: V3(1, 0, 0), F: V3(0, 1, 0), a: [0, 0] });
  const NO_FUNDO = { G: V3(-.6, .05, .55), D: V3(1, 0, 0), F: V3(0, 1, 0), a: [.3, .75] };   // deitado sobre as bordas
  const NO_COLO = { G: V3(-.55, .36, .72), D: V3(1, 0, 0), F: V3(0, 1, 0), a: [.33, .77] };  // atravessado no colo
  // A remada, lado +x (o lado -x espelha x). T = mão de cima no punho, B = para onde a pá aponta.
  // Entrada lá na frente, puxa até o quadril, sai, volta pelo ar com a pá deitada (feathering).
  // A câmera sentada fica perto de (0, .7, .82): todo T fica a 30 cm ou mais dela — a mão de cima
  // vai à frente e ao lado do rosto, nunca na frente do olho (zona de conforto da cabeça).
  const RM = {
    catchT: V3(.2, .54, .44), catchB: V3(.5, -.47, .45),   // mão de cima na altura do queixo, não dos olhos
    exitT: V3(.26, .44, .92), exitB: V3(.55, -.41, 1.32),
    outT: V3(.28, .5, .62), outB: V3(.62, .1, 1.3),
    fwdT: V3(.24, .56, .46), fwdB: V3(.66, .3, .5),
    bOutT: V3(.24, .52, .5), bOutB: V3(.6, .1, .45),   // ré: entra atrás, empurra para a frente
    bFwdT: V3(.26, .46, .86), bFwdB: V3(.66, .3, 1.25),
  };
  const tA = V3(0, 0, 0), tB = V3(0, 0, 0);
  // u: 0–.45 pá na água · .45–.55 sai · .55–1 volta pelo ar; s0 → s1: troca de lado durante a volta
  function remada(u, s0, s1, back, out) {
    let T0, T1, B0, B1, k, fe;
    const r = RM;
    if (u < .45) { k = u / .45; fe = 0; [T0, T1, B0, B1] = back ? [r.exitT, r.catchT, r.exitB, r.catchB] : [r.catchT, r.exitT, r.catchB, r.exitB]; }
    else if (u < .55) { k = (u - .45) / .1; fe = k; [T0, T1, B0, B1] = back ? [r.catchT, r.bOutT, r.catchB, r.bOutB] : [r.exitT, r.outT, r.exitB, r.outB]; }
    else if (u < .85) { k = (u - .55) / .3; fe = 1; [T0, T1, B0, B1] = back ? [r.bOutT, r.bFwdT, r.bOutB, r.bFwdB] : [r.outT, r.fwdT, r.outB, r.fwdB]; }
    else { k = (u - .85) / .15; fe = 1 - k; [T0, T1, B0, B1] = back ? [r.bFwdT, r.exitT, r.bFwdB, r.exitB] : [r.fwdT, r.catchT, r.fwdB, r.catchB]; }
    const e = smooth(k);
    tA.lerpVectors(T0, T1, e);
    tB.lerpVectors(B0, B1, e);
    const ks = u < .55 ? 0 : smooth((u - .55) / .45);
    const s = s0 + (s1 - s0) * ks;
    tA.x *= s; tB.x *= s;
    if (s0 !== s1) {                              // trocando de lado: a pá passa alta por cima da canoa
      const lift = Math.sin(Math.PI * ks);
      tB.y += .5 * lift; tA.y += .1 * lift;
    }
    out.G.copy(tA);
    out.D.subVectors(tB, tA).normalize();
    out.F.set(0, fe, 1 - fe);                     // na água a face empurra para trás; no ar, deitada
    out.a[0] = .3 * (1 - s); out.a[1] = .3 * (1 + s); // a mão do lado da pá vai embaixo, a outra no punho
    return s;
  }
  function mistura(a, b, k, out) {
    out.G.lerpVectors(a.G, b.G, k);
    out.D.lerpVectors(a.D, b.D, k);
    if (out.D.lengthSq() < 1e-6) out.D.copy(b.D); else out.D.normalize();
    out.F.lerpVectors(a.F, b.F, k);
    out.a[0] = a.a[0] + (b.a[0] - a.a[0]) * k;
    out.a[1] = a.a[1] + (b.a[1] - a.a[1]) * k;
  }
  const NEG_Y = V3(0, -1, 0), fc = V3(0, 0, 0), fp = V3(0, 0, 0), cr = V3(0, 0, 0);
  const q1 = new THREE.Quaternion(), qT = new THREE.Quaternion();
  function poeRemo(P) {
    remo.position.copy(P.G);
    q1.setFromUnitVectors(NEG_Y, P.D);
    fc.set(0, 0, 1).applyQuaternion(q1);          // para onde a face aponta só alinhando o cabo
    fp.copy(P.F).addScaledVector(P.D, -P.F.dot(P.D));
    if (fp.lengthSq() < 1e-6) { remo.quaternion.copy(q1); return; }
    fp.normalize();
    qT.setFromAxisAngle(P.D, Math.atan2(cr.crossVectors(fc, fp).dot(P.D), fc.dot(fp))); // gira o cabo até a face certa
    remo.quaternion.multiplyQuaternions(qT, q1);
  }
  // zona de conforto: se algum ponto do remo (do punho à ponta da pá) passa a menos de CONFORTO
  // da câmera, o remo inteiro é empurrado para fora — e as mãos, que vêm dele, vão junto
  const CONFORTO = .3, camL = V3(0, 0, 0), pq = V3(0, 0, 0);
  function afastaDoRosto(R) {
    canoa.worldToLocal(camL.copy(camera.position));
    const k = Math.min(Math.max(pq.subVectors(camL, R.G).dot(R.D), 0), BLADE + .22);
    pq.copy(R.G).addScaledVector(R.D, k);
    const d = pq.distanceTo(camL);
    if (d >= CONFORTO) return;
    if (d < 1e-4) pq.set(0, -.6, -.8); else pq.sub(camL).divideScalar(d); // para baixo e à frente, se colado
    R.G.addScaledVector(pq, CONFORTO - d);
  }
  const P = estado(), PS = estado(), PC = estado();
  const remoMao = i => P.G.clone().addScaledVector(P.D, P.a[i]);
  remada(.55, 1, 1, false, PS);

  // ondinhas onde a pá entra na água
  const ondaGeo = new THREE.RingGeometry(.82, 1, 24);
  ondaGeo.rotateX(-Math.PI / 2);
  const ondas = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(ondaGeo, foraDaCanoa(new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0, depthWrite: false })));
    m.renderOrder = 3;
    m.visible = false;
    scene.add(m);
    ondas.push({ m, age: 9 });
  }
  let nOnda = 0;

  const cv = {
    x: -1, z: -19.05, h: 0, v: 0, t: 0,
    rock: 0, rockV: 0,                            // balanço de quem mexe o peso lá dentro (mola)
    inp: null, riding: false, scripted: false, auto: 0, // auto ≠ 0: rema sozinha daquele lado (estacionando)
    stroking: false, u: .55, s0: 1, s1: 1, sNow: 1, back: false, nLado: 0,
    goal: 0, torque: .12, jfix: true,
    pl: 0, deck: 1,                               // remo: 0 no colo … 1 remando; deck 1 = deitado na canoa
  };
  const SEAT = V3(0, -.25, 1.0);                  // raiz do corpo sentado: no fundo, sob o banco de trás
  const UP = V3(0, 1, 0);
  const agua = (x, z, t) => SEA_Y + waveAt(x, shoreZ(x) - z, t);
  const casco0 = (x, z, t) => Math.max(sandH(x, z) + CD, agua(x, z, t) + .15);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  function aguaLivre(x, z) {
    if (x < -68 || x > 68 || z < -92) return false;
    if (z > shoreZ(x) + .25) return false;                                // não sobe na areia
    if (x > -31 && x < -18.5 && z > -29 && z < -17.5) return false;       // costão
    if (ilhaQ(x, z) < 1.2) return false;                                  // pedras da ilha
    if (Math.abs(x - IX) < .9 && z > PIER_Z0 && z < LAD_Z + .3) return false; // trapiche e escada
    if (((x - 46) / 10.5) ** 2 + ((z + 58) / 4.5) ** 2 < 1) return false; // ilhota
    return true;
  }
  // assenta a canoa na água (ou na areia): altura e inclinação pelas 4 pontas, mais o balanço do peso
  function poseCanoa(t) {
    const s = Math.sin(cv.h), c = Math.cos(cv.h);
    const h = (lx, lz) => casco0(cv.x + lx * c + lz * s, cv.z - lx * s + lz * c, t);
    const hb = h(0, -CL * .9), hs = h(0, CL * .9), hl = h(-CW, 0), hr = h(CW, 0);
    canoa.position.set(cv.x, (hb + hs + hl + hr) / 4, cv.z);
    canoa.rotation.set(Math.atan2(hb - hs, CL * 1.8), cv.h, Math.atan2(hr - hl, CW * 2) * .5 + cv.rock);
    canoa.updateMatrixWorld(true);
  }
  // de que lado remar: A/D mandam; senão a proa vai para onde se olha; reto, troca a cada 4 remadas
  function lado(inp) {
    if (Math.abs(inp.st) > .15) return inp.st < 0 ? 1 : -1;               // remar à direita vira a proa à esquerda
    const d = angDiff(inp.yaw, cv.h);
    if (Math.abs(d) > .2) return d > 0 ? 1 : -1;
    return cv.nLado >= 4 ? -cv.s1 : cv.s1;
  }

  // um passo da canoa por quadro (idempotente em t: câmera, ações e anim chamam à vontade)
  let cuT = -1;
  const wB = V3(0, 0, 0);
  function atualizaCanoa(t) {
    if (t === cuT) return;
    const dt = cuT < 0 ? 0 : Math.min(t - cuT, .05);
    cuT = t; cv.t = t;
    const inp = cv.inp; cv.inp = null;
    const quer = cv.auto ? true : !!inp && (Math.abs(inp.f) > .15 || Math.abs(inp.st) > .15);
    cv.rockV += (-26 * cv.rock - 3 * cv.rockV) * dt;
    cv.rock += cv.rockV * dt;

    // ── remada ──
    let pegou = false;
    if (quer && !cv.stroking) {                   // começa: o remo sai do colo direto para a volta pelo ar
      cv.stroking = true; cv.u = .55; cv.nLado = 0;
      cv.back = !cv.auto && inp.f < -.15;
      cv.s0 = cv.s1 = cv.auto ? Math.sign(cv.auto) : cv.back ? cv.s1 : lado(inp);
      if (inp) cv.goal = inp.yaw;
    }
    if (cv.stroking) {
      const u0 = cv.u;
      cv.u += dt / 1.5;
      if (u0 < .55 && cv.u >= .55) {              // a pá saiu da água: decide a próxima remada
        if (!quer) { cv.stroking = false; cv.u = .55; }
        else {
          cv.back = !cv.auto && inp.f < -.15;
          const s = cv.auto ? Math.sign(cv.auto) : cv.back ? (cv.nLado >= 4 ? -cv.s1 : cv.s1) : lado(inp);
          cv.nLado = s === cv.s1 ? cv.nLado + 1 : 0;
          cv.s1 = s;
          const vira = !cv.auto && !cv.back && (Math.abs(inp.st) > .15 || Math.abs(angDiff(inp.yaw, cv.h)) > .2);
          cv.torque = vira ? .55 : .12;
          cv.jfix = !vira && !cv.back && !cv.auto; // reto: o "J" no fim da remada segura a proa no rumo
          if (inp) cv.goal = inp.yaw;
        }
      }
      if (cv.u >= 1) { cv.u -= 1; cv.s0 = cv.s1; pegou = true; } // a pá entra na água lá na frente
    }
    cv.pl += ((cv.stroking ? 1 : 0) - cv.pl) * Math.min(1, dt * 4);

    // ── física: só a pá dentro d'água empurra; a água freia ──
    if (!cv.scripted) {
      const shape = cv.stroking && cv.pl > .6 && cv.u < .45 ? Math.sin(Math.PI * cv.u / .45) : 0;
      const sg = cv.back ? -1 : 1;
      cv.v += (cv.back ? 2 : 3.2) * shape * sg * dt;
      cv.h += cv.s0 * cv.torque * shape * sg * dt; // remar de um lado gira a proa para o outro
      if (cv.jfix) cv.h += angDiff(cv.goal, cv.h) * .9 * shape * dt;
      cv.v -= cv.v * .55 * dt;
      const s = Math.sin(cv.h), c = Math.cos(cv.h);
      const nx = cv.x - s * cv.v * dt, nz = cv.z - c * cv.v * dt;
      const ponta = cv.v >= 0 ? -CL : CL;          // a ponta que vai na frente
      if (aguaLivre(nx, nz) && aguaLivre(nx + s * ponta, nz + c * ponta)) { cv.x = nx; cv.z = nz; }
      else cv.v *= .2;                             // bateu: perde o embalo
    }

    // ── remo ──
    cv.sNow = remada(cv.u, cv.s0, cv.s1, cv.back, PS);
    mistura(NO_COLO, PS, cv.pl, PC);
    mistura(PC, NO_FUNDO, cv.deck, P);
    afastaDoRosto(P);
    poeRemo(P);

    // ── o corpo sentado, remando (durante as ações quem manda nele é a ação) ──
    if (cv.riding) {
      placeBody(canoa, SEAT.x, SEAT.y, SEAT.z, 0);
      const bz = PS.G.z + PS.D.z * BLADE;          // pá lá na frente: tronco inclinado e girado para ela
      const lc = cv.pl * clamp01((1.32 - bz) / .87);
      pose.hip.set(0, .25, .03);
      pose.lean = .08 + .12 * lc;                 // pouco: o ombro não sobe na câmera
      pose.twist = cv.pl * cv.sNow * (.35 * lc - .08);
      for (let i = 0; i < 2; i++) {
        pose.hands[i].copy(remoMao(i)).sub(SEAT);
        pose.feet[i].set(i ? .13 : -.13, SOLE, -.75);      // pernas esticadas para a frente (joelho baixo)
      }
      pose.knee.set(0, .8, -1);
      applyPose();
    }
    poseCanoa(t);

    // ── ondinhas e o chuá da pá entrando ──
    if (pegou && cv.pl > .5) {
      canoa.localToWorld(wB.copy(P.G).addScaledVector(P.D, BLADE));
      const o = ondas[nOnda]; nOnda = (nOnda + 1) % ondas.length;
      o.age = 0; o.m.position.copy(wB); o.m.visible = true;
      sfxPaddle();
    }
    for (const o of ondas) {
      if (!o.m.visible) continue;
      o.age += dt;
      if (o.age > 1.4) { o.m.visible = false; continue; }
      o.m.scale.setScalar(.12 + o.age * .55);
      o.m.material.opacity = .4 * (1 - o.age / 1.4);
      o.m.position.y = agua(o.m.position.x, o.m.position.z, t) + .03;
    }
  }
  anim(atualizaCanoa);

  const canoaRide = {
    move(dt, f, st, yaw) { cv.inp = { f, st, yaw }; },
    camera(t, yaw, out) {
      atualizaCanoa(t);
      cameraFromHead(out, yaw);
      return { pitch: canoa.rotation.x * .5, roll: canoa.rotation.z * .6 };
    },
  };

  // ── ações de corpo inteiro ──
  const naCanoa = v => canoa.localToWorld(v);
  const daCanoa = w => canoa.worldToLocal(w.clone());
  const areiaLocal = (lx, lz) => { const w = naCanoa(V3(lx, 0, lz)); return daCanoa(V3(w.x, sandH(w.x, w.z), w.z)).y; };
  const umaVez = fn => { let feito = false; return k => { if (!feito && k > .92) { feito = true; fn(); } }; };
  const pisa = () => umaVez(sfxStep);
  const balanca = r => () => { cv.rockV += r; };  // + levanta o lado +x da canoa

  // embarcar: vai até o lado da canoa, agacha com as mãos na borda, um pé, o outro, vira, senta, pega o remo
  function embarcar(ctx) {
    atualizaCanoa(cv.t);
    const pl = daCanoa(V3(ctx.px, 0, ctx.pz));
    const sg = pl.x > .3 ? 1 : -1;               // +1: ele vem pela direita (+x) da canoa
    const yawLado = sg > 0 ? Math.PI / 2 : -Math.PI / 2; // de frente para a canoa
    const rz = sg < 0 ? 1 : -1;                   // a mão direita fica para este lado em z
    const zM = [1.0 - .28 * rz, 1.0 + .28 * rz];   // mãos esquerda e direita, ao redor do banco
    const perto = z => V3(sg * (rimX(z) + .01), rimY(z) + .05, z);
    const longe = z => V3(-sg * (rimX(z) + .01), rimY(z) + .05, z);
    const chao = z => floorY(z) + SOLE;
    const dist = Math.hypot(pl.x - sg * .9, pl.z - 1.0);
    const passos = [
      { dur: Math.min(2.6, Math.max(.7, dist / 1.4)), walk: true, root: V3(sg * .9, areiaLocal(sg * .9, 1.0), 1.0),
        yaw: yawLado, pitch: -.45, look: 0 },
      // agacha e apoia as duas mãos na borda de perto
      // (um passo longe da borda e olhando bem para baixo: as mãos apoiadas aparecem na 1ª pessoa)
      { dur: .75, hipY: .62, lean: .7, pitch: -1.0, hands: [perto(zM[0]), perto(zM[1])], arc: { hands: [.12, .12] }, knee: V3(0, .1, -1) },
      // o peso nas mãos; o pé direito passa por cima da borda e pisa no fundo
      { dur: .9, root: V3(sg * .5, areiaLocal(sg * .5, 1.0), 1.0), hipY: .78, lean: .5,
        feet: [null, V3(sg * .06, chao(1.0 + .17 * rz), 1.0 + .17 * rz)], arc: { feet: [0, .45] },
        on: balanca(-sg * .5), at: pisa() },
      // o outro pé entra; a mão de trás vai para a borda do outro lado
      { dur: .85, root: V3(sg * .03, floorY(1.0), 1.0), hipY: .6, lean: .35, pitch: -.6,
        feet: [V3(-sg * .05, chao(1.0 - .17 * rz), 1.0 - .17 * rz), null], hands: [longe(zM[0]), null],
        arc: { feet: [.45, 0], hands: [.15, 0] }, on: balanca(-sg * .4), at: pisa() },
      // gira para a proa e senta no banco, as mãos descendo para as bordas ao lado do quadril
      { dur: 1.2, root: SEAT.clone(), yaw: 0, hipY: .25, hipZ: .03, lean: .1, pitch: -.3,
        feet: [V3(-.13, SEAT.y + SOLE, .25), V3(.13, SEAT.y + SOLE, .25)],
        hands: [V3(-(rimX(1.1) + .01), rimY(1.1) + .04, 1.1), V3(rimX(1.1) + .01, rimY(1.1) + .04, 1.1)],
        knee: V3(0, .8, -1), on: balanca(sg * .3), at: umaVez(sfxSit) },
      // pega o remo deitado no fundo...
      { dur: .55, lean: .35, pitch: -.65, hands: [() => remoMao(0), () => remoMao(1)] },
      // ...e traz para o colo
      { dur: .75, lean: .1, pitch: -.1, hands: [() => remoMao(0), () => remoMao(1)], at: k => { cv.deck = 1 - smooth(k); } },
    ];
    const a = makeAction(canoa, passos, { pitch: ctx.pitch, look: 0 });
    return {
      update(dt, t) { atualizaCanoa(t); return a.update(dt, t); },
      camera: cam => a.camera(cam),
      result() {
        cv.riding = true; cv.deck = 0;
        const k = inters.indexOf(canoa);
        if (k >= 0) inters.splice(k, 1);           // já está nela
        return { ride: canoaRide, then: () => say(speakerName('thought'), linesOf('canoa')) };
      },
    };
  }

  // subir: encosta a canoa atravessada na escada, larga o remo, vira, levanta e sobe mão-pé-mão-pé
  const railPt = (i, y) => V3(IX + (i ? .3 : -.3), y, LAD_Z + .03);
  const maoDegrau = (i, j) => j >= 12 ? railPt(i, j === 12 ? PIER_Y + .05 : PIER_Y + .43)  // acima do deck: corrimão
    : V3(IX + (i ? .15 : -.15), rungY(j) + .02, LAD_Z + .02);
  const peDegrau = (i, j) => V3(IX + (i ? .12 : -.12), rungY(j) + .02 + SOLE, LAD_Z + .14);
  function subir(ctx) {
    atualizaCanoa(cv.t);
    cv.riding = false; cv.scripted = true; cv.v = 0;
    // atravessada na frente da escada, com o banco de trás alinhado a ela
    const hp = Math.abs(angDiff(Math.PI / 2, cv.h)) < Math.PI / 2 ? Math.PI / 2 : -Math.PI / 2;
    const sL = hp > 0 ? 1 : -1;                    // o lado da canoa (x local) virado para a escada
    const ini = { x: cv.x, z: cv.z, h: cv.h };
    const alvo = { x: IX - Math.sin(hp) * SEAT.z, z: LAD_Z + .43, h: hp };
    const y0 = canoa.position.y;
    const yawEsc = -sL * Math.PI / 2;              // de frente para a escada, no espaço da canoa
    const giro = v => v.applyAxisAngle(UP, yawEsc);
    const peSentado = i => SEAT.clone().add(giro(V3(i ? .13 : -.13, SOLE, -.18))); // virado de lado: pés junto à borda, dentro
    const emPe = V3(sL * .02, floorY(SEAT.z), SEAT.z);
    const peEmPe = i => emPe.clone().add(giro(V3(i ? .17 : -.17, SOLE, -.03))); // fora do banco (z ±.1)
    const corrimao = (i, y) => () => daCanoa(railPt(i, y));
    const remando = [() => remoMao(0), () => remoMao(1)];
    const passosA = [
      // encosta: umas remadas do lado da escada e deixa a canoa deslizar até parar
      // (a câmera vai ficando rente à cabeça, camF .05: de frente para a escada, senão encosta nos degraus)
      { dur: 2.0, root: SEAT.clone(), yaw: 0, hipY: .25, hipZ: .03, lean: .1, pitch: .2, look: angDiff(0, hp), camF: .05,
        hands: remando, feet: [V3(-.13, SEAT.y + SOLE, .25), V3(.13, SEAT.y + SOLE, .25)], knee: V3(0, .8, -1),
        at: k => {
          const e = smooth(k);
          cv.x = ini.x + (alvo.x - ini.x) * e;
          cv.z = ini.z + (alvo.z - ini.z) * e;
          cv.h = ini.h + angDiff(alvo.h, ini.h) * e;
          cv.auto = k < .55 ? sL : 0;
          if (k > .97) cv.rockV += -sL * .02;       // o encostar
        } },
      // deita o remo no fundo da canoa
      { dur: .8, pitch: -.35, hands: remando, on: () => { cv.auto = 0; cv.stroking = false; }, at: k => { cv.deck = smooth(k); } },
      // vira para a escada e segura nos montantes
      { dur: 1.3, yaw: yawEsc, look: 0, pitch: .15, lean: .18, feet: [peSentado(0), peSentado(1)],
        hands: [corrimao(0, y0 + .75), corrimao(1, y0 + .75)], arc: { hands: [.12, .12] }, at: umaVez(sfxSit) },
      // fica de pé dentro da canoa, as mãos subindo pelos montantes
      { dur: 1.1, root: emPe, hipY: .88, hipZ: .04, lean: .14, pitch: .08, knee: V3(0, .1, -1),
        feet: [peEmPe(0), peEmPe(1)], hands: [corrimao(0, y0 + 1.3), corrimao(1, y0 + 1.3)], on: balanca(-sL * .5) },
    ];
    let B = null;
    const noBarco = i => () => naCanoa(peEmPe(i));
    const raiz = () => { const f = B.state.feet; return V3(IX, Math.min(f[0].y, f[1].y) - SOLE, LAD_Z + .31); };
    const mao = (i, j) => ({ dur: .45, root: raiz, hands: i ? [null, maoDegrau(1, j)] : [maoDegrau(0, j), null],
      arc: { hands: i ? [0, .06] : [.06, 0] }, away: .12, look: i ? -.1 : .1, at: pisa() });
    const pe = (i, j, extra) => ({ dur: .55, root: raiz, feet: i ? [null, peDegrau(1, j)] : [peDegrau(0, j), null],
      arc: { feet: i ? [0, .1] : [.1, 0] }, away: .14, look: 0, at: pisa(), ...extra });
    const passosB = [
      // as mãos trocam os montantes pelos degraus, os pés ainda na canoa
      { dur: .45, root: raiz, hands: [maoDegrau(0, 6), null], feet: [noBarco(0), noBarco(1)], arc: { hands: [.08, 0] }, away: .1, pitch: .1, look: .1, at: pisa() }, // olha os degraus, não o deck lá em cima
      { dur: .45, root: raiz, hands: [null, maoDegrau(1, 7)], feet: [noBarco(0), noBarco(1)], arc: { hands: [0, .08] }, away: .1, look: -.1, at: pisa() },
      pe(0, 4, { feet: [peDegrau(0, 4), noBarco(1)], on: balanca(sL * .6) }),   // deixa a canoa: ela balança
      pe(1, 5), mao(0, 8), pe(0, 6), mao(1, 9), pe(1, 7), mao(0, 10), pe(0, 8), mao(1, 11), pe(1, 9),
      mao(0, 12), pe(0, 10), mao(1, 13), pe(1, 11),
      // no topo: o pé esquerdo sobe para o deck e o corpo passa por cima, empurrando nos corrimãos
      { dur: .85, root: V3(IX, rungY(11) + .02, LAD_Z + .05), hipY: .6, lean: .4, pitch: -.25, look: 0,
        feet: [V3(IX - .12, PIER_Y + SOLE, LAD_Z - .4), null], arc: { feet: [.18, 0] }, away: .05, at: pisa() },
      // o outro pé vem, ele se endireita e solta as mãos
      { dur: .9, root: V3(IX, PIER_Y, LAD_Z - .5), hipY: .95, lean: .1, pitch: -.1,
        feet: [null, V3(IX + .12, PIER_Y + SOLE, LAD_Z - .66)],
        hands: [V3(IX - .29, PIER_Y + .84, LAD_Z - .48), V3(IX + .29, PIER_Y + .84, LAD_Z - .48)],
        arc: { feet: [0, .2], hands: [.1, .1] }, at: pisa() },
      // um passinho para a frente, parado em pé no trapiche
      { dur: .7, root: V3(IX, PIER_Y, PIER_Z1 - .5), hipY: .95, lean: .04, pitch: 0, camF: .17,   // .17: mesma câmera da caminhada (raiz BACK atrás), sem pulo ao terminar
        feet: [V3(IX - .11, PIER_Y + SOLE, PIER_Z1 - .56), V3(IX + .11, PIER_Y + SOLE, PIER_Z1 - .56)],
        hands: [V3(IX - .29, PIER_Y + .84, PIER_Z1 - .48), V3(IX + .29, PIER_Y + .84, PIER_Z1 - .48)], at: pisa() },
    ];
    const A = makeAction(canoa, passosA, { pitch: ctx.pitch, look: angDiff(ctx.yaw, cv.h) });
    let cur = A;
    return {
      update(dt, t) {
        atualizaCanoa(t);
        if (cur.update(dt, t)) return true;
        if (cur !== A) return false;
        B = cur = makeAction(scene, passosB, { pitch: A.state.pitch, look: A.state.look, camF: A.state.camF }); // sai da canoa para a escada
        return cur.update(dt, t);
      },
      camera: cam => cur.camera(cam),
      result: () => ({ walk: { x: IX, z: PIER_Z1 - .7 } }),  // a câmera termina aqui (raiz BACK atrás)
    };
  }

  if (IS_LOCAL) window.__praia = { cv, canoa, IX, LAD_Z, P, remo }; // dev: o script de captura posiciona a canoa
  tag(canoa, objectName('canoe'), { act: embarcar });
  tag(escada, objectName('ladder'), { act: subir, whileRiding: true, reach: 3.6 });
  blockOf(-1.45, -21, -.55, -17.1);

  // ── pegadas: quem anda deixa rastro na areia, que some devagar ───────────
  const NF = 60;
  const footGeo = new THREE.CircleGeometry(1, 12);
  footGeo.rotateX(-Math.PI / 2);
  const feet = [];
  for (let i = 0; i < NF; i++) {
    const m = new THREE.Mesh(footGeo, new THREE.MeshBasicMaterial({ color: DARK2, map: soft, transparent: true, opacity: 0, depthWrite: false }));
    m.scale.set(.065, 1, .13);
    m.visible = false;
    m.renderOrder = 2;
    scene.add(m);
    feet.push({ m, t0: -99 });
  }
  let lastFoot = null, footSide = 1, nextFoot = 0;
  anim(t => {
    const p = camera.position;
    if (lastFoot === null) lastFoot = new THREE.Vector2(p.x, p.z);
    const dx = p.x - lastFoot.x, dz = p.z - lastFoot.y, dist = Math.hypot(dx, dz);
    if (p.z < shoreZ(p.x)) lastFoot.set(p.x, p.z);  // fora da areia (canoa, ilha): sem rastro
    else if (dist > .62 && dist < 3) {           // passo dado (salto grande = teleporte, ignora)
      const nx = -dz / dist, nz = dx / dist;     // perpendicular: pé esquerdo, pé direito
      const fx3 = p.x + nx * .11 * footSide, fz = p.z + nz * .11 * footSide;
      const f = feet[nextFoot]; nextFoot = (nextFoot + 1) % NF;
      f.m.position.set(fx3, sandH(fx3, fz) + .022, fz);
      f.m.rotation.y = Math.atan2(dx, dz);
      f.m.visible = true;
      f.t0 = t;
      footSide = -footSide;
      lastFoot.set(p.x, p.z);
    } else if (dist >= 3) lastFoot.set(p.x, p.z);
    for (const f of feet) {
      if (!f.m.visible) continue;
      const age = t - f.t0;
      f.m.material.opacity = .32 * (1 - clamp01((age - 20) / 15)); // 20 s nítidas, somem em 15
      if (age > 35) f.m.visible = false;
    }
  });

  return {
    spawn: { x: 0, z: -15.5, yaw: 0 }, caption: sceneCaption('praia'), auto: null,
    elevFn: chaoH,            // a areia sobe para as dunas; na ilha, platô e trapiche
  };
}
