import * as THREE from 'three';

// =====================================================================
// Solar Explorer — walking sim em primeira pessoa pelo sistema solar.
// Os rochosos são esferas caminháveis (gravidade radial, estilo Mario
// Galaxy); os gasosos não têm chão — a nave mergulha nas nuvens. Voo
// sempre manual. Escala totalmente comprimida, nada é realista.
// =====================================================================

const V3 = THREE.Vector3, Q = THREE.Quaternion;
// celular/tablet: menos polígonos, menos oitavas de ruído nos shaders, resolução adaptativa
const LOWQ = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const L = (t, a, b) => a + t * (b - a);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function randDir(r, out = new V3()) {
  const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  return out.set(s * Math.cos(a), z, s * Math.sin(a));
}

// ---------- ruído de Perlin 3D (improved) ----------
function makeNoise(seed) {
  const r = rng(seed), perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const grad = (h, x, y, z) => {
    h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  return (x, y, z) => {
    let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10), w = z * z * z * (z * (z * 6 - 15) + 10);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return L(w,
      L(v, L(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), L(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      L(v, L(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), L(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
  };
}
function fbm(n, x, y, z, oct) {
  let a = .5, f = 1, s = 0, norm = 0;
  for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f, z * f); norm += a; a *= .5; f *= 2.03; }
  return s / norm;
}
function ridged(n, x, y, z, oct) {
  let a = .5, f = 1, s = 0, norm = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(n(x * f, y * f, z * f)); s += a * v * v; norm += a; a *= .5; f *= 2.1; }
  return s / norm;
}

// crateras: tigela + borda elevada, em coordenadas da esfera unitária
function makeCraters(seed, count, rMin, rMax, depth) {
  const r = rng(seed), C = [], d = new V3();
  for (let i = 0; i < count; i++) {
    randDir(r, d);
    const rad = rMin + (rMax - rMin) * Math.pow(r(), 2.5);
    C.push(d.x, d.y, d.z, rad, depth * (0.4 + 0.6 * rad / rMax));
  }
  return (x, y, z) => {
    let h = 0;
    for (let i = 0; i < C.length; i += 5) {
      const dx = x - C[i], dy = y - C[i + 1], dz = z - C[i + 2], rad = C[i + 3];
      const d2 = dx * dx + dy * dy + dz * dz, lim = rad * 1.6;
      if (d2 > lim * lim) continue;
      const t = Math.sqrt(d2) / rad;
      h += C[i + 4] * ((t < 1 ? t * t - 1 : 0) + .35 * Math.exp(-(((t - 1) * 3.5) ** 2)));
    }
    return h;
  };
}

// ---------- cores (tudo em espaço linear) ----------
const lin = v => Math.pow(v / 255, 2.2);
const C = hex => [lin(hex >> 16 & 255), lin(hex >> 8 & 255), lin(hex & 255)];
function mixC(a, b, t, o) {
  t = clamp(t, 0, 1);
  o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t;
  return o;
}
const setC = (a, o) => { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; };
const chord2 = (x, y, z, d) => (x - d.x) ** 2 + (y - d.y) ** 2 + (z - d.z) ** 2;

// valor "cru" do último height() — color() e os filtros de props leem isso
let RAW = 0;

// =====================================================================
// DEFINIÇÃO DOS CORPOS
// Rochosos: terreno procedural (height/color) com geografia real
// aproximada. Gasosos: sem chão nenhum — esfera de nuvens em shader
// animado (faixas de latitude reais), a nave mergulha na atmosfera.
// =====================================================================
const D2R = Math.PI / 180;
// direção local a partir de latitude/longitude em graus (y = norte)
const ll = (lat, lon) => new V3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R));
const latOf = y => Math.asin(clamp(y, -1, 1)) / D2R;
const lonOf = (x, z) => Math.atan2(z, x) / D2R;
const blob = (x, y, z, c, r) => Math.exp(-chord2(x, y, z, c) / (r * r));
const ring = (x, y, z, c, r, w) => Math.exp(-(((Math.sqrt(chord2(x, y, z, c)) - r) / w) ** 2));

// cratera jovem com raios claros (Tycho, Copernicus, Kuiper...): brilho extra 0..1
function makeRayCrater(center, r, seed) {
  const n = makeNoise(seed), c = center.clone().normalize();
  const e1 = new V3().crossVectors(c, Math.abs(c.y) < .9 ? new V3(0, 1, 0) : new V3(1, 0, 0)).normalize();
  const e2 = new V3().crossVectors(c, e1);
  return (x, y, z) => {
    const d = Math.sqrt(chord2(x, y, z, c));
    if (d > r * 14) return 0;
    if (d < r * 1.1) return .55;
    const a = Math.atan2(x * e2.x + y * e2.y + z * e2.z, x * e1.x + y * e1.y + z * e1.z);
    const ray = Math.max(0, n(Math.cos(a) * 9, Math.sin(a) * 9, .5) * 2.4 - .4);
    return Math.min(1, ray * (1 - d / (r * 14)) + .55 * Math.exp(-(((d - r) / (r * 1.6)) ** 2)));
  };
}

function makeBodies() {
  const B = [];

  // distâncias: órbita = 2600 · (distância real em UA)^0,8 — comprimido, mas os de fora ficam bem longe como na real
  B.push({ id: 'sun', name: 'Sun', R: 500, star: true, orbit: 0, ang: 0 });

  { // MERCÚRIO — cinza-acastanhado, saturado de crateras, raios claros, bacia Caloris
    const n1 = makeNoise(101), n2 = makeNoise(104), cr = makeCraters(102, 170, .025, .26, 2.6);
    const caloris = ll(30, 160);
    const rays = [makeRayCrater(ll(-11, -31), .035, 105), makeRayCrater(ll(58, 20), .03, 106), makeRayCrater(ll(-40, 120), .028, 107), makeRayCrater(ll(12, -95), .025, 108)];
    const DK = C(0x5b5650), LT = C(0xa29c92), MD = C(0x847e76), RAY = C(0xd4d0c8), CAL = C(0xa09480);
    B.push({ id: 'mercury', name: 'Mercury', R: 40, orbit: 1225, ang: .3, gReal: .38, seed: 1,
      height: (x, y, z) => {
        const r = fbm(n1, x * 2.4, y * 2.4, z * 2.4, 5); RAW = r;
        const cb = blob(x, y, z, caloris, .42);
        return r * 2 + cr(x, y, z) * (1 - .6 * cb) - cb * 2.4 + 1.6 * ring(x, y, z, caloris, .46, .06);
      },
      color: (x, y, z, h, o) => {
        mixC(DK, LT, RAW * 1.4 + .55 + n2(x * 8, y * 8, z * 8) * .3, o); mixC(o, MD, .3, o);
        mixC(o, CAL, blob(x, y, z, caloris, .4) * .55, o);
        let rb = 0; for (const f of rays) rb = Math.max(rb, f(x, y, z));
        return mixC(o, RAY, rb, o);
      },
      jitter: .14, props: [{ kind: 'rock', count: 340, color: 0x857c72 }] });
  }
  { // VÊNUS — basalto escuro, planaltos (Ishtar, Aphrodite), Maxwell Montes e Maat Mons; deck de nuvens opaco
    const n1 = makeNoise(201), n2 = makeNoise(202);
    const ishtar = ll(70, 0), maxwell = ll(65, 3), aph1 = ll(-5, 90), aph2 = ll(-10, 130), maat = ll(.5, 194), sif = ll(22, -8);
    const PL = C(0x4c3d31), FL = C(0x33281f), HI = C(0x7a6650), TS = C(0x8c7a62);
    B.push({ id: 'venus', name: 'Venus', R: 75, orbit: 2000, ang: 2.2, tilt: 3, gReal: .9, seed: 2,
      atmo: 0xfff0c8, atmoScale: 1.17, sky: 0xc08442, sunset: 0x8a4a20,
      clouds: { r: 1.1, kind: 1, color: 0xeadcb2, under: 0xa8692e, cover: 0, opacity: 1, scale: 2.2, speed: .02 },
      fog: { color: 0xb87a3e, density: .018, below: 1.1 },
      height: (x, y, z) => {
        const r = fbm(n1, x * 1.6, y * 1.6, z * 1.6, 5); RAW = r;
        const hi = 2.6 * blob(x, y, z, ishtar, .32) + 2.2 * (blob(x, y, z, aph1, .26) + blob(x, y, z, aph2, .24));
        return r * 2 + hi + 7 * blob(x, y, z, maxwell, .08) + 5 * blob(x, y, z, maat, .09) + 3.5 * blob(x, y, z, sif, .07)
          - 1.8 * blob(x, y, z, maat, .015);
      },
      color: (x, y, z, h, o) => {
        mixC(PL, HI, smooth(1.2, 3.5, h), o);
        mixC(o, FL, smooth(.15, .45, n2(x * 6, y * 6, z * 6)) * (1 - smooth(1, 3, h)), o);
        mixC(o, TS, smooth(.2, .5, n2(x * 16, y * 16, z * 16)) * smooth(2, 4, h) * .6, o);
        return o;
      },
      jitter: .12, props: [{ kind: 'rock', count: 300, color: 0x4a3828 }] });
  }
  { // TERRA — oceanos, biomas por latitude, gelo nos polos, nuvens
    const n1 = makeNoise(301), n2 = makeNoise(302), n3 = makeNoise(303);
    const FLOOR = C(0x1c4a5a), SAND = C(0xd6c596), RAIN = C(0x1d4519), TEMP = C(0x3c6a2c), SAV = C(0x8c7d46),
      DES = C(0xd2aa6c), BOR = C(0x2b472c), TUN = C(0x77735e), ROCK = C(0x6b5e50), SNOW = C(0xf4f6f8);
    const desert = (x, y, z) => { const a = Math.abs(y); return smooth(.18, .3, a) * (1 - smooth(.5, .62, a)) * smooth(-.05, .2, n3(x * 2 + 7, y * 2, z * 2)); };
    // nível do mar calibrado: amostra o relevo e põe o mar no percentil 71 → 71% da superfície é água
    const cont = (x, y, z) => fbm(n1, x * 1.4 + 3.1, y * 1.4, z * 1.4, 5) * 1.8;
    const SEA = (() => {
      const r = rng(3001), d = new V3(), v = [];
      for (let i = 0; i < 6000; i++) { randDir(r, d); v.push(cont(d.x, d.y, d.z)); }
      v.sort((a, b) => a - b);
      return v[Math.floor(v.length * .71)];
    })();
    B.push({ id: 'earth', name: 'Earth', R: 80, orbit: 2600, ang: 4.0, tilt: 23.4, gReal: 1, seed: 3, sea: true,
      atmo: 0x6fa8ff, atmoScale: 1.12, sky: 0x5b9ae8, sunset: 0xff8f50,
      ocean: { color: 0x0a2850 },
      clouds: { r: 1.075, kind: 0, color: 0xffffff, under: 0xc9d1dc, cover: .54, opacity: .95, scale: 2.6, speed: .006 },
      height: (x, y, z) => {
        const c = cont(x, y, z) - SEA; RAW = c;
        if (c <= 0) return Math.max(-6, c * 14) - .3;
        const m = ridged(n2, x * 3.2, y * 3.2, z * 3.2, 4);
        return c * 8 + m * m * m * 6 * smooth(.08, .35, c);
      },
      color: (x, y, z, h, o) => {
        const c = RAW, a = Math.abs(y), j = n3(x * 9, y * 9, z * 9) * .08;
        if (c <= 0) return setC(FLOOR, o);
        if (c < .03) return setC(SAND, o);
        mixC(RAIN, TEMP, smooth(.1, .25, a + j), o);
        mixC(o, SAV, smooth(.12, .2, a + j) * (1 - smooth(.25, .35, a)) * .6, o);
        mixC(o, BOR, smooth(.74, .82, a + j), o);
        mixC(o, TUN, smooth(.86, .92, a + j), o);
        mixC(o, DES, desert(x, y, z), o);
        mixC(o, ROCK, smooth(4.5, 6.5, h), o);
        mixC(o, SNOW, smooth(7.2, 8.5, h), o);
        mixC(o, SNOW, smooth(.9, .95, a + j) + (y < -.86 ? 1 : 0), o);
        return o;
      },
      treeOk: (x, y, z, h, raw) => raw > .05 && h < 4.8 && Math.abs(y) < .88 && desert(x, y, z) < .3,
      jitter: .1, props: [{ kind: 'tree', count: 700 }, { kind: 'rock', count: 160, color: 0x77746e, accept: (x, y, z, h, raw) => raw > .04 }] });
  }
  { // LUA — maria escuros na face visível (sempre virada pra Terra = +X local), Tycho e Copernicus
    const n1 = makeNoise(401), n2 = makeNoise(402), cr = makeCraters(403, 110, .03, .3, 2.4);
    const MARIA = [[33, -16, .32], [28, 17, .19], [8, 31, .22], [17, 59, .13], [-8, 51, .16], [-21, -17, .16], [18, -57, .38], [-24, -39, .1], [-5, 15, .14]]
      .map(([la, lo, r]) => [ll(la, lo), r]);
    const tycho = makeRayCrater(ll(-43, -11), .03, 404), cop = makeRayCrater(ll(10, -20), .025, 405);
    const HL = C(0xaeaba4), HL2 = C(0x8f8c86), MARE = C(0x55575c), RAY = C(0xdcdad4);
    const maria = (x, y, z) => {
      let m = 0;
      for (const [c, r] of MARIA) m = Math.max(m, 1 - smooth(.7, 1.05, Math.sqrt(chord2(x, y, z, c)) / r + n2(x * 5, y * 5, z * 5) * .2));
      return m;
    };
    B.push({ id: 'moon', name: 'Moon', R: 22, parent: 'earth', orbit: 300, ang: 1.2, gReal: .17, seed: 4, tidal: true,
      height: (x, y, z) => {
        const m = maria(x, y, z); RAW = m;
        return fbm(n1, x * 2, y * 2, z * 2, 4) * 1.2 + cr(x, y, z) * (1 - .6 * m) - m * 1.1;
      },
      color: (x, y, z, h, o) => {
        mixC(HL, HL2, n1(x * 5, y * 5, z * 5) + .5, o); mixC(o, MARE, RAW, o);
        return mixC(o, RAY, Math.max(tycho(x, y, z), cop(x, y, z)) * .9, o);
      },
      jitter: .12, props: [{ kind: 'rock', count: 220, color: 0x8e8c88 }] });
  }
  { // MARTE — ferrugem, regiões escuras, dicotomia norte/sul, Tharsis + Olympus Mons, Valles Marineris, Hellas, calotas
    const n1 = makeNoise(501), n2 = makeNoise(502), cr = makeCraters(503, 70, .03, .3, 2.2);
    const tharsis = ll(0, -110), olympus = ll(18, -134), montes = [ll(12, -104), ll(1, -112), ll(-9, -121)], hellas = ll(-42, 70), argyre = ll(-50, -43), elysium = ll(25, 147);
    const RUST = C(0xb5603a), BR = C(0xd19461), DK = C(0x6a3f2d), CAP = C(0xf2ece4), FLOORC = C(0xd8a47a);
    const dark = (x, y, z) => smooth(.02, .22, fbm(n2, x * 1.3 + 4, y * 1.3, z * 1.3, 4)) * (1 - smooth(.15, .55, y));
    B.push({ id: 'mars', name: 'Mars', R: 50, orbit: 3635, ang: 5.4, tilt: 25.2, gReal: .38, seed: 5,
      atmo: 0xe8a070, atmoScale: 1.08, sky: 0xc9956a, sunset: 0x6a8acc,
      height: (x, y, z) => {
        const r = fbm(n1, x * 1.7, y * 1.7, z * 1.7, 5); RAW = r;
        const south = 1 - smooth(-.1, .35, y);           // terras altas do sul, mais crateradas
        let h = r * 2.6 + cr(x, y, z) * (.35 + .65 * south) + 1.6 * south - 1.2;
        h += 3.5 * blob(x, y, z, tharsis, .38) + 2 * blob(x, y, z, elysium, .12);
        h += 12 * blob(x, y, z, olympus, .1) - 3 * blob(x, y, z, olympus, .018) + 1.2 * ring(x, y, z, olympus, .12, .02);
        for (const m of montes) h += 6 * blob(x, y, z, m, .055) - 1.5 * blob(x, y, z, m, .012);
        h -= 5 * blob(x, y, z, hellas, .34) - 1.2 * ring(x, y, z, hellas, .4, .06);
        h -= 3 * blob(x, y, z, argyre, .2);
        // Valles Marineris: cânion ao longo do equador, a leste de Tharsis
        const lat = latOf(y), lon = lonOf(x, z);
        if (lon > -102 && lon < -38) {
          const along = smooth(-102, -92, lon) * (1 - smooth(-50, -38, lon));
          h -= 4.5 * along * Math.exp(-(((lat + 9 + Math.sin(lon * .09) * 1.5) / 2.2) ** 2));
        }
        return h;
      },
      color: (x, y, z, h, o) => {
        mixC(RUST, BR, n1(x * 3, y * 3, z * 3) * 1.6 + .55, o);
        mixC(o, DK, dark(x, y, z) * .85, o);
        mixC(o, FLOORC, blob(x, y, z, hellas, .28) * .7, o);
        mixC(o, BR, smooth(5, 9, h) * .5, o);
        if (h < -2.2) mixC(o, DK, smooth(-2.2, -4, h) * .5, o);
        // calotas: norte maior com cânions em espiral, sul menor e deslocada
        const lon = Math.atan2(z, x), sp = Math.sin(lon * 1 + latOf(y) * .35);
        const north = smooth(.9, .94, y + n2(x * 5, y * 5, z * 5) * .03) * (y > .96 ? 1 : (.75 + .25 * sp));
        const south = smooth(.93, .965, -y + x * .04 + n2(x * 6, y * 6, z * 6) * .02);
        return mixC(o, CAP, Math.max(north, south), o);
      },
      jitter: .14, props: [{ kind: 'rock', count: 420, color: 0x8a3f22 }] });
  }

  // ---------- gigantes gasosos ----------
  // bands: [latitude inicial (de 90 pra baixo), cor] — faixas reais de cada planeta
  B.push({ id: 'jupiter', name: 'Jupiter', R: 450, orbit: 9720, ang: 1.1, tilt: 3.1, gReal: 2.53, seed: 6, gas: true, kind: 0,
    atmo: 0xead6b0, atmoScale: 1.04, sky: 0xc8a474, sunset: 0xa86a3a, deep: 0x5a3a24,
    bands: [[90, 0x868b96], [62, 0x9f9484], [48, 0xc8b9a0], [37, 0xa47a5a], [28, 0xe8dcc6], [20, 0xa05e3c], [8, 0xe4cca6], [-8, 0x9c5d3e],
      [-19, 0xe9ddc9], [-27, 0xac8264], [-35, 0xd1c1a7], [-46, 0xa49684], [-62, 0x868b96]],
    warp: .035, turb: 1, spot: { lat: -22, lon: 40, sLat: 6, sLon: 13, color: 0xc4633a } });
  B.push({ id: 'saturn', name: 'Saturn', R: 380, orbit: 15900, ang: 3.0, tilt: 26.7, gReal: 1.07, seed: 7, gas: true, kind: 1,
    atmo: 0xf2dfae, atmoScale: 1.04, sky: 0xd4bb86, sunset: 0xb07a40, deep: 0x6a5434,
    bands: [[90, 0x6f7f8c], [78, 0xb3a588], [62, 0xc9b48c], [44, 0xd6be8e], [24, 0xe0c895], [9, 0xead6a6], [-9, 0xdcc08c], [-24, 0xd0b484],
      [-44, 0xc4a87c], [-62, 0xa89676]],
    warp: .02, turb: .35,
    rings: { inner: 1.2, outer: 2.36, kind: 'saturn' } });
  B.push({ id: 'uranus', name: 'Uranus', R: 190, orbit: 27700, ang: 4.6, tilt: 97.8, gReal: .89, seed: 8, gas: true, kind: 2,
    atmo: 0xb4f2f8, atmoScale: 1.04, sky: 0x86d2dc, sunset: 0x4a8c9a, deep: 0x1e4a56,
    bands: [[90, 0xc3eaec], [60, 0xb4e2e6], [35, 0xa8dbe0], [10, 0xa0d5da], [-10, 0xa3d7dc], [-35, 0xaadce0], [-60, 0xb4e2e6]],
    warp: .01, turb: .15,
    rings: { inner: 1.6, outer: 2.05, kind: 'uranus' } });
  B.push({ id: 'neptune', name: 'Neptune', R: 185, orbit: 39500, ang: .2, tilt: 28.3, gReal: 1.14, seed: 9, gas: true, kind: 3,
    atmo: 0x6a9aff, atmoScale: 1.04, sky: 0x3a64c8, sunset: 0x203a80, deep: 0x0c1840,
    bands: [[90, 0x2f55b0], [60, 0x3a63c6], [35, 0x4473d8], [15, 0x4a7de0], [-15, 0x3e6dd4], [-35, 0x3762c9], [-60, 0x2f55b0]],
    warp: .03, turb: .6, spot: { lat: -20, lon: 120, sLat: 5, sLon: 11, color: 0x1d2f78 },
    rings: { inner: 1.6, outer: 2.6, kind: 'neptune' } });

  // posições e eixos
  const byId = {};
  for (const b of B) {
    byId[b.id] = b;
    const I = b.incl || 0;
    b.orbitPoint = (th, out = new V3()) => out.set(b.orbit * Math.cos(th), b.orbit * Math.sin(th) * Math.sin(I), b.orbit * Math.sin(th) * Math.cos(I));
    b.center = b.orbitPoint(b.ang);
    if (b.parent) b.center.add(byId[b.parent].center);
    // Terra: eixo inclinado na direção certa, apontando pra Polaris no céu real (ver eqToWorld)
    b.q = new Q().setFromAxisAngle(b.id === 'earth' ? new V3(1, 0, 0) : new V3(0, 0, 1), (b.id === 'earth' ? -1 : 1) * (b.tilt || 0) * D2R)
      .multiply(new Q().setFromAxisAngle(new V3(0, 1, 0), (b.seed || 0) * 1.7));
    if (b.tidal) b.q.setFromUnitVectors(new V3(1, 0, 0), byId[b.parent].center.clone().sub(b.center).normalize());
    b.qInv = b.q.clone().invert();
    b.g = 2 + 10 * (b.gReal || 0);
    b.colliders = [];
    if (!b.star && !b.gas) b.seg = clamp(Math.round(b.R * (LOWQ ? .85 : 1.15)), 36, LOWQ ? 96 : 140);
  }
  return B;
}

const BODIES = makeBodies();
const SUN = BODIES[0];
const PLANETS = BODIES.filter(b => !b.star);

// raio do chão numa direção de mundo (só rochosos; na Terra a água é pisável)
const _gd = new V3();
function groundR(b, dirW) {
  _gd.copy(dirW).applyQuaternion(b.qInv);
  const h = b.height(_gd.x, _gd.y, _gd.z);
  return b.R + (b.sea ? Math.max(h, 0) : h);
}

// =====================================================================
// RENDER / CENA
// =====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const MAX_DPR = Math.min(devicePixelRatio, LOWQ ? 1.5 : 2);   // shaders pesados: celular começa em 1.5x
let curDpr = MAX_DPR;
renderer.setPixelRatio(curDpr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.2, 150000);
scene.add(camera);

scene.add(new THREE.PointLight(0xfff2dc, 3.2, 0, 0));
scene.add(new THREE.AmbientLight(0x8899bb, 0.32));

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- céu estrelado realista ----------
// Coordenadas reais (equatoriais) convertidas pra eclíptica: o plano das órbitas do jogo (XZ) é a
// eclíptica, então o zodíaco fica ao longo da linha dos planetas e a Polaris sobre o polo da Terra.
const OBLIQ = 23.44 * D2R;
function eqToWorld(raH, decD, out = new V3()) {
  const a = raH * 15 * D2R, d = decD * D2R;
  const ex = Math.cos(d) * Math.cos(a), ey = Math.cos(d) * Math.sin(a), ez = Math.sin(d);
  const y2 = ey * Math.cos(OBLIQ) + ez * Math.sin(OBLIQ), z2 = -ey * Math.sin(OBLIQ) + ez * Math.cos(OBLIQ);
  return out.set(ex, z2, -y2);                       // mundo: Y = norte da eclíptica
}
const hm = (h, m) => h + m / 60;
// estrelas mais brilhantes: [ascensão reta (h), declinação (°), magnitude, índice de cor B-V]
const BRIGHT_STARS = [
  [hm(6, 45.1), -16.72, -1.46, 0], [hm(6, 24), -52.7, -.74, .15], [hm(14, 39.6), -60.83, -.27, .71], [hm(14, 15.7), 19.18, -.05, 1.23],
  [hm(18, 36.9), 38.78, .03, 0], [hm(5, 16.7), 46, .08, .8], [hm(5, 14.5), -8.2, .13, -.03], [hm(7, 39.3), 5.22, .34, .42],
  [hm(1, 37.7), -57.24, .46, -.16], [hm(5, 55.2), 7.41, .5, 1.85], [hm(14, 3.8), -60.37, .61, -.23], [hm(19, 50.8), 8.87, .76, .22],
  [hm(12, 26.6), -63.1, .76, -.24], [hm(4, 35.9), 16.51, .86, 1.54], [hm(13, 25.2), -11.16, .97, -.23], [hm(16, 29.4), -26.43, 1.06, 1.83],
  [hm(7, 45.3), 28.03, 1.14, 1], [hm(22, 57.6), -29.62, 1.16, .09], [hm(20, 41.4), 45.28, 1.25, .09], [hm(12, 47.7), -59.69, 1.25, -.23],
  [hm(10, 8.4), 11.97, 1.35, -.11], [hm(6, 58.6), -28.97, 1.5, -.21], [hm(7, 34.6), 31.89, 1.58, .03], [hm(17, 33.6), -37.1, 1.62, -.22],
  [hm(12, 31.2), -57.11, 1.64, 1.6], [hm(5, 25.1), 6.35, 1.64, -.22], [hm(5, 26.3), 28.6, 1.65, -.13], [hm(5, 36.2), -1.2, 1.69, -.18],
  [hm(22, 8.2), -46.96, 1.74, -.13], [hm(5, 40.8), -1.94, 1.77, -.21], [hm(12, 54), 55.96, 1.77, -.02], [hm(3, 24.3), 49.86, 1.79, .48],
  [hm(11, 3.7), 61.75, 1.79, 1.07], [hm(7, 8.4), -26.39, 1.83, .67], [hm(18, 24.2), -34.38, 1.85, -.03], [hm(13, 47.5), 49.31, 1.86, -.19],
  [hm(17, 37.3), -43, 1.86, .4], [hm(8, 22.5), -59.51, 1.86, 1.28], [hm(5, 59.5), 44.95, 1.9, .08], [hm(16, 48.7), -69.03, 1.91, 1.45],
  [hm(6, 37.7), 16.4, 1.93, 0], [hm(8, 44.7), -54.7, 1.93, .04], [hm(20, 25.6), -56.73, 1.94, -.2], [hm(2, 31.8), 89.26, 1.98, .6],
  [hm(6, 22.7), -17.96, 1.98, -.24], [hm(9, 27.6), -8.66, 1.98, 1.44], [hm(2, 7.2), 23.46, 2, 1.15], [hm(10, 20), 19.84, 2.08, 1.13],
  [hm(0, 43.6), -17.99, 2.04, 1.02], [hm(18, 55.3), -26.3, 2.05, -.13], [hm(14, 6.7), -36.37, 2.06, 1.01], [hm(0, 8.4), 29.09, 2.06, -.11],
  [hm(1, 9.7), 35.62, 2.05, 1.58], [hm(14, 50.7), 74.16, 2.08, 1.47], [hm(17, 34.9), 12.56, 2.08, .15], [hm(3, 8.2), 40.96, 2.1, -.05],
  [hm(2, 3.9), 42.33, 2.1, 1.37], [hm(11, 49), 14.57, 2.13, .09], [hm(8, 3.6), -40, 2.25, -.27], [hm(15, 34.7), 26.71, 2.23, -.02],
  [hm(20, 22.2), 40.26, 2.23, .67], [hm(17, 56.6), 51.49, 2.24, 1.52], [hm(0, 40.5), 56.54, 2.24, 1.17], [hm(0, 9.2), 59.15, 2.28, .34],
  [hm(0, 56.7), 60.72, 2.15, -.15], [hm(1, 25.8), 60.24, 2.66, .13], [hm(1, 54.4), 63.67, 3.35, -.15], [hm(5, 32), -.3, 2.25, -.22],
  [hm(5, 47.8), -9.67, 2.07, -.17], [hm(11, 1.8), 56.38, 2.37, -.02], [hm(11, 53.8), 53.69, 2.44, .04], [hm(12, 15.4), 57.03, 3.31, .08],
  [hm(13, 23.9), 54.93, 2.27, .02], [hm(12, 15.1), -58.75, 2.79, -.23], [hm(16, 0.3), -22.62, 2.29, -.12], [hm(16, 5.4), -19.8, 2.62, -.07],
  [hm(16, 50.2), -34.29, 2.29, 1.15], [hm(17, 42.5), -39.03, 2.39, -.17], [hm(16, 21.2), -25.59, 2.89, -.2], [hm(16, 35.9), -28.22, 2.82, -.2],
  [hm(17, 47.6), -40.13, 3.03, .51], [hm(16, 52.0), -38.05, 3.0, 1.2], [hm(21, 44.2), 9.88, 2.38, 1.52], [hm(23, 3.8), 28.08, 2.42, 1.67],
  [hm(23, 4.8), 15.2, 2.48, -.04], [hm(0, 13.2), 15.18, 2.83, -.23], [hm(19, 30.7), 27.96, 3.05, 1.13], [hm(20, 46.2), 33.97, 2.48, 1.03],
  [hm(19, 45), 45.13, 2.87, -.03], [hm(14, 50.9), -16.04, 2.75, .15], [hm(15, 44.3), 6.43, 2.63, 1.17], [hm(17, 10.4), -15.72, 2.43, .06],
  [hm(21, 18.6), 62.59, 2.45, .26], [hm(7, 24.1), -29.3, 2.45, -.08], [hm(9, 8), -69.72, 1.67, .07], [hm(9, 22.1), -59.28, 2.21, -.18],
  [hm(9, 17.1), -59.28, 2.25, 1.55], [hm(8, 9.5), -47.34, 1.78, -.22], [hm(9, 7.99), -43.43, 2.23, 1.66], [hm(13, 39.9), -53.47, 2.3, -.22],
  [hm(12, 8.4), -50.72, 2.6, -.15], [hm(14, 35.5), -42.16, 2.33, -.16], [hm(15, 35.1), -41.17, 2.3, -.2], [hm(18, 21), -29.83, 2.7, .03],
  [hm(19, 2.6), -29.88, 2.6, .08], [hm(13, 2.2), 10.96, 2.85, .94], [hm(11, 14.2), 20.52, 2.56, .12], [hm(9, 45.9), 23.77, 2.98, .81],
  [hm(3, 47.5), 24.1, 2.87, -.09], [hm(3, 49.2), 24.05, 3.62, -.08], [hm(3, 44.9), 24.11, 3.7, -.11], [hm(3, 45.8), 24.37, 3.87, -.07],
  [hm(3, 46.3), 23.95, 4.18, -.06], [hm(3, 45.2), 24.47, 4.3, -.11], [hm(3, 49.2), 24.14, 5.05, -.08], [hm(4, 28.6), 15.87, 3.53, .98],
  [hm(4, 19.8), 15.63, 3.65, .99], [hm(4, 26.3), 22.81, 4.27, .26], [hm(6, 14.9), 22.51, 3.28, 1.6], [hm(6, 23), 22.51, 2.88, 1.64],
  [hm(7, 20.1), 21.98, 3.53, .37], [hm(6, 44.8), 25.13, 3.06, 1.38], [hm(22, 5.8), -.32, 2.95, .98], [hm(21, 31.6), -5.57, 2.9, .83],
  [hm(20, 21), -14.78, 3.05, .79], [hm(21, 47), -16.13, 2.85, .18], [hm(1, 51.5), 29.58, 3.42, .14], [hm(2, 0), 2.76, 3.82, .03],
  [hm(18, 5.8), -30.42, 2.99, .98], [hm(19, 6.2), -27.67, 3.32, 1.17], [hm(17, 25.3), -55.53, 2.84, 1.46], [hm(17, 31.8), -49.88, 2.95, -.1],
];
// cor da estrela pelo índice B-V (temperatura → corpo negro aproximado), um pouco dessaturada como o olho vê
function bvColor(bv, out) {
  const T = 4600 * (1 / (.92 * bv + 1.7) + 1 / (.92 * bv + .62)), t = T / 100;
  let r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -.1332);
  let g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -.0755);
  let b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
  r = clamp(r, 0, 255) / 255; g = clamp(g, 0, 255) / 255; b = clamp(b, 0, 255) / 255;
  return out.setRGB(L(.35, r, 1), L(.35, g, 1), L(.35, b, 1), THREE.SRGBColorSpace);
}

// eixos galácticos no mundo (polo norte galáctico e centro galáctico reais)
const GAL_Z = eqToWorld(hm(12, 51.4), 27.13);
const GAL_X = eqToWorld(hm(17, 45.6), -28.94);
GAL_X.addScaledVector(GAL_Z, -GAL_X.dot(GAL_Z)).normalize();
const GAL_Y = new V3().crossVectors(GAL_Z, GAL_X);
const galDir = (lDeg, bDeg, out = new V3()) => {
  const l = lDeg * D2R, b = bDeg * D2R;
  return out.copy(GAL_X).multiplyScalar(Math.cos(b) * Math.cos(l)).addScaledVector(GAL_Y, Math.cos(b) * Math.sin(l)).addScaledVector(GAL_Z, Math.sin(b));
};

const stars = (() => {
  const NBG = LOWQ ? 12000 : 24000, N = NBG + BRIGHT_STARS.length;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), glowA = new Float32Array(N);
  const r = rng(77), d = new V3(), c = new THREE.Color();
  const put = (i, dir, mag, bv) => {
    pos.set([dir.x * 15000, dir.y * 15000, dir.z * 15000], i * 3);
    bvColor(bv, c).convertLinearToSRGB();          // o shader escreve direto na tela (sem conversão)
    const lum = clamp(Math.pow(10, -.4 * (mag - 6.2)), 0, 60);           // fluxo relativo a uma estrela no limite do olho
    const k = clamp(.25 + .35 * Math.log10(1 + lum * 3), .18, 1.4);       // brilho percebido (comprimido)
    col.set([c.r * k, c.g * k, c.b * k], i * 3);
    size[i] = clamp(1.3 + Math.log10(1 + lum) * 1.9, 1.3, 7.5);
    glowA[i] = mag < 1.6 ? clamp((1.6 - mag) / 3, 0, 1) : 0;              // só as mais brilhantes ganham halo
  };
  let i = 0;
  for (const [ra, dec, mag, bv] of BRIGHT_STARS) put(i++, eqToWorld(ra, dec, d), mag, bv);
  for (let k = 0; k < NBG; k++) {
    // 55% concentradas no plano galáctico (mais ainda no bojo), o resto espalhado
    if (r() < .55) {
      const l = (r() < .35 ? (r() - .5) * 90 : r() * 360);
      const bw = 4 + 10 * Math.exp(-(((((l + 180) % 360) - 180) / 40) ** 2));
      const b = (r() + r() + r() - 1.5) * bw * 1.4;
      galDir(l, b, d);
    } else randDir(r, d);
    const mag = 6.5 - Math.log10(1 + r() * 999) * 1.15;                     // muitas fracas, poucas fortes
    const u = r(), bv = u < .08 ? -.2 + r() * .2 : u < .85 ? .2 + r() * .9 : 1.1 + r() * .7;
    put(i++, d, Math.max(mag, 3), bv);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('glow', new THREE.BufferAttribute(glowA, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uDpr: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float size; attribute float glow; attribute vec3 color;
      uniform float uDpr; varying vec3 vC; varying float vG;
      void main(){ vC = color; vG = glow; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        gl_PointSize = size * (1. + glow * 2.2) * uDpr; }`,
    fragmentShader: `
      uniform float uFade; varying vec3 vC; varying float vG;
      void main(){
        float d = length(gl_PointCoord - .5) * 2.;
        float s = 1. + vG * 2.2;                         // fração do sprite que é o núcleo
        float core = exp(-pow(d * s, 2.) * 3.5);
        float halo = vG * .35 * exp(-d * 4.) * (1. - d);
        float a = (core + halo) * uFade;
        if (a < .004) discard;
        gl_FragColor = vec4(vC * a, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -1;
  scene.add(p);
  return p;
})();

// Via Láctea: textura equiretangular gerada uma vez (faixa galáctica com bojo, nuvens de estrelas,
// a fenda escura de poeira, Nuvens de Magalhães e Andrômeda), numa esfera grande que segue a câmera
const milkyWay = (() => {
  const W = LOWQ ? 512 : 1024, H = W / 2, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), img = x.createImageData(W, H), n1 = makeNoise(9001), n2 = makeNoise(9002), d = new V3();
  const lmc = eqToWorld(hm(5, 23.6), -69.75), smc = eqToWorld(hm(0, 52.7), -72.8), m31 = eqToWorld(hm(0, 42.7), 41.27);
  for (let j = 0; j < H; j++) {
    const th = (j + .5) / H * Math.PI;
    for (let i = 0; i < W; i++) {
      const ph = (i + .5) / W * Math.PI * 2;
      d.set(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th));   // mesma convenção de UV da SphereGeometry
      const gx = d.dot(GAL_X), gy = d.dot(GAL_Y), gz = d.dot(GAL_Z);
      const l = Math.atan2(gy, gx), b = Math.asin(clamp(gz, -1, 1));
      const bulge = Math.exp(-(l * l) / .35);
      const w = .07 + .12 * bulge;
      let I = Math.exp(-((b / w) ** 2)) * (.35 + .65 * Math.exp(-(l * l) / 1.6));
      const clump = fbm(n1, d.x * 5, d.y * 5, d.z * 5, 4);
      I *= .55 + .9 * clamp(clump + .5, 0, 1.2);
      // fenda escura (Grande Fenda, de Cygnus a Sagitário): poeira fina logo acima/abaixo do plano
      const dust = smooth(-.05, .3, fbm(n2, d.x * 9, d.y * 9, d.z * 9, 4)) * Math.exp(-(((b - .012) / .035) ** 2)) * Math.exp(-(l * l) / 2.2);
      I *= 1 - .8 * dust;
      I += .55 * Math.exp(-d.distanceToSquared(lmc) / .0045) + .35 * Math.exp(-d.distanceToSquared(smc) / .0018);
      const dm = d.distanceToSquared(m31); I += .22 * Math.exp(-dm / .0004);
      I = clamp(I, 0, 1.4);
      const warm = bulge * .8;
      const R = (.62 + .38 * warm) * I, G = (.68 + .2 * warm) * I, B = (.85 - .2 * warm) * I;
      const o = (j * W + i) * 4;
      img.data[o] = clamp(R * 85, 0, 255); img.data[o + 1] = clamp(G * 85, 0, 255); img.data[o + 2] = clamp(B * 85, 0, 255); img.data[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(14000, 64, 32),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  mesh.frustumCulled = false; mesh.renderOrder = -2;
  scene.add(mesh);
  return mesh;
})();
// esmaece estrelas e Via Láctea juntas (dia na superfície, dentro de nuvens)
function setStarFade(f) { stars.material.uniforms.uFade.value = f; milkyWay.material.opacity = f; stars.material.uniforms.uDpr.value = renderer.getPixelRatio(); }

// ---------- ruído simplex 3D em GLSL (Ashima Arts / Stefan Gustavson, MIT) ----------
const NOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<${LOWQ ? 2 : 3};i++){ s+=a*snoise(p); p*=2.03; a*=.5; } return s; }
float fbm4(vec3 p){ float s=0., a=.5; for(int i=0;i<${LOWQ ? 3 : 4};i++){ s+=a*snoise(p); p*=2.03; a*=.5; } return s; }
`;
// vertex shader comum das esferas em shader (com fog)
const SPHERE_VS = `
varying vec3 vP; varying vec3 vW; varying vec3 vNW; varying vec3 vNV; varying vec3 vV;
#include <fog_pars_vertex>
void main(){
  vP = position;
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
  vNW = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * w;
  vNV = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const TIME_UNIFORMS = []; // uniforms uTime atualizados todo frame

// ---------- sol: granulação animada, manchas solares, escurecimento de borda ----------
function glowTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
{
  const u = { uTime: { value: 0 } };
  TIME_UNIFORMS.push(u.uTime);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN.R, 96, 48), new THREE.ShaderMaterial({
    uniforms: u, toneMapped: false, fog: false,
    vertexShader: `
      varying vec3 vP; varying vec3 vNV; varying vec3 vV;
      void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.);
        vNV = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: NOISE_GLSL + `
      uniform float uTime; varying vec3 vP; varying vec3 vNV; varying vec3 vV;
      void main(){
        vec3 p = normalize(vP);
        float g = fbm4(p*42. + vec3(0., 0., uTime*.04));
        float g2 = snoise(p*8. + vec3(uTime*.01));
        float act = 1. - smoothstep(.12, .3, abs(abs(p.y) - .28));
        float spot = smoothstep(.6, .75, snoise(p*6. + vec3(3., 1., uTime*.002))) * act;
        float pen = smoothstep(.5, .62, snoise(p*6. + vec3(3., 1., uTime*.002))) * act;
        float mu = max(dot(normalize(vNV), normalize(vV)), 0.);
        vec3 c = mix(vec3(1., .74, .36), vec3(1., .95, .78), .5 + .9*g) * (.94 + .1*g2);
        c = mix(c, c*.55, pen*.6);
        c = mix(c, vec3(.28, .1, .03), spot*.9);
        c *= mix(vec3(.82, .42, .14), vec3(1.), pow(mu, .45)) * (.55 + .55*pow(mu, .5));
        gl_FragColor = vec4(c*1.2, 1.);
      }`,
  }));
  scene.add(sun);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture([[0, 'rgba(255,240,200,1)'], [.22, 'rgba(255,205,120,.75)'], [.42, 'rgba(255,150,60,.22)'], [1, 'rgba(255,100,20,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  glow.scale.set(SUN.R * 4.6, SUN.R * 4.6, 1); scene.add(glow);
}

// ---------- geometria dos planetas: cubo esferificado indexado ----------
const FACES = [
  [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];
function planetGeometry(b) {
  const N = b.seg, R = b.R, map = new Map(), P = [], Cl = [], I = [], o = [0, 0, 0];
  const jr = rng(b.seed * 7 + 1), v = new V3(), grid = new Int32Array((N + 1) * (N + 1));
  for (const [n, U, Vv] of FACES) {
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const su = Math.tan((-1 + 2 * i / N) * Math.PI / 4), sv = Math.tan((-1 + 2 * j / N) * Math.PI / 4);
      v.set(n[0] + U[0] * su + Vv[0] * sv, n[1] + U[1] * su + Vv[1] * sv, n[2] + U[2] * su + Vv[2] * sv).normalize();
      const key = Math.round(v.x * 1e5) + '|' + Math.round(v.y * 1e5) + '|' + Math.round(v.z * 1e5);
      let id = map.get(key);
      if (id === undefined) {
        id = P.length / 3; map.set(key, id);
        const h = b.height(v.x, v.y, v.z), r = R + h;
        P.push(v.x * r, v.y * r, v.z * r);
        b.color(v.x, v.y, v.z, h, o);
        const k = 1 + (jr() - .5) * b.jitter;
        Cl.push(o[0] * k, o[1] * k, o[2] * k);
      }
      grid[j * (N + 1) + i] = id;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = grid[j * (N + 1) + i], bb = grid[j * (N + 1) + i + 1],
        c = grid[(j + 1) * (N + 1) + i + 1], d = grid[(j + 1) * (N + 1) + i];
      I.push(a, bb, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cl, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

// ---------- detalhe de perto no chão: ruído tileável aplicado em triplanar (coords locais do planeta) ----------
const DETAIL_TEX = (() => {
  const S = 256, img = new Uint8Array(S * S * 4), r = rng(99);
  const oct = [[8, .45], [16, .25], [32, .17], [64, .13]];
  const grids = oct.map(([P]) => { const g = new Float32Array(P * P); for (let i = 0; i < P * P; i++) g[i] = r(); return g; });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    oct.forEach(([P, a], k) => {
      const g = grids[k], gx = x / S * P, gy = y / S * P, x0 = Math.floor(gx), y0 = Math.floor(gy);
      let fx = gx - x0, fy = gy - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
      v += a * L(fy, L(fx, g[y0 * P + x0], g[y0 * P + x1]), L(fx, g[y1 * P + x0], g[y1 * P + x1]));
    });
    const b = clamp(v * 255, 0, 255);
    img.set([b, b, b, 255], (y * S + x) * 4);
  }
  const t = new THREE.DataTexture(img, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
})();
function groundMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uDetail = { value: DETAIL_TEX };
    sh.vertexShader = 'varying vec3 vObjPos; varying vec3 vObjN;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position; vObjN = normal;');
    sh.fragmentShader = 'uniform sampler2D uDetail; varying vec3 vObjPos; varying vec3 vObjN;\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        vec3 bw = pow(abs(normalize(vObjN)), vec3(4.)); bw /= bw.x + bw.y + bw.z;
        vec3 p1 = vObjPos * .45, p2 = vObjPos * .09;
        float d1 = texture2D(uDetail, p1.yz).r*bw.x + texture2D(uDetail, p1.xz).r*bw.y + texture2D(uDetail, p1.xy).r*bw.z;
        float d2 = texture2D(uDetail, p2.yz).r*bw.x + texture2D(uDetail, p2.xz).r*bw.y + texture2D(uDetail, p2.xy).r*bw.z;
        diffuseColor.rgb *= .62 + .76 * (d1 * .55 + d2 * .45);
      }`);
  };
  return m;
}

// halo de atmosfera (fresnel, mais forte no lado iluminado)
function atmosphereMesh(b) {
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(b.atmo) }, strength: { value: b.gas ? .8 : 1.0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vNW;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vec4 mv = viewMatrix * w;
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        vW = w.xyz; vNW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color; uniform float strength;
      varying vec3 vN; varying vec3 vV; varying vec3 vW; varying vec3 vNW;
      void main(){
        float d = -dot(vN, vV);
        float a = pow(clamp(d / 0.45, 0.0, 1.0), 2.2);
        float lit = 0.12 + 0.88 * smoothstep(-0.3, 0.5, dot(vNW, normalize(-vW)));
        gl_FragColor = vec4(color * a * lit * strength, 1.0);
      }`,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(b.R * b.atmoScale, 96, 48), m);
}

// ---------- gigantes gasosos: faixas reais numa textura 1D + turbulência animada no shader ----------
function bandTexture(b) {
  const W = 1024, data = new Uint8Array(W * 4), n = makeNoise(b.seed * 13), bands = b.bands;
  const col = new THREE.Color();
  for (let i = 0; i < W; i++) {
    const lat = 90 - i / (W - 1) * 180;           // i=0 → polo norte
    let k = 0;
    while (k < bands.length - 1 && lat < bands[k + 1][0]) k++;
    let c = new THREE.Color(bands[k][1]);
    // transição suave na fronteira com a próxima faixa
    if (k < bands.length - 1) {
      const t = smooth(1.4, -1.4, lat - bands[k + 1][0]);
      c = c.lerp(col.set(bands[k + 1][1]), t * .5);
    }
    if (k > 0) {
      const t = smooth(-1.4, 1.4, lat - bands[k][0]);
      c = c.lerp(col.set(bands[k - 1][1]), t * .5);
    }
    const sub = 1 + n(lat * .35, .5, .5) * .12 * b.turb + n(lat * 1.3, 1.5, .5) * .05;  // sub-faixas finas
    data.set([clamp(c.r * 255 * sub, 0, 255), clamp(c.g * 255 * sub, 0, 255), clamp(c.b * 255 * sub, 0, 255), 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, W, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  return tex;
}
function gasMaterial(b) {
  const s = b.spot;
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uBands: { value: null }, uWarp: { value: b.warp }, uTurb: { value: b.turb },
    uKind: { value: b.kind }, uHasSpot: { value: s ? 1 : 0 },
    uSpot: { value: new THREE.Vector4(s ? s.lat : 0, s ? s.lon : 0, s ? s.sLat : 1, s ? s.sLon : 1) },
    uSpotC: { value: new THREE.Color(s ? s.color : 0) },
  }]);
  u.uBands.value = bandTexture(b);
  TIME_UNIFORMS.push(u.uTime);
  return new THREE.ShaderMaterial({
    uniforms: u, fog: true, side: THREE.DoubleSide,
    vertexShader: SPHERE_VS,
    fragmentShader: NOISE_GLSL + `
      uniform float uTime; uniform sampler2D uBands; uniform float uWarp; uniform float uTurb; uniform int uKind;
      uniform float uHasSpot; uniform vec4 uSpot; uniform vec3 uSpotC;
      varying vec3 vP; varying vec3 vW; varying vec3 vNW; varying vec3 vNV; varying vec3 vV;
      #include <fog_pars_fragment>
      // rotação diferencial: faixas vizinhas correm em sentidos opostos
      float spAt(float ld) { return .010 * sin(ld * .12) + .003; }
      vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c*p.x - s*p.z, p.y, s*p.x + c*p.z); }
      // uma camada de turbulência advectada por no máximo um ciclo de 120 s
      vec3 layer(vec3 p, float sp, float ph, float seed) {
        vec3 q = rotY(p, sp * ph * 120.) + vec3(seed);
        float w1 = fbm3(q*vec3(2., 7., 2.) + vec3(0., 0., uTime*.006));
        float w2 = fbm3(q*vec3(7., 26., 7.) + w1*1.7);
        return vec3(w1, w2, snoise(q*vec3(18., 60., 18.) + w2*2.));
      }
      float lonAt(vec3 p, float ld) { vec3 r = rotY(p, spAt(ld) * uTime); return atan(r.z, r.x) * 57.29578; }
      void main(){
        vec3 p = normalize(vP);
        float lat = p.y;
        float latd = asin(clamp(lat, -1., 1.)) * 57.29578;
        // duas camadas defasadas meio ciclo, uma some enquanto a outra reinicia: o padrão
        // flui pra sempre sem virar risco (cisalhamento limitado)
        float sp = spAt(latd);
        float ph1 = fract(uTime / 120.), ph2 = fract(uTime / 120. + .5);
        float k1 = 1. - abs(2. * ph1 - 1.);
        vec3 t = layer(p, sp, ph1, 0.) * k1 + layer(p, sp, ph2, 31.7) * (1. - k1);
        float lw = clamp(lat + uWarp*(t.x + t.y*uTurb), -1., 1.);
        vec3 col = texture2D(uBands, vec2(asin(lw)/3.14159265 + .5, .5)).rgb;
        col *= .93 + .14 * t.z * (.3 + uTurb);

        if (uHasSpot > .5) {
          float dl = mod(lonAt(p, uSpot.x) - uSpot.y + 180., 360.) - 180.;
          vec2 e = vec2(dl / uSpot.w, (latd - uSpot.x) / uSpot.z);
          float r = length(e);
          float ang = atan(e.y, e.x) + (1. - r) * 3. + uTime * .12;
          float sw = snoise(vec3(cos(ang)*r*3., sin(ang)*r*3., uTime*.02));
          float core = 1. - smoothstep(.55, 1.05, r + sw*.12);
          col = mix(col, uSpotC * (.88 + .24*sw), core);
          if (uKind == 0) col = mix(col, col*1.15 + vec3(.04), (1. - smoothstep(1.05, 1.45, r)) * (1. - core) * .7);
          if (uKind == 3) col = mix(col, vec3(.93, .95, 1.), (1. - smoothstep(0., .22, abs(r - 1.3))) * step(e.y, -.2) * .9);
        }
        if (uKind == 0) {
          // polos azul-acinzentados cheios de ciclones
          float pol = smoothstep(.8, .94, abs(lat));
          float cyc = snoise(p*16. + vec3(uTime*.01)) * .5 + .5;
          col = mix(col, vec3(.40, .43, .48) * (.8 + .45*cyc), pol * .75);
          // "colar de pérolas": ovais brancos a 40°S
          float lonO = lonAt(p, -40.);
          for (int i = 0; i < 5; i++) {
            float olon = -150. + float(i) * 62.;
            float dl = mod(lonO - olon + 180., 360.) - 180.;
            float r2 = length(vec2(dl / 3.2, (latd + 40.) / 1.8));
            col = mix(col, vec3(.96, .94, .9), 1. - smoothstep(.55, 1., r2));
          }
        }
        if (uKind == 1 && latd > 70.) {
          // hexágono do polo norte de Saturno
          float pd = 90. - latd;
          float ha = lonAt(p, 80.) / 57.29578;
          float seg = mod(ha, 1.0471976) - .5235988;
          float hexR = 12. * .8660254 / cos(seg);
          col = mix(col, vec3(.34, .40, .48), (1. - smoothstep(hexR - 1., hexR, pd)) * .8);
          col = mix(col, vec3(.58, .53, .44), (1. - smoothstep(0., 1.2, abs(pd - hexR))) * .6);
          col = mix(col, vec3(.18, .22, .3), 1. - smoothstep(0., 2.5, pd));
        }
        if (uKind == 2) col *= 1. + .12 * smoothstep(.6, 1., lat);
        if (uKind == 3) {
          // cirros brancos de metano nas latitudes médias
          float st = smoothstep(.42, .75, fbm3(rotY(p, spAt(35.) * uTime)*vec3(3., 34., 3.) + vec3(uTime*.02, 0., 0.)));
          float band = smoothstep(18., 28., abs(latd)) * (1. - smoothstep(45., 55., abs(latd)));
          col = mix(col, vec3(.92, .95, 1.), st * band * .8);
        }

        vec3 N = normalize(vNW); vec3 Ld = normalize(-vW);
        float diff = clamp(dot(N, Ld) * 1.1 + .05, 0., 1.);
        float mu = max(dot(normalize(vNV), normalize(vV)), 0.);
        float limb = .35 + .65 * pow(mu, .45);
        vec3 c = col * (diff * limb * 1.05 + .02);
        if (!gl_FrontFacing) c = col * (.05 + .3 * diff);   // vista de dentro: o céu de nuvens
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

// ---------- camada de nuvens (Terra) / deck de nuvens (Vênus) ----------
function cloudMesh(b) {
  const c = b.clouds;
  const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uCover: { value: c.cover }, uOpacity: { value: c.opacity }, uScale: { value: c.scale },
    uSpeed: { value: c.speed }, uColor: { value: new THREE.Color(c.color) }, uUnder: { value: new THREE.Color(c.under) },
    uKind: { value: c.kind },
  }]);
  TIME_UNIFORMS.push(u.uTime);
  const m = new THREE.ShaderMaterial({
    uniforms: u, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: SPHERE_VS,
    fragmentShader: NOISE_GLSL + `
      uniform float uTime; uniform float uCover; uniform float uOpacity; uniform float uScale; uniform float uSpeed;
      uniform vec3 uColor; uniform vec3 uUnder; uniform int uKind;
      varying vec3 vP; varying vec3 vW; varying vec3 vNW; varying vec3 vNV; varying vec3 vV;
      #include <fog_pars_fragment>
      void main(){
        vec3 p = normalize(vP);
        float a = uTime * uSpeed; float ca = cos(a), sa = sin(a);
        vec3 q = vec3(ca*p.x - sa*p.z, p.y, sa*p.x + ca*p.z);
        float alpha; vec3 col = uColor;
        if (uKind == 0) {
          float w = fbm3(q * uScale * .8);
          float n = fbm4(q * uScale * vec3(1., 1.6, 1.) + w * 1.3 + vec3(0., 0., uTime*.004)) * .5 + .5;
          float al = abs(p.y);
          // equador (ZCIT) e latitudes médias nublados, subtrópicos limpos
          float thr = uCover + .09*smoothstep(.15, .3, al)*(1. - smoothstep(.42, .55, al)) - .05*(1. - smoothstep(0., .12, al)) - .04*smoothstep(.6, .8, al);
          alpha = smoothstep(thr, thr + .16, n) * uOpacity;
          col *= .9 + .1*n;
        } else {
          // Vênus: deck completo, amarelado, com faixas escuras em "Y"
          float n = fbm4(q * vec3(uScale, uScale*3., uScale) + vec3(0., 0., uTime*.01));
          float lon = atan(q.z, q.x);
          float chev = snoise(vec3(q.x*1.5, abs(p.y)*5. - abs(sin(lon*.5))*2.5, q.z*1.5));
          col *= .9 + .12*n;
          col = mix(col, col*vec3(.86, .8, .7), smoothstep(.15, .55, chev) * .7);
          alpha = uOpacity;
        }
        vec3 N = normalize(vNW); vec3 Ld = normalize(-vW);
        float diff = clamp(dot(N, Ld) * 1.1 + .05, 0., 1.);
        float mu = max(dot(normalize(vNV), normalize(vV)), 0.);
        vec3 c = col * (diff * (.4 + .6*pow(mu, .3)) * 1.05 + .03);
        if (!gl_FrontFacing) c = uUnder * (.12 + .75*diff) * (uKind == 0 ? (.75 + .25*alpha) : 1.);
        gl_FragColor = vec4(c, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(b.R * c.r, LOWQ ? 72 : 128, LOWQ ? 36 : 64), m);
}

// ---------- anéis com o perfil radial real (raios em raios do planeta) ----------
const RING_PROFILES = {
  saturn: (rr, n) => {   // C, B, divisão de Cassini, A, Encke, F
    const fine = .8 + .2 * n(rr * 260, .5, .5) + .1 * n(rr * 900, 2.5, .5);
    if (rr < 1.24) return [0, 0x8a8278];
    if (rr < 1.53) return [(.1 + .06 * n(rr * 60, .5, .5)) * fine, 0x9d958a];
    if (rr < 1.95) return [clamp(.72 + .2 * smooth(1.53, 1.75, rr), 0, 1) * fine, 0xdccaa4];
    if (rr < 2.03) return [.04 + .03 * fine, 0x8a8278];
    if (rr < 2.27) return [(Math.abs(rr - 2.214) < .004 ? .05 : .5) * fine, 0xcbbd9f];
    if (rr > 2.32 && rr < 2.334) return [.45, 0xd0c4aa];
    return [0, 0x8a8278];
  },
  uranus: rr => {
    for (const r of [1.64, 1.66, 1.68, 1.72, 1.76, 1.81, 1.84, 1.87]) if (Math.abs(rr - r) < .0035) return [.4, 0x8c8c8c];
    if (Math.abs(rr - 1.995) < .012) return [.65, 0x9a9a9a];
    return [0, 0x8c8c8c];
  },
  neptune: rr => {
    if (Math.abs(rr - 1.69) < .05) return [.07, 0x8a8a8a];
    if (Math.abs(rr - 2.15) < .006) return [.25, 0x9a9a9a];
    if (Math.abs(rr - 2.54) < .008) return [.3, 0x9a9a9a];
    return [0, 0x8a8a8a];
  },
};
function ringMesh(b) {
  const R = b.rings, prof = RING_PROFILES[R.kind], n = makeNoise(b.seed * 31), W = 2048;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = 2;
  const x = cv.getContext('2d'), col = new THREE.Color();
  for (let i = 0; i < W; i++) {
    const rr = R.inner + (R.outer - R.inner) * (i + .5) / W;
    const [a, hex] = prof(rr, n);
    col.set(hex);
    x.fillStyle = `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},${clamp(a, 0, 1).toFixed(3)})`;
    x.fillRect(i, 0, 1, 2);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const inner = b.R * R.inner, outer = b.R * R.outer;
  const g = new THREE.RingGeometry(inner, outer, 256, 1);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), .5);
  const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uCenter: { value: b.center.clone() }, uR: { value: b.R } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false,
    vertexShader: `
      varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 uCenter; uniform float uR;
      varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main(){
        vec4 t = texture2D(map, vUv);
        vec3 Ld = normalize(-vW), oc = vW - uCenter;
        float b = dot(oc, Ld);
        float d = sqrt(max(dot(oc, oc) - b*b, 0.));
        float sh = b < 0. ? smoothstep(uR * .97, uR * 1.03, d) : 1.;   // sombra do planeta
        float lit = .3 + .7 * pow(abs(dot(normalize(vN), Ld)), .35);
        gl_FragColor = vec4(t.rgb * .85 * lit * mix(.05, 1., sh), t.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// ---------- props espalhados (rochas, árvores) ----------
const PROP_GEO = {
  rock: new THREE.DodecahedronGeometry(1, 0),
  trunk: new THREE.CylinderGeometry(.15, .22, 1.3, 6).translate(0, .65, 0),
  crown: new THREE.ConeGeometry(1, 2.8, 7).translate(0, 2.5, 0),
};
const _pm = new THREE.Matrix4(), _pq = new Q(), _pq2 = new Q(), _ps = new V3(), _pp = new V3(), _pd = new V3(), _pc = new THREE.Color();
const UPY = new V3(0, 1, 0);

function scatter(b, spec) {
  const r = rng(b.seed * 1000 + spec.kind.length * 17 + spec.count);
  const meshes = [];
  const mk = (geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, spec.count); im.frustumCulled = false; meshes.push(im); return im; };
  let main, extra = null;
  if (spec.kind === 'tree') {
    main = mk(PROP_GEO.crown, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, flatShading: true }));
    extra = mk(PROP_GEO.trunk, new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 1 }));
  } else {
    main = mk(PROP_GEO.rock, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .95, flatShading: true }));
  }
  let n = 0;
  for (let tries = 0; n < spec.count && tries < spec.count * 30; tries++) {
    randDir(r, _pd);
    const h = b.height(_pd.x, _pd.y, _pd.z), raw = RAW;
    if (b.sea && h <= 0) continue;
    if (spec.kind === 'tree' && !b.treeOk(_pd.x, _pd.y, _pd.z, h, raw)) continue;
    if (spec.accept && !spec.accept(_pd.x, _pd.y, _pd.z, h, raw)) continue;
    let lift = 0, collide = 0;
    if (spec.kind === 'rock') {
      const s = .25 + Math.pow(r(), 3) * 2.6;
      _ps.set(s * (.8 + r() * .5), s * (.5 + r() * .4), s * (.8 + r() * .5));
      lift = -.3 * _ps.y; if (s > .75) collide = s * .9;
    } else {
      const s = .8 + r() * .8; _ps.set(s, s * (.85 + r() * .4), s); collide = .35 * s;
    }
    _pp.copy(_pd).multiplyScalar(b.R + h + lift);
    _pq.setFromUnitVectors(UPY, _pd);
    _pq2.setFromAxisAngle(UPY, r() * Math.PI * 2); _pq.multiply(_pq2);
    if (spec.kind === 'rock') { _pq2.setFromAxisAngle(new V3(r() - .5, 0, r() - .5).normalize(), r() * .5); _pq.multiply(_pq2); }
    _pm.compose(_pp, _pq, _ps);
    main.setMatrixAt(n, _pm);
    if (extra) extra.setMatrixAt(n, _pm);
    if (spec.kind === 'tree') main.setColorAt(n, _pc.setHSL(.25 + r() * .1, .45 + r() * .2, .18 + r() * .12));
    else { _pc.set(spec.color).multiplyScalar(.75 + r() * .45); main.setColorAt(n, _pc); }
    if (collide > 0) b.colliders.push({ p: _pp.clone().applyQuaternion(b.q).add(b.center), r: collide });
    n++;
  }
  for (const im of meshes) {
    im.count = n; im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    b.group.add(im);
  }
}

function buildBody(b) {
  b.group = new THREE.Group();
  b.group.position.copy(b.center);
  b.group.quaternion.copy(b.q);
  scene.add(b.group);
  if (b.gas) {
    b.group.add(new THREE.Mesh(new THREE.SphereGeometry(b.R, LOWQ ? 112 : 192, LOWQ ? 72 : 128), gasMaterial(b)));
  } else {
    b.group.add(new THREE.Mesh(planetGeometry(b), groundMaterial()));
  }
  if (b.ocean) b.group.add(new THREE.Mesh(new THREE.SphereGeometry(b.R, LOWQ ? 112 : 192, LOWQ ? 56 : 96),
    new THREE.MeshStandardMaterial({ color: b.ocean.color, roughness: .2, metalness: 0 })));
  if (b.clouds) { b.cloudMesh = cloudMesh(b); b.group.add(b.cloudMesh); }
  if (b.atmo) { b.atmoMesh = atmosphereMesh(b); b.group.add(b.atmoMesh); }
  if (b.rings) b.group.add(ringMesh(b));
  for (const spec of b.props || []) scatter(b, spec);
  if (b.sky) { b.skyC = new THREE.Color(b.sky); b.sunsetC = new THREE.Color(b.sunset); }
  if (b.deep) b.deepC = new THREE.Color(b.deep);
  if (b.fog) b.fogC = new THREE.Color(b.fog.color);
}

// =====================================================================
// NAVE
// =====================================================================
const SHIP_H = 1.6; // altura do centro da nave acima dos pés
// textura do casco: painéis claros com linhas de junção, rebites, faixa laranja e sujeira leve
function hullTexture() {
  const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), r = rng(88);
  x.fillStyle = '#d9dee4'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {                 // painéis com tom levemente diferente
    const pw = 60 + r() * 120, ph = 40 + r() * 90, px = r() * W, py = r() * H, k = 200 + r() * 30 | 0;
    x.fillStyle = `rgba(${k},${k + 4},${k + 9},.55)`; x.fillRect(px, py, pw, ph);
  }
  x.strokeStyle = 'rgba(60,66,74,.55)'; x.lineWidth = 2;
  for (let gx = 0; gx <= W; gx += 64) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = 0; gy <= H; gy += 96) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  x.fillStyle = 'rgba(70,75,82,.6)';
  for (let gx = 0; gx < W; gx += 64) for (let gy = 0; gy < H; gy += 12) { x.beginPath(); x.arc(gx + 4, gy, 1.3, 0, 7); x.fill(); }
  // faixa laranja + filete escuro (vira um anel ao redor da fuselagem)
  x.fillStyle = '#e8732a'; x.fillRect(0, 300, W, 26);
  x.fillStyle = '#2b3038'; x.fillRect(0, 330, W, 6);
  for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(40,40,40,${r() * .05})`; x.fillRect(r() * W, r() * H, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// painéis internos: cinza-escuro com junções, parafusos e luzinhas coloridas
function interiorTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), r = rng(61);
  x.fillStyle = '#3a3f47'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 18; i++) { const k = 52 + r() * 16 | 0; x.fillStyle = `rgb(${k},${k + 4},${k + 10})`; x.fillRect(r() * S, r() * S, 30 + r() * 70, 16 + r() * 40); }
  x.strokeStyle = 'rgba(15,17,20,.8)'; x.lineWidth = 2;
  for (let gx = 0; gx <= S; gx += 64) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, S); x.stroke(); }
  for (let gy = 0; gy <= S; gy += 42) { x.beginPath(); x.moveTo(0, gy); x.lineTo(S, gy); x.stroke(); }
  const cols = ['#ff9a3a', '#7fe9ff', '#7dffb0', '#ff5a4a'];
  for (let i = 0; i < 40; i++) { x.fillStyle = cols[i % 4]; x.fillRect(6 + r() * (S - 12), 6 + r() * (S - 12), 3, 3); }
  x.fillStyle = 'rgba(20,20,22,.9)';
  for (let gx = 0; gx < S; gx += 64) for (let gy = 0; gy < S; gy += 42) { x.beginPath(); x.arc(gx + 5, gy + 5, 1.6, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// telas do painel (canvas redesenhado algumas vezes por segundo em updateCockpit)
const mfd = ['nav', 'att'].map(() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { c, x: c.getContext('2d'), tex };
});
let mfdT = 0;
// vidro do HUD: mira e escalas verdes fixas
function hudGlassTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.strokeStyle = '#6dff9c'; x.fillStyle = '#6dff9c'; x.lineWidth = 3;
  x.beginPath(); x.arc(128, 128, 22, 0, 7); x.stroke();
  for (const [a, b, cc, d] of [[128, 90, 128, 104], [128, 152, 128, 166], [90, 128, 104, 128], [152, 128, 166, 128]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(cc, d); x.stroke(); }
  x.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { if (!i) continue; const y = 128 + i * 30; x.beginPath(); x.moveTo(60, y); x.lineTo(96, y); x.moveTo(160, y); x.lineTo(196, y); x.stroke(); }
  x.font = '16px monospace'; x.fillText('SPD', 14, 30); x.fillText('ALT', 206, 30);
  const t = new THREE.CanvasTexture(c); return t;
}

// caixa afunilada: a face da frente (-Z) ou de trás (+Z) encolhe e desce — dá o visual facetado
function taperBox(w, h, d, sx, sy, dy, front = true) {
  const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if ((front && p.getZ(i) < 0) || (!front && p.getZ(i) > 0)) p.setXYZ(i, p.getX(i) * sx, p.getY(i) * sy + dy, p.getZ(i));
  }
  g.computeVertexNormals();
  return g;
}

function buildShip() {
  const g = new THREE.Group();
  const hullTex = hullTexture();
  const hull = new THREE.MeshStandardMaterial({ map: hullTex, metalness: .45, roughness: .4, flatShading: true });
  const hullFlat = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: .45, roughness: .42, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x272c34, metalness: .6, roughness: .45, flatShading: true });
  const gun = new THREE.MeshStandardMaterial({ color: 0x5a616b, metalness: .85, roughness: .3, flatShading: true });
  const acc = new THREE.MeshStandardMaterial({ color: 0xe8732a, metalness: .2, roughness: .45, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9cc8e8, metalness: .2, roughness: .04, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide });
  const glow = new THREE.MeshBasicMaterial({ color: 0x7fdcff, toneMapped: false });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  // viga quadrada entre dois pontos
  const beam = (a, b, t, mat, parent = g) => {
    const d = new V3().subVectors(b, a), m = new THREE.Mesh(new THREE.BoxGeometry(t, d.length(), t), mat);
    m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(UPY, d.normalize()); parent.add(m); return m;
  };

  // ----- fuselagem em blocos: nariz afunilado, seção do cockpit (aberta em cima), corpo traseiro -----
  add(taperBox(2.3, 1.95, 1.7, .32, .42, -.25), hull, 0, .025, -4.55);                  // nariz (z -5.4 .. -3.7)
  box(.55, 1.95, 3.4, hull, -.875, .025, -2.0);                                          // parede esquerda do cockpit
  box(.55, 1.95, 3.4, hull, .875, .025, -2.0);                                           // parede direita
  box(1.2, 1.1, 3.4, hull, 0, -.4, -2.0);                                                // ventre sob o piso
  add(taperBox(2.3, 1.8, 3.7, .82, .8, -.05, false), hull, 0, -.05, 1.55);               // corpo traseiro (z -0.3 .. 3.4)
  box(.5, .26, 2.6, hullFlat, 0, .97, 1.4);                                              // espinha dorsal
  box(1.5, .1, 6.6, dark, 0, -1.0, -1.0);                                                // placa ventral
  for (const s of [-1, 1]) {
    box(.06, .3, 4.2, acc, s * 1.17, .25, -1.6);                                         // faixa laranja lateral
    box(.4, .5, .9, dark, s * 1.25, -.25, .25);                                          // entradas de ar
  }

  // ----- canopy anguloso (perfil extrudado), com dobradiça na traseira -----
  const canopy = new THREE.Group(); canopy.position.set(0, 1.0, -.3); g.add(canopy);    // pivô: aresta traseira de baixo
  const prof = [[-3.7, 1.0], [-2.7, 1.42], [-.9, 1.48], [-.3, 1.3], [-.3, 1.0]];
  const shp = new THREE.Shape();
  prof.forEach(([z, y], i) => { const px = -(z + .3), py = y - 1.0; i ? shp.lineTo(px, py) : shp.moveTo(px, py); });
  shp.closePath();
  // forma no plano XY (x = -(z+0.3), y = altura); extruda 1.32 de largura e gira pra Z ficar pra frente
  const cGeo = new THREE.ExtrudeGeometry(shp, { depth: 1.32, bevelEnabled: false }).translate(0, 0, -.66).rotateY(Math.PI / 2);
  const cMesh = new THREE.Mesh(cGeo, glass); canopy.add(cMesh);
  // moldura: arestas do perfil nos dois lados + travessas
  for (const sx of [-.66, .66]) for (let i = 0; i < prof.length - 1; i++) {
    const a = new V3(sx, prof[i][1] - 1.0, prof[i][0] + .3), b = new V3(sx, prof[i + 1][1] - 1.0, prof[i + 1][0] + .3);
    beam(a, b, .06, dark, canopy);
  }
  for (const [z, y] of prof.slice(1, 4)) beam(new V3(-.66, y - 1.0, z + .3), new V3(.66, y - 1.0, z + .3), .06, dark, canopy);
  box(1.3, .5, .25, dark, 0, .85, -.12);                                                 // anteparo atrás do assento
  box(1.2, .1, .1, gun, 0, 1.0, -.3);                                                    // eixo da dobradiça

  // ----- poço do cockpit: paredes internas, piso, borda -----
  const inTex = interiorTexture(); inTex.repeat.set(3, 1);
  const wallM = new THREE.MeshStandardMaterial({ map: inTex, roughness: .75, metalness: .3 });
  const padM = new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: .95, flatShading: true });
  const seatM = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: .85, flatShading: true });
  const panelM = new THREE.MeshStandardMaterial({ color: 0x23272d, roughness: .6, metalness: .4, flatShading: true });
  const plane = (w, h, mat, x, y, z, ry) => { const m = add(new THREE.PlaneGeometry(w, h), mat, x, y, z); m.rotation.y = ry; return m; };
  plane(3.4, .85, wallM, -.598, .575, -2.0, Math.PI / 2);                               // interna esquerda (olha pra +X)
  plane(3.4, .85, wallM, .598, .575, -2.0, -Math.PI / 2);                               // interna direita
  plane(1.2, .85, wallM, 0, .575, -3.698, 0);                                            // fundo da frente
  plane(1.2, .85, wallM, 0, .575, -.302, Math.PI);                                       // fundo de trás
  add(new THREE.PlaneGeometry(1.2, 3.4).rotateX(-Math.PI / 2), padM, 0, .152, -2.0);    // piso
  for (const s of [-1, 1]) box(.08, .07, 3.4, padM, s * .62, 1.02, -2.0);                // borda acolchoada
  box(1.32, .07, .08, padM, 0, 1.02, -3.66);

  // assento
  box(.5, .14, .5, seatM, 0, .34, -1.6);
  box(.52, .78, .12, seatM, 0, .74, -1.3).rotation.x = .18;
  box(.32, .2, .1, seatM, 0, 1.2, -1.2).rotation.x = .18;
  for (const sx of [-.28, .28]) box(.06, .5, .14, seatM, sx, .72, -1.33).rotation.x = .18;
  for (const sx of [-.12, .12]) box(.05, .6, .02, acc, sx, .78, -1.39).rotation.x = .18;

  // painel, telas, LEDs, vidro do HUD
  box(.98, .4, .1, panelM, 0, .78, -2.6).rotation.x = -.42;
  box(1.1, .05, .32, padM, 0, .99, -2.66);
  for (const [i, sx] of [[0, -.24], [1, .24]]) add(new THREE.PlaneGeometry(.36, .3), new THREE.MeshBasicMaterial({ map: mfd[i].tex, toneMapped: false }), sx, .8, -2.53).rotation.x = -.42;
  const ledCols = [0xff9a3a, 0x7fe9ff, 0x7dffb0, 0xff5a4a];
  for (let i = 0; i < 12; i++) box(.035, .02, .035, new THREE.MeshBasicMaterial({ color: ledCols[i % 4], toneMapped: false }),
    -.42 + (i % 6) * .17, .61 + Math.floor(i / 6) * .045, -2.5 + Math.floor(i / 6) * .02).rotation.x = -.42;
  add(new THREE.PlaneGeometry(.3, .24), new THREE.MeshBasicMaterial({ map: hudGlassTexture(), transparent: true, opacity: .55,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), 0, 1.13, -2.58).rotation.x = -.25;
  // manche, manete, consoles
  beam(new V3(0, .15, -2.08), new V3(0, .58, -2.0), .05, gun);
  box(.08, .14, .08, padM, 0, .64, -2.0);
  box(.16, .14, .9, panelM, -.42, .5, -1.85);
  box(.16, .14, .9, panelM, .42, .5, -1.85);
  beam(new V3(-.42, .57, -1.85), new V3(-.42, .72, -1.95), .04, gun);
  box(.06, .05, .08, acc, -.42, .73, -1.96);
  for (let i = 0; i < 5; i++) for (const sx of [-.42, .42]) box(.03, .015, .03, new THREE.MeshBasicMaterial({ color: ledCols[(i + (sx > 0 ? 2 : 0)) % 4], toneMapped: false }), sx + (i % 2 ? .03 : -.03), .575, -1.6 - i * .12);
  const cabin = new THREE.PointLight(0x9fd8ff, .5, 2.6, 2); cabin.position.set(0, 1.15, -2.0); g.add(cabin);

  // ----- piloto em blocos -----
  const pilot = new THREE.Group(); g.add(pilot);
  const suitM = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: .7, flatShading: true });
  const visorM = new THREE.MeshStandardMaterial({ color: 0xc9902a, metalness: .95, roughness: .12 });
  const gloveM = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: .8, flatShading: true });
  const pb = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); pilot.add(m); return m; };
  pb(.4, .4, .42, suitM, 0, 1.1, -1.62);                                                 // capacete
  const vis = new THREE.Mesh(new THREE.PlaneGeometry(.32, .2), visorM); vis.position.set(0, 1.12, -1.835); vis.rotation.y = Math.PI; pilot.add(vis); // viseira (só por fora)
  pb(.44, .48, .3, suitM, 0, .72, -1.52);                                                // tronco
  pb(.36, .4, .14, suitM, 0, .76, -1.32);                                                // mochila
  pb(.24, .1, .03, acc, 0, .84, -1.68);                                                  // painel do peito
  for (const sx of [-1, 1]) {
    const sh = new V3(sx * .24, .88, -1.52), el = new V3(sx * .27, .62, -1.78);
    const hand = sx < 0 ? new V3(-.42, .72, -1.95) : new V3(0, .64, -2.0);
    beam(sh, el, .12, suitM, pilot); beam(el, hand, .1, suitM, pilot);
    pb(.11, .11, .11, gloveM, hand.x, hand.y, hand.z);
    const hip = new V3(sx * .12, .45, -1.6), knee = new V3(sx * .14, .5, -2.12), foot = new V3(sx * .14, .22, -2.35);
    beam(hip, knee, .15, suitM, pilot); beam(knee, foot, .13, suitM, pilot);
    pb(.13, .1, .22, gloveM, foot.x, .2, foot.z - .04);
  }
  pilot.visible = false;

  // ----- asas (sem chanfro: arestas retas) -----
  const wingGeo = s => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -1.4); sh.lineTo(4.4 * s, 1.2); sh.lineTo(4.7 * s, 2.1); sh.lineTo(4.2 * s, 2.3); sh.lineTo(0, 2.5); sh.closePath();
    return new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, .1, 0);
  };
  for (const s of [-1, 1]) {
    add(wingGeo(s), hullFlat, s * .9, -.35, 0).rotation.z = s * .06;
    box(.25, .32, 1.2, acc, s * 5.55, -.38, 1.6);
    box(1.6, .03, .5, acc, s * 3.6, -.22, 1.2).rotation.y = s * -.5;
  }
  // derivas
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(1.6, 0); finShape.lineTo(1.9, 1.7); finShape.lineTo(1.2, 1.8); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: .14, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(.07, 0, 0);
  for (const s of [-1, 1]) add(finGeo.clone(), hullFlat, s * .7, .7, 1.4).rotation.z = s * -.42;

  // ----- naceles quadradas -----
  for (const s of [-1, 1]) {
    const x = s * 1.6;
    add(taperBox(1.05, 1.0, 3.0, .85, .85, 0), hullFlat, x, -.3, 2.2);
    box(.8, .75, .12, dark, x, -.3, .66);                                                // entrada
    for (const [w, h, ox, oy] of [[1.1, .1, 0, .5], [1.1, .1, 0, -.5], [.1, 1.0, .5, 0], [.1, 1.0, -.5, 0]]) box(w, h, .5, gun, x + ox, -.3 + oy, 3.9); // bocal (moldura)
    add(new THREE.PlaneGeometry(.9, .9), glow, x, -.3, 3.72);                            // brilho interno
    box(1.12, 1.07, .1, acc, x, -.3, 1.2);                                               // anel laranja
  }

  // ----- trem de pouso -----
  for (const [x, z] of [[1.5, 1.7], [-1.5, 1.7], [0, -2.6]]) {
    beam(new V3(x * .6, -.95, z - .3), new V3(x, -SHIP_H + .08, z), .14, gun);
    beam(new V3(x * .6, -.95, z + .4), new V3(x, -1.2, z), .09, dark);
    box(.55, .08, .55, dark, x, -SHIP_H + .04, z);
  }

  // ----- luzes de navegação e estrobo (cubinhos) -----
  const lamp = (col, x, y, z) => box(.16, .16, .16, new THREE.MeshBasicMaterial({ color: col, toneMapped: false }), x, y, z);
  const navL = lamp(0xff3030, -5.7, -.38, 1.6), navR = lamp(0x30ff60, 5.7, -.38, 1.6);
  const strobe = lamp(0xffffff, 0, 1.15, 2.6);
  const engLight = new THREE.PointLight(0x7fdcff, 0, 14, 2); engLight.position.set(0, -.3, 4.6); g.add(engLight);

  // ----- chamas de 4 lados -----
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flames = [];
  for (const s of [-1, 1]) {
    const f = add(new THREE.ConeGeometry(.6, 3, 4, 1, true).rotateY(Math.PI / 4).translate(0, 1.5, 0).rotateX(Math.PI / 2), flameMat, s * 1.6, -.3, 3.95);
    f.add(new THREE.Mesh(new THREE.ConeGeometry(.28, 1.6, 4, 1, true).rotateY(Math.PI / 4).translate(0, .8, 0).rotateX(Math.PI / 2), coreMat));
    flames.push(f);
  }
  g.userData.flames = flames;
  g.userData.blink = { navL, navR, strobe, engLight };
  g.userData.canopy = canopy; g.userData.pilot = pilot;
  return g;
}

const ship = {
  group: buildShip(), pos: new V3(), q: new Q(), vel: new V3(),
  body: null, dir: new V3(), ground: new V3(),
  target: 0, thrust: 0,
};
scene.add(ship.group);

function alignedQ(up, fwdHint, out) {
  const f = _aq1.copy(fwdHint).addScaledVector(up, -fwdHint.dot(up));
  if (f.lengthSq() < 1e-6) { f.set(1, 0, 0).addScaledVector(up, -up.x); if (f.lengthSq() < 1e-6) f.set(0, 0, 1); }
  f.normalize();
  const right = _aq2.crossVectors(f, up).normalize();
  _aqm.makeBasis(right, up, _aq3.copy(f).negate());
  return out.setFromRotationMatrix(_aqm);
}
const _aq1 = new V3(), _aq2 = new V3(), _aq3 = new V3(), _aqm = new THREE.Matrix4();

function parkShip(b, dir, fwdHint) {
  const d = dir.clone().normalize(), gr = groundR(b, d);
  ship.body = b; ship.dir.copy(d);
  ship.ground.copy(b.center).addScaledVector(d, gr);
  ship.pos.copy(b.center).addScaledVector(d, gr + SHIP_H);
  alignedQ(d, fwdHint, ship.q);
  ship.vel.set(0, 0, 0);
}

// ponto de pouso: lado do dia, um pouco fora do meio-dia (sombras mais bonitas); na Terra, em terra firme
function pickLandingDir(b) {
  const sun = new V3().copy(b.center).negate().normalize(), d = new V3(), loc = new V3();
  let best = null, bs = -1e9;
  for (let i = 0; i < 500; i++) {
    randDir(Math.random, d);
    const s = d.dot(sun);
    if (s < .3) continue;
    let score = -Math.abs(s - .82);
    if (b.sea) {
      loc.copy(d).applyQuaternion(b.qInv);
      b.height(loc.x, loc.y, loc.z);
      if (RAW <= .06) score -= 5;
    }
    if (score > bs) { bs = score; best = d.clone(); }
  }
  return best || sun;
}

// =====================================================================
// JOGADOR / ESTADO
// =====================================================================
let mode = 'foot'; // foot | fly | landing | takeoff
let started = false;
const player = { pos: new V3(), f: new V3(), hv: new V3(), vr: 0, pitch: 0, grounded: true, body: null, inWater: false, eye: 1.7 };
const camQ = new Q();
let anim = null;

// ---------- entrada ----------
const keys = new Set();
const look = { dx: 0, dy: 0 };
const joy = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
let lookId = null, lookX = 0, lookY = 0, lookSX = 0, lookSY = 0;   // S = onde o dedo encostou (centro do manche em voo)
let jumpQ = false, actQ = false, boostHeld = false;
const isTouch = LOWQ;
if (isTouch) document.body.classList.add('touch');
const key = c => keys.has(c);

addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (!started) return;
  if (e.code === 'Space') jumpQ = true;
  if (e.code === 'KeyE') actQ = true;
  if (e.code === 'KeyQ') cycleTarget(-1);
  if (e.code === 'KeyR') cycleTarget(1);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

canvas.addEventListener('click', () => { if (started && !isTouch && document.pointerLockElement !== canvas) canvas.requestPointerLock(); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  look.dx += e.movementX; look.dy += e.movementY;
});

const stickEl = document.getElementById('stick'), nubEl = document.getElementById('nub');
const steerEl = document.getElementById('steer'), steerNub = document.getElementById('steerNub');
// sem zoom por pinça, sem menu de toque longo
for (const ev of ['gesturestart', 'gesturechange', 'contextmenu']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth / 2 && joy.id === null) {
      joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; joy.x = joy.y = 0;
      stickEl.style.display = 'block';
      stickEl.style.left = (t.clientX - 60) + 'px'; stickEl.style.top = (t.clientY - 60) + 'px';
      nubEl.style.left = '32px'; nubEl.style.top = '32px';
    } else if (lookId === null) {
      lookId = t.identifier; lookX = lookSX = t.clientX; lookY = lookSY = t.clientY;
      if (mode === 'fly') {
        steerEl.style.display = 'block';
        steerEl.style.left = (t.clientX - 60) + 'px'; steerEl.style.top = (t.clientY - 60) + 'px';
        steerNub.style.left = '32px'; steerNub.style.top = '32px';
      }
    }
  }
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) {
      let dx = t.clientX - joy.ox, dy = t.clientY - joy.oy;
      const len = Math.hypot(dx, dy), max = 55;
      if (len > max) { dx *= max / len; dy *= max / len; }
      joy.x = dx / max; joy.y = -dy / max;
      nubEl.style.left = (32 + dx) + 'px'; nubEl.style.top = (32 + dy) + 'px';
    } else if (t.identifier === lookId) {
      if (mode !== 'fly') { look.dx += (t.clientX - lookX) * 2; look.dy += (t.clientY - lookY) * 2; }
      lookX = t.clientX; lookY = t.clientY;
      if (mode === 'fly') {
        let dx = lookX - lookSX, dy = lookY - lookSY;
        const len = Math.hypot(dx, dy); if (len > 55) { dx *= 55 / len; dy *= 55 / len; }
        steerNub.style.left = (32 + dx) + 'px'; steerNub.style.top = (32 + dy) + 'px';
      }
    }
  }
}, { passive: false });
const touchEnd = e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; stickEl.style.display = 'none'; }
    if (t.identifier === lookId) { lookId = null; steerEl.style.display = 'none'; }
  }
};
canvas.addEventListener('touchend', touchEnd);
canvas.addEventListener('touchcancel', touchEnd);

function bindBtn(id, down, up) {
  const el = document.getElementById(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); down(); });
  if (up) { el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up); }
  return el;
}
bindBtn('bJump', () => { jumpQ = true; });
bindBtn('bAct', () => { actQ = true; });
const bBoost = bindBtn('bBoost', () => { boostHeld = true; bBoost.classList.add('on'); }, () => { boostHeld = false; bBoost.classList.remove('on'); });
bindBtn('bPrev', () => cycleTarget(-1));
bindBtn('bNext', () => cycleTarget(1));

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const hud = {
  locName: $('locName'), locSub: $('locSub'), prompt: $('prompt'), warn: $('warn'), help: $('helpline'),
  tgtpanel: $('tgtpanel'), tgtName: $('tgtName'), bAct: $('bAct'),
  bJump: $('bJump'), bBoost: $('bBoost'),
  compass: $('compass'), tape: $('tape'), cmark: $('cmark'), hdg: $('hdg'),
  envHead: $('envHead'), envSub: $('envSub'),
  k: [0, 1, 2, 3, 4, 5].map(i => $('k' + i)), v: [0, 1, 2, 3, 4, 5].map(i => $('v' + i)), r: [0, 1, 2, 3, 4, 5].map(i => $('r' + i)),
};
const cache = {};
function setText(el, k, txt) { if (cache[k] !== txt) { cache[k] = txt; el.innerHTML = txt; } }
function setShow(el, k, on, disp = 'block') { const v = on ? disp : 'none'; if (cache['s' + k] !== v) { cache['s' + k] = v; el.style.display = v; } }
function setCls(el, k, cls) { if (cache['c' + k] !== cls) { cache['c' + k] = cls; el.className = cls; } }

let warnT = 0;
function warn(msg) { hud.warn.textContent = msg; warnT = .4; }

// ---------- dados de ambiente por corpo ----------
const ENV = {
  mercury: ['167 °C', 'NONE'], venus: ['465 °C', 'CO₂ 96%'], earth: ['15 °C', 'N₂ 78% O₂ 21%'],
  moon: ['-20 °C', 'NONE'], mars: ['-63 °C', 'CO₂ 95%'], jupiter: ['-110 °C', 'H₂ 90% He'],
  saturn: ['-140 °C', 'H₂ 96% He'], uranus: ['-195 °C', 'H₂ He CH₄'], neptune: ['-200 °C', 'H₂ He CH₄'],
};
const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');
const fmtLat = (v, p, n) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? p : n}`;

// ---------- bússola (fita) ----------
const PX_DEG = 2.2;
{
  let html = '';
  const card = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = -180; d <= 540; d += 5) {
    const x = (d + 180) * PX_DEG, dd = ((d % 360) + 360) % 360;
    if (d % 15 === 0) {
      const lbl = card[dd];
      html += `<b class="${lbl ? 'c' : ''}" style="left:${x}px">${lbl || pad(dd, 3)}</b>`;
    }
    html += `<s class="${d % 15 === 0 ? 'l' : ''}" style="left:${x}px"></s>`;
  }
  hud.tape.innerHTML = html;
}

function cycleTarget(d) {
  ship.target = (ship.target + d + PLANETS.length) % PLANETS.length;
}
// rótulos
const labelsEl = $('labels');
const labels = [];
for (const b of BODIES) {
  const el = document.createElement('div'); el.className = 'lbl';
  el.innerHTML = `<em></em><span>${b.name}</span><i></i>`;
  labelsEl.appendChild(el);
  labels.push({ b, el, dist: el.querySelector('i'), vis: false });
}
const shipLabel = document.createElement('div');
shipLabel.className = 'lbl ship'; shipLabel.innerHTML = '<em></em><span>Your ship</span><i></i>';
labelsEl.appendChild(shipLabel);
const shipLabelDist = shipLabel.querySelector('i');

const fmtDist = d => d >= 1000 ? (d / 1000).toFixed(1) + 'k' : Math.round(d) + ' m';

// =====================================================================
// LÓGICA — A PÉ
// =====================================================================
const _up = new V3(), _right = new V3(), _wish = new V3(), _tmp = new V3(), _tmp2 = new V3(), _q1 = new Q(), _m = new THREE.Matrix4();
const AX = new V3(1, 0, 0), AY = new V3(0, 1, 0);
const FOOT_SENS = isTouch ? .0028 : .0022, FLY_SENS = isTouch ? .0022 : .0016;
const EYE = 1.7, JUMP_V = 5.5;

function nearShip() { return ship.body === player.body && player.pos.distanceTo(ship.ground) < 7.5; }

function updateFoot(dt) {
  const b = player.body, c = b.center;
  _up.copy(player.pos).sub(c).normalize();

  player.f.applyAxisAngle(_up, -look.dx * FOOT_SENS);
  player.pitch = clamp(player.pitch - look.dy * FOOT_SENS, -1.45, 1.45);
  player.f.addScaledVector(_up, -player.f.dot(_up)).normalize();
  _right.crossVectors(player.f, _up).normalize();

  let mx = (key('KeyD') || key('ArrowRight') ? 1 : 0) - (key('KeyA') || key('ArrowLeft') ? 1 : 0) + joy.x;
  let my = (key('KeyW') || key('ArrowUp') ? 1 : 0) - (key('KeyS') || key('ArrowDown') ? 1 : 0) + joy.y;
  const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
  const run = key('ShiftLeft') || key('ShiftRight') || Math.hypot(joy.x, joy.y) > .92;
  const speed = (run ? 11 : 5.5) * (player.inWater ? .4 : 1);
  _wish.copy(player.f).multiplyScalar(my * speed).addScaledVector(_right, mx * speed);
  player.hv.lerp(_wish, 1 - Math.exp(-(player.grounded ? 12 : 2.5) * dt));
  player.hv.addScaledVector(_up, -player.hv.dot(_up));

  if (jumpQ && player.grounded) { player.vr = JUMP_V; player.grounded = false; }
  player.vr -= b.g * dt;
  player.pos.addScaledVector(player.hv, dt).addScaledVector(_up, player.vr * dt);

  // colisão com rochas/árvores e com a nave (empurra no plano tangente)
  const pushOut = (p, r) => {
    _tmp.copy(player.pos).sub(p);
    if (_tmp.lengthSq() > (r + 3) ** 2) return;
    _tmp.addScaledVector(_up, -_tmp.dot(_up));
    const d = _tmp.length(), min = r + .4;
    if (d < min && d > 1e-4) player.pos.addScaledVector(_tmp, (min - d) / d);
  };
  for (const col of b.colliders) pushOut(col.p, col.r);
  if (ship.body === b) pushOut(ship.ground, 3.2);

  // chão
  _tmp.copy(player.pos).sub(c);
  let r = _tmp.length(); _tmp.divideScalar(r);
  const gr = groundR(b, _tmp);
  player.inWater = !!b.sea && RAW <= 0;
  if (r <= gr || (player.grounded && player.vr <= 0 && r - gr < .45)) {
    r = gr; if (player.vr < 0) player.vr = 0; player.grounded = true;
  } else player.grounded = false;
  player.pos.copy(c).addScaledVector(_tmp, r);

  if (actQ && nearShip()) board();
}

function footCamera() {
  const c = player.body.center;
  _up.copy(player.pos).sub(c).normalize();
  player.f.addScaledVector(_up, -player.f.dot(_up)).normalize();
  _right.crossVectors(player.f, _up).normalize();
  _m.makeBasis(_right, _up, _tmp.copy(player.f).negate());
  camera.quaternion.setFromRotationMatrix(_m).multiply(_q1.setFromAxisAngle(AX, player.pitch));
  player.eye += ((player.inWater ? 1.05 : EYE) - player.eye) * .15;   // na água a câmera desce (andando com água pela cintura)
  camera.position.copy(player.pos).addScaledVector(_up, player.eye);
}

// =====================================================================
// LÓGICA — NAVE
// =====================================================================
const CRUSH = .22; // profundidade máxima num gasoso (fração do raio)
let inGas = null, gasDepth = 0, gasNear = null; // estado do mergulho em gigante gasoso
const _fwd = new V3();

function nearestPlanet(p) {
  let best = null, alt = Infinity;
  for (const b of PLANETS) { const a = p.distanceTo(b.center) - b.R; if (a < alt) { alt = a; best = b; } }
  return { b: best, alt };
}

// perto de um planeta, gira a nave em torno do próprio eixo até o "teto" dela apontar pro céu local
const _lu = new V3(), _cu = new V3(), _cx = new V3();
function autoLevel(dt) {
  const nb = nearestPlanet(ship.pos);
  const w = 1 - smooth(nb.b.R * .6, nb.b.R * 1.6, nb.alt);
  if (w <= 0) return;
  _lu.copy(ship.pos).sub(nb.b.center).normalize();
  _lu.addScaledVector(_fwd, -_lu.dot(_fwd));
  if (_lu.lengthSq() < .01) return;          // apontando reto pra cima/baixo: não há "horizonte"
  _lu.normalize();
  _cu.set(0, 1, 0).applyQuaternion(ship.q);
  const ang = Math.atan2(_cx.crossVectors(_cu, _lu).dot(_fwd), _cu.dot(_lu));
  ship.q.premultiply(_q1.setFromAxisAngle(_fwd, ang * Math.min(1, 2.2 * w * dt))).normalize();
}

let canLand = null, landBlock = null;
function updateFly(dt) {
  _fwd.set(0, 0, -1).applyQuaternion(ship.q);
  const th = (key('KeyW') || key('ArrowUp') ? 1 : 0) - (key('KeyS') || key('ArrowDown') ? 1 : 0) + joy.y;

  {
    const yawIn = (key('KeyA') || key('ArrowLeft') ? 1 : 0) - (key('KeyD') || key('ArrowRight') ? 1 : 0) - joy.x;
    ship.q.multiply(_q1.setFromAxisAngle(AY, yawIn * 1.3 * dt - look.dx * FLY_SENS));
    ship.q.multiply(_q1.setFromAxisAngle(AX, -look.dy * FLY_SENS));
    if (lookId !== null) {   // manche virtual: quanto mais longe do ponto de toque, mais rápido gira (zona morta pequena)
      const dz = v => Math.sign(v) * Math.max(0, Math.abs(v) - .12) / .88;
      const sx = dz(clamp((lookX - lookSX) / 70, -1, 1)), sy = dz(clamp((lookY - lookSY) / 70, -1, 1));
      ship.q.multiply(_q1.setFromAxisAngle(AY, -sx * 1.7 * dt));
      ship.q.multiply(_q1.setFromAxisAngle(AX, -sy * 1.4 * dt));
    }
    ship.q.normalize();
    _fwd.set(0, 0, -1).applyQuaternion(ship.q);
    autoLevel(dt);

    const boost = key('ShiftLeft') || key('ShiftRight') || boostHeld;
    const acc = boost ? 1500 : 260;
    ship.vel.addScaledVector(_fwd, th * acc * dt);
    ship.vel.multiplyScalar(Math.exp(-.55 * dt));
    // perto de planetas a velocidade máxima cai (não dá pra chegar raspando a 1000 m/s)
    const nb = nearestPlanet(ship.pos);
    let cap = Math.max(25, nb.alt * 1.5);
    if (nb.b.gas) cap = nb.alt > 0 ? Math.max(80, nb.alt * 1.5) : Math.max(35, 420 * (1 + nb.alt / (CRUSH * nb.b.R)));
    const len = ship.vel.length();
    if (len > cap) ship.vel.setLength(Math.max(cap, len * Math.exp(-4 * dt)));
    ship.thrust = Math.max(0, th) * (boost ? 1.6 : 1);
  }

  ship.pos.addScaledVector(ship.vel, dt);

  // colisão com planetas rochosos; nos gasosos, mergulho até a pressão esmagar
  inGas = null; gasDepth = 0;
  for (const b of PLANETS) {
    _tmp.copy(ship.pos).sub(b.center);
    const r = _tmp.length();
    if (b.gas) {
      if (r >= b.R) continue;
      inGas = b; gasDepth = (b.R - r) / b.R;
      if (gasDepth > CRUSH) {
        _tmp.divideScalar(r);
        ship.pos.copy(b.center).addScaledVector(_tmp, b.R * (1 - CRUSH));
        const vr = ship.vel.dot(_tmp); if (vr < 0) ship.vel.addScaledVector(_tmp, -vr * 1.3);
        gasDepth = CRUSH;
        warn('HULL PRESSURE CRITICAL — CLIMB');
      } else if (gasDepth > CRUSH * .7) warn('PRESSURE WARNING');
      continue;
    }
    if (r > b.R + 30) continue;
    _tmp.divideScalar(r);
    const min = groundR(b, _tmp) + 2.5;
    if (r < min) {
      ship.pos.copy(b.center).addScaledVector(_tmp, min);
      const vr = ship.vel.dot(_tmp);
      if (vr < 0) ship.vel.addScaledVector(_tmp, -vr);
    }
  }
  // sol
  const sd = ship.pos.length();
  if (sd < SUN.R + 120) {
    _tmp.copy(ship.pos).divideScalar(sd);
    ship.pos.copy(_tmp).multiplyScalar(SUN.R + 120);
    const vr = ship.vel.dot(_tmp); if (vr < 0) ship.vel.addScaledVector(_tmp, -vr * 1.5);
    warn('HULL MELTING — PULL AWAY');
  } else if (sd < SUN.R + 350) warn('HEAT WARNING');

  const nb = nearestPlanet(ship.pos);
  const close = nb.alt < Math.max(80, nb.b.R * .7);
  canLand = (close && !nb.b.gas) ? nb.b : null;
  landBlock = null;
  if (canLand && canLand.sea) {
    groundR(canLand, _tmp.copy(ship.pos).sub(canLand.center).normalize());
    if (RAW <= .02) { landBlock = 'WATER BELOW · FIND LAND TO SET DOWN'; canLand = null; }
  }
  gasNear = (close && nb.b.gas && !inGas) ? nb.b : null;
  if (actQ && canLand) startLanding(canLand, _tmp.copy(ship.pos).sub(canLand.center));
}

function startLanding(b, dirW) {
  mode = 'landing'; ship.vel.set(0, 0, 0);
  const d1 = dirW.clone().normalize();
  const d0 = ship.pos.clone().sub(b.center); const r0 = d0.length(); d0.divideScalar(r0);
  _fwd.set(0, 0, -1).applyQuaternion(ship.q);
  anim = { b, d0, d1, r0, r1: groundR(b, d1) + SHIP_H, q0: ship.q.clone(), q1: alignedQ(d1, _fwd, new Q()), t: 0, dur: 3.2 };
}
function updateLanding(dt) {
  anim.t += dt;
  const k = ease(Math.min(1, anim.t / anim.dur));
  _tmp.copy(anim.d0).lerp(anim.d1, k).normalize();
  ship.pos.copy(anim.b.center).addScaledVector(_tmp, L(k, anim.r0, anim.r1));
  ship.q.slerpQuaternions(anim.q0, anim.q1, k);
  ship.thrust = .35 * (1 - k);
  if (anim.t >= anim.dur) {
    parkShip(anim.b, anim.d1, _fwd.set(0, 0, -1).applyQuaternion(ship.q));
    startExit();
  }
}

// ----- cenas de embarque e desembarque (câmera em 1ª pessoa entre pontos-chave) -----
const SEAT_EYE = new V3(0, 1.13, -1.74);     // olho do piloto (local da nave)
const SIDE_PT = new V3(2.3, 1.7, -1.9);     // ao lado do cockpit, em cima da asa direita
let cut = null;
const _cp = new V3(), _cq = new Q(), _cq2 = new Q(), _cm = new THREE.Matrix4();
const shipToWorld = (local, out) => out.copy(local).applyQuaternion(ship.q).add(ship.pos);
const lookQ = (from, to, up, out) => out.setFromRotationMatrix(_cm.lookAt(from, to, up));
function chasePose(outP, outQ) {
  outQ.copy(ship.q).multiply(_q1.setFromAxisAngle(AX, -.08));
  outP.copy(ship.pos).add(_tmp2.set(0, 3.2, 13).applyQuaternion(ship.q));
}
function seatPose(outP, outQ) { shipToWorld(SEAT_EYE, outP); outQ.copy(ship.q); }
// pose de quem está em cima da asa olhando pra um ponto
function sidePose(outP, outQ, lookLocal) {
  shipToWorld(SIDE_PT, outP);
  lookQ(outP, shipToWorld(lookLocal, _tmp2), ship.dir, outQ);
}
// interpola a câmera por uma lista de poses [{t, p, q}] (tempo em segundos)
function playPoses(keys, t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], k = ease(clamp((t - a.t) / (b.t - a.t), 0, 1));
  camera.position.lerpVectors(a.p, b.p, k);
  camera.quaternion.slerpQuaternions(a.q, b.q, k);
}
const pose = (t, fn, ...args) => { const p = new V3(), q = new Q(); fn(p, q, ...args); return { t, p, q }; };
const canopyOpen = a => { ship.group.userData.canopy.rotation.x = a * 1.05; };

function board() {
  mode = 'boarding';
  // pose atual (olho do jogador) → asa → assento → atrás da nave
  const p0 = { t: 0, p: camera.position.clone(), q: camera.quaternion.clone() };
  cut = { t: 0, dur: 3.4, keys: [p0, pose(1.0, sidePose, new V3(0, .6, -2.2)), pose(1.8, seatPose), pose(2.6, seatPose), pose(3.4, chasePose)] };
  ship.target = (PLANETS.indexOf(ship.body) + 1) % PLANETS.length;
  if (document.pointerLockElement !== canvas && !isTouch && started) canvas.requestPointerLock?.();
}
function updateBoarding(dt) {
  cut.t += dt;
  const t = cut.t;
  canopyOpen(t < 1.8 ? smooth(0, .8, t) : 1 - smooth(1.9, 2.6, t));   // abre, você entra, fecha
  ship.group.userData.pilot.visible = t > 1.6;
  playPoses(cut.keys, t);
  if (t >= cut.dur) { cut = null; canopyOpen(0); startTakeoff(); }
}

function startExit() {
  mode = 'exiting';
  placePlayerOutside();   // já calcula onde o jogador vai ficar no chão
  const end = { p: new V3(), q: new Q() };
  footPose(end.p, end.q);
  const c0 = { t: 0, p: camera.position.clone(), q: camera.quaternion.clone() };
  cut = { t: 0, dur: 3.2, keys: [c0, pose(.8, seatPose), pose(1.5, sidePose, new V3(5, -1.4, -1.2)), { t: 2.5, ...end }, { t: 3.2, ...end }] };
}
function updateExiting(dt) {
  cut.t += dt;
  const t = cut.t;
  canopyOpen(t < 2.3 ? smooth(.4, 1.1, t) : 1 - smooth(2.4, 3.1, t));
  ship.group.userData.pilot.visible = t < .95;
  playPoses(cut.keys, t);
  if (t >= cut.dur) { cut = null; canopyOpen(0); mode = 'foot'; }
}

function startTakeoff() {
  mode = 'takeoff';
  anim = { p0: ship.pos.clone(), up: ship.dir.clone(), q0: ship.q.clone(),
    q1: ship.q.clone().multiply(new Q().setFromAxisAngle(AX, .95)), t: 0, dur: 2.4 };
  camQ.copy(ship.q);
}
function updateTakeoff(dt) {
  anim.t += dt;
  const k = ease(Math.min(1, anim.t / anim.dur));
  ship.pos.copy(anim.p0).addScaledVector(anim.up, 32 * k);
  ship.q.slerpQuaternions(anim.q0, anim.q1, k);
  ship.thrust = .6 + .4 * k;
  if (anim.t >= anim.dur) {
    mode = 'fly'; ship.body = null;
    ship.vel.set(0, 0, -40).applyQuaternion(ship.q);
  }
}

// pose da câmera a pé (mesma conta do footCamera, sem aplicar)
function footPose(outP, outQ) {
  _up.copy(player.pos).sub(player.body.center).normalize();
  _right.crossVectors(player.f, _up).normalize();
  _m.makeBasis(_right, _up, _tmp2.copy(player.f).negate());
  outQ.setFromRotationMatrix(_m).multiply(_q1.setFromAxisAngle(AX, player.pitch));
  outP.copy(player.pos).addScaledVector(_up, EYE);
}
function placePlayerOutside() {
  const b = ship.body;
  player.body = b;
  const up = ship.dir;
  _fwd.set(0, 0, -1).applyQuaternion(ship.q);
  _right.set(1, 0, 0).applyQuaternion(ship.q).addScaledVector(up, -_right.dot(up)).normalize();
  _tmp.copy(ship.ground).addScaledVector(_right, 6).sub(b.center).normalize();
  player.pos.copy(b.center).addScaledVector(_tmp, groundR(b, _tmp));
  player.f.copy(_fwd).addScaledVector(up, -_fwd.dot(up)).normalize();
  player.hv.set(0, 0, 0); player.vr = 0; player.pitch = 0; player.grounded = true; player.eye = EYE;
}

function chaseCamera(dt) {
  camQ.slerp(ship.q, 1 - Math.exp(-6 * dt));
  camera.quaternion.copy(camQ).multiply(_q1.setFromAxisAngle(AX, -.08));
  camera.position.copy(ship.pos).add(_tmp.set(0, 3.2, 13).applyQuaternion(camQ));
  // não deixa a câmera atravessar o terreno de um rochoso
  const nb = nearestPlanet(camera.position);
  if (!nb.b.gas && nb.alt < 40) {
    _tmp.copy(camera.position).sub(nb.b.center);
    const r = _tmp.length(); _tmp.divideScalar(r);
    const min = groundR(nb.b, _tmp) + 1.5;
    if (r < min) camera.position.copy(nb.b.center).addScaledVector(_tmp, min);
  }
  // turbulência dentro de um gasoso
  if (inGas && mode === 'fly') {
    const k = (.15 + gasDepth * 3) * Math.min(1, ship.vel.length() / 150 + .3);
    camera.position.x += (Math.random() - .5) * k; camera.position.y += (Math.random() - .5) * k; camera.position.z += (Math.random() - .5) * k;
  }
}

// =====================================================================
// CÉU, POEIRA, RÓTULOS, HUD
// =====================================================================
const dust = (() => {
  const N = 450, SIZE = 160, pos = new Float32Array(N * 3), r = rng(5);
  for (let i = 0; i < N * 3; i++) pos[i] = (r() - .5) * SIZE;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: .28, color: 0xaaccff, transparent: true, opacity: .65, depthWrite: false }));
  p.frustumCulled = false; scene.add(p);
  p.userData.SIZE = SIZE; return p;
})();
const _white = new THREE.Color(1, 1, 1);
function updateDust() {
  dust.visible = mode === 'fly' || mode === 'landing' || mode === 'takeoff';
  if (!dust.visible) return;
  // dentro de um gasoso a poeira vira fiapos de nuvem
  const dm = dust.material;
  if (inGas) { dm.size = 3.5; dm.opacity = .22; dm.color.copy(inGas.skyC).lerp(_white, .4); }
  else { dm.size = .28; dm.opacity = .65; dm.color.set(0xaaccff); }
  const a = dust.geometry.attributes.position.array, S = dust.userData.SIZE, h = S / 2, c = camera.position;
  for (let i = 0; i < a.length; i += 3) {
    a[i] = c.x + ((((a[i] - c.x + h) % S) + S) % S) - h;
    a[i + 1] = c.y + ((((a[i + 1] - c.y + h) % S) + S) % S) - h;
    a[i + 2] = c.z + ((((a[i + 2] - c.z + h) % S) + S) % S) - h;
  }
  dust.geometry.attributes.position.needsUpdate = true;
}

const _sky = new THREE.Color();
scene.fog = new THREE.FogExp2(0x000000, 0); // fica sempre ligado (densidade 0 = sem efeito) pra não recompilar shaders
function updateSky() {
  const eye = camera.position;
  stars.position.copy(eye); milkyWay.position.copy(eye);
  let f = 0, fogD = 0;
  _sky.setRGB(0, 0, 0);
  const nb = nearestPlanet(eye);
  const b = nb.b, dEye = eye.distanceTo(b.center);
  _tmp.copy(eye).sub(b.center).normalize();
  const sd = _tmp.dot(_tmp2.copy(eye).negate().normalize());
  if (b.gas && dEye < b.R) {
    // dentro das nuvens de um gigante gasoso: quanto mais fundo, mais escuro e denso
    const depth = (b.R - dEye) / b.R, day = .15 + .85 * smooth(-.2, .3, sd);
    _sky.copy(b.skyC).lerp(b.deepC, smooth(0, CRUSH, depth)).multiplyScalar(day);
    fogD = .0012 + depth * .05; f = 1;
  } else if (b.fog && dEye < b.R * b.fog.below) {
    // embaixo do deck de nuvens de Vênus: céu laranja fechado, visibilidade curta
    const day = .2 + .8 * smooth(-.2, .25, sd);
    _sky.copy(b.fogC).multiplyScalar(day);
    fogD = b.fog.density; f = 1;
  } else if (b.sky) {
    const day = smooth(-.15, .2, sd);
    const altF = 1 - smooth(b.R * .04, b.R * .5, nb.alt);
    f = day * altF;
    _sky.copy(b.sunsetC).lerp(b.skyC, smooth(0, .35, sd)).multiplyScalar(f);
  }
  scene.background.copy(_sky);
  scene.fog.color.copy(_sky);
  scene.fog.density = fogD;
  setStarFade(1 - f * .97);
  for (const p of PLANETS) if (p.atmoMesh) p.atmoMesh.visible = eye.distanceTo(p.center) > p.R * p.atmoScale;
}

const _cs = new V3(), _ndc = new V3();
function placeLabel(el, p, clampEdge) {
  _cs.copy(p).applyMatrix4(camera.matrixWorldInverse);
  const W = innerWidth, H = innerHeight, behind = _cs.z > 0;
  let x, y, edge = false;
  if (!behind) {
    _ndc.copy(p).project(camera);
    x = (_ndc.x * .5 + .5) * W; y = (-_ndc.y * .5 + .5) * H;
  }
  const off = behind || x < 30 || x > W - 30 || y < 70 || y > H - 40;
  if (off) {
    if (!clampEdge) return false;
    // fora da tela: seta numa elipse em volta do centro apontando pro alvo (nunca nos cantos / em cima da HUD)
    let dx = _cs.x, dy = -_cs.y;
    if (Math.abs(dx) + Math.abs(dy) < 1e-6) dy = 1;
    const a = Math.atan2(dy, dx);
    x = W / 2 + Math.cos(a) * Math.min(W * .3, 280); y = H / 2 + Math.sin(a) * Math.min(H * .28, 190); edge = true;
    el.style.setProperty('--a', a.toFixed(3) + 'rad');
  }
  // alvo/borda: centralizado; rótulo comum: o losango (à esquerda) fica em cima do ponto
  const centered = edge || el.classList.contains('tgt');
  el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(${centered ? '-50%' : '-3px'},-50%)`;
  el.classList.toggle('edge', edge);
  return true;
}

function updateLabels() {
  const eye = camera.position, flying = mode !== 'foot';
  const tgt = PLANETS[ship.target];
  const cutscene = mode === 'boarding' || mode === 'exiting';
  for (const lb of labels) {
    if (cutscene) { if (lb.vis) { lb.vis = false; lb.el.style.display = 'none'; } continue; }
    const b = lb.b;
    let show = false;
    const isT = flying && b === tgt;
    if (flying) show = isT || scene.fog.density < .005;
    else if (b !== player.body && scene.fog.density < .005) { // sob o céu fechado de Vênus não se vê nada lá fora
      _tmp.copy(b.center).sub(eye);
      show = _tmp.dot(_up) > 0;
    }
    lb.el.classList.toggle('tgt', isT);
    if (show) show = placeLabel(lb.el, b.center, isT);
    if (show) {
      const d = Math.max(0, eye.distanceTo(b.center) - b.R);
      const txt = fmtDist(d);
      if (lb.txt !== txt) { lb.txt = txt; lb.dist.textContent = txt; }
    }
    if (lb.vis !== show) { lb.vis = show; lb.el.style.display = show ? 'block' : 'none'; }
  }
  let ss = false;
  if (mode === 'foot' && ship.body === player.body) {
    const d = player.pos.distanceTo(ship.ground);
    if (d > 14) { ss = placeLabel(shipLabel, ship.ground, true); shipLabelDist.textContent = fmtDist(d); }
  }
  shipLabel.style.display = ss ? 'block' : 'none';
}

const _north = new V3(), _east = new V3(), _loc = new V3();
function envRows(rows) {
  for (let i = 0; i < 6; i++) {
    const r = rows[i] || ['', '', ''];
    setText(hud.k[i], 'k' + i, r[0]); setText(hud.v[i], 'v' + i, r[1]);
    setCls(hud.r[i], 'r' + i, 'row' + (r[2] ? ' ' + r[2] : ''));
  }
}

function updateHud(dt) {
  document.body.dataset.mode = mode;
  const foot = mode === 'foot', fly = mode === 'fly';
  const tgt = PLANETS[ship.target];

  // ----- bússola + local -----
  setShow(hud.compass, 'cp', foot); setShow(hud.cmark, 'cm', foot); setShow(hud.hdg, 'hd', foot);
  if (foot) {
    const b = player.body;
    _north.set(0, 1, 0).applyQuaternion(b.q);
    _north.addScaledVector(_up, -_north.dot(_up));
    if (_north.lengthSq() < 1e-6) _north.copy(player.f);
    _north.normalize();
    _east.crossVectors(_north, _up);
    let hdg = Math.atan2(player.f.dot(_east), player.f.dot(_north)) * 180 / Math.PI;
    hdg = (hdg + 360) % 360;
    hud.tape.style.transform = `translateX(${(hud.compass.clientWidth / 2 - (hdg + 180) * PX_DEG).toFixed(1)}px)`;
    setText(hud.hdg, 'hg', pad(Math.round(hdg) % 360, 3) + '°');

    _loc.copy(player.pos).sub(b.center).normalize().applyQuaternion(b.qInv);
    const lat = Math.asin(clamp(_loc.y, -1, 1)) * 180 / Math.PI, lon = Math.atan2(_loc.z, _loc.x) * 180 / Math.PI;
    const alt = player.pos.distanceTo(b.center) - b.R;
    setText(hud.locName, 'ln', b.name.toUpperCase());
    setText(hud.locSub, 'ls', 'SURFACE EVA');
    setText(hud.envHead, 'eh', 'ENV');
    setText(hud.envSub, 'es', b.id === 'moon' ? 'MOON' : 'ROCKY');
    envRows([
      ['GRAV', `${b.gReal.toFixed(2)} g`],
      ['ATMO', ENV[b.id][1]],
      ['EXT', ENV[b.id][0], parseInt(ENV[b.id][0]) > 100 ? 'warn' : ''],
      ['ALT', `${alt.toFixed(1)} m`],
      ['LAT', fmtLat(lat, 'N', 'S')],
      ['LON', fmtLat(lon, 'E', 'W')],
    ]);
  } else {
    const nb = nearestPlanet(ship.pos);
    const spd = mode === 'fly' ? ship.vel.length() : 0;
    const range = Math.max(0, ship.pos.distanceTo(tgt.center) - tgt.R);
    const closing = mode === 'fly' ? ship.vel.dot(_tmp.copy(tgt.center).sub(ship.pos).normalize()) : 0;
    const eta = closing > 5 ? range / closing : Infinity;
    setText(hud.locName, 'ln', mode === 'boarding' ? 'BOARDING' : mode === 'exiting' ? 'DISEMBARKING' : mode === 'landing' ? 'LANDING' : mode === 'takeoff' ? 'LIFTOFF' : inGas ? 'INSIDE ' + inGas.name.toUpperCase() : (nb.alt < nb.b.R * 2 ? `NEAR ${nb.b.name.toUpperCase()}` : 'DEEP SPACE'));
    setText(hud.locSub, 'ls', mode === 'landing' ? anim.b.name.toUpperCase() : inGas ? 'NO SOLID SURFACE · DESCENDING' : fly ? `NEAREST · ${nb.b.name.toUpperCase()}` : '');
    setText(hud.envHead, 'eh', 'NAV');
    setText(hud.envSub, 'es', mode === 'fly' ? 'MANUAL' : 'SEQUENCE');
    envRows([
      ['SPEED', `${Math.round(spd)} m/s`],
      ['THRUST', `${Math.round(clamp(ship.thrust / 1.6, 0, 1) * 100)}%`],
      ['TARGET', tgt.name.toUpperCase(), 'warn'],
      ['RANGE', fmtDist(range)],
      ['ETA', isFinite(eta) && eta < 3600 ? `${pad(eta / 60)}:${pad(eta % 60)}` : '--:--'],
      inGas ? ['PRESS', `${Math.exp(gasDepth / CRUSH * 7.3).toFixed(gasDepth < .05 ? 1 : 0)} bar`, gasDepth > CRUSH * .9 ? 'crit' : gasDepth > CRUSH * .7 ? 'warn' : '']
        : ['ALT', fmtDist(Math.max(0, nb.alt))],
    ]);
  }

  setShow(hud.tgtpanel, 'tp', fly || mode === 'takeoff', 'flex');
  setText(hud.tgtName, 'tn', tgt.name);

  // ----- prompt / botão de ação -----
  let act = null;
  if (foot && nearShip()) act = ['BOARD', '<b>E</b>BOARD SHIP'];
  else if (fly && canLand) act = ['LAND', `<b>E</b>LAND ON ${canLand.name.toUpperCase()}`];
  const info = gasNear ? `NO SOLID SURFACE · DIVE INTO ${gasNear.name.toUpperCase()}` : landBlock;
  if (isTouch) {
    setShow(hud.bAct, 'ba', !!act);
    if (act) setText(hud.bAct, 'bat', act[0] + (act[0] === 'LAND' ? ' · ' + canLand.name.toUpperCase() : ''));
    setShow(hud.prompt, 'pr', !act && !!info);
    if (!act && info) setText(hud.prompt, 'prt', info);
    setShow(hud.bJump, 'bj', foot);
    setShow(hud.bBoost, 'bb', fly);
  } else {
    setShow(hud.prompt, 'pr', !!act || !!info);
    if (act) setText(hud.prompt, 'prt', act[1]);
    else if (info) setText(hud.prompt, 'prt', info);
  }

  if (!isTouch) {
    let h = '';
    if (foot) h = '<b>WASD</b> move · <b>Mouse</b> look · <b>Space</b> jump · <b>Shift</b> run<br>Find your ship and press <b>E</b> to travel';
    else if (fly) h = '<b>W/S</b> thrust · <b>Mouse</b> steer · <b>A/D</b> turn · <b>Shift</b> boost<br><b>Q/R</b> target · <b>E</b> land when close';
    if (document.pointerLockElement !== canvas && started && h) h = '<b>Click</b> to capture the mouse<br>' + h;
    setText(hud.help, 'hl', h);
  }

  // ----- alertas -----
  if (warnT > 0) { warnT -= dt; hud.warn.style.display = 'block'; } else hud.warn.style.display = 'none';
  document.body.classList.toggle('alert', warnT > 0);
}

// redesenha as telas do painel (só quando a câmera está perto da nave)
function updateCockpit(dt) {
  mfdT -= dt;
  if (mfdT > 0 || camera.position.distanceTo(ship.pos) > 40) return;
  mfdT = .12;
  const nb = nearestPlanet(ship.pos), tgt = PLANETS[ship.target];
  // NAV: velocidade, altitude, alvo e um radar com a direção do alvo no plano da nave
  { const { x, tex } = mfd[0];
    x.fillStyle = '#04100f'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(127,233,255,.35)'; x.lineWidth = 2; x.strokeRect(6, 6, 244, 244);
    x.font = '20px monospace'; x.fillStyle = '#7fe9ff';
    x.fillText('NAV', 16, 32);
    x.fillText(`SPD ${Math.round(mode === 'fly' ? ship.vel.length() : 0)}`, 16, 62);
    x.fillText(`ALT ${fmtDist(Math.max(0, nb.alt))}`, 16, 88);
    x.fillStyle = '#ffb347'; x.fillText(tgt.name.toUpperCase(), 16, 114);
    const cx = 128, cy = 186, R = 54;
    x.strokeStyle = 'rgba(127,233,255,.5)';
    x.beginPath(); x.arc(cx, cy, R, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, R / 2, 0, 7); x.stroke();
    _tmp.copy(tgt.center).sub(ship.pos).applyQuaternion(_cq.copy(ship.q).invert()).normalize();
    const ang = Math.atan2(_tmp.x, -_tmp.z), behind = _tmp.z > 0;
    x.fillStyle = behind ? '#ff5a4a' : '#ffb347';
    x.beginPath(); x.arc(cx + Math.sin(ang) * R * .8, cy - Math.cos(ang) * R * .8, 6, 0, 7); x.fill();
    x.fillStyle = '#7fe9ff'; x.beginPath(); x.moveTo(cx, cy - 8); x.lineTo(cx - 6, cy + 6); x.lineTo(cx + 6, cy + 6); x.fill();
    tex.needsUpdate = true; }
  // horizonte artificial em relação ao planeta mais próximo
  { const { x, tex } = mfd[1];
    _up.copy(ship.pos).sub(nb.b.center).normalize();
    const fwd = _tmp.set(0, 0, -1).applyQuaternion(ship.q), upS = _tmp2.set(0, 1, 0).applyQuaternion(ship.q);
    const pitch = Math.asin(clamp(fwd.dot(_up), -1, 1));
    const right = _right.crossVectors(fwd, upS);
    const roll = Math.atan2(right.dot(_up), upS.dot(_up));
    x.save(); x.fillStyle = '#04100f'; x.fillRect(0, 0, 256, 256);
    x.beginPath(); x.arc(128, 128, 112, 0, 7); x.clip();
    x.translate(128, 128); x.rotate(roll); x.translate(0, pitch * 160);
    x.fillStyle = '#2a6fb0'; x.fillRect(-300, -600, 600, 600);
    x.fillStyle = '#7a5230'; x.fillRect(-300, 0, 600, 600);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(-300, 0); x.lineTo(300, 0); x.stroke();
    x.lineWidth = 1.5;
    for (let i = -6; i <= 6; i++) { if (!i) continue; const y = -i * 160 * (10 * D2R), w = i % 2 ? 18 : 34; x.beginPath(); x.moveTo(-w, y); x.lineTo(w, y); x.stroke(); }
    x.restore();
    x.strokeStyle = '#ffb347'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(70, 128); x.lineTo(108, 128); x.lineTo(118, 140); x.moveTo(186, 128); x.lineTo(148, 128); x.lineTo(138, 140); x.stroke();
    x.strokeStyle = 'rgba(127,233,255,.5)'; x.lineWidth = 2; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke();
    tex.needsUpdate = true; }
}

function updateFlames() {
  const t = performance.now() * .02, bl = ship.group.userData.blink, now = performance.now() / 1000;
  // luzes de navegação piscando e estrobo duplo; brilho do motor acompanha o empuxo
  bl.navL.visible = bl.navR.visible = (now % 1.2) < .9;
  const st = now % 1.6; bl.strobe.visible = st < .06 || (st > .18 && st < .24);
  bl.engLight.intensity = ship.thrust * 4;
  for (const [i, f] of ship.group.userData.flames.entries()) {
    const s = ship.thrust * (1 + .15 * Math.sin(t + i * 2));
    f.visible = s > .02;
    f.scale.set(1, 1, Math.max(.01, s * 1.4));
  }
}

// =====================================================================
// LOOP
// =====================================================================
const clock = new THREE.Clock();
// mede o FPS em janelas de 2 s: abaixo de 40 baixa a resolução, com folga (> 57 duas vezes) sobe de novo
const perf = { t: 0, n: 0, good: 0 };
function adaptRes(dt) {
  if (!started || document.hidden) return;
  perf.t += dt; perf.n++;
  if (perf.t < 2) return;
  const fps = perf.n / perf.t; perf.t = 0; perf.n = 0;
  if (fps < 40 && curDpr > .75) { curDpr = Math.max(.75, curDpr - .25); renderer.setPixelRatio(curDpr); perf.good = 0; }
  else if (fps > 57 && curDpr < MAX_DPR) { if (++perf.good >= 2) { curDpr = Math.min(MAX_DPR, curDpr + .25); renderer.setPixelRatio(curDpr); perf.good = 0; } }
  else perf.good = 0;
}
const T0 = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05);
  if (started) {
    if (mode === 'foot') { ship.thrust = 0; updateFoot(dt); }
    else if (mode === 'fly') updateFly(dt);
    else if (mode === 'landing') updateLanding(dt);
    else if (mode === 'takeoff') updateTakeoff(dt);
    else if (mode === 'boarding') updateBoarding(dt);
    else if (mode === 'exiting') updateExiting(dt);
    if (mode !== 'fly') canLand = null;
  }
  look.dx = look.dy = 0; jumpQ = false; actQ = false;
  adaptRes(dt);
  if (mode !== 'fly') { inGas = null; gasDepth = 0; gasNear = null; landBlock = null; }
  const tSec = (performance.now() - T0) / 1000;
  for (const u of TIME_UNIFORMS) u.value = tSec;

  ship.group.position.copy(ship.pos);
  ship.group.quaternion.copy(ship.q);
  updateFlames();
  updateCockpit(dt);

  const flying = mode === 'fly' || mode === 'landing' || mode === 'takeoff';
  ship.group.userData.pilot.visible = flying || (cut ? ship.group.userData.pilot.visible : false);
  if (mode === 'foot') footCamera(); else if (flying) chaseCamera(dt);   // nas cenas a câmera já foi posta
  // a pé e nas cenas a câmera fica colada nas coisas; em voo (13 m atrás da nave) dá pra afastar o near
  const near = (mode === 'fly' || mode === 'landing' || mode === 'takeoff') ? 1 : (mode === 'foot' ? .2 : .05);
  if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
  updateSky();
  updateDust();
  if (started) { updateLabels(); updateHud(dt); }
  renderer.render(scene, camera);
}

// =====================================================================
// INÍCIO
// =====================================================================
const startBtn = $('startbtn');
async function init() {
  for (const b of PLANETS) {
    startBtn.textContent = `Building ${b.name}…`;
    await new Promise(r => setTimeout(r, 0));
    buildBody(b);
  }
  // nave estacionada na Terra, jogador de frente pra ela
  const earth = BODIES.find(b => b.id === 'earth');
  const d = pickLandingDir(earth);
  const hint = new V3(0, 1, 0).addScaledVector(d, -d.y);
  parkShip(earth, d, hint);
  player.body = earth;
  _fwd.set(0, 0, -1).applyQuaternion(ship.q);
  _tmp.copy(ship.ground).addScaledVector(_fwd, 13).sub(earth.center).normalize();
  player.pos.copy(earth.center).addScaledVector(_tmp, groundR(earth, _tmp));
  player.f.copy(ship.ground).sub(player.pos);
  player.pitch = -.08;
  ship.target = PLANETS.indexOf(earth) + 1;

  startBtn.textContent = 'Launch';
  startBtn.disabled = false;
  frame();
}
startBtn.addEventListener('click', () => {
  $('overlay').style.display = 'none';
  started = true;
  clock.getDelta();
  if (!isTouch) canvas.requestPointerLock?.();
  else {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    try { const p = req?.call(el, { navigationUI: 'hide' }); p?.then?.(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
  }
});
init();
