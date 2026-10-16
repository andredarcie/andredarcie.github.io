import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, BLUE, GLOW } from '../config.js';
import { day, night } from '../state.js';
import { linesOf, sceneCaption } from '../story.js';
import { trainArrive, trainStopSfx, trainDepart, sfxDoorSlide } from '../audio.js';
import { freshScene, box, lite, grp, anim, game } from '../kit.js';
import { vagao, VAGAO } from '../vagao.js';
import { LINHA, TZ_TREM, transformada, veiculos } from '../mapa.js';

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

/* ===================== o trem da linha: um veículo de verdade entre as duas estações ===================== */
// O trem é um lugar do mundo que anda: casca por fora, o vagão (vagao.js) por dentro. Ele corre no
// referencial da plataforma CENTRAL, ao longo de x: CENTRAL em x = 0, VIADUTO em x = -LINHA (o túnel
// entre as duas é linha.js). Quem está dentro anda junto com ele.
// Ele vem até a estação em que você está, abre as portas e espera; você embarca, as portas fecham e
// ele vai até a outra estação, onde abrem de novo. O estado fica fora do builder: remontar o trem
// (outro dia, a noite) não o tira do lugar.
const ESTX = { plataforma: 0, plataforma2: -LINHA };
const NOMES = { plataforma: 'CENTRAL', plataforma2: 'VIADUTO' };
const COR = { plataforma: LIGHT, plataforma2: mix(LIGHT, LIGHT2, .6) };   // a parede de cada estação (janelas da porta)
const outra = e => (e === 'plataforma' ? 'plataforma2' : 'plataforma');
const FORA = 40;                    // de manhã o trem espera no túnel morto depois da CENTRAL

const TR = { x: FORA, em: 'plataforma', fase: 'fora', k: 0, v: 0, para: null, x0: 0, x1: 0, u: 0, dur: 1, conta: 0, tf: 0, somChegada: false };
export function reiniciarTrem() {
  Object.assign(TR, { x: FORA, em: 'plataforma', fase: 'fora', k: 0, v: 0, para: null, conta: 0, somChegada: false });
  moverTrem();
}
function moverTrem() {
  veiculos.trem = transformada('plataforma').clone().multiply(new THREE.Matrix4().makeTranslation(TR.x, 0, TZ_TREM));
}
moverTrem();

// o que o painel da estação st mostra
export function painelDoTrem(st) {
  if (TR.fase === 'viajando' && TR.para === st && (1 - TR.u) * TR.dur < 6) return 'chegando';
  if (TR.em === st && (TR.fase === 'abrindo' || TR.fase === 'aberto')) return 'embarque';
  return null;
}

/* ===================== LUGAR: O TREM ===================== */
export function buildTrem() {
  freshScene(8, 30);

  // ---------- casca por fora (vista da plataforma) ----------
  const LEN = 30, HW = VAGAO.Wz / 2 + .16, PZ = HW + .02, Y0 = .03, YT = 2.5;
  const doorsX = [-12, -8, -4, 0, 4, 8, 12];
  const train = grp(0, 0, 0);
  const lado = (a, b, z) => box(b - a, YT - Y0, .04, LIGHT2, (a + b) / 2, (Y0 + YT) / 2, z, train);
  lado(-LEN / 2, -VAGAO.DW, PZ); lado(VAGAO.DW, LEN / 2, PZ);             // lado da plataforma, com o vão
  box(VAGAO.DW * 2, YT - 2.05, .04, LIGHT2, 0, (2.05 + YT) / 2, PZ, train);
  lado(-LEN / 2, LEN / 2, -PZ);                                            // lado do túnel
  box(LEN - .4, .4, HW * 2, DARK2, 0, 2.7, 0, train);                      // teto, por cima do forro do vagão
  box(LEN, .3, HW * 2, DARK2, 0, -.36, 0, train);                          // chassi, por baixo do piso
  for (let ax = -9; ax <= 9; ax += 4.5) box(1.2, .14, 1.0, DARK, ax, 2.96, 0, train); // ar-condicionado
  // faixas por fora dos dois lados, interrompidas nas portas
  function faixa(h, c, y) {
    for (const zs of [1, -1]) {
      let x0 = -LEN / 2;
      for (const [a, b] of [...doorsX.map(dx => [dx - .9, dx + .9]), [LEN / 2, LEN / 2]]) {
        if (a > x0) box(a - x0, h, .02, c, (x0 + a) / 2, y, zs * (PZ + .03), train);
        x0 = b;
      }
    }
  }
  faixa(.34, BLUE, 1.98);                                  // faixa azul superior
  faixa(.32, DARK2, .2);                                   // saia inferior
  faixa(.12, DARK2, 1.18);                                 // friso entre janelas
  for (let wx = -13.5; wx <= 13.5; wx += 1.5) {            // banda de janelas com moldura
    if (doorsX.some(dx => Math.abs(wx - dx) < 1.1)) continue;
    box(1.15, .82, .02, DARK2, wx, 1.56, PZ + .03, train);
    box(1.0, .68, .02, NAVY, wx, 1.56, PZ + .045, train);
  }
  for (const dx of doorsX) {                                // portas fechadas (decorativas) e o batente da porta de verdade
    if (dx !== 0) {
      box(1.55, 2.05, .02, DARK2, dx, 1.05, PZ + .03, train);
      for (const k of [-1, 1]) box(.7, 1.9, .02, NAVY, dx + k * .38, 1.05, PZ + .045, train);
      box(.05, 2.05, .03, BLUE, dx, 1.05, PZ + .055, train);
    } else {
      for (const k of [-1, 1]) box(.08, 2.1, .05, DARK2, k * (VAGAO.DW + .04), 1.05, PZ + .03, train);
      box(VAGAO.DW * 2 + .16, .08, .05, DARK2, 0, 2.09, PZ + .03, train);
    }
  }
  for (const s of [-1, 1]) {                                // cabines: para-brisa, faróis, destino
    box(.7, 2.5, HW * 2 + .06, LIGHT2, s * (LEN / 2 - .15), 1.25, 0, train);
    box(.12, .8, 1.5, NAVY, s * (LEN / 2 + .16), 1.75, 0, train);
    lite(.14, .2, .1, GLOW, s * (LEN / 2 + .18), .55, .6, train);
    lite(.14, .2, .1, GLOW, s * (LEN / 2 + .18), .55, -.6, train);
    lite(.9, .22, .05, BLUE, s * (LEN / 2 - .15), 2.28, HW + .04, train);
  }

  // ---------- o vagão por dentro: girado de modo que a porta fique em x = 0, virada para a plataforma ----------
  const carro = grp(VAGAO.DX, 0, 0, train);
  carro.rotation.y = Math.PI;
  const vg = vagao(carro, { W: (x, z) => [VAGAO.DX - x, -z], nome: NOMES[TR.em] });

  // ---------- o controlador ----------
  let tl = null;
  function partir(dest, onde, noTrem) {
    TR.para = dest; TR.x0 = TR.x; TR.x1 = ESTX[dest];
    TR.dur = 4 + Math.abs(TR.x1 - TR.x0) / 20;
    TR.u = 0; TR.k = 0; TR.fase = 'viajando'; TR.somChegada = false;
    if (noTrem || onde === TR.em) trainDepart(0, 6);
  }
  anim(t => {
    const dt = tl === null ? 0 : Math.min(.05, t - tl);
    tl = t;
    const onde = game.lugarAtual ? game.lugarAtual() : null;
    const p = game.player ? game.player() : { px: 1e9, pz: 1e9 };
    const cx = VAGAO.DX - p.px, cz = -p.pz;                // o jogador no referencial do vagão
    const noTrem = onde === 'trem';
    const dentro = noTrem && vg.dentro(cx, cz);
    const parado = TR.fase !== 'viajando' && TR.fase !== 'fora';
    const noVao = parado && (noTrem || onde === TR.em) && vg.noVao(cx, cz);

    if (TR.fase === 'viajando') {
      TR.u = Math.min(1, TR.u + dt / TR.dur);
      const q = TR.u, e = q * q * (3 - 2 * q), xa = TR.x;
      TR.x = TR.x0 + (TR.x1 - TR.x0) * e;
      TR.v = dt > 0 ? Math.min(1, Math.abs(TR.x - xa) / dt / 18) : TR.v;
      if (!TR.somChegada && (1 - q) * TR.dur < 5.5 && (onde === TR.para || noTrem)) { TR.somChegada = true; trainArrive(0, 5); }
      if (q >= 1) {
        TR.fase = 'parado'; TR.em = TR.para; TR.tf = t; TR.v = 0;
        if (onde === TR.em || noTrem) trainStopSfx();
      }
    } else if (TR.fase === 'fora') {
      if (onde === 'plataforma' || onde === 'plataforma2') partir(onde, onde, false);
      else if (noTrem) partir('plataforma', onde, true);     // (seletor de cenas: já dentro dele)
    } else {
      const aqui = onde === TR.em || noTrem;
      const chamado = onde === outra(TR.em);                // você está esperando na outra estação
      if (TR.fase === 'parado') {
        if (chamado) partir(outra(TR.em), onde, noTrem);
        else if (aqui && t - TR.tf > .5) { TR.fase = 'abrindo'; sfxDoorSlide(); }
      } else if (TR.fase === 'abrindo') {
        TR.k = Math.min(1, TR.k + dt / .9);
        if (TR.k >= 1) { TR.fase = 'aberto'; TR.conta = 0; }
      } else if (TR.fase === 'aberto') {
        TR.conta = dentro && !noVao ? TR.conta + dt : 0;   // embarcou: lá dentro por um instante, fecha
        if (TR.conta > 1.2 || chamado || !aqui) { TR.fase = 'fechando'; if (aqui) sfxDoorSlide(); }
      } else if (TR.fase === 'fechando') {
        if (noVao) { TR.fase = 'abrindo'; sfxDoorSlide(); } // alguém no vão: a porta volta
        else {
          TR.k = Math.max(0, TR.k - dt / 1.0);
          if (TR.k <= 0) {
            if (dentro || chamado) partir(outra(TR.em), onde, noTrem);
            else { TR.fase = 'parado'; TR.tf = t; }
          }
        }
      }
    }
    vg.portas(TR.k);
    vg.andar(TR.v);
    vg.parada(TR.fase === 'viajando' || TR.fase === 'fora' ? null : COR[TR.em]);
    vg.letreiro(TR.fase === 'viajando' ? 'PRÓXIMA: ' + NOMES[TR.para] : NOMES[TR.em]);
    moverTrem();
  });

  return {
    // seletor de cenas: dentro do vagão, junto da porta
    spawn: { x: 0, z: .3, yaw: Math.PI },
    caption: sceneCaption('metro'),
    auto: day === 1 && !night ? { name: '', lines: linesOf('metro1') } : null,
    sway: () => TR.fase === 'viajando', // o vagão balança a câmera
  };
}
