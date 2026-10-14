// Paisagem sonora procedural: efeitos curtos, com textura, que não dependem de
// arquivos externos. O contexto só nasce depois de um gesto do jogador, como os
// navegadores exigem; até lá os eventos simplesmente não fazem barulho.
const STORAGE_KEY = 'canudos-som';

export class AudioManager {
  #events;
  #enabled;
  #context = null;
  #master = null;
  #reverb = null;
  #last = new Map();

  constructor({ events, root }) {
    this.#events = events;
    this.#enabled = this.#readPreference();
    this.#bindEvents();
    this.#bindControl(root);
    this.#bindInterface(root);
    document.addEventListener('pointerdown', () => this.#wake(), { once: true, capture: true });
    document.addEventListener('keydown', () => this.#wake(), { once: true, capture: true });
  }

  #bindControl(root) {
    const button = root.querySelector('#sound-toggle');
    const update = () => {
      button.setAttribute('aria-pressed', String(this.#enabled));
      button.setAttribute('aria-label', this.#enabled ? 'Desligar efeitos sonoros' : 'Ligar efeitos sonoros');
      button.title = this.#enabled ? 'Efeitos sonoros ligados' : 'Efeitos sonoros desligados';
      button.textContent = this.#enabled ? '♪' : '×';
    };
    button.addEventListener('click', () => {
      this.#enabled = !this.#enabled;
      try { localStorage.setItem(STORAGE_KEY, String(this.#enabled)); } catch { /* armazenamento opcional */ }
      if (this.#enabled) this.#wake();
      update();
    });
    update();
  }

  #bindEvents() {
    const on = (type, handler) => this.#events.on(type, handler);
    on('placed', () => this.#place());
    on('built', () => this.#built());
    on('upgraded', () => this.#upgrade());
    on('trained', () => this.#trained());
    on('waveStart', () => this.#wave());
    on('waveCleared', () => this.#clear());
    on('underAttack', () => this.#alarm());
    on('vespers', () => this.#bell());
    on('death', ({ organism }) => this.#death(organism.team));
    on('chop', () => this.#chop());
    on('gather', () => this.#gather());
    on('strike', ({ weapon, cannon }) => this.#strike(weapon, cannon));
    on('towerShot', ({ scatter }) => this.#strike('bullet', scatter));
    on('command', ({ kind }) => this.#command(kind));
    on('destroyed', () => this.#collapse());
    on('gameOver', () => this.#gameOver());
    on('convoy', () => this.#convoy());
    on('convoyTaken', () => this.#clear());
    on('convoyEscaped', () => this.#alarm());
    on('debandada', () => this.#rout());
    on('rainStart', () => this.#rain());
  }

  #bindInterface(root) {
    root.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('button')) this.#ui();
    });
  }

  #readPreference() {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  }

  #wake() {
    if (!this.#enabled || this.#context) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      this.#context = new Context();
      const compressor = this.#context.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 20;
      compressor.ratio.value = 8;
      compressor.attack.value = .003;
      compressor.release.value = .18;
      this.#master = this.#context.createGain();
      this.#master.gain.value = .3;
      this.#reverb = this.#context.createConvolver();
      this.#reverb.buffer = this.#impulse();
      const wet = this.#context.createGain();
      wet.gain.value = .13;
      this.#master.connect(compressor).connect(this.#context.destination);
      this.#reverb.connect(wet).connect(this.#master);
    } catch { this.#context = null; }
  }

  #ready(key, gap = .05) {
    if (!this.#enabled || !this.#context || !this.#master) return false;
    if (this.#context.state === 'suspended') this.#context.resume().catch(() => {});
    const now = this.#context.currentTime;
    if (now - (this.#last.get(key) ?? -Infinity) < gap) return false;
    this.#last.set(key, now);
    return true;
  }

  #tone({ frequency, endFrequency = frequency, duration = .12, type = 'sine', gain = .15, when = 0 }) {
    if (!this.#context || !this.#master) return;
    const now = this.#context.currentTime + when;
    const oscillator = this.#context.createOscillator();
    const envelope = this.#context.createGain();
    oscillator.type = type;
    oscillator.detune.value = this.#variation(9);
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + Math.min(.015, duration * .2));
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(envelope);
    this.#route(envelope, this.#variation(.45), duration > .2 ? .2 : .08);
    oscillator.start(now);
    oscillator.stop(now + duration + .03);
  }

  #noise({ duration = .08, gain = .1, cutoff = 1000, highpass = 0, resonance = 0, when = 0 }) {
    if (!this.#context || !this.#master) return;
    const sampleRate = this.#context.sampleRate;
    const buffer = this.#context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 1.7;
    const now = this.#context.currentTime + when;
    const source = this.#context.createBufferSource();
    const filter = this.#context.createBiquadFilter();
    const envelope = this.#context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = resonance;
    envelope.gain.setValueAtTime(gain, now);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter);
    if (highpass) {
      const cut = this.#context.createBiquadFilter();
      cut.type = 'highpass';
      cut.frequency.value = highpass;
      filter.connect(cut).connect(envelope);
    } else filter.connect(envelope);
    this.#route(envelope, this.#variation(.55), duration > .2 ? .17 : .05);
    source.start(now);
  }

  #route(node, pan, reverb) {
    const panner = this.#context.createStereoPanner?.();
    if (panner) {
      panner.pan.value = pan;
      node.connect(panner).connect(this.#master);
    } else node.connect(this.#master);
    if (reverb && this.#reverb) {
      const send = this.#context.createGain();
      send.gain.value = reverb;
      node.connect(send).connect(this.#reverb);
    }
  }

  #impulse() {
    const length = Math.ceil(this.#context.sampleRate * 1.15);
    const buffer = this.#context.createBuffer(2, length, this.#context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = (1 - i / length) ** 2.7;
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    return buffer;
  }

  #variation(amount) { return (Math.random() * 2 - 1) * amount; }

  #chime(frequency, gain = .07) {
    this.#tone({ frequency, endFrequency: frequency * .995, duration: 1.7, type: 'sine', gain });
    this.#tone({ frequency: frequency * 2.71, endFrequency: frequency * 2.68, duration: .8, type: 'sine', gain: gain * .22 });
    this.#tone({ frequency: frequency * 4.12, endFrequency: frequency * 4.04, duration: .42, type: 'sine', gain: gain * .1 });
  }

  #ui() { if (this.#ready('ui', .02)) this.#tone({ frequency: 680, endFrequency: 920, duration: .07, type: 'triangle', gain: .06 }); }
  #command(kind) {
    if (!this.#ready(`command-${kind}`, .07)) return;
    const sounds = {
      move: { frequency: 300, endFrequency: 370 },
      attack: { frequency: 230, endFrequency: 150 },
      gather: { frequency: 460, endFrequency: 560 },
      build: { frequency: 180, endFrequency: 130 },
      stop: { frequency: 360, endFrequency: 270 },
      train: { frequency: 520, endFrequency: 640 },
      trade: { frequency: 620, endFrequency: 760 }
    };
    const sound = sounds[kind] ?? sounds.move;
    this.#tone({ ...sound, duration: .09, type: 'triangle', gain: .055 });
  }
  #place() { if (this.#ready('place')) { this.#noise({ duration: .08, gain: .12, cutoff: 720, highpass: 90 }); this.#tone({ frequency: 130, endFrequency: 75, duration: .15, type: 'triangle', gain: .08 }); } }
  #built() { if (this.#ready('built')) { [294, 392, 494].forEach((frequency, i) => this.#tone({ frequency, duration: .3, type: 'triangle', gain: .065, when: i * .1 })); this.#noise({ duration: .16, gain: .045, cutoff: 1100, when: .02 }); } }
  #upgrade() { if (this.#ready('upgrade')) [523, 659, 784].forEach((frequency, i) => this.#chime(frequency, .042 + i * .006)); }
  #trained() { if (this.#ready('trained', .15)) { this.#tone({ frequency: 290, endFrequency: 410, duration: .12, type: 'triangle', gain: .08 }); this.#tone({ frequency: 580, duration: .08, type: 'sine', gain: .04, when: .07 }); } }
  #wave() { if (this.#ready('wave', 1)) { this.#tone({ frequency: 155, endFrequency: 98, duration: .32, type: 'sawtooth', gain: .09 }); this.#tone({ frequency: 233, endFrequency: 155, duration: .35, type: 'triangle', gain: .06, when: .12 }); } }
  #clear() { if (this.#ready('clear')) [392, 494, 659, 784].forEach((frequency, i) => this.#tone({ frequency, duration: .22, type: 'triangle', gain: .07, when: i * .08 })); }
  #alarm() { if (this.#ready('alarm', 1.2)) { this.#tone({ frequency: 310, endFrequency: 240, duration: .18, type: 'square', gain: .045 }); this.#tone({ frequency: 310, endFrequency: 240, duration: .18, type: 'square', gain: .045, when: .24 }); } }
  #bell() { if (this.#ready('bell', 2)) this.#chime(698, .08); }
  #death(team) { if (this.#ready(`death-${team}`, .16)) { this.#tone({ frequency: team === 'enemy' ? 150 : 115, endFrequency: 58, duration: .28, type: 'triangle', gain: .08 }); this.#noise({ duration: .1, gain: .045, cutoff: 340 }); } }
  #chop() { if (this.#ready('chop', .11)) { this.#noise({ duration: .035, gain: .11, cutoff: 1450, highpass: 180, resonance: 1.2 }); this.#tone({ frequency: 150, endFrequency: 72, duration: .095, type: 'triangle', gain: .075 }); } }
  #gather() { if (this.#ready('gather', .16)) { this.#noise({ duration: .045, gain: .045, cutoff: 1800 }); this.#tone({ frequency: 420, endFrequency: 510, duration: .08, type: 'sine', gain: .035 }); } }
  #strike(weapon, cannon) {
    if (!this.#ready(cannon ? 'cannon' : weapon === 'bullet' ? 'shot' : 'strike', cannon ? .35 : .09)) return;
    if (weapon === 'bullet') {
      this.#noise({ duration: cannon ? .06 : .025, gain: cannon ? .2 : .13, cutoff: cannon ? 3400 : 5200, highpass: cannon ? 180 : 900, resonance: 1.5 });
      this.#noise({ duration: cannon ? .38 : .12, gain: cannon ? .14 : .06, cutoff: cannon ? 420 : 760, highpass: 45 });
      this.#tone({ frequency: cannon ? 82 : 175, endFrequency: cannon ? 30 : 65, duration: cannon ? .45 : .13, type: 'sawtooth', gain: cannon ? .12 : .035 });
      return;
    }
    this.#noise({ duration: .045, gain: .085, cutoff: weapon === 'axe' ? 850 : 1600, highpass: 120, resonance: .8 });
    this.#tone({ frequency: weapon === 'spear' ? 280 : 170, endFrequency: 70, duration: .1, type: 'triangle', gain: .06 });
  }
  #collapse() { if (this.#ready('collapse', .5)) { this.#noise({ duration: .32, gain: .14, cutoff: 480 }); this.#tone({ frequency: 90, endFrequency: 35, duration: .4, type: 'sawtooth', gain: .08 }); } }
  #gameOver() { if (this.#ready('game-over')) [196, 147, 98].forEach((frequency, i) => this.#tone({ frequency, endFrequency: frequency * .92, duration: .5, type: 'triangle', gain: .08, when: i * .22 })); }
  #convoy() { if (this.#ready('convoy', 1)) { this.#tone({ frequency: 392, duration: .16, type: 'square', gain: .04 }); this.#tone({ frequency: 523, duration: .25, type: 'square', gain: .04, when: .18 }); } }
  #rout() { if (this.#ready('rout', .7)) { this.#noise({ duration: .16, gain: .08, cutoff: 900 }); this.#tone({ frequency: 340, endFrequency: 180, duration: .22, type: 'sawtooth', gain: .055 }); } }
  #rain() { if (this.#ready('rain', 3)) this.#noise({ duration: 3.8, gain: .032, cutoff: 2400, highpass: 380, resonance: .5 }); }
}
