import * as THREE from 'three';
import { SEQUENCES } from './src/config.js';
import { day, setDay } from './src/state.js';
import { renderer, camera } from './src/renderer.js';
import { dotEl, promptEl, prName, tbEl, capEl, fadeEl, titleEl, pauseEl, endEl, btnE, stickL, stickR, configureStaticUI } from './src/ui.js';
import { initAudio, resumeAudio, suspendAudio, updateMusic, setPad, setAmb, chime, endChord, sfxStep, sfxType, sfxSit, sfxWhoosh } from './src/audio.js';
import { drawTerm } from './src/terminal.js';
import { say, nextPage, closeText, textOpen } from './src/dialog.js';
import { speakerName, linesOf } from './src/story.js';
import { scene, walks, blocks, anims, inters } from './src/kit.js';
import { builders } from './src/scenes/index.js';
import { IS_MOBILE, IS_LOCAL, joyL, joyR, moveAxes, bindStick, resetSticks } from './src/input.js';
import { installDebugMenu } from './src/debug.js';

/* ===================== estado ===================== */
let px = 0, pz = 0, yaw = 0, pitch = 0;
let sway = false;    // vagão balançando a câmera
let elevFn = null;   // altura do chão por cena (calçada, escada...)
let seated = false;  // preso numa poltrona (avião): só olha, não anda
let started = false, ended = false, transit = false;
let target = null;   // objeto interativo sob a mira
let capTimer = 0, autoTimer = 0;
let term = null;     // sessão de terminal ativa
let camAnim = null;  // animação de câmera (sentar / levantar / sair da cama)
let poseHold = null; // câmera travada numa pose (acordar: deitado, olhos abrindo)

// câmera roteirizada: enquanto houver uma, o jogador não anda nem mira
const cutscene = () => !!(term || camAnim || poseHold);

/* ===================== terminal: sentar, digitar, levantar ===================== */
function startTerm(it, cb) {
  const s = it.seat, L = it.look;
  const dx = L.x - s.x, dy = L.y - s.y, dz = L.z - s.z;
  term = {
    lines: it.terminal, idx: 0, chars: 0,
    typing: false, waiting: false, blink: 1, cb,
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

/* ===================== sequências do roteiro (game-context.json) ===================== */
function runSequence(key) {
  const steps = SEQUENCES[key] || [];
  const run = i => {
    const step = steps[i];
    if (!step) return;
    if (step.say) {
      say(speakerName(step.say.speaker), linesOf(step.say.script), () => run(i + 1));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(step, 'setDay')) setDay(step.setDay);
    if (step.go) { go(step.go); return; }
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
function build(name) {
  target = null; // o alvo antigo pertence à cena que vai embora
  const def = builders[name]();
  sway = !!def.sway;
  seated = !!def.seated;
  elevFn = def.elevFn || null;
  setAmb(name);
  setPad(day);
  poseHold = null;
  px = def.spawn.x; pz = def.spawn.z; yaw = def.spawn.yaw; pitch = 0;
  showCaption(def.caption);
  clearTimeout(autoTimer);
  if (def.wake) { startWake(def); return; }
  if (def.auto) autoTimer = setTimeout(() => {
    if (!ended && !transit) say(def.auto.name, def.auto.lines);
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
function go(name) {
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
    build(name);
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
function useTarget() {
  const it = target.userData.inter, done = onDone(it);
  if (it.terminal) startTerm(it, done);
  else if (it.lines) say(it.name, it.lines, it.go ? () => go(it.go) : done);
  else if (it.go) go(it.go);
  else if (done) done();
}

const ray = new THREE.Raycaster();
ray.far = 2.8;
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
      tgt = o || null;
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
  if (!started || ended || transit || camAnim) return;
  if (term) termE();
  else if (textOpen) nextPage();
  else if (target) useTarget();
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
function debugJump(sceneName, d) {
  term = null; camAnim = null; poseHold = null; // limpa cutscenes em andamento
  closeText();
  ended = false;
  endEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  titleEl.classList.add('hidden');
  eyelidEl.style.display = 'none';
  if (d != null) setDay(d);
  started = true;
  go(sceneName);
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
  const mag = Math.hypot(f, st);
  if (mag <= .15) return false;
  const sp = 3.1 * dt * Math.min(mag, 1) / mag;
  const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * st) * sp;
  const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * st) * sp;
  if (free(px + dx, pz + dz)) { px += dx; pz += dz; }
  else if (free(px + dx, pz)) { px += dx; }
  else if (free(px, pz + dz)) { pz += dz; }
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

function tick(now) {
  requestAnimationFrame(tick);
  if (!scene) { renderer.clear(); return; }
  const t = now / 1000, dt = Math.min((now - last) / 1000, .05);
  last = now;

  const canMove = started && !ended && !transit && !cutscene() && (document.pointerLockElement || IS_MOBILE);
  const moving = canMove && movePlayer(dt);
  if (moving) {
    bobT += dt * 8.5;
    const ph = Math.floor(bobT / Math.PI); // um passo a cada meio ciclo do balanço
    if (ph !== stepPh) { stepPh = ph; sfxStep(); }
  }

  updateCamera(t, dt, moving);
  updateTerm(t, dt);
  if (started && !ended) updateMusic(t);

  for (const a of anims) a(t);
  updateTarget();
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
