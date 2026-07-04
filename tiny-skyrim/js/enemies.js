// Wolves, draugr and the dragon Korvaldr.

import * as THREE from 'three';
import { getHeight, WATER_Y, WALL_POS } from 'world';
import { lerp, rand, randRange } from 'utils';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

class Enemy {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.alive = true;
    this.gone = false;
    this.provoked = false;
    this.deathT = 0;
    this.kb = new THREE.Vector3();
    this.flashMats = [];
    this.centerOff = new THREE.Vector3(0, 1, 0);
    this.isDragon = false;
  }

  center(out) {
    return out.copy(this.group.position).add(this.centerOff);
  }

  flash() {
    for (const m of this.flashMats) m.emissive.setHex(0x8a2020);
  }

  fadeFlash(dt) {
    for (const m of this.flashMats) m.emissive.multiplyScalar(Math.max(0, 1 - dt * 6));
  }

  damage(n, srcPos) {
    if (!this.alive) return;
    this.hp -= n;
    this.provoked = true;
    this.flash();
    this.game.hud.showTarget(this);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  giveRewards() {
    const game = this.game;
    game.kills++;
    game.player.addXp(this.xp);
    game.player.addGold(Math.round(randRange(this.goldMin, this.goldMax)));
  }
}

class Wolf extends Enemy {
  constructor(game, x, z) {
    super(game);
    this.name = 'Wolf';
    this.hp = 60; this.maxHp = 60;
    this.speed = 8.5;
    this.dmg = 12;
    this.aggro = 30;
    this.atkRange = 2.6;
    this.atkCd = 0;
    this.xp = 30; this.goldMin = 4; this.goldMax = 12;
    this.hitRadius = 1.1;
    this.centerOff.set(0, 0.8, 0);
    this.home = { x, z };
    this.wanderT = 0;
    this.target = { x, z };
    this.walkT = 0;
    this.growled = false;

    const mat = new THREE.MeshLambertMaterial({ color: 0x6f6c66 });
    this.flashMats.push(mat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.6), mat);
    body.position.y = 0.75;
    this.group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), mat);
    head.position.set(0, 1.05, 1.0);
    this.group.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.35), mat);
    snout.position.set(0, 0.95, 1.4);
    this.group.add(snout);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.7), mat);
    tail.position.set(0, 0.95, -1.1);
    tail.rotation.x = 0.5;
    this.group.add(tail);
    this.legs = [];
    for (const lx of [-0.25, 0.25]) {
      for (const lz of [-0.55, 0.55]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), mat);
        leg.position.set(lx, 0.3, lz);
        this.group.add(leg);
        this.legs.push(leg);
      }
    }
    this.group.position.set(x, getHeight(x, z), z);
    game.scene.add(this.group);
  }

  update(dt) {
    if (!this.alive) {
      this.deathT += dt;
      this.group.rotation.z = lerp(this.group.rotation.z, 1.5, Math.min(1, dt * 5));
      if (this.deathT > 2.5) this.group.position.y -= dt * 0.6;
      if (this.deathT > 5) {
        this.gone = true;
        this.game.scene.remove(this.group);
      }
      return;
    }
    this.fadeFlash(dt);
    this.atkCd -= dt;
    const pl = this.game.player;
    const dx = pl.pos.x - this.group.position.x;
    const dz = pl.pos.z - this.group.position.z;
    const d = Math.hypot(dx, dz);
    const chasing = pl.alive && (this.provoked || d < this.aggro) && d < 70;
    if (!chasing) this.provoked = false;

    let mx = 0, mz = 0, spd = 0;
    if (chasing) {
      if (!this.growled) { this.growled = true; this.game.audio.growl(); }
      if (d > this.atkRange) {
        mx = dx / d; mz = dz / d; spd = this.speed;
      } else if (this.atkCd <= 0) {
        this.atkCd = 1.15;
        pl.damage(this.dmg, this.group.position);
      }
      this.group.rotation.y = Math.atan2(dx, dz);
    } else {
      this.growled = false;
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = randRange(3, 6);
        this.target.x = this.home.x + randRange(-14, 14);
        this.target.z = this.home.z + randRange(-14, 14);
      }
      const tx = this.target.x - this.group.position.x;
      const tz = this.target.z - this.group.position.z;
      const td = Math.hypot(tx, tz);
      if (td > 1.5) {
        mx = tx / td; mz = tz / td; spd = 2;
        this.group.rotation.y = Math.atan2(mx, mz);
      }
    }
    this.group.position.x += (mx * spd + this.kb.x) * dt;
    this.group.position.z += (mz * spd + this.kb.z) * dt;
    this.kb.multiplyScalar(Math.max(0, 1 - dt * 4));
    this.group.position.y = getHeight(this.group.position.x, this.group.position.z);

    if (spd > 0.5) {
      this.walkT += dt * (spd > 4 ? 11 : 5);
      this.legs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(this.walkT + (i % 2) * Math.PI) * 0.55;
      });
    }
  }

  die() {
    this.alive = false;
    this.deathT = 0;
    this.giveRewards();
  }
}

class Draugr extends Enemy {
  constructor(game, x, z) {
    super(game);
    this.name = 'Draugr';
    this.hp = 90; this.maxHp = 90;
    this.speed = 5;
    this.dmg = 18;
    this.aggro = 24;
    this.atkRange = 2.9;
    this.atkCd = 0;
    this.atkAnim = -1;
    this.xp = 50; this.goldMin = 10; this.goldMax = 25;
    this.hitRadius = 1.0;
    this.centerOff.set(0, 1.3, 0);
    this.home = { x, z };
    this.wanderT = 0;
    this.target = { x, z };
    this.walkT = 0;

    const mat = new THREE.MeshLambertMaterial({ color: 0x707a68 });
    const armor = new THREE.MeshLambertMaterial({ color: 0x4b4f45 });
    this.flashMats.push(mat, armor);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), armor);
    body.position.y = 1.15;
    this.group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), mat);
    head.position.y = 1.95;
    this.group.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x53d7ff });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), eyeMat);
      eye.position.set(s * 0.11, 0.05, 0.22);
      head.add(eye);
    }
    this.legsArr = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.25), armor);
      leg.position.set(s * 0.18, 0.37, 0);
      this.group.add(leg);
      this.legsArr.push(leg);
    }
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.2), mat);
    armL.position.set(-0.45, 1.35, 0);
    this.group.add(armL);
    this.armR = new THREE.Group();
    this.armR.position.set(0.45, 1.6, 0);
    const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.2), mat);
    armRMesh.position.y = -0.3;
    this.armR.add(armRMesh);
    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.95, 0.14),
      new THREE.MeshLambertMaterial({ color: 0x8b9299 })
    );
    sword.position.set(0, -0.95, 0.15);
    this.armR.add(sword);
    this.group.add(this.armR);
    this.group.position.set(x, getHeight(x, z), z);
    game.scene.add(this.group);
  }

  update(dt) {
    if (!this.alive) {
      this.deathT += dt;
      this.group.rotation.x = lerp(this.group.rotation.x, -1.5, Math.min(1, dt * 4));
      if (this.deathT > 2.5) this.group.position.y -= dt * 0.5;
      if (this.deathT > 5) {
        this.gone = true;
        this.game.scene.remove(this.group);
      }
      return;
    }
    this.fadeFlash(dt);
    this.atkCd -= dt;
    const pl = this.game.player;
    const dx = pl.pos.x - this.group.position.x;
    const dz = pl.pos.z - this.group.position.z;
    const d = Math.hypot(dx, dz);
    const chasing = pl.alive && (this.provoked || d < this.aggro) && d < 60;
    if (!chasing) this.provoked = false;

    let mx = 0, mz = 0, spd = 0;
    if (chasing) {
      this.group.rotation.y = Math.atan2(dx, dz);
      if (d > this.atkRange) {
        mx = dx / d; mz = dz / d; spd = this.speed;
      } else if (this.atkCd <= 0) {
        this.atkCd = 1.5;
        this.atkAnim = 0;
      }
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = randRange(4, 8);
        this.target.x = this.home.x + randRange(-6, 6);
        this.target.z = this.home.z + randRange(-6, 6);
      }
      const tx = this.target.x - this.group.position.x;
      const tz = this.target.z - this.group.position.z;
      const td = Math.hypot(tx, tz);
      if (td > 1) {
        mx = tx / td; mz = tz / td; spd = 1.2;
        this.group.rotation.y = Math.atan2(mx, mz);
      }
    }
    // sword swing: raise then strike, damage lands mid-swing
    if (this.atkAnim >= 0) {
      const prev = this.atkAnim;
      this.atkAnim += dt;
      if (prev < 0.3 && this.atkAnim >= 0.3 && d < this.atkRange + 0.8 && pl.alive) {
        pl.damage(this.dmg, this.group.position);
      }
      const p = this.atkAnim / 0.6;
      this.armR.rotation.x = p < 0.5 ? lerp(0, -2.1, p * 2) : lerp(-2.1, 0.4, (p - 0.5) * 2);
      if (this.atkAnim > 0.6) { this.atkAnim = -1; this.armR.rotation.x = 0; }
    }
    this.group.position.x += (mx * spd + this.kb.x) * dt;
    this.group.position.z += (mz * spd + this.kb.z) * dt;
    this.kb.multiplyScalar(Math.max(0, 1 - dt * 4));
    this.group.position.y = getHeight(this.group.position.x, this.group.position.z);
    if (spd > 0.3) {
      this.walkT += dt * 7;
      this.legsArr.forEach((leg, i) => {
        leg.rotation.x = Math.sin(this.walkT + i * Math.PI) * 0.5;
      });
    }
  }

  die() {
    this.alive = false;
    this.deathT = 0;
    this.giveRewards();
  }
}

class Dragon extends Enemy {
  constructor(game) {
    super(game);
    this.isDragon = true;
    this.name = 'Korvaldr the Black';
    this.hp = 650; this.maxHp = 650;
    this.xp = 500; this.goldMin = 200; this.goldMax = 200;
    this.hitRadius = 6;
    this.centerOff.set(0, 0, 0);
    this.state = 'circling';
    this.angle = 0;
    this.t = 0;
    this.breathT = 4;
    this.roarT = 3;
    this.perchDecideT = 18;
    this.perchT = 0;
    this.staggerT = 0;
    this.biteT = 0;
    this.dyingT = 0;
    this.soul = null;
    this.soulT = 0;
    this.finished = false;
    this.landPos = new THREE.Vector3();
    this.vel = new THREE.Vector3();

    const dark = new THREE.MeshLambertMaterial({ color: 0x2e2224 });
    const darker = new THREE.MeshLambertMaterial({ color: 0x231a1c });
    this.flashMats.push(dark, darker);
    const g = this.group;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), dark);
    body.scale.set(1, 0.85, 2.6);
    g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.6, 7), dark);
    neck.position.set(0, 0.9, 3.8);
    neck.rotation.x = 1.0;
    g.add(neck);
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 1.7), dark);
    this.head.position.set(0, 1.8, 5.1);
    g.add(this.head);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 1.2), darker);
    jaw.position.set(0, -0.4, 0.25);
    this.head.add(jaw);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffa030 });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), eyeMat);
      eye.position.set(s * 0.3, 0.15, 0.7);
      this.head.add(eye);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.75, 5), darker);
      horn.position.set(s * 0.28, 0.4, -0.6);
      horn.rotation.x = -0.8;
      this.head.add(horn);
    }
    this.wingL = new THREE.Group();
    this.wingL.position.set(-1.2, 0.5, 0.8);
    const memL = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 3), darker);
    memL.position.x = -3.5;
    this.wingL.add(memL);
    g.add(this.wingL);
    this.wingR = new THREE.Group();
    this.wingR.position.set(1.2, 0.5, 0.8);
    const memR = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 3), darker);
    memR.position.x = 3.5;
    this.wingR.add(memR);
    g.add(this.wingR);
    const tailSegs = [
      [0.9, 0.7, 2.4, -4.6, 0],
      [0.6, 0.5, 2.2, -6.7, 0.1],
      [0.35, 0.35, 2.0, -8.6, 0.2],
    ];
    for (const [w, h, l, z, y] of tailSegs) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), dark);
      seg.position.set(0, y, z);
      g.add(seg);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), darker);
        leg.position.set(sx * 1.0, -1.4, sz * 1.4);
        g.add(leg);
      }
    }
    g.scale.setScalar(1.3);
    g.position.set(WALL_POS.x, getHeight(WALL_POS.x, WALL_POS.z) + 50, WALL_POS.z);
    game.scene.add(g);
  }

  onShouted() {
    if (this.state === 'circling' || this.state === 'takeoff') {
      this.state = 'landing';
      const p = this.group.position;
      this.landPos.set(p.x, 0, p.z);
      this.landPos.y = getHeight(p.x, p.z) + 2.6;
      this.staggerT = 4;
      this.game.hud.announce('KORVALDR IS STAGGERED', 'He crashes to the ground!');
    } else if (this.state === 'perched' || this.state === 'landing') {
      this.staggerT = 3;
      this.perchT = Math.max(this.perchT, 4);
    }
  }

  spitFire(count) {
    this.pending = this.pending || [];
    for (let i = 0; i < count; i++) this.pending.push(i * 0.22);
  }

  firePending(dt) {
    if (!this.pending || !this.pending.length) return;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i] -= dt;
      if (this.pending[i] <= 0) {
        this.pending.splice(i, 1);
        const pl = this.game.player;
        if (!pl.alive) continue;
        this.head.getWorldPosition(_v);
        _v2.copy(pl.pos);
        _v2.y += 1.2;
        _v2.x += randRange(-1.5, 1.5);
        _v2.z += randRange(-1.5, 1.5);
        _v2.sub(_v);
        this.game.projectiles.spawn({
          owner: 'dragon', pos: _v, dir: _v2, speed: 34, dmg: 14, color: 0xff5a20, radius: 1.5,
        });
        this.game.audio.fireball();
      }
    }
  }

  update(dt) {
    if (this.finished) return;
    this.t += dt;
    const pl = this.game.player;
    const g = this.group;

    if (this.state === 'dying') {
      this.dyingT += dt;
      const groundY = getHeight(g.position.x, g.position.z) + 1.4;
      if (this.dyingT < 1.4) {
        g.position.y = lerp(g.position.y, groundY, Math.min(1, dt * 3));
        g.rotation.z = lerp(g.rotation.z, 0.5, Math.min(1, dt * 2));
        this.wingL.rotation.z = lerp(this.wingL.rotation.z, 1.2, dt * 2);
        this.wingR.rotation.z = lerp(this.wingR.rotation.z, -1.2, dt * 2);
        return;
      }
      if (!this.soul) {
        // soul absorb stream
        this.game.audio.absorb();
        this.game.hud.screenFlash('rgba(255,225,150,0.55)', 2.2);
        const N = 90;
        this.soulStarts = [];
        const arr = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          const s = new THREE.Vector3(
            g.position.x + randRange(-5, 5),
            g.position.y + randRange(-1, 4),
            g.position.z + randRange(-5, 5)
          );
          this.soulStarts.push(s);
          arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
        this.soul = new THREE.Points(geo, new THREE.PointsMaterial({
          color: 0xffd77a, size: 0.55, transparent: true, opacity: 0.95,
          depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        this.game.scene.add(this.soul);
        this.soulT = 0;
        return;
      }
      this.soulT += dt;
      const k = Math.min(1, this.soulT / 2.4);
      const ease = k * k * (3 - 2 * k);
      const attr = this.soul.geometry.attributes.position;
      _v2.copy(pl.pos);
      _v2.y += 1.2;
      for (let i = 0; i < this.soulStarts.length; i++) {
        const s = this.soulStarts[i];
        attr.setXYZ(
          i,
          lerp(s.x, _v2.x, ease) + Math.sin(this.soulT * 6 + i) * (1 - ease) * 0.8,
          lerp(s.y, _v2.y, ease) + Math.cos(this.soulT * 5 + i * 2) * (1 - ease) * 0.8,
          lerp(s.z, _v2.z, ease)
        );
      }
      attr.needsUpdate = true;
      this.soul.material.opacity = k < 0.8 ? 0.95 : 0.95 * (1 - (k - 0.8) / 0.2);
      if (k >= 1) {
        this.game.scene.remove(this.soul);
        this.finished = true;
        this.game.quests.onDragonSlain();
      }
      return;
    }

    this.fadeFlash(dt);
    this.staggerT -= dt;
    this.firePending(dt);
    const dx = pl.pos.x - g.position.x;
    const dz = pl.pos.z - g.position.z;
    const distXZ = Math.hypot(dx, dz);

    this.roarT -= dt;
    if (this.roarT <= 0) {
      this.roarT = 8 + rand() * 5;
      if (distXZ < 260) this.game.audio.roar();
    }

    if (this.state === 'circling') {
      this.angle += dt * 0.35;
      const R = 55;
      const tx = pl.pos.x + Math.sin(this.angle) * R;
      const tz = pl.pos.z + Math.cos(this.angle) * R;
      const ty = Math.max(pl.pos.y + 26, getHeight(tx, tz) + 16);
      _v.set(tx, ty, tz).sub(g.position);
      const d = _v.length();
      if (d > 0.01) {
        _v.multiplyScalar(Math.min(28, d * 1.6) / d);
        this.vel.lerp(_v, Math.min(1, dt * 2));
        g.position.addScaledVector(this.vel, dt);
        _v2.copy(g.position).add(this.vel);
        g.lookAt(_v2);
      }
      const flap = Math.sin(this.t * 5) * 0.55;
      this.wingL.rotation.z = 0.25 + flap;
      this.wingR.rotation.z = -0.25 - flap;
      this.breathT -= dt;
      if (this.breathT <= 0 && this.staggerT <= 0 && distXZ < 120) {
        this.breathT = 5.5;
        this.spitFire(3);
      }
      this.perchDecideT -= dt;
      if (this.perchDecideT <= 0 && distXZ < 90) {
        this.perchDecideT = 20;
        const a = rand() * Math.PI * 2;
        const lx = pl.pos.x + Math.sin(a) * 11;
        const lz = pl.pos.z + Math.cos(a) * 11;
        this.landPos.set(lx, getHeight(lx, lz) + 2.6, lz);
        this.state = 'landing';
      }
    } else if (this.state === 'landing') {
      _v.copy(this.landPos).sub(g.position);
      const d = _v.length();
      if (d < 1.5) {
        this.state = 'perched';
        this.perchT = 8;
        this.game.audio.thud();
        g.position.copy(this.landPos);
      } else {
        _v.multiplyScalar(Math.min(24, d * 2.5) / d);
        g.position.addScaledVector(_v, dt);
        _v2.set(pl.pos.x, g.position.y, pl.pos.z);
        g.lookAt(_v2);
      }
      const flap = Math.sin(this.t * 7) * 0.7;
      this.wingL.rotation.z = 0.4 + flap;
      this.wingR.rotation.z = -0.4 - flap;
    } else if (this.state === 'perched') {
      this.perchT -= dt;
      _v2.set(pl.pos.x, g.position.y, pl.pos.z);
      g.lookAt(_v2);
      this.wingL.rotation.z = lerp(this.wingL.rotation.z, 1.1, Math.min(1, dt * 3));
      this.wingR.rotation.z = lerp(this.wingR.rotation.z, -1.1, Math.min(1, dt * 3));
      if (this.staggerT <= 0) {
        this.biteT -= dt;
        if (this.biteT <= 0 && distXZ < 10 && pl.alive) {
          this.biteT = 1.6;
          pl.damage(24, g.position);
        }
        this.breathT -= dt;
        if (this.breathT <= 0 && distXZ >= 10) {
          this.breathT = 4;
          this.spitFire(1);
        }
      }
      if (this.perchT <= 0) {
        this.state = 'takeoff';
      }
    } else if (this.state === 'takeoff') {
      g.position.y += dt * 12;
      const flap = Math.sin(this.t * 8) * 0.8;
      this.wingL.rotation.z = 0.3 + flap;
      this.wingR.rotation.z = -0.3 - flap;
      if (g.position.y > getHeight(g.position.x, g.position.z) + 22) {
        this.state = 'circling';
        this.breathT = 3;
      }
    }
  }

  die() {
    this.alive = false;
    this.state = 'dying';
    this.dyingT = 0;
    this.pending = [];
    this.game.audio.roar();
    this.game.hud.announce('KORVALDR FALLS', 'The sky is quiet again.');
    this.giveRewards();
  }
}

export class Enemies {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.dragon = null;

    // wolf packs scattered in the wilds
    const packs = [[160, 90], [-210, -140], [120, -260], [-140, 210], [260, -80], [-320, 60]];
    for (const [px, pz] of packs) {
      const n = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const x = px + randRange(-10, 10);
        const z = pz + randRange(-10, 10);
        if (getHeight(x, z) < WATER_Y + 1) continue;
        this.list.push(new Wolf(game, x, z));
      }
    }
    // draugr guarding the word wall
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = randRange(10, 16);
      this.list.push(new Draugr(game, WALL_POS.x + Math.sin(a) * r, WALL_POS.z + Math.cos(a) * r));
    }
    // two on the approach
    const dv = Math.hypot(WALL_POS.x, WALL_POS.z);
    const inX = -WALL_POS.x / dv, inZ = -WALL_POS.z / dv;
    this.list.push(new Draugr(game, WALL_POS.x + inX * 32 + 6, WALL_POS.z + inZ * 32));
    this.list.push(new Draugr(game, WALL_POS.x + inX * 44 - 6, WALL_POS.z + inZ * 44));
  }

  spawnDragon() {
    if (this.dragon) return;
    this.dragon = new Dragon(this.game);
    this.list.push(this.dragon);
  }

  onPlayerRespawn() {
    for (const e of this.list) {
      e.provoked = false;
      if (e.isDragon && e.alive) {
        e.hp = Math.min(e.maxHp, e.hp + 150);
        if (e.state !== 'dying') e.state = 'circling';
      }
    }
  }

  update(dt) {
    for (const e of this.list) e.update(dt);
    this.list = this.list.filter((e) => {
      if (e.gone) return false;
      return true;
    });
  }
}
