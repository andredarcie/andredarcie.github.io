// Fase 3, etapa 5: compara pixel a pixel as capturas de tela das duas versões
// (tocar-replay.mjs --capturas). As duas usam o mesmo renderizador, então a
// diferença esperada é zero. Para cada quadro: quantos pixels diferem e a
// maior diferença de canal; se diferir, salva uma imagem com os pixels
// diferentes em vermelho por cima da captura A (diferenca-N.png).
// Uso: node ferramentas/comparar-capturas.mjs pastaA pastaB   (precisa do Playwright)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [pastaA, pastaB] = process.argv.slice(2);
if (!pastaA || !pastaB) { console.log('uso: node ferramentas/comparar-capturas.mjs pastaA pastaB'); process.exit(2); }

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  const global = execSync('npm root -g').toString().trim();
  ({ chromium } = createRequire(path.join(global, 'x'))('playwright'));
}
const navegador = await chromium.launch({ headless: true });
const pagina = await navegador.newPage();

const nomes = fs.readdirSync(pastaA).filter((f) => /^quadro-\d+\.png$/.test(f)).sort();
let diferentes = 0;
for (const nome of nomes) {
  const b = path.join(pastaB, nome);
  if (!fs.existsSync(b)) { console.log(`${nome}: só em A`); diferentes++; continue; }
  const [urlA, urlB] = [path.join(pastaA, nome), b].map((f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`);
  const r = await pagina.evaluate(async ([ua, ub]) => {
    const ler = async (u) => {
      const img = new Image(); img.src = u; await img.decode();
      const c = new OffscreenCanvas(img.width, img.height); const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return { w: img.width, h: img.height, d: ctx.getImageData(0, 0, img.width, img.height), c, ctx };
    };
    const [a, b] = [await ler(ua), await ler(ub)];
    if (a.w !== b.w || a.h !== b.h) return { tamanho: `${a.w}x${a.h} ≠ ${b.w}x${b.h}` };
    let pixels = 0, maior = 0;
    const marca = a.ctx.getImageData(0, 0, a.w, a.h);
    for (let i = 0; i < a.d.data.length; i += 4) {
      let dif = 0;
      for (let k = 0; k < 3; k++) dif = Math.max(dif, Math.abs(a.d.data[i + k] - b.d.data[i + k]));
      if (dif) { pixels++; maior = Math.max(maior, dif); marca.data.set([255, 0, 0, 255], i); }
    }
    let png = null;
    if (pixels) { a.ctx.putImageData(marca, 0, 0); const blob = await a.c.convertToBlob(); png = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer()))); }
    return { pixels, maior, total: a.w * a.h, png };
  }, [urlA, urlB]);
  if (r.tamanho) { console.log(`${nome}: tamanho ${r.tamanho}`); diferentes++; continue; }
  if (r.pixels) {
    diferentes++;
    const saida = path.join(pastaB, nome.replace('quadro-', 'diferenca-'));
    fs.writeFileSync(saida, Buffer.from(r.png, 'base64'));
    console.log(`${nome}: ${r.pixels} de ${r.total} pixels diferem (maior diferença ${r.maior}) → ${saida}`);
  }
}
console.log(diferentes ? `\n${diferentes} de ${nomes.length} capturas diferem` : `as ${nomes.length} capturas são idênticas pixel a pixel`);
await navegador.close();
process.exitCode = diferentes ? 1 : 0;
