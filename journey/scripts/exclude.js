// Applies a cull list produced by the browser's "Apagar fotos" mode.
//
//   npm run exclude                 read the list from stdin (just paste it)
//   npm run exclude -- --file x.txt read it from a file
//   npm run exclude -- --list       show what is currently excluded
//   npm run exclude -- --undo       clear the list entirely
//   npm run exclude -- --keep       exclude, but leave the encoded files on disk
//
// What this touches, and what it does not:
//
//   data/excluded.json   the list. This is the durable part, and the reason a
//                        deletion survives `npm run build` — ingest re-reads the
//                        whole Takeout every run and would otherwise bring
//                        everything back.
//   photos/{full,thumb}  the encoded derivatives, removed to reclaim the space.
//
//   takeout/             NEVER TOUCHED. Your originals are not deleted by this
//                        script, by the site, or by anything else in the
//                        pipeline. Undoing a cull is `--undo` then
//                        `npm run images`, and the photos come back.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, writeJson, parseArgs, step } from './lib/util.js';

const args = parseArgs();
const LIST = path.join(ROOT, 'data', 'excluded.json');
const PHOTOS = path.join(ROOT, 'photos');

const current = readJson(LIST, { ids: [], entries: [] });

// Derivatives live at photos/{full,thumb}/<Estado>/<nome>.<ext>, and the id-to-
// path mapping is only in the image cache. Building the filename from the id
// alone finds nothing and reports success — which is exactly what this script
// did after the per-state folders landed.
const imageCache = readJson(path.join(ROOT, 'cache', 'images.json'), { ext: 'jpg', images: {} });
const EXT = imageCache.ext ?? 'jpg';
const fileFor = (id, kind) =>
  path.join(PHOTOS, kind, `${imageCache.images[id]?.path ?? id}.${EXT}`);

/** Removes both derivatives for one id. Returns [filesRemoved, bytesFreed]. */
function reclaim(id) {
  let removed = 0;
  let freed = 0;
  for (const kind of ['full', 'thumb']) {
    const file = fileFor(id, kind);
    try {
      freed += fs.statSync(file).size;
      fs.unlinkSync(file);
      removed++;
    } catch {
      // Already gone. Re-running is a no-op by design.
    }
  }
  return [removed, freed];
}

step('cull', 'Applying exclusions');

if (args.list) {
  console.log(`  ${current.ids.length} excluded`);
  for (const e of current.entries ?? []) console.log(`    ${e.name ?? e.id}`);
  process.exit(0);
}

// The other half of --keep: reclaims space for everything already on the list.
// Useful when marks were recorded while another step was still reading the
// derivatives, and the deletion had to wait.
if (args.prune) {
  let removed = 0;
  let freed = 0;
  for (const id of current.ids) {
    const [n, bytes] = reclaim(id);
    removed += n;
    freed += bytes;
  }
  console.log(`  ${current.ids.length} on the list  ·  ${removed} files removed  ·  ${(freed / 1024 ** 2).toFixed(1)} MB freed`);
  console.log('  originals in takeout/ untouched');
  process.exit(0);
}

if (args.undo) {
  writeJson(LIST, { ids: [], entries: [] });
  console.log(`  cleared ${current.ids.length} exclusions`);
  console.log('  run: npm run images   (re-encodes what was removed)');
  console.log('  then: npm run build');
  process.exit(0);
}

// --- pick what to exclude ---------------------------------------------------

// By state: `--uf SP,MG`. Building a filename list for hundreds of photos by
// hand is exactly the kind of thing that loses three of them silently.
// By filename pattern: `--pattern "^Screenshot"`. Screen captures arrive in an
// export by the hundred and are never the trip — but they are scattered across
// every state, so a per-state pass cannot reach them.
let byUf = null;
if (args.pattern) {
  const re = new RegExp(String(args.pattern), 'i');
  const located = readJson(path.join(ROOT, 'cache', 'located.json'), { photos: [] });
  byUf = located.photos.filter((p) => re.test(p.title || ''));
  if (!byUf.length) {
    console.error(`  Nothing matches /${args.pattern}/i.`);
    process.exit(1);
  }
  console.log(`  /${args.pattern}/i -> ${byUf.length} files`);
}

if (args.uf) {
  const wanted = new Set(
    String(args.uf).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  );
  const located = readJson(path.join(ROOT, 'cache', 'located.json'), { photos: [] });
  byUf = located.photos.filter((p) => p.uf && wanted.has(p.uf));
  if (!byUf.length) {
    console.error(`  No photos found in ${[...wanted].join(', ')}.`);
    process.exit(1);
  }
  console.log(`  ${[...wanted].join(', ')} -> ${byUf.length} photos`);
}

const raw = byUf || args.pattern
  ? ''
  : args.file
    ? fs.readFileSync(path.resolve(String(args.file)), 'utf8')
    : fs.readFileSync(0, 'utf8');

// Strip list markers if the list was pasted from markdown, but nothing else.
// A greedy character class here is a trap: every filename in a Takeout export
// starts with its date, so `[-*\d.\s]+` silently eats `20240701` and leaves
// `_171314.jpg`, which matches nothing and looks like the export is at fault.
// Both patterns require whitespace after the marker, which a filename never has.
const wanted = raw
  .split(/\r?\n/)
  .map((line) =>
    line
      .trim()
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/[,;]$/, '')
      .trim()
  )
  .filter(Boolean);

if (!byUf && !wanted.length) {
  console.error('  Nothing on stdin. Paste the list, then press Ctrl+Z and Enter (Windows).');
  console.error('  Or select in bulk: --uf SP,MG   /   --pattern "^Screenshot"');
  process.exit(1);
}

// --- resolve names to ids ---------------------------------------------------

const { photos } = readJson(path.join(ROOT, 'cache', 'index.json'), { photos: [] });
if (!photos.length) {
  console.error('  cache/index.json missing. Run: npm run ingest');
  process.exit(1);
}

const byName = new Map();
const byId = new Map();
for (const p of photos) {
  byId.set(p.id, p);
  // Last write wins on a name collision; the id form is the unambiguous escape.
  byName.set(p.title.toLowerCase(), p);
  byName.set(path.basename(p.relPath).toLowerCase(), p);
}

const matched = [];
const missing = [];

if (byUf) {
  // Already resolved photos, not names — no lookup needed.
  matched.push(...byUf);
} else {
  for (const token of wanted) {
    const hit = byId.get(token) ?? byName.get(token.toLowerCase());
    if (hit) matched.push(hit);
    else missing.push(token);
  }
}

const ids = new Set(current.ids);
const entries = [...(current.entries ?? [])];
let added = 0;
for (const p of matched) {
  if (ids.has(p.id)) continue;
  ids.add(p.id);
  entries.push({ id: p.id, name: p.title, at: p.takenAt ?? null });
  added++;
}

// --- remove the derivatives -------------------------------------------------

let removed = 0;
let freed = 0;

if (!args.keep) {
  for (const p of matched) {
    const [n, bytes] = reclaim(p.id);
    removed += n;
    freed += bytes;
  }
}

writeJson(LIST, { ids: [...ids], entries });

console.log(`  ${wanted.length} in list  ·  ${matched.length} matched  ·  ${added} newly excluded`);
if (!args.keep) console.log(`  ${removed} files removed  ·  ${(freed / 1024 ** 2).toFixed(1)} MB freed`);
if (missing.length) {
  console.log(`  ${missing.length} not found:`);
  for (const m of missing.slice(0, 10)) console.log(`    ${m}`);
  if (missing.length > 10) console.log(`    ... and ${missing.length - 10} more`);
}
console.log(`  ${ids.size} excluded in total`);
console.log('  originals in takeout/ untouched');
console.log('  next: npm run build');
