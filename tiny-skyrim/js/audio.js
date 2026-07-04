// Procedural WebAudio: ambient nordic-ish music and all sound effects.
// Gentle mix: slow attacks, low gains, melody capped in the mid register.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.muted = false;
    this.musicOn = false;
    this.melNext = 0;
    this.melIdx = 3;
    this.choirNext = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.resume) this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 6;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(comp);
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    if (ctx.resume) ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.6;
  }

  env(gainNode, t0, peak, a, d) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  tone(opts) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = opts.t0 != null ? opts.t0 : ctx.currentTime;
    const a = opts.a != null ? opts.a : 0.01;
    const d = opts.d != null ? opts.d : 0.3;
    const o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.f0 || 220, t0);
    if (opts.f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.f1), t0 + a + d);
    const g = ctx.createGain();
    this.env(g, t0, opts.peak != null ? opts.peak : 0.12, a, d);
    let node = o;
    if (opts.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lp;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + a + d + 0.1);
  }

  noise(opts) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = opts.t0 != null ? opts.t0 : ctx.currentTime;
    const a = opts.a != null ? opts.a : 0.005;
    const d = opts.d != null ? opts.d : 0.2;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.type || 'lowpass';
    f.frequency.value = opts.freq || 800;
    f.Q.value = opts.q != null ? opts.q : 0.8;
    const g = ctx.createGain();
    this.env(g, t0, opts.peak != null ? opts.peak : 0.15, a, d);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t0);
    s.stop(t0 + a + d + 0.1);
  }

  // ---- music ----

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx;

    // drone: two low detuned saws through a slowly wandering lowpass
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.028;
    const droneLp = ctx.createBiquadFilter();
    droneLp.type = 'lowpass';
    droneLp.frequency.value = 190;
    droneLp.connect(droneGain);
    droneGain.connect(this.master);
    for (const f of [73.42, 110.0]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(droneLp);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 55;
    lfo.connect(lfoGain);
    lfoGain.connect(droneLp.frequency);
    lfo.start();

    // wind: looped filtered noise, gain breathing slowly
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noiseBuf;
    windSrc.loop = true;
    const windBp = ctx.createBiquadFilter();
    windBp.type = 'bandpass';
    windBp.frequency.value = 380;
    windBp.Q.value = 0.4;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.011;
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.07;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 0.006;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windGain.gain);
    windSrc.connect(windBp);
    windBp.connect(windGain);
    windGain.connect(this.master);
    windSrc.start();
    windLfo.start();

    // melody + choir scheduler
    this.melNext = ctx.currentTime + 2;
    this.choirNext = ctx.currentTime + 8;
    setInterval(() => this.scheduleMusic(), 400);
  }

  scheduleMusic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // D aeolian-ish walk, capped in the mid register (nothing shrill)
    const notes = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0];
    while (this.melNext < now + 0.8) {
      const t0 = this.melNext;
      if (Math.random() < 0.74) {
        this.melIdx += Math.round((Math.random() - 0.5) * 3);
        if (this.melIdx < 0) this.melIdx = 1;
        if (this.melIdx >= notes.length) this.melIdx = notes.length - 2;
        const f = notes[this.melIdx];
        this.tone({ type: 'sine', f0: f, t0, a: 0.5, d: 1.9, peak: 0.045, lp: 620 });
        this.tone({ type: 'sine', f0: f * 1.004, t0, a: 0.6, d: 1.8, peak: 0.02, lp: 620 });
      }
      this.melNext += 1.5 + Math.random() * 1.7;
    }
    while (this.choirNext < now + 0.8) {
      const t0 = this.choirNext;
      for (const f of [146.83, 220.0, 293.66]) {
        this.tone({ type: 'triangle', f0: f, t0, a: 2.4, d: 3.6, peak: 0.02, lp: 500 });
      }
      this.choirNext += 15 + Math.random() * 7;
    }
  }

  // ---- sfx ----

  swing() {
    this.noise({ type: 'bandpass', freq: 950, q: 1.2, a: 0.02, d: 0.16, peak: 0.1 });
  }

  hit() {
    this.noise({ freq: 500, a: 0.004, d: 0.12, peak: 0.16 });
    this.tone({ type: 'sine', f0: 130, f1: 55, a: 0.005, d: 0.16, peak: 0.14 });
  }

  playerHurt() {
    this.tone({ type: 'sawtooth', f0: 210, f1: 90, a: 0.01, d: 0.25, peak: 0.1, lp: 700 });
    this.noise({ freq: 400, a: 0.005, d: 0.12, peak: 0.08 });
  }

  step() {
    this.noise({ freq: 300, a: 0.004, d: 0.05, peak: 0.04 });
  }

  fireball() {
    this.noise({ type: 'bandpass', freq: 620, q: 0.8, a: 0.03, d: 0.32, peak: 0.11 });
    this.tone({ type: 'sine', f0: 300, f1: 90, a: 0.02, d: 0.3, peak: 0.07 });
  }

  explosion() {
    this.noise({ freq: 260, a: 0.005, d: 0.45, peak: 0.24 });
    this.tone({ type: 'sine', f0: 95, f1: 40, a: 0.005, d: 0.4, peak: 0.18 });
  }

  shout() {
    this.tone({ type: 'sine', f0: 72, f1: 44, a: 0.02, d: 0.7, peak: 0.32 });
    this.tone({ type: 'sawtooth', f0: 115, f1: 50, a: 0.02, d: 0.6, peak: 0.11, lp: 320 });
    this.noise({ freq: 220, a: 0.01, d: 0.55, peak: 0.24 });
  }

  chant() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const chord = [146.83, 196.0, 220.0, 293.66];
    chord.forEach((f, i) => {
      this.tone({ type: 'triangle', f0: f, t0: t + i * 0.35, a: 1.1, d: 2.6, peak: 0.05, lp: 560 });
    });
    this.noise({ type: 'bandpass', freq: 800, q: 3, a: 1.4, d: 2.4, peak: 0.03 });
  }

  roar() {
    this.tone({ type: 'sawtooth', f0: 130, f1: 45, a: 0.05, d: 1.1, peak: 0.2, lp: 480 });
    this.tone({ type: 'sawtooth', f0: 97, f1: 38, a: 0.08, d: 1.2, peak: 0.14, lp: 380 });
    this.noise({ type: 'bandpass', freq: 300, q: 1.6, a: 0.05, d: 1.0, peak: 0.15 });
  }

  growl() {
    this.tone({ type: 'sawtooth', f0: 92, f1: 68, a: 0.05, d: 0.5, peak: 0.09, lp: 260 });
  }

  chest() {
    this.tone({ type: 'sawtooth', f0: 75, f1: 130, a: 0.05, d: 0.3, peak: 0.06, lp: 400 });
    this.noise({ freq: 700, a: 0.004, d: 0.06, peak: 0.05 });
  }

  coin() {
    this.tone({ type: 'triangle', f0: 590, a: 0.005, d: 0.09, peak: 0.045 });
    if (this.ctx) this.tone({ type: 'triangle', f0: 880 * 0.75, t0: this.ctx.currentTime + 0.07, a: 0.005, d: 0.12, peak: 0.04 });
  }

  levelUp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [293.66, 440.0, 587.33].forEach((f, i) => {
      this.tone({ type: 'triangle', f0: f, t0: t + i * 0.13, a: 0.03, d: 0.55, peak: 0.07, lp: 900 });
    });
  }

  quest() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone({ type: 'triangle', f0: 392.0, t0: t, a: 0.02, d: 0.35, peak: 0.06, lp: 800 });
    this.tone({ type: 'triangle', f0: 587.33, t0: t + 0.12, a: 0.02, d: 0.5, peak: 0.05, lp: 800 });
  }

  blip() {
    this.tone({ type: 'sine', f0: 320, a: 0.005, d: 0.06, peak: 0.04 });
  }

  death() {
    this.tone({ type: 'sawtooth', f0: 160, f1: 48, a: 0.02, d: 1.6, peak: 0.13, lp: 420 });
    this.noise({ freq: 300, a: 0.02, d: 1.0, peak: 0.1 });
  }

  victory() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [293.66, 392.0, 440.0, 587.33].forEach((f, i) => {
      this.tone({ type: 'sawtooth', f0: f, t0: t + i * 0.35, a: 0.05, d: 0.9, peak: 0.07, lp: 700 });
    });
    [146.83, 220.0, 293.66].forEach((f) => {
      this.tone({ type: 'triangle', f0: f, t0: t + 1.4, a: 0.3, d: 2.6, peak: 0.05, lp: 600 });
    });
  }

  absorb() {
    this.tone({ type: 'triangle', f0: 240, f1: 520, a: 0.6, d: 1.9, peak: 0.07, lp: 620 });
    this.tone({ type: 'triangle', f0: 180, f1: 390, a: 0.7, d: 2.0, peak: 0.05, lp: 620 });
    this.noise({ type: 'bandpass', freq: 900, q: 4, a: 0.8, d: 1.8, peak: 0.03 });
  }

  thud() {
    this.noise({ freq: 130, a: 0.004, d: 0.3, peak: 0.22 });
    this.tone({ type: 'sine', f0: 58, f1: 35, a: 0.005, d: 0.3, peak: 0.16 });
  }
}
