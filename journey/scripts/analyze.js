// Lê as imagens e os metadados para achar o que os números escondem.
//
// Duas coisas acontecem aqui:
//
//   Cor — cada foto é reduzida a 1x1 pixel, o que devolve a média exata do
//   quadro em uma leitura. Barato e suficiente: a pergunta não é "que cores tem
//   nesta foto", é "de que cor era esta viagem".
//
//   Padrões — hora do dia, dia da semana, silêncio entre fotos, deslocamento.
//   Os números por si já contam história: sábado rende dezesseis vezes mais
//   foto que segunda, e isso é o retrato de quem viaja sem parar de trabalhar.
//
// Saída: cache/stats.json, consumido por build.js.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  ROOT, readJson, writeJson, progress, step, mapLimit,
} from './lib/util.js';

const OUT = path.join(ROOT, 'cache', 'stats.json');
const THUMBS = path.join(ROOT, 'photos', 'thumb');

// Fuso de Brasília. Sem isso "16h" viraria 19h e o pico do dia mentiria.
const BRT = -3 * 3600e3;
const local = (t) => new Date(t + BRT);

step('an', 'Analisando o acervo');

const loc = readJson(path.join(ROOT, 'cache', 'located.json'), { photos: [] });
const imageCache = readJson(path.join(ROOT, 'cache', 'images.json'), { ext: 'jpg', images: {} });
const excluded = new Set(readJson(path.join(ROOT, 'data', 'excluded.json'), { ids: [] }).ids);
const EXT = imageCache.ext ?? 'jpg';

const fotos = loc.photos
  .filter((p) => !excluded.has(p.id) && !p.isVideo && p.takenAt)
  .sort((a, b) => a.takenAt - b.takenAt);

if (!fotos.length) {
  console.error('  Nada para analisar. Rode o pipeline primeiro.');
  process.exit(1);
}

// --- cor média de cada foto -------------------------------------------------

const anterior = readJson(OUT, { cores: {} }).cores;
const pendentes = fotos.filter((p) => !anterior[p.id]);
const bar = progress('lendo cor', pendentes.length);

const cores = { ...anterior };
await mapLimit(pendentes, 6, async (p) => {
  const rel = imageCache.images[p.id]?.path;
  bar.tick();
  if (!rel) return;
  try {
    const { data } = await sharp(path.join(THUMBS, `${rel}.${EXT}`))
      .resize(1, 1, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const [r, g, b] = data;

    // Luminância perceptual (Rec. 709) e saturação HSL. A média de um pôr do sol
    // e a de um quarto de pousada podem ter o mesmo brilho e cores opostas.
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (l > 0.5 ? 2 - max - min : max + min);

    cores[p.id] = {
      rgb: [r, g, b],
      luz: Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b),
      sat: Math.round(s * 100),
    };
  } catch {
    // Miniatura ausente ou ilegível — a foto simplesmente não entra na paleta.
  }
});
bar.done();

// --- padrões ----------------------------------------------------------------

const horas = Array(24).fill(0);
const diaDaSemana = Array(7).fill(0);
const diasPorSemana = Array(7).fill(0);
const porDia = new Map();
const kmPorDia = new Map();

for (const p of fotos) {
  const d = local(p.takenAt);
  horas[d.getUTCHours()]++;

  const chave = d.toISOString().slice(0, 10);
  if (!porDia.has(chave)) porDia.set(chave, { n: 0, wd: d.getUTCDay(), uf: p.uf });
  porDia.get(chave).n++;

  if (p.legKm) kmPorDia.set(chave, (kmPorDia.get(chave) ?? 0) + p.legKm);
}

for (const { n, wd } of porDia.values()) {
  diaDaSemana[wd] += n;
  diasPorSemana[wd]++;
}

// O maior silêncio: quanto tempo a câmera passou desligada.
let silencio = { dias: 0, de: null, ate: null };
for (let i = 1; i < fotos.length; i++) {
  const g = (fotos[i].takenAt - fotos[i - 1].takenAt) / 86400e3;
  if (g > silencio.dias) {
    silencio = {
      dias: Math.round(g * 10) / 10,
      de: fotos[i - 1].takenAt,
      ate: fotos[i].takenAt,
    };
  }
}

// Rajada: fotos a menos de 3 s da anterior. Mede o dedo, não a viagem.
let rajada = 0;
for (let i = 1; i < fotos.length; i++) {
  if (fotos[i].takenAt - fotos[i - 1].takenAt < 3000) rajada++;
}

const orientacao = { retrato: 0, paisagem: 0, quadrada: 0 };
for (const p of fotos) {
  // Dimensões pós-rotação, do encoder — o EXIF guarda o sensor, sempre deitado,
  // e usá-lo faria toda foto parecer paisagem.
  const img = imageCache.images[p.id];
  if (!img?.w || !img?.h) continue;
  const r = img.w / img.h;
  if (r > 1.05) orientacao.paisagem++;
  else if (r < 0.95) orientacao.retrato++;
  else orientacao.quadrada++;
}

const altitudes = fotos.map((p) => p.altitude).filter((a) => a != null && a !== 0);
const dias = [...porDia.entries()].sort((a, b) => b[1].n - a[1].n);
const kms = [...kmPorDia.entries()].sort((a, b) => b[1] - a[1]);

const fontes = {};
for (const p of fotos) fontes[p.locSource ?? 'nenhuma'] = (fontes[p.locSource ?? 'nenhuma'] ?? 0) + 1;

const stats = {
  geradoEm: Date.now(),
  horas,
  diaDaSemana,
  diasPorSemana,
  diasComFoto: porDia.size,
  diaMaisCheio: dias[0] ? { data: dias[0][0], n: dias[0][1].n, uf: dias[0][1].uf } : null,
  diaMaisVazio: dias.at(-1) ? { data: dias.at(-1)[0], n: dias.at(-1)[1].n } : null,
  silencio,
  rajada,
  orientacao,
  fontes,
  altitude: altitudes.length
    ? {
        min: Math.round(Math.min(...altitudes)),
        max: Math.round(Math.max(...altitudes)),
        mediana: Math.round(altitudes.sort((a, b) => a - b)[Math.floor(altitudes.length / 2)]),
      }
    : null,
  maiorDeslocamento: kms[0] ? { data: kms[0][0], km: Math.round(kms[0][1]) } : null,
  porDia: [...porDia.entries()].map(([data, v]) => ({ data, n: v.n, uf: v.uf })).sort((a, b) => a.data.localeCompare(b.data)),
};

writeJson(OUT, { ...stats, cores }, { pretty: false });

const comCor = Object.keys(cores).length;
const sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
console.log(`  ${fotos.length} fotos  ·  ${comCor} com cor lida`);
console.log(`  pico do dia: ${horas.indexOf(Math.max(...horas))}h`);
console.log(`  por dia da semana: ${sem.map((s, i) => `${s} ${diasPorSemana[i] ? Math.round(diaDaSemana[i] / diasPorSemana[i]) : 0}`).join('  ')}`);
console.log(`  maior silêncio: ${silencio.dias} dias  ·  rajada: ${rajada} fotos a menos de 3 s da anterior`);
console.log(`  -> ${path.relative(ROOT, OUT)}`);
