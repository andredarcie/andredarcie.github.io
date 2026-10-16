import * as THREE from 'three';
import { DARK, NAVY, LIGHT, LIGHT2, BLUE, GLOW } from '../config.js';
import { day, night } from '../state.js';
import { linesOf, sceneCaption } from '../story.js';
import { freshScene, grp, anim, game, alinharSol, saida, chegada } from '../kit.js';
import { vagao, VAGAO } from '../vagao.js';

const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();

// as pontas da linha (mesmos nomes das plataformas)
const PONTAS = {
  plataforma: { nome: 'CENTRAL' },
  plataforma2: { nome: 'VIADUTO' },
};

/* ===================== CENA: O METRÔ (a viagem entre as duas estações) ===================== */
// Chega-se aqui já dentro do vagão, com as portas recém-fechadas na estação de origem (a troca
// aconteceu com elas fechadas, sem tela escura). O vagão arranca, corre no túnel e freia; parado,
// a cena troca de novo, ainda de portas fechadas, para a estação de destino — lá elas abrem.
// nav.entry = a estação de onde partiu; nav.rel = onde você está no vagão
export function buildMetro(nav = {}) {
  freshScene(8, 30);
  const origNome = PONTAS[nav.entry] ? nav.entry : night ? 'plataforma2' : 'plataforma';
  const destNome = origNome === 'plataforma' ? 'plataforma2' : 'plataforma';
  const destino = PONTAS[destNome];

  const g = grp(0, 0, 0);
  const v = vagao(g, { W: (x, z) => [x, z], nome: 'PRÓXIMA: ' + destino.nome });

  // arranca, cruza o túnel, freia; parado, segue para a plataforma de destino (portas ainda fechadas)
  const T_FREIA = 15, T_PARA = 18;
  let t0 = null, foi = false;
  anim(t => {
    if (t0 === null) t0 = t;
    const e = t - t0;
    if (e > .6 && game.arrived) game.arrived();                    // a legenda sai quando ele arranca
    v.andar(e < 3 ? e / 3 : e < T_FREIA ? 1 : Math.max(0, 1 - (e - T_FREIA) / (T_PARA - T_FREIA)));
    if (e >= T_PARA && !foi) {
      foi = true;
      const p = game.player();
      queueMicrotask(() => game.travel(destNome, 'trem', { x: p.px, z: p.pz, yaw: p.yaw, fy: 0 }));
    }
  });

  saida({ para: [destNome, 'trem'], mundo: null, pronto: false });   // a estação de destino, pré-montada
  // vindo da estação: no mesmo ponto do vagão (só se sabe na hora da troca)
  chegada(rel => {
    if (rel.fy !== undefined) alinharSol(0 - rel.fy);
    return { x: rel.x, z: rel.z, yaw: rel.yaw };
  });
  return {
    // sem viagem (seletor de cenas): junto da porta
    spawn: { x: VAGAO.DX, z: -.3, yaw: Math.PI },
    caption: sceneCaption('metro'),
    auto: day === 1 && !night ? { name: '', lines: linesOf('metro1') } : null,
    sway: true, // o vagão balança a câmera
  };
}
