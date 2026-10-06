import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from '../config.js';
import { sceneCaption } from '../story.js';
import { camera } from '../renderer.js';
import { scene, freshScene, box, lite, grp, blob, anim, instanciar, at, walkOf, blockOf } from '../kit.js';

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
// Altura da onda pela distância d da arrebentação. As cristas andam PARA A PRAIA
// (d diminui com o tempo: +t nos termos em d); antes iam mar adentro.
// A MESMA fórmula existe em GLSL (WAVE_GLSL): o shader desenha o mar e o JS faz
// boiar o barco, a espuma das pedras e o espirro. Mudou uma, mude a outra.
const SHARP = 1.8;                               // >1: crista pontuda e cava larga, como ondulação de verdade
const swell = ph => Math.pow(Math.sin(ph) * .5 + .5, SHARP) * 2 - 1;
function waveAt(x, d, t) {
  const shoal = Math.max(.3, 2.2 - d * .045);   // a onda encorpa ao perder fundo
  const edge = clamp01(d / 7);                  // ...e morre nos últimos metros, já quebrada
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
  float edge = clamp(d / 7.0, 0.0, 1.0);
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


/* ---------- fita: faixa sólida ao longo de x, redesenhada a cada quadro (espuma, areia molhada) ---------- */
function fita(nx, color, opacity, order) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((nx + 1) * 6);
  const idx = [];
  for (let i = 0; i < nx; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
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
  const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({
    uniforms: seaU, vertexShader: SEA_VS, fragmentShader: SEA_FS, fog: true,
    extensions: { derivatives: true },             // normal da faceta (WebGL1); no WebGL2 já vem
  }));
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

  // ── ao longe: um promontório com farol, uma ilha, um veleiro ─────────────
  const LEAF = mix(BLUE, NAVY, .3), LEAF2 = mix(BLUE, NAVY, .55);
  const prom = grp(-44, 0, -47);
  blob(14, 5, 7, DARK2, 0, -.5, 0, prom);
  blob(8, 7.5, 5.5, DARK2, -7, .5, -2, prom);
  blob(9, 2.4, 4.6, LEAF2, -5, 5.4, -1.5, prom);  // mata no alto
  blob(6, 1.8, 3.5, LEAF2, 4, 3.4, -1, prom);
  const farol = grp(11, 2.2, .5, prom);
  for (let i = 0; i < 4; i++) {                   // torre listrada
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(.42 - i * .04, .46 - i * .04, .8, 10),
      new THREE.MeshLambertMaterial({ color: i % 2 ? DARK2 : GLOW }));
    seg.position.y = .4 + i * .8;
    farol.add(seg);
  }
  box(.5, .36, .5, DARK2, 0, 3.42, 0, farol);
  const lamp = lite(.32, .26, .32, GLOW, 0, 3.42, 0, farol);
  const lampHalo = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8),
    new THREE.MeshBasicMaterial({ color: SUNC, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  lampHalo.position.y = 3.42;
  farol.add(lampHalo);
  anim(t => {                                     // o facho girando: pisca devagar
    const k = Math.pow(Math.max(0, Math.sin(t * 1.1)), 12);
    lampHalo.material.opacity = .08 + k * .5;
    lamp.material.color.setHex(k > .3 ? 0xffffff : GLOW);
  });
  blob(9, 1.6, 3, DARK2, 46, -.6, -58);           // ilha baixa à direita, quase sumindo
  blob(4, 1.4, 2, LEAF2, 47, .6, -58);

  const barco = grp(-30, 0, -46);
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
    const d = shoreZ(x) + 46;
    barco.position.set(x, SEA_Y + waveAt(x, d, t) * .55, -46);
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
    if (dist > .62 && dist < 3) {                // passo dado (salto grande = teleporte, ignora)
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
    elevFn: sandH,            // a areia sobe para as dunas
  };
}
