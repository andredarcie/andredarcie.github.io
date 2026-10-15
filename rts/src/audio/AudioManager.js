// Paisagem sonora procedural, sem arquivos externos. Os sons são sintetizados em
// DSP próprio (SoundRecipes) logo que o contexto nasce, aos poucos e fora do
// caminho do quadro, e ficam guardados como buffers; o jogo só os toca, com
// posição na tela, distância e eco do sertão. O contexto só nasce depois de um
// gesto do jogador, como os navegadores exigem; até lá os eventos ficam mudos.
import { RECIPES } from './SoundRecipes.js';
import { random, outdoorImpulse } from './Dsp.js';

const STORAGE_KEY = 'canudos-som';
const MASTER_VOLUME = .8;
const REVERB_RETURN = .55;

// Mixagem: `level` iguala a sonoridade (os buffers saem todos com o mesmo pico),
// `reverb` é o envio para o eco do campo, `pitch` a variação de afinação por
// toque, `gap` o intervalo mínimo entre dois iguais, `group`/`voices` o teto de
// vozes simultâneas e `reach` quanto a distância da câmera pesa (0 = sempre perto).
const SOUNDS = {
  ui: { level: .22, reverb: .02, pitch: .03, gap: .03, group: 'ui', reach: 0 },
  'command-move': { level: .3, reverb: .05, gap: .07, group: 'ui', reach: 0 },
  'command-stop': { level: .32, reverb: .05, gap: .07, group: 'ui', reach: 0 },
  'command-attack': { level: .22, reverb: .06, pitch: .03, gap: .07, group: 'ui', reach: 0 },
  'command-gather': { level: .3, reverb: .05, gap: .07, group: 'ui', reach: 0 },
  'command-build': { level: .28, reverb: .05, pitch: .04, gap: .07, group: 'ui', reach: 0 },
  'command-train': { level: .26, reverb: .05, gap: .07, group: 'ui', reach: 0 },
  'command-trade': { level: .2, reverb: .05, pitch: .03, gap: .07, group: 'ui', reach: 0 },

  'shot-musket': { level: .4, reverb: .3, pitch: .06, gap: .035, group: 'gun' },
  'shot-blunderbuss': { level: .38, reverb: .32, pitch: .05, gap: .035, group: 'gun' },
  'shot-rifle': { level: .36, reverb: .32, pitch: .05, gap: .035, group: 'gun' },
  'shot-cannon': { level: .6, reverb: .35, pitch: .04, gap: .25, group: 'cannon' },
  'shot-matadeira': { level: .75, reverb: .4, pitch: .03, gap: .25, group: 'cannon' },
  'shell-burst': { level: .45, reverb: .3, pitch: .06, gap: .2, group: 'cannon' },

  'strike-club': { level: .42, reverb: .1, pitch: .07, gap: .04, group: 'melee' },
  'strike-machete': { level: .5, reverb: .1, pitch: .06, gap: .04, group: 'melee' },
  'strike-spear': { level: .45, reverb: .1, pitch: .07, gap: .04, group: 'melee' },
  'strike-bayonet': { level: .45, reverb: .1, pitch: .06, gap: .04, group: 'melee' },
  'strike-saber': { level: .45, reverb: .12, pitch: .05, gap: .04, group: 'melee' },

  'death-player': { level: .46, reverb: .12, pitch: .06, gap: .08, group: 'death' },
  'death-enemy': { level: .44, reverb: .12, pitch: .06, gap: .08, group: 'death' },

  hammer: { level: .3, reverb: .12, pitch: .06, gap: .06, group: 'work' },
  chop: { level: .4, reverb: .16, pitch: .04, gap: .07, group: 'work' },
  'tree-crack': { level: .42, reverb: .2, pitch: .05, gap: .3, group: 'tree' },
  'tree-land': { level: .55, reverb: .22, pitch: .05, gap: .3, group: 'tree' },
  gather: { level: .32, reverb: .06, pitch: .06, gap: .12, group: 'work' },
  place: { level: .4, reverb: .1, pitch: .04, gap: .08, group: 'event', reach: .5 },
  built: { level: .45, reverb: .14, gap: .3, group: 'event', reach: .3 },
  upgrade: { level: .4, reverb: .16, gap: .3, group: 'event', reach: 0 },
  trained: { level: .32, reverb: .12, pitch: .01, gap: .15, group: 'event', reach: .4 },
  'wave-start': { level: .24, reverb: .22, gap: 1, group: 'call', reach: 0 },
  'wave-clear': { level: .5, reverb: .14, gap: 1, group: 'call', reach: 0 },
  alarm: { level: .32, reverb: .18, gap: 2.4, group: 'call', reach: .25 },
  vespers: { level: .36, reverb: .25, gap: 4, group: 'call', reach: .2 },
  convoy: { level: .42, reverb: .2, gap: 1, group: 'call', reach: 0 },
  rout: { level: .3, reverb: .22, gap: 1, group: 'call', reach: .35 },
  collapse: { level: .42, reverb: .22, pitch: .05, gap: .4, group: 'event', reach: .5 },
  'game-over': { level: .45, reverb: .25, gap: 2, group: 'call', reach: 0 },
  rain: { level: .26, reverb: .08, gap: 4, group: 'weather', reach: 0 }
};

// Teto de vozes por grupo: num tiroteio, a décima espingarda não acrescenta nada
// além de lama no som.
const VOICES = { tree: 4, ui: 3, gun: 9, cannon: 4, melee: 6, death: 4, work: 4, event: 4, call: 3, weather: 1 };

// Ordem de preparo: o que toca logo nos primeiros segundos vem primeiro.
const WARM_ORDER = [
  'ui', 'command-move', 'command-gather', 'command-attack', 'command-build', 'command-train', 'command-stop', 'command-trade',
  'place', 'chop', 'hammer', 'tree-crack', 'tree-land', 'gather', 'built', 'trained', 'wave-start', 'shot-musket', 'shot-rifle', 'strike-club', 'strike-machete',
  'strike-spear', 'strike-bayonet', 'death-player', 'death-enemy', 'shot-blunderbuss', 'alarm', 'wave-clear', 'upgrade',
  'shot-cannon', 'shell-burst', 'strike-saber', 'collapse', 'rout', 'convoy', 'vespers', 'shot-matadeira', 'rain', 'game-over'
];

const MELEE = new Set(['club', 'machete', 'spear', 'bayonet', 'saber']);

export class AudioManager {
  #events;
  #enabled;
  #camera = null;
  #context = null;
  #bus = null;
  #master = null;
  #reverb = null;
  #bank = new Map();
  #warmQueue = [];
  #lastVariant = new Map();
  #last = new Map();
  #voices = new Map();
  #recentShots = [];

  constructor({ events, root, camera = null }) {
    this.#events = events;
    this.#camera = camera;
    this.#enabled = this.#readPreference();
    this.#bindEvents();
    this.#bindControl(root);
    this.#bindInterface(root);
    document.addEventListener('pointerdown', () => this.#wake(), { once: true, capture: true });
    document.addEventListener('keydown', () => this.#wake(), { once: true, capture: true });
    document.addEventListener('visibilitychange', () => this.#handleVisibility());
  }

  #bindControl(root) {
    const button = root.querySelector('#sound-toggle');
    const update = () => {
      button.setAttribute('aria-checked', String(this.#enabled));
      button.setAttribute('aria-label', this.#enabled ? 'Desligar efeitos sonoros' : 'Ligar efeitos sonoros');
      button.title = this.#enabled ? 'Efeitos sonoros ligados' : 'Efeitos sonoros desligados';
      button.textContent = this.#enabled ? '♪' : '×';
    };
    button.addEventListener('click', () => {
      this.#enabled = !this.#enabled;
      try { localStorage.setItem(STORAGE_KEY, String(this.#enabled)); } catch { /* armazenamento opcional */ }
      if (this.#enabled) this.#wake();
      this.#setMasterVolume();
      update();
    });
    update();
  }

  #bindEvents() {
    const on = (type, handler) => this.#events.on(type, handler);
    const at = thing => thing ? { x: thing.x, y: thing.y } : {};
    on('placed', ({ building }) => this.#play('place', at(building)));
    on('built', ({ building }) => this.#play('built', at(building)));
    on('upgraded', () => this.#play('upgrade'));
    on('trained', ({ building }) => this.#play('trained', at(building)));
    on('waveStart', () => this.#play('wave-start'));
    on('waveCleared', () => this.#play('wave-clear'));
    on('convoyTaken', () => this.#play('wave-clear'));
    on('underAttack', place => this.#play('alarm', at(place)));
    on('convoyEscaped', () => this.#play('alarm'));
    on('vespers', place => this.#play('vespers', at(place)));
    on('death', ({ organism }) => this.#play(organism.team === 'enemy' ? 'death-enemy' : 'death-player', at(organism)));
    on('chop', place => this.#play('chop', at(place)));
    on('hammer', place => this.#play('hammer', at(place)));
    on('treeFall', place => this.#play('tree-crack', at(place)));
    on('treeLand', place => this.#play('tree-land', at(place)));
    on('gather', place => this.#play('gather', at(place)));
    on('strike', strike => this.#strike(strike));
    on('towerShot', ({ scatter, x, y }) => this.#play(scatter ? 'shot-blunderbuss' : 'shot-musket', { x, y }));
    on('command', ({ kind }) => this.#play(`command-${kind}`));
    on('destroyed', ({ building }) => this.#play('collapse', at(building)));
    on('gameOver', () => this.#play('game-over'));
    on('convoy', () => this.#play('convoy'));
    on('debandada', place => this.#play('rout', at(place)));
    on('rainStart', () => this.#play('rain'));
  }

  #strike({ weapon, x, y, tx, ty }) {
    if (weapon === 'cannon' || weapon === 'matadeira') {
      this.#play(`shot-${weapon}`, { x, y });
      // A granada chega depois do estampido, no lugar onde cai.
      if (tx !== undefined) this.#play('shell-burst', { x: tx, y: ty, delay: .32, gap: false });
      return;
    }
    if (weapon === 'rifle') this.#play('shot-rifle', { x, y });
    else if (weapon === 'blunderbuss') this.#play('shot-musket', { x, y });
    else this.#play(`strike-${MELEE.has(weapon) ? weapon : 'club'}`, { x, y });
  }

  #bindInterface(root) {
    root.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('button')) this.#play('ui');
    });
  }

  #readPreference() {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  }

  // ---- Grafo ----

  // Fonte → [abafador de distância] → ganho → pan → barramento → cola (compressor
  // suave) → limitador → volume → saída. O eco volta para a cola, assim tiroteio
  // com reverb também passa pelo limitador e nada estoura.
  #wake() {
    if (!this.#enabled || this.#context) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      try { this.#context = new Context({ latencyHint: 'interactive' }); }
      catch { this.#context = new Context(); }
      const context = this.#context;
      const glue = context.createDynamicsCompressor();
      glue.threshold.value = -18;
      glue.knee.value = 10;
      glue.ratio.value = 3;
      glue.attack.value = .008;
      glue.release.value = .22;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = .001;
      limiter.release.value = .09;
      this.#bus = context.createGain();
      this.#master = context.createGain();
      this.#master.gain.value = MASTER_VOLUME;
      this.#bus.connect(glue).connect(limiter).connect(this.#master).connect(context.destination);
      const impulse = outdoorImpulse(context.sampleRate);
      this.#reverb = context.createConvolver();
      this.#reverb.buffer = this.#toBuffer(impulse);
      const back = context.createGain();
      back.gain.value = REVERB_RETURN;
      this.#reverb.connect(back).connect(glue);
      this.#warmQueue = WARM_ORDER.flatMap(name => Array.from({ length: RECIPES[name].variants }, (_, index) => [name, index]));
      this.#warmNext();
    } catch { this.#context = null; }
  }

  // Prepara uma variação por vez, quando o navegador está ocioso: o conjunto
  // inteiro leva pouco mais de um segundo de cálculo, que assim não trava quadro.
  #warmNext() {
    const step = () => {
      const started = performance.now();
      while (this.#warmQueue.length && performance.now() - started < 8) {
        const [name, index] = this.#warmQueue.shift();
        this.#variant(name, index);
      }
      if (this.#warmQueue.length) this.#warmNext();
    };
    if (window.requestIdleCallback) window.requestIdleCallback(step, { timeout: 400 });
    else setTimeout(step, 16);
  }

  #variant(name, index) {
    let list = this.#bank.get(name);
    if (!list) this.#bank.set(name, list = []);
    if (!list[index]) {
      const recipe = RECIPES[name];
      const seed = 9973 * (index + 1) + [...name].reduce((sum, char) => sum * 31 + char.charCodeAt(0) | 0, 7);
      list[index] = this.#toBuffer(recipe.make(this.#context.sampleRate, random(seed)), .9);
    }
    return list[index];
  }

  // Sorteia uma variação já pronta, sem repetir a última; se nenhuma estiver pronta
  // ainda, prepara a primeira na hora.
  #pick(name) {
    const ready = (this.#bank.get(name) ?? []).map((buffer, index) => buffer ? index : -1).filter(index => index >= 0);
    if (!ready.length) return this.#variant(name, 0);
    const last = this.#lastVariant.get(name);
    const options = ready.length > 1 ? ready.filter(index => index !== last) : ready;
    const index = options[Math.floor(Math.random() * options.length)];
    this.#lastVariant.set(name, index);
    return this.#bank.get(name)[index];
  }

  #toBuffer(sound, peakTarget = 0) {
    const channels = sound.l ? [sound.l, sound.r] : [sound];
    let peak = 0;
    if (peakTarget) for (const data of channels) for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const scale = peak > 0 ? peakTarget / peak : 1;
    const buffer = this.#context.createBuffer(channels.length, channels[0].length, this.#context.sampleRate);
    channels.forEach((data, channel) => {
      if (scale !== 1) for (let i = 0; i < data.length; i++) data[i] *= scale;
      buffer.copyToChannel(data, channel);
    });
    return buffer;
  }

  // ---- Tocar ----

  #play(name, { x, y, delay = 0, gap = true } = {}) {
    const spec = SOUNDS[name];
    if (!spec || !this.#enabled || !this.#context || !this.#bus) return;
    const context = this.#context;
    if (context.state === 'suspended') context.resume().catch(() => {});
    const now = context.currentTime;
    if (gap && now - (this.#last.get(name) ?? -Infinity) < spec.gap) return;
    const group = spec.group;
    if ((this.#voices.get(group) ?? 0) >= VOICES[group]) return;
    this.#last.set(name, now);

    const place = this.#locate(x, y, spec.reach ?? 1);
    if (place.gain < .02) return;
    let level = spec.level * place.gain;
    if (group === 'gun') level *= this.#crowd(now);

    try {
      const source = context.createBufferSource();
      source.buffer = this.#pick(name);
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * (spec.pitch ?? 0);
      let tail = source;
      if (place.cutoff) {
        const air = context.createBiquadFilter();
        air.type = 'lowpass';
        air.frequency.value = place.cutoff;
        air.Q.value = .5;
        tail = tail.connect(air);
      }
      const gain = context.createGain();
      gain.gain.value = level;
      tail = tail.connect(gain);
      const panner = context.createStereoPanner?.();
      if (panner) {
        panner.pan.value = place.pan;
        tail.connect(panner).connect(this.#bus);
      } else tail.connect(this.#bus);
      // Longe soa mais molhado: chega menos som direto e o mesmo tanto de eco.
      const send = context.createGain();
      send.gain.value = Math.min(1, spec.reverb * place.wet / Math.max(.25, place.gain));
      gain.connect(send).connect(this.#reverb);
      this.#voices.set(group, (this.#voices.get(group) ?? 0) + 1);
      source.onended = () => {
        this.#voices.set(group, Math.max(0, (this.#voices.get(group) ?? 1) - 1));
        source.disconnect();
        send.disconnect();
      };
      source.start(now + delay);
    } catch { /* som é enfeite: falha aqui não pode derrubar o jogo */ }
  }

  // Tiroteio: cada disparo novo entra um pouco mais baixo enquanto muitos soam
  // juntos, para a fuzilaria somar volume sem virar parede.
  #crowd(now) {
    this.#recentShots = this.#recentShots.filter(time => now - time < .7);
    this.#recentShots.push(now);
    return 1 / Math.sqrt(Math.max(1, this.#recentShots.length / 2));
  }

  // Onde o som está em relação ao que se vê: lado da tela vira pan; fora da tela,
  // quanto mais longe, mais baixo, mais abafado (o ar come o agudo) e mais eco.
  #locate(x, y, reach) {
    const camera = this.#camera;
    if (x === undefined || y === undefined || !camera || !reach) return { pan: 0, gain: 1, cutoff: 0, wet: 1 };
    const point = camera.project(x, y);
    const nx = point.x / camera.viewWidth - .5;
    const ny = point.y / camera.viewHeight - .5;
    const outside = Math.hypot(Math.max(0, Math.abs(nx) - .5), Math.max(0, Math.abs(ny) - .5)) * 2;
    const distance = outside * reach;
    return {
      pan: Math.max(-.8, Math.min(.8, nx * 1.5)),
      gain: 1 / (1 + distance * 2.4),
      cutoff: distance > .02 ? Math.max(650, 18000 / (1 + distance * 7)) : 0,
      wet: 1 + distance * 1.5
    };
  }

  #handleVisibility() {
    if (!this.#context) return;
    if (document.hidden) {
      this.#context.suspend().catch(() => {});
      return;
    }
    if (this.#enabled) this.#context.resume().catch(() => {});
  }

  #setMasterVolume() {
    if (!this.#context || !this.#master) return;
    const now = this.#context.currentTime;
    this.#master.gain.cancelScheduledValues(now);
    this.#master.gain.setTargetAtTime(this.#enabled ? MASTER_VOLUME : .0001, now, .012);
  }
}
