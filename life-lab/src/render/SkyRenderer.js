import * as THREE from 'three';
import { smoothstep, pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { CAMERA_FAR } from './CameraRig.js';

// Os dois únicos botões de iluminação. O ambiente sozinho já entrega a cor base da
// paleta nas faces viradas para cima; o sol só acrescenta o degradê das laterais.
// São os valores do dia claro: com o sol acima de ~25° o ciclo devolve exatamente
// isto, então a paleta medida continua valendo de dia.
const LIGHT_AMBIENT = 0.62;
const LIGHT_SUN = 1.4;
const MOON_LIGHT = .5;

// Rumo do norte no chão da ilha. Foi escolhido para que o sol do meio-dia caia onde
// a luz fixa antiga ficava, atrás e à esquerda da câmera: o visual já afinado vira
// o meio-dia, e a manhã e a tarde giram a partir dele. Leste é norte × cima.
const NORTH = new THREE.Vector3(-.6, 0, -.35).normalize();
const EAST = new THREE.Vector3().crossVectors(NORTH, new THREE.Vector3(0, 1, 0));
const LIGHT_DISTANCE = 1600;

// Quadros-chave pela altura do sol, em graus. Entre eles a cor é interpolada; abaixo
// do primeiro e acima do último, fica parada. Os valores de -18° são noite fechada
// (fim do crepúsculo astronômico), 0° é o disco tocando o horizonte.
const SKY_KEYS = [
  { at: -18, top: 0x070b18, horizon: 0x111a30,
    hemiSky: 0x5868a8, hemiGround: 0x1c2436, hemi: .5 },
  { at: -9, top: 0x141c3c, horizon: 0x33385e,
    hemiSky: 0x6670aa, hemiGround: 0x262a3c, hemi: .52 },
  { at: -3, top: 0x33427a, horizon: 0xc27a6c,
    hemiSky: 0x9a86b0, hemiGround: 0x3c3444, hemi: .54 },
  { at: 1, top: 0x6f8ec0, horizon: 0xf2a070,
    hemiSky: 0xf0b8a0, hemiGround: 0x847468, hemi: .56 },
  { at: 8, top: 0xa9d2d4, horizon: 0xf4d6a8,
    hemiSky: 0xfff0dc, hemiGround: 0xc4ceb0, hemi: .6 },
  { at: 25, top: 0xc9ecdb, horizon: PALETTE.sky,
    hemiSky: 0xffffff, hemiGround: 0xcfe4c6, hemi: LIGHT_AMBIENT }
];
// O sol avermelha perto do horizonte porque atravessa mais ar: o azul se espalha no
// caminho e sobra o vermelho. Acima de ~35° a luz já é a branca-quente do dia.
const SUN_KEYS = [
  { at: -1, color: 0xff4a28 },
  { at: 3, color: 0xff8248 },
  { at: 10, color: 0xffbe7a },
  { at: 22, color: 0xffecd0 },
  { at: 35, color: 0xfff6e0 }
];
// Chuva é céu fechado: nuvem espalha a luz e tira a cor de tudo.
const OVERCAST_SKY = 0x9aa4aa;
const OVERCAST_HEMI = 0xd4d8dc;
const STAR_COUNT = 320;
// Nuvens do céu em volta do tabuleiro: posição (fração da meia-tela, y para cima),
// largura (fração da meia-largura), velocidade de deriva e qual desenho.
const SKY_CLOUDS = [
  { x: -.85, y: -.78, width: .62, speed: .010, variant: 0 },
  { x: .55, y: -.9, width: .8, speed: .007, variant: 1 },
  { x: .05, y: -.62, width: .45, speed: .013, variant: 2 },
  { x: -.4, y: .72, width: .5, speed: .006, variant: 1 },
  { x: .8, y: .55, width: .42, speed: .009, variant: 0 },
  { x: -1.1, y: .2, width: .36, speed: .011, variant: 2 },
  { x: 1.05, y: -.3, width: .4, speed: .008, variant: 0 }
];
// Névoa de profundidade: a partir de um pouco antes do canto mais perto do tabuleiro,
// o que está mais fundo vai tomando a cor do horizonte. Em larguras do mundo.
const FOG_START = .6;
const FOG_SPAN = 5.4;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const SKY_DEPTH = -(CAMERA_FAR - 400);

function interpolateKeys(keys, altitude) {
  if (altitude <= keys[0].at) return [keys[0], keys[0], 0];
  for (let i = 1; i < keys.length; i++) {
    if (altitude <= keys[i].at) {
      const t = (altitude - keys[i - 1].at) / (keys[i].at - keys[i - 1].at);
      return [keys[i - 1], keys[i], t];
    }
  }
  const last = keys[keys.length - 1];
  return [last, last, 0];
}

// Direção (leste, norte, cima) do céu para o espaço da cena.
function toSceneDirection(local, target) {
  return target.set(0, local.up, 0)
    .addScaledVector(EAST, local.east)
    .addScaledVector(NORTH, local.north)
    .normalize();
}

// O céu e a luz do dia e da noite: degradê de fundo, luz ambiente, uma luz
// direcional que é o sol de dia e a lua de noite, estrelas, disco do sol e a lua
// com a fase certa.
export class SkyRenderer {
  #rig;
  #skyContext;
  #skyTexture;
  #hemisphere;
  #sun;
  #stars;
  #starMaterial;
  #sunDisc;
  #sunGlow;
  #moonDisc;
  #moonContext;
  #moonTexture;
  #paintedPhase = -1;
  #sunDirection = new THREE.Vector3();
  #moonDirection = new THREE.Vector3();
  #cameraRight = new THREE.Vector3();
  #mixA = new THREE.Color();
  #mixB = new THREE.Color();
  #skyTop = new THREE.Color();
  #skyHorizon = new THREE.Color();
  #overcastSky = new THREE.Color(OVERCAST_SKY);
  #overcastHemi = new THREE.Color(OVERCAST_HEMI);
  #skyLayer;
  #fog;
  #clouds = [];
  #cloudMaterials = [];
  #cloudTone = new THREE.Color();
  #maxShadowReach = 0;
  #shadowReach = 0;
  #lightForward = new THREE.Vector3();
  #lightRight = new THREE.Vector3();
  #lightUp = new THREE.Vector3();
  #snappedFocus = new THREE.Vector3();

  constructor(scene, renderer, cameraRig, world) {
    this.#rig = cameraRig;
    // Céu em degradê vertical, repintado a cada quadro num canvas mínimo: dois pixels
    // de largura bastam, o fundo é esticado para a tela inteira.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 128;
    this.#skyContext = skyCanvas.getContext('2d');
    this.#skyTexture = new THREE.CanvasTexture(skyCanvas);
    this.#skyTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = this.#skyTexture;
    // Perspectiva aérea: o canto de trás do tabuleiro fica um pouco mais claro e
    // puxado para a cor do céu, e isso dá profundidade que a câmera ortográfica sozinha
    // não dá. A cor acompanha o horizonte a cada quadro.
    const worldSize = Math.max(world.width, world.height);
    scene.fog = new THREE.Fog(PALETTE.sky,
      cameraRig.radius - worldSize * FOG_START,
      cameraRig.radius - worldSize * FOG_START + worldSize * FOG_SPAN);
    this.#fog = scene.fog;

    this.#hemisphere = new THREE.HemisphereLight(0xffffff, 0xcfe4c6, LIGHT_AMBIENT);
    scene.add(this.#hemisphere);
    // Uma luz direcional só, que de dia é o sol e de noite é a lua. A troca acontece
    // com o sol já abaixo do horizonte, quando as duas intensidades estão em zero,
    // então ninguém vê a sombra pular de lado. Duas luzes com sombra dobrariam o custo.
    const sun = new THREE.DirectionalLight(0xfff6e0, LIGHT_SUN);
    sun.position.set(-world.width * .6, world.width * 1.1, -world.height * .35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // Alcance máximo do mapa de sombra (o mundo inteiro); o alcance de verdade
    // acompanha o enquadramento a cada quadro, ver #fitShadow.
    this.#maxShadowReach = Math.max(world.width, world.height) * .8;
    this.#applyShadowReach(sun, this.#maxShadowReach);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = LIGHT_DISTANCE * 2.2;
    sun.shadow.bias = -.0012;
    // Com sol rasante a sombra é projetada quase de lado, e o viés de profundidade
    // sozinho não segura o serrilhado nas faces; o deslocamento pela normal segura.
    sun.shadow.normalBias = .3;
    scene.add(sun);
    scene.add(sun.target);
    this.#sun = sun;

    // Estrelas, sol e lua moram no espaço da câmera, lá no fundo do volume de visão:
    // ficam presos à tela quando a câmera passeia, e o chão, que está na frente,
    // esconde o que estiver atrás dele pelo teste de profundidade comum.
    scene.add(cameraRig.camera);
    const skyLayer = new THREE.Group();
    skyLayer.position.z = SKY_DEPTH;
    cameraRig.camera.add(skyLayer);
    this.#skyLayer = skyLayer;
    this.#buildStars(skyLayer, renderer);
    this.#buildSunDisc(skyLayer);
    this.#buildMoonDisc(skyLayer);
    this.#buildClouds(skyLayer);
  }

  // Recebe o céu calculado pela astronomia e acende a cena de acordo. `overcast` vai
  // de 0 (céu limpo) a 1 (chuva cheia) e abafa sol, lua e estrelas.
  // Cor do horizonte agora (a água reflete). Só leitura: é o objeto de trabalho.
  get horizonColor() {
    return this.#skyHorizon;
  }

  // `time`: relógio para a deriva das nuvens (parado com movimento reduzido).
  update(sky, { overcast = 0, time = 0 } = {}) {
    const altitude = sky.sun.altitude;
    toSceneDirection(sky.sun, this.#sunDirection);
    toSceneDirection(sky.moon, this.#moonDirection);
    const cloud = overcast * .7;
    this.#paintBackground(sky, altitude, cloud);
    this.#fog.color.copy(this.#skyHorizon);

    const [from, to, t] = interpolateKeys(SKY_KEYS, altitude);
    this.#blend(SKY_KEYS, altitude, 'hemiSky', this.#hemisphere.color);
    this.#blend(SKY_KEYS, altitude, 'hemiGround', this.#hemisphere.groundColor);
    this.#hemisphere.color.lerp(this.#overcastHemi, cloud * sky.daylight);
    this.#hemisphere.intensity = from.hemi + (to.hemi - from.hemi) * t;

    // Sol: some de vez um pouco abaixo do horizonte e chega inteiro aos 12°.
    const sunStrength = smoothstep(-1, 12, altitude) * (1 - overcast * .65);
    // Lua: só assume depois que o sol apagou, e brilha conforme a fase.
    const moonStrength = smoothstep(-2, 18, sky.moon.altitude) * sky.illumination *
      smoothstep(-3, -10, altitude) * (1 - overcast * .8);
    const useSun = altitude > -3;
    const direction = useSun ? this.#sunDirection : this.#moonDirection;
    this.#fitShadow(direction);
    if (useSun) {
      this.#blend(SUN_KEYS, altitude, 'color', this.#sun.color);
      this.#sun.intensity = LIGHT_SUN * sunStrength;
    } else {
      this.#sun.color.set(0xa8c0f0);
      this.#sun.intensity = MOON_LIGHT * moonStrength;
    }
    this.#updateCelestials(sky, altitude, overcast);
    this.#updateClouds(sky, overcast, time);
  }

  // O mapa de sombra tem resolução fixa; espalhado pelo mundo inteiro, com zoom cada
  // pixel dele vira um degrau serrilhado na borda da sombra. Então ele cobre só o
  // que a tela mostra (com folga para a sombra comprida do sol baixo de quem está
  // logo fora do quadro) e anda junto com a câmera: quanto mais zoom, mais nítida.
  #fitShadow(direction) {
    const reach = Math.min(this.#maxShadowReach,
      Math.max(90, this.#rig.visibleHalfSize() * 1.5 + 40));
    if (Math.abs(reach - this.#shadowReach) > .5) this.#applyShadowReach(this.#sun, reach);
    const focus = this.#snapToShadowTexels(this.#rig.focus, direction, reach);
    this.#sun.target.position.copy(focus);
    this.#sun.position.copy(direction).multiplyScalar(LIGHT_DISTANCE).add(focus);
  }

  // Se o mapa de sombra desliza pelo mundo em frações de pixel, a borda de cada
  // sombra é reamostrada a cada quadro e tremula enquanto a câmera passeia. Andando
  // em passos de um pixel do próprio mapa (medido nos eixos da luz), cada sombra cai
  // sempre nos mesmos pixels e fica parada.
  #snapToShadowTexels(focus, direction, reach) {
    const texel = reach * 2 / this.#sun.shadow.mapSize.x;
    const forward = this.#lightForward.copy(direction).negate();
    const right = this.#lightRight.crossVectors(forward, WORLD_UP);
    if (right.lengthSq() < 1e-6) return focus;
    right.normalize();
    const up = this.#lightUp.crossVectors(right, forward).normalize();
    const alongRight = focus.dot(right), alongUp = focus.dot(up);
    return this.#snappedFocus.copy(focus)
      .addScaledVector(right, Math.round(alongRight / texel) * texel - alongRight)
      .addScaledVector(up, Math.round(alongUp / texel) * texel - alongUp);
  }

  #applyShadowReach(sun, reach) {
    const camera = sun.shadow.camera;
    camera.left = -reach;
    camera.right = reach;
    camera.top = reach;
    camera.bottom = -reach;
    camera.updateProjectionMatrix();
    this.#shadowReach = reach;
  }

  #paintBackground(sky, altitude, cloud) {
    this.#blend(SKY_KEYS, altitude, 'top', this.#skyTop);
    this.#blend(SKY_KEYS, altitude, 'horizon', this.#skyHorizon);
    // Nuvem clareia a noite um tico (reflete o pouco que há) e acinzenta o dia.
    const overcastTone = this.#mixA.copy(this.#overcastSky).multiplyScalar(.2 + .8 * sky.daylight);
    this.#skyTop.lerp(overcastTone, cloud);
    this.#skyHorizon.lerp(overcastTone, cloud);
    const context = this.#skyContext;
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, `#${this.#skyTop.getHexString(THREE.SRGBColorSpace)}`);
    gradient.addColorStop(.75, `#${this.#skyHorizon.getHexString(THREE.SRGBColorSpace)}`);
    gradient.addColorStop(1, `#${this.#skyHorizon.getHexString(THREE.SRGBColorSpace)}`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 128);
    this.#skyTexture.needsUpdate = true;
  }

  #updateCelestials(sky, altitude, overcast) {
    // Câmera: o que fica preso à tela é dimensionado pelo enquadramento visível, que
    // muda com zoom e com o tamanho da janela.
    // O centro do que se vê pode não ser o foco (a HUD empurra o mundo para um lado):
    // o fundo acompanha esse centro.
    const camera = this.#rig.camera;
    const { centerX, centerY, halfWidth, halfHeight } = this.#rig.visibleFrame();
    this.#skyLayer.position.x = centerX;
    this.#skyLayer.position.y = centerY;
    this.#cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    this.#stars.scale.set(halfWidth, halfHeight, 1);
    this.#starMaterial.opacity = (1 - smoothstep(-15, -4, altitude)) * (1 - overcast);

    const sunDisc = this.#sunDisc, sunGlow = this.#sunGlow;
    this.#placeDisc(sunDisc, this.#sunDirection, 13, halfWidth, halfHeight);
    sunGlow.position.copy(sunDisc.position).setZ(-1);
    sunGlow.scale.copy(sunDisc.scale).multiplyScalar(2.6);
    this.#blend(SUN_KEYS, Math.max(altitude, 0), 'color', sunDisc.material.color);
    sunGlow.material.color.copy(sunDisc.material.color);
    const sunVisible = (1 - smoothstep(-.3, -2.5, altitude)) * (1 - overcast * .9);
    sunDisc.visible = sunGlow.visible = sunVisible > .01;
    sunDisc.material.opacity = sunVisible;
    sunGlow.material.opacity = .22 * sunVisible;

    this.#paintMoon(sky.phase);
    this.#placeDisc(this.#moonDisc, this.#moonDirection, 10, halfWidth, halfHeight);
    // De dia a lua ainda aparece, pálida, como acontece de verdade à tarde.
    const moonVisible = smoothstep(-2, 2, sky.moon.altitude) *
      (.35 + .65 * (1 - sky.daylight)) * (1 - overcast * .9);
    this.#moonDisc.visible = moonVisible > .01 && sky.illumination > .03;
    this.#moonDisc.material.opacity = moonVisible;
  }

  #blend(keys, altitude, field, target) {
    const [from, to, t] = interpolateKeys(keys, altitude);
    return target.copy(this.#mixA.set(from[field])).lerp(this.#mixB.set(to[field]), t);
  }

  // Sol e lua no fundo da tela: a posição horizontal vem do rumo em relação à câmera,
  // a vertical da altura no céu. No horizonte o disco fica atrás do chão e é ele que
  // o esconde, como um pôr do sol atrás do morro.
  #placeDisc(mesh, direction, radiusPixels, halfWidth, halfHeight) {
    const along = direction.dot(this.#cameraRight);
    mesh.position.x = along * halfWidth * .92;
    mesh.position.y = halfHeight * (-.18 + 1.02 * direction.y);
    const size = radiusPixels * 2 * halfHeight / Math.max(1, this.#rig.viewHeight);
    mesh.scale.set(size, size, 1);
  }

  #buildStars(skyLayer, renderer) {
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPositions[i * 3] = pseudoRandom(i * 3.1 + .4) * 2 - 1;
      // Mais estrelas no alto: perto do horizonte o ar grosso apaga as fracas.
      starPositions[i * 3 + 1] = 1 - Math.pow(pseudoRandom(i * 7.7 + 1.3), 1.6) * 2;
      const brightness = .35 + Math.pow(pseudoRandom(i * 5.3 + 2.9), 3) * .65;
      const warm = pseudoRandom(i * 9.1 + .7);
      starColors[i * 3] = brightness * (warm > .85 ? 1 : .88);
      starColors[i * 3 + 1] = brightness * .92;
      starColors[i * 3 + 2] = brightness * (warm < .2 ? 1 : .86);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.#starMaterial = new THREE.PointsMaterial({
      size: 1.7 * renderer.getPixelRatio(), sizeAttenuation: false, vertexColors: true,
      transparent: true, opacity: 0, depthWrite: false, fog: false
    });
    this.#stars = new THREE.Points(starGeometry, this.#starMaterial);
    this.#stars.frustumCulled = false;
    skyLayer.add(this.#stars);
  }

  #buildSunDisc(skyLayer) {
    const discGeometry = new THREE.CircleGeometry(1, 40);
    // O céu fica fora da névoa: ele é o fundo, não algo longe dentro dela.
    this.#sunDisc = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({
      color: 0xfff6e0, transparent: true, depthWrite: false, fog: false }));
    this.#sunGlow = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({
      color: 0xfff6e0, transparent: true, opacity: .22, depthWrite: false, fog: false }));
    this.#sunGlow.position.z = -1;
    skyLayer.add(this.#sunGlow, this.#sunDisc);
  }

  // A fase é desenhada num canvas pequeno e só repintada quando muda de verdade.
  #buildMoonDisc(skyLayer) {
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = moonCanvas.height = 64;
    this.#moonContext = moonCanvas.getContext('2d');
    this.#moonTexture = new THREE.CanvasTexture(moonCanvas);
    this.#moonTexture.colorSpace = THREE.SRGBColorSpace;
    this.#moonDisc = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
      map: this.#moonTexture, transparent: true, depthWrite: false, fog: false }));
    skyLayer.add(this.#moonDisc);
  }

  // Nuvens fofas em volta do tabuleiro, mais embaixo dele: é o que faz o vazio em
  // volta parecer céu e o tabuleiro parecer suspenso. Três desenhos em canvas,
  // repetidos com tamanhos diferentes; ficam no fundo, atrás do tabuleiro.
  #buildClouds(skyLayer) {
    const textures = [0, 1, 2].map(variant => {
      const texture = new THREE.CanvasTexture(SkyRenderer.#paintCloud(variant));
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });
    const shape = new THREE.PlaneGeometry(2, 1);
    for (const spec of SKY_CLOUDS) {
      const material = new THREE.MeshBasicMaterial({
        map: textures[spec.variant], transparent: true, depthWrite: false, fog: false
      });
      const mesh = new THREE.Mesh(shape, material);
      // Na frente das estrelas e do sol, ainda atrás de tudo do mundo.
      mesh.position.z = 20;
      skyLayer.add(mesh);
      this.#clouds.push({ mesh, spec });
      this.#cloudMaterials.push(material);
    }
  }

  static #paintCloud(variant) {
    const width = 256, height = 128;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    // Bolhas sobrepostas, maiores no meio, com a base achatada como nuvem de verdade.
    const count = 6 + variant * 2;
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      const x = width * (.14 + t * .72) + (pseudoRandom(variant * 31 + i) - .5) * 20;
      const radius = height * (.2 + Math.sin(t * Math.PI) * .2 + pseudoRandom(variant * 17 + i) * .08);
      const y = height * .68 - radius * .55;
      const puff = context.createRadialGradient(x, y, radius * .2, x, y, radius);
      puff.addColorStop(0, 'rgba(255, 255, 255, .95)');
      puff.addColorStop(.6, 'rgba(255, 255, 255, .7)');
      puff.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = puff;
      context.fillRect(0, 0, width, height);
    }
    // Barriga sombreada: a parte de baixo da nuvem pega menos luz.
    context.globalCompositeOperation = 'source-atop';
    const belly = context.createLinearGradient(0, height * .3, 0, height * .8);
    belly.addColorStop(0, 'rgba(120, 135, 160, 0)');
    belly.addColorStop(1, 'rgba(120, 135, 160, .35)');
    context.fillStyle = belly;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
    return canvas;
  }

  // Deriva lenta para o lado, dando a volta pela borda da tela; cor e opacidade
  // seguem a hora (brancas de dia, rosadas no crepúsculo, azul-escuras de noite) e o
  // tempo fechado as deixa mais densas e cinzentas.
  #updateClouds(sky, overcast, time) {
    const { halfWidth, halfHeight } = this.#rig.visibleFrame();
    const tone = this.#cloudTone.set(0xffffff).lerp(this.#skyHorizon, .3)
      .multiplyScalar(.28 + .72 * sky.daylight);
    const opacity = (.5 + .35 * overcast) * (.45 + .55 * sky.daylight);
    for (const material of this.#cloudMaterials) {
      material.color.copy(tone);
      material.opacity = opacity;
    }
    for (const { mesh, spec } of this.#clouds) {
      // Faixa de -1,6 a 1,6 meias-larguras: a nuvem sai inteira antes de voltar.
      const span = 3.2;
      const x = ((spec.x + 1.6 + time * spec.speed) % span + span) % span - 1.6;
      mesh.position.x = x * halfWidth;
      mesh.position.y = spec.y * halfHeight;
      const width = spec.width * halfWidth;
      mesh.scale.set(width, width, 1);
    }
  }

  #paintMoon(phase) {
    if (Math.abs(phase - this.#paintedPhase) < .004) return;
    this.#paintedPhase = phase;
    const context = this.#moonContext;
    const c = 32, r = 29;
    context.clearRect(0, 0, 64, 64);
    // Luz cinérea: a parte escura ainda aparece de leve, iluminada pela Terra.
    context.fillStyle = 'rgba(150, 165, 200, .16)';
    context.beginPath();
    context.arc(c, c, r, 0, Math.PI * 2);
    context.fill();
    // No hemisfério sul a crescente é iluminada à esquerda e a minguante à direita.
    const waxing = phase < .5;
    const litRight = !waxing;
    const cosine = Math.cos(phase * Math.PI * 2);
    const crescent = cosine > 0;
    context.fillStyle = '#eef0f4';
    context.beginPath();
    context.arc(c, c, r, -Math.PI / 2, Math.PI / 2, !litRight);
    // O terminador é meia elipse; na crescente ela invade o lado aceso, na gibosa
    // avança sobre o escuro.
    context.ellipse(c, c, r * Math.abs(cosine), r, 0, Math.PI / 2, -Math.PI / 2,
      litRight === crescent);
    context.fill();
    // Mares: manchas mais escuras, sempre no mesmo lugar do disco.
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = 'rgba(120, 128, 150, .28)';
    for (const [x, y, s] of [[-8, -9, 8], [6, -4, 6], [-2, 9, 7], [10, 10, 4]]) {
      context.beginPath();
      context.arc(c + x, c + y, s, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = 'source-over';
    this.#moonTexture.needsUpdate = true;
  }
}
