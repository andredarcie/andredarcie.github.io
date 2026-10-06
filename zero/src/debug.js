/* ===================== dev: seletor de cenas (só em localhost, tecla I) ===================== */
// cenas agrupadas por dia (cada aba = a rota daquele dia, na ordem da história)
const DEBUG_TABS = [
  { label: 'Dia 1', scenes: [
    ['Quarto (acordar)', 'quarto', 1],
    ['Corredor', 'corredor', 1],
    ['Recepção', 'recepcao', 1],
    ['Rua (chuva)', 'rua', 1],
    ['Plataforma (trem chega)', 'plataforma', 1],
    ['Metrô', 'metro', 1],
    ['Trabalho', 'empresa', 1],
  ] },
  { label: 'Dia 2', scenes: [
    ['Quarto', 'quarto', 2],
    ['Corredor', 'corredor', 2],
    ['Recepção', 'recepcao', 2],
    ['Rua (chuva)', 'rua', 2],
    ['Plataforma (trem chega)', 'plataforma', 2],
    ['Metrô', 'metro', 2],
    ['Trabalho', 'empresa', 2],
  ] },
  { label: 'Dia 3', scenes: [
    ['Quarto (Bitsy)', 'quarto', 3],
  ] },
  { label: 'Dia 4', scenes: [
    ['Quarto (0 views)', 'quarto', 4],
  ] },
  { label: 'Dia 5', scenes: [
    ['Quarto (mesa vazia)', 'quarto', 5],
    ['Corredor', 'corredor', 5],
    ['Recepção', 'recepcao', 5],
    ['Rua (seca, metrô fechado)', 'rua', 5],
    ['Loja (passagem)', 'loja', 5],
    ['Avião (nuvens)', 'aviao', 5],
    ['Praia (fim)', 'praia', 5],
  ] },
  { label: 'Fim', scenes: [
    ['Tela "UM."', 'end', null],
  ] },
];

let debugEl = null, debugOpen = false, debugTab = 0;
let onJump = null; // (cena, dia) => void, fornecido por main.js

function buildDebugMenu() {
  debugEl = document.createElement('div');
  debugEl.style.cssText = 'position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(38,56,72,.82)';
  const panel = document.createElement('div');
  panel.style.cssText = 'background:#263848;border:2px solid #a6b6b8;border-left:8px solid #3aa2ea;padding:18px 20px;width:min(620px,94vw);max-height:88vh;overflow-y:auto';
  const h = document.createElement('div');
  h.textContent = 'CENAS · DEV';
  h.style.cssText = 'color:#3aa2ea;font-size:24px;letter-spacing:3px;margin-bottom:12px';
  panel.appendChild(h);
  // barra de abas (um dia por aba)
  const tabsBar = document.createElement('div');
  tabsBar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;border-bottom:2px solid #3a5066;padding-bottom:12px';
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-direction:column;gap:6px'; // coluna única: a rota lê de cima pra baixo
  const tabBtns = [];
  function showTab(i) {
    debugTab = i;
    grid.replaceChildren();
    DEBUG_TABS[i].scenes.forEach(([label, sceneName, d], idx) => {
      const b = document.createElement('button');
      b.textContent = (idx + 1) + '.  ' + label;
      b.style.cssText = 'font-family:inherit;font-size:20px;color:#dde8e9;background:#2e4358;border:2px solid #3a5066;padding:9px 13px;cursor:pointer;text-align:left';
      b.addEventListener('mouseenter', () => { b.style.borderColor = '#3aa2ea'; });
      b.addEventListener('mouseleave', () => { b.style.borderColor = '#3a5066'; });
      b.addEventListener('click', () => { closeDebug(); onJump(sceneName, d); });
      grid.appendChild(b);
    });
    tabBtns.forEach((tb, j) => {
      tb.style.background = j === i ? '#3aa2ea' : 'transparent';
      tb.style.color = j === i ? '#0f1b26' : '#a6b6b8';
      tb.style.borderColor = j === i ? '#3aa2ea' : '#3a5066';
    });
  }
  DEBUG_TABS.forEach((t, i) => {
    const tb = document.createElement('button');
    tb.textContent = t.label;
    tb.style.cssText = 'font-family:inherit;font-size:19px;padding:6px 14px;border:2px solid #3a5066;background:transparent;color:#a6b6b8;cursor:pointer';
    tb.addEventListener('click', () => showTab(i));
    tabsBar.appendChild(tb);
    tabBtns.push(tb);
  });
  panel.appendChild(tabsBar);
  panel.appendChild(grid);
  const hint = document.createElement('div');
  hint.textContent = 'I fecha · clique fora fecha';
  hint.style.cssText = 'color:#a6b6b8;font-size:16px;opacity:.7;margin-top:14px';
  panel.appendChild(hint);
  debugEl.appendChild(panel);
  debugEl.addEventListener('click', ev => { if (ev.target === debugEl) toggleDebug(); });
  document.body.appendChild(debugEl);
  showTab(debugTab); // abre na última aba usada (Dia 1 por padrão)
}
function closeDebug() {
  debugOpen = false;
  if (debugEl) debugEl.style.display = 'none';
}
function toggleDebug() {
  if (!debugEl) buildDebugMenu();
  debugOpen = !debugOpen;
  debugEl.style.display = debugOpen ? 'flex' : 'none';
  if (debugOpen && document.pointerLockElement) document.exitPointerLock();
}

export function installDebugMenu(jump) {
  onJump = jump;
  addEventListener('keydown', e => { if (e.code === 'KeyI') toggleDebug(); });
  console.info('[zero] dev: tecla I abre o seletor de cenas');
}
