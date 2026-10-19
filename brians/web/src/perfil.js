// Profiler do jogo (`?perfil` na URL). Mede cada quadro
// por fases e conta o trabalho do motor, sem mudar o que o jogo faz:
//   quadro   = do fim da espera anterior ao fim da espera deste
//   lógica   = do fim da espera anterior ao começo do desenho (scripts do
//              jogo, sincronização da fachada, atualização de sprites)
//   desenho  = desenharCena + cópia para a tela (+ passo de transição)
//   espera   = o resto do quadro (ritmo de 60 por segundo)
// Conta: chamadas de desenho (flush), quads, trocas de estado, envios de
// textura (e bytes), tempo e quads por tipo de objeto, efeitos de viewport,
// operações de bitmap (drawText, blt, get_pixel…), imagens carregadas, áudio,
// objetos de cena, bitmaps vivos, memória, tarefas longas e o estado do jogo.
//
// Painel na tela: tecla P (ou o botão "Perfil"). Para a IA ler:
//   __perfil.relatorio()  → objeto (JSON)
//   __perfil.markdown()   → texto Markdown com as tabelas
//   botão "Baixar" no painel → perfil-AAAA-MM-DD.json + .md
import { Bitmap } from './rgss/bitmap.js';
import { Renderizador } from './rgss/render.js';
import { Graficos } from './rgss/graficos.js';
import { cena } from './rgss/objetos.js';

const agora = () => performance.now();
const JANELA = 600;   // quadros guardados um a um (10 s a 60 fps)

// ------------------------------------------------------------------ estatística
class Serie {
  constructor() { this.n = 0; this.soma = 0; this.max = 0; this.min = Infinity; this.hist = new Map(); }
  add(v) {
    this.n++; this.soma += v; if (v > this.max) this.max = v; if (v < this.min) this.min = v;
    const b = v < 1 ? Math.round(v * 10) / 10 : v < 20 ? Math.round(v) : Math.round(v / 5) * 5;   // baldes para percentis
    this.hist.set(b, (this.hist.get(b) ?? 0) + 1);
  }
  get media() { return this.n ? this.soma / this.n : 0; }
  percentil(p) {
    if (!this.n) return 0;
    const alvo = this.n * p;
    let acc = 0;
    for (const b of [...this.hist.keys()].sort((a, c) => a - c)) { acc += this.hist.get(b); if (acc >= alvo) return b; }
    return this.max;
  }
  resumo(casas = 2) {
    const f = (x) => Number((x === Infinity ? 0 : x).toFixed(casas));
    return { n: this.n, media: f(this.media), p50: f(this.percentil(0.5)), p95: f(this.percentil(0.95)), p99: f(this.percentil(0.99)), max: f(this.max) };
  }
}

const novoQuadro = () => ({
  t0: 0, tDesenho: 0, desenho: 0, sync: 0, syncObjetos: 0, transicao: 0,
  flush: 0, quads: 0, trocas: 0, uploads: 0, uploadBytes: 0, efeitos: 0,
  porTipo: {}, bitmapOps: 0, bitmapMs: 0, textos: 0, imagens: 0, audio: 0,
});

export function instalarPerfil({ renderizador, graficos, audio, versao, botaoEm = document.body }) {
  const p = {
    versao, inicio: agora(), quadros: 0,
    serie: { quadro: new Serie(), logica: new Serie(), desenho: new Serie(), espera: new Serie(), sync: new Serie(),
      flush: new Serie(), quads: new Serie(), uploads: new Serie(), trabalho: new Serie() },
    porTipo: {},          // tipo → { ms: Serie, quads: Serie }
    bitmap: {},           // operação → { n, ms }
    audio: {},            // comando → n
    imagens: { n: 0, ms: 0, lentas: [] },
    porMapa: new Map(),   // mapa → { quadros, logica: Serie, desenho: Serie, quads: Serie, nome }
    recentes: [],         // os últimos JANELA quadros, um a um
    longas: [],           // tarefas longas (PerformanceObserver)
    picos: [],            // quadros com trabalho > 16,7 ms (os 40 piores)
    memoria: [],          // amostra a cada 60 quadros
    gpu: null,
  };
  let q = novoQuadro();
  let fimEspera = agora();

  // ---------------------------------------------------------------- renderizador
  const R = Renderizador.prototype;
  const envolver = (alvo, nome, antes, depois) => {
    const original = alvo[nome];
    alvo[nome] = function (...args) {
      const ctx = antes?.call(this, ...args);
      const r = original.apply(this, args);
      depois?.call(this, ctx, ...args);
      return r;
    };
  };
  envolver(R, 'flush', function () { if (this.nVertices) { q.flush++; q.quads += this.nVertices / 6; } });
  envolver(R, 'preparar', function (tex, opac, cor, tom, blend) {
    const e = this.estado;
    return !(e && e.tex === tex && e.opac === opac && e.blend === blend);
  }, function (mudou) { if (mudou) q.trocas++; });
  envolver(R, 'texturaDe', function (bmp) {
    const t = this.texturas.get(bmp);
    return !t || t.versao !== bmp.versao ? bmp : null;
  }, function (bmp) { if (bmp) { q.uploads++; q.uploadBytes += bmp.largura * bmp.altura * 4; } });
  envolver(R, 'efeitoRegiao', () => { q.efeitos++; });
  const desenharObjeto = R.desenharObjeto;
  R.desenharObjeto = function (o, bx, by, area) {
    if (!o.visivel) return undefined;
    const t = agora(), quads = q.quads + this.nVertices / 6;
    const r = desenharObjeto.call(this, o, bx, by, area);
    const pt = (q.porTipo[o.tipo] ??= { ms: 0, quads: 0, n: 0 });
    pt.ms += agora() - t; pt.quads += q.quads + this.nVertices / 6 - quads; pt.n++;
    return r;
  };
  for (const nome of ['desenharCena', 'copiar']) {
    const original = R[nome];
    R[nome] = function (...args) {
      if (!q.tDesenho) q.tDesenho = agora();
      const t = agora(); const r = original.apply(this, args); q.desenho += agora() - t; return r;
    };
  }
  const transicaoR = R.transicao;
  R.transicao = function (...args) { const t = agora(); const r = transicaoR.apply(this, args); q.transicao += agora() - t; q.desenho += agora() - t; if (!q.tDesenho) q.tDesenho = t; return r; };

  // ---------------------------------------------------------------- bitmaps
  const B = Bitmap.prototype;
  for (const nome of ['stretchBlt', 'fillRect', 'gradientFillRect', 'clearRect', 'clear', 'getPixel', 'setPixel', 'hueChange', 'blur', 'radialBlur', 'drawText']) {
    const original = B[nome];
    if (!original) continue;
    B[nome] = function (...args) {
      const t = agora(); const r = original.apply(this, args); const ms = agora() - t;
      const b = (p.bitmap[nome] ??= { n: 0, ms: 0, max: 0 }); b.n++; b.ms += ms; if (ms > b.max) b.max = ms;
      q.bitmapOps++; q.bitmapMs += ms; if (nome === 'drawText') q.textos++;
      return r;
    };
  }
  const carregar = Bitmap.carregar;
  Bitmap.carregar = async function (caminho) {
    const t = agora(); const r = await carregar.call(this, caminho); const ms = agora() - t;
    p.imagens.n++; p.imagens.ms += ms; q.imagens++;
    if (ms > 20) { p.imagens.lentas.push([caminho, Math.round(ms)]); p.imagens.lentas.sort((a, b) => b[1] - a[1]); p.imagens.lentas.length = Math.min(15, p.imagens.lentas.length); }
    return r;
  };

  // ---------------------------------------------------------------- áudio
  for (const nome of ['bgmPlay', 'bgmStop', 'bgmFade', 'bgsPlay', 'bgsStop', 'bgsFade', 'mePlay', 'meStop', 'meFade', 'sePlay', 'seStop']) {
    const original = audio[nome]?.bind(audio);
    if (!original) continue;
    audio[nome] = (...args) => { p.audio[nome] = (p.audio[nome] ?? 0) + 1; q.audio++; return original(...args); };
  }

  // ---------------------------------------------------------------- quadros
  const G = Graficos.prototype;
  const esperar = G.esperar;
  G.esperar = function (...args) {
    const t = agora();
    fecharTrabalho(t);
    const r = esperar.apply(this, args);
    Promise.resolve(r).then(() => fecharQuadro(t, agora()));
    return r;
  };

  let pendente = null;
  function fecharTrabalho(tEspera) {
    const inicioDesenho = q.tDesenho || tEspera;
    q.logica = Math.max(0, inicioDesenho - fimEspera - (q.tDesenho ? 0 : 0));
    q.trabalho = tEspera - fimEspera;
    pendente = q;
    q = novoQuadro();
  }
  function fecharQuadro(tEspera, tFim) {
    const f = pendente;
    if (!f) return;
    pendente = null;
    f.espera = tFim - tEspera;
    f.quadro = tFim - fimEspera;
    fimEspera = tFim;
    p.quadros++;
    const s = p.serie;
    s.quadro.add(f.quadro); s.logica.add(f.logica); s.desenho.add(f.desenho); s.espera.add(f.espera);
    s.sync.add(f.sync); s.flush.add(f.flush); s.quads.add(f.quads); s.uploads.add(f.uploads); s.trabalho.add(f.trabalho);
    for (const [tipo, v] of Object.entries(f.porTipo)) {
      const pt = (p.porTipo[tipo] ??= { ms: new Serie(), quads: new Serie(), objetos: new Serie() });
      pt.ms.add(v.ms); pt.quads.add(v.quads); pt.objetos.add(v.n);
    }
    const jogo = estadoJogo();
    const chave = jogo.mapa ?? jogo.cena ?? '?';
    const m = p.porMapa.get(chave) ?? { cena: jogo.cena, quadros: 0, logica: new Serie(), desenho: new Serie(), trabalho: new Serie(), quads: new Serie(), objetos: 0, eventos: 0 };
    m.quadros++; m.logica.add(f.logica); m.desenho.add(f.desenho); m.trabalho.add(f.trabalho); m.quads.add(f.quads);
    m.objetos = Math.max(m.objetos, cena.size); m.eventos = jogo.eventos ?? m.eventos;
    p.porMapa.set(chave, m);
    const linha = { n: p.quadros, quadro: r2(f.quadro), logica: r2(f.logica), sync: r2(f.sync), desenho: r2(f.desenho), espera: r2(f.espera),
      flush: f.flush, quads: Math.round(f.quads), trocas: f.trocas, uploads: f.uploads, uploadKB: Math.round(f.uploadBytes / 1024),
      efeitos: f.efeitos, bitmapOps: f.bitmapOps, bitmapMs: r2(f.bitmapMs), textos: f.textos, imagens: f.imagens, audio: f.audio,
      objetos: cena.size, mapa: jogo.mapa, cena: jogo.cena };
    p.recentes.push(linha); if (p.recentes.length > JANELA) p.recentes.shift();
    if (f.trabalho > 1000 / 60) {
      p.picos.push({ ...linha, trabalho: r2(f.trabalho), jogo }); p.picos.sort((a, b) => b.trabalho - a.trabalho);
      if (p.picos.length > 40) p.picos.length = 40;
    }
    if (p.quadros % 60 === 0) {
      p.memoria.push({ quadro: p.quadros, s: r2((tFim - p.inicio) / 1000), heapMB: performance.memory ? r2(performance.memory.usedJSHeapSize / 1048576) : null,
        objetos: cena.size, texturas: renderizador.texturas.size, bitmapsMB: r2(bitmapsVivos().bytes / 1048576) });
      if (p.memoria.length > 2000) p.memoria.shift();
    }
    if (p.quadros % 30 === 0 && painel && !painel.hidden) desenharPainel();
  }
  const r2 = (x) => Math.round(x * 100) / 100;

  // a fachada JS: tempo de $sync por objeto (Viewport, Sprite, Plane, Window, Tilemap)
  p.instrumentarFachadaJs = () => {
    for (const nome of ['Viewport', 'Sprite', 'Plane', 'Window', 'Tilemap']) {
      const C = globalThis[nome];
      if (!C?.prototype?.$sync) continue;
      const original = C.prototype.$sync;
      C.prototype.$sync = function () { const t = agora(); const r = original.call(this); q.sync += agora() - t; q.syncObjetos++; return r; };
    }
  };

  // ---------------------------------------------------------------- tarefas longas
  try {
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) { p.longas.push({ inicioS: r2(e.startTime / 1000), ms: Math.round(e.duration) }); if (p.longas.length > 200) p.longas.shift(); }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* navegador sem longtask */ }

  // ---------------------------------------------------------------- GPU
  try {
    const gl = renderizador.gl;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    p.gpu = {
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      maxTextura: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      timerQuery: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'),
    };
  } catch { /* ok */ }

  // ---------------------------------------------------------------- estado
  function estadoJogo() {
    const g = globalThis;
    const cenaJogo = g.$scene?.constructor?.rubyName ?? null;
    if (!g.$game_map?.map_id) return { cena: cenaJogo };
    let eventos = null;
    try { eventos = g.$game_map.events?.size ?? null; } catch { /* ok */ }
    return { cena: cenaJogo, mapa: g.$game_map.map_id, eventos, x: g.$game_player?.x, y: g.$game_player?.y,
      interpretador: (() => { try { return g.$game_map.interpreter.running_p(); } catch { return null; } })(),
      mensagem: g.$game_message?.visible ?? null };
  }
  function bitmapsVivos() {
    const vistos = new Set();
    let bytes = 0;
    const contar = (b) => { if (b && !b.descartado && !vistos.has(b)) { vistos.add(b); bytes += b.largura * b.altura * 4; } };
    for (const o of cena) {
      if (o.tipo === 'sprite' || o.tipo === 'plane') contar(o.bitmap);
      else if (o.tipo === 'janela') { contar(o.skin); contar(o.conteudo); }
      else if (o.tipo === 'tilemap') o.tilemap.bitmaps.forEach(contar);
    }
    return { n: vistos.size, bytes };
  }
  function objetosPorTipo() {
    const r = {};
    for (const o of cena) { const k = (r[o.tipo] ??= { total: 0, visiveis: 0 }); k.total++; if (o.visivel) k.visiveis++; }
    return r;
  }

  // ---------------------------------------------------------------- relatório
  p.relatorio = () => {
    const s = p.serie, segundos = (agora() - p.inicio) / 1000;
    const res = (x) => x.resumo();
    return {
      gerado: new Date().toISOString(), versao, build: document.documentElement.dataset.build,
      url: location.search, segundos: r2(segundos), quadros: p.quadros,
      fpsMedio: r2(p.quadros / Math.max(segundos, 0.001)),
      fpsPeloQuadro: r2(1000 / Math.max(s.quadro.media, 0.001)),
      turbo: !!graficos.turbo, semTela: !!graficos.semTela,
      orcamentoMs: r2(1000 / 60),
      quadrosAcimaDoOrcamento: { trabalho: p.picos.length >= 40 ? '≥40 (lista cheia)' : p.picos.length, pct: pctAcima(s.trabalho) },
      tempos: { quadro: res(s.quadro), trabalho: res(s.trabalho), logica: res(s.logica), syncFachadaJs: res(s.sync), desenho: res(s.desenho), espera: res(s.espera) },
      gpu: { ...p.gpu, chamadasDeDesenho: res(s.flush), quads: res(s.quads), envioDeTexturas: res(s.uploads), texturasVivas: renderizador.texturas.size },
      porTipoDeObjeto: Object.fromEntries(Object.entries(p.porTipo).map(([k, v]) => [k, { ms: v.ms.resumo(3), quads: v.quads.resumo(0), objetos: v.objetos.resumo(0) }])),
      operacoesDeBitmap: Object.fromEntries(Object.entries(p.bitmap).sort((a, b) => b[1].ms - a[1].ms).map(([k, v]) => [k, { n: v.n, msTotal: r2(v.ms), msMedio: r2(v.ms / v.n), msMax: r2(v.max) }])),
      imagensCarregadas: { n: p.imagens.n, msTotal: r2(p.imagens.ms), maisLentas: p.imagens.lentas },
      audio: p.audio,
      cenaAgora: { objetos: cena.size, porTipo: objetosPorTipo(), bitmapsVivos: bitmapsVivos().n, bitmapsMB: r2(bitmapsVivos().bytes / 1048576) },
      memoria: { agoraMB: performance.memory ? r2(performance.memory.usedJSHeapSize / 1048576) : null,
        maxMB: Math.max(0, ...p.memoria.map((m) => m.heapMB ?? 0)), amostras: p.memoria.filter((_, i, a) => i % Math.ceil(a.length / 30) === 0) },
      porMapa: [...p.porMapa].map(([mapa, m]) => ({ mapa, cena: m.cena, quadros: m.quadros, trabalhoMs: m.trabalho.resumo(), logicaMs: m.logica.resumo(), desenhoMs: m.desenho.resumo(), quads: m.quads.resumo(0), objetosMax: m.objetos, eventos: m.eventos })),
      picos: p.picos.slice(0, 20),
      tarefasLongas: { n: p.longas.length, maiores: [...p.longas].sort((a, b) => b.ms - a.ms).slice(0, 15) },
      jogoAgora: estadoJogo(),
      ultimosQuadros: p.recentes.slice(-120),
    };
  };
  function pctAcima(serie) {
    let acima = 0;
    for (const [b, n] of serie.hist) if (b > 1000 / 60) acima += n;
    return serie.n ? r2((acima / serie.n) * 100) : 0;
  }

  p.markdown = () => {
    const r = p.relatorio();
    const t = r.tempos;
    const linhaSerie = (nome, x) => `| ${nome} | ${x.media} | ${x.p50} | ${x.p95} | ${x.p99} | ${x.max} |`;
    const out = [
      `# Perfil do Brian's Mansion (${r.versao}, build ${r.build})`, '',
      `- ${r.quadros} quadros em ${r.segundos} s · **${r.fpsMedio} fps** (pelo tempo médio do quadro: ${r.fpsPeloQuadro}) · turbo: ${r.turbo} · sem tela: ${r.semTela}`,
      `- orçamento de 16,67 ms por quadro: ${r.quadrosAcimaDoOrcamento.pct}% dos quadros passam (trabalho = lógica + desenho)`,
      `- GPU: ${r.gpu.renderer} (${r.gpu.vendor}) · timer de GPU: ${r.gpu.timerQuery}`,
      `- memória JS: ${r.memoria.agoraMB} MB agora, ${r.memoria.maxMB} MB no máximo · objetos de cena: ${r.cenaAgora.objetos} · bitmaps vivos: ${r.cenaAgora.bitmapsVivos} (${r.cenaAgora.bitmapsMB} MB)`, '',
      '## Tempo por quadro (ms)', '', '| fase | média | p50 | p95 | p99 | máx |', '|---|---|---|---|---|---|',
      linhaSerie('quadro', t.quadro), linhaSerie('trabalho (lógica + desenho)', t.trabalho), linhaSerie('lógica do jogo', t.logica),
      linhaSerie('… sync da fachada JS', t.syncFachadaJs), linhaSerie('desenho', t.desenho), linhaSerie('espera', t.espera), '',
      '## Desenho', '', '| medida | média | p50 | p95 | p99 | máx |', '|---|---|---|---|---|---|',
      linhaSerie('chamadas de desenho', r.gpu.chamadasDeDesenho), linhaSerie('quads', r.gpu.quads), linhaSerie('envios de textura', r.gpu.envioDeTexturas), '',
      '| tipo | ms média | ms p95 | quads média | objetos média |', '|---|---|---|---|---|',
      ...Object.entries(r.porTipoDeObjeto).map(([k, v]) => `| ${k} | ${v.ms.media} | ${v.ms.p95} | ${v.quads.media} | ${v.objetos.media} |`), '',
      '## Operações de bitmap', '', '| operação | n | ms total | ms média | ms máx |', '|---|---|---|---|---|',
      ...Object.entries(r.operacoesDeBitmap).map(([k, v]) => `| ${k} | ${v.n} | ${v.msTotal} | ${v.msMedio} | ${v.msMax} |`), '',
      `Imagens carregadas: ${r.imagensCarregadas.n} em ${r.imagensCarregadas.msTotal} ms. Mais lentas: ${r.imagensCarregadas.maisLentas.map(([c, ms]) => `${c} ${ms} ms`).join(', ') || '—'}`, '',
      '## Por mapa (ms)', '', '| mapa | quadros | trabalho média | trabalho p95 | lógica média | desenho média | quads média | objetos máx |', '|---|---|---|---|---|---|---|---|',
      ...r.porMapa.sort((a, b) => b.trabalhoMs.p95 - a.trabalhoMs.p95).map((m) => `| ${m.mapa} | ${m.quadros} | ${m.trabalhoMs.media} | ${m.trabalhoMs.p95} | ${m.logicaMs.media} | ${m.desenhoMs.media} | ${m.quads.media} | ${m.objetosMax} |`), '',
      '## Quadros mais pesados', '', '| quadro | trabalho | lógica | desenho | quads | uploads (KB) | bitmap ms | imagens | mapa | cena |', '|---|---|---|---|---|---|---|---|---|---|',
      ...r.picos.map((x) => `| ${x.n} | ${x.trabalho} | ${x.logica} | ${x.desenho} | ${x.quads} | ${x.uploads} (${x.uploadKB}) | ${x.bitmapMs} | ${x.imagens} | ${x.mapa ?? ''} | ${x.cena ?? ''} |`), '',
      `Tarefas longas (>50 ms): ${r.tarefasLongas.n}. Maiores: ${r.tarefasLongas.maiores.map((x) => `${x.ms} ms em ${x.inicioS} s`).join(', ') || '—'}`, '',
      `Áudio: ${Object.entries(r.audio).map(([k, n]) => `${k} ${n}`).join(', ') || '—'}`, '',
    ];
    return out.join('\n');
  };

  // ---------------------------------------------------------------- painel
  let painel = null;
  const estilo = document.createElement('style');
  estilo.textContent = `#perfil { position: fixed; top: 8px; right: 8px; z-index: 50; max-width: min(96vw, 460px); max-height: 92vh; overflow: auto;
    background: rgb(0 0 0 / .82); color: #cfe; font: 11px/1.35 ui-monospace, Consolas, monospace; padding: 8px 10px; border: 1px solid #355; white-space: pre; }
    #perfil button, #abrir-perfil { font: 11px ui-monospace, Consolas, monospace; background: #123; color: #cfe; border: 1px solid #355; padding: 2px 8px; cursor: pointer; }
    #abrir-perfil { position: fixed; top: 8px; right: 8px; z-index: 49; }`;
  document.head.append(estilo);
  painel = document.createElement('div');
  painel.id = 'perfil';
  painel.hidden = true;
  const abrir = document.createElement('button');
  abrir.id = 'abrir-perfil';
  abrir.textContent = 'Perfil (P)';
  botaoEm.append(painel, abrir);
  const alternar = () => { painel.hidden = !painel.hidden; abrir.hidden = !painel.hidden; if (!painel.hidden) desenharPainel(); };
  abrir.addEventListener('click', alternar);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyP' && !e.repeat && !e.target.closest?.('input')) alternar(); });

  function desenharPainel() {
    const ult = p.recentes.slice(-60);
    const med = (k) => (ult.length ? r2(ult.reduce((a, x) => a + x[k], 0) / ult.length) : 0);
    const maxk = (k) => (ult.length ? Math.max(...ult.map((x) => x[k])) : 0);
    const fps = ult.length ? r2(1000 / med('quadro')) : 0;
    const j = estadoJogo(), obj = objetosPorTipo(), bv = bitmapsVivos();
    const barra = (ms) => '█'.repeat(Math.min(30, Math.round(ms / (1000 / 60) * 15)));
    painel.textContent = [
      `PERFIL ${versao.toUpperCase()} · build ${document.documentElement.dataset.build} · ${p.quadros} quadros`,
      `fps (últimos 60)  ${fps}    turbo ${!!graficos.turbo}`,
      `quadro   ${med('quadro')} ms (máx ${maxk('quadro')})`,
      `lógica   ${med('logica')} ms ${barra(med('logica'))}`,
      `  sync   ${med('sync')} ms`,
      `desenho  ${med('desenho')} ms ${barra(med('desenho'))}`,
      `espera   ${med('espera')} ms`,
      `desenhos ${med('flush')} chamadas · ${med('quads')} quads · ${med('trocas')} trocas`,
      `texturas ${med('uploads')} envios/quadro (${med('uploadKB')} KB) · ${renderizador.texturas.size} vivas`,
      `efeitos de viewport ${med('efeitos')}/quadro · bitmap ${med('bitmapMs')} ms/quadro (${med('textos')} textos)`,
      `cena ${cena.size} objetos: ${Object.entries(obj).map(([k, v]) => `${k} ${v.visiveis}/${v.total}`).join(' · ')}`,
      `bitmaps vivos ${bv.n} (${r2(bv.bytes / 1048576)} MB) · memória JS ${performance.memory ? r2(performance.memory.usedJSHeapSize / 1048576) : '?'} MB`,
      `jogo: ${j.cena ?? '?'} · mapa ${j.mapa ?? '-'} (${j.x ?? '-'},${j.y ?? '-'}) · eventos ${j.eventos ?? '-'} · interpretador ${j.interpretador ?? '-'} · mensagem ${j.mensagem ?? '-'}`,
      `GPU: ${p.gpu?.renderer ?? '?'}`,
      `tarefas longas ${p.longas.length} · picos > 16,7 ms ${p.picos.length}`,
      '',
    ].join('\n');
    const baixar = document.createElement('button');
    baixar.textContent = 'Baixar relatório (.json + .md)';
    baixar.onclick = () => {
      const dia = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      for (const [nome, dado, tipo] of [[`perfil-${dia}.json`, JSON.stringify(p.relatorio(), null, 1), 'application/json'], [`perfil-${dia}.md`, p.markdown(), 'text/markdown']]) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([dado], { type: tipo })); a.download = nome; a.click();
      }
    };
    painel.append(baixar);
  }

  window.__perfil = p;
  return p;
}
