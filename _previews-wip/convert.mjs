import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const { chromium } = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x'))('playwright');
const MAP = { 'rpg-play': 'tiny-rpg-studio', ovgd: 'openvideogamedata', lifedata: 'my-life-data', codex2: 'my-code-codex',
  blog: 'blog', skills: 'my-skills', curso: 'curso', journey3: 'journey', brians2: 'brians-mansion', zerohero: 'zero-the-hero',
  gta3: 'divino-city', zero: 'zero-to-one', house3: 'my-house', rts4: 'canudos' };
const CROP = { 'rpg-play': [290, 100, 700, 437] };
const OUT = 'C:/repos/andredarcie.github.io/img/previews';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
for (const [src, slug] of Object.entries(MAP)) {
  const data = 'data:image/png;base64,' + fs.readFileSync(`shots/${src}.png`).toString('base64');
  const webp = await p.evaluate(async ([data, crop]) => {
    const img = new Image(); img.src = data; await img.decode();
    const [sx, sy, sw, sh] = crop || [0, 0, img.width, img.height];
    const c = document.createElement('canvas'); c.width = 640; c.height = 400;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    const s = Math.max(640 / sw, 400 / sh), w = sw * s, h = sh * s;
    g.drawImage(img, sx, sy, sw, sh, (640 - w) / 2, (400 - h) / 2, w, h);
    return c.toDataURL('image/webp', 0.8);
  }, [data, CROP[src]]);
  fs.writeFileSync(`${OUT}/${slug}.webp`, Buffer.from(webp.split(',')[1], 'base64'));
}
await b.close();
