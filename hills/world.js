// world.js — DOOM HILLS: cidade enevoada estilo Silent Hill PSX (prédios, ruas,
// postes, esqueleto urbano ao fundo), mas com o LAYOUT da primeira fase do Doom 1
// (E1M1): sala inicial -> corredor -> salão -> pátio contaminado (zigue-zague +
// colete) / sala da chave azul -> porta trancada -> saída. Tudo procedural.
// PERFORMANCE: quase nenhuma luz dinâmica (só lanterna + 1 brilho do lodo). Postes,
// janelas e itens são emissivos/aditivos (sem custo de iluminação por-pixel).
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

// ---------- texturas em canvas 128px ----------
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

function mat(map, color = 0xffffff, emissive = 0x000000) {
  return applyVertexSnap(new THREE.MeshLambertMaterial({ map, color, emissive, fog: true }));
}

const T = 1.0;          // espessura das paredes (grossa = robusta na velocidade do Doom)
const WALL_H = 12;      // altura das paredes (lados de prédio)

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.lamps = [];
    this.pickups = [];
    this.litWindows = null;
    this.tex = makeTextures();
    this.t = 0;

    // buffers de instâncias (janelas) + debris
    this._winDark = []; this._winLit = []; this._debris = [];
    this._winGeo = new THREE.PlaneGeometry(1, 1);
    this._dummy = new THREE.Object3D();

    this.spawn = new THREE.Vector3(0, 1.7, 39);   // sala inicial (sul), olhando p/ norte

    // hordas (frenético): vários inimigos espalhados pela fase
    this.monsterSpawns = [
      new THREE.Vector3(0, 0, 17), new THREE.Vector3(-10, 0, 8), new THREE.Vector3(10, 0, 14),
      new THREE.Vector3(-5, 0, 0), new THREE.Vector3(8, 0, -2),                       // salão
      new THREE.Vector3(31, 0, 4), new THREE.Vector3(30, 0, 14), new THREE.Vector3(36, 0, 9),  // sala da chave
      new THREE.Vector3(-18, 0, 8), new THREE.Vector3(-35, 0, 5), new THREE.Vector3(-17, 0, 16), // pátio
      new THREE.Vector3(0, 0, -22),                                                   // saída
    ];

    // materiais compartilhados (poucos programas)
    this.M = {
      wall: mat(this.tex.brick, 0x8a8278, 0x0a0806),
      conc: mat(this.tex.concrete, 0x6f7176, 0x070809),
      trim: mat(this.tex.concrete, 0x3a3c40),
      metal: mat(this.tex.rust, 0x55585c),
      dark: mat(this.tex.concrete, 0x202227),
    };

    this.doorPos = new THREE.Vector3(0, 0, -6);
    this.exitPos = new THREE.Vector3(0, 0, -27);

    this._ground();
    this._walls();
    this._skyline();
    this._nukage();
    this._door();
    this._exitSign();
    this._props();
    this._items();
    this._ash();
    this._commitInstances();
  }

  _addCollider(cx, cz, hx, hz) { this.colliders.push({ minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz }); }

  _wall(cx, cz, w, d, h = WALL_H, material = this.M.wall) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(cx, h / 2, cz); this.scene.add(m);
    this._addCollider(cx, cz, w / 2, d / 2);
  }
  _wallX(a, b, z, h = WALL_H, m) { this._wall((a + b) / 2, z, Math.abs(b - a), T, h, m); }
  _wallZ(a, b, x, h = WALL_H, m) { this._wall(x, (a + b) / 2, T, Math.abs(b - a), h, m); }

  // ---------- chão (asfalto + faixas + poças) ----------
  _ground() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(this.tex.asphalt, 0x84878c));
    g.rotation.x = -Math.PI / 2; g.position.set(-2, 0, 8); this.scene.add(g);

    // faixa central tracejada nas "avenidas" (corredores)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xb9a55a, fog: true });
    for (let z = 44; z > -30; z -= 6) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.02, z); this.scene.add(l); }

    // poças (sem luz: MeshBasic refletindo o céu)
    const wetMat = new THREE.MeshBasicMaterial({ map: this.tex.wet, color: 0x2a3340, transparent: true, opacity: 0.8, fog: true });
    const r = rng(909);
    for (let i = 0; i < 10; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 2.0, 12), wetMat); p.rotation.x = -Math.PI / 2; p.position.set(-2 + (r() - 0.5) * 60, 0.025, 8 + (r() - 0.5) * 60); p.scale.y = 0.6 + r(); this.scene.add(p); }

    // sangue (gore urbano)
    const bloodMat = new THREE.MeshBasicMaterial({ map: this.tex.blood, transparent: true, depthWrite: false, fog: true });
    for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), bloodMat); b.rotation.x = -Math.PI / 2; b.rotation.z = r() * 6; b.position.set(-2 + (r() - 0.5) * 64, 0.04, 8 + (r() - 0.5) * 60); this.scene.add(b); }
  }

  // ---------- paredes (mesmo layout E1M1, agora como muros/prédios de tijolo) ----------
  _walls() {
    // SALA INICIAL  x[-8,8] z[28,44]
    this._wallX(-8, 8, 44); this._wallZ(28, 44, -8); this._wallZ(28, 44, 8);
    this._wallX(-8, -2.5, 28); this._wallX(2.5, 8, 28);
    // CORREDOR 1  x[-2.5,2.5] z[22,28]
    this._wallZ(22, 28, -2.5); this._wallZ(22, 28, 2.5);
    // SALÃO  x[-16,16] z[-6,22]
    this._wallX(-16, -2.5, 22); this._wallX(2.5, 16, 22);
    this._wallZ(-6, 2, -16); this._wallZ(14, 22, -16);
    this._wallZ(-6, 6, 16); this._wallZ(11, 22, 16);
    this._wallX(-16, -2.5, -6); this._wallX(2.5, 16, -6);
    // PÁTIO  x[-44,-16] z[-6,22]
    this._wallZ(-6, 22, -44); this._wallX(-44, -16, -6); this._wallX(-44, -16, 22);
    // CORREDOR DA CHAVE  x[16,24] z[6,11]
    this._wallX(16, 24, 6); this._wallX(16, 24, 11);
    // SALA DA CHAVE  x[24,40] z[-2,18]
    this._wallZ(-2, 18, 40); this._wallX(24, 40, 18); this._wallX(24, 40, -2);
    this._wallZ(-2, 6, 24); this._wallZ(11, 18, 24);
    // CORREDOR 2 (saída)  x[-2.5,2.5] z[-14,-6]
    this._wallZ(-14, -6, -2.5); this._wallZ(-14, -6, 2.5);
    // SALA DE SAÍDA  x[-12,12] z[-30,-14]
    this._wallZ(-30, -14, -12); this._wallZ(-30, -14, 12); this._wallX(-12, 12, -30);
    this._wallX(-12, -2.5, -14); this._wallX(2.5, 12, -14);

    // janelas nas paredes internas das grandes salas (instanced, sem luz)
    // (nx,nz) = normal apontando p/ DENTRO da sala (lado visível das janelas)
    this._windowRow(-16, 16, 22, 0, -1);     // salão — parede sul (interior fica em -z)
    this._windowRow(-16, 16, -6, 0, 1);      // salão — parede norte
    this._windowRow(-6, 22, -16, 1, 0);      // salão — parede oeste
    this._windowRow(-2, 18, 40, -1, 0);      // sala da chave — parede leste
    this._windowRow(-44, -16, -6, 0, 1);     // pátio — parede norte
    this._windowRow(-30, -14, -12, 1, 0);    // sala de saída — parede oeste
    this._windowRow(-30, -14, 12, -1, 0);    // sala de saída — parede leste
  }

  // fileira de janelas ao longo de uma parede; (nx,nz)=normal apontando p/ dentro da sala
  _windowRow(a, b, c, nx, nz) {
    const horiz = nz !== 0;                  // parede que corre no eixo X
    const lo = Math.min(a, b) + 2, hi = Math.max(a, b) - 2;
    const r = rng(((a * 13 + b * 7 + c) | 0) || 5);
    for (let s = lo; s <= hi; s += 2.4) {
      for (let y = 3; y < WALL_H - 1.5; y += 3.2) {
        if (r() < 0.18) continue;
        const lit = r() < 0.16;
        if (horiz) this._win(s, y, c + nz * 0.45, nz > 0 ? 0 : Math.PI, 1.1, 1.5, lit);
        else this._win(c + nx * 0.45, y, s, nx > 0 ? Math.PI / 2 : -Math.PI / 2, 1.1, 1.5, lit);
      }
    }
  }

  _win(x, y, z, rotY, w, h, lit) {
    const d = this._dummy; d.position.set(x, y, z); d.rotation.set(0, rotY, 0); d.scale.set(w, h, 1); d.updateMatrix();
    (lit ? this._winLit : this._winDark).push(d.matrix.clone());
  }

  // ---------- esqueleto urbano ao fundo (silhuetas com janelas acesas na névoa) ----------
  _skyline() {
    const r = rng(424242);
    const ring = [];
    for (let x = -64; x <= 56; x += 12) { ring.push([x, -46], [x, 60]); }
    for (let z = -40; z <= 56; z += 12) { ring.push([-60, z], [54, z]); }
    for (const [cx, cz] of ring) {
      if (r() < 0.18) continue;
      const w = 8 + r() * 6, d = 8 + r() * 6, h = 16 + r() * 18;
      const shade = 0.5 + r() * 0.4;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(this.tex.stucco, new THREE.Color(shade, shade * 0.96, shade * 0.9).getHex(), 0x050505));
      body.position.set(cx + (r() - 0.5) * 4, h / 2, cz + (r() - 0.5) * 4); this.scene.add(body);
      // janelas nas 4 faces (instanced)
      for (let y = 4; y < h - 2; y += 3.2) {
        for (let off = -w / 2 + 1.4; off <= w / 2 - 1.4; off += 2.2) {
          if (r() < 0.25) continue;
          this._win(body.position.x + off, y, body.position.z + d / 2 + 0.05, 0, 1.1, 1.5, r() < 0.22);
          this._win(body.position.x + off, y, body.position.z - d / 2 - 0.05, Math.PI, 1.1, 1.5, r() < 0.22);
        }
        for (let off = -d / 2 + 1.4; off <= d / 2 - 1.4; off += 2.2) {
          if (r() < 0.25) continue;
          this._win(body.position.x + w / 2 + 0.05, y, body.position.z + off, Math.PI / 2, 1.1, 1.5, r() < 0.22);
          this._win(body.position.x - w / 2 - 0.05, y, body.position.z + off, -Math.PI / 2, 1.1, 1.5, r() < 0.22);
        }
      }
    }
  }

  // ---------- derramamento tóxico (o "lodo" do Doom, agora urbano) + zigue-zague ----------
  _nukage() {
    this.pool = { minX: -41, maxX: -19, minZ: -3, maxZ: 19 };
    const nm = new THREE.MeshBasicMaterial({ map: this.tex.nuke, color: 0x9fe34a, fog: true });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), nm);
    pool.rotation.x = -Math.PI / 2; pool.position.set(-30, 0.06, 8); this.scene.add(pool);
    this.nukeMat = nm;
    // ÚNICA luz dinâmica do mapa (além da lanterna): o brilho verde do tóxico
    this.nukeGlow = new THREE.PointLight(0x88ff44, 0.9, 26, 1.6); this.nukeGlow.position.set(-30, 1.4, 8); this.scene.add(this.nukeGlow);

    this.planks = [
      { minX: -27, maxX: -19, minZ: 11, maxZ: 15 },
      { minX: -31, maxX: -27, minZ: 3, maxZ: 15 },
      { minX: -39, maxX: -31, minZ: 3, maxZ: 7 },
    ];
    const pmat = mat(this.tex.concrete, 0x5a5e5c);
    for (const p of this.planks) {
      const w = p.maxX - p.minX, d = p.maxZ - p.minZ;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, d), pmat);
      slab.position.set((p.minX + p.maxX) / 2, 0.12, (p.minZ + p.maxZ) / 2); this.scene.add(slab);
    }
  }

  // ---------- portão TRANCADO (chave azul) ----------
  _door() {
    const z = -6;
    const frameMat = mat(this.tex.metal, 0x3a3d42);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.5, WALL_H, 0.8), frameMat); fl.position.set(-2.8, WALL_H / 2, z); this.scene.add(fl);
    const fr = fl.clone(); fr.position.x = 2.8; this.scene.add(fr);
    // verga acima (mantém a parede fechada por cima do vão)
    const lint = new THREE.Mesh(new THREE.BoxGeometry(6, WALL_H - 5.4, 0.8), this.M.wall); lint.position.set(0, 5.4 + (WALL_H - 5.4) / 2, z); this.scene.add(lint);
    // folha (sobe ao destrancar)
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(5, 5.2, 0.4), mat(this.tex.metal, 0x4a4e54));
    leaf.position.set(0, 2.6, z); this.scene.add(leaf); this.doorLeaf = leaf;
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x2a55ff, fog: true });
    for (const ly of [-1.6, 1.6]) { const stripe = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 0.46), blueMat); stripe.position.set(0, ly, 0); leaf.add(stripe); }
    this._addCollider(0, z, 2.5, 0.45);
    this._doorCollider = this.colliders[this.colliders.length - 1];
    this.doorOpen = false;
  }

  _signTex(text, bg = '#220606', fg = '#ff5a3c') {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
    g.fillStyle = fg; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 36);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return t;
  }

  // ---------- saída: placa EXIT + alavanca (sem luz; emissivo) ----------
  _exitSign() {
    const z = -29.6;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 0.4), mat(this.tex.metal, 0x33373c)); panel.position.set(0, 2.0, z); this.scene.add(panel);
    this.exitLever = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: true }));
    this.exitLever.position.set(0, 2.0, z + 0.4); this.scene.add(this.exitLever);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: this._signTex('EXIT'), fog: true }));
    sign.position.set(0, 3.8, z + 0.3); this.scene.add(sign);
    this.exitSignMat = sign.material;
  }

  // ---------- postes (emissivo + god-ray aditivo; SEM PointLight) ----------
  _lamp(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 6.5, 6), this.M.metal); pole.position.set(x, 3.25, z); this.scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), this.M.metal); arm.position.set(x + 0.5, 6.3, z); this.scene.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 6), new THREE.MeshBasicMaterial({ color: 0xffe6ad, fog: true })); head.position.set(x + 1, 6.1, z); this.scene.add(head);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5.6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    cone.position.set(x + 1, 3.3, z); this.scene.add(cone);
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
    g.position.set(x, 0, z); g.rotation.y = rot; this.scene.add(g);
    const ext = Math.abs(Math.round(rot / (Math.PI / 2))) % 2 === 0 ? [1.1, 2.3] : [2.3, 1.1];
    this._addCollider(x, z, ext[0], ext[1]);
  }
  _hydrant(x, z) {
    const m = mat(this.tex.rust, 0x6a2a22);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 8), m); b.position.set(x, 0.45, z); this.scene.add(b);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m); cap.position.set(x, 0.92, z); this.scene.add(cap);
  }
  _crate(x, z, s = 1.4) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat(this.tex.rust, 0x6a5230)); c.position.set(x, s / 2, z); this.scene.add(c);
    this._addCollider(x, z, s / 2, s / 2);
  }

  _props() {
    // postes nas avenidas/salas
    this._lamp(0, 36); this._lamp(0, 10); this._lamp(-11, 18); this._lamp(11, 0);
    this._lamp(32, 8); this._lamp(0, -22); this._lamp(-22, 16); this._lamp(-36, 6);
    // carros (cobertura + cidade)
    this._carBox(-9, 16, 0.1); this._carBox(11, 8, Math.PI / 2); this._carBox(30, -0.5, 0); this._carBox(-2, -22, Math.PI / 2);
    // caixas / hidrantes (cobertura)
    this._crate(-10, 13); this._crate(6, 18, 1.6); this._crate(28, 14); this._crate(36, 2, 1.6);
    this._hydrant(2.4, 28); this._hydrant(-2.4, -10); this._hydrant(38, 14);

    // detritos espalhados (instanced)
    const r = rng(555);
    for (let i = 0; i < 50; i++) {
      const s = 0.25 + r() * 0.8;
      this._dummy.position.set(-2 + (r() - 0.5) * 70, s / 2 + 0.05, 8 + (r() - 0.5) * 60);
      this._dummy.rotation.set(r() * 0.3, r() * 6, r() * 0.3);
      this._dummy.scale.set(s * (1 + r()), s * 0.5, s * (1 + r()));
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
  _keyModel() {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0x2a6bff, emissive: 0x102a8a, fog: true });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.05), m); card.position.y = 0.3; g.add(card);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0x9fc0ff, fog: true })); stripe.position.set(0, 0.36, 0); g.add(stripe);
    return g;
  }

  _addPickup(type, x, z, amount, build, color) {
    const g = build(); g.position.set(x, 0.55, z); this.scene.add(g);
    // disco de brilho no chão (aditivo, sem custo de luz) p/ achar na névoa
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 14),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.05, z); this.scene.add(glow);
    this.pickups.push({ type, amount, pos: new THREE.Vector3(x, 0.55, z), mesh: g, glow, taken: false, phase: Math.random() * 6 });
  }

  _items() {
    this._addPickup('ammo', 0, 33, 12, () => this._shellModel(), 0xff8030);
    this._addPickup('ammo', -6, 8, 12, () => this._shellModel(), 0xff8030);
    this._addPickup('ammo', 13, 18, 12, () => this._shellModel(), 0xff8030);
    this._addPickup('ammo', -36, 5, 16, () => this._shellModel(), 0xff8030);
    this._addPickup('ammo', 30, 2, 12, () => this._shellModel(), 0xff8030);
    this._addPickup('ammo', 0, -20, 16, () => this._shellModel(), 0xff8030);
    this._addPickup('med', 6, 30, 25, () => this._medModel(), 0xff4040);
    this._addPickup('med', -13, 18, 25, () => this._medModel(), 0xff4040);
    this._addPickup('med', 36, 16, 25, () => this._medModel(), 0xff4040);
    this._addPickup('armor', -36, 5, 100, () => this._armorModel(), 0x2ad24a);
    this._addPickup('key', 34, 8, 1, () => this._keyModel(), 0x2a6bff);
  }

  _ash() {
    const N = 800; const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = -2 + (Math.random() - 0.5) * 80; p[i * 3 + 1] = Math.random() * 26; p[i * 3 + 2] = 8 + (Math.random() - 0.5) * 70; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.ashMat = new THREE.PointsMaterial({ color: 0xb8b4a8, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.5, fog: true });
    this.ash = new THREE.Points(geo, this.ashMat); this.scene.add(this.ash);
  }

  _commitInstances() {
    const add = (arr, material) => {
      if (!arr.length) return null;
      const im = new THREE.InstancedMesh(this._winGeo, material, arr.length);
      arr.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
      this.scene.add(im); return im;
    };
    add(this._winDark, new THREE.MeshBasicMaterial({ color: 0x070a10, fog: true }));
    this.litWindows = add(this._winLit, new THREE.MeshBasicMaterial({ color: 0xffcf8a, fog: true }));
    if (this._debris.length) {
      const dim = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(this.tex.concrete, 0x55524c), this._debris.length);
      this._debris.forEach((m, i) => dim.setMatrixAt(i, m)); dim.instanceMatrix.needsUpdate = true; this.scene.add(dim);
    }
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

    if (this.nukeGlow) this.nukeGlow.intensity = 0.7 + Math.sin(t * 2.3) * 0.3;
    if (this.nukeMat) this.nukeMat.map.offset.y = (t * 0.06) % 1;

    for (const p of this.pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = 0.55 + Math.sin(t * 2 + p.phase) * 0.08;
    }
    if (this.exitSignMat) this.exitSignMat.color.setRGB(1, 0.45 + Math.sin(t * 5) * 0.2, 0.3);
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

  inNukage(camPos) {
    const x = camPos.x, z = camPos.z;
    if (x < this.pool.minX || x > this.pool.maxX || z < this.pool.minZ || z > this.pool.maxZ) return false;
    for (const pl of this.planks) if (x >= pl.minX && x <= pl.maxX && z >= pl.minZ && z <= pl.maxZ) return false;
    return true;
  }

  nearDoor(camPos, d = 3.4) { const dx = this.doorPos.x - camPos.x, dz = this.doorPos.z - camPos.z; return dx * dx + dz * dz < d * d; }
  openDoor() {
    if (this.doorOpen) return; this.doorOpen = true;
    if (this.doorLeaf) this.doorLeaf.position.y = WALL_H + 2.6;
    const i = this.colliders.indexOf(this._doorCollider);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  nearExit(camPos, d = 4.0) { const dx = this.exitPos.x - camPos.x, dz = this.exitPos.z - camPos.z; return dx * dx + dz * dz < d * d; }
  pullExit() { if (this.exitLever) this.exitLever.rotation.x = -0.9; }
}
