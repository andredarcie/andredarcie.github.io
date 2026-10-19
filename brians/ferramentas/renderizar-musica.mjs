// Renderiza as faixas geradas (web/musica.html num Chromium headless) e
// salva capturas/musica/novas/<id>.wav, com o tempo de render. Depois compara
// cada uma com a ficha da original (musica-fichas/<id>-p<pitch>.json) em todos
// os pitches em que o jogo a toca (ferramentas/comparar-musica.py).
// Uso: node ferramentas/renderizar-musica.mjs [id…] [--cpu N]   (a partir de brians/)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const lentidao = args.includes('--cpu') ? Number(args[args.indexOf('--cpu') + 1]) : 1;
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--cpu');
let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  ({ chromium } = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x'))('playwright'));
}

const RAIZ = path.resolve('..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const servidor = http.createServer((req, res) => {
  const arq = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.stat(arq, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(arq).pipe(res);
  });
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const navegador = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pagina = await navegador.newPage();
pagina.on('pageerror', (e) => console.log('ERRO', e.message));
if (lentidao > 1) await (await pagina.context().newCDPSession(pagina)).send('Emulation.setCPUThrottlingRate', { rate: lentidao });
await pagina.goto(`http://127.0.0.1:${servidor.address().port}/brians/web/musica.html`);
await pagina.waitForFunction(() => window.__faixas);
const faixas = (await pagina.evaluate(() => window.__faixas)).filter((f) => !ids.length || ids.includes(f.id));
const pasta = path.resolve('capturas/musica/novas');
fs.mkdirSync(pasta, { recursive: true });
for (const f of faixas) {
  const r = await pagina.evaluate((id) => window.__exportarWav(id), f.id);
  const wav = path.join(pasta, `${f.id}.wav`);
  fs.writeFileSync(wav, Buffer.from(r.base64, 'base64'));
  console.log(`\n== ${f.id}: render ${r.ms} ms${lentidao > 1 ? ` (CPU ${lentidao}×)` : ''} · loop ${r.duracao.toFixed(1)} s · ${(fs.statSync(wav).size / 1048576).toFixed(1)} MB de WAV`);
  if (lentidao > 1) continue;
  for (const pitch of f.pitches) {
    if (!fs.existsSync(path.join('musica-fichas', `${f.id}-p${pitch}.json`))) continue;   // efeitos sonoros: sem ficha
    spawnSync('python', ['ferramentas/comparar-musica.py', path.join('musica-fichas', `${f.id}-p${pitch}.json`), wav, '--pitch', String(pitch),
      '--saida', path.join('capturas/musica', `${f.id}-p${pitch}`)], { stdio: 'inherit' });
  }
}
await navegador.close();
servidor.close();
