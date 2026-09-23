import * as THREE from 'three';

// Paleta medida pixel a pixel da referência (mini.png), não escolhida a olho.
// Os nomes dizem o papel; os valores são os que dominam a imagem.
export const PALETTE = {
  sky: 0xd6f3de,
  grassDark: 0x8ab25c,
  grassShade: 0x7d9150,
  tile: 0xc8c6aa,
  // Três tons por bioma, todos tirados do histograma da referência. É a variação
  // interna que tira o aspecto de faixa chapada; o do meio é o tom base.
  desertGround: [0xd0c090, 0xd8c898, 0xc0b080],
  taigaGround: [0x98b060, 0xa0b860, 0x708848],
  savannaGround: [0xb8c870, 0xc0c870, 0xa8c060],
  clearing: 0xd0c088,
  needle: 0x486030,
  dryGrass: 0xc0c870,
  rock: 0x8f9384,
  cactus: 0x608040,
  soil: [0x7a6948, 0x696143, 0x5b5236, 0x4a4634],
  trunk: 0x6f5a3c,
  leafDark: 0x6d8a45,
  leafMid: 0x83995d,
  leafLight: 0xadc365,
  water: 0x7fb2c4,
  waterDeep: 0x5d93a8,
  waterShine: 0xbfe6ef,
  pondBed: 0x9d8a5c,
  hair: 0x4a3a2a
};

// Os dois únicos botões de iluminação. O ambiente sozinho já entrega a cor base da
// paleta nas faces viradas para cima; o sol só acrescenta o degradê das laterais.
// Sem tone mapping, para que o hex medido na imagem chegue intacto na tela.
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

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Direção (leste, norte, cima) do céu para o espaço da cena.
function toSceneDirection(local, target) {
  return target.set(0, local.up, 0)
    .addScaledVector(EAST, local.east)
    .addScaledVector(NORTH, local.north)
    .normalize();
}

// Isometria verdadeira: o losango da referência tem altura/largura ≈ 0,583, e
// arcsen(0,583) ≈ 35,26°, que é exatamente o ângulo do eixo (1,1,1).
const CAMERA_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
export const CHARACTER_HEIGHT = 16;
const HIP_HEIGHT = 5.4;
const SHOULDER_HEIGHT = 11.2;
// O mundo deixou de ser uma ilha flutuante: o terreno continua além da área dos
// bichos, até longe o bastante para nenhum zoom mostrar o fim dele.
export const SURROUNDING_SCALE = 5;
// Quanto do losango do mundo o enquadramento inicial ocupa. 1 seria a tela inteira
// dentro da área dos bichos (e metade do mundo fora de vista); menos que isso deixa
// aparecer um pouco da mata em volta, nos cantos, e mostra mais do mundo de uma vez.
const DEFAULT_FILL = .8;

// Ruído determinístico: as árvores precisam cair sempre no mesmo lugar,
// senão a ilha se reembaralha a cada redimensionamento da janela.
export function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

// Bichos nascem e morrem sem parar, e arbusto some a cada mordida. Geometria e
// material que não mudam ficam aqui, criados uma vez e compartilhados por todos;
// só a cor do tronco é por indivíduo, e essa é descartada quando o bicho sai.
const SHAPES = {
  // Perna e braço têm a geometria deslocada para que o ponto (0,0,0) caia no quadril
  // e no ombro. Sem isso o giro acontece no meio do bloco e o membro fica tesourando
  // em volta do próprio centro em vez de balançar pendurado na articulação.
  leg: new THREE.BoxGeometry(2.4, 5.4, 2.4).translate(0, -2.7, 0),
  torso: new THREE.BoxGeometry(5.6, 6, 3.2),
  arm: new THREE.BoxGeometry(1.8, 5.6, 2.2).translate(0, -2.8, 0),
  head: new THREE.BoxGeometry(5, 5, 5),
  hair: new THREE.BoxGeometry(5.4, 1.4, 5.4),
  braid: new THREE.BoxGeometry(4.2, 4.4, 1.2),
  bushLower: new THREE.BoxGeometry(9, 5, 9),
  bushUpper: new THREE.BoxGeometry(5.5, 4, 5.5)
};
const SHARED_SHAPES = new Set(Object.values(SHAPES));
const HAIR_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.hair });

// Madeira: casca por fora e miolo claro no corte. Cilindro do three.js tem três grupos
// de face (lado, topo, base), então o mesmo par de materiais serve para tora, toco e
// parede de cabana.
const BARK_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.trunk });
const CUT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xd2b27e });
const WOOD_MATERIALS = [BARK_MATERIAL, CUT_MATERIAL, CUT_MATERIAL];
const LOG_RADIUS = 1.5;
const CARRIED_LOG_SHAPE = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 11, 8).rotateX(Math.PI / 2);
// Machado: cabo de madeira saindo da mão e cabeça de ferro de lado, com o fio
// virado para o sentido do golpe. Geometria deslocada para a origem cair na mão.
const AXE_HANDLE_SHAPE = new THREE.BoxGeometry(.7, 9.5, .7).translate(0, -3.4, 0);
const AXE_HEAD_SHAPE = new THREE.BoxGeometry(3.4, 2.2, .6).translate(-1.3, -7.6, 0);
const AXE_HANDLE_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xa0784a });
const AXE_HEAD_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x9aa2a8 });
const HAND_OFFSET = -5.4;

function easeInOut(t) {
  return t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// Um golpe de machado lateral, em quatro tempos: levar o machado para trás girando o
// tronco devagar (preparo), descer rápido e acelerando até o impacto, o tranco do
// impacto, e voltar ao meio. O impacto cai a 68% do ciclo, igual à simulação.
function chopTwist(phase) {
  if (phase < .55) return .95 * easeInOut(phase / .55);
  if (phase < .68) {
    const q = (phase - .55) / .13;
    return .95 - 1.35 * q * q;
  }
  if (phase < .78) return -.4 + Math.sin((phase - .68) / .1 * Math.PI) * .06;
  return -.4 * (1 - easeInOut((phase - .78) / .22));
}

// Tecido tingido: mais escuro e mais fechado que qualquer cor de corpo, para a roupa
// ler como roupa e para dois grupos vizinhos nunca se confundirem.
export const OUTFIT_COLORS = [
  '#8c3b2e', '#2f5b86', '#3a7a5c', '#6d4a86',
  '#a8762a', '#455168', '#94395e', '#2f7480'
];
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
const leafMaterials = new Map();

function leafMaterial(color) {
  if (!leafMaterials.has(color)) {
    leafMaterials.set(color, new THREE.MeshLambertMaterial({ color }));
  }
  return leafMaterials.get(color);
}

function createTree(seed) {
  const tree = new THREE.Group();
  const trunkHeight = 10 + pseudoRandom(seed) * 6;
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, trunkHeight, 4.5),
    leafMaterial(PALETTE.trunk)
  );
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafColors = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.leafLight];
  const tone = leafColors[Math.floor(pseudoRandom(seed + 5) * leafColors.length) % leafColors.length];
  const wide = 17 + pseudoRandom(seed + 9) * 6;
  const crownLower = new THREE.Mesh(
    new THREE.BoxGeometry(wide, 11, wide),
    leafMaterial(tone)
  );
  crownLower.position.y = trunkHeight + 5;
  crownLower.castShadow = true;
  tree.add(crownLower);

  const crownUpper = new THREE.Mesh(
    new THREE.BoxGeometry(wide * .66, 8, wide * .66),
    leafMaterial(tone)
  );
  crownUpper.position.y = trunkHeight + 14;
  crownUpper.castShadow = true;
  tree.add(crownUpper);
  return tree;
}

// Um pinheiro de voxel: blocos que afinam para cima. É a silhueta que faz a taiga
// ser reconhecida de longe, sem precisar de rótulo escrito no chão.
function createConifer(seed) {
  const tree = new THREE.Group();
  const trunkHeight = 7 + pseudoRandom(seed) * 4;
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, trunkHeight, 3.6), leafMaterial(PALETTE.trunk));
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);
  const tone = pseudoRandom(seed + 4) > .45 ? PALETTE.leafDark : PALETTE.needle;
  const tiers = 3 + Math.floor(pseudoRandom(seed + 6) * 2);
  const base = 15 + pseudoRandom(seed + 8) * 4;
  for (let tier = 0; tier < tiers; tier++) {
    const shrink = 1 - tier / tiers * .62;
    const wide = base * shrink;
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(wide, 7, wide), leafMaterial(tone));
    skirt.position.y = trunkHeight + 3 + tier * 5.2;
    skirt.castShadow = true;
    tree.add(skirt);
  }
  return tree;
}

// Coluna com dois braços: no deserto é o que sobra de pé.
function createCactus(seed) {
  const plant = new THREE.Group();
  const material = leafMaterial(PALETTE.cactus);
  const tall = 14 + pseudoRandom(seed) * 8;
  const stem = new THREE.Mesh(new THREE.BoxGeometry(4, tall, 4), material);
  stem.position.y = tall / 2;
  stem.castShadow = true;
  plant.add(stem);
  for (const side of [-1, 1]) {
    if (pseudoRandom(seed + side * 3) < .35) continue;
    const height = tall * (.3 + pseudoRandom(seed + side) * .2);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, height, 2.8), material);
    arm.position.set(side * 3.4, tall * .55, 0);
    arm.castShadow = true;
    plant.add(arm);
    const elbow = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 2.8), material);
    elbow.position.set(side * 2.2, tall * .55 - height / 2, 0);
    elbow.castShadow = true;
    plant.add(elbow);
  }
  return plant;
}

function createRock(seed) {
  const rock = new THREE.Group();
  const material = leafMaterial(PALETTE.rock);
  const wide = 5 + pseudoRandom(seed) * 5;
  const lower = new THREE.Mesh(new THREE.BoxGeometry(wide, 4, wide * .85), material);
  lower.position.y = 2;
  lower.castShadow = true;
  rock.add(lower);
  if (pseudoRandom(seed + 2) > .4) {
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(wide * .6, 3, wide * .55), material);
    upper.position.set(wide * .12, 5.2, -wide * .1);
    upper.castShadow = true;
    rock.add(upper);
  }
  return rock;
}

// O bicho nasce pelado, e pelado ele é da cor do próprio gene de pigmento — era assim
// na versão 2D, e é o que mantém o gene de cor visível na arena, que é o que a seção
// de cor do modal de evolução acompanha. Roupa cobre tronco e pernas; cabeça e braços
// continuam mostrando o corpo, então vestir um grupo não apaga a genética de ninguém.
function createCharacter(hasHair) {
  const group = new THREE.Group();
  // Grupo interno para o corpo: o de fora carrega posição no mundo, rumo e tamanho,
  // e o de dentro fica livre para o gingado, sem um sobrescrever o outro.
  const body = new THREE.Group();
  group.add(body);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const outfitMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const build = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    body.add(mesh);
    return mesh;
  };
  const legLeft = build(SHAPES.leg, bodyMaterial, -1.4, HIP_HEIGHT, 0);
  const legRight = build(SHAPES.leg, bodyMaterial, 1.4, HIP_HEIGHT, 0);
  const torso = build(SHAPES.torso, bodyMaterial, 0, 8.4, 0);
  const armLeft = build(SHAPES.arm, bodyMaterial, -3.7, SHOULDER_HEIGHT, 0);
  const armRight = build(SHAPES.arm, bodyMaterial, 3.7, SHOULDER_HEIGHT, 0);
  build(SHAPES.head, bodyMaterial, 0, 14, 0);
  if (hasHair) {
    build(SHAPES.hair, HAIR_MATERIAL, 0, 16.4, 0);
    build(SHAPES.braid, HAIR_MATERIAL, 0, 13.4, -2.9);
  }
  // Machado na mão direita, só à vista enquanto corta.
  const axe = new THREE.Group();
  axe.position.y = HAND_OFFSET;
  for (const [shape, material] of [[AXE_HANDLE_SHAPE, AXE_HANDLE_MATERIAL], [AXE_HEAD_SHAPE, AXE_HEAD_MATERIAL]]) {
    const part = new THREE.Mesh(shape, material);
    part.castShadow = true;
    axe.add(part);
  }
  axe.visible = false;
  armRight.add(axe);
  // Tora no ombro direito, deitada para a frente, como se carrega de verdade.
  const shoulderLog = build(CARRIED_LOG_SHAPE, WOOD_MATERIALS, 3.3, 12.6, 0);
  shoulderLog.visible = false;
  group.userData = {
    bodyMaterial, outfitMaterial, body, torso, legLeft, legRight, armLeft, armRight, axe, shoulderLog
  };
  return group;
}

// Troca de pano: só mexe no material quando o estado muda de fato, porque isso roda
// para cada bicho a cada quadro.
function dressCharacter(view, bodyColor, outfit) {
  const { bodyMaterial, outfitMaterial, torso, legLeft, legRight } = view.userData;
  bodyMaterial.color.set(bodyColor);
  const wanted = outfit ? outfitMaterial : bodyMaterial;
  if (outfit) outfitMaterial.color.set(outfit);
  if (torso.material === wanted) return;
  torso.material = wanted;
  legLeft.material = wanted;
  legRight.material = wanted;
}

// Um passo: pernas em oposição, braços na fase contrária às pernas do mesmo lado
// (é como a gente anda de verdade), amplitude crescendo com a velocidade e o corpo
// subindo duas vezes por ciclo, porque o quadril sobe a cada apoio.
// Altura para erguer o corpo deitado: metade da cabeça, a parte mais grossa, para
// nada afundar no chão quando ele tomba de costas em volta dos pés.
const LYING_LIFT = 2.6;

function poseCharacter(view, motion) {
  const { body, legLeft, legRight, armLeft, armRight, torso } = view.userData;
  const { gait, pace, lean, bellyScale, animate, rest = 0, breath = 0 } = motion;
  const awake = 1 - rest;
  // Amplitude: com esta perna (5,4) e este passo, o pé só ficaria plantado de verdade
  // perto de 59°, o que vira passada de lunge. 41° deixa ~30% de deslize e
  // uma passada que parece passada. O bicho anda 2,1 alturas de corpo por segundo,
  // então a cadência rápida não é erro: para o tamanho dele isso é trote.
  const swing = animate ? Math.sin(gait) * .72 * pace * awake : 0;
  legLeft.rotation.x = swing;
  legRight.rotation.x = -swing;
  // Dormindo, os braços escorregam um pouco para o lado do corpo.
  armLeft.rotation.x = -swing * .78;
  armRight.rotation.x = swing * .78;
  armLeft.rotation.z = -.35 * rest;
  armRight.rotation.z = .35 * rest;
  const bob = animate ? (1 - Math.cos(gait * 2)) * .45 * pace : 0;
  body.position.y = bob * awake + LYING_LIFT * rest;
  body.rotation.z = animate ? Math.sin(gait) * .05 * pace * awake : 0;
  // Deitar é tombar de costas em volta dos pés: -90° em x põe o rosto para cima.
  body.rotation.x = lean * awake - Math.PI / 2 * rest;
  // Respiração do sono: o peito sobe e desce, que deitado é a escala em z.
  const chest = 1 + breath * .06 * rest;
  torso.scale.set(bellyScale, 1, bellyScale * chest);
  body.rotation.y = 0;

  const { chop = null, carrying = false } = motion;
  const { axe, shoulderLog } = view.userData;
  axe.visible = chop !== null;
  shoulderLog.visible = carrying && chop === null;
  if (chop !== null) {
    // Pernas firmes e afastadas, as duas mãos no cabo (braços para a frente e
    // fechados para o meio), e quem gira é o tronco inteiro. No preparo o machado
    // sobe um pouco; no impacto o corpo se joga levemente para a frente.
    const twist = chopTwist(chop);
    const raise = Math.max(0, twist) / .95;
    const impact = Math.max(0, 1 - Math.abs(chop - .68) / .08);
    legLeft.rotation.x = .12;
    legRight.rotation.x = -.12;
    body.position.y = 0;
    body.rotation.z = 0;
    body.rotation.y = twist;
    body.rotation.x = .08 + impact * .1;
    for (const [arm, side] of [[armLeft, -1], [armRight, 1]]) {
      arm.rotation.x = -1.2 - raise * .35;
      arm.rotation.z = -side * .38;
    }
  } else if (carrying) {
    // Mão direita no alto segurando a tora sobre o ombro; a esquerda balança.
    armRight.rotation.x = -2.75;
    armRight.rotation.z = -.15;
  }
}

function createBush(color) {
  const group = new THREE.Group();
  const material = leafMaterial(color);
  const lower = new THREE.Mesh(SHAPES.bushLower, material);
  lower.position.y = 2.5;
  lower.castShadow = true;
  group.add(lower);
  const upper = new THREE.Mesh(SHAPES.bushUpper, material);
  upper.position.y = 6.5;
  upper.castShadow = true;
  group.add(upper);
  return group;
}

export function createWorldView({ canvas, world }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Sem tone mapping de propósito: qualquer curva filmica desviaria as cores medidas.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  // Céu em degradê vertical, repintado a cada quadro num canvas mínimo: dois pixels
  // de largura bastam, o fundo é esticado para a tela inteira.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 128;
  const skyContext = skyCanvas.getContext('2d');
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTexture;

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 6000);
  const focus = new THREE.Vector3(0, 0, 0);
  const radius = Math.max(world.width, world.height) * 2.4;
  let panX = 0, panZ = 0;

  // O centro da tela pode ir a qualquer ponto da área dos bichos, e não além: o
  // terreno em volta existe para a tela nunca mostrar vazio, não para passear nele.
  function clampPan() {
    const limitX = world.width / 2, limitZ = world.height / 2;
    panX = Math.max(-limitX, Math.min(limitX, panX));
    panZ = Math.max(-limitZ, Math.min(limitZ, panZ));
  }

  function applyPan() {
    focus.set(panX, 0, panZ);
    camera.position.copy(CAMERA_DIRECTION).multiplyScalar(radius).add(focus);
    camera.lookAt(focus);
    // lookAt mexe na orientação mas não na matriz de mundo, que só seria refeita no
    // próximo render. Sem isso, projetar e acertar o clique usariam a câmera de antes.
    camera.updateMatrixWorld();
  }
  applyPan();

  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xcfe4c6, LIGHT_AMBIENT);
  scene.add(hemisphere);
  // Uma luz direcional só, que de dia é o sol e de noite é a lua. A troca acontece
  // com o sol já abaixo do horizonte, quando as duas intensidades estão em zero,
  // então ninguém vê a sombra pular de lado. Duas luzes com sombra dobrariam o custo.
  const sun = new THREE.DirectionalLight(0xfff6e0, LIGHT_SUN);
  sun.position.set(-world.width * .6, world.width * 1.1, -world.height * .35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = Math.max(world.width, world.height) * .8;
  sun.shadow.camera.left = -reach;
  sun.shadow.camera.right = reach;
  sun.shadow.camera.top = reach;
  sun.shadow.camera.bottom = -reach;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = LIGHT_DISTANCE * 2.2;
  sun.shadow.bias = -.0012;
  // Com sol rasante a sombra é projetada quase de lado, e o viés de profundidade
  // sozinho não segura o serrilhado nas faces; o deslocamento pela normal segura.
  sun.shadow.normalBias = .3;
  scene.add(sun);
  scene.add(sun.target);

  // Estrelas, sol e lua moram no espaço da câmera, lá no fundo do volume de visão:
  // ficam presos à tela quando a câmera passeia, e a ilha, que está na frente,
  // esconde o que estiver atrás dela pelo teste de profundidade comum.
  scene.add(camera);
  const SKY_DEPTH = -5800;
  const skyLayer = new THREE.Group();
  skyLayer.position.z = SKY_DEPTH;
  camera.add(skyLayer);

  const STAR_COUNT = 320;
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
  const starMaterial = new THREE.PointsMaterial({
    size: 1.7 * renderer.getPixelRatio(), sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0, depthWrite: false
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  skyLayer.add(stars);

  const discGeometry = new THREE.CircleGeometry(1, 40);
  const sunDisc = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({
    color: 0xfff6e0, transparent: true, depthWrite: false }));
  const sunGlow = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({
    color: 0xfff6e0, transparent: true, opacity: .22, depthWrite: false }));
  sunGlow.position.z = -1;
  skyLayer.add(sunGlow, sunDisc);

  // A fase é desenhada num canvas pequeno e só repintada quando muda de verdade.
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = moonCanvas.height = 64;
  const moonContext = moonCanvas.getContext('2d');
  const moonTexture = new THREE.CanvasTexture(moonCanvas);
  moonTexture.colorSpace = THREE.SRGBColorSpace;
  const moonDisc = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
    map: moonTexture, transparent: true, depthWrite: false }));
  skyLayer.add(moonDisc);
  let paintedPhase = -1;

  function paintMoon(phase) {
    if (Math.abs(phase - paintedPhase) < .004) return;
    paintedPhase = phase;
    const c = 32, r = 29;
    moonContext.clearRect(0, 0, 64, 64);
    // Luz cinérea: a parte escura ainda aparece de leve, iluminada pela Terra.
    moonContext.fillStyle = 'rgba(150, 165, 200, .16)';
    moonContext.beginPath();
    moonContext.arc(c, c, r, 0, Math.PI * 2);
    moonContext.fill();
    // No hemisfério sul a crescente é iluminada à esquerda e a minguante à direita.
    const waxing = phase < .5;
    const litRight = !waxing;
    const cosine = Math.cos(phase * Math.PI * 2);
    const crescent = cosine > 0;
    moonContext.fillStyle = '#eef0f4';
    moonContext.beginPath();
    moonContext.arc(c, c, r, -Math.PI / 2, Math.PI / 2, !litRight);
    // O terminador é meia elipse; na crescente ela invade o lado aceso, na gibosa
    // avança sobre o escuro.
    moonContext.ellipse(c, c, r * Math.abs(cosine), r, 0, Math.PI / 2, -Math.PI / 2,
      litRight === crescent);
    moonContext.fill();
    // Mares: manchas mais escuras, sempre no mesmo lugar do disco.
    moonContext.globalCompositeOperation = 'source-atop';
    moonContext.fillStyle = 'rgba(120, 128, 150, .28)';
    for (const [x, y, s] of [[-8, -9, 8], [6, -4, 6], [-2, 9, 7], [10, 10, 4]]) {
      moonContext.beginPath();
      moonContext.arc(c + x, c + y, s, 0, Math.PI * 2);
      moonContext.fill();
    }
    moonContext.globalCompositeOperation = 'source-over';
    moonTexture.needsUpdate = true;
  }

  const sunDirection = new THREE.Vector3();
  const moonDirection = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  const mixA = new THREE.Color(), mixB = new THREE.Color();
  const skyTop = new THREE.Color(), skyHorizon = new THREE.Color();
  const overcastSky = new THREE.Color(OVERCAST_SKY);
  const overcastHemi = new THREE.Color(OVERCAST_HEMI);

  function blend(keys, altitude, field, target) {
    const [from, to, t] = interpolateKeys(keys, altitude);
    return target.copy(mixA.set(from[field])).lerp(mixB.set(to[field]), t);
  }

  // Sol e lua no fundo da tela: a posição horizontal vem do rumo em relação à câmera,
  // a vertical da altura no céu. No horizonte o disco fica atrás da ilha e é ela que
  // o esconde, como um pôr do sol atrás do morro.
  function placeDisc(mesh, direction, radiusPixels, halfWidth, halfHeight) {
    const along = direction.dot(cameraRight);
    mesh.position.x = along * halfWidth * .92;
    mesh.position.y = halfHeight * (-.18 + 1.02 * direction.y);
    const size = radiusPixels * 2 * halfHeight / Math.max(1, viewHeight);
    mesh.scale.set(size, size, 1);
  }

  // Recebe o céu calculado em sky.js e acende a ilha de acordo. `overcast` vai de 0
  // (céu limpo) a 1 (chuva cheia) e abafa sol, lua e estrelas.
  function setSky(sky, { overcast = 0 } = {}) {
    const altitude = sky.sun.altitude;
    toSceneDirection(sky.sun, sunDirection);
    toSceneDirection(sky.moon, moonDirection);

    blend(SKY_KEYS, altitude, 'top', skyTop);
    blend(SKY_KEYS, altitude, 'horizon', skyHorizon);
    // Nuvem clareia a noite um tico (reflete o pouco que há) e acinzenta o dia.
    const cloud = overcast * .7;
    const overcastTone = mixA.copy(overcastSky).multiplyScalar(.2 + .8 * sky.daylight);
    skyTop.lerp(overcastTone, cloud);
    skyHorizon.lerp(overcastTone, cloud);
    const gradient = skyContext.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, `#${skyTop.getHexString(THREE.SRGBColorSpace)}`);
    gradient.addColorStop(.75, `#${skyHorizon.getHexString(THREE.SRGBColorSpace)}`);
    gradient.addColorStop(1, `#${skyHorizon.getHexString(THREE.SRGBColorSpace)}`);
    skyContext.fillStyle = gradient;
    skyContext.fillRect(0, 0, 2, 128);
    skyTexture.needsUpdate = true;

    const [from, to, t] = interpolateKeys(SKY_KEYS, altitude);
    blend(SKY_KEYS, altitude, 'hemiSky', hemisphere.color);
    blend(SKY_KEYS, altitude, 'hemiGround', hemisphere.groundColor);
    hemisphere.color.lerp(overcastHemi, cloud * sky.daylight);
    hemisphere.intensity = from.hemi + (to.hemi - from.hemi) * t;

    // Sol: some de vez um pouco abaixo do horizonte e chega inteiro aos 12°.
    const sunStrength = smoothstep(-1, 12, altitude) * (1 - overcast * .65);
    // Lua: só assume depois que o sol apagou, e brilha conforme a fase.
    const moonStrength = smoothstep(-2, 18, sky.moon.altitude) * sky.illumination *
      smoothstep(-3, -10, altitude) * (1 - overcast * .8);
    const useSun = altitude > -3;
    const direction = useSun ? sunDirection : moonDirection;
    sun.position.copy(direction).multiplyScalar(LIGHT_DISTANCE);
    if (useSun) {
      blend(SUN_KEYS, altitude, 'color', sun.color);
      sun.intensity = LIGHT_SUN * sunStrength;
    } else {
      sun.color.set(0xa8c0f0);
      sun.intensity = MOON_LIGHT * moonStrength;
    }

    // Câmera: o que fica preso à tela é dimensionado pelo enquadramento visível, que
    // muda com zoom e com o tamanho da janela.
    const halfWidth = camera.right / camera.zoom, halfHeight = camera.top / camera.zoom;
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
    stars.scale.set(halfWidth, halfHeight, 1);
    starMaterial.opacity = (1 - smoothstep(-15, -4, altitude)) * (1 - overcast);

    placeDisc(sunDisc, sunDirection, 13, halfWidth, halfHeight);
    sunGlow.position.copy(sunDisc.position).setZ(-1);
    sunGlow.scale.copy(sunDisc.scale).multiplyScalar(2.6);
    blend(SUN_KEYS, Math.max(altitude, 0), 'color', sunDisc.material.color);
    sunGlow.material.color.copy(sunDisc.material.color);
    const sunVisible = (1 - smoothstep(-.3, -2.5, altitude)) * (1 - overcast * .9);
    sunDisc.visible = sunGlow.visible = sunVisible > .01;
    sunDisc.material.opacity = sunVisible;
    sunGlow.material.opacity = .22 * sunVisible;

    paintMoon(sky.phase);
    placeDisc(moonDisc, moonDirection, 10, halfWidth, halfHeight);
    // De dia a lua ainda aparece, pálida, como acontece de verdade à tarde.
    const moonVisible = smoothstep(-2, 2, sky.moon.altitude) *
      (.35 + .65 * (1 - sky.daylight)) * (1 - overcast * .9);
    moonDisc.visible = moonVisible > .01 && sky.illumination > .03;
    moonDisc.material.opacity = moonVisible;
  }

  const sceneryLayer = new THREE.Group();
  scene.add(sceneryLayer);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(world.width, world.height),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  ground.rotation.x = -Math.PI / 2;
  // Acima do terreno de fora: no mesmo y as duas superfícies brigam e piscam.
  ground.position.y = .05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Terreno além da área dos bichos, com os mesmos biomas em resolução menor. Fica
  // um nada abaixo do chão do mundo, que cobre o miolo dele por cima.
  const surroundings = new THREE.Mesh(
    new THREE.PlaneGeometry(world.width * SURROUNDING_SCALE, world.height * SURROUNDING_SCALE),
    new THREE.MeshLambertMaterial({ color: PALETTE.grassDark })
  );
  surroundings.rotation.x = -Math.PI / 2;
  surroundings.position.y = -.05;
  surroundings.receiveShadow = true;
  scene.add(surroundings);

  const organismLayer = new THREE.Group();
  const foodLayer = new THREE.Group();
  const pondLayer = new THREE.Group();
  const visionLayer = new THREE.Group();
  // Cones de visão nascem desligados: são ferramenta de inspeção, e com algumas dezenas
  // de bichos a tela vira uma sopa de leques translúcidos. Esconder o grupo inteiro já
  // tira tudo do desenho, sem precisar mexer em cone por cone a cada quadro.
  visionLayer.visible = false;
  scene.add(organismLayer, foodLayer, pondLayer, visionLayer);

  const corpseLayer = new THREE.Group();
  scene.add(corpseLayer);
  const organismViews = new Map();
  const foodViews = new Map();
  const pondViews = new Map();
  const corpseViews = new Map();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const projected = new THREE.Vector3();

  let viewWidth = 1, viewHeight = 1;
  let baseZoom = 1, zoomLevel = 1;

  // Quanto o mundo ocupa na tela, em unidades, já projetado: um quadrado girado 45°
  // vira um losango de (W + H)/√2 de largura, e a altura é essa largura vezes o seno
  // da elevação isométrica.
  const SIN_ISO = 1 / Math.sqrt(3);
  const diamondHalfWidth = (world.width + world.height) / Math.SQRT2 / 2;
  const diamondHalfHeight = diamondHalfWidth * SIN_ISO;

  function applyCamera() {
    const aspect = viewWidth / Math.max(1, viewHeight);
    const halfHeight = diamondHalfHeight;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    // Um retângulo de meia-largura w e meia-altura h cabe inteiro dentro do losango
    // quando w/W + h/H ≤ 1. Com zoom z a tela mostra w = halfWidth/z e h = halfHeight/z,
    // então o zoom que encaixa a tela no losango, sem sobra, é a soma das duas razões.
    // O enquadramento inicial fica um pouco abaixo disso (DEFAULT_FILL).
    const inscribed = halfWidth / diamondHalfWidth + halfHeight / diamondHalfHeight;
    baseZoom = inscribed * DEFAULT_FILL;
    camera.zoom = baseZoom * zoomLevel;
    camera.updateProjectionMatrix();
    clampPan();
    applyPan();
  }

  function resize(width, height) {
    viewWidth = Math.max(1, width);
    viewHeight = Math.max(1, height);
    renderer.setSize(viewWidth, viewHeight, false);
    applyCamera();
  }

  function setGroundTexture(source) {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // A vista é bem oblíqua: sem anisotropia o chão vira um borrão no fundo da ilha.
    ground.material.map = texture;
    ground.material.needsUpdate = true;
    return texture;
  }

  function setSurroundingTexture(source) {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    surroundings.material.color.set(0xffffff);
    surroundings.material.map = texture;
    surroundings.material.needsUpdate = true;
  }

  function toScene(x, y) {
    return { x: x - world.width / 2, z: y - world.height / 2 };
  }

  function syncOrganisms(organisms, motion = {}) {
    const { animate = true, elapsed = 0, walkSpeed = 34,
      birthDuration = 1.4, lifeSize = 10, sight = 1, chopSwing = 1.8 } = motion;
    const seen = new Set();
    for (const o of organisms) {
      seen.add(o.id);
      let view = organismViews.get(o.id);
      if (!view) {
        const body = createCharacter(o.sex === 'female');
        const halfAngle = o.genes.visionAngle * Math.PI / 360;
        const fan = new THREE.CircleGeometry(o.genes.visionRange, 20, -halfAngle, halfAngle * 2);
        fan.rotateX(-Math.PI / 2);
        const cone = new THREE.Mesh(fan, new THREE.MeshBasicMaterial({
          color: o.color, transparent: true, opacity: .13, depthWrite: false
        }));
        cone.position.y = .6;
        organismLayer.add(body);
        visionLayer.add(cone);
        view = { body, cone, rest: o.asleep ? 1 : 0 };
        organismViews.set(o.id, view);
      }
      dressCharacter(view.body, o.color, o.outfit);
      const place = toScene(o.x, o.y);

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
      poseCharacter(view.body, {
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
        carrying: o.carrying
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
    for (const [id, view] of organismViews) {
      if (seen.has(id)) continue;
      organismLayer.remove(view.body);
      visionLayer.remove(view.cone);
      view.cone.geometry.dispose();
      view.cone.material.dispose();
      view.body.userData.bodyMaterial.dispose();
      view.body.userData.outfitMaterial.dispose();
      organismViews.delete(id);
    }
  }

  function syncFood(patches) {
    const seen = new Set();
    for (const patch of patches) {
      seen.add(patch);
      let view = foodViews.get(patch);
      if (!view) {
        const tone = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.grassDark][
          Math.floor(Math.abs(patch.lean) * 3) % 3];
        view = createBush(tone);
        view.scale.setScalar(.8 + patch.size / 16);
        foodLayer.add(view);
        foodViews.set(patch, view);
      }
      const place = toScene(patch.x, patch.y);
      view.position.set(place.x, 0, place.z);
      view.rotation.y = patch.lean;
    }
    for (const [patch, view] of foodViews) {
      if (seen.has(patch)) continue;
      foodLayer.remove(view);
      foodViews.delete(patch);
    }
  }

  function syncPonds(ponds, options = {}) {
    const { elapsed = 0, raining = false, animate = true } = options;
    const seen = new Set();
    for (const pond of ponds) {
      seen.add(pond);
      let view = pondViews.get(pond);
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
        pondLayer.add(view);
        pondViews.set(pond, view);
      }
      const place = toScene(pond.x, pond.y);
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
    for (const [pond, view] of pondViews) {
      if (seen.has(pond)) continue;
      pondLayer.remove(view);
      pondViews.delete(pond);
    }
  }

  // Fogueira: roda de pedras, duas toras cruzadas, chama de blocos sem sombreamento
  // (fogo emite luz, não recebe) e um brilho no chão. A luz de verdade vem de um
  // conjunto fixo de luzes pontuais criado aqui uma vez: mudar a quantidade de luzes
  // da cena obriga o three.js a recompilar todos os materiais, e isso daria um
  // soluço a cada fogueira que acende ou apaga.
  const campfireLayer = new THREE.Group();
  scene.add(campfireLayer);
  const campfireViews = new Map();
  const FIRE_LIGHT_POOL = 4;
  const fireLights = Array.from({ length: FIRE_LIGHT_POOL }, () => {
    const light = new THREE.PointLight(0xff9a48, 0, 170, 2);
    scene.add(light);
    return light;
  });
  const STONE_SHAPE = new THREE.BoxGeometry(3.2, 2.2, 2.8);
  const LOG_SHAPE = new THREE.BoxGeometry(12, 2.2, 2.4);
  const FLAME_SHAPE = new THREE.BoxGeometry(1, 1, 1);
  const STONE_MATERIAL = leafMaterial(PALETTE.rock);
  const LOG_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
  const EMBER_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xff5a1e });
  const FLAME_COLORS = [0xff6a1a, 0xffa030, 0xffe070];
  const GLOW_GEOMETRY = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);

  function createCampfire(fire) {
    const group = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const angle = i / 9 * Math.PI * 2;
      const stone = new THREE.Mesh(STONE_SHAPE, STONE_MATERIAL);
      stone.position.set(Math.cos(angle) * 7.5, 1.1, Math.sin(angle) * 7.5);
      stone.rotation.y = -angle + pseudoRandom(fire.seed + i) * .5;
      stone.castShadow = true;
      group.add(stone);
    }
    for (const turn of [.4, .4 + Math.PI / 2]) {
      const log = new THREE.Mesh(LOG_SHAPE, LOG_MATERIAL);
      log.position.y = 1.4;
      log.rotation.y = turn;
      log.castShadow = true;
      group.add(log);
    }
    const embers = new THREE.Mesh(new THREE.BoxGeometry(6, .8, 6), EMBER_MATERIAL.clone());
    embers.material.transparent = true;
    embers.position.y = 2.2;
    group.add(embers);
    // Três línguas de fogo, uma por tom, do vermelho largo embaixo ao amarelo fino
    // em cima; cada uma com fase própria para a chama não pulsar em bloco.
    const flames = FLAME_COLORS.map((color, i) => {
      const flame = new THREE.Mesh(FLAME_SHAPE, new THREE.MeshBasicMaterial({
        color, transparent: true, depthWrite: false }));
      group.add(flame);
      return { mesh: flame, width: 6.5 - i * 1.9, height: 6 + i * 2.5, phase: i * 1.7 + fire.seed };
    });
    // Brilho no chão: aditivo, então só clareia, e só aparece de verdade no escuro.
    const glow = new THREE.Mesh(GLOW_GEOMETRY, new THREE.MeshBasicMaterial({
      color: 0xff8a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = .3;
    group.add(glow);
    group.userData = { flames, embers, glow };
    return group;
  }

  function syncCampfires(fires, { elapsed = 0, animate = true, daylight = 1 } = {}) {
    const seen = new Set();
    fires.forEach((fire, index) => {
      seen.add(fire);
      let view = campfireViews.get(fire);
      if (!view) {
        view = createCampfire(fire);
        campfireLayer.add(view);
        campfireViews.set(fire, view);
      }
      const place = toScene(fire.x, fire.y);
      view.position.set(place.x, 0, place.z);
      const { flames, embers, glow } = view.userData;
      const flame = fire.flame;
      // Tremor: duas senoides de frequência sem múltiplo comum não se repetem à vista.
      const flicker = animate
        ? 1 + Math.sin(elapsed * 9.3 + fire.seed) * .09 + Math.sin(elapsed * 15.7 + fire.seed * 2) * .06
        : 1;
      for (const part of flames) {
        const sway = animate ? Math.sin(elapsed * 6 + part.phase) : 0;
        const height = part.height * flame * flicker * (1 + sway * .08);
        part.mesh.visible = flame > .04;
        part.mesh.scale.set(part.width * (.6 + .4 * flame), Math.max(.01, height), part.width * (.6 + .4 * flame));
        part.mesh.position.set(sway * .5, 2.4 + height / 2, 0);
        part.mesh.rotation.y = part.phase + (animate ? elapsed * .8 : 0);
        part.mesh.material.opacity = Math.min(1, flame * 1.6);
      }
      // Brasa: ainda acesa quando a chama já foi, que é como o fogo morre de manhã.
      embers.material.opacity = Math.min(1, .25 + flame * 1.5);
      const dark = 1 - daylight;
      glow.scale.setScalar(26 + 8 * flicker);
      glow.material.opacity = .32 * flame * dark * flicker;

      const light = fireLights[index];
      if (light) {
        light.position.set(place.x, 12, place.z);
        // De dia o fogo quase não faz diferença na claridade; de noite ilumina a roda.
        light.intensity = 520 * flame * flicker * (.25 + .75 * dark);
      }
    });
    for (let i = fires.length; i < FIRE_LIGHT_POOL; i++) fireLights[i].intensity = 0;
    for (const [fire, view] of campfireViews) {
      if (seen.has(fire)) continue;
      campfireLayer.remove(view);
      view.traverse(node => {
        if (!node.isMesh) return;
        if (node.material !== STONE_MATERIAL && node.material !== LOG_MATERIAL) node.material.dispose();
      });
      view.userData.embers.geometry.dispose();
      campfireViews.delete(fire);
    }
  }

  const SCENERY_BUILDERS = {
    conifer: createConifer,
    broadleaf: createTree,
    cactus: createCactus,
    rock: createRock,
    shrub: seed => {
      const tones = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.grassShade];
      const bush = createBush(tones[Math.floor(pseudoRandom(seed) * tones.length) % tones.length]);
      bush.scale.setScalar(.55 + pseudoRandom(seed + 2) * .5);
      return bush;
    }
  };

  // A cena não sorteia mais a vegetação: recebe a lista pronta de quem conhece os
  // biomas, e aqui só decide como cada espécie é feita de blocos.
  function setScenery(items) {
    for (const prop of [...sceneryLayer.children]) {
      sceneryLayer.remove(prop);
      prop.traverse(node => {
        // Arbusto usa a geometria compartilhada com o capim da simulação: descartar
        // aqui quebraria todo o capim da arena. Só o que é exclusivo do cenário sai.
        if (node.isMesh && !SHARED_SHAPES.has(node.geometry)) node.geometry.dispose();
      });
    }
    for (const item of items) {
      const build = SCENERY_BUILDERS[item.kind];
      if (!build) continue;
      const prop = build(item.seed);
      const place = toScene(item.x, item.y);
      prop.position.set(place.x, 0, place.z);
      prop.rotation.y = pseudoRandom(item.seed + 21) * Math.PI * 2;
      // A mata de fora é só moldura: longe do mapa de sombra e numerosa, projetar
      // sombra dela custaria caro sem aparecer.
      if (item.decor) prop.traverse(node => { node.castShadow = false; });
      sceneryLayer.add(prop);
    }
  }

  // ---- Árvores, toras e cabanas ----

  const treeLayer = new THREE.Group();
  const logLayer = new THREE.Group();
  const hutLayer = new THREE.Group();
  scene.add(treeLayer, logLayer, hutLayer);
  const treeViews = new Map();
  const logViews = new Map();
  const hutViews = new Map();
  const STUMP_SHAPE = new THREE.CylinderGeometry(2.2, 2.6, 2.4, 8);
  const GROUND_LOG_SHAPE = new THREE.CylinderGeometry(LOG_RADIUS, LOG_RADIUS, 9, 8).rotateZ(Math.PI / 2);
  const fallAxis = new THREE.Vector3();

  function createTreeView(tree) {
    // Pivô na base do tronco: é em volta dele que a árvore tomba. A árvore de dentro
    // guarda o giro próprio, para o tombo não depender de para onde ela olhava.
    const pivot = new THREE.Group();
    const prop = SCENERY_BUILDERS[tree.kind](tree.seed);
    prop.rotation.y = pseudoRandom(tree.seed + 21) * Math.PI * 2;
    pivot.add(prop);
    const stump = new THREE.Mesh(STUMP_SHAPE, WOOD_MATERIALS);
    stump.position.y = 1.2;
    stump.castShadow = true;
    stump.visible = false;
    const place = toScene(tree.x, tree.y);
    pivot.position.set(place.x, 0, place.z);
    stump.position.x = place.x;
    stump.position.z = place.z;
    treeLayer.add(pivot, stump);
    return { pivot, prop, stump, baseRotation: prop.rotation.y };
  }

  function syncTrees(trees, { elapsed = 0, animate = true } = {}) {
    for (const tree of trees) {
      let view = treeViews.get(tree);
      if (!view) {
        view = createTreeView(tree);
        treeViews.set(tree, view);
      }
      const { pivot, prop, stump } = view;
      const fall = tree.fall;
      if (fall) {
        // Tomba em direção ao rumo de quem cortou: o eixo é o horizontal
        // perpendicular a esse rumo, e o ângulo vem da física da simulação.
        fallAxis.set(Math.sin(fall.dir), 0, -Math.cos(fall.dir));
        pivot.quaternion.setFromAxisAngle(fallAxis, fall.angle);
        // Deitada, o tronco não pode afundar no chão pela metade da grossura.
        pivot.position.y = Math.sin(fall.angle) * 2.2;
      } else {
        pivot.quaternion.identity();
        pivot.position.y = 0;
      }
      // Tremor do golpe: a copa balança rápido e o balanço morre em meio segundo.
      const shake = animate ? Math.sin(elapsed * 42) * .045 * tree.shake : 0;
      prop.rotation.set(shake, view.baseRotation, shake * .6);
      prop.visible = !tree.stump;
      // Muda nasce pequena e cresce até o tamanho de árvore.
      prop.scale.setScalar(tree.stump ? 1 : .25 + .75 * tree.growth);
      stump.visible = tree.stump || Boolean(fall);
    }
  }

  function syncLogs(logs) {
    const seen = new Set();
    for (const log of logs) {
      seen.add(log);
      let mesh = logViews.get(log);
      if (!mesh) {
        mesh = new THREE.Mesh(GROUND_LOG_SHAPE, WOOD_MATERIALS);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        logLayer.add(mesh);
        logViews.set(log, mesh);
      }
      const place = toScene(log.x, log.y);
      mesh.position.set(place.x, LOG_RADIUS, place.z);
      // Deitada ao longo do tronco caído: o eixo da tora é o x local, girado para o rumo.
      mesh.rotation.set(0, -log.angle, 0);
    }
    for (const [log, mesh] of logViews) {
      if (seen.has(log)) continue;
      logLayer.remove(mesh);
      logViews.delete(log);
    }
  }

  // Cabana de toras, erguida uma fiada por tora entregue. Paredes que correm em z
  // ficam meia fiada abaixo das que correm em x, que é o encaixe de canto de uma
  // cabana de verdade. A porta abre na parede do +x local, que o giro do grupo vira
  // para o lado da porta na simulação. Com todas as fiadas, ganha telhado de duas águas.
  const HUT_WIDTH = 24, HUT_DEPTH = 20, HUT_COURSE = 2.6, HUT_DOOR_HALF = 3.6, HUT_DOOR_COURSES = 4;
  const hutLogShapes = new Map();
  const ROOF_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x5c4630 });
  const DOORWAY_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x2e2218 });
  const STAKE_SHAPE = new THREE.BoxGeometry(1, 6, 1);

  function hutLogShape(length) {
    const key = Math.round(length * 10);
    if (!hutLogShapes.has(key)) {
      hutLogShapes.set(key, new THREE.CylinderGeometry(1.3, 1.3, length, 8));
    }
    return hutLogShapes.get(key);
  }

  function hutLog(group, length, x, y, z, alongZ) {
    const mesh = new THREE.Mesh(hutLogShape(length), WOOD_MATERIALS);
    mesh.position.set(x, y, z);
    if (alongZ) mesh.rotation.x = Math.PI / 2;
    else mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  function createHut(courses, built, totalCourses) {
    const group = new THREE.Group();
    const halfW = HUT_WIDTH / 2, halfD = HUT_DEPTH / 2;
    // Estacas nos cantos marcam o terreno enquanto a obra não fecha.
    if (!built) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const stake = new THREE.Mesh(STAKE_SHAPE, BARK_MATERIAL);
        stake.position.set(sx * (halfW + 2), 3, sz * (halfD + 2));
        stake.castShadow = true;
        group.add(stake);
      }
    }
    for (let course = 0; course < courses; course++) {
      const low = 1.3 + course * HUT_COURSE;
      const high = low + HUT_COURSE / 2;
      // Paredes do fundo e da frente (correm em z).
      hutLog(group, HUT_DEPTH + 4, -halfW, low, 0, true);
      if (course < HUT_DOOR_COURSES) {
        const segment = halfD + 2 - HUT_DOOR_HALF;
        const center = HUT_DOOR_HALF + segment / 2;
        hutLog(group, segment, halfW, low, -center, true);
        hutLog(group, segment, halfW, low, center, true);
      } else {
        hutLog(group, HUT_DEPTH + 4, halfW, low, 0, true);
      }
      // Paredes laterais (correm em x).
      hutLog(group, HUT_WIDTH + 4, 0, high, -halfD, false);
      hutLog(group, HUT_WIDTH + 4, 0, high, halfD, false);
    }
    if (built) {
      const top = 1.3 + totalCourses * HUT_COURSE;
      // Escuro do vão da porta: o lado de dentro sem luz.
      const doorway = new THREE.Mesh(new THREE.BoxGeometry(.4, HUT_DOOR_COURSES * HUT_COURSE, HUT_DOOR_HALF * 2),
        DOORWAY_MATERIAL);
      doorway.position.set(halfW - 1, HUT_DOOR_COURSES * HUT_COURSE / 2, 0);
      group.add(doorway);
      // Telhado de duas águas com a cumeeira correndo em x.
      const rise = 8, span = halfD + 3;
      const slope = Math.hypot(span, rise), pitch = Math.atan2(rise, span);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(HUT_WIDTH + 8, 1, slope), ROOF_MATERIAL);
        panel.position.set(0, top + rise / 2, side * span / 2);
        panel.rotation.x = side * pitch;
        panel.castShadow = true;
        panel.receiveShadow = true;
        group.add(panel);
      }
      // Oitões: os triângulos de madeira que fecham as pontas do telhado.
      const gable = new THREE.Shape();
      gable.moveTo(-halfD - 1, 0);
      gable.lineTo(halfD + 1, 0);
      gable.lineTo(0, rise - .6);
      gable.closePath();
      const gableShape = new THREE.ShapeGeometry(gable);
      for (const side of [-1, 1]) {
        const end = new THREE.Mesh(gableShape, new THREE.MeshLambertMaterial({
          color: PALETTE.trunk, side: THREE.DoubleSide }));
        end.position.set(side * (halfW + .5), top - .4, 0);
        end.rotation.y = Math.PI / 2;
        end.castShadow = true;
        group.add(end);
      }
    }
    return group;
  }

  function syncHuts(huts, totalCourses) {
    const seen = new Set();
    for (const hut of huts) {
      seen.add(hut);
      const stage = `${hut.logs}-${hut.built}`;
      let view = hutViews.get(hut);
      // Só refaz a cabana quando entra tora nova: é raro, e montar é barato.
      if (!view || view.stage !== stage) {
        if (view) hutLayer.remove(view.group);
        const group = createHut(Math.min(hut.logs, totalCourses), hut.built, totalCourses);
        const place = toScene(hut.x, hut.y);
        group.position.set(place.x, 0, place.z);
        group.rotation.y = -hut.angle;
        hutLayer.add(group);
        view = { group, stage };
        hutViews.set(hut, view);
      }
    }
    for (const [hut, view] of hutViews) {
      if (seen.has(hut)) continue;
      hutLayer.remove(view.group);
      hutViews.delete(hut);
    }
  }

  function syncCorpses(corpses, fadeDuration, lifeSize = 10) {
    const seen = new Set();
    for (const corpse of corpses) {
      seen.add(corpse);
      let view = corpseViews.get(corpse);
      if (!view) {
        view = createCharacter(corpse.sex === 'female');
        dressCharacter(view, corpse.color, corpse.outfit);
        // Pose neutra uma vez só: um corpo caído não anda, então nada a recalcular.
        poseCharacter(view, { gait: 0, pace: 0, lean: 0, bellyScale: 1, animate: false });
        corpseLayer.add(view);
        corpseViews.set(corpse, view);
      }
      const place = toScene(corpse.x, corpse.y);
      const sunk = Math.min(1, corpse.time / Math.max(.001, fadeDuration));
      // Tomba para o lado e afunda: some sem precisar de material transparente por corpo.
      view.position.set(place.x, -CHARACTER_HEIGHT * sunk, place.z);
      view.rotation.set(0, 0, corpse.direction * Math.PI / 2);
      view.scale.setScalar(corpse.size / lifeSize);
    }
    for (const [corpse, view] of corpseViews) {
      if (seen.has(corpse)) continue;
      corpseLayer.remove(view);
      view.userData.bodyMaterial.dispose();
      view.userData.outfitMaterial.dispose();
      corpseViews.delete(corpse);
    }
  }

  // O chão é um plano, e projeção ortográfica de um plano é uma transformação afim.
  // Devolvendo essa matriz, todo desenho 2D que já existia em coordenadas do mundo
  // volta a funcionar sem alteração, deitado na ilha e com a inclinação certa.
  function groundMatrix() {
    const origin = project(0, 0);
    const alongX = project(1, 0);
    const alongY = project(0, 1);
    return {
      a: alongX.x - origin.x, b: alongX.y - origin.y,
      c: alongY.x - origin.x, d: alongY.y - origin.y,
      e: origin.x, f: origin.y
    };
  }

  // Projeta um ponto do mundo da simulação para pixels do canvas de sobreposição,
  // que é onde continuam desenhadas as barras, os balões e a chuva.
  function project(x, y, lift = 0) {
    const place = toScene(x, y);
    projected.set(place.x, lift, place.z);
    projected.project(camera);
    return {
      x: (projected.x * .5 + .5) * viewWidth,
      y: (-projected.y * .5 + .5) * viewHeight
    };
  }

  // Caminho inverso: da tela para o chão da ilha, para o clique continuar semeando
  // e inspecionando bicho como fazia na versão 2D.
  function pickGround(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = (clientX - bounds.left) / bounds.width * 2 - 1;
    pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
    return { x: hit.x + world.width / 2, y: hit.z + world.height / 2 };
  }

  // O passeio é pedido em pixels de tela, não em unidades do mundo: numa vista a 45
  // graus "para cima" é uma diagonal, e acertar isso no olho dá errado. A matriz do
  // chão já mapeia mundo → tela, então basta invertê-la. Como ela já embute o zoom,
  // uma mesma quantidade de pixels anda o mesmo tanto na tela em qualquer zoom.
  function panByScreen(screenX, screenY) {
    const m = groundMatrix();
    const determinant = m.a * m.d - m.b * m.c;
    if (!determinant) return;
    panX += (m.d * screenX - m.c * screenY) / determinant;
    panZ += (-m.b * screenX + m.a * screenY) / determinant;
    clampPan();
    applyPan();
  }

  function setVisionVisible(value) {
    visionLayer.visible = Boolean(value);
  }

  function zoomBy(factor) {
    zoomLevel = Math.max(.5, Math.min(3, zoomLevel * factor));
    applyCamera();
  }

  function resetView() {
    zoomLevel = 1;
    panX = 0;
    panZ = 0;
    applyCamera();
  }

  return {
    resize, setGroundTexture, setSurroundingTexture, setScenery, syncTrees, syncLogs, syncHuts, setSky, syncCampfires, syncOrganisms, syncFood, syncPonds, syncCorpses,
    project, groundMatrix, pickGround, zoomBy, resetView, panByScreen, setVisionVisible,
    render: () => renderer.render(scene, camera)
  };
}
