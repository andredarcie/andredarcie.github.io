// Tela de carregamento. Script clássico (não módulo) carregado direto do HTML: ele
// precisa rodar antes de o código do jogo chegar, justamente para medir essa
// chegada. Expõe `window.canudosLoading`, que src/main.js usa para anunciar as
// etapas de montagem do mundo.
//
// A barra não inventa nada: só anda quando algo termina de verdade.
// - "Baixando o jogo" conta os arquivos de código que já chegaram (a lista inteira
//   está no import map do index.html) pela Resource Timing do navegador.
// - As etapas seguintes (3D, vila, chão, mato, primeiro quadro, letras) são passos
//   reais do main.js; cada uma só conta quando acaba.
// O peso de cada etapa na barra é quanto ela levou da última vez neste navegador,
// então a barra anda no ritmo do tempo de verdade; na primeira visita usa uma
// estimativa, corrigida já na próxima.
(() => {
  const STORAGE_KEY = 'canudos-carga';
  const STAGES = [
    { id: 'code', label: 'Baixando o jogo', weight: 1500 },
    { id: 'view', label: 'Ligando o desenho 3D', weight: 250 },
    { id: 'world', label: 'Erguendo Belo Monte', weight: 600 },
    { id: 'ground', label: 'Pintando o chão do sertão', weight: 900 },
    { id: 'plants', label: 'Plantando a caatinga', weight: 500 },
    { id: 'frame', label: 'Preparando o primeiro quadro', weight: 700 },
    { id: 'fonts', label: 'Acertando as letras', weight: 100 }
  ];

  const screen = document.getElementById('loading');
  const bar = screen.querySelector('.loading-bar');
  const fill = screen.querySelector('.loading-fill');
  const label = screen.querySelector('.loading-label');
  const percent = screen.querySelector('.loading-percent');

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    for (const stage of STAGES) {
      if (saved && saved[stage.id] > 0) stage.weight = saved[stage.id];
    }
  } catch { /* sem armazenamento: fica a estimativa */ }
  const total = STAGES.reduce((sum, stage) => sum + stage.weight, 0);

  let current = 0;
  let within = 0;
  let detail = '';
  let failed = false;
  // Quando cada etapa começou (ms desde a abertura da página): a de código começa
  // com a navegação.
  const startedAt = { code: 0 };
  const durations = {};

  function draw() {
    if (failed) return;
    let done = 0;
    for (let i = 0; i < current; i++) done += STAGES[i].weight;
    done += STAGES[current] ? STAGES[current].weight * within : 0;
    const value = Math.min(100, Math.round(done / total * 100));
    fill.style.transform = `scaleX(${done / total})`;
    bar.setAttribute('aria-valuenow', String(value));
    percent.textContent = `${value}%`;
    const stage = STAGES[current];
    label.textContent = stage ? stage.label + (detail ? ` · ${detail}` : '') : 'Pronto';
  }

  // ---- Etapa 1: o código chegando ----
  // Os arquivos que o jogo usa são as entradas do import map. Cada um que termina
  // de baixar aparece como uma entrada de Resource Timing com a URL completa (com o
  // ?v=N), inclusive os que já tinham chegado antes deste script (buffered).
  const expected = new Set();
  try {
    const map = JSON.parse(document.querySelector('script[type="importmap"]').textContent);
    for (const url of Object.values(map.imports)) expected.add(new URL(url, document.baseURI).href);
  } catch { /* sem import map legível: a etapa fica sem contagem */ }
  const arrived = new Set();
  function countCode(entries) {
    if (current !== 0) return;
    for (const entry of entries) {
      if (expected.has(entry.name)) arrived.add(entry.name);
    }
    if (!expected.size) return;
    within = arrived.size / expected.size;
    detail = `${arrived.size} de ${expected.size} arquivos`;
    draw();
  }
  let observer = null;
  if ('PerformanceObserver' in window) {
    try {
      observer = new PerformanceObserver(list => countCode(list.getEntries()));
      observer.observe({ type: 'resource', buffered: true });
    } catch { observer = null; }
  }
  // O buffer de Resource Timing guarda 250 entradas por padrão; o jogo tem uma
  // centena de arquivos, mas há fontes e imagens também, então folga.
  performance.setResourceTimingBufferSize?.(600);

  // Espera o navegador pintar a barra antes de seguir: as etapas do main.js são
  // trabalho síncrono pesado e, sem essa pausa, a tela só atualizaria no fim. Com
  // a aba escondida não há quadro para esperar.
  function afterPaint() {
    return new Promise(resolve => {
      if (document.hidden) setTimeout(resolve, 0);
      else requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  function close(index) {
    const stage = STAGES[index];
    if (stage && durations[stage.id] === undefined) {
      durations[stage.id] = Math.max(1, performance.now() - startedAt[stage.id]);
    }
  }

  window.canudosLoading = {
    // Fecha a etapa atual e abre `id`. Quando main.js chama a primeira etapa
    // depois do código, é porque todo o código que ele importa já chegou.
    stage(id) {
      const index = STAGES.findIndex(stage => stage.id === id);
      if (index < 0 || failed) return afterPaint();
      for (let i = current; i < index; i++) close(i);
      if (index > 0 && observer) { observer.disconnect(); observer = null; }
      current = index;
      within = 0;
      detail = '';
      startedAt[id] = performance.now();
      draw();
      return afterPaint();
    },

    // Tudo pronto: completa a barra, guarda quanto cada etapa levou e some com a
    // tela. Resolve quando ela já saiu, para o menu abrir por cima do jogo.
    async finish() {
      if (failed) return;
      for (let i = current; i < STAGES.length; i++) close(i);
      current = STAGES.length;
      within = 0;
      detail = '';
      draw();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(durations)); } catch { /* opcional */ }
      await afterPaint();
      screen.classList.add('loading-done');
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      await new Promise(resolve => setTimeout(resolve, reduced || document.hidden ? 0 : 260));
      screen.remove();
    },

    // Deu errado: a barra para onde estava e a tela diz o que houve, em vez de
    // ficar carregando para sempre.
    fail(message) {
      if (failed || !screen.isConnected) return;
      failed = true;
      screen.classList.add('loading-failed');
      label.textContent = message;
      percent.textContent = '';
    }
  };

  window.addEventListener('error', event => {
    // Aviso inofensivo do navegador, não é falha do jogo.
    if (String(event.message).includes('ResizeObserver')) return;
    window.canudosLoading.fail(`Não deu para abrir o jogo: ${event.message || 'erro desconhecido'}. Recarregue a página.`);
  });
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    window.canudosLoading.fail(`Não deu para abrir o jogo: ${reason?.message ?? reason}. Recarregue a página.`);
  });

  draw();
})();
