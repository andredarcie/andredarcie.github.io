// Skyrim-style HUD: compass, bars, prompts, dialog, announcements, overlays.

import { clamp, normalizeAngle } from 'utils';

export class Hud {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.compass = $('compass');
    this.cctx = this.compass.getContext('2d');
    this.objective = $('objective');
    this.hpBar = $('hpBar'); this.hpFill = $('hpFill');
    this.mgBar = $('mgBar'); this.mgFill = $('mgFill');
    this.stBar = $('stBar'); this.stFill = $('stFill');
    this.prompt = $('prompt');
    this.dialogEl = $('dialog');
    this.dlgName = $('dlgName');
    this.dlgText = $('dlgText');
    this.announceEl = $('announce');
    this.annTitle = $('annTitle');
    this.annSub = $('annSub');
    this.toasts = $('toasts');
    this.vignette = $('vignette');
    this.flash = $('flash');
    this.shoutUI = $('shoutUI');
    this.shoutFill = $('shoutFill');
    this.shoutLabel = $('shoutLabel');
    this.targetEl = $('target');
    this.targetName = $('targetName');
    this.targetFill = $('targetFill');
    this.statLvl = $('statLvl');
    this.statGold = $('statGold');
    this.xpFill = $('xpFill');
    this.deathEl = $('death');
    this.victoryEl = $('victory');
    this.vicStats = $('vicStats');
    this.pausedEl = $('paused');

    this.currentPrompt = null;
    this.target = null;
    this.targetT = 0;
    this.vig = 0;
    this.hpShow = 3; this.mgShow = 3; this.stShow = 3;
  }

  // ---- per-frame ----

  update(dt) {
    const p = this.game.player;

    // bars (fade when full, Skyrim-style)
    this.hpShow = p.hp < p.maxHp - 0.5 ? 2.5 : this.hpShow - dt;
    this.mgShow = p.magicka < p.maxMagicka - 0.5 ? 2.5 : this.mgShow - dt;
    this.stShow = p.stamina < p.maxStamina - 0.5 ? 2.5 : this.stShow - dt;
    this.hpBar.style.opacity = this.hpShow > 0 ? 1 : 0.22;
    this.mgBar.style.opacity = this.mgShow > 0 ? 1 : 0.22;
    this.stBar.style.opacity = this.stShow > 0 ? 1 : 0.22;
    this.hpFill.style.width = (p.hp / p.maxHp * 100) + '%';
    this.mgFill.style.width = (p.magicka / p.maxMagicka * 100) + '%';
    this.stFill.style.width = (p.stamina / p.maxStamina * 100) + '%';

    // level / gold / xp
    this.statLvl.textContent = 'LVL ' + p.level;
    this.statGold.textContent = p.gold + ' gold';
    this.xpFill.style.width = (p.xp / p.xpNext * 100) + '%';

    // shout indicator
    if (p.shoutUnlocked) {
      this.shoutUI.style.display = 'block';
      if (p.shoutCd > 0) {
        this.shoutUI.classList.remove('ready');
        this.shoutFill.style.width = ((1 - p.shoutCd / p.shoutCdMax) * 100) + '%';
        this.shoutLabel.textContent = 'VUS RO DAH';
      } else {
        this.shoutUI.classList.add('ready');
        this.shoutFill.style.width = '100%';
        this.shoutLabel.textContent = 'VUS RO DAH — READY';
      }
    } else {
      this.shoutUI.style.display = 'none';
    }

    // damage vignette decay
    this.vig = Math.max(0, this.vig - dt * 1.3);
    this.vignette.style.opacity = this.vig;

    // enemy target bar: boss takes priority while nearby
    this.targetT -= dt;
    let t = null;
    const dragon = this.game.enemies.dragon;
    if (dragon && dragon.alive) {
      const d = Math.hypot(dragon.group.position.x - p.pos.x, dragon.group.position.z - p.pos.z);
      if (d < 220) t = dragon;
    }
    if (!t && this.target && this.target.alive && this.targetT > 0) t = this.target;
    if (t) {
      this.targetEl.style.display = 'block';
      this.targetName.textContent = t.name;
      this.targetFill.style.width = (t.hp / t.maxHp * 100) + '%';
    } else {
      this.targetEl.style.display = 'none';
    }

    this.drawCompass();
  }

  drawCompass() {
    const ctx = this.cctx;
    const W = this.compass.width, H = this.compass.height;
    ctx.clearRect(0, 0, W, H);
    const p = this.game.player;
    const heading = -p.yaw;
    const HALF = 1.15; // radians visible on each side
    const toX = (rel) => W / 2 + (rel / HALF) * (W / 2);

    // minor ticks every 15 degrees
    ctx.strokeStyle = 'rgba(230,228,216,0.5)';
    ctx.lineWidth = 1;
    for (let deg = 0; deg < 360; deg += 15) {
      const a = deg * Math.PI / 180;
      const rel = normalizeAngle(a - heading);
      if (Math.abs(rel) > HALF) continue;
      const x = toX(rel);
      const major = deg % 90 === 0;
      ctx.beginPath();
      ctx.moveTo(x, major ? 6 : 12);
      ctx.lineTo(x, H - (major ? 12 : 14));
      ctx.stroke();
    }
    // cardinal letters
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    const cards = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
    for (const [label, deg] of cards) {
      const rel = normalizeAngle(deg * Math.PI / 180 - heading);
      if (Math.abs(rel) > HALF) continue;
      ctx.fillStyle = label === 'N' ? '#d8b76a' : '#e6e4d8';
      ctx.fillText(label, toX(rel), H - 3);
    }
    // quest marker
    const m = this.game.quests.getMarkerPos();
    if (m) {
      const dx = m.x - p.pos.x, dz = m.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      const bearing = Math.atan2(dx, -dz);
      const rel = clamp(normalizeAngle(bearing - heading), -HALF * 0.96, HALF * 0.96);
      const x = toX(rel);
      ctx.fillStyle = '#d8b76a';
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.lineTo(x - 5, 11);
      ctx.lineTo(x + 5, 11);
      ctx.closePath();
      ctx.fill();
      ctx.font = '10px Georgia, serif';
      ctx.fillText(Math.round(dist) + 'm', x, 22);
    }
  }

  // ---- widgets ----

  setObjective(text) {
    this.objective.textContent = text ? '◆ ' + text : '';
  }

  setPrompt(text) {
    this.currentPrompt = text;
    if (text) {
      this.prompt.textContent = text;
      this.prompt.style.display = 'block';
    } else {
      this.prompt.style.display = 'none';
    }
  }

  announce(title, sub) {
    this.annTitle.textContent = title;
    this.annSub.textContent = sub || '';
    this.announceEl.classList.remove('show');
    void this.announceEl.offsetWidth;
    this.announceEl.classList.add('show');
  }

  toast(text) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = text;
    this.toasts.appendChild(div);
    while (this.toasts.children.length > 5) this.toasts.removeChild(this.toasts.firstChild);
    setTimeout(() => {
      if (div.parentNode) div.parentNode.removeChild(div);
    }, 3500);
  }

  showDialog(name, text) {
    this.dlgName.textContent = name;
    this.dlgText.textContent = text;
    this.dialogEl.style.display = 'block';
  }

  hideDialog() {
    this.dialogEl.style.display = 'none';
  }

  damageFlash() {
    this.vig = 0.9;
  }

  screenFlash(color, dur) {
    this.flash.style.transition = 'none';
    this.flash.style.background = color;
    this.flash.style.opacity = '1';
    requestAnimationFrame(() => {
      this.flash.style.transition = 'opacity ' + dur + 's';
      this.flash.style.opacity = '0';
    });
  }

  showTarget(enemy) {
    this.target = enemy;
    this.targetT = 5;
  }

  // ---- overlays ----

  showDeath() { this.deathEl.style.display = 'flex'; }
  hideDeath() { this.deathEl.style.display = 'none'; }

  showVictory(stats) {
    const mm = Math.floor(stats.time / 60);
    const ss = Math.floor(stats.time % 60);
    this.vicStats.innerHTML =
      '<div>Time: ' + mm + ':' + String(ss).padStart(2, '0') + '</div>' +
      '<div>Level: ' + stats.level + '</div>' +
      '<div>Gold: ' + stats.gold + '</div>' +
      '<div>Kills: ' + stats.kills + '</div>';
    this.victoryEl.style.display = 'flex';
  }

  hideVictory() { this.victoryEl.style.display = 'none'; }

  showPause(v) { this.pausedEl.style.display = v ? 'flex' : 'none'; }
}
