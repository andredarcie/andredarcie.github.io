// Graphics, Input e Audio do RGSS2, linha a linha de web/rgss/rgss.rb.
// Graphics.update é a raiz de tudo que espera quadro (async no JS).
import * as rb from 'rb';
import { motor, sincronizar, limitarByte, inteiro } from './motor.js';

//==============================================================================
// Graphics
//==============================================================================
let frameCount = 0, frameRate = 60, brilho = 255;

globalThis.Graphics = rb.singleton(rb.modulo('Graphics'), {
  get frame_count() { return frameCount; },
  set frame_count(v) { frameCount = v; },
  get frame_rate() { return frameRate; },
  set frame_rate(v) { frameRate = Math.min(Math.max(inteiro(v), 10), 120); },
  get brightness() { return brilho; },
  set brightness(v) { brilho = limitarByte(v); },

  async update() {
    sincronizar();
    frameCount += 1;
    await motor().atualizarGraficos(brilho, frameRate);
  },

  async wait(duracao) {
    for (let i = 0, n = inteiro(duracao); i < n; i++) await Graphics.update();
  },

  async fadeout(duracao) {
    const inicio = brilho;
    const d = inteiro(duracao);
    for (let i = 0; i < d; i++) {
      brilho = inicio - rb.div(inicio * (i + 1), d);
      await Graphics.update();
    }
    brilho = 0;
  },

  async fadein(duracao) {
    const inicio = brilho;
    const d = inteiro(duracao);
    for (let i = 0; i < d; i++) {
      brilho = inicio + rb.div((255 - inicio) * (i + 1), d);
      await Graphics.update();
    }
    brilho = 255;
  },

  freeze() {
    sincronizar();
    motor().congelar();
  },

  async transition(duration = 10, filename = '', vague = 40) {
    brilho = 255;
    sincronizar();
    await motor().transicao(inteiro(duration), rb.str(filename), inteiro(vague), brilho, frameRate);
    frameCount += inteiro(duration);
  },

  frame_reset() { return null; },

  snap_to_bitmap() {
    sincronizar();
    return Bitmap.$deJs(motor().capturar());
  },

  get width() { return inteiro(motor().largura()); },
  get height() { return inteiro(motor().altura()); },

  resize_screen(w, h) { return motor().redimensionarTela(inteiro(w), inteiro(h)); },
});

//==============================================================================
// Input
//==============================================================================
let press = 0, trigger = 0, repeat = 0, dir4 = 0, dir8 = 0;

globalThis.Input = rb.singleton(rb.modulo('Input'), {
  DOWN: 2, LEFT: 4, RIGHT: 6, UP: 8,
  A: 11, B: 12, C: 13, X: 14, Y: 15, Z: 16, L: 17, R: 18,
  SHIFT: 21, CTRL: 22, ALT: 23,
  F5: 25, F6: 26, F7: 27, F8: 28, F9: 29,

  get dir4() { return dir4; },
  get dir8() { return dir8; },

  update() {
    const [p, t, r, d4, d8] = String(motor().atualizarEntrada()).split(',');
    press = rb.to_i(p); trigger = rb.to_i(t); repeat = rb.to_i(r); dir4 = rb.to_i(d4); dir8 = rb.to_i(d8);
  },

  press_p(b) { return ((press >> inteiro(b)) & 1) === 1; },
  trigger_p(b) { return ((trigger >> inteiro(b)) & 1) === 1; },
  repeat_p(b) { return ((repeat >> inteiro(b)) & 1) === 1; },
});

//==============================================================================
// Audio
//==============================================================================
globalThis.Audio = rb.singleton(rb.modulo('Audio'), {
  bgm_play(nome, volume = 100, pitch = 100) { return motor().bgmPlay(rb.str(nome), inteiro(volume), inteiro(pitch)); },
  bgm_stop() { return motor().bgmStop(); },
  bgm_fade(ms) { return motor().bgmFade(inteiro(ms)); },

  bgs_play(nome, volume = 80, pitch = 100) { return motor().bgsPlay(rb.str(nome), inteiro(volume), inteiro(pitch)); },
  bgs_stop() { return motor().bgsStop(); },
  bgs_fade(ms) { return motor().bgsFade(inteiro(ms)); },

  me_play(nome, volume = 100, pitch = 100) { return motor().mePlay(rb.str(nome), inteiro(volume), inteiro(pitch)); },
  me_stop() { return motor().meStop(); },
  me_fade(ms) { return motor().meFade(inteiro(ms)); },

  se_play(nome, volume = 80, pitch = 100) { return motor().sePlay(rb.str(nome), inteiro(volume), inteiro(pitch)); },
  se_stop() { return motor().seStop(); },
});
