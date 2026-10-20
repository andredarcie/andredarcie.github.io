// Bitmap do RGSS2: uma imagem RGBA editável. Por baixo é um canvas 2D; o
// renderizador WebGL sobe a textura de novo quando `versao` muda.
import { resolver, url } from '../arquivos.js';

const EXTENSOES_IMAGEM = ['.png', '.jpg', '.jpeg', '.bmp'];
const imagens = new Map(); // caminho real → Promise<ImageBitmap>
let proximoId = 1;

export class Bitmap {
  static SUPER = 4; // fator de superamostragem do texto

  // lerMuito: canvas na memória (não na GPU), para bitmap que vai ser lido
  // pixel a pixel (getImageData na GPU obriga a esperar e copiar de volta)
  constructor(largura, altura, lerMuito = false) {
    this.id = proximoId++;
    this.largura = Math.max(1, largura | 0);
    this.altura = Math.max(1, altura | 0);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.largura;
    this.canvas.height = this.altura;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: lerMuito });
    this.ctx.imageSmoothingEnabled = false;
    this.versao = 1;      // muda a cada escrita
    this.textura = null;  // cache do renderizador
    this.versaoTextura = 0;
    this.pixels = null;   // cache de getImageData para get_pixel
    this.versaoPixels = 0;
    this.descartado = false;
  }

  static async carregar(caminho) {
    const real = resolver(caminho, EXTENSOES_IMAGEM);
    if (!real) return null;
    if (!imagens.has(real)) {
      imagens.set(real, fetch(url(real))
        .then((r) => { if (!r.ok) throw new Error(`${r.status} ${real}`); return r.blob(); })
        .then((b) => createImageBitmap(b, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })));
    }
    let img;
    try { img = await imagens.get(real); } catch (e) { imagens.delete(real); console.warn(e); return null; }
    const bmp = new Bitmap(img.width, img.height);
    bmp.ctx.drawImage(img, 0, 0);
    return bmp;
  }

  mudou() { this.versao++; }

  dispose() {
    this.descartado = true;
    this.canvas.width = this.canvas.height = 1;
    this.pixels = null;
  }

  // ---------------------------------------------------------------- desenho
  blt(x, y, src, sx, sy, sw, sh, opacidade) {
    this.stretchBlt(x, y, sw, sh, src, sx, sy, sw, sh, opacidade);
  }

  stretchBlt(dx, dy, dw, dh, src, sx, sy, sw, sh, opacidade) {
    // Recorta o retângulo de origem aos limites do bitmap fonte (o RGSS ignora o que sobra).
    if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0 || opacidade <= 0) return;
    const ex = dw / sw, ey = dh / sh;
    let x0 = sx, y0 = sy, x1 = sx + sw, y1 = sy + sh;
    if (x0 < 0) { dx -= x0 * ex; x0 = 0; }
    if (y0 < 0) { dy -= y0 * ey; y0 = 0; }
    x1 = Math.min(x1, src.largura); y1 = Math.min(y1, src.altura);
    if (x1 <= x0 || y1 <= y0) return;
    const c = this.ctx;
    c.globalAlpha = Math.min(255, opacidade) / 255;
    c.imageSmoothingEnabled = false;
    c.drawImage(src.canvas, x0, y0, x1 - x0, y1 - y0, dx, dy, (x1 - x0) * ex, (y1 - y0) * ey);
    c.globalAlpha = 1;
    this.mudou();
  }

  // fill_rect substitui os pixels (não mistura), inclusive o alfa.
  fillRect(x, y, w, h, r, g, b, a) {
    const c = this.ctx;
    c.clearRect(x, y, w, h);
    if (a > 0) {
      c.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a / 255})`;
      c.fillRect(x, y, w, h);
    }
    this.mudou();
  }

  gradientFillRect(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, vertical) {
    const c = this.ctx;
    const grad = vertical ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, `rgba(${r1 | 0},${g1 | 0},${b1 | 0},${a1 / 255})`);
    grad.addColorStop(1, `rgba(${r2 | 0},${g2 | 0},${b2 | 0},${a2 / 255})`);
    c.clearRect(x, y, w, h);
    c.fillStyle = grad;
    c.fillRect(x, y, w, h);
    this.mudou();
  }

  clearRect(x, y, w, h) { this.ctx.clearRect(x, y, w, h); this.mudou(); }
  clear() { this.ctx.clearRect(0, 0, this.largura, this.altura); this.mudou(); }

  // ---------------------------------------------------------------- pixels
  lerPixels() {
    if (!this.pixels || this.versaoPixels !== this.versao) {
      this.pixels = this.ctx.getImageData(0, 0, this.largura, this.altura);
      this.versaoPixels = this.versao;
    }
    return this.pixels;
  }

  // Devolve r,g,b,a empacotados num número (r*2^24 + g*2^16 + b*2^8 + a).
  getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.largura || y >= this.altura) return 0;
    const d = this.lerPixels().data, i = (y * this.largura + x) * 4;
    return d[i] * 16777216 + d[i + 1] * 65536 + d[i + 2] * 256 + d[i + 3];
  }

  setPixel(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.largura || y >= this.altura) return;
    const px = this.ctx.createImageData(1, 1);
    px.data[0] = r; px.data[1] = g; px.data[2] = b; px.data[3] = a;
    this.ctx.putImageData(px, x, y);
    this.mudou();
  }

  aplicarPixels(fn) {
    const img = this.ctx.getImageData(0, 0, this.largura, this.altura);
    fn(img.data, this.largura, this.altura);
    this.ctx.putImageData(img, 0, 0);
    this.mudou();
  }

  hueChange(graus) {
    const h = (((graus % 360) + 360) % 360) / 60;
    if (h === 0) return;
    this.aplicarPixels((d) => {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
        if (delta === 0) continue;
        let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
        hue = (hue + h + 6) % 6;
        const x = delta * (1 - Math.abs((hue % 2) - 1));
        let rr, gg, bb;
        if (hue < 1) [rr, gg, bb] = [delta, x, 0];
        else if (hue < 2) [rr, gg, bb] = [x, delta, 0];
        else if (hue < 3) [rr, gg, bb] = [0, delta, x];
        else if (hue < 4) [rr, gg, bb] = [0, x, delta];
        else if (hue < 5) [rr, gg, bb] = [x, 0, delta];
        else [rr, gg, bb] = [delta, 0, x];
        d[i] = rr + min; d[i + 1] = gg + min; d[i + 2] = bb + min;
      }
    });
  }

  blur() {
    // média 3×3 dos vizinhos que existem, separada em linha e coluna: a
    // soma e o divisor são os mesmos da janela 3×3 (o resultado é idêntico),
    // com 6 leituras por canal em vez de 9 e sem testar borda a cada vizinho
    this.aplicarPixels((d, w, h) => {
      const L = w * 4, soma = new Uint16Array(d.length), nx = new Uint8Array(w);
      for (let x = 0; x < w; x++) nx[x] = 1 + (x > 0) + (x < w - 1);
      for (let ini = 0; ini < d.length; ini += L) {
        const fim = ini + L;
        for (let i = ini; i < fim; i++) soma[i] = d[i] + (i - 4 >= ini ? d[i - 4] : 0) + (i + 4 < fim ? d[i + 4] : 0);
      }
      for (let y = 0, ini = 0; y < h; y++, ini += L) {
        const ny = 1 + (y > 0) + (y < h - 1);
        for (let i = ini, x = 0; x < w; x++) {
          const n = nx[x] * ny;
          for (let c = 0; c < 4; c++, i++) d[i] = (soma[i] + (y > 0 ? soma[i - L] : 0) + (y < h - 1 ? soma[i + L] : 0)) / n;
        }
      }
    });
  }

  radialBlur(angulo, divisoes) {
    divisoes = Math.max(2, Math.min(100, divisoes | 0));
    const copia = document.createElement('canvas');
    copia.width = this.largura; copia.height = this.altura;
    copia.getContext('2d').drawImage(this.canvas, 0, 0);
    const c = this.ctx;
    c.clearRect(0, 0, this.largura, this.altura);
    for (let i = 0; i < divisoes; i++) {
      const a = ((i / (divisoes - 1)) - 0.5) * angulo * Math.PI / 180;
      c.save();
      c.globalAlpha = 1 / (i + 1);
      c.translate(this.largura / 2, this.altura / 2);
      c.rotate(a);
      c.drawImage(copia, -this.largura / 2, -this.altura / 2);
      c.restore();
    }
    this.mudou();
  }

  // ---------------------------------------------------------------- texto
  // Lista CSS de famílias. Verdana não existe em todo sistema (Android, Linux):
  // DejaVu Sans (derivada da Bitstream Vera, desenhada nas mesmas proporções)
  // entra no lugar e, sem ela, a Open Sans que o jogo carrega (larga, de
  // altura-x grande, a mais próxima da Verdana entre as fontes web populares).
  static familias(nome) {
    const lista = String(nome).split('\u0000').filter(Boolean);
    const css = [];
    for (const n of lista) {
      css.push(`"${n}"`);
      if (/^verdana$/i.test(n)) css.push('"DejaVu Sans"', '"Bitstream Vera Sans"', '"Open Sans"');
    }
    return `${css.join(', ') || '"Verdana"'}, sans-serif`;
  }

  // O RGSS2 cria a fonte pelo GDI com altura de CÉLULA = font.size
  // (ascendente + descendente), não pelo em. Ex.: Verdana 20 → em de 16,5px.
  static fatorCelula(familias) {
    const cache = Bitmap.cacheCelula ??= new Map();
    if (!cache.has(familias)) {
      const ctx = Bitmap.ctxMedida ??= document.createElement('canvas').getContext('2d');
      ctx.font = `100px ${familias}`;
      const m = ctx.measureText('Hg');
      const altura = (m.fontBoundingBoxAscent ?? 80) + (m.fontBoundingBoxDescent ?? 20);
      cache.set(familias, altura / 100);
    }
    return cache.get(familias);
  }

  static fonteCss(nome, tamanho, negrito, italico) {
    const fam = Bitmap.familias(nome);
    const em = tamanho / Bitmap.fatorCelula(fam);
    return `${italico ? 'italic ' : ''}${negrito ? 'bold ' : ''}${em}px ${fam}`;
  }

  static medir(ctx, texto, css) {
    ctx.font = css;
    const m = ctx.measureText(texto);
    const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    return { largura: m.width, ascendente: asc, altura: asc + desc };
  }

  // Igual ao RGSS2: texto centralizado na vertical do retângulo e espremido
  // na horizontal quando não cabe; sombra preta deslocada 1px.
  // O RGSS2 rasteriza o contorno da fonte com antialiasing (GDI); para chegar
  // perto, o texto é desenhado em SUPER× e reduzido com suavização.
  drawText(x, y, w, h, texto, alinhamento, nome, tamanho, negrito, italico, sombra, r, g, b, a) {
    texto = String(texto);
    if (!texto || w <= 0 || h <= 0) return;
    const S = Bitmap.SUPER;
    const css = Bitmap.fonteCss(nome, tamanho * S, negrito, italico);
    // A janela de mensagem escreve uma letra por quadro: as letras soltas
    // ficam prontas num cache (trocar ctx.font, medir e rasterizar em 4×
    // custava ~1 ms por letra no PC, bem mais no celular).
    const chave = texto.length <= 2 ? `${css}|${sombra ? 1 : 0}|${r | 0},${g | 0},${b | 0}|${texto}` : null;
    const pronto = chave && Bitmap.cacheTexto.get(chave);
    if (pronto) return this.colarTexto(pronto, x, y, w, h, alinhamento, a);
    const aux = chave ? document.createElement('canvas').getContext('2d')
      : Bitmap.ctxTexto ??= document.createElement('canvas').getContext('2d');
    const m = Bitmap.medir(aux, texto, css);
    // texto (e sombra) em alta resolução
    const margem = 2 * S;
    const cw = Math.ceil(m.largura) + margem * 2, ch = Math.ceil(m.altura) + margem * 2;
    const cv = aux.canvas;
    if (chave) { cv.width = cw; cv.height = ch; }
    else if (cv.width < cw || cv.height < ch) { cv.width = Math.max(cv.width, cw); cv.height = Math.max(cv.height, ch); }
    aux.setTransform(1, 0, 0, 1, 0, 0);
    // limpa tudo: a redução suavizada lê pixels além da borda do recorte
    aux.clearRect(0, 0, cv.width, cv.height);
    aux.font = css;
    aux.textBaseline = 'alphabetic';
    if (sombra) {
      aux.fillStyle = 'rgba(0,0,0,1)';
      aux.fillText(texto, margem + S, margem + m.ascendente + S);
    }
    aux.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    aux.fillText(texto, margem, margem + m.ascendente);
    const feito = { cv, cw, ch, largura: m.largura, altura: m.altura };
    if (chave) {
      if (Bitmap.cacheTexto.size >= 512) Bitmap.cacheTexto.clear();
      Bitmap.cacheTexto.set(chave, feito);
    }
    this.colarTexto(feito, x, y, w, h, alinhamento, a);
  }

  static cacheTexto = new Map(); // letra + fonte + cor → texto já rasterizado

  // reduz o texto rasterizado em SUPER× para o bitmap, alinhado no retângulo
  colarTexto({ cv, cw, ch, largura: lm, altura: am }, x, y, w, h, alinhamento, a) {
    const S = Bitmap.SUPER, margem = 2 * S;
    const largura = lm / S, altura = am / S;
    const escala = largura > w ? w / largura : 1;
    const larguraFinal = largura * escala;
    let tx = x;
    if (alinhamento === 1) tx = x + (w - larguraFinal) / 2;
    else if (alinhamento === 2) tx = x + w - larguraFinal;
    const ty = y + (h - altura) / 2;
    const c = this.ctx;
    c.save();
    c.beginPath(); c.rect(x, y, w + 1, h + 1); c.clip();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.globalAlpha = a / 255;
    c.drawImage(cv, 0, 0, cw, ch,
      Math.round(tx) - (margem / S) * escala, Math.round(ty) - margem / S, (cw / S) * escala, ch / S);
    c.restore();
    this.mudou();
  }

  // Largura e altura empacotadas: largura * 65536 + altura.
  static textSize(texto, nome, tamanho, negrito, italico) {
    const S = Bitmap.SUPER;
    texto = String(texto);
    const css = Bitmap.fonteCss(nome, tamanho * S, negrito, italico);
    const chave = texto.length <= 2 ? `${css}|${texto}` : null;
    const pronto = chave && Bitmap.cacheMedida.get(chave);
    if (pronto !== undefined && pronto !== null) return pronto;
    const ctx = Bitmap.ctxMedida ??= document.createElement('canvas').getContext('2d');
    const m = Bitmap.medir(ctx, texto, css);
    const r = Math.ceil(m.largura / S) * 65536 + Math.ceil(m.altura / S);
    if (chave) {
      if (Bitmap.cacheMedida.size >= 2048) Bitmap.cacheMedida.clear();
      Bitmap.cacheMedida.set(chave, r);
    }
    return r;
  }

  static cacheMedida = new Map(); // letra + fonte → tamanho empacotado
}
