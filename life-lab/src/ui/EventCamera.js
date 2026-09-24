import { EVENT_CAM_SECONDS, EVENT_CAM_SPAN, EVENT_KIND_LABEL } from '../config/ui.js';

// Quando o bebê nasce durante a tomada do parto, o relógio volta para este ponto
// (fração já "gasta"): sobra tempo de ver o filhote se levantar.
const BIRTH_REPLAY_SHARE = .35;

// Câmera de acontecimentos: nascimento, morte e cabana pronta aparecem numa janela
// com zoom no canto. Um de cada vez: enquanto um está no ar, os que vierem são
// ignorados — no mesmo instante, vale o primeiro.
export class EventCamera {
  #state;
  #inset;
  #canvas;
  #panel;
  #viewport;
  #progress;
  #kindLabel;
  #text;
  #shot = null;

  constructor({ root, canvas, state, inset, events }) {
    this.#state = state;
    this.#inset = inset;
    this.#canvas = canvas;
    this.#panel = root.querySelector('#event-cam');
    this.#viewport = root.querySelector('#event-cam-view');
    this.#progress = root.querySelector('#event-cam-progress');
    this.#kindLabel = root.querySelector('#event-cam-kind');
    this.#text = root.querySelector('#event-cam-text');
    // O parto aparece desde o começo, acompanhando a mãe; quando o bebê nasce, a
    // mesma tomada troca a legenda, passa a seguir o filhote e ganha mais tempo no ar.
    events.on('labor', ({ mother }) =>
      this.#show('birth', `${mother.name} está em trabalho de parto`, mother.x, mother.y, mother, mother));
    events.on('birth', ({ mother, child, x, y }) => {
      const shot = this.#shot;
      if (shot && shot.laborOf === mother) {
        shot.follow = child;
        shot.started = performance.now() - EVENT_CAM_SECONDS * 1000 * BIRTH_REPLAY_SHARE;
        this.#text.textContent = `${mother.name} teve ${child.name}`;
        return;
      }
      this.#show('birth', `${mother.name} teve ${child.name}`, x, y, child);
    });
    events.on('death', ({ organism, cause }) =>
      this.#show('death', `${organism.name} morreu${cause ? ' ' + cause : ''}`, organism.x, organism.y));
    events.on('hutBuilt', ({ hut, builder }) =>
      this.#show('hut', `${builder.name} terminou a cabana`, hut.x, hut.y));
  }

  // Desenha a lupa por cima da cena já pronta. Devolve o retângulo usado, para a
  // sobreposição 2D não desenhar nomes e balões por cima dele.
  render() {
    const shot = this.#shot;
    if (!shot) return null;
    const age = (performance.now() - shot.started) / 1000;
    if (age >= EVENT_CAM_SECONDS) {
      this.#shot = null;
      this.#panel.hidden = true;
      return null;
    }
    // Nascimento acompanha o filhote andando; se ele morrer, a câmera fica onde estava.
    const follow = shot.follow;
    if (follow && this.#state.organisms.includes(follow)) {
      shot.x = follow.inHut && follow.hut ? follow.hut.x : follow.x;
      shot.y = follow.inHut && follow.hut ? follow.hut.y : follow.y;
    }
    this.#progress.style.transform = `scaleX(${1 - age / EVENT_CAM_SECONDS})`;
    const frame = this.#viewport.getBoundingClientRect();
    const stage = this.#canvas.getBoundingClientRect();
    const rect = {
      left: frame.left - stage.left, top: frame.top - stage.top,
      width: frame.width, height: frame.height
    };
    if (rect.width < 2 || rect.height < 2) return null;
    this.#inset.render({ x: shot.x, y: shot.y, span: EVENT_CAM_SPAN[shot.kind], rect });
    return rect;
  }

  #show(kind, text, x, y, follow = null, laborOf = null) {
    if (this.#shot) return;
    this.#shot = { kind, text, x, y, follow, laborOf, started: performance.now() };
    this.#inset.reset();
    this.#panel.dataset.kind = kind;
    this.#kindLabel.textContent = EVENT_KIND_LABEL[kind];
    this.#text.textContent = text;
    this.#panel.hidden = false;
  }
}
