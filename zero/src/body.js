import * as THREE from 'three';
import { BLUE } from './config.js';

/* ===================== o corpo do Zero (primeira pessoa) ===================== */
// Caixas azuis como as outras pessoas do jogo, sem cabeça (a câmera mora nela). Cada membro é
// uma caixa esticada entre duas juntas; braços e pernas se resolvem por IK de dois ossos, então
// basta dizer onde ficam as mãos e os pés.
// Espaço do corpo: raiz no chão entre os pés, x para a direita, y para cima, frente = -z.

export const BACK = .2;          // câmera à frente do pescoço: olhando para baixo, aparecem peito, pernas e pés
const CAM_F = .1;                // da cabeça até os olhos (a câmera), para a frente do corpo
const HIP_W = .11, THIGH = .46, SHIN = .45;
export const SOLE = .07;         // do tornozelo à sola
const SPINE = .5, HEAD = .15, SH_W = .24, UPPER = .32, FORE = .29;
// cabeça estabilizada: o balanço pequeno do tronco (remada) a câmera segue pela metade; numa inclinação
// grande (agachar sobre a canoa) ela acompanha quase tudo, senão o próprio peito tapa as mãos
const STEADY = .5, STEADY_ATE = .3;
export const STRIDE = .8;        // comprimento do passo (m): a fase da passada anda com a distância, pé não patina

// Rede de segurança contra ver o corpo por dentro: o que estiver a menos de NEAR_R1 da câmera
// some num pontilhado (todo some abaixo de NEAR_R0). É o "camera fade" dos jogos com corpo inteiro.
const NEAR_R0 = .08, NEAR_R1 = .16;  // estreito: só o que está quase encostando some (pontilhado discreto)
export function fadeNearCamera(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vNearW;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vNearW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vNearW;`)
      .replace('void main() {', `void main() {
  float nearK = (distance(vNearW, cameraPosition) - ${NEAR_R0.toFixed(2)}) / ${(NEAR_R1 - NEAR_R0).toFixed(2)};
  float nearN = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); // ruído de pontilhado
  if (nearK < nearN) discard;`);
  };
  mat.customProgramCacheKey = () => 'fadeNearCamera';
  return mat;
}

const mat = fadeNearCamera(new THREE.MeshLambertMaterial({ color: BLUE }));
export const body = new THREE.Group();
body.userData.persist = true;    // sobrevive à troca de cena (kit.freshScene)
body.visible = false;
const part = (w, h, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); body.add(m); return m; };
const torso = part(.42, SPINE - .04, .22), pelvis = part(.36, .2, .22);
const thigh = [part(.15, THIGH, .16), part(.15, THIGH, .16)];
const shin = [part(.13, SHIN, .14), part(.13, SHIN, .14)];
const foot = [part(.11, .07, .25), part(.11, .07, .25)];
const upper = [part(.095, UPPER, .105), part(.095, UPPER, .105)];  // braços um pouco finos: na 1ª pessoa
const fore = [part(.085, FORE, .085), part(.085, FORE, .085)];      // eles passam perto da câmera
const hand = [part(.08, .11, .05), part(.08, .11, .05)];

// a pose em espaço do corpo; [0] = esquerda, [1] = direita
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const pose = {
  hip: V(0, 1.0, 0),
  lean: .04,                     // tronco inclinado para a frente (rad)
  twist: 0,                      // ombros girados (+ = ombro direito para a frente)
  hands: [V(-.29, .84, .02), V(.29, .84, .02)],
  feet: [V(-.11, SOLE, -.06), V(.11, SOLE, -.06)],
  knee: V(0, .1, -1),            // para onde os joelhos apontam
};

/* ---------- montagem das caixas a partir da pose ---------- */
const Y = V(0, 1, 0);
const spine = V(0, 0, 0), right = V(0, 0, 0), back = V(0, 0, 0), neck = V(0, 0, 0);
const r0 = V(0, 0, 0), b0 = V(0, 0, 0), j = V(0, 0, 0), pl = V(0, 0, 0), wrist = V(0, 0, 0);
const d = V(0, 0, 0), bend = V(0, 0, 0), mid = V(0, 0, 0), tmp = V(0, 0, 0);
const m4 = new THREE.Matrix4();

function seg(m, a, b) {
  m.position.addVectors(a, b).multiplyScalar(.5);
  tmp.subVectors(b, a).normalize();
  m.quaternion.setFromUnitVectors(Y, tmp);
}
function orient(m, x, y, z) { m.quaternion.setFromRotationMatrix(m4.makeBasis(x, y, z)); }

// IK de dois ossos: da raiz `a` até o alvo, dobrando para o lado do ponto `pole`; devolve o fim em `out`
function limb(ma, mb, a, target, l1, l2, pole, out) {
  d.subVectors(target, a);
  let len = d.length();
  if (len < 1e-4) { d.set(0, -1, 0); len = l1 + l2; } else d.divideScalar(len);
  len = Math.min(Math.max(len, Math.abs(l1 - l2) + .02), (l1 + l2) * .999); // fora de alcance: estica
  const x = (l1 * l1 - l2 * l2 + len * len) / (2 * len);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  bend.subVectors(pole, a);
  bend.addScaledVector(d, -bend.dot(d));
  if (bend.lengthSq() < 1e-8) bend.set(0, 0, -1); else bend.normalize();
  mid.copy(a).addScaledVector(d, x).addScaledVector(bend, h);
  out.copy(a).addScaledVector(d, len);
  seg(ma, a, mid);
  seg(mb, mid, out);
}

export function applyPose() {
  const p = pose;
  spine.set(0, Math.cos(p.lean), -Math.sin(p.lean));
  right.set(Math.cos(p.twist), 0, -Math.sin(p.twist));
  right.addScaledVector(spine, -right.dot(spine)).normalize();
  back.crossVectors(right, spine);
  neck.copy(p.hip).addScaledVector(spine, SPINE);
  torso.position.copy(p.hip).addScaledVector(spine, SPINE / 2 + .02);
  orient(torso, right, spine, back);
  // a bacia gira só um pouco com os ombros
  const tw = p.twist * .3;
  r0.set(Math.cos(tw), 0, -Math.sin(tw));
  b0.crossVectors(r0, Y);
  pelvis.position.copy(p.hip).y -= .03;
  orient(pelvis, r0, Y, b0);
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1;
    // braço: ombro → mão, cotovelo para fora, para trás e para baixo
    j.copy(neck).addScaledVector(spine, -.07).addScaledVector(right, sd * SH_W);
    pl.copy(j).addScaledVector(right, sd * .45).addScaledVector(back, .6).addScaledVector(spine, -.4);
    limb(upper[i], fore[i], j, p.hands[i], UPPER, FORE, pl, wrist);
    tmp.subVectors(wrist, fore[i].position).normalize();          // a mão segue o antebraço
    hand[i].position.copy(wrist).addScaledVector(tmp, .045);
    hand[i].quaternion.copy(fore[i].quaternion);
    // perna: quadril → tornozelo, joelho para a frente
    j.copy(p.hip).addScaledVector(r0, sd * HIP_W);
    j.y -= .06;
    pl.copy(j).add(p.knee);
    limb(thigh[i], shin[i], j, p.feet[i], THIGH, SHIN, pl, wrist);
    foot[i].position.copy(wrist).addScaledVector(Y, -.035).addScaledVector(b0, -.07); // pé chato, ponta para a frente
    orient(foot[i], r0, Y, b0);
  }
}

// onde a câmera vê (espaço do corpo): a cabeça, mas só com metade da inclinação do tronco
export function headLocal(out) {
  const l = pose.lean < STEADY_ATE ? pose.lean * STEADY : pose.lean - STEADY_ATE * (1 - STEADY);
  spine.set(0, Math.cos(l), -Math.sin(l));
  return out.copy(pose.hip).addScaledVector(spine, SPINE + HEAD);
}
const hw = V(0, 0, 0), hf = V(0, 0, 0);
// a câmera são os olhos: camF à frente da cabeça na direção do CORPO, não do olhar. Girar a cabeça
// não leva os olhos para cima do ombro (era o que colava o braço na câmera olhando para o lado).
export function cameraFromHead(out, lookYaw, camF = CAM_F) {
  body.localToWorld(headLocal(hw));
  body.getWorldDirection(hf);                      // +z do corpo; a frente é o contrário
  hf.y = 0;
  if (hf.lengthSq() > 1e-6) hf.normalize();
  return out.copy(hw).addScaledVector(hf, -camF);
}

/* ---------- poses prontas ---------- */
// em pé / andando: w = fase da passada (um passo a cada π), amt = 0 parado … 1 andando
export function poseStand(w, amt, t) {
  const p = pose;
  p.hip.set(0, 1.0 - .045 * amt - .025 * amt * Math.abs(Math.cos(w)) + .005 * Math.sin(t * 1.7), 0); // perna quase reta em pé; andando desce um pouco para alcançar a passada
  p.lean = .04 + .06 * amt;
  p.twist = .09 * amt * Math.sin(w);                               // ombros contra os quadris
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1, ph = w + (i ? Math.PI : 0), s = Math.sin(ph), c = Math.cos(ph);
    p.feet[i].set(sd * .11, SOLE + .1 * amt * Math.max(0, c), -.06 - STRIDE / 2 * amt * s); // o pé que vai à frente sobe
    p.hands[i].set(sd * .3, .82 + .04 * amt * Math.abs(s), .02 + .24 * amt * s);     // braço oposto à perna, quase esticado
  }
  p.knee.set(0, .1, -1);
}
// sentado: quadril a hipY do chão (espaço do corpo), pés no chão, mãos nas coxas
export function poseSit(hipY, t) {
  const p = pose;
  p.hip.set(0, hipY, .03);
  p.lean = -.04 + .012 * Math.sin(t * 1.5);
  p.twist = 0;
  for (let i = 0; i < 2; i++) {
    const sd = i ? 1 : -1;
    p.feet[i].set(sd * .13, SOLE, -.5);
    p.hands[i].set(sd * .17, hipY + .13, -.3);
  }
  p.knee.set(0, .7, -1);
}

// pendura o corpo num objeto (cena, canoa…) com raiz em x,y,z e giro yaw
export function placeBody(parent, x, y, z, yaw) {
  if (body.parent !== parent) parent.add(body);
  body.position.set(x, y, z);
  body.rotation.set(0, yaw, 0);
  body.visible = true;
}

/* ===================== ações roteirizadas (embarcar, subir escada…) ===================== */
// O corpo fica pendurado em `frame` (um Object3D: a canoa, a cena). Cada passo dura `dur` s e
// leva o estado até os alvos que declara; o que ele não declara fica como está. Um alvo pode ser
// um valor ou uma função que devolve o valor (para seguir algo que se mexe, como a canoa).
//   root (V3, no frame) · yaw · hipY · hipZ · lean · twist · pitch / look (câmera, relativos ao corpo)
//   camF: quanto a câmera fica à frente da cabeça (menor quando há algo bem na frente do rosto)
//   hands / feet: [esq, dir] em coordenadas do frame (null = não mexe naquele membro)
//   arc: { hands: [h, h], feet: [h, h] } — o membro sobe h no meio do caminho (e afasta `away`)
//   walk: true — anda até o alvo com passadas, em vez de deslizar
//   at(k): chamado a cada quadro do passo; on(): no começo do passo (som, balanço da canoa…)
const val = v => (typeof v === 'function' ? v() : v);
const smooth = k => k * k * (3 - 2 * k);
const NUMS = ['yaw', 'hipY', 'hipZ', 'lean', 'twist', 'pitch', 'look', 'camF'];
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export function makeAction(frame, steps, t0) {
  // estado atual do corpo, em coordenadas do frame
  const st = {
    root: V(0, 0, 0), yaw: 0, hipY: pose.hip.y, hipZ: pose.hip.z, lean: pose.lean, twist: pose.twist,
    pitch: 0, look: 0, camF: t0.camF ?? CAM_F, hands: [V(0, 0, 0), V(0, 0, 0)], feet: [V(0, 0, 0), V(0, 0, 0)],
  };
  frame.attach(body);                                      // mantém onde o corpo está no mundo
  st.root.copy(body.position);
  const f0 = V(0, 0, -1).applyQuaternion(body.quaternion);
  st.yaw = Math.atan2(-f0.x, -f0.z);
  body.rotation.set(0, st.yaw, 0);
  const toFrame = (v, out) => out.copy(v).applyAxisAngle(Y, st.yaw).add(st.root);
  for (let i = 0; i < 2; i++) { toFrame(pose.hands[i], st.hands[i]); toFrame(pose.feet[i], st.feet[i]); }
  st.pitch = t0.pitch; st.look = t0.look;

  let i = -1, tt = 0, from = null, wph = 0;
  const snap = () => ({
    root: st.root.clone(), yaw: st.yaw, hipY: st.hipY, hipZ: st.hipZ, lean: st.lean, twist: st.twist,
    pitch: st.pitch, look: st.look, camF: st.camF, hands: st.hands.map(v => v.clone()), feet: st.feet.map(v => v.clone()),
  });
  const next = () => { i++; tt = 0; from = snap(); if (steps[i] && steps[i].on) steps[i].on(); };
  next();
  const lv = V(0, 0, 0), up = V(0, 0, 0);

  return {
    state: st,
    // devolve false quando acabou
    update(dt, t) {
      while (steps[i] && tt >= steps[i].dur) next();
      const s = steps[i];
      if (!s) return false;
      tt += dt;
      const k = smooth(Math.min(tt / s.dur, 1)), kl = Math.min(tt / s.dur, 1);
      const prevRoot = st.root.clone();
      if (s.root) st.root.lerpVectors(from.root, val(s.root), k);
      for (const n of NUMS) if (s[n] !== undefined) st[n] = n === 'yaw' || n === 'look' ? lerpAng(from[n], val(s[n]), k) : from[n] + (val(s[n]) - from[n]) * k;
      for (const part of ['hands', 'feet']) {
        const tg = s[part];
        if (!tg) continue;
        for (let m = 0; m < 2; m++) {
          if (!tg[m]) continue;
          st[part][m].lerpVectors(from[part][m], val(tg[m]), k);
          const a = s.arc && s.arc[part] && s.arc[part][m];
          if (a) {                                         // arco: sobe e afasta no meio do movimento
            const bump = Math.sin(Math.PI * kl);
            st[part][m].y += a * bump;
            if (s.away) { up.set(0, 0, 1).applyAxisAngle(Y, st.yaw); st[part][m].addScaledVector(up, s.away * bump); }
          }
        }
      }
      body.position.copy(st.root);
      body.rotation.set(0, st.yaw, 0);
      pose.hip.set(0, st.hipY, st.hipZ);
      pose.lean = st.lean; pose.twist = st.twist;
      if (s.walk) {
        // passadas: a fase anda com a distância percorrida; os membros ficam com a pose de andar
        wph += prevRoot.distanceTo(st.root) * Math.PI / STRIDE;
        poseStand(wph, Math.min(1, Math.sin(Math.PI * kl) * 4), t);  // acelera e para no fim
        st.hipY = pose.hip.y; st.hipZ = pose.hip.z; st.lean = pose.lean; st.twist = pose.twist;
        for (let m = 0; m < 2; m++) { toFrame(pose.hands[m], st.hands[m]); toFrame(pose.feet[m], st.feet[m]); }
      } else {
        for (let m = 0; m < 2; m++) {
          pose.hands[m].copy(st.hands[m]).sub(st.root).applyAxisAngle(Y, -st.yaw);
          pose.feet[m].copy(st.feet[m]).sub(st.root).applyAxisAngle(Y, -st.yaw);
        }
      }
      if (s.knee) pose.knee.copy(s.knee);
      if (s.at) s.at(kl);
      applyPose();
      return true;
    },
    // câmera na cabeça, olhando para a frente do corpo (+ look) com inclinação pitch
    camera(cam) {
      const wq = body.getWorldQuaternion(new THREE.Quaternion());
      const fwd = lv.set(0, 0, -1).applyQuaternion(wq);
      const lookYaw = Math.atan2(-fwd.x, -fwd.z) + st.look;
      cameraFromHead(cam.position, lookYaw, st.camF);
      cam.rotation.set(st.pitch, lookYaw, 0);
      return { yaw: lookYaw, pitch: st.pitch };
    },
  };
}
