import fs from 'node:fs';
import path from 'node:path';

export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.gif']);
export const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.avi', '.3gp']);

export function isMedia(file) {
  const ext = path.extname(file).toLowerCase();
  return IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext);
}

export function isVideo(file) {
  return VIDEO_EXT.has(path.extname(file).toLowerCase());
}

export function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

// --- sidecar matching -------------------------------------------------------
//
// Takeout's JSON naming has drifted over the years and none of the variants are
// documented. Observed in the wild:
//
//   IMG_1234.jpg   ->  IMG_1234.jpg.json
//   IMG_1234.jpg   ->  IMG_1234.jpg.supplemental-metadata.json    (2024+ exports)
//   IMG_1234.jpg   ->  IMG_1234.jpg.supplemental-me.json          (51-char cap)
//   IMG_1234(1).jpg->  IMG_1234.jpg(1).json                       (marker moves!)
//   long-name.jpg  ->  long-nam.jpg.json                          (base truncated)
//   IMG_1234-edited.jpg -> no sidecar; falls back to the original's
//
// Rather than guess per file, index every JSON in the directory under a
// canonical key and resolve against that, with a longest-prefix fallback for
// the truncated cases.

const SUPPLEMENTAL = 'supplemental-metadata';

/** Strip `.json` and any (possibly truncated) `.supplemental-metadata` segment. */
function stripJsonSuffix(name) {
  let out = name.replace(/\.json$/i, '');
  const lastDot = out.lastIndexOf('.');
  if (lastDot > 0) {
    const tail = out.slice(lastDot + 1).toLowerCase();
    // "jpg" is not a prefix of "supplemental-metadata", so real extensions survive.
    if (tail.length > 0 && SUPPLEMENTAL.startsWith(tail)) out = out.slice(0, lastDot);
  }
  return out;
}

/**
 * Normalise to `BASE.EXT(n)` so a media file and its sidecar agree, regardless
 * of which side of the extension Google parked the duplicate marker.
 */
function canonical(name) {
  let dup = '';
  let out = name.replace(/\((\d+)\)/, (_, n) => {
    dup = `(${n})`;
    return '';
  });
  out = out.replace(/-(edited|editado|ha modificato|bearbeitet)$/i, '');
  // The marker may have sat before the extension; always re-append at the end.
  return out + dup;
}

/** Build a canonical-key -> absolute-path index of every JSON beside the media. */
export function indexSidecars(files) {
  const byDir = new Map();
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.json')) continue;
    const dir = path.dirname(file);
    if (!byDir.has(dir)) byDir.set(dir, new Map());
    const key = canonical(stripJsonSuffix(path.basename(file))).toLowerCase();
    byDir.get(dir).set(key, file);
  }
  return byDir;
}

export function findSidecar(mediaPath, sidecarIndex) {
  const dir = path.dirname(mediaPath);
  const table = sidecarIndex.get(dir);
  if (!table) return null;

  const base = path.basename(mediaPath);
  const key = canonical(base).toLowerCase();
  if (table.has(key)) return table.get(key);

  // Truncated sidecar name: find the longest indexed key that prefixes ours.
  let best = null;
  let bestLen = 0;
  for (const [candidate, file] of table) {
    if (candidate.length > bestLen && key.startsWith(candidate)) {
      best = file;
      bestLen = candidate.length;
    }
  }
  // Guard against a short key swallowing unrelated files.
  return bestLen >= Math.min(8, key.length) ? best : null;
}

/** Pull the fields we care about out of a sidecar, tolerating shape drift. */
export function parseSidecar(file) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }

  const ts =
    raw.photoTakenTime?.timestamp ??
    raw.creationTime?.timestamp ??
    null;

  // geoData is often zeroed when Google strips location; geoDataExif can survive.
  const geo = [raw.geoData, raw.geoDataExif].find(
    (g) => g && (g.latitude || g.longitude)
  );

  return {
    title: raw.title ?? null,
    takenAt: ts ? Number(ts) * 1000 : null,
    lat: geo?.latitude ?? null,
    lon: geo?.longitude ?? null,
    altitude: geo?.altitude ?? null,
    description: raw.description || null,
    favorited: Boolean(raw.favorited),
    people: Array.isArray(raw.people) ? raw.people.map((p) => p.name).filter(Boolean) : [],
  };
}
