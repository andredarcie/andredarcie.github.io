// Open world: procedural terrain, village, word wall, sky, day/night, snow.

import * as THREE from 'three';
import { clamp, lerp, smoothstep, fbm, noise2, rand, randRange } from 'utils';

export const WORLD_LIMIT = 660;
export const WATER_Y = -4;
export const WALL_POS = { x: 420, z: -460 };
const DAY_LEN = 300; // seconds per full day

export function getHeight(x, z) {
  const base = fbm(x * 0.0042 + 10, z * 0.0042 + 10, 4);
  let h = (base - 0.38) * 95;
  const detail = fbm(x * 0.03 + 77, z * 0.03 + 77, 2);
  h += (detail - 0.5) * 5;
  // mountains rising toward the word wall (north-east)
  const dw = Math.hypot(x - WALL_POS.x, z - WALL_POS.z);
  h += Math.pow(Math.max(0, 1 - dw / 520), 1.7) * 75;
  // ring of border mountains
  const dc = Math.hypot(x, z);
  h += smoothstep(540, 690, dc) * 130;
  // flatten the village
  h = lerp(h, 2.5, smoothstep(150, 45, dc));
  // wall plateau
  h = lerp(h, 58, smoothstep(80, 30, dw));
  return h;
}

const _sunDir = new THREE.Vector3();
const _sky = new THREE.Color();
const _sunCol = new THREE.Color();
const C_DAY = new THREE.Color(0x9fbcd4);
const C_DUSK = new THREE.Color(0xc98a5a);
const C_NIGHT = new THREE.Color(0x0c1420);
const C_SUN_DAY = new THREE.Color(0xfff1da);
const C_SUN_DUSK = new THREE.Color(0xff9a55);
const C_MOON = new THREE.Color(0x93a7c8);

export class World {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.t = 0;
    this.dayTime = 0.06; // start just after sunrise
    this.solids = [];
    this.interactables = [];
    this.flames = [];
    this.wallLit = false;

    this.bg = new THREE.Color(0x9fbcd4);
    this.scene.background = this.bg;
    this.scene.fog = new THREE.Fog(0x9fbcd4, 70, 850);

    this.hemi = new THREE.HemisphereLight(0xbcd3e6, 0x5b6b52, 0.8);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1da, 1.5);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.buildTerrain();
    this.buildWater();
    this.buildTrees();
    this.buildRocks();
    this.buildVillage();
    this.buildWallSite();
    this.buildChests();
    this.buildSky();
    this.buildSnow();
  }

  buildTerrain() {
    const SIZE = 1400, SEG = 170;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cGrass = new THREE.Color(0x4f6b45);
    const cGrass2 = new THREE.Color(0x3d5939);
    const cRock = new THREE.Color(0x67686b);
    const cSnow = new THREE.Color(0xe8edf2);
    const cSand = new THREE.Color(0x8b7f5f);
    const tmp = new THREE.Color();
    const e = 2.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = getHeight(x, z);
      pos.setY(i, h);
      const dhx = getHeight(x + e, z) - getHeight(x - e, z);
      const dhz = getHeight(x, z + e) - getHeight(x, z - e);
      const slope = Math.hypot(dhx, dhz) / (2 * e);
      const v = noise2(x * 0.05 + 3, z * 0.05 + 3);
      tmp.copy(cGrass).lerp(cGrass2, v);
      tmp.lerp(cSand, smoothstep(WATER_Y + 1.5, WATER_Y - 2, h));
      tmp.lerp(cRock, smoothstep(0.55, 0.95, slope));
      tmp.lerp(cSnow, smoothstep(34, 48, h) * (1 - smoothstep(0.75, 1.1, slope)));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.scene.add(mesh);
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(1400, 1400);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2b4a5e, transparent: true, opacity: 0.82 });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = WATER_Y;
    this.scene.add(this.water);
  }

  slopeAt(x, z) {
    const e = 2.5;
    const dhx = getHeight(x + e, z) - getHeight(x - e, z);
    const dhz = getHeight(x, z + e) - getHeight(x, z - e);
    return Math.hypot(dhx, dhz) / (2 * e);
  }

  buildTrees() {
    const MAX = 520;
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.48, 3, 5);
    const folGeo = new THREE.ConeGeometry(2.3, 7, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3524 });
    const folMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX);
    const fols = new THREE.InstancedMesh(folGeo, folMat, MAX);
    const dummy = new THREE.Object3D();
    const green = new THREE.Color(0x2e5d34);
    const snowy = new THREE.Color(0xdfe7ea);
    const col = new THREE.Color();
    let n = 0;
    for (let tries = 0; tries < 2600 && n < MAX; tries++) {
      const x = randRange(-650, 650), z = randRange(-650, 650);
      if (Math.hypot(x, z) < 55) continue;
      if (Math.hypot(x - WALL_POS.x, z - WALL_POS.z) < 40) continue;
      const h = getHeight(x, z);
      if (h < WATER_Y + 1.5 || h > 52) continue;
      if (this.slopeAt(x, z) > 0.5) continue;
      const s = randRange(0.75, 1.35);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.setScalar(s);
      dummy.position.set(x, h + 1.5 * s, z);
      dummy.updateMatrix();
      trunks.setMatrixAt(n, dummy.matrix);
      dummy.position.set(x, h + 5.4 * s, z);
      dummy.updateMatrix();
      fols.setMatrixAt(n, dummy.matrix);
      col.copy(green).lerp(snowy, smoothstep(28, 44, h));
      fols.setColorAt(n, col);
      n++;
    }
    trunks.count = n;
    fols.count = n;
    if (fols.instanceColor) fols.instanceColor.needsUpdate = true;
    this.scene.add(trunks);
    this.scene.add(fols);
  }

  buildRocks() {
    const MAX = 140;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0x6a6f75 });
    const rocks = new THREE.InstancedMesh(geo, mat, MAX);
    const dummy = new THREE.Object3D();
    let n = 0;
    for (let tries = 0; tries < 500 && n < MAX; tries++) {
      const x = randRange(-650, 650), z = randRange(-650, 650);
      if (Math.hypot(x, z) < 40) continue;
      const h = getHeight(x, z);
      if (h < WATER_Y + 0.5) continue;
      const s = randRange(0.8, 3.5);
      dummy.rotation.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6);
      dummy.scale.set(s, s * 0.7, s);
      dummy.position.set(x, h + s * 0.25, z);
      dummy.updateMatrix();
      rocks.setMatrixAt(n, dummy.matrix);
      n++;
    }
    rocks.count = n;
    this.scene.add(rocks);
  }

  buildHouse(x, z, ry, s) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3.2, 5),
      new THREE.MeshLambertMaterial({ color: 0x6b5138 })
    );
    base.position.y = 1.6;
    g.add(base);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 2.8, 4),
      new THREE.MeshLambertMaterial({ color: 0x3f342a })
    );
    roof.position.y = 4.6;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.9, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x2c2119 })
    );
    door.position.set(0, 0.95, 2.55);
    g.add(door);
    g.scale.setScalar(s);
    g.position.set(x, getHeight(x, z), z);
    g.rotation.y = ry;
    this.scene.add(g);
    this.solids.push({ x, z, r: 4.6 * s });
  }

  buildTorch(x, z) {
    const h = getHeight(x, z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 2.2, 5),
      new THREE.MeshLambertMaterial({ color: 0x3a2c1e })
    );
    pole.position.set(x, h + 1.1, z);
    this.scene.add(pole);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffa03a })
    );
    flame.position.set(x, h + 2.35, z);
    flame.userData.phase = rand() * 10;
    this.scene.add(flame);
    this.flames.push(flame);
  }

  buildVillage() {
    const houses = [
      { x: -26, z: -8, ry: 0.4, s: 1 },
      { x: 24, z: -16, ry: -0.5, s: 1.1 },
      { x: -18, z: 26, ry: 2.6, s: 0.95 },
      { x: 26, z: 22, ry: 3.5, s: 1 },
      { x: 2, z: -38, ry: 0, s: 1.55 }, // the elder's longhouse
    ];
    for (const hd of houses) this.buildHouse(hd.x, hd.z, hd.ry, hd.s);
    this.buildTorch(-8, 6);
    this.buildTorch(8, 6);
    this.buildTorch(-8, -22);
    this.buildTorch(8, -22);

    // Elder Yngvar
    const ex = 5, ez = -20;
    const eh = getHeight(ex, ez);
    const elder = new THREE.Group();
    const robe = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.8, 8),
      new THREE.MeshLambertMaterial({ color: 0x5a4a33 })
    );
    robe.position.y = 0.9;
    elder.add(robe);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 7),
      new THREE.MeshLambertMaterial({ color: 0xc9a284 })
    );
    head.position.y = 2.0;
    elder.add(head);
    const beard = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.55, 6),
      new THREE.MeshLambertMaterial({ color: 0xcfcfcf })
    );
    beard.rotation.x = Math.PI;
    beard.position.set(0, 1.72, 0.18);
    elder.add(beard);
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.3, 5),
      new THREE.MeshLambertMaterial({ color: 0x4a3524 })
    );
    staff.position.set(0.6, 1.15, 0.1);
    elder.add(staff);
    elder.position.set(ex, eh, ez);
    elder.rotation.y = Math.PI; // face the spawn (south)
    this.scene.add(elder);
    this.elder = elder;
    this.elderBaseY = eh;
    this.elderPos = { x: ex, z: ez };
    this.interactables.push({ type: 'npc', name: 'Elder Yngvar', x: ex, z: ez, r: 3.2 });
    this.solids.push({ x: ex, z: ez, r: 0.9 });
  }

  buildWallSite() {
    const wx = WALL_POS.x, wz = WALL_POS.z;
    const base = 58; // plateau height
    // direction pointing away from the village (arc sits behind the interact point)
    const dv = Math.hypot(wx, wz);
    const outX = wx / dv, outZ = wz / dv;
    const baseAng = Math.atan2(outX, outZ);
    const slabMat = new THREE.MeshLambertMaterial({ color: 0x55565c });
    for (let i = -3; i <= 3; i++) {
      const ang = baseAng + i * 0.28;
      const sx = wx + Math.sin(ang) * 6.5;
      const sz = wz + Math.cos(ang) * 6.5;
      const sh = 5.5 - Math.abs(i) * 0.7;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(2.0, sh, 0.7), slabMat);
      slab.position.set(sx, base + sh / 2 - 0.3, sz);
      slab.rotation.y = ang;
      this.scene.add(slab);
      this.solids.push({ x: sx, z: sz, r: 1.4 });
    }
    // glowing runes on the central slabs
    this.runeMat = new THREE.MeshBasicMaterial({
      color: 0x7fdfff, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
    });
    const runes = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), this.runeMat);
    runes.position.set(wx + outX * 6.0, base + 2.7, wz + outZ * 6.0);
    runes.rotation.y = baseAng + Math.PI;
    this.scene.add(runes);
    // braziers
    const perpX = -outZ, perpZ = outX;
    this.buildTorch(wx + perpX * 5, wz + perpZ * 5);
    this.buildTorch(wx - perpX * 5, wz - perpZ * 5);
    // ruined arch on the approach
    const archMat = new THREE.MeshLambertMaterial({ color: 0x5c5d63 });
    for (const side of [-1, 1]) {
      const px = wx - outX * 11 + perpX * side * 2.6;
      const pz = wz - outZ * 11 + perpZ * side * 2.6;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 1.2), archMat);
      pillar.position.set(px, base + 3.2, pz);
      pillar.rotation.y = baseAng;
      this.scene.add(pillar);
      this.solids.push({ x: px, z: pz, r: 1.1 });
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 1.3), archMat);
    lintel.position.set(wx - outX * 11, base + 7.1, wz - outZ * 11);
    lintel.rotation.y = baseAng;
    this.scene.add(lintel);

    this.interactables.push({ type: 'wall', name: 'Word Wall', x: wx, z: wz, r: 4.5, used: false });
  }

  buildChest(x, z, loot) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.8, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2a })
    );
    base.position.y = 0.4;
    g.add(base);
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.35, 0.9),
      new THREE.MeshLambertMaterial({ color: 0x7d5832 })
    );
    lid.position.y = 0.98;
    g.add(lid);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.12, 0.94),
      new THREE.MeshLambertMaterial({ color: 0x9a8a55 })
    );
    band.position.y = 0.62;
    g.add(band);
    g.position.set(x, getHeight(x, z), z);
    g.rotation.y = rand() * Math.PI * 2;
    this.scene.add(g);
    this.interactables.push({ type: 'chest', name: 'Chest', x, z, r: 2.6, opened: false, loot, lid });
  }

  buildChests() {
    this.buildChest(10, -47, { gold: 25 });
    // wilderness chest: first candidate spot that is on dry land
    const spots = [[-260, 140], [-180, 90], [-300, 220]];
    for (const [x, z] of spots) {
      if (getHeight(x, z) > WATER_Y + 1) {
        this.buildChest(x, z, { gold: 40, heal: true });
        break;
      }
    }
    const dv = Math.hypot(WALL_POS.x, WALL_POS.z);
    const perpX = WALL_POS.z / dv, perpZ = -WALL_POS.x / dv;
    this.buildChest(WALL_POS.x + perpX * 5.5, WALL_POS.z + perpZ * 5.5, { gold: 60, blade: true });
  }

  buildSky() {
    this.skyAnchor = new THREE.Group();
    this.scene.add(this.skyAnchor);
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(20, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe6a8, fog: false })
    );
    this.skyAnchor.add(this.sunMesh);
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(11, 10, 9),
      new THREE.MeshBasicMaterial({ color: 0xdfe6ef, fog: false })
    );
    this.skyAnchor.add(this.moonMesh);
    const starPos = new Float32Array(350 * 3);
    for (let i = 0; i < 350; i++) {
      const a = rand() * Math.PI * 2;
      const y = 0.06 + rand() * 0.94;
      const r = Math.sqrt(1 - y * y);
      starPos[i * 3] = Math.cos(a) * r * 780;
      starPos[i * 3 + 1] = y * 780;
      starPos[i * 3 + 2] = Math.sin(a) * r * 780;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: 0xcfd8ff, size: 2.2, sizeAttenuation: false,
      transparent: true, opacity: 0, fog: false, depthWrite: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.skyAnchor.add(this.stars);
  }

  buildSnow() {
    const N = 400;
    this.snowLocal = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.snowLocal[i * 3] = randRange(-30, 30);
      this.snowLocal[i * 3 + 1] = randRange(0, 36);
      this.snowLocal[i * 3 + 2] = randRange(-30, 30);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.snowLocal, 3));
    this.snowMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.18, transparent: true, opacity: 0, depthWrite: false,
    });
    this.snow = new THREE.Points(geo, this.snowMat);
    this.scene.add(this.snow);
  }

  setWallLit() {
    this.wallLit = true;
  }

  openChest(it) {
    it.lid.rotation.x = -1.1;
    it.lid.position.y += 0.1;
    it.lid.position.z -= 0.25;
  }

  update(dt, playerPos) {
    this.t += dt;
    this.dayTime = (this.dayTime + dt / DAY_LEN) % 1;
    const a = this.dayTime * Math.PI * 2;
    const elev = Math.sin(a);
    _sunDir.set(Math.cos(a), elev, 0.35).normalize();

    // sky and fog color
    const f = smoothstep(-0.06, 0.28, elev);
    const duskAmt = clamp(1 - Math.abs(elev) / 0.22, 0, 1) * 0.72;
    _sky.copy(C_NIGHT).lerp(C_DAY, f).lerp(C_DUSK, duskAmt);
    this.bg.copy(_sky);
    this.scene.fog.color.copy(_sky);

    // sun / moon light
    if (elev > -0.08) {
      _sunCol.copy(C_SUN_DUSK).lerp(C_SUN_DAY, smoothstep(0.05, 0.35, elev));
      this.sun.color.copy(_sunCol);
      this.sun.intensity = 0.12 + smoothstep(-0.05, 0.3, elev) * 1.7;
      this.sun.position.set(
        playerPos.x + _sunDir.x * 400,
        _sunDir.y * 400,
        playerPos.z + _sunDir.z * 400
      );
    } else {
      this.sun.color.copy(C_MOON);
      this.sun.intensity = 0.14;
      this.sun.position.set(
        playerPos.x - _sunDir.x * 400,
        -_sunDir.y * 400,
        playerPos.z - _sunDir.z * 400
      );
    }
    this.sun.target.position.set(playerPos.x, 0, playerPos.z);
    this.hemi.intensity = 0.22 + f * 0.7;

    // sky bodies follow the player
    this.skyAnchor.position.set(playerPos.x, 0, playerPos.z);
    this.sunMesh.position.copy(_sunDir).multiplyScalar(760);
    this.sunMesh.visible = elev > -0.12;
    this.moonMesh.position.copy(_sunDir).multiplyScalar(-760);
    this.moonMesh.visible = elev < 0.1;
    this.starMat.opacity = smoothstep(0.05, -0.15, elev) * 0.9;

    // water shimmer
    this.water.position.y = WATER_Y + Math.sin(this.t * 0.5) * 0.08;

    // torch flames
    for (const fl of this.flames) {
      fl.scale.setScalar(1 + 0.22 * Math.sin(this.t * 13 + fl.userData.phase));
    }

    // elder idle
    if (this.elder) this.elder.position.y = this.elderBaseY + Math.sin(this.t * 1.2) * 0.03;

    // runes pulse once lit
    if (this.wallLit) {
      this.runeMat.opacity = 0.55 + Math.sin(this.t * 2.2) * 0.32;
    }

    // snow near the peaks
    const nearWall = Math.hypot(playerPos.x - WALL_POS.x, playerPos.z - WALL_POS.z) < 230;
    const inSnow = nearWall || getHeight(playerPos.x, playerPos.z) > 34;
    this.snowMat.opacity = lerp(this.snowMat.opacity, inSnow ? 0.85 : 0, Math.min(1, dt * 1.5));
    if (this.snowMat.opacity > 0.02) {
      const posAttr = this.snow.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dt * 4.5;
        arr[i] += Math.sin(this.t * 0.8 + i) * dt * 0.6;
        if (arr[i + 1] < 0) arr[i + 1] += 36;
        if (arr[i] > 30) arr[i] -= 60;
        if (arr[i] < -30) arr[i] += 60;
      }
      posAttr.needsUpdate = true;
      this.snow.position.set(playerPos.x, playerPos.y - 4, playerPos.z);
    }
  }
}
