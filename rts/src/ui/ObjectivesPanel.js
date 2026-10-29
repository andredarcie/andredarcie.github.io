// O painel dos objetivos da missão, embaixo da barra de cima: o nome da missão, a
// lista (o da vez em destaque, com o andamento; os cumpridos riscados) e a dica do
// objetivo da vez. Pisca quando um objetivo se abre ou se cumpre; com o prazo nos
// últimos 30 segundos, fica em vermelho pulsando. Tocar no título recolhe e abre o
// painel.
const REFRESH = .25;

export class ObjectivesPanel {
  #el;
  #list;
  #hint;
  #mission;
  #timer = 0;
  #signature = '';

  constructor({ root, mission, events }) {
    this.#mission = mission;
    this.#el = root.querySelector('#objectives');
    this.#list = root.querySelector('#objectives-list');
    this.#hint = root.querySelector('#objectives-hint');
    const info = mission.mission;
    root.querySelector('#objectives-title').textContent = `Missão ${info.number} · ${info.title}`;
    root.querySelector('#objectives-toggle').addEventListener('click', () => {
      const collapsed = this.#el.classList.toggle('collapsed');
      root.querySelector('#objectives-toggle').setAttribute('aria-expanded', String(!collapsed));
    });
    const flash = () => {
      this.#el.classList.remove('flash');
      // (força o navegador a reiniciar a animação)
      void this.#el.offsetWidth;
      this.#el.classList.add('flash');
      this.#signature = '';
    };
    events.on('objectiveNew', flash);
    events.on('objectiveDone', flash);
  }

  show() {
    this.#el.hidden = false;
    this.#render();
  }

  hide() {
    this.#el.hidden = true;
  }

  update(dt) {
    if (this.#el.hidden) return;
    this.#timer -= dt;
    if (this.#timer > 0) return;
    this.#timer = REFRESH;
    this.#render();
  }

  #render() {
    const items = this.#mission.objectives();
    this.#el.classList.toggle('urgent', items.some(item => item.urgent));
    const signature = items.map(item => `${item.done}|${item.current}|${item.progress}|${item.urgent}`).join(';');
    if (signature === this.#signature) return;
    this.#signature = signature;
    this.#list.replaceChildren(...items.map(item => {
      const li = document.createElement('li');
      li.dataset.state = item.done ? 'done' : item.current ? 'current' : 'open';
      if (item.urgent) li.dataset.urgent = 'true';
      const text = document.createElement('span');
      text.textContent = item.text;
      li.append(text);
      if (item.progress) {
        const progress = document.createElement('b');
        progress.textContent = item.progress;
        li.append(progress);
      }
      return li;
    }));
    const current = items.find(item => item.current && item.hint);
    this.#hint.textContent = current?.hint ?? '';
    this.#hint.hidden = !current;
  }
}
