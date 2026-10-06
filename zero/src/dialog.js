import { UI_TEXT } from './config.js';
import { tbEl, tbName, tbText, tbHint } from './ui.js';
import { sfxBlip } from './audio.js';

/* ===================== diálogo em páginas (E avança) ===================== */
export let textOpen = false;
let queue = [], after = null;

export function say(name, lines, cb) {
  queue = lines.map(l => ({ name, l }));
  after = cb || null;
  nextPage();
}
export function nextPage() {
  if (!queue.length) {
    tbEl.classList.remove('on');
    textOpen = false;
    sfxBlip(0);
    const f = after; after = null;
    if (f) f();
    return;
  }
  const p = queue.shift();
  sfxBlip(1);
  tbName.textContent = p.name;
  tbName.style.display = p.name ? '' : 'none';
  tbText.textContent = p.l;
  tbHint.textContent = queue.length ? UI_TEXT.dialog.continueHint : UI_TEXT.dialog.closeHint;
  tbEl.classList.add('on');
  textOpen = true;
}
export function closeText() {
  queue = []; after = null;
  tbEl.classList.remove('on');
  textOpen = false;
}
