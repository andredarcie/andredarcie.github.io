// Downloads Brazil's state boundaries from IBGE once and writes two versions,
// because classifying and drawing want opposite things.
//
//   data/br-uf.geojson      full precision — what locate.js tests points against
//   data/br-uf-map.geojson  decimated      — what the browser downloads and draws
//
// This split is not premature optimisation. On the simplified mesh a fifth of a
// coastal trip's photos land *outside* every state polygon: the coastline gets
// cut straight across its bays, so someone standing on dry sand reads as 1.3 km
// out to sea. The classifier needs the real coast. The map, rendered about 100
// units wide, cannot show the difference and should not pay to download it.

import path from 'node:path';
import { ROOT, writeJson, step } from './lib/util.js';
import { ufByCode, isNordeste, NORDESTE_COAST_ORDER } from './lib/uf.js';

const url = (quality) =>
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR' +
  `?formato=application/vnd.geo+json&intrarregiao=UF&qualidade=${quality}`;

// A malha dos municípios de um estado, e a lista de nomes correspondente. A API
// de malhas só devolve `codarea`; quem sabe que 2800100 é Aracaju é a de
// localidades. Duas chamadas por estado, cruzadas pelo código.
const urlMunicipios = (uf) =>
  `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${uf}` +
  '?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=maxima';

const urlNomes = (uf) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`;

const OUT_PRECISE = path.join(ROOT, 'data', 'br-uf.geojson');
const OUT_MAP = path.join(ROOT, 'data', 'br-uf-map.geojson');

// A malha municipal vai para cache/, e não para data/, por tamanho: os 1.794
// municípios do Nordeste em qualidade máxima pesam quase 9 MB, dez vezes a
// malha estadual. Ela nunca é baixada pelo navegador — quem a lê é o
// classificador, uma vez, na sua máquina. cache/ é exatamente isso: estado
// intermediário, fora do git, refeito ao rodar de novo.
const OUT_MUN = path.join(ROOT, 'cache', 'br-mun.geojson');

/** Ramer–Douglas–Peucker, iterative so a 50k-vertex coastline can't blow the stack. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    if (end - start < 2) continue;

    const [ax, ay] = points[start];
    const [bx, by] = points[end];
    const dx = bx - ax;
    const dy = by - ay;
    const norm = Math.hypot(dx, dy);

    let far = -1;
    let farD = 0;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i];
      const d = norm === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / norm;
      if (d > farD) { farD = d; far = i; }
    }

    if (far !== -1 && farD > epsilon) {
      keep[far] = 1;
      stack.push([start, far], [far, end]);
    }
  }

  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

function round(coords, places) {
  const f = 10 ** places;
  const walk = (c) =>
    typeof c[0] === 'number'
      ? [Math.round(c[0] * f) / f, Math.round(c[1] * f) / f]
      : c.map(walk);
  return walk(coords);
}

/** Walk a geometry's rings, replacing each with `fn(ring)`. Drops degenerate rings. */
function mapRings(geometry, fn) {
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  const out = [];
  for (const rings of polys) {
    const kept = [];
    for (const ring of rings) {
      const next = fn(ring);
      // A closed ring needs four points to enclose anything.
      if (next.length >= 4) {
        if (next[0][0] !== next[next.length - 1][0] || next[0][1] !== next[next.length - 1][1]) {
          next.push(next[0]);
        }
        kept.push(next);
      }
    }
    if (kept.length) out.push(kept);
  }
  return out.length
    ? { type: 'MultiPolygon', coordinates: out }
    : { type: 'MultiPolygon', coordinates: [] };
}

step(0, 'Fetching state boundaries from IBGE');

const res = await fetch(url('maxima'));
if (!res.ok) {
  console.error(`  IBGE returned ${res.status}. Boundaries not written.`);
  process.exit(1);
}
const geo = await res.json();

const base = geo.features
  .map((f) => {
    const uf = ufByCode(f.properties?.codarea);
    if (!uf) return null;
    return {
      type: 'Feature',
      properties: {
        code: Number(f.properties.codarea),
        sigla: uf.sigla,
        nome: uf.nome,
        regiao: uf.regiao,
        nordeste: isNordeste(uf.sigla),
      },
      geometry: f.geometry,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.properties.code - b.properties.code);

// Precise: 5 decimals is about a metre, finer than any consumer GPS fix.
const precise = base.map((f) => ({
  ...f,
  geometry: mapRings(f.geometry, (ring) => round(ring, 5)),
}));

// Drawn: ~0.008° is roughly 900 m, well under one rendered pixel on this map.
const drawn = base.map((f) => ({
  ...f,
  geometry: mapRings(f.geometry, (ring) => round(simplify(ring, 0.008), 4)),
}));

writeJson(OUT_PRECISE, { type: 'FeatureCollection', features: precise }, { pretty: false });
writeJson(OUT_MAP, { type: 'FeatureCollection', features: drawn }, { pretty: false });

const count = (fs) =>
  fs.reduce((n, f) => n + f.geometry.coordinates.flat().reduce((m, r) => m + r.length, 0), 0);
const kb = (file) => Math.round(JSON.stringify(file).length / 1024);

console.log(`  ${precise.length} states (${precise.filter((f) => f.properties.nordeste).length} in the Northeast)`);
console.log(`  precise  ${count(precise).toLocaleString('en-GB')} vertices  ${kb({ features: precise })} KB  -> classification`);
console.log(`  drawn    ${count(drawn).toLocaleString('en-GB')} vertices  ${kb({ features: drawn })} KB  -> the browser`);

// --- municipalities ---------------------------------------------------------
//
// Only the Northeast. Every state in Brazil would be 5,570 municipalities and
// about 27 MB, and this archive is a Northeast trip — locate.js simply leaves
// the city null for any state whose mesh is absent, which is the same thing it
// already does for a photo with no fix.
//
// Maximum quality for the same reason the state mesh uses it: IBGE simplifies
// each polygon on its own, so at lower quality neighbouring municipalities stop
// sharing a border and points near the line fall into the gap between them.

step(1, 'Fetching municipal boundaries from IBGE');

const municipios = [];
const semMalha = [];

for (const uf of NORDESTE_COAST_ORDER) {
  const [malha, nomes] = await Promise.all([
    fetch(urlMunicipios(uf)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(urlNomes(uf)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);

  if (!malha?.features?.length || !Array.isArray(nomes)) {
    semMalha.push(uf);
    continue;
  }

  const nomePorCodigo = new Map(nomes.map((m) => [Number(m.id), m.nome]));

  for (const f of malha.features) {
    const code = Number(f.properties?.codarea);
    const nome = nomePorCodigo.get(code);
    if (!nome) continue;
    municipios.push({
      type: 'Feature',
      properties: { code, nome, uf },
      geometry: mapRings(f.geometry, (ring) => round(ring, 5)),
    });
  }

  process.stdout.write(`  ${uf} ${malha.features.length}   `);
}
process.stdout.write('\n');

if (semMalha.length) {
  console.error(`  IBGE did not answer for: ${semMalha.join(', ')} — those states get no city.`);
}

writeJson(OUT_MUN, { type: 'FeatureCollection', features: municipios }, { pretty: false });

const porUf = new Map();
for (const f of municipios) porUf.set(f.properties.uf, (porUf.get(f.properties.uf) ?? 0) + 1);

console.log(`  ${municipios.length} municipalities  ${count(municipios).toLocaleString('en-GB')} vertices  ${kb({ features: municipios })} KB  -> classification`);
console.log(`  ${[...porUf.entries()].map(([k, v]) => `${k} ${v}`).join('  ')}`);
console.log(`  -> ${path.relative(ROOT, OUT_MUN)} (not committed; cache/ is rebuilt by this step)`);
