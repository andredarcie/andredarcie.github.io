// O livro de história e as citações de abertura e fim da missão aberta. Canudos
// tem as dele em missions/canudos-story.js e config/sertoes.js; os tupinambás, em
// missions/tupinamba-story.js; Palmares, em missions/palmares-story.js.
import { TUPI, PALMARES } from './mission.js';
import { STORY as CANUDOS_STORY } from './missions/canudos-story.js';
import * as tupinamba from './missions/tupinamba-story.js';
import * as palmares from './missions/palmares-story.js';
import { SERTOES } from './sertoes.js';

const EUCLIDES = 'Euclides da Cunha, <cite>Os Sertões</cite>';

// A outra missão que tem livro próprio (null em Canudos).
const OTHER = TUPI ? tupinamba : PALMARES ? palmares : null;

export const STORY = OTHER ? OTHER.STORY : CANUDOS_STORY;
export const QUOTES = OTHER ? OTHER.QUOTES : Object.freeze({
  start: { text: SERTOES.forte.text, cite: EUCLIDES },
  end: { text: SERTOES.fim.text, cite: `${EUCLIDES} (A Luta)` }
});
// Quando cada registro se abre (StoryBook). Canudos: o arraial no começo, o
// Conselheiro aos 25 s, Uauá na primeira onda, o livro na primeira vitória e cada
// chefe quando chega.
export const STORY_TRIGGERS = OTHER ? OTHER.STORY_TRIGGERS : Object.freeze({
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
