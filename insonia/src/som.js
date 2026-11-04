// Sons sintetizados (WebAudio). O trailer de 2014 não tem áudio; aqui ficam efeitos discretos
// e um zumbido grave de fundo, tudo baixo e sem agudos soltos.
let ctx = null, mestre = null, drone = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    mestre = ctx.createGain();
    mestre.gain.value = 0.55;
    mestre.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function ruido(seg) {
  const c = ac();
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seg), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function tom(freq, dur, { tipo = 'sine', vol = 0.15, ataque = 0.005, ate = null, quando = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + quando;
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(mestre);
  o.start(t); o.stop(t + dur + 0.05);
}

function chiado(dur, { vol = 0.2, f = 800, q = 1, tipo = 'bandpass', quando = 0, ataque = 0.005, f2 = null } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + quando;
  const s = c.createBufferSource(); s.buffer = ruido(dur + 0.1);
  const fl = c.createBiquadFilter(); fl.type = tipo; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(mestre);
  s.start(t); s.stop(t + dur + 0.1);
}

export const som = {
  destravar() { ac(); },
  // app em segundo plano (celular): silencia tudo; volta ao reabrir
  pausar(p) { if (!ctx) return; if (p) ctx.suspend?.(); else ctx.resume?.(); },
  cursor() { tom(520, 0.05, { tipo: 'triangle', vol: 0.05 }); },
  ok() { tom(660, 0.07, { tipo: 'triangle', vol: 0.06 }); },
  cancelar() { tom(330, 0.08, { tipo: 'triangle', vol: 0.06 }); },
  erro() { tom(140, 0.18, { tipo: 'square', vol: 0.04 }); },
  item() { tom(392, 0.35, { vol: 0.07 }); tom(523, 0.45, { vol: 0.06, quando: 0.09 }); },
  porta() { chiado(0.5, { vol: 0.12, f: 420, q: 4, f2: 900, ataque: 0.05 }); tom(110, 0.25, { tipo: 'triangle', vol: 0.08, quando: 0.4 }); },
  trancada() { for (let i = 0; i < 3; i++) chiado(0.07, { vol: 0.18, f: 1800, q: 6, quando: i * 0.09 }); },
  destrancar() { chiado(0.06, { vol: 0.2, f: 2200, q: 8 }); chiado(0.08, { vol: 0.15, f: 1400, q: 8, quando: 0.12 }); },
  metal() { tom(240, 0.6, { tipo: 'triangle', vol: 0.08 }); tom(377, 0.5, { tipo: 'triangle', vol: 0.05 }); chiado(0.15, { vol: 0.15, f: 2500, q: 2 }); },
  quebrar() { chiado(0.4, { vol: 0.25, f: 1200, q: 1 }); tom(180, 0.3, { tipo: 'square', vol: 0.05 }); },
  grito() { chiado(1.1, { vol: 0.12, f: 900, q: 3, f2: 500, ataque: 0.08 }); tom(520, 1.0, { tipo: 'sawtooth', vol: 0.025, ate: 300, ataque: 0.1 }); },
  passo() { chiado(0.08, { vol: 0.12, f: 180, q: 1, tipo: 'lowpass' }); },
  batida() { tom(90, 0.15, { vol: 0.25 }); chiado(0.08, { vol: 0.15, f: 300, q: 1, tipo: 'lowpass' }); },
  trovao() { chiado(2.5, { vol: 0.22, f: 160, q: 0.7, tipo: 'lowpass', ataque: 0.05, f2: 60 }); },
  susto() { tom(70, 1.4, { tipo: 'sawtooth', vol: 0.06, ate: 45, ataque: 0.02 }); chiado(1.2, { vol: 0.1, f: 300, q: 1, tipo: 'lowpass' }); },
  girar() { chiado(1.2, { vol: 0.12, f: 120, q: 1, tipo: 'lowpass', ataque: 0.2 }); tom(55, 1.2, { tipo: 'triangle', vol: 0.08, ataque: 0.2 }); },
  armadilha() { tom(800, 0.05, { tipo: 'square', vol: 0.05 }); chiado(0.3, { vol: 0.25, f: 2000, q: 2 }); },
  // Zumbido grave contínuo (fundo). intens 0 desliga.
  ambiente(intens = 1) {
    const c = ac(); if (!c) return;
    if (!drone) {
      drone = { g: c.createGain(), osc: [] };
      drone.g.gain.value = 0;
      const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 220;
      for (const f of [55, 55.4, 82.5]) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const g = c.createGain(); g.gain.value = 0.33;
        o.connect(g); g.connect(fl); o.start(); drone.osc.push(o);
      }
      fl.connect(drone.g); drone.g.connect(mestre);
    }
    drone.g.gain.cancelScheduledValues(c.currentTime);
    drone.g.gain.linearRampToValueAtTime(0.035 * intens, c.currentTime + 1.5);
  },
};
