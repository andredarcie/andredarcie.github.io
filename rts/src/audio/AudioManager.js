// Paisagem sonora procedural: efeitos curtos, com textura, que não dependem de
// arquivos externos. O contexto só nasce depois de um gesto do jogador, como os
// navegadores exigem; até lá os eventos simplesmente não fazem barulho.
const STORAGE_KEY = 'canudos-som';

export class AudioManager {
  #events;
  #enabled;
  #context = null;
  #master = null;
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
      this.#master.gain.value = .34;
      this.#master.connect(compressor).connect(this.#context.destination);
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
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + Math.min(.015, duration * .2));
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(envelope).connect(this.#master);
    oscillator.start(now);
    oscillator.stop(now + duration + .03);
  }

  #noise({ duration = .08, gain = .1, cutoff = 1000, when = 0 }) {
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
    envelope.gain.setValueAtTime(gain, now);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(envelope).connect(this.#master);
    source.start(now);
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
  #place() { if (this.#ready('place')) { this.#noise({ duration: .07, gain: .11, cutoff: 620 }); this.#tone({ frequency: 150, endFrequency: 95, duration: .11, type: 'triangle', gain: .09 }); } }
  #built() { if (this.#ready('built')) { [392, 494, 587].forEach((frequency, i) => this.#tone({ frequency, duration: .23, type: 'triangle', gain: .08, when: i * .09 })); } }
  #upgrade() { if (this.#ready('upgrade')) { [523, 659, 784].forEach((frequency, i) => this.#tone({ frequency, duration: .18, type: 'sine', gain: .07, when: i * .075 })); } }
  #trained() { if (this.#ready('trained', .15)) { this.#tone({ frequency: 290, endFrequency: 410, duration: .12, type: 'triangle', gain: .08 }); this.#tone({ frequency: 580, duration: .08, type: 'sine', gain: .04, when: .07 }); } }
  #wave() { if (this.#ready('wave', 1)) { this.#tone({ frequency: 155, endFrequency: 98, duration: .32, type: 'sawtooth', gain: .09 }); this.#tone({ frequency: 233, endFrequency: 155, duration: .35, type: 'triangle', gain: .06, when: .12 }); } }
  #clear() { if (this.#ready('clear')) [392, 494, 659, 784].forEach((frequency, i) => this.#tone({ frequency, duration: .22, type: 'triangle', gain: .07, when: i * .08 })); }
  #alarm() { if (this.#ready('alarm', 1.2)) { this.#tone({ frequency: 310, endFrequency: 240, duration: .18, type: 'square', gain: .045 }); this.#tone({ frequency: 310, endFrequency: 240, duration: .18, type: 'square', gain: .045, when: .24 }); } }
  #bell() { if (this.#ready('bell', 2)) { this.#tone({ frequency: 880, endFrequency: 860, duration: 1.4, type: 'sine', gain: .075 }); this.#tone({ frequency: 1320, endFrequency: 1290, duration: .9, type: 'sine', gain: .025 }); } }
  #death(team) { if (this.#ready(`death-${team}`, .16)) { this.#tone({ frequency: team === 'enemy' ? 150 : 115, endFrequency: 58, duration: .28, type: 'triangle', gain: .08 }); this.#noise({ duration: .1, gain: .045, cutoff: 340 }); } }
  #chop() { if (this.#ready('chop', .11)) { this.#noise({ duration: .055, gain: .09, cutoff: 1150 }); this.#tone({ frequency: 175, endFrequency: 100, duration: .07, type: 'triangle', gain: .07 }); } }
  #gather() { if (this.#ready('gather', .16)) { this.#noise({ duration: .045, gain: .045, cutoff: 1800 }); this.#tone({ frequency: 420, endFrequency: 510, duration: .08, type: 'sine', gain: .035 }); } }
  #strike(weapon, cannon) {
    if (!this.#ready(cannon ? 'cannon' : weapon === 'bullet' ? 'shot' : 'strike', cannon ? .35 : .09)) return;
    if (weapon === 'bullet') {
      this.#noise({ duration: cannon ? .2 : .075, gain: cannon ? .18 : .095, cutoff: cannon ? 520 : 1800 });
      this.#tone({ frequency: cannon ? 75 : 210, endFrequency: cannon ? 34 : 110, duration: cannon ? .32 : .09, type: 'sawtooth', gain: cannon ? .13 : .05 });
      return;
    }
    this.#noise({ duration: .045, gain: .07, cutoff: weapon === 'axe' ? 700 : 1250 });
    this.#tone({ frequency: weapon === 'spear' ? 280 : 180, endFrequency: 95, duration: .075, type: 'triangle', gain: .055 });
  }
  #collapse() { if (this.#ready('collapse', .5)) { this.#noise({ duration: .32, gain: .14, cutoff: 480 }); this.#tone({ frequency: 90, endFrequency: 35, duration: .4, type: 'sawtooth', gain: .08 }); } }
  #gameOver() { if (this.#ready('game-over')) [196, 147, 98].forEach((frequency, i) => this.#tone({ frequency, endFrequency: frequency * .92, duration: .5, type: 'triangle', gain: .08, when: i * .22 })); }
  #convoy() { if (this.#ready('convoy', 1)) { this.#tone({ frequency: 392, duration: .16, type: 'square', gain: .04 }); this.#tone({ frequency: 523, duration: .25, type: 'square', gain: .04, when: .18 }); } }
  #rout() { if (this.#ready('rout', .7)) { this.#noise({ duration: .16, gain: .08, cutoff: 900 }); this.#tone({ frequency: 340, endFrequency: 180, duration: .22, type: 'sawtooth', gain: .055 }); } }
  #rain() { if (this.#ready('rain', 3)) this.#noise({ duration: 3.8, gain: .025, cutoff: 1500 }); }
}
