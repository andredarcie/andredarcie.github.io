// Step 5 — merge every cache into the one file the site loads.

import path from 'node:path';
import {
  ROOT, loadConfig, readJson, writeJson, step,
} from './lib/util.js';
import { coastIndex, isNordeste, ufBySigla } from './lib/uf.js';

const cfg = loadConfig();
const OUT = path.join(ROOT, 'data', 'photos.json');

step(5, 'Building the site manifest');

const { photos } = readJson(path.join(ROOT, 'cache', 'located.json'));
const imageCache = readJson(path.join(ROOT, 'cache', 'images.json'), { images: {}, ext: 'jpg' });
const images = imageCache.images;
const analise = readJson(path.join(ROOT, 'cache', 'stats.json'), null);

const skipVideos = cfg.images.videos === 'skip';

// Culled photos, marked in the browser and applied by scripts/exclude.js. This
// list is why deletion sticks: ingest re-reads the whole Takeout every run, so
// without it a rebuild would resurrect everything that was thrown away.
const excluded = new Set(
  readJson(path.join(ROOT, 'data', 'excluded.json'), { ids: [] }).ids
);

// Tabela de cidades, e um índice por foto em vez do nome.
//
// Escrever "Morro de São Paulo" nas 3.292 fotos custaria 66 KB num manifesto de
// 714 KB, para repetir cerca de cem nomes. A tabela custa 3 KB e o índice 20 KB,
// e o manifesto está no caminho crítico: a página não desenha nada antes dele.
// O navegador resolve o índice de volta para o nome uma vez, ao carregar.
const cidades = [];
const indiceCidade = new Map();
const codigoCidade = (nome, uf) => {
  if (!nome) return undefined;
  const chave = `${uf}|${nome}`;
  if (!indiceCidade.has(chave)) {
    indiceCidade.set(chave, cidades.length);
    cidades.push({ n: nome, uf });
  }
  return indiceCidade.get(chave);
};

const out = [];
let droppedVideos = 0;
let droppedCulled = 0;
for (const p of photos) {
  if (excluded.has(p.id)) {
    droppedCulled++;
    continue;
  }
  // Videos have no web derivative, so without an explicit policy they would ship
  // as broken tiles. 322 clips across the year weigh 6.2 GB — six times the
  // entire Pages budget — so "skip" is the honest default.
  if (p.isVideo && skipVideos) {
    droppedVideos++;
    continue;
  }
  const img = images[p.id];
  if (!img) continue; // not encoded yet -> nothing to show

  out.push({
    id: p.id,
    // The original Takeout filename. Costs about 25 bytes a photo and buys the
    // cull list something a human can read back.
    name: p.title,
    // "Estado/nome" — where the derivative sits, minus the extension. The site
    // builds its URLs from this rather than guessing from the id.
    path: img.path ?? p.id,
    t: p.takenAt,
    lat: p.lat === null ? null : Math.round(p.lat * 1e5) / 1e5,
    lon: p.lon === null ? null : Math.round(p.lon * 1e5) / 1e5,
    uf: p.uf,
    cid: codigoCidade(p.city, p.uf),   // índice em `cidades`, resolvido no cliente
    loc: p.locSource,          // exact | offshore | inferred | null
    w: img?.w ?? p.width ?? null,
    h: img?.h ?? p.height ?? null,
    fav: p.favorited || undefined,
    cam: p.camera || undefined,
    desc: p.description || undefined,
    leg: p.legKm || undefined,
    video: p.isVideo || undefined,
  });
}

out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));

// --- per-state rollup -------------------------------------------------------

const states = new Map();
for (const p of out) {
  if (!p.uf) continue;
  if (!states.has(p.uf)) {
    states.set(p.uf, { uf: p.uf, count: 0, first: Infinity, last: -Infinity, km: 0, cidades: new Set() });
  }
  const s = states.get(p.uf);
  s.count++;
  if (p.cid !== undefined) s.cidades.add(p.cid);
  if (p.t) {
    if (p.t < s.first) s.first = p.t;
    if (p.t > s.last) s.last = p.t;
  }
  s.km += p.leg ?? 0;
}

// Travel order: whichever state was photographed first comes first. The trip was
// a linear traversal, so this reproduces the route without assuming a direction —
// July runs Bahia northward, which is the opposite of the geographic coast order.
const stateList = [...states.values()]
  .map((s) => ({
    ...s,
    nome: ufBySigla(s.uf)?.nome ?? s.uf,
    first: s.first === Infinity ? null : s.first,
    last: s.last === -Infinity ? null : s.last,
    km: Math.round(s.km),
    cidades: s.cidades.size,
    nordeste: isNordeste(s.uf),
  }))
  .sort((a, b) => (a.first ?? Infinity) - (b.first ?? Infinity) || coastIndex(a.uf) - coastIndex(b.uf))
  .map((s, i) => ({ ...s, order: i }));

// --- summary ----------------------------------------------------------------

const located = out.filter((p) => p.lat !== null);
const lats = located.map((p) => p.lat);
const lons = located.map((p) => p.lon);

const manifest = {
  generatedAt: Date.now(),
  year: cfg.year,
  imageExt: imageCache.ext ?? 'jpg',
  counts: {
    photos: out.length,
    located: located.length,
    states: stateList.length,
    cidades: cidades.length,
  },
  cidades,
  totalKm: Math.round(out.reduce((sum, p) => sum + (p.leg ?? 0), 0)),
  span: {
    first: out.find((p) => p.t)?.t ?? null,
    last: [...out].reverse().find((p) => p.t)?.t ?? null,
  },
  bounds: located.length
    ? { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) }
    : null,
  states: stateList,
  stats: analise ? resumo(analise, out) : null,
  photos: out,
};

/**
 * O bloco de curiosidades. A tira de cores vai como uma lista ordenada no
 * tempo, e não como média por estado: a média de milhares de fotos converge
 * sempre para o mesmo cinza — foi o que o teste mostrou, com todos os nove
 * estados caindo entre #706762 e #848485. A informação está na sequência.
 */
function resumo(a, fotos) {
  const hex = (rgb) => rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  const tira = [];
  for (const p of fotos) {
    const c = a.cores?.[p.id];
    if (c) tira.push(hex(c.rgb));
  }

  const luzes = fotos.map((p) => a.cores?.[p.id]?.luz).filter((v) => v != null);

  return {
    horas: a.horas,
    diaDaSemana: a.diaDaSemana,
    diasPorSemana: a.diasPorSemana,
    diasComFoto: a.diasComFoto,
    diaMaisCheio: a.diaMaisCheio,
    silencio: a.silencio,
    rajada: a.rajada,
    orientacao: a.orientacao,
    fontes: a.fontes,
    altitude: a.altitude,
    maiorDeslocamento: a.maiorDeslocamento,
    porDia: a.porDia,
    tira,
    escuras: luzes.filter((v) => v < 60).length,
  };
}

writeJson(OUT, manifest, { pretty: false });

const kb = Math.round(JSON.stringify(manifest).length / 1024);
console.log(`  ${out.length} photos  ·  ${stateList.length} states  ·  ${cidades.length} cities  ·  ${manifest.totalKm.toLocaleString('en-US')} km`);
if (droppedVideos) console.log(`  ${droppedVideos} videos excluded (images.videos = "skip")`);
if (droppedCulled) console.log(`  ${droppedCulled} photos excluded (data/excluded.json)`);
console.log(`  ${located.length} placed on the map (${Math.round((located.length / (out.length || 1)) * 100)}%)`);
console.log(`  -> ${path.relative(ROOT, OUT)} (${kb} KB)`);
