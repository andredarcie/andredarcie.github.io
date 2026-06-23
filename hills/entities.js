// entities.js — criaturas que vagam no nevoeiro e perseguem o jogador.
// Figura emaciada e macabra (estilo Silent Hill em low-poly PSX).
import * as THREE from 'three';
import { applyVertexSnap } from './psx.js';
import { collideMove } from './player.js';

// ---------- textura de pele mosqueada (gerada uma vez) ----------
let _flesh = null;
function fleshTexture() {
  if (_flesh) return _flesh;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#6a5a4e'; g.fillRect(0, 0, 64, 64);                 // pele cadavérica
  for (let i = 0; i < 600; i++) {                                    // manchas/hematomas
    const s = Math.random();
    g.fillStyle = `rgba(${80 + s * 70 | 0},${40 + s * 30 | 0},${38 + s * 22 | 0},${0.18 + s * 0.3})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 1 + s * 3, 1 + s * 3);
  }
  for (let i = 0; i < 36; i++) {                                     // carne viva
    g.fillStyle = `rgba(${110 + Math.random() * 60 | 0},20,18,0.5)`;
    g.beginPath(); g.arc(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 5, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(35,8,8,0.45)'; g.lineWidth = 1;              // veias
  for (let i = 0; i < 12; i++) {
    g.beginPath(); let x = Math.random() * 64, y = Math.random() * 64; g.moveTo(x, y);
    for (let j = 0; j < 3; j++) { x += (Math.random() - 0.5) * 22; y += (Math.random() - 0.5) * 22; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  _flesh = t; return t;
}

// ---------- materiais compartilhados ----------
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const f = fleshTexture();
  MATS = {
    skin: applyVertexSnap(new THREE.MeshLambertMaterial({ map: f, color: 0x8a8076, emissive: 0x140807, fog: true })),
    meat: applyVertexSnap(new THREE.MeshLambertMaterial({ map: f, color: 0x711818, emissive: 0x230505, fog: true })),
    bone: applyVertexSnap(new THREE.MeshLambertMaterial({ color: 0xc2b9a6, emissive: 0x0c0b08, fog: true })),
    void: new THREE.MeshBasicMaterial({ color: 0x040406, side: THREE.DoubleSide, fog: true }),  // cavidades/buraco: vazio negro (interior visível)
  };
  return MATS;
}

const cyl = (rt, rb, h, m, seg = 6) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

export class Monster {
  constructor(scene, pos) {
    this.scene = scene;
    this.pos = pos.clone(); this.pos.y = 0;
    this.dead = false;
    this.speed = 1.7;
    this.detect = 16;
    this.state = 'wander';
    this.dir = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.attackCd = 0;
    this.radius = 0.5;
    this.seen = false;                 // está no campo de visão do jogador?
    this.sawPlayer = false;            // o inimigo enxerga o jogador? (alcance + linha de visada) -> corre mais rápido
    this.phase = Math.random() * 10;
    this.reach = 0;
    this.armRest = 0.55;
    this.headRest = 0.45;
    this.leanRest = 0.55;

    this._build(scene);
  }

  _build(scene) {
    const M = mats();
    const g = new THREE.Group();
    const scl = 0.95 + Math.random() * 0.3;
    g.scale.setScalar(scl);

    // ---- pernas dobradas (agachadas), corpo se arrasta baixo ----
    for (const sx of [-1, 1]) {
      const thigh = cyl(0.07, 0.09, 0.52, M.skin); thigh.position.set(sx * 0.14, 0.6, 0.04); thigh.rotation.x = -0.35; g.add(thigh);
      const shin = cyl(0.055, 0.07, 0.5, M.skin); shin.position.set(sx * 0.17, 0.24, -0.04); shin.rotation.x = 0.45; g.add(shin);
      const foot = box(0.12, 0.07, 0.3, M.skin); foot.position.set(sx * 0.17, 0.04, 0.08); g.add(foot);
    }
    const pelvis = cyl(0.18, 0.2, 0.2, M.skin); pelvis.position.set(0, 0.8, 0); g.add(pelvis);

    // ---- grupo "lean": tudo acima da pélvis, curvado pra frente (corcunda) ----
    const lean = new THREE.Group(); lean.position.set(0, 0.82, 0); lean.rotation.x = this.leanRest; g.add(lean);
    this.lean = lean;

    // tronco (respira via escala) — costelas e espinha à mostra
    const body = new THREE.Group(); lean.add(body);
    const chest = cyl(0.14, 0.23, 0.85, M.skin, 7); chest.position.set(0, 0.42, 0); chest.rotation.z = 0.08; body.add(chest);
    const belly = box(0.26, 0.16, 0.02, M.meat); belly.position.set(0.01, 0.34, 0.16); body.add(belly);   // carne exposta
    for (let i = 0; i < 4; i++) {                                                                          // costelas
      const rib = box(0.4 - i * 0.03, 0.05, 0.05, M.bone); rib.position.set(0, 0.4 + i * 0.11, 0.14 - i * 0.012); rib.rotation.x = -0.25; body.add(rib);
    }
    for (let i = 0; i < 3; i++) {                                                                          // vértebras nas costas
      const v = cyl(0.02, 0.06, 0.12, M.bone, 5); v.position.set(0, 0.34 + i * 0.16, -0.16); v.rotation.x = Math.PI / 2; body.add(v);
    }
    // fios de pele/sinew pendurados (gore)
    for (const sx of [-1, 1]) { const s = cyl(0.015, 0.02, 0.5, M.meat, 4); s.position.set(sx * 0.09, 0.12, 0.17); s.rotation.x = 0.2; body.add(s); }
    this.body = body;

    // ---- cabeça bizarra e deformada, com um BURACO bem no meio do rosto ----
    const head = new THREE.Group(); head.position.set(0, 0.92, 0.06); head.rotation.x = this.headRest; lean.add(head);

    // crânio principal deformado/assimétrico + lobo grotesco extra
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), M.skin);
    skull.scale.set(1.05, 0.92, 1.15); skull.position.set(0.01, 0.05, 0.0); skull.rotation.z = 0.22; head.add(skull);
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), M.skin);
    lobe.scale.set(1, 0.8, 1.05); lobe.position.set(-0.1, 0.17, -0.02); head.add(lobe);

    // caroços/tumores e retalho de osso rompendo a pele
    for (const p of [[0.12, 0.11, 0.08], [-0.05, 0.21, 0.04]]) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 5, 4), Math.random() < 0.5 ? M.meat : M.skin);
      t.position.set(p[0], p[1], p[2]); head.add(t);
    }
    const shard = box(0.09, 0.13, 0.04, M.bone); shard.position.set(0.14, 0.04, 0.05); shard.rotation.set(0.2, 0.3, 0.5); head.add(shard);

    // ---- BURACO no meio: aro carnudo + túnel preto atravessando o crânio + saída atrás ----
    const HZ = 0.26;                                  // boca do buraco, à frente da superfície do crânio
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14), M.meat);
    rim.position.set(0, 0.03, HZ); head.add(rim);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.5, 12, 1, true), M.void);
    bore.rotation.x = Math.PI / 2; bore.position.set(0, 0.03, HZ - 0.25); head.add(bore);   // tubo oco frente->trás
    const back = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), M.void); back.position.set(0, 0.03, HZ - 0.5); head.add(back);
    for (const a of [0.5, -0.8]) {                   // fiapos de carne cruzando o vazio
      const strand = cyl(0.006, 0.01, 0.19, M.meat, 4); strand.position.set(0, 0.03, HZ); strand.rotation.set(Math.PI / 2, 0, a); head.add(strand);
    }

    // sem olhos: rosto liso e cego acima do buraco (mais perturbador)

    // mandíbula caída com dentes irregulares
    const jaw = box(0.18, 0.07, 0.2, M.skin); jaw.position.set(0, -0.15, 0.12); jaw.rotation.x = 0.7; head.add(jaw);
    const mouth = box(0.14, 0.08, 0.1, M.void); mouth.position.set(0, -0.11, 0.16); head.add(mouth);
    for (let i = -1; i <= 1; i++) {
      const tu = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.05, 4), M.bone); tu.position.set(i * 0.05, -0.07, 0.22); tu.rotation.x = Math.PI; head.add(tu);
      const tl = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.045, 4), M.bone); tl.position.set(i * 0.05, -0.13, 0.23); head.add(tl);
    }
    this.head = head;

    // ---- braços longuíssimos arrastando ----
    this.arms = [];
    for (let k = 0; k < 2; k++) {
      const sx = k === 0 ? -1 : 1;
      const arm = new THREE.Group(); arm.position.set(sx * 0.2, 0.78, 0.04); arm.rotation.x = this.armRest; lean.add(arm);
      const longer = sx < 0 ? 1.12 : 1.0;                                  // assimetria
      const upper = cyl(0.055, 0.07, 0.5 * longer, M.skin); upper.position.set(0, -0.25 * longer, 0); arm.add(upper);
      const fore = new THREE.Group(); fore.position.set(0, -0.5 * longer, 0); fore.rotation.x = 0.6; arm.add(fore);
      const forearm = cyl(0.045, 0.055, 0.55 * longer, M.skin); forearm.position.set(0, -0.27 * longer, 0); fore.add(forearm);
      const hand = box(0.1, 0.07, 0.13, M.skin); hand.position.set(0, -0.55 * longer, 0.02); fore.add(hand);
      for (const fx of [-0.035, 0.035]) {                                  // garras
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.18, 4), M.bone);
        claw.position.set(fx, -0.64 * longer, 0.06); claw.rotation.x = Math.PI - 0.3; fore.add(claw);
      }
      this.arms.push(arm);
    }

    this.mesh = g;
    g.position.copy(this.pos);
    scene.add(g);
  }

  update(dt, t, playerPos, colliders, otherworld) {
    if (this.dead) return Infinity;
    const dx = playerPos.x - this.pos.x, dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);

    const detect = otherworld ? this.detect + 8 : this.detect;
    if (dist < detect) this.state = 'seek'; else if (dist > detect + 6) this.state = 'wander';

    let mx = 0, mz = 0;
    // ao ENXERGAR o jogador (linha de visada limpa), avança bem mais rápido;
    // só estar no campo de visão do jogador dá um empurrão menor.
    const chase = this.sawPlayer ? 1.4 : (this.seen ? 0.5 : 0);
    const spd = (otherworld ? this.speed + 0.9 : this.speed) + chase;
    const seeking = this.state === 'seek';
    if (seeking) {
      mx = (dx / (dist || 1)) * spd; mz = (dz / (dist || 1)) * spd;
      this.mesh.rotation.y = Math.atan2(dx, dz);
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) { this.dir += (Math.random() - 0.5) * 2; this.wanderTimer = 1 + Math.random() * 2; }
      mx = Math.sin(this.dir) * spd * 0.4; mz = Math.cos(this.dir) * spd * 0.4;
      this.mesh.rotation.y = this.dir;
    }
    collideMove(this.pos, mx * dt, mz * dt, this.radius, colliders);
    this.pos.x = Math.max(-44, Math.min(44, this.pos.x));
    this.pos.z = Math.max(-44, Math.min(44, this.pos.z));
    this.mesh.position.set(this.pos.x, 0, this.pos.z);

    // -------- animação macabra: arrastar + convulsões --------
    const tw = t * 6 + this.phase;
    const sway = Math.sin(tw) * (seeking ? 0.55 : 0.28);
    this.reach += ((seeking ? 1 : 0) - this.reach) * Math.min(1, dt * 3);   // ergue os braços ao caçar

    const armBase = this.armRest - this.reach * 1.15;                        // alcança a vítima
    this.arms[0].rotation.x = armBase + sway;
    this.arms[1].rotation.x = armBase - sway + 0.15;                         // assimetria
    this.arms[0].rotation.z = 0.12 + this.reach * 0.2;
    this.arms[1].rotation.z = -0.12 - this.reach * 0.2;

    this.body.rotation.z = sway * 0.18;
    const heave = Math.sin(tw * 1.6) * 0.07;                                 // respiração ofegante
    this.body.scale.set(1 + heave * 0.6, 1 + heave, 1 + heave * 0.6);

    this.head.rotation.x = this.headRest + Math.sin(tw * 2.1) * 0.12 - this.reach * 0.35;
    this.head.rotation.z = Math.sin(tw * 1.3) * 0.12 + (Math.random() < 0.05 ? (Math.random() - 0.5) * 0.6 : 0);

    this.mesh.position.y = Math.abs(Math.sin(tw)) * 0.05;                    // arrasta os pés
    this.mesh.rotation.z = sway * 0.08;

    // espasmo ocasional do tronco inteiro
    const spasmTarget = this.leanRest + (seeking ? 0.12 : 0) + (Math.random() < 0.015 ? (Math.random() - 0.5) * 0.4 : 0);
    this.lean.rotation.x += (spasmTarget - this.lean.rotation.x) * 0.2;

    if (this.attackCd > 0) this.attackCd -= dt;
    return dist;
  }

  // contato = morte instantânea
  caughtPlayer(playerPos) {
    if (this.dead) return false;
    return Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z) < 1.5;
  }
}

export class MonsterManager {
  constructor(scene) { this.scene = scene; this.list = []; }
  spawn(pos) { this.list.push(new Monster(this.scene, pos)); }
  spawnRing(count, center, radius) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      const r = radius * (0.6 + Math.random() * 0.6);
      this.spawn(new THREE.Vector3(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r));
    }
  }
  update(dt, t, playerPos, colliders, otherworld) {
    let nearest = Infinity, caught = false;
    for (const m of this.list) {
      const d = m.update(dt, t, playerPos, colliders, otherworld);
      if (d < nearest) nearest = d;
      if (m.caughtPlayer(playerPos)) caught = true;
    }
    return { nearest, caught };
  }
}
