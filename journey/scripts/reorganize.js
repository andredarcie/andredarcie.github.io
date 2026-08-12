// One-shot migration: flat `photos/{full,thumb}/<id>.avif` into the state-folder
// layout `photos/{full,thumb}/<Estado>/<original name>.avif`.
//
// Moves files, never re-encodes. Rewriting 910 AVIFs to change where they sit
// would cost over an hour of CPU and produce byte-identical images.
//
// Safe to re-run: anything already in place is left alone. Newly encoded photos
// land in the right folder on their own, so this only exists for archives built
// before the layout changed.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, writeJson, step } from './lib/util.js';
import { assignPaths } from './lib/paths.js';

const PHOTOS = path.join(ROOT, 'photos');
const CACHE = path.join(ROOT, 'cache', 'images.json');

step('move', 'Reorganising photos by state');

const { photos } = readJson(path.join(ROOT, 'cache', 'located.json'), { photos: [] });
const cache = readJson(CACHE, null);

if (!photos.length || !cache) {
  console.error('  Nothing to move. Run the pipeline first.');
  process.exit(1);
}

const EXT = cache.ext ?? 'jpg';
const pinned = new Map(
  Object.entries(cache.images ?? {}).filter(([, v]) => v.path).map(([id, v]) => [id, v.path])
);
const paths = assignPaths(photos.filter((p) => !p.isVideo), pinned);

let moved = 0;
let already = 0;
let absent = 0;
const folders = new Map();

for (const [id, rel] of paths) {
  const folder = rel.split('/')[0];

  for (const kind of ['full', 'thumb']) {
    const from = path.join(PHOTOS, kind, `${id}.${EXT}`);
    const to = path.join(PHOTOS, kind, `${rel}.${EXT}`);

    if (fs.existsSync(to)) {
      already++;
      continue;
    }
    if (!fs.existsSync(from)) {
      absent++;
      continue;
    }

    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.renameSync(from, to);
    moved++;
    if (kind === 'full') folders.set(folder, (folders.get(folder) ?? 0) + 1);
  }
}

// Record where everything landed, so build.js can put it in the manifest.
for (const [id, rel] of paths) {
  if (cache.images[id]) cache.images[id].path = rel;
}
writeJson(CACHE, cache, { pretty: false });

console.log(`  ${moved} moved  ·  ${already} already in place  ·  ${absent} not on disk (culled)`);
for (const [folder, n] of [...folders].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${folder.padEnd(14)} ${n}`);
}
console.log('  next: npm run build');
