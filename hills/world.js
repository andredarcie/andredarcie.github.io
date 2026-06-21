// world.js — cidade enevoada detalhada: quarteirões com prédios, calçadas, postes
// com god-rays, carros, props urbanos, poças, sangue e cinza. Tudo procedural.
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
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;       // rachaduras
    for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * 128, y = Math.random() * 128; g.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  }, 26);
  const concrete = canvasTex((g) => { grain(g, 78, 22); stains(g, 24, '#000', 16);
    g.strokeStyle = 'rgba(0,0,0,.22)'; for (let i = 16; i < 128; i += 16) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); } }, 1);
  const stucco = canvasTex((g) => { grain(g, 95, 18, [1.02, 0.98, 0.9]); stains(g, 40, '#3a2a18', 22); stains(g, 12, '#000', 26); }, 1);
  const brick = canvasTex((g) => {
    g.fillStyle = '#2e1d18'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 10) for (let x = 0; x < 128; x += 24) {
      const ox = (y / 10) % 2 ? 12 : 0; const r = 70 + Math.random() * 45;
      g.fillStyle = `rgb(${r | 0},${(r * .46) | 0},${(r * .4) | 0})`; g.fillRect(x + ox + 1, y + 1, 22, 8);
    }
    g.globalAlpha = 0.5; stains(g, 20, '#000', 14); g.globalAlpha = 1;
  }, 1);
  const rust = canvasTex((g) => { grain(g, 44, 20, [1.1, 0.85, 0.7]);
    for (let i = 0; i < 2200; i++) { const s = Math.random(); g.fillStyle = `rgba(${120 + s * 90 | 0},${44 + s * 40 | 0},${10 + s * 20 | 0},.5)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + s * 3, 1 + s * 3); } }, 1);
  const wood = canvasTex((g) => { for (let i = 0; i < 128; i += 12) { const b = 48 + Math.random() * 22; g.fillStyle = `rgb(${b | 0},${b * .6 | 0},${b * .34 | 0})`; g.fillRect(0, i, 128, 12); } g.strokeStyle = 'rgba(0,0,0,.4)'; for (let i = 0; i < 128; i += 12) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } }, 1);
  const wet = canvasTex((g) => { grain(g, 14, 10, [0.8, 0.9, 1.2]);
    g.globalAlpha = 0.5; g.fillStyle = '#5a6a80'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 20 + Math.random() * 40, 1); g.globalAlpha = 1; }, 1);
  const blood = canvasTex((g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(70,6,6,0.92)'; g.beginPath(); g.ellipse(64, 64, 40, 30, 0.5, 0, 7); g.fill();
    g.fillStyle = 'rgba(40,2,2,0.95)'; g.beginPath(); g.ellipse(64, 64, 22, 16, 0.5, 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.7; g.fillStyle = '#400'; g.beginPath(); g.arc(64 + (Math.random() - 0.5) * 110, 64 + (Math.random() - 0.5) * 110, 1 + Math.random() * 5, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }, 1, true);
  return { asphalt, concrete, stucco, brick, rust, wood, wet, blood };
}

function mat(map, color = 0xffffff, emissive = 0x000000) {
  return applyVertexSnap(new THREE.MeshLambertMaterial({ map, color, emissive, fog: true }));
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.buildings = [];
    this.lamps = [];
    this.litWindows = null;
    this.tex = makeTextures();

    // a textura da rua (asfalto) ficou ótima -> reusar em prédios e objetos.
    // clones compartilham o mesmo canvas, só mudam a repetição por escala.
    const A = this.tex.asphalt;
    const cloneRep = (rep) => { const t = A.clone(); t.repeat.set(rep, rep); t.needsUpdate = true; return t; };
    this.tex.wall = cloneRep(4);     // superfícies grandes (paredes)
    this.tex.prop = cloneRep(2);     // objetos menores
    this.tex.brick = this.tex.concrete = this.tex.stucco = this.tex.wall;
    this.tex.rust = this.tex.wood = this.tex.metal = this.tex.prop;
    this.bounds = 46;
    this.spawn = new THREE.Vector3(0, 1.7, 40);
    this.t = 0;

    // buffers de instâncias
    this._winDark = []; this._winLit = []; this._debris = [];
    this._winGeo = new THREE.PlaneGeometry(1, 1);
    this._dummy = new THREE.Object3D();

    // materiais compartilhados (1 programa cada)
    this.M = {
      trim: mat(this.tex.concrete, 0x3a3c40),
      metal: mat(this.tex.rust, 0x55585c),
      dark: mat(this.tex.concrete, 0x202227),
    };

    this._ground();
    this._perimeter();
    this._blocks();
    this._props();
    this._gate();
    this._buildKey();
    this._ash();
    this._commitInstances();
  }

  _addCollider(cx, cz, hx, hz) { this.colliders.push({ minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz }); }

  // ---------- chão ----------
  _ground() {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), mat(this.tex.asphalt, 0x8f9298));
    g.rotation.x = -Math.PI / 2; this.scene.add(g);

    // avenidas centrais (asfalto mais claro/limpo) + faixa central tracejada
    const av = mat(this.tex.asphalt, 0xb6b9bf);
    const a1 = new THREE.Mesh(new THREE.PlaneGeometry(130, 18), av); a1.rotation.x = -Math.PI / 2; a1.position.y = 0.01; this.scene.add(a1);
    const a2 = a1.clone(); a2.rotation.z = Math.PI / 2; this.scene.add(a2);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xb9a55a, fog: true });
    for (let z = -60; z < 60; z += 6) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 3), lineMat); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.02, z); this.scene.add(l); }

    // poças espelhando o céu
    const wetMat = new THREE.MeshBasicMaterial({ map: this.tex.wet, color: 0x2a3340, transparent: true, opacity: 0.8, fog: true });
    const r = rng(909);
    for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.8 + r() * 2.2, 12), wetMat); p.rotation.x = -Math.PI / 2; p.position.set((r() - 0.5) * 70, 0.025, (r() - 0.5) * 70); p.scale.y = 0.6 + r(); this.scene.add(p); }

    // manchas de sangue
    const bloodMat = new THREE.MeshBasicMaterial({ map: this.tex.blood, transparent: true, depthWrite: false, fog: true });
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), bloodMat); b.rotation.x = -Math.PI / 2; b.rotation.z = r() * 6; b.position.set((r() - 0.5) * 60, 0.04, (r() - 0.5) * 60); this.scene.add(b); }
  }

  _perimeter() {
    const b = this.bounds, t = 1, h = 9;
    const wall = mat(this.tex.wall, 0x4a4d52);
    const seg = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); m.position.set(x, h / 2, z); this.scene.add(m); };
    // norte e laterais: paredes inteiras
    seg(0, -b, b * 2, t); seg(-b, 0, t, b * 2); seg(b, 0, t, b * 2);
    this._addCollider(0, -b, b, t); this._addCollider(-b, 0, t, b); this._addCollider(b, 0, t, b);
    // sul (+z): VÃO central exatamente do tamanho do portão
    const gap = 3.0, side = b - gap, cx = gap + side / 2;
    seg(-cx, b, side, t); seg(cx, b, side, t);
    this._addCollider(-cx, b, side / 2, t); this._addCollider(cx, b, side / 2, t);
    // verga por cima do vão (parede continua fechada acima do portão)
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gap * 2, h - 6, t), wall);
    lintel.position.set(0, 6 + (h - 6) / 2, b); this.scene.add(lintel);
  }

  // ---------- janelas (instanced) ----------
  _win(x, y, z, rotY, w, h, lit) {
    const d = this._dummy; d.position.set(x, y, z); d.rotation.set(0, rotY, 0); d.scale.set(w, h, 1); d.updateMatrix();
    (lit ? this._winLit : this._winDark).push(d.matrix.clone());
  }
  _facade(bx, bz, w, h, d, r) {
    const top = h - 2.2;
    for (let y = 4; y < top; y += 3.2) {
      for (let off = -w / 2 + 1.6; off <= w / 2 - 1.6; off += 2.3) {
        if (r() < 0.12) continue;
        const lit = r() < 0.07;
        this._win(bx + off, y, bz + d / 2 + 0.05, 0, 1.1, 1.5, lit);
        this._win(bx + off, y, bz - d / 2 - 0.05, Math.PI, 1.1, 1.5, r() < 0.07);
      }
      for (let off = -d / 2 + 1.6; off <= d / 2 - 1.6; off += 2.3) {
        if (r() < 0.12) continue;
        this._win(bx + w / 2 + 0.05, y, bz + off, Math.PI / 2, 1.1, 1.5, r() < 0.07);
        this._win(bx - w / 2 - 0.05, y, bz + off, -Math.PI / 2, 1.1, 1.5, r() < 0.07);
      }
    }
  }

  // ---------- prédio ----------
  _building(cx, cz, r) {
    const w = 10 + r() * 4, d = 10 + r() * 4, h = 9 + r() * 14;
    const bx = cx + (r() - 0.5) * 2, bz = cz + (r() - 0.5) * 2;
    // mesma textura da rua; variação só pela cor (tom + leve matiz)
    const shade = 0.6 + r() * 0.4;
    const hue = 0.9 + r() * 0.12;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(this.tex.wall, new THREE.Color(shade, shade * 0.97, shade * hue * 0.92).getHex()));
    body.position.set(bx, h / 2, bz); this.scene.add(body); this.buildings.push(body);

    // calçada (meio-fio) em volta
    const side = new THREE.Mesh(new THREE.BoxGeometry(w + 3, 0.3, d + 3), this.M.trim);
    side.position.set(bx, 0.15, bz); this.scene.add(side);

    // faixas de andar
    for (let y = 3.4; y < h - 1.5; y += 3.4) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.22, d + 0.25), this.M.dark);
      band.position.set(bx, y, bz); this.scene.add(band);
    }
    // cornija no topo
    const cor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.6, d + 0.7), this.M.trim);
    cor.position.set(bx, h - 0.3, bz); this.scene.add(cor);

    this._facade(bx, bz, w, h, d, r);

    // porta + marquise virada pra avenida central
    const dirX = cx > 0 ? -1 : 1;
    const dx = bx + dirX * (w / 2 + 0.02);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), this.M.dark);
    door.position.set(dx, 1.3, bz); door.rotation.y = dirX > 0 ? Math.PI / 2 : -Math.PI / 2; this.scene.add(door);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 3), this.M.metal);
    canopy.position.set(bx + dirX * (w / 2 + 0.4), 3, bz); this.scene.add(canopy);

    // telhado: caixa d'água + dutos
    if (r() < 0.55) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.8, 8), mat(this.tex.wood, 0x4a3a26));
      tank.position.set(bx + (r() - 0.5) * 3, h + 1.5, bz + (r() - 0.5) * 3); this.scene.add(tank);
      for (let i = 0; i < 4; i++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), this.M.metal); leg.position.set(tank.position.x + (i < 2 ? -0.7 : 0.7), h + 0.6, tank.position.z + (i % 2 ? -0.7 : 0.7)); this.scene.add(leg); }
    }
    if (r() < 0.6) for (let i = 0; i < 2; i++) { const duct = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1, 0.9), this.M.metal); duct.position.set(bx + (r() - 0.5) * w * 0.6, h + 0.5, bz + (r() - 0.5) * d * 0.6); this.scene.add(duct); }

    // escada de incêndio
    if (r() < 0.45) this._fireEscape(bx, bz, w, h, d, dirX);

    this._addCollider(bx, bz, w / 2, d / 2);
  }

  _fireEscape(bx, bz, w, h, d, dirX) {
    const fx = bx - dirX * (w / 2 + 0.25);                 // face oposta à porta
    const rotY = dirX > 0 ? -Math.PI / 2 : Math.PI / 2;
    for (let y = 3; y < h - 2; y += 3) {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.4), this.M.metal);
      plat.position.set(fx, y, bz); plat.rotation.y = rotY; this.scene.add(plat);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 2.4), this.M.metal);
      rail.position.set(fx - dirX * -0.0, y + 0.45, bz); rail.rotation.y = rotY; rail.material = this.M.metal; this.scene.add(rail);
    }
    for (const sz of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, h - 2, 5), this.M.metal); pole.position.set(fx, (h - 2) / 2 + 1, bz + sz * 1.1); this.scene.add(pole); }
  }

  _blocks() {
    const r = rng(20240620);
    const pos = [-36, -18, 18, 36];
    for (const cx of pos) for (const cz of pos) {
      if (r() < 0.12) { this._plaza(cx, cz, r); continue; }
      this._building(cx, cz, r);
    }
  }

  _plaza(cx, cz, r) {                                      // lote vazio com escombros
    for (let i = 0; i < 6; i++) {
      const s = 0.5 + r() * 1.6;
      this._dummy.position.set(cx + (r() - 0.5) * 12, s / 2, cz + (r() - 0.5) * 12);
      this._dummy.rotation.set(r(), r() * 6, r());
      this._dummy.scale.set(s, s * (0.5 + r()), s);
      this._dummy.updateMatrix(); this._debris.push(this._dummy.matrix.clone());
    }
  }

  // ---------- postes com god-ray ----------
  _lamp(x, z, withLight) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 6.5, 6), this.M.metal);
    pole.position.set(x, 3.25, z); this.scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.12), this.M.metal);
    arm.position.set(x + 0.5, 6.3, z); this.scene.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 6), new THREE.MeshBasicMaterial({ color: 0xffe6ad, fog: true }));
    head.position.set(x + 1, 6.1, z); this.scene.add(head);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5.6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    cone.position.set(x + 1, 3.3, z); this.scene.add(cone);

    let light = null;
    if (withLight) { light = new THREE.PointLight(0xffd39a, 1.3, 16, 1.0); light.position.set(x + 1, 5.8, z); this.scene.add(light); }
    this.lamps.push({ head, cone, light, base: x });
  }

  _car(x, z, rot) {
    const r = rng(((x * 91 + z * 7) | 0) || 5);
    const g = new THREE.Group();
    const paint = new THREE.Color(0.12 + r() * 0.22, 0.12 + r() * 0.18, 0.13 + r() * 0.2).getHex();
    const m = mat(this.tex.rust, paint);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.4), m); lower.position.y = 0.7; g.add(lower);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 2.2), m); cab.position.set(0, 1.45, -0.2); g.add(cab);
    const glass = new THREE.MeshBasicMaterial({ color: 0x10141a, fog: true });
    for (const zz of [-1.1, 0.9]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.7), glass); w.position.set(0, 1.5, zz + (-0.2) + (zz < 0 ? -0.01 : 0.01)); w.rotation.x = zz < 0 ? -0.4 : 0.4; g.add(w); }
    const tire = new THREE.MeshLambertMaterial({ color: 0x0a0a0a, fog: true });
    for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 8), tire); t.rotation.z = Math.PI / 2; t.position.set(sx * 1.0, 0.45, sz); g.add(t); }
    for (const sx of [-0.6, 0.6]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), new THREE.MeshBasicMaterial({ color: 0x6a6a55, fog: true })); hl.position.set(sx, 0.8, 2.21); g.add(hl); }
    g.position.set(x, 0, z); g.rotation.y = rot; this.scene.add(g);
    const ext = Math.abs(Math.round(rot / (Math.PI / 2))) % 2 === 0 ? [1.1, 2.3] : [2.3, 1.1];
    this._addCollider(x, z, ext[0], ext[1]);
  }

  _hydrant(x, z) {
    const m = mat(this.tex.rust, 0x6a2a22);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 8), m); b.position.set(x, 0.45, z); this.scene.add(b);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), m); cap.position.set(x, 0.92, z); this.scene.add(cap);
    for (const a of [0, Math.PI]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.14), m); arm.position.set(x + Math.cos(a) * 0.25, 0.6, z + Math.sin(a) * 0.25); this.scene.add(arm); }
  }
  _bin(x, z) {
    const m = mat(this.tex.metal || this.tex.rust, 0x44484c);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.0, 8), m); b.position.set(x, 0.5, z); this.scene.add(b);
  }
  _phone(x, z) {
    const m = mat(this.tex.rust, 0x33474f);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.1, 0.7), m); box.position.set(x, 1.05, z); this.scene.add(box);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.8), this.M.dark); top.position.set(x, 2.2, z); this.scene.add(top);
  }
  _tree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 5.5, 6), mat(this.tex.wood, 0x3c2a1a));
    trunk.position.set(x, 2.75, z); this.scene.add(trunk);
    const r = rng(((x * 13 + z) | 0) || 3);
    for (let i = 0; i < 7; i++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 1.4 + r(), 5), mat(this.tex.wood, 0x2e2113)); br.position.set(x + (r() - 0.5) * 1.4, 4.2 + r() * 1.8, z + (r() - 0.5) * 1.4); br.rotation.set(r() * 1.3, r() * 3, r() * 1.3); this.scene.add(br); }
  }

  _props() {
    // postes nas avenidas (com luz) e nos cruzamentos (sem luz, só god-ray)
    this._lamp(3, 26, true); this._lamp(-3, 2, true); this._lamp(3, -22, true);
    this._lamp(-3, -38, true); this._lamp(26, 3, true); this._lamp(-26, -3, true);
    this._lamp(11, 11, false); this._lamp(-11, -11, false); this._lamp(11, -29, false); this._lamp(-29, 11, false);

    this._car(6, 30, 0); this._car(-7, 8, Math.PI / 2); this._car(8, -16, 0.05); this._car(-6, -34, 0);
    this._car(28, -6, Math.PI / 2); this._car(-30, 6, Math.PI / 2);

    this._hydrant(2.2, 14); this._hydrant(-2.4, -16); this._hydrant(24, 2.4);
    this._bin(-2.6, 22); this._bin(2.6, -10); this._bin(-2.6, -30); this._bin(13, -2.5);
    this._phone(-3.4, 16); this._phone(3.2, -4);
    this._tree(-12, 28); this._tree(13, -3); this._tree(-30, 20); this._tree(29, -30); this._tree(14, 33);

    // detritos espalhados (instanced)
    const r = rng(555);
    for (let i = 0; i < 70; i++) {
      const s = 0.25 + r() * 0.9;
      this._dummy.position.set((r() - 0.5) * 80, s / 2 + 0.05, (r() - 0.5) * 80);
      this._dummy.rotation.set(r() * 0.3, r() * 6, r() * 0.3);
      this._dummy.scale.set(s * (1 + r()), s * 0.5, s * (1 + r()));
      this._dummy.updateMatrix(); this._debris.push(this._dummy.matrix.clone());
    }
  }

  // portão de GRADE bem ao lado do jogador (sul), trancado até achar a chave
  _gate() {
    const z = 46; this.gatePos = new THREE.Vector3(0, 0, z);   // dentro do vão do muro
    const g = new THREE.Group();
    const postMat = mat(this.tex.wall, 0x70737a);
    const post = (x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), postMat); p.position.set(x, 3, z); g.add(p); };
    post(-2.6); post(2.6);
    const top = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 0.6), postMat); top.position.set(0, 5.7, z); g.add(top);

    // folha da grade: barras verticais + travessas (gira na dobradiça ao destrancar)
    const grille = new THREE.Group(); grille.position.set(-2.3, 0, z);
    const barMat = this.M.metal;
    for (let i = 0; i <= 9; i++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 6), barMat); bar.position.set(i * 0.51, 2.6, 0); grille.add(bar); }
    for (const yy of [0.5, 2.6, 4.7]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 0.12), barMat); rail.position.set(2.3, yy, 0); grille.add(rail); }
    g.add(grille); this.gateGrille = grille;

    this.gateGlow = new THREE.PointLight(0x99371f, 1.0, 12, 1.0); this.gateGlow.position.set(0, 2.5, z - 1.6); g.add(this.gateGlow); // vermelho = trancado
    this.scene.add(g);

    this._addCollider(0, z, 2.6, 0.35);
    this._gateCollider = this.colliders[this.colliders.length - 1];
  }

  // a chave caída no chão, com brilho fraco pra ser achada no nevoeiro
  _buildKey() {
    this.keyPos = new THREE.Vector3(0, 0.5, -28);
    const g = new THREE.Group();
    // chave velha enferrujada
    const rusty = applyVertexSnap(new THREE.MeshLambertMaterial({ map: this.tex.prop, color: 0x7a5230, emissive: 0x281204, fog: true }));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 14), rusty));
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), rusty); shaft.position.set(0, -0.34, 0); g.add(shaft);
    for (const yy of [-0.5, -0.58]) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.06), rusty); tooth.position.set(0.08, yy, 0); g.add(tooth); }
    g.position.copy(this.keyPos); g.rotation.x = Math.PI / 2;
    const light = new THREE.PointLight(0xffd070, 1.4, 7, 1.0); light.position.copy(this.keyPos); this.scene.add(light);
    this.scene.add(g);
    this.key = { group: g, light, taken: false };
  }

  _ash() {
    const N = 1800; const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i*3] = (Math.random()-0.5)*70; p[i*3+1] = Math.random()*32; p[i*3+2] = (Math.random()-0.5)*70; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.ashMat = new THREE.PointsMaterial({ color: 0xb8b4a8, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.6, fog: true });
    this.ash = new THREE.Points(geo, this.ashMat); this.scene.add(this.ash);
  }

  _commitInstances() {
    const add = (arr, material) => {
      if (!arr.length) return null;
      const im = new THREE.InstancedMesh(this._winGeo, material, arr.length);
      arr.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
      this.scene.add(im); return im;
    };
    add(this._winDark, applyVertexSnap(new THREE.MeshBasicMaterial({ color: 0x080b11, fog: true })));
    this.litWindows = add(this._winLit, applyVertexSnap(new THREE.MeshBasicMaterial({ color: 0xffcf8a, fog: true })));
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
      const flick = f > 1.45 ? 0.12 : 1.0;
      L.head.material.color.setRGB(flick * 1.0, flick * 0.9, flick * 0.68);
      L.cone.material.opacity = 0.06 * flick;
      if (L.light) L.light.intensity = 1.3 * flick;
    }
    const a = this.ash.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * (1.1 + (i % 5) * 0.25);
      if (y < 0) y = 32;
      a.setX(i, a.getX(i) + Math.sin(t * 0.6 + i) * dt * 0.25);
      a.setY(i, y);
    }
    a.needsUpdate = true;
    this.ash.position.set(camPos.x, 0, camPos.z);

    // chave girando + brilho pulsante
    if (this.key && !this.key.taken) {
      this.key.group.rotation.z += dt * 1.6;
      this.key.light.intensity = 1.1 + Math.sin(t * 3) * 0.5;
    }
  }

  // chegou perto da chave (ainda não pega)?
  atKey(camPos) {
    if (!this.key || this.key.taken) return false;
    const dx = this.keyPos.x - camPos.x, dz = this.keyPos.z - camPos.z;
    return dx * dx + dz * dz < 4;
  }
  // pega de fato (chamado ao abrir a tela de inspeção)
  takeKey() {
    if (!this.key) return;
    this.key.taken = true; this.key.group.visible = false;
    this.scene.remove(this.key.light);
  }

  nearGate(camPos, d) { const dx = this.gatePos.x - camPos.x, dz = this.gatePos.z - camPos.z; return dx * dx + dz * dz < d * d; }
  atGate(camPos) { const dx = this.gatePos.x - camPos.x, dz = this.gatePos.z - camPos.z; return dx * dx + dz * dz < 6.8; }

  unlockGate() {
    this.gateGrille.rotation.y = -Math.PI / 1.7;   // abre girando na dobradiça
    this.gateGlow.color.set(0x66ccff); this.gateGlow.intensity = 1.8;  // azul = aberto
    const i = this.colliders.indexOf(this._gateCollider);
    if (i >= 0) this.colliders.splice(i, 1);
  }

  setOtherworld() {
    for (const b of this.buildings) { b.material.color.multiplyScalar(0.55); b.material.emissive = new THREE.Color(0x1a0603); }
    this.ashMat.color.set(0x6a3020);
    if (this.litWindows) this.litWindows.material.color.set(0xff5a2a);
    if (this.gateGlow) this.gateGlow.color.set(0xff5530);
  }
}
