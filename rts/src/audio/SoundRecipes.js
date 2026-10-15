// Receitas dos sons de Canudos. Cada uma desenha um som inteiro numa amostragem
// `sr` a partir de um gerador `rand` (uma semente por variação, para tiro nenhum
// sair idêntico ao anterior) e devolve mono (Float32Array) ou estéreo ({ l, r }).
// A paleta segue o lugar e a época: pólvora negra e Mannlicher, canhão Krupp,
// sino de igreja, corneta do Exército, viola caipira, madeira de caatinga.
import {
  between, samples, white, pink, brown, filter, sweep, shape, hit, mix, modes,
  pluck, saturate, fade, echo, widen
} from './Dsp.js';

const TAU = Math.PI * 2;
const empty = (sr, seconds) => new Float32Array(samples(sr, seconds));

// ---------------------------------------------------------------- blocos comuns

// Senoide com glissando exponencial de `from` a `to`: o soco grave de tiro, queda
// e tambor.
function thump(sr, seconds, from, to, glide, envelope) {
  const out = empty(sr, seconds);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    phase += TAU * (to + (from - to) * Math.exp(-t / glide)) / sr;
    out[i] = Math.sin(phase) * envelope(t);
  }
  return out;
}

// Ruído com envelope e filtro numa tacada só.
function burst(sr, rand, seconds, { color = 'white', type = 'lowpass', frequency = 2000, q = .7, envelope }) {
  const n = samples(sr, seconds);
  const noise = color === 'pink' ? pink(n, rand) : color === 'brown' ? brown(n, rand) : white(n, rand);
  if (typeof frequency === 'function') sweep(noise, type, sr, frequency, q);
  else filter(noise, type, sr, frequency, q);
  return envelope ? shape(noise, sr, envelope) : noise;
}

// Estalos soltos e curtos (pólvora queimando, lasca, terra caindo). A densidade
// cai com o tempo porque `spread` empurra os sorteios para o começo.
function crackle(target, sr, rand, { count, from = 0, span, gain, cutoff = 2500, spread = 2 }) {
  for (let k = 0; k < count; k++) {
    const at = from + span * Math.pow(rand(), spread);
    const grain = burst(sr, rand, .0025, { type: 'highpass', frequency: cutoff * between(rand, .7, 1.4), envelope: hit(.0001, .0005) });
    mix(target, grain, at * sr, gain * between(rand, .25, 1) * (rand() < .5 ? -1 : 1));
  }
  return target;
}

// Lufada de ar do golpe: ruído rosa num passa-banda que varre `from`→`to`, com
// envelope em corcova (cresce e some), como lâmina cortando o ar.
function whoosh(sr, rand, seconds, from, to, q = 1.4) {
  const noise = pink(samples(sr, seconds), rand);
  sweep(noise, 'bandpass', sr, t => from * Math.pow(to / from, Math.min(1, t / seconds)), q);
  return shape(noise, sr, t => Math.pow(Math.sin(Math.PI * Math.min(1, t / seconds)), 1.6));
}

// ---------------------------------------------------------------- armas de fogo

// Disparo em camadas: estalo (onda de choque), corpo (gás saindo pelo cano),
// soco grave, ronco de cauda, fagulhas e eco das encostas.
function gunshot(sr, rand, p) {
  const out = empty(sr, p.seconds);
  // Onda em N: pressão sobe de uma vez e desce em rampa — o "crack" seco.
  const nwave = samples(sr, p.nwave);
  for (let i = 0; i < nwave; i++) out[i] += (1 - 2 * i / nwave) * p.crack;
  mix(out, burst(sr, rand, p.crackTau * 9, { type: 'highpass', frequency: p.crackHp, envelope: hit(.00005, p.crackTau) }), 0, p.crack * .8);
  const bodyTo = p.bodyTo, bodyFrom = p.bodyFrom;
  mix(out, burst(sr, rand, p.bodyTau * 10, {
    frequency: t => bodyTo + (bodyFrom - bodyTo) * Math.exp(-t / (p.bodyTau * 1.4)), q: .9,
    envelope: hit(.0003, p.bodyTau)
  }), 0, p.body);
  mix(out, saturate(thump(sr, p.thumpTau * 8, p.thumpFrom, p.thumpTo, .02, hit(.0015, p.thumpTau)), 2.2), 0, p.thump);
  mix(out, burst(sr, rand, p.tailTau * 7, { color: 'brown', frequency: p.tailCut, q: .6, envelope: hit(.012, p.tailTau) }), 0, p.tail);
  if (p.sparks) crackle(out, sr, rand, { count: p.sparks, from: .003, span: p.sparkSpan, gain: p.sparkGain, cutoff: 3200 });
  filter(out, 'highpass', sr, 28, .7);
  for (const [delay, gain, cutoff] of p.echoes) echo(out, sr, delay * between(rand, .85, 1.2), gain * between(rand, .7, 1.1), cutoff);
  saturate(out, p.drive);
  return fade(out, sr, 0, .08);
}

// Bacamarte e espingarda de carregar pela boca: pólvora negra, soco mais gordo,
// muita fagulha e fumaça (cauda longa).
function musket(sr, rand, heavy) {
  return gunshot(sr, rand, {
    seconds: heavy ? 1.7 : 1.4, nwave: .0007, crack: .7, crackHp: 1800, crackTau: .0012,
    body: 1, bodyFrom: between(rand, 4800, 6500), bodyTo: heavy ? 520 : 700, bodyTau: heavy ? .034 : .026,
    thump: heavy ? 1 : .8, thumpFrom: between(rand, 120, 150), thumpTo: heavy ? 38 : 48, thumpTau: heavy ? .11 : .085,
    tail: heavy ? .55 : .42, tailCut: 520, tailTau: heavy ? .36 : .28,
    sparks: heavy ? 22 : 12, sparkSpan: heavy ? .2 : .14, sparkGain: .2,
    echoes: [[between(rand, .2, .3), .2, 1400], [between(rand, .45, .62), .09, 900]], drive: 1.6
  });
}

// Fuzil Mannlicher do Exército: pólvora sem fumaça, estalo agudo e estreito,
// corpo curto; o que se ouve longe é o estampido batendo nos morros.
function rifle(sr, rand) {
  return gunshot(sr, rand, {
    seconds: 1.3, nwave: .00045, crack: 1, crackHp: 2600, crackTau: .0008,
    body: .75, bodyFrom: between(rand, 7500, 9500), bodyTo: 1300, bodyTau: .016,
    thump: .55, thumpFrom: 170, thumpTo: between(rand, 62, 75), thumpTau: .055,
    tail: .28, tailCut: 800, tailTau: .22,
    sparks: 0, echoes: [[between(rand, .18, .26), .26, 2200], [between(rand, .4, .55), .12, 1200]], drive: 1.8
  });
}

// Canhão Krupp e Matadeira: boca de fogo que se sente no peito. Estéreo, com o
// ronco rolando pelos morros (cada canal com o seu).
function cannon(sr, rand, heavy) {
  const seconds = heavy ? 4.6 : 3.8;
  const core = gunshot(sr, rand, {
    seconds, nwave: .0012, crack: .55, crackHp: 900, crackTau: .003,
    body: 1, bodyFrom: 3200, bodyTo: heavy ? 150 : 200, bodyTau: heavy ? .14 : .11,
    thump: 1.1, thumpFrom: 90, thumpTo: heavy ? 26 : 32, thumpTau: heavy ? .42 : .34,
    tail: .7, tailCut: 260, tailTau: heavy ? 1.2 : .95,
    sparks: 30, sparkSpan: .35, sparkGain: .12,
    echoes: [[.55, .3, 700], [1.15, .18, 500], [1.9, .1, 380]], drive: 1.9
  });
  const { l, r } = widen(core, sr, .25);
  for (const channel of [l, r]) {
    const roll = burst(sr, rand, seconds, { color: 'brown', frequency: 180, q: .5 });
    // Rolar irregular: o eco chega aos pedaços, de encostas a distâncias diferentes.
    let level = 0, goal = 0;
    for (let i = 0; i < roll.length; i++) {
      const t = i / sr;
      if (i % 2048 === 0) goal = between(rand, .2, 1);
      level += (goal - level) * .0008;
      roll[i] *= level * Math.min(1, t / .08) * Math.exp(-t / (heavy ? 1.5 : 1.15));
    }
    mix(channel, roll, sr * .03, .55);
    fade(channel, sr, 0, .4);
  }
  return { l, r };
}

// Granada caindo: estouro surdo de terra, sem estalo de cano, e chuva de torrão.
function shellBurst(sr, rand) {
  const out = empty(sr, 2.6);
  mix(out, burst(sr, rand, .9, { frequency: t => 140 + 2400 * Math.exp(-t / .07), q: .8, envelope: hit(.001, .09) }), 0, 1);
  mix(out, saturate(thump(sr, 1.2, 110, 34, .03, hit(.003, .22)), 2.4), 0, 1);
  mix(out, burst(sr, rand, 2.2, { color: 'brown', frequency: 220, q: .5, envelope: hit(.03, .7) }), 0, .5);
  // Terra e pedra caindo de volta.
  for (let k = 0; k < 70; k++) {
    const at = .12 + 1.4 * Math.pow(rand(), 1.6);
    const clod = burst(sr, rand, .02, { type: 'bandpass', frequency: between(rand, 700, 3000), q: 1.2, envelope: hit(.0003, .004) });
    mix(out, clod, at * sr, between(rand, .03, .12) * Math.exp(-at * 1.4));
  }
  echo(out, sr, between(rand, .5, .7), .2, 600);
  saturate(out, 1.7);
  return widen(fade(out, sr, 0, .3), sr, .3);
}

// ---------------------------------------------------------------- golpes

// Pancada de madeira: soco grave + modos de pau, abafado pelo que recebe o golpe.
function woodHit(sr, rand, target, at, base, gain = 1, damp = 1) {
  const local = empty(sr, .4);
  mix(local, thump(sr, .3, base * .7, base * .42, .015, hit(.001, .045 * damp)), 0, .9);
  modes(local, sr, 0, [
    { f: base * between(rand, .97, 1.03), a: .6, d: .05 * damp },
    { f: base * between(rand, 2.2, 2.5), a: .35, d: .032 * damp },
    { f: base * between(rand, 3.8, 4.4), a: .18, d: .02 * damp }
  ], { rand });
  mix(local, burst(sr, rand, .08, { frequency: 1400, envelope: hit(.0005, .012) }), 0, .45);
  return mix(target, local, at * sr, gain);
}

// Lâmina batendo e cantando: modos inarmônicos de aço fino.
function bladeRing(sr, rand, target, at, base, gain, sustain = 1) {
  modes(target, sr, at, [
    { f: base, a: .5, d: .09 * sustain },
    { f: base * between(rand, 1.58, 1.66), a: .32, d: .07 * sustain },
    { f: base * between(rand, 2.3, 2.45), a: .22, d: .05 * sustain },
    { f: base * between(rand, 3.4, 3.6), a: .12, d: .035 * sustain }
  ], { rand, gain });
  mix(target, burst(sr, rand, .02, { type: 'highpass', frequency: 3000, envelope: hit(.0002, .003) }), at * sr, gain * .6);
  return target;
}

function melee(sr, rand, weapon) {
  const out = empty(sr, .7);
  const swing = {
    club: [.13, 380, 1100, 1.1], machete: [.1, 1100, 3600, 1.8], spear: [.09, 420, 1300, 1.5],
    bayonet: [.1, 600, 1700, 1.5], saber: [.17, 900, 4200, 2]
  }[weapon] ?? [.13, 380, 1100, 1.1];
  const [length, from, to, q] = swing;
  mix(out, whoosh(sr, rand, length * between(rand, .9, 1.15), from, to, q), 0, .55);
  const at = length * .85;
  if (weapon === 'machete') {
    woodHit(sr, rand, out, at, between(rand, 150, 190), .7, .8);
    bladeRing(sr, rand, out, at, between(rand, 2600, 3100), .22, .8);
    mix(out, burst(sr, rand, .06, { type: 'bandpass', frequency: 2400, q: .8, envelope: hit(.0005, .01) }), at * sr, .5);
  } else if (weapon === 'saber') {
    woodHit(sr, rand, out, at, between(rand, 170, 210), .55, .7);
    bladeRing(sr, rand, out, at, between(rand, 3000, 3400), .3, 2.2);
  } else if (weapon === 'bayonet') {
    woodHit(sr, rand, out, at, between(rand, 150, 180), .8, .9);
    bladeRing(sr, rand, out, at - .004, between(rand, 1800, 2100), .18, .6);
  } else if (weapon === 'spear') {
    woodHit(sr, rand, out, at, between(rand, 170, 220), .85, 1.1);
  } else {
    woodHit(sr, rand, out, at, between(rand, 120, 150), 1, 1.3);
  }
  filter(out, 'highpass', sr, 50, .7);
  return fade(out, sr, .002, .1);
}

// ---------------------------------------------------------------- vozes e corpos

const VOWELS = { a: [720, 1180, 2550], o: [520, 900, 2450], u: [360, 760, 2350], e: [520, 1650, 2500] };

// Gemido curto: pulso glotal (Rosenberg) com tremor, passado por três formantes.
// Baixo e breve de propósito — é a respiração que escapa na queda, não um grito.
function groan(sr, rand, { seconds, from, to, vowel }) {
  const n = samples(sr, seconds);
  const source = new Float32Array(n);
  let phase = 0, previous = 0, jitter = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    if (i % 64 === 0) jitter = (rand() - .5) * .04;
    phase += (to + (from - to) * Math.exp(-t / (seconds * .5))) * (1 + jitter) / sr;
    phase -= Math.floor(phase);
    const g = phase < .4 ? .5 - .5 * Math.cos(Math.PI * phase / .4) : phase < .6 ? Math.cos(Math.PI * (phase - .4) / .4) : 0;
    source[i] = (g - previous) * 8 + (rand() - .5) * .25 * g;
    previous = g;
  }
  const out = empty(sr, seconds);
  VOWELS[vowel].forEach((f, k) => mix(out, filter(Float32Array.from(source), 'bandpass', sr, f * between(rand, .94, 1.06), 5 + k * 3), 0, [1, .55, .25][k]));
  shape(out, sr, t => Math.min(1, t / .035) * Math.exp(-t / (seconds * .45)));
  return out;
}

// Corpo caindo no chão batido: baque, poeira e (soldado) o equipamento chacoalhando.
function bodyFall(sr, rand, soldier) {
  const out = empty(sr, 1.1);
  const fallAt = between(rand, .16, .24);
  mix(out, groan(sr, rand, {
    seconds: between(rand, .28, .4), from: between(rand, 150, 190), to: between(rand, 85, 105),
    vowel: ['a', 'o', 'u', 'e'][Math.floor(rand() * 4)]
  }), 0, .22);
  mix(out, thump(sr, .4, 95, 48, .02, hit(.002, .07)), fallAt * sr, .9);
  mix(out, burst(sr, rand, .3, { frequency: 700, envelope: hit(.002, .05) }), fallAt * sr, .45);
  mix(out, burst(sr, rand, .7, { color: 'pink', type: 'bandpass', frequency: 1300, q: .6, envelope: hit(.03, .16) }), (fallAt + .01) * sr, .12);
  if (soldier) {
    for (let k = 0; k < 4; k++) {
      modes(out, sr, fallAt + between(rand, .005, .09), [
        { f: between(rand, 1900, 2600), a: .12, d: .03 }, { f: between(rand, 3800, 4600), a: .06, d: .02 }
      ], { rand });
    }
  }
  filter(out, 'highpass', sr, 40, .7);
  return fade(out, sr, .002, .1);
}

// ---------------------------------------------------------------- madeira e trabalho

// Machado entrando em tronco verde. O que faz soar como machado, e não como
// pancada qualquer: o ataque é seco e brilhante (o gume corta antes do peso
// chegar), o tronco responde com um "toc" oco e curto — madeira viva amortece
// rápido —, o aço da cabeça vibra um instante, a fibra rasga em estalinhos e, às
// vezes, uma lasca cai no chão. A mata devolve o golpe em eco.
function chop(sr, rand) {
  const out = empty(sr, .9);
  mix(out, burst(sr, rand, .006, { type: 'highpass', frequency: 2500, envelope: hit(.00003, .0007) }), 0, 1);
  mix(out, burst(sr, rand, .06, { type: 'bandpass', frequency: between(rand, 1800, 2600), q: .9, envelope: hit(.0002, .007) }), 0, .9);
  const knock = between(rand, 520, 780);
  modes(out, sr, 0, [
    { f: knock, a: .55, d: .022 }, { f: knock * between(rand, 1.5, 1.7), a: .3, d: .016 },
    { f: knock * between(rand, 2.4, 2.7), a: .16, d: .011 }
  ], { rand });
  mix(out, thump(sr, .3, between(rand, 190, 230), between(rand, 110, 135), .01, hit(.0008, .04)), 0, .75);
  modes(out, sr, .0005, [{ f: between(rand, 2900, 3400), a: .05, d: .05 }, { f: between(rand, 5200, 6000), a: .03, d: .03 }], { rand });
  crackle(out, sr, rand, { count: Math.floor(between(rand, 6, 12)), from: .002, span: .05, gain: .18, cutoff: 2800, spread: 1.5 });
  if (rand() < .5) {
    modes(out, sr, between(rand, .22, .4), [{ f: between(rand, 1400, 1900), a: .1, d: .01 }, { f: between(rand, 3000, 3600), a: .05, d: .006 }], { rand });
  }
  echo(out, sr, between(rand, .13, .2), .14, 1800);
  echo(out, sr, between(rand, .32, .42), .06, 1200);
  filter(out, 'highpass', sr, 80, .7);
  return fade(out, sr, 0, .12);
}

// Rangido de fibra cedendo: atrito de agarra-e-solta, uma série de estalinhos
// cada vez mais juntos conforme o tronco se inclina, passados pelas ressonâncias
// da madeira. Grave e irregular, como tronco grosso gemendo.
function creak(sr, rand, seconds, from, to, gain) {
  const n = samples(sr, seconds);
  const pulses = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    phase += (from + (to - from) * t * t) * (1 + (rand() - .5) * .5) / sr;
    if (phase >= 1) {
      phase -= 1;
      pulses[i] = (rand() < .5 ? -1 : 1) * between(rand, .3, 1);
    }
  }
  const out = empty(sr, seconds);
  mix(out, filter(Float32Array.from(pulses), 'bandpass', sr, between(rand, 380, 480), 3), 0, 1);
  mix(out, filter(Float32Array.from(pulses), 'bandpass', sr, between(rand, 1000, 1300), 4), 0, .6);
  mix(out, filter(pulses, 'bandpass', sr, between(rand, 2200, 2600), 5), 0, .25);
  // Cresce e falha: a fibra geme aos arrancos, não num som contínuo.
  let level = 0, goal = 0;
  return shape(out, sr, t => {
    if (rand() < .0015) goal = between(rand, .25, 1);
    level += (goal - level) * .002;
    return level * Math.min(1, t / .25) * Math.min(1, (seconds - t) / .2) * gain;
  });
}

// O tronco começa a tombar: estalo grande do último golpe abrindo a madeira,
// rangido crescendo, galhos estalando cada vez mais e a copa ganhando
// velocidade no ar. O baque fica para `treeLand`, tocado quando ela bate.
function treeCrack(sr, rand) {
  const seconds = 3.6;
  const channels = [];
  const shared = empty(sr, seconds);
  mix(shared, burst(sr, rand, .1, { type: 'highpass', frequency: 900, envelope: hit(.0001, .006) }), 0, .9);
  woodHit(sr, rand, shared, 0, between(rand, 150, 190), .8, 1.4);
  crackle(shared, sr, rand, { count: 30, from: .005, span: .25, gain: .3, cutoff: 2200, spread: 2.2 });
  mix(shared, creak(sr, rand, 2.9, between(rand, 18, 28), between(rand, 70, 110), 1), .2 * sr, .7);
  for (let c = 0; c < 2; c++) {
    const out = Float32Array.from(shared);
    // Estalos de fibra e galho: raros no começo, juntos no fim.
    crackle(out, sr, rand, { count: 45, from: .4, span: 2.8, gain: .14, cutoff: 1800, spread: .45 });
    for (let k = 0; k < 4; k++) woodHit(sr, rand, out, between(rand, 1.2, 3), between(rand, 250, 420), between(rand, .08, .2), .8);
    // Copa cortando o ar: folhagem num passa-banda que sobe com a velocidade.
    mix(out, burst(sr, rand, seconds, {
      color: 'pink', type: 'bandpass', frequency: t => 700 + 2600 * Math.max(0, (t - 1.4) / 2), q: .7,
      envelope: t => Math.pow(Math.max(0, (t - 1.2) / 2.1), 2.2) * Math.min(1, (seconds - t) / .35)
    }), 0, .5);
    filter(out, 'highpass', sr, 50, .7);
    channels.push(fade(out, sr, 0, .3));
  }
  return { l: channels[0], r: channels[1] };
}

// A árvore bate no chão: baque surdo do tronco, a copa se arrebentando em galho
// quebrado e folha, um quique menor e a folhagem assentando.
function treeLand(sr, rand) {
  const seconds = 3;
  const shared = empty(sr, seconds);
  mix(shared, saturate(thump(sr, 1, 85, 36, .025, hit(.002, .17)), 2.2), 0, 1);
  mix(shared, burst(sr, rand, .5, { frequency: 900, envelope: hit(.001, .05) }), 0, .7);
  mix(shared, burst(sr, rand, seconds, { color: 'brown', frequency: 160, q: .5, envelope: hit(.01, .4) }), 0, .45);
  const bounce = between(rand, .2, .3);
  mix(shared, thump(sr, .6, 70, 40, .02, hit(.002, .09)), bounce * sr, .35);
  const channels = [];
  for (let c = 0; c < 2; c++) {
    const out = Float32Array.from(shared);
    crackle(out, sr, rand, { count: 70, from: .003, span: .6, gain: .22, cutoff: 1600, spread: 1.8 });
    for (let k = 0; k < 7; k++) woodHit(sr, rand, out, between(rand, 0, .45), between(rand, 260, 600), between(rand, .1, .3), .7);
    mix(out, burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: 2600, q: .5, envelope: hit(.004, .35) }), 0, .45);
    // Folhas e gravetos assentando.
    for (let k = 0; k < 22; k++) {
      const at = .3 + 1.6 * Math.pow(rand(), 1.4);
      const length = between(rand, .02, .07);
      mix(out, burst(sr, rand, length, {
        color: 'pink', type: 'bandpass', frequency: between(rand, 2500, 5500), q: 1,
        envelope: t => Math.sin(Math.PI * Math.min(1, t / length))
      }), at * sr, between(rand, .04, .12) * Math.exp(-at));
    }
    echo(out, sr, between(rand, .22, .3), .15, 900);
    filter(out, 'highpass', sr, 30, .7);
    saturate(out, 1.3);
    channels.push(fade(out, sr, 0, .5));
  }
  return { l: channels[0], r: channels[1] };
}

// Mão na moita: folhas raspando em grãos e um graveto que estala.
function gather(sr, rand) {
  const out = empty(sr, .55);
  const grains = Math.floor(between(rand, 9, 15));
  for (let k = 0; k < grains; k++) {
    const length = between(rand, .02, .06);
    const leaf = burst(sr, rand, length, {
      color: 'pink', type: 'bandpass', frequency: between(rand, 2500, 5500), q: between(rand, .8, 1.6),
      envelope: t => Math.sin(Math.PI * Math.min(1, t / length))
    });
    mix(out, leaf, between(rand, 0, .32) * sr, between(rand, .3, 1));
  }
  modes(out, sr, between(rand, .08, .2), [{ f: between(rand, 1500, 2100), a: .35, d: .012 }, { f: between(rand, 3200, 3900), a: .2, d: .008 }], { rand });
  filter(out, 'highpass', sr, 300, .7);
  return fade(out, sr, .003, .08);
}

// Estacas assentadas no chão: baque de madeira e poeira.
function place(sr, rand) {
  const out = empty(sr, .7);
  woodHit(sr, rand, out, 0, between(rand, 140, 170), 1, 1.5);
  woodHit(sr, rand, out, between(rand, .06, .09), between(rand, 190, 230), .45, 1);
  mix(out, burst(sr, rand, .6, { color: 'pink', type: 'bandpass', frequency: 900, q: .5, envelope: hit(.01, .12) }), 0, .22);
  return fade(out, sr, 0, .1);
}

// Martelo em prego e caibro.
function hammer(sr, rand, target, at, gain = 1) {
  modes(target, sr, at, [
    { f: between(rand, 1050, 1250), a: .4, d: .03 }, { f: between(rand, 2400, 2800), a: .25, d: .02 },
    { f: between(rand, 4100, 4600), a: .1, d: .012 }
  ], { rand, gain });
  return woodHit(sr, rand, target, at, between(rand, 230, 290), gain * .8, .8);
}

// Desmoronar de casa de taipa e madeira: um estalo grande, vigas caindo cada vez
// mais juntas, ronco de terra e poeira assentando.
function collapse(sr, rand) {
  const seconds = 3.2;
  const channels = [empty(sr, seconds), empty(sr, seconds)];
  const shared = empty(sr, seconds);
  woodHit(sr, rand, shared, 0, 110, 1, 2);
  mix(shared, burst(sr, rand, .25, { type: 'highpass', frequency: 1200, envelope: hit(.0003, .03) }), 0, .6);
  mix(shared, burst(sr, rand, seconds, { color: 'brown', frequency: 200, q: .5, envelope: t => Math.min(1, t / .15) * Math.exp(-t / .9) }), 0, .7);
  let at = .18;
  while (at < 1.5) {
    const side = channels[rand() < .5 ? 0 : 1];
    woodHit(sr, rand, side, at, between(rand, 120, 320), between(rand, .3, .8), between(rand, 1, 2));
    crackle(side, sr, rand, { count: 6, from: at, span: .1, gain: .15, cutoff: 2600 });
    at += between(rand, .05, .22) * (1.3 - at / 1.6);
  }
  for (const channel of channels) {
    mix(channel, shared, 0, 1);
    mix(channel, burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: 1800, q: .5, envelope: t => Math.min(1, t / .3) * Math.exp(-t / .8) }), .1 * sr, .12);
    crackle(channel, sr, rand, { count: 40, from: .4, span: 1.6, gain: .05, cutoff: 1800, spread: 1.3 });
    saturate(channel, 1.4);
    fade(channel, sr, 0, .4);
  }
  return { l: channels[0], r: channels[1] };
}

// ---------------------------------------------------------------- viola caipira

// Viola caipira: cinco pares de cordas, os graves em oitava. Um par é a corda e a
// gêmea levemente desafinada (ou a oitava), o que dá o brilho de dez cordas.
function violaNote(sr, rand, frequency, seconds, { octave = false, damp = .35, bright = .65, decay = 2.2 } = {}) {
  const main = pluck(sr, frequency, seconds, rand, { damp, bright, decay });
  const twin = pluck(sr, frequency * (octave ? 2 : 1) * between(rand, 1.0012, 1.0028), seconds, rand, { damp, bright, decay: decay * (octave ? .7 : 1) });
  return mix(main, twin, between(rand, 3, 9) * sr / 1000, octave ? .45 : .8);
}

// Caixa de ressonância: realça o grave do tampo e a presença das cordas.
function violaBody(data, sr) {
  filter(data, 'highpass', sr, 75, .7);
  filter(data, 'peak', sr, 115, 1.4, 4);
  filter(data, 'peak', sr, 240, 1.2, 3);
  filter(data, 'peak', sr, 2700, 1, 2.5);
  return filter(data, 'lowpass', sr, 7500, .7);
}

// Toca uma lista de notas: [frequência, instante, { opções }].
function viola(sr, rand, seconds, notes) {
  const out = empty(sr, seconds);
  for (const [frequency, at, options = {}] of notes) {
    mix(out, violaNote(sr, rand, frequency, Math.min(seconds - at, options.length ?? seconds), options), at * sr, options.gain ?? 1);
  }
  violaBody(out, sr);
  return fade(out, sr, .001, .25);
}

// Afinação cebolão em ré, a mais tocada no sertão.
const D3 = 146.83, A3 = 220, Cs4 = 277.18, D4 = 293.66, E4 = 329.63, F4 = 349.23,
  Fs4 = 369.99, G4 = 392, A4 = 440, D5 = 587.33;

const strum = (chord, at, spacing = .016, options = {}) => chord.map((f, i) => [f, at + i * spacing, { octave: f < 200, ...options }]);

// ---------------------------------------------------------------- sinos

// Sino de igreja: parciais de sino afinado (hum, prima, terça menor, quinta,
// nominal...), cada uma em par desafinado para o batimento, e o badalo batendo.
function bell(sr, rand, target, at, prime, { gain = 1, decay = 1, bright = 1 } = {}) {
  const partials = [
    [.5, .55, 3.4], [1, .42, 2.4], [1.19, .5, 1.8], [1.5, .2, 1.2], [2, .6, 1.1],
    [2.52, .2, .75], [2.67, .17, .6], [3.01, .15, .5], [4.06, .1 * bright, .32], [5.2, .06 * bright, .2], [6.4, .04 * bright, .13]
  ];
  for (const [ratio, amplitude, length] of partials) {
    modes(target, sr, at, [{ f: prime * ratio * between(rand, .997, 1.003), a: amplitude, d: length * decay }], { rand, gain, beat: between(rand, .5, 1.8), attack: .001 });
  }
  mix(target, burst(sr, rand, .05, { type: 'highpass', frequency: 1500, envelope: hit(.0002, .004) }), at * sr, gain * .25);
  return target;
}

// ---------------------------------------------------------------- corneta e caixa

// Corneta de metal: aditivo com brilho que acompanha a força do sopro — no ataque
// o agudo explode (o "blat" do metal) e no sustento acalma; afinação entra de
// baixo e ganha vibrato depois de firmar.
function bugle(sr, rand, seconds, notes) {
  const out = empty(sr, seconds);
  for (const { f, at, length, force = 1 } of notes) {
    const n = samples(sr, length + .09);
    const start = Math.round(at * sr);
    const phases = new Float64Array(16).map(() => rand() * TAU);
    for (let i = 0; i < n && start + i < out.length; i++) {
      const t = i / sr;
      const release = t > length ? Math.max(0, 1 - (t - length) / .09) : 1;
      const amp = Math.min(1, t / .03) * release * force;
      const brightness = (t < .05 ? .55 + .45 * Math.sin(Math.PI * t / .05) : .62) * release * force;
      const vibrato = t > .16 ? .0045 * Math.sin(TAU * 5.3 * t) * Math.min(1, (t - .16) / .15) : 0;
      const pitch = f * (1 - .035 * Math.exp(-t / .018)) * (1 + vibrato);
      let sample = 0;
      for (let k = 1; k <= 16; k++) {
        const frequency = pitch * k;
        if (frequency > sr * .45) break;
        phases[k - 1] += TAU * frequency / sr;
        sample += Math.sin(phases[k - 1]) * Math.exp(-(k - 1) * (1.9 - 1.5 * brightness)) / Math.sqrt(k);
      }
      out[start + i] += sample * amp;
    }
    mix(out, burst(sr, rand, length, { color: 'pink', type: 'bandpass', frequency: f * 4, q: 2, envelope: hit(.02, length * .6) }), start, .04);
  }
  filter(out, 'highpass', sr, 160, .7);
  filter(out, 'peak', sr, 1250, 1, 4);
  return filter(out, 'lowpass', sr, 5200, .7);
}

// Toque de caixa clara: pele, aro e esteira.
function snare(sr, rand, target, at, gain) {
  const local = empty(sr, .3);
  modes(local, sr, 0, [{ f: between(rand, 180, 195), a: .6, d: .03 }, { f: 330, a: .3, d: .02 }], { rand });
  mix(local, burst(sr, rand, .3, { type: 'bandpass', frequency: 3600, q: .6, envelope: hit(.0005, .055) }), 0, .9);
  mix(local, burst(sr, rand, .3, { type: 'highpass', frequency: 2200, envelope: hit(.002, .09) }), 0, .4);
  return mix(target, local, at * sr, gain);
}

// Zabumba: pele grande e grave, batida de maço.
function zabumba(sr, rand, target, at, gain) {
  const base = between(rand, 78, 88);
  const local = empty(sr, .8);
  mix(local, thump(sr, .7, base * 1.5, base, .012, hit(.001, .2)), 0, 1);
  modes(local, sr, 0, [{ f: base * 1.59, a: .3, d: .1 }, { f: base * 2.14, a: .18, d: .07 }, { f: base * 2.65, a: .1, d: .05 }], { rand });
  mix(local, burst(sr, rand, .03, { frequency: 2200, envelope: hit(.0003, .004) }), 0, .35);
  return mix(target, local, at * sr, gain);
}

// ---------------------------------------------------------------- receitas

function waveStart(sr, rand) {
  // Toque de avançar: G4 C5 E5 G5, três curtas e a longa, repetindo o fim.
  const g = 392, c = 523.25, e = 659.25, gg = 783.99;
  const notes = [
    { f: g, at: .9, length: .13 }, { f: c, at: 1.07, length: .13 }, { f: e, at: 1.24, length: .13 },
    { f: gg, at: 1.41, length: .48 }, { f: e, at: 1.95, length: .13, force: .9 }, { f: gg, at: 2.12, length: .7 }
  ];
  const seconds = 3.6;
  const horn = bugle(sr, rand, seconds, notes);
  echo(horn, sr, .32, .22, 1800);
  echo(horn, sr, .7, .1, 1100);
  const drums = empty(sr, seconds);
  // Rufo de caixa crescendo até a corneta entrar.
  for (let k = 0; k < 13; k++) snare(sr, rand, drums, k * .066, (.25 + .6 * k / 12) * (k % 2 ? .8 : 1));
  snare(sr, rand, drums, .9, 1);
  zabumba(sr, rand, drums, .9, .8);
  zabumba(sr, rand, drums, 1.41, .5);
  const out = mix(horn, drums, 0, .55);
  return widen(fade(out, sr, 0, .4), sr, .3);
}

function rout(sr, rand) {
  // Corneta tocando retirada aos atropelos, nota caindo no fim, e gente correndo.
  const seconds = 2.6;
  const horn = bugle(sr, rand, seconds, [
    { f: 783.99, at: 0, length: .12 }, { f: 659.25, at: .15, length: .12 }, { f: 523.25, at: .3, length: .12 },
    { f: 392 * .97, at: .45, length: .45, force: .8 }
  ]);
  const out = mix(empty(sr, seconds), horn, 0, .8);
  for (let k = 0; k < 28; k++) {
    const at = between(rand, .2, 2.1);
    const step = burst(sr, rand, .06, { frequency: between(rand, 900, 1800), q: .8, envelope: hit(.002, .012) });
    mix(out, step, at * sr, between(rand, .15, .35) * (1 - at / 2.6));
  }
  return widen(fade(out, sr, 0, .3), sr, .35);
}

function convoy(sr, rand) {
  // Carro de boi de Monte Santo: roda de madeira gemendo e chocalho do boi.
  const seconds = 2.8;
  const out = empty(sr, seconds);
  for (const [at, length] of [[0, .55], [.9, .7], [1.85, .6]]) {
    const n = samples(sr, length);
    const creak = new Float32Array(n);
    const from = between(rand, 330, 420), to = from * between(rand, 1.15, 1.4);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      phase += (from + (to - from) * t) * (1 + (rand() - .5) * .08) / sr;
      phase -= Math.floor(phase);
      creak[i] = (phase * 2 - 1) * Math.pow(Math.sin(Math.PI * t), .7);
    }
    const wood = Float32Array.from(creak);
    filter(creak, 'bandpass', sr, 950, 4);
    filter(wood, 'bandpass', sr, 2200, 5);
    mix(out, mix(creak, wood, 0, .6), at * sr, .4);
  }
  // Chocalho: o badalo bate no balanço do passo, forte-fraco irregular.
  for (let k = 0; k < 7; k++) {
    const at = .1 + k * between(rand, .33, .42);
    if (at > seconds - .4) break;
    const base = between(rand, 540, 580);
    modes(out, sr, at, [
      { f: base, a: .3, d: .16 }, { f: base * 1.52, a: .22, d: .12 }, { f: base * 2.04, a: .15, d: .08 },
      { f: base * 2.76, a: .1, d: .05 }, { f: base * 3.41, a: .06, d: .035 }
    ], { rand, gain: k % 2 ? .55 : 1 });
  }
  filter(out, 'highpass', sr, 120, .7);
  return widen(fade(out, sr, .002, .3), sr, .3);
}

function rain(sr, rand) {
  // Pancada de chuva no sertão: trovão distante, a chuva chegando, gotas.
  const seconds = 6.5;
  const channels = [];
  for (let c = 0; c < 2; c++) {
    const out = empty(sr, seconds);
    mix(out, burst(sr, rand, seconds, {
      color: 'pink', type: 'bandpass', frequency: 3800, q: .35,
      envelope: t => Math.min(1, t / 1.8) * Math.min(1, (seconds - t) / 1.6)
    }), 0, .35);
    for (let k = 0; k < 2600; k++) {
      const at = seconds * Math.pow(rand(), .8);
      const density = Math.min(1, at / 1.8) * Math.min(1, (seconds - at) / 1.6);
      if (rand() > density) continue;
      modes(out, sr, at, [{ f: between(rand, 1800, 6500), a: between(rand, .02, .09), d: between(rand, .0015, .004) }], { rand, attack: .0002 });
    }
    channels.push(out);
  }
  const thunder = burst(sr, rand, seconds, { color: 'brown', frequency: 150, q: .5 });
  let level = 0, goal = 0;
  for (let i = 0; i < thunder.length; i++) {
    const t = i / sr;
    if (i % 3000 === 0) goal = rand() * rand();
    level += (goal - level) * .0005;
    thunder[i] *= level * Math.min(1, t / .5) * Math.exp(-t / 1.6);
  }
  for (const out of channels) {
    mix(out, thunder, 0, 1.4);
    filter(out, 'highpass', sr, 35, .7);
    fade(out, sr, .05, .6);
  }
  return { l: channels[0], r: channels[1] };
}

function uiClick(sr, rand) {
  const out = empty(sr, .12);
  modes(out, sr, 0, [{ f: between(rand, 1500, 1700), a: .5, d: .014 }, { f: between(rand, 3600, 4000), a: .2, d: .008 }], { rand });
  mix(out, burst(sr, rand, .01, { type: 'highpass', frequency: 3000, envelope: hit(.0001, .0006) }), 0, .3);
  return fade(out, sr, 0, .03);
}

// Moedas tilintando (Vilanova negociando).
function coins(sr, rand) {
  const out = empty(sr, .6);
  for (let k = 0; k < 5; k++) {
    const at = .03 + k * between(rand, .035, .07);
    const base = between(rand, 3200, 4400);
    modes(out, sr, at, [{ f: base, a: .2, d: .08 }, { f: base * 1.43, a: .14, d: .06 }, { f: base * 2.05, a: .08, d: .04 }], { rand, gain: between(rand, .5, 1) });
  }
  return fade(out, sr, .001, .08);
}

const COMMANDS = {
  move: (sr, rand) => viola(sr, rand, .7, [[A3, 0, { damp: .7, decay: .5 }], [E4, .045, { damp: .7, decay: .45, gain: .6 }]]),
  stop: (sr, rand) => viola(sr, rand, .6, [[D3, 0, { damp: .85, decay: .3, octave: true }]]),
  attack: (sr, rand) => { const out = empty(sr, .8); zabumba(sr, rand, out, 0, 1); return fade(out, sr, 0, .1); },
  gather: (sr, rand) => mix(viola(sr, rand, .7, [[E4, .02, { damp: .6, decay: .5, gain: .7 }]]), gather(sr, rand), 0, .5),
  build: (sr, rand) => { const out = empty(sr, .5); hammer(sr, rand, out, 0, 1); return fade(out, sr, 0, .08); },
  train: (sr, rand) => viola(sr, rand, .8, [[D4, 0, { damp: .55, decay: .6 }], [A4, .035, { damp: .55, decay: .6, gain: .8 }]]),
  trade: coins
};

export const RECIPES = {
  ui: { variants: 4, make: uiClick },
  ...Object.fromEntries(Object.entries(COMMANDS).map(([kind, make]) => [`command-${kind}`, { variants: 2, make }])),

  'shot-musket': { variants: 5, make: (sr, rand) => musket(sr, rand, false) },
  'shot-blunderbuss': { variants: 4, make: (sr, rand) => musket(sr, rand, true) },
  'shot-rifle': { variants: 5, make: rifle },
  'shot-cannon': { variants: 3, make: (sr, rand) => cannon(sr, rand, false) },
  'shot-matadeira': { variants: 2, make: (sr, rand) => cannon(sr, rand, true) },
  'shell-burst': { variants: 3, make: shellBurst },

  'strike-club': { variants: 4, make: (sr, rand) => melee(sr, rand, 'club') },
  'strike-machete': { variants: 4, make: (sr, rand) => melee(sr, rand, 'machete') },
  'strike-spear': { variants: 4, make: (sr, rand) => melee(sr, rand, 'spear') },
  'strike-bayonet': { variants: 4, make: (sr, rand) => melee(sr, rand, 'bayonet') },
  'strike-saber': { variants: 3, make: (sr, rand) => melee(sr, rand, 'saber') },

  'death-player': { variants: 4, make: (sr, rand) => bodyFall(sr, rand, false) },
  'death-enemy': { variants: 4, make: (sr, rand) => bodyFall(sr, rand, true) },

  chop: { variants: 6, make: chop },
  // Maço de pau batendo em esteio e caibro na obra: madeira em madeira, sem o aço.
  hammer: {
    variants: 4,
    make: (sr, rand) => {
      const out = empty(sr, .5);
      woodHit(sr, rand, out, 0, between(rand, 190, 250), 1, .9);
      modes(out, sr, 0, [{ f: between(rand, 700, 900), a: .3, d: .02 }, { f: between(rand, 1500, 1800), a: .12, d: .012 }], { rand });
      echo(out, sr, between(rand, .14, .2), .1, 1500);
      return fade(out, sr, 0, .08);
    }
  },
  'tree-crack': { variants: 2, make: treeCrack },
  'tree-land': { variants: 2, make: treeLand },
  gather: { variants: 4, make: gather },
  place: { variants: 3, make: place },
  built: {
    variants: 2,
    make: (sr, rand) => {
      const out = empty(sr, 2.6);
      hammer(sr, rand, out, 0, .9);
      hammer(sr, rand, out, .17, .8);
      hammer(sr, rand, out, .3, 1);
      return mix(out, viola(sr, rand, 2.6, strum([D3, A3, D4, Fs4, A4], .55, .022)), 0, .8);
    }
  },
  upgrade: {
    variants: 2,
    make: (sr, rand) => {
      const out = viola(sr, rand, 2.8, [[A3, 0], [Cs4, .11], [E4, .22], [A4, .33, { decay: 2.6 }]]);
      bell(sr, rand, out, .33, 880, { gain: .14, decay: .5 });
      return out;
    }
  },
  trained: { variants: 3, make: (sr, rand) => viola(sr, rand, 1.4, [[D4, 0, { damp: .45, decay: 1 }], [A4, .06, { damp: .45, decay: 1, gain: .8 }]]) },
  'wave-start': { variants: 1, make: waveStart },
  'wave-clear': {
    variants: 2,
    make: (sr, rand) => viola(sr, rand, 3.4, [
      [D4, 0], [Fs4, .14], [A4, .28], [D5, .42, { decay: 1.6 }],
      ...strum([D3, A3, D4, Fs4, A4, D5], .72, .028, { decay: 2.6 })
    ])
  },
  alarm: {
    variants: 2,
    make: (sr, rand) => {
      // Rebate: o sino pequeno batido depressa chama todo mundo.
      const out = empty(sr, 2.6);
      for (let k = 0; k < 4; k++) bell(sr, rand, out, k * .28, between(rand, 518, 526), { gain: k % 2 ? .75 : 1, decay: .55, bright: 1.2 });
      return widen(fade(out, sr, 0, .3), sr, .25);
    }
  },
  vespers: {
    variants: 1,
    make: (sr, rand) => {
      // Ave-Maria: três badaladas do sino grande, sem pressa.
      const out = empty(sr, 8);
      for (let k = 0; k < 3; k++) bell(sr, rand, out, k * 1.9, 196, { gain: k === 2 ? 1 : .85, decay: 1.25, bright: .8 });
      return widen(fade(out, sr, 0, 1), sr, .35);
    }
  },
  convoy: { variants: 2, make: convoy },
  rout: { variants: 2, make: rout },
  collapse: { variants: 3, make: collapse },
  'game-over': {
    variants: 1,
    make: (sr, rand) => {
      // Fim de Belo Monte: o sino grande uma vez e a viola descendo em menor.
      const out = empty(sr, 7);
      bell(sr, rand, out, 0, 147, { decay: 1.4, bright: .7 });
      const tune = viola(sr, rand, 7, [
        [A4, .9, { decay: 1.8 }], [G4, 1.35, { decay: 1.8 }], [F4, 1.8, { decay: 1.8 }], [E4, 2.25, { decay: 1.8 }],
        ...strum([D3, A3, D4, F4, A4], 2.9, .045, { decay: 3.2 })
      ]);
      const { l, r } = widen(mix(out, tune, 0, .75), sr, .3);
      return { l: fade(l, sr, 0, .8), r: fade(r, sr, 0, .8) };
    }
  },
  rain: { variants: 1, make: rain }
};
