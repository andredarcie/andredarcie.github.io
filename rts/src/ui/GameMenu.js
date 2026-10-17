import { DIFFICULTY } from '../config/rts.js';
import { SERTOES } from '../config/sertoes.js';

// As telas fora da partida: a de abertura (dificuldade e como jogar), a pausa
// (velocidade, recomeçar) e a de fim (quantas ondas a vila aguentou).
export class GameMenu {
  #root;
  #simulation;
  #onStart;
  #onPause;
  #onRestart;
  #level;
  #started = false;

  constructor({ root, level, simulation, onStart, onPause, onRestart }) {
    this.#root = root;
    this.#level = level;
    this.#simulation = simulation;
    this.#onStart = onStart;
    this.#onPause = onPause;
    this.#onRestart = onRestart;
    const $ = selector => root.querySelector(selector);
    this.#bindLevels($('#start-levels'), chosen => { this.#level = chosen; });
    this.#bindLevels($('#result-levels'), chosen => { this.#level = chosen; });
    $('#start-play').addEventListener('click', () => this.start());
    $('#pause-button').addEventListener('click', () => this.#pause());
    $('#pause-resume').addEventListener('click', () => this.#resume());
    $('#pause-restart').addEventListener('click', () => this.#onRestart(this.#level));
    $('#result-again').addEventListener('click', () => this.#onRestart(this.#level));
    $('#pause-dialog').addEventListener('cancel', event => {
      event.preventDefault();
      this.#resume();
    });
    // A abertura não fecha com Esc: sem escolher, não há partida.
    $('#start-dialog').addEventListener('cancel', event => event.preventDefault());
    $('#result-dialog').addEventListener('cancel', event => event.preventDefault());
    for (const button of root.querySelectorAll('#speed-options button')) {
      button.addEventListener('click', () => {
        this.#simulation.setSpeed(Number(button.dataset.speed));
        this.#markSpeed();
      });
    }
    window.addEventListener('keydown', event => {
      if (event.code !== 'Escape' && event.code !== 'KeyP') return;
      // Com o livro de história aberto o jogo já está parado, e o Esc fecha o livro.
      if (!this.#started || $('#result-dialog').open || $('#story-dialog').open) return;
      if ($('#pause-dialog').open) this.#resume();
      else this.#pause();
    });
    // Celular bloqueado, aba trocada: a partida pausa sozinha, para ninguém voltar e
    // achar a igreja caída.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.#started && !$('#result-dialog').open && !$('#pause-dialog').open && !$('#story-dialog').open) this.#pause();
    });
    this.#markSpeed();
    this.#markLevels();
    $('#start-epigraph').textContent = SERTOES.forte.text;
  }

  // A abertura: chamada só depois do carregamento, para não abrir por cima dele.
  open() {
    this.#root.querySelector('#start-dialog').showModal();
  }

  start() {
    const dialog = this.#root.querySelector('#start-dialog');
    if (dialog.open) dialog.close();
    this.#started = true;
    this.#onStart(this.#level);
  }

  // `waves`: ondas vencidas; `best`: o recorde nesta dificuldade (já contando esta).
  showResult({ waves, best, record }) {
    const $ = selector => this.#root.querySelector(selector);
    for (const dialog of this.#root.querySelectorAll('dialog[open]')) dialog.close();
    $('#result-kicker').textContent = 'A igreja caiu';
    const plural = waves === 1 ? 'onda' : 'ondas';
    $('#result-title').textContent = `${waves} ${plural}`;
    const held = `Belo Monte resistiu a ${waves} ${plural} do Exército.`;
    const level = DIFFICULTY[this.#level].label.toLowerCase();
    $('#result-text').textContent = record && waves > 0
      ? `Recorde novo no ${level}! ${held}`
      : `${held} Recorde no ${level}: ${best}.`;
    // O fecho do livro: a Canudos de verdade caiu em 5 de outubro de 1897.
    $('#result-quote').textContent = SERTOES.fim.text;
    $('#result-dialog').dataset.victory = String(record && waves > 0);
    this.#markLevels();
    $('#result-dialog').showModal();
  }

  #pause() {
    if (!this.#started) return;
    this.#onPause(true);
    this.#root.querySelector('#pause-dialog').showModal();
  }

  #resume() {
    const dialog = this.#root.querySelector('#pause-dialog');
    if (dialog.open) dialog.close();
    this.#onPause(false);
  }

  #bindLevels(container, onPick) {
    container.replaceChildren(...Object.entries(DIFFICULTY).map(([id, level]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'level';
      button.dataset.level = id;
      button.textContent = level.label;
      button.addEventListener('click', () => {
        onPick(id);
        this.#markLevels();
      });
      return button;
    }));
  }

  #markLevels() {
    for (const button of this.#root.querySelectorAll('button.level')) {
      button.setAttribute('aria-pressed', String(button.dataset.level === this.#level));
    }
  }

  #markSpeed() {
    for (const button of this.#root.querySelectorAll('#speed-options button')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === this.#simulation.speed));
    }
  }
}
