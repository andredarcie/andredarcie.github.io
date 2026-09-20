// ── CLASSIFY ENTITY ──────────────────────────────────
const ENTITY_RULES = [
  [['folha', 'pagamento'],                                                                                     { label: 'Folha',              cls: 'tag-pref'  }],
  [['banco', 'bradesco', 'caixa', 'sicredi', 'sicob'],                                                        { label: 'Banco',              cls: 'tag-banco' }],
  [['inss', 'seguro social', 'previd', 'ipmd'],                                                               { label: 'Previdência',         cls: 'tag-gov'   }],
  [['receita federal', 'fazenda', 'tribunal', 'seg. pública', 'segurança pública', 'prodesp', 'secretaria'],  { label: 'Gov. Estadual/Fed.', cls: 'tag-gov'   }],
  [['transport', 'transer', 'caique'],                                                                        { label: 'Transporte',         cls: 'tag-tran'  }],
  [['farmac', 'hospitalar', 'medic', 'saúde', 'saude', 'mastolog', 'fonoudiolog', 'jaboque', 'nutric', 'gente segur'], { label: 'Saúde', cls: 'tag-saude' }],
  [['escola', 'ciee', 'integração', 'integra', 'inepa', 'pesquisa'],                                         { label: 'Educação',           cls: 'tag-edu'   }],
  [['lar da', 'lar de', 'gente amiga', 'osc', 'são vicente'],                                                { label: 'ONG/Social',         cls: 'tag-ong'   }],
  [['cpfl', 'sabesp', 'vivo', 'telefon', 'telecomunic', 'fb telec'],                                         { label: 'Serviços Públicos',  cls: 'tag-serv'  }],
];

function classifyEntity(nome) {
  const n = nome.toLowerCase();
  for (const [keywords, result] of ENTITY_RULES) {
    if (keywords.some(k => n.includes(k))) return result;
  }
  return { label: 'Outros', cls: 'tag-outros' };
}

// ── PAGING WRAPPER ───────────────────────────────────
function withPaging(renderFn, btnId, label) {
  return function(data, query) {
    const btn = document.getElementById(btnId);
    const isExpanded = btn && btn.dataset.expanded === '1';
    const limit = isExpanded ? Infinity : PAGE_SIZE;
    renderFn(data, query, limit);
    if (!btn) return;
    if (!data || data.length <= PAGE_SIZE || isExpanded) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
      btn.textContent = label + ' ↓';
      btn.onclick = () => {
        btn.dataset.expanded = '1';
        renderFn(data, query, Infinity);
        btn.classList.add('hidden');
      };
    }
  };
}

// ── RENDER: SALÁRIOS ─────────────────────────────────
function renderSalary(data, query = '', limit = Infinity) {
  const tbody   = document.getElementById('salaryBody');
  const empty   = document.getElementById('salaryEmpty');
  const counter = document.getElementById('salaryCount');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    counter.innerHTML = '<strong>0</strong> servidores';
    return;
  }

  empty.classList.remove('visible');
  counter.innerHTML = `<strong>${data.length}</strong> servidor${data.length !== 1 ? 'es' : ''}`;

  const slice = limit < Infinity ? data.slice(0, limit) : data;
  tbody.innerHTML = slice.map((d, i) => {
    const liq  = d.bruto - d.deducoes;
    const barW = (d.bruto / SALARY_MAX * 100).toFixed(1);
    const area = AREA_MAP[d.area] || { label: 'Outros', cls: 'tag-outros' };
    const rankHtml = i < 3
      ? `<span class="rank-top rank-${i + 1}">${i + 1}</span>`
      : `${i + 1}`;
    const rescisaoTag = d.tipo === 'Rescisão'
      ? `<span class="s-cargo-tag tag-rescisao" title="Verbas rescisórias — não representa salário mensal regular">Rescisão</span> `
      : '';

    return `<tr class="fade-row" style="animation-delay:${Math.min(i * 0.025, 0.5)}s">
      <td class="td-rank">${rankHtml}</td>
      <td class="td-name">
        <div class="s-name">${hl(d.nome, query)}</div>
        <div class="s-mat">Mat. confidencial</div>
      </td>
      <td>
        ${rescisaoTag}<span class="s-cargo-tag ${area.cls}">${area.label}</span>
        <div class="s-cargo-name">${hl(d.cargo, query)}</div>
        <div class="salary-bar-track">
          <div class="salary-bar-fill" style="width:${barW}%" data-sw="${barW}"></div>
        </div>
      </td>
      <td class="s-secretaria">${d.secretaria}</td>
      <td class="val-bruto">${fmtBR(d.bruto)}</td>
      <td class="val-dedu">-${fmtBR(d.deducoes)}</td>
      <td class="val-liq">${fmtBR(liq)}</td>
    </tr>`;
  }).join('');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.salary-bar-fill').forEach(el => {
      el.style.transform = `scaleX(${parseFloat(el.dataset.sw) / 100})`;
    });
  }));
}

function sortSalary(data, key) {
  return [...data].sort((a, b) => {
    if (key === 'nome')  return a.nome.localeCompare(b.nome, 'pt-BR');
    if (key === 'bruto') return b.bruto - a.bruto;
    if (key === 'liq')   return (b.bruto - b.deducoes) - (a.bruto - a.deducoes);
    return 0;
  });
}

function filterSalary(data, q) {
  if (!q) return data;
  const lq = normalizeQ(q);
  return data.filter(d => normalizeQ(`${d.nome} ${d.cargo} ${d.secretaria}`).includes(lq));
}

// ── RENDER: CREDORES ─────────────────────────────────
let currentData  = [...DATA];
let sortKey      = 'emp';
let searchQuery  = '';

function renderTable(data, query = '', limit = Infinity) {
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    document.getElementById('resultCount').innerHTML = '<strong>0</strong> resultados';
    return;
  }

  empty.classList.remove('visible');
  document.getElementById('resultCount').innerHTML =
    `<strong>${data.length}</strong> resultado${data.length !== 1 ? 's' : ''}`;

  const slice = limit < Infinity ? data.slice(0, limit) : data;
  tbody.innerHTML = slice.map((d, i) => {
    const pct    = d.valor_num > 0 ? (parseVal(d.pago) / d.valor_num * 100) : 0;
    const barW   = (d.valor_num / MAX_VAL * 100).toFixed(1);
    const barCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const ent    = classifyEntity(d.nome);
    const rankHtml = i < 3
      ? `<span class="rank-top rank-${i + 1}">${i + 1}</span>`
      : `${i + 1}`;
    const pctCls = pct >= 75 ? 'pct-high'
      : pct >= 40 ? 'pct-mid'
      : pct >  0  ? 'pct-low'
      :             'pct-zero';

    return `<tr class="fade-row" style="animation-delay:${Math.min(i * 0.025, 0.5)}s">
      <td class="td-rank">${rankHtml}</td>
      <td class="td-name">
        <div class="entity-name">${hl(d.nome, query)}</div>
        <span class="type-tag ${ent.cls}">${ent.label}</span>
      </td>
      <td class="td-cnpj">${hl(d.cnpj, query)}</td>
      <td class="td-bar">
        <div class="bar-track">
          <div class="bar-fill ${barCls}" style="width:${barW}%" data-w="${barW}"></div>
        </div>
        <div class="bar-pct">${barW}% do maior</div>
      </td>
      <td class="td-value val-emp">${d.empenhado}</td>
      <td class="td-value val-pago">${d.pago}</td>
      <td class="td-pct"><span class="pct-pill ${pctCls}">${pct > 0 ? pct.toFixed(0) + '%' : '—'}</span></td>
    </tr>`;
  }).join('');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill').forEach(el => {
      el.style.transform = `scaleX(${parseFloat(el.dataset.w) / 100})`;
    });
  }));
}

function sortData(data, key) {
  return [...data].sort((a, b) => {
    if (key === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
    if (key === 'emp')  return b.valor_num - a.valor_num;
    if (key === 'pago') return parseVal(b.pago) - parseVal(a.pago);
    if (key === 'pct') {
      const pa = a.valor_num > 0 ? parseVal(a.pago) / a.valor_num : 0;
      const pb = b.valor_num > 0 ? parseVal(b.pago) / b.valor_num : 0;
      return pb - pa;
    }
    return 0;
  });
}

function filterData(data, q) {
  if (!q) return data;
  const lq = normalizeQ(q);
  return data.filter(d =>
    normalizeQ(d.nome).includes(lq) || d.cnpj.toLowerCase().includes(lq)
  );
}

function updateStats() {
  const totalEmp  = DATA.reduce((s, d) => s + d.valor_num, 0);
  const totalPago = DATA.reduce((s, d) => s + parseVal(d.pago), 0);
  const pct = totalPago / totalEmp * 100;
  const fmt = n => n >= 1e6
    ? 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'
    : fmtBR(n);

  document.getElementById('stat-emp').textContent   = fmt(totalEmp);
  document.getElementById('stat-pago').textContent  = fmt(totalPago);
  document.getElementById('stat-pct').textContent   = pct.toFixed(1) + '%';
  document.getElementById('stat-count').textContent = DATA.length;
}

// ── RENDER: EMPENHOS ─────────────────────────────────
function renderEmpenhos(data, query, limit = Infinity) {
  const body  = document.getElementById('empBody');
  const empty = document.getElementById('empEmpty');
  const count = document.getElementById('empCount');
  if (!body) return;

  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? data.filter(d =>
        (d.credor    || '').toLowerCase().includes(q) ||
        (d.descricao || '').toLowerCase().includes(q) ||
        (d.categoria || '').toLowerCase().includes(q))
    : data;

  count.innerHTML = `<strong>${filtered.length}</strong> empenho${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    body.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  const slice = limit < Infinity ? filtered.slice(0, limit) : filtered;
  body.innerHTML = slice.map(d => {
    const catCls    = CAT_CLASS[d.categoria] || 'cat-outros';
    const desc      = truncate(d.descricao || d.credor, 120);
    const sourceTag = d.fonte && d.fonte.includes('Restos')
      ? `<span style="font-size:0.6rem;color:var(--dt-muted);display:block;margin-top:2px;">Restos a Pagar 2025</span>`
      : '';
    return `<tr>
      <td><span class="emp-cat-badge ${catCls}">${d.categoria}</span></td>
      <td class="td-credor" title="${d.credor}">${truncate(d.credor, 35)}</td>
      <td class="td-desc" title="${d.descricao}">${desc}${sourceTag}</td>
      <td class="td-val">${fmtBR(d.valor)}</td>
    </tr>`;
  }).join('');
}

// ── SALARY STATS ─────────────────────────────────────
const SALARIO_MINIMO = 1518;

function renderSalaryStats(data) {
  const el = document.getElementById('salStats');
  if (!el) return;

  const folha = data.filter(d => d.tipo === 'Folha Mensal');
  const n = folha.length;
  if (n === 0) { el.innerHTML = ''; return; }

  const brutos  = folha.map(d => d.bruto).sort((a, b) => a - b);
  const total   = brutos.reduce((s, v) => s + v, 0);
  const media   = total / n;
  const mediana = n % 2 === 0
    ? (brutos[n / 2 - 1] + brutos[n / 2]) / 2
    : brutos[Math.floor(n / 2)];
  const abaixoMin = brutos.filter(v => v < SALARIO_MINIMO).length;

  const fmt = v => v >= 1e6
    ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M'
    : fmtBR(v);

  const cards = [
    { label: 'Folha mensal (bruto)',  value: fmt(total),          sub: `${n} servidores ativos`                                         },
    { label: 'Média bruto',           value: fmtBR(media),        sub: `${(media / SALARIO_MINIMO).toFixed(1)} salários mínimos`          },
    { label: 'Mediana bruto',         value: fmtBR(mediana),      sub: `Metade ganha acima desse valor`                                  },
    { label: 'Abaixo do mínimo',      value: `${abaixoMin}`,      sub: `Menos de R$${SALARIO_MINIMO.toLocaleString('pt-BR')}/mês`, alert: true },
  ];

  el.innerHTML = cards.map(c => `
    <div class="sal-stat-card${c.alert ? ' sc-alert' : ''}">
      <span class="sal-stat-label">${c.label}</span>
      <span class="sal-stat-value">${c.value}</span>
      <span class="sal-stat-sub">${c.sub}</span>
    </div>`).join('');
}

// ── EMPENHOS STATS ───────────────────────────────────
function renderEmpStats(data) {
  const el = document.getElementById('empStats');
  if (!el || !data.length) { if (el) el.innerHTML = ''; return; }

  const total = data.reduce((s, d) => s + d.valor, 0);
  const media = total / data.length;

  const catTotals = {};
  data.forEach(d => { catTotals[d.categoria] = (catTotals[d.categoria] || 0) + d.valor; });
  const topCat   = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topPct   = (topCat[1] / total * 100).toFixed(0);

  const cards = [
    { label: 'Total empenhado',   value: fmtBR(total),      sub: `${data.length} empenho${data.length !== 1 ? 's' : ''}` },
    { label: 'Média por empenho', value: fmtBR(media),      sub: 'valor médio empenhado'                                  },
    { label: 'Maior categoria',   value: topCat[0],         sub: `${fmtBR(topCat[1])} · ${topPct}% do total`             },
  ];

  el.className = 'sal-stats cols-3';
  el.innerHTML = cards.map(c => `
    <div class="sal-stat-card">
      <span class="sal-stat-label">${c.label}</span>
      <span class="sal-stat-value">${c.value}</span>
      <span class="sal-stat-sub">${c.sub}</span>
    </div>`).join('');
}

// ── EXPORT CSV ────────────────────────────────────────
function exportCSV(rows, headers, filename) {
  const BOM = '﻿';
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines  = [headers.map(escape).join(';'),
                  ...rows.map(r => r.map(escape).join(';'))];
  const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function exportSalaryCSV(data) {
  exportCSV(
    data.map(d => [d.nome, d.cargo, (AREA_MAP[d.area] || {}).label || d.area,
                   d.secretaria, d.bruto.toFixed(2).replace('.', ','),
                   d.deducoes.toFixed(2).replace('.', ','),
                   (d.bruto - d.deducoes).toFixed(2).replace('.', ','), d.tipo]),
    ['Nome', 'Cargo', 'Área', 'Secretaria', 'Bruto', 'Deduções', 'Líquido', 'Tipo'],
    'salarios-divinolandia.csv'
  );
}

function exportCredoresCSV(data) {
  exportCSV(
    data.map(d => [d.nome, d.cnpj, d.empenhado, d.pago]),
    ['Credor', 'CNPJ', 'Empenhado', 'Pago'],
    'credores-divinolandia.csv'
  );
}

function exportEmpenhosCSV(data) {
  exportCSV(
    data.map(d => [d.categoria, d.credor, d.descricao || '', d.valor.toFixed(2).replace('.', ','), d.fonte || '']),
    ['Categoria', 'Credor', 'Descrição', 'Valor', 'Fonte'],
    'empenhos-divinolandia.csv'
  );
}

// ── AREA PIE CHART ───────────────────────────────────
// Cores de categoria do tema (../tema.css), em hex porque vão em atributos fill do SVG.
const AREA_COLORS = {
  exec:   '#1C6582',
  adm:    '#6B4C7A',
  saude2: '#2E6A45',
  edu2:   '#85613B',
  eng:    '#A63A2A',
  jur:    '#2F7472',
};

function renderAreaChart() {
  const el = document.getElementById('areaChart');
  if (!el) return;

  const agg = {};
  SALARY_DATA.forEach(d => {
    if (!agg[d.area]) agg[d.area] = { count: 0, sum: 0 };
    agg[d.area].count++;
    agg[d.area].sum += d.bruto;
  });
  const total = SALARY_DATA.length;

  const slices = Object.entries(agg)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([area, { count, sum }]) => ({
      area,
      count,
      pct:   count / total * 100,
      media: sum / count,
      label: (AREA_MAP[area] || {}).label || area,
      color: AREA_COLORS[area] || '#7E8C84',
    }));

  const cx = 100, cy = 100, R = 88, ri = 52;
  const GAP = 1.5;

  function xy(angleDeg, radius) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  function donutPath(a0, a1) {
    const [ox1, oy1] = xy(a0, R);
    const [ox2, oy2] = xy(a1, R);
    const [ix2, iy2] = xy(a1, ri);
    const [ix1, iy1] = xy(a0, ri);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${ox1} ${oy1} A${R} ${R} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${ri} ${ri} 0 ${large} 0 ${ix1} ${iy1}Z`;
  }

  let angle = 0;
  const paths = slices.map(s => {
    const sweep = s.pct / 100 * 360;
    const a0 = angle + GAP / 2;
    const a1 = angle + sweep - GAP / 2;
    angle += sweep;
    return `<path d="${donutPath(a0, a1)}" fill="${s.color}"/>`;
  });

  const svg = `<svg viewBox="0 0 200 200" width="160" height="160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${paths.join('')}
    <text x="100" y="95"  text-anchor="middle" font-size="22" font-weight="700" fill="#17241E" font-family="inherit">${total}</text>
    <text x="100" y="112" text-anchor="middle" font-size="9"  fill="#56655D"        font-family="inherit">servidores</text>
  </svg>`;

  const legend = slices.map(s => `
    <div class="ac-legend-row">
      <span class="ac-dot" style="background:${s.color}"></span>
      <span class="ac-lbl">${s.label}</span>
      <span class="ac-count">${s.count}</span>
      <span class="ac-pct">${s.pct.toFixed(1)}%</span>
      <span class="ac-media" title="Média bruto">${fmtBR(s.media)}</span>
    </div>`).join('');

  el.innerHTML = `<div class="ac-chart">${svg}</div><div class="ac-legend">${legend}</div>`;
}

// ── SORT HEADER HELPER ───────────────────────────────
function updateSortHeader(tableSelector, key, colMap, activeClass) {
  document.querySelectorAll(`${tableSelector} thead th`).forEach(th => {
    th.classList.remove(activeClass);
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';
  });
  if (key !== 'nome' && colMap[key]) {
    const th = document.querySelectorAll(`${tableSelector} thead th`)[colMap[key] - 1];
    if (th) {
      th.classList.add(activeClass);
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = '↓';
    }
  }
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateStats();

  // Credores
  const renderTablePaged = withPaging(renderTable, 'vmCredores', 'Ver todos os 50 credores');
  currentData = sortData(DATA, sortKey);
  renderTablePaged(currentData, searchQuery);

  document.getElementById('credExportBtn').addEventListener('click', () => exportCredoresCSV(currentData));

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    currentData = sortData(filterData(DATA, searchQuery), sortKey);
    renderTablePaged(currentData, searchQuery);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); }
  });

  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => {
    sortKey = sortSelect.value;
    currentData = sortData(filterData(DATA, searchQuery), sortKey);
    renderTablePaged(currentData, searchQuery);
    updateSortHeader('.data-table', sortKey, { emp: 5, pago: 6, pct: 7 }, 'sorted');
  });

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      sortSelect.value = th.dataset.sort;
      sortSelect.dispatchEvent(new Event('change'));
    });
  });

  // Salários
  (function initSalarios() {
    const areaFiltersEl = document.getElementById('salaryAreaFilters');
    Object.entries(AREA_MAP).forEach(([key, val]) => {
      const btn = document.createElement('button');
      btn.className   = 'cat-btn';
      btn.dataset.sarea = key;
      btn.textContent = val.label;
      areaFiltersEl.appendChild(btn);
    });

    let sSortKey = 'bruto';
    let sQuery   = '';
    let sArea    = '';
    let sTipo    = '';
    let sFaixa   = '';

    const renderSalaryPaged = withPaging(renderSalary, 'vmSalarios', 'Ver todos os 493 servidores');

    function getFiltered() {
      let result = SALARY_DATA;
      if (sArea) result = result.filter(d => d.area === sArea);
      if (sTipo) result = result.filter(d => d.tipo === sTipo);
      if (sFaixa) {
        const [minStr, maxStr] = sFaixa.split('-');
        const min = Number(minStr);
        const max = maxStr ? Number(maxStr) : Infinity;
        result = result.filter(d => d.bruto >= min && d.bruto < max);
      }
      if (sQuery) result = filterSalary(result, sQuery);
      return result;
    }

    const clearBtn    = document.getElementById('salClearFilters');
    const salarySearch = document.getElementById('salarySearch');
    const salarySortSel = document.getElementById('salarySortSelect');
    const faixaSel    = document.getElementById('salaryFaixaSelect');
    const tipoFiltersEl = document.getElementById('salaryTipoFilters');

    function isFiltered() {
      return sArea || sTipo || sFaixa || sQuery;
    }

    function refresh() {
      const filtered = getFiltered();
      renderSalaryPaged(sortSalary(filtered, sSortKey), sQuery);
      renderSalaryStats(filtered);
      clearBtn.hidden = !isFiltered();
    }

    function resetAll() {
      sArea = ''; sTipo = ''; sFaixa = ''; sQuery = '';
      salarySearch.value  = '';
      faixaSel.value      = '';
      [areaFiltersEl, tipoFiltersEl].forEach(el => {
        el.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        el.querySelector('[data-sarea=""], [data-stipo=""]')?.classList.add('active');
      });
      refresh();
    }

    function wireChips(el, dataAttr, setter) {
      el.addEventListener('click', e => {
        const btn = e.target.closest('.cat-btn');
        if (!btn) return;
        el.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setter(btn.dataset[dataAttr] || '');
        refresh();
      });
    }

    wireChips(areaFiltersEl, 'sarea', v => { sArea = v; });
    wireChips(tipoFiltersEl, 'stipo', v => { sTipo = v; });

    faixaSel.addEventListener('change', e => { sFaixa = e.target.value; refresh(); });
    salarySearch.addEventListener('input', e => { sQuery = e.target.value.trim(); refresh(); });
    salarySearch.addEventListener('keydown', e => {
      if (e.key === 'Escape') { salarySearch.value = ''; sQuery = ''; refresh(); }
    });
    clearBtn.addEventListener('click', resetAll);
    document.getElementById('salExportBtn').addEventListener('click', () => exportSalaryCSV(getFiltered()));

    salarySortSel.addEventListener('change', () => {
      sSortKey = salarySortSel.value;
      refresh();
      updateSortHeader('.salary-table', sSortKey, { bruto: 5, liq: 7 }, 'sorted-sal');
    });

    document.querySelectorAll('th[data-ssort]').forEach(th => {
      th.addEventListener('click', () => {
        salarySortSel.value = th.dataset.ssort;
        salarySortSel.dispatchEvent(new Event('change'));
      });
    });

    renderAreaChart();
    refresh();
  })();

  // Empenhos
  (function initEmpenhos() {
    const filtersEl = document.getElementById('catFilters');
    if (!filtersEl) return;

    const cats = [...new Set(EMPENHOS_DATA.map(d => d.categoria))].sort();
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className   = 'cat-btn';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      filtersEl.appendChild(btn);
    });

    let activeCat = '';
    let empQuery  = '';
    const getFiltered = () => activeCat
      ? EMPENHOS_DATA.filter(d => d.categoria === activeCat)
      : EMPENHOS_DATA;

    const renderEmpPaged = withPaging(renderEmpenhos, 'vmEmpenhos', 'Ver todos os empenhos');
    const refresh = () => {
      const filtered = getFiltered();
      renderEmpPaged(filtered, empQuery);
      renderEmpStats(filtered);
    };

    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      filtersEl.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      refresh();
    });

    const empSearchEl = document.getElementById('empSearch');
    if (empSearchEl) {
      empSearchEl.addEventListener('input', e => { empQuery = e.target.value; refresh(); });
      empSearchEl.addEventListener('keydown', e => {
        if (e.key === 'Escape') { empSearchEl.value = ''; empQuery = ''; refresh(); }
      });
    }

    document.getElementById('empExportBtn')?.addEventListener('click', () => exportEmpenhosCSV(getFiltered()));

    refresh();
  })();

  // Diárias
  (function initDiarias() {
    const d = DIARIAS_DATA;

    const stats = document.getElementById('diariasStats');
    if (stats) {
      stats.innerHTML = [
        { val: fmtBR(d.total_gasto), lbl: 'Total gasto'   },
        { val: d.total_empenhos,     lbl: 'Adiantamentos'  },
        { val: d.total_pessoas,      lbl: 'Pessoas'        },
      ].map(s =>
        `<div class="diaria-stat"><span class="ds-val">${s.val}</span><span class="ds-lbl">${s.lbl}</span></div>`
      ).join('');
    }

    const barsEl = document.getElementById('pessoaBars');
    if (barsEl) {
      const maxVal = d.por_pessoa[0].total;
      barsEl.innerHTML = d.por_pessoa.map(p => {
        const pct = (p.total / maxVal * 100).toFixed(1);
        return `<div class="pessoa-bar-row">
          <span class="pessoa-bar-nome" title="${p.nome} — ${p.secretaria}">${p.nome}</span>
          <div class="pessoa-bar-track"><div class="pessoa-bar-fill" style="width:0" data-w="${pct}"></div></div>
          <span class="pessoa-bar-val">${fmtBR(p.total)}</span>
          <span class="pessoa-bar-count">${p.viagens} viagem${p.viagens > 1 ? 's' : ''}</span>
        </div>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelectorAll('.pessoa-bar-fill').forEach(el => { el.style.width = el.dataset.w + '%'; });
      }));
    }

    const tbody = document.getElementById('viagensBody');
    if (tbody) {
      const SEC_DESC = {
        'Câmara Municipal': 'Atividade parlamentar ou institucional da Câmara Municipal',
        'Administração E Planejamento': 'Tratativa administrativa, reunião institucional ou capacitação técnica',
        'Desporto E Lazer': 'Evento esportivo, campeonato ou atividade de lazer',
        'Saúde': 'Capacitação, reunião técnica ou atendimento na área de saúde',
        'Assistência Social': 'Reunião, curso ou atividade de assistência social',
        'Educação': 'Evento, capacitação ou atividade na área de educação',
      };
      const isGeneric = desc => !desc || /adiantamento de viagem,?\s*pedido/i.test(desc) || /diantamento de viagem/i.test(desc);
      const getTripDesc = r => isGeneric(r.descricao) ? (SEC_DESC[r.secretaria] || 'Viagem a serviço do município') : r.descricao;
      tbody.innerHTML = d.detalhes.map(r => {
        const desc = getTripDesc(r);
        const real = !isGeneric(r.descricao);
        return `<tr>
          <td class="v-data">${r.data}</td>
          <td><div class="v-nome">${r.nome}</div><div class="v-sec">${r.secretaria}</div></td>
          <td class="v-desc"><span class="v-trip-desc${real ? ' v-trip-real' : ''}">${desc}</span></td>
          <td class="v-val">${fmtBR(r.valor)}</td>
        </tr>`;
      }).join('');
    }
  })();

  // ── RECEITAS ─────────────────────────────────────────────────────────
  (() => {
    const d = RECEITAS_DATA;
    if (!d) return;

    const total = d.por_tipo.reduce((s, t) => s + t.valor, 0);
    const maior = d.por_tipo[0];

    const statsEl = document.getElementById('recStats');
    if (statsEl) {
      statsEl.innerHTML = [
        { label: 'Total Lançado (2025)', value: fmtBR(total), sub: `${d.por_mes.length} meses` },
        { label: 'Maior Fonte', value: maior.tipo, sub: fmtBR(maior.valor) },
        { label: 'Tipos de Receita', value: String(d.por_tipo.length), sub: 'categorias' },
      ].map(c => `<div class="sal-stat-card"><div class="sal-stat-label">${c.label}</div><div class="sal-stat-value">${c.value}</div><div class="sal-stat-sub">${c.sub}</div></div>`).join('');
    }

    const TIPO_COLORS = ['#1C6582','#2E6A45','#85613B','#6B4C7A','#2F7472','#A63A2A','#8A6A12'];
    const tipoEl = document.getElementById('recTipoChart');
    if (tipoEl) {
      const cx = 90, cy = 90, R = 78, ri = 46, GAP = 1.5;
      function xy(a, r) { const rad = (a-90)*Math.PI/180; return [cx+r*Math.cos(rad), cy+r*Math.sin(rad)]; }
      let angle = 0;
      const paths = d.por_tipo.map((t, i) => {
        const sweep = (t.valor/total)*(360-GAP*d.por_tipo.length);
        const a0 = angle+GAP/2, a1 = angle+sweep+GAP/2; angle += sweep+GAP;
        const [ox1,oy1]=xy(a0,R),[ox2,oy2]=xy(a1,R),[ix2,iy2]=xy(a1,ri),[ix1,iy1]=xy(a0,ri);
        const lg = a1-a0>180?1:0;
        return `<path d="M${ox1} ${oy1} A${R} ${R} 0 ${lg} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${ri} ${ri} 0 ${lg} 0 ${ix1} ${iy1}Z" fill="${TIPO_COLORS[i%TIPO_COLORS.length]}" opacity="0.92"><title>${t.tipo}: ${fmtBR(t.valor)}</title></path>`;
      });
      const legend = d.por_tipo.map((t,i) =>
        `<div class="ac-legend-row"><span class="ac-dot" style="background:${TIPO_COLORS[i%TIPO_COLORS.length]}"></span><span class="ac-lbl">${t.tipo}</span><span class="ac-pct">${((t.valor/total)*100).toFixed(1)}%</span></div>`).join('');
      tipoEl.innerHTML = `<div class="ac-media"><div class="ac-chart"><svg viewBox="0 0 180 180" width="180" height="180">${paths.join('')}<text x="90" y="86" text-anchor="middle" font-size="10" fill="#56655D">Total</text><text x="90" y="100" text-anchor="middle" font-size="9" fill="#33423A">${fmtBR(total)}</text></svg></div><div class="ac-legend">${legend}</div></div>`;
    }

    const mesEl = document.getElementById('recMesChart');
    if (mesEl && d.por_mes.length) {
      const maxMes = Math.max(...d.por_mes.map(m => m.valor));
      const ABR = {JANEIRO:'Jan',FEVEREIRO:'Fev','MARÇO':'Mar',MARCO:'Mar',ABRIL:'Abr',MAIO:'Mai',JUNHO:'Jun',JULHO:'Jul',AGOSTO:'Ago',SETEMBRO:'Set',OUTUBRO:'Out',NOVEMBRO:'Nov',DEZEMBRO:'Dez'};
      mesEl.innerHTML = `<div class="rec-bar-chart">${d.por_mes.map(m => {
        const pct = (m.valor/maxMes*100).toFixed(1);
        return `<div class="rec-bar-col"><div class="rec-bar-wrap"><div class="rec-bar" style="height:${pct}%" title="${fmtBR(m.valor)}"></div></div><div class="rec-bar-label">${ABR[m.mes]||m.mes.slice(0,3)}</div></div>`;
      }).join('')}</div>`;
    }

    const TRIBUTO_DESC = {
      'Imposto Predial':                  'Cobrado anualmente sobre imóveis edificados (casas, comércios)',
      'Imposto Territorial':              'Cobrado sobre terrenos urbanos sem construção',
      'SIMPLES NACIONAL':                 'ISS de empresas optantes pelo regime Simples Nacional',
      'ISS Variavel':                     'Prestadores de serviço avulsos — alíquota variável por atividade',
      'Imp. Transmissão Bens Imóveis':    'Pago na compra e venda de imóveis urbanos',
      'ITBI RURAL':                       'Pago na transferência de propriedades rurais',
      'ISSQN RETIDO':                     'ISS retido na fonte pelo tomador do serviço',
      'Taxa Licença de Funcionamento':    'Licença para abrir e operar estabelecimento comercial',
      'Imposto de Renda Retido Fonte':    'IR retido nos pagamentos feitos pela prefeitura a servidores e fornecedores',
      'Taxa de Aluguel':                  'Aluguéis de bens municipais cedidos a terceiros',
      'MEI - Microempreendedor Indivi':   'Contribuição mensal do microempreendedor individual ao município',
      'MEI - Microempreendedor Individual': 'Contribuição mensal do microempreendedor individual ao município',
      'ISS VARIÁVEL':                     'ISS de serviços com alíquota variável (mesma base do ISS Variavel)',
      'Alvará de Licença':                'Taxa para obtenção de alvará de funcionamento',
      'Concessão de Terreno Cem. Municipal': 'Concessão de jazigos e terrenos no cemitério municipal',
      'Tx Renov. VISA':                   'Renovação anual de licença sanitária (Vigilância Sanitária)',
      'Multa':                            'Multas administrativas por infrações diversas',
      'Confecçção de Tumulo':             'Serviço de construção de túmulos no cemitério municipal',
      'Confecção de Tumulo':              'Serviço de construção de túmulos no cemitério municipal',
      'Sepultamento/Inumação':            'Taxa cobrada pelo sepultamento no cemitério municipal',
      'Tx Fiscaliz VISA':                 'Taxa de fiscalização sanitária de estabelecimentos',
      'Certidão':                         'Emissão de certidões e documentos municipais',
      'Expediente':                       'Taxa de expediente para tramitação de processos administrativos',
      'EXUMAÇÃO':                         'Serviço de exumação de restos mortais no cemitério',
      'Taxa Ocupação Espaço':             'Ocupação de espaço público por quiosques e similares',
      'Retificação de Área':              'Taxa de retificação de área de imóvel no cadastro',
      'Taxa de Localização art 59 CTM':   'Taxa de localização de estabelecimentos conforme Código Tributário',
      'Habite-se':                        'Certificado de conclusão e habitabilidade de obra',
      'Taxa Licença Ambulante':           'Licença para comércio ambulante nas vias públicas',
      'Autorização de Obras Cemitério':   'Autorização para obras de reforma em jazigos',
      'Motoniveladora':                   'Aluguel de motoniveladora para serviços rurais e de terraplanagem',
      'VISA RT Inicial':                  'Registro inicial de Responsável Técnico na Vigilância Sanitária',
      'TX ALTERACAO CADASTRAL':           'Taxa para alteração de dados no cadastro municipal',
      'Aprovação de Projetos':            'Taxa para análise e aprovação de projetos de construção',
      'Caminhão Pipa':                    'Aluguel de caminhão pipa para fornecimento de água',
      'ENCERRAMENTO ATIVIDADE':           'Taxa de encerramento formal de atividade empresarial',
      'Numerção Predial':                 'Atribuição oficial de número predial ao imóvel',
      'Preço de Embarque':                'Tarifa cobrada no terminal rodoviário municipal',
      'VISA Equip Renov':                 'Renovação de licença de equipamentos na Vigilância Sanitária',
      'TRANSLADO':                        'Serviço de translado de restos mortais',
      'Taxa NFSE Avulsa':                 'Taxa para emissão de Nota Fiscal de Serviço Eletrônica avulsa',
      'TAXA LICENCA AMBULANTE':           'Licença para comércio ambulante (lançamento avulso)',
      'VISA RT Subst':                    'Substituição de Responsável Técnico na Vigilância Sanitária',
      'Honorario':                        'Honorários cobrados por serviços jurídicos ou técnicos municipais',
      'Autorização de Obras':             'Taxa para autorização de obras na área urbana',
      'Pá Carregadeira':                  'Aluguel de pá carregadeira para serviços de terraplenagem',
      'Retroescavadeira':                 'Aluguel de retroescavadeira para obras e serviços públicos',
      'I.S.S.Q.N.':                       'Imposto Sobre Serviços de Qualquer Natureza (lançamento avulso)',
      'Restituição':                      'Devolução de valores pagos indevidamente ao município',
    };

    const tbody = document.getElementById('recTributoBody');
    if (tbody) {
      const maxTributo = Math.max(...d.por_tributo.map(t => t.valor));
      const grouped = {};
      d.por_tributo.forEach(t => { (grouped[t.tipo] = grouped[t.tipo] || []).push(t); });
      const tipoOrder = d.por_tipo.map(t => t.tipo);
      let rank = 0;
      let html = '';
      tipoOrder.forEach(tipo => {
        const items = grouped[tipo];
        if (!items) return;
        const tipoColor = TIPO_COLORS[tipoOrder.indexOf(tipo) % TIPO_COLORS.length];
        const tipoTotal = items.reduce((s, t) => s + t.valor, 0);
        html += `<tr class="rec-group-header">
          <td colspan="5">
            <span class="rec-group-dot" style="background:${tipoColor}"></span>
            <strong>${tipo}</strong>
            <span class="rec-group-sub">${fmtBR(tipoTotal)} · ${((tipoTotal/total)*100).toFixed(1)}% do total</span>
          </td>
        </tr>`;
        items.forEach(t => {
          rank++;
          const barPct = (t.valor / maxTributo * 100).toFixed(1);
          const pct = ((t.valor / total) * 100).toFixed(2);
          const desc = TRIBUTO_DESC[t.tributo] || '';
          html += `<tr class="rec-tributo-row">
            <td class="rec-rank">${rank}</td>
            <td class="rec-tributo-name">
              <span class="rec-trib-label">${t.tributo}</span>
              ${desc ? `<span class="rec-trib-desc">${desc}</span>` : ''}
            </td>
            <td class="rec-tributo-bar-cell">
              <div class="rec-inline-bar"><div class="rec-inline-fill" style="width:${barPct}%;background:${tipoColor}"></div></div>
            </td>
            <td class="rec-tributo-val">${fmtBR(t.valor)}</td>
            <td class="rec-tributo-pct">${pct}%</td>
          </tr>`;
        });
      });
      tbody.innerHTML = html;
    }

    document.getElementById('recExportBtn')?.addEventListener('click', () => {
      exportCSV(
        d.por_tributo.map(t => [t.tipo, t.tributo, t.valor, ((t.valor/total)*100).toFixed(2)+'%']),
        ['Tipo','Tributo','Valor Lançado','% Total'],
        `receitas_${d.ano}.csv`
      );
    });
  })();

  // ── CONDERG ───────────────────────────────────────────────────────────
  (() => {
    const d = CONDERG_DATA;
    if (!d) return;

    const compEl = document.getElementById('condergCompetencia');
    if (compEl) compEl.textContent = d.competencia;

    const statsEl = document.getElementById('condergStats');
    if (statsEl) {
      statsEl.innerHTML = [
        { label: 'Folha Total',       value: fmtBR(d.total_salarios),  sub: d.competencia },
        { label: 'Servidores',        value: String(d.total_servidores), sub: 'Hospital + SAMU Divinolândia' },
        { label: 'Média Salarial',    value: fmtBR(d.media_salarial),  sub: 'por servidor' },
        { label: 'Maior Salário',     value: fmtBR(d.detalhes[0]?.salario || 0), sub: d.detalhes[0]?.cargo || '' },
      ].map(c => `<div class="sal-stat-card"><div class="sal-stat-label">${c.label}</div><div class="sal-stat-value">${c.value}</div><div class="sal-stat-sub">${c.sub}</div></div>`).join('');
    }

    // Faixas salariais
    const faixasEl = document.getElementById('condergFaixas');
    if (faixasEl) {
      const maxF = Math.max(...d.faixas.map(f => f.count));
      const FAIXA_COLORS = ['#B9D6C3','#8DBB9D','#5E9A74','#2E6A45','#16372B'];
      faixasEl.innerHTML = d.faixas.map((f, i) => {
        const pct = (f.count / maxF * 100).toFixed(1);
        const servPct = (f.count / d.total_servidores * 100).toFixed(1);
        return `<div class="conderg-faixa-row">
          <span class="conderg-faixa-label">${f.faixa}</span>
          <div class="conderg-faixa-track">
            <div class="conderg-faixa-fill" style="width:0;background:${FAIXA_COLORS[i]}" data-w="${pct}"></div>
          </div>
          <span class="conderg-faixa-val">${f.count} <small>(${servPct}%)</small></span>
        </div>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        faixasEl.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
      }));
    }

    // Top setores
    const setoresEl = document.getElementById('condergSetores');
    if (setoresEl) {
      const top10 = d.por_setor.slice(0, 10);
      const maxS = top10[0].total;
      setoresEl.innerHTML = top10.map(s => {
        const pct = (s.total / maxS * 100).toFixed(1);
        return `<div class="conderg-setor-row">
          <span class="conderg-setor-nome" title="${s.setor}">${s.setor}</span>
          <div class="conderg-setor-track">
            <div class="conderg-setor-fill" style="width:0" data-w="${pct}"></div>
          </div>
          <span class="conderg-setor-val">${fmtBR(s.total)}</span>
        </div>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setoresEl.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
      }));
    }

    // Cargos grid
    const cargosEl = document.getElementById('condergCargos');
    if (cargosEl) {
      const maxC = d.por_cargo[0].total;
      cargosEl.innerHTML = d.por_cargo.map(c => {
        const pct = (c.total / maxC * 100).toFixed(1);
        const med = c.servidores > 0 ? fmtBR(c.total / c.servidores) : '—';
        return `<div class="conderg-cargo-card">
          <div class="conderg-cargo-name">${c.cargo}</div>
          <div class="conderg-cargo-bar-wrap"><div class="conderg-cargo-bar" style="width:0" data-w="${pct}"></div></div>
          <div class="conderg-cargo-meta">${c.servidores} serv · média ${med}</div>
          <div class="conderg-cargo-total">${fmtBR(c.total)}</div>
        </div>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cargosEl.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
      }));
    }

    // ── Filtros e tabela de detalhes ─────────────────────────────────────
    const detEl     = document.getElementById('condergDetBody');
    const vmBtn     = document.getElementById('condergVerMais');
    const searchEl  = document.getElementById('condergSearch');
    const setorSel  = document.getElementById('condergSetorSel');
    const cargoSel  = document.getElementById('condergCargoSel');
    const sortSel   = document.getElementById('condergSortSel');
    const countEl   = document.getElementById('condergCount');
    const clearBtn  = document.getElementById('condergClear');
    const faixaBar  = document.getElementById('condergFaixaSel');

    // Preenche dropdowns de setor e cargo
    if (setorSel) {
      const setores = [...new Set(d.detalhes.map(r => r.setor))].sort();
      setores.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; setorSel.appendChild(o); });
    }
    if (cargoSel) {
      const cargos = [...new Set(d.detalhes.map(r => r.cargo))].sort();
      cargos.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; cargoSel.appendChild(o); });
    }

    let cQuery = '', cSetor = '', cCargo = '', cFaixa = '', cSort = 'sal', cShown = 100;

    const matchFaixa = (sal, f) => {
      if (!f) return true;
      if (f.endsWith('-')) return sal >= parseFloat(f);
      const [lo, hi] = f.split('-').map(Number);
      return sal >= lo && sal < hi;
    };

    const getFiltered = () => {
      const q = cQuery.toLowerCase();
      return d.detalhes.filter(r =>
        (!q || r.nome.toLowerCase().includes(q) || r.cargo.toLowerCase().includes(q)) &&
        (!cSetor  || r.setor === cSetor) &&
        (!cCargo  || r.cargo === cCargo) &&
        matchFaixa(r.salario, cFaixa)
      ).sort((a, b) => {
        if (cSort === 'sal')   return b.salario - a.salario;
        if (cSort === 'nome')  return a.nome.localeCompare(b.nome, 'pt-BR');
        if (cSort === 'cargo') return a.cargo.localeCompare(b.cargo, 'pt-BR');
        if (cSort === 'setor') return a.setor.localeCompare(b.setor, 'pt-BR');
        return 0;
      });
    };

    const hasFilters = () => cQuery || cSetor || cCargo || cFaixa || cSort !== 'sal';

    const renderDet = () => {
      const filtered = getFiltered();
      const slice = filtered.slice(0, cShown);
      if (detEl) {
        detEl.innerHTML = slice.length
          ? slice.map((r, i) => `<tr>
              <td class="th-s-rank">${i + 1}</td>
              <td class="sal-nome"><div class="sal-nome-main">${r.nome}</div></td>
              <td class="sal-cargo">${r.cargo}</td>
              <td class="sal-cargo" style="color:var(--dt-ink-2)">${r.setor}</td>
              <td class="sal-bruto">${fmtBR(r.salario)}</td>
            </tr>`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:var(--dt-muted-2);padding:2rem">Nenhum servidor encontrado</td></tr>';
      }
      if (countEl) countEl.innerHTML = `<strong>${filtered.length}</strong> servidores`;
      if (vmBtn) {
        const left = filtered.length - cShown;
        vmBtn.hidden = left <= 0;
        vmBtn.textContent = `Ver mais ${Math.min(left, 100)} servidores (${left} restantes)`;
      }
      if (clearBtn) clearBtn.hidden = !hasFilters();
    };

    const resetAll = () => {
      cQuery = ''; cSetor = ''; cCargo = ''; cFaixa = ''; cSort = 'sal'; cShown = 100;
      if (searchEl) searchEl.value = '';
      if (setorSel) setorSel.value = '';
      if (cargoSel) cargoSel.value = '';
      if (sortSel)  sortSel.value  = 'sal';
      if (faixaBar) { faixaBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); faixaBar.querySelector('[data-faixa=""]')?.classList.add('active'); }
      renderDet();
    };

    if (searchEl) {
      searchEl.addEventListener('input', e => { cQuery = e.target.value.trim(); cShown = 100; renderDet(); });
      searchEl.addEventListener('keydown', e => { if (e.key === 'Escape') { searchEl.value = ''; cQuery = ''; cShown = 100; renderDet(); } });
    }
    if (setorSel) setorSel.addEventListener('change', e => { cSetor = e.target.value; cShown = 100; renderDet(); });
    if (cargoSel) cargoSel.addEventListener('change', e => { cCargo = e.target.value; cShown = 100; renderDet(); });
    if (sortSel)  sortSel.addEventListener('change',  e => { cSort  = e.target.value; renderDet(); });
    if (clearBtn) clearBtn.addEventListener('click', resetAll);
    if (faixaBar) {
      faixaBar.addEventListener('click', e => {
        const btn = e.target.closest('.cat-btn');
        if (!btn) return;
        faixaBar.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cFaixa = btn.dataset.faixa; cShown = 100; renderDet();
      });
    }
    if (vmBtn) vmBtn.addEventListener('click', () => { cShown = Math.min(cShown + 100, getFiltered().length); renderDet(); });

    renderDet();
  })();

  // ── DESPESAS ─────────────────────────────────────────────────────────
  (() => {
    const d = DESPESAS_DATA;
    if (!d) return;

    const pct = (d.total_pago / d.total_empenhado * 100).toFixed(1);

    const statsEl = document.getElementById('despStats');
    if (statsEl) {
      statsEl.innerHTML = [
        { label: 'Total Empenhado (2025)', value: fmtBR(d.total_empenhado), sub: `${d.por_funcao.filter(f => !f.interno).length} áreas de atuação` },
        { label: 'Total Pago', value: fmtBR(d.total_pago), sub: `${pct}% do empenhado` },
        { label: 'Credores / Fornecedores', value: `${d.por_credor.length}+`, sub: 'empresas e servidores' },
      ].map(c => `<div class="sal-stat-card"><div class="sal-stat-label">${c.label}</div><div class="sal-stat-value">${c.value}</div><div class="sal-stat-sub">${c.sub}</div></div>`).join('');
    }

    // Gráfico horizontal por função
    const funcaoEl = document.getElementById('despFuncaoChart');
    if (funcaoEl) {
      const maxEmp = d.por_funcao[0].empenhado;
      funcaoEl.innerHTML = d.por_funcao.map(f => {
        const wEmp  = (f.empenhado / maxEmp * 100).toFixed(1);
        const wPago = (f.pago      / maxEmp * 100).toFixed(1);
        return `<div class="desp-func-row">
          <span class="desp-func-nome">${f.funcao}</span>
          <div class="desp-func-bars">
            <div class="desp-func-bar-emp"  style="width:0" data-w="${wEmp}"></div>
            <div class="desp-func-bar-pago" style="width:0" data-w="${wPago}"></div>
          </div>
          <span class="desp-func-val">${fmtBR(f.empenhado)}</span>
        </div>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        funcaoEl.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
      }));
    }

    // Gráfico mensal duplo (empenhado + pago)
    const mesEl = document.getElementById('despMesChart');
    if (mesEl) {
      const maxM = Math.max(...d.por_mes.map(m => m.empenhado));
      const cols = d.por_mes.map(m => {
        const hE = Math.max(2, (m.empenhado / maxM * 120)).toFixed(1);
        const hP = Math.max(1, (m.pago      / maxM * 120)).toFixed(1);
        return `<div class="desp-mes-col">
          <div class="desp-mes-bars">
            <div class="desp-mes-bar-emp"  style="height:0" data-h="${hE}" title="${m.mes}: ${fmtBR(m.empenhado)}"></div>
            <div class="desp-mes-bar-pago" style="height:0" data-h="${hP}" title="${m.mes} pago: ${fmtBR(m.pago)}"></div>
          </div>
          <div class="desp-mes-label">${m.mes}</div>
        </div>`;
      }).join('');
      mesEl.innerHTML = `<div class="desp-mes-chart">${cols}</div>
        <div class="desp-mes-legend"><span class="desp-leg-dot desp-leg-emp"></span>Empenhado&nbsp;&nbsp;<span class="desp-leg-dot desp-leg-pago"></span>Pago</div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        mesEl.querySelectorAll('[data-h]').forEach(el => { el.style.height = el.dataset.h + 'px'; });
      }));
    }

    // Tabela top credores
    const credEl = document.getElementById('despCredBody');
    if (credEl) {
      const maxCred = d.por_credor[0].empenhado;
      credEl.innerHTML = d.por_credor.map((c, i) => {
        const barW  = (c.empenhado / maxCred * 100).toFixed(1);
        const pagoP = (c.pago / c.empenhado * 100).toFixed(0);
        return `<tr class="desp-cred-row">
          <td class="desp-rank">${i + 1}</td>
          <td class="desp-cred-nome">${c.credor}</td>
          <td class="desp-cred-bar-cell"><div class="desp-inline-bar"><div class="desp-inline-fill" style="width:${barW}%"></div></div></td>
          <td class="desp-cred-val">${fmtBR(c.empenhado)}</td>
          <td class="desp-cred-pago"><span class="desp-pago-pct">${pagoP}%</span></td>
          <td class="desp-cred-n">${c.empenhos}</td>
        </tr>`;
      }).join('');
    }
  })();

  // ── SOBRA OU DÉFICIT, ANO A ANO ──────────────────────────
  (() => {
    const d = typeof SALDO_DATA !== 'undefined' ? SALDO_DATA : null;
    if (!d || !d.anos.length) return;
    const anos = d.anos;
    const fechados = anos.filter(a => !a.parcial);
    const aberto = anos.find(a => a.parcial);
    const colunas = `grid-template-columns:repeat(${anos.length},minmax(0,1fr))`;
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    // R$ milhões com uma casa decimal; comSinal põe "+" na sobra; sem dado vira travessão
    const mi = (v, comSinal) => {
      if (v === null || v === undefined) return '—';
      const txt = (Math.abs(v) / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      return txt === '0,0' ? txt : (v < 0 ? '−' : comSinal ? '+' : '') + txt;
    };
    const lista = xs => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}` : String(xs[0]);
    const classe = v => v < 0 ? 'is-deficit' : 'is-sobra';
    // Abaixo de R$ 50 mil a conta arredonda para 0,0 mi: fica sem sinal, sem cor e fora da frase-resposta
    const QUASE_ZERO = 50_000;
    const classeTexto = v => v === null || Math.abs(v) < QUASE_ZERO ? '' : classe(v);
    const asterisco = a => a.alerta ? '*' : '';
    const listrado = a => a.parcial ? ' is-parcial' : '';
    const situacao = v => `${v < 0 ? 'déficit' : 'sobra'} de R$ ${mi(Math.abs(v))} mi`;
    const mostra = (id, texto) => {
      const el = document.getElementById(id);
      if (el && texto) { el.textContent = texto; el.hidden = false; }
    };

    // Resposta em palavras sobre os anos fechados: o município inteiro, com o instituto de previdência,
    // que é uma autarquia da prefeitura e cujo rombo ela tem de cobrir
    const sobra = fechados.filter(a => a.resultado >= 0).map(a => a.ano);
    const deficit = fechados.filter(a => a.resultado < 0).map(a => a.ano);
    const prevNoVermelho = fechados.filter(a => a.previdencia <= -QUASE_ZERO).map(a => a.ano);
    const cortes = fechados.filter(a => a.alerta_resultado).map(a => a.ano);
    const partes = [];
    if (sobra.length) partes.push(`fechou com sobra em ${lista(sobra)}`);
    if (deficit.length) partes.push(`gastou mais do que arrecadou em ${lista(deficit)}`);
    let resposta = `Contando a prefeitura, a câmara e o instituto de previdência, o município ${partes.join(' e ')}.`;
    if (prevNoVermelho.length) {
      const comCorte = prevNoVermelho.filter(ano => cortes.includes(ano));
      resposta += ` O instituto pagou mais aposentadorias do que recebeu em ${lista(prevNoVermelho)}` +
        (comCorte.length
          ? `, em parte porque a prefeitura cancelou parte do que ia repassar a ele${comCorte.length === prevNoVermelho.length ? '' : ` em ${lista(comCorte)}`}`
          : '') + '.';
    }
    // O ano em andamento só se compara com o mesmo período do ano anterior
    if (aberto) {
      const m = aberto.anterior_mesmo_periodo;
      resposta += ` Em ${aberto.ano}, até ${MESES[aberto.parcial.ate_mes - 1]} e contando a despesa já liquidada, o município está com ${situacao(aberto.resultado)}` +
        (m ? `; no mesmo período de ${m.ano}, estava com ${situacao(m.resultado)}.` : '.');
    }
    mostra('saldoResposta', resposta);

    // Faixa com o prefeito de cada ano: anos seguidos do mesmo mandato viram um bloco só.
    // O ano em andamento não entra na soma do mandato.
    const mandatos = [];
    anos.forEach((a, i) => {
      const ultimo = mandatos[mandatos.length - 1];
      const soma = a.parcial ? 0 : a.resultado;
      const fechado = a.parcial ? 0 : 1;
      if (ultimo && ultimo.nome === a.prefeito && ultimo.periodo === a.periodo) {
        ultimo.fim = i;
        ultimo.resultado += soma;
        ultimo.fechados += fechado;
      } else {
        mandatos.push({ nome: a.prefeito, periodo: a.periodo, ini: i, fim: i, resultado: soma, fechados: fechado });
      }
    });
    const faixa = comSoma => `<div class="saldo-mandatos" style="${colunas}">${mandatos.map(m => `
      <div class="saldo-mandato" style="grid-column:${m.ini + 1} / ${m.fim + 2}">
        <strong>${m.nome}</strong><span>${m.periodo}</span>${comSoma && m.fechados > 1
          ? `<span class="${classe(m.resultado)}">soma: ${mi(m.resultado, true)}</span>` : ''}
      </div>`).join('')}</div>`;
    const eixo = sufixo => `<div class="saldo-anos" style="${colunas}">${anos.map(a =>
      `<span>${a.ano}${a.parcial ? `<small>${sufixo(a)}</small>` : ''}</span>`).join('')}</div>`;
    const legendaParcial = aberto ? `<span><span class="saldo-dot is-parcial"></span>Listrado: ${aberto.ano}, ainda em andamento</span>` : '';
    const H = 180, PAD = 22;

    // Gráfico 1: resultado do município em cada ano, dividido entre a prefeitura (com a câmara) e o instituto.
    // Parte positiva (sobra, verde) empilha para cima do zero, parte negativa (prejuízo, vermelho) para baixo;
    // tom forte é a prefeitura com a câmara, tom claro é o instituto.
    const resEl = document.getElementById('saldoResultado');
    if (resEl) {
      const divisao = a => [
        { v: a.resultado_prefeitura, cls: 'is-prefeitura' },
        { v: a.previdencia, cls: 'is-instituto' },
      ];
      const somaPos = a => divisao(a).reduce((s, p) => s + Math.max(0, p.v), 0);
      const somaNeg = a => divisao(a).reduce((s, p) => s + Math.max(0, -p.v), 0);
      const maxPos = Math.max(0, ...anos.map(somaPos));
      const maxNeg = Math.max(0, ...anos.map(somaNeg));
      const escala = H / ((maxPos + maxNeg) || 1);
      const zero = PAD + maxPos * escala;
      const cols = anos.map(a => {
        let acima = 0, abaixo = 0;
        const segmentos = divisao(a).map(p => {
          const h = Math.abs(p.v) * escala;
          let topo;
          if (p.v >= 0) { acima += h; topo = zero - acima; } else { topo = zero + abaixo; abaixo += h; }
          return `<div class="saldo-barra ${classe(p.v)} ${p.cls}${listrado(a)}" style="top:${topo.toFixed(1)}px;height:${Math.max(1, h).toFixed(1)}px"></div>`;
        }).join('');
        const total = a.resultado;
        const topoRotulo = total >= 0 ? zero - acima - 18 : zero + abaixo + 2;
        const periodo = a.parcial ? `${a.ano} até ${CURTOS[a.parcial.ate_mes - 1]}` : a.ano;
        return `<div class="saldo-col" title="${periodo}: total ${fmtBR(total)}; prefeitura e câmara ${fmtBR(a.resultado_prefeitura)}; instituto de previdência ${fmtBR(a.previdencia)}">
          ${segmentos}
          <span class="saldo-rotulo ${classe(total)}" style="top:${topoRotulo.toFixed(1)}px">${mi(total, true)}</span>
        </div>`;
      }).join('');
      resEl.innerHTML = `<div class="saldo-plot" style="height:${H + 2 * PAD}px;${colunas}">
          <div class="saldo-zero" style="top:${zero.toFixed(1)}px"></div>${cols}
        </div>${eixo(a => `até ${CURTOS[a.parcial.ate_mes - 1]}`)}${faixa(true)}
        <p class="saldo-legenda"><span><span class="saldo-dot is-sobra"></span>Sobra</span><span><span class="saldo-dot is-deficit"></span>Prejuízo (déficit)</span><span><span class="saldo-dot is-forte"></span>Tom forte: prefeitura e câmara</span><span><span class="saldo-dot is-claro"></span>Tom claro: instituto de previdência</span>${legendaParcial}</p>`;
    }

    // Gráfico 2: dinheiro em caixa e dívidas no fim de cada ano (no ano em andamento, no último relatório)
    const cxEl = document.getElementById('saldoCaixa');
    if (cxEl) {
      const comDado = anos.filter(a => a.caixa !== null);
      const escala = H / (Math.max(0, ...comDado.map(a => Math.max(a.caixa, a.dividas))) || 1);
      const cols = anos.map(a => {
        if (a.caixa === null) return '<div class="saldo-col"></div>';
        const pctPrecatorios = a.dividas ? a.precatorios / a.dividas * 100 : 0;
        const quando = a.parcial ? `${a.ano}, em ${a.parcial.caixa_em}` : `fim de ${a.ano}`;
        return `<div class="saldo-col" title="${quando}: caixa ${fmtBR(a.caixa)}; dívidas ${fmtBR(a.dividas)}, das quais ${fmtBR(a.precatorios)} em precatórios">
          <div class="saldo-par">
            <div class="saldo-b is-caixa${listrado(a)}" style="height:${Math.max(2, a.caixa * escala).toFixed(1)}px"><span>${mi(a.caixa)}</span></div>
            <div class="saldo-b saldo-pilha${listrado(a)}" style="height:${Math.max(2, a.dividas * escala).toFixed(1)}px"><span>${mi(a.dividas)}${asterisco(a)}</span>
              <div class="saldo-seg is-precatorio" style="height:${pctPrecatorios.toFixed(1)}%"></div>
              <div class="saldo-seg is-divida" style="height:${(100 - pctPrecatorios).toFixed(1)}%"></div>
            </div>
          </div>
        </div>`;
      }).join('');
      cxEl.innerHTML = `<div class="saldo-plot saldo-plot--par" style="height:${H + PAD}px;${colunas}">${cols}</div>` +
        `${eixo(a => a.parcial.caixa_em ? `em ${a.parcial.caixa_em}` : 'sem relatório')}${faixa(false)}
        <p class="saldo-legenda"><span><span class="saldo-dot is-caixa"></span>Dinheiro em caixa</span><span><span class="saldo-dot is-divida"></span>Empréstimos e parcelamentos</span><span><span class="saldo-dot is-precatorio"></span>Precatórios</span>${legendaParcial}</p>`;
    }

    const tabEl = document.getElementById('saldoTabela');
    if (tabEl) {
      tabEl.innerHTML = anos.map(a => `<tr>
        <th scope="row">${a.ano}${a.parcial ? ` <small>até ${CURTOS[a.parcial.ate_mes - 1]}, liquidado</small>` : ''}</th>
        <td>${a.prefeito}</td>
        <td class="num">${mi(a.receita)}</td>
        <td class="num">${mi(a.despesa)}</td>
        <td class="num ${classeTexto(a.resultado)}"><strong>${mi(a.resultado, true)}</strong></td>
        <td class="num ${classeTexto(a.resultado_prefeitura)}">${mi(a.resultado_prefeitura, true)}${a.alerta_resultado ? '*' : ''}</td>
        <td class="num ${classeTexto(a.previdencia)}">${mi(a.previdencia, true)}</td>
        <td class="num">${mi(a.caixa)}</td>
        <td class="num">${mi(a.dividas)}${asterisco(a)}</td>
        <td class="num">${mi(a.precatorios)}</td>
      </tr>`).join('');
    }

    // Notas que dependem dos números
    if (aberto) {
      const ate = MESES[aberto.parcial.ate_mes - 1];
      const caixaEm = aberto.parcial.caixa_em;
      const atrasado = aberto.parcial.balanco_atrasado;
      const porExtenso = iso => { const [, mes, dia] = iso.split('-').map(Number); return `${dia} de ${MESES[mes - 1]}`; };
      mostra('saldoNotaParcial', `${aberto.ano} ainda está em andamento: o resultado vai até ${ate} ` +
        `(balanço do ${aberto.parcial.bimestre}º bimestre)` +
        (caixaEm ? ` e o caixa e as dívidas são de ${MESES[CURTOS.indexOf(caixaEm)]}` : '') + '. ' +
        'No meio do ano o balanço compara a receita com a despesa liquidada, isto é, o que já foi entregue, e não com a empenhada, ' +
        'porque contratos do ano inteiro são empenhados logo em janeiro. Por isso a barra listrada só se compara com o mesmo período ' +
        'do ano anterior, que usa a mesma regra.' +
        (atrasado ? ` O balanço do ${atrasado.bimestre}º bimestre, com prazo até ${porExtenso(atrasado.prazo)}, ainda não aparece no sistema do Tesouro.` : '') +
        (!caixaEm && aberto.parcial.rgf_atrasado
          ? ` O relatório fiscal de ${aberto.ano}, que traz o caixa e as dívidas, ${atrasado ? 'também não aparece' : 'ainda não aparece no sistema do Tesouro'}, ` +
            'embora o prazo do primeiro relatório do ano já tenha passado.'
          : ''));
    }
    const cobertos = fechados.filter(a => a.resultado < 0 && a.reserva_usada > 0);
    if (cobertos.length) {
      const caixaCaiu = cobertos.every(a => {
        const anterior = anos.find(b => b.ano === a.ano - 1);
        return anterior && a.caixa < anterior.caixa;
      });
      mostra('saldoNotaReserva', `Em ${lista(cobertos.map(a => a.ano))}, o orçamento contou com dinheiro que tinha sobrado de anos anteriores ` +
        `(${lista(cobertos.map(a => `R$ ${mi(a.reserva_usada)} mi em ${a.ano}`))}). Por isso a prefeitura pôde gastar mais do que arrecadou` +
        `${caixaCaiu ? ', e o caixa caiu' : ''}.`);
    }
    const comAlertaResultado = anos.filter(a => a.alerta_resultado);
    if (comAlertaResultado.length) {
      mostra('saldoNotaResultado', `Divisão com asterisco (*). ` +
        comAlertaResultado.map(a => `${a.ano}: ${a.alerta_resultado}`).join(' ') +
        ' O total do município não muda com isso: o repasse cancelado sai da conta da prefeitura e da receita do instituto ao mesmo tempo.');
    }
    const comCancelamento = anos.filter(a => a.cancelado_depois >= QUASE_ZERO * 10);
    if (comCancelamento.length) {
      mostra('saldoNotaCancelados', `Parte do que é empenhado num ano acaba cancelada no ano seguinte e nunca vira gasto. ` +
        comCancelamento.map(a => `Das contas que ficaram para depois no fim de ${a.ano}, R$ ${mi(a.cancelado_depois)} mi foram canceladas em ${a.ano + 1}.`).join(' ') +
        ` Esses valores continuam dentro do "gastou" do ano em que foram empenhados.`);
    }
    const comAlerta = anos.filter(a => a.alerta);
    if (comAlerta.length) {
      mostra('saldoNotaAlertas', `Dívidas com asterisco (*), em que o próprio relatório não fecha. ` +
        comAlerta.map(a => `${a.ano}: ${a.alerta}`).join(' '));
    }
    if (d.passivo_atuarial) {
      mostra('saldoNotaAtuarial', `As dívidas não incluem o déficit do instituto de previdência dos servidores, a conta de longo prazo ` +
        `das aposentadorias, estimado em R$ ${mi(d.passivo_atuarial.valor)} mi no relatório de ${d.passivo_atuarial.ano}.`);
    }
    const pior = anos.reduce((m, a) => (a.dif_tce > m.dif_tce ? a : m), anos[0]);
    mostra('saldoNotaConferencia', `Conferido com o TCE-SP, uma fonte independente do Tesouro: arrecadação e gastos batem com o balanço ` +
      `em todos os anos, com diferença máxima de R$ ${Math.round(pior.dif_tce / 1000).toLocaleString('pt-BR')} mil, em ${pior.ano}.`);
  })();
});
