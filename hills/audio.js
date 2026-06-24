// audio.js — tudo procedural via Web Audio (sem arquivos): estática do rádio,
// drone ambiente, passos, sirene do "outro mundo", batimento e impactos.
export class GameAudio {
  constructor() { this.ctx = null; this.ready = false; this.shotBuf = null; this._shotLoaded = false; this._musicOn = false; }

  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC();

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    // compressor no final: segura os picos quando música + tiro + combo somam (sem clipar feio)
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -10; this.comp.knee.value = 24; this.comp.ratio.value = 4;
    this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);

    // buffer de ruído reutilizável (2s)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // --- estática do rádio (loop, ganho controlado pela proximidade) ---
    const stat = ctx.createBufferSource(); stat.buffer = buf; stat.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 0.7;
    this.staticGain = ctx.createGain(); this.staticGain.gain.value = 0;
    stat.connect(bp).connect(this.staticGain).connect(this.master);
    stat.start();

    // --- drone ambiente (duas ondas graves desafinadas + filtro lento) ---
    this.ambGain = ctx.createGain(); this.ambGain.gain.value = 0.12;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
    lp.connect(this.ambGain).connect(this.master);
    for (const f of [52, 55.5, 78]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.4; o.connect(g).connect(lp); o.start();
    }
    // LFO no corte do filtro = "respiração" do ambiente
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 90;
    lfo.connect(lfoG).connect(lp.frequency); lfo.start();

    // batimento cardíaco (controlado por setHeartbeat)
    this.heartGain = ctx.createGain(); this.heartGain.gain.value = 0;
    this.heartGain.connect(this.master);
    this._heartTimer = null;

    this.ready = true;
    this._clankLoop();
    this._loadShot();        // baixa o sample de espingarda (com fallback procedural)
  }

  now() { return this.ctx.currentTime; }

  // ---------- sample real de espingarda calibre 12 (mp3 baixado, CC0/Pixabay) ----------
  // carregado de forma assíncrona; até carregar (ou se falhar), o tiro usa o sintético.
  _loadShot() {
    if (this._shotLoaded || !this.ctx) return;
    this._shotLoaded = true;
    try {
      const url = new URL('sounds/shotgun-12gauge.mp3', import.meta.url).href;
      fetch(url).then((r) => r.arrayBuffer()).then((arr) => {
        this.ctx.decodeAudioData(arr, (buf) => { this.shotBuf = buf; }, () => { /* fica no fallback */ });
      }).catch(() => { /* fica no fallback procedural */ });
    } catch (e) { /* fica no fallback procedural */ }
  }

  setStatic(level) {                 // 0..1
    if (!this.ready) return;
    const g = this.staticGain.gain;
    g.cancelScheduledValues(this.now());
    g.linearRampToValueAtTime(Math.max(0, Math.min(0.5, level * 0.5)), this.now() + 0.15);
  }

  footstep(running) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = running ? 900 : 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(running ? 0.25 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    s.connect(f).connect(g).connect(this.master);
    s.start(t); s.stop(t + 0.13);
  }

  hurt() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    // baque grave (impacto pesado da morte)
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.connect(og).connect(this.master); o.start(t); o.stop(t + 0.57);
    // ruído abafado do golpe
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 0.37);
  }

  pickup() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    // clink metálico abafado (achou algo)
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 6;
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.22, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    s.connect(bp).connect(cg).connect(this.master); s.start(t); s.stop(t + 0.18);
    // tom grave sombrio com leve dissonância (batimento), surge e some — presságio
    for (const f of [104, 110]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.55);
    }
  }

  // ---------- vocalizações sinistras do monstro (com pan estéreo) ----------
  creepy(pan = 0) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    let dest = this.master;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(this.master); dest = p;
    }
    const pick = Math.floor(Math.random() * 4);
    if (pick === 0) this._groan(t, dest);
    else if (pick === 1) this._screech(t, dest);
    else if (pick === 2) this._whisper(t, dest);
    else this._gurgle(t, dest);
  }

  // ---------- "te avistou": sting macabro disparado quando o inimigo enxerga o jogador ----------
  // mais agudo e pontual que o creepy ambiente: arquejo que sobe + stab dissonante + baque grave.
  spotted(pan = 0) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    let dest = this.master;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      p.connect(this.master); dest = p;
    }
    // 1) arquejo: ruído de banda que sobe rápido (a criatura inala ao te ver)
    const br = ctx.createBufferSource(); br.buffer = this.noiseBuf;
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass';
    bf.frequency.setValueAtTime(300, t); bf.frequency.exponentialRampToValueAtTime(1800, t + 0.22); bf.Q.value = 1.2;
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.16, t + 0.18); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    br.connect(bf).connect(bg).connect(dest); br.start(t); br.stop(t + 0.52);
    // 2) stab dissonante: duas serras em semitom, distorcidas, sobem e cortam (tensão)
    const sh = ctx.createWaveShaper(); sh.curve = this._distCurve(6);
    const sbp = ctx.createBiquadFilter(); sbp.type = 'bandpass'; sbp.frequency.value = 1200; sbp.Q.value = 1.5;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t + 0.02); sg.gain.exponentialRampToValueAtTime(0.14, t + 0.1); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    sh.connect(sbp).connect(sg).connect(dest);
    for (const f of [440, 466]) {                 // semitom => dissonância áspera
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t + 0.02); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.18);
      o.connect(sh); o.start(t + 0.02); o.stop(t + 0.62);
    }
    // 3) baque grave: a presença "fecha" em cima de você
    const o2 = ctx.createOscillator(); o2.type = 'sine';
    o2.frequency.setValueAtTime(150, t); o2.frequency.exponentialRampToValueAtTime(45, t + 0.4);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.4, t + 0.04); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o2.connect(og).connect(dest); o2.start(t); o2.stop(t + 0.58);
  }

  // curva de distorção (aspereza) p/ o grito
  _distCurve(amount) {
    const n = 256, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * amount); }
    return c;
  }

  _groan(t, dest) {                       // gemido gutural que descai (respiração pesada, sem soar "kazoo")
    const ctx = this.ctx, end = t + 2.2, f0 = 88 + Math.random() * 18;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280; lp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.45);
    g.gain.setValueAtTime(0.4, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, end);
    lp.connect(g).connect(dest);
    const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = 3.0;   // vibrato bem sutil
    const vibG = ctx.createGain(); vibG.gain.value = 2.0; vib.connect(vibG); vib.start(t); vib.stop(end);
    for (const mul of [1, 1.008]) {        // duas serras quase iguais -> aspereza
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * mul, t); o.frequency.exponentialRampToValueAtTime(f0 * mul * 0.6, end);  // cai de tom
      vibG.connect(o.frequency); o.connect(lp); o.start(t); o.stop(end);
    }
    const br = ctx.createBufferSource(); br.buffer = this.noiseBuf;                       // sopro/respiração por cima
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 430; bf.Q.value = 1.1;
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.05, t + 0.5); bg.gain.exponentialRampToValueAtTime(0.0001, end);
    br.connect(bf).connect(bg).connect(dest); br.start(t); br.stop(end);
  }

  _screech(t, dest) {                     // grito áspero DESCENDENTE e distorcido (nada de "slide-whistle")
    const ctx = this.ctx, end = t + 1.1;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(1500, t);
    o.frequency.linearRampToValueAtTime(950, t + 0.14);
    o.frequency.linearRampToValueAtTime(1180, t + 0.28);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.95);
    o.detune.value = (Math.random() - 0.5) * 30;
    const sh = ctx.createWaveShaper(); sh.curve = this._distCurve(8);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(sh).connect(bp).connect(g).connect(dest); o.start(t); o.stop(end);
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf;                         // ruído áspero por cima
    const nf = ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 1100;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.07, t + 0.06); ng.gain.exponentialRampToValueAtTime(0.0001, end);
    n.connect(nf).connect(ng).connect(dest); n.start(t); n.stop(end);
  }

  _whisper(t, dest) {                     // sussurros: surtos de ruído filtrado
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random() * 1500; bp.Q.value = 7;
    const g = ctx.createGain();
    let tt = t;
    for (let i = 0; i < 4; i++) {
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.11, tt + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.18);
      tt += 0.18 + Math.random() * 0.16;
    }
    s.connect(bp).connect(g).connect(dest); s.start(t); s.stop(tt + 0.2);
  }

  _gurgle(t, dest) {                      // gorgolejo úmido/garganta (tremor lento, não "blub blub")
    const ctx = this.ctx, end = t + 1.3;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 360; lp.Q.value = 5;
    const g = ctx.createGain();
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 3.5 + Math.random() * 1.5;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.07; lfo.connect(lfoG).connect(g.gain); lfo.start(t); lfo.stop(end);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, end);
    s.connect(lp).connect(g).connect(dest); s.start(t); s.stop(end);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 58;          // tom grave de garganta
    const olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 190;
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.12, t + 0.2); og.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(olp).connect(og).connect(dest); o.start(t); o.stop(end);
  }

  // som de PEGAR a chave: clink metálico + tilintar que decai + confirmação grave
  keyPickup() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 9;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.22, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    s.connect(bp).connect(sg).connect(this.master); s.start(t); s.stop(t + 0.1);
    for (const f of [1300, 1950]) {                 // dois parciais metálicos tilintando
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.75);
    }
    const lo = ctx.createOscillator(); lo.type = 'sine'; lo.frequency.value = 160;   // confirmação grave
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0.0001, t); lg.gain.exponentialRampToValueAtTime(0.12, t + 0.03); lg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    lo.connect(lg).connect(this.master); lo.start(t); lo.stop(t + 0.55);
  }

  // destino com pan estéreo (cai pro master se o navegador não tiver panner)
  _pan(pan) {
    const ctx = this.ctx;
    if (!ctx.createStereoPanner) return this.master;
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.master); return p;
  }

  // ---------- reverb por convolução p/ a cauda do tiro (eco nos prédios) ----------
  // gera uma resposta-ao-impulso sintética (ruído decaindo + reflexões iniciais).
  _makeIR(seconds, decay) {
    const ctx = this.ctx, len = (ctx.sampleRate * seconds) | 0;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) { const x = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay); }
      // slap-back das construções próximas (reflexões iniciais discretas)
      for (const [pos, amp] of [[0.011, 0.6], [0.027, 0.42], [0.051, 0.3], [0.083, 0.2]]) {
        const idx = (pos * ctx.sampleRate) | 0; if (idx < len) d[idx] += amp * (ch ? -1 : 1);
      }
    }
    return ir;
  }
  _gunVerb() {
    if (this._verb) return this._verb;
    const ctx = this.ctx;
    const conv = ctx.createConvolver(); conv.buffer = this._makeIR(0.75, 3.2);
    const wet = ctx.createGain(); wet.gain.value = 0.5; conv.connect(wet).connect(this.master);
    this._verb = conv; return conv;
  }

  // ---------- ESPINGARDA: tiro super realista (transiente + estouro + sub + eco) ----------
  // camadas: estalo agudo distorcido (pólvora) -> corpo de banda -> baque sub ->
  // cauda por convolução (eco urbano) + rack mecânico do pump. Cada tiro varia.
  shotgun() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    // se o sample real já carregou, usa ele (mais realista) + sub grave + cauda de eco
    if (this.shotBuf) { this._shotgunSample(t); return; }
    const verb = this._gunVerb();
    const off = () => Math.random() * 1.5;                 // offset no buffer -> tiros diferentes

    // barramento (soma e escala p/ não clipar) + envio pro reverb
    const bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(this.master);
    const send = ctx.createGain(); send.gain.value = 0.6; bus.connect(send); send.connect(verb);

    // 1) ESTALO / transiente da pólvora (super curto, agudo, com aspereza)
    const crack = ctx.createBufferSource(); crack.buffer = this.noiseBuf;
    const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 2600;
    const csh = ctx.createWaveShaper(); csh.curve = this._distCurve(4);
    const cg = ctx.createGain(); cg.gain.setValueAtTime(0.85, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    crack.connect(chp).connect(csh).connect(cg).connect(bus);
    crack.start(t, off()); crack.stop(t + 0.07);

    // 2) CORPO (banda média descendo)
    const mid = ctx.createBufferSource(); mid.buffer = this.noiseBuf;
    const mbp = ctx.createBiquadFilter(); mbp.type = 'bandpass'; mbp.frequency.setValueAtTime(1500, t); mbp.frequency.exponentialRampToValueAtTime(500, t + 0.12); mbp.Q.value = 0.8;
    const mg = ctx.createGain(); mg.gain.setValueAtTime(0.5, t); mg.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    mid.connect(mbp).connect(mg).connect(bus);
    mid.start(t, off()); mid.stop(t + 0.19);

    // 3) ESTOURO grave (lowpass varrendo p/ baixo)
    const low = ctx.createBufferSource(); low.buffer = this.noiseBuf;
    const llp = ctx.createBiquadFilter(); llp.type = 'lowpass'; llp.frequency.setValueAtTime(950, t); llp.frequency.exponentialRampToValueAtTime(120, t + 0.2);
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0.7, t); lg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    low.connect(llp).connect(lg).connect(bus);
    low.start(t, off()); low.stop(t + 0.32);

    // 4) SUB thump (a onda de pressão no peito)
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.setValueAtTime(145, t); sub.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.7, t + 0.008); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    sub.connect(sg).connect(bus); sub.start(t); sub.stop(t + 0.32);

    // 5) RACK do pump (mecânico): cartucho ejeta e a corrediça volta
    const clack = (tt, freq, amp) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 9;
      const g = ctx.createGain(); g.gain.setValueAtTime(amp, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04);
      s.connect(bp).connect(g).connect(this.master); s.start(tt, off()); s.stop(tt + 0.05);
    };
    clack(t + 0.20, 2500, 0.1); clack(t + 0.34, 1900, 0.12);
  }

  // toca o SAMPLE real de calibre 12 com leve variação de pitch + reforço de sub
  // (peito) + envio pro reverb por convolução (eco urbano) = bem realista.
  _shotgunSample(t) {
    const ctx = this.ctx, verb = this._gunVerb();
    const src = ctx.createBufferSource(); src.buffer = this.shotBuf;
    src.playbackRate.value = 0.93 + Math.random() * 0.14;     // cada tiro um pouco diferente
    const g = ctx.createGain(); g.gain.value = 1.0;
    src.connect(g).connect(this.master);
    const send = ctx.createGain(); send.gain.value = 0.32; g.connect(send); send.connect(verb);
    src.start(t);
    // sub thump: onda de pressão grave (a maioria das mp3 perde isso em alto-falante de laptop)
    const sub = ctx.createOscillator(); sub.type = 'sine';
    sub.frequency.setValueAtTime(145, t); sub.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.5, t + 0.01); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    sub.connect(sg).connect(this.master); sub.start(t); sub.stop(t + 0.28);
  }

  // gatilho seco sem munição
  empty() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(bp).connect(g).connect(this.master); s.start(t); s.stop(t + 0.06);
  }

  // chumbo acerta o inimigo: esguicho úmido curto (pan estéreo)
  enemyHit(pan = 0) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now(); const dest = this._pan(pan);
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(lp).connect(g).connect(dest); s.start(t); s.stop(t + 0.16);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.22, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(og).connect(dest); o.start(t); o.stop(t + 0.18);
  }

  // inimigo morre: grito gutural curto + baque do corpo (pan estéreo)
  enemyDie(pan = 0) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now(); const dest = this._pan(pan);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.45);
    const sh = ctx.createWaveShaper(); sh.curve = this._distCurve(7);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1.4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.26, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(sh).connect(bp).connect(g).connect(dest); o.start(t); o.stop(t + 0.52);
    // baque do corpo no chão
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.setValueAtTime(120, t + 0.3); b.frequency.exponentialRampToValueAtTime(40, t + 0.6);
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t + 0.3); bg.gain.exponentialRampToValueAtTime(0.3, t + 0.33); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    b.connect(bg).connect(dest); b.start(t + 0.3); b.stop(t + 0.64);
  }

  // pegar munição: chacoalho de cartuchos (clinques metálicos)
  ammoPickup() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    for (let i = 0; i < 4; i++) {
      const tt = t + i * 0.03;
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 1400; bp.Q.value = 10;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.12, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
      s.connect(bp).connect(g).connect(this.master); s.start(tt); s.stop(tt + 0.06);
    }
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 300;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.22);
  }

  // pegar item (kit/colete): bip ascendente positivo
  itemPickup() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    for (const [f, off] of [[440, 0], [660, 0.06]]) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + off); g.gain.exponentialRampToValueAtTime(0.12, t + off + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18);
      o.connect(g).connect(this.master); o.start(t + off); o.stop(t + off + 0.2);
    }
  }

  // TENTAR abrir a grade trancada (realista): trinco -> chacoalho -> ferrolho que não cede
  gateLocked() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const clink = (tt, freq, amp, dur) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 12;
      const g = ctx.createGain(); g.gain.setValueAtTime(amp, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
      s.connect(bp).connect(g).connect(this.master); s.start(tt); s.stop(tt + dur + 0.02);
    };
    // 1) mão no trinco: dois cliques secos
    clink(t, 3400, 0.16, 0.03); clink(t + 0.05, 2700, 0.13, 0.035);
    // 2) a grade chacoalha contra a tranca: rajada de clinques variados
    let tt = t + 0.13;
    for (let i = 0; i < 7; i++) { clink(tt, 1100 + Math.random() * 1700, 0.05 + Math.random() * 0.06, 0.05 + Math.random() * 0.04); tt += 0.04 + Math.random() * 0.05; }
    // 3) ressonância da grade vibrando (metal grave, Q alto)
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 230;
    const of = ctx.createBiquadFilter(); of.type = 'bandpass'; of.frequency.value = 230; of.Q.value = 16;
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t + 0.13); og.gain.exponentialRampToValueAtTime(0.05, t + 0.18); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    o.connect(of).connect(og).connect(this.master); o.start(t + 0.13); o.stop(t + 0.85);
    // 4) ferrolho pesado batendo no fim do curso (não cede)
    const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.setValueAtTime(120, tt); b.frequency.exponentialRampToValueAtTime(42, tt + 0.18);
    const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, tt); bg.gain.exponentialRampToValueAtTime(0.34, tt + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.3);
    b.connect(bg).connect(this.master); b.start(tt); b.stop(tt + 0.33);
    // 5) batida abafada do ferrolho (ruído grave)
    const ns = ctx.createBufferSource(); ns.buffer = this.noiseBuf;
    const nlp = ctx.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 300;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.18, tt); ng.gain.exponentialRampToValueAtTime(0.0001, tt + 0.18);
    ns.connect(nlp).connect(ng).connect(this.master); ns.start(tt); ns.stop(tt + 0.2);
  }

  // ABRIR a grade com a chave (realista): chave gira -> ferrolho desliza -> portão range -> clank
  gateUnlock() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const clink = (tt, freq, amp, dur) => {
      const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 10;
      const g = ctx.createGain(); g.gain.setValueAtTime(amp, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
      s.connect(bp).connect(g).connect(this.master); s.start(tt); s.stop(tt + dur + 0.02);
    };
    // 1) chave girando na fechadura (dois cliques médios)
    clink(t, 2200, 0.12, 0.04); clink(t + 0.16, 1750, 0.13, 0.05);
    // 2) ferrolho deslizando (ruído com varredura de filtro)
    const tb = t + 0.32;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, tb); bp.frequency.exponentialRampToValueAtTime(1300, tb + 0.3); bp.Q.value = 4;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.0001, tb); sg.gain.exponentialRampToValueAtTime(0.12, tb + 0.05); sg.gain.exponentialRampToValueAtTime(0.0001, tb + 0.34);
    s.connect(bp).connect(sg).connect(this.master); s.start(tb); s.stop(tb + 0.36);
    clink(tb + 0.34, 1500, 0.12, 0.05);   // trinco solta
    // 3) portão rangendo ao abrir (creak: serra grave subindo + vibrato + raspagem)
    const tc = tb + 0.45, dur = 1.3;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, tc); o.frequency.linearRampToValueAtTime(150, tc + dur);
    const vib = ctx.createOscillator(); vib.type = 'sine'; vib.frequency.value = 11; const vibG = ctx.createGain(); vibG.gain.value = 8; vib.connect(vibG).connect(o.frequency); vib.start(tc); vib.stop(tc + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 600; lp.Q.value = 3;
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, tc); og.gain.exponentialRampToValueAtTime(0.14, tc + 0.2); og.gain.exponentialRampToValueAtTime(0.0001, tc + dur);
    o.connect(lp).connect(og).connect(this.master); o.start(tc); o.stop(tc + dur + 0.05);
    const sc = ctx.createBufferSource(); sc.buffer = this.noiseBuf; sc.loop = true;
    const scf = ctx.createBiquadFilter(); scf.type = 'bandpass'; scf.frequency.value = 1800; scf.Q.value = 2;
    const scg = ctx.createGain(); scg.gain.setValueAtTime(0.0001, tc); scg.gain.exponentialRampToValueAtTime(0.05, tc + 0.2); scg.gain.exponentialRampToValueAtTime(0.0001, tc + dur);
    sc.connect(scf).connect(scg).connect(this.master); sc.start(tc); sc.stop(tc + dur);
    // 4) clank final (portão bate no batente)
    clink(tc + dur, 320, 0.16, 0.25);
  }

  // sirene de defesa civil realista: timbre mecânico (harmônicos) com lamento que sobe/desce
  siren() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now(), dur = 11;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.32, t + 1.5);     // motor "ligando"
    out.gain.setValueAtTime(0.32, t + dur - 2.6);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);   // desligando
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
    bp.connect(out).connect(this.master);

    // LFO do lamento (sobe e desce devagar) — ~0.18 Hz => ~2 ciclos no total
    const wail = ctx.createOscillator(); wail.type = 'triangle'; wail.frequency.value = 0.18;
    wail.start(t); wail.stop(t + dur);

    // harmônicos do rotor (1x/2x/3x), o lamento escala com cada harmônico
    const baseHz = 460, swing = 120;
    for (const h of [1, 2, 3]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = baseHz * h;
      o.detune.value = (Math.random() - 0.5) * 10;            // leve desafinação => batimento metálico
      const wg = ctx.createGain(); wg.gain.value = swing * h;
      wail.connect(wg).connect(o.frequency);
      const hg = ctx.createGain(); hg.gain.value = h === 1 ? 0.6 : (h === 2 ? 0.3 : 0.15);
      o.connect(hg).connect(bp);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  setHeartbeat(active, rate = 1) {
    if (!this.ready) return;
    if (active && !this._heartTimer) {
      const beat = () => {
        const ctx = this.ctx, t = this.now();
        for (const off of [0, 0.18]) {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 55;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + off);
          g.gain.exponentialRampToValueAtTime(0.5, t + off + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.18);
          o.connect(g).connect(this.heartGain); o.start(t + off); o.stop(t + off + 0.2);
        }
        this._heartTimer = setTimeout(beat, 900 / rate);
      };
      this.heartGain.gain.value = 0.9;
      beat();
    } else if (!active && this._heartTimer) {
      clearTimeout(this._heartTimer); this._heartTimer = null;
    }
  }

  // clangores metálicos aleatórios ao fundo
  _clankLoop() {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const base = 80 + Math.random() * 150;
    // impacto: ruído curto
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const sbp = ctx.createBiquadFilter(); sbp.type = 'bandpass'; sbp.frequency.value = base * 2.5; sbp.Q.value = 3;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.05, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    s.connect(sbp).connect(sg).connect(this.master); s.start(t); s.stop(t + 0.14);
    // ressonância metálica grave que decai (triângulo + bandpass alto Q soa metal, não "bip")
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = base;
    const of = ctx.createBiquadFilter(); of.type = 'bandpass'; of.frequency.value = base; of.Q.value = 14;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(of).connect(g).connect(this.master); o.start(t); o.stop(t + 1.35);
    setTimeout(() => this._clankLoop(), 5000 + Math.random() * 9000);
  }

  // ---------- IMPACTO do combo (stinger que sobe de intensidade com o tier) ----------
  // transiente seco + baque distorcido + anel metálico cada vez mais agudo/alto.
  combo(tier = 1) {
    if (!this.ready) return;
    const ctx = this.ctx, t = this.now();
    const p = Math.max(0, Math.min(7, tier - 1));            // 0..7
    // 1) transiente seco (o "punch")
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500 + p * 220;
    const sg = ctx.createGain(); sg.gain.setValueAtTime(0.4 + p * 0.03, t); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    s.connect(hp).connect(sg).connect(this.master); s.start(t); s.stop(t + 0.1);
    // 2) baque grave distorcido
    const o = ctx.createOscillator(); o.type = 'square'; const base = 170 + p * 34;
    o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 0.42, t + 0.2);
    const sh = ctx.createWaveShaper(); sh.curve = this._distCurve(8);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.34, t + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(sh).connect(og).connect(this.master); o.start(t); o.stop(t + 0.32);
    // 3) anel metálico (a "fanfarra demoníaca") — mais agudo a cada nível
    const r = ctx.createOscillator(); r.type = 'triangle'; const rf = 440 + p * 110;
    r.frequency.value = rf;
    const rfl = ctx.createBiquadFilter(); rfl.type = 'bandpass'; rfl.frequency.value = rf; rfl.Q.value = 7;
    const rg = ctx.createGain(); rg.gain.setValueAtTime(0.0001, t); rg.gain.exponentialRampToValueAtTime(0.1 + p * 0.018, t + 0.01); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    r.connect(rfl).connect(rg).connect(this.master); r.start(t); r.stop(t + 0.57);
  }

  // ==================================================================
  // MÚSICA estilo DOOM (riff ORIGINAL, sem copiar melodia) — metal pesado
  // sintetizado: chug palm-mute na corda grave + power chords + riff em Mi
  // menor com tritono + bateria (bumbo/caixa/chimbal). Tudo agendado em
  // grade de semicolcheia com lookahead.
  // ==================================================================
  startMusic() {
    if (!this.ready || this._musicOn) return;
    this._musicOn = true;
    const ctx = this.ctx;
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0.0001;
    this.musicGain.connect(this.master);
    this.musicGain.gain.exponentialRampToValueAtTime(0.5, this.now() + 1.2);   // entra subindo
    // distorção + filtro p/ as guitarras
    this._mDrive = ctx.createWaveShaper(); this._mDrive.curve = this._distCurve(36);
    this._mLP = ctx.createBiquadFilter(); this._mLP.type = 'lowpass'; this._mLP.frequency.value = 2400;
    this._mDrive.connect(this._mLP).connect(this.musicGain);
    this._step = 0;
    this._tempo = 148;                                   // bpm "frenético"
    this._nextStepTime = this.now() + 0.12;
    this._musicTimer = setInterval(() => this._musicScheduler(), 50);
  }
  // volume da música (duck no pause); ramp curto
  setMusicVolume(v, ramp = 0.3) {
    if (!this.musicGain) return;
    const g = this.musicGain.gain; const n = this.now();
    g.cancelScheduledValues(n); g.setValueAtTime(Math.max(0.0001, g.value), n);
    g.linearRampToValueAtTime(Math.max(0.0001, v), n + ramp);
  }
  stopMusic() {
    if (!this._musicOn) return;
    this._musicOn = false;
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    this.setMusicVolume(0.0001, 0.5);
  }

  _musicScheduler() {
    if (!this._musicOn) return;
    const ctx = this.ctx;
    const sec16 = 15 / this._tempo;                      // 1 semicolcheia = (60/bpm)/4
    while (this._nextStepTime < ctx.currentTime + 0.2) {
      this._musicStep(this._step, this._nextStepTime, sec16);
      this._step = (this._step + 1) % 32;               // 2 compassos de 16 semicolcheias
      this._nextStepTime += sec16;
    }
  }

  // power chord palm-mute (raiz + quinta + oitava abaixo), bem curto = "chug"
  _chug(freq, t, dur, gainv) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gainv, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this._mDrive);
    for (const [mul, ty] of [[1, 'sawtooth'], [1.4983, 'sawtooth'], [0.5, 'square']]) {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = freq * mul;
      o.connect(g); o.start(t); o.stop(t + dur + 0.02);
    }
  }
  // nota de riff/lead (mais aguda, sustenta mais, corta por cima do chug)
  _lead(freq, t, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this._mDrive);
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = 8;
    o1.connect(g); o2.connect(g); o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  _kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.musicGain); o.start(t); o.stop(t + 0.18);
  }
  _snare(t) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(bp).connect(g).connect(this.musicGain); s.start(t); s.stop(t + 0.18);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 220;
    const og = ctx.createGain(); og.gain.setValueAtTime(0.18, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(og).connect(this.musicGain); o.start(t); o.stop(t + 0.14);
  }
  _hat(t, open) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(open ? 0.12 : 0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.12 : 0.04));
    s.connect(hp).connect(g).connect(this.musicGain); s.start(t); s.stop(t + 0.14);
  }

  _musicStep(step, t, sec16) {
    // E2=82.41 (corda grave). Riff em Mi menor + tritono (Bb) p/ menção "demoníaca".
    const E2 = 82.41;
    // ----- LEAD: frase original de 32 semicolcheias (0 = silêncio), em Hz -----
    // Mi menor pentatônica (E G A B D) + Bb (tritono) -> soa sombrio, nunca "errado".
    const G3 = 196.0, A3 = 220.0, B3 = 246.94, D4 = 293.66, E4 = 329.63, Bb3 = 233.08, E3 = 164.81;
    const LEAD = [
      E4, 0, 0, B3, D4, 0, B3, 0, E4, 0, G3, A3, B3, 0, Bb3, 0,   // compasso 1
      E4, 0, 0, B3, D4, 0, E4, 0, G3, 0, E4, D4, B3, 0, A3, E3,   // compasso 2 (resolve)
    ];
    // ----- CHUG: galope de palm mute na grave; acento na batida -----
    // toca em quase toda semicolcheia (frenético); pula algumas p/ dar groove.
    const skipChug = (step % 8) === 7;                   // pequena respiração no fim de cada batida-par
    if (!skipChug) {
      const accent = (step % 4) === 0;
      // raiz alterna p/ o tritono em pontos de tensão (passos 14 e 30)
      const root = (step === 14 || step === 30) ? E2 * 1.4142 : E2;   // Bb2 ~ tritono
      this._chug(root, t, accent ? 0.12 : 0.08, accent ? 0.6 : 0.42);
    }
    // ----- LEAD -----
    const lf = LEAD[step];
    if (lf) this._lead(lf, t, sec16 * 1.8);
    // ----- BATERIA: bumbo nas semínimas, caixa no 2 e 4, chimbal em colcheias -----
    if (step % 4 === 0) this._kick(t);
    if (step === 8 || step === 24) this._kick(t);        // bumbo extra (drive)
    if (step % 8 === 4) this._snare(t);
    if (step % 2 === 0) this._hat(t, step % 8 === 6);
  }
}
