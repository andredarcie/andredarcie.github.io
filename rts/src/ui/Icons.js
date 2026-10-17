// Ícones próprios do jogo, desenhados em SVG numa grade de 24 × 24, na cor do texto
// (currentColor). O jogo não usa emoji: cada coisa tem o seu desenho.
//
// Gramática única para todos: traço de 1,75 com pontas e cantos redondos, margem de
// 2 na grade, e uma camada de TOM (a mesma cor, translúcida) preenchendo a massa
// principal — a copa do chapéu, a boca do bacamarte, a chama — para o desenho ter
// volume e ler bem pequeno. Personagens são bustos com o chapéu ou a arma que os
// distingue; cada unidade tem o seu ícone (nada de um fuzil para três tropas).
// Comida, madeira e fuzis também saem como Path2D, para a recompensa que sobe no
// canvas usar o mesmo desenho do topo da tela.

// Caminhos de traço reaproveitados no canvas.
export const ICON_PATHS = Object.freeze({
  // Cuia de farinha, cheia em monte, no pé de apoio: a comida de todo dia no sertão.
  food: 'M3 12.5h18c-.4 4.3-4.1 7.5-9 7.5s-8.6-3.2-9-7.5zM6.4 12.5C7.2 9.4 9.4 7.5 12 7.5s4.8 1.9 5.6 5M9.5 20.2l-.5 1.3h6l-.5-1.3',
  // Três toras empilhadas, vistas de topo, com o miolo.
  wood: 'M3 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM13 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM8 8.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM5.6 16a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0zM15.6 16a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0zM10.6 8.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0z',
  // Mannlicher tomado da tropa, de perfil: coronha, delgado, guarda-mato, ferrolho.
  rifles: 'M2.5 15.5 7 13h3l1-1h10.5v1.6H12.5l-1.2 1.4H9l-1.8 3.5H3.5zM13 12v-1.4h1.8M9.6 15v1.3c0 .7.9 1 1.4.5'
});

const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
const S = d => `<path ${STROKE} d="${d}"/>`;
const T = d => `<path fill="currentColor" opacity=".28" d="${d}"/>`;
const C = (cx, cy, r) => `<circle ${STROKE} cx="${cx}" cy="${cy}" r="${r}"/>`;
const DOT = (cx, cy, r = .9) => `<circle fill="currentColor" cx="${cx}" cy="${cy}" r="${r}"/>`;
// o busto das figuras: cabeça e ombros (o chapéu vem por cima)
const bust = (headY = 12.2) => C(12, headY, 2.4) + S('M5.5 21c.6-3.4 3.2-5.3 6.5-5.3s5.9 1.9 6.5 5.3');

const ICONS = Object.freeze({
  /* ---------- recursos ---------- */
  food: T('M6.4 12.5C7.2 9.4 9.4 7.5 12 7.5s4.8 1.9 5.6 5z') + S(ICON_PATHS.food),
  wood: T('M3 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM13 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM8 8.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0z') + S(ICON_PATHS.wood),
  rifles: T('M2.5 15.5 7 13h3l-1 2H9l-1.8 3.5H3.5z') + S(ICON_PATHS.rifles),
  people: T('M3 20.5c0-3.9 2.7-6.2 6-6.2s6 2.3 6 6.2z') + C(9, 8, 3.2) + S('M3 20.5c0-3.9 2.7-6.2 6-6.2s6 2.3 6 6.2') +
    C(17, 9, 2.5) + S('M16.6 14.5c2.7-.3 4.6 1.6 4.6 5'),

  /* ---------- gente do arraial ---------- */
  // Sertanejo: chapéu de palha de copa redonda e aba reta, com a fita.
  sertanejo: T('M8 8.9c.2-3 1.8-5 4-5s3.8 2 4 5z') + S('M3 8.8c2.6 1.6 15.4 1.6 18 0M8 8.9c.2-3 1.8-5 4-5s3.8 2 4 5M8.3 7.3h7.4') + bust(12.4),
  // Jagunço: chapéu de couro de vaqueiro, aba em meia-lua, e a cartucheira cruzada.
  jagunco: T('M7.5 9.6c0-3.4 2-5.6 4.5-5.6s4.5 2.2 4.5 5.6z') + S('M2.5 7c1.5 2.6 4.8 3.6 9.5 3.6S20 9.6 21.5 7M7.5 9.6c0-3.4 2-5.6 4.5-5.6s4.5 2.2 4.5 5.6') +
    bust(13) + S('M8 16.3l8 4.5') + DOT(10, 17.5, .7) + DOT(12.2, 18.7, .7) + DOT(14.4, 19.9, .7),
  // Chuço: haste de pau, ponta de ferro em folha, amarração.
  pike: T('M15 9c.2-2.7 2.2-5 5.8-5.8-.8 3.6-3.1 5.6-5.8 5.8z') +
    S('M3.5 20.5 15 9M15 9c.2-2.7 2.2-5 5.8-5.8-.8 3.6-3.1 5.6-5.8 5.8zM12.6 10.2l1.2 1.2M11.4 11.4l1.2 1.2'),
  // Porrete nodoso dos Macambira.
  club: T('M13 9.8c-.9-2.6.3-5.4 2.9-6.3s5.3.6 5.6 3.3c.3 2.3-1.3 4.3-3.6 4.7-1.9.3-3.8-.2-4.9-1.7z') +
    S('M4 20.5 13.6 10.3M13 9.8c-.9-2.6.3-5.4 2.9-6.3s5.3.6 5.6 3.3c.3 2.3-1.3 4.3-3.6 4.7-1.9.3-3.8-.2-4.9-1.7zM5.4 17.4l1.6 1.6') +
    DOT(16.6, 6.2, .7) + DOT(18.6, 8.6, .7),
  // Atirador: bacamarte de boca de sino, com o cão do fecho de pederneira.
  blunderbuss: T('M17 12l3.5-2.2v6.4L17 14z') + S('M2.5 15.5 7 13h3.5l.8-1H17l3.5-2.2v6.4L17 14h-5l-1 1.2H9l-1.8 3.3H3.5zM10.8 12v-1.6l1.4-.9'),
  // Antônio Conselheiro: a cruz alta sobre o calvário.
  cross: T('M9.5 18.5h5v3h-5z') + S('M12 2.5v16M7.5 7h9M9.5 18.5h5v3h-5zM7.5 21.5h9'),
  // Pajeú, o da tocaia: o olho no meio do capim.
  eye: T('M3 11c2.6-3.4 5.6-5 9-5s6.4 1.6 9 5c-2.6 3.4-5.6 5-9 5s-6.4-1.6-9-5z') +
    S('M3 11c2.6-3.4 5.6-5 9-5s6.4 1.6 9 5c-2.6 3.4-5.6 5-9 5s-6.4-1.6-9-5zM5 21.5l1.5-4.3M9 21.5l.5-3.3M12 21.5v-3M15 21.5l-.5-3.3M19 21.5l-1.5-4.3') +
    C(12, 11, 2.4) + DOT(12, 11, 1),
  // Manuel Quadrado e o conserto: o martelo.
  repair: T('M13 4.5l5.5 5.5-2 2L11 6.5z') + S('M13 4.5l5.5 5.5-2 2L11 6.5zM12.8 9.7 4.2 18.3l1.5 1.5 8.6-8.6M15.5 3.5l1.5-1'),
  // Antônio Vilanova e as trocas: a balança de feira.
  trade: T('M2 13c0 1.7 1.1 2.6 2.5 2.6S7 14.7 7 13zM17 13c0 1.7 1.1 2.6 2.5 2.6S22 14.7 22 13z') +
    S('M12 4.5v16M8 20.5h8M4.5 7h15M4.5 7 2 13M4.5 7 7 13M19.5 7 17 13M19.5 7 22 13M2 13c0 1.7 1.1 2.6 2.5 2.6S7 14.7 7 13zM17 13c0 1.7 1.1 2.6 2.5 2.6S22 14.7 22 13z') +
    C(12, 3.3, 1),

  /* ---------- a tropa ---------- */
  // Soldado de linha: quepe de pala e o cano do fuzil por trás do ombro.
  soldier: T('M8 9.5V5.6c0-.6.4-1 1-1h6c.6 0 1 .4 1 1v3.9z') + S('M8 9.5V5.6c0-.6.4-1 1-1h6c.6 0 1 .4 1 1v3.9M6.5 9.5h11M12 6.3v1.2M19.2 21.5 21.5 8.5') + bust(12.4),
  // Soldado de baioneta: o fuzil inclinado com a lâmina calada.
  bayonet: T('M3 19.5 6.6 14.4l3 3L4.5 21z') + S('M3 19.5 6.6 14.4l3 3L4.5 21zM8.1 15.9l7.4-7.4M14.6 8.4 21 3l-5.4 6.4M13.6 7.6l2.8 2.8'),
  // Canhão Krupp de campanha: cano de retrocarga sobre a roda raiada e a conteira.
  cannon: T('M7 13.5 19.5 8.6l.9 2.3L8 15.6z') + S('M7 13.5 19.5 8.6l.9 2.3L8 15.6zM11 18.5l10 2.5M9 12.5v8M5 16.5h8') + C(9, 16.5, 4),
  // A Matadeira (Whitworth 32): o canhão de sítio, cano grosso sobre o reparo.
  siege: T('M3 9.5h12.5l5.5-1.5v7l-5.5-1.5H3z') + S('M3 9.5h12.5l5.5-1.5v7l-5.5-1.5H3zM15.5 9.5v4M5 13.5l1.5 4h8l1.5-4') + C(7, 19, 2) + C(14, 19, 2),
  // Oficial: o sabre curvo com a guarda de arco.
  saber: T('M8.2 17.4C12.7 13.8 17 9 20 3.5c-1 5.4-5 10.1-10.4 15.3z') +
    S('M8.2 17.4C12.7 13.8 17 9 20 3.5c-1 5.4-5 10.1-10.4 15.3M5.8 15l4.2 4.2M6.6 16.2c-1.6 1.3-2.2 3-1.6 4.6 1.6.6 3.3 0 4.6-1.6M4 21.5l1.6-1.6'),
  // Comboio de Monte Santo: o carro de boi de roda inteiriça.
  cart: T('M5 17.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0z') +
    S('M3 11.5h11v3.5H3zM3 11.5v-3M8.5 11.5v-3M14 11.5v-3M3 8.5h11M14 13.5h7.5M20.5 11.5v4M6 17.5h5') + C(8.5, 17.5, 3.5) + DOT(8.5, 17.5),

  /* ---------- grupos (botões da barra) ---------- */
  // Rede armada entre dois esteios: o sertanejo à toa.
  idle: T('M3 8c2.5 7.5 15.5 7.5 18 0z') + S('M3 4.5V21M21 4.5V21M3 8c2.5 7.5 15.5 7.5 18 0M7 11.8c3.3 2 6.7 2 10 0M2 21h3M19 21h3'),
  // Facão e fuzil cruzados: os jagunços na luta.
  fighters: T('M5 4.5c4.5 2.5 9 7 12 12.3l-1.8 1C12 13 8.4 9 4.2 6.2z') +
    S('M5 4.5c4.5 2.5 9 7 12 12.3l-1.8 1C12 13 8.4 9 4.2 6.2zM16.1 17.3l2.4 3.2M20 4 9.4 14.6M9.4 14.6 4 20l1.6 1.6L11 16.2M18.4 3l2.6 2.6'),

  /* ---------- construções ---------- */
  // Igreja de Santo Antônio: a nave, a torre do sino com a cruz.
  church: T('M14 21V9h6v12z') + S('M2.5 21h19M4 21v-9l5-3.5 5 3.5v9M14 21V9h6v12M14 9l3-3 3 3M17 6V2.5M15.6 3.8h2.8M7.5 21v-3a1.5 1.5 0 0 1 3 0v3M16.2 11.5h1.6v2h-1.6z'),
  // Igreja Nova: as duas torres maciças, ainda sem coruchéu.
  newchurch: T('M3 21V8h4.5v13zM16.5 21V8H21v13z') +
    S('M2 21h20M3 21V8h4.5v13M16.5 21V8H21v13M7.5 21v-9.5h9V21M7.5 11.5 12 8.5l4.5 3M10.5 21v-3a1.5 1.5 0 0 1 3 0v3M3 8V6.5h1.5V8M6 8V6.5h1.5V8M16.5 8V6.5H18V8M19.5 8V6.5H21V8'),
  // Trincheira: as fiadas de pedra seca no aterro e o cano espiando por cima.
  trench: T('M4 18v-3h16v3z') + S('M2 20c3-1.3 17-1.3 20 0M4 18v-3h16v3M8 15v3M12 15v3M16 15v3M6 15v-2.5h12V15M9 12.5V15M15 12.5V15M11 12.5 19.5 8'),
  // Casa de taipa: telhado baixo de duas águas, porta e janela.
  house: T('M4.5 10 12 5.4 19.5 10z') + S('M2.5 11 12 5l9.5 6M4.5 10v10.5h15V10M2.5 20.5h19M8 20.5v-5h3v5M14 13.5h3v3h-3z'),
  // Acampamento: a fogueira de lenha cruzada.
  campfire: T('M12 15c-2.8 0-4.3-2-3.6-4.5.5-1.8 2-2.5 2-5.5 2.6 1.4 5.2 4 5.2 6.8 0 1.9-1.4 3.2-3.6 3.2z') +
    S('M4 20.5 20 16.5M4 16.5l16 4M12 15c-2.8 0-4.3-2-3.6-4.5.5-1.8 2-2.5 2-5.5 2.6 1.4 5.2 4 5.2 6.8 0 1.9-1.4 3.2-3.6 3.2z'),
  // Armazém: o saco de farinha amarrado na boca.
  storehouse: T('M8.5 7c-3 2.8-4.3 8.3-2.6 12.2.6 1.4 2.8 2.3 6.1 2.3s5.5-.9 6.1-2.3C19.8 15.3 18.5 9.8 15.5 7z') +
    S('M8.5 7c-3 2.8-4.3 8.3-2.6 12.2.6 1.4 2.8 2.3 6.1 2.3s5.5-.9 6.1-2.3C19.8 15.3 18.5 9.8 15.5 7zM8.5 7h7M9.5 7 8 4M14.5 7 16 4M10 14.5h4'),
  // Curral de cabras: a cabra de perfil, chifre para trás e barbicha.
  goat: S('M5 18.5V13c0-1.8 1.3-3 3.2-3H15l2.2-3 2.6 1.3-1 3.2v1.8c0 1.8-1.2 3-3 3H9.5M7.5 18.5v-3M15 18.5v-2.5M17.2 7c.2-1.8 1-3 2.6-3.6M19 11.5l.6 1.8M5 13l-1.5-1.5') +
    T('M5 18.5V13c0-1.8 1.3-3 3.2-3H15l2.2-3 2.6 1.3-1 3.2v1.8c0 1.8-1.2 3-3 3H9.5L7.5 18.5z') + DOT(18.4, 9.2, .6),

  /* ---------- melhorias da trincheira ---------- */
  // Jirau: estrado sobre forquilhas, com a escada.
  jirau: T('M3 10h18v2.5H3z') + S('M3 10h18M3 12.5h18M6 12.5V21M18 12.5V21M6 10 4.5 6.5M6 10l1.5-3.5M18 10l-1.5-3.5M18 10l1.5-3.5M9.5 21l1-8.5M13.5 21l1-8.5M10 17.5h4M10.4 14.5h4'),
  // Carga de bacamarte: a boca de sino e o chumbo espalhando.
  scatter: T('M8 12l3-2.5v8L8 15z') + S('M2 12h6l3-2.5v8L8 15H2z') +
    DOT(15, 9.5, 1) + DOT(17.8, 13, 1) + DOT(15, 16.8, 1) + DOT(20.4, 8.4, 1) + DOT(20.8, 17.2, 1) + DOT(21, 12.8, 1),
  // Mannlichers tomados: o fuzil e o pente de cinco balas.
  mannlicher: T('M12 3.5h8v4h-8z') + S('M2.5 17.5 7 15h3l1-1h10.5v1.6H12.5l-1.2 1.4H9l-1.8 3.5H3.5zM12 3.5h8v4h-8zM13.6 3.5v4M15.2 3.5v4M16.8 3.5v4M18.4 3.5v4'),

  /* ---------- interface ---------- */
  stop: T('M6 6h12v12H6z') + S('M6 6h12v12H6z'),
  close: S('M6 6l12 12M18 6 6 18'),
  undo: S('M8 4 4 8l4 4M4 8h10a5 5 0 0 1 0 10h-4'),
  retreat: S('M10 6 4 12l6 6M4 12h16'),
  pause: S('M8.5 5v14M15.5 5v14'),
  // Livro aberto: o diário da história de Belo Monte.
  book: T('M12 7c-2.6-1.7-5.2-2.1-8-1.5v13c2.8-.6 5.4-.2 8 1.5z') + S('M12 7c2.6-1.7 5.2-2.1 8-1.5v13c-2.8-.6-5.4-.2-8 1.5M12 7C9.4 5.3 6.8 4.9 4 5.5v13c2.8-.6 5.4-.2 8 1.5M12 7v13'),
  plus: S('M12 5v14M5 12h14'),
  minus: S('M5 12h14'),
  frame: S('M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5') + T('M9 9h6v6H9z'),
  // Corneta: chamar a próxima onda agora.
  bugle: T('M12.5 11l8-5v12l-8-5z') + S('M3 11h9.5l8-5v12l-8-5H3zM3 9.5v3M6 13v3.5c0 .8.7 1.5 1.5 1.5H10'),
  tap: T('M9 11V5a2 2 0 0 1 4 0v6l4 1c2 .5 3 2 2.5 4L18 21h-8l-4-5c-1-1.5 1-3 2.5-2z') +
    S('M9 11V5a2 2 0 0 1 4 0v6l4 1c2 .5 3 2 2.5 4L18 21h-8l-4-5c-1-1.5 1-3 2.5-2z'),
  // Estrada de terra sumindo no horizonte.
  road: T('M4 21 10 3h4l6 18z') + S('M4 21 10 3M20 21 14 3M12 6v2M12 11v2.5M12 17v2.5'),
  alert: T('M12 3 2 20h20z') + S('M12 3 2 20h20zM12 10v4') + DOT(12, 17, 1),
  // Sino da reza do fim da tarde.
  bell: T('M6 17.5c1-2 1-4.2 1-7a5 5 0 0 1 10 0c0 2.8 0 5 1 7z') + S('M6 17.5c1-2 1-4.2 1-7a5 5 0 0 1 10 0c0 2.8 0 5 1 7zM10.3 20a1.8 1.8 0 0 0 3.4 0M12 3.5v2'),
  // nomes antigos
  rifle: T('M2.5 15.5 7 13h3l-1 2H9l-1.8 3.5H3.5z') + S(ICON_PATHS.rifles)
});

// Marcação de um ícone para pôr num elemento (innerHTML). `label` vira o nome
// acessível; sem ele, o ícone é só decoração.
export function icon(name, label = '') {
  const body = ICONS[name] ?? ICONS.close;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="ic" viewBox="0 0 24 24" ${a11y}>${body}</svg>`;
}

// Troca, dentro de `root`, todo elemento com data-icon pelo desenho correspondente.
export function paintIcons(root) {
  for (const element of root.querySelectorAll('[data-icon]')) element.innerHTML = icon(element.dataset.icon);
}
