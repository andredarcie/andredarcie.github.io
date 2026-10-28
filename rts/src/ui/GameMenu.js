import { DIFFICULTY } from '../config/rts.js';
import { QUOTES } from '../config/story.js';
import { STAGES, STAGE, unlockedStage } from '../config/campaign.js';
import { MISSION } from '../config/mission.js';


// As telas fora da partida (o menu das eras é src/boot/eras.js, que roda antes do
// jogo existir): a abertura da era (as 4 missões da campanha, a dificuldade e como
// jogar), a pausa (velocidade, recomeçar) e a de derrota. A vitória é a cena de fim
// da missão (Cutscene), que leva à próxima.
export class GameMenu {
  #root;
  #simulation;
  #onStart;
  #onPause;
  #onRestart;
  #onPickStage;
  #level;
  #stage = STAGE;
  #started = false;

  constructor({ root, level, simulation, onStart, onPause, onRestart, onPickStage }) {
    this.#root = root;
    this.#level = level;
    this.#simulation = simulation;
    this.#onStart = onStart;
    this.#onPause = onPause;
    this.#onRestart = onRestart;
    this.#onPickStage = onPickStage;
    const $ = selector => root.querySelector(selector);
    this.#bindLevels($('#start-levels'), chosen => { this.#level = chosen; });
    this.#bindLevels($('#result-levels'), chosen => { this.#level = chosen; });
    // A missão aberta pelo endereço, se já liberada; senão, a mais adiantada liberada.
    if (this.#stage > unlockedStage()) this.#stage = unlockedStage();
    this.#renderStages();
    $('#start-play').addEventListener('click', () => this.start());
    $('#pause-button').addEventListener('click', () => this.#pause());
    $('#pause-resume').addEventListener('click', () => this.#resume());
    $('#pause-restart').addEventListener('click', () => this.#onRestart(this.#level));
    $('#result-again').addEventListener('click', () => this.#onRestart(this.#level));
    // De volta à abertura da era, com a lista de missões.
    $('#result-menu').addEventListener('click', () => { location.search = `?missao=${MISSION}&fase=${STAGE}`; });
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
      if (!this.#started || $('#result-dialog').open || $('#story-dialog').open || $('#cutscene').open) return;
      if ($('#pause-dialog').open) this.#resume();
      else this.#pause();
    });
    // Celular bloqueado, aba trocada: a partida pausa sozinha, para ninguém voltar e
    // achar a igreja caída.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.#started && !$('#result-dialog').open && !$('#pause-dialog').open && !$('#story-dialog').open &&
        !$('#cutscene').open) this.#pause();
    });
    this.#markSpeed();
    this.#markLevels();
    $('#start-epigraph').textContent = QUOTES.start.text;
    $('#start-epigraph-cite').innerHTML = QUOTES.start.cite;
    $('#result-quote-cite').innerHTML = QUOTES.end.cite;
    // Voltar às eras é voltar à página sem era: o menu leve, sem o jogo.
    $('#start-eras').addEventListener('click', () => { location.search = ''; });
  }

  // A abertura: chamada só depois do carregamento, para não abrir por cima dele.
  open() {
    this.#root.querySelector('#start-dialog').showModal();
  }

  // Jogar: a missão escolhida, se é a que está carregada; senão a página recarrega
  // com ela (o mundo inteiro é montado para uma missão só).
  start() {
    if (this.#stage !== STAGE) {
      this.#onPickStage(this.#stage, this.#level);
      return;
    }
    const dialog = this.#root.querySelector('#start-dialog');
    if (dialog.open) dialog.close();
    this.#started = true;
    this.#onStart(this.#level);
  }

  // A derrota: o que caiu e a citação de fecho da era; jogar de novo é a mesma missão.
  showResult({ title, text }) {
    const $ = selector => this.#root.querySelector(selector);
    for (const dialog of this.#root.querySelectorAll('dialog[open]')) dialog.close();
    const mission = STAGES[STAGE - 1];
    $('#result-kicker').textContent = `Missão ${mission.number} · ${mission.title}`;
    $('#result-title').textContent = title;
    $('#result-text').textContent = text;
    $('#result-quote').textContent = QUOTES.end.text;
    $('#result-dialog').dataset.victory = 'false';
    this.#markLevels();
    $('#result-dialog').showModal();
  }

  // As 4 missões da campanha: número, nome, ano e o resumo da escolhida; as que ainda
  // não foram liberadas aparecem trancadas.
  #renderStages() {
    const list = this.#root.querySelector('#start-missions');
    const unlocked = unlockedStage();
    list.replaceChildren(...STAGES.map(mission => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mission';
      const locked = mission.number > unlocked;
      button.disabled = locked;
      button.setAttribute('aria-pressed', String(mission.number === this.#stage));
      button.innerHTML = `<span class="mission-number">${mission.number}</span><span class="mission-name"></span>` +
        `<span class="mission-year"></span>${locked ? '<span class="mission-lock">trancada</span>' : ''}`;
      button.querySelector('.mission-name').textContent = mission.title + (mission.kind === 'defense' ? ' · defesa' : '');
      button.querySelector('.mission-year').textContent = mission.year;
      button.addEventListener('click', () => {
        this.#stage = mission.number;
        this.#renderStages();
      });
      item.append(button);
      return item;
    }));
    const chosen = STAGES[this.#stage - 1];
    this.#root.querySelector('#start-mission-summary').textContent = chosen.summary;
    this.#root.querySelector('#start-play').textContent = `Jogar a missão ${chosen.number}`;
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
