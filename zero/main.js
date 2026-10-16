import * as THREE from 'three';
import { SEQUENCES } from './src/config.js';
import { day, night, setDay, setNight } from './src/state.js';
import { renderer, camera } from './src/renderer.js';
import { dotEl, promptEl, prName, tbEl, capEl, fadeEl, titleEl, pauseEl, endEl, btnE, stickL, stickR, configureStaticUI } from './src/ui.js';
import { initAudio, resumeAudio, suspendAudio, updateMusic, setPad, setAmb, chime, endChord, sfxStep, sfxType, sfxSit, sfxWhoosh, silenciar } from './src/audio.js';
import { drawTerm } from './src/terminal.js';
import { say, nextPage, closeText, textOpen } from './src/dialog.js';
import { speakerName, linesOf } from './src/story.js';
import { scene, walks, blocks, anims, inters, triggers, game, completarLuzes, mundo, usarMundo, descartarMundo, drawIdle } from './src/kit.js';
import { VEST } from './src/vestibulo.js';
import { builders } from './src/scenes/index.js';
import { IS_MOBILE, IS_LOCAL, joyL, joyR, moveAxes, bindStick, resetSticks } from './src/input.js';
import { installDebugMenu } from './src/debug.js';
import { body, BACK, STRIDE, poseStand, poseSit, applyPose, placeBody, headLocal } from './src/body.js';

/* ===================== estado ===================== */
let px = 0, pz = 0, yaw = 0, pitch = 0;
let sway = false;    // vagão balançando a câmera
let elevFn = null;   // altura do chão por cena (calçada, escada...)
let seated = false;  // preso numa poltrona (avião): só olha, não anda
let seatBody = null; // corpo sentado nessa poltrona: { yaw, hipY, back }
let started = false, ended = false, transit = false;
let target = null;   // objeto interativo sob a mira
let capTimer = 0, autoTimer = 0;
let term = null;     // sessão de terminal ativa
let camAnim = null;  // animação de câmera (sentar / levantar / sair da cama)
let poseHold = null; // câmera travada numa pose (acordar: deitado, olhos abrindo)
// veículo pilotado (a canoa da praia). Contrato do objeto, montado pela cena:
//   move(dt, frente, lado, yaw) → os eixos de andar remam
//   camera(t, yaw, pos) → assenta veículo e corpo, escreve a câmera em pos e devolve {pitch, roll}
let ride = null;
// ação de corpo inteiro (embarcar, subir a escada), montada pela cena via tag({ act }):
//   act({ px, pz, yaw, pitch }) → { update(dt, t) → false ao acabar, camera(cam) → {yaw, pitch},
//                                   result() → { ride? , walk?: {x, z}, then? } }
let action = null;
let walkAmt = 0;     // 0 parado … 1 andando (para as pernas do corpo)
let walkPh = 0, lastPX = 0, lastPZ = 0; // fase da passada: anda com a distância percorrida (o pé não patina)

// câmera roteirizada: enquanto houver uma, o jogador não anda nem mira
const cutscene = () => !!(term || camAnim || poseHold || action);

/* ===================== terminal: sentar, digitar, levantar ===================== */
function startTerm(it, cb) {
  const s = it.seat, L = it.look;
  const dx = L.x - s.x, dy = L.y - s.y, dz = L.z - s.z;
  term = {
    lines: it.terminal, idx: 0, chars: 0,
    typing: false, waiting: false, blink: 1, cb,
    sentado: it.sentado || null,  // sequência que roda ainda sentado, antes de levantar (ex.: anoitecer)
    pose: { x: s.x, y: s.y, z: s.z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) },
  };
  camAnim = {
    t: 0, dur: .9,
    from: { x: px, y: 1.6, z: pz, yaw, pitch },
    to: term.pose,
    then: () => { term.typing = true; drawTerm(term); },
  };
  sfxSit();
}
function exitTerm() {
  const cb = term.cb;
  term.typing = false;
  camAnim = {
    t: 0, dur: .9,
    from: { ...term.pose },
    to: { x: px, y: 1.6, z: pz, yaw, pitch },
    then: () => { term = null; if (cb) cb(); },
  };
  sfxSit();
}
function termE() {
  if (!term || camAnim || !term.typing) return;
  const cur = term.lines[term.idx];
  if (term.chars < cur.length) { term.chars = cur.length; term.waiting = true; drawTerm(term); return; }
  if (term.idx < term.lines.length - 1) {
    term.idx++; term.chars = 0; term.waiting = false;
    drawTerm(term);
  } else if (term.sentado) {
    const key = term.sentado;
    term.sentado = null;
    term.typing = false;                        // a tela para; o E agora é das falas
    runSequence(key, () => exitTerm());
  } else exitTerm();
}
function updateTerm(t, dt) {
  if (!term) return;
  // datilografia
  if (term.typing && !term.waiting) {
    const cur = term.lines[term.idx];
    const prev = Math.floor(term.chars);
    term.chars = Math.min(term.chars + dt * 30, cur.length);
    if (term.chars >= cur.length) { term.waiting = true; drawTerm(term); }
    else if (Math.floor(term.chars) !== prev) { sfxType(); drawTerm(term); }
  }
  // cursor piscando à espera do E
  if (term.waiting) {
    const b = Math.floor(t * 2) % 2;
    if (b !== term.blink) { term.blink = b; drawTerm(term); }
  }
}

/* ===================== ações de corpo inteiro e veículo ===================== */
const eyeY = (x, z) => (elevFn ? elevFn(x, z) : 0) + 1.6;
function startAction(make) {
  action = make({ px, pz, yaw, pitch });
  ride = null; // a ação é dona do corpo e da câmera até acabar
}
function finishAction() {
  const look = action.camera(camera), r = action.result();
  action = null;
  yaw = look.yaw; pitch = look.pitch;
  if (r.ride) ride = r.ride;
  if (r.walk) { px = r.walk.x; pz = r.walk.z; }
  if (r.then) r.then();
}

// cutscene que mira um ponto: a câmera vira devagar até ele e fica travada até a cena acabar
function focusOn(p, cb) {
  const y = eyeY(px, pz);
  const dx = p.x - px, dy = p.y - y, dz = p.z - pz;
  const pose = { x: px, y, z: pz, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
  camAnim = {
    t: 0, dur: 1.8,
    from: { x: px, y, z: pz, yaw, pitch },
    to: pose,
    then: () => { poseHold = pose; cb(); },
  };
}

/* ===================== sequências do roteiro (game-context.json) ===================== */
function runSequence(key, done) {
  const steps = SEQUENCES[key] || [];
  const run = i => {
    const step = steps[i];
    if (!step) { if (done) done(); return; }
    if (step.say) {
      say(speakerName(step.say.speaker), linesOf(step.say.script), () => run(i + 1));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(step, 'setDay')) setDay(step.setDay);
    if (step.nextDay) setDay(day + 1);          // dormir: o dia seguinte começa
    if (step.night) setNight(true);             // fim do expediente: a volta é de noite
    if (step.anoitecer) {                       // a noite chega na própria cena, sem trocar de mapa
      setNight(true);
      if (curDef && curDef.anoitecer) curDef.anoitecer(() => run(i + 1));
      else run(i + 1);
      return;
    }
    if (step.go) { go(step.go, step.entry); return; }
    run(i + 1);
  };
  run(0);
}

/* ===================== colisão ===================== */
const R = .3;
function inWalk(x, z) {
  for (const w of walks) if (x >= w.x1 && x <= w.x2 && z >= w.z1 && z <= w.z2) return true;
  return false;
}
// o quanto a posição está "boa": pontos em volta em chão andável, menos o quanto entra num obstáculo
// (sair de dentro de um obstáculo melhora aos poucos, a cada passo)
function foraDoChao(x, z) {                  // distância até o chão andável mais próximo (0 = em cima dele)
  let d = Infinity;
  for (const w of walks) {
    const ax = Math.max(w.x1 - x, 0, x - w.x2), az = Math.max(w.z1 - z, 0, z - w.z2);
    d = Math.min(d, Math.hypot(ax, az));
  }
  return d;
}
function folga(x, z) {
  let n = 0;
  for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R], [.21, .21], [-.21, .21], [.21, -.21], [-.21, -.21]])
    n -= foraDoChao(x + dx, z + dz);
  for (const b of blocks) {
    const ex = Math.min(x - (b.x1 - R), (b.x2 + R) - x), ez = Math.min(z - (b.z1 - R), (b.z2 + R) - z);
    if (ex > 0 && ez > 0) n -= 10 * Math.min(ex, ez);
  }
  return n;
}
function free(x, z) {
  for (const [dx, dz] of [[R, 0], [-R, 0], [0, R], [0, -R], [.21, .21], [-.21, .21], [.21, -.21], [-.21, -.21]])
    if (!inWalk(x + dx, z + dz)) return false;
  for (const b of blocks)
    if (x > b.x1 - R && x < b.x2 + R && z > b.z1 - R && z < b.z2 + R) return false;
  return true;
}

/* ===================== fluxo de cenas ===================== */
function showCaption(txt) {
  chime();
  capEl.textContent = txt;
  capEl.style.opacity = 1;
  clearTimeout(capTimer);
  capTimer = setTimeout(() => { capEl.style.opacity = 0; }, 2800);
}
/* ===================== mundos: a cena atual e as vizinhas, já montadas ===================== */
// O trajeto parece um mundo só: as cenas ligadas à atual (vestíbulo, elevador, vagão) ficam montadas
// em segundo plano, uma por vez, logo depois que você chega. Pelo vestíbulo a vizinha aparece de
// verdade pela porta aberta (portal, ver renderPortais) e a troca acontece no meio do cômodo, sem
// parar; no elevador e no vagão a troca é com as portas fechadas, e a cena de lá já está pronta.
// Uma cena montada depende do dia e da noite (carimbo): mudou, a vizinha é remontada. A cena de onde
// você acabou de sair continua sendo a vizinha (é ela que se vê pela porta de trás) e é remontada do
// zero quando a porta fecha — voltar lá é como entrar de novo, igual era antes.
let atual = null;
const carimbo = () => day + '|' + night;

// monta a cena num mundo novo sem tirar o kit do mundo atual
function montar(name, entry, fundo) {
  if (fundo) silenciar(true);         // vizinha montada em segundo plano não faz barulho
  let def;
  try {
    def = builders[name]({ entry, rel: null });
    completarLuzes();                 // mesmo nº de luzes em toda cena: os shaders se reaproveitam
  } catch (e) {
    if (atual) usarMundo(atual);      // a montagem quebrou no meio: o kit volta para a cena atual
    throw e;
  } finally {
    if (fundo) silenciar(false);
  }
  const w = mundo;
  Object.assign(w, { def, nome: name, entrada: entry, carimbo: carimbo(), usado: false, aquecido: false, marcado: false });
  if (atual) usarMundo(atual);
  return w;
}

// materiais de um mundo visto pelo portal: só pintam onde a porta marcou o stencil
function portalMats(w, on) {
  if (w.marcado === on) return;
  w.marcado = on;
  // o corpo do jogador é de todas as cenas: sai antes (placeBody o põe de volta na cena atual)
  if (on && body.parent === w.scene) w.scene.remove(body);
  w.scene.traverse(o => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      m.stencilWrite = on;
      if (on) {
        m.stencilFunc = THREE.EqualStencilFunc; m.stencilRef = 1;
        m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp;
      }
    }
  });
}

// compila os shaders (com e sem o plano de corte do portal) e sobe as malhas para a GPU agora, com o
// stencil zerado (nada aparece): a primeira vez que o mundo for visto ou virar o atual não engasga
const planoAquece = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6);
function aquecer(w) {
  const era = w.marcado;
  portalMats(w, true);
  const soltos = [];
  w.scene.traverse(o => { if (o.frustumCulled) { o.frustumCulled = false; soltos.push(o); } });
  const bg = w.scene.background;
  w.scene.background = null;
  renderer.autoClear = false;
  renderer.clearStencil();
  renderer.clippingPlanes = [planoAquece];
  renderer.render(w.scene, camera);
  renderer.clippingPlanes = [];
  renderer.render(w.scene, camera);
  renderer.autoClear = true;
  w.scene.background = bg;
  for (const o of soltos) o.frustumCulled = true;
  portalMats(w, era);
  w.aquecido = true;
}

// liga a saída sc (vestíbulo do mundo C) à sv (o mesmo vestíbulo no mundo V): o mesmo cômodo nas
// duas cenas, então dá para levar qualquer ponto de uma para a outra pelo referencial dele
function ligar(sc, C, sv, V) {
  const a = sc.portal, b = sv.portal;
  const FA = new THREE.Matrix4().makeRotationY(a.yaw).setPosition(a.x, a.y, a.z);
  const FB = new THREE.Matrix4().makeRotationY(b.yaw).setPosition(b.x, b.y, b.z);
  for (const [s, de, para, outro, P] of [[sc, FA, FB, V, a], [sv, FB, FA, C, b]]) {
    s.M = para.clone().multiply(de.clone().invert());          // mundo de s → mundo do outro lado
    s.dyaw = (P === a ? b.yaw - a.yaw : a.yaw - b.yaw);
    s.mundo = outro; s.pronto = true; s.urgente = false;
    // a porta de lá: o vão (marca no stencil, no mundo de s) e o plano que corta o que, do outro
    // lado, estiver aquém dela (o próprio vestíbulo de lá, o que houver atrás dele)
    const sg = Math.sign(P.zd), zq = sg * (VEST.VD + .1);
    s.quadro = de.clone().multiply(new THREE.Matrix4().makeTranslation(0, VEST.VH / 2, zq))
      .multiply(new THREE.Matrix4().makeScale(VEST.VW * 2 + .6, VEST.VH + .4, 1));
    const n = new THREE.Vector3(0, 0, sg).transformDirection(para);
    s.plano = new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(0, 0, zq).applyMatrix4(para));
  }
  sc.par = sv; sv.par = sc;
  // as portas das duas cópias andam juntas (quem manda é a do mundo atual)
  b.ponte.est = a.ponte.est;
  a.ponte.par = b.ponte; b.ponte.par = a.ponte;
}

function construirVizinho(s) {
  if (s.mundo) descartarMundo(s.mundo);
  s.mundo = null; s.pronto = false; s.urgente = false;
  const V = montar(s.para[0], s.para[1], true);
  if (s.portal) {
    // o mesmo vestíbulo do lado de lá (o da entrada por onde se chega, se a cena tiver mais de um)
    const volta = x => x.portal && x.para[0] === atual.nome;
    const sv = V.saidas.find(x => volta(x) && x.chegada) || V.saidas.find(volta);
    if (!sv) { descartarMundo(V); s.semPar = true; return; }
    ligar(s, atual, sv, V);
    // o sol da vizinha girado como o cômodo: pela porta, a luz é a mesma dos dois lados
    const d = s.dyaw, c = Math.cos(d), sn = Math.sin(d), p = atual.luzes.sol.position;
    V.luzes.sol.position.set(p.x * c + p.z * sn, p.y, -p.x * sn + p.z * c);
  } else {
    s.mundo = V; s.pronto = true;
  }
  portalMats(V, true);
  aquecer(V);
}

// uma obra por vez, espaçadas: o jogador não sente as montagens
let proxObra = 0;
function cuidarVizinhos(t) {
  if (!atual || !started || ended || transit) return;
  const urgente = atual.saidas.find(s => s.urgente && !s.pronto);
  if (urgente) { construirVizinho(urgente); proxObra = t + .4; return; }  // chegou na porta antes dela
  if (proxObra < 0) { proxObra = t + .5; return; }            // acabou de trocar: um respiro antes
  if (t < proxObra) return;
  const c = carimbo();
  const obra = s => { proxObra = t + .4; construirVizinho(s); };   // (se quebrar, não tenta a cada quadro)
  // 1) as que faltam; 2) o mundo atual pronto para ser visto pela porta; 3) as velhas (já usadas,
  // ou de outro dia/hora), só com a porta delas fechada
  const falta = atual.saidas.find(s => !s.semPar && !s.mundo);
  if (falta) return obra(falta);
  if (!atual.aquecido) { aquecer(atual); proxObra = t + .4; return; }
  const velha = atual.saidas.find(s => !s.semPar && (s.mundo.carimbo !== c || s.mundo.usado)
    && !(s.portal && s.portal.aberta() > 0));
  if (velha) obra(velha);
}

function descartarTudo() {
  if (!atual) return;
  for (const s of atual.saidas) if (s.mundo) { descartarMundo(s.mundo); s.mundo = null; s.pronto = false; }
  atual.ativo = false;
  descartarMundo(atual);
  atual = null;
}

// as cenas são fisicamente ligadas: cada uma nasce do lado certo da porta por onde se entrou.
// entry = de onde se chega (a cena escolhe o spawn por ela; sem entry, o spawn padrão)
let pendingCap = null, curDef = null;
function build(name, entry = null) {
  descartarTudo();
  const w = montar(name, entry, false);
  entrar(w, w.def.spawn, false);
}
// o mundo w vira o atual, com o jogador em spawn.
// seamless = troca sem fade nem legenda (portas fechadas); a legenda sai quando elas abrem (game.arrived)
function entrar(w, spawn, seamless) {
  setGlow(target, false);
  target = null; // o alvo antigo pertence à cena que ficou para trás
  if (atual && atual !== w) atual.ativo = false;
  atual = w;
  w.ativo = true; w.usado = true;
  usarMundo(w);
  portalMats(w, false);
  drawIdle();                         // a tela do terminal volta ao ocioso
  for (const f of w.aoAtivar.splice(0)) f();
  proxObra = -1;                      // as vizinhas desta começam a ser montadas daqui a pouco
  const def = w.def;
  curDef = def;
  sway = !!def.sway;
  seated = !!def.seated;
  elevFn = def.elevFn || null;
  setAmb(w.nome);
  setPad(day);
  seatBody = def.bodySeat || null;
  poseHold = null;
  ride = null;
  action = null;
  px = spawn.x; pz = spawn.z; yaw = spawn.yaw;
  lastPX = px; lastPZ = pz;           // a troca não vira passada
  if (seamless) pendingCap = def.caption;
  else { pitch = 0; pendingCap = null; showCaption(def.caption); }
  clearTimeout(autoTimer);
  if (def.wake) { startWake(def); return; }
  if (def.auto) autoTimer = setTimeout(() => {
    // se o jogador já abriu outra fala ou entrou numa cutscene nesse 1 s, não atropela
    if (!ended && !transit && !textOpen && !cutscene()) say(def.auto.name, def.auto.lines);
  }, 1100);
}

/* ===================== acordar: mensagem no escuro, olhos abrindo, levantar ===================== */
// pálpebras: overlay próprio (z abaixo da caixa de texto) e sem a transição lenta do #fade
const eyelidEl = document.createElement('div');
eyelidEl.style.cssText = 'position:fixed;inset:0;background:#060a0e;z-index:7;pointer-events:none;opacity:0;display:none';
document.body.appendChild(eyelidEl);
function eyelidBlack() {         // olhos fechados: tela totalmente preta
  const el = eyelidEl;
  el.style.transition = 'none';
  el.style.display = 'block';
  el.style.opacity = '1';
  void el.offsetWidth;          // reflow: fixa o preto antes de religar a transição
}
function eyesOpen(cb) {         // piscares pesados de quem acorda, até abrir de vez
  const el = eyelidEl;
  el.style.transition = 'opacity .45s ease';
  for (const [ms, op] of [[40, .12], [520, .7], [980, .05], [1500, .5], [2050, 0]])
    setTimeout(() => { el.style.opacity = String(op); }, ms);
  setTimeout(() => { el.style.display = 'none'; if (cb) cb(); }, 2650);
}
function startWake(def) {
  closeText();
  const lying = def.wake;   // deitado na cama, olhando o teto
  const stand = { x: def.spawn.x, y: 1.6, z: def.spawn.z, yaw: def.spawn.yaw, pitch: 0 };
  poseHold = { ...lying };  // câmera deitada, por ora escondida atrás do preto
  eyelidBlack();

  const wakeUp = () => {
    // 2) ainda deitado no escuro, os olhos começam a abrir olhando o teto
    transit = true;
    eyesOpen(() => {
      // 3) olhos abertos: o giro de sair da cama e ficar em pé
      sfxSit();
      camAnim = {
        t: 0, dur: 1.9, from: { ...lying }, to: { ...stand },
        then: () => { poseHold = null; transit = false; },
      };
    });
  };

  // 1) com a tela ainda preta, a mensagem de acorde aparece; E fecha e segue
  if (def.auto) {
    tbEl.style.zIndex = '9';                       // caixa de texto acima do preto
    say(def.auto.name, def.auto.lines, () => { tbEl.style.zIndex = ''; wakeUp(); });
  } else wakeUp();
}
// elevador e vagão: a cena troca com as portas fechadas, sem fade. A de lá normalmente já está
// montada (é uma saída do mundo atual); rel = onde o jogador está na cabine, que ela reproduz
function travel(name, entry, rel) {
  if (ended) return;
  const s = atual.saidas.find(x => !x.portal && x.para[0] === name && x.para[1] === entry);
  let w = s && s.mundo && s.mundo.carimbo === carimbo() && !s.mundo.usado ? s.mundo : null;
  for (const x of atual.saidas) if (x.mundo && x.mundo !== w) descartarMundo(x.mundo);
  for (const x of atual.saidas) { x.mundo = null; x.pronto = false; }
  if (!w) w = montar(name, entry, false);
  const velho = atual;
  velho.ativo = false;
  atual = null;
  descartarMundo(velho);
  usarMundo(w);
  const spawn = rel && w.chegada ? w.chegada(rel) : w.def.spawn;
  entrar(w, spawn, true);
}
game.travel = travel;

// vestíbulo: passou do meio do cômodo. A cena do outro lado vira a atual, com o jogador no mesmo
// ponto do cômodo; a que ficou para trás passa a ser a vizinha vista pela porta de trás
const V3 = new THREE.Vector3();
game.atravessar = sA => {
  if (ended || !atual || !sA.pronto || transit) return;
  const A = atual, B = sA.mundo, sB = sA.par;
  V3.set(px, 0, pz).applyMatrix4(sA.M);
  const spawn = { x: V3.x, z: V3.z, yaw: yaw + sA.dyaw };
  // as outras vizinhas de A já não encostam em nada
  for (const s of A.saidas) if (s !== sA && s.mundo) { descartarMundo(s.mundo); s.mundo = null; s.pronto = false; }
  ligar(sB, B, sA, A);
  portalMats(A, true);
  entrar(B, spawn, true);
  game.arrived();
};
game.player = () => ({ px, pz, yaw });
game.arrived = () => { if (pendingCap) showCaption(pendingCap); pendingCap = null; };

function go(name, entry = null) {
  transit = true;
  closeText();
  sfxWhoosh();
  fadeEl.classList.add('on');
  setTimeout(() => {
    if (name === 'end') {
      ended = true;
      setAmb('fim');
      endChord();
      document.exitPointerLock();
      endEl.classList.remove('hidden');
      fadeEl.classList.remove('on');
      return;
    }
    build(name, entry);
    fadeEl.classList.remove('on');
    setTimeout(() => { transit = false; }, 450);
  }, 750);
}

/* ===================== interação ===================== */
// o que roda ao fim da interação: uma sequência do roteiro ou um callback da cena
function onDone(it) {
  if (it.sequence) return () => runSequence(it.sequence);
  return it.cb || null;
}
function useInter(it) {
  const done = onDone(it);
  // `look` do terminal é para onde a câmera sentada mira (a tela), não a cutscene de olhar antes
  if (it.look && !it.terminal) { focusOn(it.look, () => useInter({ ...it, look: null })); return; }
  if (it.act) startAction(it.act);
  else if (it.terminal) startTerm(it, done);
  else if (it.lines) say(it.name, it.lines, it.go ? () => go(it.go, it.entry) : done);
  else if (it.go) go(it.go, it.entry);
  else if (done) done();
}

const ray = new THREE.Raycaster();
ray.far = 4;          // o alcance de cada coisa é inter.reach (padrão 2.8)
const V0 = new THREE.Vector2(0, 0);

function setGlow(root, on) {
  if (!root) return;
  root.traverse(o => {
    if (o.isMesh && o.material.emissive) o.material.emissive.setHex(on ? 0x1c3850 : 0x000000);
  });
}
function updateTarget() {
  let tgt = null;
  dotEl.classList.toggle('hidden', cutscene());
  if (started && !ended && !transit && !cutscene()) {
    ray.setFromCamera(V0, camera);
    const hits = ray.intersectObjects(inters, true);
    if (hits.length) {
      let o = hits[0].object;
      while (o && !o.userData.inter) o = o.parent;
      const it = o && o.userData.inter;
      // na canoa só vale o que é de quem está nela (a escada); a pé, o resto
      if (it && hits[0].distance <= (it.reach || 2.8) && !!it.whileRiding === !!ride) tgt = o;
    }
  }
  if (tgt !== target) {
    setGlow(target, false);
    setGlow(tgt, true);
    target = tgt;
    if (target) prName.textContent = target.userData.inter.name;
  }
  dotEl.classList.toggle('hot', !!target);
  promptEl.classList.toggle('on', !!target && !textOpen);
  if (IS_MOBILE) {
    // botão E só aparece quando há algo para interagir / texto para avançar
    btnE.classList.toggle('on', !!target || textOpen || !!(term && term.typing));
    // analógicos somem enquanto há texto na tela ou câmera roteirizada (acordar/terminal)
    const hide = textOpen || cutscene();
    stickL.classList.toggle('off', hide);
    stickR.classList.toggle('off', hide);
    if (hide) resetSticks();
  }
}

function actionE() {
  if (!started || ended || transit || camAnim || action) return;
  if (textOpen) nextPage();                    // (fala por cima do terminal: o E vira a página)
  else if (term) termE();
  else if (target) useInter(target.userData.inter);
}

/* ===================== entrada ===================== */
configureStaticUI(IS_MOBILE);
if (IS_MOBILE) {
  document.body.classList.add('mobile');
  bindStick(stickL, joyL);
  bindStick(stickR, joyR);
  btnE.addEventListener('pointerdown', e => { e.preventDefault(); actionE(); });
}

addEventListener('keydown', e => {
  if (e.code === 'KeyE' && document.pointerLockElement) actionE();
});

document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement || cutscene()) return;
  yaw -= e.movementX * .0023;
  pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * .0023));
});

// dev: pula direto para qualquer cena/dia (tecla I, só em localhost)
function debugJump(sceneName, d, noite, entry) {
  term = null; camAnim = null; poseHold = null; ride = null; action = null; // limpa cutscenes em andamento
  closeText();
  ended = false;
  endEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  titleEl.classList.add('hidden');
  eyelidEl.style.display = 'none';
  if (d != null) setDay(d);
  setNight(!!noite);
  started = true;
  go(sceneName, entry || null);
  if (!IS_MOBILE && sceneName !== 'end') renderer.domElement.requestPointerLock();
}
if (IS_LOCAL) installDebugMenu(debugJump);

/* ===================== início, pausa, fim ===================== */
function beginGame() {
  if (!started) {
    started = true;
    titleEl.classList.add('hidden');
    build('quarto');
  }
  pauseEl.classList.add('hidden');
}
function startPlay() {
  initAudio(); // precisa do gesto do usuário para o navegador liberar o som
  if (IS_MOBILE) {
    // no touch não há pointer lock: entra em tela cheia e trava na horizontal
    const de = document.documentElement;
    if (de.requestFullscreen) de.requestFullscreen().catch(() => {});
    try {
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
    beginGame();
  } else {
    renderer.domElement.requestPointerLock(); // o jogo começa no pointerlockchange
  }
}
titleEl.addEventListener('click', startPlay);
pauseEl.addEventListener('click', startPlay);
endEl.addEventListener('click', () => location.reload());

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    resumeAudio();
    beginGame();
  } else if (started && !ended) {
    pauseEl.classList.remove('hidden');
    suspendAudio(); // silêncio na pausa
  }
});

document.addEventListener('visibilitychange', () => {
  if (!started) return;
  if (document.hidden) suspendAudio();
  else if (pauseEl.classList.contains('hidden')) resumeAudio();
});

/* ===================== loop ===================== */
let last = performance.now(), bobT = 0, stepPh = 0;

function movePlayer(dt) {
  // analógico direito gira a câmera (devagar, para mirar com calma)
  if (joyR.x || joyR.y) {
    yaw -= joyR.x * 1.2 * dt;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - joyR.y * .9 * dt));
  }
  if (seated) return false;
  const [f, st] = moveAxes();
  if (ride) { ride.move(dt, f, st, yaw); return false; } // na canoa, andar = remar
  const mag = Math.hypot(f, st);
  if (mag <= .15) return false;
  const sp = 3.1 * dt * Math.min(mag, 1) / mag;
  const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * st) * sp;
  const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * st) * sp;
  if (free(px + dx, pz + dz)) { px += dx; pz += dz; }
  else if (free(px + dx, pz)) { px += dx; }
  else if (free(px, pz + dz)) { pz += dz; }
  // rede de segurança: se o lugar onde você está deixou de valer (uma porta fechou, alguém encostou),
  // nenhum passo era "livre" e o jogador travava. Aí vale qualquer passo que melhore a situação
  else if (!free(px, pz) && folga(px + dx, pz + dz) > folga(px, pz)) { px += dx; pz += dz; }
  return true;
}

function updateCamera(t, dt, moving) {
  if (camAnim) {
    // sentar / levantar da cadeira
    camAnim.t += dt;
    let k = Math.min(camAnim.t / camAnim.dur, 1);
    k = k * k * (3 - 2 * k);
    const f = camAnim.from, o = camAnim.to;
    let dyaw = o.yaw - f.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    camera.position.set(f.x + (o.x - f.x) * k, f.y + (o.y - f.y) * k, f.z + (o.z - f.z) * k);
    camera.rotation.set(f.pitch + (o.pitch - f.pitch) * k, f.yaw + dyaw * k, 0);
    if (k >= 1) { const fn = camAnim.then; camAnim = null; fn(); }
    return;
  }
  if (action) {
    if (action.update(dt, t)) { action.camera(camera); return; }
    finishAction();
  }
  if (ride) {
    // sentado na canoa: a câmera vai com ela e balança com a onda
    const e = ride.camera(t, yaw, camera.position);
    camera.rotation.set(pitch + e.pitch, yaw, e.roll);
    return;
  }
  const pose = term ? term.pose : poseHold;
  if (pose) {
    camera.position.set(pose.x, pose.y, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
    return;
  }
  const gy = elevFn ? elevFn(px, pz) : 0;
  camera.position.set(
    px,
    gy + 1.6 + (moving ? Math.sin(bobT) * .03 : 0) + (sway ? Math.sin(t * 2.2) * .015 + Math.sin(t * 7.1) * .005 : 0),
    pz
  );
  camera.rotation.set(pitch, yaw, 0);
}

// o corpo: em pé/andando sob a câmera, ou sentado na poltrona; canoa e ações cuidam dele sozinhas
function updateBody(t, dt, moving) {
  walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 8);
  const fx = lastPX, fz = lastPZ;      // onde estava no quadro anterior
  lastPX = px; lastPZ = pz;
  if (action || ride) return;
  if (!started || ended || term || camAnim || poseHold) { body.visible = false; return; }
  if (seatBody) {
    const s = seatBody;
    placeBody(scene, px + Math.sin(s.yaw) * s.back, 0, pz + Math.cos(s.yaw) * s.back, s.yaw);
    poseSit(s.hipY, t);
  } else {
    // a raiz fica BACK atrás da câmera: olhando para baixo, o peito não esconde os pés
    placeBody(scene, px + Math.sin(yaw) * BACK, elevFn ? elevFn(px, pz) : 0, pz + Math.cos(yaw) * BACK, yaw);
    const d = Math.hypot(px - fx, pz - fz);
    if (d < 1) walkPh += d * Math.PI / STRIDE;      // salto grande = troca de cena, não passada
    poseStand(walkPh, walkAmt, t);
  }
  applyPose();
}

function tick(now) {
  requestAnimationFrame(tick);
  if (dbg.manual) return;            // dev: o relógio está na mão do script de captura
  const t = now / 1000, dt = Math.min((now - last) / 1000, .05);
  last = now;
  frame(t, dt);
}
function frame(t, dt) {
  if (!scene) { renderer.clear(); return; }
  const canMove = started && !ended && !transit && !cutscene() && (document.pointerLockElement || IS_MOBILE || dbg.forceMove);
  const moving = canMove && movePlayer(dt);
  if (moving) {
    bobT += dt * 8.5;
    const ph = Math.floor(bobT / Math.PI); // um passo a cada meio ciclo do balanço
    if (ph !== stepPh) { stepPh = ph; sfxStep(); }
  }
  // gatilhos sem E (ex.: chegar perto do farol olhando para ele)
  if (started && !ended && !transit && !ride && !cutscene() && !textOpen)
    for (const tr of triggers)
      if (!tr.fired && tr.test(px, pz, yaw)) { tr.fired = true; useInter(tr.inter); break; }

  updateCamera(t, dt, moving);
  updateBody(t, dt, moving);
  updateTerm(t, dt);
  if (started && !ended) updateMusic(t);

  cuidarVizinhos(t);
  for (const a of anims) a(t);
  animarVizinhos(t);
  updateTarget();
  renderView();
}

/* ===================== portais: a cena vizinha vista pela porta aberta do vestíbulo ===================== */
// Para cada porta de vestíbulo aberta: (1) o vão da porta marca o stencil onde ele aparece de fato
// (o que estiver na frente dele, nesta cena, tampa); (2) ali o fundo vira o céu da vizinha e a
// profundidade é zerada; (3) a vizinha é desenhada com a câmera levada para o referencial dela, só
// onde o stencil marcou e só além do vão (plano de corte). As duas cópias do cômodo são iguais e as
// portas andam juntas: não há emenda.
const portalAberto = s => s.portal && s.pronto && s.mundo && s.portal.aberta() > 0;
const marcaMat = new THREE.MeshBasicMaterial({
  colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
  stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
});
const marca = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), marcaMat);
marca.matrixAutoUpdate = false;
marca.frustumCulled = false;
const marcaCena = new THREE.Scene();
marcaCena.add(marca);
const fundoMat = new THREE.ShaderMaterial({
  uniforms: { cor: { value: new THREE.Color() } },
  vertexShader: 'void main() { gl_Position = vec4(position.xy * 2.0, 1.0, 1.0); }',
  fragmentShader: 'uniform vec3 cor; void main() { gl_FragColor = vec4(cor, 1.0); }',
  depthFunc: THREE.AlwaysDepth, depthWrite: true,
  stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
});
const fundo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fundoMat);
fundo.frustumCulled = false;
const fundoCena = new THREE.Scene();
fundoCena.add(fundo);
const camPortal = new THREE.PerspectiveCamera();
camPortal.matrixAutoUpdate = false;

function renderPortais() {
  if (!atual) return;
  let usou = false;
  for (const s of atual.saidas) {
    if (!portalAberto(s)) continue;
    const V = s.mundo;
    if (!usou) { renderer.autoClear = false; usou = true; }
    renderer.clearStencil();
    marca.matrix.copy(s.quadro);
    marca.matrixWorldNeedsUpdate = true;
    renderer.render(marcaCena, camera);
    fundoMat.uniforms.cor.value.copy(V.scene.background).convertLinearToSRGB();
    renderer.render(fundoCena, camera);
    camPortal.matrix.multiplyMatrices(s.M, camera.matrixWorld);
    camPortal.matrixWorldNeedsUpdate = true;
    camPortal.projectionMatrix.copy(camera.projectionMatrix);
    camPortal.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    renderer.clippingPlanes = [s.plano];
    const bg = V.scene.background;
    V.scene.background = null;
    renderer.render(V.scene, camPortal);
    V.scene.background = bg;
    renderer.clippingPlanes = [];
  }
  if (usou) renderer.autoClear = true;
}

// a vizinha vista pela porta segue viva (chuva, carros, gente): roda as animações dela com o kit
// apontado para ela, o jogador e a câmera levados para o referencial dela e o som desligado
function animarVizinhos(t) {
  if (!atual) return;
  for (const s of atual.saidas) {
    if (!portalAberto(s)) continue;
    const V = s.mundo;
    V3.set(px, 0, pz).applyMatrix4(s.M);
    const eu = { px: V3.x, pz: V3.z, yaw: yaw + s.dyaw };
    const salvo = { player: game.player, travel: game.travel, arrived: game.arrived, atravessar: game.atravessar };
    const cam = camera.position.clone();
    game.player = () => eu;
    game.travel = () => {};
    game.arrived = null;
    game.atravessar = null;
    camera.position.applyMatrix4(s.M);
    usarMundo(V);
    silenciar(true);
    try {
      for (const a of V.anims) a(t);
    } finally {
      silenciar(false);
      usarMundo(atual);
      camera.position.copy(cam);
      Object.assign(game, salvo);
    }
  }
}
requestAnimationFrame(tick);

/* ===================== dev: ganchos para captura automática (só localhost) ===================== */
// window.__zero dirige o jogo de fora (Playwright): relógio manual, pular de cena, interagir e
// câmeras de inspeção (3ª pessoa, de cima, de lado, de frente) que miram o corpo do jogador.
const dbg = { manual: false, t: 1000, view: 'fp', forceMove: false };
let dbgCam = null, dbgHead = null, dbgEye = null;
function renderView() {
  if (dbg.view === 'fp' || (!body.parent && dbg.view !== 'free')) { renderer.render(scene, camera); renderPortais(); return; }
  if (!dbgCam) {
    dbgCam = new THREE.PerspectiveCamera(45, 1, .02, 200);
    const m = new THREE.MeshLambertMaterial({ color: 0x3aa2ea });
    dbgHead = new THREE.Mesh(new THREE.BoxGeometry(.26, .28, .25), m);          // cabeça só para inspeção
    dbgEye = new THREE.Mesh(new THREE.ConeGeometry(.035, .12, 8), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
    dbgEye.geometry.rotateX(-Math.PI / 2);                                        // ponta para -z: o olhar
  }
  const wq = body.getWorldQuaternion(new THREE.Quaternion());
  const c = body.localToWorld(new THREE.Vector3(0, .9, 0));
  const off = { third: [.8, 1.3, 2.4], side: [2.6, .2, 0], top: [0, 4.2, .01], front: [0, .3, -2.4], close: [1.0, .5, -1.1] }[dbg.view];
  dbgCam.aspect = innerWidth / innerHeight;
  dbgCam.updateProjectionMatrix();
  if (dbg.view === 'free') {
    // câmera livre: posição e alvo dados pelo script (revisar a cena, não o corpo)
    dbgCam.aspect = innerWidth / innerHeight;
    dbgCam.updateProjectionMatrix();
    dbgCam.position.set(...dbg.free[0]);
    dbgCam.up.set(0, 1, 0);
    dbgCam.lookAt(...dbg.free[1]);
    renderer.render(scene, dbgCam);
    return;
  }
  if (dbg.view === 'top') {
    // de cima, orientada pelo mundo (norte = -z no alto da tela): não gira junto com o corpo
    dbgCam.position.set(c.x, c.y + 4.2, c.z);
    dbgCam.up.set(0, 0, -1);
  } else {
    dbgCam.position.copy(new THREE.Vector3(...off).applyQuaternion(wq).add(c));
    dbgCam.up.set(0, 1, 0);
  }
  dbgCam.lookAt(c);
  headLocal(dbgHead.position);
  body.add(dbgHead);
  dbgEye.position.copy(camera.position);
  dbgEye.quaternion.copy(camera.quaternion);
  scene.add(dbgEye);
  renderer.render(scene, dbgCam);
  body.remove(dbgHead);
  scene.remove(dbgEye);
}
if (IS_LOCAL) window.__zero = {
  go(name, d, entry, noite) {
    term = null; camAnim = null; poseHold = null; ride = null; action = null;
    closeText(); eyelidEl.style.display = 'none';
    titleEl.classList.add('hidden'); pauseEl.classList.add('hidden');
    if (d != null) setDay(d);
    setNight(!!noite);
    started = true; transit = false;
    build(name, entry || null);
    clearTimeout(autoTimer);
  },
  manual(on) { dbg.manual = on; },
  step(sec, fps = 30) { const n = Math.max(1, Math.round(sec * fps)); for (let i = 0; i < n; i++) { dbg.t += 1 / fps; frame(dbg.t, 1 / fps); } },
  view(v) { dbg.view = v; renderView(); },
  free(pos, alvo) { dbg.view = 'free'; dbg.free = [pos, alvo]; renderView(); },
  look(y, p) { yaw = y; pitch = p; },
  pos(x, z) { px = x; pz = z; },
  move(on) { dbg.forceMove = on; },
  close() { closeText(); },
  interact(name) {
    const o = inters.find(o => o.userData.inter && o.userData.inter.name === name); // (botões do elevador ficam null quando não valem)
    if (!o) return false;
    useInter(o.userData.inter);
    return true;
  },
  state: () => ({ px, pz, yaw, pitch, action: !!action, ride: !!ride, text: textOpen, cam: camera.position.toArray() }),
};
