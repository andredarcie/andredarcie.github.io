// Toca um replay sem tela num Chromium headless e salva o rastro quadro a
// quadro (ver web/src/rastro.js). Sobe um servidor estático próprio na raiz
// do repositório. Precisa do Playwright (npm i -g playwright).
//
// Uso (a partir de brians/):
//   node ferramentas/tocar-replay.mjs replay.json rastro.json [--detalhe N] [--com-tela]
// --capturas 10,200,… pasta: salva a tela nesses quadros como PNG (liga a tela).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const iCapturas = args.indexOf('--capturas');
const [listaCapturas, pastaCapturas] = iCapturas >= 0 ? args.splice(iCapturas, 3).slice(1) : [];
const [arquivoReplay, arquivoRastro] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--detalhe');
if (!arquivoReplay || !arquivoRastro) {
  console.log('uso: node ferramentas/tocar-replay.mjs replay.json rastro.json [--detalhe N] [--com-tela]');
  process.exit(2);
}
const detalhe = args.includes('--detalhe') ? Number(args[args.indexOf('--detalhe') + 1]) : null;
const comTela = args.includes('--com-tela') || !!listaCapturas;

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  const global = execSync('npm root -g').toString().trim();
  ({ chromium } = createRequire(path.join(global, 'x'))('playwright'));
}

// Servidor estático da raiz do repositório; o replay é servido em /__replay.json.
const RAIZ = path.resolve('..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mid': 'audio/midi' };
const servidor = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arq = p === '/__replay.json' ? path.resolve(arquivoReplay) : path.join(RAIZ, p);
  fs.stat(arq, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(arq).pipe(res);
  });
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const porta = servidor.address().port;

const navegador = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const pagina = await navegador.newPage({ viewport: { width: 544, height: 416 } });
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
// erros e também avisos de arquivo que faltou (áudio/imagem não encontrados)
pagina.on('console', (m) => { if (m.type() === 'error' || /não encontrad|not found|ENOENT/i.test(m.text())) erros.push(m.text()); });
pagina.on('response', (r) => { if (r.status() === 404) erros.push(`404: ${decodeURIComponent(new URL(r.url()).pathname)}`); });

const consulta = `replay=/__replay.json${comTela ? '' : '&semtela'}${args.includes('--sem-estado') ? '&semestado' : ''}${args.includes('--tempo-real') ? '&tempo=real' : ''}${detalhe !== null ? `&detalhe=${detalhe}` : ''}${listaCapturas ? `&capturas=${listaCapturas}` : ''}`;
const inicio = Date.now();
await pagina.goto(`http://127.0.0.1:${porta}/brians/web/index.html?${consulta}`);

// Espera o fim, mostrando o progresso.
let ultimo = -1, ultimoProgresso = Date.now();
for (;;) {
  if (Date.now() - ultimoProgresso > 60000) {
    console.log(`\nsem progresso há 60 s; erros no console:\n  ${erros.slice(0, 10).join('\n  ') || '(nenhum)'}`);
    process.exit(1);
  }
  const s = await pagina.evaluate(() => (window.__rastro
    ? { fim: window.__rastroFim === true, quadros: window.__rastro.quadros.length, indice: window.__rastro.indice, total: window.__rastro.entradas.length,
      objetos: window.__brians?.cena.size, js: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576)}
    : null));
  const aviso = await pagina.evaluate(() => { const c = document.querySelector('#aviso'); return c && !c.hidden ? c.innerText : null; });
  if (s?.fim) break;
  if (aviso && !s) { console.log(`a página parou antes do replay: ${aviso}`); process.exit(1); }
  if (s && s.quadros !== ultimo && (Date.now() - inicio) > 0) {
    process.stdout.write(`\r  quadro ${s.quadros} · entrada ${s.indice}/${s.total} · ${((Date.now() - inicio) / 1000).toFixed(0)} s · ${s.objetos} objetos de cena · memória JS ${s.js} MB   `);
    ultimo = s.quadros;
    ultimoProgresso = Date.now();
  }
  await new Promise((r) => setTimeout(r, 1000));
}
const resultado = await pagina.evaluate(() => window.__rastro.resultado());
if (listaCapturas) {
  fs.mkdirSync(pastaCapturas, { recursive: true });
  const capturas = await pagina.evaluate(() => window.__capturas ?? []);
  for (const [n, url] of capturas) fs.writeFileSync(path.join(pastaCapturas, `quadro-${String(n).padStart(6, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${capturas.length} capturas em ${pastaCapturas}`);
}
fs.writeFileSync(arquivoRastro, JSON.stringify(resultado));
const segundos = (Date.now() - inicio) / 1000;
console.log(`\r${arquivoRastro}: ${resultado.quadros.length} quadros em ${segundos.toFixed(0)} s (${(resultado.quadros.length / segundos).toFixed(0)} quadros/s) · fim: ${resultado.fim}`);
const t = resultado.tempos, nq = resultado.quadros.length || 1;
if (t) console.log(`  custo do estado: ${(t.js / nq).toFixed(1)} ms/quadro, ${(t.bytes / nq / 1024).toFixed(0)} KB/quadro`);
if (erros.length) console.log(`erros no console:\n  ${erros.slice(0, 10).join('\n  ')}`);

await navegador.close();
servidor.close();
