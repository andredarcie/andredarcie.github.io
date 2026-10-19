// Modo determinístico, replay e rastro quadro a quadro.
//
//   ?gravar          joga normalmente e grava a entrada; o botão "Baixar replay"
//                    salva o arquivo. Começa limpo: sem saves do localStorage,
//                    só o ks_checkpoint do instalador, e nada é persistido.
//   ?replay=<url>    toca um replay (sem clique, em turbo) e monta o rastro.
//   &semtela         não desenha (o rastro não precisa da imagem).
//   &detalhe=N       guarda o estado completo e a cena do quadro N, para o
//                    comparador mostrar o campo que diferiu.
//   &semente=N       semente do rand ao gravar (padrão 1).
//   &semrastro       replay só como entrada: sem hash de estado nem de cena
//                    (para medir o jogo com o profiler, ?perfil).
//
// O rastro tem, por quadro: o hash do estado do jogo (Marshal dos objetos do
// save, normalizado pelo marshal.js), o hash da cena (todo sprite, janela,
// plane, viewport e tilemap com seus campos e o conteúdo dos bitmaps) e os
// comandos de áudio. Duas execuções iguais dão rastros iguais (o estado vem
// de src/rastro-js.js): é a referência para conferir que uma mudança no motor
// ou nos scripts não mexeu no jogo.
import * as rb from './rb/rb.js';
import { Bitmap } from './rgss/bitmap.js';
import { cena, Tilemap } from './rgss/objetos.js';

const parametros = new URLSearchParams(location.search);
export const MODO = parametros.has('replay') ? 'replay' : parametros.has('gravar') ? 'gravar' : null;
export const SEM_TELA = MODO === 'replay' && parametros.has('semtela');
// &capturas=10,200,…: a imagem da tela nesses quadros (comparação pixel a pixel)
const CAPTURAS = new Set((parametros.get('capturas') ?? '').split(',').filter(Boolean).map(Number));
export const SEM_RASTRO = parametros.has('semrastro');
export const DETALHE = parametros.has('detalhe') ? Number(parametros.get('detalhe')) : -1;
const VERSAO_REPLAY = 1;

// ------------------------------------------------------------------ hash
// cyrb53 incremental: 53 bits, rápido, e igual em qualquer navegador.
export class Hash {
  constructor() { this.h1 = 0xdeadbeef; this.h2 = 0x41c6ce57; }
  palavra(x) {
    this.h1 = Math.imul(this.h1 ^ x, 2654435761);
    this.h2 = Math.imul(this.h2 ^ x, 1597334677);
  }
  num(x) {
    if (x === null || x === undefined) return this.palavra(0x7fffffff);
    if (typeof x === 'boolean') return this.palavra(x ? 0x7ffffffe : 0x7ffffffd);
    if (Number.isInteger(x) && x >= -0x80000000 && x <= 0x7fffffff) { this.palavra(0x51); return this.palavra(x | 0); }
    QUADRO.setFloat64(0, x);   // Float: os 64 bits exatos
    this.palavra(0x52); this.palavra(QUADRO.getInt32(0)); this.palavra(QUADRO.getInt32(4));
  }
  str(s) {
    s = String(s);
    this.palavra(0x53); this.palavra(s.length);
    for (let i = 0; i < s.length; i++) this.palavra(s.charCodeAt(i));
  }
  bytes(b) {
    this.palavra(0x54); this.palavra(b.length);
    for (let i = 0; i < b.length; i++) this.palavra(b[i]);
  }
  lista(a) { for (const x of a) this.num(x); }
  valor() {
    let h1 = this.h1, h2 = this.h2;
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
}
const QUADRO = new DataView(new ArrayBuffer(8));
const hashDe = (f) => { const h = new Hash(); f(h); return h.valor(); };

// ------------------------------------------------------------------ conteúdo dos bitmaps
// O conteúdo de um bitmap é o hash da sequência de operações que o
// desenharam (com o conteúdo das fontes de cada blt), não dos pixels: é
// barato e determinístico.
const OPERACOES = ['stretchBlt', 'fillRect', 'gradientFillRect', 'clearRect', 'clear',
  'setPixel', 'hueChange', 'blur', 'radialBlur', 'drawText'];

function instrumentarBitmaps() {
  for (const nome of OPERACOES) {
    const original = Bitmap.prototype[nome];
    Bitmap.prototype[nome] = function (...args) {
      // com &detalhe, a lista legível das operações (o comparador mostra a que diferiu)
      if (DETALHE >= 0) (this.opsRastro ??= []).push(`${nome}(${args.map((a) => (a instanceof Bitmap ? `#${a.id}` : JSON.stringify(a))).join(',')})`);
      this.conteudoRastro = hashDe((h) => {
        h.str(conteudoDe(this)); h.str(nome);
        for (const a of args) {
          if (a instanceof Bitmap) { h.num(a.id); h.str(conteudoDe(a)); } else if (typeof a === 'string') h.str(a); else h.num(a);
        }
      });
      return original.apply(this, args);
    };
  }
  const carregar = Bitmap.carregar;
  Bitmap.carregar = async function (caminho) {
    const bmp = await carregar.call(this, caminho);
    if (bmp) bmp.conteudoRastro = hashDe((h) => { h.str('arquivo'); h.str(caminho); });
    return bmp;
  };
}
const conteudoDe = (b) => b.conteudoRastro ?? (b.conteudoRastro = hashDe((h) => { h.str('novo'); h.num(b.largura); h.num(b.altura); }));

// Tilemap: o conteúdo do mapa, das passagens e do flash entra pelo base64 que a fachada manda.
function instrumentarTilemap() {
  for (const [nome, campo] of [['definirMapa', 'hMapa'], ['definirPassagens', 'hPassagens'], ['definirFlash', 'hFlash']]) {
    const original = Tilemap.prototype[nome];
    Tilemap.prototype[nome] = function (...args) {
      this[campo] = hashDe((h) => { for (const a of args) typeof a === 'string' ? h.str(a) : h.num(a); });
      return original.apply(this, args);
    };
  }
}

// ------------------------------------------------------------------ cena
const bmp = (h, b) => { if (b) { h.num(b.id); h.str(conteudoDe(b)); } else h.num(null); };

function campos(o) {
  const vp = o.viewport ? o.viewport.criacao : 0;
  switch (o.tipo) {
    case 'viewport':
      return [o.visivel, o.x, o.y, o.w, o.h, o.z, o.ox, o.oy, ...o.cor, ...o.tom];
    case 'sprite':
      return [vp, o.visivel, o.x, o.y, o.z, o.ox, o.oy, o.zx, o.zy, o.angulo, o.espelho, o.bushDepth,
        o.bushOpacidade, o.opacidade, o.blend, ...o.src, ...o.cor, ...o.tom, o.waveAmp, o.waveLength, o.wavePhase];
    case 'plane':
      return [vp, o.visivel, o.z, o.ox, o.oy, o.zx, o.zy, o.opacidade, o.blend, ...o.cor, ...o.tom];
    case 'janela':
      return [vp, o.visivel, o.ativa, o.pausa, o.x, o.y, o.w, o.h, o.z, o.ox, o.oy, o.opacidade,
        o.opacidadeFundo, o.opacidadeConteudo, o.abertura, ...o.cursor, o.contador];
    case 'tilemap': {
      const t = o.tilemap;
      return [vp, o.indice, o.z, t.visivel, t.ox, t.oy, t.quadroAnimacao, t.contadorFlash];
    }
    default: return [];
  }
}

function bitmapsDe(o) {
  if (o.tipo === 'sprite' || o.tipo === 'plane') return [o.bitmap];
  if (o.tipo === 'janela') return [o.skin, o.conteudo];
  if (o.tipo === 'tilemap') return o.tilemap.bitmaps;
  return [];
}

// A cena inteira, na ordem de criação (é a ordem do Set).
function hashCena(extra) {
  return hashDe((h) => {
    h.lista(extra);
    for (const o of cena) {
      h.num(o.criacao); h.str(o.tipo); h.lista(campos(o));
      for (const b of bitmapsDe(o)) bmp(h, b);
      if (o.tipo === 'tilemap') { h.str(o.tilemap.hMapa ?? ''); h.str(o.tilemap.hPassagens ?? ''); h.str(o.tilemap.hFlash ?? ''); }
    }
  });
}

// A cena legível, para o comparador mostrar o que diferiu (só no quadro de detalhe).
function cenaLegivel() {
  return [...cena].map((o) => ({
    criacao: o.criacao, tipo: o.tipo, campos: campos(o),
    bitmaps: bitmapsDe(o).map((b) => (b ? `${b.id}:${conteudoDe(b)}` : null)),
    operacoes: bitmapsDe(o).map((b) => b?.opsRastro ?? null),
  }));
}

// ------------------------------------------------------------------ rastro
export class Rastro {
  constructor({ entrada, graficos, audio }) {
    this.entrada = entrada;
    this.graficos = graficos;
    this.quadros = [];         // [hash do estado, hash da cena, áudio, índice da entrada]
    this.estado = '';          // hash do estado deste quadro (src/rastro-js.js)
    this.estadoBase64 = null;
    this.audio = [];
    this.entradas = [];        // gravação: uma máscara por Input.update
    this.pedidos = [];         // gravação: [índice da entrada, pedido do seletor de fases]
    this.indice = 0;           // quantos Input.update já houve
    this.parado = false;
    this.fim = null;           // replay: por que parou
    this.detalhe = null;
    this.tempos = { js: 0, bytes: 0 };   // custo do estado (ms somados, bytes somados)
    this.semente = MODO === 'gravar' ? Number(parametros.get('semente') ?? 1) : 1;
    if (!SEM_RASTRO) {
      instrumentarBitmaps();
      instrumentarTilemap();
    }
    this.instrumentarAudio(audio);
    graficos.rastro = this;
    entrada.filtro = (press) => this.filtrarEntrada(press);
  }

  // replay: carrega o arquivo
  async carregarReplay(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`replay ${url}: ${r.status}`);
    const replay = await r.json();
    if (replay.versao !== VERSAO_REPLAY) throw new Error(`replay versão ${replay.versao}, esperado ${VERSAO_REPLAY}`);
    this.replay = replay;
    this.semente = replay.semente;
    // RLE [[máscara, vezes], …] → uma máscara por Input.update
    this.entradas = replay.entradas.flatMap(([m, n]) => Array(n).fill(m));
    this.pedidos = replay.pedidos;
  }

  iniciar() { rb.srand(this.semente); }

  // Entrada.atualizar: grava ou substitui a máscara do quadro
  filtrarEntrada(press) {
    const i = this.indice++;
    if (MODO === 'gravar') { this.entradas.push(press); return press; }
    if (i >= this.entradas.length) { this.parar('fim do replay'); return 0; }
    return this.entradas[i];
  }

  // Seletor de fases (src/rastro-js.js): o pedido também é entrada
  filtrarPedido(pedido) {
    if (MODO === 'gravar') { if (pedido) this.pedidos.push([this.indice, pedido]); return pedido; }
    const i = this.pedidos.findIndex(([indice]) => indice === this.indice);
    if (i < 0) return '';
    return this.pedidos.splice(i, 1)[0][1];
  }

  instrumentarAudio(audio) {
    for (const nome of ['bgmPlay', 'bgmStop', 'bgmFade', 'bgsPlay', 'bgsStop', 'bgsFade', 'mePlay', 'meStop', 'meFade', 'sePlay', 'seStop']) {
      const original = audio[nome].bind(audio);
      audio[nome] = (...args) => { this.audio.push(`${nome}(${args.join(',')})`); return original(...args); };
    }
  }

  // Graficos.esperar: fecha o quadro
  quadro(extra) {
    if (this.parado) return;
    const n = this.quadros.length;
    this.quadros.push([this.estado, SEM_RASTRO ? '' : hashCena(extra), this.audio.join(';'), this.indice]);
    if (n === DETALHE) this.detalhe = { quadro: n, estado: this.estadoBase64 && b64(this.estadoBase64), cena: cenaLegivel(), audio: this.audio.slice() };
    // a tela acabou de ser desenhada nesta mesma tarefa: o toDataURL ainda vê o quadro
    if (CAPTURAS.has(n)) (window.__capturas ??= []).push([n, document.querySelector('#tela').toDataURL('image/png')]);
    this.audio = [];
  }

  // Graphics.snap_to_bitmap: o bitmap capturado tem como conteúdo a cena atual
  conteudoCaptura() { return hashCena(['captura', this.graficos.congelado]); }

  parar(motivo) {
    if (this.parado) return;
    this.parado = true;
    this.fim = motivo;
    window.__rastroFim = true;
    this.aoParar?.(motivo);
  }

  resultado() {
    return {
      versao: 1, motor: 'js', build: document.documentElement.dataset.build,
      replay: parametros.get('replay'), semente: this.semente, fim: this.fim,
      quadros: this.quadros, detalhe: this.detalhe, tempos: this.tempos,
    };
  }

  arquivoReplay() {
    const rle = [];
    for (const m of this.entradas) {
      const ultimo = rle[rle.length - 1];
      if (ultimo && ultimo[0] === m) ultimo[1]++;
      else rle.push([m, 1]);
    }
    return { versao: VERSAO_REPLAY, build: document.documentElement.dataset.build, semente: this.semente,
      total: this.entradas.length, entradas: rle, pedidos: this.pedidos };
  }
}

function b64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function baixar(nome, objeto) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(objeto)], { type: 'application/json' }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
