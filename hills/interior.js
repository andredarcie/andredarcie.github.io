// interior.js — banheiro público IMUNDO (refúgio interno) na mesma estética PSX.
// Cena THREE própria (renderizada pela mesma pipeline PSX/câmera do jogo).
// Aqui o jogador acha a "chave do portão geral" dentro do vaso sanitário.
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
function canvasTex(draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
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
    g.globalAlpha = 0.06 + Math.random() * 0.22;
    g.fillStyle = color;
    const x = Math.random() * 128, y = Math.random() * 128, r = 4 + Math.random() * sizeMax;
    g.beginPath(); g.ellipse(x, y, r, r * (0.5 + Math.random()), Math.random() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}

function makeTex() {
  // azulejo de parede sujo + rejunte
  const tile = canvasTex((g) => {
    grain(g, 122, 26, [0.96, 1.0, 0.95]);
    g.strokeStyle = 'rgba(18,22,18,.6)'; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
    stains(g, 40, '#3a3a1e', 20); stains(g, 16, '#180806', 18);
    // escorridos verticais (mofo)
    g.strokeStyle = 'rgba(30,40,22,.5)'; g.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const x = Math.random() * 128; g.beginPath(); g.moveTo(x, Math.random() * 40); g.lineTo(x + (Math.random() - 0.5) * 6, 60 + Math.random() * 60); g.stroke(); }
  }, 1);
  // piso de ladrilho encardido
  const floor = canvasTex((g) => {
    grain(g, 66, 24, [0.92, 0.96, 0.9]);
    g.strokeStyle = 'rgba(8,10,8,.6)'; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 21) { g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
    stains(g, 44, '#241a0c', 22); stains(g, 18, '#140604', 26);
  }, 1);
  // porcelana manchada (vaso / pia)
  const porcelain = canvasTex((g) => {
    grain(g, 176, 14, [1.0, 1.0, 0.97]);
    stains(g, 28, '#5a4a22', 16); stains(g, 16, '#3a2a10', 12);
    g.strokeStyle = 'rgba(40,40,40,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * 128, y = Math.random() * 128; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  }, 1);
  // metal enferrujado (divisória / porta / canos)
  const rust = canvasTex((g) => {
    grain(g, 46, 22, [1.1, 0.85, 0.7]);
    for (let i = 0; i < 2000; i++) { const s = Math.random(); g.fillStyle = `rgba(${120 + s * 90 | 0},${44 + s * 40 | 0},${10 + s * 20 | 0},.5)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + s * 3, 1 + s * 3); }
  }, 1);
  return { tile, floor, porcelain, rust };
}

function mat(map, color = 0xffffff, emissive = 0x000000, side = THREE.FrontSide) {
  return applyVertexSnap(new THREE.MeshLambertMaterial({ map, color, emissive, fog: true, side }));
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

export class Interior {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07090a);
    this.scene.fog = new THREE.FogExp2(0x07090a, 0.075);
    this.colliders = [];
    this.tex = makeTex();
    this.t = 0;

    this.W = 8; this.D = 9; this.H = 3.2;        // dimensões internas
    this.spawn = new THREE.Vector3(0, 1.7, 2.0); // entra de costas pra porta
    this.exitPos = new THREE.Vector3(0, 0, 3.5); // gatilho de saída (na porta)
    this.toiletPos = new THREE.Vector3(-2.6, 0, -3.7);

    // clones de textura com repetição própria por superfície
    this._rep = (tex, rx, ry) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; };

    this._lights();
    this._shell();
    this._toilet();
    this._stall();
    this._sinks();
    this._door();
    this._grime();
    this._buildKey();
  }

  _addCollider(cx, cz, hx, hz) { this.colliders.push({ minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz }); }

  _lights() {
    this.scene.add(new THREE.AmbientLight(0x23262a, 0.55));
    this.scene.add(new THREE.HemisphereLight(0x2a2e2a, 0x070806, 0.3));
    // luminária fluorescente (tubo) piscando no teto
    const tube = box(2.4, 0.12, 0.34, new THREE.MeshBasicMaterial({ color: 0xcfeede, fog: true }));
    tube.position.set(0, this.H - 0.08, -0.4); this.scene.add(tube);
    const fix = box(2.7, 0.16, 0.5, mat(this._rep(this.tex.rust, 1, 1), 0x3a3d40));
    fix.position.set(0, this.H - 0.02, -0.4); this.scene.add(fix);
    this.ceilLight = new THREE.PointLight(0xbfe6d2, 1.3, 13, 1.0);
    this.ceilLight.position.set(0, this.H - 0.3, -0.4); this.scene.add(this.ceilLight);
    this.ceilTube = tube;
  }

  _shell() {
    const W = this.W, D = this.D, H = this.H, th = 0.3;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(this._rep(this.tex.floor, 5, 5), 0x6b6e64, 0x000000, THREE.DoubleSide));
    floor.rotation.x = -Math.PI / 2; this.scene.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(this._rep(this.tex.tile, 4, 4), 0x2f312b, 0x000000, THREE.DoubleSide));
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H; this.scene.add(ceil);

    const wallMat = mat(this._rep(this.tex.tile, 4, 2), 0x70746a);
    const addWall = (cx, cz, w, d) => { const m = box(w, H, d, wallMat); m.position.set(cx, H / 2, cz); this.scene.add(m); this._addCollider(cx, cz, w / 2, d / 2); };
    addWall(0, -D / 2, W, th);   // norte (vasos)
    addWall(0, D / 2, W, th);    // sul (porta)
    addWall(-W / 2, 0, th, D);   // oeste
    addWall(W / 2, 0, th, D);    // leste (pias)

    // rodapé escuro encardido nas 4 paredes
    const base = mat(this._rep(this.tex.tile, 6, 1), 0x33352f);
    for (const [cx, cz, w, d] of [[0, -D / 2 + 0.02, W, 0.06], [0, D / 2 - 0.02, W, 0.06], [-W / 2 + 0.02, 0, 0.06, D], [W / 2 - 0.02, 0, 0.06, D]]) {
      const r = box(w, 0.5, d, base); r.position.set(cx, 0.25, cz); this.scene.add(r);
    }
  }

  _toilet() {
    const por = mat(this._rep(this.tex.porcelain, 1, 1), 0xb4ae9c);
    const x = this.toiletPos.x, z = this.toiletPos.z;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.52, 10), por); ped.position.set(x, 0.26, z); this.scene.add(ped);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.24, 0.34, 12), por); bowl.position.set(x, 0.64, z); this.scene.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 14), por); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.8, z); this.scene.add(rim);
    // água podre escura dentro da bacia
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.25, 14), new THREE.MeshBasicMaterial({ color: 0x202a1c, fog: true, side: THREE.DoubleSide }));
    water.rotation.x = -Math.PI / 2; water.position.set(x, 0.74, z); this.scene.add(water);
    // caixa de descarga contra a parede
    const tank = box(0.62, 0.62, 0.24, por); tank.position.set(x, 1.07, z - 0.32); this.scene.add(tank);
    const lid = box(0.66, 0.08, 0.32, por); lid.position.set(x, 1.42, z - 0.3); this.scene.add(lid);
    this._addCollider(x, z, 0.4, 0.5);
  }

  _stall() {
    // divisória enferrujada ao lado do vaso (boxe do banheiro)
    const part = box(0.06, 1.9, 1.7, mat(this._rep(this.tex.rust, 2, 2), 0x4a4e52));
    part.position.set(-1.3, 0.95, -3.5); this.scene.add(part);
    this._addCollider(-1.3, -3.5, 0.1, 0.85);
  }

  _sinks() {
    const por = mat(this._rep(this.tex.porcelain, 1, 1), 0xa9a496);
    const metal = mat(this._rep(this.tex.rust, 2, 2), 0x55585c);
    const x = 3.55;
    const counter = box(0.6, 0.1, 3.0, mat(this._rep(this.tex.tile, 1, 3), 0x4a4d47));
    counter.position.set(x, 0.86, 0); this.scene.add(counter);
    this._addCollider(x, 0, 0.45, 1.55);
    for (const zz of [-0.8, 0.8]) {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.18, 10), por); basin.position.set(x - 0.05, 0.9, zz); this.scene.add(basin);
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), metal); tap.position.set(x + 0.12, 1.02, zz); this.scene.add(tap);
    }
    // espelho rachado (manchado) + moldura
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ color: 0x1e242a, fog: true, side: THREE.DoubleSide }));
    mirror.position.set(x - 0.33, 1.75, 0); mirror.rotation.y = -Math.PI / 2; this.scene.add(mirror);
    const fr = box(0.06, 1.12, 2.34, metal); fr.position.set(x - 0.31, 1.75, 0); this.scene.add(fr);
    // cano gotejante na parede + escorrido úmido
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), metal); pipe.position.set(x - 0.2, 1.5, 1.4); this.scene.add(pipe);
  }

  _door() {
    const z = this.D / 2 - 0.16;                  // face interna do muro sul
    const metal = mat(this._rep(this.tex.rust, 2, 3), 0x4d5156);
    const frame = mat(this._rep(this.tex.rust, 1, 1), 0x35383d);
    const leaf = box(1.5, 2.6, 0.12, metal); leaf.position.set(0, 1.3, z - 0.06); this.scene.add(leaf);
    const fl = box(0.22, 2.9, 0.3, frame); fl.position.set(-0.86, 1.45, z); this.scene.add(fl);
    const fr = fl.clone(); fr.position.x = 0.86; this.scene.add(fr);
    const lint = box(2.0, 0.24, 0.3, frame); lint.position.set(0, 2.78, z); this.scene.add(lint);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), frame); handle.rotation.z = Math.PI / 2; handle.position.set(0.55, 1.25, z - 0.13); this.scene.add(handle);
    // placa de SAÍDA brilhante (guia o jogador de volta)
    const sign = box(0.9, 0.22, 0.04, new THREE.MeshBasicMaterial({ color: 0x7be08a, fog: true }));
    sign.position.set(0, 2.55, z - 0.18); this.scene.add(sign);
    this.exitLight = new THREE.PointLight(0x66cc77, 0.6, 5, 1.0); this.exitLight.position.set(0, 2.4, z - 0.5); this.scene.add(this.exitLight);
  }

  _grime() {
    const r = rng(4711);
    // poças no chão
    const wet = new THREE.MeshBasicMaterial({ color: 0x223038, transparent: true, opacity: 0.6, fog: true, depthWrite: false });
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.4 + r() * 0.8, 10), wet); p.rotation.x = -Math.PI / 2; p.position.set((r() - 0.5) * 6, 0.02, (r() - 0.5) * 7); this.scene.add(p); }
    // manchas de sangue seco
    const blood = new THREE.MeshBasicMaterial({ color: 0x3a0707, transparent: true, opacity: 0.85, fog: true, depthWrite: false });
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.8 + r(), 0.8 + r()), blood); b.rotation.x = -Math.PI / 2; b.rotation.z = r() * 6; b.position.set((r() - 0.5) * 6, 0.03, (r() - 0.5) * 7); this.scene.add(b); }
    // lixo espalhado (caixas escuras)
    const trash = mat(this._rep(this.tex.rust, 1, 1), 0x3c3a30);
    for (let i = 0; i < 7; i++) { const s = 0.14 + r() * 0.22; const t = box(s, s * 0.7, s * (1 + r()), trash); t.position.set((r() - 0.5) * 6.5, s * 0.35, (r() - 0.5) * 7.5); t.rotation.y = r() * 6; this.scene.add(t); }
  }

  // chave do PORTÃO GERAL: dentro do vaso, girando com brilho frio
  _buildKey() {
    this.keyPos = new THREE.Vector3(this.toiletPos.x, 0.86, this.toiletPos.z);
    const g = new THREE.Group();
    const steel = applyVertexSnap(new THREE.MeshLambertMaterial({ map: this._rep(this.tex.rust, 1, 1), color: 0x8893a0, emissive: 0x121820, fog: true }));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 14), steel));
    const shaft = box(0.06, 0.46, 0.06, steel); shaft.position.set(0, -0.32, 0); g.add(shaft);
    for (const yy of [-0.46, -0.54]) { const tooth = box(0.16, 0.06, 0.06, steel); tooth.position.set(0.08, yy, 0); g.add(tooth); }
    g.position.copy(this.keyPos); g.rotation.x = Math.PI / 2;
    const light = new THREE.PointLight(0x9fd0ff, 1.3, 6, 1.0); light.position.copy(this.keyPos); this.scene.add(light);
    this.scene.add(g);
    this.key = { group: g, light, taken: false };
  }

  // ---------- runtime ----------
  update(dt, t) {
    this.t = t;
    // flicker da luz fluorescente
    const f = Math.sin(t * 22) * 0.5 + Math.sin(t * 7.7 + 1.3);
    const flick = f > 1.4 ? 0.2 : (Math.random() < 0.02 ? 0.32 : 1.0);
    this.ceilLight.intensity = 1.3 * flick;
    this.ceilTube.material.color.setRGB(0.81 * flick + 0.05, 0.93 * flick + 0.05, 0.86 * flick + 0.05);
    if (this.key && !this.key.taken) {
      this.key.group.rotation.z += dt * 1.6;
      this.key.light.intensity = 1.0 + Math.sin(t * 3) * 0.5;
    }
  }

  atKey(p) {
    if (!this.key || this.key.taken) return false;
    const dx = this.keyPos.x - p.x, dz = this.keyPos.z - p.z;
    return dx * dx + dz * dz < 2.0;
  }
  takeKey() {
    if (!this.key) return;
    this.key.taken = true; this.key.group.visible = false;
    this.scene.remove(this.key.light);
  }
  atExit(p) {
    const dx = this.exitPos.x - p.x, dz = this.exitPos.z - p.z;
    return dx * dx + dz * dz < 1.1;
  }
}
