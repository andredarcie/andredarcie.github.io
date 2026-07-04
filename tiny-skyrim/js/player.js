// First-person player: movement, sword, fireball, shout, stats and levels.

import * as THREE from 'three';
import { getHeight, WATER_Y, WORLD_LIMIT } from 'world';
import { clamp, lerp } from 'utils';

const _fwd = new THREE.Vector3();
const _d = new THREE.Vector3();

export class Player {
  constructor(game) {
    this.game = game;
    this.camera = game.camera;
    this.camera.rotation.order = 'YXZ';
    this.spawn = new THREE.Vector3(0, 0, 30);
    this.spawn.y = getHeight(this.spawn.x, this.spawn.z);
    this.pos = this.spawn.clone();
    this.velY = 0;
    this.grounded = true;
    this.yaw = 0;
    this.pitch = -0.05;
    this.eye = 1.7;
    this.bob = 0;
    this.bobT = 0;
    this.stepT = 0;

    this.maxHp = 100; this.hp = 100;
    this.maxMagicka = 100; this.magicka = 100;
    this.maxStamina = 100; this.stamina = 100;
    this.level = 1; this.xp = 0; this.xpNext = 100;
    this.gold = 0;
    this.swordBonus = 0;
    this.shoutUnlocked = false;
    this.shoutCd = 0;
    this.shoutCdMax = 18;
    this.alive = true;
    this.locked = false;

    this.attackT = 1;
    this.swingHit = true;
    this.hurtT = 0;
    this.shake = 0;
    this.stamPause = 0;

    this.buildSword();
    this.updateCamera();
  }

  buildSword() {
    const g = new THREE.Group();
    const metal = new THREE.MeshLambertMaterial({ color: 0xb9c2c9 });
    this.bladeMat = metal;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.035, 0.78), metal);
    blade.position.z = -0.5;
    g.add(blade);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), metal);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.95;
    g.add(tip);
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.05, 0.06),
      new THREE.MeshLambertMaterial({ color: 0x8a7440 })
    );
    guard.position.z = -0.1;
    g.add(guard);
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6),
      new THREE.MeshLambertMaterial({ color: 0x3a2c20 })
    );
    grip.rotation.x = Math.PI / 2;
    grip.position.z = 0.03;
    g.add(grip);
    g.position.set(0.42, -0.36, -0.72);
    g.rotation.set(0.2, -0.15, 0.08);
    this.sword = g;
    this.camera.add(g);
  }

  setBladeUpgraded() {
    this.bladeMat.color.setHex(0x9fd6df);
    this.bladeMat.emissive.setHex(0x123238);
  }

  addLook(dx, dy) {
    if (this.locked || !this.alive) return;
    this.yaw -= dx * 0.0023;
    this.pitch = clamp(this.pitch - dy * 0.0023, -1.45, 1.45);
  }

  update(dt) {
    const input = this.game.input;
    this.attackT += dt;
    this.shoutCd = Math.max(0, this.shoutCd - dt);
    this.hurtT -= dt;
    this.stamPause -= dt;
    this.shake = Math.max(0, this.shake - dt * 1.6);

    // regen
    if (this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + 0.9 * dt);
      this.magicka = Math.min(this.maxMagicka, this.magicka + 7 * dt);
      if (this.stamPause <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + 14 * dt);
    }

    // movement input
    let mx = 0, my = 0;
    let sprint = false;
    if (!this.locked && this.alive) {
      const k = input.keys;
      if (k.has('KeyW') || k.has('ArrowUp')) my += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
      mx += input.touchMove.x;
      my += input.touchMove.y;
      const len = Math.hypot(mx, my);
      if (len > 1) { mx /= len; my /= len; }
      sprint = (k.has('ShiftLeft') || k.has('ShiftRight') || input.touchSprint) && this.stamina > 2;
    }
    const moving = Math.hypot(mx, my) > 0.1;

    const groundY = getHeight(this.pos.x, this.pos.z);
    const swimming = groundY < WATER_Y - 0.8;
    let speed = swimming ? 4 : sprint && moving ? 13.5 : 8.2;
    if (sprint && moving && !swimming) {
      this.stamina = Math.max(0, this.stamina - 12 * dt);
      this.stamPause = 0.7;
    }

    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    this.pos.x += (fx * my + rx * mx) * speed * dt;
    this.pos.z += (fz * my + rz * mx) * speed * dt;

    // vertical
    if (swimming) {
      this.velY = 0;
      this.pos.y = lerp(this.pos.y, WATER_Y - 0.7, Math.min(1, dt * 4));
      this.grounded = true;
    } else {
      this.velY -= 30 * dt;
      this.pos.y += this.velY * dt;
      if (this.pos.y <= groundY) {
        if (this.velY < -19 && this.alive) {
          this.damage((-this.velY - 19) * 2.5, this.pos);
          this.game.audio.thud();
        }
        this.pos.y = groundY;
        this.velY = 0;
        this.grounded = true;
      } else {
        this.grounded = this.pos.y - groundY < 0.05;
      }
    }
    if (input.jump) {
      input.jump = false;
      if (this.grounded && !swimming && !this.locked && this.alive && this.stamina >= 5) {
        this.velY = 10.5;
        this.grounded = false;
        this.stamina -= 5;
        this.stamPause = 0.7;
      }
    }

    // push out of buildings and stones
    for (const s of this.game.world.solids) {
      const dx = this.pos.x - s.x, dz = this.pos.z - s.z;
      const d = Math.hypot(dx, dz);
      if (d < s.r && d > 0.001) {
        this.pos.x = s.x + (dx / d) * s.r;
        this.pos.z = s.z + (dz / d) * s.r;
      }
    }
    this.pos.x = clamp(this.pos.x, -WORLD_LIMIT, WORLD_LIMIT);
    this.pos.z = clamp(this.pos.z, -WORLD_LIMIT, WORLD_LIMIT);

    // footsteps and head bob
    if (moving && this.grounded && !swimming) {
      this.bobT += dt * (sprint ? 11 : 8);
      this.bob = Math.sin(this.bobT) * 0.055;
      this.stepT += dt * (sprint ? 1.6 : 1);
      if (this.stepT > 0.5) {
        this.stepT = 0;
        this.game.audio.step();
      }
    } else {
      this.bob = lerp(this.bob, 0, Math.min(1, dt * 8));
    }

    // actions
    if (input.attack) { input.attack = false; this.tryAttack(); }
    if (input.fire) { input.fire = false; this.tryFire(); }
    if (input.shout) { input.shout = false; this.tryShout(); }
    if (!this.swingHit && this.attackT >= 0.16) {
      this.swingHit = true;
      this.applyMelee();
    }

    // sword pose
    const p = this.attackT;
    if (p < 0.38) {
      const s = Math.sin((p / 0.38) * Math.PI);
      this.sword.rotation.set(0.2 - s * 1.6, -0.15, 0.08 - s * 0.5);
      this.sword.position.set(0.42, -0.36, -0.72 - s * 0.25);
    } else {
      this.sword.rotation.set(0.2, -0.15, 0.08);
      this.sword.position.set(0.42, -0.36 + this.bob * 0.25, -0.72);
    }

    this.updateCamera();
  }

  updateCamera() {
    const sh = this.shake * 0.35;
    this.camera.position.set(
      this.pos.x + (Math.random() - 0.5) * sh,
      this.pos.y + this.eye + this.bob + (Math.random() - 0.5) * sh,
      this.pos.z + (Math.random() - 0.5) * sh
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  tryAttack() {
    if (this.locked || !this.alive) return;
    if (this.attackT < 0.55) return;
    this.attackT = 0;
    this.swingHit = false;
    this.stamina = Math.max(0, this.stamina - 6);
    this.stamPause = 0.7;
    this.game.audio.swing();
  }

  applyMelee() {
    const dmg = 24 + (this.level - 1) * 4 + this.swordBonus;
    this.camera.getWorldDirection(_fwd);
    const fl = Math.hypot(_fwd.x, _fwd.z) || 0.001;
    const fx = _fwd.x / fl, fz = _fwd.z / fl;
    let hitAny = false;
    for (const e of this.game.enemies.list) {
      if (!e.alive) continue;
      const dx = e.group.position.x - this.pos.x;
      const dz = e.group.position.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 3.7 + e.hitRadius) continue;
      const dy = Math.abs(e.group.position.y - this.pos.y);
      if (dy > 6) continue;
      if (d > 0.001 && (dx / d) * fx + (dz / d) * fz < 0.5) continue;
      e.damage(dmg, this.pos);
      hitAny = true;
    }
    if (hitAny) this.game.audio.hit();
  }

  tryFire() {
    if (this.locked || !this.alive) return;
    if (this.magicka < 25) {
      this.game.hud.toast('Not enough magicka');
      return;
    }
    this.magicka -= 25;
    this.camera.getWorldDirection(_fwd);
    _d.copy(this.camera.position).addScaledVector(_fwd, 1.3);
    this.game.projectiles.spawn({
      owner: 'player', pos: _d, dir: _fwd.clone(), speed: 46, dmg: 42, color: 0xff8c3a, radius: 1.8,
    });
    this.game.audio.fireball();
  }

  tryShout() {
    if (this.locked || !this.alive) return;
    if (!this.shoutUnlocked) {
      this.game.hud.toast('You know no Words of Power yet');
      return;
    }
    if (this.shoutCd > 0) return;
    this.shoutCd = this.shoutCdMax;
    this.shake = 0.55;
    this.game.audio.shout();
    this.game.hud.screenFlash('rgba(150,200,255,0.45)', 0.5);
    this.camera.getWorldDirection(_fwd);
    const fl = Math.hypot(_fwd.x, _fwd.z) || 0.001;
    const fx = _fwd.x / fl, fz = _fwd.z / fl;
    for (const e of this.game.enemies.list) {
      if (!e.alive) continue;
      const dx = e.group.position.x - this.pos.x;
      const dz = e.group.position.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 17 + e.hitRadius || d < 0.001) continue;
      if ((dx / d) * fx + (dz / d) * fz < 0.5) continue;
      if (e.isDragon) {
        e.damage(60, this.pos);
        e.onShouted();
      } else {
        e.damage(35, this.pos);
        e.kb.x += (dx / d) * 24;
        e.kb.z += (dz / d) * 24;
      }
    }
  }

  damage(n, srcPos) {
    if (!this.alive || this.hurtT > 0) return;
    this.hurtT = 0.35;
    this.hp -= n;
    this.shake = Math.max(this.shake, 0.3);
    this.game.hud.damageFlash();
    this.game.audio.playerHurt();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.game.onPlayerDeath();
    }
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  addXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.xpNext = Math.floor(this.xpNext * 1.4);
      this.level++;
      this.maxHp += 15;
      this.maxMagicka += 10;
      this.maxStamina += 10;
      this.hp = this.maxHp;
      this.magicka = this.maxMagicka;
      this.stamina = this.maxStamina;
      this.game.audio.levelUp();
      this.game.hud.announce('LEVEL ' + this.level, 'You feel stronger.');
    }
  }

  addGold(n) {
    this.gold += n;
    this.game.hud.toast('+' + n + ' gold');
    this.game.audio.coin();
  }

  respawn() {
    this.pos.copy(this.spawn);
    this.velY = 0;
    this.hp = this.maxHp;
    this.magicka = this.maxMagicka;
    this.stamina = this.maxStamina;
    this.alive = true;
    this.hurtT = 1;
    this.yaw = 0;
    this.pitch = -0.05;
    this.updateCamera();
  }
}
