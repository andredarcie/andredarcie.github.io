// Step 2 — turn coordinates into places.
//
// Three passes, in order of confidence:
//   exact      point falls inside a state polygon
//   coast      just outside it — mesh resolution, not water; snapped ashore
//   offshore   genuinely out to sea; snapped to the nearest coast within N km
//   inferred   no GPS at all; borrow the location of the nearest photo in time
//
// The coast/offshore split earns its keep. On this archive a fifth of July's
// photos fall outside every polygon, and lumping them together hides the only
// interesting part: strip out the few hundred metres of boundary slop and what
// remains is a boat trip, sitting 1.5 km off Pajuçara in a block of 85 photos.
//
// The third pass is what makes a travel archive usable. Phone photos are tagged,
// but screenshots, WhatsApp saves and anything from a real camera are not — and
// on a trip, "the photo taken four minutes before this one" is an excellent
// guess. Every inferred photo keeps its `locSource` so the site can show the
// difference instead of pretending it knows.

import path from 'node:path';
import {
  ROOT, loadConfig, readJson, writeJson, progress, step,
} from './lib/util.js';
import { inFeature, bbox, inBbox, distanceToFeatureKm, haversineKm } from './lib/geo.js';

const cfg = loadConfig();
const IN = path.join(ROOT, 'cache', 'index.json');
const OUT = path.join(ROOT, 'cache', 'located.json');
const GEO = path.join(ROOT, 'data', 'br-uf.geojson');
const GEO_MUN = path.join(ROOT, 'cache', 'br-mun.geojson');

step(2, 'Assigning states');

const geo = readJson(GEO, null);
if (!geo) {
  console.error('  data/br-uf.geojson missing. Run: npm run geo');
  process.exit(1);
}

const { photos } = readJson(IN);
const features = geo.features.map((f) => ({ f, box: bbox(f) }));

// --- pass 1 + 2: photos that carry their own fix ----------------------------

const bar = progress('locating', photos.length);
let exact = 0;
let coast = 0;
let offshore = 0;

for (const p of photos) {
  bar.tick();
  p.uf = null;
  p.ufName = null;
  p.locSource = null;

  if (p.lat === null) continue;

  let hit = null;
  for (const { f, box } of features) {
    if (!inBbox(p.lon, p.lat, box)) continue;
    if (inFeature(p.lon, p.lat, f)) { hit = f; break; }
  }

  if (hit) {
    p.uf = hit.properties.sigla;
    p.ufName = hit.properties.nome;
    p.locSource = 'exact';
    exact++;
    continue;
  }

  // In the water, or just over a border. Snap to the closest land.
  let best = null;
  let bestKm = Infinity;
  for (const { f, box } of features) {
    if (!inBbox(p.lon, p.lat, box, 2)) continue; // ~220 km pad
    const km = distanceToFeatureKm(p.lon, p.lat, f);
    if (km < bestKm) { bestKm = km; best = f; }
  }
  if (best && bestKm <= cfg.locate.offshoreSnapKm) {
    p.uf = best.properties.sigla;
    p.ufName = best.properties.nome;
    p.snapKm = Math.round(bestKm * 100) / 100;
    if (bestKm <= cfg.locate.coastToleranceKm) {
      p.locSource = 'coast';
      coast++;
    } else {
      p.locSource = 'offshore';
      offshore++;
    }
  }
}
bar.done();

// --- pass 2.5: which municipality ------------------------------------------
//
// Só depois de saber o estado, e só dentro dele. Testar 1.794 municípios por
// foto seria absurdo quando o estado já cortou o problema para 75 ou 417 — e a
// caixa envolvente reduz os candidatos reais a um ou dois.
//
// Foto que caiu na água ou fora da malha por resolução usa o mesmo recurso do
// passo anterior: encosta no município mais próximo. A alternativa seria dizer
// "Bahia, cidade desconhecida" para toda foto de praia, que é justamente onde
// esta viagem passou o ano.

const mun = readJson(GEO_MUN, null);

if (!mun?.features?.length) {
  console.warn('  cache/br-mun.geojson ausente — cidades não resolvidas. Rode: npm run geo');
} else {
  const porUf = new Map();
  for (const f of mun.features) {
    const uf = f.properties.uf;
    if (!porUf.has(uf)) porUf.set(uf, []);
    porUf.get(uf).push({ f, box: bbox(f) });
  }

  const barra = progress('cidades', photos.length);
  for (const p of photos) {
    barra.tick();
    p.city = null;
    if (!p.uf || p.lat === null) continue;

    const candidatos = porUf.get(p.uf);
    if (!candidatos) continue;

    let achou = null;
    for (const { f, box } of candidatos) {
      if (!inBbox(p.lon, p.lat, box)) continue;
      if (inFeature(p.lon, p.lat, f)) { achou = f; break; }
    }

    // Fora de todo polígono: praia, água, ou beirada da malha. Encosta no mais
    // próximo, com a mesma tolerância que trouxe a foto de volta ao estado.
    if (!achou) {
      let melhorKm = Infinity;
      for (const { f, box } of candidatos) {
        if (!inBbox(p.lon, p.lat, box, 0.6)) continue;
        const km = distanceToFeatureKm(p.lon, p.lat, f);
        if (km < melhorKm) { melhorKm = km; achou = f; }
      }
      if (melhorKm > cfg.locate.offshoreSnapKm) achou = null;
    }

    if (achou) {
      p.city = achou.properties.nome;
    }
  }
  barra.done();
}

// --- pass 3: infer the rest from their neighbours in time -------------------

const anchors = photos
  .filter((p) => p.uf && p.takenAt)
  .sort((a, b) => a.takenAt - b.takenAt);

const windowMs = cfg.locate.interpolateHours * 3600 * 1000;
let inferred = 0;

if (anchors.length) {
  for (const p of photos) {
    if (p.uf || !p.takenAt) continue;

    // Binary search for the insertion point, then compare the two neighbours.
    let lo = 0;
    let hi = anchors.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (anchors[mid].takenAt < p.takenAt) lo = mid + 1;
      else hi = mid;
    }
    const candidates = [anchors[lo - 1], anchors[lo]].filter(Boolean);
    let near = null;
    let nearGap = Infinity;
    for (const c of candidates) {
      const gap = Math.abs(c.takenAt - p.takenAt);
      if (gap < nearGap) { nearGap = gap; near = c; }
    }

    if (near && nearGap <= windowMs) {
      p.uf = near.uf;
      p.ufName = near.ufName;
      // A cidade vem junto com a coordenada, porque é a mesma coordenada. Segue
      // marcada como `inferred`: a cidade herdada é um palpite mais forte que o
      // estado herdado, e a interface tem de poder dizer isso.
      p.city = near.city ?? null;
      p.lat = near.lat;
      p.lon = near.lon;
      p.locSource = 'inferred';
      p.inferredFrom = near.id;
      p.inferredGapMin = Math.round(nearGap / 60000);
      inferred++;
    }
  }
}

// --- movement: distance from the previous located photo ---------------------
// Feeds the trail on the map and gives each day a "kilometres covered" number.

const track = photos
  .filter((p) => p.lat !== null && p.takenAt)
  .sort((a, b) => a.takenAt - b.takenAt);

let totalKm = 0;
for (let i = 1; i < track.length; i++) {
  const km = haversineKm(track[i - 1].lat, track[i - 1].lon, track[i].lat, track[i].lon);
  // Ignore jitter and impossible jumps alike; the first is noise, the second is
  // usually a stale fix from a photo the phone geotagged badly.
  track[i].legKm = km > 0.15 && km < 2000 ? Math.round(km * 10) / 10 : 0;
  totalKm += track[i].legKm;
}

writeJson(OUT, { generatedAt: Date.now(), photos }, { pretty: false });

const unplaced = photos.filter((p) => !p.uf).length;
const byUf = new Map();
for (const p of photos) if (p.uf) byUf.set(p.uf, (byUf.get(p.uf) ?? 0) + 1);

const cidades = new Set(photos.map((p) => p.city).filter(Boolean));
const semCidade = photos.filter((p) => p.uf && !p.city).length;

console.log(`  exact ${exact}  ·  coast ${coast}  ·  offshore ${offshore}  ·  inferred ${inferred}  ·  unplaced ${unplaced}`);
console.log(`  ${cidades.size} cidades distintas  ·  ${semCidade} fotos com estado mas sem cidade`);
console.log(`  ${Math.round(totalKm).toLocaleString('en-US')} km between consecutive photos`);
console.log(`  ${[...byUf.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('  ')}`);
console.log(`  -> ${path.relative(ROOT, OUT)}`);
