// Step 1 — read the Takeout folder into one flat index.
//
// Two sources of truth per photo, and they disagree often enough to matter:
// the JSON sidecar (what Google knows) and the file's own EXIF (what the camera
// wrote). Sidecar wins on timestamp because Google corrects for edits; EXIF wins
// on GPS because Google zeroes `geoData` on anything shared or stripped.

import fs from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import {
  ROOT, loadConfig, writeJson, idFor, progress, step, mapLimit,
} from './lib/util.js';
import {
  walk, isMedia, isVideo, indexSidecars, findSidecar, parseSidecar,
} from './lib/takeout.js';
import { isRealFix } from './lib/geo.js';

const cfg = loadConfig();
const OUT = path.join(ROOT, 'cache', 'index.json');

step(1, 'Scanning Takeout');

if (!fs.existsSync(cfg.takeoutDir)) {
  console.error(`  Not found: ${cfg.takeoutDir}`);
  console.error('  Unzip the Takeout archive, then point "takeoutDir" in config.json at');
  console.error('  the "Google Fotos" (or "Google Photos") folder inside it.');
  process.exit(1);
}

const allFiles = [...walk(cfg.takeoutDir)];
const mediaFiles = allFiles.filter(isMedia);
const sidecarIndex = indexSidecars(allFiles);

console.log(`  ${allFiles.length} files, ${mediaFiles.length} media`);

const bar = progress('reading', mediaFiles.length);

const records = await mapLimit(mediaFiles, 8, async (file) => {
  const relPath = path.relative(cfg.takeoutDir, file).split(path.sep).join('/');
  const sidecarFile = findSidecar(file, sidecarIndex);
  const sidecar = sidecarFile ? parseSidecar(sidecarFile) : null;

  let exif = null;
  if (!isVideo(file)) {
    try {
      exif = await exifr.parse(file, {
        pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude',
               'Orientation', 'ExifImageWidth', 'ExifImageHeight', 'Make', 'Model'],
        gps: true,
      });
    } catch {
      // Unreadable EXIF is normal for screenshots and WhatsApp re-encodes.
    }
  }

  const takenAt =
    sidecar?.takenAt ??
    (exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).getTime() : null) ??
    (exif?.CreateDate ? new Date(exif.CreateDate).getTime() : null);

  const exifFix = isRealFix(exif?.latitude, exif?.longitude);
  const carFix = isRealFix(sidecar?.lat, sidecar?.lon);
  const lat = exifFix ? exif.latitude : carFix ? sidecar.lat : null;
  const lon = exifFix ? exif.longitude : carFix ? sidecar.lon : null;

  let bytes = 0;
  try { bytes = fs.statSync(file).size; } catch { /* raced with a move */ }

  bar.tick();

  return {
    id: idFor(relPath),
    relPath,
    file,
    title: sidecar?.title ?? path.basename(file),
    album: path.basename(path.dirname(file)),
    takenAt,
    lat,
    lon,
    gpsSource: exifFix ? 'exif' : carFix ? 'sidecar' : null,
    altitude: sidecar?.altitude ?? null,
    width: exif?.ExifImageWidth ?? null,
    height: exif?.ExifImageHeight ?? null,
    orientation: exif?.Orientation ?? null,
    camera: [exif?.Make, exif?.Model].filter(Boolean).join(' ').trim() || null,
    description: sidecar?.description ?? null,
    favorited: sidecar?.favorited ?? false,
    taggedPeople: sidecar?.people ?? [],
    isVideo: isVideo(file),
    hasSidecar: Boolean(sidecarFile),
  };
});

bar.done();

// Keep only the requested year, judged by capture time. A Takeout "Photos from
// 2024" folder can still contain stragglers whose real date sits either side.
const inYear = records.filter(
  (r) => r.takenAt && new Date(r.takenAt).getUTCFullYear() === cfg.year
);
const undated = records.filter((r) => !r.takenAt);

records.sort((a, b) => (a.takenAt ?? 0) - (b.takenAt ?? 0));
inYear.sort((a, b) => a.takenAt - b.takenAt);

const withGps = inYear.filter((r) => r.lat !== null).length;
const missingSidecar = inYear.filter((r) => !r.hasSidecar).length;

writeJson(OUT, { generatedAt: Date.now(), year: cfg.year, photos: inYear }, { pretty: false });

console.log(`  ${inYear.length} from ${cfg.year}  ·  ${records.length - inYear.length - undated.length} other years  ·  ${undated.length} undated`);
console.log(`  ${withGps} with GPS (${Math.round((withGps / (inYear.length || 1)) * 100)}%)`);
if (missingSidecar) console.log(`  ${missingSidecar} without a matched sidecar`);
console.log(`  -> ${path.relative(ROOT, OUT)}`);
