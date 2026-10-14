import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { shadedBox } from './Shading.js';
import { createContactShadow, isContactShadowShape } from './ContactShadow.js';

// Um material só para toda a vegetação: a cor de cada bloco vai nos vértices.
const PLANT_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });
// Peça de montagem: o material de verdade é o de cima; este só segura o lugar até a
// planta ser fundida numa malha só.
const ASSEMBLY = new THREE.MeshBasicMaterial();

// A caatinga de blocos: catingueira, umbuzeiro, mandacaru, xique-xique, macambira,
// garrancho seco, pedras de granito e as roças. Cada planta é montada de blocos (com
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
    rock: seed => this.rock(seed)
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
    const prop = PropFactory.#merge(builder(seed));
    if (withShadow) prop.add(createContactShadow(PropFactory.footprint(kind)));
    return prop;
  }

  // Raio da mancha de contato de cada espécie, em unidades.
  static footprint(kind) {
    return {
      umbuzeiro: 13, catingueira: 9, mandacaru: 6, xiquexique: 6, rock: 7, macambira: 5, garrancho: 5
    }[kind] ?? 6;
  }

  // Altura aproximada de cada espécie crescida, em unidades: até onde ela tapa quem
  // está atrás (OcclusionFader).
  static height(kind) {
    return {
      umbuzeiro: 18, catingueira: 24, mandacaru: 30, xiquexique: 8, rock: 7, macambira: 6, garrancho: 7
    }[kind] ?? 10;
  }

  // ---- Árvores (dão madeira) ----

  // Catingueira na seca: tronco fino de casca clara, quase branca — é o que dá à
  // caatinga o nome de "mata branca" —, abrindo em três ou quatro galhos tortos, cada
  // um com galhinhos e uns tufos ralos de folha miúda, oliva e amarelada. Uma em
  // cada quatro está quase pelada.
  catingueira(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 7.31);
    const trunkHeight = 6 + rand(1) * 4;
    const bark = rand(2) > .5 ? PALETTE.bark : PALETTE.barkLight;
    const lean = (rand(3) - .5) * .2;
    const trunk = this.#limb(tree, 0, 0, 0, rand(4) * 6.28, Math.abs(lean), trunkHeight, 1.8, bark);
    const bare = rand(5) < .25;
    const tones = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.leafLight, PALETTE.leafDry];
    const branches = 3 + Math.floor(rand(6) * 2);
    for (let i = 0; i < branches; i++) {
      const angle = i / branches * Math.PI * 2 + rand(10 + i) * .8;
      const length = 6 + rand(20 + i) * 5;
      const tilt = .45 + rand(30 + i) * .45;
      const limb = this.#limb(trunk, 0, trunkHeight - .4, 0, angle, tilt, length, 1.1, bark);
      const twigs = [limb];
      for (let k = 0; k < 2; k++) {
        twigs.push(this.#limb(limb, 0, length * (.55 + k * .25), 0, (k ? 1 : -1) * (.8 + rand(40 + i + k)),
          .5 + rand(50 + i + k) * .3, length * .45, .6, bark));
      }
      if (bare) continue;
      // Tufos de folha miúda nas pontas: três ou quatro plaquinhas desencontradas.
      for (const [index, twig] of twigs.entries()) {
        const tip = index ? length * .45 : length;
        for (let k = 0; k < 3; k++) {
          const size = 2.2 + rand(60 + i * 3 + index + k) * 2.2;
          const pad = this.#block(shadedBox(size, size * .45, size * .9, .75, 1.1),
            tones[Math.floor(rand(70 + i + index + k) * tones.length)],
            (rand(80 + k + i) - .5) * 2.4, tip + (rand(90 + k) - .3) * 1.4, (rand(100 + k + index) - .5) * 2.4);
          pad.rotation.z = tilt;
          twig.add(pad);
        }
      }
    }
    return tree;
  }

  // Umbuzeiro: tronco curto e grosso que logo se abre em galhos baixos quase deitados,
  // e a copa larga em guarda-chuva, verde-escura, feita de tufos que se encostam —
  // a única sombra verde da caatinga na seca —, com os umbus amarelando na barra.
  umbuzeiro(seed) {
    const tree = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 5.17);
    const trunkHeight = 4 + rand(1) * 2;
    const trunk = this.#block(shadedBox(3.4, trunkHeight, 3.4, .55, 1), PALETTE.barkDark, 0, trunkHeight / 2, 0);
    tree.add(trunk);
    for (let i = 0; i < 4; i++) {
      this.#limb(tree, 0, trunkHeight - .8, 0, i / 4 * Math.PI * 2 + rand(i), 1.05, 7 + rand(10 + i) * 2, 1.4, PALETTE.barkDark);
    }
    const spread = 8 + rand(2) * 2.5;
    const crown = trunkHeight + 4;
    const tones = [PALETTE.umbuLeaf, PALETTE.umbuLeafDark, PALETTE.umbuLeafLight];
    // Anel de baixo, largo, e um miolo mais alto: a cúpula achatada.
    const clumps = [[0, 0, 3.6, 10]];
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2 + rand(20 + i) * .5;
      clumps.push([Math.cos(angle) * spread * .75, Math.sin(angle) * spread * .75, 1.2 + rand(30 + i) * 1.2, 5 + rand(40 + i) * 2.5]);
    }
    for (let i = 0; i < 3; i++) {
      const angle = i / 3 * Math.PI * 2 + 1 + rand(50 + i);
      clumps.push([Math.cos(angle) * spread * .35, Math.sin(angle) * spread * .35, 3.2 + rand(60 + i) * 1.2, 5 + rand(70 + i) * 2]);
    }
    clumps.forEach(([x, z, rise, size], i) => {
      const clump = this.#block(shadedBox(size, size * .42, size, .6, 1.12), tones[i % tones.length], x, crown + rise, z);
      clump.rotation.y = rand(80 + i) * 1.5;
      tree.add(clump);
    });
    // Umbus amarelos pendurados na barra da copa.
    for (let i = 0; i < 7; i++) {
      const angle = rand(90 + i) * Math.PI * 2;
      tree.add(this.#block(shadedBox(1.1, 1.1, 1.1, .85, 1.1), PALETTE.umbuFruit,
        Math.cos(angle) * spread * .8, crown - 1, Math.sin(angle) * spread * .8, false));
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

  // ---- Comida ----

  // Roça de sertanejo: canteiro de terra revolvida com leiras, fileiras de pé de
  // mandioca (haste e copinha de folha em estrela) e feijão rasteiro entre elas.
  roca(seed) {
    const plot = new THREE.Group();
    const rand = i => pseudoRandom(seed + i * 1.93);
    plot.add(this.#block(shadedBox(13, .5, 13, .8, 1), PALETTE.soilTop, 0, .25, 0, false));
    for (let row = -1; row <= 1; row++) {
      plot.add(this.#block(shadedBox(12, .5, 1.6, .8, 1.05), PALETTE.soilDeep, row * 3.8, .6, 0, false));
      for (let col = -1; col <= 1; col++) {
        const x = row * 3.8, z = col * 3.8 + (rand(row * 3 + col + 5) - .5);
        const tall = 2.8 + rand(row * 5 + col + 9) * 1.8;
        plot.add(this.#block(shadedBox(.5, tall, .5, .7, 1), PALETTE.barkDark, x, .8 + tall / 2, z));
        for (let k = 0; k < 2; k++) {
          const leaf = this.#block(shadedBox(3, .5, .9, .8, 1.15), PALETTE.umbuLeafLight, x, .8 + tall + .2, z);
          leaf.rotation.y = k * Math.PI / 2 + .4;
          plot.add(leaf);
        }
        plot.add(this.#block(shadedBox(1.6, .8, 1.6, .75, 1.1), PALETTE.leafMid, x + 1.7, 1.2, z + 1.4));
      }
    }
    return PropFactory.#merge(plot);
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
  #limb(parent, x, y, z, angle, tilt, length, width, color) {
    const limb = new THREE.Group();
    limb.position.set(x, y, z);
    limb.rotation.set(0, -angle, -tilt, 'YXZ');
    limb.add(this.#block(shadedBox(width, length + width * .5, width, .7, 1.02), color, 0, length / 2, 0));
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
