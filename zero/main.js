import * as THREE from 'three';
import { SEQUENCES } from './src/config.js';
import { day, night, setDay, setNight } from './src/state.js';
import { renderer, camera } from './src/renderer.js';
import { dotEl, promptEl, prName, tbEl, capEl, fadeEl, titleEl, pauseEl, endEl, btnE, stickL, stickR, configureStaticUI } from './src/ui.js';
import { initAudio, resumeAudio, suspendAudio, updateMusic, setPad, setAmb, chime, endChord, sfxStep, sfxType, sfxSit, sfxWhoosh } from './src/audio.js';
import { drawTerm } from './src/terminal.js';
import { say, nextPage, closeText, textOpen } from './src/dialog.js';
import { speakerName, linesOf } from './src/story.js';
import { scene, inters, triggers, game, drawIdle } from './src/kit.js';
import * as mundo from './src/mundo.js';
import { reiniciarTrem } from './src/scenes/trem.js';
import { reiniciarAviao } from './src/scenes/aviao.js';
import { IS_MOBILE, IS_LOCAL, joyL, joyR, moveAxes, bindStick, resetSticks } from './src/input.js';
import { installDebugMenu } from './src/debug.js';
import { body, BACK, STRIDE, poseStand, poseSit, applyPose, placeBody, headLocal } from './src/body.js';

/* ===================== estado ===================== */
// px, pz, yaw: o jogador nas coordenadas do lugar em que está (atual). O jogo é um mundo só
// (src/mundo.js, src/mapa.js): andando, ele passa de um lugar para o vizinho e as coordenadas
// são levadas junto.
let px = 0, pz = 0, yaw = 0, pitch = 0;
let atual = null;    // o lugar em que o jogador está (ver mundo.js)
let curDef = null;   // a definição dele (o que o builder devolveu)
let sway = false;    // vagão/avião balançando a câmera
let elevFn = null;   // altura do chão no lugar (calçada, escada...)
let seated = false;  // preso numa poltrona (avião em voo): só olha, não anda
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
let cands = [];      // os lugares que valem para a colisão neste quadro (mundo.candidatos)

// valor da definição que pode ser fixo ou função (o avião senta e levanta, o trem anda e para)
const val = v => (typeof v === 'function' ? v() : v);

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

// sentar numa poltrona / levantar dela: a câmera vai até a pose e o jogador fica lá
// pose = { x, y, z, yaw, pitch?, dur? }; cb roda quando chega (a cena muda o seu estado: sentado ou não)
function startPose(pose, cb) {
  sfxSit();
  camAnim = {
    t: 0, dur: pose.dur || 1.1,
    from: { x: px, y: eyeY(px, pz), z: pz, yaw, pitch },
    to: { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw, pitch: pose.pitch || 0 },
    then: () => {
      px = pose.x; pz = pose.z; yaw = pose.yaw; pitch = pose.pitch || 0;
      lastPX = px; lastPZ = pz;
      if (cb) cb();
    },
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
    if (step.anoitecer) {                       // a noite chega no próprio lugar; o resto do mundo se remonta escuro
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

/* ===================== colisão (o lugar atual e os vizinhos no mesmo nível) ===================== */
const R = .3;
const SAMPLES = [[R, 0], [-R, 0], [0, R], [0, -R], [.21, .21], [-.21, .21], [.21, -.21], [-.21, -.21]];
function emWalks(walks, x, z) {
  for (const w of walks) if (x >= w.x1 && x <= w.x2 && z >= w.z1 && z <= w.z2) return true;
  return false;
}
function inWalk(x, z) {
  for (const c of cands) {
    const [lx, lz] = mundo.levar(c.M, x, z);
    if (emWalks(c.L.w.walks, lx, lz)) return true;
  }
  return false;
}
function bloqueado(x, z, r) {
  for (const c of cands) {
    const [lx, lz] = mundo.levar(c.M, x, z);
    for (const b of c.L.w.blocks)
      if (lx > b.x1 - r && lx < b.x2 + r && lz > b.z1 - r && lz < b.z2 + r) return true;
  }
  return false;
}
// o quanto a posição está "boa": pontos em volta em chão andável, menos o quanto entra num obstáculo
// (sair de dentro de um obstáculo melhora aos poucos, a cada passo)
function foraDoChao(x, z) {                  // distância até o chão andável mais próximo (0 = em cima dele)
  let d = Infinity;
  for (const c of cands) {
    const [lx, lz] = mundo.levar(c.M, x, z);
    for (const w of c.L.w.walks) {
      const ax = Math.max(w.x1 - lx, 0, lx - w.x2), az = Math.max(w.z1 - lz, 0, lz - w.z2);
      d = Math.min(d, Math.hypot(ax, az));
    }
  }
  return d;
}
function folga(x, z) {
  let n = 0;
  for (const [dx, dz] of SAMPLES) n -= foraDoChao(x + dx, z + dz);
  for (const c of cands) {
    const [lx, lz] = mundo.levar(c.M, x, z);
    for (const b of c.L.w.blocks) {
      const ex = Math.min(lx - (b.x1 - R), (b.x2 + R) - lx), ez = Math.min(lz - (b.z1 - R), (b.z2 + R) - lz);
      if (ex > 0 && ez > 0) n -= 10 * Math.min(ex, ez);
    }
  }
  return n;
}
function free(x, z) {
  for (const [dx, dz] of SAMPLES) if (!inWalk(x + dx, z + dz)) return false;
  return !bloqueado(x, z, R);
}
// saiu do chão do lugar atual e está no de um vizinho: passa a ser dele
function verificarLugar() {
  if (!atual || emWalks(atual.w.walks, px, pz)) return;
  for (const c of cands) {
    if (c.L === atual) continue;
    const [lx, lz] = mundo.levar(c.M, px, pz);
    if (!emWalks(c.L.w.walks, lx, lz)) continue;
    trocar(c.L, { x: lx, z: lz, yaw: yaw + mundo.giroDe(c.M) }, 'andando');
    return;
  }
}

/* ===================== o lugar atual ===================== */
function showCaption(txt) {
  if (!txt) return;
  chime();
  capEl.textContent = txt;
  capEl.style.opacity = 1;
  clearTimeout(capTimer);
  capTimer = setTimeout(() => { capEl.style.opacity = 0; }, 2800);
}

// passa o jogador para o lugar L, em spawn (coordenadas de L).
// modo: 'andando' (atravessou a pé: legenda na hora) · 'viagem' (elevador: a legenda sai quando as
// portas abrem, game.arrived) · 'inicio' (fade, seletor: legenda e fala automática)
let pendingCap = null, ultimaLegenda = null;
function trocar(L, spawn, modo) {
  setGlow(target, false);
  target = null;                      // o alvo antigo pertence ao lugar que ficou para trás
  const mudou = L !== atual;
  atual = L;
  mundo.ativar(L);
  game.lugar = L;
  curDef = L.def;
  elevFn = curDef.elevFn || null;
  sway = !!val(curDef.sway);
  seated = !!val(curDef.seated);
  seatBody = val(curDef.bodySeat) || null;
  px = spawn.x; pz = spawn.z; yaw = spawn.yaw;
  lastPX = px; lastPZ = pz;           // a troca não vira passada
  if (mudou) { setAmb(L.nome); setPad(day); drawIdle(); }
  if (modo === 'inicio') {
    poseHold = null; ride = null; action = null;
    pitch = 0;
    ultimaLegenda = L.nome;
    pendingCap = null;
    showCaption(curDef.caption);
  } else if (mudou && L.nome !== ultimaLegenda) {
    ultimaLegenda = L.nome;
    if (modo === 'viagem') pendingCap = curDef.caption;
    else showCaption(curDef.caption);
  }
  // fala automática do lugar: uma vez por montagem (outro dia, outra hora: de novo)
  clearTimeout(autoTimer);
  if (curDef.wake && modo === 'inicio') { L.autoFeito = true; startWake(curDef); return; }
  if (curDef.auto && !L.autoFeito) {
    L.autoFeito = true;
    const auto = curDef.auto;
    autoTimer = setTimeout(() => {
      // se o jogador já abriu outra fala ou entrou numa cutscene nesse 1 s, não atropela
      if (!ended && !transit && !textOpen && !cutscene()) say(auto.name, auto.lines);
    }, 1100);
  }
}
game.lugarAtual = () => (atual ? atual.nome : null);

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

// elevador: com as portas fechadas o jogador passa para a cabine do outro andar (o mesmo poço, no
// mundo); rel = onde ele está na cabine, que a de lá reproduz
function travel(name, entry, rel) {
  if (ended) return;
  const L = mundo.lugar(name);
  if (!L) return;
  const spawn = rel && L.w.chegada ? L.w.chegada(rel) : L.def.spawn;
  if (spawn) trocar(L, spawn, 'viagem');
}
game.travel = travel;
game.player = () => ({ px, pz, yaw });
game.arrived = () => { if (pendingCap) showCaption(pendingCap); pendingCap = null; };

// monta o mundo para o dia/hora de agora e põe o jogador no lugar `name` (seletor: entry muda o spawn)
function comecarEm(name, entry) {
  reiniciarTrem();
  reiniciarAviao();
  mundo.construirTudo(entry ? { [name]: entry } : {});
  const L = mundo.lugar(name) || mundo.lugar('quarto');
  trocar(L, L.def.spawn || { x: 0, z: 0, yaw: 0 }, 'inicio');
}

// corte de tempo (dormir, o fim): tela escura, o mundo é remontado
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
    comecarEm(name, entry);
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
  else if (it.pose) startPose(it.pose, done);
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
  if (started && !ended && !transit && !cutscene() && atual) {
    mundo.posicionarCamera(atual);                // a mira sai da câmera de verdade, no mundo
    ray.setFromCamera(V0, mundo.camMundo);
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

// dev: pula direto para qualquer lugar/dia (tecla I, só em localhost)
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
    // o mundo do primeiro dia já foi montado atrás da tela de título (ver o fim do loop)
    const L = mundoPronto && mundo.lugar('quarto');
    if (L) trocar(L, L.def.spawn, 'inicio');
    else comecarEm('quarto');
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
    if (d < 1) walkPh += d * Math.PI / STRIDE;      // salto grande = troca de lugar, não passada
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
  if (!atual) { renderer.clear(); return; }
  // o que muda sozinho na definição do lugar (o avião decola, o trem anda)
  sway = !!val(curDef.sway);
  seated = !!val(curDef.seated);
  seatBody = val(curDef.bodySeat) || null;

  cands = mundo.candidatos(atual, px, pz);
  const canMove = started && !ended && !transit && !cutscene() && (document.pointerLockElement || IS_MOBILE || dbg.forceMove);
  const moving = canMove && movePlayer(dt);
  if (moving) {
    bobT += dt * 8.5;
    const ph = Math.floor(bobT / Math.PI); // um passo a cada meio ciclo do balanço
    if (ph !== stepPh) { stepPh = ph; sfxStep(); }
    verificarLugar();
  }
  // gatilhos sem E (ex.: chegar perto do farol olhando para ele)
  if (started && !ended && !transit && !ride && !cutscene() && !textOpen)
    for (const tr of triggers)
      if (!tr.fired && tr.test(px, pz, yaw)) { tr.fired = true; useInter(tr.inter); break; }

  updateCamera(t, dt, moving);
  updateBody(t, dt, moving);
  updateTerm(t, dt);
  if (started && !ended) updateMusic(t);

  if (started && !ended && !transit) mundo.cuidar(t, atual, px, pz);
  mundo.animar(t, atual, { px, pz, yaw });
  updateTarget();
  renderView();
}
requestAnimationFrame(tick);
// o mundo do primeiro dia já fica montado atrás da tela de título (a montagem leva um instante)
let mundoPronto = false;
setTimeout(() => {
  if (started) return;
  reiniciarTrem();
  reiniciarAviao();
  mundo.construirTudo();
  mundoPronto = true;
}, 60);

/* ===================== dev: ganchos para captura automática (só localhost) ===================== */
// window.__zero dirige o jogo de fora (Playwright): relógio manual, pular de lugar, interagir e
// câmeras de inspeção (3ª pessoa, de cima, de lado, de frente) que miram o corpo do jogador.
const dbg = { manual: false, t: 1000, view: 'fp', forceMove: false };
let dbgCam = null, dbgHead = null, dbgEye = null;
function renderView() {
  if (dbg.view === 'fp' || (!body.parent && dbg.view !== 'free')) { mundo.desenhar(atual); return; }
  if (!dbgCam) {
    dbgCam = new THREE.PerspectiveCamera(45, 1, .02, 200);
    const m = new THREE.MeshLambertMaterial({ color: 0x3aa2ea });
    dbgHead = new THREE.Mesh(new THREE.BoxGeometry(.26, .28, .25), m);          // cabeça só para inspeção
    dbgEye = new THREE.Mesh(new THREE.ConeGeometry(.035, .12, 8), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
    dbgEye.geometry.rotateX(-Math.PI / 2);                                        // ponta para -z: o olhar
  }
  dbgCam.aspect = innerWidth / innerHeight;
  dbgCam.updateProjectionMatrix();
  if (dbg.view === 'free') {
    // câmera livre: posição e alvo dados pelo script, no referencial do lugar atual
    dbgCam.position.set(...dbg.free[0]);
    dbgCam.up.set(0, 1, 0);
    dbgCam.lookAt(...dbg.free[1]);
    mundo.desenhar(atual, dbgCam);
    return;
  }
  // (o corpo está na cena do lugar atual: as contas abaixo são nas coordenadas dele)
  const wq = body.quaternion.clone();
  const c = body.position.clone().add(new THREE.Vector3(0, .9, 0));
  const off = { third: [.8, 1.3, 2.4], side: [2.6, .2, 0], top: [0, 4.2, .01], front: [0, .3, -2.4], close: [1.0, .5, -1.1] }[dbg.view];
  if (dbg.view === 'top') {
    // de cima, orientada pelo lugar (norte = -z no alto da tela): não gira junto com o corpo
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
  mundo.desenhar(atual, dbgCam);
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
    comecarEm(name, entry || null);
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
  lugar: () => (atual ? atual.nome : null),
  state: () => ({ px, pz, yaw, pitch, action: !!action, ride: !!ride, text: textOpen, cam: camera.position.toArray(), lugar: atual && atual.nome }),
};
