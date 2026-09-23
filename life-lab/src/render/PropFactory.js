import * as THREE from 'three';
import { pseudoRandom } from '../core/math.js';
import { PALETTE } from './Palette.js';

// Plantas e pedras de blocos. Material por cor é criado uma vez e compartilhado;
// o arbusto usa geometria compartilhada, porque o capim da simulação é arbusto e
// nasce e some o tempo todo.
export class PropFactory {
  #materials = new Map();
  #bushLower = new THREE.BoxGeometry(9, 5, 9);
  #bushUpper = new THREE.BoxGeometry(5.5, 4, 5.5);
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
    return geometry === this.#bushLower || geometry === this.#bushUpper;
  }

  material(color) {
    if (!this.#materials.has(color)) {
      this.#materials.set(color, new THREE.MeshLambertMaterial({ color }));
    }
    return this.#materials.get(color);
  }

  build(kind, seed) {
    return this.#builders[kind]?.(seed) ?? null;
  }

  broadleaf(seed) {
    const tree = new THREE.Group();
    const trunkHeight = 10 + pseudoRandom(seed) * 6;
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, trunkHeight, 4.5),
      this.material(PALETTE.trunk)
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    const leafColors = [PALETTE.leafDark, PALETTE.leafMid, PALETTE.leafLight];
    const tone = leafColors[Math.floor(pseudoRandom(seed + 5) * leafColors.length) % leafColors.length];
    const wide = 17 + pseudoRandom(seed + 9) * 6;
    const crownLower = new THREE.Mesh(
      new THREE.BoxGeometry(wide, 11, wide),
      this.material(tone)
    );
    crownLower.position.y = trunkHeight + 5;
    crownLower.castShadow = true;
    tree.add(crownLower);

    const crownUpper = new THREE.Mesh(
      new THREE.BoxGeometry(wide * .66, 8, wide * .66),
      this.material(tone)
    );
    crownUpper.position.y = trunkHeight + 14;
    crownUpper.castShadow = true;
    tree.add(crownUpper);
    return tree;
  }

  // Um pinheiro de voxel: blocos que afinam para cima. É a silhueta que faz a taiga
  // ser reconhecida de longe, sem precisar de rótulo escrito no chão.
  conifer(seed) {
    const tree = new THREE.Group();
    const trunkHeight = 7 + pseudoRandom(seed) * 4;
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, trunkHeight, 3.6), this.material(PALETTE.trunk));
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
        new THREE.BoxGeometry(wide, 7, wide), this.material(tone));
      skirt.position.y = trunkHeight + 3 + tier * 5.2;
      skirt.castShadow = true;
      tree.add(skirt);
    }
    return tree;
  }

  // Coluna com dois braços: no deserto é o que sobra de pé.
  cactus(seed) {
    const plant = new THREE.Group();
    const material = this.material(PALETTE.cactus);
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

  rock(seed) {
    const rock = new THREE.Group();
    const material = this.material(PALETTE.rock);
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

  bush(color) {
    const group = new THREE.Group();
    const material = this.material(color);
    const lower = new THREE.Mesh(this.#bushLower, material);
    lower.position.y = 2.5;
    lower.castShadow = true;
    group.add(lower);
    const upper = new THREE.Mesh(this.#bushUpper, material);
    upper.position.y = 6.5;
    upper.castShadow = true;
    group.add(upper);
    return group;
  }
}
