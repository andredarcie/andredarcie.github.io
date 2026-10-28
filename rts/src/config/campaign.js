// As campanhas: cada era são 4 missões, em ordem, que seguem a história. A 1ª ensina
// a jogar; a 3ª é a defesa em ondas (o modo antigo, com número certo de ondas); a 4ª
// é a mais difícil. Os dados de cada missão moram em campaigns/<era>.js.
//
// Uma missão:
//   number, title, year, summary (a linha da lista de missões)
//   start: { food, wood, rifles, hall (a casa do meio já de pé), workers, preacher,
//            heroes: [tipo], units: [[tipo, quantos]], at: { x, y } (onde nasce quem
//            não tem casa), buildings: [{ kind, x, y, levels }] (obras já prontas) }
//   build / train: as obras e as tropas liberadas (null = todas)
//   enemy: { buildings: [{ kind, x, y, tag }], guards: [{ type, count, x, y, spread, tag }] }
//          — guarda fica no posto e só briga com quem chega perto
//   raids: [{ at, every, times, roster: [[tipo, quantos]], from, after, text, grow }]
//          — `from`: id de estrada, 'roads' (sorteada), 'edges' (pela mata) ou { x, y };
//            `after`: só começa quando o objetivo com esse id se cumpre
//   convoys: { first, every, road } — comboios de mantimento da tropa (Canudos)
//   waves: { count, offset, kicker } — só na missão de defesa (WaveDirector)
//   sequential: os objetivos aparecem um de cada vez (tutorial e missões em etapas)
//   objectives: [{ id, type, text, hint, ..., then: [ação] }] — tipos em
//     MissionDirector (gather, build, units, destroy, kill, waves, survive, reach,
//     convoys); ações: toast, spawnPlayer, spawnEnemy, flee, focus
//   lose: { hall, wiped, units: [tag], min: { tag, count } } e `defeat` (os textos)
//   intro / outro: as cenas, cada uma { at, zoom, kicker, title, text, quote }
//   story: registros do livro que se abrem no começo da missão
import { MISSION, STAGE, STAGE_COUNT } from './mission.js';
import { CAMPAIGN as TUPINAMBA } from './campaigns/tupinamba.js';
import { CAMPAIGN as PALMARES } from './campaigns/palmares.js';
import { CAMPAIGN as CANUDOS } from './campaigns/canudos.js';

const ALL = Object.freeze({ tupinamba: TUPINAMBA, palmares: PALMARES, canudos: CANUDOS });

export const STAGES = ALL[MISSION];
export const CURRENT = STAGES[STAGE - 1];
export { STAGE, STAGE_COUNT };

// O progresso, guardado neste navegador: por era, a maior missão liberada (1 a 4;
// 5 quer dizer a campanha inteira vencida). src/boot/eras.js lê a mesma chave.
export const PROGRESS_KEY = 'eras-progresso';

export function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) ?? {}; } catch { return {}; }
}

export function unlockedStage(era = MISSION) {
  return Math.max(1, Math.min(STAGE_COUNT, readProgress()[era] ?? 1));
}

// Missão vencida: a próxima fica liberada.
export function completeStage(era = MISSION, stage = STAGE) {
  const progress = readProgress();
  progress[era] = Math.max(progress[era] ?? 1, stage + 1);
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* sem armazenamento */ }
}
