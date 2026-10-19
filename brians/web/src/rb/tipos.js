// Classes nativas do RGSS2 que vão para o Marshal por _dump/_load (formato
// binário do RGSS200E.dll): Table, Color e Tone. Aqui só o dado e a
// serialização; a fachada completa (com o dono que avisa o motor) vem na
// etapa 4 e estende estas classes.

// Table: matriz de int16 com 1 a 3 dimensões (mapas, passabilidade…).
// _dump: int32 dim, xsize, ysize, zsize, total; depois os int16 (little-endian).
export class Table {
  static rubyName = 'Table';

  constructor(xsize = 0, ysize = 1, zsize = 1, dim = null) {
    this.dim = dim ?? (zsize > 1 ? 3 : ysize > 1 ? 2 : 1);
    this.xsize = xsize; this.ysize = ysize; this.zsize = zsize;
    this.data = new Int16Array(xsize * ysize * zsize);
  }

  // table[x, y, z]: fora dos limites é nil
  get(x, y = 0, z = 0) {
    if (x < 0 || x >= this.xsize || y < 0 || y >= this.ysize || z < 0 || z >= this.zsize) return null;
    return this.data[x + (y + z * this.ysize) * this.xsize];
  }

  // table[x, y, z] = v (o int16 dá a volta, como no RGSS)
  set(x, y, z, v) {
    if (x < 0 || x >= this.xsize || y < 0 || y >= this.ysize || z < 0 || z >= this.zsize) return v;
    this.data[x + (y + z * this.ysize) * this.xsize] = v;
    return v;
  }

  // Table#resize preserva o que cabe
  resize(xsize, ysize = 1, zsize = 1) {
    const nova = new Table(xsize, ysize, zsize);
    for (let z = 0; z < Math.min(zsize, this.zsize); z++)
      for (let y = 0; y < Math.min(ysize, this.ysize); y++)
        for (let x = 0; x < Math.min(xsize, this.xsize); x++) nova.set(x, y, z, this.get(x, y, z));
    Object.assign(this, { dim: nova.dim, xsize, ysize, zsize, data: nova.data });
  }

  _dump() {
    const n = this.data.length;
    const b = new Uint8Array(20 + n * 2);
    const d = new DataView(b.buffer);
    [this.dim, this.xsize, this.ysize, this.zsize, n].forEach((x, i) => d.setInt32(i * 4, x, true));
    for (let i = 0; i < n; i++) d.setInt16(20 + i * 2, this.data[i], true);
    return b;
  }

  static _load(b) {
    const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const t = new Table(d.getInt32(4, true), d.getInt32(8, true), d.getInt32(12, true), d.getInt32(0, true));
    const n = d.getInt32(16, true);
    if (n !== t.data.length) t.data = new Int16Array(n);
    for (let i = 0; i < n; i++) t.data[i] = d.getInt16(20 + i * 2, true);
    return t;
  }
}

// Color / Tone: 4 doubles (little-endian). Os valores são Float no RGSS,
// limitados a 0..255 (Color) e -255..255 (Tone; gray 0..255).
const limitar = (x, a, b) => Math.min(Math.max(x, a), b);

class Quatro {
  _dump() {
    const b = new Uint8Array(32);
    const d = new DataView(b.buffer);
    this.valores().forEach((x, i) => d.setFloat64(i * 8, x, true));
    return b;
  }

  static ler(b) {
    const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return [0, 1, 2, 3].map((i) => d.getFloat64(i * 8, true));
  }
}

export class Color extends Quatro {
  static rubyName = 'Color';

  constructor(red = 0, green = 0, blue = 0, alpha = 255) {
    super();
    this.set(red, green, blue, alpha);
  }

  set(red, green, blue, alpha = 255) {
    if (red instanceof Color) ({ red, green, blue, alpha } = red);
    this.red = limitar(red, 0, 255); this.green = limitar(green, 0, 255);
    this.blue = limitar(blue, 0, 255); this.alpha = limitar(alpha, 0, 255);
    return this;
  }

  valores() { return [this.red, this.green, this.blue, this.alpha]; }

  // _load não passa pelo limite: devolve exatamente o que estava gravado
  static _load(b) {
    const c = new Color();
    [c.red, c.green, c.blue, c.alpha] = Quatro.ler(b);
    return c;
  }
}

export class Tone extends Quatro {
  static rubyName = 'Tone';

  constructor(red = 0, green = 0, blue = 0, gray = 0) {
    super();
    this.set(red, green, blue, gray);
  }

  set(red, green, blue, gray = 0) {
    if (red instanceof Tone) ({ red, green, blue, gray } = red);
    this.red = limitar(red, -255, 255); this.green = limitar(green, -255, 255);
    this.blue = limitar(blue, -255, 255); this.gray = limitar(gray, 0, 255);
    return this;
  }

  valores() { return [this.red, this.green, this.blue, this.gray]; }

  static _load(b) {
    const t = new Tone();
    [t.red, t.green, t.blue, t.gray] = Quatro.ler(b);
    return t;
  }
}
