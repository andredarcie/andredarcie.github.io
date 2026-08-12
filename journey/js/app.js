// Wiring. Holds the filter state, derives the visible set, pushes it to the map
// and the grid. One source of truth, one render path.

import { DATA_URL, GEO_URL, setImageExt } from './config.js';
import { S, fmtDate, fmtDay, fmtNum, daysBetween, romano } from './strings.js';
import { aplicarCidades, listarCidades } from './lugares.js';
import { JourneyMap, emptyMapMessage } from './map.js';
import { Gallery, renderEmpty } from './gallery.js';
import { Lightbox } from './lightbox.js';
import { renderCuriosidades } from './curiosidades.js';

const $ = (id) => document.getElementById(id);

const state = {
  manifest: null,
  uf: null,            // selected state, or null for all
  until: Infinity,     // timeline cutoff, in ms
  visible: [],
};

const nodes = {
  tally: $('tally'),
  states: $('states'),
  gallery: $('gallery'),
  status: $('status'),
  empty: $('empty'),
  mapEmpty: $('map-empty'),
  readout: $('readout'),
  reset: $('reset'),
  dossier: $('dossier'),
  timeline: $('timeline-input'),
  timelineFill: $('timeline-fill'),
  timelineMonths: $('timeline-months'),
  timelineDate: $('timeline-date'),
  cullToggle: $('cull-toggle'),
  tray: $('tray'),
  trayCount: $('tray-count'),
  trayList: $('tray-list'),
  trayHint: $('tray-hint'),
  trayCopy: $('tray-copy'),
  trayClear: $('tray-clear'),
};

const gallery = new Gallery(nodes.gallery, { onOpen: openPhoto, onMark: renderTray });

const lightbox = new Lightbox($('lightbox'), {
  img: $('lb-img'),
  meta: $('lb-meta'),
  prev: $('lb-prev'),
  next: $('lb-next'),
  close: $('lb-close'),
});

const map = new JourneyMap($('map'), {
  readout: nodes.readout,
  onOpen: openPhoto,
  onPick: (ids) => gallery.highlight(ids),
});

function openPhoto(id) {
  lightbox.open(state.visible, id);
}

// --- load -------------------------------------------------------------------

// no-cache forces revalidation. The import map versions the modules, but the
// manifest changes on every rebuild and carries no `?v=` — on GitHub Pages, which
// caches for about ten minutes, that means culling photos and reloading would
// quietly show the old set and look like the exclusion silently failed.
const grab = (url) =>
  fetch(url, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

const [manifest, geo] = await Promise.all([grab(DATA_URL), grab(GEO_URL)]);

if (geo) map.setGeo(geo);
else emptyMapMessage(nodes.mapEmpty);

if (!manifest || !manifest.photos?.length) {
  renderEmpty(nodes.empty, 'noData');
  nodes.status.textContent = '';
} else {
  setImageExt(manifest.imageExt);
  // Uma vez, aqui: a partir desta linha toda foto tem `p.cidade` e ninguém mais
  // precisa saber que o manifesto guarda um índice em vez do nome.
  aplicarCidades(manifest);
  state.manifest = manifest;
  boot();
}

// --- build the chrome -------------------------------------------------------

function boot() {
  const m = state.manifest;

  renderRoute(m);
  renderTally(m);
  renderStates(m);
  gallery.setStates(m.states);
  renderCuriosidades($('curio'), m);
  renderTimeline(m);
  if (m.bounds) map.setExtent(m.bounds, m.states.map((s) => s.uf));
  lightbox.setJourney(m.span.first, m.span.last);

  nodes.reset.addEventListener('click', clearFilters);
  nodes.cullToggle.addEventListener('click', toggleCull);
  nodes.trayCopy.addEventListener('click', () => copyList(gallery.markedPhotos()));
  nodes.trayClear.addEventListener('click', () => gallery.clearMarks());

  apply();
}

// --- cull mode --------------------------------------------------------------
//
// Marking here deletes nothing. It produces a list of filenames; applying it is
// a deliberate second step at the command line, because the pipeline re-reads
// the whole Takeout on every run and a browser click is far too cheap an action
// to be the last word on throwing a photo away.

function toggleCull() {
  const on = gallery.mode !== 'mark';
  gallery.setMode(on ? 'mark' : 'browse');
  document.body.classList.toggle('is-marking', on);
  nodes.cullToggle.setAttribute('aria-pressed', String(on));
  nodes.cullToggle.textContent = on ? S.cull.off : S.cull.on;
  nodes.tray.hidden = !on;
  if (on) renderTray(gallery.markedPhotos());
}

function renderTray(marked) {
  nodes.trayCount.textContent = marked.length ? S.cull.count(marked.length) : S.cull.empty;
  nodes.trayCopy.textContent = S.cull.copy;
  nodes.trayClear.textContent = S.cull.unmark;
  nodes.trayList.value = marked.map((p) => p.name ?? p.id).join('\n');
  if (marked.length) copyList(marked);
  else nodes.trayHint.textContent = '';
}

async function copyList(marked) {
  if (!marked.length) return;
  const text = marked.map((p) => p.name ?? p.id).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    nodes.trayHint.textContent = S.cull.copied;
  } catch {
    // Clipboard needs a secure context and permission; the textarea is the
    // fallback that always works.
    nodes.trayHint.textContent = S.cull.copyFailed;
  }
}

function renderRoute(m) {
  const eyebrow = document.getElementById('eyebrow');
  if (!eyebrow || !m.states.length) return;
  const first = m.states[0];
  const last = m.states[m.states.length - 1];
  eyebrow.textContent = S.route(first.nome ?? first.uf, last.nome ?? last.uf, m.states.length);
}

function renderTally(m) {
  const days = daysBetween(m.span.first, m.span.last);

  const rows = [
    [S.tally.photos, fmtNum(m.counts.photos)],
    [S.tally.states, String(m.counts.states)],
    // Só aparece se o manifesto tiver cidades — um manifesto antigo, gerado
    // antes de a malha municipal entrar no pipeline, não deve mostrar "0".
    ...(m.counts.cidades ? [[S.tally.cidades, String(m.counts.cidades)]] : []),
    [S.tally.km, fmtNum(m.totalKm)],
    [S.tally.days, days ? fmtNum(days) : '—'],
  ];

  nodes.tally.replaceChildren();
  for (const [label, value] of rows) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dd, dt);
    nodes.tally.append(wrap);
  }
}

/** States in coast order — the build step already sorted them that way. */
function renderStates(m) {
  nodes.states.replaceChildren();
  m.states.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.uf = s.uf;

    // As quatro cores da bandeirinha de São João, em rodízio: fogo, milho,
    // mata, céu. A cor não codifica dado — codifica que isto é um varal.
    btn.style.setProperty('--flag', `var(--bandeira-${i % 4})`);
    btn.style.setProperty('--entra', `${i * 55}ms`);

    const canto = document.createElement('span');
    canto.className = 'chip__canto';
    canto.textContent = romano(i + 1);

    const uf = document.createElement('span');
    uf.className = 'chip__uf';
    uf.textContent = s.uf;

    const dias = daysBetween(s.first, s.last);
    const n = document.createElement('span');
    n.className = 'chip__n';
    n.textContent = `${fmtNum(s.count)} ${s.count === 1 ? 'foto' : 'fotos'}`;

    // Dias, cidades e distância seguem acessíveis no tooltip e na faixa de resumo.
    btn.title = [
      s.nome ?? s.uf,
      dias ? `${dias} ${dias === 1 ? 'dia' : 'dias'}` : null,
      s.cidades ? `${s.cidades} ${s.cidades === 1 ? 'cidade' : 'cidades'}` : null,
      `${fmtNum(s.km)} km`,
    ].filter(Boolean).join(' · ');
    btn.append(canto, uf, n);
    btn.addEventListener('click', () => {
      state.uf = state.uf === s.uf ? null : s.uf;
      apply();
    });
    nodes.states.append(btn);
  });
}

/**
 * Uma linha de fatos abaixo dos filtros. Sem seleção resume a viagem inteira;
 * com um estado escolhido, mostra quanto tempo ele durou e quanto chão andou —
 * que é o que alguém quer saber ao clicar num estado, e não estava em lugar
 * nenhum da tela até agora.
 */
function renderDossier(m) {
  if (!nodes.dossier) return;

  if (state.uf) {
    const s = m.states.find((x) => x.uf === state.uf);
    if (s) {
      nodes.dossier.textContent = S.dossier.state(
        s.nome ?? s.uf,
        fmtDay(s.first),
        fmtDay(s.last),
        daysBetween(s.first, s.last) ?? 0,
        s.count,
        s.km,
        // As cidades do estado inteiro, não só as do recorte da timeline: é a
        // ficha do estado, e ela não deve encolher quando a régua de datas anda.
        listarCidades(m.photos.filter((p) => p.uf === s.uf), 4)
      );
      return;
    }
  }

  nodes.dossier.textContent = S.dossier.all(
    fmtDate(m.span.first),
    fmtDate(m.span.last),
    daysBetween(m.span.first, m.span.last) ?? 0,
    m.counts.states,
    m.totalKm
  );
}

function renderTimeline(m) {
  const first = m.span.first ?? Date.UTC(m.year, 0, 1);
  const last = m.span.last ?? Date.UTC(m.year, 11, 31);
  state.timeStart = first;
  state.timeEnd = last;

  nodes.timeline.min = 0;
  nodes.timeline.max = 1000;
  nodes.timeline.value = 1000;

  // Label the range the archive actually covers. A fixed JAN–DEC ruler under a
  // slider that only spans July would misreport where the handle sits.
  nodes.timelineMonths.replaceChildren();
  const labels = [];
  const cursor = new Date(first);
  cursor.setDate(1);
  const end = new Date(last);
  while (cursor <= end && labels.length < 14) {
    labels.push(S.months[cursor.getMonth()]);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  // A single month gives nothing to space out; show the span's endpoints instead.
  const ticks = labels.length > 1 ? labels : [fmtDate(first), fmtDate(last)];
  for (const label of ticks) {
    const span = document.createElement('span');
    span.textContent = label;
    nodes.timelineMonths.append(span);
  }

  nodes.timeline.addEventListener('input', () => {
    const ratio = Number(nodes.timeline.value) / 1000;
    state.until = first + (last - first) * ratio;
    nodes.timelineFill.style.width = `${ratio * 100}%`;
    nodes.timelineDate.textContent = fmtDate(state.until);
    apply();
  });

  nodes.timelineDate.textContent = fmtDate(last);
}

// --- filter + render --------------------------------------------------------

function apply() {
  const m = state.manifest;

  state.visible = m.photos.filter((p) => {
    if (state.uf && p.uf !== state.uf) return false;
    if (p.t && p.t > state.until) return false;
    return true;
  });

  for (const chip of nodes.states.querySelectorAll('.chip')) {
    chip.setAttribute('aria-pressed', String(chip.dataset.uf === state.uf));
  }

  nodes.reset.hidden = state.uf === null && state.until >= state.timeEnd;

  renderDossier(m);
  nodes.status.textContent = S.count(state.visible.length, m.counts.photos);

  // Oldest first. This is a journey, not a feed: the grid has to open on the
  // first photo of the trip and walk forward, matching the trail on the map and
  // the order the arrow keys move through the lightbox.
  gallery.set(state.visible);
  map.setPhotos(state.visible, state.uf);

  if (!state.visible.length) renderEmpty(nodes.empty, 'noMatch');
  else nodes.empty.hidden = true;
}

function clearFilters() {
  state.uf = null;
  state.until = state.timeEnd;
  nodes.timeline.value = 1000;
  nodes.timelineFill.style.width = '100%';
  nodes.timelineDate.textContent = fmtDate(state.timeEnd);
  apply();
}
