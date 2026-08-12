// The grid. Thousands of tiles have to scroll without stutter, so tiles mount
// lazily through an IntersectionObserver and images decode off the main thread.

import { thumbUrl } from './config.js';
import { S, fmtDay, fmtNum } from './strings.js';
import { listarCidades } from './lugares.js';

const CHUNK = 120;
const SEMANA_MS = 7 * 86400000;

export class Gallery {
  constructor(node, { onOpen, onMark }) {
    this.node = node;
    this.onOpen = onOpen;
    this.onMark = onMark;
    this.photos = [];
    this.rendered = 0;
    this.selected = new Set();

    // 'browse' opens the lightbox; 'mark' toggles a photo for culling. Marks are
    // held here rather than on the tiles, because the grid re-renders on every
    // filter change and would otherwise forget them.
    this.mode = 'browse';
    this.marked = new Set();

    // uf -> instante da primeira foto naquele estado. Vem do manifesto, não do
    // conjunto filtrado: assim a "Semana 2" continua sendo a segunda semana na
    // Bahia mesmo que a timeline esconda a primeira.
    this.inicioDoEstado = new Map();

    // Fade each thumbnail in only once it is actually on screen.
    this.io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target;
          this.io.unobserve(img);
          img.src = img.dataset.src;
        }
      },
      { rootMargin: '400px 0px' }
    );

    // Grow the grid as the reader reaches the bottom.
    this.sentinel = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) this.more();
    });

    this.tail = document.createElement('div');
  }

  /** Âncoras das semanas, vindas do manifesto. */
  setStates(states) {
    this.inicioDoEstado = new Map(states.map((s) => [s.uf, s.first]));
    this.nomeDoEstado = new Map(states.map((s) => [s.uf, s.nome ?? s.uf]));
  }

  /**
   * Em qual semana do estado esta foto cai. Blocos corridos de 7 dias a partir
   * da primeira foto no estado — não semana do calendário, que quebraria uma
   * estadia no meio só porque virou domingo.
   */
  semanaDe(p) {
    const inicio = this.inicioDoEstado.get(p.uf);
    if (!p.uf || !p.t || !inicio) return null;
    return Math.floor((p.t - inicio) / SEMANA_MS) + 1;
  }

  chaveDe(p) {
    const semana = this.semanaDe(p);
    return semana === null ? 'sem-lugar' : `${p.uf}|${semana}`;
  }

  set(photos) {
    this.photos = photos;
    this.rendered = 0;
    this.chaveAtual = null;
    this.node.replaceChildren();
    this.sentinel.disconnect();
    this.more();
  }

  more() {
    const slice = this.photos.slice(this.rendered, this.rendered + CHUNK);
    if (!slice.length) return;

    const frag = document.createDocumentFragment();
    for (const p of slice) {
      // O cabeçalho entra na mesma grade, ocupando a linha inteira. `chaveAtual`
      // atravessa os lotes, senão cada bloco de 120 repetiria o título.
      const chave = this.chaveDe(p);
      if (chave !== this.chaveAtual) {
        this.chaveAtual = chave;
        frag.append(this.cabecalho(p, chave));
      }
      frag.append(this.tile(p));
    }
    this.node.append(frag);
    this.rendered += slice.length;

    if (this.rendered < this.photos.length) {
      this.node.append(this.tail);
      this.sentinel.observe(this.tail);
    } else {
      this.tail.remove();
      this.sentinel.disconnect();
    }
  }

  /** Faixa de abertura da semana, largura total da grade. */
  cabecalho(primeira, chave) {
    const bloco = this.photos.filter((p) => this.chaveDe(p) === chave);
    const datas = bloco.map((p) => p.t).filter(Boolean);

    const head = document.createElement('h2');
    head.className = 'semana';

    const titulo = document.createElement('span');
    titulo.className = 'semana__n';
    const semana = this.semanaDe(primeira);
    titulo.textContent = semana === null ? S.semana.semLugar : S.semana.titulo(semana);

    const onde = document.createElement('span');
    onde.className = 'semana__onde';
    onde.textContent = this.nomeDoEstado.get(primeira.uf) ?? '';

    // Onde exatamente, dentro do estado. É a informação que faltava para uma
    // semana ser distinguível da seguinte: "Pernambuco" se repete por cinco
    // semanas seguidas, "Recife, Olinda" e depois "Ipojuca" não.
    const cidades = document.createElement('span');
    cidades.className = 'semana__cidades';
    cidades.textContent = listarCidades(bloco, 3);

    const meta = document.createElement('span');
    meta.className = 'semana__meta';
    meta.textContent = datas.length
      ? `${fmtDay(Math.min(...datas))} – ${fmtDay(Math.max(...datas))} · ${fmtNum(bloco.length)} ${bloco.length === 1 ? 'foto' : 'fotos'}`
      : `${fmtNum(bloco.length)} fotos`;

    head.append(titulo, onde);
    if (cidades.textContent) head.append(cidades);
    head.append(meta);
    return head;
  }

  tile(p) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.id = p.id;
    if (this.selected.has(p.id)) btn.classList.add('tile--on');

    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.src = thumbUrl(p);
    if (p.w && p.h) {
      img.width = p.w;
      img.height = p.h;
    }
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', () => btn.classList.add('tile--broken'), { once: true });
    this.io.observe(img);

    const badge = document.createElement('span');
    badge.className = 'tile__badge';
    badge.textContent = [p.uf, fmtDay(p.t)].filter(Boolean).join(' · ');

    btn.append(img, badge);
    if (this.marked.has(p.id)) btn.classList.add('tile--doomed');

    btn.addEventListener('click', () => {
      if (this.mode !== 'mark') {
        this.onOpen?.(p.id);
        return;
      }
      if (this.marked.has(p.id)) this.marked.delete(p.id);
      else this.marked.add(p.id);
      btn.classList.toggle('tile--doomed', this.marked.has(p.id));
      this.onMark?.(this.markedPhotos());
    });
    return btn;
  }

  setMode(mode) {
    this.mode = mode;
    this.node.classList.toggle('grid--marking', mode === 'mark');
  }

  /** Marked photos, in the order they appear in the archive, not click order. */
  markedPhotos() {
    return this.photos.filter((p) => this.marked.has(p.id));
  }

  clearMarks() {
    this.marked.clear();
    for (const tile of this.node.querySelectorAll('.tile--doomed')) {
      tile.classList.remove('tile--doomed');
    }
    this.onMark?.([]);
  }

  /** Highlight a subset without re-rendering the whole grid. */
  highlight(ids) {
    this.selected = new Set(ids);
    for (const tile of this.node.querySelectorAll('.tile')) {
      tile.classList.toggle('tile--on', this.selected.has(tile.dataset.id));
    }
    const first = this.node.querySelector('.tile--on');
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

export function renderEmpty(node, kind) {
  const copy = S[kind] ?? S.noMatch;
  node.replaceChildren();
  const title = document.createElement('p');
  title.textContent = copy.title;
  node.append(title);

  for (const cmd of copy.steps ?? []) {
    const code = document.createElement('code');
    code.textContent = cmd;
    node.append(code, document.createElement('br'));
  }

  if (copy.hint) {
    const hint = document.createElement('p');
    hint.textContent = copy.hint;
    node.append(hint);
  }
  node.hidden = false;
}
