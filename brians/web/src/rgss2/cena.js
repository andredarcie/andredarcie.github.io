// Objetos de cena do RGSS2 (Viewport, Sprite, Plane, Window, Tilemap), linha
// a linha de web/rgss/rgss.rb: o estado fica aqui e vai para o espelho do
// motor (src/rgss/objetos.js) por $sync, no Graphics.update seguinte.
import * as rb from 'rb';
import { motor, sujar, limitarByte, inteiro, real, verdade } from './motor.js';

const bool = (v) => (verdade(v) ? 1 : 0);
const js = (obj) => (obj ? obj.$js : null);
const bitmapVivo = (b) => (b && !b.disposed_p() ? b.$js : null);

// ------------------------------------------------------------------ ObjetoDeCena
const ObjetoDeCena = {
  $sujar() {
    if (this.$sujo) return;
    this.$sujo = true;
    sujar(this);
  },

  disposed_p() { return this.$descartado; },

  dispose() {
    if (this.$descartado) return;
    this.$descartado = true;
    this.$js.dispose();
  },

  $iniciarFlash() {
    this.$flashCor = null; this.$flashDur = 0; this.$flashResta = 0; this.$flashEsconde = false;
  },

  flash(color, duration) {
    this.$flashCor = color ? Color.new(color.red, color.green, color.blue, color.alpha) : null;
    this.$flashDur = inteiro(duration);
    this.$flashResta = inteiro(duration);
    this.$flashEsconde = color == null && inteiro(duration) > 0;
    this.$sujar();
  },

  $atualizarFlash() {
    if (this.$flashResta <= 0) return;
    this.$flashResta -= 1;
    if (this.$flashResta <= 0) this.$flashEsconde = false;
    this.$sujar();
  },

  // Cor efetiva: durante o flash, a cor do flash com alfa decrescente
  // (alpha é Float: a divisão é real, como no Ruby)
  $corEfetiva() {
    if (this.$flashResta > 0 && this.$flashCor) {
      const a = this.$flashCor.alpha * this.$flashResta / Math.max(this.$flashDur, 1);
      return [this.$flashCor.red, this.$flashCor.green, this.$flashCor.blue, a];
    }
    const c = this.$color;
    return [c.red, c.green, c.blue, c.alpha];
  },
};

function incluirCena(C) {
  for (const [k, f] of Object.entries(ObjetoDeCena)) {
    if (!Object.prototype.hasOwnProperty.call(C.prototype, k)) Object.defineProperty(C.prototype, k, { value: f, writable: true, configurable: true });
  }
}

// attr_reader + setter que converte e suja
function atributos(C, mapa) {
  for (const [nome, converter] of Object.entries(mapa)) {
    Object.defineProperty(C.prototype, nome, {
      get() { return this[`$${nome}`]; },
      set(v) { this[`$${nome}`] = converter(v); this.$sujar(); },
      configurable: true,
    });
  }
}
// Rect/Color/Tone próprios: o setter copia os valores para o objeto que já existe
function valores(C, nomes) {
  const copiar = {
    rect: (o, r) => o.set(r.x, r.y, r.width, r.height),
    src_rect: (o, r) => o.set(r.x, r.y, r.width, r.height),
    cursor_rect: (o, r) => o.set(r.x, r.y, r.width, r.height),
    color: (o, c) => o.set(c.red, c.green, c.blue, c.alpha),
    tone: (o, t) => o.set(t.red, t.green, t.blue, t.gray),
  };
  for (const nome of nomes) {
    Object.defineProperty(C.prototype, nome, {
      get() { return this[`$${nome}`]; },
      set(v) { copiar[nome](this[`$${nome}`], v); },
      configurable: true,
    });
  }
}
const somente = (C, nomes) => {
  for (const nome of nomes) Object.defineProperty(C.prototype, nome, { get() { return this[`$${nome}`]; }, configurable: true });
};

const igual = (v) => v;

// Rect/Color/Tone novos, já com o dono
function comDono(dono, valor) { valor.$dono = dono; return valor; }

//==============================================================================
// Viewport
//==============================================================================
globalThis.Viewport = rb.classe('Viewport', class Viewport extends rb.Objeto {
  initialize(...a) {
    if (a.length === 0) a = [0, 0, Graphics.width, Graphics.height];
    else if (a[0] instanceof Rect) { const r = a[0]; a = [r.x, r.y, r.width, r.height]; }
    this.$rect = comDono(this, Rect.new(...a));
    this.$color = comDono(this, Color.new(0, 0, 0, 0));
    this.$tone = comDono(this, Tone.new(0, 0, 0, 0));
    this.$visible = true; this.$z = 0; this.$ox = 0; this.$oy = 0;
    this.$descartado = false;
    this.$iniciarFlash();
    this.$js = motor().novoViewport();
    this.$sujar();
  }

  update() { this.$atualizarFlash(); }

  $sync() {
    this.$sujo = false;
    const c = this.$corEfetiva();
    const r = this.$rect, t = this.$tone;
    this.$js.sync(bool(verdade(this.$visible) && !this.$flashEsconde), r.x, r.y, r.width, r.height,
      this.$z, this.$ox, this.$oy, c[0], c[1], c[2], c[3], t.red, t.green, t.blue, t.gray);
  }
});
incluirCena(Viewport);
valores(Viewport, ['rect', 'color', 'tone']);
atributos(Viewport, { visible: igual, z: inteiro, ox: inteiro, oy: inteiro });

//==============================================================================
// Sprite
//==============================================================================
globalThis.Sprite = rb.classe('Sprite', class Sprite extends rb.Objeto {
  initialize(viewport = null) {
    this.$viewport = viewport;
    this.$bitmap = null;
    this.$src_rect = comDono(this, Rect.new(0, 0, 0, 0));
    this.$visible = true;
    this.$x = 0; this.$y = 0; this.$z = 0; this.$ox = 0; this.$oy = 0;
    this.$zoom_x = 1.0; this.$zoom_y = 1.0; this.$angle = 0; this.$mirror = false;
    this.$bush_depth = 0; this.$bush_opacity = 128;
    this.$opacity = 255; this.$blend_type = 0;
    this.$color = comDono(this, Color.new(0, 0, 0, 0));
    this.$tone = comDono(this, Tone.new(0, 0, 0, 0));
    this.$wave_amp = 0; this.$wave_length = 180; this.$wave_speed = 360; this.$wave_phase = 0.0;
    this.$descartado = false;
    this.$iniciarFlash();
    this.$js = motor().novoSprite(js(viewport));
    this.$sujar();
  }

  get bitmap() { return this.$bitmap; }
  set bitmap(b) {
    this.$bitmap = b;
    if (b && !b.disposed_p()) this.$src_rect.set(0, 0, b.width, b.height);
    this.$sujar();
  }

  get width() { return this.$src_rect.width; }
  get height() { return this.$src_rect.height; }

  update() {
    this.$atualizarFlash();
    if (this.$wave_amp !== 0) {
      this.$wave_phase += this.$wave_speed / 180.0;
      this.$sujar();
    }
  }

  $sync() {
    this.$sujo = false;
    const c = this.$corEfetiva();
    const s = this.$src_rect, t = this.$tone;
    this.$js.sync(bitmapVivo(this.$bitmap), bool(verdade(this.$visible) && !this.$flashEsconde),
      this.$x, this.$y, this.$z, this.$ox, this.$oy,
      this.$zoom_x, this.$zoom_y, real(this.$angle), bool(this.$mirror), this.$bush_depth, this.$bush_opacity,
      this.$opacity, this.$blend_type, s.x, s.y, s.width, s.height,
      c[0], c[1], c[2], c[3], t.red, t.green, t.blue, t.gray,
      this.$wave_amp, this.$wave_length, this.$wave_phase);
  }
});
incluirCena(Sprite);
somente(Sprite, ['viewport']);
valores(Sprite, ['src_rect', 'color', 'tone']);
atributos(Sprite, {
  visible: igual, x: inteiro, y: inteiro, z: inteiro, ox: inteiro, oy: inteiro,
  zoom_x: real, zoom_y: real, angle: igual, mirror: igual, bush_depth: inteiro, bush_opacity: limitarByte,
  opacity: limitarByte, blend_type: inteiro, wave_amp: inteiro, wave_length: inteiro, wave_speed: inteiro, wave_phase: real,
});

//==============================================================================
// Plane
//==============================================================================
globalThis.Plane = rb.classe('Plane', class Plane extends rb.Objeto {
  initialize(viewport = null) {
    this.$viewport = viewport;
    this.$bitmap = null; this.$visible = true; this.$z = 0; this.$ox = 0; this.$oy = 0;
    this.$zoom_x = 1.0; this.$zoom_y = 1.0; this.$opacity = 255; this.$blend_type = 0;
    this.$color = comDono(this, Color.new(0, 0, 0, 0));
    this.$tone = comDono(this, Tone.new(0, 0, 0, 0));
    this.$descartado = false;
    this.$iniciarFlash();
    this.$js = motor().novoPlane(js(viewport));
    this.$sujar();
  }

  $sync() {
    this.$sujo = false;
    const c = this.$color, t = this.$tone;
    this.$js.sync(bitmapVivo(this.$bitmap), bool(this.$visible), this.$z, this.$ox, this.$oy, this.$zoom_x, this.$zoom_y,
      this.$opacity, this.$blend_type, c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray);
  }
});
incluirCena(Plane);
somente(Plane, ['viewport']);
valores(Plane, ['color', 'tone']);
atributos(Plane, {
  bitmap: igual, visible: igual, z: inteiro, ox: inteiro, oy: inteiro, zoom_x: real, zoom_y: real,
  opacity: limitarByte, blend_type: inteiro,
});

//==============================================================================
// Window
//==============================================================================
globalThis.Window = rb.classe('Window', class Window extends rb.Objeto {
  initialize(viewport = null) {
    this.$viewport = viewport;
    this.$windowskin = null;
    this.$contents = Bitmap.new(1, 1);
    this.$cursor_rect = comDono(this, Rect.new(0, 0, 0, 0));
    this.$active = true; this.$visible = true; this.$pause = false;
    this.$x = 0; this.$y = 0; this.$width = 0; this.$height = 0; this.$z = 0; this.$ox = 0; this.$oy = 0;
    this.$opacity = 255; this.$back_opacity = 255; this.$contents_opacity = 255; this.$openness = 255;
    this.$contador = 0;
    this.$descartado = false;
    this.$iniciarFlash();
    this.$js = motor().novaJanela(js(viewport));
    this.$sujar();
  }

  open_p() { return this.$openness === 255; }
  close_p() { return this.$openness === 0; }

  update() {
    this.$contador += 1;
    this.$sujar();
  }

  $sync() {
    this.$sujo = false;
    const r = this.$cursor_rect;
    this.$js.sync(bitmapVivo(this.$windowskin), bitmapVivo(this.$contents),
      bool(this.$visible), bool(this.$active), bool(this.$pause),
      this.$x, this.$y, this.$width, this.$height, this.$z, this.$ox, this.$oy,
      this.$opacity, this.$back_opacity, this.$contents_opacity, this.$openness,
      r.x, r.y, r.width, r.height, this.$contador);
  }
});
incluirCena(Window);
somente(Window, ['viewport']);
valores(Window, ['cursor_rect']);
atributos(Window, {
  windowskin: igual, contents: igual, active: igual, visible: igual, pause: igual,
  x: inteiro, y: inteiro, width: inteiro, height: inteiro, z: inteiro, ox: inteiro, oy: inteiro,
  opacity: limitarByte, back_opacity: limitarByte, contents_opacity: limitarByte, openness: limitarByte,
});

//==============================================================================
// Tilemap
//==============================================================================
class Bitmaps extends rb.Objeto {
  initialize(tilemap) {
    this.tilemap = tilemap;
    this.lista = new Array(9).fill(null);
  }
  idx(i) { return rb.at(this.lista, i); }
  idxSet(i, b) {
    rb.aset(this.lista, i, b);
    this.tilemap.$js.definirBitmap(i, js(b));
    return b;
  }
}

globalThis.Tilemap = rb.classe('Tilemap', class Tilemap extends rb.Objeto {
  initialize(viewport = null) {
    this.$viewport = viewport;
    this.$js = motor().novoTilemap(js(viewport));
    this.$bitmaps = Bitmaps.new(this);
    this.$map_data = null; this.$flash_data = null; this.$passages = null;
    this.$visible = true; this.$ox = 0; this.$oy = 0;
    this.$contador = 0;
    this.$vMapa = null; this.$vPass = null; this.$vFlash = null;
    this.$descartado = false;
    this.$sujar();
  }

  get map_data() { return this.$map_data; }
  set map_data(t) { this.$map_data = t; this.$vMapa = null; this.$sujar(); }
  get flash_data() { return this.$flash_data; }
  set flash_data(t) { this.$flash_data = t; this.$vFlash = null; this.$sujar(); }
  get passages() { return this.$passages; }
  set passages(t) { this.$passages = t; this.$vPass = null; this.$sujar(); }

  update() {
    this.$contador += 1;
    this.$sujar();
  }

  $sync() {
    this.$sujo = false;
    const versao = (t) => [t, t.versao];
    const mesma = (v, t) => v && v[0] === t && v[1] === t.versao;
    const m = this.$map_data, p = this.$passages, f = this.$flash_data;
    if (m && !mesma(this.$vMapa, m)) {
      this.$js.definirMapa(m.xsize, m.ysize, m.zsize, m.$base64);
      this.$vMapa = versao(m);
    }
    if (p && !mesma(this.$vPass, p)) {
      this.$js.definirPassagens(p.$base64);
      this.$vPass = versao(p);
    }
    if (f && !mesma(this.$vFlash, f)) {
      this.$js.definirFlash(f.xsize, f.ysize, f.$base64);
      this.$vFlash = versao(f);
    }
    this.$js.sync(bool(this.$visible), this.$ox, this.$oy, Math.floor(this.$contador / 30), this.$contador);
  }
});
incluirCena(Tilemap);
Tilemap.Bitmaps = Bitmaps;
somente(Tilemap, ['viewport', 'bitmaps']);
atributos(Tilemap, { visible: igual, ox: inteiro, oy: inteiro });
