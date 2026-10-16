import * as THREE from 'three';
import { DARK, DARK2, NAVY, LIGHT, LIGHT2, FLOOR, BLUE, GLOW } from './config.js';
import { box, lite, grp, anim, walkOf, tag, game, scene, mundo, saida } from './kit.js';
import { sfxDoorSlide } from './audio.js';

/* ===================== vestíbulo: a passagem entre dois lugares ===================== */
// Um cômodo pequeno de duas portas que existe IGUAL nos dois lugares (montado por esta função). No
// mundo (mapa.js) as duas cópias ocupam o mesmo lugar: o mundo.js desenha só uma delas e liga as
// portas das duas (a mesma `ponte`). As portas abrem sozinhas quando você chega perto e fecham
// quando você se afasta; pela porta de lá se passa andando para o outro lugar.
//
// Coordenadas locais: chão no centro; a porta do lado P em z = -1, a do lado Q em z = +1.
// lado: de qual lado está a cena atual ('P' ou 'Q'); outro: [cena, entrada] da cena do outro lado.
// estilo: 'hall' (apartamento, de abrir), 'vidro' (portaria/loja, de correr),
//         'metro' (passagem da estação, de correr), 'servico' (portinha, de abrir)
export const VEST = { VW: 1.1, VD: 1, VH: 2.7 };
const { VW, VD, VH } = VEST;              // meia largura, meia profundidade, pé-direito
const DW = .55, DH = 2.2;                  // meia largura e altura do vão das portas
const T_PORTA = .55;                       // abrir/fechar (s)
const PERTO = 2.3;                         // a porta abre quando você chega a esta distância dela

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();
const ESTILOS = {
  hall:    { parede: LIGHT, chao: FLOOR, folha: DARK2, batente: LIGHT2, giro: true },
  vidro:   { parede: LIGHT2, chao: DARK2, folha: mix(NAVY, LIGHT, .3), batente: LIGHT, giro: false },
  metro:   { parede: LIGHT, chao: FLOOR, folha: LIGHT2, batente: DARK2, giro: false },
  servico: { parede: mix(LIGHT2, DARK2, .45), chao: DARK2, folha: DARK, batente: LIGHT2, giro: true },
};

// { x, y, z }: centro do chão do vestíbulo nesta cena; yaw: para onde aponta o +z local (o lado Q)
// arrive: chega-se à cena por este vestíbulo (true = no meio, de frente para a porta deste lado)
// bloqueada: a porta deste lado só abre para quem vem de dentro do vestíbulo (o quarto no dia 3 e de noite);
//   interTrancada: o que o E faz nela trancada, de fora ({ name, ...opções de tag }, ex.: pular o dia 4)
// alcance: até onde o chão do vão avança para fora (emenda no chão andável da cena)
// abre: as duas portas só abrem enquanto devolver true (o portão de embarque, antes da passagem)
// devolve { spawn }
export function vestibulo({ x, y = 0, z, yaw, lado, outro, estilo = 'vidro', arrive = null, bloqueada = false, interTrancada = null, alcance = .9, abre = () => true }) {
  const st = ESTILOS[estilo];
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const L = (wx, wz) => { const dx = wx - x, dz = wz - z; return [dx * c - dz * s, dx * s + dz * c]; };
  const rect = (x1, z1, x2, z2) => {
    const a = W(x1, z1), b = W(x2, z2);
    return walkOf(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]));
  };
  const g = grp(x, y, z);
  g.rotation.y = yaw;

  // ---------- o cômodo ----------
  box(VW * 2, .1, VD * 2, st.chao, 0, -.046, 0, g);                     // piso (4 mm acima: o chão da cena entra embaixo dele sem piscar)
  box(VW * 2 + .32, .1, VD * 2 + .32, DARK2, 0, VH + .05, 0, g);        // teto
  for (const k of [-1, 1]) box(.16, VH, VD * 2, st.parede, k * (VW + .08), VH / 2, 0, g); // laterais
  lite(.5, .03, .5, GLOW, 0, VH - .015, 0, g);                          // luminária
  const luz = new THREE.PointLight(0xeaf2f2, .45, 4.5);
  luz.position.set(0, 2.3, 0);                                          // no grupo: some junto com a cópia escondida
  g.add(luz);
  // detalhes de cada estilo (iguais nos dois lados, senão a troca aparece)
  if (estilo === 'hall') {
    box(.04, .06, .5, DARK2, -VW + .02, 1.6, 0, g);                     // cabideiro
    for (const hz of [-.15, .15]) box(.06, .14, .04, DARK2, -VW + .05, 1.55, hz, g);
    box(.32, .55, .7, LIGHT2, VW - .16, .275, 0, g);                    // sapateira
    box(.9, .02, .6, DARK2, 0, .01, 0, g);                              // tapete
  } else if (estilo === 'vidro') {
    box(1.6, .02, 1.2, DARK, 0, .01, 0, g);                             // capacho
  } else if (estilo === 'metro') {
    lite(.02, .3, 1.2, mix(NAVY, BLUE, .4), -VW + .01, 1.9, 0, g);       // faixa de sinalização
    box(.03, .04, 1.6, DARK2, VW - .02, .95, 0, g);                     // corrimão de parede
  } else {
    box(.6, .02, .5, DARK, 0, .01, .1, g);
  }

  // ---------- as duas portas: parede de ponta com o vão, batentes e folhas ----------
  const portas = {};
  for (const [nome, sz] of [['P', -1], ['Q', 1]]) {
    const zp = sz * VD;
    const pw = VW + .16 - DW;                                           // pedaço de parede ao lado do vão
    for (const k of [-1, 1]) box(pw, VH, .16, st.parede, k * (DW + pw / 2), VH / 2, zp, g);
    box(DW * 2, VH - DH, .16, st.parede, 0, (VH + DH) / 2, zp, g);
    for (const k of [-1, 1]) box(.08, DH + .08, .2, st.batente, k * (DW + .04), (DH + .08) / 2, zp, g);
    box(DW * 2 + .16, .08, .2, st.batente, 0, DH + .04, zp, g);
    const folhas = [];
    if (st.giro) {
      // de abrir: dobradiça num batente, gira para fora do vestíbulo (para a cena do lado dela)
      const piv = grp(-DW, 0, zp, g);
      const f = box(DW * 2 - .02, DH - .02, .05, st.folha, DW, DH / 2, 0, piv);
      box(.06, .06, .09, BLUE, DW - .12, 1.02 - DH / 2, 0, f);          // maçaneta (dos dois lados)
      folhas.push({ piv, sz, f });
    } else {
      // de correr: duas folhas que somem dentro da parede de ponta
      for (const k of [-1, 1]) {
        const f = box(DW, DH - .02, .04, st.folha, k * DW / 2, DH / 2, zp, g);
        box(.04, 1.2, .05, st.batente, -k * (DW / 2 - .06), 0, 0, f);   // puxador
        folhas.push({ f, k });
      }
    }
    portas[nome] = { zp, folhas };
  }
  const desenha = (p, k) => {
    const e = k * k * (3 - 2 * k);
    for (const fo of p.folhas) {
      if (fo.piv) fo.piv.rotation.y = (fo.sz < 0 ? 1 : -1) * e * Math.PI * .5;
      else fo.f.position.x = fo.k * (DW / 2 + e * DW);
    }
  };
  // o quanto cada porta está aberta (0..1). A cópia deste cômodo na cena vizinha passa a usar o MESMO
  // objeto (o main.js liga as duas): quem mexe é a da cena atual, e as duas folhas andam juntas
  const ponte = { est: { P: 0, Q: 0 }, par: null, desenha: () => { desenha(portas.P, ponte.est.P); desenha(portas.Q, ponte.est.Q); } };
  ponte.desenha();

  const nomeDele = lado === 'P' ? 'Q' : 'P';
  const zs = portas[lado].zp, sz = Math.sign(zs), zd = portas[nomeDele].zp;

  // ---------- chão: o cômodo sempre; o vão da porta deste lado só com ela aberta ----------
  // (pela porta de lá não se sai daqui: antes de chegar nela a cena já trocou para a do outro lado)
  rect(-VW, -VD + .02, VW, VD - .02);
  const vao = rect(-DW, zs - sz * .3, DW, zs + sz * alcance);
  const vaoAberto = { ...vao };
  const setVao = on => Object.assign(vao, on ? vaoAberto : { x1: 1e9, x2: -1e9 });
  setVao(false);

  // ---------- trancada por fora com algo a fazer (E): um alvo invisível no vão ----------
  let alvoPorta = null;
  if (interTrancada) {
    alvoPorta = new THREE.Mesh(new THREE.BoxGeometry(DW * 2, DH, .36), new THREE.MeshBasicMaterial({ visible: false }));
    alvoPorta.position.set(0, DH / 2, zs);
    g.add(alvoPorta);
    tag(alvoPorta, interTrancada.name, interTrancada);
    alvoPorta.userData.inter = null;
  }

  // ---------- a ligação com o lugar do outro lado (o mundo.js junta as duas cópias) ----------
  const eu = mundo;
  const sai = saida({
    para: outro, chegada: !!arrive, mundo: null, pronto: false, urgente: false,
    portal: { x, y, z, yaw, zd, ponte, grupo: g, aberta: () => ponte.est[nomeDele] },
  });

  // ---------- portas automáticas ----------
  let tl = null;
  anim(t => {
    const dt = tl === null ? 0 : Math.min(.05, t - tl);
    tl = t;
    // o chão do vão segue a porta deste lado nas duas cópias (quem a mexe é a cópia do lugar atual)
    setVao(ponte.est[lado] > .6);
    if (!eu.ativo) return;
    const p = game.player(), [lx, lz] = L(p.px, p.pz);
    const dentro = Math.abs(lx) < VW && Math.abs(lz) < VD - .05;
    const pertoDe = zp => Math.abs(lx) < VW + .6 && Math.abs(lz - zp) < PERTO;
    // nunca fecha com você em cima do chão do vão: fechada, ele some, e quem estivesse ali ficava preso
    const fora = (lz - zs) * sz;
    const noVao = Math.abs(lx) < DW + .35 && fora > -.6 && fora < alcance + .45;
    const mexe = (nome, quer) => {
      const a = ponte.est[nome];
      const k = quer ? Math.min(1, a + dt / T_PORTA) : Math.max(0, a - dt / T_PORTA);
      if ((a === 0 && k > 0) || (a === 1 && k < 1)) sfxDoorSlide();
      ponte.est[nome] = k;
    };
    // a deste lado: trancada, só abre para quem vem de dentro (dá para chegar em casa de noite, não para sair)
    const pode = abre();
    mexe(lado, (pode && pertoDe(zs) && (!bloqueada || dentro)) || (ponte.est[lado] > 0 && noVao));
    // a de lá: só com o lugar do outro lado no mundo (sem ele, o vão daria no vazio)
    const foraDeLa = (lz - zd) * -sz;
    const noVaoDeLa = Math.abs(lx) < DW + .35 && foraDeLa > -.6 && foraDeLa < 1.4;
    mexe(nomeDele, (pode && pertoDe(zd) && sai.pronto) || (ponte.est[nomeDele] > 0 && noVaoDeLa));
    setVao(ponte.est[lado] > .6);
    ponte.desenha();
    if (ponte.par) ponte.par.desenha();
    if (alvoPorta) alvoPorta.userData.inter = bloqueada && !dentro && pertoDe(zs) && ponte.est[lado] === 0 ? interTrancada : null;
  });

  if (!arrive) return { spawn: null };
  // chegando por aqui sem travessia (seletor de cenas, início do dia): na metade deste lado, de frente para a porta
  const rel = arrive === true ? { x: 0, z: sz * .3, yaw: sz < 0 ? 0 : Math.PI } : arrive;
  const [sx, szw] = W(rel.x, rel.z);
  return { spawn: { x: sx, z: szw, yaw: rel.yaw + yaw } };
}
