// Cada fase inteira, renderizada pelo jogo de verdade, numa imagem só.
// Abre o jogo num Chromium (versão JS por padrão), começa um Novo Jogo e,
// para cada mapa do seletor de fases (web/niveis.json, os 37 do jogo):
//   1. salta para a primeira entrada do mapa e espera ele assentar;
//   2. congela o jogo (o Graphics.update do jogo espera numa trava);
//   3. passa a câmera ($game_map.display_x/y) por todo o mapa, atualiza o
//      Spriteset_Map e desenha um quadro de verdade em cada posição;
//   4. emenda os pedaços numa imagem do tamanho do mapa (32 px por tile).
// Fica de fora o que é fixo na tela e se repetiria em cada pedaço: o
// viewport 2 (imagens/HUD, clima, timer), o viewport 3 (escurecimento) e as
// janelas. O tom de tela do mapa (viewport 1) fica. No fim, monta uma
// imagem gigante com todas as fases, com o número e o nome de cada uma.
// Uso: node ferramentas/mapas-inteiros.mjs pasta [--so 11,25]   (a partir de brians/)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const pasta = args.find((a) => !a.startsWith('--')) ?? 'mapas';
const so = args.includes('--so') ? args[args.indexOf('--so') + 1].split(',').map(Number) : null;
fs.mkdirSync(pasta, { recursive: true });

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  const global = execSync('npm root -g').toString().trim();
  ({ chromium } = createRequire(path.join(global, 'x'))('playwright'));
}

const RAIZ = path.resolve('..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mid': 'audio/midi' };
const estatico = http.createServer((req, res) => {
  const arq = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.stat(arq, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(arq).pipe(res);
  });
});
await new Promise((r) => estatico.listen(0, '127.0.0.1', r));

const navegador = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const pagina = await navegador.newPage({ viewport: { width: 544, height: 416 } });
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await pagina.goto(`http://127.0.0.1:${estatico.address().port}/brians/web/index.html`);
await pagina.waitForSelector('#jogar:not([hidden])', { timeout: 120000 });
await pagina.click('#jogar');
await pagina.waitForFunction(() => globalThis.$scene?.constructor?.rubyName === 'Scene_Title', null, { timeout: 120000 });
await pagina.waitForTimeout(2500);
await pagina.keyboard.press('Enter');   // Novo Jogo
await pagina.waitForFunction(() => globalThis.$scene?.constructor?.rubyName === 'Scene_Map', null, { timeout: 60000 });

// Trava no Graphics.update do jogo e o desenho de um quadro com a câmera em (px, py)
await pagina.evaluate(() => {
  const cap = (window.__cap = { congelado: false, liberar: null, pedir: false, img: null });
  const original = Graphics.update;
  Graphics.update = async function () {
    if (cap.congelado) await new Promise((r) => { cap.liberar = r; });
    return original.call(this);
  };
  // o quadro acabou de ser desenhado (mesma tarefa): o toDataURL ainda vê a tela
  const graficos = window.__brians.graficos;
  const antes = graficos.aoQuadro;
  graficos.aoQuadro = (n) => {
    antes?.(n);
    if (cap.pedir) { cap.img = document.querySelector('#tela').toDataURL('image/png'); cap.pedir = false; }
  };
  // janelas escondidas enquanto captura (o $sync manda o visible ao motor)
  const syncJanela = Window.prototype.$sync;
  Window.prototype.$sync = function () {
    const v = this.$visible;
    if (cap.congelado) this.$visible = false;
    syncJanela.call(this);
    this.$visible = v;
  };
  cap.desenhar = async (px, py) => {
    const ss = $scene._spriteset;
    $game_map._display_x = px * 8;
    $game_map._display_y = py * 8;
    await ss.update();
    // o que é fixo na tela sai deste quadro e volta depois
    const v2 = ss._viewport2.visible, v3 = ss._viewport3.visible;
    ss._viewport2.visible = false;
    ss._viewport3.visible = false;
    const janelas = [...window.__brians.cena].filter((o) => o.tipo === 'janela');
    const visiveis = janelas.map((o) => o.visivel);
    for (const o of janelas) o.visivel = false;
    cap.pedir = true;
    try {
      await original.call(Graphics);
    } finally {
      janelas.forEach((o, i) => { o.visivel = visiveis[i]; });
      ss._viewport2.visible = v2;
      ss._viewport3.visible = v3;
    }
    if (cap.pedir) { cap.pedir = false; throw new Error('o quadro não foi capturado'); }
    return cap.img;
  };
});

const niveis = JSON.parse(fs.readFileSync('web/niveis.json', 'utf8')).filter((n) => !so || so.includes(n.id));
const feitos = [];
for (const n of niveis) {
  const e = n.entradas[0];
  const pedido = `${n.id},${e.x},${e.y},${e.dir}`;
  // salto pelo seletor de fases (o mesmo botão do modal)
  await pagina.evaluate((p) => document.querySelector(`#niveis button[data-pedido="${p}"]`).click(), pedido);
  await pagina.waitForFunction((id) => $game_map?.map_id === id && $scene?.constructor?.rubyName === 'Scene_Map' && $scene._spriteset, n.id, { timeout: 30000 });
  await pagina.waitForTimeout(1500);   // transição e eventos do começo
  const info = await pagina.evaluate(async () => {
    const cap = window.__cap;
    cap.congelado = true;
    await new Promise((r) => setTimeout(r, 100));   // o jogo para na trava
    return { mapa: $game_map.map_id, w: $game_map.width, h: $game_map.height, dx: $game_map._display_x, dy: $game_map._display_y };
  });
  if (info.mapa !== n.id) {
    console.log(`${n.id} ${n.nome}: um evento levou o Brian para o mapa ${info.mapa}; salto de novo`);
  }
  const W = info.w * 32, H = info.h * 32;
  const xs = [], ys = [];
  for (let x = 0; ; x += 544) { xs.push(Math.min(x, Math.max(0, W - 544))); if (x + 544 >= W) break; }
  for (let y = 0; ; y += 416) { ys.push(Math.min(y, Math.max(0, H - 416))); if (y + 416 >= H) break; }
  const pedacos = [];
  for (const py of ys) for (const px of xs) pedacos.push([px, py, await pagina.evaluate(([x, y]) => window.__cap.desenhar(x, y), [px, py])]);
  // emenda (mapa menor que a tela: a câmera fica em 0,0 e a imagem é a tela)
  const png = await pagina.evaluate(async ({ W, H, pedacos }) => {
    const c = new OffscreenCanvas(Math.max(W, 544), Math.max(H, 416));
    const ctx = c.getContext('2d');
    for (const [x, y, url] of pedacos) { const img = new Image(); img.src = url; await img.decode(); ctx.drawImage(img, x, y); }
    const recorte = new OffscreenCanvas(Math.max(W, 1), Math.max(H, 1));
    recorte.getContext('2d').drawImage(c, 0, 0);
    const blob = await (W >= 544 && H >= 416 ? recorte : c).convertToBlob({ type: 'image/png' });
    const b = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }, { W, H, pedacos });
  // devolve a câmera e solta o jogo
  await pagina.evaluate(({ dx, dy }) => { $game_map._display_x = dx; $game_map._display_y = dy; const cap = window.__cap; cap.congelado = false; cap.liberar?.(); }, info);
  const arq = path.join(pasta, `mapa-${String(n.id).padStart(3, '0')}.png`);
  fs.writeFileSync(arq, Buffer.from(png, 'base64'));
  feitos.push({ id: n.id, nome: n.nome, arq, w: W, h: H, mapaReal: info.mapa });
  console.log(`${String(n.id).padStart(3)} ${n.nome}: ${info.w}x${info.h} tiles, ${pedacos.length} quadros → ${arq}${erros.length ? `  ERROS: ${erros.splice(0).join(' | ')}` : ''}`);
}

// imagem gigante: as fases na ordem do seletor, em prateleiras, com o rótulo em cima
const LARGURA = 6200, MARGEM = 24, ROTULO = 40;
let x = MARGEM, y = MARGEM, alturaLinha = 0;
const lugares = [];
for (const f of feitos) {
  const w = Math.max(f.w, 544), h = Math.max(f.h, 416);
  if (x + w + MARGEM > LARGURA) { x = MARGEM; y += alturaLinha + MARGEM; alturaLinha = 0; }
  lugares.push({ ...f, x, y, wc: w, hc: h });
  x += w + MARGEM;
  alturaLinha = Math.max(alturaLinha, h + ROTULO);
}
const alturaTotal = y + alturaLinha + MARGEM;
const pg = await navegador.newPage();
const gigante = await pg.evaluate(async ({ lugares, LARGURA, alturaTotal, ROTULO, imgs }) => {
  const c = new OffscreenCanvas(LARGURA, alturaTotal);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, LARGURA, alturaTotal);
  ctx.font = 'bold 26px sans-serif'; ctx.textBaseline = 'top';
  for (let i = 0; i < lugares.length; i++) {
    const l = lugares[i];
    ctx.fillStyle = '#eee';
    ctx.fillText(`${String(l.id).padStart(3, '0')} · ${l.nome} (${l.w / 32}×${l.h / 32})${l.mapaReal !== l.id ? ` → mapa ${l.mapaReal}` : ''}`, l.x, l.y + 6);
    const img = new Image(); img.src = `data:image/png;base64,${imgs[i]}`; await img.decode();
    ctx.drawImage(img, l.x, l.y + ROTULO);
  }
  const b = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}, { lugares, LARGURA, alturaTotal, ROTULO, imgs: lugares.map((l) => fs.readFileSync(l.arq).toString('base64')) });
const arqGigante = path.join(pasta, 'todas-as-fases.png');
fs.writeFileSync(arqGigante, Buffer.from(gigante, 'base64'));
console.log(`\n${feitos.length} fases → ${arqGigante} (${LARGURA}×${alturaTotal})`);
await navegador.close();
estatico.close();
