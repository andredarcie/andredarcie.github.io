import { UNIT_TYPES, CENTER } from '../config/rts.js';
import { icon } from './Icons.js';

// As cenas rápidas de história no começo e no fim de cada missão: personagens
// conversando, o mais perto possível de uma cena de filme.
//
// Tarjas de cinema entram deslizando em cima e embaixo; cada plano começa com a
// narração (o lugar e a data, o título e o que aconteceu, escrito à pena) e segue com
// as falas, uma de cada vez. Quem fala e está no mapa ganha a câmera, uma etiqueta
// com o nome em cima da cabeça e fala de verdade: a boca abre a cada sílaba, a
// cabeça acompanha, a mão gesticula — e quem está em volta se vira para ouvir. As
// palavras aparecem uma a uma, no ritmo da fala (as vírgulas e os pontos seguram), e
// cada sílaba soa como um murmúrio na altura da voz daquele personagem
// (AudioManager.syllable). Quem não está no mapa (um coronel, um governador) fala só
// na legenda. Fala registrada na época traz a fonte embaixo; as outras são
// imaginadas a partir dos documentos, e a legenda avisa.
//
// O plano pode trazer o seu elenco (`cast`: quem só existe na cena — o coronel a
// cavalo no alto do morro, o capitão holandês na trilha, a tropa chegando), que
// anda até `walk` enquanto o plano dura e sai do mapa quando a cena acaba; e pode
// passear a câmera (`pan`: de `at` até lá, devagar, enquanto a narração corre).
//
// Tocar no botão (ou na legenda, ou Enter, espaço, seta para a direita) com a fala
// ainda saindo mostra ela inteira; com ela inteira, segue. "Pular cena" (o botão
// grande no alto, ou Esc no teclado) vai direto ao fim: na abertura começa a missão;
// no fim, para nas escolhas.
// No fim da missão, a última fala ganha as escolhas (próxima missão, voltar). É um
// <dialog> modal: enquanto está aberto o jogo não anda nem recebe toque.
const FADE_MS = 240;
// Quanto a câmera se aproxima por segundo durante um plano.
const PUSH_IN = .014;
// Zoom (pixels por unidade do mundo) quando a câmera vai até quem fala.
const SPEAKER_ZOOM = 2.6;
// Altura da etiqueta acima do chão de quem fala (o boneco tem 16).
const TAG_LIFT = 24;
// O ritmo da fala: segundos por sílaba e as pausas da pontuação.
const SYLLABLE = .085;
const COMMA_PAUSE = .16;
const STOP_PAUSE = .36;
// A narração corre mais rápido que a fala (é lida, não dita).
const NARRATION_WORD = .045;
const NARRATION_CHAR = .011;
// Até onde, em volta de quem fala, a gente se vira para ouvir.
const LISTEN_RADIUS = 80;
// O elenco anda no passo de marcha (unidades do mundo por segundo) e a câmera leva
// este tempo, por padrão, para passear de `at` até `pan`.
const CAST_PACE = 26;
const PAN_SECONDS = 9;

// A altura da voz de cada personagem: sai do nome (sempre a mesma para o mesmo
// nome), grave ou aguda dentro de uma faixa de voz de homem; as mulheres mais agudas.
// Também usada pelas falas durante a partida (ui/MissionTalk.js).
export function voiceOf(name = '') {
  let hash = 7;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const female = /velha|mulher|liberta|moça/i.test(name);
  const base = female ? 1.38 : .84;
  return base + (Math.abs(hash) % 100) / 100 * .32;
}

// Quantas sílabas tem a palavra (grupos de vogal), entre 1 e 5.
export function syllables(word) {
  const groups = word.toLowerCase().match(/[aeiouáéíóúâêôãõày]+/g);
  return Math.max(1, Math.min(5, groups?.length ?? 1));
}

export class Cutscene {
  #dialog;
  #els;
  #view;
  #state;
  #audio;
  #factory;
  #cast = [];
  #staged = new Set();
  #pan = null;
  #beats = [];
  #index = -1;
  #shot = null;
  #speaker = null;
  #actors = new Set();
  #choices = null;
  #lastLabel = 'Continuar';
  #resolve = null;
  #fading = false;
  #typing = null;
  #still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor({ root, view, state, audio = null, factory = null }) {
    this.#view = view;
    this.#state = state;
    this.#audio = audio;
    this.#factory = factory;
    this.#dialog = root.querySelector('#cutscene');
    const $ = selector => root.querySelector(selector);
    this.#els = {
      kicker: $('#cut-kicker'), title: $('#cut-title'), text: $('#cut-text'), quote: $('#cut-quote'),
      quoteText: $('#cut-quote-text'), quoteCite: $('#cut-quote-cite'), actions: $('#cut-actions'), skip: $('#cut-skip'),
      speaker: $('#cut-speaker'), speakerIcon: $('#cut-speaker-icon'), speakerName: $('#cut-speaker-name'),
      line: $('#cut-line'), lineCite: $('#cut-line-cite'), tag: $('#cut-tag'), note: $('#cut-note'),
      caption: $('#cut-caption'), bottom: $('#cut-bottom')
    };
    this.#els.skip.addEventListener('click', () => this.#skip());
    this.#dialog.addEventListener('cancel', event => {
      event.preventDefault();
      this.#skip();
    });
    // O navegador pode fechar o diálogo sozinho (o Chrome fecha no segundo Esc sem
    // clique no meio, ignorando o cancelamento): a cena termina do mesmo jeito, em vez
    // de a missão ficar esperando para sempre.
    this.#dialog.addEventListener('close', () => {
      if (this.#resolve) this.#finish(this.#choices?.find(choice => choice.primary)?.id ?? null);
    });
    // Tocar na legenda também segue (no celular é o lugar natural do dedo).
    this.#els.bottom.addEventListener('click', event => {
      if (event.target.closest('button')) return;
      this.#advance();
    });
    window.addEventListener('keydown', event => {
      if (!this.#dialog.open) return;
      // Esc pula aqui mesmo (antes de virar o "cancel" do diálogo) e para por aqui: a
      // mesma tecla não chega ao menu, que abriria a pausa logo depois da cena.
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#skip();
        return;
      }
      // No botão em foco, o Enter e o espaço já viram o clique dele.
      if (event.target.closest?.('button')) return;
      if (['Enter', 'Space', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
        this.#advance();
      }
    }, { capture: true });
  }

  get isOpen() {
    return this.#dialog.open;
  }

  // Toca os planos; resolve com o id da escolha (no fim da missão) ou null.
  play(shots, { choices = null, lastLabel = 'Continuar' } = {}) {
    this.#beats = Cutscene.#toBeats(shots ?? []);
    this.#choices = choices;
    this.#lastLabel = lastLabel;
    this.#index = -1;
    this.#shot = null;
    if (!this.#beats.length && !choices) return Promise.resolve(null);
    // A cena só tem falas imaginadas se alguma fala não traz a fonte.
    this.#els.note.hidden = !this.#beats.some(beat => beat.line && !beat.line.cite);
    return new Promise(resolve => {
      this.#resolve = resolve;
      document.body.classList.add('cutscene-on');
      this.#dialog.showModal();
      this.#advance();
    });
  }

  // Cada plano vira os seus passos: a narração (se há) e depois cada fala.
  static #toBeats(shots) {
    const beats = [];
    for (const shot of shots) {
      if (shot.text || shot.quote || !shot.lines?.length) beats.push({ shot, line: null });
      for (const line of shot.lines ?? []) beats.push({ shot, line });
    }
    return beats;
  }

  // A cada quadro (tempo real): a câmera se aproxima, as palavras saem, os bonecos
  // falam e ouvem, e a etiqueta acompanha quem fala.
  update(dt) {
    if (!this.#dialog.open) return;
    if (!this.#fading) {
      this.#view.camera.zoomBy(1 + PUSH_IN * dt);
      this.#type(dt);
      this.#glide(dt);
    }
    this.#walk(dt);
    this.#animate(dt);
    this.#placeTag();
  }

  // Seguir: com a fala ainda saindo, mostra ela inteira; senão, o próximo passo.
  #advance() {
    if (this.#fading) return;
    if (this.#typing) {
      this.#finishTyping();
      return;
    }
    if (this.#index >= this.#beats.length - 1) {
      if (!this.#choices) this.#finish(null);
      return;
    }
    this.#index++;
    this.#show(this.#beats[this.#index]);
  }

  // Pular: sem escolhas, acaba já; com escolhas, vai ao último passo (onde elas estão).
  #skip() {
    if (!this.#choices) {
      this.#finish(null);
      return;
    }
    if (this.#index < this.#beats.length - 1) {
      this.#typing = null;
      this.#index = this.#beats.length - 2;
      this.#advance();
    } else if (this.#typing) this.#finishTyping();
  }

  // Plano novo: escurece, vira a página e corta. Fala nova no mesmo plano: corta
  // direto para quem fala.
  #show(beat) {
    const newShot = beat.shot !== this.#shot;
    this.#shot = beat.shot;
    if (newShot) this.#stage(beat.shot);
    const speaker = beat.line?.unit ? this.#find(beat.line.unit, beat.shot.at) : null;
    const apply = () => {
      const camera = this.#view.camera;
      const target = speaker ?? (newShot ? beat.shot.at : null);
      if (target) {
        camera.zoomToPixels(speaker ? Math.max(SPEAKER_ZOOM, beat.shot.zoom ?? 0) : beat.shot.zoom ?? 1.5);
        camera.centerOn(target.x, target.y, innerWidth / 2, innerHeight * .42);
      }
      this.#speaker = speaker;
      if (speaker) this.#gather(speaker);
      // O passeio da câmera só corre na narração (com alguém falando, ela fica nele).
      if (newShot) this.#pan = beat.shot.pan ? { from: beat.shot.at, to: beat.shot.pan, t: 0, span: beat.shot.panTime ?? PAN_SECONDS } : null;
      this.#fill(beat);
    };
    if (!newShot) {
      apply();
      return;
    }
    this.#fading = true;
    this.#dialog.classList.add('cut-dark');
    this.#audio?.cue();
    setTimeout(() => {
      apply();
      this.#dialog.classList.remove('cut-dark');
      this.#fading = false;
    }, FADE_MS);
  }

  // ---- O elenco e o passeio ----

  // Põe no mapa o elenco do plano (uma vez por plano): cada um no lugar, virado para
  // onde vai andar (ou para o meio), com a marca que as falas procuram.
  #stage(shot) {
    if (!this.#factory || !shot.cast || this.#staged.has(shot)) return;
    this.#staged.add(shot);
    for (const actor of shot.cast) {
      const count = actor.count ?? 1;
      for (let i = 0; i < count; i++) {
        const x = actor.x + (count > 1 ? (Math.random() - .5) * (actor.spread ?? 30) : 0);
        const y = actor.y + (count > 1 ? (Math.random() - .5) * (actor.spread ?? 30) : 0);
        const toward = actor.walk ?? actor.face ?? CENTER;
        const unit = this.#factory.create(actor.team ?? 'enemy', actor.type, x, y, Math.atan2(toward.y - y, toward.x - x));
        unit.tag = actor.tag ?? null;
        unit.post = { x, y };
        unit.cast = true;
        unit.asleep = Boolean(actor.asleep);
        if (actor.walk) unit.walkTo = { x: actor.walk.x + x - actor.x, y: actor.walk.y + y - actor.y };
        this.#state.organisms.push(unit);
        this.#cast.push(unit);
      }
    }
  }

  // O elenco anda até o ponto dele, com a passada de verdade (gait e speed são o que
  // o boneco lê para mexer as pernas).
  #walk(dt) {
    for (const u of this.#cast) {
      const to = u.walkTo;
      if (!to) continue;
      const dx = to.x - u.x, dy = to.y - u.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 2) {
        u.walkTo = null;
        u.speed = 0;
        continue;
      }
      const step = Math.min(distance, CAST_PACE * dt);
      u.x += dx / distance * step;
      u.y += dy / distance * step;
      u.heading = Math.atan2(dy, dx);
      u.speed = CAST_PACE;
      u.gait += CAST_PACE * dt * .17;
    }
  }

  // A câmera passeia de `at` até `pan`, com saída e chegada macias.
  #glide(dt) {
    const pan = this.#pan;
    if (!pan || this.#speaker || pan.t >= 1) return;
    pan.t = Math.min(1, pan.t + dt / pan.span);
    const k = pan.t * pan.t * (3 - 2 * pan.t);
    this.#view.camera.centerOn(pan.from.x + (pan.to.x - pan.from.x) * k, pan.from.y + (pan.to.y - pan.from.y) * k,
      innerWidth / 2, innerHeight * .42);
  }

  // Quem fala no mapa: a unidade viva com essa marca ou desse tipo, a mais perto do
  // lugar do plano.
  #find(key, near) {
    let best = null, bestDistance = Infinity;
    for (const u of this.#state.organisms) {
      if (u.life <= 0 || (u.tag !== key && u.type !== key)) continue;
      const distance = near ? Math.hypot(u.x - near.x, u.y - near.y) : 0;
      if (distance < bestDistance) { best = u; bestDistance = distance; }
    }
    return best;
  }

  // Em volta de quem fala, a gente do mesmo lado se vira para ouvir; e quem fala se
  // vira para o ouvinte mais perto (ou para quem falou antes dele).
  #gather(speaker) {
    let nearest = null, nearestDistance = Infinity;
    for (const u of this.#state.organisms) {
      if (u === speaker || u.life <= 0 || u.team !== speaker.team) continue;
      const distance = Math.hypot(u.x - speaker.x, u.y - speaker.y);
      if (distance > LISTEN_RADIUS) continue;
      u.heading = Math.atan2(speaker.y - u.y, speaker.x - u.x);
      if (this.#actors.has(u) || distance < nearestDistance) {
        nearest = u;
        nearestDistance = this.#actors.has(u) ? -1 : distance;
      }
    }
    if (nearest) speaker.heading = Math.atan2(nearest.y - speaker.y, nearest.x - speaker.x);
    this.#actors.add(speaker);
    speaker.talking = 1;
  }

  #fill({ shot, line }) {
    const els = this.#els;
    els.kicker.textContent = shot.kicker ?? '';
    // A legenda entra de novo a cada passo, com um deslize curto.
    els.caption.classList.remove('cut-enter');
    void els.caption.offsetWidth;
    els.caption.classList.add('cut-enter');
    // A narração: título, texto (escrito à pena) e, no fim, a citação do plano.
    els.title.hidden = Boolean(line);
    els.text.hidden = Boolean(line) || !shot.text;
    els.quote.hidden = true;
    els.title.textContent = shot.title ?? '';
    if (shot.quote) {
      els.quoteText.textContent = shot.quote.text;
      els.quoteCite.innerHTML = shot.quote.cite ?? '';
    }
    // A fala: quem, o ícone dele, o que diz (saindo palavra por palavra) e, se
    // registrada, a fonte (no fim).
    els.speaker.hidden = !line;
    els.line.hidden = !line;
    els.lineCite.hidden = true;
    if (line) {
      els.speakerName.textContent = line.who ?? '';
      const glyph = this.#speaker ? UNIT_TYPES[this.#speaker.type]?.icon : null;
      els.speakerIcon.innerHTML = glyph ? icon(glyph) : '';
      els.speakerIcon.hidden = !glyph;
      els.line.dataset.recorded = String(Boolean(line.cite));
      if (line.cite) els.lineCite.innerHTML = `Palavras registradas · ${line.cite}`;
      els.tag.textContent = line.who ?? '';
      this.#startTyping(els.line, line.text, { voice: voiceOf(line.who), speaking: true });
    } else if (shot.text) {
      this.#startTyping(els.text, shot.text, { voice: null, speaking: false });
    } else {
      els.text.textContent = '';
      this.#typing = null;
      this.#done();
    }
    this.#renderActions();
  }

  // ---- As palavras saindo ----

  // Cada palavra vira um pedaço escondido; os espaços ficam entre eles, para a linha
  // quebrar no lugar certo desde o começo (sem o texto pular de linha enquanto sai).
  #startTyping(element, text, { voice, speaking }) {
    element.replaceChildren();
    const words = [];
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        element.append(part);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = part;
      element.append(span);
      words.push(span);
    }
    this.#typing = { words, index: -1, clock: 0, length: 0, beats: [], voice, speaking };
    if (this.#still) this.#finishTyping();
    else this.#nextWord();
  }

  // A próxima palavra: aparece, e as sílabas dela ficam marcadas no tempo (na fala)
  // ou a pena risca (na narração). A pontuação no fim segura um pouco mais.
  #nextWord() {
    const typing = this.#typing;
    typing.index++;
    const span = typing.words[typing.index];
    if (!span) {
      this.#finishTyping();
      return;
    }
    span.classList.add('on');
    const word = span.textContent;
    const bare = word.replace(/["“”'»«)(\]\[]/g, '');
    const pause = /[.!?…]$/.test(bare) ? STOP_PAUSE : /[,;:—–-]$/.test(bare) ? COMMA_PAUSE : 0;
    typing.clock = 0;
    if (typing.speaking) {
      const count = syllables(word);
      typing.beats = Array.from({ length: count }, (_, k) => k * SYLLABLE);
      typing.length = count * SYLLABLE + pause;
    } else {
      typing.beats = typing.index % 2 === 0 ? [0] : [];
      typing.length = NARRATION_WORD + word.length * NARRATION_CHAR + pause * .6;
    }
  }

  #type(dt) {
    const typing = this.#typing;
    if (!typing) return;
    typing.clock += dt;
    while (typing.beats.length && typing.beats[0] <= typing.clock) {
      typing.beats.shift();
      if (typing.speaking) {
        this.#audio?.syllable(typing.voice);
        if (this.#speaker) this.#speaker.talkOpen = 1;
      } else this.#audio?.quill();
    }
    if (typing.clock >= typing.length) this.#nextWord();
  }

  #finishTyping() {
    const typing = this.#typing;
    if (typing) for (const span of typing.words) span.classList.add('on');
    this.#typing = null;
    this.#done();
  }

  // A fala (ou a narração) inteira na tela: a fonte, a citação e as escolhas aparecem.
  #done() {
    const beat = this.#beats[this.#index];
    if (!beat) return;
    if (beat.line) this.#els.lineCite.hidden = !beat.line.cite;
    else this.#els.quote.hidden = !beat.shot.quote;
    this.#renderActions();
  }

  // ---- Os bonecos falando ----

  // Quem fala gesticula com força enquanto as palavras saem e vai sossegando depois;
  // a boca fecha entre uma sílaba e outra.
  #animate(dt) {
    for (const u of this.#actors) {
      u.talkTime = (u.talkTime ?? 0) + dt;
      u.talkOpen = Math.max(0, (u.talkOpen ?? 0) - dt * 9);
      const target = u === this.#speaker ? (this.#typing ? 1 : .35) : 0;
      u.talking = target > (u.talking ?? 0) ? target : Math.max(target, (u.talking ?? 0) - dt * 1.2);
    }
  }

  // A etiqueta com o nome em cima de quem fala (some se ele não está no mapa).
  #placeTag() {
    const tag = this.#els.tag;
    const u = this.#speaker;
    if (!u || this.#fading || u.life <= 0) {
      tag.hidden = true;
      return;
    }
    const point = this.#view.camera.project(u.x, u.y, TAG_LIFT);
    tag.hidden = false;
    tag.classList.toggle('speaking', Boolean(this.#typing));
    tag.style.transform = `translate(${Math.round(point.x)}px, ${Math.round(point.y)}px) translate(-50%, -100%)`;
  }

  // O botão de seguir; no último passo do fim da missão, com a fala inteira, as escolhas.
  #renderActions() {
    const actions = this.#els.actions;
    const last = this.#index === this.#beats.length - 1;
    const button = (label, onClick, primary = true) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = primary ? 'primary' : 'secondary';
      element.textContent = label;
      element.addEventListener('click', onClick);
      return element;
    };
    if (last && this.#choices && !this.#typing) {
      actions.replaceChildren(...this.#choices.map(choice => button(choice.label, () => this.#finish(choice.id), choice.primary)));
      this.#els.skip.hidden = true;
    } else {
      actions.replaceChildren(button(last && !this.#choices ? this.#lastLabel : 'Continuar ›', () => this.#advance()));
      this.#els.skip.hidden = false;
    }
    actions.querySelector('button')?.focus();
  }

  #finish(choice) {
    if (this.#dialog.open) this.#dialog.close();
    document.body.classList.remove('cutscene-on');
    this.#typing = null;
    this.#speaker = null;
    for (const u of this.#actors) {
      u.talking = 0;
      u.talkOpen = 0;
    }
    this.#actors.clear();
    // O elenco da cena sai do mapa.
    if (this.#cast.length) {
      const cast = new Set(this.#cast);
      this.#state.organisms = this.#state.organisms.filter(u => !cast.has(u));
      this.#cast = [];
    }
    this.#staged.clear();
    this.#pan = null;
    this.#els.tag.hidden = true;
    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.(choice);
  }
}
