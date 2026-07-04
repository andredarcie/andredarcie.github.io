// Fireballs (player and dragon) plus impact bursts.

import * as THREE from 'three';
import { getHeight } from 'world';

const _c = new THREE.Vector3();

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.bursts = [];
    this.geo = new THREE.SphereGeometry(0.28, 8, 6);
  }

  spawn(opts) {
    const mat = new THREE.MeshBasicMaterial({ color: opts.color != null ? opts.color : 0xff7726 });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.copy(opts.pos);
    this.game.scene.add(mesh);
    this.list.push({
      mesh,
      vel: opts.dir.clone().normalize().multiplyScalar(opts.speed),
      dmg: opts.dmg,
      owner: opts.owner,
      radius: opts.radius != null ? opts.radius : 1.6,
      life: 4,
    });
  }

  burst(pos, color, size) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.copy(pos);
    this.game.scene.add(mesh);
    this.bursts.push({ mesh, t: 0, size: size != null ? size : 1 });
  }

  kill(p) {
    this.game.scene.remove(p.mesh);
    p.mesh.material.dispose();
    p.dead = true;
  }

  update(dt) {
    const game = this.game;
    for (const p of this.list) {
      if (p.dead) continue;
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.setScalar(1 + Math.sin(p.life * 30) * 0.15);
      const pos = p.mesh.position;
      if (p.life <= 0) { this.kill(p); continue; }
      if (pos.y < getHeight(pos.x, pos.z) + 0.25) {
        this.burst(pos, 0xff8c3a, 1.2);
        game.audio.explosion();
        this.kill(p);
        continue;
      }
      if (p.owner === 'player') {
        for (const e of game.enemies.list) {
          if (!e.alive) continue;
          e.center(_c);
          if (pos.distanceTo(_c) < p.radius + e.hitRadius) {
            e.damage(p.dmg, pos);
            this.burst(pos, 0xffb35a, 1.4);
            game.audio.explosion();
            this.kill(p);
            break;
          }
        }
      } else {
        const pl = game.player;
        if (pl.alive) {
          _c.copy(pl.pos);
          _c.y += 1.2;
          if (pos.distanceTo(_c) < p.radius + 1.1) {
            pl.damage(p.dmg, pos);
            this.burst(pos, 0xff6a30, 1.4);
            game.audio.explosion();
            this.kill(p);
          }
        }
      }
    }
    this.list = this.list.filter((p) => !p.dead);

    for (const b of this.bursts) {
      b.t += dt;
      const s = b.size * (1 + b.t * 9);
      b.mesh.scale.setScalar(s);
      b.mesh.material.opacity = Math.max(0, 0.85 * (1 - b.t / 0.4));
      if (b.t > 0.4) {
        this.game.scene.remove(b.mesh);
        b.mesh.material.dispose();
        b.dead = true;
      }
    }
    this.bursts = this.bursts.filter((b) => !b.dead);
  }
}
