// world.js — DOOM HILLS: arena urbana enevoada (Silent Hill PSX) gerada de forma
// PROCEDURAL a cada fase. Nada é fixo: prédios, cobertura, lodo radioativo, postes
// e itens mudam de lugar a cada nível. O objetivo agora é EXTERMÍNIO — matar toda
// a horda libera a próxima fase (infinita). Tudo vive sob um único Group (this.root)
// que é descartado (dispose) na troca de fase, sem vazar GPU.
// PERFORMANCE: quase nenhuma luz dinâmica (lanterna + brilho do lodo). Janelas,
// postes e itens são emissivos/aditivos (sem custo de iluminação por-pixel).
import * as THREE from 'three';
import { applyVertexSnap } from './psx.js';

// ---------- PRNG determinístico ----------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- texturas em canvas 128px (criadas UMA vez, compartilhadas entre fases) ----------
function canvasTex(draw, repeat = 1, transparent = false) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  if (!transparent) { g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128); }
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}
function grain(g, base, amt, tint = [1, 1, 1]) {
  const img = g.getImageData(0, 0, 128, 128), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = base + (Math.random() - 0.5) * amt;
    d[i] = Math.max(0, Math.min(255, v * tint[0]));
    d[i + 1] = Math.max(0, Math.min(255, v * tint[1]));
    d[i + 2] = Math.max(0, Math.min(255, v * tint[2]));
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
function stains(g, n, color, sizeMax) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.06 + Math.random() * 0.18;
    g.fillStyle = color;
    const x = Math.random() * 128, y = Math.random() * 128, r = 4 + Math.random() * sizeMax;
    g.beginPath(); g.ellipse(x, y, r, r * (0.5 + Math.random()), Math.random() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

function makeTextures() {
  const asphalt = canvasTex((g) => {
    grain(g, 24, 26, [0.95, 0.97, 1.05]);
    stains(g, 30, '#000', 18);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * 128, y = Math.random() * 128; g.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  }, 26);
  const brick = canvasTex((g) => {
    g.fillStyle = '#2e1d18'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 10) for (let x = 0; x < 128; x += 24) {
      const ox = (y / 10) % 2 ? 12 : 0; const r = 70 + Math.random() * 45;
      g.fillStyle = `rgb(${r | 0},${(r * .46) | 0},${(r * .4) | 0})`; g.fillRect(x + ox + 1, y + 1, 22, 8);
    }
    g.globalAlpha = 0.5; stains(g, 20, '#000', 14); g.globalAlpha = 1;
  }, 1);
  const concrete = canvasTex((g) => { grain(g, 74, 20); stains(g, 22, '#000', 16);
    g.strokeStyle = 'rgba(0,0,0,.22)'; for (let i = 16; i < 128; i += 16) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); } }, 1);
  const stucco = canvasTex((g) => { grain(g, 90, 18, [1.02, 0.98, 0.9]); stains(g, 40, '#3a2a18', 22); stains(g, 12, '#000', 26); }, 1);
  const rust = canvasTex((g) => { grain(g, 44, 20, [1.1, 0.85, 0.7]);
    for (let i = 0; i < 2000; i++) { const s = Math.random(); g.fillStyle = `rgba(${120 + s * 90 | 0},${44 + s * 40 | 0},${10 + s * 20 | 0},.5)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + s * 3, 1 + s * 3); } }, 1);
  const wet = canvasTex((g) => { grain(g, 14, 10, [0.8, 0.9, 1.2]);
    g.globalAlpha = 0.5; g.fillStyle = '#5a6a80'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 20 + Math.random() * 40, 1); g.globalAlpha = 1; }, 1);
  const nuke = canvasTex((g) => {
    g.fillStyle = '#1c3a10'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 380; i++) { const s = Math.random(); g.fillStyle = `rgba(${60 + s * 90 | 0},${150 + s * 90 | 0},${30 + s * 40 | 0},${0.3 + s * 0.5})`; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 1 + s * 6, 0, 7); g.fill(); }
    for (let i = 0; i < 22; i++) { g.strokeStyle = 'rgba(180,255,120,.35)'; g.beginPath(); g.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 10, 0, 7); g.stroke(); }
  }, 3);
  const blood = canvasTex((g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(70,6,6,0.92)'; g.beginPath(); g.ellipse(64, 64, 40, 30, 0.5, 0, 7); g.fill();
    g.fillStyle = 'rgba(40,2,2,0.95)'; g.beginPath(); g.ellipse(64, 64, 22, 16, 0.5, 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.7; g.fillStyle = '#400'; g.beginPath(); g.arc(64 + (Math.random() - 0.5) * 110, 64 + (Math.random() - 0.5) * 110, 1 + Math.random() * 5, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }, 1, true);
  return { asphalt, brick, concrete, stucco, rust, wet, nuke, blood };
}

// texturas compartilhadas entre todas as fases (não são descartadas no dispose)
let TEX = null;
function textures() { if (!TEX) TEX = makeTextures(); return TEX; }

function mat(map, color = 0xffffff, emissive = 0x000000) {
  return applyVertexSnap(new THREE.MeshLambertMaterial({ map, color, emissive, fog: true }));
}

const T = 1.0;          // espessura das paredes
const WALL_H = 12;      // altura das paredes (lados de prédio)
const HALF = 40;        // meia-largura da arena (paredão em ±HALF)
const CLEAR = 9;        // raio livre em volta do spawn (sem prédio/lodo)

export class World {
  constructor(scene, level = 1) {
    this.scene = scene;
    this.level = Math.max(1, level | 0);
    this.root = new THREE.Group(); scene.add(this.root);
    this.seed = (this.level * 2654435761 + (Math.random() * 0x7fffffff | 0)) >>> 0;
    this.rand = rng(this.seed);

    this.colliders = [];
    this.lamps = [];
    this.pickups = [];
    this.pools = [];          // poças de lodo (retângulos) p/ inNukage
    this.glows = [];          // luzes do lodo (animadas)
    this.tex = textures();
    this.t = 0;

    // buffers de instâncias (janelas) + debris
    this._winDark = []; this._winLit = []; this._debris = [];
    this._winGeo = new THREE.PlaneGeometry(1, 1);
    this._dummy = new THREE.Object3D();

    this.spawn = new THREE.Vector3(0, 1.7, 0);   // centro da arena, área limpa

    // materiais compartilhados desta fase (descartados no dispose)
    this.M = {
      wall: mat(this.tex.brick, 0x8a8278, 0x0a0806),
      conc: mat(this.tex.concrete, 0x6f7176, 0x070809),
      metal: mat(this.tex.rust, 0x55585c),
      dark: mat(this.tex.concrete, 0x202227),
    };

    this._ground();
    this._perimeter();
    this._buildings();
    this._nukage();
    this._skyline();
    this._props();
    this._items();
    this._ash();
    this._commitInstances();
  }

  add(obj) { this.root.add(obj); }
  _addCollider(cx, cz, hx, hz) { this.colliders.push({ minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz }); }

  _wall(cx, cz, w, d, h = WALL_H, material = this.M.wall) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(cx, h / 2, cz); this.add(m);
    this._addCollider(cx, cz, w / 2, d / 2);
  }

  // ponto bloqueado por algum colisor (margem) ?
  _blocked(x, z, margin = 1.0) {
    for (const c of this.colliders) {
      if (x > c.minX - margin && x < c.maxX + margin && z > c.minZ - margin && z < c.maxZ + margin) return true;
    }
    return false;
  }
  _inPool(x, z) { for (const p of this.pools) if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) return true; return false; }

  // acha um ponto aberto (longe de fromX/fromZ, fora de colisores e do lodo)
  _openSpot(minDist, fromX = 0, fromZ = 0, margin = 1.2) {
    const lim = HALF - 3;
    for (let i = 0; i < 60; i++) {
      const x = (this.rand() * 2 - 1) * lim, z = (this.rand() * 2 - 1) * lim;
      if (Math.hypot(x - fromX, z - fromZ) < minDist) continue;
      if (this._blocked(x, z, margin) || this._inPool(x, z)) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3((this.rand() * 2 - 1) * lim, 0, (this.rand() * 2 - 1) * lim);
  }

  // ---------- chão (asfalto + faixas + poças d'água + sangue) ----------
  _ground() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(this.tex.asphalt, 0x84878c));
    g.rotation.x = -Math.PI / 2; g.position.set(0, 0, 0); this.add(g);

    const wetMat = new THREE.MeshBasicMaterial({ map: this.tex.wet, color: 0x2a3340, transparent: true, opacity: 0.8, fog: true });
    for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.8 + this.rand() * 2.0, 12), wetMat); p.rotation.x = -Math.PI / 2; p.position.set((this.rand() - 0.5) * 70, 0.025, (this.rand() - 0.5) * 70); p.scale.y = 0.6 + this.rand(); this.add(p); }

    const bloodMat = new THREE.MeshBasicMaterial({ map: this.tex.blood, transparent: true, depthWrite: false, fog: true });
    for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), bloodMat); b.rotation.x = -Math.PI / 2; b.rotation.z = this.rand() * 6; b.position.set((this.rand() - 0.5) * 72, 0.04, (this.rand() - 0.5) * 72); this.add(b); }
  }

  // ---------- paredão da arena (mantém o jogador dentro) ----------
  _perimeter() {
    this._wall(0, HALF, HALF * 2 + T * 2, T);
    this._wall(0, -HALF, HALF * 2 + T * 2, T);
    this._wall(HALF, 0, T, HALF * 2 + T * 2);
    this._wall(-HALF, 0, T, HALF * 2 + T * 2);
  }

  // ---------- prédios/cobertura espalhados numa grade (sem sobrepor o spawn) ----------
  _buildings() {
    const lit = () => this.rand() < 0.18;
    const tints = [
      [this.tex.brick, 0x8a8278, 0x0a0806],
      [this.tex.stucco, 0x7c776c, 0x060606],
      [this.tex.concrete, 0x6f7176, 0x070809],
      [this.tex.rust, 0x6a5a4e, 0x0c0604],
    ];
    // densidade cresce um pouco com a fase (até um teto), p/ variar o cenário
    const density = Math.min(0.62, 0.42 + this.level * 0.02);
    for (let cx = -30; cx <= 30; cx += 12) {
      for (let cz = -30; cz <= 30; cz += 12) {
        if (Math.hypot(cx, cz) < CLEAR + 3) continue;        // mantém o miolo aberto
        if (this.rand() > density) continue;
        const w = 4 + this.rand() * 3, d = 4 + this.rand() * 3, h = 5 + this.rand() * 14;
        const x = cx + (this.rand() - 0.5) * 3, z = cz + (this.rand() - 0.5) * 3;
        const ti = tints[(this.rand() * tints.length) | 0];
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(ti[0], ti[1], ti[2]));
        body.position.set(x, h / 2, z); this.add(body);
        this._addCollider(x, z, w / 2, d / 2);
        // janelas nas 4 faces (instanced) se for alto o bastante
        if (h > 7) {
          for (let yy = 3; yy < h - 1.5; yy += 3.2) {
            for (let ox = -w / 2 + 1.2; ox <= w / 2 - 1.2; ox += 2.2) {
              if (this.rand() < 0.25) continue;
              this._win(x + ox, yy, z + d / 2 + 0.05, 0, 1.0, 1.4, lit());
              this._win(x + ox, yy, z - d / 2 - 0.05, Math.PI, 1.0, 1.4, lit());
            }
            for (let oz = -d / 2 + 1.2; oz <= d / 2 - 1.2; oz += 2.2) {
              if (this.rand() < 0.25) continue;
              this._win(x + w / 2 + 0.05, yy, z + oz, Math.PI / 2, 1.0, 1.4, lit());
              this._win(x - w / 2 - 0.05, yy, z + oz, -Math.PI / 2, 1.0, 1.4, lit());
            }
          }
        }
      }
    }
  }

  _win(x, y, z, rotY, w, h, lit) {
    const d = this._dummy; d.position.set(x, y, z); d.rotation.set(0, rotY, 0); d.scale.set(w, h, 1); d.updateMatrix();
    (lit ? this._winLit : this._winDark).push(d.matrix.clone());
  }

  // ---------- esqueleto urbano ao fundo (fora da arena, na névoa) ----------
  _skyline() {
    const ring = [];
    for (let x = -64; x <= 56; x += 12) { ring.push([x, -(HALF + 14)], [x, HALF + 18]); }
    for (let z = -(HALF + 8); z <= HALF + 14; z += 12) { ring.push([-(HALF + 16), z], [HALF + 14, z]); }
    for (const [cx, cz] of ring) {
      if (this.rand() < 0.2) continue;
      const w = 8 + this.rand() * 6, d = 8 + this.rand() * 6, h = 16 + this.rand() * 18;
      const shade = 0.5 + this.rand() * 0.4;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(this.tex.stucco, new THREE.Color(shade, shade * 0.96, shade * 0.9).getHex(), 0x050505));
      body.position.set(cx + (this.rand() - 0.5) * 4, h / 2, cz + (this.rand() - 0.5) * 4); this.add(body);
      for (let y = 4; y < h - 2; y += 3.6) {
        for (let off = -w / 2 + 1.4; off <= w / 2 - 1.4; off += 2.4) {
          if (this.rand() < 0.3) continue;
          this._win(body.position.x + off, y, body.position.z + d / 2 + 0.05, 0, 1.1, 1.5, this.rand() < 0.22);
          this._win(body.position.x + off, y, body.position.z - d / 2 - 0.05, Math.PI, 1.1, 1.5, this.rand() < 0.22);
        }
      }
    }
  }

  // ---------- lodo radioativo: 1-2 poças aleatórias (longe do spawn) ----------
  _nukage() {
    const nm = new THREE.MeshBasicMaterial({ map: this.tex.nuke, color: 0x9fe34a, fog: true });
    this.nukeMat = nm;
    const count = 1 + (this.rand() < 0.5 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const spot = this._openSpot(CLEAR + 8, 0, 0, 3);
      const w = 7 + this.rand() * 6, d = 7 + this.rand() * 6;
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(w, d), nm);
      pool.rotation.x = -Math.PI / 2; pool.position.set(spot.x, 0.06, spot.z); this.add(pool);
      this.pools.push({ minX: spot.x - w / 2, maxX: spot.x + w / 2, minZ: spot.z - d / 2, maxZ: spot.z + d / 2 });
      const glow = new THREE.PointLight(0x88ff44, 0.9, 26, 1.6); glow.position.set(spot.x, 1.4, spot.z); this.add(glow);
      this.glows.push({ light: glow, phase: this.rand() * 6 });
    }
  }

  // ---------- postes (emissivo + god-ray aditivo; SEM PointLight) ----------
  _lamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 6.5, 6), this.M.metal); pole.position.set(x, 3.25, z); this.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), this.M.metal); arm.position.set(x + 0.5, 6.3, z); this.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 6), new THREE.MeshBasicMaterial({ color: 0xffe6ad, fog: true })); head.position.set(x + 1, 6.1, z); this.add(head);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5.6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    cone.position.set(x + 1, 3.3, z); this.add(cone);
    this.lamps.push({ head, cone, base: x });
  }

  _carBox(x, z, rot) {
    const r = rng(((x * 91 + z * 7) | 0) || 5);
    const g = new THREE.Group();
    const paint = new THREE.Color(0.12 + r() * 0.2, 0.12 + r() * 0.16, 0.13 + r() * 0.18).getHex();
    const m = mat(this.tex.rust, paint);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.4), m); lower.position.y = 0.7; g.add(lower);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 2.2), m); cab.position.set(0, 1.45, -0.2); g.add(cab);
    const glass = new THREE.MeshBasicMaterial({ color: 0x10141a, fog: true });
    for (const zz of [-1.1, 0.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.7), glass); w.position.set(0, 1.5, zz - 0.2 + (zz < 0 ? -0.01 : 0.01)); w.rotation.x = zz < 0 ? -0.4 : 0.4; g.add(w); }
    const tire = new THREE.MeshLambertMaterial({ color: 0x0a0a0a, fog: true });
    for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 8), tire); t.rotation.z = Math.PI / 2; t.position.set(sx * 1.0, 0.45, sz); g.add(t); }
    g.position.set(x, 0, z); g.rotation.y = rot; this.add(g);
    const ext = Math.abs(Math.round(rot / (Math.PI / 2))) % 2 === 0 ? [1.1, 2.3] : [2.3, 1.1];
    this._addCollider(x, z, ext[0], ext[1]);
  }
  _hydrant(x, z) {
    const m = mat(this.tex.rust, 0x6a2a22);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 8), m); b.position.set(x, 0.45, z); this.add(b);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m); cap.position.set(x, 0.92, z); this.add(cap);
  }
  _crate(x, z, s = 1.4) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat(this.tex.rust, 0x6a5230)); c.position.set(x, s / 2, z); this.add(c);
    this._addCollider(x, z, s / 2, s / 2);
  }

  _props() {
    // postes espalhados
    for (let i = 0; i < 7; i++) { const s = this._openSpot(6, 0, 0, 1.6); this._lamp(s.x, s.z); }
    // carros (cobertura)
    for (let i = 0; i < 3; i++) { const s = this._openSpot(CLEAR, 0, 0, 2.6); this._carBox(s.x, s.z, this.rand() < 0.5 ? 0 : Math.PI / 2); }
    // caixas / hidrantes
    for (let i = 0; i < 5; i++) { const s = this._openSpot(6, 0, 0, 1.4); this._crate(s.x, s.z, 1.2 + this.rand() * 0.6); }
    for (let i = 0; i < 3; i++) { const s = this._openSpot(6, 0, 0, 1.0); this._hydrant(s.x, s.z); }

    // detritos espalhados (instanced)
    for (let i = 0; i < 50; i++) {
      const s = 0.25 + this.rand() * 0.8;
      this._dummy.position.set((this.rand() - 0.5) * 74, s / 2 + 0.05, (this.rand() - 0.5) * 74);
      this._dummy.rotation.set(this.rand() * 0.3, this.rand() * 6, this.rand() * 0.3);
      this._dummy.scale.set(s * (1 + this.rand()), s * 0.5, s * (1 + this.rand()));
      this._dummy.updateMatrix(); this._debris.push(this._dummy.matrix.clone());
    }
  }

  // ---------- itens (sem luz: emissivo + disco de brilho aditivo no chão) ----------
  _shellModel() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.36), mat(this.tex.rust, 0x6a3a18)); g.add(b);
    for (const sx of [-0.12, 0, 0.12]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), new THREE.MeshLambertMaterial({ color: 0xb33020, emissive: 0x401008, fog: true })); sh.position.set(sx, 0.18, 0); g.add(sh); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), new THREE.MeshLambertMaterial({ color: 0xc9a23a, emissive: 0x342612, fog: true })); cap.position.set(sx, 0.02, 0); g.add(cap); }
    return g;
  }
  _medModel() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.5), new THREE.MeshLambertMaterial({ color: 0xeae6df, emissive: 0x303030, fog: true })); g.add(b);
    const cM = new THREE.MeshBasicMaterial({ color: 0xe02020, fog: true });
    const cv = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.02), cM); cv.position.set(0, 0, 0.26); g.add(cv);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), cM); ch.position.set(0, 0, 0.26); g.add(ch);
    return g;
  }
  _armorModel() {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0x2ad24a, emissive: 0x0a4a16, fog: true });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.35), m); chest.position.y = 0.1; g.add(chest);
    const nl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.3), m); nl.position.set(0, 0.5, 0); g.add(nl);
    return g;
  }

  _addPickup(type, x, z, amount, build, color) {
    const g = build(); g.position.set(x, 0.55, z); this.add(g);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 14),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.05, z); this.add(glow);
    this.pickups.push({ type, amount, pos: new THREE.Vector3(x, 0.55, z), mesh: g, glow, taken: false, phase: this.rand() * 6 });
  }

  _items() {
    // munição: sempre vários (a horda cresce a cada fase)
    const ammoN = Math.min(8, 4 + (this.level >> 1));
    for (let i = 0; i < ammoN; i++) { const s = this._openSpot(4); this._addPickup('ammo', s.x, s.z, 12, () => this._shellModel(), 0xff8030); }
    // kits médicos
    const medN = 2 + (this.rand() < 0.5 ? 1 : 0);
    for (let i = 0; i < medN; i++) { const s = this._openSpot(6); this._addPickup('med', s.x, s.z, 25, () => this._medModel(), 0xff4040); }
    // colete de vez em quando
    if (this.level % 2 === 0 || this.rand() < 0.4) { const s = this._openSpot(8); this._addPickup('armor', s.x, s.z, 100, () => this._armorModel(), 0x2ad24a); }
  }

  _ash() {
    const N = 480; const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 80; p[i * 3 + 1] = Math.random() * 26; p[i * 3 + 2] = (Math.random() - 0.5) * 80; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.ashMat = new THREE.PointsMaterial({ color: 0xb8b4a8, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.5, fog: true });
    this.ash = new THREE.Points(geo, this.ashMat); this.add(this.ash);
  }

  _commitInstances() {
    const add = (arr, material) => {
      if (!arr.length) return null;
      const im = new THREE.InstancedMesh(this._winGeo, material, arr.length);
      arr.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
      this.add(im); return im;
    };
    add(this._winDark, new THREE.MeshBasicMaterial({ color: 0x070a10, fog: true }));
    this.litWindows = add(this._winLit, new THREE.MeshBasicMaterial({ color: 0xffcf8a, fog: true }));
    if (this._debris.length) {
      const dim = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(this.tex.concrete, 0x55524c), this._debris.length);
      this._debris.forEach((m, i) => dim.setMatrixAt(i, m)); dim.instanceMatrix.needsUpdate = true; this.add(dim);
    }
  }

  // pontos de spawn da horda: abertos e longe do jogador
  enemySpawns(count, playerPos) {
    const out = [];
    for (let i = 0; i < count; i++) out.push(this._openSpot(12, playerPos.x, playerPos.z, 1.2));
    return out;
  }

  // ---------- runtime ----------
  update(dt, t, camPos) {
    this.t = t;
    for (const L of this.lamps) {
      const f = Math.sin(t * 13 + L.base) * 0.5 + Math.sin(t * 7.3 + L.base * 1.7);
      const flick = f > 1.45 ? 0.18 : 1.0;
      L.head.material.color.setRGB(flick * 1.0, flick * 0.9, flick * 0.68);
      L.cone.material.opacity = 0.07 * flick;
    }
    const a = this.ash.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * (1.0 + (i % 5) * 0.22); if (y < 0) y = 26; a.setY(i, y); }
    a.needsUpdate = true;
    this.ash.position.set(camPos.x, 0, camPos.z);

    for (const G of this.glows) G.light.intensity = 0.7 + Math.sin(t * 2.3 + G.phase) * 0.3;
    if (this.nukeMat) this.nukeMat.map.offset.y = (t * 0.06) % 1;

    for (const p of this.pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = 0.55 + Math.sin(t * 2 + p.phase) * 0.08;
    }
  }

  collect(camPos) {
    for (const p of this.pickups) {
      if (p.taken) continue;
      const dx = p.pos.x - camPos.x, dz = p.pos.z - camPos.z;
      if (dx * dx + dz * dz < 1.8 * 1.8) {
        p.taken = true; p.mesh.visible = false; if (p.glow) p.glow.visible = false;
        return { type: p.type, amount: p.amount };
      }
    }
    return null;
  }

  inNukage(camPos) { return this._inPool(camPos.x, camPos.z); }

  // descarta a fase inteira (geometrias + materiais); texturas são compartilhadas e ficam
  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const m = o.material; (Array.isArray(m) ? m : [m]).forEach((mm) => mm && mm.dispose && mm.dispose()); }
    });
    this.lamps.length = 0; this.pickups.length = 0; this.pools.length = 0; this.glows.length = 0;
    this.colliders.length = 0;
  }
}
