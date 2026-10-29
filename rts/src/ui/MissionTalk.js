import { UNIT_TYPES } from '../config/rts.js';
import { icon } from './Icons.js';
import { voiceOf, syllables } from './Cutscene.js';

// As falas durante a partida (ação `say` da missão, MissionDirector → 'missionSay'):
// a história continua contada enquanto se joga, sem parar o jogo. Uma fala por vez,
// numa faixa acima do painel de baixo: quem fala (com o ícone, se está no mapa) e o
// que diz, saindo palavra por palavra no ritmo da voz, com o murmúrio de cada sílaba
// (o mesmo das cenas, ui/Cutscene.js). O boneco de quem fala mexe a boca e
// gesticula. Fala com `cite` foi registrada na época e traz a fonte; as outras são
// imaginadas a partir dos documentos, como nas cenas. "Ver" leva a câmera até quem
// fala (quando ele está no mapa).
const SYLLABLE = .085;
const COMMA_PAUSE = .16;
const STOP_PAUSE = .36;
// Depois da fala inteira, quanto tempo ela fica para ser lida (mais as palavras).
const HOLD = 1.8;
const HOLD_PER_WORD = .16;

export class MissionTalk {
  #el;
  #icon;
  #name;
  #line;
  #cite;
  #state;
  #audio;
  #look;
  #focus;
  #queue = [];
  #current = null;

  constructor({ root, state, events, audio = null, focus = null }) {
    this.#state = state;
    this.#audio = audio;
    this.#focus = focus;
    this.#look = root.querySelector('#talk-look');
    this.#look.addEventListener('click', event => {
      event.stopPropagation();
      const speaker = this.#current?.speaker;
      if (speaker && speaker.life > 0) this.#focus?.(speaker.x, speaker.y);
    });
    this.#el = root.querySelector('#talk');
    this.#icon = root.querySelector('#talk-icon');
    this.#name = root.querySelector('#talk-name');
    this.#line = root.querySelector('#talk-line');
    this.#cite = root.querySelector('#talk-cite');
    events.on('missionSay', ({ lines }) => {
      this.#queue.push(...lines);
      if (!this.#current) this.#next();
    });
    // Tocar na faixa pula para a próxima fala.
    this.#el.addEventListener('click', () => {
      if (!this.#current) return;
      if (this.#current.index < this.#current.words.length - 1) this.#reveal();
      else this.#next();
    });
  }

  clear() {
    this.#queue = [];
    this.#stopSpeaker();
    this.#current = null;
    this.#el.hidden = true;
  }

  update(dt) {
    const current = this.#current;
    if (!current) return;
    const speaker = current.speaker;
    if (speaker) {
      speaker.talkTime = (speaker.talkTime ?? 0) + dt;
      speaker.talkOpen = Math.max(0, (speaker.talkOpen ?? 0) - dt * 9);
    }
    current.clock += dt;
    while (current.beats.length && current.beats[0] <= current.clock) {
      current.beats.shift();
      this.#audio?.syllable(current.voice);
      if (speaker) speaker.talkOpen = 1;
    }
    if (current.index < current.words.length - 1) {
      if (current.clock >= current.length) this.#nextWord();
      return;
    }
    // Fala inteira: o gesto sossega e, lida, dá a vez à próxima.
    if (speaker) speaker.talking = Math.max(.35, (speaker.talking ?? 0) - dt * 1.2);
    current.hold -= dt;
    if (current.hold <= 0) this.#next();
  }

  #next() {
    this.#stopSpeaker();
    const line = this.#queue.shift();
    if (!line) {
      this.#current = null;
      this.#el.hidden = true;
      return;
    }
    const speaker = line.unit ? this.#find(line.unit) : null;
    const glyph = speaker ? UNIT_TYPES[speaker.type]?.icon : null;
    this.#icon.innerHTML = glyph ? icon(glyph) : '';
    this.#icon.hidden = !glyph;
    this.#look.hidden = !speaker || !this.#focus;
    this.#name.textContent = line.who ?? '';
    this.#line.dataset.recorded = String(Boolean(line.cite));
    this.#cite.hidden = true;
    this.#cite.innerHTML = line.cite ? `Palavras registradas · ${line.cite}` : '';
    // Cada palavra num pedaço escondido; os espaços ficam entre eles, para a linha
    // quebrar no lugar certo desde o começo.
    this.#line.replaceChildren();
    const words = [];
    for (const part of line.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        this.#line.append(part);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = part;
      this.#line.append(span);
      words.push(span);
    }
    if (speaker) speaker.talking = 1;
    this.#current = {
      speaker, words, index: -1, clock: 0, length: 0, beats: [], voice: voiceOf(line.who),
      hold: HOLD + words.length * HOLD_PER_WORD, cite: Boolean(line.cite)
    };
    this.#el.hidden = false;
    this.#el.classList.remove('talk-enter');
    void this.#el.offsetWidth;
    this.#el.classList.add('talk-enter');
    this.#nextWord();
  }

  #nextWord() {
    const current = this.#current;
    current.index++;
    const span = current.words[current.index];
    if (!span) return;
    span.classList.add('on');
    const word = span.textContent;
    const bare = word.replace(/["“”'»«)(\]\[]/g, '');
    const pause = /[.!?…]$/.test(bare) ? STOP_PAUSE : /[,;:—–-]$/.test(bare) ? COMMA_PAUSE : 0;
    const count = syllables(word);
    current.clock = 0;
    current.beats = Array.from({ length: count }, (_, k) => k * SYLLABLE);
    current.length = count * SYLLABLE + pause;
    if (current.index === current.words.length - 1) this.#cite.hidden = !current.cite;
  }

  // Mostra a fala inteira de uma vez (o toque na faixa).
  #reveal() {
    const current = this.#current;
    for (const span of current.words) span.classList.add('on');
    current.index = current.words.length - 1;
    current.beats = [];
    this.#cite.hidden = !current.cite;
  }

  #stopSpeaker() {
    const speaker = this.#current?.speaker;
    if (!speaker) return;
    speaker.talking = 0;
    speaker.talkOpen = 0;
  }

  // Quem fala no mapa: a unidade viva com essa marca ou desse tipo (do jogador primeiro).
  #find(key) {
    let best = null;
    for (const u of this.#state.organisms) {
      if (u.life <= 0 || (u.tag !== key && u.type !== key)) continue;
      if (!best || (u.team === 'player' && best.team !== 'player')) best = u;
    }
    return best;
  }
}
