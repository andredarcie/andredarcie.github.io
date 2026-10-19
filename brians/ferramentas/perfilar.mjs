// Roda o jogo com o profiler (?perfil) tocando um replay e salva tudo para
// análise: o relatório do jogo (src/perfil.js, JSON e Markdown), o profiler de
// CPU do Chrome por CDP (funções e arquivos com mais tempo próprio) e as
// métricas do Chrome (tempo de script, de layout, memória).
// O replay é só entrada (&semrastro): sem os hashes do comparador.
// Uso: node ferramentas/perfilar.mjs replay.json pasta [--tempo-real] [--gpu] [--quadros N]
//   --tempo-real  ritmo de 60 por segundo (fps de verdade); sem ele, turbo (o máximo que a CPU dá)
//   --gpu         tenta a GPU da máquina (ANGLE/D3D11) em vez do SwiftShader (GPU emulada na CPU)
//   --quadros N   para no quadro N
//   --cpu N       CPU N vezes mais lenta (CDP Emulation.setCPUThrottlingRate; celular fraco ≈ 4–6)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const [arquivoReplay, pasta] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--quadros' && args[i - 1] !== '--cpu');
const lentidao = args.includes('--cpu') ? Number(args[args.indexOf('--cpu') + 1]) : 1;
if (!arquivoReplay || !pasta) { console.log('uso: node ferramentas/perfilar.mjs replay.json pasta [--tempo-real] [--gpu] [--quadros N]'); process.exit(2); }
const versao = 'js';
const tempoReal = args.includes('--tempo-real');
const limite = args.includes('--quadros') ? Number(args[args.indexOf('--quadros') + 1]) : Infinity;
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

const navegador = await chromium.launch({
  headless: true,
  args: [...(args.includes('--gpu') ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'],
});
const pagina = await navegador.newPage({ viewport: { width: 544, height: 416 } });
const erros = [];
pagina.on('pageerror', (e) => erros.push(e.message));
pagina.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

const cdp = await pagina.context().newCDPSession(pagina);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 250 });   // µs
await cdp.send('Performance.enable');
if (lentidao > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: lentidao });

const consulta = `perfil&replay=/__replay.json&semrastro${tempoReal ? '&tempo=real' : ''}`;
const inicio = Date.now();
await pagina.goto(`http://127.0.0.1:${servidor.address().port}/brians/web/index.html?${consulta}`);
await pagina.waitForFunction(() => window.__perfil && window.__rastro, null, { timeout: 180000 });
await cdp.send('Profiler.start');
const metricas0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

let ultimo = -1, parado = Date.now();
for (;;) {
  const s = await pagina.evaluate(() => ({ fim: window.__rastroFim === true, quadros: window.__perfil.quadros }));
  if (s.fim || s.quadros >= limite) break;
  if (s.quadros !== ultimo) { ultimo = s.quadros; parado = Date.now(); process.stdout.write(`\r  quadro ${s.quadros} · ${((Date.now() - inicio) / 1000).toFixed(0)} s   `); }
  if (Date.now() - parado > 60000) { console.log(`\nsem progresso há 60 s: ${erros.slice(0, 5).join(' | ')}`); break; }
  await new Promise((r) => setTimeout(r, 1000));
}
const { profile } = await cdp.send('Profiler.stop');
const metricas1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const relatorio = await pagina.evaluate(() => window.__perfil.relatorio());
const markdown = await pagina.evaluate(() => window.__perfil.markdown());

// ---------------------------------------------------------------- CPU: tempo próprio por função e por arquivo
const chaveFuncao = (f) => {
  const arq = f.url ? f.url.replace(/^.*\/brians\//, '').replace(/\?v=\d+$/, '') : `(${f.functionName || 'nativo'})`;
  return `${f.functionName || '(anônima)'} · ${arq}${f.url ? `:${f.lineNumber + 1}` : ''}`;
};
const porId = new Map(profile.nodes.map((n) => [n.id, n]));
const proprio = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => proprio.set(id, (proprio.get(id) ?? 0) + (dt[i] ?? 0)));
const totalUs = [...proprio.values()].reduce((a, b) => a + b, 0);
const funcoes = new Map(), arquivos = new Map();
for (const [id, us] of proprio) {
  const f = porId.get(id).callFrame;
  const arq = f.url ? f.url.replace(/^.*\/brians\//, '').replace(/\?v=\d+$/, '') : `(${f.functionName || 'nativo'})`;
  const chave = chaveFuncao(f);
  funcoes.set(chave, (funcoes.get(chave) ?? 0) + us);
  arquivos.set(arq, (arquivos.get(arq) ?? 0) + us);
}
const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => ({ nome: k, ms: Math.round(us / 1000), pct: Math.round((us / totalUs) * 1000) / 10 }));
// quem chama: para as funções mais caras (fora idle/program/GC), os chamadores
// diretos e o primeiro chamador do jogo (web/jogo ou web/src) na pilha
const pai = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) pai.set(c, n.id);
const nomeNo = (id) => { const f = porId.get(id).callFrame; const arq = f.url ? f.url.replace(/^.*\/brians\//, '').replace(/\?v=\d+$/, '') : ''; return `${f.functionName || '(anônima)'}${arq ? ` · ${arq}:${f.lineNumber + 1}` : ''}`; };
const chamadores = {};
for (const { nome } of top(funcoes, 45).filter((f) => !/^\((idle|program|garbage collector)\)/.test(f.nome)).slice(0, 16)) {
  const m = new Map();
  for (const [id, us] of proprio) {
    if (chaveFuncao(porId.get(id).callFrame) !== nome) continue;
    let p1 = pai.get(id), cadeia = [];
    for (let k = 0; p1 !== undefined && k < 6; k++, p1 = pai.get(p1)) cadeia.push(nomeNo(p1));
    const chave = cadeia.slice(0, 3).join(' ← ');
    m.set(chave, (m.get(chave) ?? 0) + us);
  }
  chamadores[nome] = [...m].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, us]) => `${Math.round(us / 1000)} ms: ${k}`);
}
const cpu = { amostrasMs: Math.round(totalUs / 1000), funcoes: top(funcoes, 45), arquivos: top(arquivos, 30), chamadores };
const delta = (k) => Math.round(((metricas1[k] ?? 0) - (metricas0[k] ?? 0)) * 1000);
const chrome = { scriptMs: delta('ScriptDuration'), tarefasMs: delta('TaskDuration'), layoutMs: delta('LayoutDuration'), recalcEstiloMs: delta('RecalcStyleDuration'),
  layouts: (metricas1.LayoutCount ?? 0) - (metricas0.LayoutCount ?? 0), heapMB: Math.round((metricas1.JSHeapUsedSize ?? 0) / 1048576), heapTotalMB: Math.round((metricas1.JSHeapTotalSize ?? 0) / 1048576),
  nos: metricas1.Nodes, ouvintes: metricas1.JSEventListeners };

const base = path.join(pasta, `perfil-${versao}${tempoReal ? '-tempo-real' : '-turbo'}${lentidao > 1 ? `-cpu${lentidao}x` : ''}`);
fs.writeFileSync(`${base}.json`, JSON.stringify({ relatorio, cpu, chrome, erros }, null, 1));
const md = [markdown.replace(/^(# .*)$/m, `$1${lentidao > 1 ? ` · CPU ${lentidao}× mais lenta` : ''}`),
  '## CPU (profiler do Chrome, tempo próprio)', '', `Amostrado: ${cpu.amostrasMs} ms.`, '',
  '| função · arquivo:linha | ms | % |', '|---|---|---|', ...cpu.funcoes.map((f) => `| ${f.nome} | ${f.ms} | ${f.pct} |`), '',
  '| arquivo | ms | % |', '|---|---|---|', ...cpu.arquivos.map((f) => `| ${f.nome} | ${f.ms} | ${f.pct} |`), '',
  '## Quem chama as funções mais caras', '', ...Object.entries(cpu.chamadores).flatMap(([f, l]) => [`- **${f}**`, ...l.map((x) => `  - ${x}`)]), '',
  '## Chrome', '', '```json', JSON.stringify(chrome, null, 1), '```', '',
  erros.length ? `## Erros\n\n${erros.slice(0, 20).map((e) => `- ${e}`).join('\n')}\n` : '',
].join('\n');
fs.writeFileSync(`${base}.md`, md);
console.log(`\n${base}.md / .json · ${relatorio.quadros} quadros em ${relatorio.segundos} s · ${relatorio.fpsMedio} fps · GPU ${relatorio.gpu.renderer}`);
await navegador.close();
servidor.close();
