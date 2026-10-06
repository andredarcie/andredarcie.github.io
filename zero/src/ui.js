import { UI_TEXT } from './config.js';

/* ===================== elementos da interface ===================== */
export const $ = id => document.getElementById(id);
export const dotEl = $('dot'), promptEl = $('prompt'), prName = $('pr-name');
export const tbEl = $('textbox'), tbName = $('tb-name'), tbText = $('tb-text'), tbHint = $('tb-hint');
export const capEl = $('caption'), fadeEl = $('fade');
export const titleEl = $('title'), pauseEl = $('pause'), endEl = $('end');
export const btnE = $('btn-e'), stickL = $('stick-l'), stickR = $('stick-r');

function setRichText(el, parts) {
  el.textContent = '';
  if (!parts) return;
  if (parts.before) el.append(document.createTextNode(parts.before));
  if (parts.highlight) {
    const span = document.createElement('span');
    span.textContent = parts.highlight;
    el.append(span);
  }
  if (parts.after) el.append(document.createTextNode(parts.after));
}

export function configureStaticUI(isMobile) {
  const ui = UI_TEXT;
  setRichText(titleEl.querySelector('h1'), ui.title.logo);
  titleEl.querySelector('p').textContent = ui.title.subtitle;
  titleEl.querySelector('.keys').textContent = isMobile ? ui.mobile.keys : ui.title.keysDesktop;
  titleEl.querySelector('.go').textContent = ui.title.start;
  pauseEl.querySelector('h1').textContent = ui.pause.title;
  pauseEl.querySelector('.go').textContent = ui.pause.resume;
  setRichText(endEl.querySelector('h1'), ui.end.logo);
  endEl.querySelector('p').textContent = ui.end.subtitle;
  endEl.querySelector('.go').textContent = ui.end.restart;
  const promptKey = document.createElement('b');
  promptKey.textContent = ui.prompt.key;
  btnE.textContent = ui.prompt.key;
  promptEl.replaceChildren(promptKey, document.createTextNode(ui.prompt.afterKey), prName);
  $('rotate-title').textContent = ui.rotate.title;
  $('rotate-subtitle').textContent = ui.rotate.subtitle;
}
