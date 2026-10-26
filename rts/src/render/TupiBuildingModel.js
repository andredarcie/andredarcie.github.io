import * as THREE from 'three';
import { Kit, WINDOW_DARK } from './SertaoBuildingModel.js';

// Todos com cor por vértice, como em SertaoBuildingModel: cada peça leva o degradê
// de sombra e a variação de tom sem material novo.
const lambert = color => new THREE.MeshLambertMaterial({ color, vertexColors: true });
const M = {
  // A palha de pindoba: verde-oliva quando nova, cor de palha quando seca.
  thatch: lambert(0x8f8a52),
  thatchDry: lambert(0xa89c62),
  thatchGreen: lambert(0x6f7a3e),
  pole: lambert(0x6b5236),
  poleDark: lambert(0x4e3c28),
  vine: lambert(0x8a7a52),
  clay: lambert(0xa65a3a),
  clayDark: lambert(0x7e4430),
  gourd: lambert(0xb08a46),
  basket: lambert(0xb89c5e),
  cassava: lambert(0x7a5232),
  ember: new THREE.MeshBasicMaterial({ color: 0xff6a1e }),
  ash: lambert(0x4a443e),
  fish: lambert(0x8a8e8a),
  meat: lambert(0x7a3a2a),
  firewood: lambert(0x5a4632)
};
const SHARED_MATERIALS = new Set(Object.values(M));

// As construções da aldeia tupinambá. Fiéis ao que descrevem Caminha (1500) — "tão
// compridas, cada uma, como esta nau capitaina [...] cobertas de palha, de razoável
// altura; e todas de um só espaço [...] tinham de dentro muitos esteios [...] E tinha
// cada casa duas portas pequenas, uma numa extremidade, e outra na oposta" — e Gabriel
// Soares (1587): a casa "muito comprida, coberta da palma, a que os índios chamam
// pindoba", "cobertas de palmas até o chão" (caps. CLI e CLXVIII). A oca é uma
// abóbada comprida de varas arqueadas, coberta de palha até o chão, com uma porta
// baixa em cada ponta; em obra, aparece a armação de varas e a palha subindo.
// Orientação, como no modelo do sertão: a porta da frente fica no +x local (o giro do
// grupo a vira para o lado da porta na simulação); o comprido da oca corre em x.
const DIMENSIONS = Object.freeze({
  house: { length: 34, width: 15, height: 10.5 },
  hall: { length: 50, width: 20, height: 14 }
});

export class TupiBuildingModel {
  build(kind, progress, built, size) {
    const group = new THREE.Group();
    // A porta escura de dentro é a "janela" de HutRenderer: de noite, acende com o
    // fogo de dentro ("para se aquentarem, faziam seus fogos", Caminha).
    const inside = new THREE.MeshLambertMaterial({ color: WINDOW_DARK, vertexColors: true });
    const parts = { group, windows: inside.color, height: 16 };
    const kit = new Kit(size.width * 11 + kind.length * 37 + (built ? 0 : progress * 100));
    if (kind === 'hall' || kind === 'house') {
      const d = DIMENSIONS[kind];
      parts.height = d.height + 4;
      this.#oca(kit, d, progress, built, inside, kind === 'hall');
    } else if (kind === 'lodge') this.#tejupar(kit, progress, built);
    else if (kind === 'moquem') this.#moquem(kit, progress, built);
    kit.finish(group);
    return parts;
  }

  dispose(group) {
    group.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      if (!SHARED_MATERIALS.has(node.material)) node.material.dispose();
    });
  }

  /* ===================== a oca ===================== */
  #oca(kit, { length, width, height }, progress, built, inside, hall) {
    const half = length / 2, w = width / 2;
    // A seção da abóbada: meia elipse de largura `width` e altura `height`.
    const arc = (t, inset = 0) => {
      const angle = Math.PI * t;
      return [Math.cos(angle) * (w - inset), Math.sin(angle) * (height - inset)];
    };
    // A armação: arcos de varas a cada 3 unidades, a cumeeira e as ripas correndo ao
    // comprido, amarradas com cipó.
    const arches = Math.round(length / 3);
    for (let i = 0; i <= arches; i++) {
      const x = -half + length * i / arches;
      for (let k = 0; k < 8; k++) {
        const [z0, y0] = arc(k / 8, .3), [z1, y1] = arc((k + 1) / 8, .3);
        kit.stick([x, y0, z0], [x, y1, z1], .22, M.pole, { tint: kit.range(.85, 1.1) });
      }
    }
    for (let k = 1; k < 8; k++) {
      const [z, y] = arc(k / 8, .35);
      kit.stick([-half, y, z], [half, y, z], .18, M.pole, { tint: kit.range(.85, 1.1) });
    }
    // Os esteios de dentro, que se veem pela porta e pelo vão da palha em obra.
    for (let i = 1; i < arches; i += 2) kit.box(.5, height * .8, .5, M.poleDark, -half + length * i / arches, height * .4, 0);
    // A palha: faixas sobrepostas ao comprido, de baixo para cima, subindo com a obra.
    const rows = 11;
    const done = built ? rows : Math.floor(rows * Math.max(0, progress - .2) / .8);
    for (let side = -1; side <= 1; side += 2) {
      for (let r = 0; r < Math.min(done, rows); r++) {
        const t0 = r / rows / 2, t1 = (r + 1) / rows / 2 + .012;
        const ta = side > 0 ? t0 : 1 - t0, tb = side > 0 ? t1 : 1 - t1;
        const [za, ya] = arc(ta), [zb, yb] = arc(tb);
        const span = Math.hypot(zb - za, yb - ya);
        const material = kit.pick([M.thatch, M.thatch, M.thatchDry, M.thatchGreen]);
        kit.box(length + 1.2, .9, span + .7, material, 0, (ya + yb) / 2, (za + zb) / 2,
          { rx: -Math.atan2(yb - ya, zb - za), tint: kit.range(.86, 1.08), shade: [.8, 1.04] });
        // A beira de cada faixa, desfiada: pontas de folha caindo por cima da de baixo.
        for (let k = 0; k < 6; k++) {
          const x = -half + kit.rand() * length;
          kit.box(.5, .2, 1.4, material, x, ya - .1, za + side * .2, { rx: -Math.atan2(yb - ya, zb - za) + side * .5, tint: kit.range(.8, 1) });
        }
      }
    }
    if (built) {
      // A cumeeira coberta e a fumaça encardida no alto (o fogo é dentro).
      kit.box(length + 1.6, 1, 2.2, M.thatchDry, 0, height + .2, 0, { tint: .7 });
    }
    // As duas pontas: meia-roda de palha fechando a abóbada, com a porta baixa no meio.
    for (const end of [-1, 1]) {
      const x = end * (half + .3);
      if (built || progress > .7) {
        // (a escala vem antes do giro: o x da peça vira a altura da meia-roda)
        kit.cyl(w, w, .8, M.thatchDry, x, 0, 0,
          { arc: Math.PI, rz: Math.PI / 2, seg: 14, shade: false, tint: kit.range(.85, 1.05), scale: [height / w, 1, 1] });
      }
      // A porta: "duas portas pequenas, uma numa extremidade, e outra na oposta".
      const door = hall ? 3.4 : 2.8, tall = hall ? 6 : 5;
      kit.box(1, tall, door, inside, x + end * .3, tall / 2, 0, { shade: false });
      for (const s of [-1, 1]) kit.stick([x + end * .5, 0, s * (door / 2 + .3)], [x + end * .5, tall + .4, s * (door / 2 + .3)], .28, M.poleDark);
      kit.stick([x + end * .5, tall + .4, -door / 2 - .5], [x + end * .5, tall + .4, door / 2 + .5], .24, M.poleDark);
    }
    if (!built) {
      // A obra: o monte de folhas de pindoba esperando para cobrir.
      for (let i = 0; i < 4; i++) {
        kit.box(5, .5, 1.6, M.thatchGreen, half + 4 + kit.rand() * 2, .3 + i * .5, w + 2 - i * .4, { ry: kit.range(-.3, .3) });
      }
      return;
    }
    // Na frente: a lenha (ninguém dorme sem fogo, Soares, cap. CLIX), os potes de barro
    // e as cabaças. Na casa do principal, os potes grandes do cauim ("fazem alguns
    // tamanhos que levam tanto como uma pipa", cap. CLIX).
    const front = half + 3.2;
    for (let i = 0; i < 5; i++) kit.stick([front + 1, .4 + i * .35, -w + 1 + i * .3], [front + 1.4, .4 + i * .35, -w + 5.5 - i * .2], .35, M.firewood);
    const pots = hall ? 3 : 1;
    for (let i = 0; i < pots; i++) {
      const r = hall ? 1.8 : 1.2;
      const z = w * .5 + i * (r * 2.2);
      kit.ball(r, M.clay, front, r * .95, z, { scale: [1, 1.1, 1], tint: kit.range(.85, 1.05) });
      kit.cyl(r * .55, r * .5, .5, M.clayDark, front, r * 2, z);
    }
    for (let i = 0; i < 2; i++) kit.ball(.8, M.gourd, front + .5 - i * 1.4, .75, -w * .4 - i, { scale: [1, .9, 1] });
  }

  /* ===================== o tejupar ===================== */
  // "suas choupanas, a que chamam tejupares" (Soares, cap. CLXVII): quatro forquilhas,
  // o telhado de duas águas de folha de palmeira, aberto dos lados; embaixo, os
  // balaios e samburás de folha (cap. CLIX), a mandioca colhida e as cabaças.
  #tejupar(kit, progress, built) {
    const L = 14, W = 10, H = 6.5;
    const posts = [[-L / 2, -W / 2], [L / 2, -W / 2], [-L / 2, W / 2], [L / 2, W / 2]];
    const rise = built ? 1 : Math.max(.2, progress);
    for (const [x, z] of posts) {
      kit.stick([x, 0, z], [x, H * rise, z], .35, M.pole, { tint: kit.range(.85, 1.1) });
      kit.stick([x, H * rise, z], [x + .6, H * rise + 1, z], .18, M.pole);
      kit.stick([x, H * rise, z], [x - .6, H * rise + 1, z], .18, M.pole);
    }
    if (progress < .4 && !built) return;
    kit.stick([-L / 2 - 1, H + 2.6, 0], [L / 2 + 1, H + 2.6, 0], .3, M.poleDark);
    for (const side of [-1, 1]) kit.stick([-L / 2, H, side * W / 2], [L / 2, H, side * W / 2], .25, M.pole);
    const slope = Math.atan2(2.6, W / 2 + 1);
    const span = Math.hypot(2.6, W / 2 + 1.5);
    for (const side of [-1, 1]) {
      kit.box(L + 2.4, .6, span, built ? M.thatch : M.thatchGreen, 0, H + 1.3, side * (W / 4 + .4), { rx: side * slope, tint: kit.range(.88, 1.06) });
    }
    if (!built) return;
    for (let i = 0; i < 3; i++) kit.cyl(1.2, .9, 1.6, M.basket, -L / 4 + i * 2.6, .8, -1.5 + (i % 2) * 2, { seg: 9, tint: kit.range(.85, 1.08) });
    for (let i = 0; i < 6; i++) kit.stick([2 + i * .3, .3, 1 + kit.rand()], [5 + i * .2, .45, 2 + kit.rand()], .3, M.cassava);
    kit.ball(.9, M.gourd, L / 2 - 2, .85, -2.5);
  }

  /* ===================== o moquém ===================== */
  // O moquém: o jirau de varas sobre quatro forquilhas, com o fogo baixo embaixo, onde
  // o peixe e a caça secam ao fumo para durar.
  #moquem(kit, progress, built) {
    const S = 7, H = 4.2;
    for (const [x, z] of [[-S / 2, -S / 2], [S / 2, -S / 2], [-S / 2, S / 2], [S / 2, S / 2]]) {
      kit.stick([x, 0, z], [x, H * (built ? 1 : Math.max(.3, progress)), z], .3, M.pole, { tint: kit.range(.85, 1.1) });
    }
    if (!built && progress < .5) return;
    for (const side of [-1, 1]) kit.stick([-S / 2 - .5, H, side * S / 2], [S / 2 + .5, H, side * S / 2], .24, M.pole);
    for (let i = 0; i < 8; i++) {
      const z = -S / 2 + S * (i + .5) / 8;
      kit.stick([-S / 2 - .3, H + .3, z], [S / 2 + .3, H + .3, z], .14, M.poleDark, { tint: kit.range(.85, 1.1) });
    }
    if (!built) return;
    for (let i = 0; i < 5; i++) {
      kit.box(.9, .6, 3.2, i % 2 ? M.fish : M.meat, -S / 2 + 1 + i * 1.3, H + .75, (kit.rand() - .5) * 2, { ry: kit.range(-.3, .3), tint: kit.range(.8, 1.05) });
    }
    // O fogo baixo: brasa e cinza, e as achas atravessadas.
    kit.box(3.2, .3, 3.2, M.ash, 0, .15, 0, { shade: false });
    kit.box(2, .35, 2, M.ember, 0, .35, 0, { shade: false });
    for (const turn of [.4, -.5]) kit.box(4, .55, .6, M.firewood, 0, .5, 0, { ry: turn });
  }
}
