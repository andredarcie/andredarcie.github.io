'use strict';

/* ============ UGC Studio — gestão de jobs para criadores UGC ============ */

const STORAGE_KEY = 'ugc-studio-data-v1';

const DEAL_STATUSES = [
  { id: 'lead',        label: 'Lead',         color: '#7C8188' },
  { id: 'negotiation', label: 'Negociação',   color: '#C07E12' },
  { id: 'contract',    label: 'Contrato',     color: '#2E62C4' },
  { id: 'production',  label: 'Em produção',  color: '#D7362B' },
  { id: 'delivered',   label: 'Entregue',     color: '#2F8F5B' },
  { id: 'paid',        label: 'Pago',         color: '#14603A' },
];

const DELIVERABLE_STATUSES = [
  { id: 'todo',    label: 'A fazer' },
  { id: 'script',  label: 'Roteiro' },
  { id: 'filming', label: 'Gravação' },
  { id: 'editing', label: 'Edição' },
  { id: 'review',  label: 'Revisão' },
  { id: 'done',    label: 'Concluída' },
];

const DELIVERABLE_TYPES = ['Vídeo curto', 'Fotos', 'Unboxing', 'Depoimento', 'Tutorial', 'Story', 'Criativo de anúncio', 'Material bruto', 'Outro'];

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Shopee', 'Amazon', 'Site da marca', 'Outro'];

const USAGE_RIGHTS = ['Só orgânico', 'Uso pago 30 dias', 'Uso pago 90 dias', 'Uso pago 6 meses', 'Uso pago 1 ano', 'Perpétuo', 'Personalizado'];

const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP'];

/* Conteúdo pessoal do criador — o perfil dele, fora dos jobs de marca.
   Foco em rotina, romantização da vida e auto-desenvolvimento. */
const CONTENT_PILLARS = [
  { id: 'rotina',  label: 'Rotina',               color: '#2E62C4' },
  { id: 'romance', label: 'Romantizar a vida',    color: '#BE3D7F' },
  { id: 'selfdev', label: 'Auto-desenvolvimento', color: '#2F8F5B' },
];

const CONTENT_STATUSES = [
  { id: 'idea',      label: 'Ideia' },
  { id: 'filming',   label: 'Gravar' },
  { id: 'editing',   label: 'Editar' },
  { id: 'scheduled', label: 'Agendado' },
  { id: 'posted',    label: 'Publicado' },
];

/* ============ Estado ============ */

function defaultState() {
  return {
    brands: [],
    deals: [],
    rates: [],
    content: [],
    seededProfile: false,
    settings: { currency: 'BRL' },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    return Object.assign(defaultState(), data, {
      settings: Object.assign(defaultState().settings, data.settings || {}),
    });
  } catch (err) {
    console.error('Falha ao carregar os dados salvos', err);
    return defaultState();
  }
}

let state = loadState();
let currentView = 'dashboard';
let dealSearch = '';
let dealStatusFilter = 'all';
let contentPillarFilter = 'all';
let profileData = null;

const now = new Date();
let calYear = now.getFullYear();
let calMonth = now.getMonth();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ============ Utilitários ============ */

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function isoAddDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const dd = String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0');
  return y === new Date().getFullYear() ? dd : dd + '/' + String(y).slice(2);
}

function fmtToday() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtMoney(v) {
  if (v == null || isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: state.settings.currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch (err) {
    return state.settings.currency + ' ' + v;
  }
}

function dueBadge(iso, doneish) {
  if (!iso) return '<span class="due-ok">Sem prazo</span>';
  const days = daysUntil(iso);
  if (doneish) return '<span class="due-ok">' + fmtDate(iso) + '</span>';
  if (days < 0) return '<span class="due-late">' + fmtDate(iso) + ' · ' + Math.abs(days) + 'd atraso</span>';
  if (days === 0) return '<span class="due-soon">Hoje</span>';
  if (days <= 3) return '<span class="due-soon">' + fmtDate(iso) + ' · em ' + days + 'd</span>';
  return '<span class="due-ok">' + fmtDate(iso) + '</span>';
}

function statusInfo(id) {
  return DEAL_STATUSES.find((s) => s.id === id) || DEAL_STATUSES[0];
}

function statusBadge(id) {
  const s = statusInfo(id);
  return '<span class="badge' + (id === 'paid' ? ' solid' : '') + '" style="--c:' + s.color + '">' + s.label + '</span>';
}

function brandName(id) {
  const b = state.brands.find((x) => x.id === id);
  return b ? b.name : 'Sem marca';
}

function pillarInfo(id) {
  return CONTENT_PILLARS.find((p) => p.id === id) || CONTENT_PILLARS[0];
}

function contentStatusInfo(id) {
  return CONTENT_STATUSES.find((s) => s.id === id) || CONTENT_STATUSES[0];
}

function getDeal(id) {
  return state.deals.find((d) => d.id === id);
}

function delivProgress(deal) {
  const total = (deal.deliverables || []).length;
  const done = (deal.deliverables || []).filter((dv) => dv.status === 'done').length;
  return { done, total };
}

function selectOptions(list, selected) {
  return list.map((v) => '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
}

function toast(msg) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ============ Renderização ============ */

function render() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });
  const main = document.getElementById('main');
  switch (currentView) {
    case 'dashboard': main.innerHTML = viewDashboard(); break;
    case 'pipeline':  main.innerHTML = viewPipeline(); break;
    case 'deals':     main.innerHTML = viewDeals(); break;
    case 'brands':    main.innerHTML = viewBrands(); break;
    case 'content':   main.innerHTML = viewContent(); break;
    case 'calendar':  main.innerHTML = viewCalendar(); break;
    case 'finances':  main.innerHTML = viewFinances(); break;
    case 'rates':     main.innerHTML = viewRates(); break;
    case 'profile':   main.innerHTML = viewProfile(); break;
    case 'settings':  main.innerHTML = viewSettings(); break;
    default:          main.innerHTML = viewDashboard();
  }
}

/* ---------- Painel ---------- */

function viewDashboard() {
  const active = state.deals.filter((d) => d.status !== 'paid' && d.status !== 'lead');
  const pipelineValue = state.deals
    .filter((d) => d.status !== 'paid')
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const thisMonth = todayISO().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const receivedThisMonth = state.deals
    .filter((d) => d.status === 'paid' && d.paidAt && d.paidAt.slice(0, 7) === thisMonth)
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const awaitingPayment = state.deals.filter((d) => d.status === 'delivered');
  const awaitingValue = awaitingPayment.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  // Próximos prazos: prazos de jobs + entregas + conteúdo agendado (14 dias + atrasados)
  const items = [];
  state.deals.forEach((d) => {
    if (d.status === 'paid') return;
    if (d.dueDate) {
      items.push({ date: d.dueDate, title: d.title, sub: 'Prazo do job · ' + brandName(d.brandId), action: 'edit-deal', id: d.id });
    }
    (d.deliverables || []).forEach((dv) => {
      if (dv.status !== 'done' && dv.due) {
        items.push({ date: dv.due, title: dv.title, sub: dv.type + ' · ' + d.title, action: 'edit-deal', id: d.id });
      }
    });
  });
  (state.content || []).forEach((c) => {
    if (c.status !== 'posted' && c.date) {
      items.push({ date: c.date, title: c.title, sub: 'Conteúdo · ' + pillarInfo(c.pillar).label, action: 'edit-content', id: c.id });
    }
  });
  items.sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = items.filter((it) => daysUntil(it.date) <= 14).slice(0, 8);

  const upcomingHtml = upcoming.length
    ? upcoming.map((it) => `
        <div class="item-row clickable" data-action="${it.action}" data-id="${it.id}">
          <div class="item-main">
            <div class="item-title">${esc(it.title)}</div>
            <div class="item-sub">${esc(it.sub)}</div>
          </div>
          <div>${dueBadge(it.date, false)}</div>
        </div>`).join('')
    : '<div class="empty">Nada com prazo nos próximos 14 dias.</div>';

  const awaitingHtml = awaitingPayment.length
    ? awaitingPayment.map((d) => `
        <div class="item-row">
          <div class="item-main">
            <div class="item-title">${esc(d.title)}</div>
            <div class="item-sub">${esc(brandName(d.brandId))}</div>
          </div>
          <span class="item-money">${fmtMoney(d.value)}</span>
          <button class="btn btn-sm" data-action="mark-paid" data-id="${d.id}">Marcar pago</button>
        </div>`).join('')
    : '<div class="empty">Nenhum job entregue esperando pagamento.</div>';

  const maxCount = Math.max(1, ...DEAL_STATUSES.map((s) => state.deals.filter((d) => d.status === s.id).length));
  const miniPipeline = DEAL_STATUSES.map((s) => {
    const count = state.deals.filter((d) => d.status === s.id).length;
    return `
      <div class="mini-row">
        <span class="mini-label">${s.label}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(count / maxCount) * 100}%;background:${s.color}"></span></span>
        <span class="mini-count">${count}</span>
      </div>`;
  }).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">${esc(fmtToday())}</div>
        <h1>Painel</h1>
      </div>
      <button class="btn btn-primary" data-action="new-deal">+ Novo job</button>
    </div>
    <div class="callsheet">
      <div class="cs-cell">
        <div class="eyebrow">Jobs ativos</div>
        <div class="cs-value">${active.length}</div>
        <div class="cs-hint">do contrato à entrega</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">Valor no pipeline</div>
        <div class="cs-value">${fmtMoney(pipelineValue)}</div>
        <div class="cs-hint">jobs ainda não pagos</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">Recebido no mês</div>
        <div class="cs-value good">${fmtMoney(receivedThisMonth)}</div>
        <div class="cs-hint">${esc(monthLabel)}</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">A receber</div>
        <div class="cs-value warn">${fmtMoney(awaitingValue)}</div>
        <div class="cs-hint">${awaitingPayment.length} ${awaitingPayment.length === 1 ? 'job entregue' : 'jobs entregues'}</div>
      </div>
    </div>
    <div class="dash-grid">
      <div class="panel">
        <div class="label-strip">Próximos prazos</div>
        <div class="item-list">${upcomingHtml}</div>
      </div>
      <div class="dash-col">
        <div class="panel">
          <div class="label-strip">Pipeline</div>
          <div class="mini-pipeline">${miniPipeline}</div>
        </div>
        <div class="panel">
          <div class="label-strip">Aguardando pagamento</div>
          <div class="item-list">${awaitingHtml}</div>
        </div>
      </div>
    </div>`;
}

/* ---------- Pipeline (kanban) ---------- */

function viewPipeline() {
  const cols = DEAL_STATUSES.map((s, idx) => {
    const deals = state.deals.filter((d) => d.status === s.id);
    const next = DEAL_STATUSES[idx + 1];
    const cards = deals.map((d) => {
      const p = delivProgress(d);
      const progressHtml = p.total
        ? `<div class="kcard-deliv">
             <div class="progress"><span style="width:${(p.done / p.total) * 100}%"></span></div>
             <div class="progress-label">${p.done}/${p.total} entregas</div>
           </div>`
        : '';
      const advanceHtml = next
        ? `<button class="kadv" data-action="advance-deal" data-id="${d.id}">→ ${next.label}</button>`
        : '';
      return `
        <div class="kcard" draggable="true" data-deal-card="${d.id}" data-action="edit-deal" data-id="${d.id}" style="--sc:${s.color}">
          <div class="kcard-title">${esc(d.title)}</div>
          <div class="kcard-brand">${esc(brandName(d.brandId))}</div>
          <div class="kcard-meta">
            <span class="kcard-value">${fmtMoney(d.value)}</span>
            ${dueBadge(d.dueDate, d.status === 'paid')}
          </div>
          ${progressHtml}
          ${advanceHtml}
        </div>`;
    }).join('');
    return `
      <div class="kcol" data-drop-status="${s.id}">
        <div class="kcol-head">
          <span class="label-strip" style="background:${s.color}">${s.label}</span>
          <span class="kcol-count">${deals.length}</span>
        </div>
        <div class="kcards">${cards}</div>
      </div>`;
  }).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Jobs por etapa</div>
        <h1>Pipeline</h1>
      </div>
      <button class="btn btn-primary" data-action="new-deal">+ Novo job</button>
    </div>
    <div class="kanban">${cols}</div>`;
}

/* ---------- Jobs ---------- */

function dealsListHtml() {
  let deals = state.deals.slice();
  if (dealStatusFilter !== 'all') deals = deals.filter((d) => d.status === dealStatusFilter);
  if (dealSearch) {
    const q = dealSearch.toLowerCase();
    deals = deals.filter((d) =>
      d.title.toLowerCase().includes(q) || brandName(d.brandId).toLowerCase().includes(q));
  }
  deals.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  if (!deals.length) {
    return '<div class="empty">Nenhum job por aqui. Ajuste os filtros ou crie um novo.</div>';
  }

  const rows = deals.map((d) => {
    const p = delivProgress(d);
    const sub = [brandName(d.brandId), d.platform].filter(Boolean).join(' · ');
    return `
      <tr class="clickable" data-action="edit-deal" data-id="${d.id}">
        <td><strong>${esc(d.title)}</strong><div class="item-sub">${esc(sub)}</div></td>
        <td>${statusBadge(d.status)}</td>
        <td class="hide-sm">${p.total ? p.done + '/' + p.total : '—'}</td>
        <td>${dueBadge(d.dueDate, d.status === 'paid')}</td>
        <td class="num"><span class="money">${fmtMoney(d.value)}</span></td>
      </tr>`;
  }).join('');

  return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Job</th><th>Status</th><th class="hide-sm">Entregas</th><th>Prazo</th><th class="num">Valor</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function viewDeals() {
  const total = state.deals.length;
  const chips = [{ id: 'all', label: 'Todos' }].concat(DEAL_STATUSES).map((s) =>
    `<button class="chip ${dealStatusFilter === s.id ? 'active' : ''}" data-action="deals-filter" data-status="${s.id}">${s.label}</button>`
  ).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">${total} ${total === 1 ? 'job' : 'jobs'} no total</div>
        <h1>Jobs</h1>
      </div>
      <button class="btn btn-primary" data-action="new-deal">+ Novo job</button>
    </div>
    <div class="filters">
      <input type="search" placeholder="Buscar por job ou marca…" value="${esc(dealSearch)}" data-input="deal-search">
      ${chips}
    </div>
    <div class="panel" data-deals-list>${dealsListHtml()}</div>`;
}

/* ---------- Marcas ---------- */

function viewBrands() {
  const cards = state.brands.map((b) => {
    const deals = state.deals.filter((d) => d.brandId === b.id);
    const earned = deals.filter((d) => d.status === 'paid').reduce((s, d) => s + (Number(d.value) || 0), 0);
    const contact = [b.contact, b.email].filter(Boolean).join(' · ');
    return `
      <div class="panel brand-card">
        <div class="brand-head">
          <div>
            <div class="brand-name">${esc(b.name)}</div>
            <div class="item-sub">${esc(contact) || 'Sem contato cadastrado'}</div>
          </div>
          <button class="btn btn-sm" data-action="edit-brand" data-id="${b.id}">Editar</button>
        </div>
        <div class="brand-stats">
          <div class="brand-stat"><strong>${deals.length}</strong><span>${deals.length === 1 ? 'job' : 'jobs'}</span></div>
          <div class="brand-stat"><strong>${fmtMoney(earned)}</strong><span>recebido</span></div>
        </div>
        ${b.notes ? '<div class="brand-notes">' + esc(b.notes) + '</div>' : ''}
      </div>`;
  }).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Clientes e contatos</div>
        <h1>Marcas</h1>
      </div>
      <button class="btn btn-primary" data-action="new-brand">+ Nova marca</button>
    </div>
    ${state.brands.length
      ? '<div class="brand-grid">' + cards + '</div>'
      : '<div class="panel"><div class="empty">Cadastre as marcas com quem você trabalha — contatos, jobs e quanto cada uma já pagou ficam aqui.</div></div>'}`;
}

/* ---------- Conteúdo (perfil do criador, por pilar) ---------- */

function viewContent() {
  const all = state.content || [];
  const notPosted = all.filter((c) => c.status !== 'posted');
  const scheduled = all.filter((c) => c.status === 'scheduled');
  const thisMonth = todayISO().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const postedMonth = all.filter((c) => c.status === 'posted' && c.date && c.date.slice(0, 7) === thisMonth);

  const chips = [{ id: 'all', label: 'Todos' }].concat(CONTENT_PILLARS).map((p) =>
    `<button class="chip ${contentPillarFilter === p.id ? 'active' : ''}" data-action="content-filter" data-pillar="${p.id}">${esc(p.label)}</button>`
  ).join('');

  const pillars = contentPillarFilter === 'all'
    ? CONTENT_PILLARS
    : CONTENT_PILLARS.filter((p) => p.id === contentPillarFilter);

  const lanes = pillars.map((p) => {
    const ideas = all.filter((c) => c.pillar === p.id).sort((a, b) => {
      const sa = CONTENT_STATUSES.findIndex((s) => s.id === a.status);
      const sb = CONTENT_STATUSES.findIndex((s) => s.id === b.status);
      if (sa !== sb) return sa - sb;
      return (a.date || '9999').localeCompare(b.date || '9999');
    });
    const cards = ideas.length
      ? ideas.map((c) => {
          const st = contentStatusInfo(c.status);
          const idx = CONTENT_STATUSES.findIndex((s) => s.id === c.status);
          const next = CONTENT_STATUSES[idx + 1];
          const meta = [c.platform, c.date ? fmtDate(c.date) : null].filter(Boolean).join(' · ');
          const advance = next
            ? `<button class="idea-adv" data-action="advance-content" data-id="${c.id}">→ ${next.label}</button>`
            : '';
          return `
            <div class="idea-card ${c.status === 'posted' ? 'posted' : ''}" data-action="edit-content" data-id="${c.id}">
              <div class="idea-card-title">${esc(c.title)}</div>
              <div class="idea-card-meta">
                <span class="badge" style="--c:${p.color}">${st.label}</span>
                <span class="idea-when">${esc(meta) || '—'}</span>
              </div>
              ${advance}
            </div>`;
        }).join('')
      : '<div class="idea-empty">Sem ideias aqui ainda.</div>';
    return `
      <div class="panel pillar-lane" style="--pc:${p.color}">
        <div class="pillar-head">
          <span class="label-strip" style="background:${p.color}">${esc(p.label)}</span>
          <button class="btn btn-sm" data-action="new-content" data-pillar="${p.id}">+ Ideia</button>
        </div>
        <div class="idea-list">${cards}</div>
      </div>`;
  }).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Seu perfil, sem marca</div>
        <h1>Conteúdo</h1>
      </div>
      <button class="btn btn-primary" data-action="new-content">+ Nova ideia</button>
    </div>
    <div class="callsheet" style="grid-template-columns:repeat(3,1fr)">
      <div class="cs-cell">
        <div class="eyebrow">No radar</div>
        <div class="cs-value">${notPosted.length}</div>
        <div class="cs-hint">ideias em aberto</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">Agendados</div>
        <div class="cs-value">${scheduled.length}</div>
        <div class="cs-hint">com data marcada</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">Publicados no mês</div>
        <div class="cs-value good">${postedMonth.length}</div>
        <div class="cs-hint">${esc(monthLabel)}</div>
      </div>
    </div>
    <div class="filters">${chips}</div>
    ${all.length
      ? `<div class="content-board ${contentPillarFilter === 'all' ? '' : 'single'}">${lanes}</div>`
      : '<div class="panel"><div class="empty">Planeje aqui o conteúdo do seu próprio perfil — rotina, romantizar a vida e auto-desenvolvimento. Nada de marca, só você.</div></div>'}`;
}

/* ---------- Agenda ---------- */

function calendarItems() {
  const map = {};
  const push = (date, item) => {
    if (!date) return;
    (map[date] = map[date] || []).push(item);
  };
  state.deals.forEach((d) => {
    if (d.status !== 'paid') {
      push(d.dueDate, { icon: '■', title: d.title, action: 'edit-deal', id: d.id, sub: 'Prazo do job · ' + brandName(d.brandId) });
    }
    (d.deliverables || []).forEach((dv) => {
      if (dv.status !== 'done') {
        push(dv.due, { icon: '□', title: dv.title, action: 'edit-deal', id: d.id, sub: dv.type + ' · ' + d.title });
      }
    });
  });
  (state.content || []).forEach((c) => {
    if (c.status !== 'posted') {
      push(c.date, { icon: '★', title: c.title, action: 'edit-content', id: c.id, sub: 'Conteúdo · ' + pillarInfo(c.pillar).label });
    }
  });
  return map;
}

function viewCalendar() {
  const items = calendarItems();
  const first = new Date(calYear, calMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();
  const today = todayISO();

  const cells = [];
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    let m = calMonth, d = dayNum, other = false;
    if (dayNum < 1) { other = true; d = daysInPrev + dayNum; m = calMonth - 1; }
    else if (dayNum > daysInMonth) { other = true; d = dayNum - daysInMonth; m = calMonth + 1; }
    const dt = new Date(calYear, m, d);
    const iso = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    const dayItems = items[iso] || [];
    const chips = dayItems.slice(0, 2).map((it) =>
      `<div class="cal-chip"><span class="sym">${it.icon}</span>${esc(it.title)}</div>`).join('');
    const more = dayItems.length > 2 ? `<div class="cal-more">+${dayItems.length - 2}</div>` : '';
    const count = dayItems.length ? `<span class="cal-count">${dayItems.length}</span>` : '';
    cells.push(`
      <div class="cal-day ${other ? 'other' : ''} ${iso === today ? 'today' : ''}" data-action="cal-day" data-date="${iso}">
        <div><span class="cal-num">${dt.getDate()}</span>${count}</div>
        ${chips}${more}
      </div>`);
  }

  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const dows = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => `<div class="cal-dow">${d}</div>`).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">■ prazo de job · □ entrega · ★ conteúdo</div>
        <h1>${esc(monthName)}</h1>
      </div>
      <div class="btn-group">
        <button class="btn" data-action="cal-prev" aria-label="Mês anterior">←</button>
        <button class="btn" data-action="cal-next" aria-label="Próximo mês">→</button>
      </div>
    </div>
    <div class="cal-frame">
      <div class="cal-grid">${dows}${cells.join('')}</div>
    </div>`;
}

/* ---------- Finanças ---------- */

function viewFinances() {
  const paid = state.deals.filter((d) => d.status === 'paid');
  const totalReceived = paid.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const awaiting = state.deals.filter((d) => d.status === 'delivered')
    .reduce((s, d) => s + (Number(d.value) || 0), 0);
  const inProgress = state.deals.filter((d) => ['contract', 'production'].includes(d.status))
    .reduce((s, d) => s + (Number(d.value) || 0), 0);

  // Recebido nos últimos 6 meses
  const months = [];
  const base = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    const label = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const total = paid.filter((d) => d.paidAt && d.paidAt.slice(0, 7) === key)
      .reduce((s, d) => s + (Number(d.value) || 0), 0);
    months.push({ key, label, total });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.total));
  const bars = months.map((m, i) => `
    <div class="chart-col">
      <div class="chart-val">${m.total ? fmtMoney(m.total) : ''}</div>
      <div class="chart-bar${i === 5 ? ' now' : ''}" style="height:${(m.total / maxMonth) * 100}%"></div>
    </div>`).join('');
  const labels = months.map((m) => `<div class="chart-label">${esc(m.label)}</div>`).join('');

  const moneyDeals = state.deals.filter((d) => Number(d.value) > 0)
    .sort((a, b) => (b.paidAt || b.dueDate || '').localeCompare(a.paidAt || a.dueDate || ''));

  const rows = moneyDeals.map((d) => `
    <tr class="clickable" data-action="edit-deal" data-id="${d.id}">
      <td><strong>${esc(d.title)}</strong><div class="item-sub">${esc(brandName(d.brandId))}</div></td>
      <td>${statusBadge(d.status)}</td>
      <td class="hide-sm">${d.paidAt ? fmtDate(d.paidAt) : '—'}</td>
      <td class="num"><span class="money">${fmtMoney(d.value)}</span></td>
      <td class="num">${d.status !== 'paid'
        ? `<button class="btn btn-sm" data-action="mark-paid" data-id="${d.id}">Marcar pago</button>`
        : ''}</td>
    </tr>`).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Ganhos e cobranças</div>
        <h1>Finanças</h1>
      </div>
    </div>
    <div class="callsheet" style="grid-template-columns:repeat(3,1fr)">
      <div class="cs-cell">
        <div class="eyebrow">Total recebido</div>
        <div class="cs-value good">${fmtMoney(totalReceived)}</div>
        <div class="cs-hint">${paid.length} ${paid.length === 1 ? 'job pago' : 'jobs pagos'}</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">A receber</div>
        <div class="cs-value warn">${fmtMoney(awaiting)}</div>
        <div class="cs-hint">entregue, ainda não pago</div>
      </div>
      <div class="cs-cell">
        <div class="eyebrow">Em andamento</div>
        <div class="cs-value">${fmtMoney(inProgress)}</div>
        <div class="cs-hint">contrato ou produção</div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <div class="label-strip">Recebido — últimos 6 meses</div>
      <div class="chart">${bars}</div>
      <div class="chart-labels">${labels}</div>
    </div>
    <div class="panel">
      <div class="label-strip">Jobs com valor</div>
      ${moneyDeals.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Job</th><th>Status</th><th class="hide-sm">Pago em</th><th class="num">Valor</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : '<div class="empty">Jobs com valor definido aparecem aqui.</div>'}
    </div>`;
}

/* ---------- Preços ---------- */

function viewRates() {
  const rows = state.rates.map((r) => `
    <tr class="clickable" data-action="edit-rate" data-id="${r.id}">
      <td><strong>${esc(r.service)}</strong>${r.notes ? '<div class="item-sub">' + esc(r.notes) + '</div>' : ''}</td>
      <td class="hide-sm">${esc(r.turnaround || '—')}</td>
      <td class="num"><span class="money">${fmtMoney(r.price)}</span></td>
    </tr>`).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Tabela de serviços</div>
        <h1>Preços</h1>
      </div>
      <button class="btn btn-primary" data-action="new-rate">+ Novo serviço</button>
    </div>
    <div class="panel">
      ${state.rates.length
        ? `<div class="table-wrap"><table>
            <thead><tr><th>Serviço</th><th class="hide-sm">Prazo de entrega</th><th class="num">Preço</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : '<div class="empty">Liste seus serviços e preços — responda orçamentos mais rápido quando uma marca perguntar.</div>'}
    </div>`;
}

/* ---------- Perfil (mídia kit) ---------- */

function viewProfile() {
  const p = profileData;
  if (!p) {
    return `
      <div class="view-head">
        <div>
          <div class="eyebrow">Mídia kit</div>
          <h1>Perfil</h1>
        </div>
      </div>
      <div class="panel"><div class="empty">Não deu para carregar o profile.json. Abra o app por um servidor web (ex.: GitHub Pages) para ver o mídia kit.</div></div>`;
  }

  const c = p.contact || {};
  const contacts = [
    c.instagram ? `<a class="pf-chip" href="${esc(c.instagram)}" target="_blank" rel="noopener">Instagram ${esc(p.handle || '')}</a>` : '',
    c.whatsapp ? `<a class="pf-chip" href="${esc(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>` : '',
    c.email ? `<a class="pf-chip" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '',
    c.phone ? `<span class="pf-chip">${esc(c.phone)}</span>` : '',
    c.site ? `<a class="pf-chip" href="${esc(c.site)}" target="_blank" rel="noopener">Portfólio no Canva</a>` : '',
  ].join('');

  const services = (p.services || []).map((s) => `
    <div class="pf-service panel">
      <img src="${esc(s.photo)}" alt="${esc(s.title)}" loading="lazy">
      <div class="pf-service-body">
        <strong>${esc(s.title)}</strong>
        <div class="item-sub">${esc(s.desc || '')}</div>
        <div class="pf-price">${s.price != null ? fmtMoney(s.price) : esc(s.note || 'Sob consulta')}</div>
      </div>
    </div>`).join('');

  let total = 0;
  const cats = (p.portfolio || []).map((cat) => {
    const cards = (cat.items || []).map((it) => {
      total++;
      return `
        <figure class="pf-card">
          <video src="${esc(it.video)}" ${it.poster ? 'poster="' + esc(it.poster) + '" preload="none"' : 'preload="metadata"'} controls playsinline></video>
          <figcaption>
            <div class="pf-card-t">${esc(it.title)}</div>
            ${it.format ? '<span class="badge" style="--c:#40444D">' + esc(it.format) + '</span>' : ''}
          </figcaption>
        </figure>`;
    }).join('');
    return `
      <section class="pf-section">
        <div class="pf-cat"><span class="label-strip">${esc(cat.category)}</span><span class="kcol-count">${(cat.items || []).length}</span></div>
        <div class="pf-grid">${cards}</div>
      </section>`;
  }).join('');

  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Mídia kit · ${esc(p.handle || '')}</div>
        <h1>${esc(p.name || 'Perfil')}</h1>
      </div>
      ${c.whatsapp ? '<a class="btn btn-primary" href="' + esc(c.whatsapp) + '" target="_blank" rel="noopener">Chamar no WhatsApp</a>' : ''}
    </div>
    <div class="pf-hero panel">
      <img class="pf-photo" src="${esc(p.photo)}" alt="Foto de ${esc(p.name || '')}">
      <div class="pf-info">
        <div class="label-strip">Sobre mim</div>
        <p class="pf-bio">${esc(p.bio || '')}</p>
        <div class="pf-contacts">${contacts}</div>
        ${(p.photos || []).length ? '<div class="pf-strip">' + p.photos.map((ph) => '<img src="' + esc(ph) + '" alt="" loading="lazy">').join('') + '</div>' : ''}
      </div>
    </div>
    <div class="label-strip">Investimento</div>
    <div class="pf-services">${services}</div>
    <div class="pf-port-head">
      <span class="label-strip">Portfólio</span>
      <span class="eyebrow">${total} vídeos · reproduzidos do site no Canva</span>
    </div>
    ${cats}`;
}

/* ---------- Ajustes ---------- */

function viewSettings() {
  return `
    <div class="view-head">
      <div>
        <div class="eyebrow">Dados locais e backup</div>
        <h1>Ajustes</h1>
      </div>
    </div>
    <div class="settings-stack">
      <div class="panel">
        <div class="setting-row">
          <div>
            <strong>Moeda</strong>
            <div class="desc">Usada em todos os valores do app</div>
          </div>
          <select data-change="currency">${selectOptions(CURRENCIES, state.settings.currency)}</select>
        </div>
      </div>
      <div class="panel">
        <div class="label-strip">Backup</div>
        <div class="setting-row" style="margin-bottom:14px">
          <div>
            <strong>Exportar dados</strong>
            <div class="desc">Baixa um arquivo JSON com tudo</div>
          </div>
          <button class="btn" data-action="export">Exportar</button>
        </div>
        <div class="setting-row">
          <div>
            <strong>Importar dados</strong>
            <div class="desc">Restaura um backup exportado (substitui os dados atuais)</div>
          </div>
          <label class="btn" style="position:relative;overflow:hidden">Importar
            <input type="file" accept=".json,application/json" data-change="import-file"
              style="position:absolute;inset:0;opacity:0;cursor:pointer">
          </label>
        </div>
      </div>
      <div class="panel">
        <div class="setting-row">
          <div>
            <strong>Carregar dados de exemplo</strong>
            <div class="desc">Preenche o app com marcas e jobs fictícios para você explorar</div>
          </div>
          <button class="btn" data-action="sample-data">Carregar</button>
        </div>
      </div>
      <div class="panel danger-panel">
        <div class="setting-row">
          <div>
            <strong>Apagar todos os dados</strong>
            <div class="desc">Remove marcas, jobs e preços. Não dá para desfazer.</div>
          </div>
          <button class="btn btn-danger" data-action="clear-data">Apagar</button>
        </div>
      </div>
    </div>`;
}

/* ============ Modais ============ */

function openModal(title, bodyHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" data-backdrop>
      <div class="modal">
        <div class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="btn-ghost modal-close" data-action="close-modal" aria-label="Fechar">✕</button>
        </div>
        ${bodyHtml}
      </div>
    </div>`;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

/* ---------- Modal de job ---------- */

function delivRowsHtml(deal) {
  if (!(deal.deliverables || []).length) {
    return '<div class="deliv-hint">Nenhuma entrega ainda — adicione os vídeos, fotos ou materiais combinados neste job.</div>';
  }
  const statusOpts = (sel) => DELIVERABLE_STATUSES.map((s) =>
    `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${s.label}</option>`).join('');
  return deal.deliverables.map((dv) => `
    <div class="deliv-row ${dv.status === 'done' ? 'done' : ''}">
      <input class="dv-title" value="${esc(dv.title)}" data-change="deliv" data-deal="${deal.id}" data-id="${dv.id}" data-field="title" aria-label="Título da entrega">
      <select class="dv-type" data-change="deliv" data-deal="${deal.id}" data-id="${dv.id}" data-field="type" aria-label="Tipo">${selectOptions(DELIVERABLE_TYPES, dv.type)}</select>
      <select class="dv-status" data-change="deliv" data-deal="${deal.id}" data-id="${dv.id}" data-field="status" aria-label="Status">${statusOpts(dv.status)}</select>
      <input class="dv-due" type="date" value="${dv.due || ''}" data-change="deliv" data-deal="${deal.id}" data-id="${dv.id}" data-field="due" aria-label="Prazo">
      <button class="btn-ghost dv-del" data-action="del-deliv" data-deal="${deal.id}" data-id="${dv.id}" title="Remover entrega">✕</button>
    </div>`).join('');
}

function openDealModal(dealId) {
  const deal = dealId ? getDeal(dealId) : null;
  const brandOpts = '<option value="">— Sem marca —</option>' + state.brands.map((b) =>
    `<option value="${b.id}"${deal && deal.brandId === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('');
  const statusOpts = DEAL_STATUSES.map((s) =>
    `<option value="${s.id}"${deal && deal.status === s.id ? ' selected' : ''}>${s.label}</option>`).join('');

  const delivSection = deal ? `
    <div class="deliv-section">
      <div class="label-strip">Entregas</div> <span class="deliv-hint">(salvas na hora)</span>
      <div data-deliv-wrap style="margin-top:10px">${delivRowsHtml(deal)}</div>
      <form data-form="deliverable" data-id="${deal.id}" class="deliv-add">
        <input name="title" placeholder="ex.: vídeo TikTok 30s #1" required>
        <select name="type">${selectOptions(DELIVERABLE_TYPES, 'Vídeo curto')}</select>
        <input type="date" name="due" aria-label="Prazo">
        <button class="btn btn-sm" type="submit">+ Adicionar</button>
      </form>
    </div>` : `
    <div class="deliv-section">
      <div class="deliv-hint">Salve o job primeiro; depois abra de novo para adicionar as entregas.</div>
    </div>`;

  openModal(deal ? 'Editar job' : 'Novo job', `
    <form data-form="deal" ${deal ? 'data-id="' + deal.id + '"' : ''}>
      <div class="form-grid">
        <div class="field full">
          <label>Título *</label>
          <input name="title" required placeholder="ex.: Lançamento do sérum — 3 vídeos" value="${deal ? esc(deal.title) : ''}">
        </div>
        <div class="field">
          <label>Marca</label>
          <select name="brandId">${brandOpts}</select>
        </div>
        <div class="field">
          <label>Status</label>
          <select name="status">${statusOpts}</select>
        </div>
        <div class="field">
          <label>Valor</label>
          <input name="value" type="number" min="0" step="0.01" placeholder="0" value="${deal && deal.value != null ? deal.value : ''}">
        </div>
        <div class="field">
          <label>Prazo do job</label>
          <input name="dueDate" type="date" value="${deal ? (deal.dueDate || '') : ''}">
        </div>
        <div class="field">
          <label>Plataforma</label>
          <select name="platform">${selectOptions(PLATFORMS, deal ? deal.platform : 'TikTok')}</select>
        </div>
        <div class="field">
          <label>Direitos de uso</label>
          <select name="usage">${selectOptions(USAGE_RIGHTS, deal ? deal.usage : 'Só orgânico')}</select>
        </div>
        <div class="field full">
          <label>Observações</label>
          <textarea name="notes" rows="3" placeholder="Briefing, contato, detalhes do contrato…">${deal ? esc(deal.notes || '') : ''}</textarea>
        </div>
      </div>
      <div class="form-actions">
        ${deal ? '<button type="button" class="btn btn-danger btn-sm" data-action="delete-deal" data-id="' + deal.id + '">Excluir job</button>' : '<span></span>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${deal ? 'Salvar' : 'Criar job'}</button>
      </div>
    </form>
    ${delivSection}`);
}

/* ---------- Modal de marca ---------- */

function openBrandModal(brandId) {
  const brand = brandId ? state.brands.find((b) => b.id === brandId) : null;
  openModal(brand ? 'Editar marca' : 'Nova marca', `
    <form data-form="brand" ${brand ? 'data-id="' + brand.id + '"' : ''}>
      <div class="form-grid">
        <div class="field full">
          <label>Nome da marca *</label>
          <input name="name" required placeholder="ex.: GlowLab Skincare" value="${brand ? esc(brand.name) : ''}">
        </div>
        <div class="field">
          <label>Contato</label>
          <input name="contact" placeholder="ex.: Carla (marketing)" value="${brand ? esc(brand.contact || '') : ''}">
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="contato@marca.com" value="${brand ? esc(brand.email || '') : ''}">
        </div>
        <div class="field full">
          <label>Observações</label>
          <textarea name="notes" rows="3" placeholder="Como se conheceram, preferências, prazo de pagamento…">${brand ? esc(brand.notes || '') : ''}</textarea>
        </div>
      </div>
      <div class="form-actions">
        ${brand ? '<button type="button" class="btn btn-danger btn-sm" data-action="delete-brand" data-id="' + brand.id + '">Excluir marca</button>' : '<span></span>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${brand ? 'Salvar' : 'Criar marca'}</button>
      </div>
    </form>`);
}

/* ---------- Modal de serviço ---------- */

function openRateModal(rateId) {
  const rate = rateId ? state.rates.find((r) => r.id === rateId) : null;
  openModal(rate ? 'Editar serviço' : 'Novo serviço', `
    <form data-form="rate" ${rate ? 'data-id="' + rate.id + '"' : ''}>
      <div class="form-grid">
        <div class="field full">
          <label>Serviço *</label>
          <input name="service" required placeholder="ex.: 1 vídeo UGC (30–60s)" value="${rate ? esc(rate.service) : ''}">
        </div>
        <div class="field">
          <label>Preço</label>
          <input name="price" type="number" min="0" step="0.01" placeholder="0" value="${rate && rate.price != null ? rate.price : ''}">
        </div>
        <div class="field">
          <label>Prazo de entrega</label>
          <input name="turnaround" placeholder="ex.: 5 dias úteis" value="${rate ? esc(rate.turnaround || '') : ''}">
        </div>
        <div class="field full">
          <label>Observações</label>
          <textarea name="notes" rows="2" placeholder="O que está incluso, política de revisões…">${rate ? esc(rate.notes || '') : ''}</textarea>
        </div>
      </div>
      <div class="form-actions">
        ${rate ? '<button type="button" class="btn btn-danger btn-sm" data-action="delete-rate" data-id="' + rate.id + '">Excluir</button>' : '<span></span>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${rate ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>`);
}

/* ---------- Modal de ideia de conteúdo ---------- */

function openContentModal(contentId, presetPillar) {
  const item = contentId ? (state.content || []).find((c) => c.id === contentId) : null;
  const pillarSel = item ? item.pillar : (presetPillar || 'rotina');
  const pillarOpts = CONTENT_PILLARS.map((p) =>
    `<option value="${p.id}"${p.id === pillarSel ? ' selected' : ''}>${esc(p.label)}</option>`).join('');
  const statusOpts = CONTENT_STATUSES.map((s) =>
    `<option value="${s.id}"${item && item.status === s.id ? ' selected' : ''}>${s.label}</option>`).join('');

  openModal(item ? 'Editar ideia' : 'Nova ideia', `
    <form data-form="content" ${item ? 'data-id="' + item.id + '"' : ''}>
      <div class="form-grid">
        <div class="field full">
          <label>Ideia / título *</label>
          <input name="title" required placeholder="ex.: Morning routine lenta de domingo" value="${item ? esc(item.title) : ''}">
        </div>
        <div class="field">
          <label>Pilar</label>
          <select name="pillar">${pillarOpts}</select>
        </div>
        <div class="field">
          <label>Status</label>
          <select name="status">${statusOpts}</select>
        </div>
        <div class="field">
          <label>Plataforma</label>
          <select name="platform">${selectOptions(PLATFORMS, item ? item.platform : 'Instagram')}</select>
        </div>
        <div class="field">
          <label>Data</label>
          <input name="date" type="date" value="${item ? (item.date || '') : ''}">
        </div>
        <div class="field full">
          <label>Roteiro / anotações</label>
          <textarea name="notes" rows="3" placeholder="Gancho, trilha, cenas, referência…">${item ? esc(item.notes || '') : ''}</textarea>
        </div>
      </div>
      <div class="form-actions">
        ${item ? '<button type="button" class="btn btn-danger btn-sm" data-action="delete-content" data-id="' + item.id + '">Excluir</button>' : '<span></span>'}
        <span class="spacer"></span>
        <button type="button" class="btn" data-action="close-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${item ? 'Salvar' : 'Criar ideia'}</button>
      </div>
    </form>`);
}

/* ---------- Modal de dia da agenda ---------- */

function openDayModal(iso) {
  const items = calendarItems()[iso] || [];
  const [y, m, d] = iso.split('-').map(Number);
  const title = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const list = items.length
    ? items.map((it) => `
        <div class="item-row clickable" data-action="${it.action}" data-id="${it.id}">
          <div class="item-main">
            <div class="item-title">${it.icon} ${esc(it.title)}</div>
            <div class="item-sub">${esc(it.sub)}</div>
          </div>
        </div>`).join('')
    : '<div class="empty">Nada com prazo neste dia.</div>';
  openModal(title, '<div class="item-list">' + list + '</div>');
}

/* ============ Mutações ============ */

function setDealStatus(dealId, status) {
  const deal = getDeal(dealId);
  if (!deal || deal.status === status) return;
  deal.status = status;
  if (status === 'paid' && !deal.paidAt) deal.paidAt = todayISO();
  if (status !== 'paid') delete deal.paidAt;
  save();
  render();
  toast('Movido para ' + statusInfo(status).label);
}

function handleForm(form) {
  const data = new FormData(form);
  const kind = form.dataset.form;
  const id = form.dataset.id;

  if (kind === 'deal') {
    const fields = {
      title: (data.get('title') || '').toString().trim(),
      brandId: data.get('brandId') || null,
      status: data.get('status'),
      value: data.get('value') ? Number(data.get('value')) : null,
      dueDate: data.get('dueDate') || null,
      platform: data.get('platform'),
      usage: data.get('usage'),
      notes: (data.get('notes') || '').toString().trim(),
    };
    if (!fields.title) return;
    if (id) {
      const deal = getDeal(id);
      if (!deal) return;
      const wasPaid = deal.status === 'paid';
      Object.assign(deal, fields);
      if (deal.status === 'paid' && !wasPaid) deal.paidAt = todayISO();
      if (deal.status !== 'paid') delete deal.paidAt;
      toast('Job atualizado');
    } else {
      const deal = Object.assign({ id: uid(), deliverables: [], createdAt: todayISO() }, fields);
      if (deal.status === 'paid') deal.paidAt = todayISO();
      state.deals.push(deal);
      toast('Job criado');
    }
    save();
    closeModal();
    render();
  }

  if (kind === 'deliverable') {
    const deal = getDeal(id);
    if (!deal) return;
    deal.deliverables = deal.deliverables || [];
    deal.deliverables.push({
      id: uid(),
      title: (data.get('title') || '').toString().trim(),
      type: data.get('type'),
      status: 'todo',
      due: data.get('due') || null,
    });
    save();
    form.reset();
    const wrap = document.querySelector('[data-deliv-wrap]');
    if (wrap) wrap.innerHTML = delivRowsHtml(deal);
    render();
    toast('Entrega adicionada');
  }

  if (kind === 'brand') {
    const fields = {
      name: (data.get('name') || '').toString().trim(),
      contact: (data.get('contact') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      notes: (data.get('notes') || '').toString().trim(),
    };
    if (!fields.name) return;
    if (id) {
      const brand = state.brands.find((b) => b.id === id);
      if (brand) Object.assign(brand, fields);
      toast('Marca atualizada');
    } else {
      state.brands.push(Object.assign({ id: uid(), createdAt: todayISO() }, fields));
      toast('Marca criada');
    }
    save();
    closeModal();
    render();
  }

  if (kind === 'rate') {
    const fields = {
      service: (data.get('service') || '').toString().trim(),
      price: data.get('price') ? Number(data.get('price')) : null,
      turnaround: (data.get('turnaround') || '').toString().trim(),
      notes: (data.get('notes') || '').toString().trim(),
    };
    if (!fields.service) return;
    if (id) {
      const rate = state.rates.find((r) => r.id === id);
      if (rate) Object.assign(rate, fields);
      toast('Serviço atualizado');
    } else {
      state.rates.push(Object.assign({ id: uid() }, fields));
      toast('Serviço adicionado');
    }
    save();
    closeModal();
    render();
  }

  if (kind === 'content') {
    const fields = {
      title: (data.get('title') || '').toString().trim(),
      pillar: data.get('pillar'),
      status: data.get('status'),
      platform: data.get('platform'),
      date: data.get('date') || null,
      notes: (data.get('notes') || '').toString().trim(),
    };
    if (!fields.title) return;
    state.content = state.content || [];
    if (id) {
      const item = state.content.find((c) => c.id === id);
      if (item) Object.assign(item, fields);
      toast('Ideia atualizada');
    } else {
      state.content.push(Object.assign({ id: uid(), createdAt: todayISO() }, fields));
      toast('Ideia criada');
    }
    save();
    closeModal();
    render();
  }
}

/* ============ Dados de exemplo ============ */

function loadSampleData() {
  const t = (offset) => isoAddDays(todayISO(), offset);
  const b1 = uid(), b2 = uid(), b3 = uid(), b4 = uid();

  state = {
    brands: [
      { id: b1, name: 'GlowLab Skincare', contact: 'Carla (marketing)', email: 'carla@glowlab.example', notes: 'Paga em 15 dias. Gosta de entregas rápidas.', createdAt: t(-60) },
      { id: b2, name: 'FitFuel Suplementos', contact: 'Marcos', email: 'marcos@fitfuel.example', notes: 'Me achou pelo TikTok. Potencial de contrato mensal.', createdAt: t(-45) },
      { id: b3, name: 'Nomad Gear Co.', contact: 'Ana', email: 'ana@nomadgear.example', notes: '', createdAt: t(-30) },
      { id: b4, name: 'PetPal Alimentos', contact: 'Julia', email: 'julia@petpal.example', notes: 'Quer o pet aparecendo em todos os vídeos.', createdAt: t(-90) },
    ],
    deals: [
      {
        id: uid(), brandId: b1, title: 'Sérum hidratante — 3 vídeos TikTok', status: 'production',
        value: 1200, dueDate: t(5), platform: 'TikTok', usage: 'Uso pago 30 dias',
        notes: 'Ganchos aprovados. A marca quer legenda embutida.', createdAt: t(-10),
        deliverables: [
          { id: uid(), title: 'Vídeo #1 — gancho rotina da manhã', type: 'Vídeo curto', status: 'done', due: t(-2) },
          { id: uid(), title: 'Vídeo #2 — antes e depois', type: 'Vídeo curto', status: 'editing', due: t(2) },
          { id: uid(), title: 'Vídeo #3 — gancho "3 motivos"', type: 'Vídeo curto', status: 'script', due: t(5) },
        ],
      },
      {
        id: uid(), brandId: b2, title: 'Campanha de lançamento do whey', status: 'negotiation',
        value: 2500, dueDate: t(12), platform: 'Instagram', usage: 'Uso pago 90 dias',
        notes: 'Esperando a contraproposta. Mínimo: R$ 2.200.', createdAt: t(-5), deliverables: [],
      },
      {
        id: uid(), brandId: b2, title: 'Pack UGC gomas de recuperação', status: 'production',
        value: 1500, dueDate: t(2), platform: 'TikTok', usage: 'Só orgânico',
        notes: '', createdAt: t(-14),
        deliverables: [
          { id: uid(), title: 'Vídeo de unboxing', type: 'Unboxing', status: 'done', due: t(-5) },
          { id: uid(), title: 'Depoimento 45s', type: 'Depoimento', status: 'review', due: t(1) },
          { id: uid(), title: 'Fotos para anúncios', type: 'Fotos', status: 'filming', due: t(2) },
          { id: uid(), title: 'Envio do material bruto', type: 'Material bruto', status: 'todo', due: t(2) },
        ],
      },
      {
        id: uid(), brandId: b3, title: 'Review da mochila de viagem', status: 'delivered',
        value: 800, dueDate: t(-3), platform: 'YouTube', usage: 'Perpétuo',
        notes: 'Nota fiscal #041 enviada. Pagamento em 30 dias.', createdAt: t(-25),
        deliverables: [
          { id: uid(), title: 'Vídeo de review completo', type: 'Tutorial', status: 'done', due: t(-4) },
        ],
      },
      {
        id: uid(), brandId: b4, title: 'Unboxing petiscos para cachorro', status: 'paid',
        value: 600, dueDate: t(-15), platform: 'TikTok', usage: 'Uso pago 30 dias',
        notes: '', createdAt: t(-40), paidAt: t(-10),
        deliverables: [
          { id: uid(), title: 'Unboxing com a Luna', type: 'Unboxing', status: 'done', due: t(-18) },
        ],
      },
      {
        id: uid(), brandId: b1, title: 'Whitelisting coleção de verão', status: 'contract',
        value: 1800, dueDate: t(20), platform: 'Instagram', usage: 'Uso pago 6 meses',
        notes: 'Contrato assinado, esperando o produto chegar.', createdAt: t(-3), deliverables: [],
      },
      {
        id: uid(), brandId: b2, title: 'Proposta: programa de embaixadores', status: 'lead',
        value: 3000, dueDate: null, platform: 'TikTok', usage: 'Personalizado',
        notes: 'Propus contrato de 3 meses. Cobrar resposta semana que vem.', createdAt: t(-1), deliverables: [],
      },
    ],
    content: [
      { id: uid(), title: 'Morning routine lenta de domingo', pillar: 'rotina', status: 'editing', platform: 'Instagram', date: t(1), notes: 'Café, luz da manhã, alongamento. Trilha calma, sem corte rápido.', createdAt: t(-3) },
      { id: uid(), title: 'GRWM arrumando a mesa de trabalho', pillar: 'rotina', status: 'idea', platform: 'TikTok', date: null, notes: '', createdAt: t(-2) },
      { id: uid(), title: 'Como planejo minha semana no domingo', pillar: 'rotina', status: 'scheduled', platform: 'YouTube', date: t(6), notes: 'Caderno, chá, revisão dos pilares de conteúdo.', createdAt: t(-1) },
      { id: uid(), title: 'Um dia romantizando tarefas chatas', pillar: 'romance', status: 'scheduled', platform: 'Instagram', date: t(3), notes: 'Lavar louça com playlist, flores no mercado, luz da tarde.', createdAt: t(-4) },
      { id: uid(), title: 'Café da tarde só pra mim', pillar: 'romance', status: 'posted', platform: 'TikTok', date: t(-6), notes: '', createdAt: t(-8) },
      { id: uid(), title: '3 livros que mudaram meu ano', pillar: 'selfdev', status: 'filming', platform: 'YouTube', date: t(5), notes: 'Falar de cada um em ~20s, com o porquê.', createdAt: t(-5) },
      { id: uid(), title: 'Rotina de journaling antes de dormir', pillar: 'selfdev', status: 'idea', platform: 'Instagram', date: null, notes: 'Três perguntas que eu respondo toda noite.', createdAt: t(-1) },
    ],
    rates: [
      { id: uid(), service: '1 vídeo UGC (30–60s)', price: 350, turnaround: '5 dias úteis', notes: '1 revisão inclusa' },
      { id: uid(), service: 'Combo 3 vídeos', price: 900, turnaround: '10 dias úteis', notes: 'Melhor custo para a marca' },
      { id: uid(), service: 'Pack de fotos (10 imagens)', price: 400, turnaround: '5 dias úteis', notes: '' },
      { id: uid(), service: 'Adicional de uso pago (30 dias)', price: 150, turnaround: '—', notes: 'Por vídeo, por plataforma' },
      { id: uid(), service: 'Entrega expressa (48h)', price: 100, turnaround: '48 horas', notes: 'Somado a qualquer serviço' },
    ],
    settings: { currency: state.settings.currency },
  };
  save();
  render();
  toast('Dados de exemplo carregados');
}

/* ============ Exportar / importar ============ */

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ugc-studio-backup-' + todayISO() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup baixado');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.deals) || !Array.isArray(data.brands)) {
        toast('Arquivo de backup inválido');
        return;
      }
      state = Object.assign(defaultState(), data, {
        settings: Object.assign(defaultState().settings, data.settings || {}),
      });
      save();
      render();
      toast('Dados importados');
    } catch (err) {
      toast('Não foi possível ler esse arquivo');
    }
  };
  reader.readAsText(file);
}

/* ============ Eventos ============ */

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');

  // Clique no fundo escurecido fecha o modal
  if (!el && e.target.matches('[data-backdrop]')) {
    closeModal();
    return;
  }
  if (!el) return;

  const action = el.dataset.action;
  const id = el.dataset.id;

  switch (action) {
    case 'nav':
      currentView = el.dataset.view;
      render();
      break;

    case 'new-deal': openDealModal(null); break;
    case 'edit-deal': openDealModal(id); break;
    case 'delete-deal':
      if (confirm('Excluir este job e suas entregas?')) {
        state.deals = state.deals.filter((d) => d.id !== id);
        save();
        closeModal();
        render();
        toast('Job excluído');
      }
      break;

    case 'mark-paid':
      setDealStatus(id, 'paid');
      break;

    case 'advance-deal': {
      const deal = getDeal(id);
      if (!deal) break;
      const idx = DEAL_STATUSES.findIndex((s) => s.id === deal.status);
      if (idx > -1 && idx < DEAL_STATUSES.length - 1) setDealStatus(id, DEAL_STATUSES[idx + 1].id);
      break;
    }

    case 'deals-filter':
      dealStatusFilter = el.dataset.status;
      render();
      break;

    case 'new-brand': openBrandModal(null); break;
    case 'edit-brand': openBrandModal(id); break;
    case 'delete-brand':
      if (confirm('Excluir esta marca? Os jobs dela serão mantidos sem marca.')) {
        state.brands = state.brands.filter((b) => b.id !== id);
        state.deals.forEach((d) => { if (d.brandId === id) d.brandId = null; });
        save();
        closeModal();
        render();
        toast('Marca excluída');
      }
      break;

    case 'new-rate': openRateModal(null); break;
    case 'edit-rate': openRateModal(id); break;
    case 'delete-rate':
      if (confirm('Excluir este serviço da tabela?')) {
        state.rates = state.rates.filter((r) => r.id !== id);
        save();
        closeModal();
        render();
        toast('Serviço excluído');
      }
      break;

    case 'new-content': openContentModal(null, el.dataset.pillar); break;
    case 'edit-content': openContentModal(id); break;
    case 'delete-content':
      if (confirm('Excluir esta ideia de conteúdo?')) {
        state.content = (state.content || []).filter((c) => c.id !== id);
        save();
        closeModal();
        render();
        toast('Ideia excluída');
      }
      break;
    case 'content-filter':
      contentPillarFilter = el.dataset.pillar;
      render();
      break;
    case 'advance-content': {
      const item = (state.content || []).find((c) => c.id === id);
      if (!item) break;
      const idx = CONTENT_STATUSES.findIndex((s) => s.id === item.status);
      if (idx > -1 && idx < CONTENT_STATUSES.length - 1) {
        item.status = CONTENT_STATUSES[idx + 1].id;
        save();
        render();
        toast('Movido para ' + CONTENT_STATUSES[idx + 1].label);
      }
      break;
    }

    case 'del-deliv': {
      const deal = getDeal(el.dataset.deal);
      if (!deal) break;
      deal.deliverables = (deal.deliverables || []).filter((dv) => dv.id !== id);
      save();
      const wrap = document.querySelector('[data-deliv-wrap]');
      if (wrap) wrap.innerHTML = delivRowsHtml(deal);
      render();
      break;
    }

    case 'cal-prev':
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      render();
      break;
    case 'cal-next':
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      render();
      break;
    case 'cal-day':
      openDayModal(el.dataset.date);
      break;

    case 'export': exportData(); break;
    case 'sample-data':
      if (!state.deals.length && !state.brands.length) loadSampleData();
      else if (confirm('Isso vai SUBSTITUIR seus dados atuais pelos de exemplo. Continuar?')) loadSampleData();
      break;
    case 'clear-data':
      if (confirm('Apagar TODOS os dados? Não dá para desfazer.')) {
        state = defaultState();
        save();
        render();
        toast('Tudo apagado');
      }
      break;

    case 'close-modal': closeModal(); break;
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.dataset.form) {
    e.preventDefault();
    handleForm(form);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (!el) return;

  switch (el.dataset.change) {
    case 'currency':
      state.settings.currency = el.value;
      save();
      render();
      toast('Moeda: ' + el.value);
      break;

    case 'deliv': {
      const deal = getDeal(el.dataset.deal);
      if (!deal) break;
      const dv = (deal.deliverables || []).find((x) => x.id === el.dataset.id);
      if (!dv) break;
      dv[el.dataset.field] = el.value || (el.dataset.field === 'due' ? null : el.value);
      save();
      const row = el.closest('.deliv-row');
      if (row && el.dataset.field === 'status') row.classList.toggle('done', dv.status === 'done');
      render();
      break;
    }

    case 'import-file':
      if (el.files && el.files[0]) importData(el.files[0]);
      el.value = '';
      break;
  }
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  if (el.dataset.input === 'deal-search') {
    dealSearch = el.value;
    const list = document.querySelector('[data-deals-list]');
    if (list) list.innerHTML = dealsListHtml();
  }
});

/* ---------- Arrastar e soltar (kanban, desktop) ---------- */

document.addEventListener('dragstart', (e) => {
  const card = e.target.closest ? e.target.closest('[data-deal-card]') : null;
  if (!card) return;
  e.dataTransfer.setData('text/plain', card.dataset.dealCard);
  e.dataTransfer.effectAllowed = 'move';
  card.classList.add('dragging');
});

document.addEventListener('dragend', () => {
  document.querySelectorAll('.kcard.dragging').forEach((c) => c.classList.remove('dragging'));
  document.querySelectorAll('.kcol.drop-hover').forEach((c) => c.classList.remove('drop-hover'));
});

document.addEventListener('dragover', (e) => {
  const col = e.target.closest ? e.target.closest('[data-drop-status]') : null;
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  col.classList.add('drop-hover');
});

document.addEventListener('dragleave', (e) => {
  const col = e.target.closest ? e.target.closest('[data-drop-status]') : null;
  if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop-hover');
});

document.addEventListener('drop', (e) => {
  const col = e.target.closest ? e.target.closest('[data-drop-status]') : null;
  if (!col) return;
  e.preventDefault();
  col.classList.remove('drop-hover');
  const id = e.dataTransfer.getData('text/plain');
  if (id) setDealStatus(id, col.dataset.dropStatus);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ============ Inicialização ============ */

const recDateEl = document.getElementById('rec-date');
if (recDateEl) recDateEl.textContent = new Date().toLocaleDateString('pt-BR');

render();

// Perfil padrão (Riane) — carregado do profile.json; na primeira vez,
// os serviços do mídia kit entram na tabela de preços.
fetch('profile.json?v=4')
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    if (!data) return;
    profileData = data;
    if (!state.seededProfile) {
      state.seededProfile = true;
      if (!state.rates.length && Array.isArray(data.services)) {
        data.services.forEach((s) => state.rates.push({
          id: uid(),
          service: s.title,
          price: s.price != null ? s.price : null,
          turnaround: '',
          notes: s.note || 'Sob consulta',
        }));
      }
      save();
    }
    if (currentView === 'profile' || currentView === 'rates') render();
  })
  .catch(() => {});
