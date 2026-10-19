// Controle remoto para jogar o Brian's Mansion num Chromium, comando a comando
// (testar à mão sem estar na frente do navegador). Sobe um servidor estático
// na raiz do repositório, abre index.html e
// atende numa porta local:
//   GET /tecla?k=ArrowUp&ms=300     segura a tecla por ms (padrão 100) e solta
//                                   (várias: k=ShiftLeft+ArrowRight)
//   GET /espera?ms=1000
//   GET /tela?arq=caminho.png       salva a tela do jogo
//   GET /estado                     mapa, posição, cena, interruptores 1–5, variáveis 1–5
//   GET /js?c=expressão             avalia na página (depuração)
//   GET /recarregar                 recarrega a página (os saves ficam no localStorage)
//   GET /fim                        fecha tudo
// Uso: node ferramentas/jogar.mjs [--porta 8766]   (a partir de brians/)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const PORTA = Number(args.includes('--porta') ? args[args.indexOf('--porta') + 1] : 8766);

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

const estado = () => pagina.evaluate(() => {
  const g = globalThis;
  if (!g.$game_map) return { cena: g.$scene?.constructor?.rubyName ?? null };
  const sw = g.$game_switches, va = g.$game_variables;
  const ler = (o, i) => (o.idx ? o.idx(i) : o._data?.[i]);
  return {
    cena: g.$scene?.constructor?.rubyName ?? null, mapa: g.$game_map.map_id,
    x: g.$game_player.x, y: g.$game_player.y, dir: g.$game_player.direction,
    mensagem: g.$game_message?.visible ?? null, evento: g.$game_map.interpreter?._event_id ?? null,
    interruptores: [1, 2, 3, 4, 5].map((i) => ler(sw, i)), variaveis: [1, 2, 3, 4, 5].map((i) => ler(va, i)),
    quadro: g.Graphics?.frame_count,
  };
});

const controle = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const q = Object.fromEntries(u.searchParams);
  let resposta;
  try {
    switch (u.pathname) {
      case '/tecla': {
        const teclas = q.k.split('+');
        for (const k of teclas) await pagina.keyboard.down(k);
        await pagina.waitForTimeout(Number(q.ms ?? 100));
        for (const k of teclas.reverse()) await pagina.keyboard.up(k);
        resposta = { ok: true };
        break;
      }
      case '/espera': await pagina.waitForTimeout(Number(q.ms ?? 1000)); resposta = { ok: true }; break;
      case '/tela': await pagina.locator('#tela').screenshot({ path: q.arq }); resposta = { ok: true, arq: q.arq }; break;
      case '/estado': resposta = await estado(); break;
      case '/js': resposta = await pagina.evaluate((c) => { const r = (0, eval)(c); return typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r; }, q.c); break;
      case '/recarregar':
        await pagina.reload();
        await pagina.waitForSelector('#jogar:not([hidden])', { timeout: 120000 });
        await pagina.click('#jogar');
        resposta = { ok: true };
        break;
      case '/fim': resposta = { ok: true }; setTimeout(async () => { await navegador.close(); estatico.close(); controle.close(); process.exit(0); }, 50); break;
      default: resposta = { erro: 'comando desconhecido' };
    }
  } catch (e) { resposta = { erro: String(e.message ?? e) }; }
  if (erros.length) resposta = { ...resposta, errosDaPagina: erros.splice(0) };
  const aviso = await pagina.evaluate(() => { const c = document.querySelector('#aviso'); return c && !c.hidden ? c.innerText : null; }).catch(() => null);
  if (aviso) resposta = { ...resposta, aviso };
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(resposta));
});
controle.listen(PORTA, '127.0.0.1', () => console.log(`pronto: http://127.0.0.1:${PORTA} `));
