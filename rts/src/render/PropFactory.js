import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';
import { shadedBox } from './Shading.js';
import { createContactShadow, isContactShadowShape } from './ContactShadow.js';

// Plantas e pedras de blocos. Material por cor é criado uma vez e compartilhado;
// o arbusto usa geometria compartilhada, porque o capim da simulação é arbusto e
// nasce e some o tempo todo. Todo bloco daqui sai com o degradê de sombra na
// geometria (Shading) e cada peça ganha a mancha de contato no pé.
export class PropFactory {
  #materials = new Map();
  #shadedMaterials = new Map();
  #bushLower = shadedBox(9, 5, 9, .62, 1);
  #bushUpper = shadedBox(5.5, 4, 5.5, .82, 1.1);
  #builders = {
    conifer: seed => this.conifer(seed),
    broadleaf: seed => this.broadleaf(seed),
    cactus: seed => this.cactus(seed),
    rock: seed => this.rock(seed),
    shrub: seed => {
      const tones = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.grassShade];
      const bush = this.bush(tones[Math.floor(pseudoRandom(seed) * tones.length) % tones.length]);
      bush.scale.setScalar(.55 + pseudoRandom(seed + 2) * .5);
      return bush;
    }
  };

  // Geometria que não pode ser descartada junto com um enfeite.
  isShared(geometry) {
    return geometry === this.#bushLower || geometry === this.#bushUpper ||
      isContactShadowShape(geometry);
  }

  // Material liso, para geometria sem cor por vértice (as pedras da fogueira).
  material(color) {
    if (!this.#materials.has(color)) {
      this.#materials.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return this.#materials.get(color);
  }

  // Material que multiplica pelo degradê da geometria sombreada.
  shadedMaterial(color) {
    if (!this.#shadedMaterials.has(color)) {
      this.#shadedMaterials.set(color, new THREE.MeshLambertMaterial({ color, vertexColors: true }));
    }
    return this.#shadedMaterials.get(color);
  }

  // `withShadow`: a árvore da simulação tomba e cresce, então a mancha dela mora fora
  // da peça (TreeRenderer); o resto leva a mancha junto.
  build(kind, seed, { withShadow = true } = {}) {
    const prop = this.#builders[kind]?.(seed) ?? null;
    if (prop && withShadow) prop.add(createContactShadow(PropFactory.footprint(kind)));
    return prop;
  }

  // Raio da mancha de contato de cada espécie, em unidades.
  static footprint(kind) {
    return { conifer: 11, broadleaf: 13, cactus: 6, rock: 6.5, shrub: 7 }[kind] ?? 6;
  }

  // Altura aproximada de cada espécie crescida, em unidades: até onde ela tapa quem
  // está atrás (OcclusionFader).
  static height(kind) {
    return { conifer: 38, broadleaf: 34, cactus: 22, rock: 9, shrub: 10 }[kind] ?? 10;
  }

  broadleaf(seed) {
    const tree = new THREE.Group();
    const trunkHeight = 10 + pseudoRandom(seed) * 6;
    tree.add(this.#block(shadedBox(4.5, trunkHeight, 4.5, .55, 1), PALETTE.trunk, 0, trunkHeight / 2, 0));

    const leafColors = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.leafLight];
    const tone = leafColors[Math.floor(pseudoRandom(seed + 5) * leafColors.length) % leafColors.length];
    const wide = 17 + pseudoRandom(seed + 9) * 6;
    // Copa em três andares: a barriga escura embaixo e o topo pegando luz.
    tree.add(this.#block(shadedBox(wide, 11, wide, .58, 1.02), tone, 0, trunkHeight + 5, 0));
    tree.add(this.#block(shadedBox(wide * .66, 8, wide * .66, .8, 1.12), tone, 0, trunkHeight + 14, 0));
    // Tufo deslocado para quebrar a simetria da caixa.
    const tuft = wide * (.34 + pseudoRandom(seed + 11) * .12);
    const side = pseudoRandom(seed + 13) > .5 ? 1 : -1;
    tree.add(this.#block(shadedBox(tuft, 6, tuft, .75, 1.1), tone,
      side * wide * .3, trunkHeight + 8, -side * wide * .22));
    return tree;
  }

  // Um pinheiro de voxel: blocos que afinam para cima. É a silhueta que faz a taiga
  // ser reconhecida de longe, sem precisar de rótulo escrito no chão.
  conifer(seed) {
    const tree = new THREE.Group();
    const trunkHeight = 7 + pseudoRandom(seed) * 4;
    tree.add(this.#block(shadedBox(3.6, trunkHeight, 3.6, .55, 1), PALETTE.trunk, 0, trunkHeight / 2, 0));
    const tone = pseudoRandom(seed + 4) > .45 ? PALETTE.leafDark : PALETTE.needle;
    const tiers = 3 + Math.floor(pseudoRandom(seed + 6) * 2);
    const base = 15 + pseudoRandom(seed + 8) * 4;
    for (let tier = 0; tier < tiers; tier++) {
      const shrink = 1 - tier / tiers * .62;
      const wide = base * shrink;
      // Cada saia com a borda de baixo escura, como o galho que faz sombra no de baixo.
      tree.add(this.#block(shadedBox(wide, 7, wide, .6, 1.08 + tier * .03), tone,
        0, trunkHeight + 3 + tier * 5.2, 0));
    }
    return tree;
  }

  // Coluna com dois braços: no deserto é o que sobra de pé.
  cactus(seed) {
    const plant = new THREE.Group();
    const tall = 14 + pseudoRandom(seed) * 8;
    plant.add(this.#block(shadedBox(4, tall, 4, .6, 1.08), PALETTE.cactus, 0, tall / 2, 0));
    for (const side of [-1, 1]) {
      if (pseudoRandom(seed + side * 3) < .35) continue;
      const height = tall * (.3 + pseudoRandom(seed + side) * .2);
      plant.add(this.#block(shadedBox(2.8, height, 2.8, .75, 1.08), PALETTE.cactus,
        side * 3.4, tall * .55, 0));
      plant.add(this.#block(shadedBox(3.4, 2.8, 2.8, .8, 1), PALETTE.cactus,
        side * 2.2, tall * .55 - height / 2, 0));
    }
    return plant;
  }

  rock(seed) {
    const rock = new THREE.Group();
    const wide = 5 + pseudoRandom(seed) * 5;
    rock.add(this.#block(shadedBox(wide, 4, wide * .85, .55, 1.08), PALETTE.rock, 0, 2, 0));
    if (pseudoRandom(seed + 2) > .4) {
      rock.add(this.#block(shadedBox(wide * .6, 3, wide * .55, .8, 1.12), PALETTE.rock,
        wide * .12, 5.2, -wide * .1));
    }
    return rock;
  }

  bush(color) {
    const group = new THREE.Group();
    group.add(this.#block(this.#bushLower, color, 0, 2.5, 0));
    group.add(this.#block(this.#bushUpper, color, 0, 6.5, 0));
    return group;
  }

  #block(geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, this.shadedMaterial(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  }
}
