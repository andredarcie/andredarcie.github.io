// Mobile controls: floating joystick (left), look drag (right), action buttons.

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.enabled = ('ontouchstart' in window || navigator.maxTouchPoints > 0)
      && window.matchMedia('(pointer: coarse)').matches;
    if (!this.enabled) return;
    document.body.classList.add('touch');

    this.stick = document.getElementById('stick');
    this.knob = document.getElementById('knob');
    this.btnE = document.getElementById('btnE');
    this.btnShout = document.getElementById('btnShout');
    this.moveId = null;
    this.lookId = null;
    this.origin = { x: 0, y: 0 };
    this.lastLook = { x: 0, y: 0 };

    const layer = document.getElementById('touchLayer');
    layer.addEventListener('touchstart', (e) => this.onStart(e), { passive: false });
    layer.addEventListener('touchmove', (e) => this.onMove(e), { passive: false });
    layer.addEventListener('touchend', (e) => this.onEnd(e), { passive: false });
    layer.addEventListener('touchcancel', (e) => this.onEnd(e), { passive: false });

    const bind = (id, flag) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.game.input[flag] = true;
      }, { passive: false });
    };
    bind('btnAtk', 'attack');
    bind('btnFire', 'fire');
    bind('btnJump', 'jump');
    bind('btnShout', 'shout');
    bind('btnE', 'interact');
  }

  onStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.moveId === null && t.clientX < window.innerWidth * 0.45 && t.clientY > window.innerHeight * 0.3) {
        this.moveId = t.identifier;
        this.origin.x = t.clientX;
        this.origin.y = t.clientY;
        this.stick.style.display = 'block';
        this.stick.style.left = (t.clientX - 55) + 'px';
        this.stick.style.top = (t.clientY - 55) + 'px';
        this.knob.style.transform = 'translate(0px, 0px)';
      } else if (this.lookId === null) {
        this.lookId = t.identifier;
        this.lastLook.x = t.clientX;
        this.lastLook.y = t.clientY;
      }
    }
  }

  onMove(e) {
    e.preventDefault();
    const input = this.game.input;
    for (const t of e.changedTouches) {
      if (t.identifier === this.moveId) {
        let dx = t.clientX - this.origin.x;
        let dy = t.clientY - this.origin.y;
        const len = Math.hypot(dx, dy);
        const max = 48;
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        this.knob.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        input.touchMove.x = dx / max;
        input.touchMove.y = -dy / max;
        input.touchSprint = len > max * 0.92;
      } else if (t.identifier === this.lookId) {
        const dx = t.clientX - this.lastLook.x;
        const dy = t.clientY - this.lastLook.y;
        this.lastLook.x = t.clientX;
        this.lastLook.y = t.clientY;
        this.game.player.addLook(dx * 2.4, dy * 2.4);
      }
    }
  }

  onEnd(e) {
    e.preventDefault();
    const input = this.game.input;
    for (const t of e.changedTouches) {
      if (t.identifier === this.moveId) {
        this.moveId = null;
        input.touchMove.x = 0;
        input.touchMove.y = 0;
        input.touchSprint = false;
        this.stick.style.display = 'none';
      } else if (t.identifier === this.lookId) {
        this.lookId = null;
      }
    }
  }

  update() {
    if (!this.enabled) return;
    const q = this.game.quests;
    const showE = !!this.game.hud.currentPrompt || q.dialogActive;
    this.btnE.style.display = showE ? 'flex' : 'none';
    this.btnShout.style.display = this.game.player.shoutUnlocked ? 'flex' : 'none';
  }
}
