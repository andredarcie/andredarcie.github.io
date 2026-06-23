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
    this.eye = 1.3;              // Doom: altura de visão 41 u ÷ 32 u/m ≈ 1.28 m
    this.radius = 0.5;           // Doom: raio 16 u ÷ 32 u/m = 0.5 m
    this.sens = 0.0022;

    this.health = 100;
    this.armor = 0;              // colete verde absorve 1/3 do dano
    // velocidades EXATAS do Doom (escala 32 u/m):
    //   andar = 290.9 u/s ÷ 32 = 9.1 m/s ;  correr (always-run / Shift) = 581.8 ÷ 32 = 18.2 m/s
    this.walk = 9.1;
    this.run = 18.2;
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

  // bypass = dano contínuo (ex.: lodo) que ignora a janela de invulnerabilidade
  damage(amount, bypass = false) {
    if (!bypass && this.hurtCooldown > 0) return false;
    let dmg = amount;
    if (this.armor > 0) {                        // colete absorve ~1/3 (estilo Doom)
      const absorbed = Math.min(this.armor, Math.ceil(amount / 3));
      this.armor -= absorbed; dmg = amount - absorbed;
    }
    this.health = Math.max(0, this.health - dmg);
    if (!bypass) this.hurtCooldown = 0.8;
    return true;
  }

  heal(amount) { this.health = Math.min(100, this.health + amount); }
  addArmor(amount) { this.armor = Math.min(100, this.armor + amount); }

  // input = { mx, mz, run }  (mx = strafe, mz = frente; run = Shift/correr)
  update(dt, input, colliders, onStep) {
    const fwd = input.mz, str = input.mx;
    const mag = Math.min(1, Math.hypot(fwd, str));   // deflexão (analógico = velocidade parcial)
    const moving = mag > 0.02;
    const speed = input.run ? this.run : this.walk;

    const f = this.forward();
    const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const dir = new THREE.Vector3().addScaledVector(f, fwd).addScaledVector(r, str);
    if (dir.lengthSq() > 0) dir.normalize();
    // deslocamento total do frame, fatiado em passos <= 0.25 m p/ não atravessar
    // paredes finas na velocidade alta do Doom (anti-tunneling)
    const dx = dir.x * speed * mag * dt, dz = dir.z * speed * mag * dt;
    const dist = Math.hypot(dx, dz);
    if (dist > 0) {
      const steps = Math.max(1, Math.ceil(dist / 0.25));
      for (let i = 0; i < steps; i++) collideMove(this.pos, dx / steps, dz / steps, this.radius, colliders);
    }

    // balanço de passos: sobe a cada passada (abs), sacode de lado e rola levemente
    if (moving) {
      this.bobPhase += dt * 8.5 * mag * (input.run ? 1.5 : 1);
      this.bobAmt = THREE.MathUtils.lerp(this.bobAmt, 0.08 * mag, dt * 6);
      this.stepTimer -= dt * mag * (input.run ? 1.7 : 1);
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
