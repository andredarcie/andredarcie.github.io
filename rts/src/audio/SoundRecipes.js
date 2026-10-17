// Receitas dos sons de Canudos. Cada uma desenha um som inteiro numa amostragem
// `sr` a partir de um gerador `rand` (uma semente por variação, para tiro nenhum
// sair idêntico ao anterior) e devolve mono (Float32Array) ou estéreo ({ l, r }).
// A paleta segue o lugar e a época: pólvora negra e Mannlicher, canhão Krupp,
// sino de igreja, corneta do Exército, viola caipira, madeira de caatinga.
//
// O que separa som de verdade de som "de videogame" (Farnell, Designing Sound):
// - Nada de senoide descendo como soco grave: isso é bumbo eletrônico. Estampido
//   é onda de pressão (Friedlander) mais gás turbulento — ruído, sem altura.
// - Impacto é excitação × ressonância. O tempo de contato decide o brilho (aço em
//   aço ~0,1 ms, pau em carne ~5 ms), o objeto decide os modos, e o agudo morre
//   antes do grave (Q constante).
// - Voz sintetizada com pregas vocais soa robótica: a morte é sopro e queda.
// - Campo aberto é seco. A distância vem dos ecos discretos das encostas e do ar
//   comendo o agudo, não de cauda longa de salão.
// - Os detalhes miúdos é que convencem: a pederneira antes do tiro, o ferrolho do
//   Mannlicher depois, a carreta do canhão recuando, o fuzil caindo com o soldado.
//
// Convenção: toda camada (burst, knock, whoosh, rumble...) sai com pico 1, então
// o ganho em `mix` é a altura relativa entre camadas.
import {
  between, samples, white, pink, brown, filter, sweep, shape, hit, mix, modes,
  pluck, saturate, fade, echo, widen, normalize, contact, resonate, solid, friedlander
} from './Dsp.js';

const TAU = Math.PI * 2;
const empty = (sr, seconds) => new Float32Array(samples(sr, seconds));
const peakTo = (data, target = 1) => { normalize(target, data); return data; };

// ---------------------------------------------------------------- blocos comuns

// Ruído com envelope e filtro numa tacada só.
function burst(sr, rand, seconds, { color = 'white', type = 'lowpass', frequency = 2000, q = .7, envelope }) {
  const n = samples(sr, seconds);
  const noise = color === 'pink' ? pink(n, rand) : color === 'brown' ? brown(n, rand) : white(n, rand);
  if (typeof frequency === 'function') sweep(noise, type, sr, frequency, q);
  else filter(noise, type, sr, frequency, q);
  if (envelope) shape(noise, sr, envelope);
  return peakTo(noise);
}

// Batida num corpo sólido: pulso de contato de duração `touch` nos modos do objeto.
function knock(sr, rand, seconds, { touch, base, q, count = 8, ratios, tilt = .8, rough = .15 }) {
  const excitation = contact(sr, rand, touch, rough);
  return peakTo(resonate(excitation, sr, solid(rand, base, { count, ratios, q, tilt }), seconds));
}

// Estalos soltos e curtos (pólvora queimando, lasca, cascalho). A densidade cai com
// o tempo porque `spread` empurra os sorteios para o começo.
function crackle(target, sr, rand, { count, from = 0, span, gain, cutoff = 2500, spread = 2 }) {
  for (let k = 0; k < count; k++) {
    const at = from + span * Math.pow(rand(), spread);
    const grain = burst(sr, rand, .0025, { type: 'highpass', frequency: cutoff * between(rand, .7, 1.4), envelope: hit(.0001, .0005) });
    mix(target, grain, at * sr, gain * between(rand, .25, 1) * (rand() < .5 ? -1 : 1));
  }
  return target;
}

// Lufada de ar do golpe. O tom eólico (vórtices soltando da lâmina) sobe e desce
// com a velocidade, e a velocidade cresce até perto do impacto e cai quando o
// braço freia: altura e volume seguem a mesma curva, com pico a 3/4 do golpe.
function whoosh(sr, rand, seconds, from, to, q = 1.4) {
  const noise = pink(samples(sr, seconds), rand);
  const speed = t => {
    const x = Math.min(1, t / seconds);
    return x < .75 ? Math.sin(Math.PI / 2 * x / .75) : Math.cos(Math.PI / 2 * (x - .75) / .25);
  };
  sweep(noise, 'bandpass', sr, t => from * Math.pow(to / from, speed(t)), q);
  return peakTo(shape(noise, sr, t => Math.pow(speed(t), 1.6)));
}

// Ronco irregular: ruído marrom abafado com o volume oscilando ao acaso, como o eco
// que volta aos pedaços de encostas a distâncias diferentes.
function rumble(sr, rand, seconds, { cutoff = 180, onset = .05, decay = 1, rate = 2048 }) {
  const out = burst(sr, rand, seconds, { color: 'brown', frequency: cutoff, q: .5 });
  let level = 0, goal = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    if (i % rate === 0) goal = between(rand, .15, 1);
    level += (goal - level) * (3 / rate);
    out[i] *= level * Math.min(1, t / onset) * Math.exp(-t / decay);
  }
  return peakTo(out);
}

// Eco do sertão: o som volta das encostas e paredes de taipa em cópias cada vez
// mais tardias, baixas e abafadas. Cada cópia sai do som seco, não do já ecoado.
function terrain(data, sr, rand, { first, count, gain, cutoff }) {
  const dry = Float32Array.from(data);
  let at = first;
  for (let k = 0; k < count; k++) {
    const copy = filter(Float32Array.from(dry), 'lowpass', sr, cutoff / (1 + k * .5), .6);
    mix(data, copy, at * between(rand, .9, 1.1) * sr, gain * between(rand, .65, 1.05) / (1 + k * .8));
    at += between(rand, .12, .32) * (1 + k * .4);
  }
  return data;
}

// Pé (descalço, alpercata, casco) batendo em terra seca. Passo em chão solto não é
// um evento só: é o baque e, por cima, dezenas de microimpactos de pedrinha
// batendo em pedrinha enquanto o peso assenta, mais o atrito do pé arrastando.
function footstep(sr, rand, target, at, gain) {
  mix(target, knock(sr, rand, .15, { touch: between(rand, .004, .007), base: between(rand, 110, 160), q: 2, count: 5, tilt: .6, rough: .5 }), at * sr, gain);
  for (let k = 0; k < Math.floor(between(rand, 12, 20)); k++) {
    const when = at + .003 + .06 * Math.pow(rand(), 1.3);
    const grain = burst(sr, rand, .004, { type: 'bandpass', frequency: between(rand, 1200, 4000), q: 1.5, envelope: hit(.0001, .0007) });
    mix(target, grain, when * sr, gain * between(rand, .08, .22));
  }
  mix(target, burst(sr, rand, .07, { color: 'pink', type: 'bandpass', frequency: between(rand, 1500, 2500), q: .7, envelope: t => Math.sin(Math.PI * Math.min(1, t / .07)) }), (at + .002) * sr, gain * .12);
  return target;
}

// Galho ou graveto partindo: contato curtíssimo em pau fino e seco.
function snap(sr, rand, target, at, gain, low = 500, high = 1300) {
  mix(target, knock(sr, rand, .2, { touch: between(rand, .0001, .0003), base: between(rand, low, high), q: 25, count: 7, tilt: .6 }), at * sr, gain);
  return crackle(target, sr, rand, { count: 4, from: at, span: .02, gain: gain * .5, cutoff: 2400 });
}

// ---------------------------------------------------------------- armas de fogo

// Disparo em camadas: (estalo da bala), estampido de Friedlander com a reflexão do
// chão logo atrás, gás turbulento saindo pelo cano, ronco que fica, fumaça chiando,
// fagulhas e eco das encostas; no fim, abafado pela distância e saturado como em
// gravação de tiro de verdade (o microfone sempre satura).
function gunshot(sr, rand, p) {
  const out = empty(sr, p.seconds);
  const at = Math.round((p.lead ?? 0) * sr);
  if (p.crack) {
    // Bala supersônica: onda em N de fração de milissegundo, que passa antes de o
    // estampido da boca chegar.
    const nwave = samples(sr, .0002);
    for (let i = 0; i < nwave; i++) out[at + i] += (1 - 2 * i / nwave) * p.crack;
  }
  const start = at + Math.round((p.crack ? .0025 : 0) * sr);
  const blast = friedlander(sr, p.T, { b: p.b });
  mix(out, blast, start, 1);
  // Reflexão do chão poucos milissegundos depois: o pente que dá cor de lugar.
  mix(out, filter(Float32Array.from(blast), 'lowpass', sr, 3000, .7), start + p.ground * sr, .5);
  mix(out, burst(sr, rand, p.gasTau * 8, {
    frequency: t => p.gasTo + (p.gasFrom - p.gasTo) * Math.exp(-t / (p.gasTau * .8)), q: .6,
    envelope: hit(.0002, p.gasTau)
  }), start, p.gas);
  mix(out, rumble(sr, rand, Math.min(p.seconds, p.tailTau * 5), { cutoff: p.tailCut, onset: .015, decay: p.tailTau }), start, p.tail);
  if (p.smoke) mix(out, burst(sr, rand, .5, { color: 'pink', type: 'bandpass', frequency: 1800, q: .5, envelope: hit(.01, .12) }), start, p.smoke);
  if (p.sparks) crackle(out, sr, rand, { count: p.sparks, from: (start / sr) + .003, span: p.sparkSpan, gain: .18, cutoff: 3200 });
  // Paredes de taipa e casas do arraial: reflexões próximas entre 10 e 70 ms, o
  // que gravação de tiro em lugar habitado sempre mostra antes do eco dos morros.
  const near = Float32Array.from(out);
  for (const [from, to, gain] of [[.009, .014, .32], [.019, .028, .22], [.05, .07, .14]]) {
    mix(out, filter(Float32Array.from(near), 'lowpass', sr, 4000, .6), (at / sr + between(rand, from, to)) * sr, gain);
  }
  filter(out, 'highpass', sr, 30, .7);
  terrain(out, sr, rand, p.echo);
  filter(out, 'lowpass', sr, p.air, .7);
  normalize(1, out);
  return saturate(out, p.drive);
}

// Espingarda de pederneira e bacamarte dos sertanejos: pólvora negra, estampido
// largo e gordo, muita fumaça e fagulha. Antes do tiro, o cão bate a pedra no aço
// e a escorva chia na caçoleta — o "tchic-fsss-BUM" que ninguém confunde.
function musket(sr, rand, heavy) {
  const lead = between(rand, .04, .065);
  const out = gunshot(sr, rand, {
    seconds: heavy ? 1.8 : 1.5, lead, T: heavy ? .0034 : .0026, b: 1.3, ground: between(rand, .0025, .0045),
    gas: heavy ? 1 : .85, gasFrom: between(rand, 5000, 7000), gasTo: heavy ? 260 : 380, gasTau: heavy ? .045 : .034,
    tail: heavy ? .45 : .36, tailCut: 420, tailTau: heavy ? .38 : .3,
    smoke: .14, sparks: heavy ? 20 : 10, sparkSpan: heavy ? .18 : .12,
    echo: { first: between(rand, .16, .26), count: 3, gain: .32, cutoff: 1500 },
    air: 9000, drive: heavy ? 2 : 1.8
  });
  mix(out, knock(sr, rand, .12, { touch: .00006, base: between(rand, 2200, 2800), q: 90, count: 6, tilt: .5 }), 0, .14);
  mix(out, burst(sr, rand, lead, {
    color: 'pink', type: 'bandpass', frequency: between(rand, 2500, 3500), q: .8,
    envelope: t => Math.min(1, t / .006) * Math.min(1, (lead - t) / .01)
  }), .004 * sr, .1);
  return fade(out, sr, 0, .1);
}

// Fuzil Mannlicher do Exército: pólvora sem fumaça, estalo da bala na frente,
// estampido curto e seco; o que fica é o eco nos morros. Depois, o soldado puxa e
// empurra o ferrolho de ação reta: clac-clac.
function rifle(sr, rand) {
  const out = gunshot(sr, rand, {
    seconds: 1.5, crack: .8, T: .0014, b: 1.8, ground: between(rand, .002, .0035),
    gas: .7, gasFrom: between(rand, 8000, 10000), gasTo: 900, gasTau: .018,
    tail: .3, tailCut: 650, tailTau: .24,
    echo: { first: between(rand, .14, .22), count: 4, gain: .38, cutoff: 2200 },
    air: 11000, drive: 2
  });
  const pull = between(rand, .55, .75);
  for (const [dt, base, gain] of [[0, between(rand, 1700, 2100), .1], [between(rand, .1, .14), between(rand, 2100, 2500), .13]]) {
    mix(out, burst(sr, rand, .02, { type: 'bandpass', frequency: 3500, q: .8, envelope: hit(.0005, .006) }), (pull + dt - .01) * sr, gain * .5);
    mix(out, knock(sr, rand, .15, { touch: .00008, base, q: 60, count: 7, tilt: .45 }), (pull + dt) * sr, gain);
  }
  return fade(out, sr, 0, .08);
}

// Canhão Krupp e Matadeira: boca de fogo que se sente no peito. A carreta recua
// batendo ferro e madeira e as rodas rolam na terra; o ronco rola pelos morros,
// cada canal com o seu.
function cannon(sr, rand, heavy) {
  const seconds = heavy ? 4.6 : 3.8;
  const core = gunshot(sr, rand, {
    seconds, T: heavy ? .014 : .009, b: 1.2, ground: between(rand, .006, .01),
    gas: 1, gasFrom: 3000, gasTo: heavy ? 90 : 120, gasTau: heavy ? .13 : .1,
    tail: .6, tailCut: 220, tailTau: heavy ? 1.1 : .85, smoke: .1, sparks: 24, sparkSpan: .3,
    echo: { first: between(rand, .45, .65), count: 4, gain: .4, cutoff: 700 },
    air: 7000, drive: 2.2
  });
  const recoil = between(rand, .06, .1);
  mix(core, knock(sr, rand, .5, { touch: .0012, base: between(rand, 140, 180), q: 25, count: 8, tilt: .7 }), recoil * sr, .2);
  mix(core, knock(sr, rand, .4, { touch: .0002, base: between(rand, 900, 1200), q: 50, count: 6, tilt: .6 }), (recoil + .01) * sr, .08);
  mix(core, burst(sr, rand, .7, { color: 'brown', frequency: 500, q: .6, envelope: t => Math.min(1, t / .05) * Math.exp(-t / .2) }), (recoil + .02) * sr, .15);
  const { l, r } = widen(core, sr, .25);
  for (const channel of [l, r]) {
    mix(channel, rumble(sr, rand, seconds, { cutoff: 170, onset: .08, decay: heavy ? 1.5 : 1.15 }), sr * .03, .35);
    fade(channel, sr, 0, .4);
  }
  return { l, r };
}

// Granada caindo: estouro surdo de terra, sem estalo de cano, e a chuva de torrão
// e cascalho voltando ao chão.
function shellBurst(sr, rand) {
  const out = empty(sr, 2.6);
  mix(out, friedlander(sr, between(rand, .012, .018), { b: 1.1 }), 0, 1);
  mix(out, burst(sr, rand, .9, { frequency: t => 110 + 2600 * Math.exp(-t / .06), q: .6, envelope: hit(.0005, .1) }), 0, .9);
  mix(out, rumble(sr, rand, 2.2, { cutoff: 200, onset: .02, decay: .6 }), 0, .45);
  for (let k = 0; k < 90; k++) {
    const at = .1 + 1.3 * Math.pow(rand(), 1.5);
    const big = rand() < .3;
    const clod = burst(sr, rand, big ? .04 : .015, {
      type: 'bandpass', frequency: big ? between(rand, 250, 600) : between(rand, 900, 3200), q: 1,
      envelope: hit(.0003, big ? .012 : .004)
    });
    mix(out, clod, at * sr, between(rand, .03, .12) * Math.exp(-at * 1.2));
  }
  terrain(out, sr, rand, { first: between(rand, .45, .65), count: 3, gain: .3, cutoff: 650 });
  filter(out, 'highpass', sr, 28, .7);
  filter(out, 'lowpass', sr, 7500, .7);
  normalize(1, out);
  saturate(out, 2);
  return widen(fade(out, sr, 0, .3), sr, .3);
}

// ---------------------------------------------------------------- golpes

// Golpe em corpo de gente: surdo. A carne cede (contato longo), quase nada passa de
// 1 kHz; por cima, o tapa da pele e do pano e o roçar da roupa logo depois.
function fleshHit(sr, rand, target, at, gain = 1) {
  mix(target, knock(sr, rand, .3, { touch: between(rand, .0035, .006), base: between(rand, 140, 190), q: 2.5, count: 6, tilt: .6, rough: .5 }), at * sr, gain);
  mix(target, burst(sr, rand, .05, { type: 'bandpass', frequency: between(rand, 900, 1500), q: .8, envelope: hit(.0006, .007) }), at * sr, gain * .5);
  mix(target, burst(sr, rand, .2, {
    color: 'pink', type: 'bandpass', frequency: between(rand, 2200, 3200), q: .6,
    envelope: t => Math.sin(Math.PI * Math.min(1, t / .2))
  }), (at + .005) * sr, gain * .09);
  return target;
}

// Aço tocado: contato curtíssimo e Q alto, o anel fino da lâmina.
function steel(sr, rand, target, at, base, gain, q = 300) {
  return mix(target, knock(sr, rand, .6, { touch: .00006, base, q, count: 7, tilt: .45 }), at * sr, gain);
}

// Lâmina entrando: chiado agudo e curto do gume cortando pano e pele.
function slice(sr, rand, target, at, gain) {
  return mix(target, burst(sr, rand, .03, { type: 'bandpass', frequency: between(rand, 4000, 5500), q: 1, envelope: hit(.0003, .006) }), at * sr, gain);
}

function melee(sr, rand, weapon) {
  const out = empty(sr, .8);
  const swing = {
    club: [.13, 380, 1100, 1.1], machete: [.1, 1100, 3600, 1.8], spear: [.09, 420, 1300, 1.5],
    bayonet: [.1, 600, 1700, 1.5], saber: [.17, 900, 4200, 2.4]
  }[weapon] ?? [.13, 380, 1100, 1.1];
  const [length, from, to, q] = swing;
  mix(out, whoosh(sr, rand, length * between(rand, .9, 1.15), from, to, q), 0, .35);
  const at = length * .85;
  if (weapon === 'machete') {
    slice(sr, rand, out, at, .45);
    steel(sr, rand, out, at, between(rand, 2400, 3000), .07, 250);
    fleshHit(sr, rand, out, at + .002, .85);
  } else if (weapon === 'saber') {
    slice(sr, rand, out, at, .4);
    steel(sr, rand, out, at, between(rand, 2800, 3400), .1, 600);
    fleshHit(sr, rand, out, at + .002, .7);
  } else if (weapon === 'bayonet') {
    fleshHit(sr, rand, out, at, 1);
    // A coronha de madeira e a bandoleira do fuzil chacoalhando com o tranco.
    mix(out, knock(sr, rand, .3, { touch: .0015, base: between(rand, 300, 380), q: 25, count: 7, tilt: .7 }), at * sr, .25);
    steel(sr, rand, out, at + between(rand, .01, .04), between(rand, 2600, 3200), .06, 150);
  } else if (weapon === 'spear') {
    fleshHit(sr, rand, out, at, 1);
    mix(out, knock(sr, rand, .3, { touch: .0015, base: between(rand, 260, 340), q: 22, count: 7, tilt: .7 }), at * sr, .3);
    mix(out, burst(sr, rand, .04, { type: 'bandpass', frequency: 1800, q: .8, envelope: t => Math.sin(Math.PI * Math.min(1, t / .04)) }), (at + .004) * sr, .15);
  } else {
    fleshHit(sr, rand, out, at, 1);
    // O porrete de pau-ferro também soa um instante.
    mix(out, knock(sr, rand, .3, { touch: .0015, base: between(rand, 400, 600), q: 28, count: 7, tilt: .7 }), at * sr, .35);
  }
  filter(out, 'highpass', sr, 60, .7);
  return fade(out, sr, .002, .1);
}

// ---------------------------------------------------------------- corpos

const VOWELS = { a: [720, 1180, 2550], o: [520, 900, 2450], u: [360, 760, 2350], e: [520, 1650, 2500] };

// Ar escapando do peito no baque: ruído (sem pregas vocais) moldado pelos formantes
// de uma vogal. Sopro convence; voz sintetizada vira robô.
function exhale(sr, rand, seconds) {
  const source = pink(samples(sr, seconds), rand);
  const vowel = VOWELS[['a', 'o', 'u', 'e'][Math.floor(rand() * 4)]];
  const out = empty(sr, seconds);
  vowel.forEach((f, k) => mix(out, filter(Float32Array.from(source), 'bandpass', sr, f * between(rand, .94, 1.06), 4 + k * 2), 0, [1, .6, .3][k]));
  shape(out, sr, t => Math.min(1, t / .03) * Math.exp(-t / (seconds * .35)));
  return peakTo(out);
}

// Corpo caindo no chão batido: o sopro, os joelhos, depois o tronco; poeira e
// cascalho. O soldado leva junto o fuzil (coronha e ferragem) e o cantil.
function bodyFall(sr, rand, soldier) {
  const out = empty(sr, 1.2);
  const knees = between(rand, .14, .2);
  const torso = knees + between(rand, .1, .16);
  mix(out, exhale(sr, rand, between(rand, .22, .35)), 0, .25);
  mix(out, burst(sr, rand, .25, {
    color: 'pink', type: 'bandpass', frequency: 2500, q: .6,
    envelope: t => Math.sin(Math.PI * Math.min(1, t / .25))
  }), (knees - .06) * sr, .12);
  mix(out, knock(sr, rand, .3, { touch: between(rand, .005, .007), base: between(rand, 120, 150), q: 1.8, count: 5, tilt: .6, rough: .5 }), knees * sr, .55);
  mix(out, knock(sr, rand, .4, { touch: between(rand, .008, .011), base: between(rand, 90, 120), q: 1.6, count: 5, tilt: .6, rough: .5 }), torso * sr, 1);
  mix(out, burst(sr, rand, .2, { type: 'bandpass', frequency: 1100, q: .7, envelope: hit(.001, .015) }), torso * sr, .3);
  crackle(out, sr, rand, { count: 25, from: torso, span: .25, gain: .12, cutoff: 1800 });
  mix(out, burst(sr, rand, .6, { color: 'pink', type: 'bandpass', frequency: 1200, q: .5, envelope: hit(.02, .15) }), torso * sr, .15);
  if (soldier) {
    const drop = torso + between(rand, .05, .15);
    mix(out, knock(sr, rand, .3, { touch: .001, base: between(rand, 320, 400), q: 25, count: 8, tilt: .7 }), drop * sr, .35);
    steel(sr, rand, out, drop + .003, between(rand, 1900, 2500), .12, 150);
    mix(out, knock(sr, rand, .3, { touch: .0003, base: between(rand, 800, 1000), q: 60, count: 6, tilt: .6 }), (drop + between(rand, .03, .08)) * sr, .1);
  }
  filter(out, 'highpass', sr, 40, .7);
  return fade(out, sr, .002, .1);
}

// ---------------------------------------------------------------- madeira e trabalho

// Machado entrando em tronco verde. O gume corta antes de o peso chegar (estalo
// seco e brilhante), o tronco responde com um "toc" de madeira viva, que amortece
// rápido (Q baixo), o corpo da árvore dá o grave, a cabeça de aço vibra um
// instante, a fibra rasga em estalinhos e às vezes uma lasca cai. A mata devolve.
function chop(sr, rand) {
  const out = empty(sr, .9);
  mix(out, burst(sr, rand, .008, { type: 'highpass', frequency: 3000, envelope: hit(.00003, .0009) }), 0, .55);
  mix(out, knock(sr, rand, .5, { touch: .0004, base: between(rand, 380, 520), q: 9, count: 10, tilt: .7 }), 0, 1);
  mix(out, knock(sr, rand, .5, { touch: .0015, base: between(rand, 110, 150), q: 4, count: 4, tilt: .9 }), 0, .6);
  steel(sr, rand, out, 0, between(rand, 2600, 3200), .08, 140);
  crackle(out, sr, rand, { count: Math.floor(between(rand, 6, 12)), from: .002, span: .05, gain: .18, cutoff: 2800, spread: 1.5 });
  if (rand() < .5) snap(sr, rand, out, between(rand, .22, .4), .15, 1200, 1700);
  terrain(out, sr, rand, { first: between(rand, .13, .2), count: 2, gain: .2, cutoff: 1800 });
  filter(out, 'highpass', sr, 70, .7);
  return fade(out, sr, 0, .12);
}

// Rangido de fibra cedendo (stick-slip): atrito de agarra-e-solta, uma série de
// estalinhos passados pelas ressonâncias da madeira. `jitter` baixo deixa o pulso
// regular e o rangido quase afinado (eixo de carro de boi); alto, irregular
// (tronco gemendo).
function creak(sr, rand, seconds, from, to, { jitter = .5 } = {}) {
  const n = samples(sr, seconds);
  const pulses = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    phase += (from + (to - from) * t * t) * (1 + (rand() - .5) * jitter) / sr;
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
  shape(out, sr, t => {
    if (rand() < .0015) goal = between(rand, .25, 1);
    level += (goal - level) * .002;
    return level * Math.min(1, t / .25) * Math.min(1, (seconds - t) / .2);
  });
  return peakTo(out);
}

// O tronco começa a tombar: estalo grande do último golpe abrindo a madeira,
// rangido crescendo, galhos estalando cada vez mais e a copa ganhando velocidade
// no ar. O baque fica para `treeLand`, tocado quando ela bate.
function treeCrack(sr, rand) {
  const seconds = 3.6;
  const channels = [];
  const shared = empty(sr, seconds);
  mix(shared, burst(sr, rand, .05, { type: 'highpass', frequency: 1200, envelope: hit(.0001, .005) }), 0, .7);
  mix(shared, knock(sr, rand, .8, { touch: .0004, base: between(rand, 160, 210), q: 9, count: 12, tilt: .7 }), 0, 1);
  crackle(shared, sr, rand, { count: 30, from: .005, span: .25, gain: .3, cutoff: 2200, spread: 2.2 });
  mix(shared, creak(sr, rand, 2.9, between(rand, 18, 28), between(rand, 70, 110)), .2 * sr, .4);
  for (let c = 0; c < 2; c++) {
    const out = Float32Array.from(shared);
    // Estalos de fibra e galho: raros no começo, juntos no fim.
    crackle(out, sr, rand, { count: 45, from: .4, span: 2.8, gain: .14, cutoff: 1800, spread: .45 });
    for (let k = 0; k < 4; k++) snap(sr, rand, out, between(rand, 1.2, 3), between(rand, .08, .2));
    // Copa cortando o ar: folhagem num passa-banda que sobe com a velocidade.
    mix(out, burst(sr, rand, seconds, {
      color: 'pink', type: 'bandpass', frequency: t => 700 + 2600 * Math.max(0, (t - 1.4) / 2), q: .7,
      envelope: t => Math.pow(Math.max(0, (t - 1.2) / 2.1), 2.2) * Math.min(1, (seconds - t) / .35)
    }), 0, .4);
    filter(out, 'highpass', sr, 50, .7);
    channels.push(fade(out, sr, 0, .3));
  }
  return { l: channels[0], r: channels[1] };
}

// A árvore bate no chão: baque surdo do tronco (contato longuíssimo, a terra cede),
// a copa se arrebentando em galho e folha, um quique menor e a folhagem assentando.
function treeLand(sr, rand) {
  const seconds = 3;
  const shared = empty(sr, seconds);
  mix(shared, knock(sr, rand, .8, { touch: .01, base: between(rand, 70, 90), q: 1.6, count: 6, tilt: .5, rough: .5 }), 0, 1);
  mix(shared, burst(sr, rand, .5, { color: 'brown', frequency: 350, q: .6, envelope: hit(.002, .1) }), 0, .7);
  mix(shared, rumble(sr, rand, seconds, { cutoff: 160, onset: .01, decay: .4 }), 0, .4);
  const bounce = between(rand, .2, .3);
  mix(shared, knock(sr, rand, .5, { touch: .008, base: between(rand, 75, 95), q: 1.6, count: 5, tilt: .5, rough: .5 }), bounce * sr, .35);
  const channels = [];
  for (let c = 0; c < 2; c++) {
    const out = Float32Array.from(shared);
    crackle(out, sr, rand, { count: 70, from: .003, span: .6, gain: .22, cutoff: 1600, spread: 1.8 });
    for (let k = 0; k < 9; k++) snap(sr, rand, out, between(rand, 0, .5), between(rand, .1, .3), 300, 1200);
    mix(out, burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: 2600, q: .5, envelope: hit(.004, .35) }), 0, .4);
    // Folhas e gravetos assentando.
    for (let k = 0; k < 22; k++) {
      const at = .3 + 1.6 * Math.pow(rand(), 1.4);
      const length = between(rand, .02, .07);
      mix(out, burst(sr, rand, length, {
        color: 'pink', type: 'bandpass', frequency: between(rand, 2500, 5500), q: 1,
        envelope: t => Math.sin(Math.PI * Math.min(1, t / length))
      }), at * sr, between(rand, .04, .12) * Math.exp(-at));
    }
    terrain(out, sr, rand, { first: between(rand, .22, .3), count: 2, gain: .2, cutoff: 900 });
    filter(out, 'highpass', sr, 30, .7);
    channels.push(out);
  }
  normalize(1, ...channels);
  for (const out of channels) fade(saturate(out, 1.4), sr, 0, .5);
  return { l: channels[0], r: channels[1] };
}

// Pé de mandioca colhido: o facão corta a haste verde (chiado do gume e um "toc"
// de pau verde, abafado), as folhas raspam enquanto a planta sai e a terra solta
// cai das raízes arrancadas.
function gather(sr, rand) {
  const out = empty(sr, .55);
  slice(sr, rand, out, 0, .35);
  mix(out, knock(sr, rand, .3, { touch: .0003, base: between(rand, 600, 900), q: 8, count: 7, tilt: .7 }), 0, .6);
  for (let k = 0; k < 14; k++) {
    const at = between(rand, .18, .45);
    const clod = burst(sr, rand, .02, { type: 'bandpass', frequency: between(rand, 300, 1200), q: 1, envelope: hit(.0005, .006) });
    mix(out, clod, at * sr, between(rand, .05, .16));
  }
  const grains = Math.floor(between(rand, 9, 15));
  for (let k = 0; k < grains; k++) {
    const length = between(rand, .02, .06);
    const leaf = burst(sr, rand, length, {
      color: 'pink', type: 'bandpass', frequency: between(rand, 2500, 5500), q: between(rand, .8, 1.6),
      envelope: t => Math.sin(Math.PI * Math.min(1, t / length))
    });
    mix(out, leaf, between(rand, 0, .32) * sr, between(rand, .1, .35));
  }
  filter(out, 'highpass', sr, 150, .7);
  return fade(out, sr, .003, .08);
}

// Estaca entrando na terra: contato macio (a terra cede), modos de pau, o baque
// surdo do chão e a poeira.
function place(sr, rand) {
  const out = empty(sr, .7);
  mix(out, knock(sr, rand, .5, { touch: between(rand, .0015, .0025), base: between(rand, 200, 280), q: 25, count: 8, tilt: .7 }), 0, 1);
  mix(out, burst(sr, rand, .15, { color: 'brown', frequency: 400, q: .6, envelope: hit(.001, .03) }), 0, .6);
  mix(out, knock(sr, rand, .4, { touch: .001, base: between(rand, 260, 340), q: 28, count: 8, tilt: .7 }), between(rand, .06, .09) * sr, .4);
  mix(out, burst(sr, rand, .6, { color: 'pink', type: 'bandpass', frequency: 900, q: .5, envelope: hit(.01, .12) }), 0, .2);
  crackle(out, sr, rand, { count: 10, from: .005, span: .15, gain: .1, cutoff: 1800 });
  return fade(out, sr, 0, .1);
}

// Maço de pau batendo em esteio e caibro: madeira em madeira, modos de viga.
function mallet(sr, rand, target, at, gain = 1) {
  mix(target, knock(sr, rand, .4, { touch: between(rand, .0005, .0009), base: between(rand, 240, 340), q: 32, count: 9, tilt: .75 }), at * sr, gain);
  mix(target, burst(sr, rand, .01, { type: 'highpass', frequency: 2200, envelope: hit(.00005, .001) }), at * sr, gain * .3);
  return target;
}

// Martelo de ferro no prego: aço em aço e o caibro respondendo embaixo.
function nail(sr, rand, target, at, gain = 1) {
  steel(sr, rand, target, at, between(rand, 1300, 1700), gain * .45, 120);
  return mallet(sr, rand, target, at, gain * .8);
}

// Desmoronar de casa de taipa e madeira: a viga mestra cede, vigas caindo cada vez
// mais juntas, o barro da parede esfarelando em torrões, ronco de terra e poeira.
function collapse(sr, rand) {
  const seconds = 3.2;
  const channels = [empty(sr, seconds), empty(sr, seconds)];
  const shared = empty(sr, seconds);
  mix(shared, knock(sr, rand, 1, { touch: .002, base: between(rand, 90, 120), q: 18, count: 10, tilt: .7 }), 0, 1);
  mix(shared, burst(sr, rand, .25, { type: 'highpass', frequency: 1200, envelope: hit(.0003, .03) }), 0, .5);
  mix(shared, rumble(sr, rand, seconds, { cutoff: 220, onset: .1, decay: .9 }), 0, .6);
  let at = .18;
  while (at < 1.5) {
    const side = channels[rand() < .5 ? 0 : 1];
    mix(side, knock(sr, rand, .6, {
      touch: between(rand, .0008, .003), base: between(rand, 120, 320), q: between(rand, 15, 30), count: 9, tilt: .7
    }), at * sr, between(rand, .3, .75));
    crackle(side, sr, rand, { count: 6, from: at, span: .1, gain: .15, cutoff: 2600 });
    at += between(rand, .05, .22) * (1.3 - at / 1.6);
  }
  for (const channel of channels) {
    mix(channel, shared, 0, 1);
    for (let k = 0; k < 60; k++) {
      const when = .15 + 1.8 * Math.pow(rand(), 1.3);
      const clod = burst(sr, rand, .03, { type: 'bandpass', frequency: between(rand, 300, 1400), q: 1, envelope: hit(.0005, .008) });
      mix(channel, clod, when * sr, between(rand, .05, .2) * Math.exp(-when * .8));
    }
    mix(channel, burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: 1800, q: .5, envelope: t => Math.min(1, t / .3) * Math.exp(-t / .8) }), .1 * sr, .12);
    crackle(channel, sr, rand, { count: 40, from: .4, span: 1.6, gain: .05, cutoff: 1800, spread: 1.3 });
  }
  normalize(1, ...channels);
  for (const channel of channels) fade(saturate(channel, 1.4), sr, 0, .4);
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
// baixo e ganha vibrato depois de firmar. Harmônico nenhum fica parado: cada um
// oscila um pouco e a afinação deriva, como no sopro de gente; parado, vira órgão.
function bugle(sr, rand, seconds, notes) {
  const out = empty(sr, seconds);
  for (const { f, at, length, force = 1 } of notes) {
    const n = samples(sr, length + .09);
    const start = Math.round(at * sr);
    const phases = new Float64Array(16).map(() => rand() * TAU);
    const shimmer = new Float64Array(16).fill(1), goal = new Float64Array(16).fill(1);
    let drift = 0, wander = 0;
    for (let i = 0; i < n && start + i < out.length; i++) {
      const t = i / sr;
      if (i % 512 === 0) {
        for (let k = 0; k < 16; k++) goal[k] = 1 + (rand() - .5) * .3;
        drift = drift * .85 + (rand() - .5) * .003;
      }
      wander += (drift - wander) * .002;
      const release = t > length ? Math.max(0, 1 - (t - length) / .09) : 1;
      const amp = Math.min(1, t / .03) * release * force;
      const brightness = (t < .05 ? .55 + .45 * Math.sin(Math.PI * t / .05) : .62) * release * force;
      const vibrato = t > .16 ? .0045 * Math.sin(TAU * 5.3 * t) * Math.min(1, (t - .16) / .15) : 0;
      const pitch = f * (1 - .035 * Math.exp(-t / .018)) * (1 + vibrato + wander);
      let sample = 0;
      for (let k = 1; k <= 16; k++) {
        const frequency = pitch * k;
        if (frequency > sr * .45) break;
        shimmer[k - 1] += (goal[k - 1] - shimmer[k - 1]) * .004;
        phases[k - 1] += TAU * frequency / sr;
        sample += Math.sin(phases[k - 1]) * shimmer[k - 1] * Math.exp(-(k - 1) * (1.9 - 1.5 * brightness)) / Math.sqrt(k);
      }
      out[start + i] += sample * amp;
    }
    // Sopro: o ar passando pelo bocal, mais forte no ataque.
    mix(out, burst(sr, rand, length, { color: 'pink', type: 'bandpass', frequency: f * 4, q: 2, envelope: hit(.02, length * .6) }), start, .08);
  }
  filter(out, 'highpass', sr, 160, .7);
  filter(out, 'peak', sr, 1250, 1, 4);
  return filter(out, 'lowpass', sr, 5200, .7);
}

// Toque de caixa clara: pele (modos de membrana), esteira chiando e o aro.
function snare(sr, rand, target, at, gain) {
  const local = empty(sr, .3);
  mix(local, knock(sr, rand, .3, { touch: .0005, base: between(rand, 180, 200), q: 18, ratios: [1, 1.59, 2.14, 2.3, 2.65, 2.92], tilt: .6 }), 0, .55);
  mix(local, burst(sr, rand, .3, { type: 'bandpass', frequency: 3600, q: .6, envelope: hit(.0005, .055) }), 0, .9);
  mix(local, burst(sr, rand, .3, { type: 'highpass', frequency: 2200, envelope: hit(.002, .09) }), 0, .3);
  return mix(target, local, at * sr, gain);
}

// Senoide com glissando: a pele grande afrouxa depois da batida e a nota cai. Aqui
// a queda é física (tensão da membrana), por isso só o zabumba a usa.
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

// Zabumba: pele grande e grave, batida de maço de feltro.
function zabumba(sr, rand, target, at, gain) {
  const base = between(rand, 78, 88);
  const local = empty(sr, .8);
  mix(local, thump(sr, .7, base * 1.25, base, .02, hit(.001, .2)), 0, 1);
  mix(local, knock(sr, rand, .8, { touch: .003, base, q: 25, ratios: [1.59, 2.14, 2.65, 2.92, 3.16], tilt: .7 }), 0, .45);
  mix(local, burst(sr, rand, .03, { frequency: 2200, envelope: hit(.0003, .004) }), 0, .2);
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
    footstep(sr, rand, out, at, between(rand, .12, .3) * (1 - at / 2.6));
  }
  return widen(fade(out, sr, 0, .3), sr, .35);
}

function convoy(sr, rand) {
  // Carro de boi de Monte Santo: o eixo de madeira esfregando no cocão "canta"
  // (stick-slip quase afinado, subindo com a volta da roda), a roda rola na terra,
  // os bois pisam e o chocalho bate no balanço do passo.
  const seconds = 2.8;
  const out = empty(sr, seconds);
  for (const [at, length] of [[0, .6], [.9, .75], [1.85, .65]]) {
    const from = between(rand, 300, 380);
    mix(out, creak(sr, rand, length, from, from * between(rand, 1.12, 1.3), { jitter: .06 }), at * sr, .45);
  }
  mix(out, rumble(sr, rand, seconds, { cutoff: 300, onset: .3, decay: 4, rate: 1024 }), 0, .15);
  for (let k = 0; k < 4; k++) footstep(sr, rand, out, .2 + k * between(rand, .55, .65), .25);
  for (let k = 0; k < 7; k++) {
    const at = .1 + k * between(rand, .33, .42);
    if (at > seconds - .4) break;
    mix(out, knock(sr, rand, .6, {
      touch: .0002, base: between(rand, 540, 580), q: 110, ratios: [1, 1.52, 2.04, 2.76, 3.41], tilt: .5
    }), at * sr, k % 2 ? .14 : .25);
  }
  filter(out, 'highpass', sr, 60, .7);
  return widen(fade(out, sr, .002, .3), sr, .3);
}

function thunder(sr, rand) {
  // Trovão longe, quando a pancada de chuva chega (a chuva em si é o laço
  // `rainfall`). Trovão de verdade dura 10–15 s, em estrondos a uns 2 s um do outro,
  // com o grosso da energia entre 40 e 200 Hz.
  const seconds = 11;
  const out = empty(sr, seconds);
  let clap = .3;
  for (let k = 0; k < 4 && clap < seconds - 3; k++) {
    const roll = rumble(sr, rand, seconds - clap, { cutoff: between(rand, 110, 170), onset: between(rand, .08, .3), decay: between(rand, 1.4, 2.4), rate: 3000 });
    mix(roll, burst(sr, rand, 1.2, { type: 'bandpass', frequency: between(rand, 350, 600), q: .6, envelope: t => Math.min(1, t / .12) * Math.exp(-t / .35) }), .05 * sr, k ? .15 : .3);
    mix(out, roll, clap * sr, [1, .75, .55, .4][k]);
    clap += between(rand, 1.6, 2.6);
  }
  filter(out, 'highpass', sr, 35, .7);
  return widen(fade(out, sr, .05, .8), sr, .3);
}

// ---------------------------------------------------------------- vida no arraial

// Cantil de folha de flandres quase seco, sacudido pela tropa com sede: a lata
// fina bate (contato curto, Q de metal fino) e o restinho d'água chacoalha dentro.
function canteen(sr, rand) {
  const out = empty(sr, .9);
  for (let k = 0; k < 4; k++) {
    const at = k * between(rand, .13, .17);
    mix(out, knock(sr, rand, .25, { touch: .0002, base: between(rand, 650, 850), q: 45, count: 7, tilt: .6 }), at * sr, .5 * (1 - k * .15));
    mix(out, burst(sr, rand, .09, {
      type: 'bandpass', frequency: between(rand, 350, 700), q: 2.5, envelope: t => Math.sin(Math.PI * Math.min(1, t / .09))
    }), (at + .02) * sr, .3);
  }
  filter(out, 'highpass', sr, 120, .7);
  return fade(out, sr, .002, .1);
}

// Desertor: o soldado larga a tropa e some correndo pela caatinga — passos rápidos
// cada vez mais baixos e abafados (o ar e o mato comem o agudo) e a correia do
// equipamento batendo no ritmo da corrida.
function deserter(sr, rand) {
  const out = empty(sr, 1.7);
  for (let k = 0; k < 9; k++) {
    const at = k * between(rand, .15, .19);
    const away = Math.exp(-k * .28);
    footstep(sr, rand, out, at, .7 * away);
    if (k % 2 === 0) steel(sr, rand, out, at + .02, between(rand, 2200, 2800), .06 * away, 120);
  }
  sweep(out, 'lowpass', sr, t => 6000 * Math.exp(-t * 1.6) + 600, .7);
  return fade(out, sr, .002, .2);
}

// Romeiros chegando a Belo Monte: a viola saúda (ré, lá, ré), e por baixo o arrastar
// de muitos pés na estrada, longe, e o chocalho de uma cabra que vem junto.
function romeiros(sr, rand) {
  const seconds = 3.4;
  const out = viola(sr, rand, seconds, [
    ...strum([D3, A3, D4, Fs4, A4], 0, .03, { decay: 1.6 }),
    ...strum([A3, Cs4, E4, A4], .85, .03, { decay: 1.4, gain: .85 }),
    ...strum([D3, A3, D4, Fs4, A4], 1.7, .035, { decay: 2.4 })
  ]);
  const crowd = empty(sr, seconds);
  for (let k = 0; k < 34; k++) footstep(sr, rand, crowd, between(rand, .1, 3), between(rand, .1, .25));
  for (let k = 0; k < 5; k++) {
    mix(crowd, knock(sr, rand, .4, { touch: .0002, base: between(rand, 880, 940), q: 80, ratios: [1, 1.52, 2.04, 2.76], tilt: .5 }),
      (.3 + k * between(rand, .45, .6)) * sr, k % 2 ? .05 : .09);
  }
  filter(crowd, 'lowpass', sr, 2600, .7);
  mix(out, crowd, 0, .45);
  return widen(fade(out, sr, .002, .3), sr, .3);
}

// Carga entregue na igreja. Lenha: a tora cai no monte (baque de pau grosso e seco,
// o quique e um pouco de poeira).
function dropWood(sr, rand) {
  const out = empty(sr, .7);
  mix(out, knock(sr, rand, .5, { touch: .002, base: between(rand, 160, 220), q: 16, count: 9, tilt: .7 }), 0, 1);
  mix(out, knock(sr, rand, .4, { touch: .0015, base: between(rand, 260, 330), q: 18, count: 8, tilt: .7 }), between(rand, .08, .12) * sr, .35);
  crackle(out, sr, rand, { count: 10, from: .01, span: .2, gain: .08, cutoff: 1800 });
  return fade(out, sr, 0, .1);
}

// Fuzil apanhado do chão: a mão agarra a madeira da coronha (toque surdo), o ferrolho
// e as braçadeiras de aço chacoalham e a bandoleira de couro estala.
function riflePickup(sr, rand) {
  const out = empty(sr, .5);
  mix(out, knock(sr, rand, .25, { touch: .0012, base: between(rand, 380, 460), q: 16, count: 7, tilt: .7 }), 0, .6);
  for (let k = 0; k < 3; k++) steel(sr, rand, out, .03 + k * between(rand, .03, .06), between(rand, 1900, 2700), .22 - k * .05, 90);
  mix(out, burst(sr, rand, .05, { type: 'bandpass', frequency: 1400, q: .9, envelope: hit(.001, .01) }), .06 * sr, .25);
  filter(out, 'highpass', sr, 120, .7);
  return fade(out, sr, .002, .08);
}

// Fuzis entregues na igreja: postos no monte das armas tomadas — madeira batendo em
// madeira e o aço tinindo uma vez.
function dropRifles(sr, rand) {
  const out = empty(sr, .7);
  mix(out, knock(sr, rand, .4, { touch: .0012, base: between(rand, 300, 380), q: 18, count: 8, tilt: .7 }), 0, .9);
  mix(out, knock(sr, rand, .3, { touch: .001, base: between(rand, 420, 500), q: 18, count: 7, tilt: .7 }), between(rand, .07, .1) * sr, .4);
  steel(sr, rand, out, .01, between(rand, 2000, 2600), .2, 140);
  return fade(out, sr, 0, .1);
}

// Mandioca: o feixe assenta no chão (baque macio das raízes), as folhas da rama
// raspam e cai terra das raízes.
function dropCassava(sr, rand) {
  const out = empty(sr, .6);
  mix(out, knock(sr, rand, .3, { touch: between(rand, .005, .008), base: between(rand, 120, 160), q: 2, count: 5, tilt: .6, rough: .5 }), 0, 1);
  for (let k = 0; k < 8; k++) {
    const length = between(rand, .02, .05);
    mix(out, burst(sr, rand, length, {
      color: 'pink', type: 'bandpass', frequency: between(rand, 2500, 5000), q: 1, envelope: t => Math.sin(Math.PI * Math.min(1, t / length))
    }), between(rand, 0, .2) * sr, between(rand, .08, .25));
  }
  for (let k = 0; k < 10; k++) {
    mix(out, burst(sr, rand, .02, { type: 'bandpass', frequency: between(rand, 300, 1200), q: 1, envelope: hit(.0005, .006) }),
      between(rand, .03, .3) * sr, between(rand, .05, .15));
  }
  filter(out, 'highpass', sr, 70, .7);
  return fade(out, sr, .002, .08);
}

// Papel: a folha empurra o ar ao se mover (ruído num passa-banda que varre e some)
// e estala em grãos agudos e esparsos onde dobra. Planta da obra se abrindo e a
// página do diário virando.
function paper(sr, rand, seconds, from, to, crinkles) {
  const out = empty(sr, seconds);
  const swish = pink(samples(sr, seconds), rand);
  sweep(swish, 'bandpass', sr, t => from * Math.pow(to / from, Math.min(1, t / seconds)), .8);
  shape(swish, sr, t => Math.pow(Math.sin(Math.PI * Math.min(1, t / seconds)), 1.4));
  mix(out, peakTo(swish), 0, .6);
  for (let k = 0; k < crinkles; k++) {
    const grain = burst(sr, rand, .006, { type: 'bandpass', frequency: between(rand, 2500, 7000), q: 1.2, envelope: hit(.0002, .0015) });
    mix(out, grain, seconds * Math.pow(rand(), 1.3) * sr, between(rand, .1, .4) * (rand() < .5 ? -1 : 1));
  }
  filter(out, 'highpass', sr, 400, .7);
  return fade(out, sr, .003, .06);
}

// Sineta de bronze: um toque leve, e um segundo mais fraco, quando o Conselheiro
// começa a rezar por um ferido.
function blessing(sr, rand) {
  const out = empty(sr, 2.6);
  const prime = between(rand, 1180, 1260);
  bell(sr, rand, out, 0, prime, { gain: 1, decay: .45, bright: .9 });
  bell(sr, rand, out, between(rand, .32, .4), prime, { gain: .45, decay: .4, bright: .8 });
  return widen(fade(out, sr, 0, .4), sr, .3);
}

// ---------------------------------------------------------------- ambiente

// Laço sem emenda: o fim desliza sobre o começo (troca de potência igual, para o
// volume não afundar no meio da emenda) e sai cortado, pronto para repetir.
function seamless(channels, sr, overlap) {
  const n = samples(sr, overlap);
  return channels.map(data => {
    const start = data.length - n;
    for (let i = 0; i < n; i++) {
      const w = i / n;
      data[i] = data[i] * Math.sin(w * Math.PI / 2) + data[start + i] * Math.cos(w * Math.PI / 2);
    }
    return data.slice(0, start);
  });
}

// Vento seco da caatinga: um sopro largo e grave que sobe e desce em lufadas, com
// a folhagem seca chiando por cima só quando a lufada aperta.
function wind(sr, rand) {
  const seconds = 16;
  const channels = [];
  for (let c = 0; c < 2; c++) {
    const n = samples(sr, seconds);
    const body = burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: between(rand, 420, 560), q: .5 });
    const leaves = burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: between(rand, 3000, 4200), q: .7 });
    const low = burst(sr, rand, seconds, { color: 'brown', frequency: 160, q: .5 });
    const out = new Float32Array(n);
    let gust = .5, goal = .5;
    for (let i = 0; i < n; i++) {
      if (i % Math.round(sr * 1.4) === 0) goal = between(rand, .25, 1);
      gust += (goal - gust) * (1.5 / sr);
      out[i] = body[i] * (.35 + .65 * gust) * .6 + leaves[i] * gust * gust * .25 + low[i] * (.5 + .5 * gust) * .3;
    }
    channels.push(out);
  }
  const [l, r] = seamless(channels, sr, 2.5);
  return { l, r };
}

// Grilos na noite do sertão: cada um no seu tom (perto de 4,5 kHz) e no seu
// compasso, cantando em trinados de três ou quatro pulsos curtos; uns mais perto,
// outros longe e mais de um lado. Grilo canta quase senoide pura, por isso a
// síntese aditiva aqui é fiel e não soa de brinquedo.
function crickets(sr, rand) {
  const seconds = 9;
  const n = samples(sr, seconds);
  const channels = [new Float32Array(n), new Float32Array(n)];
  for (let k = 0; k < 6; k++) {
    const frequency = between(rand, 4100, 4900);
    const period = between(rand, .45, .85);
    const pulses = 3 + Math.floor(rand() * 2);
    const near = between(rand, .25, 1);
    const pan = between(rand, -.8, .8);
    const gains = [near * (1 - pan) / 2, near * (1 + pan) / 2];
    const pulse = samples(sr, .013);
    for (let t = between(rand, 0, period); t < seconds - .2; t += period * between(rand, .97, 1.03)) {
      for (let p = 0; p < pulses; p++) {
        const start = Math.round((t + p * .028) * sr);
        for (let i = 0; i < pulse && start + i < n; i++) {
          const v = Math.sin(TAU * frequency * (start + i) / sr) * Math.sin(Math.PI * i / pulse);
          channels[0][start + i] += v * gains[0];
          channels[1][start + i] += v * gains[1];
        }
      }
    }
  }
  // O coro dos que estão longe: um chiado estreito e baixinho no mesmo tom.
  for (const data of channels) {
    mix(data, burst(sr, rand, seconds, { type: 'bandpass', frequency: 4500, q: 6 }), 0, .06);
    filter(data, 'lowpass', sr, 9000, .7);
  }
  const [l, r] = seamless(channels, sr, .6);
  return { l, r };
}

// Chuva caindo, sem começo nem fim: o chiado largo, o rumor grave da água no chão
// e os pingos batendo em folha e terra seca, cada canal com os seus.
function rainfall(sr, rand) {
  const seconds = 7;
  const channels = [];
  for (let c = 0; c < 2; c++) {
    const out = empty(sr, seconds);
    mix(out, burst(sr, rand, seconds, { color: 'pink', type: 'bandpass', frequency: 3200, q: .4 }), 0, .3);
    mix(out, burst(sr, rand, seconds, { color: 'pink', frequency: 700, q: .5 }), 0, .15);
    for (let k = 0; k < 2200; k++) {
      const length = between(rand, .003, .008);
      const drop = burst(sr, rand, length, { type: 'bandpass', frequency: between(rand, 1500, 6000), q: 1.2, envelope: hit(.0001, .0015) });
      mix(out, drop, seconds * rand() * sr, between(rand, .03, .12));
    }
    filter(out, 'highpass', sr, 35, .7);
    channels.push(out);
  }
  const [l, r] = seamless(channels, sr, 1);
  return { l, r };
}

// Clique de interface: um toque seco de madeira, curto.
function uiClick(sr, rand) {
  const out = empty(sr, .12);
  mix(out, knock(sr, rand, .12, { touch: .00012, base: between(rand, 1800, 2200), q: 30, count: 6, tilt: .7 }), 0, 1);
  mix(out, burst(sr, rand, .01, { type: 'highpass', frequency: 3000, envelope: hit(.0001, .0006) }), 0, .2);
  return fade(out, sr, 0, .03);
}

// Moedas tilintando (Vilanova negociando): disquinhos de metal, contato
// curtíssimo e Q altíssimo, caindo uns sobre os outros.
function coins(sr, rand) {
  const out = empty(sr, .6);
  for (let k = 0; k < 5; k++) {
    const at = .03 + k * between(rand, .035, .07);
    mix(out, knock(sr, rand, .4, { touch: .00005, base: between(rand, 3200, 4400), q: 700, count: 6, tilt: .4 }), at * sr, between(rand, .5, 1));
  }
  return fade(out, sr, .001, .08);
}

const COMMANDS = {
  move: (sr, rand) => viola(sr, rand, .7, [[A3, 0, { damp: .7, decay: .5 }], [E4, .045, { damp: .7, decay: .45, gain: .6 }]]),
  stop: (sr, rand) => viola(sr, rand, .6, [[D3, 0, { damp: .85, decay: .3, octave: true }]]),
  attack: (sr, rand) => { const out = empty(sr, .8); zabumba(sr, rand, out, 0, 1); return fade(out, sr, 0, .1); },
  gather: (sr, rand) => mix(viola(sr, rand, .7, [[E4, .02, { damp: .6, decay: .5, gain: .7 }]]), gather(sr, rand), 0, .5),
  build: (sr, rand) => { const out = empty(sr, .5); nail(sr, rand, out, 0, 1); return fade(out, sr, 0, .08); },
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
  // Maço de pau batendo em esteio e caibro na obra, com a mata devolvendo.
  hammer: {
    variants: 4,
    make: (sr, rand) => {
      const out = mallet(sr, rand, empty(sr, .5), 0, 1);
      terrain(out, sr, rand, { first: between(rand, .14, .2), count: 1, gain: .12, cutoff: 1500 });
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
      nail(sr, rand, out, 0, .9);
      nail(sr, rand, out, .17, .8);
      nail(sr, rand, out, .3, 1);
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
      // O sino da igreja, uma badalada só: o arraial está sendo atacado.
      const out = empty(sr, 2.6);
      bell(sr, rand, out, 0, between(rand, 518, 526), { gain: 1, decay: .55, bright: 1.2 });
      return widen(fade(out, sr, 0, .3), sr, .25);
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
  rain: { variants: 1, make: thunder },
  thirst: { variants: 2, make: canteen },
  deserted: { variants: 3, make: deserter },
  romeiros: { variants: 2, make: romeiros },
  'drop-wood': { variants: 4, make: dropWood },
  'drop-food': { variants: 4, make: dropCassava },
  'drop-rifles': { variants: 3, make: dropRifles },
  'rifle-pickup': { variants: 3, make: riflePickup },
  blessing: { variants: 2, make: blessing },
  'build-open': { variants: 2, make: (sr, rand) => paper(sr, rand, .55, 900, 3500, 22) },
  page: { variants: 3, make: (sr, rand) => paper(sr, rand, .4, 1200, 4500, 14) },
  'story-new': { variants: 2, make: (sr, rand) => paper(sr, rand, .28, 1800, 5000, 8) },
  // Laços de ambiente (AudioManager.#beds).
  wind: { variants: 1, make: wind },
  crickets: { variants: 1, make: crickets },
  rainfall: { variants: 1, make: rainfall }
};
