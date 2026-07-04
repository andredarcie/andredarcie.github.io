import * as THREE from 'three';

async function loadGameContext() {
  try {
    const res = await fetch(new URL('./game-context.json', import.meta.url), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    const msg = document.createElement('pre');
    msg.style.cssText = 'position:fixed;inset:0;z-index:99;padding:24px;background:#263848;color:#dde8e9;font:22px monospace;white-space:pre-wrap';
    msg.textContent = 'Não foi possível carregar game-context.json.\nRode o jogo por um servidor local para permitir fetch de arquivos JSON.';
    document.body.append(msg);
    throw err;
  }
}

const GAME_CONTEXT = await loadGameContext();
const ROTEIRO = GAME_CONTEXT.roteiro;
const MUSIC = GAME_CONTEXT.audio.musicThemes;
const DAYS = GAME_CONTEXT.days;
const SCENES = GAME_CONTEXT.scenes;
const LABELS = GAME_CONTEXT.labels;
const SEQUENCES = GAME_CONTEXT.sequences;
const ASSETS = GAME_CONTEXT.assets;

/* ===================== paleta (3 cores das referências) ===================== */
const DARK  = 0x2e4358;  // fundo / portas / detalhes escuros
const DARK2 = 0x263848;  // sombra / rodapés / teto
const NAVY  = 0x3a5066;  // vidros e telas (variação do escuro)
const LIGHT = 0xa6b6b8;  // paredes
const LIGHT2= 0x8da2a5;  // mobília clara
const FLOOR = 0x7e9498;  // chão
const BLUE  = 0x3aa2ea;  // pessoas e objetos vivos
const GLOW  = 0xdde8e9;  // luz


/* ===================== renderer ===================== */
const PIX = 1; // resolução nativa: imagem 100% nítida
let curPix = PIX;
const renderer = new THREE.WebGLRenderer({ antialias: true });
function setPix(p) {
  curPix = p;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setSize(Math.floor(innerWidth * dpr), Math.floor(innerHeight * dpr), false);
}
setPix(PIX);
document.body.prepend(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 80);
camera.rotation.order = 'YXZ';

addEventListener('resize', () => {
  setPix(curPix);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* ===================== UI ===================== */
const $ = id => document.getElementById(id);
const dotEl = $('dot'), promptEl = $('prompt'), prName = $('pr-name');
const tbEl = $('textbox'), tbName = $('tb-name'), tbText = $('tb-text'), tbHint = $('tb-hint');
const capEl = $('caption'), fadeEl = $('fade');
const titleEl = $('title'), pauseEl = $('pause'), endEl = $('end');
const btnE = $('btn-e'), stickL = $('stick-l'), stickR = $('stick-r');
function setRichText(el, parts) {
  el.textContent = '';
  if (!parts) return;
  if (parts.before) el.append(document.createTextNode(parts.before));
  if (parts.highlight) {
    const span = document.createElement('span');
    span.textContent = parts.highlight;
    el.append(span);
  }
  if (parts.after) el.append(document.createTextNode(parts.after));
}

function configureStaticUI() {
  const ui = GAME_CONTEXT.ui;
  setRichText(titleEl.querySelector('h1'), ui.title.logo);
  titleEl.querySelector('p').textContent = ui.title.subtitle;
  titleEl.querySelector('.keys').textContent = ui.title.keysDesktop;
  titleEl.querySelector('.go').textContent = ui.title.start;
  pauseEl.querySelector('h1').textContent = ui.pause.title;
  pauseEl.querySelector('.go').textContent = ui.pause.resume;
  setRichText(endEl.querySelector('h1'), ui.end.logo);
  endEl.querySelector('p').textContent = ui.end.subtitle;
  endEl.querySelector('.go').textContent = ui.end.restart;
  const promptKey = document.createElement('b');
  promptKey.textContent = ui.prompt.key;
  btnE.textContent = ui.prompt.key;
  promptEl.replaceChildren(promptKey, document.createTextNode(ui.prompt.afterKey), prName);
  $('rotate-title').textContent = ui.rotate.title;
  $('rotate-subtitle').textContent = ui.rotate.subtitle;
}
configureStaticUI();

/* ===================== estado ===================== */
let scene = null;
let day = 1;                            // fase narrativa atual
let walks = [], blocks = [], anims = [], inters = [];
let sway = false, elevFn = null; // elevFn: altura do chão por cena (calçada, escada...)
let seated = false;              // preso numa poltrona (avião): só olha, não anda
let px = 0, pz = 0, yaw = 0, pitch = 0;
let started = false, ended = false, transit = false, textOpen = false;
let target = null;
const keys = {};
let capTimer = 0, autoTimer = 0;

/* ===================== áudio: tudo sintetizado via Web Audio ===================== */
let AC = null, aMaster, aMusic, aSfx, aAmb, aVerb, nbuf, railB;
let musicNext = null;


function audioOn() { return AC && AC.state === 'running'; }

function makeImpulse(dur, decay) { // resposta de sala para o reverb
  const rate = AC.sampleRate, len = Math.floor(rate * dur);
  const buf = AC.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
function noiseBuf(dur) {
  const len = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
function railBuf() { // tu-dum ... tu-dum dos trilhos, em loop
  const rate = AC.sampleRate, buf = AC.createBuffer(1, Math.floor(rate * 2.2), rate);
  const d = buf.getChannelData(0);
  for (const [at, vol] of [[0, .5], [.13, .35], [1.1, .45], [1.23, .3]]) {
    const st = Math.floor(at * rate), n = Math.floor(rate * .05);
    for (let i = 0; i < n; i++) d[st + i] += (Math.random() * 2 - 1) * vol * Math.pow(1 - i / n, 3);
  }
  return buf;
}
function makeBus(dry, wet) { // canal com envio para o reverb
  const g = AC.createGain();
  const d = AC.createGain(); d.gain.value = dry;
  g.connect(d); d.connect(aMaster);
  if (wet) { const w = AC.createGain(); w.gain.value = wet; g.connect(w); w.connect(aVerb); }
  return g;
}
function initAudio() {
  if (AC) { AC.resume(); return; }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 5;
  comp.connect(AC.destination);
  aMaster = AC.createGain(); aMaster.gain.value = .85;
  aMaster.connect(comp);
  aVerb = AC.createConvolver(); aVerb.buffer = makeImpulse(3, 2.6);
  const vg = AC.createGain(); vg.gain.value = .6;
  aVerb.connect(vg); vg.connect(aMaster);
  nbuf = noiseBuf(2);
  railB = railBuf();
  aMusic = makeBus(.35, .7); // trilha afogada em reverb, bem ao fundo
  aSfx = makeBus(1, .16);
  aAmb = makeBus(1, .05);
}

/* --- trilha generativa: notas esparsas + colchão grave por dia --- */
function pluck(freq, vol, when) {
  if (!AC) return;
  const t = AC.currentTime + (when || 0);
  const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const h = AC.createOscillator(); h.type = 'sine'; h.frequency.value = freq * 2;
  const hg = AC.createGain(); hg.gain.value = .15;
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.07 * (vol || 1), t + .12); // ataque macio, sem estalo
  g.gain.exponentialRampToValueAtTime(.0001, t + 3);
  h.connect(hg); hg.connect(g); o.connect(g); g.connect(aMusic);
  o.start(t); h.start(t); o.stop(t + 3.1); h.stop(t + 3.1);
}
function playMotif() {
  const m = MUSIC[day] || MUSIC[1];
  const n = Math.random() < .35 ? 2 : 1;
  let dly = 0;
  for (let i = 0; i < n; i++) {
    const st = m.scale[Math.floor(Math.random() * m.scale.length)];
    let f = m.root * 2 * Math.pow(2, st / 12);
    if (Math.random() < .25) f *= 2;
    if (f > 620) f /= 2; // teto: nota aguda de repente quebra o clima
    pluck(f, .5 + Math.random() * .25, dly);
    dly += .4 + Math.random() * .5;
  }
}
let padDay = 0, padG = null, padOscs = [];
function setPad(d) {
  if (!AC || d === padDay) return;
  padDay = d;
  if (padG) {
    const g = padG, os = padOscs;
    g.gain.setTargetAtTime(0, AC.currentTime, 1.5);
    setTimeout(() => { for (const o of os) { try { o.stop(); } catch (e) {} } g.disconnect(); }, 7000);
  }
  const m = MUSIC[d] || MUSIC[1];
  padG = AC.createGain(); padG.gain.value = 0;
  padG.connect(aMusic);
  padG.gain.setTargetAtTime(.04, AC.currentTime + 1, 3);
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = .4;
  f.connect(padG);
  padOscs = [];
  for (const [mult, det] of [[1, -3], [1, 3], [1.5, 0], [2, -2]]) {
    const o = AC.createOscillator(); o.type = 'triangle';
    o.frequency.value = m.root * mult / 2;
    o.detune.value = det;
    o.connect(f); o.start(); padOscs.push(o);
  }
  const l = AC.createOscillator(); l.frequency.value = .05; // o colchão respira
  const lg = AC.createGain(); lg.gain.value = 80;
  l.connect(lg); lg.connect(f.frequency); l.start(); padOscs.push(l);
}
function chime() { // duas notas ao entrar numa cena
  const m = MUSIC[day] || MUSIC[1];
  pluck(m.root * 2, .5, 0);
  pluck(m.root * 3, .35, .45);
}
function endChord() { // acorde final: Zero vira Um
  const m = MUSIC[3];
  [0, 4, 7, 12].forEach((st, i) => pluck(m.root * 2 * Math.pow(2, st / 12), .7, i * .22));
}
function whaleCall(hi) { // canto da baleia sobre a cidade
  if (!audioOn()) return;
  const t = AC.currentTime, base = hi ? 110 : 80;
  const o = AC.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 2.6, t + 2.4);
  o.frequency.exponentialRampToValueAtTime(base * .8, t + 5.2);
  const v = AC.createOscillator(); v.frequency.value = 4.6;
  const vg = AC.createGain(); vg.gain.value = 5;
  v.connect(vg); vg.connect(o.frequency);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.15, t + 1.6);
  g.gain.linearRampToValueAtTime(0, t + 5.6);
  o.connect(g); g.connect(aMusic);
  o.start(t); v.start(t); o.stop(t + 5.7); v.stop(t + 5.7);
}

/* --- ambiente contínuo por cena --- */
let ambG = null, ambSrcs = [];
function setAmb(name) {
  if (!AC) return;
  if (ambG) {
    const g = ambG, ss = ambSrcs;
    g.gain.setTargetAtTime(0, AC.currentTime, .5);
    setTimeout(() => { for (const s of ss) { try { s.stop(); } catch (e) {} } g.disconnect(); }, 2500);
  }
  ambG = AC.createGain(); ambG.gain.value = 0;
  ambG.connect(aAmb);
  ambG.gain.setTargetAtTime(1, AC.currentTime, 1.2);
  ambSrcs = [];
  const noise = (vol, type, freq, q) => {
    const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true;
    s.playbackRate.value = .5 + Math.random() * .2;
    const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || .7;
    const g = AC.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(ambG);
    s.start(); ambSrcs.push(s);
    return { f, g };
  };
  const hum = (vol, freq) => {
    const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const g = AC.createGain(); g.gain.value = vol;
    o.connect(g); g.connect(ambG); o.start(); ambSrcs.push(o);
  };
  const lfo = (param, amt, rate) => {
    const l = AC.createOscillator(); l.frequency.value = rate;
    const lg = AC.createGain(); lg.gain.value = amt;
    l.connect(lg); lg.connect(param); l.start(); ambSrcs.push(l);
  };
  if (name === 'quarto') {
    noise(.045, 'lowpass', 220);                 // rumor da cidade lá fora
    const w = noise(.012, 'bandpass', 900, 1.5); // vento fino na janela
    lfo(w.g.gain, .008, .07);
    hum(.006, 120);                              // eletricidade
  } else if (name === 'corredor') {
    noise(.03, 'lowpass', 180);
    hum(.011, 100); hum(.005, 200);              // lâmpadas fluorescentes
  } else if (name === 'recepcao') {
    noise(.03, 'lowpass', 240);                  // a rua abafada atrás do vidro
    hum(.008, 120);                              // luz do saguão
    noise(.016, 'bandpass', 3400, .6);           // chuva batendo na vitrine
  } else if (name === 'rua') {
    noise(.05, 'lowpass', 300);                  // a cidade inteira
    const w = noise(.028, 'bandpass', 480, .8);  // vento canalizado entre os prédios
    lfo(w.f.frequency, 160, .05);
    lfo(w.g.gain, .016, .09);
    // a chuva chega devagar, junto com a visual
    const rainL = (vol, type, freq, q) => {
      const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true;
      const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = AC.createGain(); g.gain.value = 0;
      g.gain.setTargetAtTime(vol, AC.currentTime + 3, 4);
      s.connect(f); f.connect(g); g.connect(ambG);
      s.start(); ambSrcs.push(s);
      return g;
    };
    const h1 = rainL(.055, 'bandpass', 5200, .3); // chiado fino no asfalto
    const h2 = rainL(.03, 'bandpass', 1800, .5);  // corpo das gotas
    rainL(.022, 'lowpass', 420, .5);              // lavagem grave escorrendo nos prédios
    lfo(h1.gain, .016, .21);                      // a chuva respira, não é parede de ruído
    lfo(h1.gain, .009, .047);
    lfo(h2.gain, .011, .13);
  } else if (name === 'metro') {
    noise(.11, 'lowpass', 140);                  // motor do vagão
    noise(.02, 'bandpass', 1400, 2);             // chiado dos trilhos
    const s = AC.createBufferSource(); s.buffer = railB; s.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 850;
    const g = AC.createGain(); g.gain.value = .16;
    s.connect(f); f.connect(g); g.connect(ambG);
    s.start(); ambSrcs.push(s);
  } else if (name === 'plataforma') {
    noise(.06, 'lowpass', 150);                  // ronco subterrâneo do túnel
    hum(.008, 100);                              // eletricidade da estação
    noise(.01, 'highpass', 5000);                // chiado tênue nos trilhos
  } else if (name === 'loja') {
    noise(.03, 'lowpass', 240);                  // ar-condicionado da loja
    hum(.008, 120);
  } else if (name === 'aviao') {
    noise(.09, 'lowpass', 180);                  // motor
    noise(.02, 'highpass', 4200);                // chiado do ar pressurizado
    hum(.01, 90);
  } else if (name === 'praia') {
    const wv = noise(.09, 'lowpass', 480); lfo(wv.g.gain, .05, .12);   // ondas indo e voltando
    const wv2 = noise(.035, 'bandpass', 1800, .7); lfo(wv2.g.gain, .02, .17);
  } else if (name === 'empresa') {
    noise(.04, 'lowpass', 260);                  // burburinho abafado
    hum(.008, 120);                              // ar-condicionado
    noise(.008, 'highpass', 4000);               // ventilação
  }
}

/* --- efeitos pontuais --- */
function sfxStep() {
  if (!audioOn()) return;
  const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = nbuf;
  s.playbackRate.value = .7 + Math.random() * .5;
  const f = AC.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.value = 300 + Math.random() * 250; f.Q.value = .7;
  const g = AC.createGain();
  g.gain.setValueAtTime(.1, t);
  g.gain.exponentialRampToValueAtTime(.001, t + .09);
  s.connect(f); f.connect(g); g.connect(aSfx);
  s.start(t, Math.random() * 1.5); s.stop(t + .1);
}
function sfxBlip(open) {
  if (!audioOn()) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(open ? 540 : 430, t);
  o.frequency.exponentialRampToValueAtTime(open ? 720 : 320, t + .07);
  const g = AC.createGain();
  g.gain.setValueAtTime(.05, t);
  g.gain.exponentialRampToValueAtTime(.0008, t + .16);
  o.connect(g); g.connect(aSfx);
  o.start(t); o.stop(t + .18);
}
function sfxType() {
  if (!audioOn()) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = 'square';
  o.frequency.value = 1300 + Math.random() * 900;
  const g = AC.createGain();
  g.gain.setValueAtTime(.014 + Math.random() * .01, t);
  g.gain.exponentialRampToValueAtTime(.0005, t + .03);
  o.connect(g); g.connect(aSfx);
  o.start(t); o.stop(t + .04);
}
function sfxSit() { // roçar de roupa ao sentar / levantar
  if (!audioOn()) return;
  const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = nbuf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.05, t + .12);
  g.gain.linearRampToValueAtTime(0, t + .45);
  s.connect(f); f.connect(g); g.connect(aSfx);
  s.start(t, Math.random()); s.stop(t + .5);
}
function sfxWhoosh() { // sopro grave nas trocas de cena
  if (!audioOn()) return;
  const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .9;
  f.frequency.setValueAtTime(900, t);
  f.frequency.exponentialRampToValueAtTime(160, t + 1.1);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.13, t + .35);
  g.gain.linearRampToValueAtTime(0, t + 1.15);
  s.connect(f); f.connect(g); g.connect(aSfx);
  s.start(t); s.stop(t + 1.2);
}
function thunder() { // trovão distante rolando entre os prédios
  if (!audioOn()) return;
  const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true;
  s.playbackRate.value = .3;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = .6;
  f.frequency.setValueAtTime(170, t);
  f.frequency.exponentialRampToValueAtTime(55, t + 4.5);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.07, t + .6);  // sobe devagar: longe, sem susto
  g.gain.linearRampToValueAtTime(.028, t + 1.8);
  g.gain.linearRampToValueAtTime(.05, t + 2.6); // segundo rolo ecoando
  g.gain.linearRampToValueAtTime(0, t + 5.2);
  s.connect(f); f.connect(g); g.connect(aSfx);
  s.start(t, Math.random()); s.stop(t + 5.3);
}
function trainArrive(delay, dur) { // ronco crescente + guincho de freio, sincronizado com a chegada
  if (!audioOn()) return;
  const t0 = AC.currentTime + delay;
  const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(520, t0);
  f.frequency.linearRampToValueAtTime(150, t0 + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(.12, t0 + dur * .6);
  g.gain.linearRampToValueAtTime(0, t0 + dur + .3);
  s.playbackRate.setValueAtTime(1.25, t0);
  s.playbackRate.linearRampToValueAtTime(.5, t0 + dur); // trem desacelerando
  s.connect(f); f.connect(g); g.connect(aSfx);
  s.start(t0); s.stop(t0 + dur + .5);
  const br = AC.createBufferSource(); br.buffer = nbuf; br.loop = true;
  const bf = AC.createBiquadFilter(); bf.type = 'bandpass'; bf.Q.value = 6;
  bf.frequency.setValueAtTime(2600, t0 + dur * .55);
  bf.frequency.exponentialRampToValueAtTime(520, t0 + dur);
  const bg = AC.createGain();
  bg.gain.setValueAtTime(0, t0 + dur * .55);
  bg.gain.linearRampToValueAtTime(.05, t0 + dur * .72);
  bg.gain.linearRampToValueAtTime(0, t0 + dur + .1);
  br.connect(bf); bf.connect(bg); bg.connect(aSfx);
  br.start(t0 + dur * .55); br.stop(t0 + dur + .2);
}
function trainStopSfx() { // chiado do freio pneumático + toque das portas abrindo
  if (!audioOn()) return;
  const t = AC.currentTime;
  const s = AC.createBufferSource(); s.buffer = nbuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000;
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.06, t + .05);
  g.gain.exponentialRampToValueAtTime(.001, t + .9);
  s.connect(f); f.connect(g); g.connect(aSfx);
  s.start(t); s.stop(t + 1.0);
  const m = MUSIC[day] || MUSIC[1];
  pluck(m.root * 2, .5, .2); pluck(m.root * 3, .4, .5);
}

/* ===================== terminal: tela preta, letras azuis ===================== */
const termCanvas = document.createElement('canvas');
termCanvas.width = 640; termCanvas.height = 400;
const termCtx = termCanvas.getContext('2d');
const termTex = new THREE.CanvasTexture(termCanvas);
termTex.magFilter = THREE.LinearFilter;
const termMat = new THREE.MeshBasicMaterial({ map: termTex });
if (document.fonts && document.fonts.load) document.fonts.load('26px VT323');

let term = null;     // sessão de terminal ativa
let camAnim = null;  // animação de câmera (sentar / levantar)
let poseHold = null; // câmera travada numa pose (acordar: deitado, olhos abrindo)

function wrapInto(c, text, maxW, out) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { out.push(line); line = w; }
    else line = t;
  }
  out.push(line);
}
const TFONT = '42px VT323, monospace', TLINE = 48;
function drawIdle() {
  termCtx.fillStyle = '#000';
  termCtx.fillRect(0, 0, 640, 400);
  termCtx.fillStyle = '#3aa2ea';
  termCtx.font = TFONT;
  termCtx.textBaseline = 'top';
  termCtx.fillText('█', 20, 20);
  termTex.needsUpdate = true;
}
function drawTerm() {
  const c = termCtx, W = 640, H = 400, maxW = W - 40;
  c.fillStyle = '#000';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#3aa2ea';
  c.font = TFONT;
  c.textBaseline = 'top';
  const rows = [];
  for (let i = 0; i <= term.idx; i++) {
    const full = term.lines[i];
    wrapInto(c, '> ' + (i < term.idx ? full : full.slice(0, Math.floor(term.chars))), maxW, rows);
  }
  const maxRows = Math.floor((H - 64) / TLINE);
  const vis = rows.slice(-maxRows);
  vis.forEach((r, i) => c.fillText(r, 20, 20 + i * TLINE));
  if (!term.waiting || term.blink) {
    const lw = c.measureText(vis[vis.length - 1] || '').width;
    c.fillText('█', 20 + lw + 5, 20 + (vis.length - 1) * TLINE);
  }
  if (term.waiting && term.blink) c.fillText('E', W - 56, H - 52);
  termTex.needsUpdate = true;
}
function startTerm(it) {
  const s = it.seat, L = it.look;
  const dx = L.x - s.x, dy = L.y - s.y, dz = L.z - s.z;
  term = {
    lines: it.terminal, idx: 0, chars: 0,
    typing: false, waiting: false, blink: 1, cb: it.cb || null,
    pose: { x: s.x, y: s.y, z: s.z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) },
  };
  camAnim = {
    t: 0, dur: .9,
    from: { x: px, y: 1.6, z: pz, yaw, pitch },
    to: term.pose,
    then: () => { term.typing = true; drawTerm(); },
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
  if (term.chars < cur.length) { term.chars = cur.length; term.waiting = true; drawTerm(); return; }
  if (term.idx < term.lines.length - 1) {
    term.idx++; term.chars = 0; term.waiting = false;
    drawTerm();
  } else exitTerm();
}

/* ===================== diálogo em páginas (E avança) ===================== */
let queue = [], after = null;
function say(name, lines, cb) {
  queue = lines.map(l => ({ name, l }));
  after = cb || null;
  nextPage();
}
function nextPage() {
  if (!queue.length) {
    tbEl.classList.remove('on');
    textOpen = false;
    sfxBlip(0);
    const f = after; after = null;
    if (f) f();
    return;
  }
  const p = queue.shift();
  sfxBlip(1);
  tbName.textContent = p.name;
  tbName.style.display = p.name ? '' : 'none';
  tbText.textContent = p.l;
  tbHint.textContent = queue.length ? GAME_CONTEXT.ui.dialog.continueHint : GAME_CONTEXT.ui.dialog.closeHint;
  tbEl.classList.add('on');
  textOpen = true;
}
function closeText() {
  queue = []; after = null;
  tbEl.classList.remove('on');
  textOpen = false;
}

function objectName(key) {
  return LABELS.objects[key] || key;
}
function speakerName(key) {
  if (!key) return '';
  return LABELS.speakers[key] || key;
}
function linesOf(key) {
  const lines = ROTEIRO[key];
  if (!Array.isArray(lines)) {
    console.warn(`Roteiro ausente em game-context.json: ${key}`);
    return [];
  }
  return lines;
}
function dayInfo() {
  return DAYS[String(day)] || {};
}
function roomCaption() {
  return dayInfo().roomCaption || '';
}
function roomAuto() {
  const auto = dayInfo().roomAuto;
  return auto ? { name: speakerName(auto.speaker), lines: linesOf(auto.script) } : null;
}
function sceneCaption(name) {
  return (SCENES[name] && SCENES[name].caption) || name.toUpperCase();
}
function runSequence(key) {
  const steps = SEQUENCES[key] || [];
  const run = i => {
    const step = steps[i];
    if (!step) return;
    if (step.say) {
      say(speakerName(step.say.speaker), linesOf(step.say.script), () => run(i + 1));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(step, 'setDay')) day = Number(step.setDay);
    if (step.go) { go(step.go); return; }
    run(i + 1);
  };
  run(0);
}
function tagDialog(o, objectKey, scriptKey, opts = {}) {
  tag(o, objectName(objectKey), { lines: linesOf(scriptKey), ...opts });
}
function tagTerminal(o, objectKey, scriptKey, opts = {}) {
  tag(o, objectName(objectKey), { terminal: linesOf(scriptKey), ...opts });
}
function tagGo(o, objectKey, sceneName) {
  tag(o, objectName(objectKey), { go: sceneName });
}

/* ===================== helpers de construção ===================== */
function box(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}
function lite(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c }));
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}
function grp(x = 0, y = 0, z = 0, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  (parent || scene).add(g);
  return g;
}
// objeto interativo: lines abre diálogo; go troca de cena; cb roda ao fim do diálogo
function tag(o, name, opts) { o.userData.inter = { name, ...opts }; inters.push(o); }
function walkOf(x1, z1, x2, z2) { walks.push({ x1, z1, x2, z2 }); }
function blockOf(x1, z1, x2, z2) { blocks.push({ x1, z1, x2, z2 }); }

function freshScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(DARK);
  scene.fog = new THREE.Fog(DARK, 9, 34);
  walks = []; blocks = []; anims = []; inters = [];
  sway = false; target = null; elevFn = null; seated = false;
  scene.add(new THREE.HemisphereLight(0xc9d5d7, 0x3a4f63, 1.05));
  const d = new THREE.DirectionalLight(0xe9f1f1, .5);
  d.position.set(3, 7, 2);
  scene.add(d);
  drawIdle();
}

function room(W, D, H, hole, holeW) {
  box(W + .4, .2, D + .4, FLOOR, 0, -.1, 0);
  box(W + .4, .2, D + .4, DARK2, 0, H + .1, 0);
  const zN = -D / 2 - .09;
  if (!hole) {
    box(W + .4, H, .18, LIGHT, 0, H / 2, zN);
  } else {
    // parede norte em 4 segmentos, deixando o vão da janela aberto de verdade
    const X0 = -W / 2 - .2, X1 = W / 2 + .2;
    box(hole.x0 - X0, H, .18, LIGHT, (X0 + hole.x0) / 2, H / 2, zN);
    box(X1 - hole.x1, H, .18, LIGHT, (hole.x1 + X1) / 2, H / 2, zN);
    box(hole.x1 - hole.x0, hole.y0, .18, LIGHT, (hole.x0 + hole.x1) / 2, hole.y0 / 2, zN);
    box(hole.x1 - hole.x0, H - hole.y1, .18, LIGHT, (hole.x0 + hole.x1) / 2, (hole.y1 + H) / 2, zN);
  }
  box(W + .4, H, .18, LIGHT, 0, H / 2, D / 2 + .09);
  const xW = -W / 2 - .09;
  if (!holeW) {
    box(.18, H, D + .4, LIGHT, xW, H / 2, 0);
  } else {
    // parede oeste em 3 segmentos, deixando o vão da porta do banheiro
    const Z0 = -D / 2 - .2, Z1 = D / 2 + .2;
    box(.18, H, holeW.z0 - Z0, LIGHT, xW, H / 2, (Z0 + holeW.z0) / 2);
    box(.18, H, Z1 - holeW.z1, LIGHT, xW, H / 2, (holeW.z1 + Z1) / 2);
    box(.18, H - holeW.h, holeW.z1 - holeW.z0, LIGHT, xW, (holeW.h + H) / 2, (holeW.z0 + holeW.z1) / 2);
  }
  box(.18, H, D + .4, LIGHT, W / 2 + .09, H / 2, 0);
  for (const s of [-1, 1]) {
    box(W, .12, .06, DARK2, 0, .06, s * (D / 2 - .03));
    box(W, .1, .06, DARK2, 0, H - .05, s * (D / 2 - .03));
    box(.06, .12, D, DARK2, s * (W / 2 - .03), .06, 0);
    box(.06, .1, D, DARK2, s * (W / 2 - .03), H - .05, 0);
  }
}

function person(sit, c = BLUE, parent) {
  const g = grp(0, 0, 0, parent);
  if (sit) {
    box(.13, .5, .14, c, -.1, .25, .38, g);  box(.13, .5, .14, c, .1, .25, .38, g);
    box(.13, .18, .42, c, -.1, .56, .18, g); box(.13, .18, .42, c, .1, .56, .18, g);
    box(.4, .55, .22, c, 0, .92, 0, g);
    box(.1, .42, .15, c, -.25, .95, .02, g); box(.1, .42, .15, c, .25, .95, .02, g);
    box(.15, .14, .16, c, 0, 1.16, 0, g);    // pescoço (fecha o vão torso-cabeça)
    box(.26, .26, .24, c, 0, 1.33, 0, g);
  } else {
    box(.13, .52, .16, c, -.1, .26, 0, g);   box(.13, .52, .16, c, .1, .26, 0, g);
    box(.4, .55, .22, c, 0, .79, 0, g);
    box(.1, .45, .15, c, -.25, .83, 0, g);   box(.1, .45, .15, c, .25, .83, 0, g);
    box(.15, .15, .16, c, 0, 1.06, 0, g);    // pescoço
    box(.26, .26, .24, c, 0, 1.22, 0, g);
    g.scale.setScalar(1.2);
  }
  return g;
}

function cat(x, z, rot) {
  const g = grp(x, 0, z);
  g.rotation.y = rot;
  const c = DARK2;
  box(.42, .2, .17, c, 0, .26, 0, g);
  for (const [lx, lz] of [[-.15, -.05], [.15, -.05], [-.15, .05], [.15, .05]])
    box(.05, .16, .05, c, lx, .08, lz, g);
  box(.2, .18, .18, c, .27, .42, 0, g);
  box(.05, .07, .04, c, .22, .54, -.05, g);
  box(.05, .07, .04, c, .22, .54, .05, g);
  const tail = box(.05, .34, .05, c, 0, 0, 0, g);
  tail.geometry.translate(0, .17, 0);
  tail.position.set(-.23, .3, 0);
  anims.push(t => { tail.rotation.z = .5 + Math.sin(t * 2.4) * .3; });
  return g;
}

function blob(rx, ry, rz, c, x, y, z, parent) { // esfera low-poly achatada, forma orgânica
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 10, 7),
    new THREE.MeshLambertMaterial({ color: c, flatShading: true })
  );
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  (parent || scene).add(m);
  return m;
}

const texLoader = new THREE.TextureLoader();
function quadro(file, w, h, x, y, z, roty) { // quadro emoldurado com imagem
  const g = grp(x, y, z);
  g.rotation.y = roty;
  box(w + .16, h + .16, .06, DARK2, 0, 0, 0, g);
  const tex = texLoader.load(file);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; // mantém o pixel art da arte 2D
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.z = .035;
  g.add(m);
  return g;
}

/* ===================== a cidade lá fora ===================== */
function cidade() {
  const g = grp(0, 0, 0);
  // torres gigantes em duas fileiras, sufocando o céu
  const defs = [
    [-13, -9, 7, 46], [-5.5, -8, 5, 40], [1.5, -9.5, 6, 52], [8, -8, 5, 38], [15, -9, 7, 48],
    [-18, -17, 9, 60], [-8, -18, 8, 66], [2, -19, 9, 58], [12, -17, 8, 64], [21, -18, 8, 56],
  ];
  const slots = [];
  const yBase = -18, towerDepth = 4;
  for (const [x, z, w, h] of defs) {
    box(w, h, towerDepth, DARK2, x, yBase + h / 2, z, g);
    box(w + .24, .22, towerDepth + .24, DARK, x, yBase + h + .11, z, g); // topo: evita bloco cortado
    box(.12, h - .3, towerDepth + .1, 0x223545, x - w / 2 + .06, yBase + h / 2 - .05, z, g);
    box(.12, h - .3, towerDepth + .1, 0x223545, x + w / 2 - .06, yBase + h / 2 - .05, z, g);
    const faceZ = z + towerDepth / 2 + .16; // bem à frente da torre: evita z-fighting à distância
    for (let wy = yBase + 1.2; wy < yBase + h - 1; wy += 1.5)
      for (let wx = -w / 2 + .8; wx < w / 2 - .5; wx += 1.1)
        slots.push({ x: x + wx, y: wy, z: faceZ });
  }
  // antenas em algumas torres
  box(.1, 3, .1, DARK2, 1.5, 34.5, -9.5, g);
  box(.1, 2.4, .1, DARK2, -8, 49.2, -18, g);
  box(.1, 2.6, .1, DARK2, 15, 31.3, -9, g);
  // mil outras janelas, exatamente como a minha
  const im = new THREE.InstancedMesh(
    new THREE.BoxGeometry(.5, .75, .12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    slots.length
  );
  im.frustumCulled = false; // mesmo problema da chuva: instâncias longe da origem do mesh
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  slots.forEach((s, i) => {
    m4.setPosition(s.x, s.y, s.z);
    im.setMatrixAt(i, m4);
    const r = Math.random();
    c.setHex(r < .1 ? GLOW : r < .13 ? BLUE : NAVY);
    im.setColorAt(i, c);
  });
  g.add(im);
}

/* ===================== CENA: O QUARTO ===================== */
function buildQuarto() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 9, 42);
  const W = 9, D = 4.6, H = 2.8;
  room(W, D, H, { x0: .34, x1: 1.46, y0: 1.32, y1: 2.18 }, { z0: -1.8, z1: -.7, h: 2.05 });
  cidade();
  walkOf(-4.2, -2.0, 4.2, 2.0);

  // banheiro: anexo atrás do vão na parede oeste
  box(2.7, .2, 2.7, FLOOR, -5.8, -.1, -1.2);
  box(2.7, .2, 2.7, DARK2, -5.8, H + .1, -1.2);
  box(.18, H, 2.7, LIGHT, -7.04, H / 2, -1.2);   // parede oeste
  box(2.4, H, .18, LIGHT, -5.79, H / 2, -2.39);  // norte
  box(2.4, H, .18, LIGHT, -5.79, H / 2, -.01);   // sul
  walkOf(-6.7, -2.0, -4.55, -.4);
  walkOf(-4.8, -1.7, -4.1, -.8); // passagem pelo vão
  box(.1, 2.05, .1, DARK2, -4.59, 1.025, -1.83); // batentes
  box(.1, 2.05, .1, DARK2, -4.59, 1.025, -.67);
  lite(.14, .06, .14, GLOW, -5.8, H - .07, -1.2);
  const bl = new THREE.PointLight(0xeaf2f2, .45, 6);
  bl.position.set(-5.8, 2.2, -1.2);
  scene.add(bl);

  // pia + espelho (coluna esquerda da arte, agora no banheiro)
  const pia = grp(-6.6, 0, -.85);
  box(.6, .85, .95, LIGHT2, 0, .43, 0, pia);
  box(.64, .07, .99, DARK2, 0, .885, 0, pia);
  box(.1, .2, .08, DARK2, -.18, 1.0, 0, pia);
  const esp = grp(-6.92, 1.6, -.85);
  box(.07, .78, .6, DARK2, 0, 0, 0, esp);
  box(.05, .66, .48, NAVY, .03, 0, 0, esp);
  blockOf(-6.95, -1.35, -6.25, -.35);

  // vaso sanitário contra a parede norte
  const vaso = grp(-6.35, 0, -1.8);
  box(.36, .4, .44, LIGHT2, 0, .2, .05, vaso);
  box(.44, .08, .5, LIGHT, 0, .44, .05, vaso);
  box(.48, .55, .2, LIGHT2, 0, .62, -.32, vaso);
  box(.12, .05, .08, DARK2, 0, .92, -.32, vaso);
  blockOf(-6.65, -2.2, -6.05, -1.5);

  // chuveiro no canto
  box(.95, .07, .85, DARK2, -5.15, .035, -1.85);  // base
  box(.05, 1.1, .05, DARK2, -5.15, 1.7, -2.24);   // cano
  box(.3, .06, .3, LIGHT2, -5.15, 2.22, -2.05);   // ducha
  box(.12, .2, .06, DARK2, -5.15, 1.05, -2.26);   // registro

  // estante de livros na parede norte (é dela que ele fala ao lembrar dos seus livros)
  const gr = grp(-2.9, 0, -1.95);
  const woodC = LIGHT2;
  box(.07, 2.05, .52, woodC, -.565, 1.025, 0, gr);   // lateral esquerda
  box(.07, 2.05, .52, woodC, .565, 1.025, 0, gr);    // lateral direita
  box(1.2, .09, .56, DARK2, 0, 2.06, 0, gr);         // tampo
  box(1.2, .1, .52, woodC, 0, .05, 0, gr);           // base
  box(1.13, 2.0, .04, DARK2, 0, 1.03, -.225, gr);    // fundo escuro
  for (const sy of [.5, .87, 1.24, 1.61]) box(1.1, .05, .48, woodC, 0, sy, 0, gr); // prateleiras
  // livros de verdade: lombadas coloridas, alturas e larguras variadas
  const bookCols = [BLUE, LIGHT, DARK2, NAVY, GLOW, 0xc7d4d5, 0x35566e];
  let seed = 7;
  const rnd = () => { seed++; const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };
  for (const sy of [.1, .525, .895, 1.265, 1.635]) { // superfície de cada prateleira
    let x = -.5;
    while (x < .42) {
      const w = .04 + rnd() * .055, hgt = .23 + rnd() * .06;
      // assenta o livro um pouco DENTRO da prateleira: sem base quase-coplanar (evita piscar)
      const bk = box(w, hgt, .21, bookCols[Math.floor(rnd() * bookCols.length)], x + w / 2, sy + hgt / 2 - .012, .1, gr);
      bk.rotation.z = (rnd() - .5) * .022;           // inclinação sutil, sem raspar a prateleira
      x += w + .015;
    }
  }
  // dois livros deitados e um bibelô em cima da estante (encaixados, sem faces coplanares)
  box(.3, .05, .22, NAVY, -.18, 2.12, 0, gr);
  box(.26, .05, .2, BLUE, -.18, 2.16, 0, gr);
  box(.12, .17, .12, LIGHT, .22, 2.185, 0, gr);
  if (day === 1) tagDialog(gr, 'bookshelf', 'guardaRoupa');
  blockOf(-3.55, -2.3, -2.25, -1.6);

  // mesa: dias 1-4 têm computador; no dia 5 a mesa está vazia
  const pc = grp(-1.2, 0, -1.85);
  box(1.25, .07, .62, LIGHT2, 0, .78, 0, pc);
  for (const [lx, lz] of [[-.55, -.24], [.55, -.24], [-.55, .24], [.55, .24]])
    box(.07, .78, .07, DARK2, lx, .39, lz, pc);
  if (day !== 5) {
    box(.4, .05, .3, DARK2, 0, .84, -.08, pc);
    box(.09, .22, .09, DARK2, 0, .97, -.12, pc);
    box(1.04, .68, .08, DARK2, 0, 1.42, -.14, pc); // monitor grande
    const tela1 = new THREE.Mesh(new THREE.PlaneGeometry(.92, .56), termMat);
    tela1.position.set(0, 1.42, -.095);
    pc.add(tela1);
    box(.4, .04, .16, DARK2, 0, .83, .16, pc);
  }
  const sentado1 = { seat: { x: -1.2, y: 1.15, z: -1.0 }, look: { x: -1.2, y: 1.42, z: -1.99 } };
  if (day === 1) tagTerminal(pc, 'computer', 'pcQuarto1', { ...sentado1 });
  if (day === 3) tagTerminal(pc, 'computer', 'pcQuarto3', { ...sentado1, cb: () => runSequence('finishDay3') });
  if (day === 4) tagTerminal(pc, 'computer', 'pcQuarto4', { ...sentado1, cb: () => say(speakerName('thought'), linesOf('semViews')) });
  blockOf(-1.9, -2.3, -.5, -1.4);

  // janela de verdade: vão aberto na parede, a cidade lá fora
  const jan = grp(.9, 1.75, -2.39);
  box(1.34, .1, .22, LIGHT2, 0, .48, 0, jan);
  box(1.34, .1, .22, LIGHT2, 0, -.48, 0, jan);
  box(.1, 1.06, .22, LIGHT2, -.62, 0, 0, jan);
  box(.1, 1.06, .22, LIGHT2, .62, 0, 0, jan);
  box(.07, .86, .12, LIGHT2, 0, 0, 0, jan);   // cruzeta vertical
  box(1.14, .07, .12, LIGHT2, 0, 0, 0, jan);  // cruzeta horizontal
  box(1.34, .07, .34, LIGHT2, 0, -.55, .08, jan); // peitoril
  const vidro = new THREE.Mesh(
    new THREE.PlaneGeometry(1.14, .86),
    new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide })
  );
  vidro.position.z = -.03;
  jan.add(vidro);
  if (day === 1) tagDialog(jan, 'window', 'janela');

  // fotografia na parede
  const qs = grp(2.35, 1.55, -2.2);
  for (const [qx, qy] of [[-.23, .21], [.23, .21], [-.23, -.21], [.23, -.21]]) {
    box(.3, .3, .06, DARK2, qx, qy, 0, qs);
    box(.22, .22, .02, NAVY, qx, qy, .04, qs);
  }
  if (day === 1) tagDialog(qs, 'photo', 'fotografia');

  // porta de saída
  const door = grp(3.75, 0, -2.18);
  box(1.14, 2.3, .1, LIGHT2, 0, 1.15, 0, door);
  box(.96, 2.16, .09, DARK2, 0, 1.08, .03, door);
  box(.07, .07, .07, BLUE, -.36, 1.08, .07, door);
  if (day < 3 || day === 5) tagGo(door, 'door', 'corredor');
  else if (day === 4) tag(door, objectName('door'), { cb: () => runSequence('finishDay4') }); // dia 4: sair pela porta pula pro dia 5
  // (dia 3 termina no PC ao criar o jogo)

  // cama com cobertor azul
  const cama = grp(1.7, 0, 1.72);
  box(2.15, .32, 1.05, LIGHT2, 0, .16, 0, cama);
  box(2.1, .16, 1.0, LIGHT, 0, .4, 0, cama);
  box(1.25, .18, 1.02, BLUE, -.4, .42, 0, cama);
  box(.5, .14, .6, 0xc7d4d5, .72, .51, 0, cama);
  blockOf(.5, 1.1, 2.85, 2.3);

  // tapete e luminária
  box(1.9, .05, 1.25, DARK2, 0, .025, .6);
  box(.04, .5, .04, DARK2, 0, H - .25, 0);
  box(.34, .16, .34, DARK2, 0, H - .55, 0);
  lite(.14, .07, .14, GLOW, 0, H - .66, 0);
  const pl = new THREE.PointLight(0xeaf2f2, .55, 9);
  pl.position.set(0, 2, 0);
  scene.add(pl);

  // deitado na cama (cabeça no travesseiro, olhando o teto); o giro leva daqui até em pé
  const wake = { x: 2.0, y: .6, z: 1.72, yaw: .55, pitch: 1.2 };
  return { spawn: { x: 0, z: 1.1, yaw: 0 }, caption: roomCaption(), auto: roomAuto(), wake };
}

/* ===================== CENA: O CORREDOR DO PRÉDIO ===================== */
function buildCorredor() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 7, 26);
  const L = 12, Wz = 2.4, H = 2.6;

  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0);
  for (const s of [-1, 1]) {
    box(L + .4, H, .16, LIGHT, 0, H / 2, s * (Wz / 2 + .08));
    box(L, .12, .06, DARK2, 0, .06, s * (Wz / 2 - .03));
    box(L, .1, .06, DARK2, 0, H - .05, s * (Wz / 2 - .03));
  }
  box(.16, H, Wz + .4, LIGHT, -L / 2 - .08, H / 2, 0);
  box(.16, H, Wz + .4, LIGHT, L / 2 + .08, H / 2, 0);
  walkOf(-L / 2 + .45, -Wz / 2 + .42, L / 2 - .45, Wz / 2 - .42);

  // tapete corrido
  box(L - 1.2, .04, .95, DARK2, 0, .02, 0);

  // luzes do teto
  for (const lx of [-4, 0, 4]) {
    lite(.5, .04, .2, GLOW, lx, H - .03, 0);
    const pl = new THREE.PointLight(0xeaf2f2, .35, 8);
    pl.position.set(lx, 2.2, 0);
    scene.add(pl);
  }

  // portas dos vizinhos, todas exatamente iguais (cenário)
  function portaViz(x, s) {
    const d = grp(x, 0, s * (Wz / 2 - .04));
    box(1.0, 2.2, .1, LIGHT2, 0, 1.1, 0, d);
    box(.84, 2.06, .09, DARK2, 0, 1.03, -s * .03, d);
    box(.06, .06, .06, BLUE, .32, 1.05, -s * .07, d);
    lite(.18, .12, .03, GLOW, 0, 2.32, -s * .06, d); // numerinho iluminado
  }
  for (const x of [-3.6, -1.2, 1.2, 3.6]) { portaViz(x, 1); portaViz(x, -1); }

  // a porta do seu apartamento, atrás de você (cenário)
  const ap = grp(-L / 2 + .02, 0, 0);
  ap.rotation.y = Math.PI / 2;
  box(1.14, 2.3, .1, LIGHT2, 0, 1.15, 0, ap);
  box(.96, 2.16, .09, DARK2, 0, 1.08, .03, ap);
  box(.07, .07, .07, BLUE, -.36, 1.08, .07, ap);

  // o elevador que desce até a recepção
  const out = grp(L / 2 - .02, 0, 0);
  out.rotation.y = -Math.PI / 2;
  box(1.3, 2.4, .12, LIGHT2, 0, 1.2, 0, out);
  box(.55, 2.25, .1, DARK2, -.29, 1.12, .05, out);
  box(.55, 2.25, .1, DARK2, .29, 1.12, .05, out);
  lite(.8, .14, .06, BLUE, 0, 2.51, .06, out); // indicador do andar
  box(.12, .3, .08, LIGHT2, .82, 1.15, .05, out);
  lite(.05, .05, .04, BLUE, .82, 1.22, .1, out); // botão de chamada
  tagGo(out, 'elevator', 'recepcao');

  return { spawn: { x: -5, z: 0, yaw: -Math.PI / 2 }, caption: sceneCaption('corredor'), auto: null };
}

/* ===================== CENA: A RECEPÇÃO DO PRÉDIO ===================== */
function buildRecepcao() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 8, 30);
  const W = 12, D = 5.4, H = 3;
  room(W, D, H);
  walkOf(-5.4, -2.2, 5.4, 2.2);

  // luzes do saguão
  for (const lx of [-3.5, 0, 3.5]) {
    lite(.6, .05, .3, GLOW, lx, H - .04, 0);
    const pl = new THREE.PointLight(0xeaf2f2, .38, 9);
    pl.position.set(lx, 2.4, 0);
    scene.add(pl);
  }

  // tapete da entrada
  box(2.2, .04, 3.6, DARK2, 4.2, .02, 0);

  // o elevador de onde você desceu (parede oeste)
  const ev = grp(-5.9, 0, 0);
  ev.rotation.y = Math.PI / 2;
  box(1.8, 2.5, .14, LIGHT2, 0, 1.25, 0, ev);
  box(.78, 2.3, .1, DARK2, -.41, 1.15, .06, ev);
  box(.78, 2.3, .1, DARK2, .41, 1.15, .06, ev);
  lite(.5, .12, .05, BLUE, 0, 2.62, .09, ev);

  // balcão da recepção com o porteiro
  const bal = grp(0, 0, -1.55);
  box(3.0, 1.05, .6, LIGHT2, 0, .525, 0, bal);
  box(3.1, .08, .7, DARK2, 0, 1.09, 0, bal);
  box(.34, .05, .26, DARK2, .6, 1.13, 0, bal);   // livro de registros
  lite(.1, .1, .1, BLUE, -.9, 1.18, 0, bal);     // luminária do balcão
  box(.5, .5, .45, DARK2, 0, .25, -.75, bal);    // banqueta
  const port = person(true, BLUE, bal);
  port.position.set(0, .04, -.75);
  blockOf(-1.7, -2.4, 1.7, -1.1);

  // caixas de correio, todas exatamente iguais
  const cor = grp(-3.4, 1.5, -2.64);
  for (let cy = 0; cy < 3; cy++)
    for (let cx = 0; cx < 6; cx++) {
      box(.3, .24, .07, LIGHT2, cx * .36 - .9, cy * .3 - .3, 0, cor);
      box(.2, .03, .02, DARK2, cx * .36 - .9, cy * .3 - .25, .04, cor);
    }

  // sofá de espera e vaso de planta
  const sofa = grp(1.8, 0, 2.0);
  box(2.0, .42, .8, LIGHT2, 0, .24, 0, sofa);
  box(2.0, .6, .2, LIGHT2, 0, .62, .32, sofa);
  box(.9, .14, .7, BLUE, -.5, .5, -.02, sofa);
  box(.9, .14, .7, BLUE, .5, .5, -.02, sofa);
  blockOf(.7, 1.5, 2.9, 2.5);
  box(.5, .55, .5, DARK2, -2.6, .275, 2.05);
  blob(.42, .5, .42, BLUE, -2.6, .95, 2.05);
  blockOf(-2.95, 1.7, -2.25, 2.4);

  // a porta de vidro para a rua (dá pra ver a chuva do lado de fora)
  const pv = grp(5.9, 0, 0);
  pv.rotation.y = -Math.PI / 2;
  box(2.6, 2.6, .14, LIGHT2, 0, 1.3, 0, pv);
  for (const s of [-1, 1]) {
    const vd = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 2.3, .05),
      new THREE.MeshBasicMaterial({ color: NAVY, transparent: true, opacity: .6 })
    );
    vd.position.set(s * .56, 1.22, .05);
    pv.add(vd);
    box(.06, .5, .07, BLUE, s * .18, 1.15, .1, pv); // puxadores
  }
  tagGo(pv, 'streetDoor', 'rua');

  return { spawn: { x: -4.9, z: 0, yaw: -Math.PI / 2 }, caption: sceneCaption('recepcao'), auto: null };
}

/* ===================== CENA: A RUA (dois quarteirões até o metro) ===================== */
function buildRua() {
  freshScene();
  const streetBg = new THREE.Color(0x263848);
  const streetFog = new THREE.Color(0x2b3d4c);
  const streetStormFog = new THREE.Color(0x233342);
  const streetFlash = new THREE.Color(0x354a5c);
  scene.background.copy(streetBg);
  scene.fog = new THREE.Fog(streetFog, 10, 68);

  // traçado: rua N-S com duas transversais; quarteirões A(-32..-12), B(-4..16), C(24..38)
  const matRua = new THREE.MeshLambertMaterial({ color: DARK2 });
  const matCal = new THREE.MeshLambertMaterial({ color: FLOOR });
  const matFx = new THREE.MeshLambertMaterial({ color: LIGHT });
  const cRua = new THREE.Color(DARK2), cCal = new THREE.Color(FLOOR);
  function slab(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  slab(7, .2, 105, matRua, 0, -.08, 9.5);      // pista principal, até o horizonte
  slab(60, .2, 8, matRua, 0, -.08, -8);        // transversal 1
  slab(60, .2, 8, matRua, 0, -.08, 20);        // transversal 2
  for (const [z0, z1] of [[-32, -12], [-4, 16], [24, 38]]) {
    const len = z1 - z0, zc = (z0 + z1) / 2;
    slab(4.7, .18, len, matCal, -5.85, .03, zc);                 // calçada oeste
    if (z0 < 24) slab(4.7, .18, len, matCal, 5.85, .03, zc);     // leste
  }
  // calçada leste do quarteirão C, recortada em volta da escada do metro
  slab(2.35, .18, 14, matCal, 4.68, .03, 31);
  slab(2.35, .18, 3.3, matCal, 7.03, .03, 25.65);
  slab(2.35, .18, 2.6, matCal, 7.03, .03, 36.7);

  // pintura do asfalto: faixa central pontilhada e faixas de pedestre
  for (let z = -40; z < 56; z += 3) {
    if ((z > -13 && z < -3) || (z > 15 && z < 25)) continue;
    slab(.14, .02, 1.2, matFx, 0, .035, z);
  }
  for (const zc of [-8, 20]) {
    for (let x = -28; x <= 28; x += 3) {
      if (Math.abs(x) < 4.6) continue;
      slab(1.2, .02, .14, matFx, x, .035, zc);
    }
    for (let i = -3; i <= 3; i++)
      for (const xs of [-5.85, 5.85]) slab(2.6, .02, .5, matFx, xs, .035, zc + i * 1.05);
  }

  walkOf(-7.8, -31, 7.8, 27.1);   // rua e calçadas
  walkOf(-7.8, 27.1, 5.8, 36.2);  // calçada que segue ao lado da escada
  walkOf(5.9, 26.8, 8.1, 34.6);   // a escada e o patamar

  // andar por onde dá: calçada, asfalto, escada
  elevFn = (x, z) => {
    if (x > 5.85 && z > 27.3) {   // descendo pro metro
      if (z > 32.7) return -3;
      return -(z - 27.3) / 5.4 * 3;
    }
    const naRua = Math.abs(x) <= 3.5 || (z > -12 && z < -4) || (z > 16 && z < 24);
    return naRua ? .02 : .12;     // guia da calçada
  };

  // prédios colados na calçada, com vitrines e portas no térreo
  const wSlots = [], eSlots = [], sSlots = [];
  const hs = [22, 30, 18, 34, 26, 20];
  let hi = 0;
  // entrada no térreo: emoldurada e recuada, para ler como porta/vitrine e não buraco
  // (xf = face do prédio na rua; nf aponta da parede para a rua)
  function entrada(side, zc, porta) {
    const xf = side * 8.2, nf = -side;
    if (porta) {
      box(.1, 2.4, 1.55, DARK, xf + nf * .04, 1.2, zc);           // folha recuada
      box(.22, 2.5, .16, LIGHT2, xf + nf * .13, 1.25, zc - .78);  // batente esquerdo
      box(.22, 2.5, .16, LIGHT2, xf + nf * .13, 1.25, zc + .78);  // batente direito
      box(.22, .2, 2.0, LIGHT2, xf + nf * .13, 2.46, zc);         // padieira
      box(.4, .16, 1.9, LIGHT2, xf + nf * .15, .12, zc);          // soleira/degrau
      lite(.05, .08, 1.5, BLUE, xf + nf * .17, 2.33, zc);         // luz sobre a porta
    } else {
      lite(.05, 1.4, 2.5, NAVY, xf + nf * .07, 1.05, zc);         // vidro aceso, recuado
      box(.2, .16, 2.9, LIGHT2, xf + nf * .12, 1.86, zc);         // verga
      box(.2, .18, 2.9, LIGHT2, xf + nf * .12, .2, zc);           // base
      box(.2, 1.75, .16, LIGHT2, xf + nf * .12, 1.02, zc - 1.42); // montante esquerdo
      box(.2, 1.75, .16, LIGHT2, xf + nf * .12, 1.02, zc + 1.42); // montante direito
      box(.2, 1.75, .13, LIGHT2, xf + nf * .12, 1.02, zc);        // montante central
    }
  }
  function predio(side, z0, z1, h, semTerreo) {
    const d = z1 - z0, zc = (z0 + z1) / 2;
    box(6, h, d - .3, DARK2, side * 11.2, h / 2, zc);
    const fx = side * 8.14;
    for (let wy = 3.1; wy < h - 1.0; wy += 1.5)   // janelas só nos andares de cima
      for (let wz = z0 + .9; wz < z1 - .7; wz += 1.15)
        (side < 0 ? wSlots : eSlots).push({ x: fx, y: wy, z: wz });
    if (!semTerreo) entrada(side, zc, hi % 2 === 0);
    if (hi % 3 === 0) box(.06, 2.8 + (hi % 2), .06, DARK2, side * 10, h + 1.4, zc); // antena
    hi++;
  }
  for (const [z0, z1] of [[-32, -22], [-22, -12], [-4, 6], [6, 16], [24, 38]]) {
    predio(-1, z0, z1, hs[hi % 6]);
    predio(1, z0, z1, hs[(hi + 2) % 6], z0 === 24); // no quarteirão C a escada toma o térreo
  }

  // seu prédio fecha a rua no sul (a rua morre num T)
  box(28, 34, 6, DARK2, 0, 16.6, -36);
  box(6, 34, 1.4, DARK2, -11.2, 17, -32.3); // sela os cantos com os vizinhos
  box(6, 34, 1.4, DARK2, 11.2, 17, -32.3);
  for (let wy = 3; wy < 30; wy += 1.5)
    for (let wx = -12.5; wx < 12.6; wx += 1.1) sSlots.push({ x: wx, y: wy, z: -32.94 });
  const ap = grp(-5.75, .12, -32.9);
  box(1.5, 2.5, .18, LIGHT2, 0, 1.25, 0, ap);
  box(1.14, 2.3, .14, DARK2, 0, 1.15, .05, ap);
  box(.07, .07, .07, BLUE, -.4, 1.12, .12, ap);
  box(2.0, .3, .9, DARK2, 0, 2.72, .3, ap); // marquise

  // limite da cidade: horizonte escuro, tratado como massa de ar distante
  const matHor = new THREE.MeshBasicMaterial({ color: 0x223545, fog: true });
  function horizonte(w, x, z, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 50), matHor);
    m.position.set(x, 24, z);
    m.rotation.y = ry;
    scene.add(m);
  }
  horizonte(80, 0, 60, Math.PI);        // fim da rua ao norte
  horizonte(22, -30, -8, Math.PI / 2);  // fim das transversais
  horizonte(22, 30, -8, -Math.PI / 2);
  horizonte(22, -30, 20, Math.PI / 2);
  horizonte(22, 30, 20, -Math.PI / 2);

  function instWin(slots, geo) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), slots.length);
    m.frustumCulled = false;
    const m4 = new THREE.Matrix4(), cc = new THREE.Color();
    slots.forEach((sl, i) => {
      m4.setPosition(sl.x, sl.y, sl.z);
      m.setMatrixAt(i, m4);
      const r = Math.random();
      cc.setHex(r < .1 ? GLOW : r < .13 ? BLUE : NAVY);
      m.setColorAt(i, cc);
    });
    scene.add(m);
  }
  instWin(wSlots.concat(eSlots), new THREE.BoxGeometry(.12, .75, .5));
  instWin(sSlots, new THREE.BoxGeometry(.5, .75, .12));

  // postes na guia (metade com luz de verdade)
  let pi = 0;
  for (const [lx, lz] of [[-3.9, -28], [3.9, -16], [-3.9, -2], [3.9, 10], [-3.9, 26], [3.9, 30]]) {
    box(.12, 3.9, .12, DARK2, lx, 1.95, lz);
    box(.7, .09, .09, DARK2, lx + (lx < 0 ? .32 : -.32), 3.82, lz);
    lite(.3, .12, .18, GLOW, lx + (lx < 0 ? .6 : -.6), 3.72, lz);
    if (pi % 2 === 0) {
      const pl = new THREE.PointLight(0xeaf2f2, .55, 11);
      pl.position.set(lx + (lx < 0 ? .6 : -.6), 3.5, lz);
      scene.add(pl);
    }
    blockOf(lx - .2, lz - .2, lx + .2, lz + .2);
    pi++;
  }

  // semáforos das travessias
  function semaforo(x, z, ry) {
    const g = grp(x, 0, z);
    g.rotation.y = ry;
    box(.1, 3.1, .1, DARK2, 0, 1.55, 0, g);
    box(.3, .8, .22, DARK2, 0, 3.3, 0, g);
    lite(.14, .14, .04, GLOW, 0, 3.52, .12, g); // parado no "pare"
    box(.14, .14, .04, DARK, 0, 3.3, .12, g);
    box(.14, .14, .04, DARK, 0, 3.08, .12, g);
    blockOf(x - .18, z - .18, x + .18, z + .18);
  }
  semaforo(-4.1, -13, 0); semaforo(4.1, -3, Math.PI);
  semaforo(-4.1, 15, 0); semaforo(4.1, 25, Math.PI);

  // bloqueios de obra: a cidade além daqui está fechada
  function bloqueio(x, z, ry) {
    const g = grp(x, 0, z);
    g.rotation.y = ry;
    box(.08, 1.0, .5, DARK2, -1.05, .5, 0, g);  // pés
    box(.08, 1.0, .5, DARK2, 1.05, .5, 0, g);
    box(2.3, .34, .07, LIGHT, 0, .92, 0, g);    // tábua listrada
    box(.5, .34, .08, DARK2, -.7, .92, 0, g);
    box(.5, .34, .08, DARK2, .7, .92, 0, g);
    box(2.3, .16, .06, LIGHT2, 0, .38, 0, g);   // travessa baixa
  }
  for (const zc of [-8, 20]) for (const sx of [-1, 1]) {
    if (day === 5 && sx === 1 && zc === 20) continue; // dia 5: esquina aberta pra loja
    bloqueio(sx * 8.1, zc - 1.9, Math.PI / 2);  // bocas das transversais
    bloqueio(sx * 8.1, zc + 1.9, Math.PI / 2);
  }
  if (day === 5) {
    // dia 5: uma esquina que vira para uma loja do tamanho de uma casa
    box(7, .18, 6, matCal, 12.5, .03, 20);          // calçada em frente à loja
    walkOf(3.5, 17.2, 12.2, 22.8);                   // pode virar a esquina e andar até a porta
    box(7, 5.2, 6.4, DARK2, 16, 2.6, 20);            // corpo da loja
    box(7.4, .4, 6.8, DARK2, 16, 5.3, 20);           // beiral do telhado
    lite(.05, 1.7, 2.0, NAVY, 12.52, 1.5, 18.2);     // vitrine acesa
    lite(.05, 1.7, 2.0, NAVY, 12.52, 1.5, 21.8);     // vitrine acesa
    const loja = grp(12.5, 0, 20);
    box(.16, 2.5, 1.8, LIGHT2, 0, 1.25, 0, loja);    // moldura da porta
    box(.1, 2.2, 1.3, DARK, .05, 1.1, 0, loja);      // folha
    lite(.04, 1.9, 1.1, GLOW, .1, 1.15, 0, loja);    // luz vazando de dentro
    tagGo(loja, 'storeDoor', 'loja');
    const ls = grp(12.4, 3.9, 20); ls.rotation.y = -Math.PI / 2; // letreiro da loja
    box(3.4, .9, .14, DARK2, 0, 0, 0, ls);
    lite(3.0, .62, .05, BLUE, 0, 0, -.08, ls);
    const pl = new THREE.PointLight(0xeaf2f2, .5, 13); pl.position.set(10, 3.4, 20); scene.add(pl);
  }
  for (const bx of [-6.6, -4.2, -1.8, .6, 3.0, 5.4])
    bloqueio(bx, 36.8, 0);                      // a rua morre depois do metro

  // ponto de ônibus com alguém esperando na chuva
  const abrigo = grp(-6.4, 0, 4);
  box(.08, 2.3, .08, DARK2, .5, 1.15, -1.4, abrigo);
  box(.08, 2.3, .08, DARK2, .5, 1.15, 1.4, abrigo);
  box(1.7, .1, 3.4, NAVY, 0, 2.35, 0, abrigo);
  box(.5, .08, 2.6, LIGHT2, -.3, .62, 0, abrigo);
  box(.08, .62, .08, DARK2, -.3, .31, -1.1, abrigo);
  box(.08, .62, .08, DARK2, -.3, .31, 1.1, abrigo);
  const esp = person(true, BLUE, abrigo);
  esp.position.set(-.25, .2, 0);
  esp.rotation.y = Math.PI / 2;
  blockOf(-7.3, 2.3, -5.6, 5.7);

  // mobiliário: hidrante e lixeira
  box(.24, .55, .24, BLUE, -4.0, .4, -24);
  box(.3, .1, .3, BLUE, -4.0, .72, -24);
  blockOf(-4.2, -24.2, -3.8, -23.8);
  box(.55, .8, .55, DARK2, 4.1, .52, -18);
  blockOf(3.8, -18.3, 4.4, -17.7);

  // ===== a boca do metro: entrada iluminada, marcante, convidando na chuva =====
  // trincheira: escada descendo a calçada
  for (let i = 0; i < 12; i++)
    box(2.2, .25, .45, LIGHT2, 7, -(i + 1) * .25 + .125, 27.525 + i * .45);
  box(2.2, .2, 2.6, FLOOR, 7, -3.1, 34.1);   // patamar lá embaixo
  box(.16, 4, 8.6, DARK2, 5.82, -1.3, 31.5); // paredes laterais da trincheira
  box(.16, 4, 8.6, DARK2, 8.18, -1.3, 31.5);
  box(2.5, 3.6, .14, DARK2, 7, -1.4, 35.55); // parede do fundo
  // acabamento no topo das paredes, com fita de luz azul guiando escada abaixo
  for (const wx of [5.82, 8.18]) {
    box(.28, .18, 8.6, LIGHT2, wx, .77, 31.5);
    lite(.1, .05, 8.5, BLUE, wx, .88, 31.5);
  }

  // marquise/cobertura sobre a entrada, com testeira e letreiro grande
  for (const cx of [5.66, 8.34]) {                 // pilares da marquise
    box(.18, 3.5, .18, DARK2, cx, 1.75, 25.7);
    lite(.06, 2.4, .07, BLUE, cx, 1.95, 25.6);     // veio de luz nos pilares
    blockOf(cx - .16, 25.5, cx + .16, 25.9);
  }
  box(3.4, .2, 3.7, LIGHT2, 7, 3.5, 26.85);        // telhado da marquise
  lite(3.4, .07, .1, GLOW, 7, 3.43, 25.0);         // brilho na borda da frente
  box(3.4, .62, .12, DARK2, 7, 3.16, 25.02);       // testeira onde vai o letreiro

  // letreiro "M" iluminado, virado para quem sobe a rua vindo do sul
  const sign = grp(7, 3.22, 24.93);
  box(1.6, .96, .12, DARK2, 0, 0, .07, sign);      // caixa do letreiro
  lite(1.26, .82, .04, BLUE, 0, 0, -.02, sign);    // campo azul brilhante
  lite(.15, .62, .03, GLOW, -.35, 0, -.05, sign);  // perna esquerda do M
  lite(.15, .62, .03, GLOW, .35, 0, -.05, sign);   // perna direita
  const ml = lite(.13, .5, .03, GLOW, -.18, .13, -.05, sign); ml.rotation.z = .74;
  const mr = lite(.13, .5, .03, GLOW, .18, .13, -.05, sign); mr.rotation.z = -.74;

  // totem luminoso: marco vertical visível de longe na rua
  const tot = grp(5.28, 0, 25.9);
  box(.24, 4.7, .24, DARK2, 0, 2.35, 0, tot);
  lite(.14, 3.1, .15, BLUE, 0, 3.0, 0, tot);       // haste de luz azul
  box(.52, .52, .52, DARK2, 0, 4.55, 0, tot);
  lite(.36, .36, .38, BLUE, 0, 4.55, 0, tot);      // cubo luminoso no topo
  blockOf(5.12, 25.74, 5.44, 26.06);

  // luz derramando da entrada: brilho na chuva e na escada molhada
  const glowMouth = new THREE.PointLight(0xeaf2f2, .75, 9);
  glowMouth.position.set(7, .8, 28);
  scene.add(glowMouth);
  const glowUnder = new THREE.PointLight(0x9fccef, .6, 8); // a estação lá embaixo
  glowUnder.position.set(7, -2.4, 34);
  scene.add(glowUnder);
  const glowSign = new THREE.PointLight(0xbfe0ff, .5, 6);
  glowSign.position.set(7, 3.0, 24.2);
  scene.add(glowSign);

  // a porta lá embaixo, agora clara e acesa
  const em = grp(7, -3, 35.42);
  em.rotation.y = Math.PI;
  box(2.3, 2.6, .18, LIGHT2, 0, 1.3, 0, em);
  box(.92, 2.34, .1, DARK, -.52, 1.16, .07, em);
  box(.92, 2.34, .1, DARK, .52, 1.16, .07, em);
  lite(.05, 2.0, .04, GLOW, 0, 1.2, .1, em);       // fresta de luz entre as portas
  lite(1.5, .34, .08, BLUE, 0, 2.72, -.02, em);    // letreiro sobre a porta
  if (day < 5) {
    tagGo(em, 'metroEntrance', 'plataforma');
  } else {
    // dia 5: metro fechado — grade no alto da escada
    const grade = grp(7, 0, 27.25);
    for (let gx = -1.0; gx <= 1.01; gx += .29) box(.06, 2.25, .06, DARK2, gx, 1.15, 0, grade);
    box(2.35, .1, .1, DARK2, 0, 2.24, 0, grade);
    box(2.35, .1, .1, DARK2, 0, 1.2, 0, grade);
    box(2.35, .1, .1, DARK2, 0, .12, 0, grade);
    tagDialog(grade, 'metroEntrance', 'metroClosed');
    blockOf(5.9, 26.9, 8.1, 27.6);                 // trava a descida
  }

  // a baleia: gigante, flutuando como se estivesse no mar
  const w = grp(0, 30, 0);
  const corpo = grp(0, 0, 0, w);
  blob(5.8, 2.1, 2.4, BLUE, 0, 0, 0, corpo);            // corpo fusiforme
  blob(4.6, 1.5, 2.1, LIGHT, .9, -.85, 0, corpo);       // barriga clara
  blob(2.6, 1.25, 1.7, LIGHT, 3.6, -.75, 0, corpo);     // mandíbula
  blob(.3, .12, .2, DARK2, 2.2, 2.0, 0, corpo);         // respiradouro
  blob(.16, .16, .16, DARK2, 4.55, .25, 1.78, corpo);   // olhos
  blob(.16, .16, .16, DARK2, 4.55, .25, -1.78, corpo);
  const dorsal = blob(.85, .5, .14, BLUE, -2.6, 2.0, 0, corpo);
  dorsal.rotation.z = .5;
  for (const s of [-1, 1]) {                            // nadadeiras peitorais
    const nad = blob(1.6, .16, .6, BLUE, 1.4, -1.5, s * 2.3, corpo);
    nad.rotation.x = s * .55;
    nad.rotation.y = s * -.35;
  }
  const cauda = grp(-4.6, .2, 0, w);
  blob(2.2, .8, .9, BLUE, -1.1, .15, 0, cauda);         // pedúnculo
  for (const s of [-1, 1]) {                            // nadadeira da cauda
    const f = blob(1.05, .14, 1.9, BLUE, -2.9, .35, s * 1.35, cauda);
    f.rotation.y = s * .45;
  }
  // chuva só até o dia 4; no dia 5 o tempo abriu
  if (day < 5) {
  const NRAIN = 1600, RS = 26, RH = 20;
  const dropGeo = new THREE.BoxGeometry(.02, 1, .02);
  dropGeo.rotateZ(.09); dropGeo.rotateX(.07); // inclinação do vento nos dois eixos
  const rainMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const rain = new THREE.InstancedMesh(dropGeo, rainMat, NRAIN);
  rain.frustumCulled = false; // instâncias longe da origem: sem isso o Three corta tudo ao virar a câmera
  const drops = [], cTmp = new THREE.Color();
  for (let i = 0; i < NRAIN; i++) {
    drops.push({
      x: Math.random() * RS, z: Math.random() * RS,
      y: Math.random() * RH,
      v: 18 + Math.random() * 12,           // gotas em velocidades diferentes
      len: .7 + Math.random() * .6,         // estrias mais longas = mais perto
    });
    rain.setColorAt(i, cTmp.setHex(LIGHT).multiplyScalar(.35 + Math.random() * .65));
  }
  scene.add(rain);

  // respingos abrindo no chão molhado
  const NSPL = 90, SLIFE = .5;
  const splGeo = new THREE.RingGeometry(.55, 1, 10);
  splGeo.rotateX(-Math.PI / 2);
  const splMat = new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: .22, depthWrite: false });
  const spl = new THREE.InstancedMesh(splGeo, splMat, NSPL);
  spl.frustumCulled = false;
  scene.add(spl);
  const sdat = [];
  for (let i = 0; i < NSPL; i++) sdat.push({ x: 0, z: 0, t0: -9 });

  // relâmpago distante: a luz vem antes do trovão
  const flashL = new THREE.AmbientLight(0xbfd6e6, 0);
  scene.add(flashL);
  const bgDry = streetBg.clone(), bgFlash = streetFlash.clone();
  const fogDry = streetFog.clone(), fogWet = streetStormFog.clone(), fogFlash = new THREE.Color(0x42566a);

  const rm4 = new THREE.Matrix4(), rP = new THREE.Vector3(), rSc = new THREE.Vector3();
  const rQ = new THREE.Quaternion();
  let rt0 = null, flashT = null, boomAt = 0, nextStorm = 0;
  anims.push(t => {
    if (rt0 === null) rt0 = t;
    const e = t - rt0 - 3;                        // espera um pouco antes de cair
    const wet = Math.max(0, Math.min(1, e / 12)); // a tempestade se arma devagar
    rainMat.opacity = .32 * wet;
    // o chão escurece de molhado e o ar fecha
    matRua.color.copy(cRua).multiplyScalar(1 - .35 * wet);
    matCal.color.copy(cCal).multiplyScalar(1 - .35 * wet);
    scene.fog.far = 68 - 18 * wet;
    scene.fog.near = 10 - 3 * wet;
    scene.fog.color.lerpColors(fogDry, fogWet, wet);
    if (e < 0) return;
    for (let i = 0; i < NRAIN; i++) {
      const d = drops[i];
      rP.set(
        px + (((d.x - px) % RS) + RS) % RS - RS / 2,
        RH - ((d.y + d.v * e) % RH),
        pz + (((d.z - pz) % RS) + RS) % RS - RS / 2
      );
      rSc.set(1, d.len, 1);
      rm4.compose(rP, rQ, rSc);
      rain.setMatrixAt(i, rm4);
    }
    rain.instanceMatrix.needsUpdate = true;
    // respingos nascem, abrem e somem perto do jogador
    const alive = Math.floor(NSPL * wet);
    for (let i = 0; i < NSPL; i++) {
      const sd = sdat[i], a = (t - sd.t0) / SLIFE;
      if (a > 1 && i < alive) {
        sd.t0 = t + Math.random() * .35;
        sd.x = (Math.random() - .5) * 15.8; // só na rua: dentro dos prédios não molha
        sd.z = pz + (Math.random() - .5) * 22;
      }
      const k = a >= 0 && a <= 1 ? a : 0;
      const naRua = Math.abs(sd.x) <= 3.5 || (sd.z > -12 && sd.z < -4) || (sd.z > 16 && sd.z < 24);
      rP.set(sd.x, sd.x > 5.85 && sd.z > 27.3 ? -9 : naRua ? .035 : .135, sd.z);
      rSc.setScalar(k * .34);
      rm4.compose(rP, rQ, rSc);
      spl.setMatrixAt(i, rm4);
    }
    spl.instanceMatrix.needsUpdate = true;
    // tempestade formada: relâmpago de vez em quando, trovão depois da luz
    if (wet > .8) {
      if (!nextStorm) nextStorm = t + 6 + Math.random() * 18;
      else if (t > nextStorm) {
        flashT = t;
        boomAt = t + 1.2 + Math.random() * 1.6;
        nextStorm = t + 28 + Math.random() * 35;
      }
    }
    if (flashT !== null) {
      const a = t - flashT;
      const k = Math.max(0, Math.sin(a * 26)) * Math.exp(-a * 5.5); // tremeluz e morre
      flashL.intensity = k * .7;
      scene.background.lerpColors(bgDry, bgFlash, Math.min(1, k));
      scene.fog.color.lerpColors(fogWet, fogFlash, Math.min(1, k));
      if (a > 2.5) { flashT = null; flashL.intensity = 0; }
    }
    if (boomAt && t > boomAt) { boomAt = 0; thunder(); }
  });
  } // fim da chuva (só day < 5)

  w.scale.setScalar(2.1);
  w.visible = false;
  // cruza a cidade lateralmente, acima dos telhados
  let t0 = null, sang = 0;
  anims.push(t => {
    if (t0 === null) t0 = t;
    const e = t - t0 - 3, dur = 26;
    if (e < 0 || e > dur) { w.visible = false; return; }
    w.visible = true;
    if (sang === 0 && e > 1.5) { sang = 1; whaleCall(0); }
    else if (sang === 1 && e > 14) { sang = 2; whaleCall(1); }
    const k = e / dur;
    w.position.set(
      -70 + 140 * k,
      37 + Math.sin(t * .75) * 1.4 + k * 4, // acima dos telhados, vista do fundo do canyon
      8 - Math.sin(k * Math.PI) * 3
    );
    w.rotation.x = Math.sin(t * .5) * .07;
    cauda.rotation.z = Math.sin(t * 1.7) * .3;
    corpo.rotation.z = Math.sin(t * 1.7 + 1.1) * .04;
  });

  return { spawn: { x: -5.75, z: -30.6, yaw: Math.PI }, caption: sceneCaption('rua'), auto: null };
}

/* ===================== CENA: A PLATAFORMA (o metrô chega e para) ===================== */
function buildPlataforma() {
  freshScene();
  scene.background = new THREE.Color(DARK);
  scene.fog = new THREE.Fog(DARK, 6, 27);   // túnel escuro: o trem emerge da névoa

  // ---------- piso da plataforma (topo y=0) e faixa da borda ----------
  box(30, .5, 4.0, FLOOR, 0, -.25, 1.85);
  for (let fx = -14; fx <= 14; fx += 2) lite(.03, .012, 3.9, DARK2, fx, .012, 1.85);   // juntas do piso
  for (let fz = .3; fz <= 3.7; fz += 1.15) lite(30, .012, .03, DARK2, 0, .012, fz);
  box(30, .05, .34, DARK2, 0, .015, .3);                                                // faixa tátil
  for (let tx = -14.5; tx <= 14.5; tx += .62) lite(.26, .055, .16, GLOW, tx, .045, .3); // pastilhas táteis
  lite(30, .02, .06, BLUE, 0, .07, .12);                                                // linha azul de segurança
  box(30, 1.1, .12, DARK2, 0, -.5, -.02);                                               // face vertical da borda
  walkOf(-11.5, .55, 11.5, 3.4);

  // ---------- fosso, trilhos, terceiro trilho, cabos ----------
  box(32, .5, 3.6, DARK2, 0, -1.15, -1.7);           // balastro (topo y=-.9)
  for (let sx = -15; sx <= 15; sx += .78) box(.28, .1, 1.55, DARK, sx, -.86, -1.3); // dormentes
  box(32, .1, .12, LIGHT2, 0, -.79, -.85);           // trilho 1
  box(32, .1, .12, LIGHT2, 0, -.79, -1.75);          // trilho 2
  for (let sx = -14; sx <= 14; sx += 2.4) box(.1, .28, .1, DARK2, sx, -.71, -2.25); // isoladores
  box(32, .12, .16, NAVY, 0, -.64, -2.25);           // terceiro trilho (energizado)
  for (const cy of [-.3, -.45]) box(32, .05, .05, DARK2, 0, cy, -2.62); // cabos na parede do fosso

  // ---------- teto abobadado (vault facetado) com nervuras e cove ----------
  const V = [[-3.1, 3.0], [-1.2, 4.05], [.7, 4.62], [2.6, 4.05], [4.2, 3.0]]; // perfil (z,y)
  function facet(a, b) {
    const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
    const m = box(31, .22, len, LIGHT2, 0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    m.rotation.x = Math.atan2(-dy, dz);
  }
  for (let i = 0; i < V.length - 1; i++) facet(V[i], V[i + 1]);
  for (const [pz, py] of [V[1], V[2], V[3]]) box(31, .1, .12, DARK2, 0, py + .12, pz); // purlins
  box(32, .7, .4, DARK2, 0, 2.95, -2.95);            // lintel sobre a boca do túnel
  lite(31, .06, .5, GLOW, 0, 3.05, -2.85);           // cove de luz (lado do trilho)
  lite(31, .06, .5, GLOW, 0, 3.05, 4.05);            // cove de luz (lado da parede)
  // nervuras transversais escuras acompanhando a abóbada
  for (const rx of [-12, -8, -4, 4, 8, 12])
    for (let i = 0; i < V.length - 1; i++) {
      const a = V[i], b = V[i + 1], dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
      const m = box(.16, .14, len, DARK2, rx, (a[1] + b[1]) / 2 + .05, (a[0] + b[0]) / 2);
      m.rotation.x = Math.atan2(-dy, dz);
    }

  // ---------- parede do fundo azulejada (rodapé, faixa, cornija, pilastras) ----------
  box(30, 5.5, .3, LIGHT, 0, 2.5, 4.15);
  box(30, .9, .36, DARK2, 0, .45, 3.99);             // rodapé/wainscot
  lite(30, .34, .03, NAVY, 0, 1.15, 3.98);           // faixa lisa de azulejo
  box(30, .2, .5, LIGHT2, 0, 3.05, 4.0);             // cornija no topo
  for (let ty = 1.6; ty < 3.0; ty += .46) box(30, .02, .02, DARK2, 0, ty, 3.965);  // juntas h
  for (let tx = -13.5; tx <= 13.5; tx += 1.15) box(.02, 1.5, .02, DARK2, tx, 2.25, 3.965); // juntas v
  for (const px of [-12, -8, -4, 0, 4, 8, 12]) box(.5, 3.0, .55, LIGHT2, px, 1.5, 4.0);    // pilastras

  // painéis de anúncio iluminados entre as pilastras
  for (const px of [-10, -6, 10, 6]) {
    box(2.5, 1.7, .12, DARK2, px, 1.9, 3.9);
    lite(2.2, 1.44, .03, px % 4 === 0 ? NAVY : 0x2b4a63, px, 1.9, 3.83);
  }
  // letreiros "M" repetidos na parede
  function mSign(x) {
    const g = grp(x, 2.0, 3.86);
    box(.9, .66, .1, DARK2, 0, 0, 0, g);
    lite(.7, .5, .04, BLUE, 0, 0, -.06, g);
    lite(.1, .38, .03, GLOW, -.21, 0, -.09, g);
    lite(.1, .38, .03, GLOW, .21, 0, -.09, g);
    const a = lite(.08, .3, .03, GLOW, -.1, .08, -.09, g); a.rotation.z = .74;
    const b = lite(.08, .3, .03, GLOW, .1, .08, -.09, g); b.rotation.z = -.74;
  }
  mSign(-2); mSign(2);
  // painel indicador de próximo trem (pendurado)
  const ind = grp(0, 3.15, 1.4);
  box(3.0, .7, .12, DARK2, 0, 0, 0, ind);
  lite(2.7, .44, .03, BLUE, 0, 0, .07, ind);
  box(.05, .55, .05, DARK2, -1.1, .6, 0, ind); box(.05, .55, .05, DARK2, 1.1, .6, 0, ind);

  // ---------- bocas de túnel com anéis recuando na escuridão ----------
  for (const s of [-1, 1]) {
    // parede-portal com um vão do tamanho do trem
    box(.4, 5.6, 4.2, LIGHT, s * 14.6, 2.4, 2.0);        // parede da ponta (lado plataforma)
    box(.4, 1.5, 2.6, DARK2, s * 14.6, 3.75, -1.35);     // acima do vão (deixa o trem passar)
    box(.4, 5.6, .9, LIGHT, s * 14.6, 2.4, -3.05);       // fecha atrás do trilho
    for (let r = 0; r < 6; r++) {                         // anéis do túnel recuando
      const rx = s * (15.2 + r * 1.9), sc = 1 - r * .05;
      box(.5, (3.3) * sc, (3.0) * sc, DARK2, rx, .5, -1.4);
      lite(.06, 2.5 * sc, 2.4 * sc, r === 0 ? 0x0e1a24 : 0x0a141c, rx + s * .26, .4, -1.4);
    }
  }

  // ---------- luminárias: pendentes quentes + point lights ----------
  for (let lx = -10; lx <= 10; lx += 4) {
    box(.1, .5, .1, DARK2, lx, 4.0, .6);               // haste
    lite(1.4, .12, .5, GLOW, lx, 3.72, .6);            // luminária
    const pl = new THREE.PointLight(0xeaf2f2, .34, 15);
    pl.position.set(lx, 3.4, .8); scene.add(pl);
  }
  const edgeL = new THREE.PointLight(0x9fc4e6, .3, 10); edgeL.position.set(0, .6, -.6); scene.add(edgeL);
  // um fluorescente piscando, ao fundo (atmosfera)
  const flick = lite(1.4, .12, .5, GLOW, 12, 3.72, .6);
  anims.push(t => { flick.visible = !(Math.sin(t * 22) > .7 && Math.sin(t * 3.3) > .2); });

  // ---------- colunas na borda da plataforma (base, fuste, capitel, uplight) ----------
  for (const cx of [-11, -7, -3.4, 3.4, 7, 11]) {
    box(.62, .2, .62, DARK2, cx, .1, .75);             // base
    box(.4, 3.0, .4, LIGHT2, cx, 1.6, .75);            // fuste
    box(.58, .22, .58, LIGHT2, cx, 3.15, .75);         // capitel
    lite(.09, 2.2, .09, BLUE, cx, 1.9, .56);           // veio de luz
    blockOf(cx - .32, .45, cx + .32, 1.05);
  }

  // ---------- mobiliário: bancos, lixeira, máquina, mapa, relógio ----------
  function banco(x) {
    const g = grp(x, 0, 3.35);
    box(2.2, .1, .58, LIGHT2, 0, .46, 0, g);
    box(2.2, .55, .09, LIGHT2, 0, .74, .26, g);
    for (const bx of [-.9, .9]) box(.1, .46, .52, DARK2, bx, .23, 0, g);
    blockOf(x - 1.15, 3.05, x + 1.15, 3.6);
    return g;
  }
  const b1 = banco(-8), b2 = banco(9);
  person(true, BLUE, b1).position.set(-.5, .5, -.02);
  const p2 = person(true, BLUE, b2); p2.position.set(.5, .5, -.02); p2.rotation.y = Math.PI;
  // passageiros em pé esperando o trem
  const w1 = person(false); w1.position.set(-3.5, 0, 1.3); w1.rotation.y = .1; blockOf(-3.8, 1.0, -3.2, 1.6);
  const w2 = person(false); w2.position.set(5.5, 0, 1.5); w2.rotation.y = -.2; blockOf(5.2, 1.2, 5.8, 1.8);
  // lixeira
  box(.5, .8, .5, DARK2, -11.5, .4, 2.8); box(.56, .1, .56, DARK2, -11.5, .82, 2.8); blockOf(-11.8, 2.5, -11.2, 3.1);
  // máquina de bilhetes (caixa iluminada)
  const maq = grp(11.6, 0, 2.9);
  box(1.0, 1.9, .7, LIGHT2, 0, .95, 0, maq);
  lite(.7, .8, .05, NAVY, 0, 1.25, .36, maq);
  lite(.5, .12, .05, BLUE, 0, .6, .36, maq);
  blockOf(11.0, 2.5, 12.2, 3.3);
  // mapa da rede (painel emoldurado)
  box(2.4, 1.5, .1, DARK2, 0, 1.7, 4.0);
  lite(2.1, 1.2, .03, 0x2b4a63, 0, 1.7, 3.92);
  // relógio
  const rel = grp(-6, 3.0, 3.9);
  box(.5, .5, .1, DARK2, 0, 0, 0, rel);
  lite(.38, .38, .03, GLOW, 0, 0, -.06, rel);
  box(.03, .16, .02, DARK2, 0, .06, -.09, rel);
  box(.12, .03, .02, DARK2, .05, 0, -.09, rel);

  // ===== o trem: chega da direita, desacelera e para com a porta no x=0 =====
  const LEN = 26, doorsX = [-8, -4, 0, 4, 8];
  const train = grp(34, 0, -1.35);
  box(LEN, 2.5, 2.1, LIGHT2, 0, 1.2, 0, train);            // corpo
  box(LEN - .4, .5, 1.9, DARK2, 0, 2.55, 0, train);        // teto arredondado
  for (let ax = -9; ax <= 9; ax += 4.5) box(1.2, .2, 1.0, DARK, ax, 2.84, 0, train); // ar-condicionado
  box(LEN, .34, 2.16, BLUE, 0, 1.98, 0, train);            // faixa azul superior
  box(LEN, .32, 2.16, DARK2, 0, .2, 0, train);             // saia inferior
  box(LEN, .12, 2.15, DARK2, 0, 1.18, 0, train);           // friso entre janelas
  for (let wx = -12; wx <= 12; wx += 1.5) {                // banda de janelas com moldura
    if (doorsX.some(dx => Math.abs(wx - dx) < 1.0)) continue;
    box(1.15, .82, .03, DARK2, wx, 1.56, 1.045, train);
    box(1.0, .68, .04, NAVY, wx, 1.56, 1.06, train);
  }
  for (const dx of doorsX) {                                // portas fechadas decorativas
    if (dx === 0) continue;
    box(1.55, 2.05, .05, DARK2, dx, 1.05, 1.03, train);
    box(.7, 1.9, .04, NAVY, dx - .38, 1.05, 1.07, train);
    box(.7, 1.9, .04, NAVY, dx + .38, 1.05, 1.07, train);
    box(.05, 2.05, .06, BLUE, dx, 1.05, 1.09, train);
  }
  for (const s of [-1, 1]) {                                // cabines: para-brisa, faróis, destino
    box(.7, 2.5, 2.1, LIGHT2, s * (LEN / 2 - .15), 1.2, 0, train);
    box(.12, .8, 1.5, NAVY, s * (LEN / 2 + .16), 1.75, 0, train);
    lite(.14, .2, .1, GLOW, s * (LEN / 2 + .18), .55, .6, train);
    lite(.14, .2, .1, GLOW, s * (LEN / 2 + .18), .55, -.6, train);
    lite(.9, .22, .05, BLUE, s * (LEN / 2 - .15), 2.28, .9, train);
  }
  // porta central (x=0), em frente ao jogador — abre só quando o trem para
  box(1.9, 2.15, .1, DARK2, 0, 1.05, 1.0, train);
  const doorGlow = lite(1.6, 2.0, .03, GLOW, 0, 1.05, .9, train);
  doorGlow.visible = false;
  const dpL = box(.56, 2.0, .08, LIGHT, -.3, 1.05, 1.06, train);
  const dpR = box(.56, 2.0, .08, LIGHT, .3, 1.05, 1.06, train);

  trainArrive(1.2, 4.6); // som sincronizado com a chegada

  let t0 = null, stopped = false;
  const DELAY = 1.2, DUR = 4.6, X0 = 34;
  function onStopped() {
    trainStopSfx();
    doorGlow.visible = true;
    let o0 = null;
    anims.push(t => {                    // portas deslizam abrindo
      if (o0 === null) o0 = t;
      const k = Math.min((t - o0) / .9, 1);
      dpL.position.x = -.3 - k * .42;
      dpR.position.x = .3 + k * .42;
    });
    tagGo(doorGlow, 'subwayDoor', 'metro'); // agora dá pra entrar no vagão
  }
  anims.push(t => {
    if (t0 === null) t0 = t;
    const e = t - t0 - DELAY;
    if (e <= 0) { train.position.x = X0; return; }
    if (e >= DUR) {
      train.position.x = 0;
      if (!stopped) { stopped = true; onStopped(); }
      return;
    }
    const k = e / DUR, ease = 1 - Math.pow(1 - k, 3); // desacelera ao chegar
    train.position.x = X0 * (1 - ease);
  });

  return { spawn: { x: -1.2, z: 2.7, yaw: 0 }, caption: sceneCaption('plataforma'), auto: null };
}

/* ===================== CENA: A LOJA (compra a passagem) ===================== */
function buildLoja() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 10, 34);
  const W = 8, D = 7, H = 3.2;
  room(W, D, H);
  walkOf(-3.4, -2.8, 3.4, 2.8);

  for (const lx of [-2.5, 2.5]) for (const lz of [-1.5, 1.5]) {
    lite(.5, .05, .5, GLOW, lx, H - .05, lz);
    const pl = new THREE.PointLight(0xeaf2f2, .3, 10); pl.position.set(lx, 2.6, lz); scene.add(pl);
  }

  // balcão de atendimento ao fundo, com o atendente
  const bal = grp(0, 0, -2.2);
  box(3.4, 1.05, .7, LIGHT2, 0, .525, 0, bal);
  box(3.5, .08, .8, DARK2, 0, 1.09, 0, bal);
  lite(.1, .1, .1, BLUE, -1.2, 1.18, 0, bal);   // luminária do balcão
  box(.5, .5, .45, DARK2, 0, .25, -.7, bal);    // banqueta
  const clerk = person(true, BLUE, bal);
  clerk.position.set(0, .04, -.7);
  tag(bal, objectName('storeClerk'), { lines: linesOf('atendente'), go: 'aviao' });
  blockOf(-1.9, -2.7, 1.9, -1.5);

  // cartaz de passagens atrás
  const cz = grp(1.3, 2.1, -2.86);
  box(1.4, .9, .06, DARK2, 0, 0, 0, cz);
  lite(1.1, .6, .03, NAVY, 0, 0, .04, cz);
  lite(.8, .12, .03, GLOW, 0, .18, .06, cz);

  // prateleiras nas laterais
  for (const s of [-1, 1]) {
    const sh = grp(s * 3.5, 0, .3);
    box(.3, 2.4, 3.6, LIGHT2, 0, 1.2, 0, sh);
    for (let sy = .6; sy < 2.3; sy += .55)
      for (let sz = -1.4; sz <= 1.4; sz += .7) {
        const cc = [BLUE, NAVY, LIGHT, GLOW][(Math.round(sy * 10) + Math.round(sz * 10)) % 4];
        box(.22, .4, .5, cc, -s * .06, sy, sz, sh);
      }
    blockOf(s * 3.5 - .3, -1.5, s * 3.5 + .3, 2.2);
  }

  // porta de volta pra rua (cenário)
  const back = grp(0, 0, 2.85);
  box(1.3, 2.4, .12, LIGHT2, 0, 1.2, 0, back);
  box(1.05, 2.25, .1, DARK2, 0, 1.12, -.05, back);

  return { spawn: { x: 0, z: 2.2, yaw: 0 }, caption: sceneCaption('loja'), auto: null };
}

/* ===================== CENA: O AVIÃO (sentado, só olha; sai pela poltrona) ===================== */
function buildAviao() {
  freshScene();
  scene.background = new THREE.Color(0xaec4d2);
  scene.fog = new THREE.Fog(0xaec4d2, 8, 24);
  seated = true;
  elevFn = () => -.45;   // altura de quem está sentado
  const Wz = 3.4, L = 14, H = 2.3;

  box(Wz, .2, L, LIGHT2, 0, -.1, 0);              // piso
  box(Wz + 1.0, .3, L, DARK2, 0, H + .12, 0);     // teto
  for (const s of [-1, 1]) {
    box(.16, H, L, LIGHT, s * (Wz / 2 + .05), H / 2, 0);       // paredes laterais
    box(.5, .45, L, LIGHT2, s * (Wz / 2 - .18), H - .25, 0);   // bins de bagagem
  }
  box(Wz, H, .18, LIGHT, 0, H / 2, -L / 2);       // frente
  box(Wz, H, .18, LIGHT, 0, H / 2, L / 2);        // fundo
  for (const lz of [-4, 0, 4]) {
    lite(.4, .04, .4, GLOW, 0, H - .05, lz);
    const pl = new THREE.PointLight(0xeaf2f2, .28, 9); pl.position.set(0, 2, lz); scene.add(pl);
  }

  // poltronas: duas colunas, várias fileiras
  function poltrona(x, z, c) {
    const g = grp(x, 0, z);
    box(.62, .12, .58, LIGHT2, 0, .3, .05, g);   // assento
    box(.62, .6, .12, c, 0, .62, .28, g);        // encosto
    box(.1, .4, .5, DARK2, -.3, .5, 0, g);       // apoio de braço
    box(.1, .4, .5, DARK2, .3, .5, 0, g);
    return g;
  }
  let exitG = null;
  for (let z = -4.6; z <= 5; z += 1.15) {
    poltrona(-.62, z, BLUE);
    const aisle = poltrona(.62, z, BLUE);
    if (Math.abs(z) < .6) exitG = aisle;          // o banco do lado do jogador
  }

  // janela à esquerda, com nuvens passando rápido
  const win = grp(-(Wz / 2) + .06, 1.15, 0);
  win.rotation.y = Math.PI / 2;
  box(.94, .12, .1, LIGHT2, 0, .34, .02, win);
  box(.94, .12, .1, LIGHT2, 0, -.34, .02, win);
  box(.12, .68, .1, LIGHT2, -.44, 0, .02, win);
  box(.12, .68, .1, LIGHT2, .44, 0, .02, win);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(.82, .6),
    new THREE.MeshBasicMaterial({ color: 0xdce8ef, fog: false }));
  sky.position.z = -.02; win.add(sky);
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const c = blob(.13, .07, .015, GLOW, 0, (i % 5) * .13 - .26, 0, win);
    c.userData.ph = (i * .173) % .9;
    clouds.push(c);
  }
  anims.push(t => {
    for (const c of clouds) c.position.x = ((c.userData.ph - t * 1.1) % .9 + .9) % .9 - .45; // nuvens rápidas
  });

  // o banco do lado "diz Sair": interagir aparece na praia
  const marker = box(.5, .5, .13, LIGHT2, 0, .62, .28, exitG);
  tagGo(marker, 'exitSeat', 'praia');

  return { spawn: { x: -.62, z: 0, yaw: 0 }, caption: sceneCaption('aviao'), auto: null };
}

/* ===================== CENA: A PRAIA (o fim da fuga) ===================== */
function buildPraia() {
  freshScene();
  scene.background = new THREE.Color(0xbcd0da);   // céu claro
  scene.fog = new THREE.Fog(0xbcd0da, 24, 130);
  scene.add(new THREE.HemisphereLight(0xe4eef2, 0x9fb0b8, 1.2));

  box(140, .4, 100, LIGHT2, 0, -.2, 30);          // areia (termina no z ≈ -20)
  walkOf(-30, -14, 30, 45);
  const sea = box(200, .3, 160, NAVY, 0, -.3, -100); // mar (começa no z ≈ -20)

  // linhas de espuma quebrando na linha d'água
  const foam = [];
  for (let i = 0; i < 5; i++) {
    const f = box(200, .05, 1.3, GLOW, 0, -.1, -20 - i * 1.5);
    f.material.transparent = true; f.material.opacity = .5 - i * .08;
    foam.push(f);
  }
  anims.push(t => {
    for (let i = 0; i < foam.length; i++) foam[i].position.z = -20 - i * 1.5 + Math.sin(t * .6 + i) * .7;
    sea.position.y = -.3 + Math.sin(t * .5) * .04;
  });

  // sol e nuvens distantes
  const sun = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24), new THREE.MeshBasicMaterial({ color: GLOW, fog: false }));
  sun.position.set(0, 15, -75); scene.add(sun);
  for (let i = 0; i < 6; i++) blob(3 + (i % 3), 1, 2, LIGHT, -30 + i * 12, 13 + (i % 2) * 3, -62);

  // pedrinhas na areia
  for (const [rx, rz] of [[-8, 6], [10, 10], [-14, 16], [6, 22]]) blob(.6, .4, .6, DARK2, rx, .2, rz);

  return { spawn: { x: 0, z: 22, yaw: 0 }, caption: sceneCaption('praia'), auto: null };
}

/* ===================== CENA: O METRO ===================== */
function buildMetro() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 8, 30);
  sway = true;
  const L = 16, Wz = 2.7, H = 2.35;

  box(L + .4, .2, Wz + .4, FLOOR, 0, -.1, 0);
  box(L + .4, .2, Wz + .4, DARK2, 0, H + .1, 0);
  for (const s of [-1, 1]) {
    box(L + .4, H, .16, LIGHT, 0, H / 2, s * (Wz / 2 + .08));
    box(L + .4, .26, .1, DARK2, 0, 2.18, s * (Wz / 2 - .02));
    box(L + .4, .14, .1, DARK2, 0, .07, s * (Wz / 2 - .02));
  }
  box(.16, H, Wz + .4, LIGHT, -L / 2 - .08, H / 2, 0);
  box(.16, H, Wz + .4, LIGHT, L / 2 + .08, H / 2, 0);
  walkOf(-7.5, -.85, 7.5, .85);

  // janelas com luzes do túnel passando (cenário)
  function janela(x, s) {
    const g = grp(x, 1.5, s * (Wz / 2 - .06));
    box(1.3, 1.0, .07, LIGHT2, 0, 0, 0, g);
    box(1.12, .84, .05, DARK2, 0, 0, -s * .02, g);
    const st = lite(.24, .06, .02, BLUE, 0, .1, -s * .055, g);
    const ph = Math.random() * 9, spd = 2.2 + Math.random();
    anims.push(t => {
      const k = ((t * spd + ph) % 1.6) - .8;
      st.position.x = k;
      st.visible = Math.abs(k) < .44;
    });
  }
  for (const x of [-6, -3, 0, 3]) { janela(x, 1); janela(x, -1); }
  janela(6, 1);

  // bancos corridos
  function banco(x1, x2, s) {
    const len = x2 - x1, cx = (x1 + x2) / 2;
    box(len, .46, .4, LIGHT2, cx, .23, s * (Wz / 2 - .31));
    box(len, .07, .48, LIGHT, cx, .5, s * (Wz / 2 - .33));
    box(len, .5, .06, LIGHT, cx, .78, s * (Wz / 2 - .12));
  }
  banco(-7.3, 7.3, 1);
  banco(-7.3, 4.2, -1);
  banco(6.3, 7.3, -1);

  // pegadores pendurados (cenário)
  box(12.5, .06, .06, DARK2, 0, 2.08, 0);
  for (let x = -5.6; x <= 5.7; x += 1.15) {
    box(.04, .2, .04, DARK2, x, 1.96, 0);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(.09, .028, 6, 10),
      new THREE.MeshLambertMaterial({ color: DARK2 })
    );
    ring.position.set(x, 1.8, 0);
    scene.add(ring);
  }

  // luzes pontilhadas do teto
  for (let x = -7; x <= 7; x += .9) lite(.22, .04, .22, GLOW, x, 2.32, 0);
  for (const lx of [-4, 4]) {
    const pl = new THREE.PointLight(0xeaf2f2, .4, 10);
    pl.position.set(lx, 2, 0);
    scene.add(pl);
  }

  // letreiro azul pendurado (cenário)
  const let_ = grp(1.2, 1.92, 0);
  box(.06, .3, .06, DARK2, -.4, .3, 0, let_);
  box(.06, .3, .06, DARK2, .4, .3, 0, let_);
  box(1.0, .38, .1, DARK2, 0, 0, 0, let_);
  lite(.9, .28, .02, BLUE, 0, 0, .06, let_);
  lite(.9, .28, .02, BLUE, 0, 0, -.06, let_);

  if (day === 1) {
    // passageiro comum (cenário)
    const pas = person(true);
    pas.position.set(-2.5, .04, 1.0);
    pas.rotation.y = Math.PI;
  } else {
    // dia 2: os moradores de rua
    const m1 = person(true);
    m1.position.set(-1.0, .04, 1.0);
    m1.rotation.y = Math.PI;
    tagDialog(m1, 'homeless', 'morador2a');
    const m2 = person(true);
    m2.position.set(2.5, .04, -1.0);
    tagDialog(m2, 'otherHomeless', 'morador2b');
  }

  // porta do vagão
  const pdoor = grp(5.25, 0, -(Wz / 2 - .07));
  box(2.0, 2.2, .12, LIGHT2, 0, 1.1, 0, pdoor);
  box(.85, 2.05, .1, DARK2, -.46, 1.02, .05, pdoor);
  box(.85, 2.05, .1, DARK2, .46, 1.02, .05, pdoor);
  lite(.5, .09, .02, BLUE, 0, 2.0, .12, pdoor);
  tagGo(pdoor, 'subwayDoor', 'empresa');

  return {
    spawn: { x: -6.3, z: 0, yaw: -Math.PI / 2 },
    caption: sceneCaption('metro'),
    auto: day === 1 ? { name: '', lines: linesOf('metro1') } : null,
  };
}

/* ===================== CENA: O TRABALHO ===================== */
function buildEmpresa() {
  freshScene();
  scene.fog = new THREE.Fog(DARK, 10, 40);
  const H = 3;

  box(3.4, .2, 8.6, FLOOR, 5.5, -.1, -3.9);
  box(15.6, .2, 4.4, FLOOR, -.5, -.1, 2);
  box(3.4, .2, 8.6, DARK2, 5.5, H + .1, -3.9);
  box(15.6, .2, 4.4, DARK2, -.5, H + .1, 2);
  box(3.4, H, .18, LIGHT, 5.5, H / 2, -8.09);
  box(.18, H, 12.6, LIGHT, 7.09, H / 2, -2.05);
  box(.18, H, 8.2, LIGHT, 3.91, H / 2, -4.05);
  box(12.2, H, .18, LIGHT, -2.05, H / 2, -.09);
  box(.18, H, 4.4, LIGHT, -8.09, H / 2, 2);
  box(15.6, H, .18, LIGHT, -.5, H / 2, 4.09);
  walkOf(4.3, -7.55, 6.7, 1.0);
  walkOf(-7.6, .4, 6.7, 3.65);

  for (const [lx, lz] of [[5.5, -5], [5.5, -1], [0, 2], [-5, 2], [4, 2]]) {
    const pl = new THREE.PointLight(0xeaf2f2, .35, 11);
    pl.position.set(lx, 2.6, lz);
    scene.add(pl);
  }

  // porta da rua (cenário, atrás de você)
  const ed = grp(5.5, 0, -7.96);
  box(1.2, 2.3, .1, LIGHT2, 0, 1.15, 0, ed);
  box(1.0, 2.16, .09, DARK2, 0, 1.08, .04, ed);
  box(.07, .07, .06, BLUE, .38, 1.05, .09, ed);

  // relógio de ponto (cenário)
  const pt = grp(6.96, 1.45, -6.3);
  box(.1, .5, .62, DARK2, 0, 0, 0, pt);
  lite(.03, .07, .07, GLOW, -.06, .1, -.12, pt);
  lite(.03, .07, .07, GLOW, -.06, .1, .12, pt);

  // o chefe: escuro, maior, bloqueando o corredor
  const chefe = person(false, DARK2);
  chefe.position.set(5.9, 0, -1.2);
  chefe.rotation.y = Math.PI;
  chefe.scale.setScalar(1.34);
  tagDialog(chefe, 'boss', day === 1 ? 'chefe1a' : 'chefe2a');
  blockOf(5.55, -1.55, 6.25, -.85);

  // copa: balcão, cafeteira, micro-ondas (cenário)
  const copa = grp(-5.5, 0, .55);
  box(3.1, .95, .75, LIGHT2, 0, .475, 0, copa);
  box(3.2, .07, .85, LIGHT, 0, .99, 0, copa);
  const cafe = grp(-.9, 1.03, 0, copa);
  box(.32, .5, .32, DARK2, 0, .25, 0, cafe);
  box(.2, .2, .2, BLUE, 0, .1, .2, cafe);
  lite(.05, .05, .02, BLUE, .1, .42, .17, cafe);
  const micro = grp(.9, 1.21, 0, copa);
  box(.55, .36, .42, DARK2, 0, 0, 0, micro);
  box(.32, .26, .02, NAVY, -.06, 0, .22, micro);
  blockOf(-7.15, 0, -3.85, 1.05);

  // mural de avisos (cenário)
  const mural = grp(-7.94, 1.7, 2);
  box(.07, .7, .95, DARK2, 0, 0, 0, mural);
  box(.05, .6, .85, LIGHT2, .02, 0, 0, mural);
  lite(.02, .2, .16, GLOW, .06, .12, -.2, mural);
  lite(.02, .16, .13, GLOW, .06, -.1, .12, mural);
  box(.02, .12, .1, BLUE, .06, .14, .28, mural);

  // relógio de parede (cenário)
  const rel = grp(0, 2.25, .02);
  box(.36, .36, .07, DARK2, 0, 0, 0, rel);
  box(.28, .28, .02, 0xc7d4d5, 0, 0, .04, rel);
  box(.03, .1, .015, DARK2, 0, .04, .055, rel);
  box(.08, .03, .015, DARK2, .04, 0, .055, rel);

  // mesa do colega
  const mesaC = grp(-1.5, 0, 1.7);
  box(1.7, .07, .75, LIGHT2, 0, .76, 0, mesaC);
  for (const [lx, lz] of [[-.78, -.3], [.78, -.3], [-.78, .3], [.78, .3]])
    box(.07, .76, .07, DARK2, lx, .38, lz, mesaC);
  for (const dx of [-.38, .38]) {
    box(.22, .04, .18, DARK2, dx, .8, -.15, mesaC);
    box(.06, .14, .06, DARK2, dx, .88, -.18, mesaC);
    box(.5, .38, .06, DARK2, dx, 1.16, -.2, mesaC);
    box(.44, .32, .02, NAVY, dx, 1.16, -.16, mesaC);
  }
  box(.4, .04, .15, DARK2, 0, .81, .18, mesaC);
  box(.5, .07, .5, DARK2, 0, .5, .85, mesaC);
  box(.5, .55, .07, DARK2, 0, .85, 1.12, mesaC);
  const col = person(true, BLUE, mesaC);
  col.position.set(0, .04, .85);
  col.rotation.y = Math.PI;
  if (day === 1) tagDialog(mesaC, 'coworker', 'colega1');
  blockOf(-2.5, 1.2, -.5, 2.95);

  // funcionário parado (cenário)
  const func = person(false);
  func.position.set(2.3, 0, 2.45);
  func.rotation.y = -.7;
  blockOf(2.0, 2.15, 2.6, 2.75);

  // gato do escritório (cenário)
  cat(3.6, 3.45, 2.6);

  // placa de piso molhado (cenário)
  const placa = grp(-4.2, 0, 3.1);
  const a = box(.34, .52, .05, BLUE, 0, .26, .11, placa); a.rotation.x = -.35;
  const b = box(.34, .52, .05, BLUE, 0, .26, -.11, placa); b.rotation.x = .35;
  blockOf(-4.45, 2.85, -3.95, 3.35);

  // quadros com as 3 telas do jogo 2D original (cenário)
  quadro(ASSETS.pixelScreens.quarto, .59, .55, -.1, 2.0, 3.99, Math.PI);
  quadro(ASSETS.pixelScreens.metro, 1.02, .55, 1.0, 2.0, 3.99, Math.PI);
  quadro(ASSETS.pixelScreens.empresa, .65, .55, 2.1, 2.0, 3.99, Math.PI);

  // sua mesa: o computador do trabalho, fecha o dia
  const minha = grp(-7.3, 0, 2.6);
  box(.8, .07, 1.5, LIGHT2, 0, .76, 0, minha);
  for (const [lx, lz] of [[-.32, -.68], [.32, -.68], [-.32, .68], [.32, .68]])
    box(.07, .76, .07, DARK2, lx, .38, lz, minha);
  box(.3, .05, .42, DARK2, -.1, .81, 0, minha);
  box(.09, .22, .09, DARK2, -.14, .93, 0, minha);
  box(.08, .68, 1.04, DARK2, -.22, 1.42, 0, minha); // monitor grande
  const tela2 = new THREE.Mesh(new THREE.PlaneGeometry(.92, .56), termMat);
  tela2.rotation.y = Math.PI / 2;
  tela2.position.set(-.175, 1.42, 0);
  minha.add(tela2);
  box(.15, .04, .4, DARK2, .15, .81, 0, minha);
  box(.5, .07, .5, DARK2, .85, .5, 0, minha);
  box(.07, .55, .5, DARK2, 1.13, .85, 0, minha);
  box(.3, .42, .22, BLUE, .3, .21, 1.05, minha);
  const sentado2 = { seat: { x: -6.5, y: 1.15, z: 2.6 }, look: { x: -7.52, y: 1.42, z: 2.6 } };
  if (day === 1) tagTerminal(minha, 'computer', 'pcTrabalho1', {
    ...sentado2,
    cb: () => runSequence('finishDay1Work'),
  });
  if (day === 2) tagTerminal(minha, 'computer', 'pcTrabalho2', {
    ...sentado2,
    cb: () => runSequence('finishDay2Work'),
  });
  blockOf(-7.75, 1.7, -6.4, 3.5);

  return { spawn: { x: 5.5, z: -7.1, yaw: Math.PI }, caption: sceneCaption('empresa'), auto: null };
}

const builders = { quarto: buildQuarto, corredor: buildCorredor, recepcao: buildRecepcao, rua: buildRua, plataforma: buildPlataforma, metro: buildMetro, empresa: buildEmpresa, loja: buildLoja, aviao: buildAviao, praia: buildPraia };

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
  const def = builders[name]();
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
function useTarget() {
  const it = target.userData.inter;
  if (it.terminal) startTerm(it);
  else if (it.lines) say(it.name, it.lines, it.go ? () => go(it.go) : (it.cb || null));
  else if (it.go) go(it.go);
  else if (it.cb) it.cb();
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
  dotEl.classList.toggle('hidden', !!term || !!camAnim || !!poseHold);
  if (started && !ended && !transit && !term && !camAnim && !poseHold) {
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
  if (isMobile) {
    // botão E só aparece quando há algo para interagir / texto para avançar
    btnE.classList.toggle('on', !!target || textOpen || !!(term && term.typing));
    // analógicos somem enquanto há texto na tela ou câmera roteirizada (acordar/terminal)
    const hide = textOpen || !!term || !!camAnim || !!poseHold;
    stickL.classList.toggle('off', hide);
    stickR.classList.toggle('off', hide);
    if (hide) { joyL.x = joyL.y = 0; joyR.x = joyR.y = 0; }
  }
}

/* ===================== mobile: dois analógicos + botão E ===================== */
const isMobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const joyL = { x: 0, y: 0 }; // esquerdo: move o personagem
const joyR = { x: 0, y: 0 }; // direito: gira a câmera

function bindStick(el, vec) {
  const nub = el.firstElementChild, RAD = 44;
  let id = null;
  function move(e) {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RAD) { dx *= RAD / d; dy *= RAD / d; }
    vec.x = dx / RAD; vec.y = dy / RAD;
    nub.style.transform = `translate(${dx}px,${dy}px)`;
  }
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    id = e.pointerId;
    el.setPointerCapture(id);
    move(e);
  });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    vec.x = 0; vec.y = 0;
    nub.style.transform = '';
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function actionE() {
  if (!started || ended || transit || camAnim) return;
  if (term) termE();
  else if (textOpen) nextPage();
  else if (target) useTarget();
}

if (isMobile) {
  document.body.classList.add('mobile');
  titleEl.querySelector('.keys').textContent = GAME_CONTEXT.ui.mobile.keys;
  bindStick(stickL, joyL);
  bindStick(stickR, joyR);
  btnE.addEventListener('pointerdown', e => { e.preventDefault(); actionE(); });
}

/* ===================== input ===================== */
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyI' && isLocal) { toggleDebug(); return; }
  if (e.code === 'KeyE' && document.pointerLockElement) actionE();
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ===================== dev: seletor de cenas (só em localhost) ===================== */
const isLocal = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);
let debugEl = null, debugOpen = false;
// cenas agrupadas por dia (cada aba = a rota daquele dia, na ordem da história)
const DEBUG_TABS = [
  { label: 'Dia 1', scenes: [
    ['Quarto (acordar)', 'quarto', 1],
    ['Corredor', 'corredor', 1],
    ['Recepção', 'recepcao', 1],
    ['Rua (chuva)', 'rua', 1],
    ['Plataforma (trem chega)', 'plataforma', 1],
    ['Metrô', 'metro', 1],
    ['Trabalho', 'empresa', 1],
  ] },
  { label: 'Dia 2', scenes: [
    ['Quarto', 'quarto', 2],
    ['Corredor', 'corredor', 2],
    ['Recepção', 'recepcao', 2],
    ['Rua (chuva)', 'rua', 2],
    ['Plataforma (trem chega)', 'plataforma', 2],
    ['Metrô', 'metro', 2],
    ['Trabalho', 'empresa', 2],
  ] },
  { label: 'Dia 3', scenes: [
    ['Quarto (Bitsy)', 'quarto', 3],
  ] },
  { label: 'Dia 4', scenes: [
    ['Quarto (0 views)', 'quarto', 4],
  ] },
  { label: 'Dia 5', scenes: [
    ['Quarto (mesa vazia)', 'quarto', 5],
    ['Corredor', 'corredor', 5],
    ['Recepção', 'recepcao', 5],
    ['Rua (seca, metrô fechado)', 'rua', 5],
    ['Loja (passagem)', 'loja', 5],
    ['Avião (nuvens)', 'aviao', 5],
    ['Praia (fim)', 'praia', 5],
  ] },
  { label: 'Fim', scenes: [
    ['Tela "UM."', 'end', null],
  ] },
];
let debugTab = 0;
function buildDebugMenu() {
  debugEl = document.createElement('div');
  debugEl.style.cssText = 'position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(38,56,72,.82)';
  const panel = document.createElement('div');
  panel.style.cssText = 'background:#263848;border:2px solid #a6b6b8;border-left:8px solid #3aa2ea;padding:18px 20px;width:min(620px,94vw);max-height:88vh;overflow-y:auto';
  const h = document.createElement('div');
  h.textContent = 'CENAS · DEV';
  h.style.cssText = 'color:#3aa2ea;font-size:24px;letter-spacing:3px;margin-bottom:12px';
  panel.appendChild(h);
  // barra de abas (um dia por aba)
  const tabsBar = document.createElement('div');
  tabsBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;border-bottom:2px solid #3a5066;padding-bottom:12px';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:6px'; // coluna única: a rota lê de cima pra baixo
  const tabBtns = [];
  function showTab(i) {
    debugTab = i;
    grid.replaceChildren();
    DEBUG_TABS[i].scenes.forEach(([label, scene, d], idx) => {
      const b = document.createElement('button');
      b.textContent = (idx + 1) + '.  ' + label;
      b.style.cssText = 'font-family:inherit;font-size:20px;color:#dde8e9;background:#2e4358;border:2px solid #3a5066;padding:9px 13px;cursor:pointer;text-align:left';
      b.addEventListener('mouseenter', () => { b.style.borderColor = '#3aa2ea'; });
      b.addEventListener('mouseleave', () => { b.style.borderColor = '#3a5066'; });
      b.addEventListener('click', () => debugJump(scene, d));
      grid.appendChild(b);
    });
    tabBtns.forEach((tb, j) => {
      tb.style.background = j === i ? '#3aa2ea' : 'transparent';
      tb.style.color = j === i ? '#0f1b26' : '#a6b6b8';
      tb.style.borderColor = j === i ? '#3aa2ea' : '#3a5066';
    });
  }
  DEBUG_TABS.forEach((t, i) => {
    const tb = document.createElement('button');
    tb.textContent = t.label;
    tb.style.cssText = 'font-family:inherit;font-size:19px;padding:6px 14px;border:2px solid #3a5066;background:transparent;color:#a6b6b8;cursor:pointer';
    tb.addEventListener('click', () => showTab(i));
    tabsBar.appendChild(tb);
    tabBtns.push(tb);
  });
  panel.appendChild(tabsBar);
  panel.appendChild(grid);
  const hint = document.createElement('div');
  hint.textContent = 'I fecha · clique fora fecha';
  hint.style.cssText = 'color:#a6b6b8;font-size:16px;opacity:.7;margin-top:14px';
  panel.appendChild(hint);
  debugEl.appendChild(panel);
  debugEl.addEventListener('click', ev => { if (ev.target === debugEl) toggleDebug(); });
  document.body.appendChild(debugEl);
  showTab(debugTab); // abre na última aba usada (Dia 1 por padrão)
}
function toggleDebug() {
  if (!isLocal) return;
  if (!debugEl) buildDebugMenu();
  debugOpen = !debugOpen;
  debugEl.style.display = debugOpen ? 'flex' : 'none';
  if (debugOpen && document.pointerLockElement) document.exitPointerLock();
}
function debugJump(scene, d) {
  debugOpen = false;
  if (debugEl) debugEl.style.display = 'none';
  term = null; camAnim = null; poseHold = null; // limpa cutscenes em andamento
  closeText();
  ended = false;
  endEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  titleEl.classList.add('hidden');
  eyelidEl.style.display = 'none';
  if (d != null) day = d;
  started = true;
  go(scene);
  if (!isMobile && scene !== 'end') renderer.domElement.requestPointerLock();
}
if (isLocal) console.info('[zero] dev: tecla I abre o seletor de cenas');

document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement || term || camAnim || poseHold) return;
  yaw -= e.movementX * .0023;
  pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * .0023));
});

function startPlay() {
  initAudio(); // precisa do gesto do usuário para o navegador liberar o som
  if (isMobile) {
    // no touch não há pointer lock: entra em tela cheia e trava na horizontal
    const de = document.documentElement;
    if (de.requestFullscreen) de.requestFullscreen().catch(() => {});
    try {
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
    if (!started) {
      started = true;
      titleEl.classList.add('hidden');
      build('quarto');
    }
    pauseEl.classList.add('hidden');
  } else {
    renderer.domElement.requestPointerLock();
  }
}
titleEl.addEventListener('click', startPlay);
pauseEl.addEventListener('click', startPlay);
endEl.addEventListener('click', () => location.reload());

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked) {
    if (AC) AC.resume();
    if (!started) {
      started = true;
      titleEl.classList.add('hidden');
      build('quarto');
    }
    pauseEl.classList.add('hidden');
  } else if (started && !ended) {
    pauseEl.classList.remove('hidden');
    if (AC) AC.suspend(); // silêncio na pausa
  }
});

document.addEventListener('visibilitychange', () => {
  if (!AC || !started) return;
  if (document.hidden) AC.suspend();
  else if (pauseEl.classList.contains('hidden')) AC.resume();
});

/* ===================== loop ===================== */
let last = performance.now(), bobT = 0, stepPh = 0;
function tick(now) {
  requestAnimationFrame(tick);
  if (!scene) { renderer.clear(); return; }
  const t = now / 1000, dt = Math.min((now - last) / 1000, .05);
  last = now;

  let mv = false;
  if (started && !ended && !transit && !term && !camAnim && !poseHold && (document.pointerLockElement || isMobile)) {
    // analógico direito gira a câmera (devagar, para mirar com calma)
    if (joyR.x || joyR.y) {
      yaw -= joyR.x * 1.2 * dt;
      pitch = Math.max(-1.45, Math.min(1.45, pitch - joyR.y * .9 * dt));
    }
    const f = seated ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joyL.y;
    const st = seated ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joyL.x;
    const mag = Math.hypot(f, st);
    if (mag > .15) {
      mv = true;
      const sp = 3.1 * dt * Math.min(mag, 1) / mag;
      const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * st) * sp;
      const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * st) * sp;
      if (free(px + dx, pz + dz)) { px += dx; pz += dz; }
      else if (free(px + dx, pz)) { px += dx; }
      else if (free(px, pz + dz)) { pz += dz; }
    }
  }
  if (mv) {
    bobT += dt * 8.5;
    const ph = Math.floor(bobT / Math.PI); // um passo a cada meio ciclo do balanço
    if (ph !== stepPh) { stepPh = ph; sfxStep(); }
  }

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
  } else if (term) {
    camera.position.set(term.pose.x, term.pose.y, term.pose.z);
    camera.rotation.set(term.pose.pitch, term.pose.yaw, 0);
  } else if (poseHold) {
    camera.position.set(poseHold.x, poseHold.y, poseHold.z);
    camera.rotation.set(poseHold.pitch, poseHold.yaw, 0);
  } else {
    const gy = elevFn ? elevFn(px, pz) : 0;
    camera.position.set(
      px,
      gy + 1.6 + (mv ? Math.sin(bobT) * .03 : 0) + (sway ? Math.sin(t * 2.2) * .015 + Math.sin(t * 7.1) * .005 : 0),
      pz
    );
    camera.rotation.set(pitch, yaw, 0);
  }

  // datilografia do terminal
  if (term && term.typing && !term.waiting) {
    const cur = term.lines[term.idx];
    const prev = Math.floor(term.chars);
    term.chars = Math.min(term.chars + dt * 30, cur.length);
    if (term.chars >= cur.length) { term.waiting = true; drawTerm(); }
    else if (Math.floor(term.chars) !== prev) { sfxType(); drawTerm(); }
  }
  if (term && term.waiting) {
    const b = Math.floor(t * 2) % 2;
    if (b !== term.blink) { term.blink = b; drawTerm(); }
  }

  // trilha generativa: frases esparsas, mais presentes conforme os dias passam
  if (audioOn() && started && !ended) {
    if (musicNext === null) musicNext = t + 3;
    else if (t >= musicNext) {
      playMotif();
      const m = MUSIC[day] || MUSIC[1];
      musicNext = t + m.gap[0] + Math.random() * (m.gap[1] - m.gap[0]);
    }
  }

  for (const a of anims) a(t);
  updateTarget();
  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
