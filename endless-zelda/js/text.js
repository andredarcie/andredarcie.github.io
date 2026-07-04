// Endless Zelda — crisp HTML text layer rendered on top of the canvas.
// All in-game text goes through here instead of ctx.fillText, so the letters
// are drawn at the real on-screen pixel size (vector, never upscaled bitmap)
// and stay 100% sharp at any zoom.
'use strict';

const TextLayer = (() => {
  const VW = 256, VH = 240;          // virtual (canvas) resolution
  const stage = document.getElementById('stage');
  const screen = document.getElementById('text-screen');

  const pool = [];
  let used = 0;

  function acquire() {
    let el = pool[used];
    if (!el) {
      el = document.createElement('div');
      el.className = 'tl';
      el._str = null; el._left = null; el._top = null; el._c = null; el._vis = false;
      screen.appendChild(el);
      pool[used] = el;
    }
    used++;
    return el;
  }

  // Render a string as fixed 8px-wide character cells so the horizontal
  // layout matches the game's "8px per glyph" positioning exactly.
  function setCells(el, str) {
    if (el._str === str) return;
    el._str = str;
    while (el.firstChild) el.removeChild(el.firstChild);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < str.length; i++) {
      const cell = document.createElement('i');
      cell.textContent = str[i];
      frag.appendChild(cell);
    }
    el.appendChild(frag);
  }

  return {
    oy: 0,                 // y offset for the current draw context (0 or HUD_H)
    scale: 1, offX: 0, offY: 0,

    begin() { used = 0; this.oy = 0; },

    // one text draw call -> one pooled line element (retained across frames)
    text(str, x, y, color = '#FCFCFC') {
      str = '' + str;
      const el = acquire();
      setCells(el, str);
      const S = this.scale;
      const lpx = (x * S) + 'px';
      const tpx = ((y + this.oy) * S) + 'px';
      if (el._left !== lpx) { el.style.left = lpx; el._left = lpx; }
      if (el._top !== tpx) { el.style.top = tpx; el._top = tpx; }
      if (el._c !== color) { el.style.color = color; el._c = color; }
      if (!el._vis) { el.style.display = 'block'; el._vis = true; }
    },

    // centered, multi-line text (matches the old drawWrapped math: 8px/char)
    wrapped(text, y) {
      const lines = ('' + text).split('\n');
      for (let i = 0; i < lines.length; i++) {
        this.text(lines[i], 128 - lines[i].length * 4, y + i * 12, '#FCFCFC');
      }
    },

    end() {
      for (let i = used; i < pool.length; i++) {
        const el = pool[i];
        if (el._vis) { el.style.display = 'none'; el._vis = false; }
      }
    },

    // keep the overlay aligned with the letterboxed (object-fit:contain) canvas
    layout() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      const s = Math.min(w / VW, h / VH);
      this.scale = s;
      const rw = VW * s, rh = VH * s;
      this.offX = (w - rw) / 2;
      this.offY = (h - rh) / 2;
      screen.style.left = this.offX + 'px';
      screen.style.top = this.offY + 'px';
      screen.style.width = rw + 'px';
      screen.style.height = rh + 'px';
      screen.style.setProperty('--s', s);
      // positions are cached in real px, so invalidate them on a scale change
      for (const el of pool) { el._left = el._top = null; }
    },
  };
})();

// Track the canvas rect: it changes with window size, orientation and the
// touch pad showing/hiding (which resizes #stage).
(() => {
  const stage = document.getElementById('stage');
  const relayout = () => TextLayer.layout();
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(stage);
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);
  relayout();
})();
