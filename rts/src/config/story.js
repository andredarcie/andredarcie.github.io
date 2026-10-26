// O livro de história e as citações de abertura e fim da missão aberta. Canudos
// tem as dele em missions/canudos-story.js e config/sertoes.js; os tupinambás, em
// missions/tupinamba-story.js.
import { TUPI } from './mission.js';
import { STORY as CANUDOS_STORY } from './missions/canudos-story.js';
import * as tupinamba from './missions/tupinamba-story.js';
import { SERTOES } from './sertoes.js';

const EUCLIDES = 'Euclides da Cunha, <cite>Os Sertões</cite>';

export const STORY = TUPI ? tupinamba.STORY : CANUDOS_STORY;
export const QUOTES = TUPI ? tupinamba.QUOTES : Object.freeze({
  start: { text: SERTOES.forte.text, cite: EUCLIDES },
  end: { text: SERTOES.fim.text, cite: `${EUCLIDES} (A Luta)` }
});
// Quando cada registro se abre (StoryBook). Canudos: o arraial no começo, o
// Conselheiro aos 25 s, Uauá na primeira onda, o livro na primeira vitória e cada
// chefe quando chega.
export const STORY_TRIGGERS = TUPI ? tupinamba.STORY_TRIGGERS : Object.freeze({
  begin: 'canudos',
  after: { id: 'conselheiro', seconds: 25 },
  waveStart: { 1: 'uaua' },
  waveCleared: { 1: 'sertoes' },
  built: {},
  riflePickup: null,
  canoes: null
});
// A linha de baixo de uma citação do livro.
export function quoteCite(quote) {
  return quote.cite ?? `${EUCLIDES} · ${quote.part}`;
}
