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

  // ---------------- analog stick (position-tracked, free 360°) ----------------
  // Feeds the engine a smooth vector (input.ax/ay) for free movement, and also
  // trips the up/down/left/right booleans past a tilt threshold so the existing
  // screen-scroll / door-unlock / cave-entry logic keeps working.
  const stick = document.getElementById('stick');
  const nub = stick.querySelector('.nub');
  const DEAD = 0.20;   // ignore tiny wobbles near the center
  const AXIS = 0.42;   // tilt past this to trip a d-pad boolean

  function setStick(ax, ay) {
    input.ax = ax; input.ay = ay;
    input.left  = ax < -AXIS ? 1 : 0;
    input.right = ax >  AXIS ? 1 : 0;
    input.up    = ay < -AXIS ? 1 : 0;
    input.down  = ay >  AXIS ? 1 : 0;
  }
  function resetStick() {
    nub.style.transform = 'translate(0px,0px)';
    setStick(0, 0);
  }
  let stickId = null;
  function readStick(e) {
    const r = stick.getBoundingClientRect();
    const max = r.width * 0.34;                        // knob travel radius (px)
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
    nub.style.transform = `translate(${dx}px,${dy}px)`;
    let ax = dx / max, ay = dy / max;
    if (Math.hypot(ax, ay) < DEAD) { ax = 0; ay = 0; }
    setStick(ax, ay);
  }
  stick.addEventListener('pointerdown', e => {
    e.preventDefault(); Audio2.ensure();
    stickId = e.pointerId; stick.classList.add('active');
    try { stick.setPointerCapture(e.pointerId); } catch (_) {}
    readStick(e);
  });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickId) readStick(e); });
  function endStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; stick.classList.remove('active'); resetStick();
  }
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

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
