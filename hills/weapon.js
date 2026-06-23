// weapon.js — espingarda calibre 12 (pump) em primeira pessoa. Viewmodel low-poly
// PSX preso à câmera. IMPACTO: clarão que explode uma luz na cena, coice forte que
// joga o cano pra cima, fumaça que sai depois do tiro. Materiais com fog:false ->
// a arma não some na névoa; renderiza no MESMO passe PSX do jogo.
import * as THREE from 'three';

function flat(color, emissive = 0x000000) {
  return new THREE.MeshLambertMaterial({ color, emissive, fog: false });
}

// textura macia de fumaça (gradiente radial)
function smokeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(190,190,190,0.9)');
  grd.addColorStop(0.5, 'rgba(140,140,140,0.4)');
  grd.addColorStop(1, 'rgba(120,120,120,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

export class Shotgun {
  constructor(camera) {
    this.cam = camera;
    this.ammo = 16;
    this.maxAmmo = 80;
    this.fireRate = 0.55;     // pump rápido (frenético)
    this.range = 27;
    this.cooldown = 0;
    this.recoil = 0;          // 0..1
    this.flash = 0;           // 0..1
    this.bob = 0;
    this.kick = 0;            // impulso p/ o main sacudir a tela (consumido por consumeKick)
    this._build();
  }

  _build() {
    const g = new THREE.Group();
    const metal = flat(0x2a2c30, 0x16181c);
    const dark = flat(0x141518, 0x0c0d10);
    const wood = flat(0x4a2f18, 0x281808);
    const brass = flat(0x8a6a2a, 0x342812);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10), metal);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -0.55); g.add(barrel);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.25, 8), dark);
    tube.rotation.x = Math.PI / 2; tube.position.set(0, -0.06, -0.45); g.add(tube);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), dark);
    muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.04, -1.32); g.add(muzzle);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.42), metal); receiver.position.set(0, -0.02, 0.12); g.add(receiver);
    const ejector = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), brass); ejector.position.set(0.09, 0, 0.08); g.add(ejector);

    this.pump = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.3), wood); this.pump.position.set(0, -0.08, -0.4); g.add(this.pump);
    this._pumpRest = -0.4;

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.5), wood); stock.position.set(0, -0.06, 0.5); stock.rotation.x = 0.12; g.add(stock);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.12), wood); grip.position.set(0, -0.18, 0.28); grip.rotation.x = -0.4; g.add(grip);

    // clarão da boca (plano aditivo grande) + LUZ que explode na cena
    this.flashMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.flashMesh.position.set(0, 0.04, -1.5); this.flashMesh.visible = false; g.add(this.flashMesh);
    // segundo plano de clarão (estrela/cruz) p/ mais "boom"
    this.flashStar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.flashStar.position.set(0, 0.04, -1.52); this.flashStar.visible = false; g.add(this.flashStar);
    this.flashLight = new THREE.PointLight(0xffcaa0, 0, 22, 1.0); this.flashLight.position.set(0, 0.1, -1.6); g.add(this.flashLight);

    // fumaça (pool de planos reaproveitados; cada um com material próprio p/ fade independente)
    const stex = smokeTex();
    this.smoke = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: stex, transparent: true, opacity: 0, depthWrite: false, color: 0x8c8c8c, fog: false }));
      m.visible = false; g.add(m);
      this.smoke.push({ mesh: m, life: 0, max: 1, vx: 0, vy: 0, vz: 0 });
    }
    this._smokeI = 0;

    g.position.set(0.34, -0.46, -0.9);
    g.rotation.set(0.02, 0.04, 0);
    this.group = g; this._rest = g.position.clone();
    this.cam.add(g);
  }

  addAmmo(n) { this.ammo = Math.min(this.maxAmmo, this.ammo + n); }
  get empty() { return this.ammo <= 0; }
  // o main lê isto p/ tremer a tela; zera ao consumir
  consumeKick() { const k = this.kick; this.kick = 0; return k; }

  _emitSmoke() {
    for (let i = 0; i < 4; i++) {
      const p = this.smoke[this._smokeI]; this._smokeI = (this._smokeI + 1) % this.smoke.length;
      p.mesh.visible = true;
      p.mesh.position.set((Math.random() - 0.5) * 0.12, 0.04 + (Math.random() - 0.5) * 0.1, -1.45);
      p.mesh.scale.setScalar(0.3 + Math.random() * 0.2);
      p.mesh.rotation.z = Math.random() * 6.28;
      p.max = 0.5 + Math.random() * 0.4; p.life = p.max;
      p.vx = (Math.random() - 0.5) * 0.5; p.vy = 0.5 + Math.random() * 0.5; p.vz = 0.4 + Math.random() * 0.4;  // sobe e vem em direção à câmera
    }
  }

  // wantFire = gatilho segurado (auto a cada pump). retorna true SÓ no frame do tiro.
  update(dt, wantFire, moving) {
    let fired = false;
    if (this.cooldown > 0) this.cooldown -= dt;

    if (wantFire && this.cooldown <= 0 && this.ammo > 0) {
      fired = true; this.ammo--; this.cooldown = this.fireRate;
      this.recoil = 1; this.flash = 1; this.kick = 1; this._emitSmoke();
    }

    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.flash = Math.max(0, this.flash - dt * 16);

    // bombear
    let pumpOff = 0;
    if (this.cooldown > 0) { const prog = 1 - this.cooldown / this.fireRate; if (prog > 0.18 && prog < 0.7) pumpOff = Math.sin((prog - 0.18) / 0.52 * Math.PI) * 0.16; }
    this.pump.position.z = this._pumpRest + pumpOff;

    // balanço ao andar
    if (moving) this.bob += dt * 9; else this.bob *= 0.9;
    const bobX = Math.cos(this.bob) * 0.012 * (moving ? 1 : 0);
    const bobY = Math.abs(Math.sin(this.bob)) * 0.016 * (moving ? 1 : 0);

    // COICE: sobe + recua, cano levanta forte
    const r = this.recoil;
    this.group.position.set(this._rest.x + bobX, this._rest.y + bobY + r * 0.06, this._rest.z + r * 0.2);
    this.group.rotation.set(0.02 - r * 0.5, 0.04 - r * 0.04, r * 0.05);

    // clarão
    const fv = this.flash;
    this.flashMesh.visible = this.flashStar.visible = fv > 0.06;
    if (fv > 0.06) {
      const s = 0.7 + fv * 1.4;
      this.flashMesh.scale.set(s, s, s); this.flashMesh.material.opacity = fv; this.flashMesh.rotation.z = Math.random() * 6.28;
      this.flashStar.scale.set(0.6 + fv, 0.6 + fv * 1.5, 1); this.flashStar.material.opacity = fv * 0.9; this.flashStar.rotation.z = Math.random() * 6.28;
    }
    this.flashLight.intensity = fv * 9;   // explode uma luz na cena

    // fumaça
    for (const p of this.smoke) {
      if (p.life <= 0) { if (p.mesh.visible) p.mesh.visible = false; continue; }
      p.life -= dt;
      const k = p.life / p.max;
      p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(0.3 + (1 - k) * 1.1);          // cresce ao subir
      p.mesh.material.opacity = k * 0.5;
      p.mesh.rotation.z += dt * 0.6;
    }

    return fired;
  }
}
