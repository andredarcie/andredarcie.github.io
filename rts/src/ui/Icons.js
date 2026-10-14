// Ícones próprios do jogo, desenhados em SVG numa grade de 24 × 24, na cor do texto
// (currentColor). O jogo não usa emoji: cada coisa tem o seu desenho, no traço
// grosso e simples da interface. Comida e madeira também saem como Path2D, para a
// recompensa que sobe no canvas usar o mesmo desenho do topo da tela.

// Caminhos de traço único reaproveitados no canvas.
export const ICON_PATHS = Object.freeze({
  // Cuia de farinha, cheia em monte: a comida de todo dia no sertão.
  food: 'M3 12h18c0 4.5-4 8-9 8s-9-3.5-9-8zM6 12c1-3.5 3.5-5.5 6-5.5s5 2 6 5.5M10 4.5l1-1.5M14 4.5l-1-1.5',
  // Três toras empilhadas, vistas de topo.
  wood: 'M4 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM12 16a4 4 0 1 0 8 0a4 4 0 1 0-8 0zM8 9a4 4 0 1 0 8 0a4 4 0 1 0-8 0z',
  // Fuzil tomado da tropa, de perfil.
  rifles: 'M2 14h4l2-2h14v2H11l-2 3H5l-1 3H2zM14 12v-2'
});

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const FILL = 'fill="currentColor"';

const ICONS = Object.freeze({
  food: `<path ${STROKE} d="${ICON_PATHS.food}"/>`,
  wood: `<path ${STROKE} d="${ICON_PATHS.wood}"/><circle ${FILL} cx="8" cy="16" r="1"/><circle ${FILL} cx="16" cy="16" r="1"/><circle ${FILL} cx="12" cy="9" r="1"/>`,
  people: `<circle ${STROKE} cx="9" cy="8" r="3"/><path ${STROKE} d="M3 20c0-4 3-6 6-6s6 2 6 6"/><circle ${STROKE} cx="17" cy="9" r="2.4"/><path ${STROKE} d="M15.5 14.4c2.9-.6 5.5 1.2 5.5 5"/>`,
  // Rede de dormir armada entre dois esteios: o sertanejo à toa.
  idle: `<path ${STROKE} d="M3 5v15M21 5v15M3 8c3 8 15 8 18 0"/><path ${STROKE} d="M6 11.5c4 3 8 3 12 0"/>`,
  // Facão e fuzil cruzados.
  fighters: `<path ${STROKE} d="M4 20 18 6l2-2M16 4l4 4"/><path ${STROKE} d="M20 20 9 9c-2-2-3-4-2-6 2 0 4 1 6 3l1.5 1.5M6 15l3 3"/>`,
  // Chapéu de palha de aba larga.
  sertanejo: `<path ${STROKE} d="M2 15c3 2 17 2 20 0"/><path ${STROKE} d="M7 15c0-5 2-8 5-8s5 3 5 8"/><path ${STROKE} d="M7.5 12h9"/>`,
  // Chapéu de couro de vaqueiro, de aba virada.
  jagunco: `<path ${STROKE} d="M3 13c2 3 16 3 18 0l-2-1"/><path ${STROKE} d="M6 13c0-5 3-8 6-8s6 3 6 8"/><path ${STROKE} d="M12 5v3"/>`,
  // Chuço: haste com ponta de ferro.
  pike: `<path ${STROKE} d="M5 21 17 7"/><path ${STROKE} d="M15 5l5-2-2 5-3 1z"/><path ${STROKE} d="M8 14l2 2"/>`,
  // Fuzil de perfil.
  rifle: `<path ${STROKE} d="M2 14h4l2-2h14v2H11l-2 3H5l-1 3H2z"/><path ${STROKE} d="M14 12v-2"/>`,
  // Cruz alta sobre o bordão: Antônio Conselheiro.
  cross: `<path ${STROKE} d="M12 2v20M7 7h10"/><path ${STROKE} d="M9 22h6"/>`,
  church: `<path ${STROKE} d="M4 21V11l5-4 5 4v10zM14 21V8h6v13"/><path ${STROKE} d="M17 8V5M15.5 6h3M8 21v-4h2v4"/>`,
  // Trincheira: anel de pedras visto de lado, com a terra por cima.
  trench: `<path ${STROKE} d="M2 18h20M3 18v-4h18v4"/><path ${STROKE} d="M7 14v4M12 14v4M17 14v4M5 14c2-2 12-2 14 0"/>`,
  // Casa de taipa: telhado baixo, porta e janela.
  house: `<path ${STROKE} d="M3 11 12 6l9 5M5 10v10h14V10"/><path ${STROKE} d="M8 20v-5h3v5M14 13h3v3h-3z"/>`,
  campfire: `<path ${STROKE} d="M4 20 20 16M4 16l16 4"/><path ${STROKE} d="M12 14c-3-2-3-5 0-9 1 3 4 4 3 7-.5 1.5-1.5 2-3 2z"/>`,
  // Armazém: saco de farinha amarrado.
  storehouse: `<path ${STROKE} d="M8 6c-3 3-4 9-2 13 1 2 11 2 12 0 2-4 1-10-2-13z"/><path ${STROKE} d="M9 6h6M10 4l2 2 2-2"/>`,
  // Jirau: estrado sobre forquilhas.
  jirau: `<path ${STROKE} d="M3 9h18M3 12h18M6 12v9M18 12v9M6 9 4 5M6 9l2-4M18 9l-2-4M18 9l2-4"/>`,
  // Carga de bacamarte: estilhaços saindo da boca larga.
  scatter: `<path ${STROKE} d="M2 15h7l3-2v6l-3-2H2z"/><path ${STROKE} d="M15 12l5-4M15 16h6M15 20l5 2"/>`,
  // Mannlicher tomado: fuzil com a mira.
  mannlicher: `<path ${STROKE} d="M2 14h4l2-2h14v2H11l-2 3H5l-1 3H2z"/><circle ${STROKE} cx="18" cy="6" r="3"/><path ${STROKE} d="M18 2v2M18 8v2M14 6h2M20 6h2"/>`,
  repair: `<path ${STROKE} d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9"/><path ${STROKE} d="M5 5l4 4"/>`,
  stop: `<rect ${STROKE} x="5" y="5" width="14" height="14" rx="2"/>`,
  close: `<path ${STROKE} d="M6 6l12 12M18 6 6 18"/>`,
  undo: `<path ${STROKE} d="M8 4 4 8l4 4"/><path ${STROKE} d="M4 8h10a5 5 0 0 1 0 10h-4"/>`,
  retreat: `<path ${STROKE} d="M10 6 4 12l6 6M4 12h16"/>`,
  pause: `<path ${STROKE} d="M8 5v14M16 5v14"/>`,
  plus: `<path ${STROKE} d="M12 5v14M5 12h14"/>`,
  minus: `<path ${STROKE} d="M5 12h14"/>`,
  frame: `<path ${STROKE} d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>`,
  // Corneta: chamar a próxima onda agora.
  bugle: `<path ${STROKE} d="M3 12h8l9-6v12l-9-6"/><path ${STROKE} d="M6 12v4h3"/>`,
  tap: `<path ${STROKE} d="M9 11V5a2 2 0 0 1 4 0v6l4 1c2 .5 3 2 2.5 4L18 21H10l-4-5c-1-1.5 1-3 2.5-2z"/>`,
  road: `<path ${STROKE} d="M8 21 10 3M16 21 14 3M12 6v2M12 11v2M12 16v2"/>`,
  alert: `<path ${STROKE} d="M12 3 2 20h20z"/><path ${STROKE} d="M12 10v4M12 17v.5"/>`,
  rifles: `<path ${STROKE} d="${ICON_PATHS.rifles}"/>`,
  // Cabra de perfil, com o chifre para trás.
  goat: `<path ${STROKE} d="M5 18v-5c0-2 2-3 4-3h6l2-3 2 1-1 3v2c0 2-1 3-3 3H9M8 18v-3M15 18v-3"/><path ${STROKE} d="M17 7l1-3M19 8l2-2"/>`,
  // Igreja nova: o corpo largo e as duas torres sem telhado.
  newchurch: `<path ${STROKE} d="M3 21V9h4v12M17 21V9h4v12M7 21V12h10v9M10 21v-4h4v4"/><path ${STROKE} d="M3 9V7h4v2M17 9V7h4v2"/>`,
  // Troca: duas setas que se cruzam.
  trade: `<path ${STROKE} d="M4 8h13l-3-3M20 16H7l3 3"/>`,
  // Tocaia: o olho meio fechado na moita.
  eye: `<path ${STROKE} d="M2 12c3-4 6-6 10-6s7 2 10 6c-3 4-6 6-10 6s-7-2-10-6z"/><circle ${STROKE} cx="12" cy="12" r="2.5"/>`,
  // Carro de bois.
  cart: `<path ${STROKE} d="M3 14h12v-4H3zM15 12h6"/><circle ${STROKE} cx="7" cy="17" r="3"/><circle ${STROKE} cx="12" cy="17" r="3"/>`,
  // Sino da reza do fim da tarde.
  bell: `<path ${STROKE} d="M6 17c1-2 1-4 1-7a5 5 0 0 1 10 0c0 3 0 5 1 7z"/><path ${STROKE} d="M10 20a2 2 0 0 0 4 0M12 3v2"/>`
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
