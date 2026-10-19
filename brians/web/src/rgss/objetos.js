// Espelhos JS dos objetos de cena do RGSS2. O estado de verdade fica no Ruby;
// o Ruby empurra tudo de uma vez com sync(...) quando algo muda (ver rgss.rb).
// O renderizador só lê estes objetos.

let proximaCriacao = 1;
export const cena = new Set(); // todos os objetos vivos (inclusive viewports)

class ObjetoCena {
  constructor(tipo) {
    this.tipo = tipo;
    this.criacao = proximaCriacao++; // desempate de z: ordem de criação
    this.viewport = null;
    this.visivel = true;
    this.z = 0;
    this.descartado = false;
    cena.add(this);
  }
  dispose() { this.descartado = true; cena.delete(this); }
}

export class Viewport extends ObjetoCena {
  constructor() {
    super('viewport');
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
    this.ox = 0; this.oy = 0;
    this.cor = [0, 0, 0, 0];
    this.tom = [0, 0, 0, 0];
  }
  sync(visivel, x, y, w, h, z, ox, oy, cr, cg, cb, ca, tr, tg, tb, tc) {
    this.visivel = !!visivel;
    this.x = x; this.y = y; this.w = w; this.h = h; this.z = z;
    this.ox = ox; this.oy = oy;
    this.cor[0] = cr; this.cor[1] = cg; this.cor[2] = cb; this.cor[3] = ca;
    this.tom[0] = tr; this.tom[1] = tg; this.tom[2] = tb; this.tom[3] = tc;
  }
}

export class Sprite extends ObjetoCena {
  constructor(viewport) {
    super('sprite');
    this.viewport = viewport || null;
    this.bitmap = null;
    this.x = 0; this.y = 0; this.ox = 0; this.oy = 0;
    this.zx = 1; this.zy = 1; this.angulo = 0; this.espelho = false;
    this.bushDepth = 0; this.bushOpacidade = 128;
    this.opacidade = 255; this.blend = 0;
    this.src = [0, 0, 0, 0];
    this.cor = [0, 0, 0, 0];
    this.tom = [0, 0, 0, 0];
    this.waveAmp = 0; this.waveLength = 180; this.wavePhase = 0;
  }
  sync(bitmap, visivel, x, y, z, ox, oy, zx, zy, angulo, espelho, bushDepth, bushOpacidade,
    opacidade, blend, sx, sy, sw, sh, cr, cg, cb, ca, tr, tg, tb, tc, waveAmp, waveLength, wavePhase) {
    this.bitmap = bitmap || null;
    this.visivel = !!visivel;
    this.x = x; this.y = y; this.z = z; this.ox = ox; this.oy = oy;
    this.zx = zx; this.zy = zy; this.angulo = angulo; this.espelho = !!espelho;
    this.bushDepth = bushDepth; this.bushOpacidade = bushOpacidade;
    this.opacidade = opacidade; this.blend = blend;
    this.src[0] = sx; this.src[1] = sy; this.src[2] = sw; this.src[3] = sh;
    this.cor[0] = cr; this.cor[1] = cg; this.cor[2] = cb; this.cor[3] = ca;
    this.tom[0] = tr; this.tom[1] = tg; this.tom[2] = tb; this.tom[3] = tc;
    this.waveAmp = waveAmp; this.waveLength = waveLength; this.wavePhase = wavePhase;
  }
}

export class Plane extends ObjetoCena {
  constructor(viewport) {
    super('plane');
    this.viewport = viewport || null;
    this.bitmap = null;
    this.ox = 0; this.oy = 0; this.zx = 1; this.zy = 1;
    this.opacidade = 255; this.blend = 0;
    this.cor = [0, 0, 0, 0];
    this.tom = [0, 0, 0, 0];
  }
  sync(bitmap, visivel, z, ox, oy, zx, zy, opacidade, blend, cr, cg, cb, ca, tr, tg, tb, tc) {
    this.bitmap = bitmap || null;
    this.visivel = !!visivel;
    this.z = z; this.ox = ox; this.oy = oy; this.zx = zx; this.zy = zy;
    this.opacidade = opacidade; this.blend = blend;
    this.cor[0] = cr; this.cor[1] = cg; this.cor[2] = cb; this.cor[3] = ca;
    this.tom[0] = tr; this.tom[1] = tg; this.tom[2] = tb; this.tom[3] = tc;
  }
}

export class Janela extends ObjetoCena {
  constructor(viewport) {
    super('janela');
    this.viewport = viewport || null;
    this.skin = null; this.conteudo = null;
    this.x = 0; this.y = 0; this.w = 0; this.h = 0;
    this.ox = 0; this.oy = 0;
    this.opacidade = 255; this.opacidadeFundo = 255; this.opacidadeConteudo = 255;
    this.abertura = 255; this.ativa = true; this.pausa = false;
    this.cursor = [0, 0, 0, 0];
    this.contador = 0; // avança em Window#update (cursor piscando, seta de pausa)
  }
  sync(skin, conteudo, visivel, ativa, pausa, x, y, w, h, z, ox, oy,
    opacidade, opacidadeFundo, opacidadeConteudo, abertura, cx, cy, cw, ch, contador) {
    this.skin = skin || null; this.conteudo = conteudo || null;
    this.visivel = !!visivel; this.ativa = !!ativa; this.pausa = !!pausa;
    this.x = x; this.y = y; this.w = w; this.h = h; this.z = z;
    this.ox = ox; this.oy = oy;
    this.opacidade = opacidade; this.opacidadeFundo = opacidadeFundo; this.opacidadeConteudo = opacidadeConteudo;
    this.abertura = abertura;
    this.cursor[0] = cx; this.cursor[1] = cy; this.cursor[2] = cw; this.cursor[3] = ch;
    this.contador = contador;
  }
}

// O Tilemap do VX desenha em duas alturas: chão (z=0) e "estrela" (z=200,
// tiles com a flag 0x10 em passages). Cada altura é um objeto de cena próprio
// para entrar na ordenação por z junto com os personagens.
export class Tilemap {
  constructor(viewport) {
    this.viewport = viewport || null;
    this.bitmaps = new Array(9).fill(null);
    this.mapa = null;      // { xs, ys, zs, dados: Int16Array }
    this.passagens = null; // Int16Array
    this.flash = null;     // { xs, ys, dados }
    this.ox = 0; this.oy = 0; this.visivel = true;
    this.quadroAnimacao = 0;
    this.contadorFlash = 0;
    this.camadas = [new CamadaTilemap(this, 0, 0), new CamadaTilemap(this, 1, 200)];
  }
  sync(visivel, ox, oy, quadroAnimacao, contadorFlash) {
    this.visivel = !!visivel; this.ox = ox; this.oy = oy;
    this.quadroAnimacao = quadroAnimacao; this.contadorFlash = contadorFlash;
    for (const c of this.camadas) c.visivel = this.visivel;
  }
  definirBitmap(i, bmp) { this.bitmaps[i] = bmp || null; }
  definirMapa(xs, ys, zs, base64) { this.mapa = { xs, ys, zs, dados: decodificarTabela(base64) }; }
  definirPassagens(base64) { this.passagens = decodificarTabela(base64); }
  definirFlash(xs, ys, base64) { this.flash = base64 ? { xs, ys, dados: decodificarTabela(base64) } : null; }
  dispose() { for (const c of this.camadas) c.dispose(); }
}

class CamadaTilemap extends ObjetoCena {
  constructor(tilemap, indice, z) {
    super('tilemap');
    this.tilemap = tilemap;
    this.viewport = tilemap.viewport;
    this.indice = indice; // 0 = chão, 1 = acima dos personagens
    this.z = z;
  }
}

function decodificarTabela(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, bytes.length >> 1);
}
