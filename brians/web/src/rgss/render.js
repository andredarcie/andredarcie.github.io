// Renderizador WebGL2 do RGSS2.
// Ordem de desenho igual à do RGSS: objetos de topo e viewports ordenados por
// z (empate → ordem de criação); dentro de cada viewport, idem. Efeitos de
// viewport (cor/tom/flash) são aplicados sobre a região já desenhada da tela.
import { cena } from './objetos.js';
import { desenharTilemap } from './tilemap.js';

const VERT = `#version 300 es
in vec2 a_pos; in vec2 a_uv;
uniform vec2 u_tela;
out vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_pos.x / u_tela.x * 2.0 - 1.0, 1.0 - a_pos.y / u_tela.y * 2.0, 0.0, 1.0);
}`;

// Tom (cinza + soma rgb), depois cor (mistura pela alfa), depois opacidade.
const FRAG_SPRITE = `#version 300 es
precision mediump float;
uniform sampler2D u_tex; uniform float u_opac; uniform vec4 u_cor; uniform vec4 u_tom;
in vec2 v_uv; out vec4 saida;
void main() {
  vec4 c = texture(u_tex, v_uv);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb = mix(c.rgb, vec3(l), u_tom.a);
  c.rgb = clamp(c.rgb + u_tom.rgb, 0.0, 1.0);
  c.rgb = mix(c.rgb, u_cor.rgb, u_cor.a);
  c.a *= u_opac;
  saida = c;
}`;

// Transição: sem imagem, mistura linear; com imagem, limiar pela luminância
// da imagem com borda suave proporcional a "vague".
const FRAG_TRANSICAO = `#version 300 es
precision mediump float;
uniform sampler2D u_de; uniform sampler2D u_para; uniform sampler2D u_mapa;
uniform float u_prog; uniform float u_vague; uniform bool u_temMapa;
in vec2 v_uv; out vec4 saida;
void main() {
  vec4 a = texture(u_de, v_uv); vec4 b = texture(u_para, v_uv);
  float t = u_prog;
  if (u_temMapa) {
    float m = texture(u_mapa, vec2(v_uv.x, 1.0 - v_uv.y)).r;
    float v = max(u_vague, 1.0 / 255.0);
    t = clamp((u_prog * (1.0 + v) - m) / v, 0.0, 1.0);
  }
  saida = vec4(mix(a.rgb, b.rgb, t), 1.0);
}`;

const NEUTRO = [0, 0, 0, 0];
const MAX_QUADS = 4096;

export class Renderizador {
  constructor(canvas, largura, altura) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('Este navegador não tem WebGL2.');
    this.gl = gl;
    this.progSprite = this.programa(VERT, FRAG_SPRITE);
    this.progTransicao = this.programa(VERT, FRAG_TRANSICAO);
    this.vertices = new Float32Array(MAX_QUADS * 6 * 4);
    this.nVertices = 0;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.byteLength, gl.DYNAMIC_DRAW);
    for (const prog of [this.progSprite, this.progTransicao]) {
      const pos = gl.getAttribLocation(prog.p, 'a_pos'), uv = gl.getAttribLocation(prog.p, 'a_uv');
      gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
    }
    this.branco = this.texturaCrua(1, 1, new Uint8Array([255, 255, 255, 255]));
    this.texturas = new Map(); // Bitmap → { tex, versao }
    this.estado = null;
    this.alvoLargura = 0; this.alvoAltura = 0;
    this.redimensionar(largura, altura);
  }

  programa(vs, fs) {
    const gl = this.gl;
    const compilar = (tipo, src) => {
      const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compilar(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compilar(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a_pos'); gl.bindAttribLocation(p, 1, 'a_uv');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
      const nome = gl.getActiveUniform(p, i).name; u[nome] = gl.getUniformLocation(p, nome);
    }
    return { p, u };
  }

  texturaCrua(w, h, dados) {
    const gl = this.gl, t = gl.createTexture();
    this.flush();
    this.estado = null;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, dados);
    this.parametros();
    return t;
  }

  parametros() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // Textura de tela (FBO) do tamanho do jogo.
  alvo() {
    const gl = this.gl;
    const tex = this.texturaCrua(this.largura, this.altura, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo };
  }

  redimensionar(largura, altura) {
    this.largura = largura; this.altura = altura;
    this.canvas.width = largura; this.canvas.height = altura;
    this.tela = this.alvo();      // cena atual
    this.congelada = this.alvo(); // Graphics.freeze
    this.nova = this.alvo();      // destino da transição
    this.temp = this.alvo();      // cópia para efeitos de viewport
  }

  texturaDe(bmp) {
    const gl = this.gl;
    let t = this.texturas.get(bmp);
    if (!t) { t = { tex: gl.createTexture(), versao: 0 }; this.texturas.set(bmp, t); }
    if (t.versao !== bmp.versao) {
      // o envio troca a textura ligada: o lote pendente (de outra textura)
      // sai antes, e o próximo preparar() religa a textura do lote seguinte
      this.flush();
      this.estado = null;
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp.canvas);
      this.parametros();
      t.versao = bmp.versao;
    }
    return t.tex;
  }

  limparTexturas() {
    for (const [bmp, t] of this.texturas) {
      if (bmp.descartado) { this.gl.deleteTexture(t.tex); this.texturas.delete(bmp); }
    }
  }

  // ------------------------------------------------------------ lotes de quads
  usarAlvo(alvo) {
    const gl = this.gl;
    this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, alvo ? alvo.fbo : null);
    gl.viewport(0, 0, this.largura, this.altura);
    this.alvoLargura = this.largura; this.alvoAltura = this.altura;
    gl.useProgram(this.progSprite.p);
    gl.uniform2f(this.progSprite.u.u_tela, this.largura, this.altura);
    gl.uniform1i(this.progSprite.u.u_tex, 0);
    gl.enable(gl.BLEND);
    this.estado = null;
  }

  // Muda textura/efeitos/blend; descarrega o lote se algo mudou.
  preparar(tex, opac, cor, tom, blend) {
    const e = this.estado;
    if (e && e.tex === tex && e.opac === opac && e.blend === blend &&
      e.cor[0] === cor[0] && e.cor[1] === cor[1] && e.cor[2] === cor[2] && e.cor[3] === cor[3] &&
      e.tom[0] === tom[0] && e.tom[1] === tom[1] && e.tom[2] === tom[2] && e.tom[3] === tom[3]) return;
    this.flush();
    const gl = this.gl, u = this.progSprite.u;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1f(u.u_opac, opac);
    gl.uniform4f(u.u_cor, cor[0] / 255, cor[1] / 255, cor[2] / 255, cor[3] / 255);
    gl.uniform4f(u.u_tom, tom[0] / 255, tom[1] / 255, tom[2] / 255, tom[3] / 255);
    if (blend === 1) { gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); }
    else if (blend === 2) { gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); }
    else if (blend === -1) { gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ZERO); }
    else { gl.blendEquation(gl.FUNC_ADD); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    this.estado = { tex, opac, blend, cor: cor.slice(), tom: tom.slice() };
  }

  // Quad com 4 cantos arbitrários (x0..x3 em ordem TL, TR, BR, BL) e uv em pixels.
  quadLivre(p, u0, v0, u1, v1, tw, th) {
    if (this.nVertices + 6 > MAX_QUADS * 6) this.flush();
    const a = this.vertices, s0 = u0 / tw, t0 = v0 / th, s1 = u1 / tw, t1 = v1 / th;
    let i = this.nVertices * 4;
    const v = (x, y, s, t) => { a[i++] = x; a[i++] = y; a[i++] = s; a[i++] = t; };
    v(p[0], p[1], s0, t0); v(p[2], p[3], s1, t0); v(p[4], p[5], s1, t1);
    v(p[0], p[1], s0, t0); v(p[4], p[5], s1, t1); v(p[6], p[7], s0, t1);
    this.nVertices += 6;
  }

  quad(dx, dy, dw, dh, sx, sy, sw, sh, tw, th) {
    this.quadLivre([dx, dy, dx + dw, dy, dx + dw, dy + dh, dx, dy + dh], sx, sy, sx + sw, sy + sh, tw, th);
  }

  flush() {
    if (!this.nVertices) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices, 0, this.nVertices * 4);
    gl.drawArrays(gl.TRIANGLES, 0, this.nVertices);
    this.nVertices = 0;
  }

  recorte(x, y, w, h) {
    const gl = this.gl;
    this.flush();
    if (x === null) { gl.disable(gl.SCISSOR_TEST); return; }
    gl.enable(gl.SCISSOR_TEST);
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.largura, Math.ceil(x + w)), y1 = Math.min(this.altura, Math.ceil(y + h));
    gl.scissor(x0, this.altura - Math.max(y0, y1), Math.max(0, x1 - x0), Math.max(0, y1 - y0));
  }

  // ------------------------------------------------------------ cena
  desenharCena(alvo) {
    const gl = this.gl;
    this.usarAlvo(alvo);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const topo = [], filhos = new Map();
    for (const o of cena) {
      if (o.viewport && !o.viewport.descartado) {
        let l = filhos.get(o.viewport); if (!l) filhos.set(o.viewport, l = []); l.push(o);
      } else if (!o.viewport) topo.push(o);
    }
    topo.sort(ordenar);
    for (const o of topo) {
      if (o.tipo === 'viewport') this.desenharViewport(alvo, o, filhos.get(o) ?? []);
      else this.desenharObjeto(o, 0, 0, null);
    }
    this.recorte(null);
    this.flush();
  }

  desenharViewport(alvo, vp, lista) {
    if (!vp.visivel || vp.w <= 0 || vp.h <= 0) return;
    const area = { x: vp.x, y: vp.y, w: vp.w, h: vp.h };
    this.recorte(vp.x, vp.y, vp.w, vp.h);
    lista.sort(ordenar);
    for (const o of lista) this.desenharObjeto(o, vp.x - vp.ox, vp.y - vp.oy, area);
    if (vp.cor[3] > 0 || vp.tom[0] || vp.tom[1] || vp.tom[2] || vp.tom[3]) this.efeitoRegiao(alvo, area, vp.cor, vp.tom);
    this.recorte(null);
  }

  // Reaplica tom/cor sobre o que já foi desenhado na região (como o RGSS faz no viewport).
  efeitoRegiao(alvo, a, cor, tom) {
    const gl = this.gl;
    this.flush();
    const x0 = Math.max(0, a.x | 0), y0 = Math.max(0, a.y | 0);
    const x1 = Math.min(this.largura, a.x + a.w), y1 = Math.min(this.altura, a.y + a.h);
    if (x1 <= x0 || y1 <= y0) return;
    gl.bindTexture(gl.TEXTURE_2D, this.temp.tex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, x0, this.altura - y1, x0, this.altura - y1, x1 - x0, y1 - y0);
    this.estado = null;
    this.preparar(this.temp.tex, 1, cor, tom, -1);
    // textura de FBO: v invertido
    this.quadLivre([x0, y0, x1, y0, x1, y1, x0, y1], x0, this.altura - y0, x1, this.altura - y1, this.largura, this.altura);
    this.flush();
    this.estado = null;
  }

  desenharObjeto(o, bx, by, area) {
    if (!o.visivel) return;
    switch (o.tipo) {
      case 'sprite': return this.desenharSprite(o, bx, by);
      case 'plane': return this.desenharPlane(o, bx, by, area);
      case 'janela': return this.desenharJanela(o, bx, by, area);
      case 'tilemap': return desenharTilemap(this, o, bx, by, area);
    }
  }

  desenharSprite(s, bx, by) {
    const bmp = s.bitmap;
    if (!bmp || bmp.descartado || s.opacidade <= 0 || s.zx === 0 || s.zy === 0) return;
    // Recorta src_rect aos limites do bitmap, deslocando o destino junto.
    let [sx, sy, sw, sh] = s.src;
    let offX = 0, offY = 0;
    if (sx < 0) { offX = -sx; sw += sx; sx = 0; }
    if (sy < 0) { offY = -sy; sh += sy; sy = 0; }
    sw = Math.min(sw, bmp.largura - sx); sh = Math.min(sh, bmp.altura - sy);
    if (sw <= 0 || sh <= 0) return;
    const tex = this.texturaDe(bmp);
    const opac = s.opacidade / 255;
    const rad = -s.angulo * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const px = bx + s.x, py = by + s.y;
    const ponto = (lx, ly) => {
      const x = (lx + offX - s.ox) * s.zx, y = (ly + offY - s.oy) * s.zy;
      return [px + x * cos - y * sin, py + x * sin + y * cos];
    };
    const faixa = (y0, y1, deslocX, alfa) => {
      if (y1 <= y0 || alfa <= 0) return;
      this.preparar(tex, alfa, s.cor, s.tom, s.blend);
      const a = ponto(deslocX, y0), b = ponto(sw + deslocX, y0), c = ponto(sw + deslocX, y1), d = ponto(deslocX, y1);
      const u0 = s.espelho ? sx + sw : sx, u1 = s.espelho ? sx : sx + sw;
      this.quadLivre([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]], u0, sy + y0, u1, sy + y1, bmp.largura, bmp.altura);
    };
    const corte = Math.max(0, sh - s.bushDepth);
    const desenharLinhas = (y0, y1, alfa) => {
      if (s.waveAmp === 0) { faixa(y0, y1, 0, alfa); return; }
      // wave: faixas de 8px deslocadas por um seno (fase em graus)
      const fase = s.wavePhase * Math.PI / 180, comp = Math.max(1, s.waveLength);
      for (let y = y0; y < y1; y += 8) {
        const yy = Math.min(y + 8, y1);
        faixa(y, yy, Math.sin(fase + (y / comp) * Math.PI * 2) * s.waveAmp, alfa);
      }
    };
    desenharLinhas(0, corte, opac);
    if (s.bushDepth > 0) desenharLinhas(corte, sh, opac * s.bushOpacidade / 255);
  }

  desenharPlane(p, bx, by, area) {
    const bmp = p.bitmap;
    if (!bmp || bmp.descartado || p.opacidade <= 0 || p.zx <= 0 || p.zy <= 0) return;
    const tex = this.texturaDe(bmp);
    const a = area ?? { x: 0, y: 0, w: this.largura, h: this.altura };
    const tw = bmp.largura * p.zx, th = bmp.altura * p.zy;
    this.preparar(tex, p.opacidade / 255, p.cor, p.tom, p.blend);
    const modulo = (v, m) => ((v % m) + m) % m;
    const x0 = a.x - modulo(p.ox * p.zx, tw), y0 = a.y - modulo(p.oy * p.zy, th);
    for (let y = y0; y < a.y + a.h; y += th) {
      for (let x = x0; x < a.x + a.w; x += tw) this.quad(x, y, tw, th, 0, 0, bmp.largura, bmp.altura, bmp.largura, bmp.altura);
    }
  }

  // Janela do VX: windowskin 128×128.
  desenharJanela(j, bx, by, area) {
    if (j.abertura <= 0 || j.w <= 0 || j.h <= 0) return;
    const x = bx + j.x, y0 = by + j.y, w = j.w;
    const h = Math.floor(j.h * j.abertura / 255), y = y0 + Math.floor((j.h - h) / 2);
    const skin = j.skin && !j.skin.descartado ? j.skin : null;
    if (skin && h > 0) {
      const tex = this.texturaDe(skin), sw = skin.largura, sh = skin.altura;
      const opFundo = (j.opacidade / 255) * (j.opacidadeFundo / 255);
      // fundo esticado + padrão ladrilhado, 2px para dentro da moldura
      this.preparar(tex, opFundo, NEUTRO, NEUTRO, 0);
      if (w > 4 && h > 4) {
        this.quad(x + 2, y + 2, w - 4, h - 4, 0, 0, 64, 64, sw, sh);
        this.flush();
        this.recorteAninhado(area, x + 2, y + 2, w - 4, h - 4);
        for (let ty = y + 2; ty < y + h - 2; ty += 64) {
          for (let tx = x + 2; tx < x + w - 2; tx += 64) this.quad(tx, ty, 64, 64, 0, 64, 64, 64, sw, sh);
        }
        this.flush();
        this.restaurarRecorte(area);
      }
      // moldura: cantos 16×16 e bordas esticadas
      this.preparar(tex, j.opacidade / 255, NEUTRO, NEUTRO, 0);
      const c = Math.min(16, Math.floor(w / 2)), d = Math.min(16, Math.floor(h / 2));
      this.quad(x, y, c, d, 64, 0, c, d, sw, sh);
      this.quad(x + w - c, y, c, d, 128 - c, 0, c, d, sw, sh);
      this.quad(x, y + h - d, c, d, 64, 64 - d, c, d, sw, sh);
      this.quad(x + w - c, y + h - d, c, d, 128 - c, 64 - d, c, d, sw, sh);
      if (w > 32) {
        this.quad(x + 16, y, w - 32, d, 80, 0, 32, d, sw, sh);
        this.quad(x + 16, y + h - d, w - 32, d, 80, 64 - d, 32, d, sw, sh);
      }
      if (h > 32) {
        this.quad(x, y + 16, c, h - 32, 64, 16, c, 32, sw, sh);
        this.quad(x + w - c, y + 16, c, h - 32, 128 - c, 16, c, 32, sw, sh);
      }
    }
    if (j.abertura < 255) return;
    // área interna (padding 16)
    const ix = x + 16, iy = y + 16, iw = w - 32, ih = j.h - 32;
    const opConteudo = j.opacidadeConteudo / 255;
    if (skin && j.cursor[2] > 0 && j.cursor[3] > 0) {
      let alfa = 1;
      if (j.ativa) {
        const f = j.contador % 40;
        alfa = (255 - (f < 20 ? f : 40 - f) * 6) / 255;
      }
      this.flush();
      this.recorteAninhado(area, ix, iy, iw, ih);
      this.cursor(skin, ix + j.cursor[0], iy + j.cursor[1], j.cursor[2], j.cursor[3], opConteudo * alfa);
      this.flush();
      this.restaurarRecorte(area);
    }
    const ct = j.conteudo && !j.conteudo.descartado ? j.conteudo : null;
    if (ct && iw > 0 && ih > 0) {
      this.flush();
      this.recorteAninhado(area, ix, iy, iw, ih);
      this.preparar(this.texturaDe(ct), opConteudo, NEUTRO, NEUTRO, 0);
      this.quad(ix - j.ox, iy - j.oy, ct.largura, ct.altura, 0, 0, ct.largura, ct.altura, ct.largura, ct.altura);
      this.flush();
      this.restaurarRecorte(area);
    }
    if (skin) {
      // Setas e sinal de pausa não seguem a opacidade da moldura: aparecem
      // mesmo em janela transparente (mensagem com fundo "transparente").
      const tex = this.texturaDe(skin), sw = skin.largura, sh = skin.altura;
      this.preparar(tex, opConteudo, NEUTRO, NEUTRO, 0);
      if (ct) {
        if (j.oy > 0) this.quad(x + w / 2 - 8, y + 4, 16, 8, 88, 16, 16, 8, sw, sh);
        if (ct.altura - j.oy > ih) this.quad(x + w / 2 - 8, y + j.h - 12, 16, 8, 88, 40, 16, 8, sw, sh);
        if (j.ox > 0) this.quad(x + 4, y + j.h / 2 - 8, 8, 16, 80, 24, 8, 16, sw, sh);
        if (ct.largura - j.ox > iw) this.quad(x + w - 12, y + j.h / 2 - 8, 8, 16, 104, 24, 8, 16, sw, sh);
      }
      if (j.pausa) {
        const f = Math.floor(j.contador / 8) % 4;
        this.quad(x + w / 2 - 8, y + j.h - 16, 16, 16, 96 + (f % 2) * 16, 64 + Math.floor(f / 2) * 16, 16, 16, sw, sh);
      }
    }
  }

  // Cursor do VX: (64,64,32,32) em 9 partes com borda de 8px.
  cursor(skin, x, y, w, h, alfa) {
    const tex = this.texturaDe(skin), sw = skin.largura, sh = skin.altura;
    this.preparar(tex, alfa, NEUTRO, NEUTRO, 0);
    const b = Math.min(8, Math.floor(w / 2), Math.floor(h / 2));
    const sx = 64, sy = 64, s = 32;
    this.quad(x + b, y + b, w - 2 * b, h - 2 * b, sx + 8, sy + 8, s - 16, s - 16, sw, sh);
    this.quad(x, y, b, b, sx, sy, b, b, sw, sh);
    this.quad(x + w - b, y, b, b, sx + s - b, sy, b, b, sw, sh);
    this.quad(x, y + h - b, b, b, sx, sy + s - b, b, b, sw, sh);
    this.quad(x + w - b, y + h - b, b, b, sx + s - b, sy + s - b, b, b, sw, sh);
    this.quad(x + b, y, w - 2 * b, b, sx + 8, sy, s - 16, b, sw, sh);
    this.quad(x + b, y + h - b, w - 2 * b, b, sx + 8, sy + s - b, s - 16, b, sw, sh);
    this.quad(x, y + b, b, h - 2 * b, sx, sy + 8, b, s - 16, sw, sh);
    this.quad(x + w - b, y + b, b, h - 2 * b, sx + s - b, sy + 8, b, s - 16, sw, sh);
  }

  recorteAninhado(area, x, y, w, h) {
    if (area) {
      const x0 = Math.max(x, area.x), y0 = Math.max(y, area.y);
      const x1 = Math.min(x + w, area.x + area.w), y1 = Math.min(y + h, area.y + area.h);
      this.recorte(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    } else this.recorte(x, y, w, h);
  }

  restaurarRecorte(area) {
    if (area) this.recorte(area.x, area.y, area.w, area.h); else this.recorte(null);
  }

  // ------------------------------------------------------------ tela final
  // Copia uma textura de FBO para outro alvo (ou para o canvas), com brilho.
  copiar(origem, destino, brilho = 255) {
    const gl = this.gl;
    this.usarAlvo(destino);
    gl.disable(gl.SCISSOR_TEST);
    this.preparar(origem.tex, 1, NEUTRO, NEUTRO, -1);
    this.quad(0, 0, this.largura, this.altura, 0, this.altura, this.largura, -this.altura, this.largura, this.altura);
    if (brilho < 255) {
      this.preparar(this.branco, 1 - brilho / 255, [0, 0, 0, 255], NEUTRO, 0);
      this.quad(0, 0, this.largura, this.altura, 0, 0, 1, 1, 1, 1);
    }
    this.flush();
  }

  transicao(de, para, mapa, progresso, vague, brilho) {
    const gl = this.gl, p = this.progTransicao;
    this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.largura, this.altura);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(p.p);
    gl.uniform2f(p.u.u_tela, this.largura, this.altura);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, de.tex); gl.uniform1i(p.u.u_de, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, para.tex); gl.uniform1i(p.u.u_para, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, mapa ? this.texturaDe(mapa) : this.branco); gl.uniform1i(p.u.u_mapa, 2);
    gl.uniform1f(p.u.u_prog, progresso);
    gl.uniform1f(p.u.u_vague, vague / 255);
    gl.uniform1i(p.u.u_temMapa, mapa ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    this.quad(0, 0, this.largura, this.altura, 0, this.altura, this.largura, -this.altura, this.largura, this.altura);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices, 0, this.nVertices * 4);
    gl.drawArrays(gl.TRIANGLES, 0, this.nVertices);
    this.nVertices = 0;
    gl.enable(gl.BLEND);
    this.estado = null;
    if (brilho < 255) {
      this.usarAlvo(null);
      this.preparar(this.branco, 1 - brilho / 255, [0, 0, 0, 255], NEUTRO, 0);
      this.quad(0, 0, this.largura, this.altura, 0, 0, 1, 1, 1, 1);
      this.flush();
    }
  }

  // Lê a tela atual como RGBA de cima para baixo.
  lerTela(alvo) {
    const gl = this.gl;
    this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, alvo.fbo);
    const px = new Uint8Array(this.largura * this.altura * 4);
    gl.readPixels(0, 0, this.largura, this.altura, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const linha = this.largura * 4, saida = new Uint8ClampedArray(px.length);
    for (let y = 0; y < this.altura; y++) saida.set(px.subarray((this.altura - 1 - y) * linha, (this.altura - y) * linha), y * linha);
    return saida;
  }
}

function ordenar(a, b) {
  return a.z - b.z || a.criacao - b.criacao;
}
