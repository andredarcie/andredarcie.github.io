// As campanhas: cada era são 4 missões, em ordem, que seguem a história — cada uma no
// seu lugar (config/maps.js), com objetivo e mecânica tirados do que aconteceu ali. A
// 1ª ensina a jogar; a 4ª é a mais difícil. Os dados moram em campaigns/<era>.js.
//
// Uma missão:
//   number, title, year, summary (a linha da lista de missões)
//   start: { food, wood, rifles, workers, workersTag, preacher, heroes: [tipo],
//            hall: true | false (sem vila: só a tropa) | 'ruin' (a casa do meio em obra,
//            `ruin` = quanto dela está de pé), hallTag,
//            units: [[tipo, quantos, marca?]], at: { x, y } (onde nasce a gente: sem
//            casa, ou chegando de longe até a ruína), buildings: [{ kind, x, y, levels, tag }],
//            hour (a hora do começo), skyScale (o céu mais lento: a noite que dura) }
//   build / train: as obras e as tropas liberadas (null = todas)
//   enemy: { buildings: [{ kind, x, y, tag, armor }],
//            guards: [{ type, count, x, y, spread, tag, asleep, calm, sentry }] }
//          — guarda fica no posto e só briga com quem chega perto; `asleep` dorme e
//            `calm` não vigia até o alarma (`sentry`, acordada, dá o alarma ao ver o
//            inimigo); `alarm`: o aviso quando o acampamento acorda
//   raids: [{ at, every, times, roster: [[tipo, quantos]], from, after, text, grow, tag, boats }]
//          — `from`: id de estrada, 'roads' (sorteada), 'edges' (pela mata) ou { x, y };
//            `after`: só começa quando o objetivo com esse id se cumpre; `boats`:
//            igaras vazias, de mantimento
//   convoys: { first, every, road, escort } — comboios de mantimento da tropa
//   waves: { count, offset, kicker } — a defesa em ondas (WaveDirector), se houver
//   script: [{ at, after, ...ações }] — o roteiro: ações na hora marcada
//   sequential: os objetivos aparecem um de cada vez
//   objectives: [{ id, type, text, hint, deadline, late, optional, ..., then: [ação] }]
//     — tipos em MissionDirector (gather [`gain`: só o que entrar dali em diante],
//     build, units, destroy [`count`], kill, waves, survive, reach [`unit: 'any'`,
//     `must`], convoys); `deadline` em segundos, vencido é derrota (`late`)
//   ações: toast, focus, say: [{ who, unit, text, cite }] (falas durante a partida),
//     spawnPlayer / spawnEnemy: [{ type, count, from | x, y, tag, route, guard, asleep }],
//     spawnBuilding: [{ team, kind, x, y, tag, armor }], route: { tag, path | road,
//     depth, back, wait, out, exit, evade, hold }, flee (true ou marca), wake,
//     burn (marca), weaken: { tag, life, armor }
//   lose: { hall, wiped, units: [marca ou tipo], min: { tag, count, until },
//           escaped: { tag, count } } e `defeat` (os textos, por motivo)
//   intro / outro: as cenas, cada uma { at, zoom, pan, kicker, title, text, quote,
//     lines: [{ who, unit, text, cite }], cast: [{ type, team, x, y, count, walk, tag }] }
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

// Todas as missões ficam liberadas desde o começo (pedido do autor): o progresso
// continua gravado, mas só para o menu das eras mostrar até onde se chegou.
export function unlockedStage() {
  return STAGE_COUNT;
}

// Missão vencida: a próxima fica liberada.
export function completeStage(era = MISSION, stage = STAGE) {
  const progress = readProgress();
  progress[era] = Math.max(progress[era] ?? 1, stage + 1);
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch { /* sem armazenamento */ }
}
