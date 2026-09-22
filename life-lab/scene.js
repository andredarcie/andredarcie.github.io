import * as THREE from 'three';

// Paleta medida pixel a pixel da referência (mini.png), não escolhida a olho.
// Os nomes dizem o papel; os valores são os que dominam a imagem.
export const PALETTE = {
  sky: 0xd6f3de,
  shadow: 0x94b2b0,
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
  skin: 0xe8c9a0,
  legs: 0x55607a,
  hair: 0x4a3a2a
};

// Os dois únicos botões de iluminação. O ambiente sozinho já entrega a cor base da
// paleta nas faces viradas para cima; o sol só acrescenta o degradê das laterais.
// Sem tone mapping, para que o hex medido na imagem chegue intacto na tela.
const LIGHT_AMBIENT = 0.62;
const LIGHT_SUN = 1.4;

// Isometria verdadeira: o losango da referência tem altura/largura ≈ 0,583, e
// arcsen(0,583) ≈ 35,26°, que é exatamente o ângulo do eixo (1,1,1).
const CAMERA_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
const ISLAND_DEPTH = 66;
const TOOTH_DEPTH = 26;
export const CHARACTER_HEIGHT = 16;
const HIP_HEIGHT = 5.4;
const SHOULDER_HEIGHT = 11.2;

function createIsland(world) {
  const group = new THREE.Group();
  const { width, height } = world;
  const layerHeight = ISLAND_DEPTH / PALETTE.soil.length;

  PALETTE.soil.forEach((color, index) => {
    const inset = index * 3;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(width - inset, layerHeight, height - inset),
      new THREE.MeshLambertMaterial({ color })
    );
    slab.position.y = -layerHeight * (index + .5);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
  });

  // Dentes irregulares no fundo, o recorte de "pedaço arrancado do mundo".
  // Só o perímetro importa: o miolo nunca aparece de fora.
  const toothGeometry = new THREE.BoxGeometry(1, 1, 1);
  const toothMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.soil[PALETTE.soil.length - 1] });
  const columns = 13, rows = 13;
  const cellWidth = width / columns, cellHeight = height / rows;
  const teeth = [];
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const edge = column === 0 || row === 0 || column === columns - 1 || row === rows - 1;
      if (!edge) continue;
      teeth.push([column, row]);
    }
  }
  const toothMesh = new THREE.InstancedMesh(toothGeometry, toothMaterial, teeth.length);
  const matrix = new THREE.Matrix4();
  teeth.forEach(([column, row], index) => {
    const depth = TOOTH_DEPTH * (.35 + pseudoRandom(column * 31 + row * 7) * .65);
    matrix.makeScale(cellWidth * 1.02, depth, cellHeight * 1.02);
    matrix.setPosition(
      -width / 2 + (column + .5) * cellWidth,
      -ISLAND_DEPTH - depth / 2 + 1,
      -height / 2 + (row + .5) * cellHeight
    );
    toothMesh.setMatrixAt(index, matrix);
  });
  toothMesh.instanceMatrix.needsUpdate = true;
  toothMesh.castShadow = true;
  group.add(toothMesh);
  return group;
}

// Ruído determinístico: as árvores e os dentes precisam cair sempre no mesmo lugar,
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
const SKIN_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.skin });
const LEGS_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.legs });
const HAIR_MATERIAL = new THREE.MeshLambertMaterial({ color: PALETTE.hair });
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

function createCharacter(hasHair) {
  const group = new THREE.Group();
  // Grupo interno para o corpo: o de fora carrega posição no mundo, rumo e tamanho,
  // e o de dentro fica livre para o gingado, sem um sobrescrever o outro.
  const body = new THREE.Group();
  group.add(body);
  const torsoMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const build = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    body.add(mesh);
    return mesh;
  };
  const legLeft = build(SHAPES.leg, LEGS_MATERIAL, -1.4, HIP_HEIGHT, 0);
  const legRight = build(SHAPES.leg, LEGS_MATERIAL, 1.4, HIP_HEIGHT, 0);
  const torso = build(SHAPES.torso, torsoMaterial, 0, 8.4, 0);
  const armLeft = build(SHAPES.arm, SKIN_MATERIAL, -3.7, SHOULDER_HEIGHT, 0);
  const armRight = build(SHAPES.arm, SKIN_MATERIAL, 3.7, SHOULDER_HEIGHT, 0);
  build(SHAPES.head, SKIN_MATERIAL, 0, 14, 0);
  if (hasHair) {
    build(SHAPES.hair, HAIR_MATERIAL, 0, 16.4, 0);
    build(SHAPES.braid, HAIR_MATERIAL, 0, 13.4, -2.9);
  }
  group.userData = { torsoMaterial, body, torso, legLeft, legRight, armLeft, armRight };
  return group;
}

// Um passo: pernas em oposição, braços na fase contrária às pernas do mesmo lado
// (é como a gente anda de verdade), amplitude crescendo com a velocidade e o corpo
// subindo duas vezes por ciclo, porque o quadril sobe a cada apoio.
function poseCharacter(view, motion) {
  const { body, legLeft, legRight, armLeft, armRight, torso } = view.userData;
  const { gait, pace, lean, bellyScale, animate } = motion;
  // Amplitude: com esta perna (5,4) e este passo, o pé só ficaria plantado de verdade
  // perto de 59°, o que vira passada de lunge. 41° deixa ~30% de deslize e
  // uma passada que parece passada. O bicho anda 2,1 alturas de corpo por segundo,
  // então a cadência rápida não é erro: para o tamanho dele isso é trote.
  const swing = animate ? Math.sin(gait) * .72 * pace : 0;
  legLeft.rotation.x = swing;
  legRight.rotation.x = -swing;
  armLeft.rotation.x = -swing * .78;
  armRight.rotation.x = swing * .78;
  body.position.y = animate ? (1 - Math.cos(gait * 2)) * .45 * pace : 0;
  body.rotation.z = animate ? Math.sin(gait) * .05 * pace : 0;
  body.rotation.x = lean;
  torso.scale.set(bellyScale, 1, bellyScale);
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
  scene.background = new THREE.Color(PALETTE.sky);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 6000);
  const focus = new THREE.Vector3(0, -ISLAND_DEPTH / 3, 0);
  const radius = Math.max(world.width, world.height) * 2.4;
  let panX = 0, panZ = 0;

  // Com a ilha inteira cabendo na tela não existe para onde passear: o limite só abre
  // conforme o zoom fecha o enquadramento. Sobra sempre uma folga pequena para a tecla
  // dar resposta, e assim não dá para empurrar a ilha inteira para fora da vista — que
  // foi exatamente o que um limite fixo, dimensionado como se o mapa fosse grande,
  // deixava acontecer em pouco mais de meio segundo.
  function panLimit() {
    const half = Math.max(world.width, world.height) * .5;
    return Math.max(half * .25, half * (1 - 1 / Math.max(1, zoomLevel)));
  }

  function clampPan() {
    const limit = panLimit();
    panX = Math.max(-limit, Math.min(limit, panX));
    panZ = Math.max(-limit, Math.min(limit, panZ));
  }

  function applyPan() {
    focus.set(panX, -ISLAND_DEPTH / 3, panZ);
    camera.position.copy(CAMERA_DIRECTION).multiplyScalar(radius).add(focus);
    camera.lookAt(focus);
    // lookAt mexe na orientação mas não na matriz de mundo, que só seria refeita no
    // próximo render. Sem isso, projetar e acertar o clique usariam a câmera de antes.
    camera.updateMatrixWorld();
  }
  applyPan();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe4c6, LIGHT_AMBIENT));
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
  sun.shadow.camera.far = world.width * 3.5;
  sun.shadow.bias = -.0012;
  scene.add(sun);
  scene.add(sun.target);

  scene.add(createIsland(world));
  const sceneryLayer = new THREE.Group();
  scene.add(sceneryLayer);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(world.width, world.height),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  ground.rotation.x = -Math.PI / 2;
  // Acima da face do primeiro estrato: no mesmo y as duas superfícies brigam e piscam.
  ground.position.y = .05;
  ground.receiveShadow = true;
  scene.add(ground);

  // Plano invisível que só existe para receber a sombra da ilha no fundo,
  // como na referência: o losango projeta uma mancha à direita, sobre o nada.
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(world.width * 4, world.height * 4),
    new THREE.ShadowMaterial({ opacity: .16 })
  );
  backdrop.rotation.x = -Math.PI / 2;
  backdrop.position.y = -ISLAND_DEPTH - TOOTH_DEPTH - 6;
  backdrop.receiveShadow = true;
  scene.add(backdrop);

  const organismLayer = new THREE.Group();
  const foodLayer = new THREE.Group();
  const pondLayer = new THREE.Group();
  const visionLayer = new THREE.Group();
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

  // Quanto a ilha ocupa na tela, em unidades, já projetada: um quadrado girado 45°
  // vira um losango de (W + H)/√2 de largura, e a altura é essa largura vezes o seno
  // da elevação isométrica, mais a espessura do bloco de terra vista de lado.
  const SIN_ISO = 1 / Math.sqrt(3), COS_ISO = Math.sqrt(2 / 3);
  const spanX = (world.width + world.height) / Math.SQRT2;
  const spanY = spanX * SIN_ISO + (ISLAND_DEPTH + TOOTH_DEPTH) * COS_ISO;

  function applyCamera() {
    const aspect = viewWidth / Math.max(1, viewHeight);
    const halfHeight = spanY / 2 * 1.12;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    // Em tela estreita a largura é que manda: sem isso o celular corta as pontas da ilha.
    baseZoom = Math.min(1, halfWidth / (spanX / 2 * 1.06));
    camera.zoom = baseZoom * zoomLevel;
    camera.updateProjectionMatrix();
    // Afastar o zoom encolhe o limite, então o foco tem que ser puxado de volta junto,
    // senão a ilha sairia de vista sem ninguém ter apertado tecla nenhuma.
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

  function toScene(x, y) {
    return { x: x - world.width / 2, z: y - world.height / 2 };
  }

  function syncOrganisms(organisms, motion = {}) {
    const { animate = true, elapsed = 0, walkSpeed = 34,
      birthDuration = 1.4, lifeSize = 10 } = motion;
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
        view = { body, cone };
        organismViews.set(o.id, view);
      }
      view.body.userData.torsoMaterial.color.set(o.color);
      const place = toScene(o.x, o.y);

      // Recém-nascido cresce até o tamanho, em vez de aparecer pronto do nada.
      const birth = o.birthAnimation > 0
        ? 1 - Math.pow(o.birthAnimation / birthDuration, 3) : 1;
      // No trabalho de parto o corpo pulsa; é o aviso visual de que vai nascer.
      const labor = animate && o.pregnancy?.labor ? 1 + Math.sin(elapsed * 12) * .04 : 1;
      const scale = o.size / lifeSize * (animate ? .45 + .55 * birth : 1) * labor;

      const feeding = o.eating > 0 || o.drinking > 0;
      poseCharacter(view.body, {
        // Fase dobrada: gait já acompanha a distância percorrida, mas na escala crua
        // daria uma passada de 18 unidades, longa demais para a perna alcançar.
        gait: o.gait * 2,
        pace: Math.min(1.4, o.speed / walkSpeed),
        // Comendo e bebendo o bicho se inclina para a frente, sobre o recurso.
        lean: feeding ? .38 : 0,
        bellyScale: o.pregnancy
          ? 1 + Math.min(1, o.pregnancy.elapsed / o.pregnancy.duration) * .3 : 1,
        animate
      });

      view.body.position.set(place.x, 0, place.z);
      view.body.scale.setScalar(scale);
      // O grupo é montado olhando para +z; o rumo da simulação é medido em (x, y),
      // que vira (x, z) aqui, então o giro em torno de y é π/2 menos o rumo.
      view.body.rotation.set(0, Math.PI / 2 - o.heading, 0);
      if (o.life <= 0) {
        view.body.rotation.z = Math.PI / 2.1;
        view.body.position.y = -1.5;
      }
      view.cone.visible = o.life > 0;
      view.cone.position.set(place.x, .6, place.z);
      view.cone.rotation.y = -o.heading;
    }
    for (const [id, view] of organismViews) {
      if (seen.has(id)) continue;
      organismLayer.remove(view.body);
      visionLayer.remove(view.cone);
      view.cone.geometry.dispose();
      view.cone.material.dispose();
      view.body.userData.torsoMaterial.dispose();
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
      sceneryLayer.add(prop);
    }
  }

  function syncCorpses(corpses, fadeDuration, lifeSize = 10) {
    const seen = new Set();
    for (const corpse of corpses) {
      seen.add(corpse);
      let view = corpseViews.get(corpse);
      if (!view) {
        view = createCharacter(corpse.sex === 'female');
        view.userData.torsoMaterial.color.set(corpse.color);
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
      view.userData.torsoMaterial.dispose();
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
    resize, setGroundTexture, setScenery, syncOrganisms, syncFood, syncPonds, syncCorpses,
    project, groundMatrix, pickGround, zoomBy, resetView, panByScreen,
    render: () => renderer.render(scene, camera)
  };
}
