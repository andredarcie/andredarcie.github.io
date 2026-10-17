import { STORY } from '../config/story.js';

// Segundos de partida até o registro sobre Antônio Conselheiro se abrir: o
// primeiro (o que é Canudos) sai logo no começo, e este vem depois, para cada um
// ter a sua novidade.
const CONSELHEIRO_AFTER = 25;

// O livro de história: o botão do livro na barra de cima e o diário que ele abre.
// Ler é opcional. Quando um momento da partida libera um registro novo, o botão
// ganha um "!"; abrir o livro pausa o jogo (main.js consulta `isOpen`), mostra os
// registros do mais recente para o mais antigo e marca tudo como lido. Fechar
// devolve a partida de onde parou.
export class StoryBook {
  #root;
  #events;
  #button;
  #badge;
  #dialog;
  #list;
  #entries = [];
  #unread = 0;
  #playTime = 0;

  constructor({ root, events }) {
    this.#root = root;
    this.#events = events;
    this.#button = root.querySelector('#story-button');
    this.#badge = root.querySelector('#story-badge');
    this.#dialog = root.querySelector('#story-dialog');
    this.#list = root.querySelector('#story-list');
    this.#button.addEventListener('click', () => this.open());
    root.querySelector('#story-close').addEventListener('click', () => this.#dialog.close());
    this.#dialog.addEventListener('close', () => this.#markRead());
    events.on('waveStart', ({ number }) => { if (number === 1) this.unlock('uaua'); });
    events.on('waveCleared', ({ number }) => { if (number === 1) this.unlock('sertoes'); });
    // Os chefes chegam com os romeiros, um por vez.
    events.on('romeiros', ({ hero }) => { if (hero && STORY[hero]) this.unlock(hero); });
    this.#render();
  }

  get isOpen() {
    return this.#dialog.open;
  }

  // Começo da partida: o primeiro registro, o que foi Canudos.
  begin() {
    this.unlock('canudos');
  }

  // Tempo de jogo correndo (parado, pausado ou com o livro aberto não conta).
  update(dt) {
    this.#playTime += dt;
    if (this.#playTime >= CONSELHEIRO_AFTER) this.unlock('conselheiro');
  }

  unlock(id) {
    if (!STORY[id] || this.#entries.some(entry => entry.id === id)) return;
    this.#entries.unshift({ id, seen: false });
    this.#unread++;
    this.#render();
    this.#events.emit('storyEntry', { id });
  }

  open() {
    if (this.#dialog.open) return;
    this.#dialog.showModal();
    this.#events.emit('storyOpen');
    // O mais recente fica no alto: abre sempre do começo.
    this.#dialog.scrollTop = 0;
  }

  #markRead() {
    if (!this.#unread) return;
    for (const entry of this.#entries) entry.seen = true;
    this.#unread = 0;
    this.#render();
  }

  #render() {
    const fresh = this.#unread > 0;
    this.#badge.hidden = !fresh;
    this.#button.setAttribute('aria-label', fresh ? 'História: há registro novo' : 'História');
    this.#button.title = fresh ? 'História: há registro novo' : 'História';
    this.#list.replaceChildren(...this.#entries.map(entry => this.#article(entry)));
    this.#root.querySelector('#story-empty').hidden = this.#entries.length > 0;
  }

  // Um registro: data, título, a imagem (se tiver), o texto e o trecho do livro.
  #article({ id, seen }) {
    const story = STORY[id];
    const item = document.createElement('li');
    const article = document.createElement('article');
    article.className = 'story-entry';
    const head = document.createElement('header');
    const kicker = document.createElement('p');
    kicker.className = 'story-kicker';
    kicker.textContent = story.kicker;
    if (!seen) {
      const mark = document.createElement('span');
      mark.className = 'story-new';
      mark.textContent = 'Novo';
      kicker.append(mark);
    }
    const title = document.createElement('h3');
    title.textContent = story.title;
    head.append(kicker, title);
    article.append(head);
    if (story.image) {
      const figure = document.createElement('figure');
      figure.className = 'story-figure';
      const image = document.createElement('img');
      image.src = story.image;
      image.alt = story.imageAlt ?? '';
      image.loading = 'lazy';
      image.decoding = 'async';
      figure.append(image);
      article.append(figure);
    }
    for (const text of story.body) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      article.append(paragraph);
    }
    if (story.quote) {
      const figure = document.createElement('figure');
      figure.className = 'epigraph story-quote';
      const quote = document.createElement('blockquote');
      quote.textContent = story.quote.text;
      const caption = document.createElement('figcaption');
      caption.innerHTML = `Euclides da Cunha, <cite>Os Sertões</cite> · ${story.quote.part}`;
      figure.append(quote, caption);
      article.append(figure);
    }
    item.append(article);
    return item;
  }
}
