// Rect, Color, Tone, Table e Font do RGSS2, linha a linha de web/rgss/rgss.rb.
// Rect/Color/Tone são valores mutáveis: quando pertencem a um objeto de cena
// (sprite.src_rect, viewport.tone…), avisam o dono ao mudar.
// Rect, Color, Tone e Table vão para o Marshal por _dump/_load, no formato
// do RGSS200E (e substituem os de rb/tipos.js no registro).
import * as rb from 'rb';
import { Table as TabelaDados } from '../rb/tipos.js';
import { inteiro, real } from './motor.js';

// Atributos com setter que avisa o dono: get x / set x (converte e avisa)
function campos(C, nomes, converter) {
  for (const nome of nomes) {
    Object.defineProperty(C.prototype, nome, {
      get() { return this[`$${nome}`]; },
      set(v) { this[`$${nome}`] = converter(v); this.$mudou(); },
      configurable: true,
    });
  }
}

const comDono = {
  $mudou() { if (this.$dono) this.$dono.$sujar(); },
};

//==============================================================================
// Rect
//==============================================================================
globalThis.Rect = rb.classe('Rect', class Rect extends rb.Objeto {
  initialize(x = 0, y = 0, width = 0, height = 0) {
    this.$x = inteiro(x); this.$y = inteiro(y); this.$width = inteiro(width); this.$height = inteiro(height);
    this.$dono = null;
  }

  set(x, y = null, width = null, height = null) {
    if (x instanceof Rect) {
      [this.$x, this.$y, this.$width, this.$height] = [x.x, x.y, x.width, x.height];
    } else {
      this.$x = inteiro(x); this.$y = inteiro(y); this.$width = inteiro(width); this.$height = inteiro(height);
    }
    this.$mudou();
    return this;
  }

  empty() { return this.set(0, 0, 0, 0); }

  eq(o) { return o instanceof Rect && this.$x === o.x && this.$y === o.y && this.$width === o.width && this.$height === o.height; }

  to_s() { return `(${this.$x}, ${this.$y}, ${this.$width}, ${this.$height})`; }

  clone() { return Rect.new(this.$x, this.$y, this.$width, this.$height); }

  _dump() {
    const b = new Uint8Array(16);
    const d = new DataView(b.buffer);
    [this.$x, this.$y, this.$width, this.$height].forEach((x, i) => d.setInt32(i * 4, x, true));
    return b;
  }

  static _load(b) {
    const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return Rect.new(...[0, 1, 2, 3].map((i) => d.getInt32(i * 4, true)));
  }
});
Object.assign(Rect.prototype, comDono);
campos(Rect, ['x', 'y', 'width', 'height'], inteiro);

//==============================================================================
// Color e Tone (4 doubles; o RGSS guarda Float)
//==============================================================================
function dump4(valores) {
  const b = new Uint8Array(32);
  const d = new DataView(b.buffer);
  valores.forEach((x, i) => d.setFloat64(i * 8, x, true));
  return b;
}
function load4(b) {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return [0, 1, 2, 3].map((i) => d.getFloat64(i * 8, true));
}

globalThis.Color = rb.classe('Color', class Color extends rb.Objeto {
  initialize(red = 0, green = 0, blue = 0, alpha = 255) {
    this.$dono = null;
    this.set(red, green, blue, alpha);
  }

  set(red, green = null, blue = null, alpha = 255) {
    if (red instanceof Color) [red, green, blue, alpha] = [red.red, red.green, red.blue, red.alpha];
    this.$red = Color.limitar(red); this.$green = Color.limitar(green);
    this.$blue = Color.limitar(blue); this.$alpha = Color.limitar(alpha);
    this.$mudou();
    return this;
  }

  static limitar(v) {
    v = real(v);
    return v < 0 ? 0.0 : v > 255 ? 255.0 : v;
  }

  eq(o) { return o instanceof Color && this.$red === o.red && this.$green === o.green && this.$blue === o.blue && this.$alpha === o.alpha; }
  to_s() { return `(${rb.str(this.$red)}, ${rb.str(this.$green)}, ${rb.str(this.$blue)}, ${rb.str(this.$alpha)})`; }
  clone() { return Color.new(this.$red, this.$green, this.$blue, this.$alpha); }

  _dump() { return dump4([this.$red, this.$green, this.$blue, this.$alpha]); }

  // sem passar pelo limite: devolve exatamente o que estava gravado
  static _load(b) {
    const c = Color.new();
    [c.$red, c.$green, c.$blue, c.$alpha] = load4(b);
    return c;
  }
});
Object.assign(Color.prototype, comDono);
campos(Color, ['red', 'green', 'blue', 'alpha'], (v) => Color.limitar(v));

globalThis.Tone = rb.classe('Tone', class Tone extends rb.Objeto {
  initialize(red = 0, green = 0, blue = 0, gray = 0) {
    this.$dono = null;
    this.set(red, green, blue, gray);
  }

  set(red, green = null, blue = null, gray = 0) {
    if (red instanceof Tone) [red, green, blue, gray] = [red.red, red.green, red.blue, red.gray];
    this.$red = Tone.limitar(red); this.$green = Tone.limitar(green); this.$blue = Tone.limitar(blue);
    this.$gray = Color.limitar(gray);
    this.$mudou();
    return this;
  }

  static limitar(v) {
    v = real(v);
    return v < -255 ? -255.0 : v > 255 ? 255.0 : v;
  }

  eq(o) { return o instanceof Tone && this.$red === o.red && this.$green === o.green && this.$blue === o.blue && this.$gray === o.gray; }
  to_s() { return `(${rb.str(this.$red)}, ${rb.str(this.$green)}, ${rb.str(this.$blue)}, ${rb.str(this.$gray)})`; }
  clone() { return Tone.new(this.$red, this.$green, this.$blue, this.$gray); }

  _dump() { return dump4([this.$red, this.$green, this.$blue, this.$gray]); }

  static _load(b) {
    const t = Tone.new();
    [t.$red, t.$green, t.$blue, t.$gray] = load4(b);
    return t;
  }
});
Object.assign(Tone.prototype, comDono);
campos(Tone, ['red', 'green', 'blue'], (v) => Tone.limitar(v));
campos(Tone, ['gray'], (v) => Color.limitar(v));

//==============================================================================
// Table: matriz de inteiros de 16 bits (mapas, passages, parâmetros).
// O dado e o _dump são os de rb/tipos.js; aqui entram o Table.new do Ruby
// (dim pelo número de argumentos), [] / []= e a versão que o Tilemap usa
// para saber quando reenviar o mapa ao motor.
//==============================================================================
globalThis.Table = rb.classe('Table', class Table extends TabelaDados {
  static new(xsize, ysize = null, zsize = null) {
    const dim = zsize !== null ? 3 : ysize !== null ? 2 : 1;
    const t = new Table(inteiro(xsize), inteiro(ysize ?? 1), inteiro(zsize ?? 1), dim);
    t.versao = 0;
    return t;
  }

  static _load(b) {
    const t = super._load(b);
    Object.setPrototypeOf(t, Table.prototype);
    t.versao = 0;
    return t;
  }

  resize(xsize, ysize = null, zsize = null) {
    super.resize(inteiro(xsize), inteiro(ysize ?? 1), inteiro(zsize ?? 1));
    this.dim = zsize !== null ? 3 : ysize !== null ? 2 : 1;
    this.versao++;
  }

  idx(x, y = 0, z = 0) { return this.get(x, y, z); }

  // table[x] = v, table[x, y] = v, table[x, y, z] = v
  idxSet(...args) {
    const v = args.pop();
    const [x, y = 0, z = 0] = args;
    if (x < 0 || x >= this.xsize || y < 0 || y >= this.ysize || z < 0 || z >= this.zsize) return v;
    this.set(x, y, z, inteiro(v));
    this.versao++;
    return v;
  }

  clone() {
    const t = Table.new(this.xsize, this.ysize, this.zsize);
    t.dim = this.dim;
    t.data = this.data.slice();
    return t;
  }

  // os bytes dos int16, para o motor (definirMapa/definirPassagens/definirFlash)
  get $base64() {
    const b = new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    let bin = '';
    for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(bin);
  }
});

//==============================================================================
// Font
//==============================================================================
// Padrão do RGSS200E (edição em inglês do VX): o Game.exe original desenha
// em Verdana; conferido comparando capturas do executável de 2014.
const padrao = {
  name: ['Verdana', 'Arial', 'Courier New'],
  size: 20, bold: false, italic: false, shadow: true, color: null,
};
// 'UmePlus Gothic' fica na lista porque o Main de 2014 confere se ela existe
// (o arquivo saiu: o texto do jogo é em Verdana, e a página usa a Open Sans)
const FONTES = ['UmePlus Gothic', 'Open Sans', 'Arial', 'Courier New', 'Times New Roman', 'Verdana', 'Tahoma', 'Georgia'];

globalThis.Font = rb.classe('Font', class Font extends rb.Objeto {
  static exist_p(nome) {
    const n = rb.str(nome).toLowerCase();
    return FONTES.some((f) => f.toLowerCase() === n);
  }

  static get default_name() { return padrao.name; }
  static set default_name(v) { padrao.name = v; }
  static get default_size() { return padrao.size; }
  static set default_size(v) { padrao.size = v; }
  static get default_bold() { return padrao.bold; }
  static set default_bold(v) { padrao.bold = v; }
  static get default_italic() { return padrao.italic; }
  static set default_italic(v) { padrao.italic = v; }
  static get default_shadow() { return padrao.shadow; }
  static set default_shadow(v) { padrao.shadow = v; }
  static get default_color() { return padrao.color; }
  static set default_color(v) { padrao.color = v; }

  initialize(name = padrao.name, size = padrao.size) {
    this.$name = Array.isArray(name) ? [...name] : name;
    this.$size = size;
    this.$bold = padrao.bold; this.$italic = padrao.italic; this.$shadow = padrao.shadow;
    const c = padrao.color;
    this.$color = Color.new(c.red, c.green, c.blue, c.alpha);
  }

  get name() { return this.$name; }
  set name(v) { this.$name = v; }
  get size() { return this.$size; }
  set size(v) { this.$size = v; }
  get bold() { return this.$bold; }
  set bold(v) { this.$bold = v; }
  get italic() { return this.$italic; }
  set italic(v) { this.$italic = v; }
  get shadow() { return this.$shadow; }
  set shadow(v) { this.$shadow = v; }
  get color() { return this.$color; }
  set color(c) { this.$color = Color.new(c.red, c.green, c.blue, c.alpha); }

  // nome para o motor: as famílias separadas por \0
  get $nome() { return rb.a(this.$name).map(rb.str).join('\0'); }
});
padrao.color = Color.new(255, 255, 255, 255);
