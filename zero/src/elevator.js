import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, BLUE, GLOW } from './config.js';
import { objectName } from './story.js';
import { camera } from './renderer.js';
import { box, lite, grp, pointLight, anim, tag, walkOf, game, alinharSol, saida, chegada } from './kit.js';
import { sfxDoorSlide, sfxDing, sfxElevator } from './audio.js';

/* ===================== elevador: a mesma cabine nas duas pontas do poço ===================== */
// A viagem não tem corte: aperta o botão lá dentro, as portas fecham, a cabine anda; com as portas
// ainda fechadas o jogador passa (game.travel) para a cabine do outro andar — no mundo (mapa.js) ela
// fica no mesmo poço, ANDAR metros por andar acima ou abaixo. A viagem termina do lado de lá, a
// campainha toca e as portas abrem no outro andar. O jogador guarda a posição e o giro dentro da
// cabine (rel), então nada pula na troca.
//
// Coordenadas locais: origem no chão, no centro do vão, na face da parede do patamar;
// +z sai da cabine para o patamar; a cabine fica atrás da parede (z negativo).
const DW = 1.0, DH = 2.1;                 // vão da porta
const CW = .75, CZ0 = -.18, CZ1 = -1.8;   // meia largura e fundo da cabine
const CH = 2.35;                          // pé-direito da cabine
const T_DOOR = 1.0, T_GO = 2.6, T_ARRIVE = 2.0; // portas · viagem deste lado · viagem do lado de lá
const K_SWAP = T_GO / (T_GO + T_ARRIVE);  // fração da viagem em que a cena troca

// onde ficar na cabine quando se chega de elevador sem viagem de verdade (seletor de cenas)
export const CABINE = { x: 0, z: -1.0, yaw: Math.PI };

const num = f => (f === 'T' ? 0 : Number(f));
const label = n => (n === 0 ? 'T' : String(n));

// { x, z }: centro do vão na face da parede; yaw: para onde a porta abre
// wall: { w, H, c? } monta a parede do patamar com o vão (omitida quando a cena já deixou o vão)
// here / there: andar desta parada e da outra ('T' = térreo); to: [cena, entrada] da outra ponta
// arrive: { x, z, yaw } do jogador dentro da cabine quando chega viajando (portas fechadas)
// devolve { spawn }: onde o jogador nasce chegando de elevador
export function elevador({ x, z, yaw, wall, here, there, to, arrive }) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const L = (wx, wz) => { const dx = wx - x, dz = wz - z; return [dx * c - dz * s, dx * s + dz * c]; };
  const rect = (x1, z1, x2, z2) => {
    const a = W(x1, z1), b = W(x2, z2);
    return walkOf(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]));
  };

  const g = grp(x, 0, z);
  g.rotation.y = yaw;

  // ---------- patamar: parede com o vão, batentes, soleira ----------
  if (wall) {
    const sw = wall.w / 2 - DW / 2, wc = wall.c ?? LIGHT;
    for (const k of [-1, 1]) box(sw, wall.H, .18, wc, k * (DW / 2 + sw / 2), wall.H / 2, -.09, g);
    box(DW, wall.H - DH, .18, wc, 0, (wall.H + DH) / 2, -.09, g);
  }
  for (const k of [-1, 1]) box(.1, DH + .1, .06, LIGHT2, k * (DW / 2 + .05), (DH + .1) / 2, .02, g);
  box(DW + .2, .1, .06, LIGHT2, 0, DH + .05, .02, g);
  box(DW, .02, .2, LIGHT2, 0, .01, -.1, g);

  // ---------- cabine ----------
  const zc = (CZ0 + CZ1) / 2, dz = CZ0 - CZ1;
  box(CW * 2, .1, dz, DARK, 0, -.05, zc, g);                         // piso
  box(CW * 2 + .12, .06, dz + .06, DARK2, 0, CH + .03, zc, g);       // teto
  box(CW * 2, CH, .06, LIGHT2, 0, CH / 2, CZ1 - .03, g);             // fundo
  for (const k of [-1, 1]) {
    box(.06, CH, dz, LIGHT2, k * (CW + .03), CH / 2, zc, g);         // laterais
    const pw = CW - DW / 2;
    box(pw, CH, .05, LIGHT2, k * (DW / 2 + pw / 2), CH / 2, CZ0 - .025, g); // frente, ao lado da porta
  }
  box(DW, CH - DH, .05, LIGHT2, 0, (CH + DH) / 2, CZ0 - .025, g);    // frente, sobre a porta
  box(1.1, .9, .01, NAVY, 0, 1.45, CZ1 + .005, g);                   // espelho no fundo
  box(CW * 2 - .1, .05, .05, LIGHT, 0, .95, CZ1 + .06, g);           // corrimão
  lite(1.0, .02, 1.0, GLOW, 0, CH - .01, zc, g);                     // luminária
  const [plx, plz] = W(0, zc);
  pointLight(.4, 4, plx, 2.1, plz);

  // portas da cabine: duas folhas que correm para dentro da parede
  const folhas = [-1, 1].map(k => box(DW / 2, DH, .04, LIGHT2, k * DW / 4, DH / 2, -.09, g));
  for (const f of folhas) box(.012, DH - .1, .05, DARK2, 0, 0, 0, f); // friso no meio de cada folha

  // ---------- mostrador do andar (fora, sobre a porta; dentro, sobre a porta) ----------
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 64;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const telaMat = new THREE.MeshBasicMaterial({ map: tex });
  let shown = null;
  function mostrador(n, dir) {
    const key = n + '|' + dir;
    if (key === shown) return;
    shown = key;
    const x2 = cv.getContext('2d');
    x2.fillStyle = '#263848'; x2.fillRect(0, 0, 128, 64);
    x2.fillStyle = '#3aa2ea';
    x2.font = '50px VT323, monospace'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
    x2.fillText(label(n), 80, 35);
    if (dir) {
      x2.beginPath();
      if (dir < 0) { x2.moveTo(18, 22); x2.lineTo(46, 22); x2.lineTo(32, 44); }
      else { x2.moveTo(18, 44); x2.lineTo(46, 44); x2.lineTo(32, 22); }
      x2.fill();
    }
    tex.needsUpdate = true;
  }
  if (document.fonts) document.fonts.ready.then(() => { shown = null; }); // redesenha com a fonte VT323
  box(.42, .24, .02, DARK2, 0, DH + .3, .01, g);
  const telaFora = new THREE.Mesh(new THREE.PlaneGeometry(.36, .18), telaMat);
  telaFora.position.set(0, DH + .3, .025);
  g.add(telaFora);
  const telaDentro = new THREE.Mesh(new THREE.PlaneGeometry(.3, .15), telaMat);
  telaDentro.position.set(0, DH + .125, CZ0 - .055);
  telaDentro.rotation.y = Math.PI;
  g.add(telaDentro);

  // ---------- botões: chamar (fora) e o painel de andares (dentro, na parede direita) ----------
  const desce = num(there) < num(here);
  const chamar = grp(DW / 2 + .3, 1.1, .015, g);
  box(.1, .2, .03, LIGHT2, 0, 0, 0, chamar);
  lite(.045, .045, .02, BLUE, 0, .03, .02, chamar);
  const painel = grp(CW - .015, 1.2, CZ0 - .4, g);
  box(.03, .46, .2, LIGHT2, 0, 0, 0, painel);
  lite(.02, .05, .05, desce ? GLOW : BLUE, -.02, -.08, 0, painel);   // o botão desta viagem, aceso
  lite(.02, .05, .05, desce ? BLUE : GLOW, -.02, .08, 0, painel);
  lite(.02, .03, .1, DARK2, -.02, .18, 0, painel);                   // plaquinha
  const interChamar = { name: objectName('callElevator'), cb: () => abrir() };
  const interPainel = { name: objectName(desce ? 'elevatorDown' : 'elevatorUp'), cb: () => partir() };
  tag(chamar, interChamar.name, interChamar);
  tag(painel, interPainel.name, interPainel);

  // ---------- chão: a cabine sempre; o vão só com a porta aberta ----------
  rect(-CW + .02, CZ1 + .02, CW - .02, CZ0);
  const vao = rect(-DW / 2, CZ0 - .1, DW / 2, .8);   // avança no patamar até emendar no chão da cena
  const vaoAberto = { ...vao };
  const setVao = on => Object.assign(vao, on ? vaoAberto : { x1: 1e9, x2: -1e9 });

  // ---------- a viagem ----------
  const onde = () => { const p = game.player(); return L(p.px, p.pz); };
  const dentro = () => { const [lx, lz] = onde(); return Math.abs(lx) < CW && lz < CZ0 - .25 && lz > CZ1; };
  const naFrente = () => { const [lx, lz] = onde(); return Math.abs(lx) < 2.5 && lz > .05; };
  let st = arrive ? 'arriving' : 'closed', tS = null, d = 0, k = arrive ? K_SWAP : 0;
  let origem = num(arrive ? there : here), destino = num(arrive ? here : there);
  function abrir() { if (st !== 'closed' || !naFrente()) return; st = 'opening'; tS = null; sfxDoorSlide(); }
  function partir() {
    if ((st !== 'open' && st !== 'closed') || !dentro()) return;
    st = 'closing'; tS = null; sfxDoorSlide();
    origem = num(here); destino = num(there);
  }

  anim(t => {
    if (tS === null) tS = t;
    const e = t - tS;
    let shake = 0;
    if (st === 'opening') {
      d = Math.min(1, e / T_DOOR);
      if (d >= 1) st = 'open';
    } else if (st === 'closing') {
      d = Math.max(0, 1 - e / T_DOOR);
      if (d <= 0) { st = 'riding'; tS = t; sfxElevator(T_GO + T_ARRIVE); }
    } else if (st === 'riding') {
      k = Math.min(K_SWAP, e / (T_GO + T_ARRIVE));
      shake = e < .7 ? -Math.sin(e / .7 * Math.PI) * .025 : 0;          // o tranco da partida
      if (e >= T_GO) {
        // a cabine deste andar fica de portas fechadas, pronta para ser chamada de novo
        st = 'closed'; tS = t; d = 0; k = 0;
        const p = game.player(), [lx, lz] = L(p.px, p.pz);
        // troca depois deste quadro: o laço de anims ainda está rodando as do lugar atual
        queueMicrotask(() => game.travel(to[0], to[1], { x: lx, z: lz, yaw: p.yaw - yaw, fy: yaw }));
      }
    } else if (st === 'arriving') {
      k = Math.min(1, K_SWAP + e / (T_GO + T_ARRIVE));
      const r = T_ARRIVE - e;
      shake = r < .7 ? Math.sin(Math.max(0, r) / .7 * Math.PI) * .02 : 0; // assenta no andar
      if (e >= T_ARRIVE) {
        k = 1; st = 'opening'; tS = t;
        sfxDing(); sfxDoorSlide();
        if (game.arrived) game.arrived();
      }
    }
    if ((st === 'riding' || st === 'arriving') && dentro())
      camera.position.y += shake + Math.sin(t * 31) * .0025 + Math.sin(t * 17.3) * .0015; // o poço vibrando

    const sm = d * d * (3 - 2 * d);
    folhas[0].position.x = -(DW / 4 + sm * DW / 2);
    folhas[1].position.x = DW / 4 + sm * DW / 2;
    setVao(d > .85);
    const andando = st === 'riding' || st === 'arriving';
    mostrador(andando ? Math.round(origem + (destino - origem) * k) : num(here), andando ? Math.sign(destino - origem) : 0);
    // botões só valem de onde se alcançam de verdade (a mira atravessa paredes)
    chamar.userData.inter = st === 'closed' && naFrente() ? interChamar : null;
    painel.userData.inter = (st === 'open' || st === 'closed') && dentro() ? interPainel : null;
  });

  // a outra ponta do poço
  saida({ para: to, mundo: null, pronto: false });

  // chegando de viagem do outro andar: a cabine daqui termina a viagem (portas fechadas, depois abrem)
  // e o jogador fica no mesmo ponto da cabine em que estava
  chegada(rel => {
    st = 'arriving'; tS = null; d = 0; k = K_SWAP;
    origem = num(there); destino = num(here);
    const [sx, sz] = W(rel.x, rel.z);
    return { x: sx, z: sz, yaw: rel.yaw + yaw };
  });
  if (!arrive) return { spawn: null };
  const [sx, sz] = W(arrive.x, arrive.z);
  return { spawn: { x: sx, z: sz, yaw: arrive.yaw + yaw } };
}
