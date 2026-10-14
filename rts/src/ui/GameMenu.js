import { AI_LEVELS } from '../config/rts.js';

// As telas fora da partida: a de abertura (dificuldade e como jogar), a pausa
// (velocidade, recomeçar) e a de fim (vitória ou derrota).
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
      if (!this.#started || $('#result-dialog').open) return;
      if ($('#pause-dialog').open) this.#resume();
      else this.#pause();
    });
    this.#markSpeed();
    this.#markLevels();
    $('#start-dialog').showModal();
  }

  start() {
    const dialog = this.#root.querySelector('#start-dialog');
    if (dialog.open) dialog.close();
    this.#started = true;
    this.#onStart(this.#level);
  }

  showResult(victory, { time }) {
    const $ = selector => this.#root.querySelector(selector);
    for (const dialog of this.#root.querySelectorAll('dialog[open]')) dialog.close();
    $('#result-title').textContent = victory ? 'Victory!' : 'Defeat';
    $('#result-kicker').textContent = victory ? 'The Red Tribe has fallen' : 'Your tribe has fallen';
    const minutes = Math.floor(time / 2 / 60), seconds = Math.floor(time / 2 % 60);
    $('#result-text').textContent = `Match time ${minutes}:${String(seconds).padStart(2, '0')} on ${AI_LEVELS[this.#level].label}.`;
    $('#result-dialog').dataset.victory = String(victory);
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
    container.replaceChildren(...Object.entries(AI_LEVELS).map(([id, level]) => {
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
