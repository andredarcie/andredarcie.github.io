const state = {
  ranking: [],
  sources: [],
  sourcesById: new Map(),
  visibleBooks: 25,
  bookQuery: "",
  minMentions: 0,
  sourceQuery: "",
  sourceOrder: "all",
};

const elements = {
  podium: document.querySelector("#podium"),
  rankingList: document.querySelector("#ranking-list"),
  sourcesGrid: document.querySelector("#sources-grid"),
  bookSearch: document.querySelector("#book-search"),
  minMentions: document.querySelector("#min-mentions"),
  clearBookFilters: document.querySelector("#clear-book-filters"),
  bookResultCount: document.querySelector("#book-result-count"),
  loadMore: document.querySelector("#load-more"),
  sourceSearch: document.querySelector("#source-search"),
  sourceOrder: document.querySelector("#source-order"),
  sourceResultCount: document.querySelector("#source-result-count"),
  statSources: document.querySelector("#stat-sources"),
  statMentions: document.querySelector("#stat-mentions"),
  statBooks: document.querySelector("#stat-books"),
  heroBooks: document.querySelector("#hero-books"),
  heroSources: document.querySelector("#hero-sources"),
  sourcesTotal: document.querySelector("#sources-total"),
  footerSources: document.querySelector("#footer-sources"),
  footerMentions: document.querySelector("#footer-mentions"),
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
    sourceIds: book.fontes.split("|").filter(Boolean),
  }));

  state.sources = sourceRows.map((source) => ({
    ...source,
    quantidade_livros: Number(source.quantidade_livros),
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
            <span class="mini-book" aria-hidden="true"></span>
          </div>
        </article>
      `,
    )
    .join("");
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
    <article class="book-row" data-testid="book-row">
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
  return state.ranking.filter((book) => {
    const searchable = normalizeSearch(
      `${book.titulo_normalizado} ${book.autor}`,
    );
    return (
      book.ocorrencias >= state.minMentions &&
      (!query || searchable.includes(query))
    );
  });
}

function renderRanking() {
  const books = filteredBooks();
  const visible = books.slice(0, state.visibleBooks);

  elements.bookResultCount.textContent = `${number(books.length)} ${
    books.length === 1 ? "livro encontrado" : "livros encontrados"
  }`;

  if (!visible.length) {
    elements.rankingList.innerHTML = `
      <div class="empty-state">
        Nenhum livro corresponde aos filtros. Tente outro termo ou reduza o mínimo de fontes.
      </div>
    `;
  } else {
    elements.rankingList.innerHTML = visible.map(bookRow).join("");
  }

  elements.loadMore.hidden = visible.length >= books.length;
  if (!elements.loadMore.hidden) {
    elements.loadMore.textContent = `Mostrar mais ${Math.min(25, books.length - visible.length)} livros ↓`;
  }
}

function filteredSources() {
  const query = normalizeSearch(state.sourceQuery);
  return state.sources.filter((source) => {
    const searchable = normalizeSearch(
      `${source.titulo} ${source.publicador} ${source.dominio} ${source.escopo}`,
    );
    return (
      (state.sourceOrder === "all" ||
        source.tipo_ordem === state.sourceOrder) &&
      (!query || searchable.includes(query))
    );
  });
}

function sourceCard(source) {
  const date = source.data_publicacao_atualizacao || "data não identificada";
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
      Abra a página por um servidor local ou pelo GitHub Pages e tente novamente.
    </div>
  `;
  elements.podium.innerHTML = message;
  elements.rankingList.innerHTML = message;
  elements.sourcesGrid.innerHTML = message;
  elements.bookResultCount.textContent = "Falha ao carregar ranking";
  elements.sourceResultCount.textContent = "Falha ao carregar fontes";
}

function bindEvents() {
  elements.bookSearch.addEventListener("input", (event) => {
    state.bookQuery = event.target.value;
    state.visibleBooks = 25;
    renderRanking();
  });

  elements.minMentions.addEventListener("change", (event) => {
    state.minMentions = Number(event.target.value);
    state.visibleBooks = 25;
    renderRanking();
  });

  elements.clearBookFilters.addEventListener("click", () => {
    state.bookQuery = "";
    state.minMentions = 0;
    state.visibleBooks = 25;
    elements.bookSearch.value = "";
    elements.minMentions.value = "0";
    renderRanking();
    elements.bookSearch.focus();
  });

  elements.loadMore.addEventListener("click", () => {
    state.visibleBooks += 25;
    renderRanking();
  });

  elements.sourceSearch.addEventListener("input", (event) => {
    state.sourceQuery = event.target.value;
    renderSources();
  });

  elements.sourceOrder.addEventListener("change", (event) => {
    state.sourceOrder = event.target.value;
    renderSources();
  });
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

async function init() {
  try {
    const [rankingResponse, sourceResponse] = await Promise.all([
      fetch("./ranking_final.csv"),
      fetch("./fontes.csv"),
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
    renderRanking();
    renderSources();
    bindEvents();
    alignInitialHash();
  } catch (error) {
    showLoadError(error);
  }
}

init();
