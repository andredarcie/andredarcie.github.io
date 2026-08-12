// Step 3 — web derivatives.
//
// Originals stay where they are. This writes a display copy and a thumbnail into
// photos/, which is what the site serves. Re-runs skip anything already written,
// so an interrupted pass just picks up where it stopped.
//
//   --limit N     only the first N photos (curating a committable subset)
//   --force       rewrite even if the output exists

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  ROOT, loadConfig, readJson, writeJson, ensureDir, parseArgs, progress, step, mapLimit,
} from './lib/util.js';
import { assignPaths } from './lib/paths.js';

const args = parseArgs();
const cfg = loadConfig();
const IN = path.join(ROOT, 'cache', 'located.json');
const OUT = path.join(ROOT, 'cache', 'images.json');
const PHOTOS = path.join(ROOT, 'photos');

step(3, 'Building web images');

const { photos } = readJson(IN);
let queue = photos.filter((p) => !p.isVideo);
if (args.limit) queue = queue.slice(0, Number(args.limit));

// One folder per state, under each size. Directories are created lazily as
// photos land in them, so a state with nothing in it leaves no empty shell.
//
// Paths already on disk are pinned, so growing the archive can never rename a
// file that is already encoded and referenced by a published manifest.
const previous = readJson(OUT, { images: {} }).images;
const pinned = new Map(
  Object.entries(previous).filter(([, v]) => v.path).map(([id, v]) => [id, v.path])
);
const paths = assignPaths(photos.filter((p) => !p.isVideo), pinned);
const madeDirs = new Set();
const ensureOnce = (dir) => {
  if (madeDirs.has(dir)) return;
  ensureDir(dir);
  madeDirs.add(dir);
};

const { format, fullWidth, fullQuality, thumbWidth, thumbQuality } = cfg.images;
const EXT = format === 'jpeg' ? 'jpg' : format;

/** Apply the configured codec. AVIF gets a low effort — the default triples the
 *  encode time for a few percent of size on photographic content. */
const encode = (pipe, quality) => {
  if (format === 'avif') return pipe.avif({ quality, effort: 3 });
  if (format === 'webp') return pipe.webp({ quality, effort: 4 });
  return pipe.jpeg({ quality, mozjpeg: true });
};
const bar = progress('encoding', queue.length);
let written = 0;
let skipped = 0;
let failed = 0;

const results = await mapLimit(queue, 4, async (p) => {
  const rel = paths.get(p.id);
  const full = path.join(PHOTOS, 'full', `${rel}.${EXT}`);
  const thumb = path.join(PHOTOS, 'thumb', `${rel}.${EXT}`);
  bar.tick();

  if (!args.force && fs.existsSync(full) && fs.existsSync(thumb)) {
    skipped++;
    try {
      const meta = await sharp(full).metadata();
      return { id: p.id, rel, w: meta.width, h: meta.height, ok: true };
    } catch {
      return { id: p.id, rel, ok: true };
    }
  }

  ensureOnce(path.dirname(full));
  ensureOnce(path.dirname(thumb));

  try {
    // rotate() with no argument applies the EXIF orientation and drops the tag,
    // so the browser never has to think about it.
    const base = sharp(p.file, { failOn: 'none' }).rotate();
    const meta = await base.metadata();

    await encode(
      base.clone().resize({ width: fullWidth, withoutEnlargement: true }),
      fullQuality
    ).toFile(full);

    await encode(
      base.clone().resize({ width: thumbWidth, withoutEnlargement: true }),
      thumbQuality
    ).toFile(thumb);

    written++;
    const swap = meta.orientation >= 5;
    return {
      id: p.id,
      rel,
      w: swap ? meta.height : meta.width,
      h: swap ? meta.width : meta.height,
      ok: true,
    };
  } catch (err) {
    failed++;
    return { id: p.id, rel, ok: false, error: String(err.message ?? err) };
  }
});

bar.done();

const map = {};
for (const r of results) if (r.ok) map[r.id] = { path: r.rel, w: r.w ?? null, h: r.h ?? null };

writeJson(OUT, { generatedAt: Date.now(), format, ext: EXT, images: map }, { pretty: false });

console.log(`  written ${written}  ·  skipped ${skipped}  ·  failed ${failed}`);
if (failed) {
  const first = results.filter((r) => !r.ok).slice(0, 3);
  for (const f of first) console.log(`    ${f.id}: ${f.error}`);
}

// These files go into git and get published, so the size is a budget, not a
// footnote. GitHub Pages refuses to serve a site over 1 GB.
// Recursive now that the output is nested one folder deep per state.
const weigh = (dir) => {
  let total = 0;
  let files = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = weigh(full);
      total += sub.total;
      files += sub.files;
    } else {
      total += fs.statSync(full).size;
      files++;
    }
  }
  return { total, files };
};
const fullSide = weigh(path.join(PHOTOS, 'full'));
const thumbSide = weigh(path.join(PHOTOS, 'thumb'));
const fullBytes = fullSide.total;
const thumbBytes = thumbSide.total;
const count = fullSide.files || 1;
const mb = (b) => (b / 1024 ** 2).toFixed(0);
const perPhoto = (fullBytes + thumbBytes) / count;

console.log(`\n  ${format} · ${count} photos · ${mb(fullBytes + thumbBytes)} MB`);
console.log(`  full ${mb(fullBytes)} MB  ·  thumb ${mb(thumbBytes)} MB  ·  ${(perPhoto / 1024).toFixed(0)} KB each`);
console.log(`  at this rate the full year (5,677) lands near ${((perPhoto * 5677) / 1024 ** 3).toFixed(2)} GB`);
console.log(`  -> photos/full, photos/thumb`);
