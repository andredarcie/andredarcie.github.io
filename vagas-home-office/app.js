const form = document.querySelector('#search-form');
const input = document.querySelector('#job-query');
const status = document.querySelector('#search-status');
const list = document.querySelector('#jobs-list');
const moreButton = document.querySelector('#load-more');
const snapshot = window.__VAGAS__;
const PAGE_SIZE = 24;
let visibleCount = PAGE_SIZE;
let matchingJobs = [];
let dataIsFresh = false;
let availableCount = 0;

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const synonyms = {
  atendimento: ['atendimento', 'atendente', 'suporte', 'relacionamento'],
  administrativo: ['administrativo', 'assistente', 'operacoes'],
  marketing: ['marketing', 'conteudo', 'redator', 'midias sociais'],
  suporte: ['suporte', 'atendimento tecnico', 'assistencia'],
  vendas: ['vendas', 'vendedor', 'comercial', 'pre-vendas', 'sdr'],
};

function isProgrammingJob(job) {
  const title = normalize(job.titulo);
  const area = normalize(job.area);
  return job.fonte === 'ProgramaThor'
    || /\b(?:desenvolv\w*|programa(?:dor|dora|cao)|devops|sre|software|full.?stack|front.?end|back.?end|tech lead)\b/.test(title)
    || /\b(?:agile coach|scrum master|qa|testes?|sistemas?|requisitos|produto|product|ux|ui|arquiteto|arquiteta|engenheiro|engenheira|appsec|cientista de dados|machine learning|mlops)\b/.test(title)
    || /(?:\bc\+\+|\bc#|\.net\b|\b(?:javascript|typescript|python|php|react|angular|nodejs|ruby|golang|delphi|kotlin|swift)\b)/.test(title)
    || /\b(?:engenheir[oa]|arquiteto|analista)\s+de\s+(?:sistemas|software|cloud|dados)\b/.test(title)
    || /\b(?:sap|erp)\b/.test(title)
    || (/\btecnologia\b/.test(area) && /\b(?:projetos|produto|product|consultor|sistemas)\b/.test(title));
}

function isTalentPool(job) {
  return /\b(?:banco de talentos|cadastro reserva)\b/.test(normalize(job.titulo));
}

function matches(job, query) {
  if (!query) return true;
  const haystack = normalize(`${job.titulo} ${job.empresa} ${job.area} ${job.local} ${job.resumo}`);
  const terms = synonyms[normalize(query)] || [query];
  return terms.some((term) => haystack.includes(normalize(term)));
}

function makeJob(job) {
  const card = element('article', 'job-card');
  const top = element('div', 'job-top');
  top.append(element('span', 'job-source', job.fonte), element('span', 'job-date', `Publicada em ${formatDate(job.publicadoEm)}`));

  const title = element('h3', 'job-title', job.titulo);
  const company = element('p', 'job-company', job.empresa);
  const summary = element('p', 'job-summary', job.resumo || 'Consulte a descrição completa na fonte.');
  const tags = element('div', 'job-tags');
  tags.append(element('span', '', `Remoto · ${job.local || 'Brasil'}`), element('span', '', 'Português (BR)'), element('span', '', 'Sem superior exigido no anúncio'), element('span', '', 'Sem programação'));
  if (job.area) tags.append(element('span', '', job.area));

  const actions = element('div', 'job-actions');
  const apply = element('a', 'job-apply', 'Ver vaga ↗');
  apply.href = job.candidatura;
  apply.target = '_blank';
  apply.rel = 'noopener noreferrer';
  apply.setAttribute('aria-label', `Ver vaga ${job.titulo} de ${job.empresa}, em nova aba`);
  const source = element('a', 'job-origin', `Fonte: ${job.fonte} ↗`);
  source.href = job.fonteUrl;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  actions.append(apply, source);
  card.append(top, title, company, summary, tags, actions);
  return card;
}

function render() {
  list.replaceChildren();
  if (matchingJobs.length === 0) {
    const emptyMessage = !dataIsFresh
      ? 'Os dados estão desatualizados. Atualize a coleta para ver vagas novamente.'
      : availableCount === 0
        ? 'Nenhuma vaga atende a todos os filtros no momento. Volte após a próxima atualização.'
        : 'Nenhuma vaga encontrada para essa busca. Tente um termo mais amplo.';
    list.append(element('p', 'empty-state', emptyMessage));
  } else {
    const fragment = document.createDocumentFragment();
    matchingJobs.slice(0, visibleCount).forEach((job) => fragment.append(makeJob(job)));
    list.append(fragment);
  }
  moreButton.hidden = visibleCount >= matchingJobs.length;
}

function updateSearch(query, scroll = false) {
  const cleanQuery = query.trim().replace(/\s+/g, ' ');
  input.value = cleanQuery;
  visibleCount = PAGE_SIZE;

  const pageUrl = new URL(window.location.href);
  if (cleanQuery) pageUrl.searchParams.set('q', cleanQuery);
  else pageUrl.searchParams.delete('q');
  try {
    window.history.replaceState(null, '', pageUrl);
  } catch {
    // O site também pode ser aberto como arquivo local.
  }

  const updatedAt = snapshot && Date.parse(snapshot.atualizadoEm);
  const isFresh = updatedAt && Date.now() - updatedAt < 7 * 86_400_000;
  dataIsFresh = Boolean(isFresh);
  const available = isFresh ? snapshot.vagas.filter((job) => !isProgrammingJob(job) && !isTalentPool(job) && (!job.expiraEm || Date.parse(`${job.expiraEm}T23:59:59`) > Date.now())) : [];
  availableCount = available.length;
  matchingJobs = available.filter((job) => matches(job, cleanQuery));
  document.querySelector('#vacancy-count').textContent = available.length.toLocaleString('pt-BR');
  document.querySelector('#updated-at').textContent = isFresh
    ? `Atualizado em ${new Date(snapshot.atualizadoEm).toLocaleDateString('pt-BR')}`
    : 'Atualização indisponível';
  status.textContent = isFresh
    ? `${matchingJobs.length.toLocaleString('pt-BR')} ${matchingJobs.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}${cleanQuery ? ` para “${cleanQuery}”` : ''}.`
    : 'Os dados precisam ser atualizados antes de mostrar vagas.';
  render();

  if (scroll) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#vagas').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  updateSearch(input.value, true);
});

document.querySelectorAll('[data-query]').forEach((button) => {
  button.addEventListener('click', () => updateSearch(button.dataset.query, true));
});

moreButton.addEventListener('click', () => {
  visibleCount += PAGE_SIZE;
  render();
});

updateSearch(new URL(window.location.href).searchParams.get('q') || '');
