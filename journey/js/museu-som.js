// O som da sala, sintetizado — nenhum arquivo de áudio para baixar.
//
// Museu tem ruído de fundo: o ar-condicionado, o eco alto do pé-direito, o passo
// de quem anda. Silêncio absoluto é a coisa mais irreal que um ambiente 3D pode
// ter, e é de graça consertar: ruído marrom filtrado, um bordão grave e um
// estalo curto por passo.
//
// Tudo passa por um único ganho mestre com rampa, então mudo é uma linha e nunca
// estala. Nada acima de 700 Hz — agudo repentino em fone de ouvido é agressão,
// e a sala aqui é grave e macia de propósito.

const CHAVE = 'museu.som';
const TETO = 700;

export function criarSom() {
  let ctx = null;
  let mestre = null;
  let ambiente = null;
  let ruidoLongo = null;
  let ruidoCurto = null;

  const salvo = (() => {
    try { return localStorage.getItem(CHAVE); } catch { return null; }
  })();
  let ligado = salvo !== 'off';

  const guardar = () => {
    try { localStorage.setItem(CHAVE, ligado ? 'on' : 'off'); } catch { /* modo privado */ }
  };

  /** Ruído marrom: passeio aleatório. Mais escuro que o branco, e é o que ar
   *  em duto e sala grande soam de verdade. */
  function fazerRuido(segundos, marrom) {
    const n = Math.floor(ctx.sampleRate * segundos);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < n; i++) {
      const branco = Math.random() * 2 - 1;
      if (marrom) {
        ultimo = (ultimo + 0.02 * branco) / 1.02;
        dados[i] = ultimo * 3.5;
      } else {
        dados[i] = branco;
      }
    }
    return buffer;
  }

  function iniciar() {
    if (ctx) return;
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    try {
      ctx = new Contexto();
    } catch {
      ctx = null;
      return;
    }

    mestre = ctx.createGain();
    mestre.gain.value = ligado ? 1 : 0;
    mestre.connect(ctx.destination);

    ruidoLongo = fazerRuido(4, true);
    ruidoCurto = fazerRuido(0.4, false);

    // Cama de ar: ruído marrom bem abafado, com respiração lenta no ganho para
    // não virar chiado estático de rádio fora de estação.
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruidoLongo;
    fonte.loop = true;

    const abafo = ctx.createBiquadFilter();
    abafo.type = 'lowpass';
    abafo.frequency.value = 320;

    ambiente = ctx.createGain();
    ambiente.gain.value = 0;

    const respiro = ctx.createOscillator();
    respiro.frequency.value = 0.055;
    const respiroGanho = ctx.createGain();
    respiroGanho.gain.value = 0.05;
    respiro.connect(respiroGanho).connect(ambiente.gain);

    fonte.connect(abafo).connect(ambiente).connect(mestre);
    fonte.start();
    respiro.start();

    // Ataque de dez segundos: a sala não liga, ela já estava ligada.
    ambiente.gain.setValueAtTime(0.0001, ctx.currentTime);
    ambiente.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 10);

    // Bordão: três senoides desafinadas de propósito. O batimento entre elas é o
    // que soa como prédio, e não como nota.
    const bordao = ctx.createGain();
    bordao.connect(mestre);
    bordao.gain.setValueAtTime(0.0001, ctx.currentTime);
    bordao.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 14);

    for (const hz of [54, 54.7, 81.4]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = hz > 60 ? 0.35 : 1;
      osc.connect(g).connect(bordao);
      osc.start();
    }
  }

  /** Estalo curto de sola em concreto. `forca` é 0..1 e vem da velocidade. */
  function passo(forca = 1) {
    if (!ctx || !ligado) return;
    const t = ctx.currentTime;

    const fonte = ctx.createBufferSource();
    fonte.buffer = ruidoCurto;
    fonte.playbackRate.value = 0.8 + Math.random() * 0.4;

    const corpo = ctx.createBiquadFilter();
    corpo.type = 'bandpass';
    corpo.frequency.value = 210 + Math.random() * 110;
    corpo.Q.value = 0.8;

    const tampa = ctx.createBiquadFilter();
    tampa.type = 'lowpass';
    tampa.frequency.value = TETO;

    const g = ctx.createGain();
    const pico = 0.05 * (0.55 + forca * 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(pico, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);

    fonte.connect(corpo).connect(tampa).connect(g).connect(mestre);
    fonte.start(t);
    fonte.stop(t + 0.32);
  }

  /** Atravessar o batente: um baque grave e uma lufada. */
  function porta() {
    if (!ctx || !ligado) return;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(96, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    osc.connect(g).connect(mestre);
    osc.start(t);
    osc.stop(t + 0.8);

    const fonte = ctx.createBufferSource();
    fonte.buffer = ruidoLongo;
    fonte.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(180, t);
    filtro.frequency.linearRampToValueAtTime(TETO, t + 0.35);
    filtro.frequency.linearRampToValueAtTime(120, t + 1.0);
    const gr = ctx.createGain();
    gr.gain.setValueAtTime(0.0001, t);
    gr.gain.linearRampToValueAtTime(0.05, t + 0.3);
    gr.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    fonte.connect(filtro).connect(gr).connect(mestre);
    fonte.start(t);
    fonte.stop(t + 1.2);
  }

  /** Toque seco de interface — abrir a lupa, trocar de foto. */
  function toque(agudo = false) {
    if (!ctx || !ligado) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(agudo ? 330 : 190, t);
    osc.frequency.exponentialRampToValueAtTime(agudo ? 220 : 130, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    const tampa = ctx.createBiquadFilter();
    tampa.type = 'lowpass';
    tampa.frequency.value = TETO;
    osc.connect(tampa).connect(g).connect(mestre);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  function alternar(valor) {
    ligado = valor ?? !ligado;
    guardar();
    if (ctx && mestre) {
      const t = ctx.currentTime;
      mestre.gain.cancelScheduledValues(t);
      mestre.gain.setValueAtTime(mestre.gain.value, t);
      mestre.gain.linearRampToValueAtTime(ligado ? 1 : 0, t + 0.3);
      if (ligado && ctx.state === 'suspended') ctx.resume();
    }
    return ligado;
  }

  // Voltar de uma aba em segundo plano com o contexto suspenso é comum no
  // celular; sem isto o museu fica mudo para sempre depois do primeiro alt-tab.
  function retomar() {
    if (ctx && ctx.state === 'suspended' && ligado) ctx.resume();
  }

  return {
    iniciar,
    passo,
    porta,
    toque,
    alternar,
    retomar,
    get ligado() { return ligado; },
  };
}
