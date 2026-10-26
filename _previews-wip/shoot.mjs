// Captura de previews: node shoot.mjs <receita> [<receita>...]
// Sobe um servidor estático na raiz do site, abre Chromium headless (mudo) e roda a receita.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { recipes } from './recipes.mjs';

const global = execSync('npm root -g').toString().trim();
const { chromium } = createRequire(path.join(global, 'x'))('playwright');

const ROOT = 'C:/repos/andredarcie.github.io';
const OUT = 'C:/repos/andredarcie.github.io/_previews-wip/shots';
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, p);
  fs.stat(file, (e, st) => {
    if (!e && st.isDirectory()) file = path.join(file, 'index.html');
    fs.stat(file, (e2, st2) => {
      if (e2 || !st2.isFile()) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required'],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const name of process.argv.slice(2)) {
  const r = recipes[name];
  if (!r) { console.log('sem receita:', name); continue; }
  const ctx = await browser.newContext({ viewport: r.viewport ?? { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    const url = r.url.startsWith('http') ? r.url : base + r.url;
    await page.goto(url, { waitUntil: r.waitUntil ?? 'load', timeout: 90000 });
    await r.run(page, { sleep, base });
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    console.log('ok', name, file);
  } catch (e) {
    console.log('FALHOU', name, e.message.split('\n')[0]);
    try { await page.screenshot({ path: path.join(OUT, `${name}-erro.png`) }); } catch {}
  }
  if (errors.length) console.log('  erros na página:', errors.slice(0, 3).join(' | '));
  if (r.dump) console.log(await page.evaluate(() => [...document.querySelectorAll('button, a, [role=button]')]
    .filter((b) => b.offsetParent).slice(0, 30).map((b) => `${b.tagName}#${b.id}.${b.className}: ${b.textContent.trim().slice(0, 40)}`).join('\n')));
  await ctx.close();
}
await browser.close();
server.close();
