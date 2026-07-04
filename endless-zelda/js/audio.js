// Endless Zelda — WebAudio chiptune engine v2
// NES-style: 2 pulse channels (real duty cycles via PeriodicWave), triangle bass,
// noise drums. Sample-accurate lookahead scheduling, envelopes, vibrato,
// light echo + master compressor.
'use strict';

const Audio2 = (() => {
  const MUTE_KEY = 'endlesszelda_muted';
  function loadMuted() { try { return (localStorage.getItem(MUTE_KEY) || localStorage.getItem('tinyzelda_muted')) === '1'; } catch (e) { return false; } }
  function saveMuted(v) { try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch (e) {} }

  let ctx = null, muted = loadMuted();
  let musicGain, sfxGain, comp, noiseBuf;
  const waves = {}; // p50 / p25 / p12 PeriodicWaves

  // ---------- note table ----------
  const N = {};
  (() => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (let oct = 1; oct <= 7; oct++)
      names.forEach((n, i) => { N[n + oct] = 440 * Math.pow(2, (oct * 12 + i - 57) / 12); });
  })();
  const noteFreq = (n) => n === 'R' ? 0 : (N[n] || N[n.replace('S', '#')] || 440);

  function pulseWave(duty) {
    const K = 48;
    const real = new Float32Array(K), imag = new Float32Array(K);
    for (let k = 1; k < K; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  }

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.15;
      comp.connect(ctx.destination);

      musicGain = ctx.createGain(); musicGain.gain.value = 0.16;
      musicGain.connect(comp);
      // light echo send (NES games faked this; it fattens everything)
      const delay = ctx.createDelay(0.5); delay.delayTime.value = 0.17;
      const fb = ctx.createGain(); fb.gain.value = 0.22;
      const send = ctx.createGain(); send.gain.value = 0.25;
      musicGain.connect(delay); delay.connect(fb); fb.connect(delay);
      delay.connect(send); send.connect(comp);

      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.22;
      sfxGain.connect(comp);

      waves.p50 = pulseWave(0.50);
      waves.p25 = pulseWave(0.25);
      waves.p12 = pulseWave(0.125);

      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // ---------- voices ----------
  function setWave(o, w) {
    if (waves[w]) o.setPeriodicWave(waves[w]);
    else o.type = w; // 'triangle' | 'sawtooth' | 'sine' | 'square'
  }

  // scheduled melodic note with envelope (+ optional vibrato)
  function note(freq, t, dur, wave, vol, vib) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    setWave(o, wave);
    o.frequency.value = freq;
    const end = t + dur;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    if (wave === 'triangle') { // NES triangle: no volume envelope, hard cut
      g.gain.setValueAtTime(vol, end - 0.02);
      g.gain.linearRampToValueAtTime(0.0001, end - 0.005);
    } else {
      g.gain.setValueAtTime(vol, t + Math.max(0.005, dur * 0.55));
      g.gain.exponentialRampToValueAtTime(0.001, end);
    }
    o.connect(g); g.connect(musicGain);
    if (vib && dur > 0.32) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.6; lg.gain.value = freq * 0.007;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t + 0.15); lfo.stop(end);
    }
    o.start(t); o.stop(end + 0.02);
  }

  function drum(kind, t) {
    if (kind === 'K') { // kick: pitch-dropping triangle thump
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(musicGain);
      o.start(t); o.stop(t + 0.14);
    } else { // S snare / H hat: filtered noise bursts
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      s.loop = true; s.loopStart = Math.random() * 0.5;
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const dur = kind === 'S' ? 0.09 : 0.03;
      if (kind === 'S') { f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; }
      else { f.type = 'highpass'; f.frequency.value = 7000; }
      g.gain.setValueAtTime(kind === 'S' ? 0.5 : 0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(musicGain);
      s.start(t); s.stop(t + dur + 0.01);
    }
  }

  // ---------- song data ----------
  // Melody DSL: space-separated tokens NOTE[/beats], R = rest, default 1 beat.
  // Chord DSL: NAME[/beats], default 4. Engine expands to arpeggio (pulse 2)
  // and root/fifth triangle bass, so every song gets 4 synced channels.
  const CHORDS = {
    C:  { b: ['C2', 'G2'],  n: ['C4', 'E4', 'G4', 'E4'] },
    G:  { b: ['G2', 'D3'],  n: ['G3', 'B3', 'D4', 'B3'] },
    Am: { b: ['A2', 'E3'],  n: ['A3', 'C4', 'E4', 'C4'] },
    F:  { b: ['F2', 'C3'],  n: ['F3', 'A3', 'C4', 'A3'] },
    Dm: { b: ['D2', 'A2'],  n: ['D3', 'F3', 'A3', 'F3'] },
    Em: { b: ['E2', 'B2'],  n: ['E3', 'G3', 'B3', 'G3'] },
    E:  { b: ['E2', 'B2'],  n: ['E3', 'G#3', 'B3', 'G#3'] },
    Bb: { b: ['A#2', 'F3'], n: ['A#3', 'D4', 'F4', 'D4'] },
  };

  const SONGS = {
    overworld: {
      // ORIGINAL heroic adventure march — this is NOT the copyrighted NES Zelda
      // overworld theme, just the same NES idiom (square lead, triangle bass,
      // marching drums). Written from scratch to evoke the genre, not to copy it.
      bpm: 150, leadWave: 'p50', arpWave: 'p25', vib: true,
      lead: `E5/1 G5/1 C6/1.5 G5/.5  B5/1 D6/1 B5/1 G5/1  A5/1.5 E5/.5 A5/1 C6/1  F5/1 A5/1 C6/2
             G5/1 E5/1 C5/1 E5/1  D5/1 G5/1 B5/1.5 D6/.5  C6/1 A5/1 F5/2  G5/1 B5/1 D6/2
             E6/1.5 C6/.5 A5/1 B5/1  C6/1 A5/1 F5/1 A5/1  G5/1 E5/1 C5/1.5 E5/.5  D5/1 G5/1 B5/2
             A5/1 C6/1 F6/1.5 C6/.5  B5/1 D6/1 G6/2  E6/1 C6/1 G5/1 E5/1  C5/4`,
      chords: 'C G Am F  C G F G  Am F C G  F G C C',
      drums: 'K/.5 H/.5 S/.5 H/.5 K/.5 K/.5 S/.5 H/.5',
    },
    dungeon: {
      bpm: 100, leadWave: 'p25', arpWave: 'p12', vib: true, arpRate: 1, arpVol: 0.22,
      lead: `A4/2 R A4/.5 A4/.5  C5/1.5 B4/.5 A4 GS4  A4/3 R  F4/2 D4/2
             E4/2 A4/2  E5/1.5 D5/.5 B4 GS4  A4/2 GS4/2  A4/3 R`,
      chords: 'Am Am Bb Bb Am E Am/2 E/2 Am',
      drums: 'K R S R',
    },
    title: {
      bpm: 90, leadWave: 'p50', arpWave: 'p25', vib: true, arpRate: 1,
      lead: `E5/3 C5  D5/2 E5 D5  C5/3 A4  G4/2 A4/2
             A4/3 B4  C5/2 D5 E5  E5/2 D5/2  C5/4`,
      chords: 'Am F C G Am F G C',
    },
    ending: {
      bpm: 120, leadWave: 'p50', arpWave: 'p25', vib: true,
      lead: `G4/.5 C5/.5 E5 G5/2  A5 G5 F5 A5  G5/2 E5/2  D5 E5 F5 D5
             E5 G5 C5/2  A4 C5 F5 E5  D5/2 B4/2  C5/4`,
      chords: 'C F C G C F G C',
      drums: 'K/.5 H/.5 S/.5 H/.5',
    },
    gameover: {
      bpm: 70, leadWave: 'p25', arpWave: 'p12', vib: true, arpRate: 1, arpVol: 0.2,
      lead: 'A4/2 GS4/2  G4/2 FS4/2  F4/3 E4  E4/4',
      chords: 'Am E Dm E',
    },
  };

  function parseMel(str) {
    return str.trim().split(/\s+/).map(tok => {
      const [n, d] = tok.split('/');
      return [n, d ? parseFloat(d) : 1];
    });
  }
  function expandChords(str, arpRate) {
    const arp = [], bass = [];
    for (const tok of str.trim().split(/\s+/)) {
      const [name, d] = tok.split('/');
      const beats = d ? parseFloat(d) : 4;
      const ch = CHORDS[name];
      if (!ch) continue;
      for (let b = 0; b < beats / 0.5; b++) bass.push([ch.b[b % 2], 0.5]);
      const steps = Math.max(1, Math.round(beats / arpRate));
      for (let s = 0; s < steps; s++) arp.push([ch.n[s % ch.n.length], arpRate]);
    }
    return { arp, bass };
  }

  // ---------- sequencer (lookahead scheduling on the audio clock) ----------
  let playing = null, timer = null, chans = [], startT = 0, beatLen = 0.4;

  function schedule() {
    const horizon = ctx.currentTime + 0.18;
    for (const ch of chans) {
      while (startT + ch.t * beatLen < horizon) {
        const [tok, dur] = ch.evts[ch.i];
        const t0 = Math.max(startT + ch.t * beatLen, ctx.currentTime + 0.005);
        if (!muted && tok !== 'R') {
          if (ch.drum) drum(tok, t0);
          else note(noteFreq(tok), t0, dur * beatLen, ch.wave, ch.vol, ch.vib);
        }
        ch.t += dur;
        ch.i = (ch.i + 1) % ch.evts.length;
      }
    }
  }

  function play(name) {
    ensure();
    if (playing === name) return;
    stop();
    const s = SONGS[name];
    if (!s) return;
    playing = name;
    beatLen = 60 / s.bpm;
    const { arp, bass } = expandChords(s.chords, s.arpRate || 0.5);
    chans = [
      { evts: parseMel(s.lead), wave: s.leadWave || 'p50', vol: s.leadVol || 0.5, vib: s.vib, i: 0, t: 0 },
      { evts: arp, wave: s.arpWave || 'p25', vol: s.arpVol || 0.28, i: 0, t: 0 },
      { evts: bass, wave: 'triangle', vol: 0.85, i: 0, t: 0 },
    ];
    if (s.drums) chans.push({ evts: parseMel(s.drums), drum: true, i: 0, t: 0 });
    startT = ctx.currentTime + 0.08;
    schedule();
    timer = setInterval(schedule, 40);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null; playing = null; chans = [];
  }

  // ---------- sound effects ----------
  function blip(freq, dur, type, vol, dest, slide) {
    if (muted || !ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    setWave(o, type === 'square' ? 'p50' : type);
    o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), ctx.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol, hi) {
    if (muted || !ctx) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.loop = true; s.loopStart = Math.random() * 0.5;
    s.playbackRate.value = hi ? 1 : 0.35;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    s.connect(g); g.connect(sfxGain);
    s.start(); s.stop(ctx.currentTime + dur + 0.02);
  }

  const sfx = {
    sword()   { blip(880, 0.09, 'square', 0.5, null, 200); },
    beam()    { blip(1200, 0.22, 'square', 0.4, null, 300); },
    hitEnemy(){ noise(0.08, 0.5, true); },
    kill()    { blip(300, 0.06, 'square', 0.5); setTimeout(() => blip(150, 0.12, 'square', 0.5), 60); },
    hurt()    { blip(160, 0.2, 'sawtooth', 0.6, null, 60); },
    rupee()   { blip(N.C6, 0.07, 'square', 0.5); setTimeout(() => blip(N.G6, 0.12, 'square', 0.5), 70); },
    heart()   { blip(N.E6, 0.09, 'square', 0.5); setTimeout(() => blip(N.C7, 0.14, 'square', 0.5), 80); },
    key()     { blip(N.B5, 0.08, 'square', 0.5); setTimeout(() => blip(N.E6, 0.15, 'square', 0.5), 80); },
    item() {
      [N.G5, N.C6, N.E6, N.G6].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'square', 0.5), i * 110));
    },
    secret() {
      [N.G5, N['F#5'], N['D#5'], N.A4, N['G#4'], N.E5, N['G#5'], N.C6]
        .forEach((f, i) => setTimeout(() => blip(f, 0.12, 'square', 0.5), i * 90));
    },
    stairs()  { for (let i = 0; i < 6; i++) setTimeout(() => blip(500 - i * 60, 0.08, 'square', 0.4), i * 70); },
    bombDrop(){ blip(200, 0.08, 'square', 0.4); },
    boom()    { noise(0.5, 0.9); blip(70, 0.5, 'triangle', 0.9, null, 30); },
    arrow()   { blip(700, 0.1, 'square', 0.4, null, 1400); },
    text()    { blip(1000, 0.03, 'square', 0.25); },
    lowHp()   { blip(N.C6, 0.06, 'square', 0.35); setTimeout(() => blip(N.C6, 0.06, 'square', 0.35), 120); },
    unlock()  { blip(N.C5, 0.06, 'square', 0.5); setTimeout(() => blip(N.C6, 0.1, 'square', 0.5), 70); },
    shield()  { blip(500, 0.06, 'square', 0.4); },
    bossRoar(){ noise(0.4, 0.7); blip(90, 0.45, 'sawtooth', 0.7, null, 50); },
    triforce() {
      const seq = [N.C5, N.D5, N.E5, N.F5, N.G5, N.A5, N.B5, N.C6, N.E6, N.G6, N.C7];
      seq.forEach((f, i) => setTimeout(() => { blip(f, 0.25, 'square', 0.45); blip(f / 2, 0.25, 'triangle', 0.4); }, i * 130));
    },
    die() {
      for (let i = 0; i < 10; i++) setTimeout(() => blip(400 - i * 35, 0.1, 'square', 0.5), i * 80);
    },
  };

  return {
    ensure, sfx, play, stop,
    toggleMute() { muted = !muted; saveMuted(muted); return muted; },
    get muted() { return muted; },
  };
})();
