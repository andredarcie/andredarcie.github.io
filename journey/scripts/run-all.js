// Runs the whole pipeline in order. Every step is idempotent, so re-running
// after adding photos only does the new work.
//
//   node scripts/run-all.js                full run
//   node scripts/run-all.js --skip images  everything but the slow step
//   node scripts/run-all.js --from images  resume partway through

import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, parseArgs } from './lib/util.js';

const STEPS = ['fetch-geo', 'ingest', 'locate', 'images', 'build'];

const args = parseArgs();
const skip = new Set(String(args.skip ?? '').split(',').filter(Boolean));
const from = args.from ? STEPS.indexOf(String(args.from)) : 0;

if (from === -1) {
  console.error(`Unknown step "${args.from}". Steps: ${STEPS.join(', ')}`);
  process.exit(1);
}

const run = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts', `${script}.js`)], {
      stdio: 'inherit',
    });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`))
    );
  });

const started = Date.now();

for (const script of STEPS.slice(from)) {
  if (skip.has(script)) {
    console.log(`\n[--] ${script} skipped`);
    continue;
  }
  await run(script);
}

const mins = Math.round((Date.now() - started) / 60000);
console.log(`\nDone in ${mins} min. Serve journey/ and open index.html.`);
