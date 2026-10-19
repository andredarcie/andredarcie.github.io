// Teste de fumaça sem navegador. Roda o Main do jogo (web/jogo) no Node com
// um motor de mentira: bitmaps com as dimensões reais
// dos PNG (sem pixels), cena e áudio que só anotam, e a entrada de um replay
// (as mesmas máscaras por Input.update de replays/*.json). Mostra onde o
// jogo chegou e o primeiro erro, com a linha do script do jogo.
// Não substitui o comparador de rastros: serve para achar o que quebra.
// Uso: node ferramentas/fumaca.mjs [replay.json] [--quadros N] [--salvar ARQUIVO DESTINO]   (a partir de brians/)
//   SONDA="expr" imprime uma expressão JS no fim (globais do jogo e rb.*)
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opcao = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 ? args.splice(i, 2)[1] : padrao; };
const LIMITE = Number(opcao('--quadros', 3000));
// --salvar Save2.rvdata destino: no fim, grava o arquivo que o jogo escreveu (save cruzado)
const iSalvar = args.indexOf('--salvar');
const salvar = iSalvar >= 0 ? args.splice(iSalvar, 3).slice(1) : null;
const replay = JSON.parse(fs.readFileSync(args[0] ?? 'replays/curto.json', 'utf8'));

register('./resolver-rb.mjs', import.meta.url);
globalThis.location = { search: '', hostname: '' };   // src/rastro.js lê a URL ao carregar
const rb = await import('../web/src/rb/rb.js');
const { ligar } = await import('../web/src/rgss2/rgss2.js');
const { ligarRastroJs } = await import('../web/src/rastro-js.js');

// ---------------------------------------------------------------- arquivos do jogo
const RAIZ = path.resolve('projeto');
const lista = JSON.parse(fs.readFileSync('web/arquivos.json', 'utf8'));
const porNome = new Map(lista.map((real) => [real.toLowerCase(), real]));
const resolver = (caminho, exts) => {
  const base = String(caminho).replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
  for (const e of ['', ...exts]) if (porNome.has(base + e)) return porNome.get(base + e);
  return null;
};
await rb.montarArquivos(lista, async (real) => new Uint8Array(fs.readFileSync(path.join(RAIZ, real))), { persistidos: false });

function dimensoesPng(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const d = new DataView(bytes.buffer, bytes.byteOffset);
    return [d.getUint32(16), d.getUint32(20)];
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) {   // JPG: o primeiro SOFn tem altura e largura
    for (let i = 2; i < bytes.length;) {
      const marca = bytes[i + 1], tamanho = (bytes[i + 2] << 8) | bytes[i + 3];
      if (marca >= 0xC0 && marca <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marca)) return [(bytes[i + 7] << 8) | bytes[i + 8], (bytes[i + 5] << 8) | bytes[i + 6]];
      i += 2 + tamanho;
    }
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {   // BMP
    const d = new DataView(bytes.buffer, bytes.byteOffset);
    return [d.getInt32(18, true), Math.abs(d.getInt32(22, true))];
  }
  throw new Error('formato de imagem desconhecido no motor de mentira');
}

// ---------------------------------------------------------------- motor de mentira
const contagem = new Map();
const anotar = (k) => contagem.set(k, (contagem.get(k) ?? 0) + 1);
class BitmapFalso {
  constructor(w, h) { this.largura = Math.max(1, w | 0); this.altura = Math.max(1, h | 0); }
  dispose() { this.descartado = true; }
  getPixel() { return 0xFFFFFFFF; }
}
for (const m of ['blt', 'stretchBlt', 'fillRect', 'gradientFillRect', 'clearRect', 'clear', 'setPixel', 'hueChange', 'blur', 'radialBlur', 'drawText']) {
  BitmapFalso.prototype[m] = function () { anotar(`Bitmap.${m}`); };
}
const objetoCena = (tipo) => ({ tipo, sync() {}, dispose() {}, definirBitmap() {}, definirMapa() {}, definirPassagens() {}, definirFlash() {} });

let quadro = 0, indiceEntrada = 0;
const entradas = [];
for (const [mascara, n] of replay.entradas) for (let i = 0; i < n; i++) entradas.push(mascara);
const tempo = new Array(32).fill(0);
let ordemDirecao = [];
let cenaAnterior = null;
const marcos = [];

class Parar extends Error {}

const api = {
  novoBitmap: (w, h) => new BitmapFalso(w, h),
  carregarBitmap: async (nome) => {
    const real = resolver(nome, ['.png', '.jpg', '.jpeg', '.bmp']);
    if (!real) return null;
    const [w, h] = dimensoesPng(new Uint8Array(fs.readFileSync(path.join(RAIZ, real))));
    return new BitmapFalso(w, h);
  },
  textSize: (texto, nome, tamanho) => ((String(texto).length * Math.ceil(tamanho / 2)) << 16) | (tamanho + 4),
  novoSprite: () => objetoCena('sprite'),
  novoPlane: () => objetoCena('plane'),
  novoViewport: () => objetoCena('viewport'),
  novaJanela: () => objetoCena('janela'),
  novoTilemap: () => objetoCena('tilemap'),
  atualizarGraficos: async () => {
    quadro++;
    const cena = `${$scene?.constructor?.rubyName ?? String($scene)}${$game_map?.map_id ? ` (mapa ${$game_map.map_id})` : ''}`;
    if (cena !== cenaAnterior) { marcos.push(`quadro ${quadro}: ${cena}`); cenaAnterior = cena; }
    if (quadro >= LIMITE) throw new Parar();
  },
  congelar: () => {},
  transicao: async (duracao) => { for (let i = 0; i < duracao; i++) await api.atualizarGraficos(); },
  capturar: () => new BitmapFalso(544, 416),
  redimensionarTela: () => {},
  largura: () => 544,
  altura: () => 416,
  atualizarEntrada: () => {
    const press = indiceEntrada < entradas.length ? entradas[indiceEntrada] : 0;
    indiceEntrada++;
    let trigger = 0, repeat = 0;
    for (let b = 0; b < 32; b++) {
      if (press & (1 << b)) {
        const t = ++tempo[b];
        if (t === 1) trigger |= 1 << b;
        if (t === 1 || (t >= 24 && (t - 24) % 6 === 0)) repeat |= 1 << b;
      } else tempo[b] = 0;
    }
    for (const d of [2, 4, 6, 8]) {
      const presa = (press & (1 << d)) !== 0, i = ordemDirecao.indexOf(d);
      if (presa && i < 0) ordemDirecao.push(d);
      if (!presa && i >= 0) ordemDirecao.splice(i, 1);
    }
    const dir4 = ordemDirecao.length ? ordemDirecao[ordemDirecao.length - 1] : 0;
    let dx = 0, dy = 0;
    if (press & (1 << 4)) dx -= 1;
    if (press & (1 << 6)) dx += 1;
    if (press & (1 << 8)) dy -= 1;
    if (press & (1 << 2)) dy += 1;
    const dir8 = dx === 0 && dy === 0 ? 0 : [[7, 8, 9], [4, 0, 6], [1, 2, 3]][dy + 1][dx + 1];
    return `${press >>> 0},${trigger >>> 0},${repeat >>> 0},${dir4},${dir8}`;
  },
  ...Object.fromEntries(['bgmPlay', 'bgmStop', 'bgmFade', 'bgsPlay', 'bgsStop', 'bgsFade', 'mePlay', 'meStop', 'meFade', 'sePlay', 'seStop']
    .map((k) => [k, (...a) => anotar(`Audio.${k}${a[0] ? ` ${a[0]}` : ''}`)])),
  mensagem: async (texto) => { marcos.push(`quadro ${quadro}: print ${JSON.stringify(texto)}`); },
};

ligar(api);
// os saltos do seletor de fases gravados no replay (o mesmo gancho da página)
const pedidos = [...(replay.pedidos ?? [])];
ligarRastroJs({ rastro: null, seletor: {
  pegarPedidoNivel: () => {
    const i = pedidos.findIndex(([n]) => n === indiceEntrada);
    if (i < 0) return '';
    const pedido = pedidos.splice(i, 1)[0][1];
    marcos.push(`quadro ${quadro}: pedido ${pedido} (entrada ${indiceEntrada})`);
    return pedido;
  },
} });
rb.srand(replay.semente ?? 1);
const PASTA = path.resolve('web/jogo');
const ordem = JSON.parse(fs.readFileSync(path.join(PASTA, '_ordem.json'), 'utf8'));
let resultado = 'o jogo terminou';
try {
  for (const f of ordem) await import(pathToFileURL(path.join(PASTA, f)).href);
} catch (e) {
  if (e instanceof Parar) resultado = `parou no limite de ${LIMITE} quadros`;
  else if (e instanceof rb.SystemExit) resultado = 'exit';
  else {
    const linhas = (e.stack ?? '').split('\n').filter((l) => l.includes('/jogo/') || l.includes('rgss2') || l.includes('src/rb')).slice(0, 8);
    resultado = `ERRO no quadro ${quadro} (entrada ${indiceEntrada}): ${e.name}: ${e.message}\n${linhas.map((l) => `    ${l.trim().replace(/file:\/\/\/[^ ]*brians\//, '')}`).join('\n')}`;
  }
}
console.log(marcos.join('\n'));
const jogador = globalThis.$game_player;
if (jogador) console.log(`Brian: mapa ${$game_map?.map_id} x ${jogador.x} y ${jogador.y} dir ${jogador.direction} · menu_disabled ${$game_system?.menu_disabled} · var2 ${rb.idx($game_variables, 2)} var3 ${rb.idx($game_variables, 3)} · sw3 ${rb.idx($game_switches, 3)} · EV8 pág ${$game_map?.events && rb.idx($game_map.events, 8)?.event?.pages.indexOf(rb.idx($game_map.events, 8)?._page)}`);
console.log(`áudio: ${[...contagem].filter(([k]) => k.startsWith('Audio')).map(([k, n]) => `${k}×${n}`).join(', ')}`);
if (salvar) {
  const bytes = rb.lerArquivo(salvar[0]);
  if (bytes) { fs.writeFileSync(salvar[1], bytes); console.log(`${salvar[0]} → ${salvar[1]} (${bytes.length} bytes)`); } else console.log(`${salvar[0]}: o jogo não gravou`);
}
// SONDA="expressão JS" imprime um valor no fim (depuração: globais do jogo e rb)
if (process.env.SONDA) console.log('sonda:', eval(process.env.SONDA));
console.log(`\n${resultado}`);
process.exitCode = resultado.startsWith('ERRO') ? 1 : 0;
