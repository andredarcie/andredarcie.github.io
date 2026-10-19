// Bitmap do RGSS2, linha a linha de web/rgss/rgss.rb. O desenho é do motor
// (src/rgss/bitmap.js); aqui ficam a API do RGSS, as conversões e a Font.
import * as rb from 'rb';
import { motor, inteiro } from './motor.js';

const bool = (v) => (rb.v(v) ? 1 : 0);

// rect ou x, y, w, h no começo dos argumentos
function comRect(a) {
  if (a[0] instanceof Rect) {
    const r = a[0];
    return [r.x, r.y, r.width, r.height, ...a.slice(1)];
  }
  return a;
}

globalThis.Bitmap = rb.classe('Bitmap', class Bitmap extends rb.Objeto {
  // Bitmap.new(arquivo) espera a imagem (quem cria usa await);
  // Bitmap.new(largura, altura) é imediato
  initialize(...args) {
    if (args.length === 1) return this.$carregar(rb.str(args[0]));
    this.$iniciar(motor().novoBitmap(inteiro(args[0]), inteiro(args[1])));
    return undefined;
  }

  async $carregar(nome) {
    const js = await motor().carregarBitmap(nome);
    if (!js) throw new rb.Errno.ENOENT(nome);
    this.$iniciar(js);
  }

  $iniciar(js) {
    this.$js = js;
    this.$width = js.largura | 0;
    this.$height = js.altura | 0;
    this.$font = Font.new();
    this.$descartado = false;
  }

  // Graphics.snap_to_bitmap: um Bitmap em volta de um bitmap do motor
  static $deJs(js) {
    const b = new Bitmap();
    b.$iniciar(js);
    return b;
  }

  get width() { return this.$width; }
  get height() { return this.$height; }
  get font() { return this.$font; }
  set font(v) { this.$font = v; }

  dispose() {
    if (this.$descartado) return;
    this.$descartado = true;
    this.$js.dispose();
  }

  disposed_p() { return this.$descartado; }

  get rect() { return Rect.new(0, 0, this.$width, this.$height); }

  blt(x, y, src, rect, opacity = 255) {
    return this.$js.blt(inteiro(x), inteiro(y), src.$js, rect.x, rect.y, rect.width, rect.height, inteiro(opacity));
  }

  stretch_blt(dest, src, rect, opacity = 255) {
    return this.$js.stretchBlt(dest.x, dest.y, dest.width, dest.height, src.$js,
      rect.x, rect.y, rect.width, rect.height, inteiro(opacity));
  }

  fill_rect(...a) {
    const [x, y, w, h, c] = comRect(a);
    return this.$js.fillRect(inteiro(x), inteiro(y), inteiro(w), inteiro(h), c.red, c.green, c.blue, c.alpha);
  }

  gradient_fill_rect(...a) {
    const [x, y, w, h, c1, c2, vertical = false] = comRect(a);
    return this.$js.gradientFillRect(inteiro(x), inteiro(y), inteiro(w), inteiro(h),
      c1.red, c1.green, c1.blue, c1.alpha, c2.red, c2.green, c2.blue, c2.alpha, bool(vertical));
  }

  clear() { return this.$js.clear(); }

  clear_rect(...a) {
    const [x, y, w, h] = comRect(a);
    return this.$js.clearRect(inteiro(x), inteiro(y), inteiro(w), inteiro(h));
  }

  get_pixel(x, y) {
    const n = Math.trunc(this.$js.getPixel(inteiro(x), inteiro(y)));
    return Color.new((n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255);
  }

  set_pixel(x, y, c) {
    return this.$js.setPixel(inteiro(x), inteiro(y), inteiro(c.red), inteiro(c.green), inteiro(c.blue), inteiro(c.alpha));
  }

  hue_change(hue) { return this.$js.hueChange(inteiro(hue)); }
  blur() { return this.$js.blur(); }
  radial_blur(angle, division) { return this.$js.radialBlur(inteiro(angle), inteiro(division)); }

  draw_text(...a) {
    const [x, y, w, h, str, align = 0] = comRect(a);
    const f = this.$font;
    const c = f.color;
    return this.$js.drawText(inteiro(x), inteiro(y), inteiro(w), inteiro(h), rb.str(str), inteiro(align ?? 0),
      f.$nome, inteiro(f.size), bool(f.bold), bool(f.italic), bool(f.shadow), c.red, c.green, c.blue, c.alpha);
  }

  text_size(str) {
    const f = this.$font;
    const n = Math.trunc(motor().textSize(rb.str(str), f.$nome, inteiro(f.size), bool(f.bold), bool(f.italic)));
    return Rect.new(0, 0, n >> 16, n & 0xFFFF);
  }
});
