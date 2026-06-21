// player.js — controlador em primeira pessoa: olhar, andar com colisão, lanterna,
// head-bob, fôlego e vida. SEM armas: o objetivo é apenas correr.
import * as THREE from 'three';

// Colisão separada por eixo (permite deslizar nas paredes).
export function collideMove(pos, dx, dz, radius, colliders) {
  let nx = pos.x + dx;
  for (const c of colliders) {
    if (nx + radius > c.minX && nx - radius < c.maxX && pos.z + radius > c.minZ && pos.z - radius < c.maxZ) { nx = pos.x; break; }
  }
  let nz = pos.z + dz;
  for (const c of colliders) {
    if (nx + radius > c.minX && nx - radius < c.maxX && nz + radius > c.minZ && nz - radius < c.maxZ) { nz = pos.z; break; }
  }
  pos.x = nx; pos.z = nz;
}

export class Player {
  constructor(camera, spawn) {
    this.cam = camera;
    this.pos = spawn.clone();
    this.yaw = Math.PI;          // olhando pro norte (portão)
    this.pitch = 0;
    this.eye = 1.7;
    this.radius = 0.45;
    this.sens = 0.0022;

    this.health = 100;
    this.walk = 3.4;             // só andar (sem corrida)
    this.bobPhase = 0; this.bobAmt = 0;
    this.stepTimer = 0;
    this.flashOn = true;
    this.hurtCooldown = 0;

    // lanterna (spot) presa na câmera
    this.flash = new THREE.SpotLight(0xfff2d6, 2.6, 32, 0.55, 0.5, 1.0);
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0, -0.05, -1);
    camera.add(this.flash);
    camera.add(this.flashTarget);
    this.flash.target = this.flashTarget;
  }

  look(dx, dy) {
    this.yaw -= dx * this.sens;
    this.pitch -= dy * this.sens;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  }

  toggleFlash() { this.flashOn = !this.flashOn; }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  damage(amount) {
    if (this.hurtCooldown > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.hurtCooldown = 0.8;
    return true;
  }

  // input = { mx, mz }  (mx = strafe, mz = frente; combinam teclado + analógico)
  update(dt, input, colliders, onStep) {
    const fwd = input.mz, str = input.mx;
    const mag = Math.min(1, Math.hypot(fwd, str));   // deflexão (analógico = velocidade parcial)
    const moving = mag > 0.02;
    const speed = this.walk;

    const f = this.forward();
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const dir = new THREE.Vector3().addScaledVector(f, fwd).addScaledVector(r, str);
    if (dir.lengthSq() > 0) dir.normalize();
    collideMove(this.pos, dir.x * speed * mag * dt, dir.z * speed * mag * dt, this.radius, colliders);

    // balanço de passos: sobe a cada passada (abs), sacode de lado e rola levemente
    if (moving) {
      this.bobPhase += dt * 8.5 * mag;
      this.bobAmt = THREE.MathUtils.lerp(this.bobAmt, 0.08 * mag, dt * 6);
      this.stepTimer -= dt * mag;
      if (this.stepTimer <= 0) { this.stepTimer = 0.5; onStep && onStep(); }
    } else {
      this.bobAmt = THREE.MathUtils.lerp(this.bobAmt, 0, dt * 6);
    }
    const bobY = Math.abs(Math.sin(this.bobPhase)) * this.bobAmt;
    const bobX = Math.cos(this.bobPhase) * this.bobAmt * 0.6;
    const roll = Math.cos(this.bobPhase) * this.bobAmt * 0.45;
    this.cam.rotation.set(this.pitch, this.yaw, roll, 'YXZ');
    this.cam.position.set(this.pos.x + r.x * bobX, this.eye + bobY, this.pos.z + r.z * bobX);

    const flick = 0.9 + Math.sin(performance.now() * 0.02) * 0.05 + (Math.random() < 0.01 ? -0.5 : 0);
    this.flash.intensity = this.flashOn ? 2.6 * flick : 0;

    if (this.hurtCooldown > 0) this.hurtCooldown -= dt;
  }
}
