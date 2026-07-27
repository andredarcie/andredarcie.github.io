const PAGE_SIZE = 25;

const state = {
  ranking: [],
  sources: [],
  sourcesById: new Map(),
  visibleBooks: PAGE_SIZE,
  bookQuery: "",
  minMentions: 0,
  bookOrder: "rank",
  sourceQuery: "",
  sourceOrder: "all",
  sourceTier: "all",
};

const elements = {
  podium: document.querySelector("#podium"),
  rankingList: document.querySelector("#ranking-list"),
  sourcesGrid: document.querySelector("#sources-grid"),
  bookSearch: document.querySelector("#book-search"),
  minMentions: document.querySelector("#min-mentions"),
  bookOrder: document.querySelector("#book-order"),
  clearBookFilters: document.querySelector("#clear-book-filters"),
  bookResultCount: document.querySelector("#book-result-count"),
  loadMore: document.querySelector("#load-more"),
  showAll: document.querySelector("#show-all"),
  sourceSearch: document.querySelector("#source-search"),
  sourceOrder: document.querySelector("#source-order"),
  sourceTier: document.querySelector("#source-tier"),
  sourceResultCount: document.querySelector("#source-result-count"),
  statSources: document.querySelector("#stat-sources"),
  statMentions: document.querySelector("#stat-mentions"),
  statBooks: document.querySelector("#stat-books"),
  heroBooks: document.querySelector("#hero-books"),
  heroSources: document.querySelector("#hero-sources"),
  sourcesTotal: document.querySelector("#sources-total"),
  footerSources: document.querySelector("#footer-sources"),
  footerMentions: document.querySelector("#footer-mentions"),
  toTop: document.querySelector("#to-top"),
  brand: document.querySelector(".brand"),
};

// Ordem alternativa do ranking. `rank` é a padrão e segue a pontuação final.
const bookComparators = {
  rank: (a, b) => a.rank_final - b.rank_final,
  ocorrencias: (a, b) =>
    b.ocorrencias - a.ocorrencias || a.rank_final - b.rank_final,
  posicao_media: (a, b) =>
    a.posicao_media - b.posicao_media || a.rank_final - b.rank_final,
  titulo: (a, b) =>
    a.titulo_normalizado.localeCompare(b.titulo_normalizado, "pt-BR"),
};

const orderLabels = {
  meta_ranking: "Meta-ranking",
  ranking_explicito: "Ranking explícito",
  lista_numerada: "Lista numerada",
  ordem_editorial: "Ordem editorial",
};

const podiumLabels = {
  1: "Líder do ranking",
  2: "2º lugar",
  3: "3º lugar",
};

const languageLabels = {
  en: "Fonte em inglês",
  pt: "Fonte em português",
  es: "Fonte em espanhol",
  it: "Fonte em italiano",
  fr: "Fonte em francês",
  de: "Fonte em alemão",
  pl: "Fonte em polonês",
};

function parseCsv(text) {
  const input = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) =>
    headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {}),
  );
}

function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value, digits = 0) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function prepareData(rankingRows, sourceRows) {
  state.ranking = rankingRows.map((book) => ({
    ...book,
    rank_final: Number(book.rank_final),
    ocorrencias: Number(book.ocorrencias),
    total_fontes: Number(book.total_fontes),
    percentual_fontes: Number(book.percentual_fontes),
    peso_posicao_medio: Number(book.peso_posicao_medio),
    pontuacao_final: Number(book.pontuacao_final),
    posicao_media: Number(book.posicao_media),
    sourceIds: (book.fontes || "").split("|").filter(Boolean),
    // Normalizar aqui evita refazer a conta dos 352 títulos a cada tecla.
    searchKey: normalizeSearch(`${book.titulo_normalizado} ${book.autor}`),
  }));

  state.sources = sourceRows.map((source) => ({
    ...source,
    quantidade_livros: Number(source.quantidade_livros),
    searchKey: normalizeSearch(
      `${source.titulo} ${source.publicador} ${source.dominio} ${source.escopo}`,
    ),
  }));

  state.sourcesById = new Map(
    state.sources.map((source) => [source.fonte_id, source]),
  );
}

function renderStats() {
  const totalMentions = state.ranking.reduce(
    (sum, book) => sum + book.ocorrencias,
    0,
  );
  const sources = number(state.sources.length);
  const books = number(state.ranking.length);
  const mentions = number(totalMentions);

  elements.statSources.textContent = sources;
  elements.statMentions.textContent = mentions;
  elements.statBooks.textContent = books;

  // Os números no texto da página vêm dos CSVs para não envelhecerem a cada coleta.
  elements.heroBooks.textContent = books;
  elements.heroSources.textContent = sources;
  elements.sourcesTotal.textContent = sources;
  elements.footerSources.textContent = sources;
  elements.footerMentions.textContent = mentions;
}

function renderPodium() {
  elements.podium.innerHTML = state.ranking
    .slice(0, 3)
    .map(
      (book) => `
        <article class="podium-card ${book.rank_final === 1 ? "rank-one" : ""}">
          <span class="podium-number">${book.rank_final}</span>
          <span class="podium-label">${podiumLabels[book.rank_final] || `${book.rank_final}º lugar`}</span>
          <h3 class="podium-title">${escapeHtml(book.titulo_normalizado)}</h3>
          <p class="podium-author">${escapeHtml(book.autor)}</p>
          <div class="podium-footer">
            <div>
              <strong>${book.ocorrencias}/${book.total_fontes}</strong>
              <small>${number(book.percentual_fontes, 1)}% das fontes</small>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

// O Dataset é estático no HTML; o top 10 sai do CSV para não envelhecer no markup.
function renderStructuredData() {
  const script =
    document.querySelector("#ranking-jsonld") ||
    document.createElement("script");
  script.id = "ranking-jsonld";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Livros mais recomendados para desenvolvimento de software",
    numberOfItems: state.ranking.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: state.ranking.slice(0, 10).map((book) => ({
      "@type": "ListItem",
      position: book.rank_final,
      item: {
        "@type": "Book",
        name: book.titulo_normalizado,
        author: book.autor
          .split(";")
          .map((name) => ({ "@type": "Person", name: name.trim() })),
      },
    })),
  });
  document.head.appendChild(script);
}

function sourceChips(book) {
  return book.sourceIds
    .map((sourceId) => {
      const source = state.sourcesById.get(sourceId);
      if (!source) return "";
      return `
        <a
          class="source-chip"
          href="${escapeHtml(source.url)}"
          target="_blank"
          rel="noreferrer"
          title="${escapeHtml(source.titulo)}"
        >
          ${escapeHtml(source.publicador)} <span aria-hidden="true">↗</span>
        </a>
      `;
    })
    .join("");
}

function bookRow(book) {
  const width = Math.min(100, (book.ocorrencias / book.total_fontes) * 100);
  return `
    <article class="book-row" data-testid="book-row" tabindex="-1">
      <div class="book-main">
        <span class="book-rank">${book.rank_final}</span>
        <div class="book-info">
          <h3 class="book-title">${escapeHtml(book.titulo_normalizado)}</h3>
          <span class="book-author">${escapeHtml(book.autor)}</span>
        </div>
        <div class="occurrence">
          <strong>${book.ocorrencias} de ${book.total_fontes}</strong>
          <small>${number(book.percentual_fontes, 1)}% das fontes</small>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
        <div class="score">
          <strong>${number(book.pontuacao_final, 2)}</strong>
          <small>pontos</small>
        </div>
        <div class="average-position">
          <strong>${number(book.posicao_media, 1)}º</strong>
          <small>nas listas</small>
        </div>
      </div>
      <details class="book-sources">
        <summary>Ver ${book.sourceIds.length} fontes</summary>
        <div class="source-chips">
          ${sourceChips(book)}
        </div>
      </details>
    </article>
  `;
}

function filteredBooks() {
  const query = normalizeSearch(state.bookQuery);
  const books = state.ranking.filter(
    (book) =>
      book.ocorrencias >= state.minMentions &&
      (!query || book.searchKey.includes(query)),
  );

  return books.sort(bookComparators[state.bookOrder] || bookComparators.rank);
}

function renderRanking() {
  const books = filteredBooks();
  const visible = books.slice(0, state.visibleBooks);
  const remaining = books.length - visible.length;

  elements.bookResultCount.textContent = `${number(books.length)} ${
    books.length === 1 ? "livro encontrado" : "livros encontrados"
  }${remaining ? ` · ${number(visible.length)} na tela` : ""}`;

  if (!visible.length) {
    elements.rankingList.innerHTML = `
      <div class="empty-state">
        Nenhum livro corresponde aos filtros. Tente outro termo ou reduza o mínimo de fontes.
      </div>
    `;
  } else {
    elements.rankingList.innerHTML = visible.map(bookRow).join("");
  }

  elements.loadMore.hidden = remaining <= 0;
  elements.showAll.hidden = remaining <= PAGE_SIZE;
  if (remaining > 0) {
    elements.loadMore.textContent = `Mostrar mais ${Math.min(PAGE_SIZE, remaining)} livros ↓`;
  }
  if (remaining > PAGE_SIZE) {
    elements.showAll.textContent = `Mostrar todos os ${number(books.length)}`;
  }
}

function filteredSources() {
  const query = normalizeSearch(state.sourceQuery);
  return state.sources.filter(
    (source) =>
      (state.sourceOrder === "all" ||
        source.tipo_ordem === state.sourceOrder) &&
      (state.sourceTier === "all" ||
        source.qualidade_faixa === state.sourceTier) &&
      (!query || source.searchKey.includes(query)),
  );
}

const qualityCriteria = [
  ["qualidade_q1", "Autoridade de quem produziu"],
  ["qualidade_q2", "Método declarado"],
  ["qualidade_q3", "Objetividade"],
  ["qualidade_q4", "Datação"],
  ["qualidade_q5", "Controle editorial do veículo"],
  ["qualidade_q6", "Posição frente a outras fontes"],
  ["qualidade_q7", "Autopromoção"],
];

function qualityBars(source) {
  return qualityCriteria
    .map(([field, label]) => {
      const score = Number(source[field] || 0);
      return `
        <li>
          <span class="quality-label">${escapeHtml(label)}</span>
          <span class="quality-dots" role="img"
            aria-label="${score} de 2">${"●".repeat(score)}${"○".repeat(2 - score)}</span>
        </li>
      `;
    })
    .join("");
}

function sourceCard(source) {
  const date = source.data_publicacao_atualizacao || "data não identificada";
  const tier = source.qualidade_faixa || "";
  return `
    <article class="source-card" data-testid="source-card">
      <div class="source-card-top">
        <span class="source-badge">${escapeHtml(orderLabels[source.tipo_ordem] || source.tipo_ordem)}</span>
        <span class="source-http">
          <abbr title="${escapeHtml(languageLabels[source.idioma] || source.idioma)}"
            >${escapeHtml((source.idioma || "").toUpperCase())}</abbr
          >
          · HTTP ${escapeHtml(source.status_http_na_coleta)}
        </span>
      </div>
      <h3>${escapeHtml(source.titulo)}</h3>
      <p class="source-publisher">${escapeHtml(source.publicador)} · ${escapeHtml(source.dominio)}</p>
      <p class="source-scope">${escapeHtml(source.escopo)}</p>
      <details class="quality-panel" data-tier="${escapeHtml(tier)}">
        <summary>
          <span class="quality-tier">${escapeHtml(tier)}</span>
          <span class="quality-score">${escapeHtml(source.qualidade_total)}/14</span>
        </summary>
        <ul class="quality-list">${qualityBars(source)}</ul>
      </details>
      <div class="source-card-footer">
        <span>${source.quantidade_livros} livros · ${escapeHtml(date)}</span>
        <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
          Visitar fonte ↗
        </a>
      </div>
    </article>
  `;
}

function renderSources() {
  const sources = filteredSources();
  elements.sourceResultCount.textContent = `${number(sources.length)} ${
    sources.length === 1 ? "fonte encontrada" : "fontes encontradas"
  }`;

  if (!sources.length) {
    elements.sourcesGrid.innerHTML = `
      <div class="empty-state">
        Nenhuma fonte corresponde aos filtros escolhidos.
      </div>
    `;
  } else {
    elements.sourcesGrid.innerHTML = sources.map(sourceCard).join("");
  }
}

function showLoadError(error) {
  console.error(error);
  const message = `
    <div class="error-state">
      <strong>Não foi possível carregar os dados.</strong>
      <span>Abra a página por um servidor local ou pelo GitHub Pages.</span>
      <button class="button" type="button" data-retry>Tentar de novo</button>
    </div>
  `;
  elements.podium.innerHTML = message;
  elements.rankingList.innerHTML = message;
  elements.sourcesGrid.innerHTML = message;
  elements.bookResultCount.textContent = "Falha ao carregar ranking";
  elements.sourceResultCount.textContent = "Falha ao carregar fontes";

  document.querySelectorAll("[data-retry]").forEach((button) => {
    button.addEventListener("click", () => {
      button.disabled = true;
      init();
    });
  });
}

// Filtro sem endereço não se compartilha; a URL passa a ser o estado da busca.
const urlParams = {
  q: ["bookQuery", (value) => value, ""],
  min: ["minMentions", Number, 0],
  ordem: ["bookOrder", (value) => value, "rank"],
  fq: ["sourceQuery", (value) => value, ""],
  tipo: ["sourceOrder", (value) => value, "all"],
  faixa: ["sourceTier", (value) => value, "all"],
};

// Um <select> recusa valor fora da lista e fica em branco; nesse caso vale a
// opção padrão, para uma URL adulterada não deixar o controle sem seleção.
function applySelect(select, value, fallback) {
  select.value = String(value);
  if (select.selectedIndex < 0) select.value = String(fallback);
  return select.value;
}

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  Object.entries(urlParams).forEach(([param, [key, parse]]) => {
    if (!params.has(param)) return;
    const value = parse(params.get(param));
    if (typeof value !== "number" || Number.isFinite(value)) {
      state[key] = value;
    }
  });

  elements.bookSearch.value = state.bookQuery;
  elements.sourceSearch.value = state.sourceQuery;
  state.minMentions = Number(applySelect(elements.minMentions, state.minMentions, 0));
  state.bookOrder = applySelect(elements.bookOrder, state.bookOrder, "rank");
  state.sourceOrder = applySelect(elements.sourceOrder, state.sourceOrder, "all");
  state.sourceTier = applySelect(elements.sourceTier, state.sourceTier, "all");
}

const syncUrl = debounce(() => {
  const url = new URL(window.location.href);
  Object.entries(urlParams).forEach(([param, [key, , fallback]]) => {
    if (String(state[key]) === String(fallback)) {
      url.searchParams.delete(param);
    } else {
      url.searchParams.set(param, state[key]);
    }
  });
  // replaceState mantém o botão voltar servindo à navegação, não aos filtros.
  window.history.replaceState(null, "", url);
}, 250);

function updateBooks({ resetPage = true } = {}) {
  if (resetPage) state.visibleBooks = PAGE_SIZE;
  renderRanking();
  syncUrl();
}

// Ao revelar mais linhas o foco vai para a primeira delas: quem navega por
// teclado continua de onde parou em vez de cair no fim do documento.
function revealMore(step) {
  const boundary = state.visibleBooks;
  state.visibleBooks += step;
  updateBooks({ resetPage: false });
  elements.rankingList.children[boundary]?.focus();
}

function updateSources() {
  renderSources();
  syncUrl();
}

function bindEvents() {
  const onBookQuery = debounce(() => updateBooks(), 150);
  elements.bookSearch.addEventListener("input", (event) => {
    state.bookQuery = event.target.value;
    onBookQuery();
  });

  elements.minMentions.addEventListener("change", (event) => {
    state.minMentions = Number(event.target.value);
    updateBooks();
  });

  elements.bookOrder.addEventListener("change", (event) => {
    state.bookOrder = event.target.value;
    updateBooks();
  });

  elements.clearBookFilters.addEventListener("click", () => {
    state.bookQuery = "";
    state.minMentions = 0;
    state.bookOrder = "rank";
    elements.bookSearch.value = "";
    elements.minMentions.value = "0";
    elements.bookOrder.value = "rank";
    updateBooks();
    elements.bookSearch.focus();
  });

  elements.loadMore.addEventListener("click", () => revealMore(PAGE_SIZE));
  elements.showAll.addEventListener("click", () =>
    revealMore(state.ranking.length),
  );

  const onSourceQuery = debounce(updateSources, 150);
  elements.sourceSearch.addEventListener("input", (event) => {
    state.sourceQuery = event.target.value;
    onSourceQuery();
  });

  elements.sourceOrder.addEventListener("change", (event) => {
    state.sourceOrder = event.target.value;
    updateSources();
  });

  elements.sourceTier.addEventListener("change", (event) => {
    state.sourceTier = event.target.value;
    updateSources();
  });

  bindShortcuts();
  bindBackToTop();
}

function bindShortcuts() {
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName);
    if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      elements.bookSearch.focus();
      elements.bookSearch.select();
    }
    if (event.key === "Escape" && event.target === elements.bookSearch) {
      state.bookQuery = "";
      elements.bookSearch.value = "";
      updateBooks();
    }
  });
}

function bindBackToTop() {
  let ticking = false;
  const update = () => {
    elements.toTop.hidden = window.scrollY < window.innerHeight;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  elements.toTop.addEventListener("click", () => {
    // Sem `behavior` explícito o scroll respeita o prefers-reduced-motion do CSS.
    window.scrollTo({ top: 0 });
    elements.brand.focus();
  });

  update();
}

function alignInitialHash() {
  const targetId = decodeURIComponent(window.location.hash.slice(1));
  const target = targetId ? document.getElementById(targetId) : null;
  if (!target) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "instant", block: "start" });
    });
  });
}

let eventsBound = false;

async function init() {
  try {
    const [rankingResponse, sourceResponse] = await Promise.all([
      fetch("./ranking_final.csv?v=2"),
      fetch("./fontes.csv?v=2"),
    ]);

    if (!rankingResponse.ok || !sourceResponse.ok) {
      throw new Error(
        `Falha HTTP: ranking ${rankingResponse.status}, fontes ${sourceResponse.status}`,
      );
    }

    const [rankingText, sourceText] = await Promise.all([
      rankingResponse.text(),
      sourceResponse.text(),
    ]);

    prepareData(parseCsv(rankingText), parseCsv(sourceText));
    renderStats();
    renderPodium();
    renderStructuredData();
    readStateFromUrl();
    renderRanking();
    renderSources();

    // init() roda de novo no botão "tentar de novo"; os listeners são únicos.
    if (!eventsBound) {
      bindEvents();
      eventsBound = true;
    }

    alignInitialHash();
  } catch (error) {
    showLoadError(error);
  }
}

init();
