// Tiny Zelda — player, enemies, bosses, projectiles, pickups
// Room coordinate space: 256 x 176 px (16 x 11 tiles). game.js translates for HUD.
'use strict';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function rectsHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// solid check against current room (G defined in game.js)
function solidAt(px, py) {
  if (px < 0 || py < 0 || px >= 256 || py >= 176) return true;
  return G.isSolid(Math.floor(px / 16), Math.floor(py / 16));
}
function boxBlocked(x, y, w, h) {
  return solidAt(x, y) || solidAt(x + w - 1, y) || solidAt(x, y + h - 1) || solidAt(x + w - 1, y + h - 1) ||
         solidAt(x + w / 2, y) || solidAt(x + w / 2, y + h - 1);
}

// ---------------- Player ----------------
class Player {
  constructor() {
    this.x = START_POS.x; this.y = START_POS.y;
    this.w = 12; this.h = 12; // hitbox (draws 16x16 offset -2)
    this.dir = 'down';
    this.speed = 1.25;
    this.hearts = 3; this.hp = 6;
    this.rupees = 0; this.keys = 0; this.bombs = 0;
    this.hasSword = false; this.hasBow = false; this.hasRing = false;
    this.tunic = false;
    this.triforce = 0;
    this.bItem = null; // 'bombs' | 'bow'
    this.attacking = 0; this.attackHit = new Set();
    this.invuln = 0; this.kb = null;
    this.frame = 0; this.moving = false;
  }
  get maxHp() { return this.hearts * 2; }
  center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }
  hitbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  // Wide slash hitbox: reaches L px ahead AND overhangs S px to each side, so the
  // sword also connects with enemies beside Link — not only the one dead in front.
  swordHitBox() {
    const c = this.hitbox(), L = 20, S = 9;
    switch (this.dir) {
      case 'up':    return { x: c.x - S, y: c.y - L, w: c.w + S * 2, h: L + c.h };
      case 'down':  return { x: c.x - S, y: c.y,     w: c.w + S * 2, h: L + c.h };
      case 'left':  return { x: c.x - L, y: c.y - S, w: L + c.w,     h: c.h + S * 2 };
      case 'right': return { x: c.x,     y: c.y - S, w: L + c.w,     h: c.h + S * 2 };
    }
  }

  update(input) {
    if (this.invuln > 0) this.invuln--;
    if (this.kb) {
      const nx = this.x + this.kb.dx, ny = this.y + this.kb.dy;
      if (!boxBlocked(nx, ny, this.w, this.h)) { this.x = nx; this.y = ny; }
      if (--this.kb.t <= 0) this.kb = null;
      return;
    }
    if (this.attacking > 0) {
      this.attacking--;
      if (this.attacking === 10 && this.hp === this.maxHp && this.hasSword) {
        G.projectiles.push(new Projectile('beam', this.center().x - 3, this.center().y - 3, this.dir, 3.2, 1, true));
        Audio2.sfx.beam();
      }
      return;
    }
    // attack (always consume the press so it can't fire later as a stale input)
    if (input.a) {
      input.a = false;
      if (this.hasSword) {
        this.attacking = 14; this.attackHit.clear();
        Audio2.sfx.sword();
        return;
      }
    }
    if (input.b) { input.b = false; this.useItem(); }

    // movement — free 360° (analog stick sets ax/ay; keyboard falls back to unit axes)
    let mx = 0, my = 0;
    if (input.ax || input.ay) { mx = input.ax; my = input.ay; }
    else {
      if (input.left) mx -= 1; if (input.right) mx += 1;
      if (input.up) my -= 1; if (input.down) my += 1;
    }
    const mag = Math.hypot(mx, my);
    this.moving = mag > 0.12;
    if (this.moving) {
      // face the dominant axis (keeps the 4-dir sprites + sword aim)
      if (Math.abs(mx) > Math.abs(my)) this.dir = mx < 0 ? 'left' : 'right';
      else this.dir = my < 0 ? 'up' : 'down';
      this.frame++;
      const spd = this.speed * Math.min(1, mag);       // partial tilt = slower walk
      const vx = (mx / mag) * spd, vy = (my / mag) * spd; // normalized so diagonals aren't faster
      const nx = this.x + vx, ny = this.y + vy;
      if (!boxBlocked(nx, this.y, this.w, this.h)) this.x = nx;
      if (!boxBlocked(this.x, ny, this.w, this.h)) this.y = ny;
      // half-tile nudge around corners
      if (vx && boxBlocked(nx, this.y, this.w, this.h)) {
        if (!boxBlocked(nx, this.y - 2, this.w, this.h)) this.y -= 1;
        else if (!boxBlocked(nx, this.y + 2, this.w, this.h)) this.y += 1;
      }
      if (vy && boxBlocked(this.x, ny, this.w, this.h)) {
        if (!boxBlocked(this.x - 2, ny, this.w, this.h)) this.x -= 1;
        else if (!boxBlocked(this.x + 2, ny, this.w, this.h)) this.x += 1;
      }
    }
  }

  useItem() {
    if (this.bItem === 'bombs' && this.bombs > 0) {
      this.bombs--;
      const c = this.center(), d = DIRS[this.dir];
      G.bombsLive.push(new Bomb(c.x - 4 + d[0] * 16, c.y - 4 + d[1] * 16));
      Audio2.sfx.bombDrop();
    } else if (this.bItem === 'bow' && this.hasBow) {
      if (this.rupees > 0) {
        this.rupees--;
        const c = this.center();
        G.projectiles.push(new Projectile('arrow', c.x - 2, c.y - 2, this.dir, 3, 2, true));
        Audio2.sfx.arrow();
      } else Audio2.sfx.shield(); // no rupees, no arrows
    }
  }

  hurt(dmg, from) {
    if (this.invuln > 0) return;
    if (this.hasRing) dmg = Math.max(1, Math.floor(dmg / 2));
    this.hp -= dmg;
    this.invuln = 60;
    Audio2.sfx.hurt();
    G.shake = Math.max(G.shake, 6); G.hitStop = Math.max(G.hitStop, 3);
    const c = this.center();
    const dx = Math.sign(c.x - from.x) * 2.5, dy = Math.sign(c.y - from.y) * 2.5;
    this.kb = { dx, dy, t: 10 };
    if (this.hp <= 0) { this.hp = 0; G.playerDied(); }
  }

  draw(ctx) {
    if (this.invuln > 0 && (this.invuln >> 2) % 2) return;
    const f2 = (this.frame >> 3) % 2;
    let name, flip = false;
    if (this.dir === 'down') name = f2 ? 'link_down2' : 'link_down';
    else if (this.dir === 'up') name = f2 ? 'link_up2' : 'link_up';
    else { name = f2 ? 'link_right2' : 'link_right'; flip = this.dir === 'left'; }
    const remap = this.hasRing ? { G: 'u' } : (this.tunic ? { G: 'U' } : null);
    drawSprite(ctx, name, this.x - 2, this.y - 3, { flip, remap });
    if (this.attacking > 2) this.drawSword(ctx);
  }

  // Slash rendered as an arc that sweeps across the front (side to side), matching
  // the wide swordHitBox so the visual sells the lateral reach.
  drawSword(ctx) {
    const c = this.hitbox();
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const d = DIRS[this.dir];
    const baseAng = Math.atan2(d[1], d[0]);
    const prog = Math.max(0, Math.min(1, (13 - this.attacking) / 10)); // 0..1 across the swing
    const spread = 1.15;                                // arc half-width (radians)
    const ang = baseAng - spread + prog * spread * 2;   // sweep one side -> other
    const reach = 18;
    const baseX = cx + Math.cos(baseAng) * 5, baseY = cy + Math.sin(baseAng) * 5;
    // gleam trail lagging behind the blade tip
    for (let i = 0; i < 5; i++) {
      const a = ang - i * 0.16;
      ctx.fillStyle = i % 2 ? '#BCECFC' : '#FCFCFC';
      ctx.fillRect(Math.round(cx + Math.cos(a) * reach) - 1,
                   Math.round(cy + Math.sin(a) * reach) - 1, 3, 3);
    }
    // blade + hilt
    ctx.strokeStyle = '#FCFCFC'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(cx + Math.cos(ang) * reach, cy + Math.sin(ang) * reach);
    ctx.stroke();
    ctx.fillStyle = '#FCB040';
    ctx.fillRect(Math.round(baseX) - 2, Math.round(baseY) - 2, 4, 4);
  }
}

// ---------------- Projectiles ----------------
class Projectile {
  // kind: rock | arrow_e | fireball | beam | arrow
  constructor(kind, x, y, dirOrVec, speed, dmg, friendly) {
    this.kind = kind; this.x = x; this.y = y;
    this.w = 6; this.h = 6; this.dmg = dmg; this.friendly = friendly;
    this.dead = false;
    if (typeof dirOrVec === 'string') {
      const d = DIRS[dirOrVec];
      this.vx = d[0] * speed; this.vy = d[1] * speed; this.dir = dirOrVec;
    } else {
      this.vx = dirOrVec.x * speed; this.vy = dirOrVec.y * speed; this.dir = 'down';
    }
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < -8 || this.y < -8 || this.x > 260 || this.y > 180) this.dead = true;
    // rocks/arrows/beams stop on tall obstacles (but fly over water); fireballs pass everything
    if (!this.dead && this.kind !== 'fireball' && G.shotSolid(this.x + 3, this.y + 3)) this.dead = true;
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.kind === 'rock') {
      ctx.fillStyle = '#787878'; ctx.fillRect(x, y, 6, 6);
      ctx.fillStyle = '#FCFCFC'; ctx.fillRect(x + 1, y + 1, 2, 2);
    } else if (this.kind === 'fireball') {
      ctx.fillStyle = (t >> 2) % 2 ? '#D82800' : '#FCB040';
      ctx.beginPath(); ctx.arc(x + 3, y + 3, 3.5, 0, 7); ctx.fill();
    } else if (this.kind === 'beam') {
      ctx.fillStyle = (t >> 1) % 2 ? '#3CBCFC' : '#FCFCFC';
      if (Math.abs(this.vx) > 0) ctx.fillRect(x - 2, y + 2, 10, 3); else ctx.fillRect(x + 2, y - 2, 3, 10);
    } else { // arrows
      ctx.fillStyle = this.friendly ? '#FCFCFC' : '#C84C0C';
      if (Math.abs(this.vx) > 0) { ctx.fillRect(x - 2, y + 3, 10, 1); ctx.fillRect(this.vx > 0 ? x + 7 : x - 3, y + 2, 2, 3); }
      else { ctx.fillRect(x + 3, y - 2, 1, 10); ctx.fillRect(x + 2, this.vy > 0 ? y + 7 : y - 3, 3, 2); }
    }
  }
}

// ---------------- Bombs ----------------
class Bomb {
  constructor(x, y) { this.x = x; this.y = y; this.t = 70; this.dead = false; }
  update() {
    if (--this.t === 0) {
      this.dead = true;
      G.explosions.push(new Explosion(this.x + 4, this.y + 4));
      Audio2.sfx.boom();
    }
  }
  draw(ctx) { drawSprite(ctx, 'bomb', this.x, this.y); }
}
class Explosion {
  constructor(x, y) { this.x = x; this.y = y; this.t = 24; this.r = 26; this.dead = false; this.hit = new Set(); G.shake = Math.max(G.shake, 8); }
  update() {
    if (--this.t <= 0) this.dead = true;
    G.bombDamage(this);
  }
  draw(ctx) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + this.t * 0.2, r = (24 - this.t) * 1.2;
      ctx.fillStyle = (this.t >> 1) % 2 ? '#FCB040' : '#D82800';
      ctx.fillRect(this.x + Math.cos(a) * r - 3, this.y + Math.sin(a) * r - 3, 7, 7);
    }
  }
}

// ---------------- Pickups ----------------
class Pickup {
  // kind: heart | rupee | rupee5 | bomb | key
  constructor(kind, x, y) { this.kind = kind; this.x = x; this.y = y; this.w = 8; this.h = 8; this.t = 600; this.dead = false; }
  update() {
    if (this.kind !== 'key' && --this.t <= 0) this.dead = true; // keys never expire (and never blink)
    if (rectsHit(this, G.player.hitbox())) { this.collect(); this.dead = true; }
  }
  collect() {
    const p = G.player;
    switch (this.kind) {
      case 'heart': p.hp = Math.min(p.maxHp, p.hp + 2); Audio2.sfx.heart(); break;
      case 'rupee': p.rupees = Math.min(255, p.rupees + 1); Audio2.sfx.rupee(); break;
      case 'rupee5': p.rupees = Math.min(255, p.rupees + 5); Audio2.sfx.rupee(); break;
      case 'bomb': p.bombs = Math.min(8, p.bombs + 2); if (!p.bItem) p.bItem = 'bombs'; Audio2.sfx.rupee(); break;
      case 'key': p.keys++; Audio2.sfx.key(); break;
    }
  }
  draw(ctx, t) {
    if (this.t < 120 && (this.t >> 2) % 2) return;
    const s = { heart: 'heart', rupee: 'rupee', rupee5: 'rupee_y', bomb: 'bomb', key: 'key' }[this.kind];
    drawSprite(ctx, s, this.x, this.y);
  }
}

// ---------------- Enemies ----------------
const ENEMY_DEFS = {
  octorok:   { hp: 1, dmg: 1, speed: 0.55, sprite: 'octorok', kind: 'walker', shoots: 'rock' },
  octorok_b: { hp: 2, dmg: 1, speed: 0.75, sprite: 'octorok', kind: 'walker', shoots: 'rock', remap: { R: 'U', r: 'u' } },
  moblin:    { hp: 2, dmg: 2, speed: 0.6,  sprite: 'moblin',  kind: 'walker', shoots: 'arrow_e' },
  tektite:   { hp: 1, dmg: 1, speed: 0,    sprite: 'tektite', kind: 'hopper' },
  keese:     { hp: 1, dmg: 1, speed: 0.9,  sprite: 'keese1',  kind: 'flyer' },
  stalfos:   { hp: 2, dmg: 1, speed: 0.55, sprite: 'stalfos', kind: 'walker' },
  stalfos_b: { hp: 3, dmg: 2, speed: 0.85, sprite: 'stalfos', kind: 'walker', remap: { W: 'u' } },
  zol:       { hp: 1, dmg: 1, speed: 0.4,  sprite: 'zol',     kind: 'walker' },
};

class Enemy {
  constructor(type, x, y) {
    const d = ENEMY_DEFS[type];
    this.type = type; this.def = d;
    this.x = x; this.y = y; this.w = 13; this.h = 13;
    this.hp = d.hp; this.dead = false;
    this.dir = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
    // run mutators: HASTE speeds movement, FRENZY shortens shoot cooldowns
    this.spd = d.speed * (G.hasMod('haste') ? 1.45 : 1);
    this.shootMul = G.hasMod('frenzy') ? 0.5 : 1;
    this.moveT = 20 + Math.random() * 40;
    this.shootT = (90 + Math.random() * 150) * this.shootMul;
    this.stun = 0; this.kb = null; this.flash = 0;
    this.spawnT = 30; // poof-in
    // hopper state
    this.vy = 0; this.hopT = 30 + Math.random() * 60; this.hx = 0;
  }
  center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  update() {
    if (this.spawnT > 0) { this.spawnT--; return; }
    if (this.flash > 0) this.flash--;
    if (this.kb) {
      const nx = this.x + this.kb.dx, ny = this.y + this.kb.dy;
      if (!boxBlocked(nx, ny, this.w, this.h)) { this.x = nx; this.y = ny; }
      if (--this.kb.t <= 0) this.kb = null;
      return;
    }
    if (this.stun > 0) { this.stun--; return; }
    const k = this.def.kind;
    if (k === 'walker') this.walk();
    else if (k === 'flyer') this.fly();
    else if (k === 'hopper') this.hop();
    if (this.def.shoots && --this.shootT <= 0) {
      this.shootT = (140 + Math.random() * 160) * this.shootMul;
      const c = this.center(), p = G.player.center();
      // shoot roughly toward player along an axis
      let dir;
      if (Math.abs(p.x - c.x) > Math.abs(p.y - c.y)) dir = p.x > c.x ? 'right' : 'left';
      else dir = p.y > c.y ? 'down' : 'up';
      this.dir = dir;
      G.projectiles.push(new Projectile(this.def.shoots === 'rock' ? 'rock' : 'arrow_e',
        c.x - 3, c.y - 3, dir, 1.8, this.def.dmg, false));
    }
  }

  walk() {
    if (--this.moveT <= 0) {
      this.moveT = 25 + Math.random() * 50;
      const dirs = ['up', 'down', 'left', 'right'];
      // slight bias toward player
      const p = G.player.center(), c = this.center();
      if (Math.random() < 0.4) {
        this.dir = Math.abs(p.x - c.x) > Math.abs(p.y - c.y)
          ? (p.x > c.x ? 'right' : 'left') : (p.y > c.y ? 'down' : 'up');
      } else this.dir = dirs[Math.floor(Math.random() * 4)];
    }
    const d = DIRS[this.dir];
    const nx = this.x + d[0] * this.spd, ny = this.y + d[1] * this.spd;
    if (!boxBlocked(nx, ny, this.w, this.h)) { this.x = nx; this.y = ny; }
    else this.moveT = 0;
  }

  fly() {
    if (--this.moveT <= 0) {
      this.moveT = 40 + Math.random() * 60;
      const a = Math.random() * Math.PI * 2;
      this.fvx = Math.cos(a) * this.spd; this.fvy = Math.sin(a) * this.spd;
    }
    // walls block flyers too: move per-axis, bounce off whatever is solid
    const nx = this.x + (this.fvx || 0), ny = this.y + (this.fvy || 0);
    if (!boxBlocked(nx, this.y, this.w, this.h)) this.x = nx; else this.fvx = -(this.fvx || 0);
    if (!boxBlocked(this.x, ny, this.w, this.h)) this.y = ny; else this.fvy = -(this.fvy || 0);
    this.x = Math.max(2, Math.min(256 - this.w - 2, this.x));
    this.y = Math.max(2, Math.min(176 - this.h - 2, this.y));
  }

  hop() {
    if (this.hopT > 0) { this.hopT--; return; }
    if (this.vy === 0 && this.hopY === undefined) {
      this.hopY = this.y; this.vy = -2.2;
      this.hx = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random());
      const p = G.player.center();
      if (Math.random() < 0.5) this.hx = Math.sign(p.x - this.center().x) * (0.5 + Math.random());
    }
    this.vy += 0.12;
    this.y += this.vy;
    // walls block the hop too: test the horizontal move at ground level, bounce off
    const groundY = this.hopY !== undefined ? this.hopY : this.y;
    const nx = this.x + this.hx;
    if (!boxBlocked(nx, groundY, this.w, this.h)) this.x = nx; else this.hx = -this.hx;
    this.x = Math.max(2, Math.min(256 - this.w - 2, this.x));
    if (this.vy > 0 && this.y >= this.hopY) {
      this.y = this.hopY; this.vy = 0; this.hopY = undefined;
      this.hopT = 40 + Math.random() * 80;
    }
  }

  takeHit(dmg, from) {
    if (this.spawnT > 0 || this.flash > 0) return false;
    this.hp -= dmg;
    this.flash = 12;
    Audio2.sfx.hitEnemy();
    const c = this.center();
    this.kb = { dx: Math.sign(c.x - from.x) * 2.2, dy: Math.sign(c.y - from.y) * 2.2, t: 8 };
    if (this.hp <= 0) { this.die(); }
    return true;
  }

  die() {
    this.dead = true;
    Audio2.sfx.kill();
    G.poofs.push({ x: this.x, y: this.y, t: 16 });
    G.onEnemyDead(this);
  }

  draw(ctx, t) {
    if (this.spawnT > 0) {
      ctx.fillStyle = (this.spawnT >> 2) % 2 ? '#FCB040' : '#D82800';
      ctx.fillRect(this.x + 4, this.y + 2, 5, 11); ctx.fillRect(this.x + 1, this.y + 5, 11, 5);
      return;
    }
    let name = this.def.sprite;
    if (this.type === 'keese') name = (t >> 3) % 2 ? 'keese1' : 'keese2';
    let remap = this.def.remap || null;
    if (this.flash > 0 && (this.flash >> 1) % 2) remap = Object.assign({}, remap, { R: 'W', U: 'W', k: 'W', g: 'W', B: 'W', W: 'r' });
    const flip = this.dir === 'left' || ((t >> 4) % 2 === 0 && this.def.kind === 'walker');
    drawSprite(ctx, name, this.x - 1, this.y - 2, { flip, remap });
  }
}

// ---------------- Bosses ----------------
class Boss {
  constructor(kind) {
    this.kind = kind; this.dead = false; this.flash = 0; this.t = 0;
    if (kind === 'aquamentus') { this.x = 176; this.y = 48; this.w = 24; this.h = 24; this.hp = 6; this.vy = 0.5; }
    if (kind === 'dodongo')    { this.x = 96;  this.y = 80; this.w = 30; this.h = 15; this.hp = 2; this.dir = 'left'; this.moveT = 60; }
    if (kind === 'ganon')      { this.x = 112; this.y = 64; this.w = 22; this.h = 22; this.hp = 8; this.visT = 0; this.telT = 60; }
    Audio2.sfx.bossRoar();
  }
  center() { return { x: this.x + this.w / 2, y: this.y + this.h / 2 }; }

  update() {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.kind === 'aquamentus') {
      this.y += this.vy;
      if (this.y < 24 || this.y > 120) this.vy *= -1;
      if (this.t % 130 === 0) {
        const c = { x: this.x + 2, y: this.y + 8 };
        for (const dy of [-0.35, 0, 0.35]) {
          const m = Math.hypot(1, dy);              // normalize so the diagonal shots aren't faster
          G.projectiles.push(new Projectile('fireball', c.x, c.y, { x: -1 / m, y: dy / m }, 1.6, 2, false));
        }
      }
    } else if (this.kind === 'dodongo') {
      if (--this.moveT <= 0) { this.moveT = 50 + Math.random() * 80; this.dir = ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)]; }
      const d = DIRS[this.dir];
      const nx = this.x + d[0] * 0.45, ny = this.y + d[1] * 0.45;
      if (!boxBlocked(nx, ny, this.w, this.h)) { this.x = nx; this.y = ny; } else this.moveT = 0;
    } else if (this.kind === 'ganon') {
      if (this.visT > 0) this.visT--;
      if (--this.telT <= 0) {
        this.telT = 90 + Math.random() * 90;
        this.x = 32 + Math.random() * 176; this.y = 32 + Math.random() * 96;
        const c = this.center(), p = G.player.center();
        const dx = p.x - c.x, dy = p.y - c.y, m = Math.hypot(dx, dy) || 1;
        G.projectiles.push(new Projectile('fireball', c.x, c.y, { x: dx / m, y: dy / m }, 1.9, 2, false));
      }
    }
  }

  takeHit(dmg, from, source) {
    if (this.flash > 0) return false;
    if (this.kind === 'dodongo' && source !== 'bomb') { Audio2.sfx.shield(); return false; }
    if (this.kind === 'ganon' && source === 'bomb') return false;
    this.hp -= dmg;
    this.flash = 20;
    G.shake = Math.max(G.shake, 5); G.hitStop = Math.max(G.hitStop, 3);
    if (this.kind === 'ganon') this.visT = 50;
    Audio2.sfx.hitEnemy();
    if (this.hp <= 0) {
      this.dead = true;
      Audio2.sfx.kill(); Audio2.sfx.bossRoar();
      G.poofs.push({ x: this.x, y: this.y, t: 30 });
      G.onBossDead(this);
    }
    return true;
  }

  draw(ctx, t) {
    const flashing = this.flash > 0 && (this.flash >> 1) % 2;
    if (this.kind === 'aquamentus') {
      drawSprite(ctx, 'aquamentus', this.x - 4, this.y - 4, { remap: flashing ? { g: 'W', d: 'K' } : null });
    } else if (this.kind === 'dodongo') {
      drawSprite(ctx, 'dodongo', this.x - 1, this.y - 1, { flip: this.dir === 'right', remap: flashing ? { K: 'W' } : null });
    } else if (this.kind === 'ganon') {
      const visible = this.visT > 0 || (t >> 3) % 8 === 0;
      if (visible) drawSprite(ctx, 'ganon', this.x - 1, this.y - 1, { remap: flashing ? { U: 'W' } : (this.visT > 0 ? { U: 'S' } : null) });
    }
  }
}
