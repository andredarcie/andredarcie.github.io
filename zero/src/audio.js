import { MUSIC } from './config.js';
import { day } from './state.js';

/* ===================== áudio: tudo sintetizado via Web Audio ===================== */
let AC = null, aMaster, aMusic, aSfx, aAmb, aVerb, nbuf, railB;
let musicNext = null;

function audioOn() { return AC && AC.state === 'running'; }
const theme = () => MUSIC[day] || MUSIC[1];

export function resumeAudio() { if (AC) AC.resume(); }
export function suspendAudio() { if (AC) AC.suspend(); }

// trilha generativa: frases esparsas, mais presentes conforme os dias passam
export function updateMusic(t) {
  if (!audioOn()) return;
  if (musicNext === null) musicNext = t + 3;
  else if (t >= musicNext) {
    playMotif();
    const m = theme();
    musicNext = t + m.gap[0] + Math.random() * (m.gap[1] - m.gap[0]);
  }
}

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
export function initAudio() {
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
  const m = theme();
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
export function setPad(d) {
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
export function chime() { // duas notas ao entrar numa cena
  const m = theme();
  pluck(m.root * 2, .5, 0);
  pluck(m.root * 3, .35, .45);
}
export function endChord() { // acorde final: Zero vira Um
  const m = MUSIC[3];
  [0, 4, 7, 12].forEach((st, i) => pluck(m.root * 2 * Math.pow(2, st / 12), .7, i * .22));
}
export function whaleCall(hi) { // canto da baleia sobre a cidade
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
export function setAmb(name) {
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
export function sfxStep() {
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
export function sfxBlip(open) {
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
export function sfxType() {
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
export function sfxSit() { // roçar de roupa ao sentar / levantar
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
export function sfxWhoosh() { // sopro grave nas trocas de cena
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
export function thunder() { // trovão distante rolando entre os prédios
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
export function trainArrive(delay, dur) { // ronco crescente + guincho de freio, sincronizado com a chegada
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
export function trainStopSfx() { // chiado do freio pneumático + toque das portas abrindo
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
  const m = theme();
  pluck(m.root * 2, .5, .2); pluck(m.root * 3, .4, .5);
}
