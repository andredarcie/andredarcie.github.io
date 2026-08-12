import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

export function resolveFromRoot(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

export function loadConfig() {
  const cfg = readJson(path.join(ROOT, 'config.json'));
  cfg.takeoutDir = resolveFromRoot(cfg.takeoutDir);
  return cfg;
}

export function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

export function writeJson(file, data, { pretty = true } = {}) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, pretty ? 2 : 0), 'utf8');
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Cheap file identity: size + mtime, no read required. */
export function fingerprint(file) {
  const st = fs.statSync(file);
  return crypto
    .createHash('sha1')
    .update(`${file}:${st.size}:${Math.floor(st.mtimeMs)}`)
    .digest('hex')
    .slice(0, 16);
}

/** Stable short id derived from the path, so ids survive re-runs. */
export function idFor(relPath) {
  return crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 12);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out[k] = v === undefined ? (argv[i + 1]?.startsWith('--') ?? true) || argv[++i] : v;
      if (out[k] === undefined) out[k] = true;
    } else out._.push(a);
  }
  return out;
}

/** Bounded-concurrency map that preserves input order. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function progress(label, total) {
  let done = 0;
  let last = 0;
  // Carriage-return redraws only make sense on a terminal. Piped to a file or a
  // CI log they turn one status line into thousands.
  const live = Boolean(process.stdout.isTTY);
  return {
    tick(n = 1) {
      done += n;
      if (!live) return;
      const now = Date.now();
      if (now - last < 250 && done < total) return;
      last = now;
      const pct = total ? Math.round((done / total) * 100) : 0;
      process.stdout.write(`\r  ${label}: ${done}/${total} (${pct}%)   `);
    },
    done() {
      process.stdout.write(`${live ? '\r' : '  '}${live ? '  ' : ''}${label}: ${done}/${total} (100%)   \n`);
    },
  };
}

export function step(n, title) {
  console.log(`\n[${n}] ${title}`);
}
