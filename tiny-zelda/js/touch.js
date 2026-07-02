// Tiny Zelda — touch / mobile controls
// Maps an on-screen D-pad + A/B/START/ITEM/MUTE onto the same `input` object
// that game.js reads. Uses Pointer Events so touch is multi-touch and mouse
// works too. `input`, `Audio2` and `G` are top-level consts from the other
// classic scripts and are visible here in the shared global lexical scope.
'use strict';
(function () {
  // Decide when to show the on-screen pad. Be generous: emulators / DevTools
  // "responsive" mode don't always report pointer:coarse, so also accept a
  // narrow viewport, touch capability, and — as a last resort — reveal the pad
  // the moment a real touch happens.
  const mqCoarse = matchMedia('(pointer: coarse)');
  const mqNoHover = matchMedia('(hover: none)');
  const mqNarrow = matchMedia('(max-width: 820px)');
  let touchSeen = false;
  function wantsTouch() {
    return touchSeen || mqCoarse.matches || mqNoHover.matches || mqNarrow.matches ||
           navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }
  function refreshTouch() { document.body.classList.toggle('touch', wantsTouch()); }
  refreshTouch();
  window.addEventListener('touchstart', () => { touchSeen = true; refreshTouch(); }, { passive: true });
  window.addEventListener('resize', refreshTouch);
  window.addEventListener('orientationchange', refreshTouch);
  [mqCoarse, mqNoHover, mqNarrow].forEach(mq => {
    if (mq.addEventListener) mq.addEventListener('change', refreshTouch);
    else if (mq.addListener) mq.addListener(refreshTouch); // older Safari
  });

  // ---------------- D-pad (position-tracked, 8-way) ----------------
  const dpad = document.getElementById('dpad');
  const arrows = {
    up: dpad.querySelector('.up'), down: dpad.querySelector('.down'),
    left: dpad.querySelector('.left'), right: dpad.querySelector('.right'),
  };
  function setDir(u, d, l, r) {
    input.up = u; input.down = d; input.left = l; input.right = r;
    arrows.up.classList.toggle('on', !!u);
    arrows.down.classList.toggle('on', !!d);
    arrows.left.classList.toggle('on', !!l);
    arrows.right.classList.toggle('on', !!r);
  }
  let dpadId = null;
  function readDpad(e) {
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const t = r.width * 0.16; // per-axis deadzone (corners give diagonals)
    setDir(dy < -t ? 1 : 0, dy > t ? 1 : 0, dx < -t ? 1 : 0, dx > t ? 1 : 0);
  }
  dpad.addEventListener('pointerdown', e => {
    e.preventDefault(); Audio2.ensure();
    dpadId = e.pointerId;
    try { dpad.setPointerCapture(e.pointerId); } catch (_) {}
    readDpad(e);
  });
  dpad.addEventListener('pointermove', e => { if (e.pointerId === dpadId) readDpad(e); });
  function endDpad(e) {
    if (e.pointerId !== dpadId) return;
    dpadId = null; setDir(0, 0, 0, 0);
  }
  dpad.addEventListener('pointerup', endDpad);
  dpad.addEventListener('pointercancel', endDpad);

  // ---------------- buttons that map to an input key ----------------
  // data-btn = 'a' (sword) | 'b' (item) | 'start' (enter) | 'sel' (switch item)
  document.querySelectorAll('[data-btn]').forEach(btn => {
    const key = btn.dataset.btn;
    btn.addEventListener('pointerdown', e => {
      e.preventDefault(); Audio2.ensure();
      input[key] = 1; btn.classList.add('pressed');
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const release = e => { e.preventDefault(); input[key] = 0; btn.classList.remove('pressed'); };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  });

  // ---------------- mute ----------------
  const muteBtn = document.getElementById('btnMute');
  function syncMute() {
    muteBtn.classList.toggle('muted', Audio2.muted);
    muteBtn.textContent = Audio2.muted ? 'MUTED' : 'MUTE';
  }
  muteBtn.addEventListener('pointerdown', e => {
    e.preventDefault(); Audio2.ensure(); Audio2.toggleMute(); syncMute();
  });
  syncMute();
  // keep the label in sync when muting with the M key
  window.addEventListener('keydown', e => { if (e.code === 'KeyM') setTimeout(syncMute, 0); });

  // ---------------- tap the play area to start / continue ----------------
  document.getElementById('stage').addEventListener('pointerdown', () => {
    Audio2.ensure();
    if (G.state === 'title' || G.state === 'gameover' || G.state === 'win') input.start = 1;
  });

  // stop long-press context menu on the controls
  document.getElementById('touch').addEventListener('contextmenu', e => e.preventDefault());
})();
