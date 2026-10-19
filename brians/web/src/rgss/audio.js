// Audio do RGSS2 em WebAudio: BGM e BGS em loop, ME uma vez (pausa a BGM e
// a retoma ao terminar), SE sobrepostos. Volume 0–100 e pitch 50–150 (%):
// o RGSS muda o pitch alterando a velocidade, igual ao playbackRate.
// Se a mesma BGM/BGS já está tocando, só ajusta volume e pitch (não reinicia).
import { resolver, url } from '../arquivos.js';
import { faixaGerada, bufferDe } from '../musica/catalogo.js';

const EXTENSOES = ['.ogg', '.wav', '.mp3', '.mid', '.midi', '.wma'];
const RETORNO_BGM_MS = 1000; // fade-in da BGM depois de uma ME

export class Audio {
  constructor() {
    this.ctx = null;
    this.buffers = new Map(); // caminho real → Promise<AudioBuffer|null>
    this.canais = { bgm: novoCanal(), bgs: novoCanal(), me: novoCanal() };
    this.ses = new Set();
    this.bgmPausada = null; // { nome, volume, pitch, posicao } enquanto uma ME toca
    this.avisados = new Set();
  }

  // Precisa de um gesto do usuário (política de autoplay).
  iniciar() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.mestre = this.ctx.createGain();
      this.mestre.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  carregar(nome) {
    // música gerada por código (src/musica/): renderizada uma vez, no lugar do arquivo
    const gerada = faixaGerada(nome);
    if (gerada) {
      return bufferDe(gerada).catch((e) => { this.avisar(`falha ao gerar ${gerada.id}: ${e}`); return null; });
    }
    const real = resolver(nome, EXTENSOES);
    if (!real) { this.avisar(`áudio não encontrado: ${nome}`); return Promise.resolve(null); }
    if (/\.(mid|midi)$/i.test(real)) { this.avisar(`MIDI ainda sem sintetizador: ${real}`); return Promise.resolve(null); }
    if (!this.buffers.has(real)) {
      this.buffers.set(real, fetch(url(real))
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx.decodeAudioData(b))
        .catch((e) => { this.avisar(`falha ao decodificar ${real}: ${e}`); return null; }));
    }
    return this.buffers.get(real);
  }

  avisar(msg) { if (!this.avisados.has(msg)) { this.avisados.add(msg); console.warn(msg); } }

  // ------------------------------------------------------------ canais com loop
  tocar(qual, nome, volume, pitch, loop, posicao = 0, fadeInMs = 0) {
    if (!this.ctx) return;
    const c = this.canais[qual];
    const chave = String(nome).replace(/\\/g, '/').toLowerCase();
    if (c.chave === chave && c.ativo) {
      c.volume = volume; c.pitch = pitch;
      if (c.ganho) c.ganho.gain.setTargetAtTime(volume / 100, this.ctx.currentTime, 0.01);
      if (c.fonte) c.fonte.playbackRate.value = pitch / 100;
      return;
    }
    this.parar(qual);
    Object.assign(c, { chave, nome, volume, pitch, ativo: true, token: c.token + 1 });
    const token = c.token;
    this.carregar(nome).then((buffer) => {
      if (!buffer || c.token !== token) return;
      const fonte = this.ctx.createBufferSource();
      fonte.buffer = buffer; fonte.loop = loop;
      fonte.playbackRate.value = pitch / 100;
      const ganho = this.ctx.createGain();
      const agora = this.ctx.currentTime;
      if (fadeInMs > 0) {
        ganho.gain.setValueAtTime(0, agora);
        ganho.gain.linearRampToValueAtTime(volume / 100, agora + fadeInMs / 1000);
      } else ganho.gain.value = volume / 100;
      fonte.connect(ganho).connect(this.mestre);
      const inicio = loop ? posicao % buffer.duration : 0;
      fonte.start(0, inicio);
      c.fonte = fonte; c.ganho = ganho; c.buffer = buffer;
      c.inicioContexto = agora; c.posicaoInicial = inicio;
      fonte.onended = () => {
        if (c.fonte !== fonte) return;
        c.fonte = null; c.ativo = false; c.chave = null;
        if (qual === 'me') this.fimDaMe();
      };
    });
  }

  posicao(c) {
    if (!c.fonte || !c.buffer) return 0;
    return (c.posicaoInicial + (this.ctx.currentTime - c.inicioContexto) * (c.pitch / 100)) % c.buffer.duration;
  }

  parar(qual) {
    const c = this.canais[qual];
    c.token++;
    if (c.fonte) { const f = c.fonte; c.fonte = null; try { f.stop(); } catch { /* já parou */ } }
    c.ativo = false; c.chave = null;
  }

  fade(qual, ms) {
    const c = this.canais[qual];
    if (!this.ctx || !c.ativo) return;
    if (!c.ganho || !c.fonte) { this.parar(qual); return; }
    const agora = this.ctx.currentTime;
    c.ganho.gain.cancelScheduledValues(agora);
    c.ganho.gain.setValueAtTime(c.ganho.gain.value, agora);
    c.ganho.gain.linearRampToValueAtTime(0, agora + Math.max(0, ms) / 1000);
    const fonte = c.fonte;
    c.chave = null; // tocar a mesma música durante o fade reinicia, como no RGSS
    c.token++;
    setTimeout(() => {
      if (c.fonte === fonte) { c.fonte = null; c.ativo = false; try { fonte.stop(); } catch { /* ok */ } }
    }, Math.max(0, ms));
  }

  // ------------------------------------------------------------ API do RGSS
  bgmPlay(nome, volume, pitch) {
    if (this.canais.me.ativo) { this.bgmPausada = { nome, volume, pitch, posicao: 0 }; return; }
    this.tocar('bgm', nome, volume, pitch, true);
  }
  bgmStop() { this.bgmPausada = null; this.parar('bgm'); }
  bgmFade(ms) { this.bgmPausada = null; this.fade('bgm', ms); }

  bgsPlay(nome, volume, pitch) { this.tocar('bgs', nome, volume, pitch, true); }
  bgsStop() { this.parar('bgs'); }
  bgsFade(ms) { this.fade('bgs', ms); }

  mePlay(nome, volume, pitch) {
    const bgm = this.canais.bgm;
    if (bgm.ativo && !this.bgmPausada) {
      this.bgmPausada = { nome: bgm.nome, volume: bgm.volume, pitch: bgm.pitch, posicao: this.posicao(bgm) };
      this.parar('bgm');
    }
    this.parar('me');
    this.tocar('me', nome, volume, pitch, false);
  }
  meStop() { this.parar('me'); this.fimDaMe(); }
  meFade(ms) { this.fade('me', ms); setTimeout(() => this.fimDaMe(), Math.max(0, ms)); }

  fimDaMe() {
    const p = this.bgmPausada;
    this.bgmPausada = null;
    if (p && !this.canais.me.ativo) this.tocar('bgm', p.nome, p.volume, p.pitch, true, p.posicao, RETORNO_BGM_MS);
  }

  sePlay(nome, volume, pitch) {
    if (!this.ctx) return;
    this.carregar(nome).then((buffer) => {
      if (!buffer) return;
      const fonte = this.ctx.createBufferSource();
      fonte.buffer = buffer;
      fonte.playbackRate.value = pitch / 100;
      const ganho = this.ctx.createGain();
      ganho.gain.value = volume / 100;
      fonte.connect(ganho).connect(this.mestre);
      fonte.onended = () => this.ses.delete(fonte);
      this.ses.add(fonte);
      fonte.start();
    });
  }
  seStop() { for (const f of this.ses) { try { f.stop(); } catch { /* ok */ } } this.ses.clear(); }
}

function novoCanal() {
  return { chave: null, nome: null, volume: 100, pitch: 100, ativo: false, token: 0, fonte: null, ganho: null, buffer: null, inicioContexto: 0, posicaoInicial: 0 };
}
