import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { shadedBox, addVerticalShade } from './Shading.js';
import { createContactShadow, isContactShadowShape } from './ContactShadow.js';

// Um material só para toda a vegetação: a cor de cada bloco vai nos vértices.
const PLANT_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });
// Peça de montagem: o material de verdade é o de cima; este só segura o lugar até a
// planta ser fundida numa malha só.
const ASSEMBLY = new THREE.MeshBasicMaterial();

// Pés de mandioca colhíveis em cada roça: um por viagem de colheita
// (BUSH_STOCK / FOOD_PER_TRIP).
export const ROCA_PLANTS = 6;

// Lâmina de folha (folíolo de mandioca, folha de milho, pendão): losango comprido e
// fino, de duas faces, com a nervura do meio um pouco erguida para pegar luz dos
// dois lados da dobra. Comprimento no eixo y (como os galhos de #limb) e largura no
// z, para a lâmina deitar quando o galho deita. São 4 triângulos — um bloco tem 12 —,
// o que deixa a roça cheia de folha sem pesar no celular.
function bladeShape(length, width, waist = .4) {
  const w = width / 2, fold = width * .14;
  const base = [0, 0, 0], tip = [0, length, 0];
  const left = [-fold, length * waist, -w], right = [-fold, length * waist, w];
  const faces = [base, right, tip, base, tip, left, base, tip, right, base, left, tip];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(faces.flat()), 3));
  geometry.computeVertexNormals();
  // Mais escura no pé da folha, clara na ponta, como os blocos (Shading).
  const shade = new Float32Array(faces.length * 3);
  faces.forEach((vertex, i) => shade.fill(.8 + .26 * (vertex[1] / length), i * 3, i * 3 + 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(shade, 3));
  return geometry;
}

// Tufo de folhagem: uma bola de faces (icosaedro) com cada vértice empurrado para
// dentro ou para fora por um sorteio que depende só da posição — os vértices
// repetidos das faces vizinhas andam juntos e a bola não racha —, achatada em
// `squash`. Sai irregular como copa de verdade, sem a quina de caixa, e as faces
// planas pegam a luz cada uma de um jeito, o que lê como folhagem.
function leafBlob(radius, squash, detail, seed, rough = .32) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const key = Math.round(x * 97) * 1.37 + Math.round(y * 97) * 2.91 + Math.round(z * 97) * .53;
    const push = 1 + (pseudoRandom(seed + key) - .5) * rough;
    position.setXYZ(i, x * push, y * push * squash, z * push);
  }
  geometry.computeVertexNormals();
  return addVerticalShade(geometry, .62, 1.12);
}

// Casca em placas, clara e escura (a da catingueira é cinza manchada de branco): cada
// vértice com um tom sorteado em volta do degradê de sombra.
function mottle(geometry, amount) {
  const color = geometry.attributes.color;
  for (let i = 0; i < color.count; i++) {
    const k = 1 + (Math.random() - .5) * amount;
    color.setXYZ(i, color.getX(i) * k, color.getY(i) * k, color.getZ(i) * k);
  }
  return geometry;
}

// A caatinga de blocos: catingueira, umbuzeiro, mandacaru, xique-xique, macambira,
// garrancho seco, pedras de granito e as roças. Galhos roliços (#limb) e as copas
// das árvores em bolas irregulares (leafBlob). Cada planta é montada de blocos (com
// o degradê de sombra de Shading e um tom levemente sorteado por bloco, para a mata
// não sair chapada) e depois fundida numa malha só com cor por vértice: uma
// chamada de desenho por planta, o que deixa encher o mapa sem pesar no celular.
export class PropFactory {
  #materials = new Map();
  #builders = {
    umbuzeiro: seed => this.umbuzeiro(seed),
    catingueira: seed => this.catingueira(seed),
    mandacaru: seed => this.mandacaru(seed),
    xiquexique: seed => this.xiquexique(seed),
    macambira: seed => this.macambira(seed),
    garrancho: seed => this.garrancho(seed),
    rock: seed => this.rock(seed),
    favela: seed => this.favela(seed),
    quixabeira: seed => this.quixabeira(seed),
    juazeiro: seed => this.juazeiro(seed),
    canudo: seed => this.canudo(seed),
    cabecafrade: seed => this.cabecafrade(seed),
    palmatoria: seed => this.palmatoria(seed),
    lasca: seed => this.lasca(seed),
    // A mata atlântica do litoral (missão dos tupinambás).
    pindoba: seed => this.pindoba(seed),
    ibirapitanga: seed => this.ibirapitanga(seed),
    jequitiba: seed => this.jequitiba(seed),
    embauba: seed => this.embauba(seed),
    pitangueira: seed => this.pitangueira(seed),
    samambaia: seed => this.samambaia(seed),
    bromelia: seed => this.bromelia(seed),
    taquara: seed => this.taquara(seed),
    restinga: seed => this.restinga(seed),
    costao: seed => this.costao(seed)
  };

  // Geometria que não pode ser descartada junto com um enfeite.
  isShared(geometry) {
    return isContactShadowShape(geometry);
  }

  // Material liso, para quem monta peça sem cor por vértice (as pedras da fogueira).
  material(color) {
    if (!this.#materials.has(color)) {
      this.#materials.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return this.#materials.get(color);
  }

  // `withShadow`: a árvore da simulação tomba e cresce, então a mancha dela mora fora
  // da peça (TreeRenderer); o resto leva a mancha junto.
  build(kind, seed, { withShadow = true } = {}) {
    const builder = this.#builders[kind];
    if (!builder) return null;
    // Montada na medida de antes e ampliada aqui: gente tem 16 de altura (1 ≈ 10 cm),
    // e as árvores da caatinga têm de 4 a 8 m. Não é a escala de verdade — a árvore
    // cobriria a tela —, mas a árvore fica bem mais alta que um homem.
    const holder = new THREE.Group();
    const plant = builder(seed);
    plant.scale.setScalar(PropFactory.#SCALE[kind] ?? 1);
    holder.add(plant);
    const prop = PropFactory.#merge(holder);
    if (withShadow) prop.add(createContactShadow(PropFactory.footprint(kind)));
    return prop;
  }

  static #SCALE = Object.freeze({
    umbuzeiro: 1.45, catingueira: 1.6, favela: 1.5, quixabeira: 1.5, juazeiro: 1.45,
    mandacaru: 1.35, garrancho: 1.3,
    pindoba: 1.5, ibirapitanga: 1.55, jequitiba: 1.7, embauba: 1.5, pitangueira: 1.35, taquara: 1.3
  });

  // Raio da mancha de contato de cada espécie, em unidades.
  static footprint(kind) {
    return {
      umbuzeiro: 19, catingueira: 11, favela: 11, quixabeira: 11, juazeiro: 15, mandacaru: 7,
      xiquexique: 6, rock: 7, lasca: 7, macambira: 5, garrancho: 6, canudo: 4, cabecafrade: 3, palmatoria: 5,
      pindoba: 9, ibirapitanga: 13, jequitiba: 22, embauba: 10, pitangueira: 10, samambaia: 5, bromelia: 4,
      taquara: 6, restinga: 7, costao: 14
    }[kind] ?? 6;
  }

  // Altura aproximada de cada espécie crescida, em unidades: até onde ela tapa quem
  // está atrás (OcclusionFader).
  static height(kind) {
    return {
      umbuzeiro: 27, catingueira: 36, favela: 28, quixabeira: 36, juazeiro: 30, mandacaru: 40,
      xiquexique: 8, rock: 7, lasca: 4, macambira: 6, garrancho: 9, canudo: 10, cabecafrade: 4, palmatoria: 8,
      pindoba: 46, ibirapitanga: 40, jequitiba: 58, embauba: 38, pitangueira: 22, samambaia: 6, bromelia: 4,
      taquara: 20, restinga: 7, costao: 12
    }[kind] ?? 10;
  }

  // ---- Árvores (dão madeira) ----

  // Catingueira (Cenostigma pyramidale), das que Euclides diz fazerem "sessenta por
  // cento das caatingas", como nas fotos dela: não tem um tronco só — dois a quatro
  // fustes finos saem juntos do chão, quase de pé, de casca cinza-clara manchada (a
  // "mata branca"). Lá em cima cada fuste se abre em forquilhas, e a copa é rala e
  // desigual, de folha miúda oliva e amarelada. Na seca, uma em cada quatro está pelada.
  catingueira(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 7.31);
    const bark = rand(2) > .5 ? PALETTE.bark : PALETTE.barkLight;
    const bare = rand(5) < .25;
    const tones = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafDry];
    let leaves = 0;
    const leaf = (parent, x, y, z, radius) => {
      parent.add(this.#block(leafBlob(radius, .75, 0, seed + leaves * 13, .45),
        tones[Math.floor(rand(200 + leaves) * tones.length)], x, y, z));
      leaves++;
    };
    // A touceira de raiz onde os fustes se juntam.
    tree.add(this.#block(addVerticalShade(new THREE.CylinderGeometry(.9, 1.5, 1, 6), .6, 1), bark, 0, .4, 0));
    const stems = 2 + Math.floor(rand(6) * 3);
    for (let s = 0; s < stems; s++) {
      const angle = s / stems * Math.PI * 2 + rand(10 + s) * .9;
      const height = 10 + rand(20 + s) * 5 - s;
      const stem = this.#limb(tree, Math.cos(angle) * .45, 0, Math.sin(angle) * .45, angle,
        .1 + rand(30 + s) * .2, height, s ? .9 : 1.2, bark, .7);
      const forks = 2 + Math.floor(rand(40 + s) * 2);
      for (let f = 0; f < forks; f++) {
        const k = s * 5 + f;
        const length = 4 + rand(50 + k) * 3.5;
        const fork = this.#limb(stem, 0, height - .3, 0, f / forks * Math.PI * 2 + rand(60 + k),
          .35 + rand(70 + k) * .45, length, .55, bark);
        const twig = this.#limb(fork, 0, length * .55, 0, (rand(80 + k) - .5) * 2.4,
          .45 + rand(90 + k) * .3, length * .5, .32, bark);
        if (bare) continue;
        // Folhagem rala: um tufo na ponta de cada galho e às vezes outro no meio.
        leaf(fork, 0, length + .3, 0, 1.9 + rand(100 + k) * 1);
        leaf(twig, 0, length * .5, 0, 1.5 + rand(110 + k) * .9);
        if (rand(120 + k) > .4) leaf(fork, (rand(130 + k) - .5) * 2, length * .6, (rand(140 + k) - .5) * 2, 1.4);
      }
    }
    return tree;
  }

  // Umbuzeiro (Spondias tuberosa) como nas fotos do sertão baiano: tronco curtíssimo,
  // grosso e escuro, de pé esparramado, que pouco acima do chão já se reparte em
  // quatro ou cinco braços grossos e tortos, saindo quase deitados — "irradiantes em
  // círculo, os galhos numerosos" (Os Sertões). Na ponta os braços voltam a subir e
  // seguram a copa: uma cúpula baixa, muito mais larga que alta, de barra caída —
  // a única sombra verde da caatinga na seca —, com os umbus amarelando na barra.
  umbuzeiro(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 5.17);
    const bark = PALETTE.barkDark;
    const trunkHeight = 3.4 + rand(1) * 1.4;
    tree.add(this.#block(mottle(addVerticalShade(new THREE.CylinderGeometry(1.7, 2.3, trunkHeight + .6, 7, 2), .55, 1), .3),
      bark, 0, (trunkHeight + .6) / 2, 0));
    tree.add(this.#block(addVerticalShade(new THREE.CylinderGeometry(2.1, 3, .9, 7), .5, .9), bark, 0, .45, 0));
    const spread = 10 + rand(2) * 2.5;
    const arms = 4 + Math.floor(rand(3) * 2);
    for (let i = 0; i < arms; i++) {
      const angle = i / arms * Math.PI * 2 + rand(10 + i) * .7;
      const first = 3.8 + rand(20 + i) * 1.6;
      const arm = this.#limb(tree, 0, trunkHeight - .3, 0, angle, .95 + rand(30 + i) * .3, first, 1.5, bark, .78);
      // Cotovelo: o braço volta a subir para dentro da copa, um pouco de lado.
      const second = 4 + rand(40 + i) * 2;
      const rise = this.#limb(arm, 0, first, 0, Math.PI + (rand(50 + i) - .5) * .8, .45 + rand(60 + i) * .2, second, 1.15, bark, .6);
      for (let k = 0; k < 2; k++) {
        this.#limb(rise, 0, second * (.5 + k * .4), 0, (k ? 1 : -1) * (1 + rand(70 + i + k)), .7, 3, .45, bark);
      }
    }
    // A cúpula: um tufo no alto do meio e dois anéis descendo para a barra, cada
    // tufo uma bola irregular e achatada encostada nas vizinhas. O miolo de cima,
    // mais exposto ao sol, sai no verde mais claro; a barra, no mais escuro.
    const tones = [PALETTE.umbuLeaf, PALETTE.umbuLeafDark, PALETTE.umbuLeafLight];
    const top = trunkHeight + 10;
    const droop = 7;
    // Miolo largo e escuro por dentro, que fecha os vãos entre os tufos: de longe a
    // copa lê como uma massa só, e o fundo dela é a sombra da própria folhagem.
    tree.add(this.#block(leafBlob(spread * .78, .38, 1, seed + 3, .25), tones[1], 0, top - droop * .45, 0));
    let n = 0;
    for (const [reach, count, size] of [[0, 1, 4.2], [.45, 5, 3.8], [.82, 9, 3.2]]) {
      for (let i = 0; i < count; i++, n++) {
        const angle = i / count * Math.PI * 2 + rand(80 + n) * .6 + reach * 2;
        const r = spread * reach * (.9 + rand(90 + n) * .2);
        const y = top - (r / spread) ** 2 * droop + (rand(100 + n) - .5) * 1.2;
        const tone = reach === 0 ? tones[2] : reach > .8 ? tones[n % 2] : tones[n % 3];
        const clump = this.#block(leafBlob(size * (.85 + rand(110 + n) * .3), .55, 1, seed + n * 17, .38),
          tone, Math.cos(angle) * r, y, Math.sin(angle) * r);
        clump.rotation.y = rand(120 + n) * 3;
        tree.add(clump);
      }
    }
    // Umbus amarelos pendurados na barra da copa.
    const hem = top - .67 * droop - 2;
    for (let i = 0; i < 7; i++) {
      const angle = rand(130 + i) * Math.PI * 2;
      tree.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.62, 0), .85, 1.1), PALETTE.umbuFruit,
        Math.cos(angle) * spread * .78, hem, Math.sin(angle) * spread * .78, false));
    }
    return tree;
  }

  // Favela (Cnidoscolus quercifolius), a que deu nome ao morro: arvoreta de tronco
  // curto e liso, cinza-pardo, que abre em galhos tortos em zigue-zague, com a copa
  // rala de folha recortada cinza-esverdeada, coberta de pelo que queima — "a mão,
  // que a toca, toca uma chapa incandescente". Na seca muitas ficam só no galho; as
  // que têm folha mostram umas florzinhas brancas.
  favela(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 6.43);
    const bark = PALETTE.favelaBark;
    const trunkHeight = 5 + rand(1) * 2.5;
    const trunk = this.#limb(tree, 0, 0, 0, rand(2) * 6.28, rand(3) * .15, trunkHeight, 1.7, bark, .7);
    tree.add(this.#block(addVerticalShade(new THREE.CylinderGeometry(1, 1.5, 1, 6), .6, 1), bark, 0, .4, 0));
    const bare = rand(4) < .35;
    const tones = [PALETTE.favelaLeaf, PALETTE.favelaLeafLight, PALETTE.leafDry];
    const branches = 3 + Math.floor(rand(5) * 2);
    for (let i = 0; i < branches; i++) {
      const length = 4 + rand(10 + i) * 2.5;
      const limb = this.#limb(trunk, 0, trunkHeight - .3, 0, i / branches * Math.PI * 2 + rand(20 + i) * .8,
        .7 + rand(30 + i) * .3, length, 1, bark, .7);
      // O torto da favela: o galho dobra para o outro lado e depois volta.
      const bend = this.#limb(limb, 0, length, 0, Math.PI + (rand(40 + i) - .5), .6 + rand(50 + i) * .3, 3.5 + rand(60 + i) * 2, .7, bark);
      const tip = this.#limb(bend, 0, 3.5, 0, (rand(70 + i) - .5) * 1.6, .5, 2.5 + rand(80 + i) * 1.5, .4, bark);
      if (bare) continue;
      for (const [k, part] of [limb, tip].entries()) {
        const radius = 1.8 + rand(90 + i * 2 + k) * 1.1;
        part.add(this.#block(leafBlob(radius, .75, 0, seed + i * 7 + k, .5), tones[Math.floor(rand(100 + i * 2 + k) * 3)],
          0, k ? 2.8 : length * .8, 0));
      }
      if (rand(110 + i) > .5) {
        tip.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.45, 0), .9, 1.05), PALETTE.flower, .6, 3.6, .4, false));
      }
    }
    return tree;
  }

  // Quixabeira (Sideroxylon obtusifolium): "uma árvore única, uma quixabeira alta,
  // sobranceando a vegetação franzina". Tronco mais alto, escuro e áspero, galhos que
  // sobem, e a copa fechada e comprida, verde-escura, de folhinhas miúdas — "de
  // folhas pequeninas e frutos que lembram contas de ônix" — que segue verde na seca.
  quixabeira(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 4.61);
    const bark = PALETTE.barkDark;
    const trunkHeight = 8 + rand(1) * 3;
    const trunk = this.#limb(tree, 0, 0, 0, rand(2) * 6.28, rand(3) * .12, trunkHeight, 1.8, bark, .72);
    tree.add(this.#block(addVerticalShade(new THREE.CylinderGeometry(1.1, 1.7, 1, 6), .55, 1), bark, 0, .4, 0));
    const branches = 3 + Math.floor(rand(4) * 2);
    for (let i = 0; i < branches; i++) {
      this.#limb(trunk, 0, trunkHeight * (.7 + i * .08), 0, i / branches * Math.PI * 2 + rand(10 + i),
        .35 + rand(20 + i) * .3, 5 + rand(30 + i) * 3, .9, bark);
    }
    // A copa: uma pilha de tufos num oval de pé, os de baixo mais escuros.
    const tones = [PALETTE.quixabaLeafDark, PALETTE.quixabaLeaf];
    const base = trunkHeight + 1;
    const tall = 11 + rand(5) * 4;
    tree.add(this.#block(leafBlob(5.2, 1.25, 1, seed + 1, .3), tones[0], 0, base + tall * .45, 0));
    for (let i = 0; i < 9; i++) {
      const level = i / 8;
      const angle = i * 2.4 + rand(40 + i);
      const reach = Math.sin(level * Math.PI) * 4.6 + 1;
      tree.add(this.#block(leafBlob(2.8 + rand(50 + i) * 1.4, .85, 1, seed + 10 + i, .35), tones[level > .4 ? 1 : 0],
        Math.cos(angle) * reach, base + level * tall, Math.sin(angle) * reach));
    }
    return tree;
  }

  // Juazeiro (Ziziphus joazeiro): sempre verde, "que raro perdem as folhas de um verde
  // intenso [...] floridos sempre, salpintando o deserto com as flores cor de ouro, à
  // maneira de oásis verdejantes". Dois ou três troncos curtos e a copa redonda e
  // cheia, verde-vivo, descendo quase até o chão, com pontinhos amarelos de flor.
  juazeiro(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 3.97);
    const bark = PALETTE.bark;
    const stems = 2 + Math.floor(rand(1) * 2);
    for (let s = 0; s < stems; s++) {
      this.#limb(tree, 0, 0, 0, s / stems * Math.PI * 2 + rand(10 + s), .2 + rand(20 + s) * .25, 6 + rand(30 + s) * 2, 1.3, bark, .7);
    }
    const tones = [PALETTE.juazeiroLeaf, PALETTE.juazeiroLeafLight, PALETTE.juazeiroLeafDark];
    const spread = 8 + rand(2) * 2;
    const middle = 11;
    // Miolo escuro e redondo, e os tufos claros por cima e em volta: copa cheia.
    tree.add(this.#block(leafBlob(spread * .9, .72, 1, seed + 2, .25), tones[2], 0, middle, 0));
    let n = 0;
    for (const [lift, reach, count, size] of [[.85, 0, 1, 4.4], [.45, .55, 5, 4], [-.05, .8, 7, 3.4]]) {
      for (let i = 0; i < count; i++, n++) {
        const angle = i / count * Math.PI * 2 + rand(40 + n) * .7 + lift;
        const r = spread * reach;
        tree.add(this.#block(leafBlob(size * (.85 + rand(50 + n) * .3), .7, 1, seed + 20 + n, .35),
          tones[n % 2], Math.cos(angle) * r, middle + lift * spread * .75, Math.sin(angle) * r));
      }
    }
    // Flor miúda amarela salpicada na copa.
    for (let i = 0; i < 12; i++) {
      const angle = rand(70 + i) * Math.PI * 2, up = rand(80 + i);
      const r = spread * (.95 - up * .5);
      tree.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.42, 0), .95, 1.05), PALETTE.juazeiroFlower,
        Math.cos(angle) * r, middle + up * spread * .7 + 1, Math.sin(angle) * r, false));
    }
    return tree;
  }

  // ---- Enfeites ----

  // Mandacaru: pé lenhoso e escuro de cacto velho, a coluna verde-azulada com as
  // costelas mais escuras e os braços que saem num cotovelo e sobem em candelabro,
  // cada um de uma altura. De vez em quando, a flor branca no alto.
  mandacaru(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 3.71);
    const tall = 20 + rand(1) * 12;
    const woody = 2.5 + rand(2) * 2;
    plant.add(this.#block(shadedBox(3.2, woody, 3.2, .6, 1), PALETTE.barkDark, 0, woody / 2, 0));
    this.#column(plant, 0, woody, 0, 3.2, tall - woody, rand(3) > .6);
    const arms = 2 + Math.floor(rand(4) * 3);
    for (let i = 0; i < arms; i++) {
      const angle = i / arms * Math.PI * 2 + rand(10 + i) * .9;
      const from = woody + 3 + rand(20 + i) * (tall * .35);
      const out = 3.5 + rand(30 + i) * 2;
      const height = Math.max(5, Math.min(tall - from + 2, tall * (.3 + rand(40 + i) * .4)));
      const dx = Math.cos(angle), dz = Math.sin(angle);
      const elbow = this.#block(shadedBox(out + 2.4, 2.4, 2.4, .7, 1), PALETTE.mandacaru,
        dx * out / 2, from, dz * out / 2);
      elbow.rotation.y = -angle;
      plant.add(elbow);
      this.#column(plant, dx * out, from - 1.2, dz * out, 2.5, height, rand(50 + i) > .75);
    }
    return plant;
  }

  // Xique-xique: touceira baixa de colunas finas, umas de pé e outras deitadas que
  // viram para cima, espalhando-se no chão de pedra.
  xiquexique(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 4.13);
    const stems = 5 + Math.floor(rand(1) * 4);
    for (let i = 0; i < stems; i++) {
      const angle = i / stems * Math.PI * 2 + rand(10 + i) * .7;
      const reach = 1 + rand(20 + i) * 3.5;
      const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach;
      if (rand(30 + i) > .55) {
        // Deitado: um gomo rente ao chão e a ponta virando para cima.
        const run = 3 + rand(40 + i) * 3;
        const lying = this.#block(shadedBox(run, 1.7, 1.7, .7, 1.05), PALETTE.xiquexique,
          x + Math.cos(angle) * run / 2, .85, z + Math.sin(angle) * run / 2);
        lying.rotation.y = -angle;
        plant.add(lying);
        this.#column(plant, x + Math.cos(angle) * run, .2, z + Math.sin(angle) * run, 1.7, 2 + rand(50 + i) * 3, false);
      } else {
        const stem = this.#column(plant, x, 0, z, 1.8, 3 + rand(60 + i) * 5, false);
        stem.rotation.set(Math.sin(angle) * .18, 0, -Math.cos(angle) * .18);
      }
    }
    return plant;
  }

  // Macambira: roseta de folhas duras, compridas e espinhentas saindo do chão, a
  // ponta amarelando, com o miolo avermelhado.
  macambira(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 2.91);
    const blades = 9 + Math.floor(rand(1) * 4);
    for (let i = 0; i < blades; i++) {
      const angle = i / blades * Math.PI * 2 + rand(10 + i) * .4;
      const length = 4.5 + rand(20 + i) * 3;
      const tilt = .5 + rand(30 + i) * .55;
      const holder = new THREE.Group();
      holder.rotation.set(0, -angle, -tilt, 'YXZ');
      holder.add(this.#block(shadedBox(.8, length * .7, 1.4, .55, 1.05), PALETTE.macambira, 0, length * .35, 0));
      holder.add(this.#block(shadedBox(.6, length * .35, 1, .9, 1.15), PALETTE.leafDry, 0, length * .85, 0));
      plant.add(holder);
    }
    plant.add(this.#block(shadedBox(1.8, 1.4, 1.8, .8, 1), PALETTE.macambiraRed, 0, .7, 0));
    return plant;
  }

  // Garrancho: arbusto seco de varetas cinzentas, com um ou outro fiapo de folha. É o
  // que enche a caatinga entre uma árvore e outra.
  garrancho(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 6.07);
    const twigs = 6 + Math.floor(rand(1) * 4);
    const tone = rand(2) > .5 ? PALETTE.bark : PALETTE.barkLight;
    for (let i = 0; i < twigs; i++) {
      const angle = i / twigs * Math.PI * 2 + rand(10 + i);
      const length = 3.5 + rand(20 + i) * 3.5;
      const twig = this.#limb(plant, (rand(30 + i) - .5) * 1.5, 0, (rand(40 + i) - .5) * 1.5,
        angle, .3 + rand(50 + i) * .55, length, .45, tone);
      if (rand(60 + i) < .45) {
        const leaf = this.#block(shadedBox(1.6, .6, 1.6, .8, 1.1), rand(70 + i) > .5 ? PALETTE.leafDry : PALETTE.leafMid, 0, length, 0);
        twig.add(leaf);
      }
    }
    return plant;
  }

  // Canudo-de-pito: o arbusto que deu nome ao arraial — "heliotrópios arbustivos de
  // caule oco, pintalgado de branco e flores em espiga", de que se faziam os "canudos
  // de metro de extensão" dos cachimbos, "vicejantes em grande cópia à beira do rio".
  // Touceira de varas retas e finas, pintalgadas, umas folhas compridas e a espiga
  // clara de flor na ponta.
  canudo(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 2.37);
    const stems = 5 + Math.floor(rand(1) * 4);
    for (let i = 0; i < stems; i++) {
      const angle = i / stems * Math.PI * 2 + rand(10 + i);
      const height = 6 + rand(20 + i) * 5;
      const stem = this.#limb(plant, Math.cos(angle) * .8, 0, Math.sin(angle) * .8, angle, .06 + rand(30 + i) * .18,
        height, .4, PALETTE.canudoStem, .8);
      // Pintas brancas no caule.
      for (let k = 0; k < 3; k++) {
        stem.add(this.#block(shadedBox(.46, .3, .46, .95, 1.05), PALETTE.flower, 0, height * (.25 + k * .22), 0, false));
      }
      // Folha larga e curta de heliotrópio, meio de pé, só na metade de baixo.
      for (let k = 0; k < 2; k++) {
        this.#blade(stem, 0, height * (.2 + k * .18), 0, k * Math.PI + rand(40 + i), .65, 1.5, 1, PALETTE.canudoLeaf);
      }
      // A espiga de flor: grossa e reta, na ponta da vara.
      stem.add(this.#block(shadedBox(.55, 1.6, .55, .9, 1.1), PALETTE.canudoFlower, 0, height + .7, 0, false));
    }
    return plant;
  }

  // Cabeça-de-frade: "deselegantes e monstruosos melocactos de forma elipsoidal,
  // acanalada, de gomos espinescentes, convergindo-lhes no vértice superior formado
  // uma flor única intensamente rubra". Uma a três bolas verdes de gomos fundos, com
  // o capuz vermelho no alto.
  cabecafrade(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 5.89);
    const count = 1 + Math.floor(rand(1) * 3);
    for (let i = 0; i < count; i++) {
      const size = 1.2 + rand(10 + i) * .6;
      const x = i ? (rand(20 + i) - .5) * 4 : 0, z = i ? (rand(30 + i) - .5) * 4 : 0;
      const body = new THREE.SphereGeometry(size, 14, 8);
      const position = body.attributes.position;
      for (let v = 0; v < position.count; v++) {
        const px = position.getX(v), py = position.getY(v), pz = position.getZ(v);
        const rib = 1 + Math.cos(Math.atan2(pz, px) * 12) * .07;
        position.setXYZ(v, px * rib, py * 1.1, pz * rib);
      }
      body.computeVertexNormals();
      plant.add(this.#block(addVerticalShade(body, .7, 1.08), PALETTE.melocactus, x, size * .9, z));
      plant.add(this.#block(addVerticalShade(new THREE.CylinderGeometry(size * .45, size * .55, size * .7, 10), .9, 1.1),
        PALETTE.cephalium, x, size * 2.05, z));
    }
    return plant;
  }

  // Palmatória ("as palmatórias-do-inferno, opúntias de palmas diminutas,
  // diabolicamente erriçadas de espinhos [...] orladas de flores rutilantes"): raquetes
  // ovais e chatas, uma brotando da borda da outra, verde-acinzentadas, com as flores
  // vermelho-alaranjadas na beira.
  palmatoria(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 3.33);
    let n = 0;
    const pad = (parent, y, angle, lean, size, depth) => {
      const holder = new THREE.Group();
      holder.position.set(0, y, 0);
      holder.rotation.set(0, angle, lean);
      const shape = new THREE.SphereGeometry(1, 8, 6);
      shape.scale(size * .75, size, size * .22);
      holder.add(this.#block(addVerticalShade(shape, .75, 1.08), PALETTE.palmatoria, 0, size * .9, 0));
      parent.add(holder);
      n++;
      if (rand(10 + n) > .45) {
        holder.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.5, 0), .95, 1.05), PALETTE.cactusFlower,
          size * .5, size * 1.6, 0, false));
      }
      if (depth <= 0) return;
      const children = 1 + Math.floor(rand(20 + n) * 2);
      for (let k = 0; k < children; k++) {
        pad(holder, size * 1.6, (rand(30 + n + k) - .5) * 1.6, (k ? 1 : -1) * (.3 + rand(40 + n) * .4), size * .85, depth - 1);
      }
    };
    const clumps = 1 + Math.floor(rand(1) * 2);
    for (let i = 0; i < clumps; i++) {
      const holder = new THREE.Group();
      holder.position.set(i * 2.2, 0, (rand(2 + i) - .5) * 2);
      plant.add(holder);
      pad(holder, 0, rand(3 + i) * 3, (rand(4 + i) - .5) * .4, 1.5 + rand(5 + i) * .5, 2);
    }
    return plant;
  }

  // Pedra de granito do sertão: um matacão arredondado de blocos tortos (às vezes com
  // outro menor encostado) ou um lajedo baixo e largo.
  rock(seed) {
    const rock = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 8.53);
    const tones = [PALETTE.rock, PALETTE.rockLight, PALETTE.rockWarm];
    if (rand(1) < .3) {
      const wide = 9 + rand(2) * 8;
      const slab = this.#block(shadedBox(wide, 1.4, wide * (.6 + rand(3) * .3), .7, 1.08), tones[2], 0, .6, 0);
      slab.rotation.y = rand(4) * 3;
      rock.add(slab);
      return rock;
    }
    // Matacão: o corpo largo, um capuz menor e girado por cima (arredonda a silhueta)
    // e uma ou duas lascas encostadas no pé.
    const size = 6 + rand(5) * 5;
    const body = this.#block(shadedBox(size, size * .55, size * .8, .7, 1.12), tones[0], 0, size * .25, 0);
    body.rotation.set((rand(6) - .5) * .25, rand(7) * 3, (rand(8) - .5) * .25);
    rock.add(body);
    const cap = this.#block(shadedBox(size * .7, size * .32, size * .6, .85, 1.15), tones[1], (rand(9) - .5) * size * .2, size * .58, (rand(10) - .5) * size * .2);
    cap.rotation.set((rand(11) - .5) * .3, rand(12) * 3, (rand(13) - .5) * .3);
    rock.add(cap);
    const chips = 1 + Math.floor(rand(14) * 2);
    for (let i = 0; i < chips; i++) {
      const angle = rand(20 + i) * Math.PI * 2;
      const s = size * (.3 + rand(30 + i) * .2);
      const chip = this.#block(shadedBox(s, s * .6, s * .8, .7, 1.1), tones[2],
        Math.cos(angle) * size * .55, s * .25, Math.sin(angle) * size * .5);
      chip.rotation.set((rand(40 + i) - .5) * .5, rand(50 + i) * 3, (rand(60 + i) - .5) * .5);
      rock.add(chip);
    }
    return rock;
  }

  // Lascas de talcoxisto, a pedra das colinas de Canudos ("rasgadas de lascas de
  // talcoxisto"): placas finas e chatas, todas inclinadas para o mesmo lado — o
  // folheado da rocha —, encavaladas como telha quebrada, cinza-esverdeadas e de
  // brilho sedoso. Às vezes só um lajedo baixo de placas deitadas.
  lasca(seed) {
    const rock = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 7.07);
    const tones = [PALETTE.schist, PALETTE.schistLight, PALETTE.schistDark];
    const heading = rand(1) * Math.PI;
    const dip = rand(2) < .3 ? .08 : .35 + rand(3) * .35;
    const plates = 3 + Math.floor(rand(4) * 3);
    for (let i = 0; i < plates; i++) {
      const wide = 3 + rand(10 + i) * 4.5;
      const plate = this.#block(shadedBox(wide, .5 + rand(20 + i) * .5, 1.6 + rand(30 + i) * 2.4, .75, 1.12),
        tones[i % 3], (i - plates / 2) * 1.2, .5 + rand(40 + i) * .8, (rand(50 + i) - .5) * 2.5);
      plate.rotation.set((rand(60 + i) - .5) * .2, heading + (rand(70 + i) - .5) * .3, dip + (rand(80 + i) - .5) * .15, 'YXZ');
      rock.add(plate);
    }
    return rock;
  }

  // ---- A mata atlântica do litoral (missão dos tupinambás) ----

  // Pindoba: a palmeira de cuja folha se cobriam as casas ("coberta da palma, a que
  // os índios chamam pindoba", Soares, cap. CLI). Tronco único, um tico torto, com os
  // anéis das folhas que caíram; no alto, o leque de folhas compridas e arqueadas, os
  // folíolos dos dois lados da ráquis, uma ou outra secando, e o cacho de cocos.
  pindoba(seed) {
    const palm = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 3.31);
    const height = 20 + rand(1) * 8;
    const lean = rand(2) * Math.PI * 2;
    const low = this.#limb(palm, 0, 0, 0, lean, .04 + rand(3) * .06, height * .55, 1.5, PALETTE.palmTrunk, .9);
    const high = this.#limb(low, 0, height * .55, 0, Math.PI, .05 + rand(4) * .05, height * .45, 1.35, PALETTE.palmTrunk, .85);
    for (let i = 1; i < 6; i++) low.add(this.#block(shadedBox(1.7, .25, 1.7, .8, 1), PALETTE.barkDark, 0, height * .55 * i / 6, 0, false));
    const crown = new THREE.Group();
    crown.position.set(0, height * .45, 0);
    high.add(crown);
    const fronds = 9 + Math.floor(rand(5) * 4);
    for (let f = 0; f < fronds; f++) {
      const angle = f / fronds * Math.PI * 2 + rand(10 + f) * .4;
      const up = f % 3 === 0;
      const color = rand(20 + f) < .12 ? PALETTE.palmLeafDry : f % 2 ? PALETTE.palmLeaf : PALETTE.palmLeafDark;
      const first = this.#limb(crown, 0, 0, 0, angle, up ? .5 : .95, 5.5, .32, color, .8);
      const second = this.#limb(first, 0, 5.5, 0, 0, up ? .5 : .75, 5.5, .26, color, .6);
      for (const segment of [first, second]) {
        for (let k = 1; k <= 4; k++) {
          for (const side of [-1, 1]) this.#blade(segment, 0, 5.5 * k / 4.4, 0, side * Math.PI / 2, 1.85, 3.2 - k * .25, .5, color);
        }
      }
    }
    for (let i = 0; i < 6; i++) {
      const angle = rand(40 + i) * Math.PI * 2;
      crown.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.75, 0), .8, 1.05), PALETTE.palmFruit,
        Math.cos(angle) * 1.2, -1.2 - rand(50 + i), Math.sin(angle) * 1.2, false));
    }
    return palm;
  }

  // Ibirapitanga, o pau-brasil ("pau vermelho"): tronco escuro e reto, galhos que
  // abrem no alto, a copa irregular de folhinhas miúdas verde-escuras e os cachos de
  // flor amarela. É a árvore que deu nome à terra depois de 1500.
  ibirapitanga(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 4.13);
    const bark = PALETTE.brazilBark;
    const trunkHeight = 11 + rand(1) * 3;
    const trunk = this.#limb(tree, 0, 0, 0, rand(2) * 6.28, rand(3) * .1, trunkHeight, 1.6, bark, .72);
    tree.add(this.#block(addVerticalShade(new THREE.CylinderGeometry(1, 1.6, 1, 6), .55, 1), bark, 0, .4, 0));
    const tones = [PALETTE.brazilLeaf, PALETTE.leafDark, PALETTE.leafMid];
    tree.add(this.#block(leafBlob(6, .55, 1, seed + 1, .3), tones[1], 0, trunkHeight + 4.5, 0));
    const branches = 4 + Math.floor(rand(4) * 2);
    for (let i = 0; i < branches; i++) {
      const length = 6 + rand(10 + i) * 2.5;
      const limb = this.#limb(trunk, 0, trunkHeight * (.72 + rand(20 + i) * .2), 0, i / branches * Math.PI * 2 + rand(30 + i),
        .6 + rand(40 + i) * .35, length, .85, bark);
      limb.add(this.#block(leafBlob(3.2 + rand(50 + i) * 1.2, .62, 1, seed + 10 + i, .4), tones[i % 3], 0, length + .5, 0));
      for (let k = 0; k < 3; k++) {
        limb.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.42, 0), .95, 1.05), PALETTE.brazilFlower,
          (rand(60 + i * 3 + k) - .5) * 4, length + 1.5 + rand(70 + k) * 1.5, (rand(80 + i * 3 + k) - .5) * 4, false));
      }
    }
    return tree;
  }

  // Jequitibá: a árvore grande da mata, de tronco alto e claro, com as sapopembas
  // (raízes em tábua) no pé e a copa larga lá em cima, acima das outras.
  jequitiba(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 5.71);
    const bark = PALETTE.jequitibaBark;
    const trunkHeight = 20 + rand(1) * 6;
    const trunk = this.#limb(tree, 0, 0, 0, rand(2) * 6.28, rand(3) * .05, trunkHeight, 2.4, bark, .7);
    for (let i = 0; i < 4; i++) {
      const angle = i / 4 * Math.PI * 2 + rand(4 + i) * .6;
      const root = this.#block(shadedBox(.6, 3.2, 4, .6, 1), bark, Math.cos(angle) * 1.6, 1.4, Math.sin(angle) * 1.6);
      root.rotation.y = -angle + Math.PI / 2;
      tree.add(root);
    }
    const tones = [PALETTE.jequitibaLeaf, PALETTE.jequitibaLeafLight, PALETTE.leafDark];
    const spread = 9 + rand(5) * 3;
    tree.add(this.#block(leafBlob(spread * .8, .45, 1, seed + 3, .3), tones[2], 0, trunkHeight + 3, 0));
    const branches = 5;
    for (let i = 0; i < branches; i++) {
      const length = 7 + rand(10 + i) * 3;
      const limb = this.#limb(trunk, 0, trunkHeight - 1.5 - rand(20 + i) * 3, 0, i / branches * Math.PI * 2 + rand(30 + i) * .6,
        .85 + rand(40 + i) * .3, length, 1.2, bark);
      limb.add(this.#block(leafBlob(4 + rand(50 + i) * 1.4, .55, 1, seed + 20 + i, .35), tones[i % 2], 0, length + 1, 0));
    }
    tree.add(this.#block(leafBlob(5, .6, 1, seed + 9, .35), tones[1], 0, trunkHeight + 6, 0));
    return tree;
  }

  // Embaúba: a árvore que toma a clareira e a capoeira, de tronco fino e branco com os
  // anéis, poucos galhos subindo em candelabro e, na ponta de cada um, a roda de
  // folhas grandes e recortadas, verde-acinzentadas, de avesso prateado.
  embauba(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 2.87);
    const bark = PALETTE.embaubaBark;
    const height = 13 + rand(1) * 5;
    const trunk = this.#limb(tree, 0, 0, 0, rand(2) * 6.28, rand(3) * .12, height, 1.05, bark, .75);
    for (let i = 1; i < 7; i++) trunk.add(this.#block(shadedBox(1.15, .18, 1.15, .8, 1), PALETTE.bark, 0, height * i / 7, 0, false));
    const crown = (parent, y) => {
      const leaves = 7;
      for (let k = 0; k < leaves; k++) {
        const color = k % 3 === 0 ? PALETTE.embaubaLeafUnder : PALETTE.embaubaLeaf;
        this.#blade(parent, 0, y, 0, k / leaves * Math.PI * 2 + rand(60 + k), 1.15 + rand(70 + k) * .3, 4.2, 2, color);
      }
    };
    crown(trunk, height);
    const arms = 2 + Math.floor(rand(4) * 2);
    for (let i = 0; i < arms; i++) {
      const length = 4 + rand(10 + i) * 2;
      const arm = this.#limb(trunk, 0, height * (.62 + i * .1), 0, i / arms * Math.PI * 2 + rand(20 + i), .5, length, .55, bark);
      const rise = this.#limb(arm, 0, length, 0, Math.PI, .45, 2.5, .45, bark);
      crown(rise, 2.5);
    }
    return tree;
  }

  // Pitangueira, da restinga e da capoeira: arvoreta de vários troncos finos e a copa
  // fechada, verde-escura, salpicada das pitangas vermelhas.
  pitangueira(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 6.07);
    const stems = 2 + Math.floor(rand(1) * 2);
    for (let s = 0; s < stems; s++) {
      this.#limb(tree, 0, 0, 0, s / stems * Math.PI * 2 + rand(10 + s), .2 + rand(20 + s) * .2, 4 + rand(30 + s) * 2, .7, PALETTE.bark, .7);
    }
    tree.add(this.#block(leafBlob(5, .7, 1, seed + 2, .3), PALETTE.pitangaLeaf, 0, 7, 0));
    for (let i = 0; i < 4; i++) {
      const angle = i / 4 * Math.PI * 2 + rand(40 + i);
      tree.add(this.#block(leafBlob(2.8, .75, 1, seed + 10 + i, .4), i % 2 ? PALETTE.leafMid : PALETTE.pitangaLeaf,
        Math.cos(angle) * 3.2, 6 + rand(50 + i) * 2, Math.sin(angle) * 3.2));
    }
    for (let i = 0; i < 12; i++) {
      const angle = rand(60 + i) * Math.PI * 2, up = rand(70 + i);
      tree.add(this.#block(addVerticalShade(new THREE.IcosahedronGeometry(.38, 0), .9, 1.05), PALETTE.pitangaFruit,
        Math.cos(angle) * 4.6 * (1 - up * .4), 5 + up * 4, Math.sin(angle) * 4.6 * (1 - up * .4), false));
    }
    return tree;
  }

  // Samambaia: as frondes compridas saindo do meio e arqueando para fora.
  samambaia(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 2.11);
    const fronds = 8 + Math.floor(rand(1) * 4);
    for (let i = 0; i < fronds; i++) {
      const color = i % 2 ? PALETTE.fern : PALETTE.fernDark;
      const base = this.#blade(plant, 0, .2, 0, i / fronds * Math.PI * 2 + rand(10 + i) * .5, .55 + rand(20 + i) * .25, 2.6, 1.4, color);
      this.#blade(base, 0, 2.6, 0, 0, .7 + rand(30 + i) * .3, 2.6, 1.2, color);
    }
    return plant;
  }

  // Gravatá (bromélia): a roseta de folhas duras abrindo do chão, o miolo vermelho.
  bromelia(seed) {
    const plant = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 1.77);
    const leaves = 10 + Math.floor(rand(1) * 4);
    for (let i = 0; i < leaves; i++) {
      this.#blade(plant, 0, .1, 0, i / leaves * Math.PI * 2 + rand(10 + i) * .3, .6 + rand(20 + i) * .55, 3 + rand(30 + i), .9, PALETTE.bromelia);
    }
    for (let i = 0; i < 4; i++) this.#blade(plant, 0, .3, 0, i * 1.6, .25, 1.6, .7, PALETTE.bromeliaRed);
    return plant;
  }

  // Taquara: a touceira de canas finas e nodosas, arqueando no alto com as folhinhas;
  // é dela que se faziam as flechas.
  taquara(seed) {
    const clump = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 3.03);
    const canes = 6 + Math.floor(rand(1) * 4);
    for (let i = 0; i < canes; i++) {
      const angle = i / canes * Math.PI * 2 + rand(10 + i);
      const height = 9 + rand(20 + i) * 6;
      const low = this.#limb(clump, Math.cos(angle) * .8, 0, Math.sin(angle) * .8, angle, .08 + rand(30 + i) * .15, height, .38, PALETTE.taquara, .85);
      for (let n = 1; n < 5; n++) low.add(this.#block(shadedBox(.48, .16, .48, .8, 1), PALETTE.taquaraNode, 0, height * n / 5, 0, false));
      const top = this.#limb(low, 0, height, 0, 0, .45 + rand(40 + i) * .3, height * .45, .28, PALETTE.taquara, .6);
      for (let k = 0; k < 4; k++) {
        this.#blade(top, 0, height * .45 * (.3 + k * .2), 0, rand(50 + i * 4 + k) * 6.28, 1.3, 1.8, .34, PALETTE.taquaraLeaf);
      }
    }
    return clump;
  }

  // Moita da restinga: arbustos baixos e fechados, achatados pelo vento do mar.
  restinga(seed) {
    const shrub = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 4.41);
    const lumps = 3 + Math.floor(rand(1) * 2);
    for (let i = 0; i < lumps; i++) {
      const angle = i / lumps * Math.PI * 2 + rand(10 + i);
      shrub.add(this.#block(leafBlob(2.4 + rand(20 + i) * 1.2, .55, 1, seed + i * 7, .4), i % 2 ? PALETTE.restinga : PALETTE.restingaLight,
        Math.cos(angle) * 2, 1.4, Math.sin(angle) * 2));
    }
    return shrub;
  }

  // Costão: os matacões de granito nas pontas da enseada, onde o mar bate.
  costao(seed) {
    const rock = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 9.17);
    const tones = [PALETTE.rock, PALETTE.rockLight, PALETTE.rockWarm];
    const stones = 3 + Math.floor(rand(1) * 2);
    for (let i = 0; i < stones; i++) {
      const size = 7 + rand(10 + i) * 8;
      const angle = rand(20 + i) * Math.PI * 2;
      const stone = this.#block(shadedBox(size, size * .62, size * .85, .65, 1.12), tones[i % 3],
        Math.cos(angle) * size * .45, size * .26, Math.sin(angle) * size * .45);
      stone.rotation.set((rand(30 + i) - .5) * .3, rand(40 + i) * 3, (rand(50 + i) - .5) * .3);
      rock.add(stone);
    }
    return rock;
  }

  // ---- Comida ----

  // Roça de sertanejo — "as raras roças de milho ou mandioca" de Os Sertões. Sem
  // canteiro: cada pé nasce direto da terra, na sua cova (um montinho de terra
  // revolvida), espalhados como roça aberta à enxada e não em grade. A mandioca é o
  // que se colhe: hastes finas e nodosas, cinza-pardas, com a copa de folhas em mão
  // aberta (folíolos compridos em leque, de pecíolo avermelhado). O milho fica na
  // beira, mais alto, de folha comprida arqueada, com o pendão no alto e a espiga na
  // palha no meio da haste.
  // O milho vem primeiro na malha fundida e os pés de mandioca depois, um atrás do
  // outro: `userData.ends[k]` é onde a malha termina com k pés de mandioca, e a roça
  // mostra só os que ainda não foram colhidos (FoodRenderer, drawRange).
  roca(seed) {
    const rand = i => pseudoRandom(seed + i * 1.93);
    const plot = new THREE.Group();
    const corn = new THREE.Group();
    plot.add(corn);
    const stalks = 2 + Math.floor(rand(1) * 2);
    for (let i = 0; i < stalks; i++) {
      const angle = rand(2 + i) * Math.PI * 2;
      const r = 6.5 + rand(6 + i) * 1.5;
      corn.add(this.#corn(Math.cos(angle) * r, Math.sin(angle) * r, j => rand(40 + i * 17 + j)));
    }
    // Mandioca num disco, em espiral de ângulo áureo com sorteio: cheio sem fileira.
    const cassavas = [];
    for (let i = 0; i < ROCA_PLANTS; i++) {
      const angle = i * 2.4 + rand(10 + i) * .8;
      const r = 1.4 + Math.sqrt((i + .5) / ROCA_PLANTS) * 4.6 + (rand(20 + i) - .5) * 1.2;
      const plant = this.#cassava(Math.cos(angle) * r, Math.sin(angle) * r, j => rand(100 + i * 31 + j));
      cassavas.push(plant);
      plot.add(plant);
    }
    const ends = [PropFactory.#vertices(corn)];
    for (const plant of cassavas) ends.push(ends.at(-1) + PropFactory.#vertices(plant));
    const prop = PropFactory.#merge(plot);
    prop.userData.ends = ends;
    return prop;
  }

  // Cova: dois montinhos de terra revolvida, girados e de tamanho sorteado, um sobre
  // o outro — lê como chão cavado, não como base de maquete.
  #mound(parent, rand, size) {
    for (let k = 0; k < 2; k++) {
      const width = size * (1 - k * .35) * (.85 + rand(1 + k) * .3);
      const mound = this.#block(shadedBox(width, .5 - k * .12, width * (.65 + rand(3 + k) * .3), .72, 1.04),
        k ? PALETTE.tilled : PALETTE.tilledDark, (rand(5 + k) - .5) * .5, .12 + k * .22, (rand(7 + k) - .5) * .5);
      mound.rotation.y = rand(9 + k) * Math.PI;
      parent.add(mound);
    }
  }

  // Pé de mandioca: duas ou três hastes abrindo da cova, com nós, e no alto de cada
  // uma a copa de folhas palmadas; uma folha mais baixa e menor no meio da haste.
  #cassava(x, z, rand) {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.rotation.y = rand(0) * Math.PI * 2;
    this.#mound(plant, rand, 2.6);
    const stems = 2 + Math.floor(rand(11) * 1.6);
    for (let s = 0; s < stems; s++) {
      const height = 4.4 + rand(12 + s) * 2.4;
      const angle = s / stems * Math.PI * 2 + rand(14 + s);
      const stem = this.#limb(plant, 0, .35, 0, angle, .1 + rand(16 + s) * .16, height, .32, PALETTE.cassavaStem);
      stem.add(this.#block(shadedBox(.44, .2, .44, .8, 1), PALETTE.cassavaNode, 0, height * .45, 0, false));
      this.#palmate(stem, height, rand(20 + s) * Math.PI * 2, 1, j => rand(30 + s * 13 + j));
      this.#palmate(stem, height - .2, rand(24 + s) * Math.PI * 2 + 2.5, .9, j => rand(60 + s * 13 + j));
      this.#palmate(stem, height * .62, rand(28 + s) * Math.PI * 2, .7, j => rand(90 + s * 13 + j));
    }
    return plant;
  }

  // Folha de mandioca: o pecíolo avermelhado sai da haste para fora e para cima, e
  // na ponta dele abrem-se em leque cinco a sete folíolos compridos e estreitos,
  // os do meio maiores, todos caindo um pouco nas pontas.
  #palmate(stem, y, heading, scale, rand) {
    const leaf = new THREE.Group();
    leaf.position.set(0, y, 0);
    leaf.rotation.y = heading;
    stem.add(leaf);
    const petiole = 1.5 * scale;
    const lean = .95;
    this.#limb(leaf, 0, 0, 0, 0, lean, petiole, .13, PALETTE.cassavaPetiole);
    const tipX = Math.sin(lean) * petiole, tipY = Math.cos(lean) * petiole;
    const lobes = 5 + Math.floor(rand(1) * 3);
    for (let i = 0; i < lobes; i++) {
      const side = i / (lobes - 1) - .5;
      const length = 2.3 * scale * (1 - Math.abs(side) * .45) * (.9 + rand(2 + i) * .2);
      const color = i % 2 ? PALETTE.cassavaLeaf : PALETTE.cassavaLeafLight;
      this.#blade(leaf, tipX, tipY, 0, side * 2.6, 1.45 + Math.abs(side) * .5 + rand(10 + i) * .15, length, .55 * scale, color);
    }
  }

  // Pé de milho na beira da roça: haste alta e um pouco torta, folhas compridas
  // alternadas que sobem e arqueiam (as de baixo já secando), o pendão cor de palha
  // no alto e a espiga na palha, com o cabelo, no meio da haste.
  #corn(x, z, rand) {
    const plant = new THREE.Group();
    plant.position.set(x, 0, z);
    plant.rotation.y = rand(0) * Math.PI * 2;
    this.#mound(plant, rand, 2);
    const height = 9 + rand(1) * 3;
    const stalk = this.#limb(plant, 0, .3, 0, rand(2) * Math.PI * 2, .04 + rand(3) * .06, height, .42, PALETTE.cornStalk);
    for (let n = 1; n <= 2; n++) {
      stalk.add(this.#block(shadedBox(.52, .22, .52, .8, 1), PALETTE.cornLeafDry, 0, height * n / 3, 0, false));
    }
    const leaves = 7;
    for (let i = 0; i < leaves; i++) {
      const at = height * (.12 + .7 * i / leaves);
      const holder = new THREE.Group();
      holder.position.set(0, at, 0);
      holder.rotation.y = i * Math.PI + (rand(10 + i) - .5) * .7;
      stalk.add(holder);
      const dry = i < 2;
      const length = 3.2 - i * .15;
      // Folha em dois trechos: sobe rente à haste e depois arqueia para fora e para baixo.
      const base = this.#blade(holder, 0, 0, 0, 0, .55, length * .45, .62, dry ? PALETTE.cornLeafDry : PALETTE.cornLeaf);
      this.#blade(base, 0, length * .45, 0, 0, 1.05 + rand(20 + i) * .35, length * .6, .5, dry || i % 3 === 2 ? PALETTE.cornLeafDry : PALETTE.cornLeaf);
    }
    for (let t = 0; t < 5; t++) {
      this.#blade(stalk, 0, height, 0, t * 1.26 + rand(30 + t), .25 + rand(35 + t) * .4, 1.6, .16, PALETTE.cornTassel);
    }
    const ear = this.#limb(stalk, 0, height * .52, 0, rand(40) * Math.PI * 2, .38, 2.2, .7, PALETTE.cornHusk);
    ear.add(this.#block(shadedBox(.3, .5, .3, .9, 1.05), PALETTE.cornSilk, 0, 2.5, 0, false));
    return plant;
  }

  // Uma lâmina de folha (bladeShape) nascendo em (x, y, z) do pai, apontando para
  // `angle` no chão e inclinada `tilt` a partir da vertical, como #limb. Devolve o
  // grupo: (0, comprimento, 0) é a ponta, para emendar outra lâmina.
  #blade(parent, x, y, z, angle, tilt, length, width, color) {
    const blade = new THREE.Group();
    blade.position.set(x, y, z);
    blade.rotation.set(0, -angle, -tilt, 'YXZ');
    blade.add(this.#block(bladeShape(length, width), color, 0, 0, 0));
    parent.add(blade);
    return blade;
  }

  // Quantos vértices um pedaço da planta ocupa depois de fundido (#merge desfaz os
  // índices: cada triângulo vira três vértices).
  static #vertices(group) {
    let count = 0;
    group.traverse(node => {
      if (node.isMesh) count += node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count;
    });
    return count;
  }

  // ---- Montagem ----

  // Coluna de cacto com costelas: o gomo e duas faixas mais escuras de cada lado; a
  // ponta mais clara, e às vezes a flor branca. Devolve a coluna.
  #column(parent, x, y, z, width, height, flower) {
    const column = new THREE.Group();
    column.position.set(x, y, z);
    column.add(this.#block(shadedBox(width, height, width, .62, 1.08), PALETTE.mandacaru, 0, height / 2, 0));
    for (const side of [-1, 1]) {
      column.add(this.#block(shadedBox(.35, height * .92, width * .5, .6, 1), PALETTE.mandacaruRib,
        side * (width / 2 + .1), height * .48, 0, false));
    }
    column.add(this.#block(shadedBox(width * .8, .9, width * .8, .9, 1.1), PALETTE.mandacaruTip, 0, height + .4, 0, false));
    if (flower) column.add(this.#block(shadedBox(1.4, 1.2, 1.4, .95, 1.05), PALETTE.flower, 0, height + 1.2, 0, false));
    parent.add(column);
    return column;
  }

  // Galho que nasce em (x, y, z) do pai, aponta para `angle` no chão e se inclina
  // `tilt` a partir da vertical. Devolve o grupo: (0, comprimento, 0) é a ponta.
  // Roliço e afinando até `taper` da grossura do pé — galho de verdade, não ripa;
  // cinco lados nos finos, seis nos grossos, que levam também a casca manchada.
  #limb(parent, x, y, z, angle, tilt, length, width, color, taper = .65) {
    const limb = new THREE.Group();
    limb.position.set(x, y, z);
    limb.rotation.set(0, -angle, -tilt, 'YXZ');
    const radius = width * .52;
    const thick = width >= .8;
    const wood = new THREE.CylinderGeometry(radius * taper, radius, length + width * .5, thick ? 6 : 5, thick ? 3 : 1);
    limb.add(this.#block(mottle(addVerticalShade(wood, .7, 1.02), thick ? .3 : .12), color, 0, length / 2, 0));
    parent.add(limb);
    return limb;
  }

  // Um bloco de montagem com a cor (levemente variada, para a mata não sair chapada).
  #block(geometry, color, x, y, z, vary = true) {
    const mesh = new THREE.Mesh(geometry, ASSEMBLY);
    mesh.position.set(x, y, z);
    const tint = new THREE.Color(color);
    if (vary) tint.offsetHSL((Math.random() - .5) * .02, (Math.random() - .5) * .06, (Math.random() - .5) * .05);
    mesh.userData.tint = tint;
    return mesh;
  }

  // Funde a planta montada numa malha só: cada bloco vira triângulos soltos já na
  // posição final, com a cor dele multiplicada pelo degradê de sombra da geometria.
  static #merge(group) {
    group.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const parts = [];
    let count = 0;
    group.traverse(node => {
      if (!node.isMesh) return;
      const geometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld));
      parts.push({ geometry, tint: node.userData.tint ?? new THREE.Color(0xffffff) });
      count += geometry.attributes.position.count;
    });
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    let offset = 0;
    for (const { geometry, tint } of parts) {
      const position = geometry.attributes.position;
      const normal = geometry.attributes.normal;
      const shade = geometry.attributes.color;
      for (let i = 0; i < position.count; i++, offset++) {
        positions.set([position.getX(i), position.getY(i), position.getZ(i)], offset * 3);
        normals.set([normal.getX(i), normal.getY(i), normal.getZ(i)], offset * 3);
        const k = shade ? shade.getX(i) : 1;
        colors.set([tint.r * k, tint.g * k, tint.b * k], offset * 3);
      }
      geometry.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, PLANT_MATERIAL);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const prop = new THREE.Group();
    prop.add(mesh);
    return prop;
  }
}
