import * as THREE from 'three';
import { Kit, WINDOW_DARK, SertaoBuildingModel } from './SertaoBuildingModel.js';

// Todos com cor por vértice, como em SertaoBuildingModel: cada peça leva o degradê
// de sombra e a variação de tom sem material novo.
const lambert = color => new THREE.MeshLambertMaterial({ color, vertexColors: true });
const M = {
  // A palha de palmeira: verde-oliva quando nova, cor de palha quando seca.
  thatch: lambert(0x8f8a52),
  thatchDry: lambert(0xa89c62),
  thatchGreen: lambert(0x6f7a3e),
  // A parede: varas de palmeira trançadas, de onde a palha das folhas sai em franja.
  wall: lambert(0x8a7650),
  pole: lambert(0x6b5236),
  poleDark: lambert(0x4e3c28),
  earth: lambert(0x7a4a2e),
  earthDark: lambert(0x5e3a24),
  wood: lambert(0x7a5a3a),
  basket: lambert(0xb89c5e),
  clay: lambert(0xa65a3a),
  // O milho: a cana verde, a folha, o pendão claro e a espiga de palha seca.
  stalk: lambert(0x6f8a3a),
  leaf: lambert(0x5e8a34),
  leafDry: lambert(0x9a9a52),
  tassel: lambert(0xd8c88a),
  ear: lambert(0xd8b85a),
  husk: lambert(0xc9b47a),
  // A pacova (banana-da-terra) que os holandeses acharam nas roças.
  bananaStem: lambert(0x7a8a4a),
  bananaLeaf: lambert(0x4f8a3a)
};
const SHARED_MATERIALS = new Set(Object.values(M));

// As construções dos Palmares. Pouco se sabe de como eram por dentro; o que os
// documentos dizem é que eram de palmeira: "das palmeiras [...] fazem as suas casas"
// (diário de João Blaer, 1645); "as fôlhas servem às casas de cobertura; os ramos de
// esteios" (Relação das guerras feitas aos Palmares, 1678); casas "de matéria capaz
// de incêndio" (Relação, 1675). Aqui: esteios de pau, paredes de vara de palmeira
// trançada e o telhado de duas águas de folha de palmeira descendo baixo. A Casa do
// Conselho é a "grande casa de conselho" que os holandeses viram no meio das casas,
// com um alpendre na frente onde os chefes se reúnem; o celeiro guarda o milho
// ("celeiros para os tempos de guerra e de inverno", Relação) num jirau alto; a roça
// é de milho, "o seu principal sustento" (Relação), com pacovas e a choupana de quem
// mora nela ("tôdas as roças são habitadas por dois ou três indivíduos", Blaer).
// Orientação, como no modelo do sertão: a porta da frente fica no +x local (o giro do
// grupo a vira para o lado da porta na simulação); o comprido da casa corre em z.
// O engenho que os palmarinos assaltam (campanha, missão 2) é de taipa, como as casas
// do sertão: a casa-grande é o armazém de alpendre e a senzala, a casa comprida.
const COLONIAL = Object.freeze({ engenho: 'lodge', senzala: 'house' });

export class PalmaresBuildingModel {
  #colonial = new SertaoBuildingModel();

  build(kind, progress, built, size) {
    if (COLONIAL[kind]) {
      const parts = this.#colonial.build(COLONIAL[kind], progress, built, size);
      parts.group.userData.colonial = true;
      return parts;
    }
    const group = new THREE.Group();
    const inside = new THREE.MeshLambertMaterial({ color: WINDOW_DARK, vertexColors: true });
    const parts = { group, windows: inside.color, height: 16 };
    const kit = new Kit(size.width * 11 + size.depth * 5 + kind.length * 37 + (built ? 0 : progress * 100));
    if (kind === 'lodge') parts.height = this.#celeiro(kit, progress, built, inside);
    else if (kind === 'roca') parts.height = this.#roca(kit, progress, built, size);
    else parts.height = this.#casa(kit, size, progress, built, inside, kind === 'hall');
    kit.finish(group);
    return parts;
  }

  dispose(group) {
    if (group.userData.colonial) {
      this.#colonial.dispose(group);
      return;
    }
    group.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      if (!SHARED_MATERIALS.has(node.material)) node.material.dispose();
    });
  }

  /* ===================== a casa de palha e a Casa do Conselho ===================== */
  // Devolve a altura (para quem ela tapa).
  #casa(kit, size, progress, built, inside, hall) {
    const F = size.depth * .8, L = size.width * .82, hf = F / 2, hl = L / 2;
    const H = hall ? 7 : 5.4;
    const rise = F * (hall ? .5 : .56);
    const rise0 = built ? 1 : Math.max(.12, Math.min(1, progress / .3));
    // O chão batido da casa, um palmo acima do terreno.
    kit.box(F + 1, .5, L + 1, M.earthDark, 0, .25, 0, { shade: [.8, 1] });
    // Os esteios: nos cantos e a cada 4 unidades ao longo das paredes compridas.
    const posts = [];
    const n = Math.max(2, Math.round(L / 4));
    for (let i = 0; i <= n; i++) for (const s of [-1, 1]) posts.push([s * hf, -hl + L * i / n]);
    for (const s of [-1, 1]) posts.push([0, s * hl]);
    for (const [x, z] of posts) kit.stick([x, 0, z], [x, (H + (x === 0 ? rise : 0)) * rise0, z], .32, M.pole, { tint: kit.range(.85, 1.1) });
    if (!built && progress < .3) {
      this.#leafPile(kit, hf + 5, hl * .4);
      return H + 2;
    }
    // As paredes: a trama de varas de palmeira, subindo com a obra; a da frente com o
    // vão da porta.
    const wallRise = built ? 1 : Math.max(.15, Math.min(1, (progress - .3) / .35));
    const wh = H * wallRise;
    const doorZ = hall ? 0 : -L * .18, dw = hall ? 4.4 : 3.2, dh = Math.min(wh, hall ? 5.6 : 4.6);
    // A parede da frente fica em +x, com o vão da porta sem varas por cima.
    this.#wattle(kit, 'z', -hf, -hl, hl, wh, null);
    this.#wattle(kit, 'z', hf, -hl, hl, wh, { at: doorZ, width: dw + 1 });
    this.#wattle(kit, 'x', -hl, -hf, hf, wh, null);
    this.#wattle(kit, 'x', hl, -hf, hf, wh, null);
    if (!built && progress < .65) {
      this.#leafPile(kit, hf + 5, hl * .4);
      return H + 2;
    }
    // O telhado: a armação de caibros em obra; pronta, a palha em faixas sobrepostas,
    // descendo além da parede (beiral baixo), os oitões de palha e a cumeeira.
    const over = hall ? 2.2 : 1.6;
    const half = hf + over, ang = Math.atan2(rise, hf), slope = half / Math.cos(ang);
    const top = H + rise;
    if (!built) {
      for (const s of [-1, 1]) {
        for (let z = -hl; z <= hl + .01; z += 2) kit.stick([0, top, z], [s * half, top - Math.tan(ang) * half, z], .2, M.pole, { tint: kit.range(.85, 1.1) });
      }
      kit.stick([0, top, -hl - .5], [0, top, hl + .5], .3, M.poleDark);
      this.#leafPile(kit, hf + 5, hl * .4);
      return top;
    }
    const rows = hall ? 7 : 6;
    for (const s of [-1, 1]) {
      for (let r = 0; r < rows; r++) {
        const d0 = slope * r / rows, d1 = slope * (r + 1) / rows + .4;
        const d = (d0 + d1) / 2;
        const material = kit.pick([M.thatch, M.thatch, M.thatchDry, M.thatchGreen]);
        kit.box(d1 - d0 + .3, .8, L + over * 2, material, s * Math.cos(ang) * d, top + .5 - Math.sin(ang) * d, 0,
          { rz: -s * ang, tint: kit.range(.86, 1.08), shade: [.8, 1.04] });
        // A beira de cada faixa, desfiada: pontas de folha caindo sobre a de baixo.
        for (let k = 0; k < 5; k++) {
          const z = -hl - over + kit.rand() * (L + over * 2);
          kit.box(.5, .2, 1.2, material, s * Math.cos(ang) * d1, top + .3 - Math.sin(ang) * d1, z,
            { rz: -s * (ang + .5), tint: kit.range(.8, 1) });
        }
      }
    }
    kit.box(1.6, 1, L + over * 2 + .4, M.thatchDry, 0, top + .9, 0, { tint: .72 });
    const shape = new THREE.Shape([new THREE.Vector2(-hf, 0), new THREE.Vector2(hf, 0), new THREE.Vector2(0, rise)]);
    for (const s of [-1, 1]) {
      kit.geom(new THREE.ExtrudeGeometry(shape, { depth: .6, bevelEnabled: false }), M.thatchDry, 0, H, s > 0 ? hl - .6 : -hl,
        { shade: [.85, 1.02], tint: kit.range(.85, 1) });
    }
    // A porta: o vão escuro e as duas ombreiras de pau com a verga.
    kit.box(.6, dh, dw, inside, hf + .05, dh / 2 + .5, doorZ, { shade: false });
    for (const s of [-1, 1]) kit.stick([hf + .4, 0, doorZ + s * (dw / 2 + .3)], [hf + .4, dh + .8, doorZ + s * (dw / 2 + .3)], .3, M.poleDark);
    kit.stick([hf + .4, dh + .8, doorZ - dw / 2 - .6], [hf + .4, dh + .8, doorZ + dw / 2 + .6], .28, M.poleDark);
    if (hall) this.#alpendre(kit, hf, hl, H);
    this.#yard(kit, hf, hl, doorZ, dw, hall);
    return top + 1;
  }

  // Um pano de parede de varas: corre em `axis` ('z': ao longo de z, em x = `at`;
  // 'x': ao longo de x, em z = `at`), de `a` a `b`, com altura `h`. A face é um pano
  // contínuo de palha trançada; por cima, as varas em pé e duas travessas. `gap`
  // ({ at, width }): onde fica a porta, sem vara em pé por cima dela.
  #wattle(kit, axis, at, a, b, h, gap) {
    const len = b - a, mid = (a + b) / 2;
    if (axis === 'z') kit.box(.5, h, len, M.wall, at, h / 2 + .4, mid, { tint: kit.range(.9, 1.06), shade: [.72, 1.02] });
    else kit.box(len, h, .5, M.wall, mid, h / 2 + .4, at, { tint: kit.range(.9, 1.06), shade: [.72, 1.02] });
    const out = Math.sign(at) * .35;
    for (let t = a + .6; t < b - .3; t += 1.1) {
      if (gap && Math.abs(t - gap.at) < gap.width / 2) continue;
      const tone = kit.range(.8, 1.1);
      if (axis === 'z') kit.box(.2, h, .22, M.pole, at + out, h / 2 + .4, t, { tint: tone });
      else kit.box(.22, h, .2, M.pole, t, h / 2 + .4, at + out, { tint: tone });
    }
    // As travessas; na parede da porta, em dois pedaços, um de cada lado do vão.
    const spans = gap ? [[a, gap.at - gap.width / 2], [gap.at + gap.width / 2, b]] : [[a, b]];
    for (const y of [h * .35, h * .75]) {
      for (const [s0, s1] of spans) {
        if (s1 - s0 < .5) continue;
        if (axis === 'z') kit.box(.24, .24, s1 - s0, M.poleDark, at + out * 1.4, y + .4, (s0 + s1) / 2);
        else kit.box(s1 - s0, .24, .24, M.poleDark, (s0 + s1) / 2, y + .4, at + out * 1.4);
      }
    }
  }

  // O alpendre da Casa do Conselho: quatro esteios na frente e uma água de palha
  // saindo do beiral, com os bancos de tronco embaixo, onde o conselho se senta.
  #alpendre(kit, hf, hl, H) {
    const depth = 9, low = H - 1.4;
    for (const z of [-hl * .8, -hl * .27, hl * .27, hl * .8]) kit.stick([hf + depth, 0, z], [hf + depth, low, z], .34, M.pole, { tint: kit.range(.85, 1.1) });
    kit.stick([hf + depth, low, -hl * .85], [hf + depth, low, hl * .85], .3, M.poleDark);
    const ang = Math.atan2(H + .3 - low, depth), span = Math.hypot(depth, H + .3 - low);
    kit.box(span + 1, .7, hl * 1.8, M.thatch, hf + depth / 2, (H + low) / 2 + .7, 0, { rz: -ang, tint: kit.range(.88, 1.05), shade: [.8, 1.04] });
    for (const z of [-hl * .45, hl * .45]) {
      kit.cyl(.75, .75, hl * .6, M.wood, hf + depth * .55, .75, z, { rx: Math.PI / 2, seg: 7, tint: kit.range(.8, 1) });
    }
  }

  // O terreiro na frente da porta: o pilão de pau (o milho "dêle fazem várias
  // iguarias", Relação), o cesto e a lenha; na Casa do Conselho, mais potes.
  #yard(kit, hf, hl, doorZ, dw, hall) {
    const x = hf + (hall ? 11 : 3.6);
    const z = doorZ + (hall ? hl * .2 : dw / 2 + 3);
    kit.cyl(1, .9, 2.4, M.wood, x, 1.2, z, { seg: 9, tint: kit.range(.85, 1) });
    kit.cyl(.75, .75, .3, M.earthDark, x, 2.45, z, { seg: 9, shade: false });
    kit.stick([x - .6, 2, z + .4], [x + .4, 6.2, z - .3], .22, M.pole);
    kit.cyl(1.1, .8, 1.3, M.basket, x + 2.2, .65, z - 1.6, { seg: 9, tint: kit.range(.85, 1.05) });
    for (let i = 0; i < 4; i++) kit.stick([x - 1, .4 + i * .32, z - 4 - i * .1], [x + 3, .45 + i * .32, z - 3.4], .3, M.wood, { tint: kit.range(.7, .95) });
    if (!hall) return;
    for (let i = 0; i < 3; i++) {
      const pz = -hl * .3 - i * 2.6;
      kit.ball(1.3, M.clay, hf + 2.2, 1.2, pz, { scale: [1, 1.1, 1], tint: kit.range(.85, 1.05) });
    }
  }

  // O monte de folhas de palmeira esperando para cobrir a obra.
  #leafPile(kit, x, z) {
    for (let i = 0; i < 4; i++) {
      kit.box(5, .5, 1.6, M.thatchGreen, x + kit.rand() * 2, .3 + i * .5, z - i * .4, { ry: kit.range(-.3, .3) });
    }
  }

  /* ===================== o celeiro ===================== */
  // O paiol num jirau de esteios, alto do chão (longe da umidade e do bicho), com a
  // escada de tronco entalhado, o milho em espiga amontoado embaixo e os cestos.
  #celeiro(kit, progress, built, inside) {
    const S = 12, R = 9, lift = 4;
    const rise0 = built ? 1 : Math.max(.2, Math.min(1, progress / .35));
    for (const [x, z] of [[-S / 2, -R / 2], [S / 2, -R / 2], [-S / 2, R / 2], [S / 2, R / 2], [0, -R / 2], [0, R / 2]]) {
      kit.stick([x, 0, z], [x, lift * rise0, z], .45, M.pole, { tint: kit.range(.85, 1.1) });
    }
    if (!built && progress < .35) {
      this.#leafPile(kit, S / 2 + 4, 0);
      return 8;
    }
    // O estrado de varas.
    for (let i = 0; i < 12; i++) kit.stick([-S / 2 - .5, lift, -R / 2 + R * (i + .5) / 12], [S / 2 + .5, lift, -R / 2 + R * (i + .5) / 12], .22, M.poleDark, { tint: kit.range(.85, 1.1) });
    const wh = 4.6 * (built ? 1 : Math.max(.1, Math.min(1, (progress - .35) / .35)));
    for (const s of [-1, 1]) {
      kit.box(S, wh, .5, M.wall, 0, lift + wh / 2, s * R / 2, { tint: kit.range(.9, 1.05), shade: [.75, 1.02] });
      kit.box(.5, wh, R, M.wall, s * S / 2, lift + wh / 2, 0, { tint: kit.range(.9, 1.05), shade: [.75, 1.02] });
    }
    if (!built) return lift + 6;
    // A portinhola de cima, o telhado de duas águas e a escada.
    kit.box(.6, 2.6, 2.4, inside, S / 2 + .05, lift + 2.4, 0, { shade: false });
    const half = R / 2 + 1.4, rise = 3.6, ang = Math.atan2(rise, half), slope = Math.hypot(half, rise);
    for (const s of [-1, 1]) {
      kit.box(S + 2.4, .8, slope, M.thatch, 0, lift + wh + rise / 2 + .3, s * half / 2, { rx: s * ang, tint: kit.range(.86, 1.06), shade: [.8, 1.04] });
    }
    kit.box(S + 2.6, .9, 1.4, M.thatchDry, 0, lift + wh + rise + .3, 0, { tint: .75 });
    kit.stick([S / 2 + 3.4, 0, -2], [S / 2 + .6, lift + .4, -2], .5, M.wood);
    for (let i = 1; i < 4; i++) kit.box(.6, .3, 1.2, M.poleDark, S / 2 + 3.4 - i * .7, i * 1, -2);
    // O milho de espiga amontoado embaixo do jirau e os cestos.
    for (let i = 0; i < 14; i++) {
      kit.box(.7, .6, 2.1, kit.rand() < .5 ? M.ear : M.husk, kit.range(-S / 2 + 1, S / 2 - 3), .3 + (i % 3) * .5, kit.range(-R / 2 + 1, R / 2 - 1),
        { ry: kit.range(0, Math.PI), tint: kit.range(.85, 1.05) });
    }
    for (const z of [-R / 2 - 2.5, R / 2 + 2.5]) kit.cyl(1.2, .9, 1.6, M.basket, -1, .8, z, { seg: 9, tint: kit.range(.85, 1.05) });
    return lift + wh + rise + 1;
  }

  /* ===================== a roça de milho ===================== */
  // Leiras de milho (cana, folhas, pendão e espiga), duas touceiras de pacova num
  // canto e a choupana de palha de quem cuida da roça. O milho cresce com a obra.
  #roca(kit, progress, built, size) {
    const W = size.width * .8, D = size.depth * .8;
    const grow = built ? 1 : Math.max(.08, progress);
    kit.box(W, .3, D, M.earth, 0, .15, 0, { shade: [.85, 1], tint: kit.range(.92, 1.05) });
    // As leiras.
    const rows = 5, perRow = 6;
    for (let r = 0; r < rows; r++) {
      const x = -W / 2 + 2 + (W - 7) * r / (rows - 1);
      kit.box(1.4, .35, D - 2, M.earthDark, x, .4, 0, { shade: [.8, 1] });
      for (let p = 0; p < perRow; p++) {
        const z = -D / 2 + 2 + (D - 4) * p / (perRow - 1) + kit.range(-.4, .4);
        const h = kit.range(5, 6.6) * grow;
        const lean = kit.range(-.08, .08);
        kit.stick([x, .4, z], [x + lean * h, .4 + h, z], .16, M.stalk, { tint: kit.range(.85, 1.08) });
        if (grow < .35) continue;
        // As folhas compridas, saindo da cana e caindo em arco.
        for (let k = 0; k < 3; k++) {
          const y = .4 + h * (.3 + k * .2), turn = kit.rand() * Math.PI * 2;
          kit.box(.12, .1, 3.2, kit.rand() < .2 ? M.leafDry : M.leaf, x + Math.sin(turn) * 1.2, y, z + Math.cos(turn) * 1.2,
            { ry: turn, rx: .5, tint: kit.range(.85, 1.08) });
        }
        if (grow < .8) continue;
        kit.box(.3, 1.4, .3, M.tassel, x + lean * h, .4 + h + .6, z, { tint: kit.range(.9, 1.05) });
        kit.box(.55, 1.6, .55, kit.rand() < .5 ? M.husk : M.ear, x + .45, .4 + h * .5, z, { rz: -.35, tint: kit.range(.88, 1.05) });
      }
    }
    // A pacova: o tronco mole e as folhas largas caindo.
    if (grow > .5) {
      for (const [bx, bz] of [[W / 2 - 1, D / 2 - 1], [W / 2 + 1.5, D / 2 - 4]]) {
        const h = 6 * grow;
        kit.cyl(.45, .6, h, M.bananaStem, bx, h / 2, bz, { seg: 7, tint: kit.range(.85, 1.05) });
        for (let k = 0; k < 6; k++) {
          const turn = k / 6 * Math.PI * 2 + kit.rand() * .4;
          kit.box(1.4, .1, 4.6, M.bananaLeaf, bx + Math.sin(turn) * 2.2, h + .2, bz + Math.cos(turn) * 2.2,
            { ry: turn, rx: .45, tint: kit.range(.82, 1.08) });
        }
      }
    }
    // A choupana: quatro forquilhas e a água de palha, no canto de trás.
    const cx = -W / 2 - 3, cz = -D / 2 + 1, ch = 4.2 * (built ? 1 : Math.max(.3, progress));
    for (const [dx, dz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) kit.stick([cx + dx, 0, cz + dz], [cx + dx, ch, cz + dz], .26, M.pole);
    if (built || progress > .6) {
      kit.box(6.4, .6, 6.4, M.thatch, cx, ch + .5, cz, { rz: .22, tint: kit.range(.86, 1.05), shade: [.8, 1.04] });
    }
    return 9;
  }
}
